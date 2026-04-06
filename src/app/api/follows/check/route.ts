import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { follows } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

// 检查是否已关注
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const targetType = searchParams.get('targetType');
    const targetId = searchParams.get('targetId');

    if (!userId || !targetType || !targetId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const [follow] = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.userId, parseInt(userId)),
          eq(follows.targetType, targetType),
          eq(follows.targetId, parseInt(targetId)),
          sql`${follows.deletedAt} IS NULL`
        )
      );

    return NextResponse.json({
      success: true,
      data: {
        isFollowing: !!follow,
        follow: follow || null,
      },
    });
  } catch (error) {
    console.error('Check follow status API error:', error);
    return NextResponse.json(
      { success: false, error: '检查关注状态失败' },
      { status: 500 }
    );
  }
}
