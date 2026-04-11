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

export const OA_PROJECT_TYPE_CATEGORY_LABELS: Record<string, string> = {
  implementation: '实施交付类',
  service: '服务支撑类',
  other: '其他',
};

const OA_PROJECT_TYPE_CATEGORY_MAP: Record<string, string> = {
  software: 'implementation',
  integration: 'implementation',
  consulting: 'service',
  maintenance: 'service',
  other: 'other',
};

export function getProjectTypeOaCategory(code: string): string {
  return OA_PROJECT_TYPE_CATEGORY_MAP[normalizeProjectTypeCode(code)] || 'other';
}

const PROJECT_TYPE_DISPLAY_LABELS: Record<string, string> = {
  software: '软件',
  integration: '集成',
  consulting: '咨询',
  maintenance: '维护',
  other: '其他',
};

export function getProjectTypeDisplayLabel(code: string): string {
  const normalizedCode = normalizeProjectTypeCode(code);
  return PROJECT_TYPE_DISPLAY_LABELS[normalizedCode] || code;
}

export function getProjectTypeOaCategoryLabel(code: string): string {
  return OA_PROJECT_TYPE_CATEGORY_LABELS[getProjectTypeOaCategory(code)] || OA_PROJECT_TYPE_CATEGORY_LABELS.other;
}