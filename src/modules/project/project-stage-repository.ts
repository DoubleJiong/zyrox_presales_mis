import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { projects, projectStageTransitions } from '@/db/schema';

import type { ProjectStageSnapshot, ProjectStageTriggerType, GovernedProjectStage } from './project-stage-types';

export interface InsertProjectStageTransitionInput {
  projectId: number;
  fromStage: string;
  toStage: GovernedProjectStage;
  triggerType: ProjectStageTriggerType;
  triggerId?: number | null;
  operatorId: number;
  reason?: string | null;
}

export async function getProjectStageSnapshot(projectId: number): Promise<ProjectStageSnapshot | null> {
  const rows = await db
    .select({
      id: projects.id,
      projectName: projects.projectName,
      projectStage: projects.projectStage,
      status: projects.status,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  return rows[0] ?? null;
}

export async function updateProjectStage(projectId: number, projectStage: GovernedProjectStage, status: string) {
  await db
    .update(projects)
    .set({
      projectStage,
      status,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));
}

export async function insertProjectStageTransition(input: InsertProjectStageTransitionInput) {
  await db.insert(projectStageTransitions).values({
    projectId: input.projectId,
    fromStage: input.fromStage,
    toStage: input.toStage,
    triggerType: input.triggerType,
    triggerId: input.triggerId ?? null,
    operatorId: input.operatorId,
    reason: input.reason ?? null,
  });
}

export async function getLatestProjectStageTransition(projectId: number) {
  const rows = await db
    .select({
      id: projectStageTransitions.id,
      fromStage: projectStageTransitions.fromStage,
      toStage: projectStageTransitions.toStage,
      triggerType: projectStageTransitions.triggerType,
      triggerId: projectStageTransitions.triggerId,
      operatorId: projectStageTransitions.operatorId,
      reason: projectStageTransitions.reason,
      createdAt: projectStageTransitions.createdAt,
    })
    .from(projectStageTransitions)
    .where(eq(projectStageTransitions.projectId, projectId))
    .orderBy(desc(projectStageTransitions.createdAt))
    .limit(1);

  return rows[0] ?? null;
}