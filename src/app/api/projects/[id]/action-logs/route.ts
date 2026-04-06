import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projectActionLogs, users } from '@/db/schema';
import { eq, desc, and, asc, count } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';

// 行动状态配置
const ACTION_STATUS = {
  pending: { name: '待执行', color: 'amber', icon: 'clock' },
  completed: { name: '已完成', color: 'emerald', icon: 'check-circle' },
  cancelled: { name: '已取消', color: 'slate', icon: 'x-circle' },
} as const;

// 获取行动日志列表
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
    const status = searchParams.get('status');

    // 构建查询条件
    const conditions = [eq(projectActionLogs.projectId, projectId)];
    if (status) {
      conditions.push(eq(projectActionLogs.status, status));
    }

    const actionLogs = await db
      .select()
      .from(projectActionLogs)
      .where(and(...conditions))
      .orderBy(asc(projectActionLogs.actionDate), desc(projectActionLogs.createdAt));

    // 统计各状态数量
    const stats = await db
      .select({
        status: projectActionLogs.status,
        count: count(),
      })
      .from(projectActionLogs)
      .where(eq(projectActionLogs.projectId, projectId))
      .groupBy(projectActionLogs.status);

    const statsMap = stats.reduce((acc, s) => {
      acc[s.status] = s.count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: actionLogs,
      stats: statsMap,
      actionStatus: ACTION_STATUS,
    });
  } catch (error) {
    console.error('Failed to fetch action logs:', error);
    return NextResponse.json({ success: false, error: '获取行动日志失败' }, { status: 500 });
  }
});

// 添加行动日志
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
    const { actionContent, actionDate, reminderSet, reminderTime } = body;

    if (!actionContent) {
      return NextResponse.json({ success: false, error: '请填写行动内容' }, { status: 400 });
    }

    // 获取当前用户信息
    const [user] = await db
      .select({ realName: users.realName })
      .from(users)
      .where(eq(users.id, context.userId))
      .limit(1);

    const [newActionLog] = await db
      .insert(projectActionLogs)
      .values({
        projectId,
        actionContent,
        actionDate: actionDate || null,
        status: 'pending',
        reminderSet: reminderSet || false,
        reminderTime: reminderTime ? new Date(reminderTime) : null,
        createdBy: context.userId,
        createdByName: user?.realName || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newActionLog,
      message: '行动已添加',
    });
  } catch (error) {
    console.error('Failed to add action log:', error);
    return NextResponse.json({ success: false, error: '添加行动失败' }, { status: 500 });
  }
});

// 更新行动日志
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: '无效的项目ID' }, { status: 400 });
    }

    const body = await request.json();
    const { actionId, actionContent, actionDate, status, reminderSet, reminderTime } = body;

    if (!actionId) {
      return NextResponse.json({ success: false, error: '缺少行动记录ID' }, { status: 400 });
    }

    // 获取当前用户信息
    const [user] = await db
      .select({ realName: users.realName })
      .from(users)
      .where(eq(users.id, context.userId))
      .limit(1);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (actionContent) updateData.actionContent = actionContent;
    if (actionDate) updateData.actionDate = actionDate;
    if (reminderSet !== undefined) updateData.reminderSet = reminderSet;
    if (reminderTime) updateData.reminderTime = new Date(reminderTime);

    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completedAt = new Date();
        updateData.completedBy = context.userId;
        updateData.completedByName = user?.realName || null;
      }
    }

    const [updatedActionLog] = await db
      .update(projectActionLogs)
      .set(updateData)
      .where(eq(projectActionLogs.id, actionId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedActionLog,
      message: '行动已更新',
    });
  } catch (error) {
    console.error('Failed to update action log:', error);
    return NextResponse.json({ success: false, error: '更新行动失败' }, { status: 500 });
  }
});

// 删除行动日志
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: '无效的项目ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get('actionId');

    if (!actionId) {
      return NextResponse.json({ success: false, error: '缺少行动记录ID' }, { status: 400 });
    }

    await db.delete(projectActionLogs).where(eq(projectActionLogs.id, parseInt(actionId)));

    return NextResponse.json({
      success: true,
      message: '行动已删除',
    });
  } catch (error) {
    console.error('Failed to delete action log:', error);
    return NextResponse.json({ success: false, error: '删除行动失败' }, { status: 500 });
  }
});
