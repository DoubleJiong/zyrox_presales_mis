import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contractItems, contracts } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * POST /api/contract-items/batch
 * 批量创建合同清单项
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractId, items } = body;

    if (!contractId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: '参数错误' },
        { status: 400 }
      );
    }

    // 获取合同信息
    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId));

    if (!contract) {
      return NextResponse.json(
        { success: false, error: '合同不存在' },
        { status: 404 }
      );
    }

    // 获取当前最大排序号
    const [maxSort] = await db
      .select({ maxSort: contractItems.sortOrder })
      .from(contractItems)
      .where(eq(contractItems.contractId, contractId))
      .orderBy(desc(contractItems.sortOrder))
      .limit(1);

    let nextSort = (maxSort?.maxSort || 0) + 1;

    // 批量插入
    const insertedItems = [];
    for (const item of items) {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const amount = item.amount || (quantity * unitPrice);
      
      const [inserted] = await db
        .insert(contractItems)
        .values({
          contractId,
          contractCode: contract.contractCode,
          projectCode: contract.projectCode,
          signerUnit: contract.signerUnit,
          userUnit: contract.userUnit,
          projectName: contract.contractName,
          contractAmount: contract.contractAmount,
          productName: item.productName,
          productModel: item.productModel || null,
          unit: item.unit || null,
          quantity: String(quantity),
          unitPrice: String(unitPrice),
          amount: String(amount),
          totalAmount: String(amount),
          sortOrder: nextSort++,
        })
        .returning();
      
      insertedItems.push(inserted);
    }

    return NextResponse.json({
      success: true,
      data: {
        count: insertedItems.length,
        items: insertedItems,
      },
    });
  } catch (error) {
    console.error('Failed to batch create contract items:', error);
    return NextResponse.json(
      { success: false, error: '批量创建合同清单失败' },
      { status: 500 }
    );
  }
}
