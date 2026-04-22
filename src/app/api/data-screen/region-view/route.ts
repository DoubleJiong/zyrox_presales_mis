import { NextRequest } from 'next/server';
import { db } from '@/db';
import { projects, customers, subsidiaries, projectPresalesRecords, customerTypes } from '@/db/schema';
import { getProjectTypeDisplayLabel } from '@/lib/project-type-codec';
import { sql, isNull, and, eq, not, inArray, count, sum } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { PERMISSIONS } from '@/lib/permissions';
import type { RegionViewData } from '@/types/data-screen';

function toWan(val: string | null | undefined): number {
  if (!val) return 0;
  const n = Number(val);
  return Math.round(n) === 0 ? 0 : Math.round(n / 100) / 100;
}

const FUNNEL_STAGES = [
  { label: '商机储备', stages: ['opportunity'] },
  { label: '投标立项', stages: ['bidding_pending'] },
  { label: '招标投标', stages: ['bidding'] },
  { label: '投标评标', stages: ['solution_review'] },
  { label: '已中标',   stages: ['contract_pending', 'delivery_preparing', 'delivering', 'settlement'] },
];

/**
 * Resolves a map-click region name to the list of DB region values to filter on.
 *
 * For most provinces the click name (e.g. "广东") matches the DB value directly.
 * Zhejiang is the exception: the DB stores city-level entries ("杭州", "宁波" …)
 * plus the new dictionary codes ("zj_hangzhou" …) rather than a single "浙江" row.
 * Clicking the Zhejiang province on the nation map therefore needs an IN-list expansion.
 *
 * For Zhejiang city clicks in the drilled view ("杭州", "宁波" …) the name already
 * matches the city-level DB value, so no expansion is needed.
 */
const ZHEJIANG_DB_VALUES = [
  // Chinese short city names (historical / seed data)
  '浙江', '杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水',
  // Dictionary codes (new data saved via project form)
  'zj_hangzhou', 'zj_ningbo', 'zj_wenzhou', 'zj_jiaxing', 'zj_huzhou',
  'zj_shaoxing', 'zj_jinhua', 'zj_quzhou', 'zj_zhoushan', 'zj_taizhou', 'zj_lishui',
];

function resolveRegionCodes(region: string): string[] {
  if (region === '浙江') return ZHEJIANG_DB_VALUES;
  return [region];
}

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const region = searchParams.get('region') || null;

      // Resolve map-click province name → actual DB attribute_value code(s)
      const regionCodes = region ? resolveRegionCodes(region) : null;
      const projectRegionFilter  = regionCodes ? inArray(projects.region,  regionCodes) : undefined;
      const customerRegionFilter = regionCodes ? inArray(customers.region, regionCodes) : undefined;

      const activeStages = ['opportunity','bidding_pending','bidding','solution_review',
        'contract_pending','delivery_preparing','delivering','settlement'];

      const customerWhere = and(isNull(customers.deletedAt), customerRegionFilter);
      const projectWhere  = and(isNull(projects.deletedAt),  projectRegionFilter);

      // KPI
      const [customerCount] = await db
        .select({ count: count() })
        .from(customers)
        .where(customerWhere);

      const [kpiAgg] = await db
        .select({
          totalProjects: sql<string>`COUNT(CASE WHEN ${projects.projectStage} != 'cancelled' THEN 1 END)`,
          activeProjectCount: sql<string>`COUNT(CASE WHEN ${projects.projectStage} NOT IN ('archived', 'cancelled', 'suspended') THEN 1 END)`,
          opportunityAmount: sum(projects.estimatedAmount),
          opportunityCount: sql<string>`COUNT(CASE WHEN ${projects.projectStage} = 'opportunity' THEN 1 END)`,
          wonAmount: sql<string>`SUM(CASE WHEN ${projects.bidResult} = 'won' THEN COALESCE(${projects.actualAmount}, ${projects.estimatedAmount}, 0) ELSE 0 END)`,
          contractAmount: sum(projects.contractAmount),
          contractAmountAvg: sql<string>`AVG(NULLIF(${projects.contractAmount}, 0))`,
          wonCount: sql<string>`COUNT(CASE WHEN ${projects.bidResult} = 'won' THEN 1 END)`,
          bidCount: sql<string>`COUNT(CASE WHEN ${projects.bidResult} IN ('won','lost') THEN 1 END)`,
        })
        .from(projects)
        .where(projectWhere);

      const presalesHoursQ = regionCodes
        ? db.select({ total: sum(projectPresalesRecords.totalWorkHours), headcount: sum(projectPresalesRecords.participantCount) })
            .from(projectPresalesRecords)
            .innerJoin(projects, eq(projectPresalesRecords.projectId, projects.id))
            .where(and(isNull(projects.deletedAt), isNull(projectPresalesRecords.deletedAt), inArray(projects.region, regionCodes)))
        : db.select({ total: sum(projectPresalesRecords.totalWorkHours), headcount: sum(projectPresalesRecords.participantCount) })
            .from(projectPresalesRecords)
            .where(isNull(projectPresalesRecords.deletedAt));

      const [presalesHoursRow] = await presalesHoursQ;

      const [contractCountRow] = await db
        .select({ cnt: count() })
        .from(projects)
        .where(and(projectWhere, sql`${projects.contractAmount} IS NOT NULL`));

      const totalWon = Number(kpiAgg?.wonCount || 0);
      const totalBid = Number(kpiAgg?.bidCount || 0);
      const winRate = totalBid > 0 ? Math.round((totalWon / totalBid) * 1000) / 10 : 0;

      const kpi: RegionViewData['kpi'] = {
        totalCustomers: customerCount.count,
        totalProjects: Number(kpiAgg?.totalProjects || 0),
        opportunityAmount: toWan(kpiAgg?.opportunityAmount),
        wonAmount: toWan(kpiAgg?.wonAmount),
        totalContracts: contractCountRow?.cnt ?? 0,
        contractAmount: toWan(kpiAgg?.contractAmount),
        presalesHours: Math.round(Number(presalesHoursRow?.total || 0)),
        winRate,
        opportunityCount: Number(kpiAgg?.opportunityCount || 0),
        wonCount: totalWon,
        contractAmountAvg: toWan(kpiAgg?.contractAmountAvg),
        presalesHeadcount: Math.round(Number(presalesHoursRow?.headcount || 0)),
        activeProjectCount: Number(kpiAgg?.activeProjectCount || 0),
      };

      // KPI trend: this calendar month vs previous calendar month
      function trendEntry(cur: number, prev: number): { dir: 'up' | 'down' | 'flat'; delta: number } {
        const delta = cur - prev;
        const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
        return { dir, delta };
      }

      const [trendCustomers] = await db
        .select({
          thisMonth: sql<string>`COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END)`,
          lastMonth: sql<string>`COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' AND created_at < DATE_TRUNC('month', NOW()) THEN 1 END)`,
        })
        .from(customers)
        .where(and(isNull(customers.deletedAt), customerRegionFilter));

      const [trendProjects] = await db
        .select({
          thisMonth:    sql<string>`COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END)`,
          lastMonth:    sql<string>`COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' AND created_at < DATE_TRUNC('month', NOW()) THEN 1 END)`,
          wonThis:      sql<string>`SUM(CASE WHEN bid_result = 'won' AND created_at >= DATE_TRUNC('month', NOW()) THEN COALESCE(actual_amount, estimated_amount, 0) ELSE 0 END)`,
          wonLast:      sql<string>`SUM(CASE WHEN bid_result = 'won' AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' AND created_at < DATE_TRUNC('month', NOW()) THEN COALESCE(actual_amount, estimated_amount, 0) ELSE 0 END)`,
        })
        .from(projects)
        .where(and(isNull(projects.deletedAt), projectRegionFilter));

      const presalesTrendWhere = regionCodes
        ? and(isNull(projects.deletedAt), isNull(projectPresalesRecords.deletedAt), inArray(projects.region, regionCodes))
        : and(isNull(projects.deletedAt), isNull(projectPresalesRecords.deletedAt));

      const [trendPresales] = await db
        .select({
          thisMonth: sql<string>`SUM(CASE WHEN ${projectPresalesRecords.serviceDate} >= DATE_TRUNC('month', NOW()) THEN ${projectPresalesRecords.totalWorkHours} ELSE 0 END)`,
          lastMonth: sql<string>`SUM(CASE WHEN ${projectPresalesRecords.serviceDate} >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' AND ${projectPresalesRecords.serviceDate} < DATE_TRUNC('month', NOW()) THEN ${projectPresalesRecords.totalWorkHours} ELSE 0 END)`,
        })
        .from(projectPresalesRecords)
        .innerJoin(projects, eq(projectPresalesRecords.projectId, projects.id))
        .where(presalesTrendWhere);

      const [trendWinRate] = await db
        .select({
          wonThis: sql<string>`COUNT(CASE WHEN bid_result = 'won' AND updated_at >= DATE_TRUNC('month', NOW()) THEN 1 END)`,
          bidThis: sql<string>`COUNT(CASE WHEN bid_result IN ('won','lost') AND updated_at >= DATE_TRUNC('month', NOW()) THEN 1 END)`,
          wonLast: sql<string>`COUNT(CASE WHEN bid_result = 'won' AND updated_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' AND updated_at < DATE_TRUNC('month', NOW()) THEN 1 END)`,
          bidLast: sql<string>`COUNT(CASE WHEN bid_result IN ('won','lost') AND updated_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' AND updated_at < DATE_TRUNC('month', NOW()) THEN 1 END)`,
        })
        .from(projects)
        .where(and(isNull(projects.deletedAt), projectRegionFilter));

      const wrThis = Number(trendWinRate?.bidThis || 0) > 0
        ? Math.round((Number(trendWinRate?.wonThis || 0) / Number(trendWinRate?.bidThis)) * 1000) / 10 : 0;
      const wrLast = Number(trendWinRate?.bidLast || 0) > 0
        ? Math.round((Number(trendWinRate?.wonLast || 0) / Number(trendWinRate?.bidLast)) * 1000) / 10 : 0;

      const kpiTrend: RegionViewData['kpiTrend'] = {
        totalCustomers: trendEntry(Number(trendCustomers?.thisMonth || 0), Number(trendCustomers?.lastMonth || 0)),
        totalProjects:  trendEntry(Number(trendProjects?.thisMonth  || 0), Number(trendProjects?.lastMonth  || 0)),
        wonAmount:      trendEntry(toWan(trendProjects?.wonThis), toWan(trendProjects?.wonLast)),
        presalesHours:  trendEntry(Math.round(Number(trendPresales?.thisMonth || 0)), Math.round(Number(trendPresales?.lastMonth || 0))),
        winRate:        trendEntry(wrThis, wrLast),
      };

      // L1: 项目阶段
      const stageRaw = await db
        .select({ stage: projects.projectStage, cnt: count() })
        .from(projects)
        .where(and(isNull(projects.deletedAt), projectRegionFilter))
        .groupBy(projects.projectStage);
      const stageDistribution = stageRaw.map(r => ({ stage: r.stage, count: r.cnt }));

      // L2: 客户类型分布
      const custTypeRaw = await db
        .select({ customerType: customerTypes.name, cnt: count() })
        .from(customers)
        .leftJoin(customerTypes, eq(customers.customerTypeId, customerTypes.id))
        .where(and(isNull(customers.deletedAt), customerRegionFilter, sql`${customers.customerTypeId} IS NOT NULL`))
        .groupBy(customerTypes.name)
        .orderBy(sql`COUNT(*) DESC`);
      const customerTypeDistribution = custTypeRaw.map(r => ({ customerType: r.customerType ?? '其他', count: r.cnt }));

      // L2 (legacy): 行业分布
      const industryRaw = await db
        .select({ industry: projects.industry, cnt: count() })
        .from(projects)
        .where(and(isNull(projects.deletedAt), projectRegionFilter))
        .groupBy(projects.industry)
        .orderBy(sql`COUNT(*) DESC`);
      const industryDistribution = industryRaw
        .filter(r => r.industry)
        .map(r => ({ industry: r.industry!, count: r.cnt }));

      // L3: 项目类型散点
      const ptypeRaw = await db
        .select({
          projectType: projects.projectType,
          cnt: count(),
          avgContract: sql<string>`AVG(NULLIF(${projects.contractAmount}, 0))`,
          totalAmt: sum(projects.estimatedAmount),
        })
        .from(projects)
        .where(and(isNull(projects.deletedAt), projectRegionFilter, sql`${projects.projectType} IS NOT NULL`))
        .groupBy(projects.projectType)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(20);
      const projectTypeScatter = ptypeRaw.map(r => {
        const code = r.projectType ?? '未分类';
        const chineseName = code.split(/[,，]/).map((c: string) => getProjectTypeDisplayLabel(c.trim())).join('/');
        return {
          projectType: code,
          projectTypeName: chineseName,
          count: r.cnt,
          avgContractAmount: toWan(r.avgContract),
          totalAmount: toWan(r.totalAmt),
        };
      });

      // Center: 区域地图
      const regionMapRaw = await db
        .select({
          region: projects.region,
          projectCount: count(),
          opportunityAmount: sum(projects.estimatedAmount),
          wonAmount: sql<string>`SUM(CASE WHEN ${projects.bidResult} = 'won' THEN COALESCE(${projects.actualAmount}, ${projects.estimatedAmount}, 0) ELSE 0 END)`,
        })
        .from(projects)
        .where(and(isNull(projects.deletedAt), sql`${projects.region} IS NOT NULL`))
        .groupBy(projects.region);

      const customerRegionRaw = await db
        .select({ region: customers.region, customerCount: count() })
        .from(customers)
        .where(and(isNull(customers.deletedAt), sql`${customers.region} IS NOT NULL`))
        .groupBy(customers.region);

      const presalesRegionRaw = await db
        .select({ region: projects.region, hours: sum(projectPresalesRecords.totalWorkHours) })
        .from(projectPresalesRecords)
        .innerJoin(projects, eq(projectPresalesRecords.projectId, projects.id))
        .where(and(isNull(projects.deletedAt), isNull(projectPresalesRecords.deletedAt), sql`${projects.region} IS NOT NULL`))
        .groupBy(projects.region);

      const custMap = Object.fromEntries(customerRegionRaw.map(r => [r.region!, r.customerCount]));
      const presMap = Object.fromEntries(presalesRegionRaw.map(r => [r.region!, Number(r.hours || 0)]));
      // Build subsidiary → regions lookup for map tooltip
      const allSubsidiaries = await db
        .select({ subsidiaryName: subsidiaries.subsidiaryName, regions: subsidiaries.regions })
        .from(subsidiaries)
        .where(and(isNull(subsidiaries.deletedAt), eq(subsidiaries.status, 'active')));

      // For each region name, find the first subsidiary that covers it
      function findSubsidiary(regionName: string): string | undefined {
        return allSubsidiaries.find(s =>
          Array.isArray(s.regions) && s.regions.some(
            r => r === regionName || regionName.includes(r) || r.includes(regionName)
          )
        )?.subsidiaryName;
      }

      const regionMap = regionMapRaw
        .filter(r => r.region)
        .map(r => ({
          region: r.region!,
          customerCount: custMap[r.region!] ?? 0,
          projectCount: r.projectCount,
          opportunityAmount: toWan(r.opportunityAmount),
          wonAmount: toWan(r.wonAmount),
          presalesHours: Math.round(presMap[r.region!] ?? 0),
          subsidiaryName: findSubsidiary(r.region!),
        }));

      // R1: 漏斗
      const funnelRaw = await db
        .select({ projectStage: projects.projectStage, cnt: count(), estAmt: sum(projects.estimatedAmount) })
        .from(projects)
        .where(and(isNull(projects.deletedAt), projectRegionFilter, not(inArray(projects.projectStage, ['archived', 'cancelled', 'suspended']))))
        .groupBy(projects.projectStage);

      const stgCnt: Record<string, number> = {};
      const stgAmt: Record<string, number> = {};
      for (const r of funnelRaw) { stgCnt[r.projectStage] = r.cnt; stgAmt[r.projectStage] = toWan(r.estAmt); }

      const funnelCounts = FUNNEL_STAGES.map(f => f.stages.reduce((a, s) => a + (stgCnt[s] ?? 0), 0));
      const funnelAmts   = FUNNEL_STAGES.map(f => f.stages.reduce((a, s) => a + (stgAmt[s] ?? 0), 0));
      const funnelRates  = funnelCounts.map((c, i) => i === 0 || funnelCounts[0] === 0 ? 100 : Math.round((c / funnelCounts[0]) * 1000) / 10);
      const funnelData = { stages: FUNNEL_STAGES.map(f => f.label), counts: funnelCounts, amounts: funnelAmts, rates: funnelRates };

      // R2: 项目列表
      const projectListRaw = await db
        .select({ id: projects.id, projectName: projects.projectName, projectStage: projects.projectStage, estimatedAmount: projects.estimatedAmount, actualAmount: projects.actualAmount, region: projects.region })
        .from(projects)
        .where(and(isNull(projects.deletedAt), projectRegionFilter, not(inArray(projects.projectStage, ['archived', 'cancelled', 'suspended']))))
        .orderBy(sql`COALESCE(${projects.actualAmount}, ${projects.estimatedAmount}, 0) DESC`);
      const projectList = projectListRaw.map(r => ({ id: r.id, projectName: r.projectName, projectStage: r.projectStage, amount: toWan(r.actualAmount ?? r.estimatedAmount), region: r.region }));

      // R3: 分子公司
      const subsidiaryRaw = await db
        .select({
          subsidiaryName: subsidiaries.subsidiaryName,
          projectCount: count(projects.id),
          wonAmount: sql<string>`SUM(CASE WHEN ${projects.bidResult} = 'won' THEN COALESCE(${projects.actualAmount}, ${projects.estimatedAmount}, 0) ELSE 0 END)`,
        })
        .from(subsidiaries)
        .leftJoin(projects, and(eq(projects.contractingCompanyId, subsidiaries.id), isNull(projects.deletedAt)))
        .where(and(isNull(subsidiaries.deletedAt), eq(subsidiaries.status, 'active')))
        .groupBy(subsidiaries.id, subsidiaries.subsidiaryName)
        .orderBy(sql`COUNT(${projects.id}) DESC`);
      const subsidiaryStats = subsidiaryRaw.map(r => ({ subsidiaryName: r.subsidiaryName, projectCount: r.projectCount, wonAmount: toWan(r.wonAmount) }));

      // B1: 月度趋势
      const monthlyRaw = await db.execute(sql`
        SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
               COUNT(*) AS new_projects,
               SUM(CASE WHEN bid_result = 'won' THEN COALESCE(actual_amount, estimated_amount, 0) ELSE 0 END) AS won_amount
        FROM bus_project
        WHERE deleted_at IS NULL
          ${regionCodes ? (regionCodes.length === 1 ? sql`AND region = ${regionCodes[0]}` : sql`AND region = ANY(ARRAY[${sql.join(regionCodes.map(c => sql`${c}`), sql`, `)}])`) : sql``}
          AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month
      `);
      const monthlyTrend = (monthlyRaw as unknown as Array<{month: string; new_projects: string; won_amount: string}>).map(r => ({
        month: r.month, newProjects: Number(r.new_projects), wonAmount: toWan(r.won_amount),
      }));

      // B2: 售前服务
      const presalesRaw = await db.execute(sql`
        SELECT TO_CHAR(ppr.service_date, 'YYYY-MM') AS month,
               pst.service_name AS service_type_name,
               COALESCE(SUM(ppr.total_work_hours), 0) AS hours
        FROM bus_project_presales_record ppr
        JOIN sys_presales_service_type pst ON ppr.service_type_id = pst.id
        JOIN bus_project p ON ppr.project_id = p.id
        WHERE ppr.deleted_at IS NULL AND p.deleted_at IS NULL
          AND ppr.service_date >= NOW() - INTERVAL '6 months'
          ${regionCodes ? (regionCodes.length === 1 ? sql`AND p.region = ${regionCodes[0]}` : sql`AND p.region = ANY(ARRAY[${sql.join(regionCodes.map(c => sql`${c}`), sql`, `)}])`) : sql``}
        GROUP BY TO_CHAR(ppr.service_date, 'YYYY-MM'), pst.service_name
        ORDER BY month, pst.service_name
      `);
      const presalesService = (presalesRaw as unknown as Array<{month: string; service_type_name: string; hours: string}>).map(r => ({
        month: r.month, serviceTypeName: r.service_type_name, hours: Number(r.hours),
      }));

      const data: RegionViewData = { kpi, kpiTrend, stageDistribution, industryDistribution, customerTypeDistribution, projectTypeScatter, regionMap, funnelData, projectList, subsidiaryStats, monthlyTrend, presalesService };
      return successResponse(data);
    } catch (err) {
      console.error('[data-screen/region-view] Error:', err);
      return errorResponse('INTERNAL_ERROR', '数据加载失败', { status: 500 });
    }
  },
  { requiredPermissions: [PERMISSIONS.DATASCREEN_VIEW] }
);