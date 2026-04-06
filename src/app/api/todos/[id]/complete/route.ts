import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { todos } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';

// 完成待办
export const POST = withAuth(async (
  request: NextRequest,
  { userId }: { userId: number }
) => {
  try {
    const id = request.nextUrl.pathname.split('/').slice(-3)[0];

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
        error: '待办不存在或无权操作',
      }, { status: 404 });
    }

    const [completedTodo] = await db
      .update(todos)
      .set({
        todoStatus: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(todos.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      success: true,
      data: completedTodo,
      message: '待办已完成',
    });
  } catch (error) {
    console.error('Complete todo API error:', error);
    return NextResponse.json({
      success: false,
      error: '完成待办失败',
    }, { status: 500 });
  }
});
