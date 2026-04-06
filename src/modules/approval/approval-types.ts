export type ApprovalType =
  | 'bidding_initiation'
  | 'solution_review'
  | 'contract_review'
  | 'special_stage_override';

export type ApprovalRequestStatus =
  | 'draft'
  | 'submitted'
  | 'in_progress'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type ApprovalDecision = 'pending' | 'approved' | 'rejected';

export type ApprovalEventType = 'submitted' | 'approved' | 'rejected' | 'withdrawn' | 'resubmitted';

export type ApprovalStepStatus = 'pending' | 'completed' | 'skipped';

export type ApprovalBusinessObjectType = 'project' | 'solution' | 'contract';

export interface ApprovalListItem {
  approvalRequestId: number;
  projectId: number;
  projectName: string;
  approvalType: ApprovalType;
  status: ApprovalRequestStatus;
  initiatorId: number;
  initiatorName: string | null;
  title: string;
  submittedAt: Date | null;
  completedAt: Date | null;
  metadata: Record<string, unknown> | null;
}