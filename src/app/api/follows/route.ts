import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { follows } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// 关注目标类型
type TargetType = 'project' | 'customer' | 'opportunity' | 'lead' | 'solution';
type FollowType = 'normal' | 'important' | 'starred';

// 获取关注列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '1';
    const targetType = searchParams.get('targetType');
    const followType = searchParams.get('followType');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const conditions = [
      eq(follows.userId, parseInt(userId)),
      sql`${follows.deletedAt} IS NULL`,
    ];

    if (targetType) {
      conditions.push(eq(follows.targetType, targetType));
    }

    if (followType) {
      conditions.push(eq(follows.followType, followType));
    }

    // 获取总数
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(and(...conditions));

    const total = countResult?.count || 0;

    // 获取关注列表
    const followList = await db
      .select()
      .from(follows)
      .where(and(...conditions))
      .orderBy(desc(follows.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({
      success: true,
      data: {
        list: followList.map((item) => ({
          id: item.id,
          userId: item.userId,
          targetType: item.targetType,
          targetId: item.targetId,
          targetName: item.targetName,
          followType: item.followType,
          notificationEnabled: item.notificationEnabled,
          lastViewAt: item.lastViewAt,
          viewCount: item.viewCount,
          notes: item.notes,
          createdAt: item.createdAt,
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
    console.error('Get follows API error:', error);
    return NextResponse.json(
      { success: false, error: '获取关注列表失败' },
      { status: 500 }
    );
  }
}

// 添加关注
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      targetType,
      targetId,
      targetName,
      followType = 'normal',
      notificationEnabled = true,
      notes,
    } = body;

    if (!userId || !targetType || !targetId) {
      return NextResponse.json(
        { success: false, error: '用户ID、目标类型和目标ID不能为空' },
        { status: 400 }
      );
    }

    // 检查是否已关注
    const [existing] = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.userId, userId),
          eq(follows.targetType, targetType),
          eq(follows.targetId, targetId)
        )
      );

    if (existing && !existing.deletedAt) {
      return NextResponse.json(
        { success: false, error: '已经关注了该目标' },
        { status: 400 }
      );
    }

    // 如果存在但已删除，则恢复
    if (existing && existing.deletedAt) {
      const [restored] = await db
        .update(follows)
        .set({
          followType,
          notificationEnabled,
          notes,
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(follows.id, existing.id))
        .returning();

      return NextResponse.json({
        success: true,
        data: restored,
        message: '关注成功',
      });
    }

    // 创建新关注
    const [newFollow] = await db
      .insert(follows)
      .values({
        userId,
        targetType,
        targetId,
        targetName,
        followType,
        notificationEnabled,
        notes,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newFollow,
      message: '关注成功',
    });
  } catch (error) {
    console.error('Add follow API error:', error);
    return NextResponse.json(
      { success: false, error: '关注失败' },
      { status: 500 }
    );
  }
}
