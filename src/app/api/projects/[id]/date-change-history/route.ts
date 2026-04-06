import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projectDateChangeHistory, projectOpportunities, users } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';

// 日期类型配置
const DATE_TYPE_CONFIG: Record<string, { name: string; field: string }> = {
  expected_bidding_date: { name: '预计招标日期', field: 'expectedBiddingDate' },
  expected_close_date: { name: '预计成交日期', field: 'expectedCloseDate' },
  next_action_date: { name: '下一步行动日期', field: 'nextActionDate' },
};

// 获取日期变更历史
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: '无效的项目ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const dateType = searchParams.get('dateType');

    // 构建查询条件
    const conditions = [eq(projectDateChangeHistory.projectId, projectId)];
    if (dateType) {
      conditions.push(eq(projectDateChangeHistory.dateType, dateType));
    }

    const history = await db
      .select()
      .from(projectDateChangeHistory)
      .where(and(...conditions))
      .orderBy(desc(projectDateChangeHistory.createdAt));

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Failed to fetch date change history:', error);
    return NextResponse.json({ success: false, error: '获取日期变更历史失败' }, { status: 500 });
  }
});

// 添加日期变更记录
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: '无效的项目ID' }, { status: 400 });
    }

    const body = await request.json();
    const { dateType, newDate, changeReason } = body;

    if (!dateType || !newDate) {
      return NextResponse.json({ success: false, error: '请填写完整信息' }, { status: 400 });
    }

    if (!changeReason) {
      return NextResponse.json({ success: false, error: '请填写变更理由' }, { status: 400 });
    }

    const dateConfig = DATE_TYPE_CONFIG[dateType];
    if (!dateConfig) {
      return NextResponse.json({ success: false, error: '不支持的日期类型' }, { status: 400 });
    }

    // 获取当前日期值
    const [opportunity] = await db
      .select()
      .from(projectOpportunities)
      .where(eq(projectOpportunities.projectId, projectId))
      .limit(1);

    let oldDate: string | null = null;
    if (opportunity) {
      const currentValue = opportunity[dateConfig.field as keyof typeof opportunity];
      oldDate = currentValue ? String(currentValue) : null;
    }

    // 检查日期是否有变化
    if (oldDate === newDate) {
      return NextResponse.json({ success: false, error: '日期未变化' }, { status: 400 });
    }

    // 获取当前用户信息
    const [user] = await db
      .select({ realName: users.realName })
      .from(users)
      .where(eq(users.id, context.userId))
      .limit(1);

    // 使用事务
    await db.transaction(async (tx) => {
      // 1. 添加日期变更历史
      await tx.insert(projectDateChangeHistory).values({
        projectId,
        dateType,
        dateTypeName: dateConfig.name,
        oldDate: oldDate || null,
        newDate,
        changeReason,
        changedBy: context.userId,
        changedByName: user?.realName || null,
      });

      // 2. 更新商机信息中的日期
      if (opportunity) {
        await tx
          .update(projectOpportunities)
          .set({
            [dateConfig.field]: newDate,
            updatedAt: new Date(),
          })
          .where(eq(projectOpportunities.projectId, projectId));
      } else {
        // 如果不存在商机记录，创建一条
        await tx.insert(projectOpportunities).values({
          projectId,
          [dateConfig.field]: newDate,
          opportunityStage: 'lead',
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: '日期已更新',
    });
  } catch (error) {
    console.error('Failed to update date:', error);
    return NextResponse.json({ success: false, error: '更新日期失败' }, { status: 500 });
  }
});
