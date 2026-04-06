import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers } from '@/db/schema';
import { inArray, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

/**
 * 批量删除客户 API
 * POST /api/customers/batch-delete
 * Body: { ids: number[] } 或 { all: true }
 */
export const POST = withAuth(async (request: NextRequest, context: { userId: number }) => {
  try {
    const body = await request.json();
    const { ids, all } = body;

    if (all) {
      // 删除所有未删除的客户
      const result = await db
        .update(customers)
        .set({ deletedAt: new Date() })
        .where(isNull(customers.deletedAt))
        .returning({ id: customers.id });

      return successResponse({
        deleted: result.length,
        message: `成功删除 ${result.length} 个客户`,
      });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse('BAD_REQUEST', '请提供要删除的客户ID列表');
    }

    // 批量软删除
    const result = await db
      .update(customers)
      .set({ deletedAt: new Date() })
      .where(inArray(customers.id, ids))
      .returning({ id: customers.id });

    return successResponse({
      deleted: result.length,
      message: `成功删除 ${result.length} 个客户`,
    });
  } catch (error) {
    console.error('Failed to batch delete customers:', error);
    return errorResponse('INTERNAL_ERROR', '批量删除失败');
  }
});
