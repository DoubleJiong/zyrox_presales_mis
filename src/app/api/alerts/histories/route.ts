import { NextRequest } from 'next/server';
import { db } from '@/db';
import { alertHistories, alertRules, users } from '@/db/schema';
import { desc, eq, and, isNull, or, inArray } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { getAccessibleProjectIds, isSystemAdmin } from '@/lib/permissions/project';

// =====================================================
// 预警历史 API - 已添加权限验证
// =====================================================

/**
 * GET /api/alerts/histories
 * 获取预警历史列表（带权限过滤）
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number }
) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const targetType = searchParams.get('targetType');
    const ruleId = searchParams.get('ruleId');

    // 检查是否是系统管理员
    const isAdmin = await isSystemAdmin(context.userId);

    // 构建查询条件
    const conditions: any[] = [isNull(alertHistories.deletedAt)];

    if (status && status !== 'all') {
      conditions.push(eq(alertHistories.status, status));
    }
    if (severity && severity !== 'all') {
      conditions.push(eq(alertHistories.severity, severity));
    }
    if (targetType && targetType !== 'all') {
      conditions.push(eq(alertHistories.targetType, targetType));
    }
    if (ruleId) {
      conditions.push(eq(alertHistories.ruleId, parseInt(ruleId)));
    }

    // 非管理员只能看到与自己相关的预警
    if (!isAdmin) {
      // 获取用户可访问的项目ID列表
      const accessibleProjectIds = await getAccessibleProjectIds(context.userId);

      // 构建权限过滤条件：
      // 1. 目标是用户自己
      // 2. 目标是用户可访问的项目
      // 3. 目标是系统级预警（所有人可见）
      const permissionConditions = [
        eq(alertHistories.targetType, 'user'),
        eq(alertHistories.targetId, context.userId),
      ];

      if (accessibleProjectIds.length > 0) {
        permissionConditions.push(
          and(
            eq(alertHistories.targetType, 'project'),
            inArray(alertHistories.targetId, accessibleProjectIds)
          ) as any
        );
      }

      conditions.push(or(...permissionConditions) as any);
    }

    // 查询预警历史
    const histories = await db
      .select({
        id: alertHistories.id,
        ruleId: alertHistories.ruleId,
        ruleName: alertHistories.ruleName,
        targetType: alertHistories.targetType,
        targetId: alertHistories.targetId,
        targetName: alertHistories.targetName,
        severity: alertHistories.severity,
        status: alertHistories.status,
        alertData: alertHistories.alertData,
        acknowledgedAt: alertHistories.acknowledgedAt,
        acknowledgedBy: alertHistories.acknowledgedBy,
        acknowledgerName: users.realName,
        resolvedAt: alertHistories.resolvedAt,
        resolvedBy: alertHistories.resolvedBy,
        resolverName: users.realName,
        resolutionNote: alertHistories.resolutionNote,
        createdAt: alertHistories.createdAt,
        updatedAt: alertHistories.updatedAt,
      })
      .from(alertHistories)
      .leftJoin(users, eq(alertHistories.acknowledgedBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(alertHistories.createdAt));

    return successResponse(histories);
  } catch (error) {
    console.error('Failed to fetch alert histories:', error);
    return errorResponse('INTERNAL_ERROR', '获取预警历史失败');
  }
});

/**
 * POST /api/alerts/histories
 * 确认预警
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number }
) => {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse('BAD_REQUEST', '预警ID不能为空');
    }

    // 检查预警是否存在
    const [existingAlert] = await db
      .select()
      .from(alertHistories)
      .where(and(eq(alertHistories.id, id), isNull(alertHistories.deletedAt)))
      .limit(1);

    if (!existingAlert) {
      return errorResponse('NOT_FOUND', '预警记录不存在');
    }

    if (existingAlert.status !== 'pending') {
      return errorResponse('BAD_REQUEST', '该预警已被处理，无法再次确认');
    }

    // 权限检查：用户是否有权处理此预警
    const isAdmin = await isSystemAdmin(context.userId);
    const isTargetUser = existingAlert.targetType === 'user' && existingAlert.targetId === context.userId;

    if (!isAdmin && !isTargetUser) {
      // 检查是否是项目相关预警
      if (existingAlert.targetType === 'project') {
        const accessibleProjectIds = await getAccessibleProjectIds(context.userId);
        if (!accessibleProjectIds.includes(existingAlert.targetId)) {
          return errorResponse('FORBIDDEN', '您没有权限处理此预警');
        }
      } else {
        return errorResponse('FORBIDDEN', '您没有权限处理此预警');
      }
    }

    // 更新预警状态
    const [updatedAlert] = await db
      .update(alertHistories)
      .set({
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: context.userId,
        updatedAt: new Date(),
      })
      .where(eq(alertHistories.id, id))
      .returning();

    return successResponse({ ...updatedAlert, message: '预警已确认' });
  } catch (error) {
    console.error('Failed to acknowledge alert:', error);
    return errorResponse('INTERNAL_ERROR', '确认预警失败');
  }
});

/**
 * PUT /api/alerts/histories
 * 解决预警
 */
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number }
) => {
  try {
    const body = await request.json();
    const { id, resolutionNote } = body;

    if (!id) {
      return errorResponse('BAD_REQUEST', '预警ID不能为空');
    }

    // 检查预警是否存在
    const [existingAlert] = await db
      .select()
      .from(alertHistories)
      .where(and(eq(alertHistories.id, id), isNull(alertHistories.deletedAt)))
      .limit(1);

    if (!existingAlert) {
      return errorResponse('NOT_FOUND', '预警记录不存在');
    }

    if (existingAlert.status === 'resolved' || existingAlert.status === 'ignored') {
      return errorResponse('BAD_REQUEST', '该预警已解决或已忽略');
    }

    // 权限检查：用户是否有权处理此预警
    const isAdmin = await isSystemAdmin(context.userId);
    const isTargetUser = existingAlert.targetType === 'user' && existingAlert.targetId === context.userId;

    if (!isAdmin && !isTargetUser) {
      if (existingAlert.targetType === 'project') {
        const accessibleProjectIds = await getAccessibleProjectIds(context.userId);
        if (!accessibleProjectIds.includes(existingAlert.targetId)) {
          return errorResponse('FORBIDDEN', '您没有权限处理此预警');
        }
      } else {
        return errorResponse('FORBIDDEN', '您没有权限处理此预警');
      }
    }

    // 更新预警状态
    const [updatedAlert] = await db
      .update(alertHistories)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: context.userId,
        resolutionNote: resolutionNote || '',
        updatedAt: new Date(),
      })
      .where(eq(alertHistories.id, id))
      .returning();

    return successResponse({ ...updatedAlert, message: '预警已解决' });
  } catch (error) {
    console.error('Failed to resolve alert:', error);
    return errorResponse('INTERNAL_ERROR', '解决预警失败');
  }
});

/**
 * DELETE /api/alerts/histories?id=xxx
 * 忽略预警
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number }
) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('BAD_REQUEST', '预警ID不能为空');
    }

    // 检查预警是否存在
    const [existingAlert] = await db
      .select()
      .from(alertHistories)
      .where(and(eq(alertHistories.id, parseInt(id)), isNull(alertHistories.deletedAt)))
      .limit(1);

    if (!existingAlert) {
      return errorResponse('NOT_FOUND', '预警记录不存在');
    }

    // 权限检查：用户是否有权处理此预警
    const isAdmin = await isSystemAdmin(context.userId);
    const isTargetUser = existingAlert.targetType === 'user' && existingAlert.targetId === context.userId;

    if (!isAdmin && !isTargetUser) {
      if (existingAlert.targetType === 'project') {
        const accessibleProjectIds = await getAccessibleProjectIds(context.userId);
        if (!accessibleProjectIds.includes(existingAlert.targetId)) {
          return errorResponse('FORBIDDEN', '您没有权限处理此预警');
        }
      } else {
        return errorResponse('FORBIDDEN', '您没有权限处理此预警');
      }
    }

    // 将预警标记为忽略
    const [updatedAlert] = await db
      .update(alertHistories)
      .set({
        status: 'ignored',
        resolvedAt: new Date(),
        resolvedBy: context.userId,
        resolutionNote: '用户已忽略此预警',
        updatedAt: new Date(),
      })
      .where(eq(alertHistories.id, parseInt(id)))
      .returning();

    return successResponse({ ...updatedAlert, message: '预警已忽略' });
  } catch (error) {
    console.error('Failed to ignore alert:', error);
    return errorResponse('INTERNAL_ERROR', '忽略预警失败');
  }
});
