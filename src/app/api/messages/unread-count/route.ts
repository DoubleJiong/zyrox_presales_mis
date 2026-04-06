import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';

// 获取未读消息数量
export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    // 总未读数
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.isRead, false),
          eq(messages.isDeleted, false)
        )
      );

    // 按类型分组统计
    const typeCounts = await db
      .select({
        type: messages.type,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.isRead, false),
          eq(messages.isDeleted, false)
        )
      )
      .groupBy(messages.type);

    // 按优先级分组统计
    const priorityCounts = await db
      .select({
        priority: messages.priority,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.isRead, false),
          eq(messages.isDeleted, false)
        )
      )
      .groupBy(messages.priority);

    return NextResponse.json({
      success: true,
      data: {
        total: totalResult?.count || 0,
        byType: typeCounts.reduce((acc, item) => {
          acc[item.type || 'other'] = item.count;
          return acc;
        }, {} as Record<string, number>),
        byPriority: priorityCounts.reduce((acc, item) => {
          acc[item.priority || 'normal'] = item.count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('Get unread count API error:', error);
    return NextResponse.json(
      { success: false, error: '获取未读数量失败' },
      { status: 500 }
    );
  }
});
