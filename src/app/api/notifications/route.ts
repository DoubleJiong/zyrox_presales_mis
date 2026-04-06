import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications, users } from '@/db/schema';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';

// 获取通知列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const receiverId = searchParams.get('receiverId');
    const type = searchParams.get('type');
    const isRead = searchParams.get('isRead');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const conditions = [isNull(notifications.deletedAt)];

    if (receiverId) {
      conditions.push(eq(notifications.receiverId, parseInt(receiverId)));
    }

    if (type) {
      conditions.push(eq(notifications.type, type));
    }

    if (isRead !== null && isRead !== undefined) {
      conditions.push(eq(notifications.isRead, isRead === 'true'));
    }

    // 获取总数
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions));

    const total = countResult?.count || 0;

    // 获取通知列表
    const notificationList = await db
      .select({
        notification: notifications,
        sender: users,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.senderId, users.id))
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({
      success: true,
      data: {
        list: notificationList.map(({ notification, sender }) => ({
          id: notification.id,
          title: notification.title,
          content: notification.content,
          type: notification.type,
          level: notification.level,
          senderId: notification.senderId,
          senderName: sender?.realName,
          senderAvatar: sender?.avatar,
          link: notification.link,
          isRead: notification.isRead,
          readAt: notification.readAt,
          createdAt: notification.createdAt,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    console.error('Get notifications API error:', error);
    return NextResponse.json(
      { success: false, error: '获取通知列表失败' },
      { status: 500 }
    );
  }
}

// 创建通知
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, type, level, receiverId, senderId, link } = body;

    if (!title || !content || !type || !receiverId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const [notification] = await db
      .insert(notifications)
      .values({
        title,
        content,
        type,
        level: level || 'info',
        receiverId,
        senderId,
        link,
        isRead: false,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: notification,
      message: '通知发送成功',
    });
  } catch (error) {
    console.error('Create notification API error:', error);
    return NextResponse.json(
      { success: false, error: '发送通知失败' },
      { status: 500 }
    );
  }
}
