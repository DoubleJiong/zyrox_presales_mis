import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET - 获取工作日志详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [log] = await db
      .select()
      .from(workLogs)
      .where(eq(workLogs.id, parseInt(id)));

    if (!log) {
      return NextResponse.json(
        { success: false, error: '工作日志不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error('Failed to fetch work log:', error);
    return NextResponse.json(
      { success: false, error: '获取工作日志详情失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新工作日志
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [updatedLog] = await db
      .update(workLogs)
      .set({
        logDate: body.logDate || undefined,
        workHours: body.workHours,
        workContent: body.workContent,
        workType: body.workType,
        relatedProjects: body.relatedProjects,
        relatedCustomers: body.relatedCustomers,
        attachments: body.attachments,
        location: body.location,
        mood: body.mood,
        updatedAt: new Date(),
      })
      .where(eq(workLogs.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedLog,
    });
  } catch (error) {
    console.error('Failed to update work log:', error);
    return NextResponse.json(
      { success: false, error: '更新工作日志失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除工作日志
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.delete(workLogs).where(eq(workLogs.id, parseInt(id)));

    return NextResponse.json({
      success: true,
      message: '工作日志已删除',
    });
  } catch (error) {
    console.error('Failed to delete work log:', error);
    return NextResponse.json(
      { success: false, error: '删除工作日志失败' },
      { status: 500 }
    );
  }
}
