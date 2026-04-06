import { NextRequest } from 'next/server';
import { db } from '@/db';
import { projectDecisionMakers } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canWriteProject, isSystemAdmin } from '@/lib/permissions/project';

// GET - 获取单个决策人
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const makerId = parseInt(context.params?.makerId || '0');
    
    if (isNaN(makerId)) {
      return errorResponse('BAD_REQUEST', '无效的决策人ID');
    }

    const [maker] = await db
      .select()
      .from(projectDecisionMakers)
      .where(and(
        eq(projectDecisionMakers.id, makerId),
        isNull(projectDecisionMakers.deletedAt)
      ))
      .limit(1);

    if (!maker) {
      return errorResponse('NOT_FOUND', '决策人不存在');
    }

    return successResponse(maker);
  } catch (error) {
    console.error('Failed to fetch decision maker:', error);
    return errorResponse('INTERNAL_ERROR', '获取决策人失败');
  }
});

// PUT - 更新决策人
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const makerId = parseInt(context.params?.makerId || '0');
    
    if (isNaN(projectId) || isNaN(makerId)) {
      return errorResponse('BAD_REQUEST', '无效的ID');
    }

    // 检查权限
    const canWrite = await canWriteProject(projectId, context.userId);
    const isAdmin = await isSystemAdmin(context.userId);
    
    if (!canWrite && !isAdmin) {
      return errorResponse('FORBIDDEN', '没有权限管理决策人');
    }

    const body = await request.json();
    
    const [maker] = await db
      .update(projectDecisionMakers)
      .set({
        name: body.name,
        position: body.position || null,
        department: body.department || null,
        attitude: body.attitude || 'unknown',
        influenceLevel: body.influenceLevel || 3,
        contactInfo: body.contactInfo || null,
        notes: body.notes || null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(projectDecisionMakers.id, makerId),
        eq(projectDecisionMakers.projectId, projectId),
        isNull(projectDecisionMakers.deletedAt)
      ))
      .returning();

    if (!maker) {
      return errorResponse('NOT_FOUND', '决策人不存在');
    }

    return successResponse(maker);
  } catch (error) {
    console.error('Failed to update decision maker:', error);
    return errorResponse('INTERNAL_ERROR', '更新决策人失败');
  }
});

// DELETE - 删除决策人
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const makerId = parseInt(context.params?.makerId || '0');
    
    if (isNaN(projectId) || isNaN(makerId)) {
      return errorResponse('BAD_REQUEST', '无效的ID');
    }

    // 检查权限
    const canWrite = await canWriteProject(projectId, context.userId);
    const isAdmin = await isSystemAdmin(context.userId);
    
    if (!canWrite && !isAdmin) {
      return errorResponse('FORBIDDEN', '没有权限管理决策人');
    }

    const [maker] = await db
      .update(projectDecisionMakers)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(projectDecisionMakers.id, makerId),
        eq(projectDecisionMakers.projectId, projectId),
        isNull(projectDecisionMakers.deletedAt)
      ))
      .returning();

    if (!maker) {
      return errorResponse('NOT_FOUND', '决策人不存在');
    }

    return successResponse({ message: '删除成功' });
  } catch (error) {
    console.error('Failed to delete decision maker:', error);
    return errorResponse('INTERNAL_ERROR', '删除决策人失败');
  }
});
