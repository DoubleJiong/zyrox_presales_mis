import { db } from '@/db';
import { solutionReviews } from '@/db/schema';
import { and, inArray, isNull } from 'drizzle-orm';
import {
  getDefaultDataScreenDateRange,
  type DataScreenRoleViewPreset,
} from '@/lib/data-screen-phase2-filters';
import {
  buildUserExecutionStats,
  loadTeamExecutionScope,
  type TeamExecutionScope,
} from '@/lib/team-execution-cockpit/read-model';

interface SearchParamReader {
  get(name: string): string | null;
}

export type DataScreenPersonnelLoadBucket = 'reserve' | 'balanced' | 'busy' | 'overloaded';
export type DataScreenPersonnelItemType = 'task' | 'todo' | 'solution-review' | 'project-collaboration';
export type DataScreenPersonnelAbnormalFilter = 'all' | 'overdue' | 'high-priority-stalled' | 'stale' | 'cross-project-overload';
export type DataScreenPersonnelItemAbnormalFlag = Exclude<DataScreenPersonnelAbnormalFilter, 'all'>;

export interface DataScreenPersonnelViewInitFilters {
  startDate: string;
  endDate: string;
  preset: DataScreenRoleViewPreset;
  personId: number | null;
  abnormalFilter: DataScreenPersonnelAbnormalFilter;
  selectedItemId: string | null;
  peoplePage: number;
  peoplePageSize: number;
  itemPage: number;
  itemPageSize: number;
}

export interface DataScreenPersonnelViewPersonItem {
  userId: number;
  name: string;
  roleName: string;
  department: string | null;
  position: string | null;
  region: string | null;
  pendingCount: number;
  overdueCount: number;
  highPriorityCount: number;
  activeProjectCount: number;
  activeSolutionCount: number;
  riskScore: number;
  loadBucket: DataScreenPersonnelLoadBucket;
  lowActivity: boolean;
  lastActivityAt: string | null;
  reasons: string[];
}

export interface DataScreenPersonnelViewItemEntry {
  id: string;
  sourceId: number;
  type: DataScreenPersonnelItemType;
  title: string;
  customerName: string | null;
  projectName: string | null;
  solutionName: string | null;
  priority: string | null;
  dueDate: string | null;
  status: string;
  progress: number | null;
  isOverdue: boolean;
  lastUpdatedAt: string | null;
  abnormalFlags: DataScreenPersonnelItemAbnormalFlag[];
}

export interface DataScreenPersonnelViewItemDetail extends DataScreenPersonnelViewItemEntry {
  description: string | null;
  blockerReason: string | null;
  collaborationContext: Array<{
    label: string;
    value: string;
  }>;
  timeline: Array<{
    label: string;
    value: string;
    tone: 'neutral' | 'warning' | 'danger';
  }>;
  jumpLinks: Array<{
    label: string;
    href: string;
  }>;
}

export interface DataScreenPersonnelViewInitData {
  filtersEcho: DataScreenPersonnelViewInitFilters;
  summary: {
    managedPeopleCount: number;
    activePeopleCount: number;
    overloadedPeopleCount: number;
    lowActivityPeopleCount: number;
    riskPeopleCount: number;
    pendingItemCount: number;
    overdueItemCount: number;
    highPriorityItemCount: number;
    activeProjectPeopleCount: number;
    activeSolutionPeopleCount: number;
  };
  loadDistribution: Array<{
    bucket: DataScreenPersonnelLoadBucket;
    label: string;
    count: number;
    description: string;
  }>;
  roleGroups: Array<{
    roleName: string;
    memberCount: number;
    pendingTotal: number;
    overdueTotal: number;
    avgRiskScore: number;
    overloadedCount: number;
    lowActivityCount: number;
  }>;
  regionGroups: Array<{
    region: string;
    memberCount: number;
    overloadedCount: number;
    riskCount: number;
  }>;
  itemStatusSummary: Array<{
    key: 'pending' | 'in_progress' | 'review_pending' | 'overdue';
    label: string;
    count: number;
    overdueCount: number;
  }>;
  itemAbnormalSummary: Array<{
    key: DataScreenPersonnelAbnormalFilter;
    label: string;
    count: number;
    description: string;
  }>;
  riskRanking: DataScreenPersonnelViewPersonItem[];
  peopleList: {
    items: DataScreenPersonnelViewPersonItem[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
  selectedPerson: {
    userId: number;
    name: string;
    roleName: string;
    department: string | null;
    position: string | null;
    region: string | null;
    currentTaskCount: number;
    overdueItemCount: number;
    highPriorityItemCount: number;
    lastActivityAt: string | null;
    activeProjectCount: number;
    activeSolutionCount: number;
    riskScore: number;
    loadBucket: DataScreenPersonnelLoadBucket;
    reasons: string[];
  } | null;
  itemList: {
    items: DataScreenPersonnelViewItemEntry[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
  selectedItem: DataScreenPersonnelViewItemDetail | null;
  timestamp: string;
}

const PERSONNEL_PRESETS: DataScreenRoleViewPreset[] = ['management', 'business-focus', 'presales-focus', 'personal-focus'];
const PERSONNEL_ABNORMAL_FILTERS: DataScreenPersonnelAbnormalFilter[] = ['all', 'overdue', 'high-priority-stalled', 'stale', 'cross-project-overload'];
const LOAD_BUCKET_LABELS = {
  reserve: '储备',
  balanced: '平衡',
  busy: '繁忙',
  overloaded: '过载',
} as const;
const LOAD_BUCKET_DESCRIPTIONS = {
  reserve: '当前待处理较少，可承接新增事项。',
  balanced: '负载平衡，推进节奏正常。',
  busy: '事项集中，需要持续关注节奏。',
  overloaded: '待处理或逾期明显偏高，应优先干预。',
} as const;
const ABNORMAL_FILTER_META: Record<DataScreenPersonnelAbnormalFilter, { label: string; description: string }> = {
  all: {
    label: '全部事项',
    description: '保留当前人员的完整事项池，作为异常筛选的基线。',
  },
  overdue: {
    label: '逾期',
    description: '已超过截止时间且仍未闭环的事项。',
  },
  'high-priority-stalled': {
    label: '高优未推进',
    description: '高优先级但推进缓慢或长时间无进展的事项。',
  },
  stale: {
    label: '长时间未更新',
    description: '最近 7 天没有有效推进痕迹的事项。',
  },
  'cross-project-overload': {
    label: '跨项目过载',
    description: '人员跨多个项目协同且负载已过载的事项。',
  },
};
const HIGH_PRIORITY_STALLED_DAYS = 3;
const STALE_ITEM_DAYS = 7;
const CROSS_PROJECT_OVERLOAD_THRESHOLD = 4;

type OpenSolutionReviewRow = {
  id: number;
  solutionId: number;
  reviewerId: number;
  reviewStatus: string;
  reviewComment: string | null;
  reviewedAt: Date | null;
  dueDate: Date | string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PersonnelItemRecord = DataScreenPersonnelViewItemDetail;

function isValidPreset(value: string | null): value is DataScreenRoleViewPreset {
  return value !== null && PERSONNEL_PRESETS.includes(value as DataScreenRoleViewPreset);
}

function isValidAbnormalFilter(value: string | null): value is DataScreenPersonnelAbnormalFilter {
  return value !== null && PERSONNEL_ABNORMAL_FILTERS.includes(value as DataScreenPersonnelAbnormalFilter);
}

function normalizeDateInput(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

function normalizePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function normalizeOptionalId(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeOptionalItemId(value: string | null) {
  return value && /^(task|todo|review|project)-\d+$/.test(value) ? value : null;
}

function parseDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatDateOnly(value: string | Date | null | undefined) {
  const parsed = parseDate(value);
  if (!parsed) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function formatDateTime(value: string | Date | null | undefined) {
  const parsed = parseDate(value);
  return parsed ? parsed.toISOString() : null;
}

function formatTimelineValue(value: string | Date | null | undefined) {
  const parsed = parseDate(value);
  if (!parsed) {
    return null;
  }

  return parsed.toISOString().slice(0, 16).replace('T', ' ');
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  return {
    items: items.slice(startIndex, startIndex + pageSize),
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages,
    },
  };
}

function isOpenTaskStatus(status: string | null | undefined) {
  return !['completed', 'cancelled'].includes(status || '');
}

function isOpenTodoStatus(status: string | null | undefined) {
  return ['pending', 'in_progress'].includes(status || '');
}

function isOpenReviewStatus(status: string | null | undefined) {
  return ['pending', 'revision_required'].includes(status || '');
}

function isOverdue(dueDate: string | Date | null | undefined, today: Date) {
  const parsed = parseDate(dueDate);
  if (!parsed) {
    return false;
  }

  return parsed.getTime() < today.getTime();
}

function isHighPriority(priority: string | null | undefined) {
  return ['urgent', 'high'].includes(priority || '');
}

function isOlderThan(value: string | Date | null | undefined, days: number, today: Date) {
  const parsed = parseDate(value);
  if (!parsed) {
    return false;
  }

  return today.getTime() - parsed.getTime() >= days * 24 * 60 * 60 * 1000;
}

function isHighPriorityStalledItem(
  priority: string | null,
  status: string,
  progress: number | null,
  lastUpdatedAt: string | null,
  today: Date,
) {
  if (!isHighPriority(priority) || !isOlderThan(lastUpdatedAt, HIGH_PRIORITY_STALLED_DAYS, today)) {
    return false;
  }

  if (status === 'pending' || status === 'revision_required') {
    return true;
  }

  if (typeof progress === 'number') {
    return progress <= 20;
  }

  return status === 'in_progress';
}

function isStaleItem(lastUpdatedAt: string | null, today: Date) {
  return isOlderThan(lastUpdatedAt, STALE_ITEM_DAYS, today);
}

function resolveRangeType(startDate: string, endDate: string) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) {
    return '30d' as const;
  }

  const diffDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  if (diffDays <= 1) {
    return 'today' as const;
  }
  if (diffDays <= 7) {
    return '7d' as const;
  }
  return '30d' as const;
}

async function loadOpenSolutionReviewRows(scope: TeamExecutionScope) {
  const solutionIds = scope.solutionRows.map((solution) => solution.id);

  if (!solutionIds.length) {
    return [] as OpenSolutionReviewRow[];
  }

  const rows = await db
    .select({
      id: solutionReviews.id,
      solutionId: solutionReviews.solutionId,
      reviewerId: solutionReviews.reviewerId,
      reviewStatus: solutionReviews.reviewStatus,
      reviewComment: solutionReviews.reviewComment,
      reviewedAt: solutionReviews.reviewedAt,
      dueDate: solutionReviews.dueDate,
      createdAt: solutionReviews.createdAt,
      updatedAt: solutionReviews.updatedAt,
    })
    .from(solutionReviews)
    .where(and(inArray(solutionReviews.solutionId, solutionIds), isNull(solutionReviews.deletedAt)));

  return rows.filter((row) => isOpenReviewStatus(row.reviewStatus));
}

function buildSolutionCountByUser(scope: TeamExecutionScope) {
  const map = new Map<number, Set<number>>();

  scope.solutionRows.forEach((solution) => {
    [solution.authorId, solution.ownerId, solution.reviewerId].forEach((userId) => {
      if (!userId) {
        return;
      }

      const current = map.get(userId) || new Set<number>();
      current.add(solution.id);
      map.set(userId, current);
    });
  });

  return map;
}

function buildRoleGroups(peopleItems: DataScreenPersonnelViewPersonItem[]) {
  return Array.from(
    peopleItems.reduce((groupMap, person) => {
      const current = groupMap.get(person.roleName) || {
        roleName: person.roleName,
        memberCount: 0,
        pendingTotal: 0,
        overdueTotal: 0,
        totalRiskScore: 0,
        overloadedCount: 0,
        lowActivityCount: 0,
      };

      current.memberCount += 1;
      current.pendingTotal += person.pendingCount;
      current.overdueTotal += person.overdueCount;
      current.totalRiskScore += person.riskScore;
      if (person.loadBucket === 'overloaded') {
        current.overloadedCount += 1;
      }
      if (person.lowActivity) {
        current.lowActivityCount += 1;
      }

      groupMap.set(person.roleName, current);
      return groupMap;
    }, new Map<string, {
      roleName: string;
      memberCount: number;
      pendingTotal: number;
      overdueTotal: number;
      totalRiskScore: number;
      overloadedCount: number;
      lowActivityCount: number;
    }>())
  )
    .map(([, group]) => ({
      roleName: group.roleName,
      memberCount: group.memberCount,
      pendingTotal: group.pendingTotal,
      overdueTotal: group.overdueTotal,
      avgRiskScore: group.memberCount ? Math.round(group.totalRiskScore / group.memberCount) : 0,
      overloadedCount: group.overloadedCount,
      lowActivityCount: group.lowActivityCount,
    }))
    .sort((left, right) => right.avgRiskScore - left.avgRiskScore || right.pendingTotal - left.pendingTotal)
    .slice(0, 8);
}

function buildRegionGroups(peopleItems: DataScreenPersonnelViewPersonItem[]) {
  return Array.from(
    peopleItems.reduce((groupMap, person) => {
      const region = person.region || '未设置区域';
      const current = groupMap.get(region) || {
        region,
        memberCount: 0,
        overloadedCount: 0,
        riskCount: 0,
      };

      current.memberCount += 1;
      if (person.loadBucket === 'overloaded') {
        current.overloadedCount += 1;
      }
      if (person.riskScore >= 45 || person.overdueCount > 0) {
        current.riskCount += 1;
      }

      groupMap.set(region, current);
      return groupMap;
    }, new Map<string, {
      region: string;
      memberCount: number;
      overloadedCount: number;
      riskCount: number;
    }>())
  )
    .map(([, group]) => group)
    .sort((left, right) => right.memberCount - left.memberCount || right.riskCount - left.riskCount)
    .slice(0, 8);
}

function buildCollaborationContext(values: Array<{ label: string; value: string | null | undefined }>) {
  return values.filter((item) => item.value).map((item) => ({
    label: item.label,
    value: item.value as string,
  }));
}

function buildJumpLinks(options: {
  itemType: DataScreenPersonnelItemType;
  projectId?: number | null;
  customerId?: number | null;
  solutionId?: number | null;
  todoRelatedType?: string | null;
  todoRelatedId?: number | null;
}) {
  const links: Array<{ label: string; href: string }> = [];
  const pushLink = (label: string, href: string) => {
    if (!links.some((item) => item.href === href)) {
      links.push({ label, href });
    }
  };

  if (options.itemType === 'task') {
    pushLink('打开任务中心', '/tasks?scope=mine');
  }
  if (options.itemType === 'todo') {
    pushLink('打开工作台', '/workbench');
  }
  if (options.projectId) {
    pushLink('查看项目', `/projects/${options.projectId}`);
  }
  if (options.customerId) {
    pushLink('查看客户', `/customers/${options.customerId}`);
  }
  if (options.solutionId) {
    pushLink('查看方案', `/solutions/${options.solutionId}`);
  }
  if (options.todoRelatedType === 'project' && options.todoRelatedId) {
    pushLink('查看关联项目', `/projects/${options.todoRelatedId}`);
  }
  if (options.todoRelatedType === 'customer' && options.todoRelatedId) {
    pushLink('查看关联客户', `/customers/${options.todoRelatedId}`);
  }
  if (options.todoRelatedType === 'solution' && options.todoRelatedId) {
    pushLink('查看关联方案', `/solutions/${options.todoRelatedId}`);
  }

  return links;
}

function buildTimeline(entries: Array<{ label: string; value: string | null; tone: 'neutral' | 'warning' | 'danger' }>) {
  return entries.filter((entry) => entry.value);
}

function deriveBlockerReason(item: {
  type: DataScreenPersonnelItemType;
  status: string;
  isOverdue: boolean;
  abnormalFlags: DataScreenPersonnelItemAbnormalFlag[];
  progress: number | null;
  fallbackReason?: string | null;
}) {
  if (item.fallbackReason) {
    return item.fallbackReason;
  }
  if (item.isOverdue) {
    return '事项已超过截止时间但仍未完成，需要立即干预推进。';
  }
  if (item.abnormalFlags.includes('high-priority-stalled')) {
    return '高优先级事项推进不足，当前进度与更新时间不匹配。';
  }
  if (item.abnormalFlags.includes('stale')) {
    return '事项长时间未更新，可能存在推进中断或信息滞后。';
  }
  if (item.abnormalFlags.includes('cross-project-overload')) {
    return '当前人员处于跨项目过载状态，这个事项需要重新评估排期与支撑顺序。';
  }
  if (item.type === 'task' && typeof item.progress === 'number' && item.progress < 30 && item.status === 'in_progress') {
    return '任务已启动但进度偏低，需要确认当前阻塞点。';
  }
  if (item.type === 'solution-review' && item.status === 'revision_required') {
    return '方案评审要求修订，需尽快补齐评审意见中的缺口。';
  }
  return null;
}

function buildItemAbnormalFlags(
  item: Pick<DataScreenPersonnelViewItemEntry, 'priority' | 'status' | 'progress' | 'lastUpdatedAt' | 'isOverdue'>,
  person: Pick<DataScreenPersonnelViewPersonItem, 'activeProjectCount' | 'loadBucket'>,
  today: Date,
) {
  const flags: DataScreenPersonnelItemAbnormalFlag[] = [];

  if (item.isOverdue) {
    flags.push('overdue');
  }
  if (isHighPriorityStalledItem(item.priority, item.status, item.progress, item.lastUpdatedAt, today)) {
    flags.push('high-priority-stalled');
  }
  if (isStaleItem(item.lastUpdatedAt, today)) {
    flags.push('stale');
  }
  if (person.loadBucket === 'overloaded' && person.activeProjectCount >= CROSS_PROJECT_OVERLOAD_THRESHOLD) {
    flags.push('cross-project-overload');
  }

  return flags;
}

function toItemEntry(record: PersonnelItemRecord): DataScreenPersonnelViewItemEntry {
  return {
    id: record.id,
    sourceId: record.sourceId,
    type: record.type,
    title: record.title,
    customerName: record.customerName,
    projectName: record.projectName,
    solutionName: record.solutionName,
    priority: record.priority,
    dueDate: record.dueDate,
    status: record.status,
    progress: record.progress,
    isOverdue: record.isOverdue,
    lastUpdatedAt: record.lastUpdatedAt,
    abnormalFlags: record.abnormalFlags,
  };
}

function buildItemAbnormalSummary(items: PersonnelItemRecord[]) {
  return PERSONNEL_ABNORMAL_FILTERS.map((key) => ({
    key,
    label: ABNORMAL_FILTER_META[key].label,
    description: ABNORMAL_FILTER_META[key].description,
    count: key === 'all' ? items.length : items.filter((item) => item.abnormalFlags.includes(key)).length,
  }));
}

function applyAbnormalFilter(items: PersonnelItemRecord[], abnormalFilter: DataScreenPersonnelAbnormalFilter) {
  if (abnormalFilter === 'all') {
    return items;
  }

  return items.filter((item) => item.abnormalFlags.includes(abnormalFilter));
}

function buildSelectedPersonItems(
  scope: TeamExecutionScope,
  selectedPerson: DataScreenPersonnelViewPersonItem,
  openReviewRows: OpenSolutionReviewRow[],
  today: Date,
) {
  const selectedPersonId = selectedPerson.userId;
  const projectMap = new Map(scope.projectRows.map((project) => [project.id, project]));
  const solutionMap = new Map(scope.solutionRows.map((solution) => [solution.id, solution]));
  const projectIdsBySolution = new Map<number, number[]>();

  scope.solutionRows.forEach((solution) => {
    const projectIds = projectIdsBySolution.get(solution.id) || [];
    if (solution.projectId) {
      projectIds.push(solution.projectId);
    }
    projectIdsBySolution.set(solution.id, projectIds);
  });

  scope.solutionProjectRows.forEach((entry) => {
    const projectIds = projectIdsBySolution.get(entry.solutionId) || [];
    if (!projectIds.includes(entry.projectId)) {
      projectIds.push(entry.projectId);
    }
    projectIdsBySolution.set(entry.solutionId, projectIds);
  });

  const taskItems: PersonnelItemRecord[] = scope.taskRows
    .filter((task) => task.assigneeId === selectedPersonId && isOpenTaskStatus(task.status))
    .map((task) => {
      const project = task.projectId ? projectMap.get(task.projectId) : null;
      const baseItem: DataScreenPersonnelViewItemEntry = {
        id: `task-${task.id}`,
        sourceId: task.id,
        type: 'task',
        title: task.taskName,
        customerName: project?.customerName || null,
        projectName: project?.projectName || null,
        solutionName: null,
        priority: task.priority,
        dueDate: formatDateOnly(task.dueDate),
        status: task.status || 'pending',
        progress: null,
        isOverdue: isOverdue(task.dueDate, today),
        lastUpdatedAt: formatDateTime(task.updatedAt),
        abnormalFlags: [],
      };
      const abnormalFlags = buildItemAbnormalFlags(baseItem, selectedPerson, today);
      const blockerReason = deriveBlockerReason({
        type: 'task',
        status: baseItem.status,
        isOverdue: baseItem.isOverdue,
        abnormalFlags,
        progress: baseItem.progress,
      });

      return {
        ...baseItem,
        abnormalFlags,
        description: project?.projectName ? `当前任务挂靠在项目《${project.projectName}》下，需结合项目主线协同推进。` : '当前任务缺少补充说明，需回到任务中心确认详细内容。',
        blockerReason,
        collaborationContext: buildCollaborationContext([
          { label: '客户', value: project?.customerName || null },
          { label: '项目', value: project?.projectName || null },
        ]),
        timeline: buildTimeline([
          { label: '最近更新', value: formatTimelineValue(task.updatedAt), tone: abnormalFlags.includes('stale') ? 'warning' : 'neutral' },
          { label: '截止时间', value: formatTimelineValue(task.dueDate), tone: baseItem.isOverdue ? 'danger' : 'warning' },
        ]),
        jumpLinks: buildJumpLinks({
          itemType: 'task',
          projectId: project?.id,
          customerId: project?.customerId,
        }),
      };
    });

  const todoItems: PersonnelItemRecord[] = scope.todoRows
    .filter((todo) => todo.assigneeId === selectedPersonId && isOpenTodoStatus(todo.todoStatus))
    .map((todo) => {
      const project = todo.relatedType === 'project' && todo.relatedId ? projectMap.get(todo.relatedId) : null;
      const baseItem: DataScreenPersonnelViewItemEntry = {
        id: `todo-${todo.id}`,
        sourceId: todo.id,
        type: 'todo',
        title: todo.title,
        customerName: project?.customerName || null,
        projectName: project?.projectName || (todo.relatedType === 'project' ? todo.relatedName || null : null),
        solutionName: todo.relatedType === 'solution' ? todo.relatedName || null : null,
        priority: todo.priority,
        dueDate: formatDateOnly(todo.dueDate),
        status: todo.todoStatus || 'pending',
        progress: null,
        isOverdue: isOverdue(todo.dueDate, today),
        lastUpdatedAt: formatDateTime(todo.updatedAt),
        abnormalFlags: [],
      };
      const abnormalFlags = buildItemAbnormalFlags(baseItem, selectedPerson, today);
      const blockerReason = deriveBlockerReason({
        type: 'todo',
        status: baseItem.status,
        isOverdue: baseItem.isOverdue,
        abnormalFlags,
        progress: null,
        fallbackReason: todo.relatedName ? `当前待办关联对象：${todo.relatedName}，建议回到业务页面确认最新要求。` : null,
      });

      return {
        ...baseItem,
        abnormalFlags,
        description: todo.relatedName ? `待办关联对象：${todo.relatedName}` : '当前待办缺少补充说明，建议回到工作台查看完整上下文。',
        blockerReason,
        collaborationContext: buildCollaborationContext([
          { label: '关联类型', value: todo.relatedType || null },
          { label: '关联对象', value: todo.relatedName || null },
          { label: '客户', value: project?.customerName || null },
        ]),
        timeline: buildTimeline([
          { label: '最近更新', value: formatTimelineValue(todo.updatedAt), tone: abnormalFlags.includes('stale') ? 'warning' : 'neutral' },
          { label: '截止时间', value: formatTimelineValue(todo.dueDate), tone: baseItem.isOverdue ? 'danger' : 'warning' },
        ]),
        jumpLinks: buildJumpLinks({
          itemType: 'todo',
          projectId: project?.id,
          customerId: project?.customerId,
          todoRelatedType: todo.relatedType,
          todoRelatedId: todo.relatedId,
        }),
      };
    });

  const reviewItems: PersonnelItemRecord[] = openReviewRows
    .filter((review) => review.reviewerId === selectedPersonId)
    .map((review) => {
      const solution = solutionMap.get(review.solutionId);
      const projectId = projectIdsBySolution.get(review.solutionId)?.[0];
      const project = projectId ? projectMap.get(projectId) : null;
      const baseItem: DataScreenPersonnelViewItemEntry = {
        id: `review-${review.id}`,
        sourceId: review.id,
        type: 'solution-review',
        title: `方案评审：${solution?.solutionName || '未命名方案'}`,
        customerName: project?.customerName || null,
        projectName: project?.projectName || null,
        solutionName: solution?.solutionName || null,
        priority: 'high',
        dueDate: formatDateOnly(review.dueDate),
        status: review.reviewStatus,
        progress: null,
        isOverdue: isOverdue(review.dueDate, today),
        lastUpdatedAt: formatDateTime(review.updatedAt),
        abnormalFlags: [],
      };
      const abnormalFlags = buildItemAbnormalFlags(baseItem, selectedPerson, today);
      const blockerReason = deriveBlockerReason({
        type: 'solution-review',
        status: baseItem.status,
        isOverdue: baseItem.isOverdue,
        abnormalFlags,
        progress: null,
        fallbackReason: review.reviewStatus === 'revision_required' ? '方案评审要求修订，需要尽快按意见补充材料。' : null,
      });

      return {
        ...baseItem,
        abnormalFlags,
        description: review.reviewComment || null,
        blockerReason,
        collaborationContext: buildCollaborationContext([
          { label: '客户', value: project?.customerName || null },
          { label: '项目', value: project?.projectName || null },
          { label: '方案', value: solution?.solutionName || null },
        ]),
        timeline: buildTimeline([
          { label: '创建时间', value: formatTimelineValue(review.createdAt), tone: 'neutral' },
          { label: '最近更新', value: formatTimelineValue(review.updatedAt), tone: abnormalFlags.includes('stale') ? 'warning' : 'neutral' },
          { label: '评审截止', value: formatTimelineValue(review.dueDate), tone: baseItem.isOverdue ? 'danger' : 'warning' },
          { label: '最近评审', value: formatTimelineValue(review.reviewedAt), tone: 'neutral' },
        ]),
        jumpLinks: buildJumpLinks({
          itemType: 'solution-review',
          projectId: project?.id,
          customerId: project?.customerId,
          solutionId: solution?.id,
        }),
      };
    });

  const collaborationProjectIds = new Set<number>();

  scope.projectRows.forEach((project) => {
    if (project.managerId === selectedPersonId || project.deliveryManagerId === selectedPersonId) {
      collaborationProjectIds.add(project.id);
      return;
    }

    if (scope.memberIdsByProject.get(project.id)?.has(selectedPersonId)) {
      collaborationProjectIds.add(project.id);
    }
  });

  const collaborationItems: PersonnelItemRecord[] = Array.from(collaborationProjectIds)
    .map((projectId) => projectMap.get(projectId))
    .filter((project): project is NonNullable<typeof project> => !!project)
    .filter((project) => !['completed', 'cancelled', 'archived'].includes(project.status || ''))
    .map((project) => {
      const baseItem: DataScreenPersonnelViewItemEntry = {
        id: `project-${project.id}`,
        sourceId: project.id,
        type: 'project-collaboration',
        title: `协同推进：${project.projectName}`,
        customerName: project.customerName,
        projectName: project.projectName,
        solutionName: null,
        priority: project.priority,
        dueDate: null,
        status: project.status || 'in_progress',
        progress: null,
        isOverdue: false,
        lastUpdatedAt: formatDateTime(project.updatedAt),
        abnormalFlags: [],
      };
      const abnormalFlags = buildItemAbnormalFlags(baseItem, selectedPerson, today);
      const blockerReason = deriveBlockerReason({
        type: 'project-collaboration',
        status: baseItem.status,
        isOverdue: baseItem.isOverdue,
        abnormalFlags,
        progress: baseItem.progress,
        fallbackReason: project.risks || null,
      });

      return {
        ...baseItem,
        abnormalFlags,
        description: project.risks || `当前事项来自项目《${project.projectName}》的协同推进，需结合项目阶段统一安排动作。`,
        blockerReason,
        collaborationContext: buildCollaborationContext([
          { label: '客户', value: project.customerName || null },
          { label: '项目阶段', value: project.projectStage || null },
          { label: '项目状态', value: project.status || null },
        ]),
        timeline: buildTimeline([
          { label: '最近更新', value: formatTimelineValue(project.updatedAt), tone: abnormalFlags.includes('stale') ? 'warning' : 'neutral' },
          { label: '项目阶段', value: project.projectStage || null, tone: 'neutral' },
          { label: '风险说明', value: project.risks || null, tone: project.risks ? 'warning' : 'neutral' },
        ]),
        jumpLinks: buildJumpLinks({
          itemType: 'project-collaboration',
          projectId: project.id,
          customerId: project.customerId,
        }),
      };
    });

  return [...taskItems, ...todoItems, ...reviewItems, ...collaborationItems].sort((left, right) => {
    if (left.isOverdue !== right.isOverdue) {
      return Number(right.isOverdue) - Number(left.isOverdue);
    }

    if (left.abnormalFlags.length !== right.abnormalFlags.length) {
      return right.abnormalFlags.length - left.abnormalFlags.length;
    }

    if ((left.priority === 'urgent' || left.priority === 'high') !== (right.priority === 'urgent' || right.priority === 'high')) {
      return Number(right.priority === 'urgent' || right.priority === 'high') - Number(left.priority === 'urgent' || left.priority === 'high');
    }

    const leftDue = left.dueDate || '9999-12-31';
    const rightDue = right.dueDate || '9999-12-31';
    if (leftDue !== rightDue) {
      return leftDue.localeCompare(rightDue);
    }

    return (right.lastUpdatedAt || '').localeCompare(left.lastUpdatedAt || '');
  });
}

export function parseDataScreenPersonnelViewInitFilters(searchParams: SearchParamReader): DataScreenPersonnelViewInitFilters {
  const defaultDateRange = getDefaultDataScreenDateRange();

  return {
    startDate: normalizeDateInput(searchParams.get('startDate')) || defaultDateRange.startDate,
    endDate: normalizeDateInput(searchParams.get('endDate')) || defaultDateRange.endDate,
    preset: isValidPreset(searchParams.get('preset')) ? (searchParams.get('preset') as DataScreenRoleViewPreset) : 'management',
    personId: normalizeOptionalId(searchParams.get('personId')),
    abnormalFilter: isValidAbnormalFilter(searchParams.get('abnormalFilter')) ? (searchParams.get('abnormalFilter') as DataScreenPersonnelAbnormalFilter) : 'all',
    selectedItemId: normalizeOptionalItemId(searchParams.get('selectedItemId')),
    peoplePage: normalizePositiveInt(searchParams.get('peoplePage'), 1, 999),
    peoplePageSize: normalizePositiveInt(searchParams.get('peoplePageSize'), 8, 24),
    itemPage: normalizePositiveInt(searchParams.get('itemPage'), 1, 999),
    itemPageSize: normalizePositiveInt(searchParams.get('itemPageSize'), 8, 30),
  };
}

export function buildEmptyDataScreenPersonnelViewInitData(filters: DataScreenPersonnelViewInitFilters): DataScreenPersonnelViewInitData {
  const timestamp = new Date().toISOString();
  return {
    filtersEcho: filters,
    summary: {
      managedPeopleCount: 0,
      activePeopleCount: 0,
      overloadedPeopleCount: 0,
      lowActivityPeopleCount: 0,
      riskPeopleCount: 0,
      pendingItemCount: 0,
      overdueItemCount: 0,
      highPriorityItemCount: 0,
      activeProjectPeopleCount: 0,
      activeSolutionPeopleCount: 0,
    },
    loadDistribution: (Object.keys(LOAD_BUCKET_LABELS) as Array<keyof typeof LOAD_BUCKET_LABELS>).map((bucket) => ({
      bucket,
      label: LOAD_BUCKET_LABELS[bucket],
      count: 0,
      description: LOAD_BUCKET_DESCRIPTIONS[bucket],
    })),
    roleGroups: [],
    regionGroups: [],
    itemStatusSummary: [
      { key: 'pending', label: '待处理', count: 0, overdueCount: 0 },
      { key: 'in_progress', label: '处理中', count: 0, overdueCount: 0 },
      { key: 'review_pending', label: '待评审', count: 0, overdueCount: 0 },
      { key: 'overdue', label: '逾期事项', count: 0, overdueCount: 0 },
    ],
    itemAbnormalSummary: buildItemAbnormalSummary([]),
    riskRanking: [],
    peopleList: {
      items: [],
      pagination: {
        page: filters.peoplePage,
        pageSize: filters.peoplePageSize,
        total: 0,
        totalPages: 1,
      },
    },
    selectedPerson: null,
    itemList: {
      items: [],
      pagination: {
        page: filters.itemPage,
        pageSize: filters.itemPageSize,
        total: 0,
        totalPages: 1,
      },
    },
    selectedItem: null,
    timestamp,
  };
}

export async function getDataScreenPersonnelViewInitData(
  userId: number,
  filters: DataScreenPersonnelViewInitFilters,
): Promise<DataScreenPersonnelViewInitData> {
  const scope = await loadTeamExecutionScope(userId);
  if (!scope.projectRows.length) {
    return buildEmptyDataScreenPersonnelViewInitData(filters);
  }

  const today = parseDate(filters.endDate) || new Date();
  today.setHours(0, 0, 0, 0);
  const timeRange = resolveRangeType(filters.startDate, filters.endDate);
  const peopleStats = buildUserExecutionStats(scope, { view: 'role', range: timeRange, focus: 'all', q: '' }, today);
  const solutionCountByUser = buildSolutionCountByUser(scope);
  const openReviewRows = await loadOpenSolutionReviewRows(scope);
  const openTaskRows = scope.taskRows.filter((task) => isOpenTaskStatus(task.status));
  const openTodoRows = scope.todoRows.filter((todo) => isOpenTodoStatus(todo.todoStatus));

  const peopleItems: DataScreenPersonnelViewPersonItem[] = peopleStats
    .map((person) => ({
      userId: person.userId,
      name: person.name,
      roleName: person.roleName,
      department: person.department,
      position: person.position,
      region: person.region,
      pendingCount: person.pendingCount,
      overdueCount: person.overdueCount,
      highPriorityCount: person.highPriorityCount,
      activeProjectCount: person.activeProjectCount,
      activeSolutionCount: solutionCountByUser.get(person.userId)?.size || 0,
      riskScore: person.riskScore,
      loadBucket: person.loadBucket,
      lowActivity: person.lowActivity,
      lastActivityAt: formatDateTime(person.lastActivityAt),
      reasons: person.reasons,
    }))
    .sort((left, right) => right.riskScore - left.riskScore || right.pendingCount - left.pendingCount || right.activeProjectCount - left.activeProjectCount);

  const riskRanking = peopleItems.filter((person) => person.riskScore >= 18 || person.overdueCount > 0 || person.lowActivity).slice(0, 8);
  const roleGroups = buildRoleGroups(peopleItems);
  const regionGroups = buildRegionGroups(peopleItems);

  const itemStatusSummary = [
    {
      key: 'pending' as const,
      label: '待处理',
      count: openTaskRows.filter((task) => task.status === 'pending').length + openTodoRows.filter((todo) => todo.todoStatus === 'pending').length,
      overdueCount: openTaskRows.filter((task) => task.status === 'pending' && isOverdue(task.dueDate, today)).length + openTodoRows.filter((todo) => todo.todoStatus === 'pending' && isOverdue(todo.dueDate, today)).length,
    },
    {
      key: 'in_progress' as const,
      label: '处理中',
      count: openTaskRows.filter((task) => task.status === 'in_progress').length + openTodoRows.filter((todo) => todo.todoStatus === 'in_progress').length,
      overdueCount: openTaskRows.filter((task) => task.status === 'in_progress' && isOverdue(task.dueDate, today)).length + openTodoRows.filter((todo) => todo.todoStatus === 'in_progress' && isOverdue(todo.dueDate, today)).length,
    },
    {
      key: 'review_pending' as const,
      label: '待评审',
      count: openReviewRows.length,
      overdueCount: openReviewRows.filter((row) => isOverdue(row.dueDate, today)).length,
    },
    {
      key: 'overdue' as const,
      label: '逾期事项',
      count: openTaskRows.filter((task) => isOverdue(task.dueDate, today)).length + openTodoRows.filter((todo) => isOverdue(todo.dueDate, today)).length + openReviewRows.filter((row) => isOverdue(row.dueDate, today)).length,
      overdueCount: openTaskRows.filter((task) => isOverdue(task.dueDate, today)).length + openTodoRows.filter((todo) => isOverdue(todo.dueDate, today)).length + openReviewRows.filter((row) => isOverdue(row.dueDate, today)).length,
    },
  ];

  const selectedPersonId = (filters.personId && peopleItems.some((person) => person.userId === filters.personId))
    ? filters.personId
    : peopleItems[0]?.userId || null;
  const selectedPersonBase = selectedPersonId ? peopleItems.find((person) => person.userId === selectedPersonId) || null : null;
  const selectedPersonItems = selectedPersonBase ? buildSelectedPersonItems(scope, selectedPersonBase, openReviewRows, today) : [];
  const filteredPersonItems = applyAbnormalFilter(selectedPersonItems, filters.abnormalFilter);
  const actionableSelectedItems = selectedPersonItems.filter((item) => item.type !== 'project-collaboration');
  const selectedItem = filters.selectedItemId
    ? filteredPersonItems.find((item) => item.id === filters.selectedItemId) || filteredPersonItems[0] || null
    : filteredPersonItems[0] || null;

  return {
    filtersEcho: filters,
    summary: {
      managedPeopleCount: peopleItems.length,
      activePeopleCount: peopleItems.filter((person) => !person.lowActivity).length,
      overloadedPeopleCount: peopleItems.filter((person) => person.loadBucket === 'overloaded').length,
      lowActivityPeopleCount: peopleItems.filter((person) => person.lowActivity).length,
      riskPeopleCount: peopleItems.filter((person) => person.riskScore >= 45 || person.overdueCount > 0).length,
      pendingItemCount: openTaskRows.length + openTodoRows.length + openReviewRows.length,
      overdueItemCount: openTaskRows.filter((task) => isOverdue(task.dueDate, today)).length + openTodoRows.filter((todo) => isOverdue(todo.dueDate, today)).length + openReviewRows.filter((row) => isOverdue(row.dueDate, today)).length,
      highPriorityItemCount: openTaskRows.filter((task) => isHighPriority(task.priority)).length + openTodoRows.filter((todo) => isHighPriority(todo.priority)).length + openReviewRows.length,
      activeProjectPeopleCount: peopleItems.filter((person) => person.activeProjectCount > 0).length,
      activeSolutionPeopleCount: Array.from(solutionCountByUser.keys()).length,
    },
    loadDistribution: (Object.keys(LOAD_BUCKET_LABELS) as Array<keyof typeof LOAD_BUCKET_LABELS>).map((bucket) => ({
      bucket,
      label: LOAD_BUCKET_LABELS[bucket],
      count: peopleItems.filter((person) => person.loadBucket === bucket).length,
      description: LOAD_BUCKET_DESCRIPTIONS[bucket],
    })),
    roleGroups,
    regionGroups,
    itemStatusSummary,
    itemAbnormalSummary: buildItemAbnormalSummary(selectedPersonItems),
    riskRanking,
    peopleList: paginate(peopleItems, filters.peoplePage, filters.peoplePageSize),
    selectedPerson: selectedPersonBase ? {
      userId: selectedPersonBase.userId,
      name: selectedPersonBase.name,
      roleName: selectedPersonBase.roleName,
      department: selectedPersonBase.department,
      position: selectedPersonBase.position,
      region: selectedPersonBase.region,
      currentTaskCount: actionableSelectedItems.length,
      overdueItemCount: actionableSelectedItems.filter((item) => item.isOverdue).length,
      highPriorityItemCount: actionableSelectedItems.filter((item) => item.priority === 'urgent' || item.priority === 'high').length,
      lastActivityAt: selectedPersonBase.lastActivityAt,
      activeProjectCount: selectedPersonBase.activeProjectCount,
      activeSolutionCount: selectedPersonBase.activeSolutionCount,
      riskScore: selectedPersonBase.riskScore,
      loadBucket: selectedPersonBase.loadBucket,
      reasons: selectedPersonBase.reasons,
    } : null,
    itemList: paginate(filteredPersonItems.map(toItemEntry), filters.itemPage, filters.itemPageSize),
    selectedItem,
    timestamp: new Date().toISOString(),
  };
}