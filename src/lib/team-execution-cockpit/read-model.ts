import { db } from '@/db';
import { customerTypes, customers, projectMembers, projects, roles, solutionProjects, solutionReviews, solutionTypes, solutions, tasks, todos, users } from '@/db/schema';
import { getAccessibleProjectIds, isSystemAdmin } from '@/lib/permissions/project';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import type { TeamExecutionFilters, TeamExecutionTimeRange } from '@/lib/team-execution-cockpit/filters';

export interface TeamExecutionSummaryReadModel {
  filtersEcho: TeamExecutionFilters;
  window: {
    range: TeamExecutionTimeRange;
    startDate: string;
    endDate: string;
    label: string;
    activityThresholdDays: number;
  };
  summary: {
    pendingTotal: number;
    dueTodayTasks: number;
    overdueTasks: number;
    highPriorityTasks: number;
    activeProjects: number;
    keyProjectPeople: number;
    overloadedPeople: number;
    lowActivityPeople: number;
  };
}

export interface TeamExecutionRiskReadModel {
  filtersEcho: TeamExecutionFilters;
  window: {
    range: TeamExecutionTimeRange;
    startDate: string;
    endDate: string;
    label: string;
    activityThresholdDays: number;
  };
  overview: {
    highRiskPeople: number;
    highRiskProjects: number;
    overdueItems: number;
    blockedItems: number;
  };
  people: Array<{
    userId: number;
    name: string;
    department: string | null;
    position: string | null;
    pendingCount: number;
    overdueCount: number;
    highPriorityCount: number;
    keyProjectCount: number;
    riskScore: number;
    lastActivityAt: string | null;
    reasons: string[];
  }>;
  projects: Array<{
    projectId: number;
    projectName: string;
    customerName: string | null;
    stage: string | null;
    status: string | null;
    priority: string | null;
    openTaskCount: number;
    overdueTaskCount: number;
    blockedTodoCount: number;
    staleDays: number;
    riskScore: number;
    reasons: string[];
  }>;
  blockedList: Array<{
    type: 'task' | 'todo';
    id: number;
    title: string;
    ownerName: string | null;
    projectName: string | null;
    dueDate: string | null;
    priority: string | null;
    status: string | null;
    overdueDays: number;
  }>;
}

export interface TeamExecutionRoleReadModel {
  filtersEcho: TeamExecutionFilters;
  window: {
    range: TeamExecutionTimeRange;
    startDate: string;
    endDate: string;
    label: string;
    activityThresholdDays: number;
  };
  overview: {
    totalPeople: number;
    overloadedPeople: number;
    lowActivityPeople: number;
    overduePeople: number;
  };
  loadDistribution: Array<{
    bucket: 'reserve' | 'balanced' | 'busy' | 'overloaded';
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
  riskRanking: Array<{
    userId: number;
    name: string;
    roleName: string;
    department: string | null;
    region: string | null;
    pendingCount: number;
    overdueCount: number;
    highPriorityCount: number;
    keyProjectCount: number;
    activeProjectCount: number;
    riskScore: number;
    loadBucket: 'reserve' | 'balanced' | 'busy' | 'overloaded';
    lastActivityAt: string | null;
    reasons: string[];
  }>;
  details: Array<{
    userId: number;
    name: string;
    roleName: string;
    department: string | null;
    position: string | null;
    region: string | null;
    pendingCount: number;
    overdueCount: number;
    highPriorityCount: number;
    keyProjectCount: number;
    activeProjectCount: number;
    riskScore: number;
    loadBucket: 'reserve' | 'balanced' | 'busy' | 'overloaded';
    lastActivityAt: string | null;
    lowActivity: boolean;
    reasons: string[];
  }>;
}

export interface TeamExecutionProjectReadModel {
  filtersEcho: TeamExecutionFilters;
  window: {
    range: TeamExecutionTimeRange;
    startDate: string;
    endDate: string;
    label: string;
    activityThresholdDays: number;
  };
  overview: {
    totalProjects: number;
    highRiskProjects: number;
    stalledProjects: number;
    staffingTightProjects: number;
  };
  stageDistribution: Array<{
    stage: string;
    label: string;
    count: number;
    highRiskCount: number;
    overdueTaskTotal: number;
  }>;
  staffingOverview: Array<{
    projectId: number;
    projectName: string;
    customerName: string | null;
    memberCount: number;
    activePeopleCount: number;
    overloadedPeopleCount: number;
    openTaskCount: number;
    blockedTodoCount: number;
  }>;
  riskHeat: Array<{
    projectId: number;
    projectName: string;
    customerName: string | null;
    stage: string | null;
    status: string | null;
    priority: string | null;
    openTaskCount: number;
    overdueTaskCount: number;
    blockedTodoCount: number;
    highPriorityTaskCount: number;
    activePeopleCount: number;
    overloadedPeopleCount: number;
    staleDays: number;
    riskScore: number;
    lastProgressAt: string | null;
    reasons: string[];
  }>;
  details: Array<{
    projectId: number;
    projectName: string;
    customerName: string | null;
    stage: string | null;
    status: string | null;
    priority: string | null;
    memberCount: number;
    activePeopleCount: number;
    overloadedPeopleCount: number;
    openTaskCount: number;
    overdueTaskCount: number;
    blockedTodoCount: number;
    highPriorityTaskCount: number;
    staleDays: number;
    riskScore: number;
    keyProject: boolean;
    lastProgressAt: string | null;
    reasons: string[];
  }>;
}

export interface TeamExecutionCustomerReadModel {
  filtersEcho: TeamExecutionFilters;
  window: {
    range: TeamExecutionTimeRange;
    startDate: string;
    endDate: string;
    label: string;
    activityThresholdDays: number;
  };
  overview: {
    totalCustomers: number;
    lowInteractionCustomers: number;
    highBacklogCustomers: number;
    highRiskCustomers: number;
  };
  activityDistribution: Array<{
    bucket: 'active' | 'watch' | 'cooling' | 'silent';
    label: string;
    count: number;
    description: string;
  }>;
  scaleRanking: Array<{
    customerId: number;
    customerName: string;
    customerTypeName: string | null;
    region: string | null;
    currentProjectCount: number;
    activeProjectCount: number;
    openItemCount: number;
    overdueItemCount: number;
    keyProjectCount: number;
    riskScore: number;
    interactionStatus: 'active' | 'watch' | 'cooling' | 'silent';
    lastInteractionTime: string | null;
    reasons: string[];
  }>;
  details: Array<{
    customerId: number;
    customerName: string;
    customerTypeName: string | null;
    region: string | null;
    contactName: string | null;
    currentProjectCount: number;
    activeProjectCount: number;
    openItemCount: number;
    overdueItemCount: number;
    keyProjectCount: number;
    riskScore: number;
    interactionStatus: 'active' | 'watch' | 'cooling' | 'silent';
    lastInteractionTime: string | null;
    reasons: string[];
  }>;
}

export interface TeamExecutionSolutionReadModel {
  filtersEcho: TeamExecutionFilters;
  window: {
    range: TeamExecutionTimeRange;
    startDate: string;
    endDate: string;
    label: string;
    activityThresholdDays: number;
  };
  overview: {
    totalSolutions: number;
    reviewingSolutions: number;
    overdueReviews: number;
    staleSolutions: number;
  };
  statusDistribution: Array<{
    status: string;
    label: string;
    count: number;
    pendingReviewCount: number;
  }>;
  pressureRanking: Array<{
    solutionId: number;
    solutionName: string;
    solutionTypeName: string | null;
    version: string;
    status: string | null;
    approvalStatus: string | null;
    relatedProjectCount: number;
    pendingReviewCount: number;
    overdueReviewCount: number;
    staleDays: number;
    riskScore: number;
    lastUpdatedAt: string | null;
    reasons: string[];
  }>;
  details: Array<{
    solutionId: number;
    solutionName: string;
    solutionTypeName: string | null;
    version: string;
    status: string | null;
    approvalStatus: string | null;
    ownerName: string | null;
    reviewerName: string | null;
    relatedProjectCount: number;
    pendingReviewCount: number;
    overdueReviewCount: number;
    staleDays: number;
    riskScore: number;
    lastUpdatedAt: string | null;
    reasons: string[];
  }>;
}

type ScopedProjectRow = {
  id: number;
  projectName: string;
  customerId: number | null;
  customerName: string | null;
  managerId: number | null;
  deliveryManagerId: number | null;
  priority: string | null;
  urgencyLevel: string | null;
  status: string | null;
  projectStage: string | null;
  risks: string | null;
  updatedAt: Date;
};

type ScopedTaskRow = {
  id: number;
  taskName: string;
  assigneeId: number | null;
  dueDate: string | Date | null;
  priority: string | null;
  status: string | null;
  updatedAt: Date;
  projectId: number | null;
};

type ScopedTodoRow = {
  id: number;
  title: string;
  assigneeId: number;
  dueDate: string | Date | null;
  priority: string | null;
  todoStatus: string | null;
  updatedAt: Date;
  relatedType: string | null;
  relatedId: number | null;
  relatedName: string | null;
};

type ScopedSolutionRow = {
  id: number;
  projectId: number | null;
  solutionName: string;
  solutionTypeName: string | null;
  version: string;
  ownerId: number | null;
  authorId: number;
  reviewerId: number | null;
  status: string | null;
  approvalStatus: string | null;
  updatedAt: Date;
};

type ScopedUserRow = {
  id: number;
  realName: string;
  department: string | null;
  position: string | null;
  roleName: string | null;
  region: string | null;
};

type UserExecutionStat = {
  userId: number;
  name: string;
  department: string | null;
  position: string | null;
  roleName: string;
  region: string | null;
  pendingCount: number;
  overdueCount: number;
  highPriorityCount: number;
  keyProjectCount: number;
  activeProjectCount: number;
  riskScore: number;
  lastActivityAt: Date | null;
  lowActivity: boolean;
  loadBucket: 'reserve' | 'balanced' | 'busy' | 'overloaded';
  reasons: string[];
};

type ProjectExecutionStat = {
  projectId: number;
  projectName: string;
  customerName: string | null;
  stage: string | null;
  status: string | null;
  priority: string | null;
  openTaskCount: number;
  overdueTaskCount: number;
  blockedTodoCount: number;
  highPriorityTaskCount: number;
  memberCount: number;
  activePeopleCount: number;
  overloadedPeopleCount: number;
  staleDays: number;
  riskScore: number;
  keyProject: boolean;
  lastProgressAt: Date | null;
  reasons: string[];
};

type CustomerExecutionStat = {
  customerId: number;
  customerName: string;
  customerTypeName: string | null;
  region: string | null;
  contactName: string | null;
  currentProjectCount: number;
  activeProjectCount: number;
  openItemCount: number;
  overdueItemCount: number;
  keyProjectCount: number;
  riskScore: number;
  interactionStatus: 'active' | 'watch' | 'cooling' | 'silent';
  lastInteractionTime: Date | null;
  reasons: string[];
};

type SolutionExecutionStat = {
  solutionId: number;
  solutionName: string;
  solutionTypeName: string | null;
  version: string;
  status: string | null;
  approvalStatus: string | null;
  ownerName: string | null;
  reviewerName: string | null;
  relatedProjectCount: number;
  pendingReviewCount: number;
  overdueReviewCount: number;
  staleDays: number;
  riskScore: number;
  lastUpdatedAt: Date | null;
  reasons: string[];
};

export type TeamExecutionScope = {
  projectRows: ScopedProjectRow[];
  projectMemberRows: Array<{ projectId: number; userId: number }>;
  taskRows: ScopedTaskRow[];
  todoRows: ScopedTodoRow[];
  solutionRows: ScopedSolutionRow[];
  solutionProjectRows: Array<{ solutionId: number; projectId: number }>;
  scopedUserIds: number[];
  memberIdsByProject: Map<number, Set<number>>;
  userMap: Map<number, ScopedUserRow>;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return null;
  }

  return value.toISOString();
}

function diffInDays(target: Date, base: Date) {
  return Math.round((target.getTime() - base.getTime()) / (24 * 60 * 60 * 1000));
}

function normalizeText(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function matchesKeyword(keyword: string, ...values: Array<string | null | undefined>) {
  if (!keyword) {
    return true;
  }

  return values.some((value) => normalizeText(value).includes(keyword));
}

function isOpenTaskStatus(status: string | null | undefined) {
  return !['completed', 'cancelled'].includes(status || '');
}

function isOpenTodoStatus(status: string | null | undefined) {
  return ['pending', 'in_progress'].includes(status || '');
}

function isHighPriority(priority: string | null | undefined) {
  return ['high', 'urgent'].includes(priority || '');
}

function isKeyProject(project: Pick<ScopedProjectRow, 'priority' | 'urgencyLevel'>) {
  return project.priority === 'high' || project.urgencyLevel === 'urgent';
}

function resolveActivityThresholdDays(range: TeamExecutionTimeRange) {
  if (range === 'today') {
    return 3;
  }

  if (range === '30d') {
    return 14;
  }

  return 7;
}

function resolveCustomerInteractionThresholds(range: TeamExecutionTimeRange) {
  if (range === 'today') {
    return { active: 3, watch: 7, cooling: 15 };
  }

  if (range === '30d') {
    return { active: 14, watch: 30, cooling: 45 };
  }

  return { active: 7, watch: 14, cooling: 30 };
}

function buildWindow(range: TeamExecutionTimeRange, startDate: string, endDate: string) {
  const labelMap: Record<TeamExecutionTimeRange, string> = {
    today: '今日',
    '7d': '近 7 天',
    '30d': '近 30 天',
  };

  return {
    range,
    startDate,
    endDate,
    label: labelMap[range],
    activityThresholdDays: resolveActivityThresholdDays(range),
  };
}

export async function loadTeamExecutionScope(userId: number): Promise<TeamExecutionScope> {
  const admin = await isSystemAdmin(userId);
  const accessibleProjectIds = admin ? [] : await getAccessibleProjectIds(userId);

  if (!admin && accessibleProjectIds.length === 0) {
    return {
      projectRows: [],
      projectMemberRows: [],
      taskRows: [],
      todoRows: [],
      solutionRows: [],
      solutionProjectRows: [],
      scopedUserIds: [],
      memberIdsByProject: new Map(),
      userMap: new Map(),
    };
  }

  const projectRows = await db
    .select({
      id: projects.id,
      projectName: projects.projectName,
      customerId: projects.customerId,
      customerName: projects.customerName,
      managerId: projects.managerId,
      deliveryManagerId: projects.deliveryManagerId,
      priority: projects.priority,
      urgencyLevel: projects.urgencyLevel,
      status: projects.status,
      projectStage: projects.projectStage,
      risks: projects.risks,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(
      admin
        ? isNull(projects.deletedAt)
        : and(isNull(projects.deletedAt), inArray(projects.id, accessibleProjectIds))
    );

  if (projectRows.length === 0) {
    return {
      projectRows: [],
      projectMemberRows: [],
      taskRows: [],
      todoRows: [],
      solutionRows: [],
      solutionProjectRows: [],
      scopedUserIds: [],
      memberIdsByProject: new Map(),
      userMap: new Map(),
    };
  }

  const scopedProjectIds = projectRows.map((project) => project.id);
  const projectMemberRows = await db
    .select({
      projectId: projectMembers.projectId,
      userId: projectMembers.userId,
    })
    .from(projectMembers)
    .where(inArray(projectMembers.projectId, scopedProjectIds));

  const taskRows = await db
    .select({
      id: tasks.id,
      taskName: tasks.taskName,
      assigneeId: tasks.assigneeId,
      dueDate: tasks.dueDate,
      priority: tasks.priority,
      status: tasks.status,
      updatedAt: tasks.updatedAt,
      projectId: tasks.projectId,
    })
    .from(tasks)
    .where(and(isNull(tasks.deletedAt), inArray(tasks.projectId, scopedProjectIds)));

  const directSolutionRows = await db
    .select({
      id: solutions.id,
      projectId: solutions.projectId,
      solutionName: solutions.solutionName,
      solutionTypeName: solutionTypes.name,
      version: solutions.version,
      ownerId: solutions.ownerId,
      authorId: solutions.authorId,
      reviewerId: solutions.reviewerId,
      status: solutions.status,
      approvalStatus: solutions.approvalStatus,
      updatedAt: solutions.updatedAt,
    })
    .from(solutions)
    .leftJoin(solutionTypes, eq(solutions.solutionTypeId, solutionTypes.id))
    .where(and(isNull(solutions.deletedAt), inArray(solutions.projectId, scopedProjectIds)));

  const solutionProjectRows = await db
    .select({
      solutionId: solutionProjects.solutionId,
      projectId: solutionProjects.projectId,
    })
    .from(solutionProjects)
    .where(and(isNull(solutionProjects.deletedAt), inArray(solutionProjects.projectId, scopedProjectIds)));

  const missingSolutionIds = Array.from(new Set(solutionProjectRows.map((item) => item.solutionId))).filter(
    (solutionId) => !directSolutionRows.some((solution) => solution.id === solutionId)
  );

  const linkedSolutionRows = missingSolutionIds.length > 0
    ? await db
        .select({
          id: solutions.id,
          projectId: solutions.projectId,
          solutionName: solutions.solutionName,
          solutionTypeName: solutionTypes.name,
          version: solutions.version,
          ownerId: solutions.ownerId,
          authorId: solutions.authorId,
          reviewerId: solutions.reviewerId,
          status: solutions.status,
          approvalStatus: solutions.approvalStatus,
          updatedAt: solutions.updatedAt,
        })
        .from(solutions)
        .leftJoin(solutionTypes, eq(solutions.solutionTypeId, solutionTypes.id))
        .where(and(isNull(solutions.deletedAt), inArray(solutions.id, missingSolutionIds)))
    : [];

  const solutionRows = [...directSolutionRows, ...linkedSolutionRows];

  const involvedUserIds = new Set<number>();
  const memberIdsByProject = new Map<number, Set<number>>();

  projectRows.forEach((project) => {
    if (project.managerId) involvedUserIds.add(project.managerId);
    if (project.deliveryManagerId) involvedUserIds.add(project.deliveryManagerId);
  });

  projectMemberRows.forEach((member) => {
    involvedUserIds.add(member.userId);
    const existing = memberIdsByProject.get(member.projectId) || new Set<number>();
    existing.add(member.userId);
    memberIdsByProject.set(member.projectId, existing);
  });

  taskRows.forEach((task) => {
    if (task.assigneeId) involvedUserIds.add(task.assigneeId);
  });

  solutionRows.forEach((solution) => {
    if (solution.ownerId) involvedUserIds.add(solution.ownerId);
    if (solution.authorId) involvedUserIds.add(solution.authorId);
    if (solution.reviewerId) involvedUserIds.add(solution.reviewerId);
  });

  const scopedUserIds = Array.from(involvedUserIds);
  const userRows = scopedUserIds.length > 0
    ? await db
        .select({
          id: users.id,
          realName: users.realName,
          department: users.department,
          position: users.position,
          roleName: roles.roleName,
          baseLocation: users.baseLocation,
          location: users.location,
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(and(inArray(users.id, scopedUserIds), isNull(users.deletedAt)))
    : [];

  const todoRows = scopedUserIds.length > 0
    ? await db
        .select({
          id: todos.id,
          title: todos.title,
          assigneeId: todos.assigneeId,
          dueDate: todos.dueDate,
          priority: todos.priority,
          todoStatus: todos.todoStatus,
          updatedAt: todos.updatedAt,
          relatedType: todos.relatedType,
          relatedId: todos.relatedId,
          relatedName: todos.relatedName,
        })
        .from(todos)
        .where(
          and(
            inArray(todos.assigneeId, scopedUserIds),
            or(eq(todos.todoStatus, 'pending'), eq(todos.todoStatus, 'in_progress'))
          )
        )
    : [];

  return {
    projectRows,
    projectMemberRows,
    taskRows,
    todoRows,
    solutionRows,
    solutionProjectRows,
    scopedUserIds,
    memberIdsByProject,
    userMap: new Map(
      userRows.map((user) => [
        user.id,
        {
          id: user.id,
          realName: user.realName,
          department: user.department,
          position: user.position,
          roleName: user.roleName,
          region: user.baseLocation || user.location,
        },
      ])
    ),
  };
}

export function buildUserExecutionStats(
  scope: TeamExecutionScope,
  filters: TeamExecutionFilters,
  today: Date
): UserExecutionStat[] {
  const { projectRows, taskRows, todoRows, solutionRows, scopedUserIds, memberIdsByProject, userMap } = scope;
  const activityThreshold = new Date(today);
  activityThreshold.setDate(activityThreshold.getDate() - resolveActivityThresholdDays(filters.range));

  const openTaskRows = taskRows.filter((task) => isOpenTaskStatus(task.status));
  const openTodoRows = todoRows.filter((todo) => isOpenTodoStatus(todo.todoStatus));
  const activeProjectIds = new Set(
    projectRows
      .filter((project) => !['cancelled', 'completed', 'archived'].includes(project.status || ''))
      .map((project) => project.id)
  );
  const keyProjectIds = new Set(projectRows.filter((project) => isKeyProject(project)).map((project) => project.id));

  const userPendingMap = new Map<number, number>();
  const userOverdueMap = new Map<number, number>();
  const userHighPriorityMap = new Map<number, number>();
  const userKeyProjectMap = new Map<number, Set<number>>();
  const userActiveProjectMap = new Map<number, Set<number>>();
  const userLastActivityMap = new Map<number, Date>();

  function touchActivity(userId: number | null | undefined, value: Date | null | undefined) {
    if (!userId || !value) {
      return;
    }

    const current = userLastActivityMap.get(userId);
    if (!current || current < value) {
      userLastActivityMap.set(userId, value);
    }
  }

  function markProject(map: Map<number, Set<number>>, userId: number | null | undefined, projectId: number | null | undefined) {
    if (!userId || !projectId) {
      return;
    }

    const current = map.get(userId) || new Set<number>();
    current.add(projectId);
    map.set(userId, current);
  }

  openTaskRows.forEach((task) => {
    if (!task.assigneeId) {
      return;
    }

    userPendingMap.set(task.assigneeId, (userPendingMap.get(task.assigneeId) || 0) + 1);
    if (isHighPriority(task.priority)) {
      userHighPriorityMap.set(task.assigneeId, (userHighPriorityMap.get(task.assigneeId) || 0) + 1);
    }

    const dueDate = parseDate(task.dueDate);
    if (dueDate && dueDate < today) {
      userOverdueMap.set(task.assigneeId, (userOverdueMap.get(task.assigneeId) || 0) + 1);
    }

    if (task.projectId && activeProjectIds.has(task.projectId)) {
      markProject(userActiveProjectMap, task.assigneeId, task.projectId);
    }

    if (task.projectId && keyProjectIds.has(task.projectId)) {
      markProject(userKeyProjectMap, task.assigneeId, task.projectId);
    }

    touchActivity(task.assigneeId, task.updatedAt);
  });

  openTodoRows.forEach((todo) => {
    userPendingMap.set(todo.assigneeId, (userPendingMap.get(todo.assigneeId) || 0) + 1);
    if (isHighPriority(todo.priority)) {
      userHighPriorityMap.set(todo.assigneeId, (userHighPriorityMap.get(todo.assigneeId) || 0) + 1);
    }

    const dueDate = parseDate(todo.dueDate);
    if (dueDate && dueDate < today) {
      userOverdueMap.set(todo.assigneeId, (userOverdueMap.get(todo.assigneeId) || 0) + 1);
    }

    if (todo.relatedType === 'project' && todo.relatedId) {
      if (activeProjectIds.has(todo.relatedId)) {
        markProject(userActiveProjectMap, todo.assigneeId, todo.relatedId);
      }
      if (keyProjectIds.has(todo.relatedId)) {
        markProject(userKeyProjectMap, todo.assigneeId, todo.relatedId);
      }
    }

    touchActivity(todo.assigneeId, todo.updatedAt);
  });

  projectRows.forEach((project) => {
    touchActivity(project.managerId, project.updatedAt);
    touchActivity(project.deliveryManagerId, project.updatedAt);
    memberIdsByProject.get(project.id)?.forEach((memberId) => touchActivity(memberId, project.updatedAt));

    if (activeProjectIds.has(project.id)) {
      markProject(userActiveProjectMap, project.managerId, project.id);
      markProject(userActiveProjectMap, project.deliveryManagerId, project.id);
      memberIdsByProject.get(project.id)?.forEach((memberId) => markProject(userActiveProjectMap, memberId, project.id));
    }

    if (keyProjectIds.has(project.id)) {
      markProject(userKeyProjectMap, project.managerId, project.id);
      markProject(userKeyProjectMap, project.deliveryManagerId, project.id);
      memberIdsByProject.get(project.id)?.forEach((memberId) => markProject(userKeyProjectMap, memberId, project.id));
    }
  });

  solutionRows.forEach((solution) => {
    touchActivity(solution.authorId, solution.updatedAt);
    touchActivity(solution.ownerId, solution.updatedAt);
    touchActivity(solution.reviewerId, solution.updatedAt);
    if (solution.projectId && activeProjectIds.has(solution.projectId)) {
      markProject(userActiveProjectMap, solution.authorId, solution.projectId);
      markProject(userActiveProjectMap, solution.ownerId, solution.projectId);
      markProject(userActiveProjectMap, solution.reviewerId, solution.projectId);
    }
  });

  return scopedUserIds
    .map((userId) => {
      const user = userMap.get(userId);
      if (!user) {
        return null;
      }

      const pendingCount = userPendingMap.get(userId) || 0;
      const overdueCount = userOverdueMap.get(userId) || 0;
      const highPriorityCount = userHighPriorityMap.get(userId) || 0;
      const keyProjectCount = userKeyProjectMap.get(userId)?.size || 0;
      const activeProjectCount = userActiveProjectMap.get(userId)?.size || 0;
      const lastActivityAt = userLastActivityMap.get(userId) || null;
      const lowActivity = !lastActivityAt || lastActivityAt < activityThreshold;
      const reasons: string[] = [];
      let riskScore = 0;

      if (pendingCount >= 10) {
        riskScore += 26;
        reasons.push(`当前待处理 ${pendingCount} 项`);
      } else if (pendingCount >= 6) {
        riskScore += 14;
        reasons.push(`当前待处理 ${pendingCount} 项`);
      }

      if (overdueCount > 0) {
        riskScore += overdueCount * 18;
        reasons.push(`逾期事项 ${overdueCount} 项`);
      }

      if (highPriorityCount >= 3) {
        riskScore += highPriorityCount * 8;
        reasons.push(`高优事项 ${highPriorityCount} 项`);
      }

      if (keyProjectCount >= 2) {
        riskScore += Math.min(keyProjectCount * 4, 16);
        reasons.push(`涉及重点项目 ${keyProjectCount} 个`);
      }

      if (lowActivity) {
        riskScore += 20;
        reasons.push(`最近 ${resolveActivityThresholdDays(filters.range)} 天推进偏少`);
      }

      if (reasons.length === 0) {
        reasons.push('当前执行负载平稳');
      }

      const loadScore = pendingCount * 3 + overdueCount * 10 + highPriorityCount * 5 + keyProjectCount * 3 + (lowActivity ? 12 : 0);
      let loadBucket: UserExecutionStat['loadBucket'] = 'reserve';

      if (pendingCount >= 10 || overdueCount >= 2 || loadScore >= 46) {
        loadBucket = 'overloaded';
      } else if (pendingCount >= 6 || highPriorityCount >= 3 || loadScore >= 28) {
        loadBucket = 'busy';
      } else if (pendingCount > 0 || activeProjectCount > 0 || keyProjectCount > 0) {
        loadBucket = 'balanced';
      }

      return {
        userId,
        name: user.realName,
        department: user.department,
        position: user.position,
        roleName: user.roleName || '未分配角色',
        region: user.region,
        pendingCount,
        overdueCount,
        highPriorityCount,
        keyProjectCount,
        activeProjectCount,
        riskScore,
        lastActivityAt,
        lowActivity,
        loadBucket,
        reasons,
      };
    })
    .filter((item): item is NonNullable<typeof item> => !!item);
}

export function buildProjectExecutionStats(
  scope: TeamExecutionScope,
  filters: TeamExecutionFilters,
  today: Date
): ProjectExecutionStat[] {
  const { projectRows, taskRows, todoRows, solutionRows, memberIdsByProject } = scope;
  const keyword = normalizeText(filters.q);
  const userStats = buildUserExecutionStats(scope, filters, today);
  const userStatMap = new Map(userStats.map((item) => [item.userId, item]));
  const openTaskRows = taskRows.filter((task) => isOpenTaskStatus(task.status));
  const openTodoRows = todoRows.filter((todo) => isOpenTodoStatus(todo.todoStatus));

  function touchProjectActivity(current: Date | null, value: Date | null | undefined) {
    if (!value) {
      return current;
    }

    if (!current || current < value) {
      return value;
    }

    return current;
  }

  return projectRows
    .map((project) => {
      const projectTasks = openTaskRows.filter((task) => task.projectId === project.id);
      const projectTodos = openTodoRows.filter((todo) => todo.relatedType === 'project' && todo.relatedId === project.id);
      const projectSolutions = solutionRows.filter((solution) => solution.projectId === project.id);
      const overdueTaskCount = projectTasks.filter((task) => {
        const dueDate = parseDate(task.dueDate);
        return !!dueDate && dueDate < today;
      }).length;
      const blockedTodoCount = projectTodos.filter((todo) => {
        const dueDate = parseDate(todo.dueDate);
        return !!dueDate && dueDate < today;
      }).length;
      const highPriorityTaskCount = projectTasks.filter((task) => isHighPriority(task.priority)).length;

      let lastProgressAt: Date | null = project.updatedAt;
      projectTasks.forEach((task) => {
        lastProgressAt = touchProjectActivity(lastProgressAt, task.updatedAt);
      });
      projectTodos.forEach((todo) => {
        lastProgressAt = touchProjectActivity(lastProgressAt, todo.updatedAt);
      });
      projectSolutions.forEach((solution) => {
        lastProgressAt = touchProjectActivity(lastProgressAt, solution.updatedAt);
      });

      const participantIds = new Set<number>();
      if (project.managerId) participantIds.add(project.managerId);
      if (project.deliveryManagerId) participantIds.add(project.deliveryManagerId);
      memberIdsByProject.get(project.id)?.forEach((userId) => participantIds.add(userId));
      projectTasks.forEach((task) => {
        if (task.assigneeId) participantIds.add(task.assigneeId);
      });
      projectTodos.forEach((todo) => participantIds.add(todo.assigneeId));
      projectSolutions.forEach((solution) => {
        if (solution.authorId) participantIds.add(solution.authorId);
        if (solution.ownerId) participantIds.add(solution.ownerId);
        if (solution.reviewerId) participantIds.add(solution.reviewerId);
      });

      const baseMemberIds = memberIdsByProject.get(project.id) ? Array.from(memberIdsByProject.get(project.id) as Set<number>) : [];
      const memberCount = new Set<number>([
        ...baseMemberIds,
        ...(project.managerId ? [project.managerId] : []),
        ...(project.deliveryManagerId ? [project.deliveryManagerId] : []),
      ]).size;
      const activePeopleCount = participantIds.size;
      const overloadedPeopleCount = Array.from(participantIds).filter((userId) => userStatMap.get(userId)?.loadBucket === 'overloaded').length;
      const staleDays = lastProgressAt ? Math.max(diffInDays(today, lastProgressAt), 0) : resolveActivityThresholdDays(filters.range);
      const keyProject = isKeyProject(project);
      const reasons: string[] = [];
      let riskScore = 0;

      if (overdueTaskCount > 0) {
        riskScore += overdueTaskCount * 16;
        reasons.push(`逾期任务 ${overdueTaskCount} 项`);
      }

      if (highPriorityTaskCount >= 2) {
        riskScore += Math.min(highPriorityTaskCount * 6, 18);
        reasons.push(`高优任务 ${highPriorityTaskCount} 项`);
      }

      if (blockedTodoCount > 0) {
        riskScore += blockedTodoCount * 14;
        reasons.push(`逾期待办 ${blockedTodoCount} 项`);
      }

      if (staleDays >= 14) {
        riskScore += 24;
        reasons.push(`${staleDays} 天未推进`);
      } else if (staleDays >= 7) {
        riskScore += 10;
        reasons.push(`近 ${staleDays} 天推进偏慢`);
      }

      if (overloadedPeopleCount >= 2) {
        riskScore += Math.min(overloadedPeopleCount * 7, 21);
        reasons.push(`过载成员 ${overloadedPeopleCount} 人`);
      } else if (activePeopleCount <= 1 && projectTasks.length + projectTodos.length >= 4) {
        riskScore += 12;
        reasons.push('项目协同资源偏紧');
      }

      if (project.risks?.trim()) {
        riskScore += /高|重大|延期|阻塞|卡点/.test(project.risks) ? 24 : 10;
        reasons.push(project.risks.length > 20 ? `${project.risks.slice(0, 20)}...` : project.risks);
      }

      if (keyProject) {
        riskScore += 8;
        reasons.push('重点项目');
      }

      if (!matchesKeyword(keyword, project.projectName, project.customerName, project.projectStage, project.status)) {
        return null;
      }

      if (filters.focus === 'overdue' && overdueTaskCount + blockedTodoCount === 0) {
        return null;
      }
      if (filters.focus === 'high-priority' && highPriorityTaskCount === 0 && !keyProject) {
        return null;
      }
      if (filters.focus === 'key-project' && !keyProject) {
        return null;
      }
      if (filters.focus === 'abnormal' && riskScore < 42 && staleDays < 14 && overloadedPeopleCount < 2) {
        return null;
      }

      return {
        projectId: project.id,
        projectName: project.projectName,
        customerName: project.customerName,
        stage: project.projectStage,
        status: project.status,
        priority: project.priority,
        openTaskCount: projectTasks.length,
        overdueTaskCount,
        blockedTodoCount,
        highPriorityTaskCount,
        memberCount,
        activePeopleCount,
        overloadedPeopleCount,
        staleDays,
        riskScore,
        keyProject,
        lastProgressAt,
        reasons: reasons.length > 0 ? reasons : ['当前推进平稳'],
      };
    })
    .filter((item): item is NonNullable<typeof item> => !!item);
}

export function buildEmptyTeamExecutionSummaryReadModel(filters: TeamExecutionFilters): TeamExecutionSummaryReadModel {
  const today = formatDate(new Date());

  return {
    filtersEcho: filters,
    window: buildWindow(filters.range, today, today),
    summary: {
      pendingTotal: 0,
      dueTodayTasks: 0,
      overdueTasks: 0,
      highPriorityTasks: 0,
      activeProjects: 0,
      keyProjectPeople: 0,
      overloadedPeople: 0,
      lowActivityPeople: 0,
    },
  };
}

export function buildEmptyTeamExecutionRiskReadModel(filters: TeamExecutionFilters): TeamExecutionRiskReadModel {
  const today = formatDate(new Date());

  return {
    filtersEcho: filters,
    window: buildWindow(filters.range, today, today),
    overview: {
      highRiskPeople: 0,
      highRiskProjects: 0,
      overdueItems: 0,
      blockedItems: 0,
    },
    people: [],
    projects: [],
    blockedList: [],
  };
}

export function buildEmptyTeamExecutionRoleReadModel(filters: TeamExecutionFilters): TeamExecutionRoleReadModel {
  const today = formatDate(new Date());

  return {
    filtersEcho: filters,
    window: buildWindow(filters.range, today, today),
    overview: {
      totalPeople: 0,
      overloadedPeople: 0,
      lowActivityPeople: 0,
      overduePeople: 0,
    },
    loadDistribution: [
      { bucket: 'reserve', label: '储备', count: 0, description: '当前待处理较少，可承接新增事项。' },
      { bucket: 'balanced', label: '平衡', count: 0, description: '负载平衡，推进节奏正常。' },
      { bucket: 'busy', label: '繁忙', count: 0, description: '事项集中，需要持续关注节奏。' },
      { bucket: 'overloaded', label: '过载', count: 0, description: '待处理或逾期明显偏高，应优先干预。' },
    ],
    roleGroups: [],
    riskRanking: [],
    details: [],
  };
}

export function buildEmptyTeamExecutionProjectReadModel(filters: TeamExecutionFilters): TeamExecutionProjectReadModel {
  const today = formatDate(new Date());

  return {
    filtersEcho: filters,
    window: buildWindow(filters.range, today, today),
    overview: {
      totalProjects: 0,
      highRiskProjects: 0,
      stalledProjects: 0,
      staffingTightProjects: 0,
    },
    stageDistribution: [],
    staffingOverview: [],
    riskHeat: [],
    details: [],
  };
}

export function buildEmptyTeamExecutionCustomerReadModel(filters: TeamExecutionFilters): TeamExecutionCustomerReadModel {
  const today = formatDate(new Date());

  return {
    filtersEcho: filters,
    window: buildWindow(filters.range, today, today),
    overview: {
      totalCustomers: 0,
      lowInteractionCustomers: 0,
      highBacklogCustomers: 0,
      highRiskCustomers: 0,
    },
    activityDistribution: [
      { bucket: 'active', label: '活跃互动', count: 0, description: '最近持续互动，推进节奏正常。' },
      { bucket: 'watch', label: '关注观察', count: 0, description: '互动开始放缓，需要保持跟进。' },
      { bucket: 'cooling', label: '降温预警', count: 0, description: '近期互动明显减少，应安排回访。' },
      { bucket: 'silent', label: '沉默客户', count: 0, description: '较长时间无互动，需重点修复关系。' },
    ],
    scaleRanking: [],
    details: [],
  };
}

export function buildEmptyTeamExecutionSolutionReadModel(filters: TeamExecutionFilters): TeamExecutionSolutionReadModel {
  const today = formatDate(new Date());

  return {
    filtersEcho: filters,
    window: buildWindow(filters.range, today, today),
    overview: {
      totalSolutions: 0,
      reviewingSolutions: 0,
      overdueReviews: 0,
      staleSolutions: 0,
    },
    statusDistribution: [],
    pressureRanking: [],
    details: [],
  };
}

async function loadCustomerContext(scope: TeamExecutionScope) {
  const customerIds = Array.from(new Set(scope.projectRows.map((project) => project.customerId).filter((value): value is number => !!value)));

  if (customerIds.length === 0) {
    return new Map<number, {
      id: number;
      customerName: string;
      customerTypeName: string | null;
      region: string | null;
      status: string | null;
      contactName: string | null;
      currentProjectCount: number;
      lastInteractionTime: Date | null;
      updatedAt: Date;
    }>();
  }

  const customerRows = await db
    .select({
      id: customers.id,
      customerName: customers.customerName,
      customerTypeName: customerTypes.name,
      region: customers.region,
      status: customers.status,
      contactName: customers.contactName,
      currentProjectCount: customers.currentProjectCount,
      lastInteractionTime: customers.lastInteractionTime,
      updatedAt: customers.updatedAt,
    })
    .from(customers)
    .leftJoin(customerTypes, eq(customers.customerTypeId, customerTypes.id))
    .where(and(inArray(customers.id, customerIds), isNull(customers.deletedAt)));

  return new Map(customerRows.map((customer) => [customer.id, customer]));
}

async function buildCustomerExecutionStats(
  scope: TeamExecutionScope,
  filters: TeamExecutionFilters,
  today: Date
): Promise<CustomerExecutionStat[]> {
  const customerMap = await loadCustomerContext(scope);
  if (customerMap.size === 0) {
    return [];
  }

  const keyword = normalizeText(filters.q);
  const thresholds = resolveCustomerInteractionThresholds(filters.range);
  const userStats = buildUserExecutionStats(scope, filters, today);
  const overloadedUserIds = new Set(userStats.filter((item) => item.loadBucket === 'overloaded').map((item) => item.userId));
  const activeProjectStatuses = new Set(['planning', 'in_progress', 'on_hold', 'pending']);

  return Array.from(customerMap.values())
    .map((customer) => {
      const relatedProjects = scope.projectRows.filter((project) => project.customerId === customer.id);
      if (relatedProjects.length === 0) {
        return null;
      }

      const relatedProjectIds = new Set(relatedProjects.map((project) => project.id));
      const relatedTasks = scope.taskRows.filter((task) => task.projectId && relatedProjectIds.has(task.projectId) && isOpenTaskStatus(task.status));
      const relatedTodos = scope.todoRows.filter((todo) => todo.relatedType === 'project' && todo.relatedId && relatedProjectIds.has(todo.relatedId) && isOpenTodoStatus(todo.todoStatus));
      const activeProjectCount = relatedProjects.filter((project) => activeProjectStatuses.has(project.status || '')).length;
      const openItemCount = relatedTasks.length + relatedTodos.length;
      const overdueTaskCount = relatedTasks.filter((task) => {
        const dueDate = parseDate(task.dueDate);
        return !!dueDate && dueDate < today;
      }).length;
      const overdueTodoCount = relatedTodos.filter((todo) => {
        const dueDate = parseDate(todo.dueDate);
        return !!dueDate && dueDate < today;
      }).length;
      const overdueItemCount = overdueTaskCount + overdueTodoCount;
      const keyProjectCount = relatedProjects.filter((project) => isKeyProject(project)).length;
      const participantIds = new Set<number>();

      relatedProjects.forEach((project) => {
        if (project.managerId) participantIds.add(project.managerId);
        if (project.deliveryManagerId) participantIds.add(project.deliveryManagerId);
        scope.memberIdsByProject.get(project.id)?.forEach((userId) => participantIds.add(userId));
      });
      relatedTasks.forEach((task) => {
        if (task.assigneeId) participantIds.add(task.assigneeId);
      });
      relatedTodos.forEach((todo) => participantIds.add(todo.assigneeId));
      const overloadedPeopleCount = Array.from(participantIds).filter((userId) => overloadedUserIds.has(userId)).length;

      const lastInteractionTime = customer.lastInteractionTime || customer.updatedAt || null;
      const interactionDays = lastInteractionTime ? Math.max(diffInDays(today, lastInteractionTime), 0) : Number.POSITIVE_INFINITY;
      let interactionStatus: CustomerExecutionStat['interactionStatus'] = 'silent';
      if (interactionDays <= thresholds.active) {
        interactionStatus = 'active';
      } else if (interactionDays <= thresholds.watch) {
        interactionStatus = 'watch';
      } else if (interactionDays <= thresholds.cooling) {
        interactionStatus = 'cooling';
      }

      const reasons: string[] = [];
      let riskScore = 0;

      if (interactionStatus === 'silent') {
        riskScore += 28;
        reasons.push('近期缺少客户互动');
      } else if (interactionStatus === 'cooling') {
        riskScore += 16;
        reasons.push('客户互动开始降温');
      } else if (interactionStatus === 'watch') {
        riskScore += 8;
        reasons.push('建议保持回访节奏');
      }

      if (openItemCount >= 12) {
        riskScore += 22;
        reasons.push(`关联事项 ${openItemCount} 项`);
      } else if (openItemCount >= 6) {
        riskScore += 12;
        reasons.push(`关联事项 ${openItemCount} 项`);
      }

      if (overdueItemCount > 0) {
        riskScore += overdueItemCount * 12;
        reasons.push(`逾期事项 ${overdueItemCount} 项`);
      }

      if (keyProjectCount >= 2) {
        riskScore += 12;
        reasons.push(`重点项目 ${keyProjectCount} 个`);
      } else if (keyProjectCount === 1) {
        riskScore += 6;
        reasons.push('存在重点项目跟进');
      }

      if (overloadedPeopleCount >= 2) {
        riskScore += 12;
        reasons.push(`过载协同人员 ${overloadedPeopleCount} 人`);
      }

      if (reasons.length === 0) {
        reasons.push('当前客户推进平稳');
      }

      if (!matchesKeyword(keyword, customer.customerName, customer.customerTypeName, customer.region, customer.contactName)) {
        return null;
      }

      if (filters.focus === 'overdue' && overdueItemCount === 0) {
        return null;
      }
      if (filters.focus === 'high-priority' && keyProjectCount === 0) {
        return null;
      }
      if (filters.focus === 'key-project' && keyProjectCount === 0) {
        return null;
      }
      if (filters.focus === 'abnormal' && riskScore < 36 && interactionStatus !== 'silent') {
        return null;
      }

      return {
        customerId: customer.id,
        customerName: customer.customerName,
        customerTypeName: customer.customerTypeName,
        region: customer.region,
        contactName: customer.contactName,
        currentProjectCount: customer.currentProjectCount,
        activeProjectCount,
        openItemCount,
        overdueItemCount,
        keyProjectCount,
        riskScore,
        interactionStatus,
        lastInteractionTime,
        reasons,
      };
    })
    .filter((item): item is NonNullable<typeof item> => !!item);
}

export async function getTeamExecutionSummaryReadModel(
  userId: number,
  filters: TeamExecutionFilters,
  range: { startDate: string; endDate: string }
): Promise<TeamExecutionSummaryReadModel> {
  const empty = buildEmptyTeamExecutionSummaryReadModel(filters);
  const scope = await loadTeamExecutionScope(userId);
  const { projectRows, projectMemberRows, taskRows, todoRows, solutionRows, scopedUserIds, memberIdsByProject } = scope;

  if (projectRows.length === 0) {
    return {
      ...empty,
      window: buildWindow(filters.range, range.startDate, range.endDate),
    };
  }

  const today = parseDate(range.endDate) || new Date();
  const rangeStart = parseDate(range.startDate) || today;
  const activeThreshold = new Date(today);
  activeThreshold.setDate(activeThreshold.getDate() - resolveActivityThresholdDays(filters.range));

  const openTaskRows = taskRows.filter((task) => isOpenTaskStatus(task.status));
  const pendingTodoRows = todoRows.filter((todo) => isOpenTodoStatus(todo.todoStatus));
  const activeProjectRows = projectRows.filter((project) => {
    return !['cancelled', 'completed', 'archived'].includes(project.status || '') && project.updatedAt >= rangeStart;
  });

  const keyProjectIds = new Set(
    activeProjectRows
      .filter((project) => isKeyProject(project))
      .map((project) => project.id)
  );

  const keyProjectPeople = new Set<number>();
  projectRows.forEach((project) => {
    if (!keyProjectIds.has(project.id)) {
      return;
    }

    if (project.managerId) keyProjectPeople.add(project.managerId);
    if (project.deliveryManagerId) keyProjectPeople.add(project.deliveryManagerId);
    memberIdsByProject.get(project.id)?.forEach((userId) => keyProjectPeople.add(userId));
  });

  const workloadMap = new Map<number, { pending: number; overdue: number; highPriority: number }>();
  const lastActivityMap = new Map<number, Date>();

  function touchActivity(userId: number | null | undefined, value: Date | null | undefined) {
    if (!userId || !value) {
      return;
    }

    const current = lastActivityMap.get(userId);
    if (!current || current < value) {
      lastActivityMap.set(userId, value);
    }
  }

  openTaskRows.forEach((task) => {
    const assigneeId = task.assigneeId;
    const dueDate = parseDate(task.dueDate);
    const updatedAt = task.updatedAt;

    if (assigneeId) {
      const current = workloadMap.get(assigneeId) || { pending: 0, overdue: 0, highPriority: 0 };
      current.pending += 1;
      if (dueDate && dueDate < today) {
        current.overdue += 1;
      }
      if (isHighPriority(task.priority)) {
        current.highPriority += 1;
      }
      workloadMap.set(assigneeId, current);
      touchActivity(assigneeId, updatedAt);
    }
  });

  pendingTodoRows.forEach((todo) => {
    const assigneeId = todo.assigneeId;
    const updatedAt = todo.updatedAt;

    if (assigneeId) {
      const current = workloadMap.get(assigneeId) || { pending: 0, overdue: 0, highPriority: 0 };
      current.pending += 1;
      workloadMap.set(assigneeId, current);
      touchActivity(assigneeId, updatedAt);
    }
  });

  projectRows.forEach((project) => {
    touchActivity(project.managerId, project.updatedAt);
    touchActivity(project.deliveryManagerId, project.updatedAt);
    memberIdsByProject.get(project.id)?.forEach((userId) => touchActivity(userId, project.updatedAt));
  });

  solutionRows.forEach((solution) => {
    touchActivity(solution.ownerId, solution.updatedAt);
    touchActivity(solution.authorId, solution.updatedAt);
    touchActivity(solution.reviewerId, solution.updatedAt);
  });

  const overloadedPeople = Array.from(workloadMap.values()).filter(
    (item) => item.pending >= 8 || item.overdue >= 2 || item.highPriority >= 4
  ).length;

  const lowActivityPeople = scopedUserIds.filter((userId) => {
    const lastActivity = lastActivityMap.get(userId);
    return !lastActivity || lastActivity < activeThreshold;
  }).length;

  return {
    filtersEcho: filters,
    window: buildWindow(filters.range, range.startDate, range.endDate),
    summary: {
      pendingTotal: openTaskRows.length + pendingTodoRows.length,
      dueTodayTasks: openTaskRows.filter((task) => {
        const dueDate = parseDate(task.dueDate);
        return !!dueDate && formatDate(dueDate) === range.endDate;
      }).length,
      overdueTasks: openTaskRows.filter((task) => {
        const dueDate = parseDate(task.dueDate);
        return !!dueDate && dueDate < today;
      }).length,
      highPriorityTasks: openTaskRows.filter((task) => isHighPriority(task.priority)).length,
      activeProjects: activeProjectRows.length,
      keyProjectPeople: keyProjectPeople.size,
      overloadedPeople,
      lowActivityPeople,
    },
  };
}

export async function getTeamExecutionRiskReadModel(
  userId: number,
  filters: TeamExecutionFilters,
  range: { startDate: string; endDate: string }
): Promise<TeamExecutionRiskReadModel> {
  const empty = buildEmptyTeamExecutionRiskReadModel(filters);
  const scope = await loadTeamExecutionScope(userId);
  const {
    projectRows,
    taskRows,
    todoRows,
    solutionRows,
    memberIdsByProject,
    userMap,
  } = scope;

  if (projectRows.length === 0) {
    return {
      ...empty,
      window: buildWindow(filters.range, range.startDate, range.endDate),
    };
  }

  const today = parseDate(range.endDate) || new Date();
  const activityThreshold = new Date(today);
  activityThreshold.setDate(activityThreshold.getDate() - resolveActivityThresholdDays(filters.range));
  const keyword = normalizeText(filters.q);
  const userExecutionStats = buildUserExecutionStats(scope, filters, today);
  const projectExecutionStats = buildProjectExecutionStats(scope, filters, today);

  const projectMap = new Map(projectRows.map((project) => [project.id, project]));
  const openTaskRows = taskRows.filter((task) => isOpenTaskStatus(task.status));
  const openTodoRows = todoRows.filter((todo) => isOpenTodoStatus(todo.todoStatus));
  const keyProjectIds = new Set(projectRows.filter((project) => isKeyProject(project)).map((project) => project.id));
  const rawPeople = userExecutionStats
    .filter((person) => person.riskScore >= 18)
    .map((person) => ({
      userId: person.userId,
      name: person.name,
      department: person.department,
      position: person.position,
      pendingCount: person.pendingCount,
      overdueCount: person.overdueCount,
      highPriorityCount: person.highPriorityCount,
      keyProjectCount: person.keyProjectCount,
      riskScore: person.riskScore,
      lastActivityAt: formatDateTime(person.lastActivityAt),
      reasons: person.reasons,
    }));

  const focusFilteredPeople = rawPeople.filter((person) => {
    if (!matchesKeyword(keyword, person.name, person.department, person.position)) {
      return false;
    }

    if (filters.focus === 'overdue') {
      return person.overdueCount > 0;
    }
    if (filters.focus === 'high-priority') {
      return person.highPriorityCount > 0;
    }
    if (filters.focus === 'key-project') {
      return person.keyProjectCount > 0;
    }
    if (filters.focus === 'abnormal') {
      return person.riskScore >= 45 || person.overdueCount >= 2;
    }
    return true;
  });

  const rawProjects = projectExecutionStats.filter((project) => project.riskScore >= 16);

  const focusFilteredProjects = rawProjects.filter((project) => {
    if (!matchesKeyword(keyword, project.projectName, project.customerName)) {
      return false;
    }

    if (filters.focus === 'overdue') {
      return project.overdueTaskCount + project.blockedTodoCount > 0;
    }
    if (filters.focus === 'high-priority') {
      return project.highPriorityTaskCount > 0 || project.keyProject;
    }
    if (filters.focus === 'key-project') {
      return project.keyProject;
    }
    if (filters.focus === 'abnormal') {
      return project.riskScore >= 42 || project.staleDays >= 14;
    }
    return true;
  });

  const rawBlockedList = [
    ...openTaskRows
      .map((task) => {
        const dueDate = parseDate(task.dueDate);
        if (!dueDate || dueDate >= today) {
          return null;
        }

        const project = task.projectId ? projectMap.get(task.projectId) : null;
        const owner = task.assigneeId ? userMap.get(task.assigneeId) : null;
        return {
          type: 'task' as const,
          id: task.id,
          title: task.taskName,
          ownerName: owner?.realName || null,
          projectName: project?.projectName || null,
          dueDate: formatDate(dueDate),
          priority: task.priority,
          status: task.status,
          overdueDays: Math.abs(diffInDays(dueDate, today)),
          keyProject: !!project && isKeyProject(project),
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item),
    ...openTodoRows
      .map((todo) => {
        const dueDate = parseDate(todo.dueDate);
        if (!dueDate || dueDate >= today) {
          return null;
        }

        const project = todo.relatedType === 'project' && todo.relatedId ? projectMap.get(todo.relatedId) : null;
        const owner = userMap.get(todo.assigneeId);
        return {
          type: 'todo' as const,
          id: todo.id,
          title: todo.title,
          ownerName: owner?.realName || null,
          projectName: project?.projectName || todo.relatedName || null,
          dueDate: formatDate(dueDate),
          priority: todo.priority,
          status: todo.todoStatus,
          overdueDays: Math.abs(diffInDays(dueDate, today)),
          keyProject: !!project && isKeyProject(project),
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item),
  ];

  const focusFilteredBlockedList = rawBlockedList.filter((item) => {
    if (!matchesKeyword(keyword, item.title, item.ownerName, item.projectName)) {
      return false;
    }

    if (filters.focus === 'high-priority') {
      return isHighPriority(item.priority);
    }
    if (filters.focus === 'key-project') {
      return item.keyProject;
    }
    if (filters.focus === 'abnormal') {
      return item.overdueDays >= 3 || isHighPriority(item.priority);
    }
    return true;
  });

  const people = focusFilteredPeople
    .sort((left, right) => right.riskScore - left.riskScore || right.overdueCount - left.overdueCount || right.pendingCount - left.pendingCount)
    .slice(0, 6);
  const projectsList = focusFilteredProjects
    .sort((left, right) => right.riskScore - left.riskScore || right.overdueTaskCount - left.overdueTaskCount || right.openTaskCount - left.openTaskCount)
    .slice(0, 6)
    .map(({ keyProject: _keyProject, highPriorityTaskCount: _highPriorityTaskCount, memberCount: _memberCount, activePeopleCount: _activePeopleCount, overloadedPeopleCount: _overloadedPeopleCount, lastProgressAt: _lastProgressAt, ...project }) => project);
  const blockedList = focusFilteredBlockedList
    .sort((left, right) => right.overdueDays - left.overdueDays || Number(isHighPriority(right.priority)) - Number(isHighPriority(left.priority)))
    .slice(0, 8)
    .map(({ keyProject: _keyProject, ...item }) => item);

  return {
    filtersEcho: filters,
    window: buildWindow(filters.range, range.startDate, range.endDate),
    overview: {
      highRiskPeople: focusFilteredPeople.filter((person) => person.riskScore >= 50).length,
      highRiskProjects: focusFilteredProjects.filter((project) => project.riskScore >= 50).length,
      overdueItems: focusFilteredBlockedList.length,
      blockedItems: focusFilteredBlockedList.filter((item) => item.overdueDays >= 3 || isHighPriority(item.priority)).length,
    },
    people,
    projects: projectsList,
    blockedList,
  };
}

export async function getTeamExecutionRoleReadModel(
  userId: number,
  filters: TeamExecutionFilters,
  range: { startDate: string; endDate: string }
): Promise<TeamExecutionRoleReadModel> {
  const empty = buildEmptyTeamExecutionRoleReadModel(filters);
  const scope = await loadTeamExecutionScope(userId);

  if (scope.projectRows.length === 0) {
    return {
      ...empty,
      window: buildWindow(filters.range, range.startDate, range.endDate),
    };
  }

  const today = parseDate(range.endDate) || new Date();
  const keyword = normalizeText(filters.q);
  const loadDescriptions: Record<TeamExecutionRoleReadModel['loadDistribution'][number]['bucket'], string> = {
    reserve: '当前待处理较少，可承接新增事项。',
    balanced: '负载平衡，推进节奏正常。',
    busy: '事项集中，需要持续关注节奏。',
    overloaded: '待处理或逾期明显偏高，应优先干预。',
  };
  const loadLabels: Record<TeamExecutionRoleReadModel['loadDistribution'][number]['bucket'], string> = {
    reserve: '储备',
    balanced: '平衡',
    busy: '繁忙',
    overloaded: '过载',
  };

  const filteredPeople = buildUserExecutionStats(scope, filters, today).filter((person) => {
    if (!matchesKeyword(keyword, person.name, person.roleName, person.department, person.position, person.region)) {
      return false;
    }

    if (filters.focus === 'overdue') {
      return person.overdueCount > 0;
    }
    if (filters.focus === 'high-priority') {
      return person.highPriorityCount > 0;
    }
    if (filters.focus === 'key-project') {
      return person.keyProjectCount > 0;
    }
    if (filters.focus === 'abnormal') {
      return person.riskScore >= 45 || person.overdueCount >= 2 || person.lowActivity || person.loadBucket === 'overloaded';
    }

    return true;
  });

  const loadBuckets: Array<TeamExecutionRoleReadModel['loadDistribution'][number]['bucket']> = ['reserve', 'balanced', 'busy', 'overloaded'];
  const loadDistribution = loadBuckets.map((bucket) => ({
    bucket,
    label: loadLabels[bucket],
    count: filteredPeople.filter((person) => person.loadBucket === bucket).length,
    description: loadDescriptions[bucket],
  }));

  const roleGroups = Array.from(
    filteredPeople.reduce((groupMap, person) => {
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
      avgRiskScore: group.memberCount > 0 ? Math.round(group.totalRiskScore / group.memberCount) : 0,
      overloadedCount: group.overloadedCount,
      lowActivityCount: group.lowActivityCount,
    }))
    .sort((left, right) => right.avgRiskScore - left.avgRiskScore || right.pendingTotal - left.pendingTotal)
    .slice(0, 6);

  const sortedPeople = [...filteredPeople].sort(
    (left, right) => right.riskScore - left.riskScore || right.overdueCount - left.overdueCount || right.pendingCount - left.pendingCount
  );

  return {
    filtersEcho: filters,
    window: buildWindow(filters.range, range.startDate, range.endDate),
    overview: {
      totalPeople: filteredPeople.length,
      overloadedPeople: filteredPeople.filter((person) => person.loadBucket === 'overloaded').length,
      lowActivityPeople: filteredPeople.filter((person) => person.lowActivity).length,
      overduePeople: filteredPeople.filter((person) => person.overdueCount > 0).length,
    },
    loadDistribution,
    roleGroups,
    riskRanking: sortedPeople
      .filter((person) => person.riskScore >= 18 || person.overdueCount > 0 || person.lowActivity)
      .slice(0, 8)
      .map((person) => ({
        userId: person.userId,
        name: person.name,
        roleName: person.roleName,
        department: person.department,
        region: person.region,
        pendingCount: person.pendingCount,
        overdueCount: person.overdueCount,
        highPriorityCount: person.highPriorityCount,
        keyProjectCount: person.keyProjectCount,
        activeProjectCount: person.activeProjectCount,
        riskScore: person.riskScore,
        loadBucket: person.loadBucket,
        lastActivityAt: formatDateTime(person.lastActivityAt),
        reasons: person.reasons,
      })),
    details: sortedPeople.slice(0, 24).map((person) => ({
      userId: person.userId,
      name: person.name,
      roleName: person.roleName,
      department: person.department,
      position: person.position,
      region: person.region,
      pendingCount: person.pendingCount,
      overdueCount: person.overdueCount,
      highPriorityCount: person.highPriorityCount,
      keyProjectCount: person.keyProjectCount,
      activeProjectCount: person.activeProjectCount,
      riskScore: person.riskScore,
      loadBucket: person.loadBucket,
      lastActivityAt: formatDateTime(person.lastActivityAt),
      lowActivity: person.lowActivity,
      reasons: person.reasons,
    })),
  };
}

export async function getTeamExecutionProjectReadModel(
  userId: number,
  filters: TeamExecutionFilters,
  range: { startDate: string; endDate: string }
): Promise<TeamExecutionProjectReadModel> {
  const empty = buildEmptyTeamExecutionProjectReadModel(filters);
  const scope = await loadTeamExecutionScope(userId);

  if (scope.projectRows.length === 0) {
    return {
      ...empty,
      window: buildWindow(filters.range, range.startDate, range.endDate),
    };
  }

  const today = parseDate(range.endDate) || new Date();
  const filteredProjects = buildProjectExecutionStats(scope, filters, today);

  const stageDistribution = Array.from(
    filteredProjects.reduce((groupMap, project) => {
      const stage = project.stage || '未标记阶段';
      const current = groupMap.get(stage) || {
        stage,
        label: stage,
        count: 0,
        highRiskCount: 0,
        overdueTaskTotal: 0,
      };

      current.count += 1;
      current.overdueTaskTotal += project.overdueTaskCount;
      if (project.riskScore >= 50) {
        current.highRiskCount += 1;
      }

      groupMap.set(stage, current);
      return groupMap;
    }, new Map<string, {
      stage: string;
      label: string;
      count: number;
      highRiskCount: number;
      overdueTaskTotal: number;
    }>())
  )
    .map(([, group]) => group)
    .sort((left, right) => right.count - left.count || right.highRiskCount - left.highRiskCount)
    .slice(0, 6);

  const sortedProjects = [...filteredProjects].sort(
    (left, right) => right.riskScore - left.riskScore || right.overdueTaskCount - left.overdueTaskCount || right.staleDays - left.staleDays
  );

  return {
    filtersEcho: filters,
    window: buildWindow(filters.range, range.startDate, range.endDate),
    overview: {
      totalProjects: filteredProjects.length,
      highRiskProjects: filteredProjects.filter((project) => project.riskScore >= 50).length,
      stalledProjects: filteredProjects.filter((project) => project.staleDays >= 14).length,
      staffingTightProjects: filteredProjects.filter((project) => project.overloadedPeopleCount >= 2 || (project.activePeopleCount <= 1 && project.openTaskCount + project.blockedTodoCount >= 4)).length,
    },
    stageDistribution,
    staffingOverview: [...sortedProjects]
      .sort((left, right) => right.overloadedPeopleCount - left.overloadedPeopleCount || right.activePeopleCount - left.activePeopleCount)
      .slice(0, 8)
      .map((project) => ({
        projectId: project.projectId,
        projectName: project.projectName,
        customerName: project.customerName,
        memberCount: project.memberCount,
        activePeopleCount: project.activePeopleCount,
        overloadedPeopleCount: project.overloadedPeopleCount,
        openTaskCount: project.openTaskCount,
        blockedTodoCount: project.blockedTodoCount,
      })),
    riskHeat: sortedProjects.slice(0, 8).map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      customerName: project.customerName,
      stage: project.stage,
      status: project.status,
      priority: project.priority,
      openTaskCount: project.openTaskCount,
      overdueTaskCount: project.overdueTaskCount,
      blockedTodoCount: project.blockedTodoCount,
      highPriorityTaskCount: project.highPriorityTaskCount,
      activePeopleCount: project.activePeopleCount,
      overloadedPeopleCount: project.overloadedPeopleCount,
      staleDays: project.staleDays,
      riskScore: project.riskScore,
      lastProgressAt: formatDateTime(project.lastProgressAt),
      reasons: project.reasons,
    })),
    details: sortedProjects.slice(0, 24).map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      customerName: project.customerName,
      stage: project.stage,
      status: project.status,
      priority: project.priority,
      memberCount: project.memberCount,
      activePeopleCount: project.activePeopleCount,
      overloadedPeopleCount: project.overloadedPeopleCount,
      openTaskCount: project.openTaskCount,
      overdueTaskCount: project.overdueTaskCount,
      blockedTodoCount: project.blockedTodoCount,
      highPriorityTaskCount: project.highPriorityTaskCount,
      staleDays: project.staleDays,
      riskScore: project.riskScore,
      keyProject: project.keyProject,
      lastProgressAt: formatDateTime(project.lastProgressAt),
      reasons: project.reasons,
    })),
  };
}

export async function getTeamExecutionCustomerReadModel(
  userId: number,
  filters: TeamExecutionFilters,
  range: { startDate: string; endDate: string }
): Promise<TeamExecutionCustomerReadModel> {
  const empty = buildEmptyTeamExecutionCustomerReadModel(filters);
  const scope = await loadTeamExecutionScope(userId);

  if (scope.projectRows.length === 0) {
    return {
      ...empty,
      window: buildWindow(filters.range, range.startDate, range.endDate),
    };
  }

  const today = parseDate(range.endDate) || new Date();
  const customers = await buildCustomerExecutionStats(scope, filters, today);
  const activityLabels: Record<TeamExecutionCustomerReadModel['activityDistribution'][number]['bucket'], { label: string; description: string }> = {
    active: { label: '活跃互动', description: '最近持续互动，推进节奏正常。' },
    watch: { label: '关注观察', description: '互动开始放缓，需要保持跟进。' },
    cooling: { label: '降温预警', description: '近期互动明显减少，应安排回访。' },
    silent: { label: '沉默客户', description: '较长时间无互动，需重点修复关系。' },
  };

  const activityDistribution = (['active', 'watch', 'cooling', 'silent'] as const).map((bucket) => ({
    bucket,
    label: activityLabels[bucket].label,
    count: customers.filter((customer) => customer.interactionStatus === bucket).length,
    description: activityLabels[bucket].description,
  }));

  const sortedCustomers = [...customers].sort(
    (left, right) => right.riskScore - left.riskScore || right.openItemCount - left.openItemCount || right.overdueItemCount - left.overdueItemCount
  );

  return {
    filtersEcho: filters,
    window: buildWindow(filters.range, range.startDate, range.endDate),
    overview: {
      totalCustomers: customers.length,
      lowInteractionCustomers: customers.filter((customer) => customer.interactionStatus === 'cooling' || customer.interactionStatus === 'silent').length,
      highBacklogCustomers: customers.filter((customer) => customer.openItemCount >= 6).length,
      highRiskCustomers: customers.filter((customer) => customer.riskScore >= 45).length,
    },
    activityDistribution,
    scaleRanking: sortedCustomers.slice(0, 8).map((customer) => ({
      customerId: customer.customerId,
      customerName: customer.customerName,
      customerTypeName: customer.customerTypeName,
      region: customer.region,
      currentProjectCount: customer.currentProjectCount,
      activeProjectCount: customer.activeProjectCount,
      openItemCount: customer.openItemCount,
      overdueItemCount: customer.overdueItemCount,
      keyProjectCount: customer.keyProjectCount,
      riskScore: customer.riskScore,
      interactionStatus: customer.interactionStatus,
      lastInteractionTime: formatDateTime(customer.lastInteractionTime),
      reasons: customer.reasons,
    })),
    details: sortedCustomers.slice(0, 24).map((customer) => ({
      customerId: customer.customerId,
      customerName: customer.customerName,
      customerTypeName: customer.customerTypeName,
      region: customer.region,
      contactName: customer.contactName,
      currentProjectCount: customer.currentProjectCount,
      activeProjectCount: customer.activeProjectCount,
      openItemCount: customer.openItemCount,
      overdueItemCount: customer.overdueItemCount,
      keyProjectCount: customer.keyProjectCount,
      riskScore: customer.riskScore,
      interactionStatus: customer.interactionStatus,
      lastInteractionTime: formatDateTime(customer.lastInteractionTime),
      reasons: customer.reasons,
    })),
  };
}

async function buildSolutionExecutionStats(
  scope: TeamExecutionScope,
  filters: TeamExecutionFilters,
  today: Date
): Promise<SolutionExecutionStat[]> {
  if (scope.solutionRows.length === 0) {
    return [];
  }

  const solutionIds = scope.solutionRows.map((solution) => solution.id);
  const reviewRows = await db
    .select({
      solutionId: solutionReviews.solutionId,
      reviewStatus: solutionReviews.reviewStatus,
      dueDate: solutionReviews.dueDate,
      updatedAt: solutionReviews.updatedAt,
      reviewedAt: solutionReviews.reviewedAt,
    })
    .from(solutionReviews)
    .where(and(inArray(solutionReviews.solutionId, solutionIds), isNull(solutionReviews.deletedAt)));

  const keyword = normalizeText(filters.q);
  const linkedProjectIdsBySolution = new Map<number, Set<number>>();
  scope.solutionRows.forEach((solution) => {
    const projectIds = linkedProjectIdsBySolution.get(solution.id) || new Set<number>();
    if (solution.projectId) {
      projectIds.add(solution.projectId);
    }
    linkedProjectIdsBySolution.set(solution.id, projectIds);
  });
  scope.solutionProjectRows.forEach((item) => {
    const projectIds = linkedProjectIdsBySolution.get(item.solutionId) || new Set<number>();
    projectIds.add(item.projectId);
    linkedProjectIdsBySolution.set(item.solutionId, projectIds);
  });

  const projectMap = new Map(scope.projectRows.map((project) => [project.id, project]));

  return scope.solutionRows
    .map((solution) => {
      const relatedReviews = reviewRows.filter((review) => review.solutionId === solution.id);
      const pendingReviewCount = relatedReviews.filter((review) => review.reviewStatus === 'pending').length;
      const overdueReviewCount = relatedReviews.filter((review) => {
        const dueDate = parseDate(review.dueDate);
        return review.reviewStatus === 'pending' && !!dueDate && dueDate < today;
      }).length;

      let lastUpdatedAt: Date | null = solution.updatedAt;
      relatedReviews.forEach((review) => {
        if (!lastUpdatedAt || lastUpdatedAt < review.updatedAt) {
          lastUpdatedAt = review.updatedAt;
        }
        if (review.reviewedAt && (!lastUpdatedAt || lastUpdatedAt < review.reviewedAt)) {
          lastUpdatedAt = review.reviewedAt;
        }
      });

      const staleDays = lastUpdatedAt ? Math.max(diffInDays(today, lastUpdatedAt), 0) : resolveActivityThresholdDays(filters.range);
      const linkedProjectIds = linkedProjectIdsBySolution.get(solution.id) || new Set<number>();
      const relatedProjects = Array.from(linkedProjectIds).map((projectId) => projectMap.get(projectId)).filter((item): item is NonNullable<typeof item> => !!item);
      const keyProjectCount = relatedProjects.filter((project) => isKeyProject(project)).length;
      const reasons: string[] = [];
      let riskScore = 0;

      if (pendingReviewCount > 0) {
        riskScore += pendingReviewCount * 10;
        reasons.push(`待评审 ${pendingReviewCount} 条`);
      }
      if (overdueReviewCount > 0) {
        riskScore += overdueReviewCount * 16;
        reasons.push(`逾期评审 ${overdueReviewCount} 条`);
      }
      if (solution.status === 'reviewing') {
        riskScore += 12;
        reasons.push('处于审核中');
      }
      if (staleDays >= 14) {
        riskScore += 22;
        reasons.push(`${staleDays} 天未更新`);
      } else if (staleDays >= 7) {
        riskScore += 10;
        reasons.push(`近 ${staleDays} 天推进偏慢`);
      }
      if (solution.approvalStatus === 'rejected' || solution.status === 'rejected') {
        riskScore += 18;
        reasons.push('存在驳回记录');
      }
      if (!solution.reviewerId && solution.status === 'reviewing') {
        riskScore += 8;
        reasons.push('缺少明确评审人');
      }
      if (keyProjectCount > 0) {
        riskScore += Math.min(keyProjectCount * 6, 18);
        reasons.push(`关联重点项目 ${keyProjectCount} 个`);
      }
      if (reasons.length === 0) {
        reasons.push('当前方案推进平稳');
      }

      const ownerName = solution.ownerId ? scope.userMap.get(solution.ownerId)?.realName || null : null;
      const reviewerName = solution.reviewerId ? scope.userMap.get(solution.reviewerId)?.realName || null : null;

      if (!matchesKeyword(keyword, solution.solutionName, solution.solutionTypeName, ownerName, reviewerName, solution.status, solution.approvalStatus)) {
        return null;
      }

      if (filters.focus === 'overdue' && overdueReviewCount === 0) {
        return null;
      }
      if (filters.focus === 'high-priority' && pendingReviewCount === 0 && solution.status !== 'reviewing') {
        return null;
      }
      if (filters.focus === 'key-project' && keyProjectCount === 0) {
        return null;
      }
      if (filters.focus === 'abnormal' && riskScore < 36 && overdueReviewCount === 0 && staleDays < 14) {
        return null;
      }

      return {
        solutionId: solution.id,
        solutionName: solution.solutionName,
        solutionTypeName: solution.solutionTypeName,
        version: solution.version,
        status: solution.status,
        approvalStatus: solution.approvalStatus,
        ownerName,
        reviewerName,
        relatedProjectCount: relatedProjects.length,
        pendingReviewCount,
        overdueReviewCount,
        staleDays,
        riskScore,
        lastUpdatedAt,
        reasons,
      };
    })
    .filter((item): item is NonNullable<typeof item> => !!item);
}

export async function getTeamExecutionSolutionReadModel(
  userId: number,
  filters: TeamExecutionFilters,
  range: { startDate: string; endDate: string }
): Promise<TeamExecutionSolutionReadModel> {
  const empty = buildEmptyTeamExecutionSolutionReadModel(filters);
  const scope = await loadTeamExecutionScope(userId);

  if (scope.projectRows.length === 0) {
    return {
      ...empty,
      window: buildWindow(filters.range, range.startDate, range.endDate),
    };
  }

  const today = parseDate(range.endDate) || new Date();
  const solutions = await buildSolutionExecutionStats(scope, filters, today);
  const statusLabelMap: Record<string, string> = {
    draft: '草稿',
    review: '审核中',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '已驳回',
    published: '已发布',
  };

  const statusDistribution = Array.from(
    solutions.reduce((groupMap, solution) => {
      const status = solution.status || 'unknown';
      const current = groupMap.get(status) || {
        status,
        label: statusLabelMap[status] || status,
        count: 0,
        pendingReviewCount: 0,
      };

      current.count += 1;
      current.pendingReviewCount += solution.pendingReviewCount;
      groupMap.set(status, current);
      return groupMap;
    }, new Map<string, {
      status: string;
      label: string;
      count: number;
      pendingReviewCount: number;
    }>())
  )
    .map(([, group]) => group)
    .sort((left, right) => right.count - left.count || right.pendingReviewCount - left.pendingReviewCount)
    .slice(0, 6);

  const sortedSolutions = [...solutions].sort(
    (left, right) => right.riskScore - left.riskScore || right.overdueReviewCount - left.overdueReviewCount || right.pendingReviewCount - left.pendingReviewCount
  );

  return {
    filtersEcho: filters,
    window: buildWindow(filters.range, range.startDate, range.endDate),
    overview: {
      totalSolutions: solutions.length,
      reviewingSolutions: solutions.filter((solution) => solution.status === 'reviewing' || solution.status === 'review').length,
      overdueReviews: solutions.reduce((total, solution) => total + solution.overdueReviewCount, 0),
      staleSolutions: solutions.filter((solution) => solution.staleDays >= 14).length,
    },
    statusDistribution,
    pressureRanking: sortedSolutions.slice(0, 8).map((solution) => ({
      solutionId: solution.solutionId,
      solutionName: solution.solutionName,
      solutionTypeName: solution.solutionTypeName,
      version: solution.version,
      status: solution.status,
      approvalStatus: solution.approvalStatus,
      relatedProjectCount: solution.relatedProjectCount,
      pendingReviewCount: solution.pendingReviewCount,
      overdueReviewCount: solution.overdueReviewCount,
      staleDays: solution.staleDays,
      riskScore: solution.riskScore,
      lastUpdatedAt: formatDateTime(solution.lastUpdatedAt),
      reasons: solution.reasons,
    })),
    details: sortedSolutions.slice(0, 24).map((solution) => ({
      solutionId: solution.solutionId,
      solutionName: solution.solutionName,
      solutionTypeName: solution.solutionTypeName,
      version: solution.version,
      status: solution.status,
      approvalStatus: solution.approvalStatus,
      ownerName: solution.ownerName,
      reviewerName: solution.reviewerName,
      relatedProjectCount: solution.relatedProjectCount,
      pendingReviewCount: solution.pendingReviewCount,
      overdueReviewCount: solution.overdueReviewCount,
      staleDays: solution.staleDays,
      riskScore: solution.riskScore,
      lastUpdatedAt: formatDateTime(solution.lastUpdatedAt),
      reasons: solution.reasons,
    })),
  };
}