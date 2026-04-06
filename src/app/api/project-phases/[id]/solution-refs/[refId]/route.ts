import { NextRequest } from 'next/server';
import { db } from '@/db';
import { projectPhaseSolutionReferences } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

// DELETE /api/project-phases/[id]/solution-refs/[refId] - 删除方案引用
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const refId = parseInt(context.params?.refId || '0');
    
    if (isNaN(projectId) || isNaN(refId)) {
      return errorResponse('BAD_REQUEST', '无效的ID');
    }

    // 删除引用
    const [deleted] = await db
      .delete(projectPhaseSolutionReferences)
      .where(
        and(
          eq(projectPhaseSolutionReferences.id, refId),
          eq(projectPhaseSolutionReferences.projectId, projectId)
        )
      )
      .returning();

    if (!deleted) {
      return errorResponse('NOT_FOUND', '引用不存在', { status: 404 });
    }

    return successResponse({ message: '方案引用已移除' });
  } catch (error) {
    console.error('删除方案引用失败:', error);
    return errorResponse('INTERNAL_ERROR', '删除方案引用失败', { status: 500 });
  }
});
