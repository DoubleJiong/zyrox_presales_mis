import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';

// 全部标记为已读
export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const body = await request.json();
    const { type, category } = body;

    const conditions = [
      eq(messages.receiverId, userId),
      eq(messages.isRead, false),
      eq(messages.isDeleted, false),
    ];

    if (type) {
      conditions.push(eq(messages.type, type));
    }

    if (category) {
      conditions.push(eq(messages.category, category));
    }

    const result = await db
      .update(messages)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();

    return NextResponse.json({
      success: true,
      message: `已将 ${result.length} 条消息标记为已读`,
      data: { count: result.length },
    });
  } catch (error) {
    console.error('Mark all as read API error:', error);
    return NextResponse.json(
      { success: false, error: '全部标记已读失败' },
      { status: 500 }
    );
  }
});
