import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workLogs, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// 驳回工作日志
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { approverId, comment } = body;

    if (!comment) {
      return NextResponse.json(
        { success: false, error: '驳回原因不能为空' },
        { status: 400 }
      );
    }

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
        { success: false, error: '只有已提交的日志可以驳回' },
        { status: 400 }
      );
    }

    // 更新状态为已驳回
    const [updatedLog] = await db
      .update(workLogs)
      .set({
        status: 'rejected',
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
      message: '工作日志已驳回',
    });
  } catch (error) {
    console.error('Reject work log API error:', error);
    return NextResponse.json(
      { success: false, error: '驳回工作日志失败' },
      { status: 500 }
    );
  }
}
