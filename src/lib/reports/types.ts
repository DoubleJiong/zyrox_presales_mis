/**
 * 周报生成器类型定义
 * 
 * 支持文字版周报自动生成，包含：
 * - 项目进度汇总
 * - 任务完成情况
 * - 风险与问题
 * - 下周计划
 */

// ============================================
// 周报基础类型
// ============================================

export enum ReportType {
  PERSONAL = 'personal',      // 个人周报
  PROJECT = 'project',        // 项目周报
  DEPARTMENT = 'department',  // 部门周报（基于角色）
}

export enum ReportStatus {
  DRAFT = 'draft',           // 草稿
  GENERATED = 'generated',    // 已生成
  REVIEWED = 'reviewed',      // 已审核
  PUBLISHED = 'published',    // 已发布
}

// ============================================
// 周报数据源
// ============================================

export interface WeeklyDataSource {
  // 项目相关
  projects: ProjectSummary[];
  
  // 任务相关
  tasks: TaskSummary[];
  
  // 商机相关
  opportunities: OpportunitySummary[];
  
  // 投标相关
  biddings: BiddingSummary[];
  
  // 知识库贡献
  knowledgeContributions: KnowledgeSummary[];
  
  // 时间范围
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface ProjectSummary {
  id: number;
  name: string;
  status: string;
  progress: number;
  managerName: string;
  startDate: Date | null;
  endDate: Date | null;
  milestoneThisWeek: string[];
  nextMilestone: string | null;
  risks: string[];
  notes: string;
}

export interface TaskSummary {
  id: number;
  title: string;
  status: string;
  priority: string;
  projectName: string;
  assigneeName: string;
  dueDate: Date | null;
  completedDate: Date | null;
  estimatedHours: number | null;
  actualHours: number | null;
  parentTaskTitle: string | null;
  deliverables: DeliverableInfo[];
}

export interface DeliverableInfo {
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: Date | null;
}

export interface OpportunitySummary {
  id: number;
  name: string;
  customerName: string;
  stage: string;
  amount: number | null;
  probability: number | null;
  expectedCloseDate: Date | null;
  contactPerson: string | null;
  notes: string;
}

export interface BiddingSummary {
  id: number;
  projectName: string;
  customerName: string;
  status: string;
  bidDeadline: Date | null;
  openDate: Date | null;
  bidAmount: number | null;
  winProbability: number | null;
  notes: string;
}

export interface KnowledgeSummary {
  id: number;
  title: string;
  type: string;
  authorName: string;
  createdAt: Date;
  viewCount: number;
  likeCount: number;
}

// ============================================
// 周报结构
// ============================================

export interface WeeklyReport {
  // 基础信息
  id?: number;
  type: ReportType;
  status: ReportStatus;
  
  // 报告人和时间
  reporterId: number;
  reporterName: string;
  roleId?: number;
  roleName?: string;
  
  // 时间范围
  weekNumber: number;        // 第几周
  year: number;
  startDate: Date;
  endDate: Date;
  
  // 内容
  content: WeeklyReportContent;
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: number;
  publishedAt?: Date;
}

export interface WeeklyReportContent {
  // 一、本周工作总结
  summary: ReportSection;
  
  // 二、项目进度
  projectProgress: ReportSection;
  
  // 三、任务完成情况
  taskCompletion: ReportSection;
  
  // 四、商机跟进
  opportunityTracking: ReportSection;
  
  // 五、投标进展
  biddingProgress: ReportSection;
  
  // 六、风险与问题
  risksAndIssues: ReportSection;
  
  // 七、下周工作计划
  nextWeekPlan: ReportSection;
  
  // 八、需要协调的事项
  coordinationNeeded: ReportSection;
  
  // 统计数据
  statistics: ReportStatistics;
}

export interface ReportSection {
  title: string;
  content: string;          // Markdown 格式
  bulletPoints?: string[];
  highlight?: boolean;
}

export interface ReportStatistics {
  // 项目统计
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  
  // 任务统计
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  
  // 工时统计
  totalEstimatedHours: number;
  totalActualHours: number;
  utilizationRate: number;
  
  // 商机统计
  totalOpportunities: number;
  newOpportunities: number;
  wonOpportunities: number;
  pipelineValue: number;
  
  // 投标统计
  totalBiddings: number;
  submittedBiddings: number;
  wonBiddings: number;
  
  // 知识贡献
  knowledgeCount: number;
  totalViews: number;
  totalLikes: number;
}

// ============================================
// 报告生成配置
// ============================================

export interface ReportGeneratorConfig {
  // 报告类型
  type: ReportType;
  
  // 时间范围
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  // 是否自动生成
  autoGenerate?: boolean;
  
  // 包含的内容模块
  modules?: ReportModule[];
  
  // 排除的数据
  excludeFilters?: {
    projectIds?: number[];
    taskIds?: number[];
  };
  
  // 输出格式
  outputFormat?: 'markdown' | 'html' | 'text';
}

export type ReportModule = keyof Omit<WeeklyReportContent, 'statistics'>;

// ============================================
// 报告模板
// ============================================

export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  modules: ReportModule[];
  customPrompts?: Record<string, string>;
}

// ============================================
// 订阅配置
// ============================================

export interface ReportSubscription {
  id?: number;
  reportType: 'daily' | 'weekly' | 'monthly';
  deliveryMethod: 'email' | 'webhook' | 'in-app';
  recipients: string[];
  schedule: {
    dayOfWeek?: number;      // 0-6 (周日-周六)
    hour: number;
    minute: number;
  };
  filters?: {
    projectIds?: number[];
    userIds?: number[];
    tags?: string[];
  };
  enabled: boolean;
}
