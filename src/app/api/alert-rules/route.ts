import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { alertRules } from '@/db/schema';
import { eq, desc, sql, and, isNull } from 'drizzle-orm';

// 获取预警规则列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const ruleType = searchParams.get('ruleType');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const conditions = [isNull(alertRules.deletedAt)];

    if (status) {
      conditions.push(eq(alertRules.status, status));
    }

    if (ruleType) {
      conditions.push(eq(alertRules.ruleType, ruleType));
    }

    // 获取总数
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(alertRules)
      .where(and(...conditions));

    const total = countResult?.count || 0;

    // 获取规则列表
    const rules = await db
      .select()
      .from(alertRules)
      .where(and(...conditions))
      .orderBy(desc(alertRules.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({
      success: true,
      data: rules,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Get alert rules API error:', error);
    return NextResponse.json(
      { success: false, error: '获取预警规则列表失败' },
      { status: 500 }
    );
  }
}

// 创建预警规则
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ruleName,
      ruleCode,
      ruleType,
      ruleCategory,
      conditionField,
      conditionOperator,
      thresholdValue,
      thresholdUnit,
      severity = 'medium',
      status = 'active',
      checkFrequency = 'daily',
      notificationChannels,
      recipientIds,
      description,
      createdBy,
    } = body;

    if (!ruleName || !ruleCode || !ruleType || !ruleCategory) {
      return NextResponse.json(
        { success: false, error: '规则名称、编码、类型和分类不能为空' },
        { status: 400 }
      );
    }

    const [newRule] = await db
      .insert(alertRules)
      .values({
        ruleName,
        ruleCode,
        ruleType,
        ruleCategory,
        conditionField,
        conditionOperator,
        thresholdValue,
        thresholdUnit,
        severity,
        status,
        checkFrequency,
        notificationChannels,
        recipientIds,
        description,
        createdBy,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newRule,
      message: '预警规则创建成功',
    });
  } catch (error) {
    console.error('Create alert rule API error:', error);
    return NextResponse.json(
      { success: false, error: '创建预警规则失败' },
      { status: 500 }
    );
  }
}
