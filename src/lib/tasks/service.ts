/**
 * 任务服务基类
 * 
 * 提供任务的通用操作方法，具体任务类型可以继承此类实现特定逻辑
 */

import {
  db
} from '@/db';
import { todos, users } from '@/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import type {
  ITask,
  TaskType,
  TaskCategory,
  TaskSource,
  TaskPriority,
  TaskStatus,
  RelatedType,
  CreateTaskParams,
  TaskListItem,
} from './types';
import { TASK_TYPE_CATEGORY_MAP } from './types';

// ============================================
// 任务常量
// ============================================

/** 任务来源显示名称 */
export const TASK_SOURCE_LABELS: Record<TaskSource, string> = {
  system: '系统生成',
  leader: '领导指派',
  personal: '个人创建',
};

// ============================================
// 任务服务基类
// ============================================

export abstract class TaskService {
  protected taskType: TaskType;
  protected taskCategory: TaskCategory;

  constructor(type: TaskType, category: TaskCategory) {
    this.taskType = type;
    this.taskCategory = category;
  }

  /**
   * 获取任务类型
   */
  getTaskType(): TaskType {
    return this.taskType;
  }

  /**
   * 获取任务分类
   */
  getTaskCategory(): TaskCategory {
    return this.taskCategory;
  }

  /**
   * 创建任务（基础实现）
   */
  async create(params: CreateTaskParams): Promise<ITask> {
    const source = this.determineSource(params);
    
    const [task] = await db
      .insert(todos)
      .values({
        title: params.title,
        description: params.description,
        type: params.type,
        priority: params.priority || 'medium',
        dueDate: params.dueDate,
        dueTime: params.dueTime,
        relatedType: params.relatedType,
        relatedId: params.relatedId,
        relatedName: params.relatedName,
        assigneeId: params.assigneeId,
        creatorId: params.creatorId,
        reminder: params.reminder,
        todoStatus: 'pending',
      })
      .returning();

    return this.mapToTask(task);
  }

  /**
   * 确定任务来源
   */
  protected abstract determineSource(params: CreateTaskParams): TaskSource;

  /**
   * 获取任务详情
   */
  async getById(id: number): Promise<ITask | null> {
    const [task] = await db.select().from(todos).where(eq(todos.id, id));
    return task ? this.mapToTask(task) : null;
  }

  /**
   * 更新任务状态
   */
  async updateStatus(id: number, status: TaskStatus): Promise<ITask | null> {
    const updateData: Record<string, unknown> = {
      todoStatus: status,
      updatedAt: new Date(),
    };

    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const [task] = await db
      .update(todos)
      .set(updateData)
      .where(eq(todos.id, id))
      .returning();

    return task ? this.mapToTask(task) : null;
  }

  /**
   * 完成任务
   */
  async complete(id: number): Promise<ITask | null> {
    return this.updateStatus(id, 'completed');
  }

  /**
   * 取消任务
   */
  async cancel(id: number): Promise<ITask | null> {
    return this.updateStatus(id, 'cancelled');
  }

  /**
   * 开始处理任务
   */
  async start(id: number): Promise<ITask | null> {
    return this.updateStatus(id, 'in_progress');
  }

  /**
   * 删除任务
   */
  async delete(id: number): Promise<boolean> {
    const result = await db.delete(todos).where(eq(todos.id, id)).returning();
    return result.length > 0;
  }

  /**
   * 获取用户的任务列表
   */
  async getByAssignee(
    assigneeId: number,
    options?: {
      status?: TaskStatus[];
      type?: TaskType[];
      dueDateFrom?: string;
      dueDateTo?: string;
      limit?: number;
    }
  ): Promise<TaskListItem[]> {
    const conditions = [eq(todos.assigneeId, assigneeId)];

    if (options?.status && options.status.length > 0) {
      conditions.push(inArray(todos.todoStatus, options.status));
    }

    if (options?.type && options.type.length > 0) {
      conditions.push(inArray(todos.type, options.type as string[]));
    }

    if (options?.dueDateFrom) {
      conditions.push(sql`${todos.dueDate} >= ${options.dueDateFrom}`);
    }

    if (options?.dueDateTo) {
      conditions.push(sql`${todos.dueDate} <= ${options.dueDateTo}`);
    }

    const taskList = await db
      .select({
        task: todos,
        assignee: users,
      })
      .from(todos)
      .leftJoin(users, eq(todos.assigneeId, users.id))
      .where(and(...conditions))
      .orderBy(desc(todos.priority), todos.dueDate)
      .limit(options?.limit || 50);

    const today = new Date().toISOString().split('T')[0];

    return taskList.map(({ task, assignee }) => ({
      id: task.id,
      title: task.title,
      description: task.description || undefined,
      type: task.type as TaskType,
      typeLabel: this.getTypeLabel(task.type as TaskType),
      category: this.getCategoryFromType(task.type as TaskType),
      priority: (task.priority as TaskPriority) || 'medium',
      priorityLabel: this.getPriorityLabel((task.priority as TaskPriority) || 'medium'),
      status: task.todoStatus as TaskStatus,
      statusLabel: this.getStatusLabel(task.todoStatus as TaskStatus),
      dueDate: task.dueDate || undefined,
      dueTime: task.dueTime || undefined,
      isOverdue: task.dueDate ? task.dueDate < today && task.todoStatus === 'pending' : false,
      relatedType: task.relatedType as RelatedType | undefined,
      relatedId: task.relatedId || undefined,
      relatedName: task.relatedName || undefined,
      assigneeId: task.assigneeId,
      assigneeName: assignee?.realName || undefined,
      creatorId: task.creatorId || undefined,
      source: this.getSourceFromTask(task),
      sourceLabel: TASK_SOURCE_LABELS[this.getSourceFromTask(task)],
      createdAt: task.createdAt,
      completedAt: task.completedAt || undefined,
    }));
  }

  /**
   * 获取今日待办
   */
  async getTodayTasks(assigneeId: number): Promise<TaskListItem[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getByAssignee(assigneeId, {
      status: ['pending', 'in_progress'],
      dueDateFrom: today,
      dueDateTo: today,
    });
  }

  /**
   * 获取逾期任务
   */
  async getOverdueTasks(assigneeId: number): Promise<TaskListItem[]> {
    const today = new Date().toISOString().split('T')[0];
    const tasks = await db
      .select({
        task: todos,
        assignee: users,
      })
      .from(todos)
      .leftJoin(users, eq(todos.assigneeId, users.id))
      .where(
        and(
          eq(todos.assigneeId, assigneeId),
          inArray(todos.todoStatus, ['pending', 'in_progress']),
          sql`${todos.dueDate} < ${today}`
        )
      )
      .orderBy(todos.dueDate);

    return tasks.map(({ task, assignee }) => ({
      id: task.id,
      title: task.title,
      description: task.description || undefined,
      type: task.type as TaskType,
      typeLabel: this.getTypeLabel(task.type as TaskType),
      category: this.getCategoryFromType(task.type as TaskType),
      priority: (task.priority as TaskPriority) || 'medium',
      priorityLabel: this.getPriorityLabel((task.priority as TaskPriority) || 'medium'),
      status: task.todoStatus as TaskStatus,
      statusLabel: this.getStatusLabel(task.todoStatus as TaskStatus),
      dueDate: task.dueDate || undefined,
      dueTime: task.dueTime || undefined,
      isOverdue: true,
      relatedType: task.relatedType as RelatedType | undefined,
      relatedId: task.relatedId || undefined,
      relatedName: task.relatedName || undefined,
      assigneeId: task.assigneeId,
      assigneeName: assignee?.realName || undefined,
      creatorId: task.creatorId || undefined,
      source: this.getSourceFromTask(task),
      sourceLabel: TASK_SOURCE_LABELS[this.getSourceFromTask(task)],
      createdAt: task.createdAt,
      completedAt: task.completedAt || undefined,
    }));
  }

  /**
   * 统计任务数量
   */
  async countByAssignee(assigneeId: number, status?: TaskStatus[]): Promise<number> {
    const conditions = [eq(todos.assigneeId, assigneeId)];

    if (status && status.length > 0) {
      conditions.push(inArray(todos.todoStatus, status));
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(todos)
      .where(and(...conditions));

    return result?.count || 0;
  }

  // ============================================
  // 辅助方法
  // ============================================

  protected mapToTask(dbRecord: typeof todos.$inferSelect): ITask {
    return {
      id: dbRecord.id,
      title: dbRecord.title,
      description: dbRecord.description || undefined,
      type: dbRecord.type as TaskType,
      category: this.getCategoryFromType(dbRecord.type as TaskType),
      source: this.getSourceFromTask(dbRecord),
      priority: (dbRecord.priority as TaskPriority) || 'medium',
      status: dbRecord.todoStatus as TaskStatus,
      dueDate: dbRecord.dueDate || undefined,
      dueTime: dbRecord.dueTime || undefined,
      relatedType: dbRecord.relatedType as RelatedType | undefined,
      relatedId: dbRecord.relatedId || undefined,
      relatedName: dbRecord.relatedName || undefined,
      assigneeId: dbRecord.assigneeId,
      creatorId: dbRecord.creatorId || undefined,
      reminder: dbRecord.reminder as ITask['reminder'],
      completedAt: dbRecord.completedAt || undefined,
      createdAt: dbRecord.createdAt,
      updatedAt: dbRecord.updatedAt,
    };
  }

  protected getTypeLabel(type: TaskType): string {
    const labels: Record<string, string> = {
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
    return labels[type] || '其他';
  }

  protected getCategoryFromType(type: TaskType): TaskCategory {
    if (['approval', 'workflow', 'notification'].includes(type)) return 'system';
    if (['schedule_reminder', 'deadline_reminder', 'followup_reminder'].includes(type)) return 'reminder';
    if (['personal'].includes(type)) return 'personal';
    return 'business';
  }

  protected getPriorityLabel(priority: TaskPriority): string {
    const labels: Record<TaskPriority, string> = {
      urgent: '紧急',
      high: '高',
      medium: '中',
      low: '低',
    };
    return labels[priority] || '中';
  }

  protected getStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      pending: '待处理',
      in_progress: '进行中',
      completed: '已完成',
      cancelled: '已取消',
      deferred: '已延期',
    };
    return labels[status] || '待处理';
  }

  protected getSourceFromTask(task: typeof todos.$inferSelect): TaskSource {
    // 根据 creatorId 判断来源
    // 如果没有 creatorId，说明是系统生成
    // 如果 type 是 leader_assigned，说明是领导指派
    // 其他情况是个人创建
    if (task.type === 'leader_assigned') return 'leader';
    if (!task.creatorId) return 'system';
    if (['approval', 'workflow', 'notification', 'schedule_reminder', 'deadline_reminder', 'followup_reminder'].includes(task.type || '')) {
      return 'system';
    }
    return 'personal';
  }
}

// ============================================
// 具体任务服务实现
// ============================================

/** 系统任务服务 */
export class SystemTaskService extends TaskService {
  constructor() {
    super('approval', 'system');
  }

  protected determineSource(): TaskSource {
    return 'system';
  }
}

/** 提醒任务服务 */
export class ReminderTaskService extends TaskService {
  constructor() {
    super('schedule_reminder', 'reminder');
  }

  protected determineSource(): TaskSource {
    return 'system';
  }
}

/** 业务任务服务 */
export class BusinessTaskService extends TaskService {
  constructor(type: TaskType = 'followup') {
    super(type, 'business');
  }

  protected determineSource(params: CreateTaskParams): TaskSource {
    if (params.type === 'leader_assigned') return 'leader';
    return 'personal';
  }
}

/** 领导指派任务服务 */
export class LeaderAssignedTaskService extends BusinessTaskService {
  constructor() {
    super('leader_assigned');
  }

  async createWithAssignment(
    params: CreateTaskParams & { assignedBy: number; instruction?: string }
  ): Promise<ITask> {
    return this.create({
      ...params,
      type: 'leader_assigned',
      creatorId: params.assignedBy,
    });
  }
}

/** 个人任务服务 */
export class PersonalTaskService extends TaskService {
  constructor() {
    super('personal', 'personal');
  }

  protected determineSource(): TaskSource {
    return 'personal';
  }
}

// ============================================
// 任务服务工厂
// ============================================

export class TaskServiceFactory {
  private static services: Map<TaskType, TaskService> = new Map();

  static getService(type: TaskType): TaskService {
    if (!this.services.has(type)) {
      const category = TASK_TYPE_CATEGORY_MAP[type];
      let service: TaskService;

      switch (category) {
        case 'system':
          service = new SystemTaskService();
          break;
        case 'reminder':
          service = new ReminderTaskService();
          break;
        case 'business':
          service = type === 'leader_assigned' 
            ? new LeaderAssignedTaskService() 
            : new BusinessTaskService(type);
          break;
        case 'personal':
          service = new PersonalTaskService();
          break;
        default:
          service = new BusinessTaskService(type);
      }

      this.services.set(type, service);
    }

    return this.services.get(type)!;
  }
}
