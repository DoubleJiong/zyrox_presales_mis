import { NextRequest } from 'next/server';
import { db } from '@/db';
import { solutionSectionMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

// DELETE /api/solutions/[id]/members/[memberId] - 删除板块成员
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const plateId = parseInt(context.params?.id || '0');
    const memberId = parseInt(context.params?.memberId || '0');
    
    if (isNaN(plateId) || isNaN(memberId)) {
      return errorResponse('BAD_REQUEST', '无效的ID');
    }

    // 删除成员
    const [deleted] = await db
      .delete(solutionSectionMembers)
      .where(
        and(
          eq(solutionSectionMembers.id, memberId),
          eq(solutionSectionMembers.plateId, plateId)
        )
      )
      .returning();

    if (!deleted) {
      return errorResponse('NOT_FOUND', '成员不存在', { status: 404 });
    }

    return successResponse({ message: '成员已移除' });
  } catch (error) {
    console.error('删除板块成员失败:', error);
    return errorResponse('INTERNAL_ERROR', '删除板块成员失败', { status: 500 });
  }
});

// PATCH /api/solutions/[id]/members/[memberId] - 更新成员角色
export const PATCH = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const plateId = parseInt(context.params?.id || '0');
    const memberId = parseInt(context.params?.memberId || '0');
    
    if (isNaN(plateId) || isNaN(memberId)) {
      return errorResponse('BAD_REQUEST', '无效的ID');
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !['leader', 'member'].includes(role)) {
      return errorResponse('BAD_REQUEST', '无效的角色');
    }

    // 更新成员角色
    const [updated] = await db
      .update(solutionSectionMembers)
      .set({ role, updatedAt: new Date() })
      .where(
        and(
          eq(solutionSectionMembers.id, memberId),
          eq(solutionSectionMembers.plateId, plateId)
        )
      )
      .returning();

    if (!updated) {
      return errorResponse('NOT_FOUND', '成员不存在', { status: 404 });
    }

    return successResponse(updated);
  } catch (error) {
    console.error('更新板块成员失败:', error);
    return errorResponse('INTERNAL_ERROR', '更新板块成员失败', { status: 500 });
  }
});
