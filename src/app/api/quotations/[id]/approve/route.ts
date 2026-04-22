import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotations, quotationApprovals } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendMessage } from '@/lib/messages/send';
import { OperationLogService } from '@/lib/operation-log-service';

// POST - 审批通过
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 更新审批记录
    const [approval] = await db
      .update(quotationApprovals)
      .set({
        approvalStatus: 'approved',
        approvalComment: body.comment || null,
        approvedAt: new Date(),
      })
      .where(and(
        eq(quotationApprovals.quotationId, parseInt(id)),
        eq(quotationApprovals.approverId, body.approverId)
      ))
      .returning();

    // 检查是否所有审批都已通过
    const allApprovals = await db
      .select()
      .from(quotationApprovals)
      .where(eq(quotationApprovals.quotationId, parseInt(id)));

    const allApproved = allApprovals.every(a => a.approvalStatus === 'approved');

    if (allApproved) {
      // 更新报价状态为已审批
      await db
        .update(quotations)
        .set({
          quotationStatus: 'approved',
          approvedBy: body.approverId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, parseInt(id)));
    }

    // 通知报价创建人审批结果
    const [quotationRecord] = await db
      .select({ createdBy: quotations.createdBy, quotationName: quotations.quotationName })
      .from(quotations)
      .where(eq(quotations.id, parseInt(id)));

    if (quotationRecord?.createdBy && quotationRecord.createdBy !== body.approverId) {
      await sendMessage({
        receiverId: quotationRecord.createdBy,
        senderId: body.approverId,
        title: allApproved ? '您的报价已全部审批通过' : '您的报价审批已通过一级',
        content: `报价《${quotationRecord.quotationName}》${allApproved ? '已全部审批通过' : '已通过一级审批，等待其他审批人'}。`,
        type: 'approval',
        priority: 'normal',
        relatedType: 'quotation',
        relatedId: parseInt(id),
        actionUrl: `/quotations/${id}`,
        actionText: '查看报价',
      });
      // 操作日志
      OperationLogService.log({
        userId: body.approverId,
        module: 'quotation',
        action: 'approve',
        resource: 'quotation',
        resourceId: parseInt(id),
        status: 'success',
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: allApproved ? '报价已审批通过' : '审批已通过，等待其他审批人',
    });
  } catch (error) {
    console.error('Failed to approve quotation:', error);
    return NextResponse.json(
      { success: false, error: '审批失败' },
      { status: 500 }
    );
  }
}
