import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, solutions, arbitrations, alertNotifications, tasks, messages } from '@/db/schema';
import { count, eq, and, isNull, sql, or } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

/**
 * GET /api/navigation/badges
 * 获取导航栏各模块的待处理数量
 */
export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    // 并行查询所有待处理数量
    const [
      draftProjectsCount,
      pendingSolutionsCount,
      pendingArbitrationsCount,
      pendingAlertsCount,
      pendingTasksCount,
      unreadMessagesCount,
    ] = await Promise.all([
      // 项目待处理数量：以商机阶段为主，兼容历史 draft 状态
      db.select({ count: count() })
        .from(projects)
        .where(and(
          sql`(${projects.projectStage} = 'opportunity' OR ${projects.status} = 'draft')`,
          isNull(projects.deletedAt)
        )),
      
      // 待审核方案数量
      db.select({ count: count() })
        .from(solutions)
        .where(and(
          or(eq(solutions.status, 'reviewing'), eq(solutions.approvalStatus, 'pending')),
          isNull(solutions.deletedAt)
        )),
      
      // 待处理仲裁数量
      db.select({ count: count() })
        .from(arbitrations)
        .where(and(
          eq(arbitrations.status, 'pending'),
          isNull(arbitrations.deletedAt)
        )),
      
      // 待处理预警数量（当前用户）
      db.select({ count: count() })
        .from(alertNotifications)
        .where(and(
          eq(alertNotifications.recipientId, userId),
          eq(alertNotifications.status, 'pending'),
          isNull(alertNotifications.deletedAt)
        )),
      
      // 待处理任务数量（当前用户）
      db.select({ count: count() })
        .from(tasks)
        .where(and(
          eq(tasks.assigneeId, userId),
          eq(tasks.status, 'pending'),
          isNull(tasks.deletedAt)
        )),
      
      // 未读消息数量
      db.select({ count: count() })
        .from(messages)
        .where(and(
          eq(messages.receiverId, userId),
          eq(messages.isRead, false),
          eq(messages.isDeleted, false)
        )),
    ]);

    // 汇总结果
    const badges = {
      projects: draftProjectsCount[0]?.count || 0,
      solutions: pendingSolutionsCount[0]?.count || 0,
      arbitrations: pendingArbitrationsCount[0]?.count || 0,
      alerts: pendingAlertsCount[0]?.count || 0,
      tasks: pendingTasksCount[0]?.count || 0,
      messages: unreadMessagesCount[0]?.count || 0,
    };

    return successResponse(badges);
  } catch (error) {
    console.error('Failed to fetch navigation badges:', error);
    return errorResponse('INTERNAL_ERROR', '获取导航徽章失败');
  }
});
