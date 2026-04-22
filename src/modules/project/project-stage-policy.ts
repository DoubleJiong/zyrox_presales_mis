import { GOVERNED_PROJECT_STAGES, type GovernedProjectStage } from './project-stage-types';

const ALLOWED_PROJECT_STAGE_TRANSITIONS: Record<GovernedProjectStage, readonly GovernedProjectStage[]> = {
  opportunity: ['bidding_pending', 'cancelled', 'suspended'],
  bidding_pending: ['bidding', 'opportunity', 'cancelled', 'suspended'],
  bidding: ['solution_review', 'contract_pending', 'cancelled', 'suspended'],
  solution_review: ['bidding', 'contract_pending', 'cancelled', 'suspended'],
  contract_pending: ['delivery_preparing', 'bidding', 'cancelled', 'suspended'],
  delivery_preparing: ['delivering', 'cancelled', 'suspended'],
  delivering: ['settlement', 'suspended'],
  settlement: ['archived', 'suspended'],
  archived: [],
  cancelled: [],
  suspended: ['opportunity', 'bidding_pending', 'bidding', 'solution_review', 'contract_pending', 'delivery_preparing', 'delivering', 'settlement', 'archived', 'cancelled'],
};

const COMPAT_PROJECT_STATUS: Record<GovernedProjectStage, string> = {
  opportunity: 'draft',
  bidding_pending: 'ongoing',
  bidding: 'ongoing',
  solution_review: 'ongoing',
  contract_pending: 'ongoing',
  delivery_preparing: 'ongoing',
  delivering: 'ongoing',
  settlement: 'completed',
  archived: 'archived',
  cancelled: 'cancelled',
  suspended: 'ongoing',
};

export function isGovernedProjectStage(value: string): value is GovernedProjectStage {
  return GOVERNED_PROJECT_STAGES.includes(value as GovernedProjectStage);
}

export function canTransitionProjectStage(fromStage: string, toStage: GovernedProjectStage): boolean {
  if (!isGovernedProjectStage(fromStage)) {
    return false;
  }

  return ALLOWED_PROJECT_STAGE_TRANSITIONS[fromStage].includes(toStage);
}

export function getCompatProjectStatusForStage(stage: GovernedProjectStage): string {
  return COMPAT_PROJECT_STATUS[stage];
}