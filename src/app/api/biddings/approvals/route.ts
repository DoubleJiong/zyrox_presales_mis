/**
 * 投标审批流程 API
 *
 * Phase 3 Batch A 起，投标立项审批统一进入正式审批实体和项目状态机服务。
 * 现阶段仅把 bid_initiation 收敛到统一审批骨架；bid_price 和 bid_document
 * 仍保持原有兼容处理，等待后续审批模型统一接入。
 */

import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { projectBiddings, projects } from '@/db/schema';
import { withAuth } from '@/lib/auth-middleware';
import { errorResponse, successResponse } from '@/lib/api-response';
import { getPermissionContext } from '@/lib/permissions/data-scope';
import { hasFullAccess } from '@/lib/permissions/middleware';
import {
  ApprovalServiceError,
  approveBiddingInitiationApproval,
  listBiddingApprovalsForRoute,
  rejectBiddingInitiationApproval,
  resolveOpenBiddingApprovalRequestId,
  submitBiddingInitiationApproval,
} from '@/modules/approval/approval-service';
import type { ApprovalRequestStatus } from '@/modules/approval/approval-types';

export type ApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

interface ApprovalRecord {
  id: number;
  projectId: number;
  projectName: string;
  approvalType: 'bid_initiation' | 'bid_price' | 'bid_document';
  status: ApprovalStatus;
  applicantId: number;
  applicantName: string;
  approverId: number | null;
  approverName: string | null;
  appliedAt: Date;
  approvedAt: Date | null;
  comment: string | null;
  details: Record<string, unknown>;
}

function mapLegacyApprovalStatus(status: ApprovalRequestStatus): ApprovalStatus {
  if (status === 'approved') {
    return 'approved';
  }

  if (status === 'rejected' || status === 'cancelled') {
    return 'rejected';
  }

  if (status === 'draft') {
    return 'draft';
  }

  return 'pending_approval';
}

function resolveApprovalStatusesForRoute(status: ApprovalStatus | null): ApprovalRequestStatus[] | undefined {
  if (!status) {
    return undefined;
  }

  switch (status) {
    case 'draft':
      return ['draft'];
    case 'pending_approval':
      return ['submitted', 'in_progress'];
    case 'approved':
      return ['approved'];
    case 'rejected':
      return ['rejected', 'cancelled'];
    default:
      return undefined;
  }
}

function toApprovalRecord(item: Awaited<ReturnType<typeof listBiddingApprovalsForRoute>>[number]): ApprovalRecord {
  return {
    id: item.approvalRequestId,
    projectId: item.projectId,
    projectName: item.projectName,
    approvalType: 'bid_initiation',
    status: mapLegacyApprovalStatus(item.status),
    applicantId: item.initiatorId,
    applicantName: item.initiatorName ?? '未知',
    approverId: null,
    approverName: null,
    appliedAt: item.submittedAt ?? new Date(),
    approvedAt: item.completedAt,
    comment: typeof item.metadata?.comment === 'string' ? item.metadata.comment : null,
    details: item.metadata ?? {},
  };
}

export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: unknown },
) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ApprovalStatus | null;
    const approvalType = searchParams.get('approvalType');

    const permissionContext = await getPermissionContext(context.userId, 'bidding');
    const canViewAll = hasFullAccess(permissionContext);

    const approvalList = (await listBiddingApprovalsForRoute({
      requesterId: context.userId,
      canViewAll,
      statuses: resolveApprovalStatusesForRoute(status),
    })).map(toApprovalRecord);

    let filteredList = approvalList;
    if (approvalType) {
      filteredList = filteredList.filter((item) => item.approvalType === approvalType);
    }

    return successResponse({
      list: filteredList,
      total: filteredList.length,
    });
  } catch (error) {
    console.error('Failed to fetch approvals:', error);
    return errorResponse('INTERNAL_ERROR', '获取审批列表失败');
  }
});

export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: unknown },
) => {
  try {
    const body = await request.json();
    const { projectId, approvalType, details } = body;

    if (!projectId || !approvalType) {
      return errorResponse('BAD_REQUEST', '缺少必要参数');
    }

    const permissionContext = await getPermissionContext(context.userId, 'bidding');
    const canApprove = hasFullAccess(permissionContext);

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return errorResponse('NOT_FOUND', '项目不存在', { status: 404 });
    }

    const isManager = project.managerId === context.userId;
    if (!isManager && !canApprove) {
      return errorResponse('FORBIDDEN', '无权提交审批', { status: 403 });
    }

    switch (approvalType) {
      case 'bid_initiation': {
        const approvalRequest = await submitBiddingInitiationApproval({
          projectId,
          initiatorId: context.userId,
          comment: typeof details?.comment === 'string' ? details.comment : null,
        });

        return successResponse({
          message: '审批提交成功',
          projectId,
          approvalType,
          approvalRequestId: approvalRequest.approvalRequestId,
          status: approvalRequest.status,
        });
      }

      case 'bid_price': {
        if (!details?.bidPrice) {
          return errorResponse('BAD_REQUEST', '缺少投标报价');
        }

        const existingBidding = await db.query.projectBiddings.findFirst({
          where: eq(projectBiddings.projectId, projectId),
        });

        if (existingBidding) {
          await db
            .update(projectBiddings)
            .set({
              bidPrice: details.bidPrice,
              updatedAt: new Date(),
            })
            .where(eq(projectBiddings.projectId, projectId));
        }

        return successResponse({
          message: '审批提交成功',
          projectId,
          approvalType,
        });
      }

      case 'bid_document': {
        if (!details?.documents) {
          return errorResponse('BAD_REQUEST', '缺少投标文件');
        }

        const bidding = await db.query.projectBiddings.findFirst({
          where: eq(projectBiddings.projectId, projectId),
        });

        if (bidding) {
          await db
            .update(projectBiddings)
            .set({
              bidDocuments: details.documents,
              updatedAt: new Date(),
            })
            .where(eq(projectBiddings.projectId, projectId));
        }

        return successResponse({
          message: '审批提交成功',
          projectId,
          approvalType,
        });
      }

      default:
        return errorResponse('BAD_REQUEST', '未知的审批类型');
    }
  } catch (error) {
    if (error instanceof ApprovalServiceError) {
      return errorResponse(error.code, error.message, { status: error.status });
    }

    console.error('Failed to submit approval:', error);
    return errorResponse('INTERNAL_ERROR', '提交审批失败');
  }
});

export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: unknown },
) => {
  try {
    const body = await request.json();
    const { projectId, approvalRequestId, action, comment } = body;

    if ((!projectId && !approvalRequestId) || !action) {
      return errorResponse('BAD_REQUEST', '缺少必要参数');
    }

    const permissionContext = await getPermissionContext(context.userId, 'bidding');
    const canApprove = hasFullAccess(permissionContext);

    if (!canApprove) {
      return errorResponse('FORBIDDEN', '无审批权限', { status: 403 });
    }

    const resolvedApprovalRequestId = approvalRequestId ?? await resolveOpenBiddingApprovalRequestId(projectId);
    if (!resolvedApprovalRequestId) {
      return errorResponse('NOT_FOUND', '审批单不存在', { status: 404 });
    }

    switch (action) {
      case 'approve': {
        const result = await approveBiddingInitiationApproval({
          approvalRequestId: resolvedApprovalRequestId,
          operatorId: context.userId,
          comment,
        });

        return successResponse({
          message: '审批通过',
          projectId: result.projectId,
          approvalRequestId: result.approvalRequestId,
        });
      }

      case 'reject': {
        const result = await rejectBiddingInitiationApproval({
          approvalRequestId: resolvedApprovalRequestId,
          operatorId: context.userId,
          comment,
        });

        return successResponse({
          message: '审批拒绝',
          projectId: result.projectId,
          approvalRequestId: result.approvalRequestId,
          comment,
        });
      }

      default:
        return errorResponse('BAD_REQUEST', '未知的审批操作');
    }
  } catch (error) {
    if (error instanceof ApprovalServiceError) {
      return errorResponse(error.code, error.message, { status: error.status });
    }

    console.error('Failed to process approval:', error);
    return errorResponse('INTERNAL_ERROR', '审批操作失败');
  }
});
