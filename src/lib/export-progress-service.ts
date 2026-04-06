/**
 * 导出进度服务
 * 用于跟踪和管理大数据量导出的进度
 */

// 导出任务状态
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 导出任务
export interface ExportTask {
  id: string;
  type: 'customers' | 'projects' | 'opportunities' | 'staff' | 'custom';
  status: ExportStatus;
  total: number;
  processed: number;
  progress: number; // 0-100
  fileName: string;
  fileUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// 导出任务管理器（内存存储，生产环境应使用 Redis）
class ExportTaskManager {
  private tasks: Map<string, ExportTask> = new Map();
  private maxTasks = 100; // 最多保留100个任务记录

  /**
   * 创建导出任务
   */
  createTask(type: ExportTask['type'], total: number, fileName: string): ExportTask {
    const id = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task: ExportTask = {
      id,
      type,
      status: 'pending',
      total,
      processed: 0,
      progress: 0,
      fileName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(id, task);
    this.cleanup();
    
    return task;
  }

  /**
   * 获取任务
   */
  getTask(id: string): ExportTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * 更新任务进度
   */
  updateProgress(id: string, processed: number): ExportTask | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    task.processed = processed;
    task.progress = Math.round((processed / task.total) * 100);
    task.status = 'processing';
    task.updatedAt = new Date();

    this.tasks.set(id, task);
    return task;
  }

  /**
   * 标记任务完成
   */
  completeTask(id: string, fileUrl: string): ExportTask | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    task.status = 'completed';
    task.progress = 100;
    task.processed = task.total;
    task.fileUrl = fileUrl;
    task.completedAt = new Date();
    task.updatedAt = new Date();

    this.tasks.set(id, task);
    return task;
  }

  /**
   * 标记任务失败
   */
  failTask(id: string, error: string): ExportTask | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    task.status = 'failed';
    task.error = error;
    task.updatedAt = new Date();

    this.tasks.set(id, task);
    return task;
  }

  /**
   * 删除任务
   */
  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  /**
   * 获取用户的所有任务
   */
  getUserTasks(userId: number): ExportTask[] {
    // 在实际实现中，应该根据 userId 过滤
    // 这里简化为返回所有任务
    return Array.from(this.tasks.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 清理过期任务
   */
  private cleanup() {
    if (this.tasks.size <= this.maxTasks) return;

    // 删除最旧的任务
    const sortedTasks = Array.from(this.tasks.values())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const toDelete = sortedTasks.slice(0, this.tasks.size - this.maxTasks);
    toDelete.forEach(task => this.tasks.delete(task.id));
  }
}

// 导出单例实例
export const exportTaskManager = new ExportTaskManager();

/**
 * 导出字段配置
 */
export interface ExportField {
  key: string;
  label: string;
  width: number;
  visible: boolean;
  sortable?: boolean;
  formatter?: (value: any) => string;
}

/**
 * 导出字段管理
 */
export const EXPORT_FIELD_CONFIGS: Record<string, ExportField[]> = {
  customers: [
    { key: 'customerId', label: '客户编号', width: 15, visible: true },
    { key: 'customerName', label: '客户名称', width: 25, visible: true },
    { key: 'customerType', label: '客户类型', width: 12, visible: true },
    { key: 'region', label: '所属区域', width: 12, visible: true },
    { key: 'contactName', label: '联系人', width: 12, visible: true },
    { key: 'contactPhone', label: '联系电话', width: 15, visible: true },
    { key: 'contactEmail', label: '联系邮箱', width: 20, visible: true },
    { key: 'address', label: '详细地址', width: 30, visible: true },
    { key: 'status', label: '客户状态', width: 10, visible: true },
    { key: 'totalAmount', label: '历史成交金额', width: 15, visible: true },
    { key: 'currentProjectCount', label: '当前项目数', width: 12, visible: true },
    { key: 'description', label: '客户描述', width: 30, visible: false },
    { key: 'createdAt', label: '创建时间', width: 18, visible: true },
    { key: 'updatedAt', label: '更新时间', width: 18, visible: false },
  ],
  projects: [
    { key: 'projectCode', label: '项目编号', width: 15, visible: true },
    { key: 'projectName', label: '项目名称', width: 25, visible: true },
    { key: 'customerName', label: '客户名称', width: 20, visible: true },
    { key: 'projectType', label: '项目类型', width: 12, visible: true },
    { key: 'status', label: '项目状态', width: 10, visible: true },
    { key: 'priority', label: '优先级', width: 10, visible: true },
    { key: 'budget', label: '预算金额', width: 15, visible: true },
    { key: 'ownerName', label: '负责人', width: 12, visible: true },
    { key: 'startDate', label: '开始日期', width: 12, visible: true },
    { key: 'expectedCloseDate', label: '预计结单日期', width: 12, visible: true },
    { key: 'description', label: '项目描述', width: 30, visible: false },
    { key: 'createdAt', label: '创建时间', width: 18, visible: true },
  ],
  opportunities: [
    { key: 'opportunityId', label: '商机编号', width: 15, visible: true },
    { key: 'projectName', label: '项目名称', width: 25, visible: true },
    { key: 'customerName', label: '客户名称', width: 20, visible: true },
    { key: 'status', label: '商机阶段', width: 12, visible: true },
    { key: 'estimatedAmount', label: '预计金额', width: 15, visible: true },
    { key: 'probability', label: '成单概率', width: 10, visible: true },
    { key: 'ownerName', label: '负责人', width: 12, visible: true },
    { key: 'expectedCloseDate', label: '预计成交日期', width: 12, visible: true },
    { key: 'demandDescription', label: '需求描述', width: 30, visible: false },
    { key: 'createdAt', label: '创建时间', width: 18, visible: true },
  ],
  staff: [
    { key: 'employeeId', label: '工号', width: 12, visible: true },
    { key: 'realName', label: '姓名', width: 12, visible: true },
    { key: 'username', label: '用户名', width: 15, visible: true },
    { key: 'department', label: '部门', width: 15, visible: true },
    { key: 'position', label: '职位', width: 15, visible: true },
    { key: 'email', label: '邮箱', width: 20, visible: true },
    { key: 'phone', label: '电话', width: 15, visible: true },
    { key: 'status', label: '状态', width: 10, visible: true },
    { key: 'lastLoginTime', label: '最后登录', width: 18, visible: true },
    { key: 'createdAt', label: '创建时间', width: 18, visible: true },
  ],
};

/**
 * 导出模板
 */
export interface ExportTemplate {
  id: string;
  name: string;
  type: string;
  fields: ExportField[];
  format: 'xlsx' | 'csv' | 'pdf';
  isDefault?: boolean;
  createdAt: Date;
}

// 默认导出模板
export const DEFAULT_EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'customer-full',
    name: '客户完整信息',
    type: 'customers',
    fields: EXPORT_FIELD_CONFIGS.customers,
    format: 'xlsx',
    isDefault: true,
    createdAt: new Date(),
  },
  {
    id: 'customer-simple',
    name: '客户基本信息',
    type: 'customers',
    fields: EXPORT_FIELD_CONFIGS.customers.filter(f => 
      ['customerId', 'customerName', 'contactName', 'contactPhone', 'status'].includes(f.key)
    ),
    format: 'xlsx',
    createdAt: new Date(),
  },
  {
    id: 'project-full',
    name: '项目完整信息',
    type: 'projects',
    fields: EXPORT_FIELD_CONFIGS.projects,
    format: 'xlsx',
    isDefault: true,
    createdAt: new Date(),
  },
];
