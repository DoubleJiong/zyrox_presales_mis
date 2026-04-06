import { NextRequest } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

// 获取未读通知数量（自动使用当前登录用户ID）
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number }
) => {
  try {
    // 直接使用当前登录用户ID，不再接受参数
    // 这样可以防止用户查询其他用户的未读数量
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.receiverId, context.userId),
          eq(notifications.isRead, false),
          isNull(notifications.deletedAt)
        )
      );

    // BUG-013: 确保返回数字类型而非字符串
    // BUG-027: 简化返回格式，只返回count字段
    const count = Number(result?.count) || 0;

    return successResponse(count);
  } catch (error) {
    console.error('Get unread count API error:', error);
    return errorResponse('INTERNAL_ERROR', '获取未读数量失败');
  }
});
