import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';

// 标记消息为已读
export const POST = withAuth(async (
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

    const [updatedMessage] = await db
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
      ))
      .returning();

    if (!updatedMessage) {
      return NextResponse.json(
        { success: false, error: '消息不存在或无权访问' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '消息已标记为已读',
    });
  } catch (error) {
    console.error('Mark message as read API error:', error);
    return NextResponse.json(
      { success: false, error: '标记已读失败' },
      { status: 500 }
    );
  }
});
