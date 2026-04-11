export type DataScreenPrimaryView = 'region' | 'personnel' | 'topic';
export type DataScreenRoleViewPreset = 'management' | 'business-focus' | 'presales-focus' | 'personal-focus';
export type DataScreenGlobalStatsTab = 'sales' | 'customers' | 'projects' | 'solutions';
export type DataScreenMapType = 'province-outside' | 'zhejiang';
export type DataScreenHeatmapMode = 'customer' | 'project' | 'budget' | 'contract' | 'activity' | 'solution';

interface SearchParamReader {
  get(name: string): string | null;
}

export interface DataScreenPhase2Filters {
  view: DataScreenPrimaryView;
  preset: DataScreenRoleViewPreset;
  panel: DataScreenGlobalStatsTab;
  map: DataScreenMapType;
  heatmap: DataScreenHeatmapMode;
  startDate: string;
  endDate: string;
  autoRefresh: boolean;
}

export const DATA_SCREEN_PRIMARY_VIEW_OPTIONS = [
  { value: 'region', label: '区域视角' },
  { value: 'personnel', label: '人员视角' },
  { value: 'topic', label: '专题视角' },
] as const;

const ROLE_VIEW_PRESETS = ['management', 'business-focus', 'presales-focus', 'personal-focus'] as const;
const GLOBAL_STATS_TABS = ['sales', 'customers', 'projects', 'solutions'] as const;
const MAP_TYPES = ['province-outside', 'zhejiang'] as const;
const HEATMAP_MODES = ['customer', 'project', 'budget', 'contract', 'activity', 'solution'] as const;

const DEFAULT_FILTERS: DataScreenPhase2Filters = {
  view: 'region',
  preset: 'management',
  panel: 'projects',
  map: 'province-outside',
  heatmap: 'customer',
  startDate: '',
  endDate: '',
  autoRefresh: true,
};

function isValidOption<T extends readonly string[]>(options: T, value: string | null): value is T[number] {
  return value !== null && options.includes(value as T[number]);
}

function normalizeDateInput(value: string | null): string {
  if (!value) {
    return '';
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

export function getDefaultDataScreenDateRange(baseDate = new Date()) {
  const endDate = new Date(baseDate);
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDataScreenPhase2Filters(searchParams: SearchParamReader): DataScreenPhase2Filters {
  return {
    view: isValidOption(DATA_SCREEN_PRIMARY_VIEW_OPTIONS.map((option) => option.value) as typeof DATA_SCREEN_PRIMARY_VIEW_OPTIONS[number]['value'][], searchParams.get('view'))
      ? (searchParams.get('view') as DataScreenPrimaryView)
      : DEFAULT_FILTERS.view,
    preset: isValidOption(ROLE_VIEW_PRESETS, searchParams.get('preset'))
      ? (searchParams.get('preset') as DataScreenRoleViewPreset)
      : DEFAULT_FILTERS.preset,
    panel: isValidOption(GLOBAL_STATS_TABS, searchParams.get('panel'))
      ? (searchParams.get('panel') as DataScreenGlobalStatsTab)
      : DEFAULT_FILTERS.panel,
    map: isValidOption(MAP_TYPES, searchParams.get('map'))
      ? (searchParams.get('map') as DataScreenMapType)
      : DEFAULT_FILTERS.map,
    heatmap: isValidOption(HEATMAP_MODES, searchParams.get('heatmap'))
      ? (searchParams.get('heatmap') as DataScreenHeatmapMode)
      : DEFAULT_FILTERS.heatmap,
    startDate: normalizeDateInput(searchParams.get('startDate')),
    endDate: normalizeDateInput(searchParams.get('endDate')),
    autoRefresh: searchParams.get('autoRefresh') !== '0',
  };
}

export function buildDataScreenPhase2SearchParams(filters: DataScreenPhase2Filters) {
  const params = new URLSearchParams();

  if (filters.view !== DEFAULT_FILTERS.view) {
    params.set('view', filters.view);
  }

  if (filters.preset !== DEFAULT_FILTERS.preset) {
    params.set('preset', filters.preset);
  }

  if (filters.panel !== DEFAULT_FILTERS.panel) {
    params.set('panel', filters.panel);
  }

  if (filters.map !== DEFAULT_FILTERS.map) {
    params.set('map', filters.map);
  }

  if (filters.heatmap !== DEFAULT_FILTERS.heatmap) {
    params.set('heatmap', filters.heatmap);
  }

  if (filters.startDate) {
    params.set('startDate', filters.startDate);
  }

  if (filters.endDate) {
    params.set('endDate', filters.endDate);
  }

  if (!filters.autoRefresh) {
    params.set('autoRefresh', '0');
  }

  return params;
}