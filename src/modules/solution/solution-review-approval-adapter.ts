import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { solutionReviews, solutions } from '@/db/schema';
import {
  createApprovalEvent,
  createApprovalRequest,
  createApprovalStep,
  getLatestOpenApprovalByBusinessObject,
  updateApprovalRequestStatus,
  updateCurrentApprovalStep,
} from '@/modules/approval/approval-repository';
import { getProjectStageSnapshot } from '@/modules/project/project-stage-repository';
import { transitionProjectStage } from '@/modules/project/project-stage-service';

export interface CreateSolutionReviewApprovalInput {
  solutionId: number;
  subSchemeId?: number;
  versionId?: number;
  reviewerId: number;
  reviewType: string;
  reviewComment?: string;
  reviewScore?: number;
  dueDate?: Date;
}

export interface SubmitSolutionReviewApprovalInput {
  reviewId: number;
  reviewStatus: 'approved' | 'rejected' | 'revision_required';
  reviewComment?: string;
  reviewScore?: number;
  reviewCriteria?: Array<{
    criterion: string;
    score: number;
    comment?: string;
  }>;
}

class SolutionReviewApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SolutionReviewApprovalError';
  }
}

async function getSolutionContext(solutionId: number) {
  const rows = await db
    .select({
      id: solutions.id,
      solutionName: solutions.solutionName,
      projectId: solutions.projectId,
      authorId: solutions.authorId,
      ownerId: solutions.ownerId,
    })
    .from(solutions)
    .where(eq(solutions.id, solutionId))
    .limit(1);

  return rows[0] ?? null;
}

function getSolutionReviewTitle(solutionName: string) {
  return `${solutionName} 方案评审审批`;
}

function getApprovalDecision(reviewStatus: 'approved' | 'rejected' | 'revision_required') {
  return reviewStatus === 'approved' ? 'approved' : 'rejected';
}

function getSolutionStatusAfterFinalReview(reviewStatus: 'approved' | 'rejected' | 'revision_required') {
  return reviewStatus === 'approved' ? 'approved' : 'draft';
}

async function createSubmittedApprovalForReview(input: {
  reviewId: number;
  solutionId: number;
  solutionName: string;
  projectId?: number | null;
  initiatorId: number;
  reviewerId: number;
  reviewType: string;
  reviewComment?: string;
  reviewScore?: number;
  submittedAt?: Date | null;
  legacyBridged?: boolean;
}) {
  const approvalRequest = await createApprovalRequest({
    approvalType: 'solution_review',
    businessObjectType: 'solution',
    businessObjectId: input.reviewId,
    projectId: input.projectId ?? null,
    title: getSolutionReviewTitle(input.solutionName),
    status: 'submitted',
    currentStep: 1,
    initiatorId: input.initiatorId,
    submittedAt: input.submittedAt ?? new Date(),
    metadata: {
      solutionId: input.solutionId,
      reviewId: input.reviewId,
      reviewType: input.reviewType,
      reviewerId: input.reviewerId,
      legacyBridged: input.legacyBridged ?? false,
      comment: input.reviewComment ?? null,
      reviewScore: input.reviewScore ?? null,
    },
  });

  await createApprovalStep({
    approvalRequestId: approvalRequest.id,
    stepOrder: 1,
    approverId: input.reviewerId,
    approverRole: 'solution_reviewer',
    status: 'pending',
  });

  await createApprovalEvent({
    approvalRequestId: approvalRequest.id,
    eventType: 'submitted',
    operatorId: input.initiatorId,
    payload: {
      reviewId: input.reviewId,
      solutionId: input.solutionId,
      reviewType: input.reviewType,
      comment: input.reviewComment ?? null,
      reviewScore: input.reviewScore ?? null,
      legacyBridged: input.legacyBridged ?? false,
    },
  });

  return approvalRequest;
}

async function ensureApprovalRequestForLegacyReview(input: {
  reviewId: number;
  solutionId: number;
  solutionName: string;
  projectId?: number | null;
  initiatorId: number;
  reviewerId: number;
  reviewType: string;
  reviewComment?: string | null;
  reviewScore?: number | null;
  submittedAt?: Date | null;
}) {
  const existing = await getLatestOpenApprovalByBusinessObject({
    approvalType: 'solution_review',
    businessObjectType: 'solution',
    businessObjectId: input.reviewId,
  });

  if (existing) {
    return existing;
  }

  return createSubmittedApprovalForReview({
    reviewId: input.reviewId,
    solutionId: input.solutionId,
    solutionName: input.solutionName,
    projectId: input.projectId,
    initiatorId: input.initiatorId,
    reviewerId: input.reviewerId,
    reviewType: input.reviewType,
    reviewComment: input.reviewComment ?? undefined,
    reviewScore: input.reviewScore ?? undefined,
    submittedAt: input.submittedAt ?? null,
    legacyBridged: true,
  });
}

export async function createSolutionReviewApproval(input: CreateSolutionReviewApprovalInput) {
  const solution = await getSolutionContext(input.solutionId);

  if (!solution) {
    throw new SolutionReviewApprovalError('方案不存在');
  }

  const [review] = await db
    .insert(solutionReviews)
    .values({
      solutionId: input.solutionId,
      subSchemeId: input.subSchemeId,
      versionId: input.versionId,
      reviewerId: input.reviewerId,
      reviewType: input.reviewType,
      reviewStatus: 'pending',
      reviewComment: input.reviewComment,
      reviewScore: input.reviewScore,
      dueDate: input.dueDate,
      isFinal: true,
      reviewRound: 1,
    })
    .returning();

  const initiatorId = solution.ownerId ?? solution.authorId;
  const approvalRequest = await createSubmittedApprovalForReview({
    reviewId: review.id,
    solutionId: input.solutionId,
    solutionName: solution.solutionName,
    projectId: solution.projectId,
    initiatorId,
    reviewerId: input.reviewerId,
    reviewType: input.reviewType,
    reviewComment: input.reviewComment,
    reviewScore: input.reviewScore,
  });

  await db
    .update(solutions)
    .set({
      status: 'reviewing',
      approvalStatus: 'pending',
      updatedAt: new Date(),
    })
    .where(eq(solutions.id, input.solutionId));

  if (solution.projectId) {
    const project = await getProjectStageSnapshot(solution.projectId);

    if (project?.projectStage === 'bidding') {
      await transitionProjectStage({
        projectId: solution.projectId,
        toStage: 'solution_review',
        operatorId: initiatorId,
        triggerType: 'approval_submitted',
        triggerId: approvalRequest.id,
        reason: '提交方案评审审批',
      });
    }
  }

  return {
    ...review,
    approvalRequestId: approvalRequest.id,
  };
}

export async function submitSolutionReviewApproval(input: SubmitSolutionReviewApprovalInput) {
  const rows = await db
    .select()
    .from(solutionReviews)
    .where(eq(solutionReviews.id, input.reviewId))
    .limit(1);
  const review = rows[0] ?? null;

  if (!review) {
    throw new SolutionReviewApprovalError('评审不存在');
  }

  if (review.reviewStatus !== 'pending') {
    throw new SolutionReviewApprovalError('评审已结束');
  }

  const solution = await getSolutionContext(review.solutionId);

  if (!solution) {
    throw new SolutionReviewApprovalError('方案不存在');
  }

  const initiatorId = solution.ownerId ?? solution.authorId;
  const approvalRequest = await ensureApprovalRequestForLegacyReview({
    reviewId: review.id,
    solutionId: review.solutionId,
    solutionName: solution.solutionName,
    projectId: solution.projectId,
    initiatorId,
    reviewerId: review.reviewerId,
    reviewType: review.reviewType,
    reviewComment: review.reviewComment,
    reviewScore: review.reviewScore,
    submittedAt: review.createdAt,
  });

  const reviewedAt = new Date();
  const decision = getApprovalDecision(input.reviewStatus);

  const updated = await db.transaction(async (tx) => {
    const updatedRows = await tx
      .update(solutionReviews)
      .set({
        reviewStatus: input.reviewStatus,
        reviewComment: input.reviewComment,
        reviewScore: input.reviewScore,
        reviewCriteria: (input.reviewCriteria ?? review.reviewCriteria) as typeof review.reviewCriteria,
        reviewedAt,
        updatedAt: reviewedAt,
      })
      .where(eq(solutionReviews.id, input.reviewId))
      .returning();

    if (review.isFinal) {
      await tx
        .update(solutions)
        .set({
          status: getSolutionStatusAfterFinalReview(input.reviewStatus),
          approvalStatus: decision,
          approvalDate: reviewedAt,
          approvalComments: input.reviewComment ?? null,
          updatedAt: reviewedAt,
        })
        .where(eq(solutions.id, review.solutionId));
    }

    return updatedRows[0];
  });

  await updateApprovalRequestStatus(approvalRequest.id, decision, {
    completedAt: reviewedAt,
    currentStep: 1,
  });
  await updateCurrentApprovalStep(approvalRequest.id, decision, 'completed', input.reviewComment);
  await createApprovalEvent({
    approvalRequestId: approvalRequest.id,
    eventType: decision,
    operatorId: review.reviewerId,
    payload: {
      reviewId: review.id,
      solutionId: review.solutionId,
      reviewStatus: input.reviewStatus,
      reviewComment: input.reviewComment ?? null,
      reviewScore: input.reviewScore ?? null,
    },
  });

  if (solution.projectId && review.isFinal) {
    const project = await getProjectStageSnapshot(solution.projectId);

    if (project?.projectStage === 'solution_review') {
      await transitionProjectStage({
        projectId: solution.projectId,
        toStage: decision === 'approved' ? 'contract_pending' : 'bidding',
        operatorId: review.reviewerId,
        triggerType: decision === 'approved' ? 'approval_approved' : 'approval_rejected',
        triggerId: approvalRequest.id,
        reason: decision === 'approved' ? '方案评审通过' : '方案评审驳回',
      });
    }
  }

  return {
    ...updated,
    approvalRequestId: approvalRequest.id,
  };
}