import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, projects, customers, solutions, opportunities } from '@/db/schema';
import { eq, and, sql, gte, lte, between, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { aggregateProjectLifecycleRows, summarizeProjectLifecycle } from '@/lib/project-reporting';

// GET - 获取报表统计数据
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = context.userId;

    switch (type) {
      case 'overview':
        return successResponse(await getOverviewStats());
      
      case 'project':
        return successResponse(await getProjectStats(startDate, endDate));
      
      case 'task':
        return successResponse(await getTaskStats(userId, startDate, endDate));
      
      case 'customer':
        return successResponse(await getCustomerStats(startDate, endDate));
      
      case 'opportunity':
        return successResponse(await getOpportunityStats(startDate, endDate));
      
      case 'knowledge':
        return successResponse(await getKnowledgeStats(startDate, endDate));
      
      default:
        return errorResponse('BAD_REQUEST', '未知的统计类型');
    }
  } catch (error) {
    console.error('Failed to fetch report statistics:', error);
    return errorResponse('INTERNAL_ERROR', '获取统计数据失败');
  }
});

// 概览统计
async function getOverviewStats() {
  // 项目统计
  const projectLifecycleRows = await db
    .select({
      projectStage: projects.projectStage,
      bidResult: projects.bidResult,
      status: projects.status,
      count: sql<number>`count(*)::int`,
      totalAmount: sql<string>`coalesce(sum(estimated_amount), 0)`,
      actualAmount: sql<string>`coalesce(sum(actual_amount), 0)`,
    })
    .from(projects)
    .where(isNull(projects.deletedAt))
    .groupBy(projects.projectStage, projects.bidResult, projects.status);

  const projectStats = summarizeProjectLifecycle(projectLifecycleRows);

  // 任务统计
  const [taskStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where status = 'pending')::int`,
      inProgress: sql<number>`count(*) filter (where status = 'in_progress')::int`,
      completed: sql<number>`count(*) filter (where status = 'completed')::int`,
      overdue: sql<number>`count(*) filter (where status not in ('completed', 'cancelled') and due_date < current_date)::int`,
    })
    .from(tasks)
    .where(isNull(tasks.deletedAt));

  // 客户统计
  const [customerStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where status = 'active')::int`,
      potential: sql<number>`count(*) filter (where status = 'potential')::int`,
    })
    .from(customers)
    .where(isNull(customers.deletedAt));

  // 商机统计（使用真实商机实体）
  const [opportunityStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      newThisMonth: sql<number>`count(*) filter (where created_at >= date_trunc('month', current_date))::int`,
      totalAmount: sql<string>`coalesce(sum(estimated_amount), 0)`,
    })
    .from(opportunities)
    .where(and(
      isNull(opportunities.deletedAt)
    ));

  return {
    projects: projectStats,
    tasks: taskStats,
    customers: customerStats,
    opportunities: opportunityStats,
  };
}

// 项目统计
async function getProjectStats(startDate?: string | null, endDate?: string | null) {
  const conditions = [isNull(projects.deletedAt)];

  // 按状态分组统计
  const rawStatusStats = await db
    .select({
      projectStage: projects.projectStage,
      bidResult: projects.bidResult,
      status: projects.status,
      count: sql<number>`count(*)::int`,
      totalAmount: sql<string>`coalesce(sum(estimated_amount), 0)`,
      actualAmount: sql<string>`coalesce(sum(actual_amount), 0)`,
    })
    .from(projects)
    .where(and(...conditions))
    .groupBy(projects.projectStage, projects.bidResult, projects.status);

  const statusStats = aggregateProjectLifecycleRows(rawStatusStats).map((row) => ({
    status: row.status,
    count: row.count,
  }));

  // 按月份统计新增项目
  const monthlyStats = await db
    .select({
      month: sql<string>`to_char(created_at, 'YYYY-MM')`,
      count: sql<number>`count(*)::int`,
    })
    .from(projects)
    .where(isNull(projects.deletedAt))
    .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
    .orderBy(sql`to_char(created_at, 'YYYY-MM')`)
    .limit(12);

  // 项目金额分布
  const amountDistribution = await db
    .select({
      range: sql<string>`
        CASE 
          WHEN total_amount::numeric < 100000 THEN '0-10万'
          WHEN total_amount::numeric < 500000 THEN '10-50万'
          WHEN total_amount::numeric < 1000000 THEN '50-100万'
          WHEN total_amount::numeric < 5000000 THEN '100-500万'
          ELSE '500万以上'
        END
      `,
      count: sql<number>`count(*)::int`,
    })
    .from(projects)
    .where(isNull(projects.deletedAt))
    .groupBy(sql`
      CASE 
        WHEN total_amount::numeric < 100000 THEN '0-10万'
        WHEN total_amount::numeric < 500000 THEN '10-50万'
        WHEN total_amount::numeric < 1000000 THEN '50-100万'
        WHEN total_amount::numeric < 5000000 THEN '100-500万'
        ELSE '500万以上'
      END
    `);

  return {
    byStatus: statusStats,
    monthly: monthlyStats,
    amountDistribution,
  };
}

// 任务统计
async function getTaskStats(userId: number, startDate?: string | null, endDate?: string | null) {
  const conditions = [isNull(tasks.deletedAt)];

  // 按状态分组
  const statusStats = await db
    .select({
      status: tasks.status,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(and(...conditions))
    .groupBy(tasks.status);

  // 按优先级分组
  const priorityStats = await db
    .select({
      priority: tasks.priority,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(and(...conditions))
    .groupBy(tasks.priority);

  // 按类型分组
  const typeStats = await db
    .select({
      type: tasks.taskType,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(and(...conditions))
    .groupBy(tasks.taskType);

  // 完成率趋势（按周）
  const weeklyCompletion = await db
    .select({
      week: sql<string>`date_trunc('week', created_at)`,
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where status = 'completed')::int`,
    })
    .from(tasks)
    .where(isNull(tasks.deletedAt))
    .groupBy(sql`date_trunc('week', created_at)`)
    .orderBy(sql`date_trunc('week', created_at) desc`)
    .limit(8);

  return {
    byStatus: statusStats,
    byPriority: priorityStats,
    byType: typeStats,
    weeklyCompletion,
  };
}

// 客户统计
async function getCustomerStats(startDate?: string | null, endDate?: string | null) {
  // 按状态分组
  const statusStats = await db
    .select({
      status: customers.status,
      count: sql<number>`count(*)::int`,
    })
    .from(customers)
    .where(isNull(customers.deletedAt))
    .groupBy(customers.status);

  // 按地区分组
  const regionStats = await db
    .select({
      region: customers.region,
      count: sql<number>`count(*)::int`,
    })
    .from(customers)
    .where(isNull(customers.deletedAt))
    .groupBy(customers.region)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  // 按客户类型分组
  const typeStats = await db
    .select({
      typeId: customers.customerTypeId,
      count: sql<number>`count(*)::int`,
    })
    .from(customers)
    .where(isNull(customers.deletedAt))
    .groupBy(customers.customerTypeId);

  // 新增趋势（按月）
  const monthlyNew = await db
    .select({
      month: sql<string>`to_char(created_at, 'YYYY-MM')`,
      count: sql<number>`count(*)::int`,
    })
    .from(customers)
    .where(isNull(customers.deletedAt))
    .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
    .orderBy(sql`to_char(created_at, 'YYYY-MM') desc`)
    .limit(12);

  return {
    byStatus: statusStats,
    byRegion: regionStats,
    byType: typeStats,
    monthlyNew,
  };
}

// 商机统计（使用项目表中商机阶段的项目）
async function getOpportunityStats(startDate?: string | null, endDate?: string | null) {
  const conditions = [
    isNull(opportunities.deletedAt),
    startDate && endDate ? between(opportunities.createdAt, new Date(startDate), new Date(endDate)) : undefined,
  ];

  // 按商机状态分组
  const statusStats = await db
    .select({
      status: opportunities.status,
      count: sql<number>`count(*)::int`,
      totalAmount: sql<string>`coalesce(sum(estimated_amount), 0)`,
    })
    .from(opportunities)
    .where(and(...conditions))
    .groupBy(opportunities.status);

  // 商机漏斗（按真实商机状态统计）
  const funnel = await db
    .select({
      status: opportunities.status,
      count: sql<number>`count(*)::int`,
      amount: sql<string>`coalesce(sum(estimated_amount), 0)`,
    })
    .from(opportunities)
    .where(and(...conditions))
    .groupBy(opportunities.status)
    .orderBy(sql`
      CASE ${opportunities.status}
        WHEN 'prospecting' THEN 1
        WHEN 'qualified' THEN 2
        WHEN 'proposal' THEN 3
        WHEN 'negotiation' THEN 4
        WHEN 'won' THEN 5
        WHEN 'lost' THEN 6
        ELSE 7
      END
    `);

  return {
    byStatus: statusStats,
    funnel,
  };
}

// 知识库统计
async function getKnowledgeStats(startDate?: string | null, endDate?: string | null) {
  // 按类型分组
  const typeStats = await db
    .select({
      type: solutions.type,
      count: sql<number>`count(*)::int`,
    })
    .from(solutions)
    .where(isNull(solutions.deletedAt as any))
    .groupBy(solutions.type);

  // 热门内容
  const popular = await db
    .select({
      id: solutions.id,
      title: solutions.title,
      type: solutions.type,
      viewCount: solutions.viewCount,
    })
    .from(solutions)
    .where(isNull(solutions.deletedAt as any))
    .orderBy(sql`view_count desc`)
    .limit(10);

  // 贡献排行
  const contributors = await db
    .select({
      authorId: solutions.authorId,
      count: sql<number>`count(*)::int`,
    })
    .from(solutions)
    .where(isNull(solutions.deletedAt as any))
    .groupBy(solutions.authorId)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  return {
    byType: typeStats,
    popular,
    contributors,
  };
}
