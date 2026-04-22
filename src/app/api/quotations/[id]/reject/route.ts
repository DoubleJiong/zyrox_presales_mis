import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotations, quotationApprovals } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendMessage } from '@/lib/messages/send';
import { OperationLogService } from '@/lib/operation-log-service';

// POST - 审批拒绝
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 更新审批记录
    await db
      .update(quotationApprovals)
      .set({
        approvalStatus: 'rejected',
        approvalComment: body.comment || null,
        approvedAt: new Date(),
      })
      .where(and(
        eq(quotationApprovals.quotationId, parseInt(id)),
        eq(quotationApprovals.approverId, body.approverId)
      ));

    // 更新报价状态为已拒绝
    await db
      .update(quotations)
      .set({
        quotationStatus: 'rejected',
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, parseInt(id)));

    // 通知报价创建人被驳回
    const [quotationRecord] = await db
      .select({ createdBy: quotations.createdBy, quotationName: quotations.quotationName })
      .from(quotations)
      .where(eq(quotations.id, parseInt(id)));

    if (quotationRecord?.createdBy && quotationRecord.createdBy !== body.approverId) {
      await sendMessage({
        receiverId: quotationRecord.createdBy,
        senderId: body.approverId,
        title: '您的报价审批被驳回',
        content: `报价《${quotationRecord.quotationName}》审批被驳回${body.comment ? `，驳回原因：${body.comment}` : ''}，请修改后重新提交。`,
        type: 'approval',
        priority: 'high',
        relatedType: 'quotation',
        relatedId: parseInt(id),
        actionUrl: `/quotations/${id}`,
        actionText: '查看报价',
      });
      // 操作日志
      OperationLogService.log({
        userId: body.approverId,
        module: 'quotation',
        action: 'reject',
        resource: 'quotation',
        resourceId: parseInt(id),
        status: 'success',
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: '报价已拒绝',
    });
  } catch (error) {
    console.error('Failed to reject quotation:', error);
    return NextResponse.json(
      { success: false, error: '审批失败' },
      { status: 500 }
    );
  }
}
