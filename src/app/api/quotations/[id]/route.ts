import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotations, quotationApprovals } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - 获取报价详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [quotation] = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, parseInt(id)));

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: '报价不存在' },
        { status: 404 }
      );
    }

    // 获取审批记录
    const approvals = await db
      .select()
      .from(quotationApprovals)
      .where(eq(quotationApprovals.quotationId, parseInt(id)));

    return NextResponse.json({
      success: true,
      data: {
        ...quotation,
        approvals,
      },
    });
  } catch (error) {
    console.error('Failed to fetch quotation:', error);
    return NextResponse.json(
      { success: false, error: '获取报价详情失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新报价
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 计算最终金额
    const quotationAmount = parseFloat(body.quotationAmount || '0');
    const discountRate = parseFloat(body.discountRate || '100');
    const finalAmount = (quotationAmount * discountRate / 100).toFixed(2);

    const [updatedQuotation] = await db
      .update(quotations)
      .set({
        quotationName: body.quotationName,
        quotationAmount: body.quotationAmount,
        discountRate: body.discountRate,
        finalAmount,
        quotationItems: body.quotationItems,
        validUntil: body.validUntil || null,
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedQuotation,
    });
  } catch (error) {
    console.error('Failed to update quotation:', error);
    return NextResponse.json(
      { success: false, error: '更新报价失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除报价
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 只能删除草稿状态的报价
    const [quotation] = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, parseInt(id)));

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: '报价不存在' },
        { status: 404 }
      );
    }

    if (quotation.quotationStatus !== 'draft') {
      return NextResponse.json(
        { success: false, error: '只能删除草稿状态的报价' },
        { status: 400 }
      );
    }

    await db.delete(quotations).where(eq(quotations.id, parseInt(id)));

    return NextResponse.json({
      success: true,
      message: '报价已删除',
    });
  } catch (error) {
    console.error('Failed to delete quotation:', error);
    return NextResponse.json(
      { success: false, error: '删除报价失败' },
      { status: 500 }
    );
  }
}
