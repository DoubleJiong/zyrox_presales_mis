import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { aggregateProjectLifecycleRows, type ProjectLifecycleRow } from '@/lib/project-reporting';

// 内存缓存
const cache: Map<string, { data: any; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

// 中国省份列表
const PROVINCES = [
  '浙江', '江苏', '上海', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南',
  '广东', '广西', '海南', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海',
  '宁夏', '新疆', '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
  '重庆', '香港', '澳门', '台湾'
];

// 浙江城市列表（与geojson文件中的名称保持一致）
const ZHEJIANG_CITIES = [
  '杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市',
  '金华市', '衢州市', '舟山市', '台州市', '丽水市'
];

type RegionCustomerStat = {
  name: string;
  customerCount?: number | string | null;
};

type RegionLifecycleStat = ProjectLifecycleRow & {
  name: string;
  customerCount?: number | string | null;
};

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function sumOpenLifecycleAmount(rows: ProjectLifecycleRow[]): number {
  const aggregated = aggregateProjectLifecycleRows(rows);
  return aggregated
    .filter((row) => row.status === 'lead' || row.status === 'in_progress')
    .reduce((sum, row) => sum + row.totalAmount, 0);
}

function sumWonActualAmount(rows: ProjectLifecycleRow[]): number {
  const aggregated = aggregateProjectLifecycleRows(rows);
  return aggregated
    .filter((row) => row.status === 'won')
    .reduce((sum, row) => sum + row.actualAmount, 0);
}

async function getProjectRegionCustomerStats() {
  const regionStats = await db.execute(sql`
    SELECT 
      region as name,
      COUNT(DISTINCT customer_id) as "customerCount"
    FROM bus_project
    WHERE deleted_at IS NULL
      AND region IS NOT NULL
      AND region != ''
    GROUP BY region
  `);

  return (Array.isArray(regionStats) ? regionStats : (regionStats as any).rows || []) as RegionCustomerStat[];
}

async function getProjectRegionLifecycleStats() {
  const lifecycleStats = await db.execute(sql`
    SELECT 
      region as name,
      project_stage as "projectStage",
      bid_result as "bidResult",
      status,
      COUNT(*) as count,
      COALESCE(SUM(CAST(estimated_amount AS DECIMAL)), 0) as "totalAmount",
      COALESCE(SUM(CAST(actual_amount AS DECIMAL)), 0) as "actualAmount"
    FROM bus_project
    WHERE deleted_at IS NULL
      AND region IS NOT NULL
      AND region != ''
    GROUP BY region, project_stage, bid_result, status
  `);

  return (Array.isArray(lifecycleStats) ? lifecycleStats : (lifecycleStats as any).rows || []) as RegionLifecycleStat[];
}

// GET - 获取热力图数据（优化版，带缓存和认证）
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'customer';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 检查缓存
    const cacheKey = `heatmap:${mode}:${startDate || 'all'}:${endDate || 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return successResponse(cached.data);
    }

    let heatmapData: any[] = [];

    // 根据模式获取不同数据
    switch (mode) {
      case 'customer':
        heatmapData = await getCustomerHeatmap(startDate, endDate);
        break;
      case 'project':
        heatmapData = await getProjectHeatmap(startDate, endDate);
        break;
      case 'budget':
        heatmapData = await getBudgetHeatmap(startDate, endDate);
        break;
      case 'contract':
        heatmapData = await getContractHeatmap(startDate, endDate);
        break;
      case 'activity':
        heatmapData = await getActivityHeatmap(startDate, endDate);
        break;
      case 'solution':
        heatmapData = await getSolutionHeatmap(startDate, endDate);
        break;
      case 'staff':
        heatmapData = await getStaffHeatmap(startDate, endDate);
        break;
      case 'zhejiang':
        heatmapData = await getZhejiangHeatmap(startDate, endDate);
        break;
      default:
        heatmapData = await getCustomerHeatmap(startDate, endDate);
    }

    const responseData = {
      type: mode,
      regions: heatmapData,
      timestamp: new Date().toISOString(),
    };

    // 更新缓存
    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    return successResponse(responseData);
  } catch (error) {
    console.error('Failed to fetch heatmap data:', error);
    return errorResponse('INTERNAL_ERROR', '获取热力图数据失败');
  }
});

// 获取客户热力图
async function getCustomerHeatmap(startDate?: string | null, endDate?: string | null) {
  // 从 bus_customer 表获取客户区域统计
  const regionStats = await db.execute(sql`
    SELECT 
      region as name,
      COUNT(*) as count
    FROM bus_customer
    WHERE deleted_at IS NULL
      AND region IS NOT NULL
      AND region != ''
    GROUP BY region
  `);

  const stats = Array.isArray(regionStats) ? regionStats : (regionStats as any).rows || [];

  return PROVINCES.map(province => {
    const stat = stats.find((s: any) => s.name === province);
    return {
      name: province,
      customerCount: stat ? Number(stat.count) : 0,
      projectCount: 0,
      projectAmount: 0,
      ongoingProjectAmount: 0,
      solutionUsage: 0,
      preSalesActivity: 0,
      budget: 0,
      contractAmount: 0,
    };
  });
}

// 获取项目热力图
async function getProjectHeatmap(startDate?: string | null, endDate?: string | null) {
  const customerStats = await getProjectRegionCustomerStats();
  const lifecycleStats = await getProjectRegionLifecycleStats();

  // 为所有省份创建数据
  return PROVINCES.map(province => {
    const customerStat = customerStats.find((s) => s.name === province);
    const regionRows = lifecycleStats.filter((row) => row.name === province);
    const aggregated = aggregateProjectLifecycleRows(regionRows);
    return {
      name: province,
      customerCount: toNumber(customerStat?.customerCount),
      projectCount: aggregated.reduce((sum, row) => sum + row.count, 0),
      projectAmount: aggregated.reduce((sum, row) => sum + row.totalAmount, 0),
      ongoingProjectAmount: sumOpenLifecycleAmount(regionRows),
      solutionUsage: 0,
      preSalesActivity: 0,
      budget: 0,
      contractAmount: 0,
    };
  });
}

// 获取资金预算热力图
async function getBudgetHeatmap(startDate?: string | null, endDate?: string | null) {
  // 获取各区域项目的预算金额
  const regionStats = await db.execute(sql`
    SELECT 
      region as name,
      COALESCE(SUM(CAST(estimated_amount AS DECIMAL)), 0) as budget
    FROM bus_project
    WHERE deleted_at IS NULL
      AND region IS NOT NULL
    GROUP BY region
  `);

  const stats = Array.isArray(regionStats) ? regionStats : (regionStats as any).rows || [];

  return PROVINCES.map(province => {
    const stat = stats.find((s: any) => s.name === province);
    return {
      name: province,
      customerCount: 0,
      projectCount: 0,
      projectAmount: 0,
      ongoingProjectAmount: 0,
      solutionUsage: 0,
      preSalesActivity: 0,
      budget: stat ? Number(stat.budget) : 0,
      contractAmount: 0,
    };
  });
}

// 获取中标金额热力图
async function getContractHeatmap(startDate?: string | null, endDate?: string | null) {
  const lifecycleStats = await getProjectRegionLifecycleStats();

  return PROVINCES.map(province => {
    const regionRows = lifecycleStats.filter((row) => row.name === province);
    return {
      name: province,
      customerCount: 0,
      projectCount: 0,
      projectAmount: 0,
      ongoingProjectAmount: 0,
      solutionUsage: 0,
      preSalesActivity: 0,
      budget: 0,
      contractAmount: sumWonActualAmount(regionRows),
    };
  });
}

// 获取售前活动热力图
async function getActivityHeatmap(startDate?: string | null, endDate?: string | null) {
  // 获取各区域的售前活动次数（基于当前项目活动表）
  const regionStats = await db.execute(sql`
    SELECT 
      p.region as name,
      COUNT(sa.id) as activityCount
    FROM bus_project p
    LEFT JOIN bus_staff_activity sa ON p.id = sa.project_id AND sa.deleted_at IS NULL
    WHERE p.deleted_at IS NULL
      AND p.region IS NOT NULL
    GROUP BY p.region
  `);

  const stats = Array.isArray(regionStats) ? regionStats : (regionStats as any).rows || [];

  return PROVINCES.map(province => {
    const stat = stats.find((s: any) => s.name === province);
    return {
      name: province,
      customerCount: 0,
      projectCount: 0,
      projectAmount: 0,
      ongoingProjectAmount: 0,
      solutionUsage: 0,
      preSalesActivity: stat ? Number(stat.activityCount) : 0,
      budget: 0,
      contractAmount: 0,
    };
  });
}

// 获取方案引用热力图
async function getSolutionHeatmap(startDate?: string | null, endDate?: string | null) {
  // 获取各区域项目关联的方案数量（按当前方案关联表统计）
  const regionStats = await db.execute(sql`
    SELECT 
      p.region as name,
      COUNT(ps.solution_id) as solutionCount
    FROM bus_project p
    LEFT JOIN bus_solution_project ps ON p.id = ps.project_id AND ps.deleted_at IS NULL
    WHERE p.deleted_at IS NULL
      AND p.region IS NOT NULL
    GROUP BY p.region
  `);

  const stats = Array.isArray(regionStats) ? regionStats : (regionStats as any).rows || [];

  return PROVINCES.map(province => {
    const stat = stats.find((s: any) => s.name === province);
    return {
      name: province,
      customerCount: 0,
      projectCount: 0,
      projectAmount: 0,
      ongoingProjectAmount: 0,
      solutionUsage: stat ? Number(stat.solutionCount) : 0,
      preSalesActivity: 0,
      budget: 0,
      contractAmount: 0,
    };
  });
}

// 获取员工热力图
async function getStaffHeatmap(startDate?: string | null, endDate?: string | null) {
  // 员工按部门统计，不按区域
  // 这里返回各省份的售前活动数据（模拟）
  const staffStats = await db.execute(sql`
    SELECT 
      u.department,
      COUNT(*) as count
    FROM sys_user u
    WHERE u.status = 'active'
    GROUP BY u.department
  `);

  const stats = Array.isArray(staffStats) ? staffStats : (staffStats as any).rows || [];
  const totalStaff = stats.reduce((sum: number, s: any) => sum + Number(s.count || 0), 0);

  return PROVINCES.map(province => {
    // 根据项目数量估算售前活动
    return {
      name: province,
      customerCount: 0,
      projectCount: 0,
      projectAmount: 0,
      ongoingProjectAmount: 0,
      solutionUsage: 0,
      preSalesActivity: Math.floor(totalStaff / 10), // 平均分配
      budget: 0,
      contractAmount: 0,
    };
  });
}

// 获取浙江省内热力图
async function getZhejiangHeatmap(startDate?: string | null, endDate?: string | null) {
  // 当前客户表没有 province/city 独立字段，按地址中的浙江城市名称做归类。
  const zhejiangCustomerRows = await db.execute(sql`
    SELECT address
    FROM bus_customer
    WHERE deleted_at IS NULL
      AND address IS NOT NULL
      AND address != ''
      AND address LIKE '%浙江%'
  `);

  const addressRows = (Array.isArray(zhejiangCustomerRows)
    ? zhejiangCustomerRows
    : (zhejiangCustomerRows as any).rows || []) as Array<{ address?: string | null }>;

  const cityCounts = new Map<string, number>();

  for (const city of ZHEJIANG_CITIES) {
    cityCounts.set(city, 0);
  }

  for (const row of addressRows) {
    const address = typeof row.address === 'string' ? row.address : '';

    for (const city of ZHEJIANG_CITIES) {
      const normalizedCityName = city.replace('市', '');
      if (address.includes(city) || address.includes(normalizedCityName)) {
        cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
        break;
      }
    }
  }

  return ZHEJIANG_CITIES.map(city => {
    return {
      name: city,
      customerCount: cityCounts.get(city) || 0,
      projectCount: 0,
      projectAmount: 0,
      ongoingProjectAmount: 0,
      solutionUsage: 0,
      preSalesActivity: 0,
      budget: 0,
      contractAmount: 0,
    };
  });
}
