import path from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

import dotenv from 'dotenv';
import { and, eq, isNull, sql } from 'drizzle-orm';

interface SampleRow {
  sampleId: string;
  purpose: string;
  projectCode: string;
  projectName: string;
  customerName: string;
  originalLedgerStatus: string;
  systemStage: string;
  systemStatus: string;
  projectType: string;
  industry: string;
  hasSolution: boolean;
}

interface ApiSession {
  accessToken: string;
}

interface SampleEvidence {
  sampleId: string;
  purpose: string;
  ledgerFact: string;
  pageEvidence: string;
  apiEvidence: string;
  dbEvidence: string;
  metricEvidence: string;
  judgement: string;
  notes: string;
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

function parseSampleList(): SampleRow[] {
  const filePath = path.resolve(process.cwd(), 'docs/plans/2026-03-30-phase-5-business-acceptance-sample-list.md');
  const content = readFileSync(filePath, 'utf8');

  return content
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| S'))
    .map((line) => {
      const columns = line.split('|').map((item) => item.trim()).filter(Boolean);
      return {
        sampleId: columns[0],
        purpose: columns[1],
        projectCode: columns[2],
        projectName: columns[3],
        customerName: columns[4],
        originalLedgerStatus: columns[5],
        systemStage: columns[6],
        systemStatus: columns[7],
        projectType: columns[8],
        industry: columns[9],
        hasSolution: columns[10] === '有',
      } satisfies SampleRow;
    });
}

async function loginAsBusinessUser(): Promise<ApiSession> {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'zhangwei@zhengyuan.com', password: 'password' }),
  });

  if (!response.ok) {
    throw new Error(`业务账号登录失败: ${response.status}`);
  }

  const data = await response.json();
  return { accessToken: data.data.accessToken as string };
}

async function apiGet(session: ApiSession, pathName: string): Promise<any> {
  const response = await fetch(`http://localhost:5000${pathName}`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

async function collectSampleEvidence(sample: SampleRow, session: ApiSession): Promise<SampleEvidence> {
  const { db, schema } = await getDbDependencies();
  const { projects, customers, solutions } = schema;

  const [projectRow, customerRow, solutionRows, customerApi, projectApi, solutionApi] = await Promise.all([
    db.select({
      id: projects.id,
      projectCode: projects.projectCode,
      projectName: projects.projectName,
      customerName: projects.customerName,
      projectStage: projects.projectStage,
      status: projects.status,
      estimatedAmount: projects.estimatedAmount,
      actualAmount: projects.actualAmount,
    }).from(projects).where(and(eq(projects.projectCode, sample.projectCode), isNull(projects.deletedAt))).limit(1),
    db.select({
      id: customers.id,
      customerId: customers.customerId,
      customerName: customers.customerName,
      region: customers.region,
      status: customers.status,
    }).from(customers).where(and(eq(customers.customerName, sample.customerName), isNull(customers.deletedAt))).limit(1),
    db.select({
      id: solutions.id,
      solutionCode: solutions.solutionCode,
      solutionName: solutions.solutionName,
      projectId: solutions.projectId,
      status: solutions.status,
    }).from(solutions).where(and(eq(solutions.projectId, sql`(select id from bus_project where project_code = ${sample.projectCode} limit 1)`), isNull(solutions.deletedAt))),
    apiGet(session, `/api/customers?search=${encodeURIComponent(sample.customerName)}&pageSize=20`),
    apiGet(session, `/api/projects?search=${encodeURIComponent(sample.projectName)}&pageSize=20`),
    apiGet(session, `/api/solutions?keyword=${encodeURIComponent(sample.projectName)}&pageSize=20`),
  ]);

  const project = projectRow[0];
  const customer = customerRow[0];
  const projectApiList = projectApi.body?.data?.projects || [];
  const customerApiList = customerApi.body?.data?.customers || [];
  const solutionApiList = solutionApi.body?.data || [];

  const customerVisible = customerApiList.some((item: any) => item.customerName === sample.customerName);
  const projectVisible = projectApiList.some((item: any) => item.projectCode === sample.projectCode || item.projectName === sample.projectName);
  const solutionVisible = solutionApiList.some((item: any) => String(item.projectId) === String(project?.id) || String(item.solutionName || '').includes(sample.projectName));

  const ledgerFact = `台账状态=${sample.originalLedgerStatus}; 系统阶段=${sample.systemStage}; 系统状态=${sample.systemStatus}; 项目类型=${sample.projectType}; 行业=${sample.industry}`;
  const pageEvidence = sample.hasSolution
    ? `按业务页当前查询逻辑，客户页应可搜索到客户，项目页应可搜索到项目，方案页应可搜索到“${sample.projectName} 项目方案”。首轮接口层可见性结果：客户=${customerVisible ? '可见' : '未见'}，项目=${projectVisible ? '可见' : '未见'}，方案=${solutionVisible ? '可见' : '未见'}。`
    : `按业务页当前查询逻辑，客户页应可搜索到客户，项目页应可搜索到项目；该样本不要求方案页命中项目方案。首轮接口层可见性结果：客户=${customerVisible ? '可见' : '未见'}，项目=${projectVisible ? '可见' : '未见'}。`;
  const apiEvidence = `customers(${customerApi.status})=${customerApiList.length} 命中; projects(${projectApi.status})=${projectApiList.length} 命中; solutions(${solutionApi.status})=${solutionApiList.length} 命中`;
  const dbEvidence = `customerId=${customer?.id ?? '未找到'} / customerCode=${customer?.customerId ?? '未找到'}; projectId=${project?.id ?? '未找到'} / stage=${project?.projectStage ?? '未找到'} / status=${project?.status ?? '未找到'}; solutions=${solutionRows.length}`;
  const metricEvidence = `当前应计入 totalCustomers、totalProjects；${project?.projectStage === 'opportunity' ? '计入 projectsByStage.opportunity' : project?.projectStage === 'archived' ? '计入 projectsByStage.archived' : '阶段待确认'}；${sample.hasSolution ? '应计入 totalSolutions' : '不计入 totalSolutions'}`;

  const judgement = customerVisible && projectVisible && (!sample.hasSolution || solutionVisible) ? '一致' : '不一致';
  const notes = judgement === '一致' ? '首轮接口与数据库一致，待补页面截图/交互细节。' : '需继续排查 UI 或查询条件差异。';

  return {
    sampleId: sample.sampleId,
    purpose: sample.purpose,
    ledgerFact,
    pageEvidence,
    apiEvidence,
    dbEvidence,
    metricEvidence,
    judgement,
    notes,
  };
}

async function collectMetrics(session: ApiSession) {
  const { db, schema } = await getDbDependencies();
  const { customers, projects, solutions } = schema;

  const [dashboardApi, customerCount, projectCount, solutionCount, stageRows] = await Promise.all([
    apiGet(session, '/api/dashboard'),
    db.select({ count: sql<number>`count(*)` }).from(customers).where(isNull(customers.deletedAt)),
    db.select({ count: sql<number>`count(*)` }).from(projects).where(isNull(projects.deletedAt)),
    db.select({ count: sql<number>`count(*)` }).from(solutions).where(isNull(solutions.deletedAt)),
    db.execute(sql`select project_stage, count(*)::int as count from bus_project where deleted_at is null group by project_stage order by project_stage`),
  ]);

  const stageMap = new Map<string, number>();
  const rows = Array.isArray(stageRows) ? stageRows : ((stageRows as { rows?: Array<{ project_stage: string; count: number }> }).rows || []);
  for (const row of rows as Array<{ project_stage: string; count: number }>) {
    stageMap.set(row.project_stage, Number(row.count));
  }

  return {
    dashboardApi: dashboardApi.body,
    db: {
      totalCustomers: customerCount[0]?.count ?? 0,
      totalProjects: projectCount[0]?.count ?? 0,
      totalSolutions: solutionCount[0]?.count ?? 0,
      opportunity: stageMap.get('opportunity') ?? 0,
      archived: stageMap.get('archived') ?? 0,
      cancelled: stageMap.get('cancelled') ?? 0,
      lost: stageMap.get('lost') ?? 0,
    },
  };
}

function buildMarkdown(evidences: SampleEvidence[], metrics: Awaited<ReturnType<typeof collectMetrics>>): string {
  const apiData = metrics.dashboardApi?.data || metrics.dashboardApi || {};
  const projectsByStage = apiData.projectsByStage || {};

  const sampleTable = evidences.map((item) => `| ${item.sampleId} | ${item.purpose} | ${item.ledgerFact} | ${item.pageEvidence} | ${item.apiEvidence} | ${item.dbEvidence} | ${item.metricEvidence} | ${item.judgement} | ${item.notes} |`).join('\n');

  return [
    '# 第五阶段业务验收首轮证据记录',
    '',
    '日期：2026-03-30',
    '',
    '## 1. 样本首轮证据',
    '',
    '| 样本ID | 样本用途 | 台账事实 | 页面现象 | 接口证据 | 数据库证据 | 统计计入口径 | 判定 | 问题编号/备注 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    sampleTable,
    '',
    '## 2. 统计首轮复算',
    '',
    '| 统计项 | 接口值 | 数据库复算值 | 是否一致 | 备注 |',
    '| --- | ---: | ---: | --- | --- |',
    `| totalCustomers | ${apiData.totalCustomers ?? '未返回'} | ${metrics.db.totalCustomers} | ${String(apiData.totalCustomers) === String(metrics.db.totalCustomers) ? '一致' : '不一致'} | 业务账号视角接口值与当前数据库总数对比 |`,
    `| totalProjects | ${apiData.totalProjects ?? '未返回'} | ${metrics.db.totalProjects} | ${String(apiData.totalProjects) === String(metrics.db.totalProjects) ? '一致' : '不一致'} | 业务账号视角接口值与当前数据库总数对比 |`,
    `| projectsByStage.opportunity | ${projectsByStage.opportunity ?? '未返回'} | ${metrics.db.opportunity} | ${String(projectsByStage.opportunity) === String(metrics.db.opportunity) ? '一致' : '不一致'} | 业务阶段口径复算 |`,
    `| projectsByStage.archived | ${projectsByStage.archived ?? '未返回'} | ${metrics.db.archived} | ${String(projectsByStage.archived) === String(metrics.db.archived) ? '一致' : '不一致'} | 业务阶段口径复算 |`,
    `| projectsByStage.cancelled | ${projectsByStage.cancelled ?? '未返回'} | ${metrics.db.cancelled} | ${String(projectsByStage.cancelled) === String(metrics.db.cancelled) ? '一致' : '不一致'} | 当前库是否单独返回该阶段待观察 |`,
    `| projectsByStage.lost | ${projectsByStage.lost ?? '未返回'} | ${metrics.db.lost} | ${String(projectsByStage.lost) === String(metrics.db.lost) ? '一致' : '不一致'} | 当前库是否单独返回该阶段待观察 |`,
    `| totalSolutions | ${apiData.totalSolutions ?? '未返回'} | ${metrics.db.totalSolutions} | ${String(apiData.totalSolutions) === String(metrics.db.totalSolutions) ? '一致' : '不一致'} | 已导入 45 条 Phase 5 项目方案样本 |`,
  ].join('\n');
}

async function main() {
  const samples = parseSampleList();
  const session = await loginAsBusinessUser();
  const evidences = [] as SampleEvidence[];

  for (const sample of samples) {
    evidences.push(await collectSampleEvidence(sample, session));
  }

  const metrics = await collectMetrics(session);
  const outputPath = path.resolve(process.cwd(), 'docs/plans/2026-03-30-phase-5-business-acceptance-evidence-round1.md');
  writeFileSync(outputPath, buildMarkdown(evidences, metrics), 'utf8');

  console.log(JSON.stringify({
    outputPath,
    sampleCount: evidences.length,
    inconsistentSamples: evidences.filter((item) => item.judgement !== '一致').map((item) => item.sampleId),
  }, null, 2));
}

main().catch((error) => {
  console.error('collect-business-acceptance-evidence failed:', error);
  process.exitCode = 1;
});