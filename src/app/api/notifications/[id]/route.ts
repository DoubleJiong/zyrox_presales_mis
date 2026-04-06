import { NextRequest } from 'next/server';
import { db } from '@/db';
import { notifications, users } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

// 获取通知详情（带权限验证）
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const notificationId = parseInt(context.params?.id || '0');

    const [result] = await db
      .select({
        notification: notifications,
        sender: users,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.senderId, users.id))
      .where(
        and(
          eq(notifications.id, notificationId),
          isNull(notifications.deletedAt)
        )
      );

    if (!result?.notification) {
      return errorResponse('NOT_FOUND', '通知不存在');
    }

    // 权限验证：只有接收者才能查看通知
    if (result.notification.receiverId !== context.userId) {
      return errorResponse('FORBIDDEN', '您没有权限查看此通知');
    }

    return successResponse({
      id: result.notification.id,
      title: result.notification.title,
      content: result.notification.content,
      type: result.notification.type,
      level: result.notification.level,
      senderId: result.notification.senderId,
      senderName: result.sender?.realName,
      senderAvatar: result.sender?.avatar,
      link: result.notification.link,
      isRead: result.notification.isRead,
      readAt: result.notification.readAt,
      createdAt: result.notification.createdAt,
    });
  } catch (error) {
    console.error('Get notification API error:', error);
    return errorResponse('INTERNAL_ERROR', '获取通知详情失败');
  }
});

// 标记通知为已读（带权限验证）
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const notificationId = parseInt(context.params?.id || '0');

    // 先查询通知，验证权限
    const [existingNotification] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          isNull(notifications.deletedAt)
        )
      );

    if (!existingNotification) {
      return errorResponse('NOT_FOUND', '通知不存在');
    }

    // 权限验证：只有接收者才能标记已读
    if (existingNotification.receiverId !== context.userId) {
      return errorResponse('FORBIDDEN', '您没有权限操作此通知');
    }

    const [updated] = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(notifications.id, notificationId))
      .returning();

    return successResponse({ ...updated, message: '已标记为已读' });
  } catch (error) {
    console.error('Mark notification read API error:', error);
    return errorResponse('INTERNAL_ERROR', '标记已读失败');
  }
});

// 部分更新通知（带权限验证）
export const PATCH = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const notificationId = parseInt(context.params?.id || '0');
    const body = await request.json();

    // 先查询通知，验证权限
    const [existingNotification] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          isNull(notifications.deletedAt)
        )
      );

    if (!existingNotification) {
      return errorResponse('NOT_FOUND', '通知不存在');
    }

    // 权限验证：只有接收者才能更新通知
    if (existingNotification.receiverId !== context.userId) {
      return errorResponse('FORBIDDEN', '您没有权限操作此通知');
    }

    const updateData: Record<string, unknown> = {};
    
    if (body.isRead !== undefined) {
      updateData.isRead = body.isRead;
      if (body.isRead) {
        updateData.readAt = new Date();
      }
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse('BAD_REQUEST', '没有要更新的字段');
    }

    const [updated] = await db
      .update(notifications)
      .set(updateData)
      .where(eq(notifications.id, notificationId))
      .returning();

    return successResponse({ ...updated, message: '更新成功' });
  } catch (error) {
    console.error('Patch notification API error:', error);
    return errorResponse('INTERNAL_ERROR', '更新通知失败');
  }
});

// 删除通知（软删除，带权限验证）
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const notificationId = parseInt(context.params?.id || '0');

    // 先查询通知，验证权限
    const [existingNotification] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          isNull(notifications.deletedAt)
        )
      );

    if (!existingNotification) {
      return errorResponse('NOT_FOUND', '通知不存在');
    }

    // 权限验证：只有接收者才能删除通知
    if (existingNotification.receiverId !== context.userId) {
      return errorResponse('FORBIDDEN', '您没有权限删除此通知');
    }

    await db
      .update(notifications)
      .set({ deletedAt: new Date() })
      .where(eq(notifications.id, notificationId));

    return successResponse({ message: '通知已删除' });
  } catch (error) {
    console.error('Delete notification API error:', error);
    return errorResponse('INTERNAL_ERROR', '删除通知失败');
  }
});
