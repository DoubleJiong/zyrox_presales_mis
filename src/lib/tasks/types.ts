/**
 * 任务系统类型定义
 * 
 * 任务继承体系：
 * BaseTask (基类)
 * ├── SystemTask (系统任务) - 如：审批待办、流程节点
 * ├── ReminderTask (提醒任务) - 如：日程提醒、到期提醒  
 * ├── BusinessTask (业务任务)
 * │   ├── FollowupTask (跟进任务) - 客户跟进、项目跟进
 * │   ├── BiddingTask (投标任务) - 标书编制、保证金缴纳
 * │   └── LeaderAssignedTask (领导指派任务) - 领导分派的任务
 * └── PersonalTask (个人任务) - 用户自建任务
 */

// ============================================
// 任务类型枚举
// ============================================

/** 任务来源 */
export type TaskSource = 
  | 'system'        // 系统自动生成
  | 'leader'        // 领导指派
  | 'personal';     // 个人创建

/** 任务大类 */
export type TaskCategory = 
  | 'system'        // 系统任务
  | 'reminder'      // 提醒任务
  | 'business'      // 业务任务
  | 'personal';     // 个人任务

/** 任务类型（细分） */
export type TaskType = 
  // 系统任务
  | 'approval'      // 审批待办
  | 'workflow'      // 流程节点
  | 'notification'  // 系统通知
  // 提醒任务
  | 'schedule_reminder'   // 日程提醒
  | 'deadline_reminder'   // 到期提醒
  | 'followup_reminder'   // 跟进提醒
  // 业务任务
  | 'followup'      // 客户跟进
  | 'bidding'       // 投标相关
  | 'document'      // 文档编制
  | 'meeting'       // 会议安排
  | 'presentation'  // 方案演示
  | 'visit'         // 客户拜访
  | 'leader_assigned' // 领导指派
  // 个人任务
  | 'personal';     // 个人任务

/** 任务优先级 */
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

/** 任务状态 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';

/** 关联类型 */
export type RelatedType = 'project' | 'customer' | 'opportunity' | 'solution' | 'schedule' | 'none';

// ============================================
// 任务接口定义
// ============================================

/** 任务基类接口 */
export interface ITask {
  id: number;
  title: string;
  description?: string;
  type: TaskType;
  category: TaskCategory;
  source: TaskSource;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  dueTime?: string;
  relatedType?: RelatedType;
  relatedId?: number;
  relatedName?: string;
  assigneeId: number;
  creatorId?: number;
  reminder?: {
    enabled: boolean;
    remindAt?: string;
    remindType?: 'minute' | 'hour' | 'day';
  };
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** 系统任务接口 */
export interface ISystemTask extends ITask {
  category: 'system';
  source: 'system';
  systemMetadata?: {
    workflowId?: string;
    nodeId?: string;
    triggerType?: string;
  };
}

/** 提醒任务接口 */
export interface IReminderTask extends ITask {
  category: 'reminder';
  source: 'system';
  reminderMetadata?: {
    originalEventId?: number;
    originalEventType?: string;
    remindBefore?: number;
  };
}

/** 业务任务接口 */
export interface IBusinessTask extends ITask {
  category: 'business';
  source: 'leader' | 'personal';
  businessMetadata?: {
    customerName?: string;
    projectName?: string;
    amount?: number;
    stage?: string;
  };
}

/** 领导指派任务接口 */
export interface ILeaderAssignedTask extends IBusinessTask {
  type: 'leader_assigned';
  source: 'leader';
  assignedBy: number;
  assignedAt: Date;
  deadline?: Date;
  instruction?: string;
}

/** 个人任务接口 */
export interface IPersonalTask extends ITask {
  category: 'personal';
  source: 'personal';
}

// ============================================
// 任务类型映射
// ============================================

/** 任务类型到分类的映射 */
export const TASK_TYPE_CATEGORY_MAP: Record<TaskType, TaskCategory> = {
  // 系统任务
  approval: 'system',
  workflow: 'system',
  notification: 'system',
  // 提醒任务
  schedule_reminder: 'reminder',
  deadline_reminder: 'reminder',
  followup_reminder: 'reminder',
  // 业务任务
  followup: 'business',
  bidding: 'business',
  document: 'business',
  meeting: 'business',
  presentation: 'business',
  visit: 'business',
  leader_assigned: 'business',
  // 个人任务
  personal: 'personal',
};

/** 任务类型显示名称 */
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  approval: '审批待办',
  workflow: '流程节点',
  notification: '系统通知',
  schedule_reminder: '日程提醒',
  deadline_reminder: '到期提醒',
  followup_reminder: '跟进提醒',
  followup: '客户跟进',
  bidding: '投标任务',
  document: '文档编制',
  meeting: '会议安排',
  presentation: '方案演示',
  visit: '客户拜访',
  leader_assigned: '领导指派',
  personal: '个人任务',
};

/** 任务优先级显示名称 */
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
};

/** 任务状态显示名称 */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
  deferred: '已延期',
};

// ============================================
// 任务类型守卫
// ============================================

export function isSystemTask(task: ITask): task is ISystemTask {
  return task.category === 'system';
}

export function isReminderTask(task: ITask): task is IReminderTask {
  return task.category === 'reminder';
}

export function isBusinessTask(task: ITask): task is IBusinessTask {
  return task.category === 'business';
}

export function isLeaderAssignedTask(task: ITask): task is ILeaderAssignedTask {
  return task.type === 'leader_assigned' && task.category === 'business';
}

export function isPersonalTask(task: ITask): task is IPersonalTask {
  return task.category === 'personal';
}

// ============================================
// 任务创建参数
// ============================================

/** 创建任务的基础参数 */
export interface CreateTaskParams {
  title: string;
  description?: string;
  type: TaskType;
  priority?: TaskPriority;
  dueDate?: string;
  dueTime?: string;
  relatedType?: RelatedType;
  relatedId?: number;
  relatedName?: string;
  assigneeId: number;
  creatorId?: number;
  reminder?: {
    enabled: boolean;
    remindAt?: string;
    remindType?: 'minute' | 'hour' | 'day';
  };
}

/** 创建领导指派任务的参数 */
export interface CreateLeaderAssignedTaskParams extends CreateTaskParams {
  type: 'leader_assigned';
  assignedBy: number;
  instruction?: string;
  deadline?: Date;
}

/** 创建个人任务的参数 */
export interface CreatePersonalTaskParams extends CreateTaskParams {
  type: 'personal';
}

// ============================================
// API 响应类型
// ============================================

/** 任务列表项（前端展示用） */
export interface TaskListItem {
  id: number;
  title: string;
  description?: string;
  type: TaskType;
  typeLabel: string;
  category: TaskCategory;
  priority: TaskPriority;
  priorityLabel: string;
  status: TaskStatus;
  statusLabel: string;
  dueDate?: string;
  dueTime?: string;
  isOverdue: boolean;
  relatedType?: RelatedType;
  relatedId?: number;
  relatedName?: string;
  assigneeId: number;
  assigneeName?: string;
  creatorId?: number;
  creatorName?: string;
  source: TaskSource;
  sourceLabel: string;
  createdAt: Date;
  completedAt?: Date;
}
