import {
  getDefaultDataScreenDateRange,
  type DataScreenHeatmapMode,
  type DataScreenMapType,
} from '@/lib/data-screen-phase2-filters';

interface SearchParamReader {
  get(name: string): string | null;
}

export interface DataScreenRegionDetailFilters {
  startDate: string;
  endDate: string;
  map: DataScreenMapType;
  heatmap: DataScreenHeatmapMode;
  region: string;
}

export interface DataScreenRegionDetailData {
  filtersEcho: DataScreenRegionDetailFilters;
  regionLabel: string;
  summary: {
    customerCount: number;
    projectCount: number;
    projectAmount: number;
    contractAmount: number;
    riskCount: number;
    highRiskCount: number;
    activeStaffCount: number;
    solutionUsage: number;
    preSalesActivity: number;
  };
  customerSnapshot: {
    items: Array<{
      id: number;
      name: string;
      status: string;
      totalAmount: number;
      currentProjectCount: number;
      lastInteractionTime: string | null;
      address: string;
    }>;
  };
  projectSnapshot: {
    wonCount: number;
    items: Array<{
      id: number;
      name: string;
      customerName: string;
      stage: string;
      status: string;
      amount: number;
      managerName: string;
    }>;
  };
  riskSnapshot: {
    items: Array<{
      id: number;
      projectId: number;
      projectName: string;
      riskLevel: string;
      description: string;
      status: string;
    }>;
  };
  collaborationSnapshot: {
    items: Array<{
      userId: number;
      realName: string;
      position: string;
      projectCount: number;
    }>;
  };
  actions: Array<{
    label: string;
    href: string;
  }>;
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

function normalizeRegionInput(value: string | null) {
  return (value || '').trim();
}

export function parseDataScreenRegionDetailFilters(searchParams: SearchParamReader): DataScreenRegionDetailFilters {
  const defaultDateRange = getDefaultDataScreenDateRange();
  return {
    startDate: normalizeDateInput(searchParams.get('startDate')) || defaultDateRange.startDate,
    endDate: normalizeDateInput(searchParams.get('endDate')) || defaultDateRange.endDate,
    map: isValidOption(MAP_TYPES, searchParams.get('map')) ? (searchParams.get('map') as DataScreenMapType) : 'province-outside',
    heatmap: isValidOption(HEATMAP_MODES, searchParams.get('heatmap')) ? (searchParams.get('heatmap') as DataScreenHeatmapMode) : 'customer',
    region: normalizeRegionInput(searchParams.get('region')),
  };
}

export function buildEmptyDataScreenRegionDetailData(filters: DataScreenRegionDetailFilters): DataScreenRegionDetailData {
  return {
    filtersEcho: filters,
    regionLabel: filters.region,
    summary: {
      customerCount: 0,
      projectCount: 0,
      projectAmount: 0,
      contractAmount: 0,
      riskCount: 0,
      highRiskCount: 0,
      activeStaffCount: 0,
      solutionUsage: 0,
      preSalesActivity: 0,
    },
    customerSnapshot: {
      items: [],
    },
    projectSnapshot: {
      wonCount: 0,
      items: [],
    },
    riskSnapshot: {
      items: [],
    },
    collaborationSnapshot: {
      items: [],
    },
    actions: [
      { label: '查看客户列表', href: '/customers' },
      { label: '查看项目列表', href: '/projects' },
    ],
    timestamp: new Date().toISOString(),
  };
}