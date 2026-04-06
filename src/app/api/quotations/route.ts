import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotations, quotationApprovals } from '@/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET - 获取报价列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    const conditions = [];
    
    if (projectId) {
      conditions.push(eq(quotations.projectId, parseInt(projectId)));
    }
    
    if (status) {
      conditions.push(eq(quotations.quotationStatus, status));
    }

    const quotationList = await db
      .select()
      .from(quotations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(quotations.createdAt));

    return NextResponse.json({
      success: true,
      data: quotationList,
    });
  } catch (error) {
    console.error('Failed to fetch quotations:', error);
    return errorResponse('INTERNAL_ERROR', '获取报价列表失败');
  }
}

// POST - 创建报价
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 生成报价编号
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const quotationCode = `QUO${dateStr}${Math.floor(Math.random() * 900 + 100)}`;

    // 计算最终金额
    const quotationAmount = parseFloat(body.quotationAmount || '0');
    const discountRate = parseFloat(body.discountRate || '100');
    const finalAmount = (quotationAmount * discountRate / 100).toFixed(2);

    const [newQuotation] = await db
      .insert(quotations)
      .values({
        projectId: body.projectId,
        quotationCode,
        quotationName: body.quotationName,
        quotationAmount: body.quotationAmount,
        discountRate: body.discountRate,
        finalAmount,
        quotationItems: body.quotationItems,
        quotationStatus: 'draft',
        validUntil: body.validUntil || null,
        createdBy: body.createdBy,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: newQuotation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create quotation:', error);
    return errorResponse('INTERNAL_ERROR', '创建报价失败');
  }
}

// PUT - 更新报价
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少报价ID');
    }

    // 检查报价是否存在
    const existingQuotation = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, id));

    if (!existingQuotation || existingQuotation.length === 0) {
      return errorResponse('NOT_FOUND', '报价不存在');
    }

    // 计算最终金额
    const quotationAmount = parseFloat(updateData.quotationAmount || existingQuotation[0].quotationAmount || '0');
    const discountRate = parseFloat(updateData.discountRate || existingQuotation[0].discountRate || '100');
    const finalAmount = (quotationAmount * discountRate / 100).toFixed(2);

    // 更新报价
    const updatedQuotation = await db
      .update(quotations)
      .set({
        quotationName: updateData.quotationName || existingQuotation[0].quotationName,
        quotationAmount: updateData.quotationAmount || existingQuotation[0].quotationAmount,
        discountRate: updateData.discountRate || existingQuotation[0].discountRate,
        finalAmount,
        quotationItems: updateData.quotationItems !== undefined ? updateData.quotationItems : existingQuotation[0].quotationItems,
        quotationStatus: updateData.quotationStatus || existingQuotation[0].quotationStatus,
        validUntil: updateData.validUntil !== undefined ? updateData.validUntil : existingQuotation[0].validUntil,
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedQuotation[0],
    });
  } catch (error) {
    console.error('Failed to update quotation:', error);
    return errorResponse('INTERNAL_ERROR', '更新报价失败');
  }
}

// DELETE - 删除报价
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');

    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少报价ID');
    }

    // 检查报价是否存在
    const existingQuotation = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, id));

    if (!existingQuotation || existingQuotation.length === 0) {
      return errorResponse('NOT_FOUND', '报价不存在');
    }

    // 删除报价审批记录
    await db
      .delete(quotationApprovals)
      .where(eq(quotationApprovals.quotationId, id));

    // 删除报价
    await db
      .delete(quotations)
      .where(eq(quotations.id, id));

    return successResponse({ success: true });
  } catch (error) {
    console.error('Failed to delete quotation:', error);
    return errorResponse('INTERNAL_ERROR', '删除报价失败');
  }
}
