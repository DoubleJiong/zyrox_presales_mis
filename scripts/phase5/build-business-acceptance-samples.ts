import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

import dotenv from 'dotenv';
import { and, eq, isNull, sql } from 'drizzle-orm';

interface ProjectRow {
  id: number;
  projectCode: string;
  projectName: string;
  customerName: string;
  projectStage: string | null;
  status: string | null;
  projectType: string | null;
  industry: string | null;
  region: string | null;
  estimatedAmount: string | null;
  actualAmount: string | null;
  description: string | null;
  expectedDeliveryDate: Date | null;
  hasSolution: boolean;
}

interface SampleRow {
  sampleId: string;
  purpose: string;
  projectId: number;
  projectCode: string;
  projectName: string;
  customerName: string;
  originalLedgerStatus: string;
  systemStage: string;
  systemStatus: string;
  projectType: string;
  industry: string;
  region: string;
  hasSolution: boolean;
  estimatedAmount: string;
  actualAmount: string;
}

function hasLinkedSolution(value: unknown): boolean {
  return value === true || value === 'true' || value === 't' || value === 1 || value === '1';
}

interface CoverageDefinition {
  id: string;
  purpose: string;
  predicate: (row: ProjectRow) => boolean;
}

let cachedDbDependencies: {
  db: typeof import('@/db').db;
  schema: typeof import('@/db/schema');
} | null = null;

function loadEnv() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

async function getDbDependencies() {
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

function getOriginalLedgerStatus(description: string | null): string {
  if (!description) {
    return '未识别';
  }

  const matched = description.match(/原台账状态:\s*([^\n\r]+)/);
  return matched?.[1]?.trim() || '未识别';
}

function normalizeText(value: string | null | undefined, fallback = '未填写'): string {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

async function loadLedgerProjects(): Promise<ProjectRow[]> {
  const { db, schema } = await getDbDependencies();
  const { projects } = schema;

  const result = await db.execute(sql`
    select
      p.id,
      p.project_code as "projectCode",
      p.project_name as "projectName",
      p.customer_name as "customerName",
      p.project_stage as "projectStage",
      p.status,
      p.project_type as "projectType",
      p.industry,
      p.region,
      p.estimated_amount as "estimatedAmount",
      p.actual_amount as "actualAmount",
      p.description,
      p.expected_delivery_date as "expectedDeliveryDate",
      exists (
        select 1
        from bus_solution s
        where s.project_id = p.id
          and s.deleted_at is null
      ) as "hasSolution"
    from ${projects} p
    where p.deleted_at is null
      and p.description like '%原台账状态:%'
    order by p.id
  `);

  const rawRows = Array.isArray(result)
    ? result
    : ((result as { rows?: unknown[] }).rows || []);

  return rawRows as ProjectRow[];
}

function buildCoverageDefinitions(): CoverageDefinition[] {
  return [
    {
      id: 'S01',
      purpose: '商机阶段-交流样本',
      predicate: (row) => getOriginalLedgerStatus(row.description) === '交流' && row.projectStage === 'opportunity',
    },
    {
      id: 'S02',
      purpose: '商机阶段-支持样本',
      predicate: (row) => getOriginalLedgerStatus(row.description) === '支持' && row.projectStage === 'opportunity',
    },
    {
      id: 'S03',
      purpose: '商机阶段-常态化跟进样本',
      predicate: (row) => getOriginalLedgerStatus(row.description) === '常态化跟进' && row.projectStage === 'opportunity',
    },
    {
      id: 'S04',
      purpose: '商机阶段-申报样本',
      predicate: (row) => getOriginalLedgerStatus(row.description) === '申报' && row.projectStage === 'opportunity',
    },
    {
      id: 'S05',
      purpose: '商机阶段-控标样本',
      predicate: (row) => getOriginalLedgerStatus(row.description) === '控标' && row.projectStage === 'opportunity',
    },
    {
      id: 'S06',
      purpose: '商机阶段-方案样本且已生成项目方案',
      predicate: (row) => getOriginalLedgerStatus(row.description) === '方案' && row.projectStage === 'opportunity' && hasLinkedSolution(row.hasSolution),
    },
    {
      id: 'S07',
      purpose: '归档阶段-中标样本',
      predicate: (row) => getOriginalLedgerStatus(row.description) === '中标' && row.projectStage === 'archived' && row.status === 'won',
    },
    {
      id: 'S08',
      purpose: '归档阶段-签单样本',
      predicate: (row) => getOriginalLedgerStatus(row.description) === '已签单' && row.projectStage === 'archived' && row.status === 'won',
    },
    {
      id: 'S09',
      purpose: '归档阶段-丢标样本',
      predicate: (row) => getOriginalLedgerStatus(row.description) === '丢标' && row.projectStage === 'archived' && row.status === 'lost',
    },
    {
      id: 'S10',
      purpose: '归档阶段-放弃样本',
      predicate: (row) => row.projectStage === 'archived' && row.status === 'cancelled',
    },
    {
      id: 'S11',
      purpose: '软件类项目样本',
      predicate: (row) => row.projectType === 'SOFTWARE',
    },
    {
      id: 'S12',
      purpose: '集成类项目样本',
      predicate: (row) => row.projectType === 'INTEGRATION',
    },
    {
      id: 'S13',
      purpose: '教育行业样本',
      predicate: (row) => row.industry === 'education',
    },
    {
      id: 'S14',
      purpose: '企业行业样本',
      predicate: (row) => row.industry === 'enterprise',
    },
    {
      id: 'S15',
      purpose: '高金额样本',
      predicate: (row) => Number(row.actualAmount || row.estimatedAmount || 0) >= 5000000,
    },
    {
      id: 'S16',
      purpose: '无方案项目样本',
      predicate: (row) => !row.hasSolution,
    },
  ];
}

function selectSamples(rows: ProjectRow[]): SampleRow[] {
  const usedProjectIds = new Set<number>();
  const samples: SampleRow[] = [];

  for (const definition of buildCoverageDefinitions()) {
    const matched = rows.find((row) => !usedProjectIds.has(row.id) && definition.predicate(row));
    if (!matched) {
      continue;
    }

    usedProjectIds.add(matched.id);
    samples.push({
      sampleId: definition.id,
      purpose: definition.purpose,
      projectId: matched.id,
      projectCode: matched.projectCode,
      projectName: matched.projectName,
      customerName: matched.customerName,
      originalLedgerStatus: getOriginalLedgerStatus(matched.description),
      systemStage: normalizeText(matched.projectStage),
      systemStatus: normalizeText(matched.status),
      projectType: normalizeText(matched.projectType),
      industry: normalizeText(matched.industry),
      region: normalizeText(matched.region),
      hasSolution: hasLinkedSolution(matched.hasSolution),
      estimatedAmount: normalizeText(matched.estimatedAmount),
      actualAmount: normalizeText(matched.actualAmount),
    });
  }

  return samples;
}

function buildDistributionMarkdown(rows: ProjectRow[]): string {
  const stageStatusMap = new Map<string, number>();
  const ledgerStatusMap = new Map<string, number>();

  for (const row of rows) {
    const stageKey = `${normalizeText(row.projectStage)} / ${normalizeText(row.status)}`;
    stageStatusMap.set(stageKey, (stageStatusMap.get(stageKey) || 0) + 1);

    const ledgerStatus = getOriginalLedgerStatus(row.description);
    ledgerStatusMap.set(ledgerStatus, (ledgerStatusMap.get(ledgerStatus) || 0) + 1);
  }

  const stageLines = Array.from(stageStatusMap.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([key, count]) => `| ${key} | ${count} |`)
    .join('\n');

  const ledgerLines = Array.from(ledgerStatusMap.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([key, count]) => `| ${key} | ${count} |`)
    .join('\n');

  return [
    '## 数据分布',
    '',
    '### 系统阶段分布',
    '',
    '| 系统阶段 / 状态 | 数量 |',
    '| --- | ---: |',
    stageLines,
    '',
    '### 原台账状态分布',
    '',
    '| 原台账状态 | 数量 |',
    '| --- | ---: |',
    ledgerLines,
  ].join('\n');
}

function buildSampleMarkdown(rows: ProjectRow[], samples: SampleRow[]): string {
  const header = [
    '# 第五阶段业务验收代表性样本清单',
    '',
    '日期：2026-03-30',
    '',
    '## 样本选择原则',
    '',
    '1. 基于已导入人工台账样本，不使用手工虚构业务对象。',
    '2. 覆盖商机、归档、中标、丢标、放弃、已生成方案、未生成方案等关键场景。',
    '3. 每条样本都用于后续“页面现象 / 接口响应 / 数据库事实 / 台账事实”四联核对。',
    '',
    `台账导入项目总数：${rows.length}`,
    `本轮代表性样本数：${samples.length}`,
    '',
  ].join('\n');

  const sampleTable = [
    '## 代表性样本',
    '',
    '| 样本ID | 用途 | 项目编号 | 项目名称 | 客户 | 原台账状态 | 系统阶段 | 系统状态 | 项目类型 | 行业 | 有无方案 | 预计金额 | 实际金额 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: |',
    ...samples.map((sample) => `| ${sample.sampleId} | ${sample.purpose} | ${sample.projectCode} | ${sample.projectName} | ${sample.customerName} | ${sample.originalLedgerStatus} | ${sample.systemStage} | ${sample.systemStatus} | ${sample.projectType} | ${sample.industry} | ${sample.hasSolution ? '有' : '无'} | ${sample.estimatedAmount} | ${sample.actualAmount} |`),
    '',
  ].join('\n');

  const nextStep = [
    '## 下一步使用方式',
    '',
    '1. 用业务账号逐条打开客户、项目、方案页面核对样本。',
    '2. 将页面展示与接口响应、数据库事实并排记录。',
    '3. 再用这批样本映射到统计页，检查总数、阶段分布、方案总数是否计入正确。',
    '',
  ].join('\n');

  return [header, buildDistributionMarkdown(rows), '', sampleTable, nextStep].join('\n');
}

async function main() {
  const rows = await loadLedgerProjects();
  const samples = selectSamples(rows);
  const markdown = buildSampleMarkdown(rows, samples);
  const outputPath = path.resolve(process.cwd(), 'docs/plans/2026-03-30-phase-5-business-acceptance-sample-list.md');

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, markdown, 'utf8');

  console.log(JSON.stringify({
    outputPath,
    ledgerProjectCount: rows.length,
    sampleCount: samples.length,
    sampleIds: samples.map((sample) => sample.sampleId),
  }, null, 2));
}

main().catch((error) => {
  console.error('build-business-acceptance-samples failed:', error);
  process.exitCode = 1;
});