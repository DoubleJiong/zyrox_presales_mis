import {
  Customer,
  Project,
  Staff,
  Performance,
  Solution,
  SystemSetting,
  UserRole,
  ProjectStage,
  SolutionStatus,
  DashboardStats,
} from '@/types';

// 模拟客户数据
export const mockCustomers: Customer[] = [
  {
    id: '1',
    name: '浙江电力公司',
    industry: '能源',
    size: 'large',
    region: '华东',
    contactPerson: '张总',
    contactPhone: '13800138001',
    contactEmail: 'zhang@zhejiangpower.com',
    address: '浙江省杭州市西湖区',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-20'),
    createdBy: 'admin',
  },
  {
    id: '2',
    name: '上海交通大学',
    industry: '教育',
    size: 'large',
    region: '华东',
    contactPerson: '李主任',
    contactPhone: '13800138002',
    contactEmail: 'li@sjtu.edu.cn',
    address: '上海市闵行区东川路',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-03-10'),
    createdBy: 'admin',
  },
  {
    id: '3',
    name: '深圳科技集团',
    industry: '制造业',
    size: 'medium',
    region: '华南',
    contactPerson: '王经理',
    contactPhone: '13800138003',
    contactEmail: 'wang@sztech.com',
    address: '深圳市南山区科技园',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-15'),
    createdBy: 'staff-1',
  },
];

// 模拟项目数据
export const mockProjects: Project[] = [
  {
    id: '1',
    customerId: '1',
    name: '智慧校园一卡通系统',
    description: '为浙江电力公司提供完整的智慧校园解决方案',
    stage: ProjectStage.NEGOTIATION,
    probability: 80,
    expectedValue: 500,
    actualValue: 0,
    startDate: new Date('2024-01-20'),
    expectedCloseDate: new Date('2024-04-30'),
    assignedTo: 'staff-1',
    solutionEngineer: 'staff-3',
    createdAt: new Date('2024-01-20'),
    createdBy: 'admin',
    updatedAt: new Date('2024-03-20'),
  },
  {
    id: '2',
    customerId: '2',
    name: '校园移动支付平台',
    description: '为上海交通大学提供校园移动支付解决方案',
    stage: ProjectStage.DEMO,
    probability: 70,
    expectedValue: 800,
    actualValue: 0,
    startDate: new Date('2024-02-10'),
    expectedCloseDate: new Date('2024-06-30'),
    assignedTo: 'staff-2',
    solutionEngineer: 'staff-3',
    createdAt: new Date('2024-02-10'),
    createdBy: 'admin',
    updatedAt: new Date('2024-03-18'),
  },
  {
    id: '3',
    customerId: '3',
    name: '工厂考勤管理系统',
    description: '为深圳科技集团提供工厂考勤管理解决方案',
    stage: ProjectStage.PROPOSAL,
    probability: 60,
    expectedValue: 200,
    actualValue: 0,
    startDate: new Date('2024-03-06'),
    expectedCloseDate: new Date('2024-05-31'),
    assignedTo: 'staff-2',
    createdAt: new Date('2024-03-06'),
    createdBy: 'staff-1',
    updatedAt: new Date('2024-03-16'),
  },
];

// 模拟人员数据
export const mockStaff: Staff[] = [
  {
    id: 'staff-1',
    name: '李明',
    employeeId: 'PRE001',
    role: UserRole.SALES_ENGINEER,
    email: 'liming@company.com',
    phone: '13911110001',
    department: '华东区',
    region: '华东',
    joinDate: new Date('2022-03-15'),
    skills: ['智慧校园', '一卡通', '移动支付'],
    isActive: true,
    managerId: 'manager-1',
    createdAt: new Date('2022-03-15'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: 'staff-2',
    name: '王芳',
    employeeId: 'PRE002',
    role: UserRole.SALES_ENGINEER,
    email: 'wangfang@company.com',
    phone: '13911110002',
    department: '华南区',
    region: '华南',
    joinDate: new Date('2021-06-20'),
    skills: ['工厂管理', '考勤系统', '门禁系统'],
    isActive: true,
    managerId: 'manager-2',
    createdAt: new Date('2021-06-20'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: 'staff-3',
    name: '陈伟',
    employeeId: 'SOL001',
    role: UserRole.SOLUTION_ENGINEER,
    email: 'chenwei@company.com',
    phone: '13911110003',
    department: '解决方案部',
    region: '全国',
    joinDate: new Date('2020-09-01'),
    skills: ['架构设计', '技术方案', '系统集成'],
    isActive: true,
    createdAt: new Date('2020-09-01'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: 'manager-1',
    name: '张强',
    employeeId: 'MGR001',
    role: UserRole.SALES_MANAGER,
    email: 'zhangqiang@company.com',
    phone: '13911110004',
    department: '华东区',
    region: '华东',
    joinDate: new Date('2019-01-10'),
    skills: ['团队管理', '销售策略', '客户关系'],
    isActive: true,
    createdAt: new Date('2019-01-10'),
    updatedAt: new Date('2024-03-01'),
  },
];

// 模拟绩效数据
export const mockPerformance: Performance[] = [
  {
    id: 'perf-1',
    staffId: 'staff-1',
    period: '2024-03',
    projectCount: 5,
    wonProjectCount: 2,
    wonAmount: 600,
    proposalCount: 4,
    solutionCount: 2,
    demoCount: 6,
    customerVisitCount: 12,
    score: 85,
    rank: 2,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-04-01'),
  },
  {
    id: 'perf-2',
    staffId: 'staff-2',
    period: '2024-03',
    projectCount: 4,
    wonProjectCount: 1,
    wonAmount: 300,
    proposalCount: 3,
    solutionCount: 1,
    demoCount: 4,
    customerVisitCount: 8,
    score: 78,
    rank: 3,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-04-01'),
  },
];

// 模拟解决方案数据
export const mockSolutions: Solution[] = [
  {
    id: 'sol-1',
    title: '智慧校园一卡通解决方案 v2.0',
    category: '智慧校园',
    summary: '基于云计算和物联网技术的现代化校园一卡通系统',
    content: `# 智慧校园一卡通解决方案 v2.0

## 方案概述
本方案采用最新的云计算、物联网和移动支付技术，为教育机构提供全方位的智慧校园服务。

## 核心功能
- 校园一卡通管理
- 移动支付平台
- 门禁考勤系统
- 图书馆借阅管理

## 技术架构
采用微服务架构，支持高并发和弹性扩展。`,
    version: '2.0',
    status: SolutionStatus.PUBLISHED,
    authorId: 'staff-3',
    tags: ['智慧校园', '一卡通', '移动支付'],
    attachments: [],
    relatedProjects: ['1'],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-03-15'),
    publishedAt: new Date('2024-03-10'),
  },
  {
    id: 'sol-2',
    title: '企业考勤管理系统',
    category: '企业管理',
    summary: '支持多门店、多班次的企业考勤管理解决方案',
    content: `# 企业考勤管理系统

## 方案概述
为企业提供智能化考勤管理，支持多种打卡方式和灵活的排班管理。`,
    version: '1.0',
    status: SolutionStatus.REVIEW,
    authorId: 'staff-3',
    tags: ['考勤', '企业管理', 'HR'],
    attachments: [],
    relatedProjects: ['3'],
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-18'),
  },
];

// 模拟系统设置
export const mockSettings: SystemSetting[] = [
  {
    id: 'set-1',
    key: 'company.name',
    value: '正元智慧科技股份有限公司',
    category: 'company',
    description: '公司名称',
    isPublic: true,
    updatedAt: new Date('2024-01-01'),
    updatedBy: 'admin',
  },
  {
    id: 'set-2',
    key: 'performance.threshold',
    value: '80',
    category: 'performance',
    description: '绩效评分达标阈值',
    isPublic: false,
    updatedAt: new Date('2024-01-01'),
    updatedBy: 'admin',
  },
];

// 模拟仪表盘数据
export const mockDashboardStats: DashboardStats = {
  totalCustomers: 3,
  totalProjects: 3,
  activeProjects: 2,
  totalStaff: 4,
  monthlyWonAmount: 900,
  monthlyWinRate: 66.7,
  topPerformers: [
    {
      staffId: 'staff-1',
      staffName: '李明',
      score: 85,
      wonAmount: 600,
    },
    {
      staffId: 'staff-2',
      staffName: '王芳',
      score: 78,
      wonAmount: 300,
    },
  ],
  recentProjects: mockProjects.slice(0, 3),
  pendingReviews: 1,
};

// 数据操作工具类
export class DataStore {
  private static instance: DataStore;

  private constructor() {}

  static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  // 客户数据操作
  getCustomers(): Customer[] {
    return mockCustomers;
  }

  getCustomerById(id: string): Customer | undefined {
    return mockCustomers.find(c => c.id === id);
  }

  // 项目数据操作
  getProjects(): Project[] {
    return mockProjects;
  }

  getProjectById(id: string): Project | undefined {
    return mockProjects.find(p => p.id === id);
  }

  getProjectsByStage(stage: ProjectStage): Project[] {
    return mockProjects.filter(p => p.stage === stage);
  }

  // 人员数据操作
  getStaff(): Staff[] {
    return mockStaff;
  }

  getStaffById(id: string): Staff | undefined {
    return mockStaff.find(s => s.id === id);
  }

  getStaffByRole(role: UserRole): Staff[] {
    return mockStaff.filter(s => s.role === role);
  }

  // 绩效数据操作
  getPerformance(): Performance[] {
    return mockPerformance;
  }

  getPerformanceByPeriod(period: string): Performance[] {
    return mockPerformance.filter(p => p.period === period);
  }

  // 解决方案数据操作
  getSolutions(): Solution[] {
    return mockSolutions;
  }

  getSolutionById(id: string): Solution | undefined {
    return mockSolutions.find(s => s.id === id);
  }

  getSolutionsByStatus(status: SolutionStatus): Solution[] {
    return mockSolutions.filter(s => s.status === status);
  }

  // 系统设置操作
  getSettings(): SystemSetting[] {
    return mockSettings;
  }

  getSettingByKey(key: string): SystemSetting | undefined {
    return mockSettings.find(s => s.key === key);
  }

  // 仪表盘数据
  getDashboardStats(): DashboardStats {
    return mockDashboardStats;
  }
}
