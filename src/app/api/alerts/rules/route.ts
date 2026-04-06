import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { alertRules, users } from '@/db/schema';
import { desc, eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';

function isAlertRuleSequenceDriftError(error: unknown) {
  const databaseError = error as { cause?: { code?: string; constraint_name?: string } };
  return databaseError?.cause?.code === '23505' && databaseError?.cause?.constraint_name === 'bus_alert_rule_pkey';
}

async function resetAlertRuleIdSequence() {
  await db.execute(sql.raw(`
    SELECT setval(
      pg_get_serial_sequence('bus_alert_rule', 'id'),
      COALESCE((SELECT MAX(id) FROM bus_alert_rule), 0) + 1,
      false
    )
  `));
}

// =====================================================
// 预警规则 API
// =====================================================

/**
 * GET /api/alerts/rules
 * 获取预警规则列表
 */
export const GET = withAuth(async (
  request: NextRequest,
  _context: { userId: number }
) => {
  try {
    const { searchParams } = new URL(request.url);
    const ruleType = searchParams.get('ruleType');
    const status = searchParams.get('status');

    // 构建查询条件
    const conditions = [isNull(alertRules.deletedAt)];
    
    if (ruleType) {
      conditions.push(eq(alertRules.ruleType, ruleType));
    }
    if (status) {
      conditions.push(eq(alertRules.status, status));
    }

    // 查询预警规则
    const rules = await db
      .select({
        id: alertRules.id,
        ruleName: alertRules.ruleName,
        ruleCode: alertRules.ruleCode,
        ruleType: alertRules.ruleType,
        ruleCategory: alertRules.ruleCategory,
        conditionField: alertRules.conditionField,
        conditionOperator: alertRules.conditionOperator,
        thresholdValue: alertRules.thresholdValue,
        thresholdUnit: alertRules.thresholdUnit,
        severity: alertRules.severity,
        status: alertRules.status,
        checkFrequency: alertRules.checkFrequency,
        notificationChannels: alertRules.notificationChannels,
        recipientIds: alertRules.recipientIds,
        description: alertRules.description,
        createdBy: alertRules.createdBy,
        createdAt: alertRules.createdAt,
        updatedAt: alertRules.updatedAt,
        lastTriggeredAt: alertRules.lastTriggeredAt,
        triggerCount: alertRules.triggerCount,
        creatorName: users.realName,
      })
      .from(alertRules)
      .leftJoin(users, eq(alertRules.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(alertRules.createdAt));

    return successResponse(rules);
  } catch (error) {
    console.error('Failed to fetch alert rules:', error);
    return errorResponse('INTERNAL_ERROR', '获取预警规则失败');
  }
});

/**
 * POST /api/alerts/rules
 * 创建预警规则
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number }
) => {
  try {
    const body = await request.json();
    const {
      ruleName,
      ruleType,
      ruleCategory,
      conditionField,
      conditionOperator,
      thresholdValue,
      thresholdUnit,
      severity,
      checkFrequency,
      notificationChannels,
      recipientIds,
      description,
      createdBy,
    } = body;

    // 验证必填字段
    if (!ruleName || !ruleType || !ruleCategory || !conditionField || thresholdValue === undefined || thresholdValue === null || !thresholdUnit) {
      return errorResponse('BAD_REQUEST', '必填字段不能为空: ruleName, ruleType, ruleCategory, conditionField, thresholdValue, thresholdUnit', { status: 400 });
    }

    // 生成规则编码
    const ruleCode = `${ruleType.toUpperCase()}_${ruleCategory.toUpperCase()}_${Date.now()}`;

    // 创建预警规则 - 确保 thresholdValue 是整数
    const insertData = {
      ruleName,
      ruleCode,
      ruleType,
      ruleCategory,
      conditionField,
      conditionOperator: conditionOperator || 'gt',
      thresholdValue: parseInt(String(thresholdValue)) || 0,
      thresholdUnit,
      severity: severity || 'medium',
      status: 'active' as const,
      checkFrequency: checkFrequency || 'daily',
      notificationChannels: notificationChannels || ['system'],
      recipientIds: recipientIds || [],
      description: description || '',
      createdBy: createdBy || context.userId,
      triggerCount: 0,
    };

    console.log('Creating alert rule with data:', JSON.stringify(insertData, null, 2));

    let newRule;

    try {
      [newRule] = await db
        .insert(alertRules)
        .values(insertData)
        .returning();
    } catch (error) {
      if (!isAlertRuleSequenceDriftError(error)) {
        throw error;
      }

      await resetAlertRuleIdSequence();

      [newRule] = await db
        .insert(alertRules)
        .values(insertData)
        .returning();
    }

    return successResponse({ ...newRule, message: '预警规则创建成功' });
  } catch (error) {
    console.error('Failed to create alert rule:', error);
    return errorResponse('INTERNAL_ERROR', '创建预警规则失败');
  }
});

/**
 * PUT /api/alerts/rules
 * 更新预警规则
 */
export const PUT = withAuth(async (
  request: NextRequest,
  _context: { userId: number }
) => {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return errorResponse('BAD_REQUEST', '规则ID不能为空', { status: 400 });
    }

    // 检查规则是否存在
    const [existingRule] = await db
      .select()
      .from(alertRules)
      .where(and(eq(alertRules.id, id), isNull(alertRules.deletedAt)))
      .limit(1);

    if (!existingRule) {
      return errorResponse('NOT_FOUND', '预警规则不存在', { status: 404 });
    }

    // 更新预警规则
    const [updatedRule] = await db
      .update(alertRules)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(alertRules.id, id))
      .returning();

    return successResponse({ ...updatedRule, message: '预警规则更新成功' });
  } catch (error) {
    console.error('Failed to update alert rule:', error);
    return errorResponse('INTERNAL_ERROR', '更新预警规则失败');
  }
});

/**
 * DELETE /api/alerts/rules?id=xxx
 * 删除预警规则（软删除）
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  _context: { userId: number }
) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('BAD_REQUEST', '规则ID不能为空', { status: 400 });
    }

    // 检查规则是否存在
    const [existingRule] = await db
      .select()
      .from(alertRules)
      .where(and(eq(alertRules.id, parseInt(id)), isNull(alertRules.deletedAt)))
      .limit(1);

    if (!existingRule) {
      return errorResponse('NOT_FOUND', '预警规则不存在', { status: 404 });
    }

    // 软删除
    await db
      .update(alertRules)
      .set({
        deletedAt: new Date(),
        status: 'inactive',
        updatedAt: new Date(),
      })
      .where(eq(alertRules.id, parseInt(id)));

    return successResponse({ id: parseInt(id), message: '预警规则删除成功' });
  } catch (error) {
    console.error('Failed to delete alert rule:', error);
    return errorResponse('INTERNAL_ERROR', '删除预警规则失败');
  }
});
