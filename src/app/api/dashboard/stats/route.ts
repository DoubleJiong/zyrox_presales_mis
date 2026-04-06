import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers, projects, users } from '@/db/schema';
import { count, and, gte, lte, sql, desc, isNull, eq, inArray } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { getAccessibleProjectIds } from '@/lib/permissions/project';
import { canViewGlobalDashboard } from '@/shared/policy/dashboard-policy';
import { getDashboardMetrics } from '@/modules/dashboard/dashboard-metric-service';
import { resolveProjectLifecycleBucket } from '@/lib/project-reporting';

function normalizeProvinceName(region: string | null): string | null {
  if (!region) {
    return null;
  }

  const normalized = region.trim();
  if (!normalized) {
    return null;
  }

  const directMap: Record<string, string> = {
    北京市: '北京',
    天津市: '天津',
    上海市: '上海',
    重庆市: '重庆',
    内蒙古自治区: '内蒙古',
    广西壮族自治区: '广西',
    西藏自治区: '西藏',
    宁夏回族自治区: '宁夏',
    新疆维吾尔自治区: '新疆',
    香港特别行政区: '香港',
    澳门特别行政区: '澳门',
    新疆生产建设兵团: '新疆',
  };

  if (directMap[normalized]) {
    return directMap[normalized];
  }

  return normalized
    .replace(/省$/u, '')
    .replace(/市$/u, '')
    .replace(/壮族自治区$/u, '')
    .replace(/回族自治区$/u, '')
    .replace(/维吾尔自治区$/u, '')
    .replace(/自治区$/u, '')
    .replace(/特别行政区$/u, '');
}

/**
 * GET /api/dashboard/stats
 * 获取仪表盘统计数据（已修正数据源和数据权限）
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user: any }
) => {
  try {
    const userId = context.userId;
    const hasGlobalScope = canViewGlobalDashboard(context.user);
    const accessibleProjectIds = hasGlobalScope ? [] : await getAccessibleProjectIds(userId);
    const metrics = await getDashboardMetrics({
      userId,
      hasGlobalScope,
      accessibleProjectIds,
    });
    
    // 构建客户查询条件（考虑数据权限）
    let customerWhereCondition = isNull(customers.deletedAt);
    if (!hasGlobalScope) {
      customerWhereCondition = and(isNull(customers.deletedAt), eq(customers.createdBy, userId));
    }
    
    // 构建项目查询条件（考虑数据权限）
    let projectWhereCondition = isNull(projects.deletedAt);
    if (!hasGlobalScope) {
      if (accessibleProjectIds.length === 0) {
        projectWhereCondition = and(isNull(projects.deletedAt), sql`1 = 0`); // 无权限则返回空
      } else {
        projectWhereCondition = and(
          isNull(projects.deletedAt),
          inArray(projects.id, accessibleProjectIds)
        );
      }
    }

    // 基础统计数据 - 使用正确的表并应用数据权限
    const [customersCount, staffCount] = await Promise.all([
      db.select({ count: count() }).from(customers).where(customerWhereCondition),
      db.select({ count: count() }).from(users).where(sql`${users.status} = 'active'`),
    ]);

    // 计算转化率（从线索转化）- 应用数据权限
    const activeCustomers = await db
      .select({ count: count() })
      .from(customers)
      .where(
        and(
          customerWhereCondition,
          sql`${customers.currentProjectCount} > 0`
        )
      );

    const engagementRate = customersCount[0].count > 0
      ? ((activeCustomers[0].count / customersCount[0].count) * 100).toFixed(1)
      : '0';

    // 计算总收入 - 应用数据权限
    const closedProjectRevenueRows = await db
      .select({
        projectStage: projects.projectStage,
        bidResult: projects.bidResult,
        status: projects.status,
        actualAmount: sql<number>`COALESCE(SUM(CAST(${projects.actualAmount} AS DECIMAL)), 0)`,
        estimatedAmount: sql<number>`COALESCE(SUM(CAST(${projects.estimatedAmount} AS DECIMAL)), 0)`,
      })
      .from(projects)
      .where(projectWhereCondition)
      .groupBy(projects.projectStage, projects.bidResult, projects.status);

    const wonRevenueRows = closedProjectRevenueRows.filter((row) => resolveProjectLifecycleBucket(row) === 'won');
    const totalRevenue = wonRevenueRows.reduce((sum, row) => sum + Number(row.actualAmount || 0), 0);
    const estimatedRevenue = wonRevenueRows.reduce((sum, row) => sum + Number(row.estimatedAmount || 0), 0);

    // 计算平均项目周期 - 应用数据权限
    // BUG-018: 修复负数平均项目时长问题
    const avgDuration = await db
      .select({
        avg: sql<number>`COALESCE(AVG(${projects.endDate}::date - ${projects.startDate}::date), 0)`,
      })
      .from(projects)
      .where(
        and(
          sql`${projects.startDate} IS NOT NULL`,
          sql`${projects.endDate} IS NOT NULL`,
          sql`${projects.endDate} >= ${projects.startDate}`, // 只计算结束日期>=开始日期的项目
          projectWhereCondition
        )
      );

    // 客户满意度（从评估数据计算，暂时返回固定值）
    const avgSatisfaction = '88.5';
    
    // 计算平均项目周期，确保非负
    const rawAvgDuration = Math.round(avgDuration[0].avg || 30);
    const finalAvgDuration = rawAvgDuration >= 0 ? rawAvgDuration : 0;

    // 月度数据（从数据库获取最近6个月）- 应用数据权限
    const monthlyData = await db
      .select({
        month: sql<string>`TO_CHAR(${projects.createdAt}, 'YYYY-MM')`,
        customers: sql<number>`COUNT(DISTINCT ${projects.customerId})`,
        projects: sql<number>`COUNT(*)`,
        actualRevenue: sql<number>`COALESCE(SUM(CAST(${projects.actualAmount} AS DECIMAL)), 0)`,
        estimatedRevenue: sql<number>`COALESCE(SUM(CAST(${projects.estimatedAmount} AS DECIMAL)), 0)`,
      })
      .from(projects)
      .where(
        and(
          sql`${projects.createdAt} >= NOW() - INTERVAL '6 months'`,
          projectWhereCondition
        )
      )
      .groupBy(sql`TO_CHAR(${projects.createdAt}, 'YYYY-MM')`)
      .orderBy(desc(sql`TO_CHAR(${projects.createdAt}, 'YYYY-MM')`))
      .limit(6);

    const [projectTypeDistributionRows, customerRegionRows, projectRegionRows] = await Promise.all([
      db
        .select({
          name: projects.projectType,
          value: count(),
        })
        .from(projects)
        .where(and(projectWhereCondition, sql`${projects.projectType} IS NOT NULL`, sql`${projects.projectType} <> ''`))
        .groupBy(projects.projectType)
        .orderBy(desc(count()))
        .limit(8),
      db
        .select({
          name: customers.region,
          value: count(),
        })
        .from(customers)
        .where(and(customerWhereCondition, sql`${customers.region} IS NOT NULL`, sql`${customers.region} <> ''`))
        .groupBy(customers.region)
        .orderBy(desc(count()))
        .limit(12),
      db
        .select({
          name: projects.region,
          value: count(),
        })
        .from(projects)
        .where(and(projectWhereCondition, sql`${projects.region} IS NOT NULL`, sql`${projects.region} <> ''`))
        .groupBy(projects.region)
        .orderBy(desc(count()))
        .limit(12),
    ]);

    const customerRegionDistribution = customerRegionRows
      .map((item) => ({
        name: normalizeProvinceName(item.name),
        value: Number(item.value),
      }))
      .filter((item): item is { name: string; value: number } => Boolean(item.name));

    const projectRegionDistribution = projectRegionRows
      .map((item) => ({
        name: normalizeProvinceName(item.name),
        value: Number(item.value),
      }))
      .filter((item): item is { name: string; value: number } => Boolean(item.name));

    const projectTypeDistribution = projectTypeDistributionRows.map((item) => ({
      name: item.name || '未分类',
      value: Number(item.value),
    }));

    return successResponse({
      stats: {
        totalCustomers: customersCount[0].count,
        totalProjects: metrics.totalProjects,
        totalSolutions: metrics.totalSolutions,
        projectsByStage: metrics.projectsByStage,
        pendingTasks: metrics.pendingTasks,
        totalStaff: staffCount[0].count,
        engagementRate: Number(engagementRate), // 客户参与率（有项目的客户占比）
        avgProjectDuration: finalAvgDuration,
        totalRevenue, // 实际总收入
        estimatedRevenue, // 预估总收入
        avgSatisfaction: Number(avgSatisfaction),
        projectTypeDistribution,
        customerRegionDistribution,
        projectRegionDistribution,
        recentProjects: metrics.recentProjects,
      },
      monthlyData: monthlyData.reverse().map(item => ({
        month: item.month,
        customers: Number(item.customers),
        projects: Number(item.projects),
        revenue: Number(item.actualRevenue), // 默认使用实际金额
        actualRevenue: Number(item.actualRevenue),
        estimatedRevenue: Number(item.estimatedRevenue),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return errorResponse('INTERNAL_ERROR', '获取仪表盘统计数据失败');
  }
});
