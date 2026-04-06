/**
 * 数据字典配置文件
 * 
 * 【重要说明】
 * 本文件中的字典配置仅供参考和初始化使用。
 * 系统运行时，所有下拉选项数据均从数据库读取（通过 DictSelect 组件）。
 * 
 * 数据权威来源：数据库 sys_dictionary_type 和 sys_dictionary_item 表
 * 数据获取方式：/api/dictionary/options?categories={category}
 * 
 * 本文件的作用：
 * 1. 记录系统中使用的字典分类和字典项
 * 2. 初始化数据库字典数据（通过 /api/dictionary/sync 接口）
 * 3. 代码参考和文档用途
 */

// ============================================
// 字典分类定义
// ============================================

export interface DictCategoryConfig {
  code: string;
  name: string;
  description: string;
  icon: string;
  isSystem: boolean;
}

export const DICT_CATEGORIES: DictCategoryConfig[] = [
  // 客户管理相关
  {
    code: 'customer_status',
      name: '客户状态',
      description: '客户的当前跟进状态',
      icon: 'CircleDot',
      isSystem: true,
    },
  {
    code: 'demand_type',
    name: '需求类型',
    description: '客户需求类型分类',
    icon: 'FileText',
    isSystem: true,
  },
  {
    code: 'intent_level',
    name: '意向等级',
    description: '客户购买意向等级',
    icon: 'Target',
    isSystem: true,
  },

  // 组织架构相关
  {
    code: 'department',
    name: '部门',
    description: '组织架构部门分类',
    icon: 'Building',
    isSystem: true,
  },
  {
    code: 'user_status',
    name: '用户状态',
    description: '用户账户状态',
    icon: 'CircleDot',
    isSystem: true,
  },
  {
    code: 'gender',
    name: '性别',
    description: '性别分类',
    icon: 'User',
    isSystem: true,
  },

  // 项目管理相关
  {
    code: 'project_type',
    name: '项目类型',
    description: '项目的业务类型分类',
    icon: 'FolderKanban',
    isSystem: true,
  },
  {
    code: 'project_status',
    name: '项目状态',
    description: '项目的当前进展状态',
    icon: 'CircleDot',
    isSystem: true,
  },
  {
    code: 'project_stage',
    name: '项目阶段',
    description: '项目的业务阶段（商机→投标→实施→沉淀）',
    icon: 'Layers',
    isSystem: true,
  },

  // 客户类型（原行业分类）
  {
    code: 'industry',
    name: '客户类型',
    description: '客户类型分类',
    icon: 'Building',
    isSystem: true,
  },
  {
    code: 'region',
    name: '区域',
    description: '地理区域划分',
    icon: 'MapPin',
    isSystem: true,
  },
  {
    code: 'priority',
    name: '优先级',
    description: '任务/项目优先级',
    icon: 'AlertCircle',
    isSystem: true,
  },

  // 解决方案相关
  {
    code: 'solution_type',
    name: '解决方案类型',
    description: '解决方案的类型分类',
    icon: 'FileCheck',
    isSystem: true,
  },
  {
    code: 'sub_scheme_type',
    name: '子方案类型',
    description: '子方案的类型分类',
    icon: 'Layers',
    isSystem: true,
  },
  {
    code: 'solution_status',
    name: '解决方案状态',
    description: '解决方案的审核发布状态',
    icon: 'CircleDot',
    isSystem: true,
  },
  {
    code: 'complexity',
    name: '复杂度',
    description: '解决方案/项目的复杂程度',
    icon: 'Gauge',
    isSystem: true,
  },

  // 商机管理
  {
    code: 'opportunity_stage',
    name: '商机阶段',
    description: '商机的跟进阶段',
    icon: 'Lightbulb',
    isSystem: true,
  },

  // 服务相关
  {
    code: 'service_type',
    name: '服务类型',
    description: '售前服务类型分类',
    icon: 'Wrench',
    isSystem: true,
  },
  {
    code: 'followup_type',
    name: '跟进类型',
    description: '客户跟进的方式类型',
    icon: 'MessageSquare',
    isSystem: true,
  },

  // 日程/待办相关
  {
    code: 'schedule_type',
    name: '日程类型',
    description: '日程安排的类型',
    icon: 'Calendar',
    isSystem: true,
  },
  {
    code: 'todo_type',
    name: '待办类型',
    description: '待办事项的类型',
    icon: 'CheckSquare',
    isSystem: true,
  },
  {
    code: 'todo_status',
    name: '待办状态',
    description: '待办事项的完成状态',
    icon: 'CircleDot',
    isSystem: true,
  },

  // 工作日志
  {
    code: 'worklog_type',
    name: '工作日志类型',
    description: '工作日志的类型分类',
    icon: 'FileText',
    isSystem: true,
  },

  // 预警相关
  {
    code: 'alert_category',
    name: '预警分类',
    description: '预警规则分类',
    icon: 'Bell',
    isSystem: true,
  },
  {
    code: 'alert_severity',
      name: '预警严重程度',
    description: '预警的严重级别',
    icon: 'AlertTriangle',
    isSystem: true,
  },
  {
    code: 'alert_status',
    name: '预警状态',
    description: '预警的处理状态',
    icon: 'CircleDot',
    isSystem: true,
  },
  {
    code: 'alert_target_type',
    name: '预警目标类型',
    description: '预警关联的目标类型',
    icon: 'Target',
    isSystem: true,
  },

  // 成员角色
  {
    code: 'member_role',
    name: '项目成员角色',
    description: '项目中的角色分工',
    icon: 'Users',
    isSystem: true,
  },

  // 招投标相关
  {
    code: 'bidding_method',
    name: '招标方式',
    description: '项目的招标方式',
    icon: 'FileText',
    isSystem: true,
  },
  {
    code: 'scoring_method',
    name: '评分办法',
    description: '投标评分办法',
    icon: 'Calculator',
    isSystem: true,
  },
  {
    code: 'fund_source',
    name: '资金来源',
    description: '项目资金来源类型',
    icon: 'Banknote',
    isSystem: true,
  },
  {
    code: 'bid_type',
    name: '投标类型',
    description: '投标的具体类型',
    icon: 'FileCheck',
    isSystem: true,
  },
  {
    code: 'bid_result',
    name: '投标结果',
    description: '投标的中标结果',
    icon: 'Trophy',
    isSystem: true,
  },
  {
    code: 'bond_status',
    name: '保证金状态',
    description: '投标保证金的缴纳状态',
    icon: 'CircleDollarSign',
    isSystem: true,
  },

  // 归档状态
  {
    code: 'archive_status',
    name: '归档状态',
    description: '项目归档的状态',
    icon: 'Archive',
    isSystem: true,
  },
];

// ============================================
// 字典项定义
// ============================================

export interface DictItemConfig {
  code: string;
  name: string;
  value?: string;
  description?: string;
  sortOrder: number;
  color?: string;
  extraData?: Record<string, any>;
}

export interface DictCategoryItems {
  category: string;
  items: DictItemConfig[];
}

// 客户状态
export const CUSTOMER_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'potential', name: '潜在', sortOrder: 1, color: 'blue' },
  { code: 'active', name: '活跃', sortOrder: 2, color: 'green' },
  { code: 'inactive', name: '非活跃', sortOrder: 3, color: 'yellow' },
  { code: 'lost', name: '已流失', sortOrder: 4, color: 'red' },
];

// 部门
export const DEPARTMENT_ITEMS: DictItemConfig[] = [
  { code: '售前部', name: '售前部', sortOrder: 1 },
  { code: '解决方案部', name: '解决方案部', sortOrder: 2 },
  { code: '销售部', name: '销售部', sortOrder: 3 },
  { code: '财务部', name: '财务部', sortOrder: 4 },
  { code: '信息技术部', name: '信息技术部', sortOrder: 5 },
];

// 用户状态
export const USER_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'active', name: '启用', sortOrder: 1, color: 'green' },
  { code: 'inactive', name: '禁用', sortOrder: 2, color: 'gray' },
];

// 性别
export const GENDER_ITEMS: DictItemConfig[] = [
  { code: '男', name: '男', sortOrder: 1 },
  { code: '女', name: '女', sortOrder: 2 },
];

// 需求类型
export const DEMAND_TYPE_ITEMS: DictItemConfig[] = [
  { code: 'software', name: '软件需求', sortOrder: 1 },
  { code: 'hardware', name: '硬件需求', sortOrder: 2 },
  { code: 'integration', name: '集成需求', sortOrder: 3 },
  { code: 'consulting', name: '咨询服务', sortOrder: 4 },
  { code: 'maintenance', name: '运维服务', sortOrder: 5 },
  { code: 'training', name: '培训服务', sortOrder: 6 },
  { code: 'other', name: '其他', sortOrder: 99 },
];

// 意向等级
export const INTENT_LEVEL_ITEMS: DictItemConfig[] = [
  { code: 'high', name: '高', sortOrder: 1, color: 'red' },
  { code: 'medium', name: '中', sortOrder: 2, color: 'yellow' },
  { code: 'low', name: '低', sortOrder: 3, color: 'gray' },
];

// 项目类型
export const PROJECT_TYPE_ITEMS: DictItemConfig[] = [
  { code: 'software', name: '软件', sortOrder: 1 },
  { code: 'integration', name: '集成', sortOrder: 2 },
  { code: 'consulting', name: '咨询', sortOrder: 3 },
  { code: 'maintenance', name: '维护', sortOrder: 4 },
  { code: 'other', name: '其他', sortOrder: 99 },
];

// 项目状态
export const PROJECT_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'lead', name: '商机线索', sortOrder: 1, color: 'gray', description: '有项目线索和消息，但是主观判断并不一定会形成项目' },
  { code: 'in_progress', name: '跟进中', sortOrder: 2, color: 'blue', description: '售前大多数项目为此状态，此状态项目涵盖整个项目生命周期，废标，重新招标的也在这个状态中' },
  { code: 'won', name: '已中标', sortOrder: 3, color: 'green', description: '从收到中标通知书开始就可改为此状态，必须填写中标金额' },
  { code: 'lost', name: '已丢标', sortOrder: 4, color: 'red', description: '项目已经丢标的明确状态' },
  { code: 'on_hold', name: '已暂停', sortOrder: 5, color: 'yellow' },
  { code: 'cancelled', name: '已取消', sortOrder: 6, color: 'gray' },
];

// 项目阶段
export const PROJECT_STAGE_ITEMS: DictItemConfig[] = [
  { code: 'opportunity', name: '商机阶段', sortOrder: 1, color: 'blue' },
  { code: 'bidding', name: '招标投标', sortOrder: 2, color: 'orange', description: '招投标阶段' },
  { code: 'execution', name: '实施阶段', sortOrder: 3, color: 'green' },
  { code: 'acceptance', name: '验收阶段', sortOrder: 4, color: 'purple' },
  { code: 'settlement', name: '结算阶段', sortOrder: 5, color: 'yellow' },
  { code: 'archived', name: '归档', sortOrder: 6, color: 'gray' },
];

// 客户类型（数据库 type_code: industry）
// 注意：此分类已改名为"客户类型"，但数据库代码保持 industry 不变
export const INDUSTRY_ITEMS: DictItemConfig[] = [
  { code: 'university', name: '高校', sortOrder: 1 },
  { code: 'government', name: '政府', sortOrder: 2 },
  { code: 'enterprise', name: '企业', sortOrder: 3 },
  { code: 'hospital', name: '医院', sortOrder: 4 },
  { code: 'k12', name: 'K12', sortOrder: 5 },
  { code: 'higher_vocational', name: '高职', sortOrder: 6 },
  { code: 'secondary_vocational', name: '中专', sortOrder: 7 },
  { code: 'military_police', name: '军警', sortOrder: 8 },
];

// 区域
export const REGION_ITEMS: DictItemConfig[] = [
  { code: '华北', name: '华北', sortOrder: 1 },
  { code: '华东', name: '华东', sortOrder: 2 },
  { code: '华南', name: '华南', sortOrder: 3 },
  { code: '华中', name: '华中', sortOrder: 4 },
  { code: '西北', name: '西北', sortOrder: 5 },
  { code: '西南', name: '西南', sortOrder: 6 },
  { code: '东北', name: '东北', sortOrder: 7 },
  { code: '港澳台', name: '港澳台', sortOrder: 8 },
  { code: '海外', name: '海外', sortOrder: 9 },
];

// 优先级
export const PRIORITY_ITEMS: DictItemConfig[] = [
  { code: 'urgent', name: '紧急', sortOrder: 1, color: 'red' },
  { code: 'high', name: '高', sortOrder: 2, color: 'orange' },
  { code: 'medium', name: '中', sortOrder: 3, color: 'blue' },
  { code: 'low', name: '低', sortOrder: 4, color: 'gray' },
];

// 解决方案类型
export const SOLUTION_TYPE_ITEMS: DictItemConfig[] = [
  { code: 'technical', name: '技术方案', sortOrder: 1 },
  { code: 'commercial', name: '商务方案', sortOrder: 2 },
  { code: 'integrated', name: '综合方案', sortOrder: 3 },
];

// 子方案类型
export const SUB_SCHEME_TYPE_ITEMS: DictItemConfig[] = [
  { code: 'technical', name: '技术方案', sortOrder: 1 },
  { code: 'business', name: '商务方案', sortOrder: 2 },
  { code: 'architecture', name: '架构方案', sortOrder: 3 },
  { code: 'implementation', name: '实施方案', sortOrder: 4 },
  { code: 'other', name: '其他', sortOrder: 99 },
];

// 解决方案状态
export const SOLUTION_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'draft', name: '草稿', sortOrder: 1, color: 'gray' },
  { code: 'reviewing', name: '审核中', sortOrder: 2, color: 'blue' },
  { code: 'approved', name: '已审核', sortOrder: 3, color: 'green' },
  { code: 'rejected', name: '已拒绝', sortOrder: 4, color: 'red' },
  { code: 'published', name: '已发布', sortOrder: 5, color: 'purple' },
];

// 复杂度
export const COMPLEXITY_ITEMS: DictItemConfig[] = [
  { code: 'low', name: '低', sortOrder: 1, color: 'green' },
  { code: 'medium', name: '中', sortOrder: 2, color: 'yellow' },
  { code: 'high', name: '高', sortOrder: 3, color: 'red' },
];

// 商机阶段
export const OPPORTUNITY_STAGE_ITEMS: DictItemConfig[] = [
  { code: 'lead', name: '线索', sortOrder: 1, color: 'gray' },
  { code: 'qualified', name: '合格线索', sortOrder: 2, color: 'blue' },
  { code: 'proposal', name: '方案报价', sortOrder: 3, color: 'yellow' },
  { code: 'negotiation', name: '招标投标', sortOrder: 4, color: 'green', description: '招投标阶段' },
];

// 服务类型
export const SERVICE_TYPE_ITEMS: DictItemConfig[] = [
  { code: 'analysis', name: '分析类', sortOrder: 1 },
  { code: 'design', name: '设计类', sortOrder: 2 },
  { code: 'presentation', name: '演示类', sortOrder: 3 },
  { code: 'negotiation', name: '谈判类', sortOrder: 4 },
];

// 跟进类型
export const FOLLOWUP_TYPE_ITEMS: DictItemConfig[] = [
  { code: 'site_visit', name: '现场拜访', sortOrder: 1 },
  { code: 'phone', name: '电话沟通', sortOrder: 2 },
  { code: 'wechat', name: '微信沟通', sortOrder: 3 },
  { code: 'email', name: '邮件沟通', sortOrder: 4 },
  { code: 'video_meeting', name: '视频会议', sortOrder: 5 },
];

// 日程类型
export const SCHEDULE_TYPE_ITEMS: DictItemConfig[] = [
  { code: 'meeting', name: '会议', sortOrder: 1 },
  { code: 'visit', name: '拜访', sortOrder: 2 },
  { code: 'call', name: '电话', sortOrder: 3 },
  { code: 'presentation', name: '演示', sortOrder: 4 },
  { code: 'online', name: '线上会议', sortOrder: 5 },
  { code: 'task', name: '任务', sortOrder: 6 },
  { code: 'reminder', name: '提醒', sortOrder: 7 },
  { code: 'other', name: '其他', sortOrder: 99 },
];

// 待办类型
export const TODO_TYPE_ITEMS: DictItemConfig[] = [
  { code: 'followup', name: '跟进', sortOrder: 1 },
  { code: 'document', name: '文档', sortOrder: 2 },
  { code: 'bidding', name: '投标', sortOrder: 3 },
  { code: 'meeting', name: '会议', sortOrder: 4 },
  { code: 'approval', name: '审批', sortOrder: 5 },
  { code: 'other', name: '其他', sortOrder: 99 },
];

// 待办状态
export const TODO_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'pending', name: '待处理', sortOrder: 1, color: 'yellow' },
  { code: 'in_progress', name: '进行中', sortOrder: 2, color: 'blue' },
  { code: 'completed', name: '已完成', sortOrder: 3, color: 'green' },
  { code: 'cancelled', name: '已取消', sortOrder: 4, color: 'gray' },
];

// 工作日志类型
export const WORKLOG_TYPE_ITEMS: DictItemConfig[] = [
  { code: 'development', name: '开发工作', sortOrder: 1 },
  { code: 'meeting', name: '会议', sortOrder: 2 },
  { code: 'visit', name: '外出拜访', sortOrder: 3 },
  { code: 'documentation', name: '文档编写', sortOrder: 4 },
  { code: 'communication', name: '沟通协调', sortOrder: 5 },
  { code: 'followup', name: '客户跟进', sortOrder: 6 },
  { code: 'bidding', name: '投标工作', sortOrder: 7 },
  { code: 'project', name: '项目执行', sortOrder: 8 },
  { code: 'other', name: '其他', sortOrder: 99 },
];

// 预警分类
export const ALERT_CATEGORY_ITEMS: DictItemConfig[] = [
  { code: 'system', name: '系统告警', sortOrder: 1 },
  { code: 'business', name: '业务告警', sortOrder: 2 },
  { code: 'security', name: '安全告警', sortOrder: 3 },
  { code: 'performance', name: '性能告警', sortOrder: 4 },
];

// 预警严重程度
export const ALERT_SEVERITY_ITEMS: DictItemConfig[] = [
  { code: 'low', name: '低', sortOrder: 1, color: 'gray' },
  { code: 'medium', name: '中', sortOrder: 2, color: 'yellow' },
  { code: 'high', name: '高', sortOrder: 3, color: 'orange' },
  { code: 'critical', name: '严重', sortOrder: 4, color: 'red' },
];

// 预警状态
export const ALERT_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'pending', name: '待处理', sortOrder: 1, color: 'yellow' },
  { code: 'acknowledged', name: '已确认', sortOrder: 2, color: 'blue' },
  { code: 'resolved', name: '已解决', sortOrder: 3, color: 'green' },
  { code: 'ignored', name: '已忽略', sortOrder: 4, color: 'gray' },
];

// 预警目标类型
export const ALERT_TARGET_TYPE_ITEMS: DictItemConfig[] = [
  { code: 'project', name: '项目', sortOrder: 1 },
  { code: 'customer', name: '客户', sortOrder: 2 },
  { code: 'user', name: '用户', sortOrder: 3 },
  { code: 'solution', name: '解决方案', sortOrder: 4 },
  { code: 'opportunity', name: '商机', sortOrder: 5 },
  { code: 'lead', name: '线索', sortOrder: 6 },
];

// 项目成员角色
export const MEMBER_ROLE_ITEMS: DictItemConfig[] = [
  { code: '项目经理', name: '项目经理', sortOrder: 1 },
  { code: '技术负责人', name: '技术负责人', sortOrder: 2 },
  { code: '售前工程师', name: '售前工程师', sortOrder: 3 },
  { code: '开发工程师', name: '开发工程师', sortOrder: 4 },
  { code: '测试工程师', name: '测试工程师', sortOrder: 5 },
  { code: '产品经理', name: '产品经理', sortOrder: 6 },
  { code: 'UI设计师', name: 'UI设计师', sortOrder: 7 },
];

// 招标方式
export const BIDDING_METHOD_ITEMS: DictItemConfig[] = [
  { code: 'public', name: '公开招标', sortOrder: 1 },
  { code: 'invitation', name: '邀请招标', sortOrder: 2 },
  { code: 'competitive', name: '竞争性谈判', sortOrder: 3 },
  { code: 'single_source', name: '单一来源', sortOrder: 4 },
  { code: 'inquiry', name: '询价采购', sortOrder: 5 },
];

// 评分办法
export const SCORING_METHOD_ITEMS: DictItemConfig[] = [
  { code: 'comprehensive', name: '综合评分法', sortOrder: 1 },
  { code: 'lowest_price', name: '最低评标价法', sortOrder: 2 },
  { code: 'performance', name: '性价比法', sortOrder: 3 },
  { code: 'technical', name: '技术评分法', sortOrder: 4 },
];

// 资金来源
export const FUND_SOURCE_ITEMS: DictItemConfig[] = [
  { code: 'government', name: '政府财政', sortOrder: 1 },
  { code: 'self_funded', name: '自筹资金', sortOrder: 2 },
  { code: 'loan', name: '银行贷款', sortOrder: 3 },
  { code: 'mixed', name: '混合资金', sortOrder: 4 },
];

// 投标类型
export const BID_TYPE_ITEMS: DictItemConfig[] = [
  { code: 'independent', name: '独立投标', sortOrder: 1 },
  { code: 'consortium', name: '联合体投标', sortOrder: 2 },
  { code: 'subcontractor', name: '分包投标', sortOrder: 3 },
];

// 投标结果
export const BID_RESULT_ITEMS: DictItemConfig[] = [
  { code: 'pending', name: '待开标', sortOrder: 1, color: 'gray' },
  { code: 'won', name: '中标', sortOrder: 2, color: 'green' },
  { code: 'lost', name: '未中标', sortOrder: 3, color: 'red' },
  { code: 'withdrawn', name: '已撤回', sortOrder: 4, color: 'yellow' },
];

// 保证金状态
export const BOND_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'unpaid', name: '未缴纳', sortOrder: 1, color: 'gray' },
  { code: 'paid', name: '已缴纳', sortOrder: 2, color: 'green' },
  { code: 'refunded', name: '已退还', sortOrder: 3, color: 'blue' },
  { code: 'forfeited', name: '已没收', sortOrder: 4, color: 'red' },
];

// 归档状态
export const ARCHIVE_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'unarchived', name: '未归档', sortOrder: 1, color: 'gray' },
  { code: 'archived', name: '已归档', sortOrder: 2, color: 'green' },
  { code: 'partial', name: '部分归档', sortOrder: 3, color: 'yellow' },
];

// ============================================
// 所有字典项汇总
// ============================================

export const ALL_DICT_ITEMS: DictCategoryItems[] = [
  // customer_type 分类已在数据库中删除，统一使用 industry（客户类型）
  { category: 'customer_status', items: CUSTOMER_STATUS_ITEMS },
  // 组织架构相关
  { category: 'department', items: DEPARTMENT_ITEMS },
  { category: 'user_status', items: USER_STATUS_ITEMS },
  { category: 'gender', items: GENDER_ITEMS },
  { category: 'demand_type', items: DEMAND_TYPE_ITEMS },
  { category: 'intent_level', items: INTENT_LEVEL_ITEMS },
  { category: 'project_type', items: PROJECT_TYPE_ITEMS },
  { category: 'project_status', items: PROJECT_STATUS_ITEMS },
  { category: 'project_stage', items: PROJECT_STAGE_ITEMS },
  { category: 'industry', items: INDUSTRY_ITEMS },
  { category: 'region', items: REGION_ITEMS },
  { category: 'priority', items: PRIORITY_ITEMS },
  { category: 'solution_type', items: SOLUTION_TYPE_ITEMS },
  { category: 'sub_scheme_type', items: SUB_SCHEME_TYPE_ITEMS },
  { category: 'solution_status', items: SOLUTION_STATUS_ITEMS },
  { category: 'complexity', items: COMPLEXITY_ITEMS },
  { category: 'opportunity_stage', items: OPPORTUNITY_STAGE_ITEMS },
  { category: 'service_type', items: SERVICE_TYPE_ITEMS },
  { category: 'followup_type', items: FOLLOWUP_TYPE_ITEMS },
  { category: 'schedule_type', items: SCHEDULE_TYPE_ITEMS },
  { category: 'todo_type', items: TODO_TYPE_ITEMS },
  { category: 'todo_status', items: TODO_STATUS_ITEMS },
  { category: 'worklog_type', items: WORKLOG_TYPE_ITEMS },
  { category: 'alert_category', items: ALERT_CATEGORY_ITEMS },
  { category: 'alert_severity', items: ALERT_SEVERITY_ITEMS },
  { category: 'alert_status', items: ALERT_STATUS_ITEMS },
  { category: 'alert_target_type', items: ALERT_TARGET_TYPE_ITEMS },
  { category: 'member_role', items: MEMBER_ROLE_ITEMS },
  { category: 'bidding_method', items: BIDDING_METHOD_ITEMS },
  { category: 'scoring_method', items: SCORING_METHOD_ITEMS },
  { category: 'fund_source', items: FUND_SOURCE_ITEMS },
  { category: 'bid_type', items: BID_TYPE_ITEMS },
  { category: 'bid_result', items: BID_RESULT_ITEMS },
  { category: 'bond_status', items: BOND_STATUS_ITEMS },
  { category: 'archive_status', items: ARCHIVE_STATUS_ITEMS },
];

// ============================================
// 辅助函数
// ============================================

/**
 * 获取字典分类配置
 */
export function getDictCategoryConfig(code: string): DictCategoryConfig | undefined {
  return DICT_CATEGORIES.find(c => c.code === code);
}

/**
 * 获取字典项配置
 */
export function getDictItemConfig(category: string, itemCode: string): DictItemConfig | undefined {
  const categoryItems = ALL_DICT_ITEMS.find(c => c.category === category);
  return categoryItems?.items.find(i => i.code === itemCode);
}

/**
 * 获取字典项的颜色
 */
export function getDictItemColor(category: string, itemCode: string): string {
  const item = getDictItemConfig(category, itemCode);
  return item?.color || 'default';
}

/**
 * 获取字典项的名称
 */
export function getDictItemName(category: string, itemCode: string): string {
  const item = getDictItemConfig(category, itemCode);
  return item?.name || itemCode;
}
