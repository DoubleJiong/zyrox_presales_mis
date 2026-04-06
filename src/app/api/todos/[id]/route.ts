import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { todos } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';

// 获取单个待办详情
export const GET = withAuth(async (
  request: NextRequest,
  { userId }: { userId: number }
) => {
  try {
    const id = request.nextUrl.pathname.split('/').slice(-2)[0];
    
    const [todo] = await db
      .select()
      .from(todos)
      .where(and(
        eq(todos.id, parseInt(id)),
        eq(todos.assigneeId, userId)
      ));

    if (!todo) {
      return NextResponse.json({
        success: false,
        error: '待办不存在或无权访问',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: todo,
    });
  } catch (error) {
    console.error('Get todo API error:', error);
    return NextResponse.json({
      success: false,
      error: '获取待办详情失败',
    }, { status: 500 });
  }
});

// 更新待办
export const PUT = withAuth(async (
  request: NextRequest,
  { userId }: { userId: number }
) => {
  try {
    const id = request.nextUrl.pathname.split('/').slice(-2)[0];
    const body = await request.json();

    // 验证待办是否属于当前用户
    const [existingTodo] = await db
      .select()
      .from(todos)
      .where(and(
        eq(todos.id, parseInt(id)),
        eq(todos.assigneeId, userId)
      ));

    if (!existingTodo) {
      return NextResponse.json({
        success: false,
        error: '待办不存在或无权修改',
      }, { status: 404 });
    }

    const [updatedTodo] = await db
      .update(todos)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(todos.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedTodo,
      message: '待办更新成功',
    });
  } catch (error) {
    console.error('Update todo API error:', error);
    return NextResponse.json({
      success: false,
      error: '更新待办失败',
    }, { status: 500 });
  }
});

// 删除待办
export const DELETE = withAuth(async (
  request: NextRequest,
  { userId }: { userId: number }
) => {
  try {
    const id = request.nextUrl.pathname.split('/').slice(-2)[0];

    // 验证待办是否属于当前用户
    const [existingTodo] = await db
      .select()
      .from(todos)
      .where(and(
        eq(todos.id, parseInt(id)),
        eq(todos.assigneeId, userId)
      ));

    if (!existingTodo) {
      return NextResponse.json({
        success: false,
        error: '待办不存在或无权删除',
      }, { status: 404 });
    }

    await db
      .delete(todos)
      .where(eq(todos.id, parseInt(id)));

    return NextResponse.json({
      success: true,
      message: '待办删除成功',
    });
  } catch (error) {
    console.error('Delete todo API error:', error);
    return NextResponse.json({
      success: false,
      error: '删除待办失败',
    }, { status: 500 });
  }
});
