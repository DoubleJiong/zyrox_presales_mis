/**
 * 任务管理类型定义
 */

// 任务状态
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// 任务优先级
export type TaskPriority = 'low' | 'medium' | 'high';

// 任务类型
export type TaskType = 
  | 'survey'      // 需求调研
  | 'design'      // 方案设计
  | 'development' // 开发实施
  | 'testing'     // 测试验收
  | 'deployment'  // 部署上线
  | 'training'    // 培训交付
  | 'other';      // 其他

// 任务数据结构
export interface Task {
  id: number;
  projectId: number;
  taskName: string;
  taskType: TaskType;
  description: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  estimatedHours: string | null;
  actualHours: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  parentId: number | null;
  parentTaskName?: string | null;
  sequence: number | null;
  createdAt: string;
  updatedAt: string;
}

// 任务统计
export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  overdue: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  byStatus?: Record<string, number>;
  byPriority?: Record<string, number>;
}

// 任务列表响应
export interface TaskListResponse {
  tasks: Task[];
  stats: TaskStats;
  board?: Record<TaskStatus, Task[]>;
  gantt?: GanttTask[];
}

// 甘特图任务
export interface GanttTask {
  id: number;
  name: string;
  start: string | null;
  end: string | null;
  progress: number;
  type: string;
  status: string;
  priority: string;
  assignee: string | null;
  assigneeId: number | null;
  parentId: number | null;
  dependencies: number[];
  color: string;
  isDisabled: boolean;
}

// 任务表单数据
export interface TaskFormData {
  taskName: string;
  taskType: TaskType;
  description?: string;
  assigneeId?: number;
  estimatedHours?: number;
  actualHours?: number;
  startDate?: string;
  dueDate?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  progress?: number;
  parentId?: number;
}

// 批量操作类型
export type BatchAction = 
  | 'updateStatus'
  | 'updatePriority'
  | 'updateAssignee'
  | 'updateDueDate'
  | 'updateSequence'
  | 'delete';

// 批量操作请求
export interface BatchRequest {
  action: BatchAction;
  taskIds: number[];
  data?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: number | null;
    dueDate?: string | null;
    sequences?: Array<{ id: number; sequence: number }>;
  };
}

// 看板列定义
export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  color: string;
}

// 任务筛选条件
export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: number;
  taskType?: TaskType;
  search?: string;
}

// 任务类型标签
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  survey: '需求调研',
  design: '方案设计',
  development: '开发实施',
  testing: '测试验收',
  deployment: '部署上线',
  training: '培训交付',
  other: '其他',
};

// 任务状态标签
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

// 任务优先级标签
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

// 看板列配置
export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'pending', title: '待处理', tasks: [], color: '#94a3b8' },
  { id: 'in_progress', title: '进行中', tasks: [], color: '#3b82f6' },
  { id: 'completed', title: '已完成', tasks: [], color: '#22c55e' },
  { id: 'cancelled', title: '已取消', tasks: [], color: '#ef4444' },
];

// 选项配置
export const TASK_STATUS_OPTIONS = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
] as const;

export const TASK_PRIORITY_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
] as const;

export const TASK_TYPE_OPTIONS = [
  { value: 'survey', label: '需求调研' },
  { value: 'design', label: '方案设计' },
  { value: 'development', label: '开发实施' },
  { value: 'testing', label: '测试验收' },
  { value: 'deployment', label: '部署上线' },
  { value: 'training', label: '培训交付' },
  { value: 'other', label: '其他' },
] as const;
