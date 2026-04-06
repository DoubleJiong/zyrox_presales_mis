import {
  canTransitionProjectStage,
  getCompatProjectStatusForStage,
  isGovernedProjectStage,
} from './project-stage-policy';
import {
  getProjectStageSnapshot,
  insertProjectStageTransition,
  updateProjectStage,
} from './project-stage-repository';
import type { GovernedProjectStage, ProjectStageTriggerType } from './project-stage-types';

export class ProjectStageTransitionError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'ProjectStageTransitionError';
    this.code = code;
    this.status = status;
  }
}

export interface TransitionProjectStageInput {
  projectId: number;
  toStage: GovernedProjectStage;
  operatorId: number;
  triggerType: ProjectStageTriggerType;
  triggerId?: number | null;
  reason?: string | null;
}

export async function transitionProjectStage(input: TransitionProjectStageInput) {
  const project = await getProjectStageSnapshot(input.projectId);

  if (!project) {
    throw new ProjectStageTransitionError('NOT_FOUND', '项目不存在', 404);
  }

  if (!isGovernedProjectStage(project.projectStage)) {
    throw new ProjectStageTransitionError(
      'INVALID_STAGE_SOURCE',
      `项目当前阶段 ${project.projectStage} 不在统一状态机范围内`,
      409,
    );
  }

  if (!canTransitionProjectStage(project.projectStage, input.toStage)) {
    throw new ProjectStageTransitionError(
      'INVALID_STAGE_TRANSITION',
      `不允许从 ${project.projectStage} 迁移到 ${input.toStage}`,
      409,
    );
  }

  const compatStatus = getCompatProjectStatusForStage(input.toStage);

  await updateProjectStage(input.projectId, input.toStage, compatStatus);
  await insertProjectStageTransition({
    projectId: input.projectId,
    fromStage: project.projectStage,
    toStage: input.toStage,
    triggerType: input.triggerType,
    triggerId: input.triggerId ?? null,
    operatorId: input.operatorId,
    reason: input.reason ?? null,
  });

  return {
    projectId: input.projectId,
    projectName: project.projectName,
    fromStage: project.projectStage,
    toStage: input.toStage,
    compatStatus,
  };
}