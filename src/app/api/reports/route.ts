import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { db } from '@/db';
import { customers, projects, users, leadFollowRecords } from '@/db/schema';
import { and, between, count, eq, sql, sum, desc, asc, isNull } from 'drizzle-orm';
import { aggregateProjectLifecycleRows, summarizeProjectLifecycle } from '@/lib/project-reporting';

// =====================================================
// 数据统计报表API
// =====================================================

export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const department = searchParams.get('department');

    // 根据类型返回不同的报表
    switch (type) {
      case 'overview':
        return await getOverviewReport(startDate, endDate, department);
      case 'customer':
        return await getCustomerReport(startDate, endDate, department);
      case 'project':
        return await getProjectReport(startDate, endDate, department);
      case 'sales':
        return await getSalesReport(startDate, endDate, department);
      case 'trend':
        return await getTrendReport(startDate, endDate);
      default:
        return errorResponse('BAD_REQUEST', '不支持的报表类型', { status: 400 });
    }
  } catch (error) {
    console.error('报表生成失败:', error);
    return errorResponse('INTERNAL_ERROR', '报表生成失败');
  }
});

// =====================================================
// 综合概览报表
// =====================================================

async function getOverviewReport(
  startDate: string | null,
  endDate: string | null,
  department: string | null
) {
  const dateFilter = startDate && endDate 
    ? between(customers.createdAt, new Date(startDate), new Date(endDate))
    : undefined;

  const deptFilter = department ? eq(users.department, department) : undefined;

  // 客户统计
  const customerStats = await db
    .select({
      total: count(),
      active: sql<number>`COUNT(CASE WHEN status = 'active' THEN 1 END)`,
      inactive: sql<number>`COUNT(CASE WHEN status = 'inactive' THEN 1 END)`,
      potential: sql<number>`COUNT(CASE WHEN status = 'potential' THEN 1 END)`,
    })
    .from(customers)
    .where(and(
      isNull(customers.deletedAt),
      dateFilter
    ));

  // 项目统计
  const projectLifecycleRows = await db
    .select({
      projectStage: projects.projectStage,
      bidResult: projects.bidResult,
      status: projects.status,
      count: count(),
      totalAmount: sum(projects.estimatedAmount),
      actualAmount: sum(projects.actualAmount),
    })
    .from(projects)
    .where(and(
      isNull(projects.deletedAt),
      startDate && endDate ? between(projects.createdAt, new Date(startDate), new Date(endDate)) : undefined
    ))
    .groupBy(projects.projectStage, projects.bidResult, projects.status);

  const projectStats = summarizeProjectLifecycle(projectLifecycleRows);

  // 金额统计
  const amountStats = await db
    .select({
      totalEstimated: sum(projects.estimatedAmount),
      totalActual: sum(projects.actualAmount),
      avgProjectAmount: sql<number>`AVG(COALESCE(actual_amount, estimated_amount))`,
    })
    .from(projects)
    .where(and(
      isNull(projects.deletedAt),
      startDate && endDate ? between(projects.createdAt, new Date(startDate), new Date(endDate)) : undefined
    ));

  // 销售人员统计
  const salesRepCount = await db
    .select({ count: count() })
    .from(users)
    .where(and(eq(users.status, 'active'), deptFilter));

  return successResponse({
    customers: customerStats[0] || { total: 0, active: 0, inactive: 0, potential: 0 },
    projects: projectStats,
    amounts: amountStats[0] || { totalEstimated: 0, totalActual: 0, avgProjectAmount: 0 },
    salesRepCount: salesRepCount[0]?.count || 0,
  });
}

// =====================================================
// 客户分析报表
// =====================================================

async function getCustomerReport(
  startDate: string | null,
  endDate: string | null,
  department: string | null
) {
  const dateFilter = startDate && endDate 
    ? between(customers.createdAt, new Date(startDate), new Date(endDate))
    : undefined;

  const customerWhereClause = and(isNull(customers.deletedAt), dateFilter);

  // 区域分布
  const regionDistribution = await db
    .select({
      region: customers.region,
      count: count(),
    })
    .from(customers)
    .where(customerWhereClause)
    .groupBy(customers.region)
    .orderBy(desc(count()));

  // 客户类型分布
  const typeDistribution = await db
    .select({
      customerTypeId: customers.customerTypeId,
      count: count(),
    })
    .from(customers)
    .where(customerWhereClause)
    .groupBy(customers.customerTypeId)
    .orderBy(desc(count()));

  // 客户状态分布
  const statusDistribution = await db
    .select({
      status: customers.status,
      count: count(),
    })
    .from(customers)
    .where(customerWhereClause)
    .groupBy(customers.status)
    .orderBy(desc(count()));

  // 金额Top10客户
  const topCustomers = await db
    .select({
      id: customers.id,
      customerName: customers.customerName,
      totalAmount: customers.totalAmount,
      projectCount: customers.currentProjectCount,
    })
    .from(customers)
    .where(customerWhereClause)
    .orderBy(desc(customers.totalAmount))
    .limit(10);

  // 新增客户趋势（按月）
  const customerTrend = await db
    .select({
      month: sql<string>`TO_CHAR(created_at, 'YYYY-MM')`,
      count: count(),
    })
    .from(customers)
    .where(customerWhereClause)
    .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM')`)
    .orderBy(asc(sql`TO_CHAR(created_at, 'YYYY-MM')`));

  return successResponse({
    regionDistribution,
    typeDistribution,
    statusDistribution,
    topCustomers,
    customerTrend,
  });
}

// =====================================================
// 项目分析报表
// =====================================================

async function getProjectReport(
  startDate: string | null,
  endDate: string | null,
  department: string | null
) {
  const dateFilter = startDate && endDate 
    ? between(projects.createdAt, new Date(startDate), new Date(endDate))
    : undefined;

  // 项目阶段分布
  const stageDistribution = await db
    .select({
      stage: projects.projectStage,
      count: count(),
      totalAmount: sum(projects.estimatedAmount),
    })
    .from(projects)
    .where(dateFilter)
    .groupBy(projects.projectStage)
    .orderBy(desc(count()));

  // 项目状态分布
  const rawStatusDistribution = await db
    .select({
      projectStage: projects.projectStage,
      bidResult: projects.bidResult,
      status: projects.status,
      count: count(),
      totalAmount: sum(projects.estimatedAmount),
      actualAmount: sum(projects.actualAmount),
    })
    .from(projects)
    .where(dateFilter)
    .groupBy(projects.projectStage, projects.bidResult, projects.status)
    .orderBy(desc(count()));

  const statusDistribution = aggregateProjectLifecycleRows(rawStatusDistribution);

  // 项目优先级分布
  const priorityDistribution = await db
    .select({
      priority: projects.priority,
      count: count(),
    })
    .from(projects)
    .where(dateFilter)
    .groupBy(projects.priority)
    .orderBy(desc(count()));

  // 金额Top10项目
  const topProjects = await db
    .select({
      id: projects.id,
      projectName: projects.projectName,
      customerName: projects.customerName,
      estimatedAmount: projects.estimatedAmount,
      actualAmount: projects.actualAmount,
      projectStage: projects.projectStage,
      status: projects.status,
    })
    .from(projects)
    .where(dateFilter)
    .orderBy(desc(projects.estimatedAmount))
    .limit(10);

  // 成功率统计
  const successRate = await db
    .select({
      total: count(),
      won: sql<number>`COUNT(CASE WHEN bid_result = 'won' THEN 1 END)`,
      cancelled: sql<number>`COUNT(CASE WHEN project_stage = 'cancelled' THEN 1 END)`,
    })
    .from(projects)
    .where(dateFilter);

  return successResponse({
    stageDistribution,
    statusDistribution,
    priorityDistribution,
    topProjects,
    successRate: successRate[0] || { total: 0, won: 0, cancelled: 0 },
  });
}

// =====================================================
// 销售业绩报表
// =====================================================

async function getSalesReport(
  startDate: string | null,
  endDate: string | null,
  department: string | null
) {
  const dateFilter = startDate && endDate 
    ? between(projects.createdAt, new Date(startDate), new Date(endDate))
    : undefined;

  // 销售人员业绩排名
  const salesRanking = await db
    .select({
      managerId: projects.managerId,
      totalProjects: count(),
      totalEstimated: sum(projects.estimatedAmount),
      totalActual: sum(projects.actualAmount),
    })
    .from(projects)
    .where(dateFilter)
    .groupBy(projects.managerId)
    .orderBy(desc(sum(projects.actualAmount)))
    .limit(20);

  // 获取用户信息
  const managerIds = salesRanking.map((r) => r.managerId).filter(Boolean) as number[];
  const managers = managerIds.length > 0 
    ? await db.select({ id: users.id, realName: users.realName, department: users.department })
        .from(users)
        .where(sql`${users.id} IN ${managerIds}`)
    : [];

  const managerMap = new Map(managers.map((m) => [m.id, m]));

  const rankingWithUsers = salesRanking.map((r) => ({
    ...r,
    managerName: r.managerId ? managerMap.get(r.managerId)?.realName : null,
    department: r.managerId ? managerMap.get(r.managerId)?.department : null,
  }));

  // 月度销售趋势
  const salesTrend = await db
    .select({
      month: sql<string>`TO_CHAR(${projects.createdAt}, 'YYYY-MM')`,
      estimatedAmount: sum(projects.estimatedAmount),
      actualAmount: sum(projects.actualAmount),
      projectCount: count(),
    })
    .from(projects)
    .where(dateFilter)
    .groupBy(sql`TO_CHAR(${projects.createdAt}, 'YYYY-MM')`)
    .orderBy(asc(sql`TO_CHAR(${projects.createdAt}, 'YYYY-MM')`));

  return successResponse({
    salesRanking: rankingWithUsers,
    salesTrend,
  });
}

// =====================================================
// 趋势分析报表
// =====================================================

async function getTrendReport(startDate: string | null, endDate: string | null) {
  const dateFilter = startDate && endDate 
    ? between(customers.createdAt, new Date(startDate), new Date(endDate))
    : undefined;

  // 客户增长趋势
  const customerTrend = await db
    .select({
      date: sql<string>`TO_CHAR(created_at, 'YYYY-MM-DD')`,
      count: count(),
    })
    .from(customers)
    .where(dateFilter)
    .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM-DD')`)
    .orderBy(asc(sql`TO_CHAR(created_at, 'YYYY-MM-DD')`));

  // 项目增长趋势
  const projectTrend = await db
    .select({
      date: sql<string>`TO_CHAR(created_at, 'YYYY-MM-DD')`,
      count: count(),
      amount: sum(projects.estimatedAmount),
    })
    .from(projects)
    .where(startDate && endDate ? between(projects.createdAt, new Date(startDate), new Date(endDate)) : undefined)
    .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM-DD')`)
    .orderBy(asc(sql`TO_CHAR(created_at, 'YYYY-MM-DD')`));

  // 跟进趋势
  const followTrend = await db
    .select({
      date: sql<string>`TO_CHAR(created_at, 'YYYY-MM-DD')`,
      count: count(),
    })
    .from(leadFollowRecords)
    .where(startDate && endDate ? between(leadFollowRecords.createdAt, new Date(startDate), new Date(endDate)) : undefined)
    .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM-DD')`)
    .orderBy(asc(sql`TO_CHAR(created_at, 'YYYY-MM-DD')`));

  return successResponse({
    customerTrend,
    projectTrend,
    followTrend,
  });
}
