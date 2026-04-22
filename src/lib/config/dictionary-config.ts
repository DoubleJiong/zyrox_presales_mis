/**
 * 数据字典配置文件（统一字典改造后）
 *
 * 【重要说明】
 * 本文件是系统所有业务枚举的唯一权威定义。
 * 系统运行时，下拉选项从数据库读取（通过 DictSelect 组件）。
 * 本文件用于：
 *   1. 记录系统中使用的字典分类和字典项
 *   2. 初始化数据库字典数据（通过 /api/dictionary/sync 接口）
 *   3. 运行时回退（数据库无数据时静默降级）
 *   4. 代码参考和文档用途
 *
 * 数据权威来源：数据库 sys_attribute_category + sys_attribute 表
 * 数据获取方式：/api/dictionary/options?categories={category}
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
  /** 引用此分类的模块/字段 */
  referencedBy: string[];
}

export const DICT_CATEGORIES: DictCategoryConfig[] = [
  // ── 客户管理 ──────────────────────────────────────────────
  {
    code: 'customer_status',
    name: '客户状态',
    description: '客户的当前跟进状态',
    icon: 'CircleDot',
    isSystem: true,
    referencedBy: ['customers.status'],
  },
  {
    code: 'industry',
    name: '客户类型',
    description: '客户类型分类（原行业）',
    icon: 'Building',
    isSystem: true,
    referencedBy: ['customers.industry', 'projects.customerType'],
  },
  {
    code: 'followup_type',
    name: '跟进类型',
    description: '客户跟进的方式类型',
    icon: 'MessageSquare',
    isSystem: true,
    referencedBy: ['followups.type'],
  },

  // ── 组织架构 ──────────────────────────────────────────────
  {
    code: 'department',
    name: '部门',
    description: '组织架构部门分类',
    icon: 'Building',
    isSystem: true,
    referencedBy: ['users.department'],
  },
  {
    code: 'user_status',
    name: '用户状态',
    description: '用户账户状态',
    icon: 'CircleDot',
    isSystem: true,
    referencedBy: ['users.status'],
  },
  {
    code: 'gender',
    name: '性别',
    description: '性别分类',
    icon: 'User',
    isSystem: true,
    referencedBy: ['users.gender'],
  },

  // ── 项目管理 ──────────────────────────────────────────────
  {
    code: 'project_type',
    name: '项目类型',
    description: '项目的业务类型分类（14类，多选）',
    icon: 'FolderKanban',
    isSystem: true,
    referencedBy: ['projects.projectTypes'],
  },
  {
    code: 'project_stage',
    name: '项目阶段',
    description: '项目的业务阶段（11阶段状态机，含暂停）',
    icon: 'Layers',
    isSystem: true,
    referencedBy: ['projects.stage', 'data-screen funnel'],
  },
  {
    code: 'region',
    name: '区域',
    description: '省级行政区 + 浙江地市（42项）',
    icon: 'MapPin',
    isSystem: true,
    referencedBy: ['projects.region', 'customers.region', 'data-screen region view'],
  },
  {
    code: 'priority',
    name: '优先级',
    description: '任务/项目优先级',
    icon: 'AlertCircle',
    isSystem: true,
    referencedBy: ['projects.priority', 'tasks.priority', 'todos.priority'],
  },

  // ── 解决方案 ──────────────────────────────────────────────
  {
    code: 'solution_status',
    name: '解决方案状态',
    description: '解决方案的审核发布状态',
    icon: 'CircleDot',
    isSystem: true,
    referencedBy: ['solutions.status'],
  },

  // ── 日程/待办 ─────────────────────────────────────────────
  {
    code: 'schedule_type',
    name: '日程类型',
    description: '日程安排的类型',
    icon: 'Calendar',
    isSystem: true,
    referencedBy: ['schedules.type'],
  },
  {
    code: 'schedule_status',
    name: '日程状态',
    description: '日程的完成状态',
    icon: 'CircleDot',
    isSystem: true,
    referencedBy: ['schedules.status'],
  },
  {
    code: 'todo_status',
    name: '待办状态',
    description: '待办事项的完成状态',
    icon: 'CircleDot',
    isSystem: true,
    referencedBy: ['todos.status'],
  },
  {
    code: 'task_status',
    name: '任务状态',
    description: '任务的执行状态',
    icon: 'CircleDot',
    isSystem: true,
    referencedBy: ['tasks.status'],
  },

  // ── 预警 ──────────────────────────────────────────────────
  {
    code: 'alert_severity',
    name: '预警严重程度',
    description: '预警的严重级别',
    icon: 'AlertTriangle',
    isSystem: true,
    referencedBy: ['alerts.severity'],
  },
  {
    code: 'alert_status',
    name: '预警状态',
    description: '预警的处理状态',
    icon: 'CircleDot',
    isSystem: true,
    referencedBy: ['alerts.status'],
  },
  {
    code: 'alert_rule_type',
    name: '预警规则触发类型',
    description: '预警规则的触发方式：信号型（事件驱动）或阈值型（定时扫描）',
    icon: 'Bell',
    isSystem: true,
    referencedBy: ['alertRules.triggerType'],
  },
  {
    code: 'alert_scene_template',
    name: '预警场景模板',
    description: '内置预警场景模板，管理员选择模板后配置参数，无需编写条件表达式',
    icon: 'Bell',
    isSystem: true,
    referencedBy: ['alertRules.sceneTemplate'],
  },
  {
    code: 'alert_check_frequency',
    name: '预警检查频率',
    description: '阈值型预警规则的定时扫描频率，映射到 pg-boss cron 表达式',
    icon: 'Clock',
    isSystem: true,
    referencedBy: ['alertRules.checkFrequency'],
  },
  {
    code: 'alert_rule_status',
    name: '预警规则状态',
    description: '预警规则的启用状态',
    icon: 'CircleDot',
    isSystem: true,
    referencedBy: ['alertRules.status'],
  },
  {
    code: 'alert_history_status',
    name: '预警历史状态',
    description: '预警历史记录状态',
    icon: 'CircleDot',
    isSystem: true,
    referencedBy: ['alertHistory.status'],
  },
  {
    code: 'alert_channel',
    name: '预警通道',
    description: '预警通知的渠道类型',
    icon: 'Bell',
    isSystem: true,
    referencedBy: ['alertRules.channel'],
  },
  {
    code: 'risk_level',
    name: '风险等级',
    description: '项目/客户风险等级',
    icon: 'AlertTriangle',
    isSystem: true,
    referencedBy: ['projects.riskLevel', 'data-screen risk'],
  },

  // ── 招投标 ────────────────────────────────────────────────
  {
    code: 'bidding_method',
    name: '招标方式',
    description: '项目的招标方式',
    icon: 'FileText',
    isSystem: true,
    referencedBy: ['bids.biddingMethod'],
  },
  {
    code: 'scoring_method',
    name: '评分办法',
    description: '投标评分办法',
    icon: 'Calculator',
    isSystem: true,
    referencedBy: ['bids.scoringMethod'],
  },
  {
    code: 'fund_source',
    name: '资金来源',
    description: '项目资金来源类型（6项）',
    icon: 'Banknote',
    isSystem: true,
    referencedBy: ['projects.fundSource'],
  },
  {
    code: 'bid_result',
    name: '投标结果',
    description: '投标的中标结果',
    icon: 'Trophy',
    isSystem: true,
    referencedBy: ['bids.result'],
  },

  // ── 合同 ──────────────────────────────────────────────────
  {
    code: 'contract_status',
    name: '合同状态',
    description: '合同的生命周期状态',
    icon: 'FileCheck',
    isSystem: true,
    referencedBy: ['contracts.status'],
  },
  {
    code: 'contract_process_status',
    name: '合同流程状态',
    description: '合同审批流程状态',
    icon: 'CircleDot',
    isSystem: true,
    referencedBy: ['contracts.processStatus'],
  },
  {
    code: 'contract_sign_mode',
    name: '合同签署方式',
    description: '合同的签署方式',
    icon: 'FileText',
    isSystem: true,
    referencedBy: ['contracts.signMode'],
  },
  {
    code: 'contract_user_type',
    name: '合同甲方类型',
    description: '合同甲方的机构类型',
    icon: 'Building',
    isSystem: true,
    referencedBy: ['contracts.userType'],
  },
  {
    code: 'contract_project_category',
    name: '合同项目分类',
    description: '合同关联项目的分类',
    icon: 'FolderKanban',
    isSystem: true,
    referencedBy: ['contracts.projectCategory'],
  },
  // ── 消息中心 ──────────────────────────────────────────────
  {
    code: 'message_type',
    name: '消息类型',
    description: '消息中心的消息类型，对应 sys_message.type',
    icon: 'MessageSquare',
    isSystem: true,
    referencedBy: ['sys_message.type'],
  },
  {
    code: 'message_priority',
    name: '消息优先级',
    description: '消息中心的消息优先级，对应 sys_message.priority',
    icon: 'AlertCircle',
    isSystem: true,
    referencedBy: ['sys_message.priority'],
  },
  // ── 仲裁/绩效 ────────────────────────────────────────────
  {
    code: 'arbitration_status',
    name: '仲裁状态',
    description: '仲裁的处理状态',
    icon: 'Scale',
    isSystem: true,
    referencedBy: ['arbitrations.status'],
  },
  {
    code: 'arbitration_type',
    name: '仲裁类型',
    description: '仲裁的类型分类',
    icon: 'Scale',
    isSystem: true,
    referencedBy: ['arbitrations.type'],
  },
  {
    code: 'performance_status',
    name: '绩效状态',
    description: '绩效评估的状态',
    icon: 'BarChart',
    isSystem: true,
    referencedBy: ['performance.status'],
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

// 项目类型（14 类，多选 jsonb）
export const PROJECT_TYPE_ITEMS: DictItemConfig[] = [
  { code: 'one_card', name: '一卡通', sortOrder: 1 },
  { code: 'big_data', name: '大数据', sortOrder: 2 },
  { code: 'iot', name: '物联网', sortOrder: 3 },
  { code: 'smart_restaurant', name: '智慧餐厅', sortOrder: 4 },
  { code: 'food_safety', name: '食安', sortOrder: 5 },
  { code: 'smart_campus', name: '智慧校园', sortOrder: 6 },
  { code: 'digital_twin', name: '数字孪生', sortOrder: 7 },
  { code: 'system_integration', name: '系统集成', sortOrder: 8 },
  { code: 'security', name: '安防项目', sortOrder: 9 },
  { code: 'k12_project', name: 'K12项目', sortOrder: 10 },
  { code: 'smart_logistics', name: '数智后勤', sortOrder: 11 },
  { code: 'operation_logistics', name: '运营后勤', sortOrder: 12 },
  { code: 'innovation', name: '创新项目', sortOrder: 13 },
  { code: 'other', name: '其他类型', sortOrder: 99 },
];

// 项目阶段（11 阶段状态机，与 GOVERNED_PROJECT_STAGES 一一对应）
export const PROJECT_STAGE_ITEMS: DictItemConfig[] = [
  { code: 'opportunity', name: '商机阶段', sortOrder: 1, color: 'blue' },
  { code: 'bidding_pending', name: '投标立项待审批', sortOrder: 2, color: 'cyan' },
  { code: 'bidding', name: '招标投标', sortOrder: 3, color: 'orange' },
  { code: 'solution_review', name: '投标评标', sortOrder: 4, color: 'yellow' },
  { code: 'contract_pending', name: '合同/商务确认中', sortOrder: 5, color: 'amber' },
  { code: 'delivery_preparing', name: '执行准备中', sortOrder: 6, color: 'lime' },
  { code: 'delivering', name: '执行中', sortOrder: 7, color: 'green' },
  { code: 'settlement', name: '结算中', sortOrder: 8, color: 'teal' },
  { code: 'archived', name: '已归档', sortOrder: 9, color: 'gray' },
  { code: 'cancelled', name: '已取消', sortOrder: 10, color: 'red' },
  { code: 'suspended', name: '已暂停', sortOrder: 11, color: 'yellow', description: '项目交付暂停，可恢复' },
];

// 客户类型（数据库 type_code: industry）
export const INDUSTRY_ITEMS: DictItemConfig[] = [
  { code: 'university', name: '高校', sortOrder: 1 },
  { code: 'k12', name: 'K12', sortOrder: 2 },
  { code: 'secondary_vocational', name: '中职', sortOrder: 3 },
  { code: 'enterprise', name: '企业', sortOrder: 4 },
  { code: 'government', name: '政府', sortOrder: 5 },
  { code: 'higher_vocational', name: '其他事业单位', sortOrder: 6 },
  { code: 'military_police', name: '军警', sortOrder: 7 },
  { code: 'hospital', name: '医院', sortOrder: 8 },
];

// 区域（31 省级 + 浙江 11 地市 = 42）
export const REGION_ITEMS: DictItemConfig[] = [
  // 直辖市
  { code: 'beijing', name: '北京市', sortOrder: 1 },
  { code: 'tianjin', name: '天津市', sortOrder: 2 },
  { code: 'shanghai', name: '上海市', sortOrder: 3 },
  { code: 'chongqing', name: '重庆市', sortOrder: 4 },
  // 省（按拼音序）
  { code: 'anhui', name: '安徽省', sortOrder: 5 },
  { code: 'fujian', name: '福建省', sortOrder: 6 },
  { code: 'gansu', name: '甘肃省', sortOrder: 7 },
  { code: 'guangdong', name: '广东省', sortOrder: 8 },
  { code: 'guizhou', name: '贵州省', sortOrder: 9 },
  { code: 'hainan', name: '海南省', sortOrder: 10 },
  { code: 'hebei', name: '河北省', sortOrder: 11 },
  { code: 'heilongjiang', name: '黑龙江省', sortOrder: 12 },
  { code: 'henan', name: '河南省', sortOrder: 13 },
  { code: 'hubei', name: '湖北省', sortOrder: 14 },
  { code: 'hunan', name: '湖南省', sortOrder: 15 },
  { code: 'jiangsu', name: '江苏省', sortOrder: 16 },
  { code: 'jiangxi', name: '江西省', sortOrder: 17 },
  { code: 'jilin', name: '吉林省', sortOrder: 18 },
  { code: 'liaoning', name: '辽宁省', sortOrder: 19 },
  { code: 'qinghai', name: '青海省', sortOrder: 20 },
  { code: 'shandong', name: '山东省', sortOrder: 21 },
  { code: 'shanxi', name: '山西省', sortOrder: 22 },
  { code: 'shaanxi', name: '陕西省', sortOrder: 23 },
  { code: 'sichuan', name: '四川省', sortOrder: 24 },
  { code: 'yunnan', name: '云南省', sortOrder: 25 },
  // 自治区
  { code: 'guangxi', name: '广西壮族自治区', sortOrder: 26 },
  { code: 'neimenggu', name: '内蒙古自治区', sortOrder: 27 },
  { code: 'ningxia', name: '宁夏回族自治区', sortOrder: 28 },
  { code: 'xinjiang', name: '新疆维吾尔自治区', sortOrder: 29 },
  { code: 'xizang', name: '西藏自治区', sortOrder: 30 },
  // 特别行政区 — 台湾省不含在内（无实际业务）
  // 浙江省（含11地市展开）
  { code: 'zj_hangzhou', name: '杭州市(浙江)', sortOrder: 31 },
  { code: 'zj_ningbo', name: '宁波市(浙江)', sortOrder: 32 },
  { code: 'zj_wenzhou', name: '温州市(浙江)', sortOrder: 33 },
  { code: 'zj_jiaxing', name: '嘉兴市(浙江)', sortOrder: 34 },
  { code: 'zj_huzhou', name: '湖州市(浙江)', sortOrder: 35 },
  { code: 'zj_shaoxing', name: '绍兴市(浙江)', sortOrder: 36 },
  { code: 'zj_jinhua', name: '金华市(浙江)', sortOrder: 37 },
  { code: 'zj_quzhou', name: '衢州市(浙江)', sortOrder: 38 },
  { code: 'zj_zhoushan', name: '舟山市(浙江)', sortOrder: 39 },
  { code: 'zj_taizhou', name: '台州市(浙江)', sortOrder: 40 },
  { code: 'zj_lishui', name: '丽水市(浙江)', sortOrder: 41 },
  // 港澳
  { code: 'hongkong', name: '香港特别行政区', sortOrder: 42 },
];

// 优先级
export const PRIORITY_ITEMS: DictItemConfig[] = [
  { code: 'urgent', name: '紧急', sortOrder: 1, color: 'red' },
  { code: 'high', name: '高', sortOrder: 2, color: 'orange' },
  { code: 'medium', name: '中', sortOrder: 3, color: 'blue' },
  { code: 'low', name: '低', sortOrder: 4, color: 'gray' },
];

// 解决方案状态
export const SOLUTION_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'draft', name: '草稿', sortOrder: 1, color: 'gray' },
  { code: 'reviewing', name: '审核中', sortOrder: 2, color: 'blue' },
  { code: 'approved', name: '已审核', sortOrder: 3, color: 'green' },
  { code: 'rejected', name: '已拒绝', sortOrder: 4, color: 'red' },
  { code: 'published', name: '已发布', sortOrder: 5, color: 'purple' },
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

// 日程状态
export const SCHEDULE_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'pending', name: '待开始', sortOrder: 1, color: 'gray' },
  { code: 'in_progress', name: '进行中', sortOrder: 2, color: 'blue' },
  { code: 'completed', name: '已完成', sortOrder: 3, color: 'green' },
  { code: 'cancelled', name: '已取消', sortOrder: 4, color: 'red' },
];

// 待办状态
export const TODO_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'pending', name: '待处理', sortOrder: 1, color: 'yellow' },
  { code: 'in_progress', name: '进行中', sortOrder: 2, color: 'blue' },
  { code: 'completed', name: '已完成', sortOrder: 3, color: 'green' },
  { code: 'cancelled', name: '已取消', sortOrder: 4, color: 'gray' },
];

// 任务状态
export const TASK_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'pending', name: '待处理', sortOrder: 1, color: 'gray' },
  { code: 'in_progress', name: '进行中', sortOrder: 2, color: 'blue' },
  { code: 'completed', name: '已完成', sortOrder: 3, color: 'green' },
  { code: 'blocked', name: '受阻', sortOrder: 4, color: 'red' },
  { code: 'cancelled', name: '已取消', sortOrder: 5, color: 'gray' },
];

// 预警严重程度
export const ALERT_SEVERITY_ITEMS: DictItemConfig[] = [
  { code: 'low', name: '低', sortOrder: 1, color: 'gray' },
  { code: 'medium', name: '中', sortOrder: 2, color: 'yellow' },
  { code: 'high', name: '高', sortOrder: 3, color: 'orange' },
  { code: 'critical', name: '严重', sortOrder: 4, color: 'red' },
];

// 预警状态（bus_alert_history.status）
export const ALERT_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'pending',     name: '待处理',   sortOrder: 1, color: 'yellow' },
  { code: 'acknowledged', name: '已确认',  sortOrder: 2, color: 'blue' },
  { code: 'resolved',    name: '已解决',   sortOrder: 3, color: 'green' },
  { code: 'ignored',     name: '已忽略',   sortOrder: 4, color: 'gray' },
  { code: 'auto_closed', name: '已自动关闭', sortOrder: 5, color: 'gray',
    description: '条件已自愈，由系统自动关闭（仅阈值型预警）' },
];

// 预警规则触发类型（signal=事件驱动, threshold=定时扫描）
export const ALERT_RULE_TYPE_ITEMS: DictItemConfig[] = [
  { code: 'signal',    name: '信号型', sortOrder: 1,
    description: '由业务事件触发（如项目丢单），写操作时立即触发' },
  { code: 'threshold', name: '阈值型', sortOrder: 2,
    description: '由定时扫描触发（如项目超期），按 cron 频率周期检查' },
];

// 预警场景模板（代码固化的业务场景，用户只配参数）
export const ALERT_SCENE_TEMPLATE_ITEMS: DictItemConfig[] = [
  { code: 'project_not_updated',   name: '项目长期未更新', sortOrder: 1,
    description: '项目在 N 天内没有任何跟进记录或状态变更',
    extraData: { triggerType: 'threshold', targetType: 'project' } },
  { code: 'project_overdue',       name: '项目已超预期交付日', sortOrder: 2,
    description: '项目已超过 expectedDeliveryDate 且仍在进行中',
    extraData: { triggerType: 'threshold', targetType: 'project' } },
  { code: 'project_near_deadline', name: '项目临近截止日期', sortOrder: 3,
    description: '项目距离 expectedDeliveryDate 还有 N 天',
    extraData: { triggerType: 'threshold', targetType: 'project' } },
  { code: 'customer_inactive',     name: '客户长期未跟进', sortOrder: 4,
    description: '客户在 N 天内没有任何跟进活动记录',
    extraData: { triggerType: 'threshold', targetType: 'customer' } },
  { code: 'project_lost_signal',   name: '项目发生丢单', sortOrder: 5,
    description: '项目投标结果变为丢标，立即触发',
    extraData: { triggerType: 'signal', targetType: 'project' } },
];

// 预警检查频率（映射到 pg-boss cron 表达式）
export const ALERT_CHECK_FREQUENCY_ITEMS: DictItemConfig[] = [
  { code: 'every_15min',    name: '每15分钟', sortOrder: 1,
    extraData: { cron: '*/15 * * * *' } },
  { code: 'every_30min',    name: '每30分钟', sortOrder: 2,
    extraData: { cron: '*/30 * * * *' } },
  { code: 'hourly',         name: '每小时',   sortOrder: 3,
    extraData: { cron: '0 * * * *' } },
  { code: 'daily_morning',  name: '每天上午9点', sortOrder: 4,
    extraData: { cron: '0 9 * * *' } },
  { code: 'weekly_monday',  name: '每周一上午9点', sortOrder: 5,
    extraData: { cron: '0 9 * * 1' } },
];

// 预警规则状态
export const ALERT_RULE_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'active', name: '启用', sortOrder: 1, color: 'green' },
  { code: 'inactive', name: '停用', sortOrder: 2, color: 'gray' },
];

// 预警历史状态
export const ALERT_HISTORY_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'triggered', name: '已触发', sortOrder: 1, color: 'red' },
  { code: 'acknowledged', name: '已确认', sortOrder: 2, color: 'blue' },
  { code: 'resolved', name: '已解决', sortOrder: 3, color: 'green' },
  { code: 'expired', name: '已过期', sortOrder: 4, color: 'gray' },
];

// 预警通道
export const ALERT_CHANNEL_ITEMS: DictItemConfig[] = [
  { code: 'in_app', name: '站内消息', sortOrder: 1 },
  { code: 'email', name: '邮件', sortOrder: 2 },
  { code: 'wechat', name: '微信', sortOrder: 3 },
  { code: 'sms', name: '短信', sortOrder: 4 },
];

// 风险等级
export const RISK_LEVEL_ITEMS: DictItemConfig[] = [
  { code: 'none', name: '正常', sortOrder: 1, color: 'green' },
  { code: 'low', name: '低风险', sortOrder: 2, color: 'blue' },
  { code: 'medium', name: '需关注', sortOrder: 3, color: 'yellow' },
  { code: 'high', name: '高风险', sortOrder: 4, color: 'red' },
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

// 资金来源（6 项）
export const FUND_SOURCE_ITEMS: DictItemConfig[] = [
  { code: 'bank_investment', name: '银行投资', sortOrder: 1 },
  { code: 'operator_investment', name: '运营商投资', sortOrder: 2 },
  { code: 'fiscal', name: '财政拨款', sortOrder: 3 },
  { code: 'fire_self_funded', name: '消防自筹', sortOrder: 4 },
  { code: 'loan', name: '贷款', sortOrder: 5 },
  { code: 'mixed', name: '混合资金', sortOrder: 6 },
];

// 投标结果
export const BID_RESULT_ITEMS: DictItemConfig[] = [
  { code: 'pending', name: '待开标', sortOrder: 1, color: 'gray' },
  { code: 'won', name: '中标', sortOrder: 2, color: 'green' },
  { code: 'lost', name: '未中标', sortOrder: 3, color: 'red' },
  { code: 'withdrawn', name: '已撤回', sortOrder: 4, color: 'yellow' },
];

// 合同状态
export const CONTRACT_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'drafting', name: '起草中', sortOrder: 1, color: 'gray' },
  { code: 'reviewing', name: '审核中', sortOrder: 2, color: 'blue' },
  { code: 'signed', name: '已签署', sortOrder: 3, color: 'green' },
  { code: 'executing', name: '执行中', sortOrder: 4, color: 'cyan' },
  { code: 'completed', name: '已完结', sortOrder: 5, color: 'teal' },
  { code: 'terminated', name: '已终止', sortOrder: 6, color: 'red' },
];

// 合同流程状态
export const CONTRACT_PROCESS_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'pending', name: '待提交', sortOrder: 1, color: 'gray' },
  { code: 'submitted', name: '已提交', sortOrder: 2, color: 'blue' },
  { code: 'approved', name: '已通过', sortOrder: 3, color: 'green' },
  { code: 'rejected', name: '已驳回', sortOrder: 4, color: 'red' },
];

// 合同签署方式（占位，用户后续提供）
export const CONTRACT_SIGN_MODE_ITEMS: DictItemConfig[] = [
  { code: 'offline', name: '线下签署', sortOrder: 1 },
  { code: 'online', name: '线上签署', sortOrder: 2 },
];

// 合同甲方类型（占位，用户后续提供）
export const CONTRACT_USER_TYPE_ITEMS: DictItemConfig[] = [
  { code: 'government', name: '政府机构', sortOrder: 1 },
  { code: 'enterprise', name: '企业单位', sortOrder: 2 },
  { code: 'institution', name: '事业单位', sortOrder: 3 },
];

// 合同项目分类（占位，用户后续提供）
export const CONTRACT_PROJECT_CATEGORY_ITEMS: DictItemConfig[] = [
  { code: 'new_build', name: '新建项目', sortOrder: 1 },
  { code: 'upgrade', name: '升级改造', sortOrder: 2 },
  { code: 'maintenance', name: '运维服务', sortOrder: 3 },
];

// 仲裁状态
export const ARBITRATION_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'pending', name: '待受理', sortOrder: 1, color: 'gray' },
  { code: 'processing', name: '处理中', sortOrder: 2, color: 'blue' },
  { code: 'resolved', name: '已裁决', sortOrder: 3, color: 'green' },
  { code: 'closed', name: '已关闭', sortOrder: 4, color: 'gray' },
];

// 仲裁类型
export const ARBITRATION_TYPE_ITEMS: DictItemConfig[] = [
  { code: 'project_dispute', name: '项目争议', sortOrder: 1 },
  { code: 'contract_dispute', name: '合同争议', sortOrder: 2 },
  { code: 'performance_appeal', name: '绩效申诉', sortOrder: 3 },
];

// 绩效状态
export const PERFORMANCE_STATUS_ITEMS: DictItemConfig[] = [
  { code: 'pending', name: '待评估', sortOrder: 1, color: 'gray' },
  { code: 'evaluating', name: '评估中', sortOrder: 2, color: 'blue' },
  { code: 'completed', name: '已完成', sortOrder: 3, color: 'green' },
  { code: 'appealed', name: '已申诉', sortOrder: 4, color: 'orange' },
];

// 消息类型
export const MESSAGE_TYPE_ITEMS: DictItemConfig[] = [
  { code: 'system',   name: '系统',  sortOrder: 1, color: 'purple' },
  { code: 'task',     name: '任务',  sortOrder: 2, color: 'blue'   },
  { code: 'alert',    name: '预警',  sortOrder: 3, color: 'orange' },
  { code: 'approval', name: '审批',  sortOrder: 4, color: 'cyan'   },
  { code: 'reminder', name: '提醒',  sortOrder: 5, color: 'cyan'   },
  { code: 'mention',  name: '@提及', sortOrder: 6, color: 'green'  },
];

// 消息优先级
export const MESSAGE_PRIORITY_ITEMS: DictItemConfig[] = [
  { code: 'low',    name: '低',   sortOrder: 1, color: 'gray'   },
  { code: 'normal', name: '普通', sortOrder: 2, color: 'blue'   },
  { code: 'high',   name: '高',   sortOrder: 3, color: 'orange' },
  { code: 'urgent', name: '紧急', sortOrder: 4, color: 'red'    },
];

// ============================================
// 所有字典项汇总
// ============================================

export const ALL_DICT_ITEMS: DictCategoryItems[] = [
  // 客户管理
  { category: 'customer_status', items: CUSTOMER_STATUS_ITEMS },
  { category: 'industry', items: INDUSTRY_ITEMS },
  { category: 'followup_type', items: FOLLOWUP_TYPE_ITEMS },
  // 组织架构
  { category: 'department', items: DEPARTMENT_ITEMS },
  { category: 'user_status', items: USER_STATUS_ITEMS },
  { category: 'gender', items: GENDER_ITEMS },
  // 项目管理
  { category: 'project_type', items: PROJECT_TYPE_ITEMS },
  { category: 'project_stage', items: PROJECT_STAGE_ITEMS },
  { category: 'region', items: REGION_ITEMS },
  { category: 'priority', items: PRIORITY_ITEMS },
  // 解决方案
  { category: 'solution_status', items: SOLUTION_STATUS_ITEMS },
  // 日程/待办/任务
  { category: 'schedule_type', items: SCHEDULE_TYPE_ITEMS },
  { category: 'schedule_status', items: SCHEDULE_STATUS_ITEMS },
  { category: 'todo_status', items: TODO_STATUS_ITEMS },
  { category: 'task_status', items: TASK_STATUS_ITEMS },
  // 预警
  { category: 'alert_severity',        items: ALERT_SEVERITY_ITEMS },
  { category: 'alert_status',          items: ALERT_STATUS_ITEMS },
  { category: 'alert_rule_type',       items: ALERT_RULE_TYPE_ITEMS },
  { category: 'alert_rule_status',     items: ALERT_RULE_STATUS_ITEMS },
  { category: 'alert_history_status',  items: ALERT_HISTORY_STATUS_ITEMS },
  { category: 'alert_channel',         items: ALERT_CHANNEL_ITEMS },
  { category: 'alert_scene_template',  items: ALERT_SCENE_TEMPLATE_ITEMS },
  { category: 'alert_check_frequency', items: ALERT_CHECK_FREQUENCY_ITEMS },
  { category: 'risk_level',            items: RISK_LEVEL_ITEMS },
  // 招投标
  { category: 'bidding_method', items: BIDDING_METHOD_ITEMS },
  { category: 'scoring_method', items: SCORING_METHOD_ITEMS },
  { category: 'fund_source', items: FUND_SOURCE_ITEMS },
  { category: 'bid_result', items: BID_RESULT_ITEMS },
  // 合同
  { category: 'contract_status', items: CONTRACT_STATUS_ITEMS },
  { category: 'contract_process_status', items: CONTRACT_PROCESS_STATUS_ITEMS },
  { category: 'contract_sign_mode', items: CONTRACT_SIGN_MODE_ITEMS },
  { category: 'contract_user_type', items: CONTRACT_USER_TYPE_ITEMS },
  { category: 'contract_project_category', items: CONTRACT_PROJECT_CATEGORY_ITEMS },
  // 仲裁/绩效
  { category: 'arbitration_status', items: ARBITRATION_STATUS_ITEMS },
  { category: 'arbitration_type', items: ARBITRATION_TYPE_ITEMS },
  { category: 'performance_status', items: PERFORMANCE_STATUS_ITEMS },
  // 消息中心
  { category: 'message_type',     items: MESSAGE_TYPE_ITEMS },
  { category: 'message_priority', items: MESSAGE_PRIORITY_ITEMS },
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
