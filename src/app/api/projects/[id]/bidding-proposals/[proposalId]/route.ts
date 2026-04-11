import { NextRequest } from 'next/server';
import { db } from '@/db';
import { biddingProposals } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canWriteProject, isSystemAdmin } from '@/lib/permissions/project';

// 验证日期格式 (YYYY-MM-DD)
function isValidDate(dateString: string | undefined | null): boolean {
  if (!dateString) return true; // 允许空值
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

// 验证进度范围 (0-100)
function isValidProgress(progress: number | undefined | null): boolean {
  if (progress === undefined || progress === null) return true;
  return typeof progress === 'number' && progress >= 0 && progress <= 100;
}

function normalizeProposalProgress(status: string | undefined | null, progress: unknown) {
  if (status === 'completed') {
    return 100;
  }

  const numericProgress = Number(progress);
  if (Number.isNaN(numericProgress)) {
    return 0;
  }

  return Math.min(100, Math.max(0, numericProgress));
}

// PUT - 更新投标方案
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const proposalId = parseInt(context.params?.proposalId || '0');
    
    if (isNaN(projectId) || isNaN(proposalId)) {
      return errorResponse('BAD_REQUEST', '无效的ID');
    }

    const canWrite = await canWriteProject(projectId, context.userId);
    const isAdmin = await isSystemAdmin(context.userId);
    
    if (!canWrite && !isAdmin) {
      return errorResponse('FORBIDDEN', '没有权限编辑投标方案');
    }

    const body = await request.json();
    
    // BUG-BID002: 验证日期格式
    if (body.deadline && !isValidDate(body.deadline)) {
      return errorResponse('BAD_REQUEST', '截止日期格式无效，请使用 YYYY-MM-DD 格式');
    }
    
    // BUG-BID003: 验证进度范围
    const normalizedStatus = body.status || 'draft';
    const normalizedProgress = normalizeProposalProgress(normalizedStatus, body.progress);

    if (!isValidProgress(normalizedProgress)) {
      return errorResponse('BAD_REQUEST', '进度必须在 0-100 之间');
    }
    
    const [proposal] = await db
      .update(biddingProposals)
      .set({
        name: body.name,
        type: body.type || null,
        status: normalizedStatus,
        progress: normalizedProgress,
        deadline: body.deadline || null,
        notes: body.notes || null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(biddingProposals.id, proposalId),
        eq(biddingProposals.projectId, projectId),
        isNull(biddingProposals.deletedAt)
      ))
      .returning();

    if (!proposal) {
      return errorResponse('NOT_FOUND', '投标方案不存在');
    }

    return successResponse(proposal);
  } catch (error) {
    console.error('Failed to update bidding proposal:', error);
    return errorResponse('INTERNAL_ERROR', '更新投标方案失败');
  }
});

// DELETE - 删除投标方案
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const proposalId = parseInt(context.params?.proposalId || '0');
    
    if (isNaN(projectId) || isNaN(proposalId)) {
      return errorResponse('BAD_REQUEST', '无效的ID');
    }

    const canWrite = await canWriteProject(projectId, context.userId);
    const isAdmin = await isSystemAdmin(context.userId);
    
    if (!canWrite && !isAdmin) {
      return errorResponse('FORBIDDEN', '没有权限删除投标方案');
    }

    const [proposal] = await db
      .update(biddingProposals)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(biddingProposals.id, proposalId),
        eq(biddingProposals.projectId, projectId),
        isNull(biddingProposals.deletedAt)
      ))
      .returning();

    if (!proposal) {
      return errorResponse('NOT_FOUND', '投标方案不存在');
    }

    return successResponse({ message: '删除成功' });
  } catch (error) {
    console.error('Failed to delete bidding proposal:', error);
    return errorResponse('INTERNAL_ERROR', '删除投标方案失败');
  }
});
