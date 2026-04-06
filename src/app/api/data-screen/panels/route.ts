import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  projects, customers, users, opportunities, solutions,
  projectMembers
} from '@/db/schema';
import { count, sum, sql, desc, and, gte, lte, eq, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { aggregateProjectLifecycleRows } from '@/lib/project-reporting';
import { getProjectDisplayStatusLabel } from '@/lib/project-display';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const panelType = searchParams.get('type') || 'sales';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let panelData: any;

    switch (panelType) {
      case 'sales':
        panelData = await getSalesPanelData(startDate, endDate);
        break;
      case 'customers':
        panelData = await getCustomersPanelData(startDate, endDate);
        break;
      case 'projects':
        panelData = await getProjectsPanelData(startDate, endDate);
        break;
      case 'solutions':
        panelData = await getSolutionsPanelData(startDate, endDate);
        break;
      default:
        panelData = await getSalesPanelData(startDate, endDate);
    }

    return successResponse(panelData);
  } catch (error) {
    console.error('Panel data API error:', error);
    return errorResponse('INTERNAL_ERROR', '获取面板数据失败');
  }
});

// 售前数据面板
async function getSalesPanelData(startDate?: string | null, endDate?: string | null) {
  // 1. 月度之星 - 按签约金额排名
  const topPerformers = await db
    .select({
      id: users.id,
      name: users.realName,
      department: users.department,
      totalAmount: sql<string>`COALESCE(SUM(CAST(${projects.contractAmount} AS DECIMAL)), 0)`,
      projectCount: count(projects.id),
    })
    .from(users)
    .leftJoin(projects, sql`${users.id} = ${projects.managerId} AND ${projects.deletedAt} IS NULL`)
    .where(sql`${users.status} = 'active' AND ${users.deletedAt} IS NULL`)
    .groupBy(users.id, users.realName, users.department)
    .orderBy(desc(sql`COALESCE(SUM(CAST(${projects.contractAmount} AS DECIMAL)), 0)`))
    .limit(10);

  // 2. 工作饱和度 - 按项目成员数量计算
  const workSaturation = await db
    .select({
      id: users.id,
      name: users.realName,
      projectCount: count(projectMembers.projectId),
    })
    .from(users)
    .leftJoin(projectMembers, eq(users.id, projectMembers.userId))
    .where(sql`${users.status} = 'active'`)
    .groupBy(users.id, users.realName)
    .orderBy(desc(count(projectMembers.projectId)))
    .limit(6);

  // 3. 按区域统计售前活动
  const regionStats = await db
    .select({
      region: projects.region,
      count: count(),
      amount: sql<string>`COALESCE(SUM(CAST(${projects.estimatedAmount} AS DECIMAL)), 0)`,
    })
    .from(projects)
    .where(sql`${projects.deletedAt} IS NULL`)
    .groupBy(projects.region);

  // 4. 项目阶段分布
  const stageDistribution = await db
    .select({
      stage: projects.projectStage,
      count: count(),
    })
    .from(projects)
    .where(sql`${projects.deletedAt} IS NULL`)
    .groupBy(projects.projectStage);

  // 5. 商机阶段分布
  const opportunityStages = await db
    .select({
      stage: opportunities.stage,
      count: count(),
      amount: sql<string>`COALESCE(SUM(CAST(${opportunities.estimatedAmount} AS DECIMAL)), 0)`,
    })
    .from(opportunities)
    .where(isNull(opportunities.deletedAt))
    .groupBy(opportunities.stage);

  // 计算转化率
  const wonOpportunities = opportunityStages.find(s => s.stage === 'won')?.count || 0;
  const totalOpportunities = opportunityStages.reduce((sum, s) => sum + s.count, 0);
  const conversionRate = totalOpportunities > 0 ? (wonOpportunities / totalOpportunities * 100).toFixed(1) : '0';

  // 生成月度趋势数据（最近6个月）
  const monthlyTrends = await generateMonthlyTrends();

  return {
    topPerformers: topPerformers.slice(0, 3).map((p, i) => ({
      rank: i + 1,
      id: p.id,
      name: p.name || '未知',
      region: p.department || '未分配',
      score: `¥${(parseFloat(p.totalAmount) / 10000).toFixed(0)}万`,
      amount: parseFloat(p.totalAmount),
      activities: p.projectCount || 0,
    })),
    workSaturation: workSaturation.map(w => ({
      name: w.name || '未知',
      value: Math.min(w.projectCount * 15, 100), // 每个项目贡献15%饱和度，最大100%
      projectCount: w.projectCount,
    })),
    regionDistribution: regionStats
      .filter(r => r.region)
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
      .slice(0, 6)
      .map(r => ({
        name: r.region,
        value: r.count,
        amount: parseFloat(r.amount),
      })),
    stageDistribution: stageDistribution.map(s => ({
      stage: s.stage || '未分类',
      count: s.count,
    })),
    opportunityStages: opportunityStages.map(s => ({
      stage: s.stage || '未分类',
      count: s.count,
      amount: parseFloat(s.amount || '0'),
    })),
    conversionRate: parseFloat(conversionRate),
    monthlyTrends,
    summary: {
      totalActivities: workSaturation.reduce((sum, w) => sum + w.projectCount, 0),
      avgConversionRate: parseFloat(conversionRate),
      totalAmount: topPerformers.reduce((sum, p) => sum + parseFloat(p.totalAmount), 0),
    },
  };
}

// 客户数据面板
async function getCustomersPanelData(startDate?: string | null, endDate?: string | null) {
  // 1. 重点客户 - 按合作金额排名
  const topCustomers = await db
    .select({
      id: customers.id,
      name: customers.customerName,
      region: customers.region,
      totalAmount: customers.totalAmount,
      projectCount: customers.currentProjectCount,
    })
    .from(customers)
    .where(sql`${customers.deletedAt} IS NULL`)
    .orderBy(desc(customers.totalAmount))
    .limit(10);

  // 2. 客户类型分布（通过 customerTypeId）
  const typeDistribution = await db
    .select({
      typeId: customers.customerTypeId,
      count: count(),
    })
    .from(customers)
    .where(sql`${customers.deletedAt} IS NULL`)
    .groupBy(customers.customerTypeId);

  // 3. 客户区域分布
  const regionDistribution = await db
    .select({
      region: customers.region,
      count: count(),
      amount: sql<string>`COALESCE(SUM(CAST(${customers.totalAmount} AS DECIMAL)), 0)`,
    })
    .from(customers)
    .where(sql`${customers.deletedAt} IS NULL`)
    .groupBy(customers.region);

  // 4. 最近活跃客户 - 通过项目更新时间
  const recentActiveCustomers = await db
    .select({
      id: customers.id,
      name: customers.customerName,
      totalAmount: customers.totalAmount,
      updatedAt: customers.updatedAt,
    })
    .from(customers)
    .where(sql`${customers.deletedAt} IS NULL`)
    .orderBy(desc(customers.updatedAt))
    .limit(5);

  // 生成客户增长趋势
  const growthTrends = await generateCustomerGrowthTrends();

  return {
    topCustomers: topCustomers.slice(0, 5).map((c, i) => ({
      rank: i + 1,
      id: c.id,
      name: c.name || '未知客户',
      type: '未分类',
      region: c.region || '未知',
      amount: parseFloat(c.totalAmount || '0'),
      projectCount: c.projectCount || 0,
      cooperationYears: 0,
    })),
    typeDistribution: typeDistribution
      .filter(t => t.typeId)
      .sort((a, b) => b.count - a.count)
      .map(t => ({
        name: `类型${t.typeId}`,
        value: t.count,
      })),
    regionDistribution: regionDistribution
      .filter(r => r.region)
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
      .slice(0, 6)
      .map(r => ({
        name: r.region,
        value: r.count,
        amount: parseFloat(r.amount),
      })),
    recentActive: recentActiveCustomers.map(c => ({
      id: c.id,
      name: c.name || '未知客户',
      type: '未分类',
      amount: `¥${(parseFloat(c.totalAmount || '0') / 10000).toFixed(0)}万`,
      time: formatRelativeTime(c.updatedAt),
    })),
    lifecycleDistribution: [{ status: '活跃', count: topCustomers.length }],
    growthTrends,
    summary: {
      totalCustomers: typeDistribution.reduce((sum, t) => sum + t.count, 0),
      totalAmount: topCustomers.reduce((sum, c) => sum + parseFloat(c.totalAmount || '0'), 0),
      avgProjectCount: topCustomers.length > 0 
        ? (topCustomers.reduce((sum, c) => sum + (c.projectCount || 0), 0) / topCustomers.length).toFixed(1)
        : '0',
    },
  };
}

// 项目数据面板
async function getProjectsPanelData(startDate?: string | null, endDate?: string | null) {
  // 1. 项目状态分布
  const rawStatusDistribution = await db
    .select({
      projectStage: projects.projectStage,
      bidResult: projects.bidResult,
      status: projects.status,
      count: count(),
      totalAmount: sql<string>`COALESCE(SUM(CAST(${projects.estimatedAmount} AS DECIMAL)), 0)`,
      actualAmount: sql<string>`COALESCE(SUM(CAST(${projects.actualAmount} AS DECIMAL)), 0)`,
    })
    .from(projects)
    .where(sql`${projects.deletedAt} IS NULL`)
    .groupBy(projects.projectStage, projects.bidResult, projects.status);

  const statusDistribution = aggregateProjectLifecycleRows(rawStatusDistribution);

  // 2. 项目阶段分布（V1.2新增）
  const stageDistribution = await db
    .select({
      stage: projects.projectStage,
      count: count(),
      amount: sql<string>`COALESCE(SUM(CAST(${projects.estimatedAmount} AS DECIMAL)), 0)`,
    })
    .from(projects)
    .where(sql`${projects.deletedAt} IS NULL`)
    .groupBy(projects.projectStage);

  // 3. 项目类型分布
  const typeDistribution = await db
    .select({
      typeId: projects.projectTypeId,
      count: count(),
    })
    .from(projects)
    .where(sql`${projects.deletedAt} IS NULL`)
    .groupBy(projects.projectTypeId);

  // 4. 项目区域分布
  const regionDistribution = await db
    .select({
      region: projects.region,
      count: count(),
      amount: sql<string>`COALESCE(SUM(CAST(${projects.estimatedAmount} AS DECIMAL)), 0)`,
    })
    .from(projects)
    .where(sql`${projects.deletedAt} IS NULL`)
    .groupBy(projects.region);

  // 5. 中标结果分布
  const bidResultDistribution = await db
    .select({
      result: projects.bidResult,
      count: count(),
    })
    .from(projects)
    .where(sql`${projects.deletedAt} IS NULL`)
    .groupBy(projects.bidResult);

  // 6. 最近项目
  const recentProjects = await db
    .select({
      id: projects.id,
      name: projects.projectName,
      customerName: projects.customerName,
      bidResult: projects.bidResult,
      status: projects.status,
      stage: projects.projectStage,
      amount: projects.estimatedAmount,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(sql`${projects.deletedAt} IS NULL`)
    .orderBy(desc(projects.createdAt))
    .limit(5);

  // 生成项目趋势
  const projectTrends = await generateProjectTrends();

  // 计算项目漏斗数据
  const funnelData = [
    { stage: '商机', count: stageDistribution.find(s => s.stage === 'opportunity')?.count || 0 },
    { stage: '投标', count: stageDistribution.find(s => s.stage === 'bidding')?.count || 0 },
    { stage: '执行', count: stageDistribution.find(s => s.stage === 'execution')?.count || 0 },
    { stage: '结算', count: stageDistribution.find(s => s.stage === 'settlement')?.count || 0 },
    { stage: '归档', count: stageDistribution.find(s => s.stage === 'archived')?.count || 0 },
  ];

  return {
    statusDistribution: statusDistribution.map(s => ({
      status: s.status || '未知',
      count: s.count,
      amount: s.totalAmount,
    })),
    stageDistribution: stageDistribution.map(s => ({
      stage: s.stage || '未分类',
      count: s.count,
      amount: parseFloat(s.amount || '0'),
    })),
    typeDistribution: typeDistribution
      .filter(t => t.typeId)
      .sort((a, b) => b.count - a.count)
      .map(t => ({
        name: `类型${t.typeId}`,
        value: t.count,
      })),
    regionDistribution: regionDistribution
      .filter(r => r.region)
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
      .slice(0, 6)
      .map(r => ({
        name: r.region,
        value: r.count,
        amount: parseFloat(r.amount),
      })),
    bidResultDistribution: bidResultDistribution.map(b => ({
      result: b.result || '未知',
      count: b.count,
    })),
    recentProjects: recentProjects.map(p => ({
      id: p.id,
      name: p.name || '未知项目',
      customerName: p.customerName || '未知客户',
      status: p.status,
      statusLabel: getProjectDisplayStatusLabel({ projectStage: p.stage, status: p.status, bidResult: p.bidResult } as any),
      stage: p.stage,
      amount: parseFloat(p.amount || '0'),
      time: formatRelativeTime(p.createdAt),
    })),
    funnelData,
    projectTrends,
    summary: {
      totalProjects: statusDistribution.reduce((sum, s) => sum + s.count, 0),
      totalAmount: statusDistribution.reduce((sum, s) => sum + s.totalAmount, 0),
      wonCount: bidResultDistribution.find(b => b.result === 'won')?.count || 0,
      winRate: calculateWinRate(bidResultDistribution),
    },
  };
}

// 解决方案数据面板
async function getSolutionsPanelData(startDate?: string | null, endDate?: string | null) {
  // 1. 解决方案类型分布
  const typeDistribution = await db
    .select({
      type: solutions.type,
      count: count(),
    })
    .from(solutions)
    .where(sql`${solutions.deletedAt} IS NULL`)
    .groupBy(solutions.type);

  // 2. 解决方案状态分布
  const statusDistribution = await db
    .select({
      status: solutions.status,
      count: count(),
    })
    .from(solutions)
    .where(sql`${solutions.deletedAt} IS NULL`)
    .groupBy(solutions.status);

  // 3. 热门解决方案
  const topSolutions = await db
    .select({
      id: solutions.id,
      name: solutions.name,
      type: solutions.type,
      status: solutions.status,
      viewCount: solutions.viewCount,
    })
    .from(solutions)
    .where(sql`${solutions.deletedAt} IS NULL`)
    .orderBy(desc(solutions.viewCount))
    .limit(10);

  // 4. 最近更新
  const recentUpdates = await db
    .select({
      id: solutions.id,
      name: solutions.name,
      type: solutions.type,
      updatedAt: solutions.updatedAt,
    })
    .from(solutions)
    .where(sql`${solutions.deletedAt} IS NULL`)
    .orderBy(desc(solutions.updatedAt))
    .limit(5);

  return {
    typeDistribution: typeDistribution
      .filter(t => t.type)
      .sort((a, b) => b.count - a.count)
      .map(t => ({
        name: t.type,
        value: t.count,
      })),
    statusDistribution: statusDistribution.map(s => ({
      status: s.status || '未知',
      count: s.count,
    })),
    topSolutions: topSolutions.map((s, i) => ({
      rank: i + 1,
      id: s.id,
      name: s.name || '未知方案',
      type: s.type || '未分类',
      status: s.status,
      viewCount: s.viewCount || 0,
    })),
    recentUpdates: recentUpdates.map(s => ({
      id: s.id,
      name: s.name || '未知方案',
      type: s.type || '未分类',
      time: formatRelativeTime(s.updatedAt),
    })),
    summary: {
      totalSolutions: statusDistribution.reduce((sum, s) => sum + s.count, 0),
      publishedCount: statusDistribution.find(s => s.status === 'published')?.count || 0,
      totalViews: topSolutions.reduce((sum, s) => sum + (s.viewCount || 0), 0),
    },
  };
}

// 辅助函数：生成月度趋势
async function generateMonthlyTrends() {
  const months = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthLabel = `${month.getMonth() + 1}月`;
    
    try {
      const [projectCount] = await db
        .select({ count: count() })
        .from(projects)
        .where(and(
          gte(projects.createdAt, month),
          lte(projects.createdAt, monthEnd),
          sql`${projects.deletedAt} IS NULL`
        ));

      const [revenueResult] = await db
        .select({ 
          total: sql<string>`COALESCE(SUM(CAST(${projects.contractAmount} AS DECIMAL)), 0)` 
        })
        .from(projects)
        .where(and(
          gte(projects.contractSignDate, month.toISOString().split('T')[0]),
          lte(projects.contractSignDate, monthEnd.toISOString().split('T')[0]),
          sql`${projects.bidResult} = 'won'`,
          sql`${projects.deletedAt} IS NULL`
        ));

      months.push({
        month: monthLabel,
        projectCount: projectCount?.count || 0,
        revenue: parseFloat(revenueResult?.total || '0'),
      });
    } catch {
      months.push({
        month: monthLabel,
        projectCount: 0,
        revenue: 0,
      });
    }
  }
  
  return months;
}

// 辅助函数：生成客户增长趋势
async function generateCustomerGrowthTrends() {
  const months = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthLabel = `${month.getMonth() + 1}月`;
    
    try {
      const [newCustomers] = await db
        .select({ count: count() })
        .from(customers)
        .where(and(
          gte(customers.createdAt, month),
          lte(customers.createdAt, monthEnd),
          sql`${customers.deletedAt} IS NULL`
        ));

      months.push({
        month: monthLabel,
        newCustomers: newCustomers?.count || 0,
      });
    } catch {
      months.push({
        month: monthLabel,
        newCustomers: 0,
      });
    }
  }
  
  return months;
}

// 辅助函数：生成项目趋势
async function generateProjectTrends() {
  const months = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthLabel = `${month.getMonth() + 1}月`;
    
    try {
      const [newProjects] = await db
        .select({ count: count() })
        .from(projects)
        .where(and(
          gte(projects.createdAt, month),
          lte(projects.createdAt, monthEnd),
          sql`${projects.deletedAt} IS NULL`
        ));

      const [wonProjects] = await db
        .select({ count: count() })
        .from(projects)
        .where(and(
          gte(projects.updatedAt, month),
          lte(projects.updatedAt, monthEnd),
          sql`${projects.bidResult} = 'won'`,
          sql`${projects.deletedAt} IS NULL`
        ));

      months.push({
        month: monthLabel,
        newProjects: newProjects?.count || 0,
        wonProjects: wonProjects?.count || 0,
      });
    } catch {
      months.push({
        month: monthLabel,
        newProjects: 0,
        wonProjects: 0,
      });
    }
  }
  
  return months;
}

// 辅助函数：计算中标率
function calculateWinRate(bidResults: Array<{ result: string | null; count: number }>): number {
  const won = bidResults.find(b => b.result === 'won')?.count || 0;
  const total = bidResults.reduce((sum, b) => sum + b.count, 0);
  return total > 0 ? parseFloat(((won / total) * 100).toFixed(1)) : 0;
}

// 辅助函数：格式化相对时间
function formatRelativeTime(date: Date | string | null): string {
  if (!date) return '未知';
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;
  return d.toLocaleDateString('zh-CN');
}
