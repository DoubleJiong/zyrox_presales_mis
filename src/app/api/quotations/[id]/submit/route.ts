import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotations, quotationApprovals } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
