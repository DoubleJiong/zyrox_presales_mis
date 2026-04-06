import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { todos } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';

export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const conditions = [eq(todos.assigneeId, userId)];
    
    if (status) {
      conditions.push(eq(todos.todoStatus, status));
    }
    
    if (date) {
      conditions.push(eq(todos.dueDate, date));
    }

    const todoList = await db
      .select()
      .from(todos)
      .where(and(...conditions))
      .orderBy(desc(todos.priority), todos.dueDate)
      .limit(50);

    return NextResponse.json({
      success: true,
      data: todoList.map(todo => ({
        id: todo.id,
        title: todo.title,
        type: todo.type || 'other',
        priority: todo.priority || 'medium',
        dueDate: todo.dueDate,
        dueTime: todo.dueTime,
        todoStatus: todo.todoStatus,
        relatedType: todo.relatedType,
        relatedId: todo.relatedId,
        relatedName: todo.relatedName,
        description: todo.description,
        createdAt: todo.createdAt,
        completedAt: todo.completedAt,
      })),
    });
  } catch (error) {
    console.error('Get todos API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Get todos failed',
      data: [],
    });
  }
});

export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const body = await request.json();
    const {
      title,
      type = 'other',
      priority = 'medium',
      dueDate,
      dueTime,
      relatedType,
      relatedId,
      relatedName,
      assigneeId,
      description,
      reminder,
    } = body;

    if (!title) {
      return NextResponse.json({
        success: false,
        error: 'Title is required',
      }, { status: 400 });
    }

    const [newTodo] = await db
      .insert(todos)
      .values({
        title,
        type,
        priority,
        dueDate,
        dueTime,
        relatedType,
        relatedId,
        relatedName,
        assigneeId: assigneeId || userId,
        creatorId: userId,
        description,
        reminder,
        todoStatus: 'pending',
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newTodo,
      message: 'Todo created successfully',
    });
  } catch (error) {
    console.error('Create todo API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Create todo failed',
    }, { status: 500 });
  }
});
