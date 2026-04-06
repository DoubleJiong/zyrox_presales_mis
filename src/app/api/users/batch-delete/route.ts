import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { inArray, isNull, notInArray, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

/**
 * 批量删除用户 API
 * POST /api/users/batch-delete
 * Body: { ids: number[] } 或 { all: true, excludeIds?: number[] }
 */
export const POST = withAuth(async (request: NextRequest, context: { userId: number }) => {
  try {
    const body = await request.json();
    const { ids, all, excludeIds } = body;
    const currentUserId = context.userId;

    if (all) {
      // 删除所有未删除的用户（排除当前用户和指定的排除列表）
      const excludeList = excludeIds ? [...excludeIds, currentUserId] : [currentUserId];
      
      const result = await db
        .update(users)
        .set({ deletedAt: new Date() })
        .where(
          and(
            isNull(users.deletedAt),
            notInArray(users.id, excludeList)
          )
        )
        .returning({ id: users.id });

      return successResponse({
        deleted: result.length,
        message: `成功删除 ${result.length} 个用户`,
      });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse('BAD_REQUEST', '请提供要删除的用户ID列表');
    }

    // 防止删除当前用户
    const safeIds = ids.filter(id => id !== currentUserId);

    if (safeIds.length === 0) {
      return errorResponse('BAD_REQUEST', '不能删除当前登录用户');
    }

    // 批量软删除
    const result = await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(inArray(users.id, safeIds))
      .returning({ id: users.id });

    return successResponse({
      deleted: result.length,
      message: `成功删除 ${result.length} 个用户`,
    });
  } catch (error) {
    console.error('Failed to batch delete users:', error);
    return errorResponse('INTERNAL_ERROR', '批量删除失败');
  }
});
