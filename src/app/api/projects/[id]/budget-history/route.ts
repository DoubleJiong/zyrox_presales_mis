import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projectBudgetHistory, projects, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';

// 获取项目预算历史
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: '无效的项目ID' }, { status: 400 });
    }

    const history = await db
      .select()
      .from(projectBudgetHistory)
      .where(eq(projectBudgetHistory.projectId, projectId))
      .orderBy(desc(projectBudgetHistory.createdAt));

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Failed to fetch budget history:', error);
    return NextResponse.json({ success: false, error: '获取预算历史失败' }, { status: 500 });
  }
});

// 添加预算历史记录
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
    const { newAmount, changeReason } = body;

    if (!newAmount) {
      return NextResponse.json({ success: false, error: '请输入预算金额' }, { status: 400 });
    }

    // 获取项目当前预算
    const [project] = await db
      .select({ estimatedAmount: projects.estimatedAmount })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return NextResponse.json({ success: false, error: '项目不存在' }, { status: 404 });
    }

    const oldAmount = project.estimatedAmount;
    const isFirstEntry = oldAmount === null || oldAmount === undefined;

    // 检查金额是否有变化
    if (!isFirstEntry && String(oldAmount) === String(newAmount)) {
      return NextResponse.json({ success: false, error: '预算金额未变化' }, { status: 400 });
    }

    // 首次填写时，不需要变更理由
    if (!isFirstEntry && !changeReason) {
      return NextResponse.json({ success: false, error: '请填写预算变动理由' }, { status: 400 });
    }

    // 获取当前用户信息
    const [user] = await db
      .select({ realName: users.realName })
      .from(users)
      .where(eq(users.id, context.userId))
      .limit(1);

    // 使用事务
    await db.transaction(async (tx) => {
      // 1. 添加预算历史记录
      await tx.insert(projectBudgetHistory).values({
        projectId,
        oldAmount: oldAmount ? String(oldAmount) : null,
        newAmount: String(newAmount),
        changeReason: isFirstEntry ? null : changeReason,
        isFirstEntry,
        changedBy: context.userId,
        changedByName: user?.realName || null,
      });

      // 2. 更新项目预算
      await tx
        .update(projects)
        .set({
          estimatedAmount: String(newAmount),
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));
    });

    return NextResponse.json({
      success: true,
      message: isFirstEntry ? '预算已填写' : '预算已更新',
    });
  } catch (error) {
    console.error('Failed to update budget:', error);
    return NextResponse.json({ success: false, error: '更新预算失败' }, { status: 500 });
  }
});
