import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectLimit = vi.fn();
const selectWhere = vi.fn(() => ({ limit: selectLimit }));
const selectFrom = vi.fn(() => ({ where: selectWhere }));
const select = vi.fn(() => ({ from: selectFrom }));

const insertReturning = vi.fn();
const insertValues = vi.fn(() => ({ returning: insertReturning }));
const insert = vi.fn(() => ({ values: insertValues }));

const txUpdateReturning = vi.fn();
const txUpdateWhere = vi.fn(() => ({ returning: txUpdateReturning }));
const txUpdateSet = vi.fn(() => ({ where: txUpdateWhere }));
const txUpdate = vi.fn(() => ({ set: txUpdateSet }));
const transaction = vi.fn(async (callback: (tx: { update: typeof txUpdate }) => Promise<unknown>) => callback({ update: txUpdate }));

const updateWhere = vi.fn();
const updateSet = vi.fn(() => ({ where: updateWhere }));
const update = vi.fn(() => ({ set: updateSet }));

const createApprovalRequest = vi.fn();
const createApprovalStep = vi.fn();
const createApprovalEvent = vi.fn();
const getLatestOpenApprovalByBusinessObject = vi.fn();
const updateApprovalRequestStatus = vi.fn();
const updateCurrentApprovalStep = vi.fn();
const getProjectStageSnapshot = vi.fn();
const transitionProjectStage = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select,
    insert,
    update,
    transaction,
  },
}));

vi.mock('@/modules/approval/approval-repository', () => ({
  createApprovalRequest,
  createApprovalStep,
  createApprovalEvent,
  getLatestOpenApprovalByBusinessObject,
  updateApprovalRequestStatus,
  updateCurrentApprovalStep,
}));

vi.mock('@/modules/project/project-stage-repository', () => ({
  getProjectStageSnapshot,
}));

vi.mock('@/modules/project/project-stage-service', () => ({
  transitionProjectStage,
}));

vi.mock('@/db/schema', () => ({
  solutions: {
    id: 'solutions.id',
    solutionName: 'solutions.solutionName',
    projectId: 'solutions.projectId',
    authorId: 'solutions.authorId',
    ownerId: 'solutions.ownerId',
    status: 'solutions.status',
    approvalStatus: 'solutions.approvalStatus',
    approvalDate: 'solutions.approvalDate',
    approvalComments: 'solutions.approvalComments',
    updatedAt: 'solutions.updatedAt',
  },
  solutionReviews: {
    id: 'solutionReviews.id',
    solutionId: 'solutionReviews.solutionId',
    reviewerId: 'solutionReviews.reviewerId',
    reviewType: 'solutionReviews.reviewType',
    reviewStatus: 'solutionReviews.reviewStatus',
    reviewComment: 'solutionReviews.reviewComment',
    reviewScore: 'solutionReviews.reviewScore',
    reviewCriteria: 'solutionReviews.reviewCriteria',
    reviewedAt: 'solutionReviews.reviewedAt',
    updatedAt: 'solutionReviews.updatedAt',
    createdAt: 'solutionReviews.createdAt',
    isFinal: 'solutionReviews.isFinal',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

describe('solution review approval adapter', () => {
  beforeEach(() => {
    select.mockReset();
    selectFrom.mockReset();
    selectWhere.mockReset();
    selectLimit.mockReset();
    insert.mockReset();
    insertValues.mockReset();
    insertReturning.mockReset();
    update.mockReset();
    updateSet.mockReset();
    updateWhere.mockReset();
    txUpdate.mockReset();
    txUpdateSet.mockReset();
    txUpdateWhere.mockReset();
    txUpdateReturning.mockReset();
    transaction.mockClear();
    createApprovalRequest.mockReset();
    createApprovalStep.mockReset();
    createApprovalEvent.mockReset();
    getLatestOpenApprovalByBusinessObject.mockReset();
    updateApprovalRequestStatus.mockReset();
    updateCurrentApprovalStep.mockReset();
    getProjectStageSnapshot.mockReset();
    transitionProjectStage.mockReset();

    select.mockImplementation(() => ({ from: selectFrom }));
    selectFrom.mockImplementation(() => ({ where: selectWhere }));
    selectWhere.mockImplementation(() => ({ limit: selectLimit }));
    insert.mockImplementation(() => ({ values: insertValues }));
    insertValues.mockImplementation(() => ({ returning: insertReturning }));
    update.mockImplementation(() => ({ set: updateSet }));
    updateSet.mockImplementation(() => ({ where: updateWhere }));
    txUpdate.mockImplementation(() => ({ set: txUpdateSet }));
    txUpdateSet.mockImplementation(() => ({ where: txUpdateWhere }));
    txUpdateWhere.mockImplementation(() => ({ returning: txUpdateReturning }));
  });

  it('creates a unified approval when creating a solution review', async () => {
    selectLimit.mockResolvedValueOnce([
      { id: 8, solutionName: '政务大脑方案', projectId: 11, authorId: 3, ownerId: 7 },
    ]);
    insertReturning.mockResolvedValueOnce([
      { id: 501, solutionId: 8, reviewerId: 12, reviewType: 'technical', reviewStatus: 'pending' },
    ]);
    createApprovalRequest.mockResolvedValue({ id: 9002, status: 'submitted' });
    getProjectStageSnapshot.mockResolvedValue({ id: 11, projectStage: 'bidding' });

    const { createSolutionReviewApproval } = await import('../../../src/modules/solution/solution-review-approval-adapter');
    const result = await createSolutionReviewApproval({
      solutionId: 8,
      reviewerId: 12,
      reviewType: 'technical',
      reviewComment: '提交技术评审',
    });

    expect(createApprovalRequest).toHaveBeenCalledWith(expect.objectContaining({
      approvalType: 'solution_review',
      businessObjectType: 'solution',
      businessObjectId: 501,
      projectId: 11,
      initiatorId: 7,
      status: 'submitted',
    }));
    expect(createApprovalStep).toHaveBeenCalledWith(expect.objectContaining({
      approvalRequestId: 9002,
      approverId: 12,
      approverRole: 'solution_reviewer',
    }));
    expect(transitionProjectStage).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 11,
      toStage: 'solution_review',
      triggerType: 'approval_submitted',
      triggerId: 9002,
    }));
    expect(result).toMatchObject({
      id: 501,
      approvalRequestId: 9002,
    });
  });

  it('submits a final review through the unified approval and advances the project', async () => {
    selectLimit
      .mockResolvedValueOnce([
        {
          id: 501,
          solutionId: 8,
          reviewerId: 12,
          reviewType: 'technical',
          reviewStatus: 'pending',
          reviewComment: '待评审',
          reviewScore: null,
          reviewCriteria: null,
          isFinal: true,
          createdAt: new Date('2026-03-29T10:00:00Z'),
        },
      ])
      .mockResolvedValueOnce([
        { id: 8, solutionName: '政务大脑方案', projectId: 11, authorId: 3, ownerId: 7 },
      ]);
    getLatestOpenApprovalByBusinessObject.mockResolvedValue({ id: 9002, projectId: 11, status: 'submitted' });
    txUpdateReturning.mockResolvedValue([{ id: 501, reviewStatus: 'approved' }]);
    getProjectStageSnapshot.mockResolvedValue({ id: 11, projectStage: 'solution_review' });

    const { submitSolutionReviewApproval } = await import('../../../src/modules/solution/solution-review-approval-adapter');
    const result = await submitSolutionReviewApproval({
      reviewId: 501,
      reviewStatus: 'approved',
      reviewComment: '通过',
      reviewScore: 95,
    });

    expect(updateApprovalRequestStatus).toHaveBeenCalledWith(9002, 'approved', expect.objectContaining({ currentStep: 1 }));
    expect(updateCurrentApprovalStep).toHaveBeenCalledWith(9002, 'approved', 'completed', '通过');
    expect(transitionProjectStage).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 11,
      toStage: 'contract_pending',
      triggerType: 'approval_approved',
      triggerId: 9002,
    }));
    expect(result).toMatchObject({
      id: 501,
      approvalRequestId: 9002,
    });
  });
});