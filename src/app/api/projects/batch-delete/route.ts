import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { inArray, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

/**
 * 批量删除项目 API
 * POST /api/projects/batch-delete
 * Body: { ids: number[] } 或 { all: true }
 */
export const POST = withAuth(async (request: NextRequest, context: { userId: number }) => {
  try {
    const body = await request.json();
    const { ids, all } = body;

    if (all) {
      // 删除所有未删除的项目
      const result = await db
        .update(projects)
        .set({ deletedAt: new Date() })
        .where(isNull(projects.deletedAt))
        .returning({ id: projects.id });

      return successResponse({
        deleted: result.length,
        message: `成功删除 ${result.length} 个项目`,
      });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse('BAD_REQUEST', '请提供要删除的项目ID列表');
    }

    // 批量软删除
    const result = await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(inArray(projects.id, ids))
      .returning({ id: projects.id });

    return successResponse({
      deleted: result.length,
      message: `成功删除 ${result.length} 个项目`,
    });
  } catch (error) {
    console.error('Failed to batch delete projects:', error);
    return errorResponse('INTERNAL_ERROR', '批量删除失败');
  }
});
