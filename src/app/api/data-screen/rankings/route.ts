import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, users, customers, solutions } from '@/db/schema';
import { sql, desc, count, sum, eq, and, gte, lte, isNull, or } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { PERMISSIONS } from '@/lib/permissions';

type RankType = 'staff' | 'customer' | 'project' | 'solution';

// 内存缓存
const cache: Map<string, { data: any; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

// GET - 获取排行数据（优化版，带缓存和权限验证）
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number }
) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'staff') as RankType;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20); // 限制最大值
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 检查缓存
    const cacheKey = `rankings:${type}:${limit}:${startDate || 'all'}:${endDate || 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return successResponse(cached.data);
    }

    let rankings: any[] = [];

    switch (type) {
      case 'staff':
        rankings = await getStaffRankings(limit, startDate, endDate);
        break;
      case 'customer':
        rankings = await getCustomerRankings(limit, startDate, endDate);
        break;
      case 'project':
        rankings = await getProjectRankings(limit, startDate, endDate);
        break;
      case 'solution':
        rankings = await getSolutionRankings(limit, startDate, endDate);
        break;
    }

    const responseData = {
      type,
      rankings,
      timestamp: new Date().toISOString(),
      // 空状态提示
      meta: {
        isEmpty: rankings.length === 0,
        message: rankings.length === 0 ? getEmptyMessage(type) : null,
        hint: rankings.length === 0 ? getEmptyHint(type) : null,
      },
    };

    // 更新缓存
    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    return successResponse(responseData);
  } catch (error) {
    console.error('Failed to fetch rankings:', error);
    return errorResponse('INTERNAL_ERROR', '获取排行数据失败');
  }
}, {
  requiredPermissions: [PERMISSIONS.DATASCREEN_VIEW],
});

// 员工排行榜 - 修正：使用actualAmount，添加deletedAt过滤
async function getStaffRankings(limit: number, startDate?: string | null, endDate?: string | null) {
  // 构建条件
  const conditions: any[] = [eq(users.status, 'active')];
  
  // 获取员工和项目关联数据
  const staffWithProjects = await db
    .select({
      id: users.id,
      name: users.realName,
      department: users.department,
    })
    .from(users)
    .where(and(...conditions))
    .limit(limit);

  // 获取每个员工的项目统计
  const results = await Promise.all(
    staffWithProjects.map(async (staff, index) => {
      // 获取该员工负责的项目 - 添加deletedAt过滤
      const projectConditions: any[] = [
        eq(projects.managerId, staff.id),
        isNull(projects.deletedAt) // 添加软删除过滤
      ];
      if (startDate) projectConditions.push(gte(projects.createdAt, new Date(startDate)));
      if (endDate) projectConditions.push(lte(projects.createdAt, new Date(endDate)));

      const projectStats = await db
        .select({
          projectCount: count(),
          // 修正：使用actualAmount（实际金额）
          totalAmount: sql<string>`COALESCE(SUM(CAST(COALESCE(${projects.actualAmount}, ${projects.estimatedAmount}) AS DECIMAL)), 0)`,
          // 已赢单金额
          completedAmount: sql<string>`COALESCE(SUM(CASE WHEN ${projects.bidResult} = 'won' THEN CAST(COALESCE(${projects.actualAmount}, ${projects.estimatedAmount}) AS DECIMAL) ELSE 0 END), 0)`,
          // 预估金额（用于对比）
          estimatedAmount: sql<string>`COALESCE(SUM(CAST(${projects.estimatedAmount} AS DECIMAL)), 0)`,
        })
        .from(projects)
        .where(and(...projectConditions));

      const stats = projectStats[0];
      const totalAmount = Number(stats?.totalAmount || 0);
      const completedAmount = Number(stats?.completedAmount || 0);

      return {
        rank: index + 1,
        id: staff.id,
        name: staff.name || '未知',
        department: staff.department || '未知部门',
        projectCount: Number(stats?.projectCount || 0),
        totalAmount,
        completedAmount,
        estimatedAmount: Number(stats?.estimatedAmount || 0),
        completionRate: totalAmount > 0 ? Math.round((completedAmount / totalAmount) * 100) : 0,
      };
    })
  );

  // 按实际金额排序
  return results
    .filter(r => r.projectCount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount || b.projectCount - a.projectCount)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

// 客户排行榜 - 修正：使用actualAmount，添加deletedAt过滤
async function getCustomerRankings(limit: number, startDate?: string | null, endDate?: string | null) {
  // 获取所有客户 - 添加deletedAt过滤
  const allCustomers = await db
    .select({
      id: customers.id,
      name: customers.customerName,
      region: customers.region,
    })
    .from(customers)
    .where(isNull(customers.deletedAt)) // 添加软删除过滤
    .limit(100);

  // 获取每个客户的项目统计
  const results = await Promise.all(
    allCustomers.map(async (customer, index) => {
      const projectConditions: any[] = [
        eq(projects.customerId, customer.id),
        isNull(projects.deletedAt) // 添加软删除过滤
      ];
      if (startDate) projectConditions.push(gte(projects.createdAt, new Date(startDate)));
      if (endDate) projectConditions.push(lte(projects.createdAt, new Date(endDate)));

      const projectStats = await db
        .select({
          projectCount: count(),
          // 修正：使用actualAmount
          totalAmount: sql<string>`COALESCE(SUM(CAST(COALESCE(${projects.actualAmount}, ${projects.estimatedAmount}) AS DECIMAL)), 0)`,
          lastProjectDate: sql<string>`MAX(${projects.createdAt})`,
        })
        .from(projects)
        .where(and(...projectConditions));

      const stats = projectStats[0];

      return {
        rank: index + 1,
        id: customer.id,
        name: customer.name || '未知客户',
        region: customer.region || '未知地区',
        projectCount: Number(stats?.projectCount || 0),
        totalAmount: Number(stats?.totalAmount || 0),
        lastProjectDate: stats?.lastProjectDate,
      };
    })
  );

  // 按实际金额排序
  return results
    .filter(r => r.projectCount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount || b.projectCount - a.projectCount)
    .slice(0, limit)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

// 项目排行榜 - 修正：使用actualAmount，添加deletedAt过滤
async function getProjectRankings(limit: number, startDate?: string | null, endDate?: string | null) {
  const conditions: any[] = [isNull(projects.deletedAt)]; // 添加软删除过滤
  if (startDate) conditions.push(gte(projects.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(projects.createdAt, new Date(endDate)));

  const whereClause = and(...conditions);

  const results = await db
    .select({
      id: projects.id,
      name: projects.projectName,
      customerName: projects.customerName,
      estimatedAmount: projects.estimatedAmount,
      actualAmount: projects.actualAmount,
      status: projects.status,
      region: projects.region,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(whereClause)
    // 修正：优先使用actualAmount排序
    .orderBy(desc(sql`CAST(COALESCE(${projects.actualAmount}, ${projects.estimatedAmount}) AS DECIMAL)`))
    .limit(limit);

  return results.map((row, index) => ({
    rank: index + 1,
    id: row.id,
    name: row.name || '未知项目',
    customerName: row.customerName || '未知客户',
    amount: Number(row.actualAmount || row.estimatedAmount || 0), // 优先使用实际金额
    estimatedAmount: Number(row.estimatedAmount || 0),
    actualAmount: Number(row.actualAmount || 0),
    status: row.status || 'unknown',
    region: row.region || '未知地区',
    createdAt: row.createdAt,
  }));
}

// 解决方案排行榜 - 添加deletedAt过滤
async function getSolutionRankings(limit: number, startDate?: string | null, endDate?: string | null) {
  const conditions: any[] = [
    or(eq(solutions.status, 'approved'), eq(solutions.status, 'published')),
    isNull(solutions.deletedAt)
  ];
  
  if (startDate) conditions.push(gte(solutions.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(solutions.createdAt, new Date(endDate)));

  const results = await db
    .select({
      id: solutions.id,
      name: solutions.solutionName,
      type: solutions.scenario,
      usageCount: solutions.downloadCount,
      viewCount: solutions.viewCount,
    })
    .from(solutions)
    .where(and(...conditions))
    .orderBy(desc(solutions.downloadCount), desc(solutions.viewCount))
    .limit(limit);

  return results.map((row, index) => ({
    rank: index + 1,
    id: row.id,
    name: row.name || '未知方案',
    category: row.type || '未分类',
    usageCount: Number(row.usageCount || 0),
    viewCount: Number(row.viewCount || 0),
  }));
}

/**
 * 获取空状态提示消息
 */
function getEmptyMessage(type: RankType): string {
  const messages: Record<RankType, string> = {
    staff: '暂无员工排行数据。',
    customer: '暂无客户排行数据。',
    project: '暂无项目排行数据。',
    solution: '暂无解决方案排行数据。',
  };
  return messages[type];
}

/**
 * 获取空状态提示详情
 */
function getEmptyHint(type: RankType): string {
  const hints: Record<RankType, string> = {
    staff: '员工排行基于项目中标金额和项目数量计算。当有项目中标后，排行榜将自动更新。',
    customer: '客户排行基于客户的项目数量和项目金额计算。当有客户关联项目后，排行榜将自动更新。',
    project: '项目排行基于项目金额和进度计算。当有项目数据后，排行榜将自动更新。',
    solution: '解决方案排行基于评分和使用情况计算。当有发布的解决方案后，排行榜将自动更新。',
  };
  return hints[type];
}
