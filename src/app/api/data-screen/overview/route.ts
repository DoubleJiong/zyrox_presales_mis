import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers, projectBiddings, projectOpportunities, projects, solutions, users } from '@/db/schema';
import { count, desc, eq, isNull, sql } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { aggregateProjectLifecycleRows } from '@/lib/project-reporting';

const overviewCache = new Map<string, { data: any; timestamp: number }>();

const CACHE_TTL = 30 * 1000; // 30秒缓存（缩短缓存时间确保数据新鲜）

type DateRange = {
  startDate: Date;
  endDate: Date;
  endDateExclusive: Date;
  periodDays: number;
};

type OpportunitySummaryRow = {
  projectId: number;
  projectName: string;
  region: string | null;
  projectStage: string | null;
  bidResult: string | null;
  estimatedAmount: string | number | null;
  actualAmount: string | number | null;
  projectUpdatedAt: Date | string | null;
  opportunityStage: string | null;
  expectedAmount: string | number | null;
  winProbability: number | null;
  expectedCloseDate: Date | string | null;
  riskAssessment: string | null;
  nextActionDate: Date | string | null;
  bidDeadline: Date | string | null;
};

const FUNNEL_STAGE_META = {
  lead: { label: '线索储备', order: 1 },
  qualified: { label: '需求确认', order: 2 },
  proposal: { label: '方案报价', order: 3 },
  negotiation: { label: '招投标推进', order: 4 },
  won: { label: '已转合同', order: 5 },
} as const;

type FunnelStageKey = keyof typeof FUNNEL_STAGE_META;

function toNumber(value: string | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  const normalized = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

function toDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function startOfDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function endOfDayExclusive(date: Date) {
  const normalized = startOfDay(date);
  normalized.setDate(normalized.getDate() + 1);
  return normalized;
}

function parseDateParam(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfDay(parsed);
}

function resolveDateRange(request: NextRequest): DateRange {
  const endDate = parseDateParam(request.nextUrl.searchParams.get('endDate')) ?? startOfToday();
  const requestedStartDate = parseDateParam(request.nextUrl.searchParams.get('startDate'));
  const fallbackStartDate = new Date(endDate);
  fallbackStartDate.setDate(fallbackStartDate.getDate() - 29);

  const startDate = requestedStartDate ?? fallbackStartDate;
  const normalizedStart = startDate <= endDate ? startDate : endDate;
  const normalizedEnd = endDate >= startDate ? endDate : startDate;

  return {
    startDate: normalizedStart,
    endDate: normalizedEnd,
    endDateExclusive: endOfDayExclusive(normalizedEnd),
    periodDays: Math.max(diffInDays(normalizedEnd, normalizedStart) + 1, 1),
  };
}

function buildOverviewCacheKey(range: DateRange) {
  return `${range.startDate.toISOString().slice(0, 10)}:${range.endDate.toISOString().slice(0, 10)}`;
}

function toSqlTimestamp(value: Date) {
  return value.toISOString();
}

function diffInDays(target: Date, base: Date) {
  return Math.round((target.getTime() - base.getTime()) / (24 * 60 * 60 * 1000));
}

function resolveFunnelStage(row: OpportunitySummaryRow): FunnelStageKey | null {
  if (row.bidResult === 'won') {
    return 'won';
  }

  if (row.bidResult === 'lost') {
    return null;
  }

  if (row.opportunityStage && row.opportunityStage in FUNNEL_STAGE_META) {
    return row.opportunityStage as FunnelStageKey;
  }

  if (row.projectStage === 'opportunity') {
    return 'qualified';
  }

  if (row.projectStage === 'bidding') {
    return 'negotiation';
  }

  return null;
}

function buildFunnelSummary(rows: OpportunitySummaryRow[]) {
  const stageBuckets = new Map<FunnelStageKey, { key: FunnelStageKey; label: string; count: number; amount: number; weightedAmount: number }>();

  (Object.keys(FUNNEL_STAGE_META) as FunnelStageKey[]).forEach((key) => {
    stageBuckets.set(key, {
      key,
      label: FUNNEL_STAGE_META[key].label,
      count: 0,
      amount: 0,
      weightedAmount: 0,
    });
  });

  let totalOpenCount = 0;
  let totalOpenAmount = 0;
  let weightedPipeline = 0;
  let probabilitySum = 0;
  let probabilityCount = 0;
  let missingWinProbabilityCount = 0;

  rows.forEach((row) => {
    const stage = resolveFunnelStage(row);
    if (!stage) {
      return;
    }

    const amount = stage === 'won'
      ? toNumber(row.actualAmount) || toNumber(row.expectedAmount) || toNumber(row.estimatedAmount)
      : toNumber(row.expectedAmount) || toNumber(row.estimatedAmount);
    const probability = stage === 'won' ? 100 : Math.min(Math.max(row.winProbability ?? 0, 0), 100);
    const weightedAmount = stage === 'won' ? amount : amount * probability / 100;
    const bucket = stageBuckets.get(stage)!;

    bucket.count += 1;
    bucket.amount += amount;
    bucket.weightedAmount += weightedAmount;

    if (stage !== 'won') {
      totalOpenCount += 1;
      totalOpenAmount += amount;
      weightedPipeline += weightedAmount;
      if (row.winProbability != null) {
        probabilitySum += probability;
        probabilityCount += 1;
      } else {
        missingWinProbabilityCount += 1;
      }
    }
  });

  return {
    totalOpenCount,
    totalOpenAmount,
    weightedPipeline,
    avgWinProbability: probabilityCount > 0 ? Math.round(probabilitySum / probabilityCount) : 0,
    missingWinProbabilityCount,
    stages: Array.from(stageBuckets.values()).sort((left, right) => FUNNEL_STAGE_META[left.key].order - FUNNEL_STAGE_META[right.key].order),
  };
}

function buildRiskSummary(rows: OpportunitySummaryRow[]) {
  const today = startOfToday();
  let high = 0;
  let medium = 0;
  let overdueActions = 0;
  let overdueBids = 0;
  let staleProjects = 0;
  let dueThisWeek = 0;

  const items = rows
    .map((row) => {
      if (row.bidResult === 'won' || row.bidResult === 'lost') {
        return null;
      }

      const nextActionDate = toDate(row.nextActionDate);
      const bidDeadline = toDate(row.bidDeadline);
      const expectedCloseDate = toDate(row.expectedCloseDate);
      const projectUpdatedAt = toDate(row.projectUpdatedAt);
      const reasons: string[] = [];
      let score = 0;
      let hasDueThisWeek = false;
      let hasStaleRisk = false;

      if (nextActionDate) {
        const actionDelta = diffInDays(nextActionDate, today);
        if (actionDelta < 0) {
          overdueActions += 1;
          score += 95;
          reasons.push(`下一步行动逾期${Math.abs(actionDelta)}天`);
        } else if (actionDelta <= 3) {
          hasDueThisWeek = true;
          score += 45;
          reasons.push(`下一步行动${actionDelta === 0 ? '今日到期' : `${actionDelta}天内到期`}`);
        }
      }

      if (bidDeadline) {
        const bidDelta = diffInDays(bidDeadline, today);
        if (bidDelta < 0) {
          overdueBids += 1;
          score += 100;
          reasons.push(`投标截止已过${Math.abs(bidDelta)}天`);
        } else if (bidDelta <= 3) {
          hasDueThisWeek = true;
          score += 70;
          reasons.push(`投标截止${bidDelta === 0 ? '今日到期' : `${bidDelta}天内到期`}`);
        }
      }

      if (projectUpdatedAt) {
        const staleDelta = diffInDays(today, projectUpdatedAt);
        if (staleDelta >= 14) {
          staleProjects += 1;
          hasStaleRisk = true;
          score += 40;
          reasons.push(`项目${staleDelta}天未更新`);
        }
      }

      if (expectedCloseDate) {
        const closeDelta = diffInDays(expectedCloseDate, today);
        if (closeDelta < 0) {
          score += 50;
          reasons.push(`预计成交已延期${Math.abs(closeDelta)}天`);
        } else if ((row.winProbability ?? 0) < 40 && closeDelta <= 7) {
          score += 30;
          reasons.push(`预计成交临近且赢率仅${row.winProbability ?? 0}%`);
        }
      }

      const riskText = (row.riskAssessment || '').trim();
      if (riskText) {
        score += /高|重大|严重|延期|丢标/.test(riskText) ? 45 : 20;
        reasons.push(riskText.length > 24 ? `${riskText.slice(0, 24)}...` : riskText);
      }

      if ((row.winProbability ?? 100) < 35 && ['proposal', 'negotiation'].includes(row.opportunityStage || '')) {
        score += 35;
        reasons.push(`赢率偏低(${row.winProbability}%)`);
      }

      if (hasDueThisWeek) {
        dueThisWeek += 1;
      }

      if (score < 40) {
        return null;
      }

      const riskLevel = score >= 90 ? 'high' : 'medium';
      if (riskLevel === 'high') {
        high += 1;
      } else {
        medium += 1;
      }

      return {
        projectId: row.projectId,
        projectName: row.projectName,
        region: row.region || '未分区',
        stage: FUNNEL_STAGE_META[resolveFunnelStage(row) || 'lead'].label,
        riskLevel,
        score,
        amount: toNumber(row.expectedAmount) || toNumber(row.estimatedAmount),
        winProbability: row.winProbability ?? 0,
        reason: reasons[0] || (hasStaleRisk ? '项目推进存在滞后' : '存在推进风险'),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => right.score - left.score);

  return {
    total: items.length,
    high,
    medium,
    overdueActions,
    overdueBids,
    staleProjects,
    dueThisWeek,
    items: items.slice(0, 5),
  };
}

function buildForecastSummary(rows: OpportunitySummaryRow[], currentWonAmount: number, rolling90WonAmount: number, range: DateRange) {
  const forecastWindowStart = range.endDate;
  const forecastWindowEndExclusive = endOfDayExclusive(new Date(range.endDate.getTime() + range.periodDays * 24 * 60 * 60 * 1000));

  const openRows = rows.filter((row) => {
    if (row.bidResult === 'won' || row.bidResult === 'lost') {
      return false;
    }

    const stage = resolveFunnelStage(row);
    if (!stage || !['proposal', 'negotiation'].includes(stage)) {
      return false;
    }

    const expectedCloseDate = toDate(row.expectedCloseDate);
    if (!expectedCloseDate) {
      return false;
    }

    return expectedCloseDate >= forecastWindowStart && expectedCloseDate < forecastWindowEndExclusive;
  });

  const allOpenRows = rows.filter((row) => row.bidResult !== 'won' && row.bidResult !== 'lost' && row.winProbability != null);

  const weightedOpenAmount = openRows.reduce((sum, row) => {
    const amount = toNumber(row.expectedAmount) || toNumber(row.estimatedAmount);
    const probability = Math.min(Math.max(row.winProbability ?? 0, 0), 100);
    return sum + (amount * probability / 100);
  }, 0);

  const averageWinProbability = allOpenRows.length > 0
    ? Math.round(allOpenRows.reduce((sum, row) => sum + Math.min(Math.max(row.winProbability ?? 0, 0), 100), 0) / allOpenRows.length)
    : 0;

  const targetAmount = Math.round((rolling90WonAmount / 90) * range.periodDays);
  const forecastAmount = currentWonAmount + weightedOpenAmount;
  const gapAmount = Math.max(targetAmount - forecastAmount, 0);
  const coverageRate = targetAmount > 0 ? Math.round((forecastAmount / targetAmount) * 100) : 0;
  const requiredNewOpportunityAmount = gapAmount > 0 && averageWinProbability > 0
    ? Math.round(gapAmount / (averageWinProbability / 100))
    : Math.round(gapAmount);

  return {
    targetBasis: 'rolling_90d_run_rate',
    targetLabel: '滚动90天中标 run-rate',
    periodDays: range.periodDays,
    targetAmount,
    currentWonAmount: Math.round(currentWonAmount),
    forecastAmount: Math.round(forecastAmount),
    weightedOpenAmount: Math.round(weightedOpenAmount),
    gapAmount: Math.round(gapAmount),
    coverageRate,
    averageWinProbability,
    requiredNewOpportunityAmount,
    confidence: coverageRate >= 100 ? 'on-track' : coverageRate >= 75 ? 'watch' : 'gap',
  };
}

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const now = Date.now();
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
    const range = resolveDateRange(request);
    const cacheKey = buildOverviewCacheKey(range);
    const cachedOverview = overviewCache.get(cacheKey);
    const currentPeriodStart = toSqlTimestamp(range.startDate);
    const currentPeriodEnd = toSqlTimestamp(range.endDateExclusive);
    const rolling90Start = toSqlTimestamp(new Date(range.endDateExclusive.getTime() - 90 * 24 * 60 * 60 * 1000));

    if (!forceRefresh && cachedOverview && (now - cachedOverview.timestamp) < CACHE_TTL) {
      return successResponse(cachedOverview.data);
    }

    const [
      customersCount,
      projectsCount,
      schemesCount,
      staffCount,
      totalRevenue,
      projectsByRegion,
      wonProjectsCount,
      customersByRegion,
      opportunitySummaryRows,
      currentWonAmountRows,
      rolling90WonAmountRows,
    ] = await Promise.all([
      // 客户总数（bus_customer表，过滤软删除）
      db.select({ count: count() }).from(customers).where(isNull(customers.deletedAt)),
      
      // 项目总数（排除已删除）
      db.select({ count: count() }).from(projects).where(isNull(projects.deletedAt)),
      
      // 解决方案总数（排除已删除）
      db.select({ count: count() }).from(solutions).where(isNull(solutions.deletedAt)),
      
      // 员工总数（sys_user表，活跃状态，过滤软删除）
      db.select({ count: count() }).from(users).where(sql`${users.status} = 'active' AND ${users.deletedAt} IS NULL`),
      
      // 总收入（已中标项目的实际金额）
      db.select({ 
        total: sql<string>`COALESCE(SUM(CAST(${projects.actualAmount} AS DECIMAL)), 0)` 
      }).from(projects).where(sql`${projects.bidResult} = 'won' AND ${projects.deletedAt} IS NULL`),
      
      // 按区域统计项目
      db.select({
        region: projects.region,
        count: count(),
        amount: sql<string>`COALESCE(SUM(CAST(${projects.estimatedAmount} AS DECIMAL)), 0)`,
      }).from(projects)
        .where(sql`${projects.region} IS NOT NULL AND ${projects.region} != '' AND ${projects.deletedAt} IS NULL`)
        .groupBy(projects.region),
      
      // 已中标项目数
      db.select({ count: count() }).from(projects)
        .where(sql`${projects.bidResult} = 'won' AND ${projects.deletedAt} IS NULL`),
      
      // 按区域统计客户
      db.select({
        region: customers.region,
        count: count(),
      }).from(customers)
        .where(sql`${customers.region} IS NOT NULL AND ${customers.region} != '' AND ${customers.deletedAt} IS NULL`)
        .groupBy(customers.region),

      db.select({
        projectId: projects.id,
        projectName: projects.projectName,
        region: projects.region,
        projectStage: projects.projectStage,
        bidResult: projects.bidResult,
        estimatedAmount: projects.estimatedAmount,
        actualAmount: projects.actualAmount,
        projectUpdatedAt: projects.updatedAt,
        opportunityStage: projectOpportunities.opportunityStage,
        expectedAmount: projectOpportunities.expectedAmount,
        winProbability: projectOpportunities.winProbability,
        expectedCloseDate: projectOpportunities.expectedCloseDate,
        riskAssessment: projectOpportunities.riskAssessment,
        nextActionDate: projectOpportunities.nextActionDate,
        bidDeadline: projectBiddings.bidDeadline,
      })
        .from(projects)
        .leftJoin(projectOpportunities, eq(projectOpportunities.projectId, projects.id))
        .leftJoin(projectBiddings, eq(projectBiddings.projectId, projects.id))
        .where(isNull(projects.deletedAt)),

      db.select({
        total: sql<string>`COALESCE(SUM(CAST(${projects.actualAmount} AS DECIMAL)), 0)`,
      }).from(projects)
        .where(sql`${projects.bidResult} = 'won' AND ${projects.deletedAt} IS NULL AND ${projects.updatedAt} >= ${currentPeriodStart} AND ${projects.updatedAt} < ${currentPeriodEnd}`),

      db.select({
        total: sql<string>`COALESCE(SUM(CAST(${projects.actualAmount} AS DECIMAL)), 0)`,
      }).from(projects)
        .where(sql`${projects.bidResult} = 'won' AND ${projects.deletedAt} IS NULL AND ${projects.updatedAt} >= ${rolling90Start} AND ${projects.updatedAt} < ${currentPeriodEnd}`),
    ]);

    // 构建区域数据
    const regionStats = projectsByRegion.map(item => ({
      name: item.region,
      value: Number(item.count),
      amount: Number(item.amount || 0),
    }));

    // 构建客户区域数据
    const customerRegionStats = customersByRegion.map(item => ({
      name: item.region,
      value: Number(item.count),
    }));

    // 生成月度趋势数据（最近6个月）- 修正：使用actualAmount
    const monthlyData = await db
      .select({
        month: sql<string>`TO_CHAR(${projects.createdAt}, 'YYYY-MM')`,
        customers: sql<number>`COUNT(DISTINCT ${projects.customerId})`,
        projects: sql<number>`COUNT(*)`,
        actualRevenue: sql<number>`COALESCE(SUM(CAST(${projects.actualAmount} AS DECIMAL)), 0)`,
        estimatedRevenue: sql<number>`COALESCE(SUM(CAST(${projects.estimatedAmount} AS DECIMAL)), 0)`,
      })
      .from(projects)
      .where(sql`${projects.createdAt} >= NOW() - INTERVAL '6 months' AND ${projects.deletedAt} IS NULL`)
      .groupBy(sql`TO_CHAR(${projects.createdAt}, 'YYYY-MM')`)
      .orderBy(desc(sql`TO_CHAR(${projects.createdAt}, 'YYYY-MM')`))
      .limit(6);

    // 商机阶段统计
    const stageStats = await db
      .select({
        stage: projects.projectStage,
        count: count(),
      })
      .from(projects)
      .where(sql`${projects.projectStage} IS NOT NULL AND ${projects.deletedAt} IS NULL`)
      .groupBy(projects.projectStage);

    // 项目状态统计
    const rawStatusStats = await db
      .select({
        projectStage: projects.projectStage,
        bidResult: projects.bidResult,
        status: projects.status,
        count: count(),
        totalAmount: sql<string>`COALESCE(SUM(CAST(${projects.estimatedAmount} AS DECIMAL)), 0)`,
        actualAmount: sql<string>`COALESCE(SUM(CAST(${projects.actualAmount} AS DECIMAL)), 0)`,
      })
      .from(projects)
      .where(isNull(projects.deletedAt))
      .groupBy(projects.projectStage, projects.bidResult, projects.status);

    const statusStats = aggregateProjectLifecycleRows(rawStatusStats);
    const funnel = buildFunnelSummary(opportunitySummaryRows as OpportunitySummaryRow[]);
    const riskSummary = buildRiskSummary(opportunitySummaryRows as OpportunitySummaryRow[]);
    const forecastSummary = buildForecastSummary(
      opportunitySummaryRows as OpportunitySummaryRow[],
      toNumber(currentWonAmountRows[0]?.total),
      toNumber(rolling90WonAmountRows[0]?.total),
      range,
    );

    const responseData = {
      totalCustomers: customersCount[0].count,
      totalProjects: projectsCount[0].count,
      totalSolutions: schemesCount[0].count,
      totalStaff: staffCount[0].count,
      totalRevenue: parseFloat(totalRevenue[0].total || '0'),
      wonProjects: wonProjectsCount[0].count,
      overview: {
        totalCustomers: customersCount[0].count,
        totalProjects: projectsCount[0].count,
        totalSolutions: schemesCount[0].count,
        totalStaff: staffCount[0].count,
        totalRevenue: parseFloat(totalRevenue[0].total || '0'),
        wonProjects: wonProjectsCount[0].count,
      },
      mapData: regionStats,
      regionStats,
      customerRegionStats,
      funnel,
      riskSummary,
      forecastSummary,
      stageStats: stageStats.map(s => ({
        stage: s.stage,
        count: Number(s.count),
      })),
      statusStats: statusStats.map(s => ({
        status: s.status,
        count: Number(s.count),
      })),
      monthlyData: monthlyData.reverse().map(item => ({
        month: item.month,
        customers: Number(item.customers),
        projects: Number(item.projects),
        revenue: Number(item.actualRevenue || item.estimatedRevenue),
        actualRevenue: Number(item.actualRevenue),
        estimatedRevenue: Number(item.estimatedRevenue),
      })),
      topRegions: [...regionStats].sort((a, b) => b.value - a.value).slice(0, 5),
      topRevenueRegions: [...regionStats].sort((a, b) => b.amount - a.amount).slice(0, 5),
    };

    overviewCache.set(cacheKey, {
      data: responseData,
      timestamp: now,
    });

    return successResponse(responseData);
  } catch (error) {
    console.error('Data screen overview API error:', error);
    return errorResponse('INTERNAL_ERROR', '获取数据大屏概览数据失败');
  }
});
