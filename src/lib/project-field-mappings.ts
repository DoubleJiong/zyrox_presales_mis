import { REGION_ITEMS } from '@/lib/config/dictionary-config';

// 区域 code → 中文名称映射（运行时懒加载）
let _regionCodeToName: Record<string, string> | null = null;
function getRegionCodeToNameMap(): Record<string, string> {
  if (!_regionCodeToName) {
    _regionCodeToName = {};
    for (const item of REGION_ITEMS) {
      _regionCodeToName[item.code] = item.name;
    }
  }
  return _regionCodeToName;
}

/**
 * 将区域英文 code 转为中文显示名称
 * 若传入的值已是中文名（历史数据），原样返回
 */
export function getRegionLabel(value?: string | null): string {
  if (!value) return '';
  const map = getRegionCodeToNameMap();
  return map[value] || value;
}

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
  solution_review: '投标评标',
  contract_pending: '合同/商务确认中',
  delivery_preparing: '执行准备中',
  delivering: '执行中',
  settlement: '结算中',
  archived: '已归档',
  cancelled: '已取消',
  suspended: '已暂停',
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

/**
 * 省份/直辖市名称 -> 宏区域映射。
 * 键同时包含宏区域自身和常见省级短名，用于导入时统一落库区域值。
 */
export const PROJECT_REGION_MAP: Record<string, string> = {
  '华北': '华北', '华东': '华东', '华南': '华南', '华中': '华中',
  '西北': '西北', '西南': '西南', '东北': '东北', '港澳台': '港澳台',
  '海外': '海外', '全国': '全国',
  '北京': '华北', '天津': '华北', '河北': '华北', '山西': '华北', '内蒙古': '华北',
  '上海': '华东', '江苏': '华东', '浙江': '华东', '安徽': '华东', '福建': '华东', '江西': '华东', '山东': '华东',
  '广东': '华南', '广西': '华南', '海南': '华南',
  '河南': '华中', '湖北': '华中', '湖南': '华中',
  '重庆': '西南', '四川': '西南', '贵州': '西南', '云南': '西南', '西藏': '西南',
  '陕西': '西北', '甘肃': '西北', '青海': '西北', '宁夏': '西北', '新疆': '西北',
  '辽宁': '东北', '吉林': '东北', '黑龙江': '东北',
};

/**
 * 将导入数据中的区域值规范化为宏区域名称。
 * 支持宏区域名、省级短名以及带“省/市/自治区”后缀的输入。
 */
export function normalizeImportedRegion(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const withoutSuffix = trimmedValue.replace(/[市省]$/, '').replace(/自治区$/, '');
  return PROJECT_REGION_MAP[trimmedValue] || PROJECT_REGION_MAP[withoutSuffix] || trimmedValue;
}