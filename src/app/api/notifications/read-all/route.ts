import { NextRequest } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

// 全部标记为已读（自动使用当前登录用户ID）
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number }
) => {
  try {
    // 直接使用当前登录用户ID，不再接受参数
    // 这样可以防止用户操作其他用户的通知
    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.receiverId, context.userId),
          eq(notifications.isRead, false),
          isNull(notifications.deletedAt)
        )
      );

    return successResponse({ message: '全部已读' });
  } catch (error) {
    console.error('Mark all read API error:', error);
    return errorResponse('INTERNAL_ERROR', '标记已读失败');
  }
});
