import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildEmptyDataScreenRegionViewInitData,
  getDataScreenHeatmapMeta,
  parseDataScreenRegionViewInitFilters,
  type DataScreenRegionHeatmapRegion,
  type DataScreenRegionRankingItem,
} from '@/lib/data-screen-region-view';

function toNumber(value: unknown) {
  const normalized = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

function buildRegionRanking(
  regions: DataScreenRegionHeatmapRegion[],
  valueField: keyof DataScreenRegionHeatmapRegion,
  amountField: keyof DataScreenRegionHeatmapRegion,
) {
  return [...regions]
    .map((region) => ({
      name: region.name,
      value: toNumber(region[valueField]),
      amount: toNumber(region[amountField]),
    }))
    .filter((region) => region.value > 0 || region.amount > 0)
    .sort((left, right) => right.value - left.value || right.amount - left.amount)
    .slice(0, 5);
}

function buildRevenueRanking(regions: DataScreenRegionHeatmapRegion[]) {
  return [...regions]
    .map((region) => ({
      name: region.name,
      value: toNumber(region.projectAmount),
      amount: toNumber(region.projectAmount),
    }))
    .filter((region) => region.amount > 0 || region.value > 0)
    .sort((left, right) => right.amount - left.amount || right.value - left.value)
    .slice(0, 5);
}

function countActiveRegions(regions: DataScreenRegionHeatmapRegion[]) {
  return regions.filter((region) => (
    region.customerCount > 0 ||
    region.projectCount > 0 ||
    region.projectAmount > 0 ||
    region.contractAmount > 0 ||
    region.preSalesActivity > 0 ||
    region.solutionUsage > 0
  )).length;
}

async function fetchInternalJson<T>(request: NextRequest, pathWithQuery: string): Promise<T> {
  const headers = new Headers();
  const cookie = request.headers.get('cookie');
  const authorization = request.headers.get('authorization');

  if (cookie) {
    headers.set('cookie', cookie);
  }
  if (authorization) {
    headers.set('authorization', authorization);
  }

  const response = await fetch(new URL(pathWithQuery, request.url), {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Internal fetch failed: ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.success || !payload.data) {
    throw new Error(payload?.error?.message || 'Internal payload missing data');
  }

  return payload.data as T;
}

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request: NextRequest) => {
    const filters = parseDataScreenRegionViewInitFilters(request.nextUrl.searchParams);

    try {
      const overviewParams = new URLSearchParams();
      overviewParams.set('startDate', filters.startDate);
      overviewParams.set('endDate', filters.endDate);
      if (request.nextUrl.searchParams.get('refresh') === 'true') {
        overviewParams.set('refresh', 'true');
      }

      const heatmapParams = new URLSearchParams();
      heatmapParams.set('startDate', filters.startDate);
      heatmapParams.set('endDate', filters.endDate);
      heatmapParams.set('mode', filters.map === 'zhejiang' ? 'zhejiang' : filters.heatmap);

      const [overviewPayload, heatmapPayload] = await Promise.all([
        fetchInternalJson<any>(request, `/api/data-screen/overview?${overviewParams.toString()}`),
        fetchInternalJson<any>(request, `/api/data-screen/heatmap?${heatmapParams.toString()}`),
      ]);

      const regions = (heatmapPayload.regions || []) as DataScreenRegionHeatmapRegion[];
      const heatmapMeta = getDataScreenHeatmapMeta(filters.heatmap);
      const topRegions: DataScreenRegionRankingItem[] = filters.map === 'zhejiang'
        ? buildRegionRanking(regions, 'projectCount', 'projectAmount')
        : (overviewPayload.topRegions || []);
      const topRevenueRegions: DataScreenRegionRankingItem[] = filters.map === 'zhejiang'
        ? buildRevenueRanking(regions)
        : (overviewPayload.topRevenueRegions || []);

      return successResponse({
        filtersEcho: filters,
        summary: {
          totalCustomers: overviewPayload.totalCustomers ?? 0,
          totalProjects: overviewPayload.totalProjects ?? 0,
          totalSolutions: overviewPayload.totalSolutions ?? 0,
          totalStaff: overviewPayload.totalStaff ?? 0,
          totalRevenue: overviewPayload.totalRevenue ?? 0,
          wonProjects: overviewPayload.wonProjects ?? 0,
          riskProjectCount: overviewPayload.riskSummary?.total ?? 0,
          activeRegionCount: countActiveRegions(regions),
        },
        map: {
          mode: filters.map,
          heatmap: filters.heatmap,
          label: heatmapMeta.label,
          unit: heatmapMeta.unit,
          regions,
        },
        rankings: {
          topRegions,
          topRevenueRegions,
        },
        funnel: overviewPayload.funnel,
        forecastSummary: overviewPayload.forecastSummary,
        riskSummary: overviewPayload.riskSummary,
        trend: {
          monthlyData: overviewPayload.monthlyData || [],
          stageStats: overviewPayload.stageStats || [],
          statusStats: overviewPayload.statusStats || [],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get data-screen region view init error:', error);
      return successResponse(buildEmptyDataScreenRegionViewInitData(filters));
    }
  },
  {
    requiredPermissions: [PERMISSIONS.DATASCREEN_VIEW],
  }
);