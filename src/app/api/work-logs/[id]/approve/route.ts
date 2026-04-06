import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workLogs, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// 审批工作日志（通过）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { approverId, comment } = body;

    // 获取当前日志
    const [log] = await db
      .select({
        log: workLogs,
        user: users,
      })
      .from(workLogs)
      .leftJoin(users, eq(workLogs.userId, users.id))
      .where(eq(workLogs.id, parseInt(id)));

    if (!log?.log) {
      return NextResponse.json(
        { success: false, error: '工作日志不存在' },
        { status: 404 }
      );
    }

    if (log.log.status !== 'submitted') {
      return NextResponse.json(
        { success: false, error: '只有已提交的日志可以审批' },
        { status: 400 }
      );
    }

    // 更新状态为已通过
    const [updatedLog] = await db
      .update(workLogs)
      .set({
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
        approvalComment: comment,
        updatedAt: new Date(),
      })
      .where(eq(workLogs.id, parseInt(id)))
      .returning();

    // TODO: 发送消息通知日志提交人

    return NextResponse.json({
      success: true,
      data: updatedLog,
      message: '工作日志已通过审批',
    });
  } catch (error) {
    console.error('Approve work log API error:', error);
    return NextResponse.json(
      { success: false, error: '审批工作日志失败' },
      { status: 500 }
    );
  }
}
