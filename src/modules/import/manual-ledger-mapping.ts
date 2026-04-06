import * as XLSX from 'xlsx';

export interface LedgerRow {
  year?: string;
  projectName?: string;
  projectType?: string;
  secondaryProjectType?: string;
  tertiaryProjectType?: string;
  region?: string;
  regionType?: string;
  salesName?: string;
  customerName?: string;
  customerType?: string;
  budgetAmount?: string | number;
  status?: string;
  signedAmount?: string | number;
  supportDensity?: string;
  biddingType?: string;
  bidOpenDate?: string | number;
  presalesOwner?: string;
  contractNumber?: string;
  remark?: string;
  lastUpdatedAt?: string | number;
  externalProjectCode?: string;
}

export interface NormalizedLedgerProject {
  projectName: string;
  customerName: string;
  region: string | null;
  industry: string | null;
  projectStage: string;
  status: string;
  bidResult: string | null;
  estimatedAmount: string | null;
  actualAmount: string | null;
  expectedBiddingDate: string | null;
  contractNumber: string | null;
  year: number | null;
  preferredManagerNames: string[];
  customerTypeRaw: string | null;
  preferredProjectTypeLabels: string[];
  description: string;
}

const OPPORTUNITY_STATUSES = new Set(['交流', '支持', '常态化跟进', '申报', '控标', '方案', '']);
const BIDDING_STATUSES = new Set(['招标', '投标', '开标', '评标', '招投标']);
const WON_STATUSES = new Set(['中标', '已签单']);
const LOST_STATUSES = new Set(['丢标']);
const CANCELLED_STATUSES = new Set(['放弃']);

export function normalizeLedgerText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).replace(/\r?\n/g, ' ').trim();
}

export function truncateLedgerText(value: unknown, maxLength: number): string | null {
  const normalized = normalizeLedgerText(value);
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

export function parseLedgerAmount(value: unknown): string | null {
  const raw = normalizeLedgerText(value);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw.replace(/[\s,，]/g, ''));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed.toFixed(2);
}

export function parseLedgerYear(value: unknown): number | null {
  const raw = normalizeLedgerText(value);
  if (!raw) {
    return null;
  }

  const matched = raw.match(/(20\d{2})/);
  if (!matched) {
    return null;
  }

  return Number(matched[1]);
}

export function parseLedgerDate(value: unknown): string | null {
  const raw = normalizeLedgerText(value);
  if (!raw) {
    return null;
  }

  const explicitPatterns = [
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
    /^(\d{4})年(\d{1,2})月(\d{1,2})日?$/,
  ];

  for (const pattern of explicitPatterns) {
    const matched = raw.match(pattern);
    if (matched) {
      const [, year, month, day] = matched;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  const serial = Number(raw);
  if (Number.isFinite(serial) && serial > 1000) {
    const date = XLSX.SSF.parse_date_code(serial);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }

  return null;
}

export function mapLedgerCustomerIndustry(customerType: string): string | null {
  const normalized = normalizeLedgerText(customerType);
  if (!normalized) {
    return null;
  }

  if (normalized.includes('高校') || normalized.includes('教育')) {
    return 'education';
  }
  if (normalized.includes('政府') || normalized.includes('政务')) {
    return 'government';
  }
  if (normalized.includes('医院') || normalized.includes('医疗')) {
    return 'healthcare';
  }
  if (normalized.includes('银行') || normalized.includes('金融')) {
    return 'finance';
  }
  if (normalized.includes('企业')) {
    return 'enterprise';
  }

  return 'other';
}

export function mapLedgerBusinessState(status: unknown): {
  projectStage: string;
  status: string;
  bidResult: string | null;
} {
  const normalized = normalizeLedgerText(status);

  if (WON_STATUSES.has(normalized)) {
    return { projectStage: 'archived', status: 'won', bidResult: 'won' };
  }

  if (LOST_STATUSES.has(normalized)) {
    return { projectStage: 'archived', status: 'lost', bidResult: 'lost' };
  }

  if (CANCELLED_STATUSES.has(normalized)) {
    return { projectStage: 'archived', status: 'cancelled', bidResult: null };
  }

  if (BIDDING_STATUSES.has(normalized)) {
    return { projectStage: 'bidding', status: 'in_progress', bidResult: null };
  }

  if (OPPORTUNITY_STATUSES.has(normalized)) {
    return { projectStage: 'opportunity', status: 'lead', bidResult: null };
  }

  return { projectStage: 'opportunity', status: 'lead', bidResult: null };
}

export function getPreferredProjectTypeLabels(row: LedgerRow): string[] {
  const values = [
    normalizeLedgerText(row.tertiaryProjectType),
    normalizeLedgerText(row.secondaryProjectType),
    normalizeLedgerText(row.projectType),
  ].filter(Boolean);

  const labels: string[] = [];

  for (const value of values) {
    if (value.includes('运维') || value.includes('服务')) {
      labels.push('运维服务');
      continue;
    }

    if (value.includes('咨询') || value.includes('规划') || value.includes('设计')) {
      labels.push('咨询服务');
      continue;
    }

    if (value.includes('平台') || value.includes('软件') || value.includes('校园')) {
      labels.push('软件开发');
      continue;
    }

    if (value.includes('总包') || value.includes('集成') || value.includes('弱电') || value.includes('硬件')) {
      labels.push('系统集成');
      continue;
    }
  }

  labels.push('系统集成', '软件开发', '咨询服务', '运维服务');

  return Array.from(new Set(labels));
}

export function buildLedgerProjectDescription(row: LedgerRow): string {
  const lines = [
    '[台账样本导入]',
    `来源文件: 重点项目跟进3.23.xlsx / 项目跟进表`,
    `原台账状态: ${normalizeLedgerText(row.status) || '未填写'}`,
    `项目类型: ${[row.projectType, row.secondaryProjectType, row.tertiaryProjectType].map(normalizeLedgerText).filter(Boolean).join(' / ') || '未填写'}`,
    `销售人员: ${normalizeLedgerText(row.salesName) || '未填写'}`,
    `售前支持人员: ${normalizeLedgerText(row.presalesOwner) || '未填写'}`,
    `区域类型: ${normalizeLedgerText(row.regionType) || '未填写'}`,
    `支持密度: ${normalizeLedgerText(row.supportDensity) || '未填写'}`,
    `投标类型: ${normalizeLedgerText(row.biddingType) || '未填写'}`,
    `原项目编号: ${normalizeLedgerText(row.externalProjectCode) || '未填写'}`,
  ];

  const remark = normalizeLedgerText(row.remark);
  if (remark) {
    lines.push(`备注: ${remark}`);
  }

  return lines.join('\n');
}

export function normalizeLedgerProject(row: LedgerRow): NormalizedLedgerProject | null {
  const projectName = normalizeLedgerText(row.projectName);
  const customerName = normalizeLedgerText(row.customerName);

  if (!projectName || !customerName) {
    return null;
  }

  const state = mapLedgerBusinessState(row.status);
  const actualAmount = state.bidResult === 'won'
    ? parseLedgerAmount(row.signedAmount)
    : null;

  return {
    projectName,
    customerName,
    region: normalizeLedgerText(row.region) || null,
    industry: mapLedgerCustomerIndustry(normalizeLedgerText(row.customerType)),
    projectStage: state.projectStage,
    status: state.status,
    bidResult: state.bidResult,
    estimatedAmount: parseLedgerAmount(row.budgetAmount),
    actualAmount,
    expectedBiddingDate: parseLedgerDate(row.bidOpenDate),
    contractNumber: truncateLedgerText(row.contractNumber, 50),
    year: parseLedgerYear(row.year),
    preferredManagerNames: [normalizeLedgerText(row.presalesOwner), normalizeLedgerText(row.salesName)].filter(Boolean),
    customerTypeRaw: normalizeLedgerText(row.customerType) || null,
    preferredProjectTypeLabels: getPreferredProjectTypeLabels(row),
    description: buildLedgerProjectDescription(row),
  };
}