export const TEAM_EXECUTION_VIEW_OPTIONS = [
  { value: 'role', label: '角色视角' },
  { value: 'project', label: '项目视角' },
  { value: 'customer', label: '客户视角' },
  { value: 'solution', label: '方案视角' },
] as const;

export const TEAM_EXECUTION_TIME_RANGE_OPTIONS = [
  { value: 'today', label: '今日' },
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
] as const;

export const TEAM_EXECUTION_FOCUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'overdue', label: '仅看逾期' },
  { value: 'high-priority', label: '仅看高优' },
  { value: 'key-project', label: '仅看重点项目' },
  { value: 'abnormal', label: '仅看异常' },
] as const;

export type TeamExecutionView = (typeof TEAM_EXECUTION_VIEW_OPTIONS)[number]['value'];
export type TeamExecutionTimeRange = (typeof TEAM_EXECUTION_TIME_RANGE_OPTIONS)[number]['value'];
export type TeamExecutionFocus = (typeof TEAM_EXECUTION_FOCUS_OPTIONS)[number]['value'];

export interface TeamExecutionFilters {
  view: TeamExecutionView;
  range: TeamExecutionTimeRange;
  focus: TeamExecutionFocus;
  q: string;
}

interface SearchParamReader {
  get(name: string): string | null;
}

export const DEFAULT_TEAM_EXECUTION_FILTERS: TeamExecutionFilters = {
  view: 'role',
  range: '7d',
  focus: 'all',
  q: '',
};

function isValidOption<T extends readonly { value: string }[]>(
  options: T,
  value: string | null
): value is T[number]['value'] {
  return value !== null && options.some((option) => option.value === value);
}

function normalizeKeyword(value: string | null) {
  return (value || '').trim().slice(0, 50);
}

export function parseTeamExecutionFilters(searchParams: SearchParamReader): TeamExecutionFilters {
  const view = searchParams.get('view');
  const range = searchParams.get('range');
  const focus = searchParams.get('focus');

  return {
    view: isValidOption(TEAM_EXECUTION_VIEW_OPTIONS, view) ? view : DEFAULT_TEAM_EXECUTION_FILTERS.view,
    range: isValidOption(TEAM_EXECUTION_TIME_RANGE_OPTIONS, range) ? range : DEFAULT_TEAM_EXECUTION_FILTERS.range,
    focus: isValidOption(TEAM_EXECUTION_FOCUS_OPTIONS, focus) ? focus : DEFAULT_TEAM_EXECUTION_FILTERS.focus,
    q: normalizeKeyword(searchParams.get('q')),
  };
}

export function buildTeamExecutionSearchParams(filters: TeamExecutionFilters) {
  const params = new URLSearchParams();

  if (filters.view !== DEFAULT_TEAM_EXECUTION_FILTERS.view) {
    params.set('view', filters.view);
  }

  if (filters.range !== DEFAULT_TEAM_EXECUTION_FILTERS.range) {
    params.set('range', filters.range);
  }

  if (filters.focus !== DEFAULT_TEAM_EXECUTION_FILTERS.focus) {
    params.set('focus', filters.focus);
  }

  if (filters.q.trim()) {
    params.set('q', normalizeKeyword(filters.q));
  }

  return params;
}

export function getTeamExecutionViewLabel(view: TeamExecutionView) {
  return TEAM_EXECUTION_VIEW_OPTIONS.find((option) => option.value === view)?.label || DEFAULT_TEAM_EXECUTION_FILTERS.view;
}

export function getTeamExecutionRangeLabel(range: TeamExecutionTimeRange) {
  return TEAM_EXECUTION_TIME_RANGE_OPTIONS.find((option) => option.value === range)?.label || DEFAULT_TEAM_EXECUTION_FILTERS.range;
}

export function getTeamExecutionFocusLabel(focus: TeamExecutionFocus) {
  return TEAM_EXECUTION_FOCUS_OPTIONS.find((option) => option.value === focus)?.label || DEFAULT_TEAM_EXECUTION_FILTERS.focus;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function resolveTeamExecutionDateRange(range: TeamExecutionTimeRange, baseDate = new Date()) {
  const end = new Date(baseDate);
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  if (range === '7d') {
    start.setDate(start.getDate() - 6);
  } else if (range === '30d') {
    start.setDate(start.getDate() - 29);
  }

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}