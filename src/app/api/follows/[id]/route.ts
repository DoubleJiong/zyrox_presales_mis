import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { follows } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// 获取单个关注详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [follow] = await db
      .select()
      .from(follows)
      .where(eq(follows.id, parseInt(id)));

    if (!follow) {
      return NextResponse.json(
        { success: false, error: '关注记录不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: follow,
    });
  } catch (error) {
    console.error('Get follow detail API error:', error);
    return NextResponse.json(
      { success: false, error: '获取关注详情失败' },
      { status: 500 }
    );
  }
}

// 更新关注设置
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [updatedFollow] = await db
      .update(follows)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(follows.id, parseInt(id)))
      .returning();

    if (!updatedFollow) {
      return NextResponse.json(
        { success: false, error: '关注记录不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedFollow,
      message: '更新成功',
    });
  } catch (error) {
    console.error('Update follow API error:', error);
    return NextResponse.json(
      { success: false, error: '更新关注失败' },
      { status: 500 }
    );
  }
}

// 取消关注（软删除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [deletedFollow] = await db
      .update(follows)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(follows.id, parseInt(id)))
      .returning();

    if (!deletedFollow) {
      return NextResponse.json(
        { success: false, error: '关注记录不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '已取消关注',
    });
  } catch (error) {
    console.error('Unfollow API error:', error);
    return NextResponse.json(
      { success: false, error: '取消关注失败' },
      { status: 500 }
    );
  }
}
