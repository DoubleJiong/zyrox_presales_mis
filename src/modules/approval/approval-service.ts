import {
  createApprovalEvent,
  createApprovalRequest,
  createApprovalStep,
  ensureProjectBiddingRecord,
  getApprovalRequestById,
  getLatestOpenBiddingApprovalByProjectId,
  listBiddingInitiationApprovals,
  updateApprovalRequestStatus,
  updateCurrentApprovalStep,
} from './approval-repository';
import { transitionProjectStage } from '@/modules/project/project-stage-service';
import { getProjectStageSnapshot } from '@/modules/project/project-stage-repository';

import type { ApprovalRequestStatus } from './approval-types';

export class ApprovalServiceError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'ApprovalServiceError';
    this.code = code;
    this.status = status;
  }
}

export async function submitBiddingInitiationApproval(input: {
  projectId: number;
  initiatorId: number;
  comment?: string | null;
}) {
  const project = await getProjectStageSnapshot(input.projectId);

  if (!project) {
    throw new ApprovalServiceError('NOT_FOUND', '项目不存在', 404);
  }

  if (project.projectStage !== 'opportunity') {
    throw new ApprovalServiceError('BAD_REQUEST', '项目当前阶段不支持投标立项', 400);
  }

  const existing = await getLatestOpenBiddingApprovalByProjectId(input.projectId);
  if (existing) {
    throw new ApprovalServiceError('CONFLICT', '项目已存在未完成的投标立项审批', 409);
  }

  const approvalRequest = await createApprovalRequest({
    approvalType: 'bidding_initiation',
    businessObjectType: 'project',
    businessObjectId: input.projectId,
    projectId: input.projectId,
    title: `${project.projectName} 投标立项审批`,
    status: 'submitted',
    currentStep: 1,
    initiatorId: input.initiatorId,
    submittedAt: new Date(),
    metadata: input.comment ? { comment: input.comment } : null,
  });

  await createApprovalStep({
    approvalRequestId: approvalRequest.id,
    stepOrder: 1,
    approverRole: 'bidding_approver',
    status: 'pending',
  });

  await createApprovalEvent({
    approvalRequestId: approvalRequest.id,
    eventType: 'submitted',
    operatorId: input.initiatorId,
    payload: input.comment ? { comment: input.comment } : null,
  });

  await transitionProjectStage({
    projectId: input.projectId,
    toStage: 'bidding_pending',
    operatorId: input.initiatorId,
    triggerType: 'approval_submitted',
    triggerId: approvalRequest.id,
    reason: '提交投标立项审批',
  });

  return {
    approvalRequestId: approvalRequest.id,
    projectId: input.projectId,
    status: approvalRequest.status,
  };
}

export async function approveBiddingInitiationApproval(input: {
  approvalRequestId: number;
  operatorId: number;
  comment?: string | null;
}) {
  const approvalRequest = await getApprovalRequestById(input.approvalRequestId);

  if (!approvalRequest || !approvalRequest.projectId) {
    throw new ApprovalServiceError('NOT_FOUND', '审批单不存在', 404);
  }

  if (approvalRequest.approvalType !== 'bidding_initiation') {
    throw new ApprovalServiceError('BAD_REQUEST', '当前审批单不属于投标立项审批', 400);
  }

  if (!['submitted', 'in_progress'].includes(approvalRequest.status)) {
    throw new ApprovalServiceError('BAD_REQUEST', '当前审批单不可执行审批通过', 400);
  }

  await updateApprovalRequestStatus(input.approvalRequestId, 'approved', {
    completedAt: new Date(),
    currentStep: 1,
  });
  await updateCurrentApprovalStep(input.approvalRequestId, 'approved', 'completed', input.comment);
  await createApprovalEvent({
    approvalRequestId: input.approvalRequestId,
    eventType: 'approved',
    operatorId: input.operatorId,
    payload: input.comment ? { comment: input.comment } : null,
  });
  await ensureProjectBiddingRecord(approvalRequest.projectId);
  await transitionProjectStage({
    projectId: approvalRequest.projectId,
    toStage: 'bidding',
    operatorId: input.operatorId,
    triggerType: 'approval_approved',
    triggerId: input.approvalRequestId,
    reason: '投标立项审批通过',
  });

  return {
    approvalRequestId: input.approvalRequestId,
    projectId: approvalRequest.projectId,
    status: 'approved' as const,
  };
}

export async function rejectBiddingInitiationApproval(input: {
  approvalRequestId: number;
  operatorId: number;
  comment?: string | null;
}) {
  const approvalRequest = await getApprovalRequestById(input.approvalRequestId);

  if (!approvalRequest || !approvalRequest.projectId) {
    throw new ApprovalServiceError('NOT_FOUND', '审批单不存在', 404);
  }

  if (approvalRequest.approvalType !== 'bidding_initiation') {
    throw new ApprovalServiceError('BAD_REQUEST', '当前审批单不属于投标立项审批', 400);
  }

  if (!['submitted', 'in_progress'].includes(approvalRequest.status)) {
    throw new ApprovalServiceError('BAD_REQUEST', '当前审批单不可执行审批驳回', 400);
  }

  await updateApprovalRequestStatus(input.approvalRequestId, 'rejected', {
    completedAt: new Date(),
    currentStep: 1,
  });
  await updateCurrentApprovalStep(input.approvalRequestId, 'rejected', 'completed', input.comment);
  await createApprovalEvent({
    approvalRequestId: input.approvalRequestId,
    eventType: 'rejected',
    operatorId: input.operatorId,
    payload: input.comment ? { comment: input.comment } : null,
  });
  await transitionProjectStage({
    projectId: approvalRequest.projectId,
    toStage: 'opportunity',
    operatorId: input.operatorId,
    triggerType: 'approval_rejected',
    triggerId: input.approvalRequestId,
    reason: '投标立项审批驳回',
  });

  return {
    approvalRequestId: input.approvalRequestId,
    projectId: approvalRequest.projectId,
    status: 'rejected' as const,
  };
}

export async function resolveOpenBiddingApprovalRequestId(projectId: number) {
  const approvalRequest = await getLatestOpenBiddingApprovalByProjectId(projectId);
  return approvalRequest?.id ?? null;
}

export async function listBiddingApprovalsForRoute(input: {
  requesterId: number;
  canViewAll: boolean;
  statuses?: ApprovalRequestStatus[];
}) {
  return listBiddingInitiationApprovals(input);
}