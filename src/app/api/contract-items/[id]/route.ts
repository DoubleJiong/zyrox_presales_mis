import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contractItems } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/contract-items/:id
 * 获取清单项详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const itemId = parseInt(id);

    const [item] = await db
      .select()
      .from(contractItems)
      .where(eq(contractItems.id, itemId));

    if (!item) {
      return NextResponse.json(
        { success: false, error: '清单项不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Failed to fetch contract item:', error);
    return NextResponse.json(
      { success: false, error: '获取清单项失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/contract-items/:id
 * 更新清单项
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const itemId = parseInt(id);
    const body = await request.json();

    const [existing] = await db
      .select()
      .from(contractItems)
      .where(eq(contractItems.id, itemId));

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '清单项不存在' },
        { status: 404 }
      );
    }

    // 计算金额
    const quantity = body.quantity ?? existing.quantity;
    const unitPrice = body.unitPrice ?? existing.unitPrice;
    const amount = body.amount || (parseFloat(quantity) * parseFloat(unitPrice || 0));
    const totalAmount = body.totalAmount || amount;

    const [updated] = await db
      .update(contractItems)
      .set({
        productName: body.productName ?? existing.productName,
        productModel: body.productModel ?? existing.productModel,
        unit: body.unit ?? existing.unit,
        quantity: body.quantity ?? existing.quantity,
        unitPrice: body.unitPrice ?? existing.unitPrice,
        amount: String(amount),
        totalAmount: String(totalAmount),
        sortOrder: body.sortOrder ?? existing.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(contractItems.id, itemId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Failed to update contract item:', error);
    return NextResponse.json(
      { success: false, error: '更新清单项失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contract-items/:id
 * 删除清单项
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const itemId = parseInt(id);

    const [deleted] = await db
      .delete(contractItems)
      .where(eq(contractItems.id, itemId))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '清单项不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: deleted.id },
    });
  } catch (error) {
    console.error('Failed to delete contract item:', error);
    return NextResponse.json(
      { success: false, error: '删除清单项失败' },
      { status: 500 }
    );
  }
}
