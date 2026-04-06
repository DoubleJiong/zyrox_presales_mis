// 系统角色枚举
export enum UserRole {
  ADMIN = 'admin', // 系统管理员
  SALES_MANAGER = 'sales_manager', // 售前主管
  SALES_ENGINEER = 'sales_engineer', // 售前工程师
  SOLUTION_ENGINEER = 'solution_engineer', // 解决方案工程师
}

// 客户信息
export interface Customer {
  id: string;
  name: string;
  industry: string;
  size: 'small' | 'medium' | 'large'; // 客户规模
  region: string; // 所在区域
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // 创建人ID
}

// 项目阶段枚举
export enum ProjectStage {
  LEAD = 'lead', // 线索
  QUALIFIED = 'qualified', // 已确认
  PROPOSAL = 'proposal', // 方案阶段
  DEMO = 'demo', // 演示阶段
  NEGOTIATION = 'negotiation', // 招标投标
  WON = 'won', // 成功
  LOST = 'lost', // 失败
  ON_HOLD = 'on_hold', // 暂停
}

// 项目信息
export interface Project {
  id: string;
  customerId: string; // 关联客户
  name: string;
  description: string;
  stage: ProjectStage;
  probability: number; // 成功概率 0-100
  expectedValue: number; // 预期价值（万元）
  actualValue: number; // 实际价值
  startDate: Date;
  expectedCloseDate: Date;
  actualCloseDate?: Date;
  assignedTo: string; // 售前负责人
  solutionEngineer?: string; // 解决方案工程师
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// 售前人员信息
export interface Staff {
  id: string;
  name: string;
  employeeId: string; // 工号
  role: UserRole;
  email: string;
  phone: string;
  department: string;
  region: string; // 负责区域
  joinDate: Date;
  skills: string[]; // 技能标签
  isActive: boolean;
  managerId?: string; // 直属主管
  createdAt: Date;
  updatedAt: Date;
}

// 绩效数据
export interface Performance {
  id: string;
  staffId: string;
  period: string; // 统计周期，格式: YYYY-MM
  projectCount: number; // 跟进项目数
  wonProjectCount: number; // 成功项目数
  wonAmount: number; // 成功金额（万元）
  proposalCount: number; // 提交方案数
  solutionCount: number; // 提交解决方案数
  demoCount: number; // 演示次数
  customerVisitCount: number; // 客户拜访次数
  score: number; // 综合评分
  rank: number; // 排名
  createdAt: Date;
  updatedAt: Date;
}

// 解决方案状态
export enum SolutionStatus {
  DRAFT = 'draft', // 草稿
  REVIEW = 'review', // 审核中
  APPROVED = 'approved', // 已通过
  REJECTED = 'rejected', // 已驳回
  PUBLISHED = 'published', // 已发布
}

// 解决方案信息
export interface Solution {
  id: string;
  title: string;
  category: string; // 解决方案分类
  summary: string;
  content: string; // Markdown 格式
  version: string; // 版本号
  status: SolutionStatus;
  authorId: string; // 作者ID
  reviewerId?: string; // 审核人ID
  tags: string[]; // 标签
  attachments: string[]; // 附件URLs
  relatedProjects: string[]; // 关联项目IDs
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

// 系统设置项
export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  category: string; // 分类
  description: string;
  isPublic: boolean; // 是否公开
  updatedAt: Date;
  updatedBy: string;
}

// 统计数据
export interface DashboardStats {
  totalCustomers: number;
  totalProjects: number;
  activeProjects: number;
  totalStaff: number;
  monthlyWonAmount: number;
  monthlyWinRate: number;
  topPerformers: Array<{
    staffId: string;
    staffName: string;
    score: number;
    wonAmount: number;
  }>;
  recentProjects: Project[];
  pendingReviews: number; // 待审核方案数
}
