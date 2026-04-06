import { db } from '@/db';
import {
  alertHistories,
  alertNotifications,
  follows,
  leadFollowRecords,
  messages,
  opportunities,
  projectMembers,
  projects,
  quotations,
  schedules,
  tasks,
  todos,
  users,
} from '@/db/schema';
import { and, count, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { getProjectDisplayStatusLabel } from '@/lib/project-display';
import { getAccessibleProjectIds, isSystemAdmin } from '@/lib/permissions/project';

export type ActivityType = 'opportunity' | 'project' | 'followup' | 'quotation' | 'task' | 'alert' | 'message' | 'approval' | 'system';
export type ActivityIntent = 'message-read' | 'alert-acknowledge' | 'task-complete' | 'task-defer';

export interface ActivityQuickAction {
  label: string;
  href: string;
  intent?: ActivityIntent;
  targetId?: number;
  payload?: Record<string, unknown>;
}

export interface WorkbenchActivity {
  id: string;
  type: ActivityType;
  action: string;
  title: string;
  description: string;
  actorId: number;
  actorName: string;
  actorAvatar?: string;
  relatedType?: string;
  relatedId?: number;
  relatedName?: string;
  sourceLabel?: string;
  href?: string;
  quickActions?: ActivityQuickAction[];
  createdAt: Date;
  style?: {
    icon: string;
    color: string;
    bgColor: string;
  };
  timeAgo?: string;
}

interface FocusQueueItem {
  id: string;
  source: 'todo' | 'task' | 'schedule';
  title: string;
  href: string;
  priority: string;
  meta: string;
  description: string;
}

interface WorkbenchSummaryData {
  stats: {
    pendingTodos: number;
    myTasks: number;
    pendingAlerts: number;
    unreadMessages: number;
    myProjects: number;
  };
  focusQueue: FocusQueueItem[];
  todayTodos: Array<{
    id: number;
    title: string;
    type: string;
    priority: string;
    dueDate: string | null;
    dueTime: string | null;
    todoStatus: string;
    relatedName: string | null;
  }>;
  weekSchedules: Array<{
    id: number;
    title: string;
    type: string;
    startDate: string | null;
    startTime: string | null;
    location: string | null;
    isOwner: boolean;
  }>;
  starredProjects: Array<{
    id: number;
    projectCode: string | null;
    projectName: string;
    customerName: string | null;
    status: string;
    statusLabel: string;
    progress: number;
  }>;
  inboxFeed: WorkbenchActivity[];
}

const DEFAULT_ACTIVITY_TYPES: ActivityType[] = ['opportunity', 'project', 'followup', 'quotation', 'task', 'alert', 'message'];

export function normalizeActivityTypes(rawTypes: string | null): ActivityType[] {
  const allowedTypes: ActivityType[] = ['opportunity', 'project', 'followup', 'quotation', 'task', 'alert', 'message', 'approval', 'system'];
  const parsedTypes = rawTypes?.split(',').filter((type): type is ActivityType => allowedTypes.includes(type as ActivityType));

  return parsedTypes && parsedTypes.length > 0 ? parsedTypes : DEFAULT_ACTIVITY_TYPES;
}

function buildScheduleAccessCondition(userId: number) {
  return sql`(
    ${schedules.userId} = ${userId}
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(${schedules.participants}, '[]'::jsonb)) AS participant
      WHERE (participant->>'userId')::int = ${userId}
    )
  )`;
}

function priorityScore(priority?: string | null) {
  switch (priority) {
    case 'urgent':
      return 400;
    case 'high':
      return 300;
    case 'medium':
      return 200;
    case 'low':
      return 100;
    default:
      return 150;
  }
}

function dateUrgencyScore(dateValue: string | null | undefined, today: string) {
  if (!dateValue) {
    return 10;
  }

  if (dateValue < today) {
    return 90;
  }

  if (dateValue === today) {
    return 70;
  }

  return 30;
}

function buildFocusQueue({
  todoRows,
  taskRows,
  scheduleRows,
  today,
}: {
  todoRows: any[];
  taskRows: any[];
  scheduleRows: any[];
  today: string;
}) {
  const todoItems = todoRows.map((todo) => ({
    id: `todo-${todo.id}`,
    source: 'todo' as const,
    title: todo.title,
    href: '/calendar?view=list',
    priority: todo.priority || 'medium',
    score: priorityScore(todo.priority) + dateUrgencyScore(todo.dueDate, today),
    meta: [todo.dueDate, todo.dueTime].filter(Boolean).join(' '),
    description: todo.relatedName || '待办事项',
  }));

  const taskItems = taskRows.map((task) => ({
    id: `task-${task.id}`,
    source: 'task' as const,
    title: task.taskName,
    href: '/tasks?scope=mine',
    priority: task.priority || 'medium',
    score: priorityScore(task.priority) + dateUrgencyScore(task.dueDate, today),
    meta: task.dueDate ? `截止 ${task.dueDate}` : '任务中心',
    description: task.projectName || '个人任务',
  }));

  const scheduleItems = scheduleRows.map((schedule) => ({
    id: `schedule-${schedule.id}`,
    source: 'schedule' as const,
    title: schedule.title,
    href: '/calendar?view=list',
    priority: schedule.startDate === today ? 'high' : 'medium',
    score: 180 + dateUrgencyScore(schedule.startDate, today),
    meta: [schedule.startDate, schedule.startTime].filter(Boolean).join(' '),
    description: schedule.location || '日程安排',
  }));

  return [...todoItems, ...taskItems, ...scheduleItems]
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map(({ score, ...item }) => item);
}

function getActivityStyle(type: ActivityType) {
  const styles: Record<ActivityType, { icon: string; color: string; bgColor: string }> = {
    opportunity: { icon: 'trending-up', color: 'text-green-500', bgColor: 'bg-green-500/10' },
    project: { icon: 'briefcase', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    followup: { icon: 'users', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    quotation: { icon: 'file-text', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    task: { icon: 'check-square', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
    alert: { icon: 'alert-triangle', color: 'text-red-500', bgColor: 'bg-red-500/10' },
    message: { icon: 'mail', color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
    approval: { icon: 'check-circle', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
    system: { icon: 'alert-circle', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  };

  return styles[type] || styles.system;
}

function formatTimeAgo(date: Date) {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return new Date(date).toLocaleDateString('zh-CN');
}

function getTaskStatusLabel(status: string | null | undefined) {
  const statusLabels: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };

  return statusLabels[status || ''] || '任务更新';
}

function getAlertSeverityLabel(severity: string | null | undefined) {
  const severityLabels: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重',
  };

  return severityLabels[severity || ''] || '中';
}

function getMessageTypeLabel(type: string | null | undefined) {
  const typeLabels: Record<string, string> = {
    system: '系统',
    notification: '通知',
    alert: '预警',
    reminder: '提醒',
    message: '消息',
  };

  return typeLabels[type || ''] || '消息';
}

function buildAlertTaskHref() {
  return '/tasks?scope=mine&type=alert';
}

function addDaysToDateString(dateValue: string, days: number) {
  const [year, month, day] = dateValue.split('-').map((value) => parseInt(value, 10));
  if (!year || !month || !day) {
    return dateValue;
  }

  const baseDate = new Date(Date.UTC(year, month - 1, day));
  baseDate.setUTCDate(baseDate.getUTCDate() + days);
  return baseDate.toISOString().split('T')[0];
}

function decorateActivities(activities: WorkbenchActivity[]) {
  return activities.map((activity) => ({
    ...activity,
    style: getActivityStyle(activity.type),
    timeAgo: formatTimeAgo(activity.createdAt),
  }));
}

export async function getWorkbenchInboxFeed({
  userId,
  limit,
  types = DEFAULT_ACTIVITY_TYPES,
}: {
  userId: number;
  limit: number;
  types?: ActivityType[];
}) {
  const activityFetchLimit = Math.max(limit, 10);
  const admin = await isSystemAdmin(userId);
  const accessibleProjectIds = admin ? [] : await getAccessibleProjectIds(userId);
  const activities: WorkbenchActivity[] = [];

  if (types.includes('opportunity')) {
    const opportunityConditions = [isNull(opportunities.deletedAt)];
    if (!admin) {
      opportunityConditions.push(eq(opportunities.ownerId, userId));
    }

    const opps = await db
      .select({
        id: opportunities.id,
        projectName: opportunities.projectName,
        status: opportunities.status,
        updatedAt: opportunities.updatedAt,
        ownerId: opportunities.ownerId,
        ownerName: users.realName,
      })
      .from(opportunities)
      .leftJoin(users, eq(opportunities.ownerId, users.id))
      .where(and(...opportunityConditions))
      .orderBy(desc(opportunities.updatedAt))
      .limit(activityFetchLimit);

    opps.forEach((opp) => {
      const statusLabels: Record<string, string> = {
        prospecting: '挖掘中',
        qualified: '已验证',
        proposal: '方案阶段',
        negotiation: '谈判中',
        won: '赢单',
        lost: '输单',
      };

      activities.push({
        id: `opp-${opp.id}`,
        type: 'opportunity',
        action: opp.status === 'won' ? '赢单' : opp.status === 'lost' ? '输单' : '更新商机',
        title: `${opp.ownerName || '系统'} ${statusLabels[opp.status as string] || '创建了商机'}`,
        description: opp.projectName || '',
        actorId: opp.ownerId || 0,
        actorName: opp.ownerName || '系统',
        relatedType: 'opportunity',
        relatedId: opp.id,
        relatedName: opp.projectName || undefined,
        sourceLabel: '商机',
        createdAt: opp.updatedAt || new Date(),
      });
    });
  }

  if (types.includes('project') && (admin || accessibleProjectIds.length > 0)) {
    const projectConditions = [isNull(projects.deletedAt)];
    if (!admin) {
      projectConditions.push(inArray(projects.id, accessibleProjectIds));
    }

    const projs = await db
      .select({
        id: projects.id,
        projectName: projects.projectName,
        projectStage: projects.projectStage,
        status: projects.status,
        bidResult: projects.bidResult,
        updatedAt: projects.updatedAt,
        managerId: projects.managerId,
        managerName: users.realName,
      })
      .from(projects)
      .leftJoin(users, eq(projects.managerId, users.id))
      .where(and(...projectConditions))
      .orderBy(desc(projects.updatedAt))
      .limit(activityFetchLimit);

    projs.forEach((proj) => {
      activities.push({
        id: `proj-${proj.id}`,
        type: 'project',
        action: '项目更新',
        title: `${proj.managerName || '系统'} 更新了项目状态`,
        description: `${proj.projectName} - ${getProjectDisplayStatusLabel(proj)}`,
        actorId: proj.managerId || 0,
        actorName: proj.managerName || '系统',
        relatedType: 'project',
        relatedId: proj.id,
        relatedName: proj.projectName || undefined,
        sourceLabel: '项目',
        createdAt: proj.updatedAt || new Date(),
      });
    });
  }

  if (types.includes('followup')) {
    const followConditions = [];
    if (!admin) {
      followConditions.push(eq(leadFollowRecords.followerId, userId));
    }

    const follows = await db
      .select({
        id: leadFollowRecords.id,
        followContent: leadFollowRecords.followContent,
        followTime: leadFollowRecords.followTime,
        followerId: leadFollowRecords.followerId,
        followerName: users.realName,
      })
      .from(leadFollowRecords)
      .leftJoin(users, eq(leadFollowRecords.followerId, users.id))
      .where(followConditions.length > 0 ? and(...followConditions) : undefined)
      .orderBy(desc(leadFollowRecords.followTime))
      .limit(activityFetchLimit);

    follows.forEach((follow) => {
      activities.push({
        id: `fu-${follow.id}`,
        type: 'followup',
        action: '线索跟进',
        title: `${follow.followerName || '系统'} 完成了线索跟进`,
        description: follow.followContent?.substring(0, 50) || '',
        actorId: follow.followerId || 0,
        actorName: follow.followerName || '系统',
        relatedType: 'followup',
        relatedId: follow.id,
        sourceLabel: '跟进',
        createdAt: follow.followTime || new Date(),
      });
    });
  }

  if (types.includes('quotation') && (admin || accessibleProjectIds.length > 0)) {
    const quotationConditions = [];
    if (!admin) {
      quotationConditions.push(inArray(quotations.projectId, accessibleProjectIds));
    }

    const quots = await db
      .select({
        id: quotations.id,
        quotationName: quotations.quotationName,
        quotationStatus: quotations.quotationStatus,
        updatedAt: quotations.updatedAt,
        createdBy: quotations.createdBy,
        creatorName: users.realName,
      })
      .from(quotations)
      .leftJoin(users, eq(quotations.createdBy, users.id))
      .where(quotationConditions.length > 0 ? and(...quotationConditions) : undefined)
      .orderBy(desc(quotations.updatedAt))
      .limit(activityFetchLimit);

    quots.forEach((quot) => {
      const statusLabels: Record<string, string> = {
        draft: '草稿',
        pending_approval: '待审批',
        approved: '已审批',
        rejected: '已驳回',
        sent: '已发送',
      };

      activities.push({
        id: `quot-${quot.id}`,
        type: 'quotation',
        action: '报价更新',
        title: `${quot.creatorName || '系统'} ${quot.quotationStatus === 'draft' ? '创建了报价' : '更新了报价状态'}`,
        description: `${quot.quotationName} - ${statusLabels[quot.quotationStatus as string] || quot.quotationStatus}`,
        actorId: quot.createdBy || 0,
        actorName: quot.creatorName || '系统',
        relatedType: 'quotation',
        relatedId: quot.id,
        relatedName: quot.quotationName || undefined,
        sourceLabel: '报价',
        createdAt: quot.updatedAt || new Date(),
      });
    });
  }

  if (types.includes('task')) {
    const taskRows = await db
      .select({
        id: tasks.id,
        taskName: tasks.taskName,
        status: tasks.status,
        dueDate: tasks.dueDate,
        updatedAt: tasks.updatedAt,
        assigneeId: tasks.assigneeId,
        projectName: projects.projectName,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(
        eq(tasks.assigneeId, userId),
        isNull(tasks.deletedAt),
        or(
          eq(tasks.status, 'pending'),
          eq(tasks.status, 'in_progress')
        )
      ))
      .orderBy(desc(tasks.updatedAt))
      .limit(activityFetchLimit);

    taskRows.forEach((taskItem) => {
      const quickActions: ActivityQuickAction[] = [
        {
          label: '完成任务',
          href: '/tasks?scope=mine',
          intent: 'task-complete',
          targetId: taskItem.id,
          payload: { status: 'completed', progress: 100 },
        },
      ];

      if (taskItem.dueDate) {
        quickActions.push({
          label: '延后一天',
          href: '/tasks?scope=mine',
          intent: 'task-defer',
          targetId: taskItem.id,
          payload: { dueDate: addDaysToDateString(taskItem.dueDate, 1) },
        });
      }

      quickActions.push({ label: '打开任务', href: '/tasks?scope=mine' });

      activities.push({
        id: `task-${taskItem.id}`,
        type: 'task',
        action: '任务更新',
        title: taskItem.taskName,
        description: `${taskItem.projectName || '任务中心'} - ${getTaskStatusLabel(taskItem.status)}`,
        actorId: taskItem.assigneeId || userId,
        actorName: '任务中心',
        relatedType: 'task',
        relatedId: taskItem.id,
        relatedName: taskItem.projectName || taskItem.taskName,
        sourceLabel: '任务',
        href: '/tasks?scope=mine',
        quickActions,
        createdAt: taskItem.updatedAt || new Date(),
      });
    });
  }

  if (types.includes('alert')) {
    const alertRows = await db
      .select({
        notificationId: alertNotifications.id,
        alertHistoryId: alertHistories.id,
        ruleName: alertHistories.ruleName,
        severity: alertHistories.severity,
        targetName: alertHistories.targetName,
        message: alertHistories.message,
        relatedType: alertHistories.relatedType,
        relatedId: alertHistories.relatedId,
        updatedAt: alertHistories.updatedAt,
      })
      .from(alertNotifications)
      .innerJoin(alertHistories, eq(alertNotifications.alertHistoryId, alertHistories.id))
      .where(and(
        eq(alertNotifications.recipientId, userId),
        eq(alertNotifications.status, 'pending'),
        isNull(alertNotifications.deletedAt),
        eq(alertHistories.status, 'pending'),
        isNull(alertHistories.deletedAt)
      ))
      .orderBy(desc(alertHistories.updatedAt))
      .limit(activityFetchLimit);

    alertRows.forEach((alertItem) => {
      activities.push({
        id: `alert-${alertItem.alertHistoryId}`,
        type: 'alert',
        action: '收到预警',
        title: `${getAlertSeverityLabel(alertItem.severity)}级预警：${alertItem.ruleName || alertItem.targetName || '风险提醒'}`,
        description: alertItem.message || alertItem.targetName || '请进入风险雷达处理',
        actorId: userId,
        actorName: '风险雷达',
        relatedType: alertItem.relatedType || 'alert',
        relatedId: alertItem.relatedId || alertItem.alertHistoryId,
        relatedName: alertItem.targetName || alertItem.ruleName || undefined,
        sourceLabel: '预警',
        href: alertItem.relatedType === 'task' ? buildAlertTaskHref() : '/alerts/histories?status=pending',
        quickActions: alertItem.relatedType === 'task'
          ? [
              { label: '处理任务', href: buildAlertTaskHref() },
              { label: '确认预警', href: '/alerts/histories?status=pending', intent: 'alert-acknowledge', targetId: alertItem.alertHistoryId },
              { label: '查看预警', href: '/alerts/histories?status=pending' },
            ]
          : [
              { label: '确认预警', href: '/alerts/histories?status=pending', intent: 'alert-acknowledge', targetId: alertItem.alertHistoryId },
              { label: '查看预警', href: '/alerts/histories?status=pending' },
            ],
        createdAt: alertItem.updatedAt || new Date(),
      });
    });
  }

  if (types.includes('message')) {
    const messageRows = await db
      .select({
        id: messages.id,
        title: messages.title,
        type: messages.type,
        priority: messages.priority,
        actionText: messages.actionText,
        relatedType: messages.relatedType,
        relatedId: messages.relatedId,
        relatedName: messages.relatedName,
        actionUrl: messages.actionUrl,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(and(
        eq(messages.receiverId, userId),
        eq(messages.isDeleted, false),
        eq(messages.isRead, false)
      ))
      .orderBy(desc(messages.createdAt))
      .limit(activityFetchLimit);

    messageRows.forEach((messageItem) => {
      activities.push({
        id: `msg-${messageItem.id}`,
        type: 'message',
        action: '收到消息',
        title: messageItem.title,
        description: `${getMessageTypeLabel(messageItem.type)}${messageItem.priority ? ` · ${messageItem.priority}` : ''}`,
        actorId: userId,
        actorName: '消息中心',
        relatedType: messageItem.relatedType || 'message',
        relatedId: messageItem.relatedId || messageItem.id,
        relatedName: messageItem.relatedName || messageItem.title,
        sourceLabel: '消息',
        href: messageItem.actionUrl || '/messages',
        quickActions: [
          { label: '标为已读', href: '/messages', intent: 'message-read', targetId: messageItem.id },
          { label: messageItem.actionText || '处理消息', href: messageItem.actionUrl || '/messages' },
        ],
        createdAt: messageItem.createdAt || new Date(),
      });
    });
  }

  activities.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  const limitedActivities = activities.slice(0, limit);

  return {
    list: decorateActivities(limitedActivities),
    total: activities.length,
  };
}

export async function getWorkbenchSummaryReadModel(userId: number): Promise<WorkbenchSummaryData> {
  const today = new Date().toISOString().split('T')[0];
  const nextThreeDays = new Date();
  nextThreeDays.setDate(nextThreeDays.getDate() + 3);
  const nextThreeDaysStr = nextThreeDays.toISOString().split('T')[0];

  const [pendingTodosCount] = await db
    .select({ count: count() })
    .from(todos)
    .where(and(eq(todos.assigneeId, userId), eq(todos.todoStatus, 'pending')));

  const [todaySchedulesCount] = await db
    .select({ count: count() })
    .from(schedules)
    .where(and(
      buildScheduleAccessCondition(userId),
      eq(schedules.startDate, today),
      sql`${schedules.scheduleStatus} NOT IN ('completed', 'cancelled')`
    ));

  const [pendingAlertsCount] = await db
    .select({ count: count() })
    .from(alertNotifications)
    .where(and(
      eq(alertNotifications.recipientId, userId),
      eq(alertNotifications.status, 'pending'),
      isNull(alertNotifications.deletedAt)
    ));

  const [assignedTasksCount] = await db
    .select({ count: count() })
    .from(tasks)
    .where(and(
      eq(tasks.assigneeId, userId),
      or(eq(tasks.status, 'pending'), eq(tasks.status, 'in_progress')),
      isNull(tasks.deletedAt)
    ));

  const [unreadMessagesCount] = await db
    .select({ count: count() })
    .from(messages)
    .where(and(
      eq(messages.receiverId, userId),
      eq(messages.isDeleted, false),
      eq(messages.isRead, false)
    ));

  const myProjectsResult = await db
    .select({ id: projects.id })
    .from(projects)
    .leftJoin(projectMembers, eq(projects.id, projectMembers.projectId))
    .where(and(
      or(eq(projects.managerId, userId), eq(projectMembers.userId, userId)),
      isNull(projects.deletedAt)
    ))
    .groupBy(projects.id);

  const focusTodos = await db
    .select()
    .from(todos)
    .where(and(eq(todos.assigneeId, userId), eq(todos.todoStatus, 'pending')))
    .orderBy(desc(todos.priority))
    .limit(6);

  const focusTasks = await db
    .select({
      id: tasks.id,
      taskName: tasks.taskName,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectName: projects.projectName,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(
      eq(tasks.assigneeId, userId),
      or(eq(tasks.status, 'pending'), eq(tasks.status, 'in_progress')),
      isNull(tasks.deletedAt)
    ))
    .orderBy(desc(tasks.priority), tasks.dueDate)
    .limit(6);

  const starredProjects = await db
    .select({
      followId: follows.id,
      project: {
        id: projects.id,
        projectCode: projects.projectCode,
        projectName: projects.projectName,
        customerName: projects.customerName,
        projectStage: projects.projectStage,
        status: projects.status,
        progress: projects.progress,
      },
    })
    .from(follows)
    .innerJoin(
      projects,
      and(eq(follows.targetId, projects.id), eq(follows.targetType, 'project'))
    )
    .where(and(
      eq(follows.userId, userId),
      eq(follows.followType, 'starred'),
      isNull(follows.deletedAt),
      isNull(projects.deletedAt)
    ))
    .orderBy(desc(follows.createdAt))
    .limit(5);

  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const weekSchedules = await db
    .select()
    .from(schedules)
    .where(and(
      buildScheduleAccessCondition(userId),
      gte(schedules.startDate, weekStartStr),
      lte(schedules.startDate, weekEndStr),
      sql`${schedules.scheduleStatus} NOT IN ('completed', 'cancelled')`
    ))
    .orderBy(schedules.startDate)
    .limit(8);

  const focusSchedules = await db
    .select()
    .from(schedules)
    .where(and(
      buildScheduleAccessCondition(userId),
      gte(schedules.startDate, today),
      lte(schedules.startDate, nextThreeDaysStr),
      sql`${schedules.scheduleStatus} NOT IN ('completed', 'cancelled')`
    ))
    .orderBy(schedules.startDate, schedules.startTime)
    .limit(6);

  const inboxFeed = await getWorkbenchInboxFeed({ userId, limit: 12 });
  const focusQueue = buildFocusQueue({
    todoRows: focusTodos,
    taskRows: focusTasks,
    scheduleRows: focusSchedules,
    today,
  });

  return {
    stats: {
      pendingTodos: (pendingTodosCount?.count || 0) + (todaySchedulesCount?.count || 0),
      myTasks: assignedTasksCount?.count || 0,
      pendingAlerts: pendingAlertsCount?.count || 0,
      unreadMessages: unreadMessagesCount?.count || 0,
      myProjects: myProjectsResult.length,
    },
    focusQueue,
    todayTodos: focusTodos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      type: todo.type || 'other',
      priority: todo.priority || 'medium',
      dueDate: todo.dueDate,
      dueTime: todo.dueTime,
      todoStatus: todo.todoStatus,
      relatedName: todo.relatedName,
    })),
    weekSchedules: weekSchedules.map((schedule) => ({
      id: schedule.id,
      title: schedule.title,
      type: schedule.type || 'other',
      startDate: schedule.startDate,
      startTime: schedule.startTime,
      location: schedule.location,
      isOwner: schedule.userId === userId,
    })),
    starredProjects: starredProjects.map((item) => ({
      id: item.project.id,
      projectCode: item.project.projectCode,
      projectName: item.project.projectName,
      customerName: item.project.customerName,
      status: item.project.status,
      statusLabel: getProjectDisplayStatusLabel(item.project),
      progress: item.project.progress,
    })),
    inboxFeed: inboxFeed.list,
  };
}

export function buildEmptyWorkbenchSummaryReadModel(): WorkbenchSummaryData {
  return {
    stats: {
      pendingTodos: 0,
      myTasks: 0,
      pendingAlerts: 0,
      unreadMessages: 0,
      myProjects: 0,
    },
    focusQueue: [],
    todayTodos: [],
    weekSchedules: [],
    starredProjects: [],
    inboxFeed: [],
  };
}
