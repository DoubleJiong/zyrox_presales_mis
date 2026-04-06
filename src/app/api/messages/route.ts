import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages, users } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { parsePaginationParams } from '@/lib/pagination';
import { withAuth } from '@/lib/auth-middleware';

// 消息类型
type MessageType = 'system' | 'notification' | 'alert' | 'reminder' | 'message';
type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
type MessageCategory = 'task' | 'project' | 'customer' | 'system';

// 获取消息列表
export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const isRead = searchParams.get('isRead');
    const { page, pageSize, offset } = parsePaginationParams(searchParams);

    const conditions = [
      eq(messages.receiverId, userId),
      eq(messages.isDeleted, false),
    ];

    if (type) {
      conditions.push(eq(messages.type, type));
    }

    if (category) {
      conditions.push(eq(messages.category, category));
    }

    if (isRead !== null && isRead !== undefined) {
      conditions.push(eq(messages.isRead, isRead === 'true'));
    }

    // 获取总数
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(...conditions));

    const total = countResult?.count || 0;

    // 获取消息列表
    const messageList = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: {
        list: messageList.map(({ message, sender }) => ({
          id: message.id,
          title: message.title,
          content: message.content,
          type: message.type,
          category: message.category,
          priority: message.priority,
          senderId: message.senderId,
          senderName: sender?.realName || '系统',
          senderAvatar: sender?.avatar,
          relatedType: message.relatedType,
          relatedId: message.relatedId,
          relatedName: message.relatedName,
          actionUrl: message.actionUrl,
          actionText: message.actionText,
          isRead: message.isRead,
          readAt: message.readAt,
          createdAt: message.createdAt,
          metadata: message.metadata,
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
    console.error('Get messages API error:', error);
    return NextResponse.json(
      { success: false, error: '获取消息列表失败' },
      { status: 500 }
    );
  }
});

// 发送消息
export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const body = await request.json();
    const {
      title,
      content,
      type = 'notification',
      category,
      priority = 'normal',
      receiverId,
      relatedType,
      relatedId,
      relatedName,
      actionUrl,
      actionText,
      metadata,
    } = body;

    if (!title || !content || !receiverId) {
      return NextResponse.json(
        { success: false, error: '标题、内容和接收人不能为空' },
        { status: 400 }
      );
    }

    const [newMessage] = await db
      .insert(messages)
      .values({
        title,
        content,
        type,
        category,
        priority,
        senderId: userId,
        receiverId,
        relatedType,
        relatedId,
        relatedName,
        actionUrl,
        actionText,
        metadata,
        isRead: false,
        isDeleted: false,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newMessage,
      message: '消息发送成功',
    });
  } catch (error) {
    console.error('Send message API error:', error);
    return NextResponse.json(
      { success: false, error: '发送消息失败' },
      { status: 500 }
    );
  }
});
