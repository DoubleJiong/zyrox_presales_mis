export const PROJECT_IMPORT_TEMPLATE_HEADERS = [
  '项目名称',
  '客户名称',
  '项目类型',
  '项目阶段',
  '客户类型/行业',
  '区域',
  '负责人',
  '预计金额',
  '开始日期',
  '预计交付日期',
  '优先级',
  '年份',
  '资金来源',
  '项目描述',
  '风险说明',
  '标签',
];

export const PROJECT_IMPORT_TEMPLATE_EXAMPLE = [
  '智慧校园项目',
  '北京师范大学',
  '软件开发',
  '商机',
  '高校',
  '华北',
  '张三',
  '8000000',
  '2025-01-15',
  '2025-06-30',
  '高',
  '2025',
  '财政资金',
  '智慧校园综合管理平台建设',
  '技术风险',
  '教育信息化',
];

const PROJECT_STATUS_LABELS: Record<string, string> = {
  lead: '商机线索',
  in_progress: '跟进中',
  won: '已中标',
  lost: '已丢标',
  on_hold: '已暂停',
  cancelled: '已取消',
  draft: '草稿',
  ongoing: '进行中',
  completed: '已完成',
  archived: '已归档',
  abandoned: '已放弃',
};

const PROJECT_STAGE_LABELS: Record<string, string> = {
  opportunity: '商机阶段',
  bidding_pending: '投标立项待审批',
  bidding: '招标投标',
  solution_review: '方案评审中',
  contract_pending: '合同/商务确认中',
  delivery_preparing: '执行准备中',
  delivering: '执行中',
  settlement: '结算中',
  archived: '已归档',
  cancelled: '已取消',
};

const PROJECT_CUSTOMER_TYPE_OR_INDUSTRY_LABELS: Record<string, string> = {
  university: '高校',
  higher_vocational: '高职',
  secondary_vocational: '中专',
  k12: 'K12',
  government: '政府',
  enterprise: '企业',
  military_police: '军警',
  hospital: '医院',
  education: '教育',
  healthcare: '医疗',
  medical: '医疗',
  finance: '金融',
  manufacturing: '制造',
  retail: '零售',
  technology: '科技',
  other: '其他',
};

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s.-]+/g, '_');
}

export function getProjectStatusLabel(value?: string | null): string {
  if (!value) {
    return '';
  }

  return PROJECT_STATUS_LABELS[normalizeLookupKey(value)] || value;
}

export function getProjectStageLabel(value?: string | null): string {
  if (!value) {
    return '';
  }

  return PROJECT_STAGE_LABELS[normalizeLookupKey(value)] || value;
}

export function getProjectCustomerTypeOrIndustryLabel(value?: string | null): string {
  if (!value) {
    return '';
  }

  return PROJECT_CUSTOMER_TYPE_OR_INDUSTRY_LABELS[normalizeLookupKey(value)] || value;
}

export function normalizeImportedProjectCustomerTypeOrIndustry(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  return getProjectCustomerTypeOrIndustryLabel(trimmedValue);
}