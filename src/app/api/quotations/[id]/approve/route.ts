import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotations, quotationApprovals } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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
