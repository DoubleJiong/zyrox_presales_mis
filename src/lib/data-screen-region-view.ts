import {
  getDefaultDataScreenDateRange,
  type DataScreenHeatmapMode,
  type DataScreenMapType,
} from '@/lib/data-screen-phase2-filters';

interface SearchParamReader {
  get(name: string): string | null;
}

export interface DataScreenRegionViewInitFilters {
  startDate: string;
  endDate: string;
  map: DataScreenMapType;
  heatmap: DataScreenHeatmapMode;
}

export interface DataScreenRegionRankingItem {
  name: string;
  value: number;
  amount: number;
}

export interface DataScreenRegionHeatmapRegion {
  name: string;
  customerCount: number;
  projectCount: number;
  projectAmount: number;
  ongoingProjectAmount: number;
  solutionUsage: number;
  preSalesActivity: number;
  budget: number;
  contractAmount: number;
  hasCustomerAlert?: boolean;
  hasProjectAlert?: boolean;
  hasUserAlert?: boolean;
}

export interface DataScreenRegionViewInitData {
  filtersEcho: DataScreenRegionViewInitFilters;
  summary: {
    totalCustomers: number;
    totalProjects: number;
    totalSolutions: number;
    totalStaff: number;
    totalRevenue: number;
    wonProjects: number;
    riskProjectCount: number;
    activeRegionCount: number;
  };
  map: {
    mode: DataScreenMapType;
    heatmap: DataScreenHeatmapMode;
    label: string;
    unit: string;
    regions: DataScreenRegionHeatmapRegion[];
  };
  rankings: {
    topRegions: DataScreenRegionRankingItem[];
    topRevenueRegions: DataScreenRegionRankingItem[];
  };
  funnel: {
    totalOpenCount: number;
    totalOpenAmount: number;
    weightedPipeline: number;
    avgWinProbability: number;
    missingWinProbabilityCount: number;
    stages: Array<{
      key: string;
      label: string;
      count: number;
      amount: number;
      weightedAmount: number;
    }>;
  };
  forecastSummary: {
    targetBasis: string;
    targetLabel: string;
    periodDays: number;
    targetAmount: number;
    currentWonAmount: number;
    forecastAmount: number;
    weightedOpenAmount: number;
    gapAmount: number;
    coverageRate: number;
    averageWinProbability: number;
    requiredNewOpportunityAmount: number;
    confidence: 'on-track' | 'watch' | 'gap';
  };
  riskSummary: {
    total: number;
    high: number;
    medium: number;
    overdueActions: number;
    overdueBids: number;
    staleProjects: number;
    dueThisWeek: number;
    items: Array<{
      projectId: number;
      projectName: string;
      region: string;
      stage: string;
      riskLevel: 'high' | 'medium';
      score: number;
      amount: number;
      winProbability: number;
      reason: string;
    }>;
  };
  trend: {
    monthlyData: Array<{
      month: string;
      customers: number;
      projects: number;
      revenue: number;
      actualRevenue?: number;
      estimatedRevenue?: number;
    }>;
    stageStats: Array<{ stage: string; count: number }>;
    statusStats: Array<{ status: string; count: number }>;
  };
  timestamp: string;
}

const MAP_TYPES: DataScreenMapType[] = ['province-outside', 'zhejiang'];
const HEATMAP_MODES: DataScreenHeatmapMode[] = ['customer', 'project', 'budget', 'contract', 'activity', 'solution'];

function isValidOption<T extends string>(options: T[], value: string | null): value is T {
  return value !== null && options.includes(value as T);
}

function normalizeDateInput(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

export function getDataScreenHeatmapMeta(heatmap: DataScreenHeatmapMode) {
  switch (heatmap) {
    case 'customer':
      return { label: '客户总数', unit: '家', field: 'customerCount' as const };
    case 'project':
      return { label: '项目总数', unit: '个', field: 'projectCount' as const };
    case 'budget':
      return { label: '资金预算', unit: '万', field: 'budget' as const };
    case 'contract':
      return { label: '中标金额', unit: '万', field: 'contractAmount' as const };
    case 'activity':
      return { label: '售前活动', unit: '人次', field: 'preSalesActivity' as const };
    case 'solution':
      return { label: '方案引用', unit: '次', field: 'solutionUsage' as const };
    default:
      return { label: '客户总数', unit: '家', field: 'customerCount' as const };
  }
}

export function parseDataScreenRegionViewInitFilters(searchParams: SearchParamReader): DataScreenRegionViewInitFilters {
  const defaultDateRange = getDefaultDataScreenDateRange();
  return {
    startDate: normalizeDateInput(searchParams.get('startDate')) || defaultDateRange.startDate,
    endDate: normalizeDateInput(searchParams.get('endDate')) || defaultDateRange.endDate,
    map: isValidOption(MAP_TYPES, searchParams.get('map')) ? searchParams.get('map') as DataScreenMapType : 'province-outside',
    heatmap: isValidOption(HEATMAP_MODES, searchParams.get('heatmap')) ? searchParams.get('heatmap') as DataScreenHeatmapMode : 'customer',
  };
}

export function buildEmptyDataScreenRegionViewInitData(
  filters: DataScreenRegionViewInitFilters,
): DataScreenRegionViewInitData {
  const heatmapMeta = getDataScreenHeatmapMeta(filters.heatmap);
  return {
    filtersEcho: filters,
    summary: {
      totalCustomers: 0,
      totalProjects: 0,
      totalSolutions: 0,
      totalStaff: 0,
      totalRevenue: 0,
      wonProjects: 0,
      riskProjectCount: 0,
      activeRegionCount: 0,
    },
    map: {
      mode: filters.map,
      heatmap: filters.heatmap,
      label: heatmapMeta.label,
      unit: heatmapMeta.unit,
      regions: [],
    },
    rankings: {
      topRegions: [],
      topRevenueRegions: [],
    },
    funnel: {
      totalOpenCount: 0,
      totalOpenAmount: 0,
      weightedPipeline: 0,
      avgWinProbability: 0,
      missingWinProbabilityCount: 0,
      stages: [],
    },
    forecastSummary: {
      targetBasis: 'rolling_90d_run_rate',
      targetLabel: '滚动90天中标 run-rate',
      periodDays: 30,
      targetAmount: 0,
      currentWonAmount: 0,
      forecastAmount: 0,
      weightedOpenAmount: 0,
      gapAmount: 0,
      coverageRate: 0,
      averageWinProbability: 0,
      requiredNewOpportunityAmount: 0,
      confidence: 'gap',
    },
    riskSummary: {
      total: 0,
      high: 0,
      medium: 0,
      overdueActions: 0,
      overdueBids: 0,
      staleProjects: 0,
      dueThisWeek: 0,
      items: [],
    },
    trend: {
      monthlyData: [],
      stageStats: [],
      statusStats: [],
    },
    timestamp: new Date().toISOString(),
  };
}