import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotations, quotationApprovals } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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
