import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { approvalEvents, approvalRequests, approvalSteps, projectBiddings, projects, users } from '@/db/schema';

import type {
  ApprovalBusinessObjectType,
  ApprovalDecision,
  ApprovalEventType,
  ApprovalListItem,
  ApprovalRequestStatus,
  ApprovalStepStatus,
  ApprovalType,
} from './approval-types';

export interface CreateApprovalRequestInput {
  approvalType: ApprovalType;
  businessObjectType: ApprovalBusinessObjectType;
  businessObjectId: number;
  projectId?: number | null;
  title: string;
  status: ApprovalRequestStatus;
  currentStep?: number;
  initiatorId: number;
  submittedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
}

export interface CreateApprovalStepInput {
  approvalRequestId: number;
  stepOrder: number;
  approverId?: number | null;
  approverRole?: string | null;
  decision?: ApprovalDecision;
  decisionAt?: Date | null;
  comment?: string | null;
  status: ApprovalStepStatus;
}

export interface CreateApprovalEventInput {
  approvalRequestId: number;
  eventType: ApprovalEventType;
  operatorId: number;
  payload?: Record<string, unknown> | null;
}

export async function createApprovalRequest(input: CreateApprovalRequestInput) {
  const rows = await db
    .insert(approvalRequests)
    .values({
      approvalType: input.approvalType,
      businessObjectType: input.businessObjectType,
      businessObjectId: input.businessObjectId,
      projectId: input.projectId ?? null,
      title: input.title,
      status: input.status,
      currentStep: input.currentStep ?? 1,
      initiatorId: input.initiatorId,
      submittedAt: input.submittedAt ?? null,
      metadata: input.metadata ?? null,
    })
    .returning({
      id: approvalRequests.id,
      projectId: approvalRequests.projectId,
      status: approvalRequests.status,
      title: approvalRequests.title,
    });

  return rows[0];
}

export async function createApprovalStep(input: CreateApprovalStepInput) {
  await db.insert(approvalSteps).values({
    approvalRequestId: input.approvalRequestId,
    stepOrder: input.stepOrder,
    approverId: input.approverId ?? null,
    approverRole: input.approverRole ?? null,
    decision: input.decision ?? 'pending',
    decisionAt: input.decisionAt ?? null,
    comment: input.comment ?? null,
    status: input.status,
  });
}

export async function createApprovalEvent(input: CreateApprovalEventInput) {
  await db.insert(approvalEvents).values({
    approvalRequestId: input.approvalRequestId,
    eventType: input.eventType,
    operatorId: input.operatorId,
    payload: input.payload ?? null,
  });
}

export async function getApprovalRequestById(approvalRequestId: number) {
  const rows = await db
    .select({
      id: approvalRequests.id,
      projectId: approvalRequests.projectId,
      approvalType: approvalRequests.approvalType,
      status: approvalRequests.status,
      title: approvalRequests.title,
      currentStep: approvalRequests.currentStep,
    })
    .from(approvalRequests)
    .where(eq(approvalRequests.id, approvalRequestId))
    .limit(1);

  return rows[0] ?? null;
}

export async function getLatestOpenBiddingApprovalByProjectId(projectId: number) {
  const rows = await db
    .select({
      id: approvalRequests.id,
      projectId: approvalRequests.projectId,
      status: approvalRequests.status,
    })
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.projectId, projectId),
        eq(approvalRequests.approvalType, 'bidding_initiation'),
        inArray(approvalRequests.status, ['submitted', 'in_progress']),
      ),
    )
    .orderBy(desc(approvalRequests.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

export async function getLatestOpenApprovalByBusinessObject(input: {
  approvalType: ApprovalType;
  businessObjectType: ApprovalBusinessObjectType;
  businessObjectId: number;
}) {
  const rows = await db
    .select({
      id: approvalRequests.id,
      projectId: approvalRequests.projectId,
      status: approvalRequests.status,
      initiatorId: approvalRequests.initiatorId,
      submittedAt: approvalRequests.submittedAt,
    })
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.approvalType, input.approvalType),
        eq(approvalRequests.businessObjectType, input.businessObjectType),
        eq(approvalRequests.businessObjectId, input.businessObjectId),
        inArray(approvalRequests.status, ['submitted', 'in_progress']),
      ),
    )
    .orderBy(desc(approvalRequests.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

export async function updateApprovalRequestStatus(
  approvalRequestId: number,
  status: ApprovalRequestStatus,
  options: { completedAt?: Date | null; cancelledAt?: Date | null; currentStep?: number } = {},
) {
  await db
    .update(approvalRequests)
    .set({
      status,
      completedAt: options.completedAt ?? null,
      cancelledAt: options.cancelledAt ?? null,
      currentStep: options.currentStep,
      updatedAt: new Date(),
    })
    .where(eq(approvalRequests.id, approvalRequestId));
}

export async function updateCurrentApprovalStep(
  approvalRequestId: number,
  decision: ApprovalDecision,
  status: ApprovalStepStatus,
  comment?: string | null,
) {
  await db
    .update(approvalSteps)
    .set({
      decision,
      status,
      comment: comment ?? null,
      decisionAt: new Date(),
    })
    .where(and(eq(approvalSteps.approvalRequestId, approvalRequestId), eq(approvalSteps.stepOrder, 1)));
}

export async function ensureProjectBiddingRecord(projectId: number) {
  const rows = await db
    .select({ id: projectBiddings.id })
    .from(projectBiddings)
    .where(eq(projectBiddings.projectId, projectId))
    .limit(1);

  if (rows[0]) {
    return rows[0];
  }

  const inserted = await db
    .insert(projectBiddings)
    .values({
      projectId,
      bidResult: 'pending',
      bidBondStatus: 'unpaid',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: projectBiddings.id });

  return inserted[0] ?? null;
}

export async function listBiddingInitiationApprovals(options: {
  requesterId: number;
  canViewAll: boolean;
  statuses?: ApprovalRequestStatus[];
}): Promise<ApprovalListItem[]> {
  const conditions = [eq(approvalRequests.approvalType, 'bidding_initiation')];

  if (options.statuses && options.statuses.length > 0) {
    conditions.push(inArray(approvalRequests.status, options.statuses));
  }

  if (!options.canViewAll) {
    conditions.push(eq(approvalRequests.initiatorId, options.requesterId));
  }

  const rows = await db
    .select({
      approvalRequestId: approvalRequests.id,
      projectId: approvalRequests.projectId,
      projectName: projects.projectName,
      approvalType: approvalRequests.approvalType,
      status: approvalRequests.status,
      initiatorId: approvalRequests.initiatorId,
      initiatorName: users.realName,
      title: approvalRequests.title,
      submittedAt: approvalRequests.submittedAt,
      completedAt: approvalRequests.completedAt,
      metadata: approvalRequests.metadata,
    })
    .from(approvalRequests)
    .leftJoin(projects, eq(approvalRequests.projectId, projects.id))
    .leftJoin(users, eq(approvalRequests.initiatorId, users.id))
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(approvalRequests.createdAt));

  return rows
    .filter((row) => row.projectId !== null)
    .map((row) => ({
      approvalRequestId: row.approvalRequestId,
      projectId: row.projectId as number,
      projectName: row.projectName ?? '未知项目',
      approvalType: row.approvalType as ApprovalType,
      status: row.status as ApprovalRequestStatus,
      initiatorId: row.initiatorId,
      initiatorName: row.initiatorName,
      title: row.title,
      submittedAt: row.submittedAt,
      completedAt: row.completedAt,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    }));
}