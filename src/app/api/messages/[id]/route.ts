import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';

// 获取单个消息详情
export const GET = withAuth(async (
  request: NextRequest,
  { userId, params }
) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: '消息ID不能为空' },
        { status: 400 }
      );
    }

    const [message] = await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.id, parseInt(id)),
        eq(messages.receiverId, userId),
        eq(messages.isDeleted, false)
      ));

    if (!message) {
      return NextResponse.json(
        { success: false, error: '消息不存在或无权访问' },
        { status: 404 }
      );
    }

    // 自动标记为已读
    if (!message.isRead) {
      await db
        .update(messages)
        .set({
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(messages.id, parseInt(id)),
          eq(messages.receiverId, userId),
          eq(messages.isDeleted, false)
        ));
    }

    return NextResponse.json({
      success: true,
      data: {
        ...message,
        isRead: true, // 返回已读状态
      },
    });
  } catch (error) {
    console.error('Get message detail API error:', error);
    return NextResponse.json(
      { success: false, error: '获取消息详情失败' },
      { status: 500 }
    );
  }
});

// 删除消息（软删除）
export const DELETE = withAuth(async (
  request: NextRequest,
  { userId, params }
) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: '消息ID不能为空' },
        { status: 400 }
      );
    }

    const [deletedMessage] = await db
      .update(messages)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(messages.id, parseInt(id)),
        eq(messages.receiverId, userId),
        eq(messages.isDeleted, false)
      ))
      .returning();

    if (!deletedMessage) {
      return NextResponse.json(
        { success: false, error: '消息不存在或无权访问' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '消息已删除',
    });
  } catch (error) {
    console.error('Delete message API error:', error);
    return NextResponse.json(
      { success: false, error: '删除消息失败' },
      { status: 500 }
    );
  }
});
