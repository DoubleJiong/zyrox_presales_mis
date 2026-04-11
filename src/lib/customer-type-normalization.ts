const CUSTOMER_TYPE_CODE_TO_DICT_VALUE: Record<string, string> = {
  UNIVERSITY: 'university',
  GOVERNMENT: 'government',
  ENTERPRISE: 'enterprise',
  HOSPITAL: 'hospital',
  K12: 'k12',
  HIGHER_VOCATIONAL: 'higher_vocational',
  SECONDARY_VOCATIONAL: 'secondary_vocational',
  MILITARY_POLICE: 'military_police',
};

const CUSTOMER_TYPE_INPUT_ALIASES: Record<string, string> = {
  university: 'UNIVERSITY',
  '高校': 'UNIVERSITY',
  '大学': 'UNIVERSITY',
  '学院': 'UNIVERSITY',
  education: 'UNIVERSITY',
  '教育': 'UNIVERSITY',
  '教育行业': 'UNIVERSITY',
  '高校/教育机构': 'UNIVERSITY',

  higher_vocational: 'HIGHER_VOCATIONAL',
  highervocational: 'HIGHER_VOCATIONAL',
  '高职': 'HIGHER_VOCATIONAL',
  '高专': 'HIGHER_VOCATIONAL',
  '职业学院': 'HIGHER_VOCATIONAL',
  '职业技术学院': 'HIGHER_VOCATIONAL',
  '职业大学': 'HIGHER_VOCATIONAL',
  '高等专科学校': 'HIGHER_VOCATIONAL',
  '专科学校': 'HIGHER_VOCATIONAL',
  '技师学院': 'HIGHER_VOCATIONAL',

  secondary_vocational: 'SECONDARY_VOCATIONAL',
  secondaryvocational: 'SECONDARY_VOCATIONAL',
  '中专': 'SECONDARY_VOCATIONAL',
  '中职': 'SECONDARY_VOCATIONAL',
  '中等专业学校': 'SECONDARY_VOCATIONAL',

  k12: 'K12',
  '基础教育': 'K12',
  '中小学': 'K12',
  '小学': 'K12',
  '中学': 'K12',
  '高中': 'K12',
  '初中': 'K12',
  '幼儿园': 'K12',

  government: 'GOVERNMENT',
  '政府': 'GOVERNMENT',
  '政府机构': 'GOVERNMENT',
  '政府机关': 'GOVERNMENT',

  enterprise: 'ENTERPRISE',
  '企业': 'ENTERPRISE',
  '企业客户': 'ENTERPRISE',
  finance: 'ENTERPRISE',
  bank: 'ENTERPRISE',
  '金融': 'ENTERPRISE',
  '金融机构': 'ENTERPRISE',
  '银行': 'ENTERPRISE',
  '银行/金融机构': 'ENTERPRISE',

  hospital: 'HOSPITAL',
  healthcare: 'HOSPITAL',
  medical: 'HOSPITAL',
  '医院': 'HOSPITAL',
  '医疗': 'HOSPITAL',
  '医疗机构': 'HOSPITAL',
  '医院/医疗机构': 'HOSPITAL',

  military_police: 'MILITARY_POLICE',
  militarypolice: 'MILITARY_POLICE',
  military: 'MILITARY_POLICE',
  police: 'MILITARY_POLICE',
  '军警': 'MILITARY_POLICE',
  '军队': 'MILITARY_POLICE',
  '武警': 'MILITARY_POLICE',
  '公安': 'MILITARY_POLICE',
  '警务': 'MILITARY_POLICE',
};

function normalizeCustomerTypeLookupValue(input: string): string {
  return input.trim().toLowerCase();
}

export function resolveCanonicalCustomerTypeCode(input?: string | null): string | null {
  if (!input) {
    return null;
  }

  const normalizedInput = normalizeCustomerTypeLookupValue(input);
  return CUSTOMER_TYPE_INPUT_ALIASES[normalizedInput] || null;
}

export function mapCustomerTypeCodeToDictValue(code?: string | null): string {
  if (!code) {
    return '';
  }

  const normalizedCode = code.trim().toUpperCase();
  return CUSTOMER_TYPE_CODE_TO_DICT_VALUE[normalizedCode] || normalizedCode.toLowerCase();
}