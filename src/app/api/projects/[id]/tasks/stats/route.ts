import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, users } from '@/db/schema';
import { eq, and, isNull, sql, desc } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET - 获取任务统计数据
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    // 总体统计
    const overallStats = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${tasks.status} = 'pending')::int`,
        inProgress: sql<number>`count(*) filter (where ${tasks.status} = 'in_progress')::int`,
        completed: sql<number>`count(*) filter (where ${tasks.status} = 'completed')::int`,
        cancelled: sql<number>`count(*) filter (where ${tasks.status} = 'cancelled')::int`,
        overdue: sql<number>`count(*) filter (where ${tasks.status} not in ('completed', 'cancelled') and ${tasks.dueDate} < current_date)::int`,
        highPriority: sql<number>`count(*) filter (where ${tasks.priority} = 'high')::int`,
        mediumPriority: sql<number>`count(*) filter (where ${tasks.priority} = 'medium')::int`,
        lowPriority: sql<number>`count(*) filter (where ${tasks.priority} = 'low')::int`,
        totalEstimatedHours: sql<number>`coalesce(sum(${tasks.estimatedHours}::numeric), 0)::int`,
        totalActualHours: sql<number>`coalesce(sum(${tasks.actualHours}::numeric), 0)::int`,
      })
      .from(tasks)
      .where(and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt)));

    // 按任务类型统计
    const typeStats = await db
      .select({
        taskType: tasks.taskType,
        count: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where ${tasks.status} = 'completed')::int`,
        inProgress: sql<number>`count(*) filter (where ${tasks.status} = 'in_progress')::int`,
      })
      .from(tasks)
      .where(and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt)))
      .groupBy(tasks.taskType);

    // 按负责人统计
    const assigneeStats = await db
      .select({
        assigneeId: tasks.assigneeId,
        assigneeName: users.realName,
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where ${tasks.status} = 'completed')::int`,
        inProgress: sql<number>`count(*) filter (where ${tasks.status} = 'in_progress')::int`,
        pending: sql<number>`count(*) filter (where ${tasks.status} = 'pending')::int`,
        totalHours: sql<number>`coalesce(sum(${tasks.actualHours}::numeric), 0)::int`,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt)))
      .groupBy(tasks.assigneeId, users.realName)
      .orderBy(desc(sql`count(*)`));

    // 按周统计进度（最近4周）
    const weeklyProgress = await db
      .select({
        week: sql<string>`date_trunc('week', ${tasks.completedDate})`,
        completed: sql<number>`count(*)::int`,
        hours: sql<number>`coalesce(sum(${tasks.actualHours}::numeric), 0)::int`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          eq(tasks.status, 'completed'),
          isNull(tasks.deletedAt),
          sql`${tasks.completedDate} >= current_date - interval '28 days'`
        )
      )
      .groupBy(sql`date_trunc('week', ${tasks.completedDate})`)
      .orderBy(sql`date_trunc('week', ${tasks.completedDate})`);

    // 完成率计算
    const overall = overallStats[0] || {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      overdue: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
      totalEstimatedHours: 0,
      totalActualHours: 0,
    };

    const completionRate = overall.total > 0 
      ? Math.round((overall.completed / overall.total) * 100) 
      : 0;

    const onTimeRate = (overall.completed + overall.cancelled) > 0
      ? Math.round((overall.completed / (overall.completed + overall.cancelled)) * 100)
      : 0;

    return successResponse({
      overall: {
        ...overall,
        completionRate,
        onTimeRate,
      },
      byType: typeStats,
      byAssignee: assigneeStats,
      weeklyProgress,
    });
  } catch (error) {
    console.error('Failed to fetch task stats:', error);
    return errorResponse('INTERNAL_ERROR', '获取任务统计失败');
  }
});
