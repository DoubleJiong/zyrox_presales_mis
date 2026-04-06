import path from 'node:path';

import dotenv from 'dotenv';
import { and, eq, isNull, sql } from 'drizzle-orm';

type ImportMode = 'preview' | 'import';

interface ScriptOptions {
  mode: ImportMode;
  limit: number | null;
}

interface CandidateProject {
  id: number;
  projectCode: string;
  projectName: string;
  customerName: string;
  projectType: string | null;
  industry: string | null;
  projectStage: string | null;
  managerId: number | null;
  description: string | null;
}

interface SolutionTypeRef {
  technicalId: number | null;
  integratedId: number | null;
  businessId: number | null;
}

interface ImportCounters {
  candidateProjects: number;
  insertedSolutions: number;
  reusedSolutions: number;
  insertedProjectLinks: number;
  issues: string[];
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

function parseArgs(argv: string[]): ScriptOptions {
  const options: ScriptOptions = {
    mode: 'preview',
    limit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = argv[index + 1];

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

function truncateText(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : value.slice(0, maxLength);
}

function buildSolutionCode(project: CandidateProject): string {
  const baseCode = project.projectCode || `LEDGER-PROJECT-${project.id}`;
  return truncateText(`LEDGER-SOL-${baseCode}`.replace(/[^A-Za-z0-9_-]/g, '-'), 50);
}

function buildSolutionName(project: CandidateProject): string {
  return truncateText(`${project.projectName} 项目方案`, 200);
}

function selectSolutionTypeId(project: CandidateProject, refs: SolutionTypeRef): number | null {
  if (project.projectType === 'SOFTWARE') {
    return refs.technicalId ?? refs.integratedId ?? refs.businessId;
  }

  if (project.projectType === 'INTEGRATION') {
    return refs.integratedId ?? refs.technicalId ?? refs.businessId;
  }

  return refs.technicalId ?? refs.integratedId ?? refs.businessId;
}

function buildSolutionDescription(project: CandidateProject): string {
  const lines = [
    '[Phase5 业务验收方案样本]',
    '来源: 手工台账导入项目自动生成项目方案',
    `关联项目编号: ${project.projectCode || `PROJECT-${project.id}`}`,
    `关联客户: ${project.customerName || '未填写'}`,
    `项目阶段: ${project.projectStage || '未填写'}`,
    `原台账状态: 方案`,
  ];

  if (project.description) {
    lines.push('', '项目导入描述摘录:');
    lines.push(project.description);
  }

  return lines.join('\n');
}

async function loadCandidateProjects(limit: number | null): Promise<CandidateProject[]> {
  const { db, schema } = await getDbDependencies();
  const { projects } = schema;

  const query = db
    .select({
      id: projects.id,
      projectCode: projects.projectCode,
      projectName: projects.projectName,
      customerName: projects.customerName,
      projectType: projects.projectType,
      industry: projects.industry,
      projectStage: projects.projectStage,
      managerId: projects.managerId,
      description: projects.description,
    })
    .from(projects)
    .where(and(
      isNull(projects.deletedAt),
      sql`${projects.description} ILIKE '%原台账状态: 方案%'`
    ))
    .orderBy(sql`${projects.id} ASC`);

  if (limit) {
    return query.limit(limit);
  }

  return query;
}

async function loadOperatorId(): Promise<number> {
  const { db, schema } = await getDbDependencies();
  const { users } = schema;

  const preferred = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, 'zhangwei@zhengyuan.com'), isNull(users.deletedAt)))
    .limit(1);

  if (preferred[0]) {
    return preferred[0].id;
  }

  const fallback = await db
    .select({ id: users.id })
    .from(users)
    .where(isNull(users.deletedAt))
    .limit(1);

  if (!fallback[0]) {
    throw new Error('系统中没有可用用户，无法生成方案样本');
  }

  return fallback[0].id;
}

async function loadSolutionTypeRefs(): Promise<SolutionTypeRef> {
  const { db, schema } = await getDbDependencies();
  const { solutionTypes } = schema;

  const rows = await db
    .select({ id: solutionTypes.id, code: solutionTypes.code })
    .from(solutionTypes)
    .where(isNull(solutionTypes.deletedAt));

  const byCode = new Map(rows.map((row) => [row.code, row.id]));

  return {
    technicalId: byCode.get('TECHNICAL') ?? null,
    integratedId: byCode.get('INTEGRATED') ?? null,
    businessId: byCode.get('BUSINESS') ?? null,
  };
}

async function upsertSolutionSample(
  project: CandidateProject,
  operatorId: number,
  solutionTypes: SolutionTypeRef,
  counters: ImportCounters,
  mode: ImportMode,
) {
  const { db, schema } = await getDbDependencies();
  const { solutions, solutionProjects } = schema;

  const solutionCode = buildSolutionCode(project);
  const solutionName = buildSolutionName(project);
  const solutionTypeId = selectSolutionTypeId(project, solutionTypes);

  const existingSolution = await db
    .select({ id: solutions.id, solutionCode: solutions.solutionCode })
    .from(solutions)
    .where(eq(solutions.solutionCode, solutionCode))
    .limit(1);

  let solutionId = existingSolution[0]?.id;

  if (solutionId) {
    counters.reusedSolutions += 1;
  } else if (mode === 'import') {
    const inserted = await db
      .insert(solutions)
      .values({
        solutionCode,
        solutionName,
        solutionTypeId,
        version: '1.0',
        industry: project.industry ? [project.industry] : null,
        scenario: 'Phase5业务验收',
        description: buildSolutionDescription(project),
        complexity: 'medium',
        authorId: operatorId,
        ownerId: project.managerId || operatorId,
        isTemplate: false,
        status: 'approved',
        approvalStatus: 'approved',
        approvalDate: new Date(),
        approvalComments: 'Phase5业务验收样本自动生成',
        publishDate: new Date(),
        tags: ['phase5', 'manual-ledger', '项目方案'],
        isPublic: false,
        solutionCategory: 'project',
        projectId: project.id,
        notes: '用于客户/项目/方案主链路业务验收，不作为正式生产基础模板。',
      })
      .returning({ id: solutions.id });

    solutionId = inserted[0]?.id;
    if (!solutionId) {
      counters.issues.push(`项目 ${project.projectCode} 创建方案失败`);
      return;
    }
    counters.insertedSolutions += 1;
  }

  if (!solutionId || mode !== 'import') {
    return;
  }

  const insertedLinks = await db
    .insert(solutionProjects)
    .values({
      solutionId,
      projectId: project.id,
      associationType: 'default',
      solutionVersion: '1.0',
      usageType: 'implementation',
      implementationStatus: 'planned',
      businessValue: '用于Phase5业务验收，验证项目方案与台账样本的主链路映射。',
      sourceType: 'create',
      stageBound: project.projectStage || 'opportunity',
      contributionConfirmed: true,
      confirmedAt: new Date(),
      confirmedBy: operatorId,
      contributionRatio: '1.0',
      estimatedValue: null,
      actualValue: null,
      usedByUserId: operatorId,
      createdBy: operatorId,
      notes: '自动生成的Phase5项目方案关联。',
      solutionSnapshot: {
        solutionCode,
        solutionName,
        version: '1.0',
        description: buildSolutionDescription(project),
        coreFeatures: null,
        technicalArchitecture: null,
        components: null,
        industry: project.industry,
        scenario: 'Phase5业务验收',
        estimatedCost: null,
        estimatedDuration: null,
        tags: ['phase5', 'manual-ledger', '项目方案'],
        attachments: null,
      },
    })
    .onConflictDoNothing()
    .returning({ id: solutionProjects.id });

  if (insertedLinks.length > 0) {
    counters.insertedProjectLinks += insertedLinks.length;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const counters: ImportCounters = {
    candidateProjects: 0,
    insertedSolutions: 0,
    reusedSolutions: 0,
    insertedProjectLinks: 0,
    issues: [],
  };

  const [projects, operatorId, solutionTypes] = await Promise.all([
    loadCandidateProjects(options.limit),
    loadOperatorId(),
    loadSolutionTypeRefs(),
  ]);

  counters.candidateProjects = projects.length;

  console.log(`模式: ${options.mode}`);
  console.log(`候选项目数: ${projects.length}`);

  for (const project of projects) {
    await upsertSolutionSample(project, operatorId, solutionTypes, counters, options.mode);
  }

  console.log('执行结果:');
  console.log(JSON.stringify({
    candidateProjects: counters.candidateProjects,
    insertedSolutions: counters.insertedSolutions,
    reusedSolutions: counters.reusedSolutions,
    insertedProjectLinks: counters.insertedProjectLinks,
    issues: counters.issues,
  }, null, 2));
}

main().catch((error) => {
  console.error('manual-ledger-solutions failed:', error);
  process.exitCode = 1;
});