import { db } from '@/db';
import { customerTypes } from '@/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';

export interface CustomerTypeDefinition {
  id: number;
  dbCode: string;
  dictValue: string;
  name: string;
  description: string;
  sortOrder: number;
}

export const CUSTOMER_TYPE_DEFINITIONS: CustomerTypeDefinition[] = [
  {
    id: 1,
    dbCode: 'UNIVERSITY',
    dictValue: 'university',
    name: '高校',
    description: '普通高校、本科院校及高等院校客户',
    sortOrder: 1,
  },
  {
    id: 2,
    dbCode: 'GOVERNMENT',
    dictValue: 'government',
    name: '政府',
    description: '政府机关和事业单位客户',
    sortOrder: 2,
  },
  {
    id: 3,
    dbCode: 'ENTERPRISE',
    dictValue: 'enterprise',
    name: '企业',
    description: '企业和商业机构客户',
    sortOrder: 3,
  },
  {
    id: 4,
    dbCode: 'HOSPITAL',
    dictValue: 'hospital',
    name: '医院',
    description: '医院及医疗卫生机构客户',
    sortOrder: 4,
  },
  {
    id: 5,
    dbCode: 'K12',
    dictValue: 'k12',
    name: 'K12',
    description: '中小学、幼儿园及基础教育客户',
    sortOrder: 5,
  },
  {
    id: 6,
    dbCode: 'HIGHER_VOCATIONAL',
    dictValue: 'higher_vocational',
    name: '高职',
    description: '高职高专、职业学院及职业大学客户',
    sortOrder: 6,
  },
  {
    id: 7,
    dbCode: 'SECONDARY_VOCATIONAL',
    dictValue: 'secondary_vocational',
    name: '中专',
    description: '中专、中职及中等职业学校客户',
    sortOrder: 7,
  },
  {
    id: 8,
    dbCode: 'MILITARY_POLICE',
    dictValue: 'military_police',
    name: '军警',
    description: '军队、武警、公安及警务院校客户',
    sortOrder: 8,
  },
];

const CUSTOMER_TYPE_CODE_TO_DICT_VALUE: Record<string, string> = Object.fromEntries(
  CUSTOMER_TYPE_DEFINITIONS.map((item) => [item.dbCode, item.dictValue])
);

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

export const CUSTOMER_TYPE_DICT_ITEMS = CUSTOMER_TYPE_DEFINITIONS.map((item) => ({
  code: item.dictValue,
  name: item.name,
  sortOrder: item.sortOrder,
  description: item.description,
}));

export function mapCustomerTypeCodeToDictValue(code?: string | null): string {
  if (!code) {
    return '';
  }

  const normalizedCode = code.trim().toUpperCase();
  return CUSTOMER_TYPE_CODE_TO_DICT_VALUE[normalizedCode] || normalizedCode.toLowerCase();
}

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

async function findCustomerTypeById(id: number) {
  const [record] = await db
    .select({ id: customerTypes.id, code: customerTypes.code, name: customerTypes.name })
    .from(customerTypes)
    .where(and(eq(customerTypes.id, id), isNull(customerTypes.deletedAt)))
    .limit(1);

  return record || null;
}

async function findCustomerTypeByCode(code: string) {
  const [record] = await db
    .select({ id: customerTypes.id, code: customerTypes.code, name: customerTypes.name })
    .from(customerTypes)
    .where(and(sql`LOWER(${customerTypes.code}) = LOWER(${code})`, isNull(customerTypes.deletedAt)))
    .limit(1);

  return record || null;
}

async function findCustomerTypeByName(name: string) {
  const [record] = await db
    .select({ id: customerTypes.id, code: customerTypes.code, name: customerTypes.name })
    .from(customerTypes)
    .where(and(eq(customerTypes.name, name), isNull(customerTypes.deletedAt)))
    .limit(1);

  return record || null;
}

export async function resolveCustomerTypeRecord(input?: string | number | null) {
  if (input === null || input === undefined) {
    return null;
  }

  if (typeof input === 'number' && Number.isInteger(input) && input > 0) {
    return findCustomerTypeById(input);
  }

  const rawInput = String(input).trim();
  if (!rawInput) {
    return null;
  }

  if (/^\d+$/.test(rawInput)) {
    return findCustomerTypeById(parseInt(rawInput, 10));
  }

  const normalizedInput = normalizeCustomerTypeLookupValue(rawInput);
  const canonicalCode = resolveCanonicalCustomerTypeCode(rawInput);

  if (canonicalCode) {
    const byCanonicalCode = await findCustomerTypeByCode(canonicalCode);
    if (byCanonicalCode) {
      return byCanonicalCode;
    }
  }

  const byName = await findCustomerTypeByName(rawInput);
  if (byName) {
    return byName;
  }

  return findCustomerTypeByCode(rawInput);
}

export async function resolveCustomerTypeId(input?: string | number | null) {
  const record = await resolveCustomerTypeRecord(input);
  return record?.id ?? null;
}