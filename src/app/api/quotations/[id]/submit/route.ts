import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotations, quotationApprovals } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendMessage } from '@/lib/messages/send';

// POST - 提交审批
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 更新报价状态
    await db
      .update(quotations)
      .set({
        quotationStatus: 'pending_approval',
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, parseInt(id)));

    // 创建审批记录
    const approvals = body.approvers || [];
    for (let i = 0; i < approvals.length; i++) {
      await db.insert(quotationApprovals).values({
        quotationId: parseInt(id),
        approverId: approvals[i].userId,
        approvalLevel: i + 1,
        approvalStatus: 'pending',
      });

      // 通知每位审批人
      await sendMessage({
        receiverId: approvals[i].userId,
        title: '有报价待您审批',
        content: `报价单已提交，请您审批（审批层级：${i + 1}）。`,
        type: 'approval',
        priority: 'normal',
        relatedType: 'quotation',
        relatedId: parseInt(id),
        actionUrl: `/quotations/${id}`,
        actionText: '查看报价',
      });
    }

    return NextResponse.json({
      success: true,
      message: '报价已提交审批',
    });
  } catch (error) {
    console.error('Failed to submit quotation:', error);
    return NextResponse.json(
      { success: false, error: '提交审批失败' },
      { status: 500 }
    );
  }
}
