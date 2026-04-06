import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contractItems, contracts } from '@/db/schema';
import { desc, eq, and, count } from 'drizzle-orm';

/**
 * GET /api/contract-items
 * 获取合同清单列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const contractId = searchParams.get('contractId') || '';

    // 构建查询条件
    const conditions: any[] = [];
    
    if (contractId) {
      conditions.push(eq(contractItems.contractId, parseInt(contractId)));
    }

    // 查询总数
    const [{ total }] = await db
      .select({ total: count() })
      .from(contractItems)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // 查询列表
    const list = await db
      .select()
      .from(contractItems)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(contractItems.sortOrder)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({
      success: true,
      data: {
        list,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Failed to fetch contract items:', error);
    return NextResponse.json(
      { success: false, error: '获取合同清单失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contract-items
 * 创建合同清单项
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 获取合同信息填充冗余字段
    let contractCode = body.contractCode;
    let projectCode = body.projectCode;
    let signerUnit = body.signerUnit;
    let userUnit = body.userUnit;
    let projectName = body.projectName;
    let contractAmount = body.contractAmount;

    if (body.contractId) {
      const [contract] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, body.contractId));
      
      if (contract) {
        contractCode = contract.contractCode;
        projectCode = contract.projectCode;
        signerUnit = contract.signerUnit;
        userUnit = contract.userUnit;
        projectName = contract.contractName;
        contractAmount = contract.contractAmount;
      }
    }

    // 计算金额
    const quantity = body.quantity ? parseFloat(body.quantity) : 0;
    const unitPrice = body.unitPrice ? parseFloat(body.unitPrice) : 0;
    const amount = body.amount || (quantity * unitPrice);
    const totalAmount = body.totalAmount || amount;

    // 获取最大排序号
    const [maxSort] = await db
      .select({ maxSort: contractItems.sortOrder })
      .from(contractItems)
      .where(eq(contractItems.contractId, body.contractId))
      .orderBy(desc(contractItems.sortOrder))
      .limit(1);

    const sortOrder = body.sortOrder ?? (maxSort?.maxSort || 0) + 1;

    // 插入清单项
    const [item] = await db
      .insert(contractItems)
      .values({
        contractId: body.contractId || null,
        contractCode,
        projectCode,
        signerUnit,
        userUnit,
        projectName,
        contractAmount,
        productName: body.productName,
        productModel: body.productModel || null,
        unit: body.unit || null,
        quantity: body.quantity,
        unitPrice: body.unitPrice || null,
        amount: String(amount),
        totalAmount: String(totalAmount),
        sortOrder,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Failed to create contract item:', error);
    return NextResponse.json(
      { success: false, error: '创建合同清单项失败' },
      { status: 500 }
    );
  }
}
