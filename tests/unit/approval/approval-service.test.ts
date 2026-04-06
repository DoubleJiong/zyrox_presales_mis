import { beforeEach, describe, expect, it, vi } from 'vitest';

const getProjectStageSnapshot = vi.fn();
const createApprovalRequest = vi.fn();
const createApprovalStep = vi.fn();
const createApprovalEvent = vi.fn();
const getLatestOpenBiddingApprovalByProjectId = vi.fn();
const getApprovalRequestById = vi.fn();
const updateApprovalRequestStatus = vi.fn();
const updateCurrentApprovalStep = vi.fn();
const ensureProjectBiddingRecord = vi.fn();
const transitionProjectStage = vi.fn();

vi.mock('@/modules/project/project-stage-repository', () => ({
  getProjectStageSnapshot,
}));

vi.mock('@/modules/project/project-stage-service', () => ({
  transitionProjectStage,
}));

vi.mock('@/modules/approval/approval-repository', () => ({
  createApprovalRequest,
  createApprovalStep,
  createApprovalEvent,
  getLatestOpenBiddingApprovalByProjectId,
  getApprovalRequestById,
  updateApprovalRequestStatus,
  updateCurrentApprovalStep,
  ensureProjectBiddingRecord,
  listBiddingInitiationApprovals: vi.fn(),
}));

describe('approval service', () => {
  beforeEach(() => {
    getProjectStageSnapshot.mockReset();
    createApprovalRequest.mockReset();
    createApprovalStep.mockReset();
    createApprovalEvent.mockReset();
    getLatestOpenBiddingApprovalByProjectId.mockReset();
    getApprovalRequestById.mockReset();
    updateApprovalRequestStatus.mockReset();
    updateCurrentApprovalStep.mockReset();
    ensureProjectBiddingRecord.mockReset();
    transitionProjectStage.mockReset();
  });

  it('submits bidding initiation approval and moves project into bidding_pending', async () => {
    getProjectStageSnapshot.mockResolvedValue({
      id: 11,
      projectName: '华东政务云',
      projectStage: 'opportunity',
      status: 'draft',
    });
    getLatestOpenBiddingApprovalByProjectId.mockResolvedValue(null);
    createApprovalRequest.mockResolvedValue({ id: 9001, status: 'submitted' });

    const { submitBiddingInitiationApproval } = await import('../../../src/modules/approval/approval-service');
    const result = await submitBiddingInitiationApproval({
      projectId: 11,
      initiatorId: 7,
      comment: '进入投标立项',
    });

    expect(createApprovalRequest).toHaveBeenCalledWith(expect.objectContaining({
      approvalType: 'bidding_initiation',
      projectId: 11,
      initiatorId: 7,
      status: 'submitted',
    }));
    expect(createApprovalStep).toHaveBeenCalledWith(expect.objectContaining({
      approvalRequestId: 9001,
      stepOrder: 1,
      status: 'pending',
    }));
    expect(createApprovalEvent).toHaveBeenCalledWith(expect.objectContaining({
      approvalRequestId: 9001,
      eventType: 'submitted',
      operatorId: 7,
    }));
    expect(transitionProjectStage).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 11,
      toStage: 'bidding_pending',
      triggerType: 'approval_submitted',
      triggerId: 9001,
    }));
    expect(result).toMatchObject({
      approvalRequestId: 9001,
      projectId: 11,
      status: 'submitted',
    });
  });

  it('approves bidding initiation approval and advances project into bidding', async () => {
    getApprovalRequestById.mockResolvedValue({
      id: 9001,
      projectId: 11,
      approvalType: 'bidding_initiation',
      status: 'submitted',
      title: '审批单',
      currentStep: 1,
    });

    const { approveBiddingInitiationApproval } = await import('../../../src/modules/approval/approval-service');
    const result = await approveBiddingInitiationApproval({
      approvalRequestId: 9001,
      operatorId: 2,
      comment: '同意',
    });

    expect(updateApprovalRequestStatus).toHaveBeenCalledWith(9001, 'approved', expect.objectContaining({ currentStep: 1 }));
    expect(updateCurrentApprovalStep).toHaveBeenCalledWith(9001, 'approved', 'completed', '同意');
    expect(ensureProjectBiddingRecord).toHaveBeenCalledWith(11);
    expect(transitionProjectStage).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 11,
      toStage: 'bidding',
      triggerType: 'approval_approved',
      triggerId: 9001,
    }));
    expect(result).toMatchObject({
      approvalRequestId: 9001,
      projectId: 11,
      status: 'approved',
    });
  });
});