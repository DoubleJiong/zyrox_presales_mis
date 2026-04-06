import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { getAccessibleProjectIds } from '@/lib/permissions/project';
import { canViewGlobalDashboard } from '@/shared/policy/dashboard-policy';
import { getDashboardMetrics } from '@/modules/dashboard/dashboard-metric-service';

/**
 * GET /api/dashboard
 * 获取仪表盘数据
 * 已修复：添加认证中间件保护和数据权限过滤
 */
export const GET = withAuth(async (request: NextRequest, { userId, user }) => {
  try {
    const hasGlobalScope = canViewGlobalDashboard(user);
    const accessibleProjectIds = hasGlobalScope ? [] : await getAccessibleProjectIds(userId);
    const metrics = await getDashboardMetrics({
      userId,
      hasGlobalScope,
      accessibleProjectIds,
    });

    let recentNotifications: Array<{
      id: number;
      type: string;
      title: string;
      content: string;
      priority: string;
      isRead: boolean;
      link: string | null;
      createdAt: Date;
    }> = [];

    if (process.env.DATABASE_URL) {
      try {
        const { getUserNotifications } = await import('@/lib/notification');
        const notificationResult = await getUserNotifications(userId, { limit: 5 });
        recentNotifications = notificationResult.data.map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          content: item.content,
          priority: item.priority,
          isRead: item.isRead,
          link: item.link,
          createdAt: item.createdAt,
        }));
      } catch (notificationError) {
        console.warn('Dashboard notifications unavailable, falling back to empty list:', notificationError);
      }
    }

    return NextResponse.json({
      totalCustomers: metrics.totalCustomers,
      totalProjects: metrics.totalProjects,
      totalSolutions: metrics.totalSolutions,
      pendingTasks: metrics.pendingTasks,
      projectsByStage: metrics.projectsByStage,
      recentProjects: metrics.recentProjects,
      recentNotifications,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return errorResponse('INTERNAL_ERROR', '获取仪表盘数据失败');
  }
});
