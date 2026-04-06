export const GOVERNED_PROJECT_STAGES = [
  'opportunity',
  'bidding_pending',
  'bidding',
  'solution_review',
  'contract_pending',
  'delivery_preparing',
  'delivering',
  'settlement',
  'archived',
  'cancelled',
] as const;

export type GovernedProjectStage = (typeof GOVERNED_PROJECT_STAGES)[number];

export type ProjectStageTriggerType =
  | 'manual'
  | 'approval_submitted'
  | 'approval_approved'
  | 'approval_rejected'
  | 'system';

export interface ProjectStageSnapshot {
  id: number;
  projectName: string;
  projectStage: string;
  status: string;
}