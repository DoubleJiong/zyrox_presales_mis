import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';

// 提交工作日志（从草稿变为待审核）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取当前日志
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

    if (log.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: '只有草稿状态的日志可以提交' },
        { status: 400 }
      );
    }

    // 更新状态为已提交
    const [updatedLog] = await db
      .update(workLogs)
      .set({
        status: 'submitted',
        updatedAt: new Date(),
      })
      .where(eq(workLogs.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedLog,
      message: '工作日志已提交',
    });
  } catch (error) {
    console.error('Submit work log API error:', error);
    return NextResponse.json(
      { success: false, error: '提交工作日志失败' },
      { status: 500 }
    );
  }
}
