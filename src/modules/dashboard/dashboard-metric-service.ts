import { and, count, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import { customers, projects, solutions, tasks } from '@/db/schema';
import { getProjectDisplayStatusLabel } from '@/lib/project-display';
import { GOVERNED_PROJECT_STAGES } from '@/modules/project/project-stage-types';

export const DASHBOARD_PROJECT_STAGES = [...GOVERNED_PROJECT_STAGES];

export interface DashboardMetricsInput {
  userId: number;
  hasGlobalScope: boolean;
  accessibleProjectIds?: number[];
}

export interface DashboardMetricsResult {
  totalCustomers: number;
  totalProjects: number;
  totalSolutions: number;
  pendingTasks: number;
  projectsByStage: Record<string, number>;
  recentProjects: Array<{
    id: number;
    projectCode: string;
    projectName: string;
    status: string;
    statusLabel: string;
    projectStage: string;
    progress: number | null;
  }>;
}

export function normalizeProjectsByStage(rows: Array<{ projectStage: string | null; count: number }>) {
  const base = Object.fromEntries(DASHBOARD_PROJECT_STAGES.map((stage) => [stage, 0])) as Record<string, number>;

  for (const row of rows) {
    if (!row.projectStage) {
      continue;
    }

    base[row.projectStage] = row.count;
  }

  return base;
}

export async function getDashboardMetrics(input: DashboardMetricsInput): Promise<DashboardMetricsResult> {
  const accessibleProjectIds = input.accessibleProjectIds ?? [];

  let customerWhereCondition = isNull(customers.deletedAt);
  let projectWhereCondition = isNull(projects.deletedAt);
  let solutionWhereCondition = isNull(solutions.deletedAt);
  let taskWhereCondition = and(
    or(eq(tasks.status, 'pending'), eq(tasks.status, 'in_progress')),
    isNull(tasks.deletedAt),
  );

  if (!input.hasGlobalScope) {
    customerWhereCondition = and(isNull(customers.deletedAt), eq(customers.createdBy, input.userId));

    if (accessibleProjectIds.length === 0) {
      projectWhereCondition = and(isNull(projects.deletedAt), sql`1 = 0`);
      solutionWhereCondition = and(isNull(solutions.deletedAt), sql`1 = 0`);
      taskWhereCondition = and(isNull(tasks.deletedAt), sql`1 = 0`);
    } else {
      projectWhereCondition = and(isNull(projects.deletedAt), inArray(projects.id, accessibleProjectIds));
      solutionWhereCondition = and(isNull(solutions.deletedAt), inArray(solutions.projectId, accessibleProjectIds));
      taskWhereCondition = and(
        or(eq(tasks.status, 'pending'), eq(tasks.status, 'in_progress')),
        isNull(tasks.deletedAt),
        or(eq(tasks.assigneeId, input.userId), inArray(tasks.projectId, accessibleProjectIds)),
      );
    }
  }

  const [customerCount, projectCount, solutionCount, taskCount, stageRows, recentProjects] = await Promise.all([
    db.select({ count: count() }).from(customers).where(customerWhereCondition),
    db.select({ count: count() }).from(projects).where(projectWhereCondition),
    db.select({ count: count() }).from(solutions).where(solutionWhereCondition),
    db.select({ count: count() }).from(tasks).where(taskWhereCondition),
    db
      .select({
        projectStage: projects.projectStage,
        count: count(),
      })
      .from(projects)
      .where(projectWhereCondition)
      .groupBy(projects.projectStage),
    db
      .select({
        id: projects.id,
        projectCode: projects.projectCode,
        projectName: projects.projectName,
        status: projects.status,
        projectStage: projects.projectStage,
        progress: projects.progress,
      })
      .from(projects)
      .where(projectWhereCondition)
      .orderBy(desc(projects.createdAt))
      .limit(5),
  ]);

  return {
    totalCustomers: customerCount[0]?.count ?? 0,
    totalProjects: projectCount[0]?.count ?? 0,
    totalSolutions: solutionCount[0]?.count ?? 0,
    pendingTasks: taskCount[0]?.count ?? 0,
    projectsByStage: normalizeProjectsByStage(stageRows.map((row) => ({
      projectStage: row.projectStage,
      count: row.count,
    }))),
    recentProjects: recentProjects.map((project) => ({
      ...project,
      statusLabel: getProjectDisplayStatusLabel(project),
    })),
  };
}