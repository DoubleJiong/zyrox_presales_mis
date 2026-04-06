import path from 'node:path';

import dotenv from 'dotenv';
import * as XLSX from 'xlsx';
import { isNull, sql } from 'drizzle-orm';
import {
  normalizeLedgerProject,
  normalizeLedgerText,
  parseLedgerDate,
  type LedgerRow,
} from '@/modules/import/manual-ledger-mapping';

type ImportMode = 'preview' | 'import';

interface ScriptOptions {
  file: string;
  sheet: string;
  mode: ImportMode;
  limit: number | null;
}

interface ReferenceData {
  operatorId: number;
  customerTypeByName: Map<string, { id: number; code: string; name: string }>;
  projectTypeByName: Map<string, { id: number; code: string; name: string }>;
  userByName: Map<string, { id: number; realName: string }>;
  existingCustomerByName: Map<string, { id: number; customerName: string }>;
  existingProjectNames: Set<string>;
  nextLedgerCustomerSequence: number;
  nextLedgerProjectSequence: number;
}

interface ImportCounters {
  totalRows: number;
  normalizedRows: number;
  skippedRows: number;
  insertedCustomers: number;
  reusedCustomers: number;
  insertedProjects: number;
  duplicateProjects: number;
  unmatchedManagers: Set<string>;
  statusBreakdown: Map<string, number>;
  issues: string[];
}

interface DbDependencies {
  db: typeof import('@/db').db;
  schema: typeof import('@/db/schema');
}

const HEADER_ALIASES: Record<string, keyof LedgerRow> = {
  '年份': 'year',
  '项目名称': 'projectName',
  '项目类型': 'projectType',
  '二级项目类型': 'secondaryProjectType',
  '三级项目类型': 'tertiaryProjectType',
  '区域': 'region',
  '区域类型': 'regionType',
  '销售人员': 'salesName',
  '项目客户': 'customerName',
  '客户类型': 'customerType',
  '预算金额': 'budgetAmount',
  '状态': 'status',
  '中标/签单金额 (状态为"中标/已签单"的填写)': 'signedAmount',
  '支持密度': 'supportDensity',
  '投标类型': 'biddingType',
  '开标日期': 'bidOpenDate',
  '售前支持人员': 'presalesOwner',
  '合同号': 'contractNumber',
  '备注': 'remark',
  '最后更新日期': 'lastUpdatedAt',
  '项目编号 (正元物联)': 'externalProjectCode',
};

let cachedDbDependencies: DbDependencies | null = null;

function loadEnv() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

async function getDbDependencies(): Promise<DbDependencies> {
  if (cachedDbDependencies) {
    return cachedDbDependencies;
  }

  loadEnv();

  const [{ db }, schema] = await Promise.all([
    import('@/db'),
    import('@/db/schema'),
  ]);

  cachedDbDependencies = { db, schema };
  return cachedDbDependencies;
}

function parseArgs(argv: string[]): ScriptOptions {
  const options: ScriptOptions = {
    file: '重点项目跟进3.23.xlsx',
    sheet: '项目跟进表',
    mode: 'preview',
    limit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = argv[index + 1];

    if (argument === '--file' && next) {
      options.file = next;
      index += 1;
      continue;
    }

    if (argument === '--sheet' && next) {
      options.sheet = next;
      index += 1;
      continue;
    }

    if (argument === '--mode' && next && (next === 'preview' || next === 'import')) {
      options.mode = next;
      index += 1;
      continue;
    }

    if (argument === '--limit' && next) {
      const parsed = Number(next);
      options.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      index += 1;
    }
  }

  return options;
}

function normalizeHeader(value: unknown): string {
  return normalizeLedgerText(value).replace(/\s+/g, ' ');
}

function readLedgerRows(filePath: string, sheetName: string): LedgerRow[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`未找到工作表: ${sheetName}`);
  }

  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, defval: '' });
  const headers = (rows[0] || []).map(normalizeHeader);

  return rows.slice(1).map((row) => {
    const ledgerRow: LedgerRow = {};
    headers.forEach((header, index) => {
      const key = HEADER_ALIASES[header];
      if (key) {
        ledgerRow[key] = row[index];
      }
    });
    return ledgerRow;
  });
}

async function loadReferenceData(): Promise<ReferenceData> {
  const { db, schema } = await getDbDependencies();
  const { customerTypes, projectTypes, users, customers, projects } = schema;

  const [customerTypeList, projectTypeList, userList, customerList, projectList] = await Promise.all([
    db.select({ id: customerTypes.id, code: customerTypes.code, name: customerTypes.name })
      .from(customerTypes)
      .where(isNull(customerTypes.deletedAt)),
    db.select({ id: projectTypes.id, code: projectTypes.code, name: projectTypes.name })
      .from(projectTypes)
      .where(isNull(projectTypes.deletedAt)),
    db.select({ id: users.id, realName: users.realName })
      .from(users)
      .where(isNull(users.deletedAt)),
    db.select({ id: customers.id, customerName: customers.customerName })
      .from(customers)
      .where(isNull(customers.deletedAt)),
    db.select({ projectName: projects.projectName })
      .from(projects)
      .where(isNull(projects.deletedAt)),
  ]);

  const operator = userList[0];
  if (!operator) {
    throw new Error('系统中没有可用用户，无法执行台账导入');
  }

  const nextLedgerCustomerSequence = customerList
    .map((item) => item.customerName)
    .length;

  const ledgerCustomerIdRows = await db
    .select({ customerId: customers.customerId })
    .from(customers)
    .where(sql`${customers.customerId} LIKE 'LEDGER-CUST-%'`);

  const ledgerProjectCodeRows = await db
    .select({ projectCode: projects.projectCode })
    .from(projects)
    .where(sql`${projects.projectCode} LIKE 'LEDGER-%'`);

  const maxLedgerCustomerSequence = ledgerCustomerIdRows.reduce((maxValue, item) => {
    const matched = item.customerId.match(/LEDGER-CUST-(\d+)$/);
    if (!matched) {
      return maxValue;
    }

    return Math.max(maxValue, Number(matched[1]));
  }, 0);

  const maxLedgerProjectSequence = ledgerProjectCodeRows.reduce((maxValue, item) => {
    const matched = item.projectCode.match(/LEDGER-\d{4}-(\d+)$/);
    if (!matched) {
      return maxValue;
    }

    return Math.max(maxValue, Number(matched[1]));
  }, 0);

  return {
    operatorId: operator.id,
    customerTypeByName: new Map(customerTypeList.flatMap((item) => {
      const entries: Array<[string, { id: number; code: string; name: string }]> = [];
      entries.push([item.name, item]);
      entries.push([item.code, item]);
      if (item.name === '教育行业') entries.push(['高校', item], ['教育', item]);
      if (item.name === '政府') entries.push(['政府', item], ['政务', item]);
      if (item.name === '企业') entries.push(['企业', item]);
      if (item.name === '医疗机构') entries.push(['医疗', item], ['医院', item]);
      if (item.name === '金融机构') entries.push(['金融', item], ['银行', item]);
      if (item.name === '其他') entries.push(['其他', item]);
      return entries.map(([key, value]) => [key.toLowerCase(), value]);
    })),
    projectTypeByName: new Map(projectTypeList.flatMap((item) => {
      const entries: Array<[string, { id: number; code: string; name: string }]> = [
        [item.name.toLowerCase(), item],
        [item.code.toLowerCase(), item],
      ];
      return entries;
    })),
    userByName: new Map(userList.map((item) => [item.realName, item])),
    existingCustomerByName: new Map(customerList.map((item) => [item.customerName, item])),
    existingProjectNames: new Set(projectList.map((item) => item.projectName)),
    nextLedgerCustomerSequence: Math.max(nextLedgerCustomerSequence, maxLedgerCustomerSequence) + 1,
    nextLedgerProjectSequence: maxLedgerProjectSequence + 1,
  };
}

async function generateCustomerCode(sequence: number): Promise<string> {
  return `LEDGER-CUST-${String(sequence).padStart(4, '0')}`;
}

async function generateProjectCode(year: number | null, sequence: number): Promise<string> {
  const yearPart = year ?? new Date().getFullYear();
  return `LEDGER-${yearPart}-${String(sequence).padStart(4, '0')}`;
}

function resolveCustomerTypeId(referenceData: ReferenceData, customerTypeRaw: string | null): number | null {
  if (!customerTypeRaw) {
    return referenceData.customerTypeByName.get('其他')?.id ?? null;
  }

  return referenceData.customerTypeByName.get(customerTypeRaw.toLowerCase())?.id
    ?? referenceData.customerTypeByName.get('其他')?.id
    ?? null;
}

function resolveProjectType(referenceData: ReferenceData, preferredLabels: string[]): { id: number | null; code: string | null } {
  for (const label of preferredLabels) {
    const matched = referenceData.projectTypeByName.get(label.toLowerCase());
    if (matched) {
      return { id: matched.id, code: matched.code };
    }
  }

  return { id: null, code: null };
}

async function ensureCustomer(
  customerName: string,
  normalized: ReturnType<typeof normalizeLedgerProject>,
  referenceData: ReferenceData,
  counters: ImportCounters,
): Promise<number> {
  const { db, schema } = await getDbDependencies();
  const { customers } = schema;

  const existing = referenceData.existingCustomerByName.get(customerName);
  if (existing) {
    counters.reusedCustomers += 1;
    return existing.id;
  }

  const nextSequence = referenceData.nextLedgerCustomerSequence;
  referenceData.nextLedgerCustomerSequence += 1;
  const customerCode = await generateCustomerCode(nextSequence);
  const customerTypeId = resolveCustomerTypeId(referenceData, normalized?.customerTypeRaw ?? null);

  const inserted = await db.insert(customers).values({
    customerId: customerCode,
    customerName,
    customerTypeId,
    region: normalized?.region ?? null,
    status: 'active',
    totalAmount: '0',
    currentProjectCount: 0,
    maxProjectAmount: '0',
    description: '[台账样本导入] 自动补建客户主数据',
    createdBy: referenceData.operatorId,
  }).returning({ id: customers.id, customerName: customers.customerName });

  const created = inserted[0];
  referenceData.existingCustomerByName.set(created.customerName, created);
  counters.insertedCustomers += 1;

  return created.id;
}

async function runImport(options: ScriptOptions) {
  const { db, schema } = await getDbDependencies();
  const { projects } = schema;
  const absoluteFilePath = path.resolve(process.cwd(), options.file);
  const ledgerRows = readLedgerRows(absoluteFilePath, options.sheet);
  const limitedRows = options.limit ? ledgerRows.slice(0, options.limit) : ledgerRows;
  const referenceData = await loadReferenceData();

  const counters: ImportCounters = {
    totalRows: limitedRows.length,
    normalizedRows: 0,
    skippedRows: 0,
    insertedCustomers: 0,
    reusedCustomers: 0,
    insertedProjects: 0,
    duplicateProjects: 0,
    unmatchedManagers: new Set<string>(),
    statusBreakdown: new Map<string, number>(),
    issues: [],
  };

  let projectSequence = referenceData.nextLedgerProjectSequence;

  for (const row of limitedRows) {
    const normalized = normalizeLedgerProject(row);
    if (!normalized) {
      counters.skippedRows += 1;
      continue;
    }

    counters.normalizedRows += 1;
    counters.statusBreakdown.set(
      normalized.status,
      (counters.statusBreakdown.get(normalized.status) ?? 0) + 1,
    );

    if (referenceData.existingProjectNames.has(normalized.projectName)) {
      counters.duplicateProjects += 1;
      continue;
    }

    const preferredManager = normalized.preferredManagerNames.find((name) => referenceData.userByName.has(name)) ?? null;
    const managerId = preferredManager ? referenceData.userByName.get(preferredManager)?.id ?? null : null;
    normalized.preferredManagerNames.forEach((name) => {
      if (name && !referenceData.userByName.has(name)) {
        counters.unmatchedManagers.add(name);
      }
    });

    if (options.mode === 'preview') {
      continue;
    }

    try {
      const customerId = await ensureCustomer(normalized.customerName, normalized, referenceData, counters);
      const projectType = resolveProjectType(referenceData, normalized.preferredProjectTypeLabels);
      const projectCode = await generateProjectCode(normalized.year, projectSequence);
      projectSequence += 1;

      await db.insert(projects).values({
        projectCode,
        projectName: normalized.projectName,
        customerId,
        customerName: normalized.customerName,
        projectTypeId: projectType.id,
        projectType: projectType.code,
        projectStage: normalized.projectStage,
        status: normalized.status,
        priority: normalized.status === 'won' ? 'high' : 'medium',
        industry: normalized.industry,
        region: normalized.region,
        managerId,
        estimatedAmount: normalized.estimatedAmount,
        actualAmount: normalized.actualAmount,
        expectedDeliveryDate: normalized.status === 'won' ? parseLedgerDate(row.lastUpdatedAt) ?? normalized.expectedBiddingDate : null,
        expectedBiddingDate: normalized.expectedBiddingDate,
        bidResult: normalized.bidResult,
        contractNumber: normalized.contractNumber,
        description: normalized.description,
        year: normalized.year,
      });

      referenceData.existingProjectNames.add(normalized.projectName);
      counters.insertedProjects += 1;
    } catch (error) {
      const detailedError = error instanceof Error
        ? `${error.message}${error.cause instanceof Error ? ` | cause: ${error.cause.message}` : ''}`
        : String(error);
      counters.issues.push(`项目 ${normalized.projectName} 导入失败: ${detailedError}`);
    }
  }

  const summary = {
    mode: options.mode,
    file: absoluteFilePath,
    sheet: options.sheet,
    totalRows: counters.totalRows,
    normalizedRows: counters.normalizedRows,
    skippedRows: counters.skippedRows,
    insertedCustomers: counters.insertedCustomers,
    reusedCustomers: counters.reusedCustomers,
    insertedProjects: counters.insertedProjects,
    duplicateProjects: counters.duplicateProjects,
    unmatchedManagers: Array.from(counters.unmatchedManagers).sort(),
    statusBreakdown: Object.fromEntries(Array.from(counters.statusBreakdown.entries()).sort()),
    issues: counters.issues,
  };

  console.log(JSON.stringify(summary, null, 2));
}

runImport(parseArgs(process.argv.slice(2)))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });