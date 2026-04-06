import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, alertNotifications, alertHistories, projects } from '@/db/schema';
import { and, eq, or, isNull, desc } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';

/**
 * GET /api/my-tasks
 * 获取当前用户的所有任务：预警任务 + 指派任务
 */
export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // all, alert, assigned
    const status = searchParams.get('status') || 'pending'; // all, pending, in_progress, completed

    const alertTasks: any[] = [];
    const assignedTasks: any[] = [];

    // 1. 获取预警任务
    if (type === 'all' || type === 'alert') {
      const alerts = await db
        .select({
          id: alertNotifications.id,
          alertHistoryId: alertNotifications.alertHistoryId,
          status: alertNotifications.status,
          createdAt: alertNotifications.createdAt,
          // 预警历史信息
          targetType: alertHistories.targetType,
          targetId: alertHistories.targetId,
          targetName: alertHistories.targetName,
          severity: alertHistories.severity,
          alertStatus: alertHistories.status,
          alertData: alertHistories.alertData,
          // 规则信息
          ruleName: alertHistories.ruleName,
          ruleId: alertHistories.ruleId,
        })
        .from(alertNotifications)
        .innerJoin(alertHistories, eq(alertNotifications.alertHistoryId, alertHistories.id))
        .where(and(
          eq(alertNotifications.recipientId, userId),
          status !== 'all' ? eq(alertNotifications.status, status) : undefined,
          isNull(alertNotifications.deletedAt)
        ))
        .orderBy(desc(alertNotifications.createdAt));

      for (const alert of alerts) {
        // 获取关联对象名称
        let relatedName = alert.targetName || '';
        if (alert.targetType === 'project' && alert.targetId) {
          const [project] = await db
            .select({ projectName: projects.projectName })
            .from(projects)
            .where(eq(projects.id, alert.targetId))
            .limit(1);
          relatedName = project?.projectName || relatedName;
        }

        alertTasks.push({
          id: `alert-${alert.id}`,
          type: 'alert',
          title: alert.ruleName || '预警任务',
          description: alert.alertData ? JSON.stringify(alert.alertData) : null,
          severity: alert.severity,
          status: alert.status,
          relatedType: alert.targetType,
          relatedId: alert.targetId,
          relatedName,
          ruleName: alert.ruleName,
          createdAt: alert.createdAt,
        });
      }
    }

    // 2. 获取指派任务
    if (type === 'all' || type === 'assigned') {
      const statusCondition = status === 'all' 
        ? undefined 
        : status === 'pending' 
          ? or(eq(tasks.status, 'pending'), eq(tasks.status, 'in_progress'))
          : eq(tasks.status, status);

      const assigned = await db
        .select({
          id: tasks.id,
          taskName: tasks.taskName,
          taskType: tasks.taskType,
          description: tasks.description,
          status: tasks.status,
          priority: tasks.priority,
          progress: tasks.progress,
          startDate: tasks.startDate,
          dueDate: tasks.dueDate,
          estimatedHours: tasks.estimatedHours,
          actualHours: tasks.actualHours,
          projectId: tasks.projectId,
          createdAt: tasks.createdAt,
        })
        .from(tasks)
        .where(and(
          eq(tasks.assigneeId, userId),
          statusCondition,
          isNull(tasks.deletedAt)
        ))
        .orderBy(desc(tasks.createdAt));

      for (const task of assigned) {
        // 获取项目名称
        let projectName = '';
        if (task.projectId) {
          const [project] = await db
            .select({ projectName: projects.projectName })
            .from(projects)
            .where(eq(projects.id, task.projectId))
            .limit(1);
          projectName = project?.projectName || '';
        }

        assignedTasks.push({
          id: `assigned-${task.id}`,
          type: 'assigned',
          title: task.taskName,
          description: task.description,
          taskType: task.taskType,
          status: task.status,
          priority: task.priority,
          progress: task.progress,
          startDate: task.startDate,
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours,
          actualHours: task.actualHours,
          projectId: task.projectId,
          projectName,
          createdAt: task.createdAt,
        });
      }
    }

    // 合并并排序
    const allTasks = [...alertTasks, ...assignedTasks].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        alertTasks,
        assignedTasks,
        allTasks,
        stats: {
          total: allTasks.length,
          alertCount: alertTasks.length,
          assignedCount: assignedTasks.length,
          pending: allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
          completed: allTasks.filter(t => t.status === 'completed').length,
        },
      },
    });
  } catch (error) {
    console.error('Get my tasks API error:', error);
    return NextResponse.json(
      { success: false, error: '获取任务列表失败' },
      { status: 500 }
    );
  }
});
