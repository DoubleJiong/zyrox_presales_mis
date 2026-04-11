import { NextRequest } from 'next/server';
import { db } from '@/db';
import { biddingProposals } from '@/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canWriteProject, isSystemAdmin } from '@/lib/permissions/project';

function normalizeProposalProgress(status: string | null | undefined, progress: unknown) {
  if (status === 'completed') {
    return 100;
  }

  const numericProgress = Number(progress);
  if (Number.isNaN(numericProgress)) {
    return 0;
  }

  return Math.min(100, Math.max(0, numericProgress));
}

// GET - 获取投标方案列表
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    
    if (isNaN(projectId)) {
      return errorResponse('BAD_REQUEST', '无效的项目ID');
    }

    const proposals = await db
      .select()
      .from(biddingProposals)
      .where(and(
        eq(biddingProposals.projectId, projectId),
        isNull(biddingProposals.deletedAt)
      ))
      .orderBy(desc(biddingProposals.createdAt));

    return successResponse(proposals);
  } catch (error) {
    console.error('Failed to fetch bidding proposals:', error);
    return errorResponse('INTERNAL_ERROR', '获取投标方案失败');
  }
});

// POST - 创建投标方案
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    
    if (isNaN(projectId)) {
      return errorResponse('BAD_REQUEST', '无效的项目ID');
    }

    const canWrite = await canWriteProject(projectId, context.userId);
    const isAdmin = await isSystemAdmin(context.userId);
    
    if (!canWrite && !isAdmin) {
      return errorResponse('FORBIDDEN', '没有权限创建投标方案');
    }

    const body = await request.json();
    const { name, type, status, progress, deadline, notes } = body;

    if (!name) {
      return errorResponse('BAD_REQUEST', '请填写标书名称');
    }

    const normalizedStatus = status || 'draft';

    const [proposal] = await db
      .insert(biddingProposals)
      .values({
        projectId,
        name,
        type: type || null,
        status: normalizedStatus,
        progress: normalizeProposalProgress(normalizedStatus, progress),
        ownerId: context.userId,
        deadline: deadline || null,
        notes: notes || null,
      })
      .returning();

    return successResponse(proposal);
  } catch (error) {
    console.error('Failed to create bidding proposal:', error);
    return errorResponse('INTERNAL_ERROR', '创建投标方案失败');
  }
});
