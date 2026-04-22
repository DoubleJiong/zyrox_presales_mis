export function normalizeProjectTypeCode(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeProjectTypeCodes(value?: string | string[] | null): string[] {
  if (!value) {
    return [];
  }

  const rawValues = Array.isArray(value)
    ? value
    : value.split(/[，,]/).map((item) => item.trim());

  const uniqueCodes = new Set<string>();

  rawValues.forEach((item) => {
    const normalized = normalizeProjectTypeCode(String(item || ''));
    if (normalized) {
      uniqueCodes.add(normalized);
    }
  });

  return Array.from(uniqueCodes);
}

export function serializeProjectTypeCodes(value?: string[] | null): string | null {
  const normalized = normalizeProjectTypeCodes(value || []);
  return normalized.length > 0 ? normalized.join(',') : null;
}

export function getPrimaryProjectTypeCode(value?: string | string[] | null): string | null {
  const normalized = normalizeProjectTypeCodes(value);
  return normalized[0] || null;
}

export const PROJECT_TYPE_CATEGORY_LABELS: Record<string, string> = {
  smart_campus: '智慧校园类',
  data_iot: '数据/物联网类',
  integration: '集成/安防类',
  logistics: '后勤运营类',
  other: '其他',
};

const PROJECT_TYPE_CATEGORY_MAP: Record<string, string> = {
  one_card: 'smart_campus',
  smart_campus: 'smart_campus',
  smart_restaurant: 'smart_campus',
  food_safety: 'smart_campus',
  k12_project: 'smart_campus',
  big_data: 'data_iot',
  iot: 'data_iot',
  digital_twin: 'data_iot',
  system_integration: 'integration',
  security: 'integration',
  smart_logistics: 'logistics',
  operation_logistics: 'logistics',
  innovation: 'other',
  other: 'other',
};

export function getProjectTypeCategory(code: string): string {
  return PROJECT_TYPE_CATEGORY_MAP[normalizeProjectTypeCode(code)] || 'other';
}

const PROJECT_TYPE_DISPLAY_LABELS: Record<string, string> = {
  one_card: '一卡通',
  big_data: '大数据',
  iot: '物联网',
  smart_restaurant: '智慧餐厅',
  food_safety: '食安',
  smart_campus: '智慧校园',
  digital_twin: '数字孪生',
  system_integration: '系统集成',
  security: '安防项目',
  k12_project: 'K12项目',
  smart_logistics: '数智后勤',
  operation_logistics: '运营后勤',
  innovation: '创新项目',
  other: '其他类型',
};

export function getProjectTypeDisplayLabel(code: string): string {
  const normalizedCode = normalizeProjectTypeCode(code);
  return PROJECT_TYPE_DISPLAY_LABELS[normalizedCode] || code;
}

export function getProjectTypeCategoryLabel(code: string): string {
  return PROJECT_TYPE_CATEGORY_LABELS[getProjectTypeCategory(code)] || PROJECT_TYPE_CATEGORY_LABELS.other;
}