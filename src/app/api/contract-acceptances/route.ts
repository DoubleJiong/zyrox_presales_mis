import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contractAcceptances, contracts } from '@/db/schema';
import { desc, eq, and, count } from 'drizzle-orm';

/**
 * GET /api/contract-acceptances
 * 获取验收报告列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const contractId = searchParams.get('contractId') || '';

    // 构建查询条件
    const conditions: any[] = [];
    
    if (contractId) {
      conditions.push(eq(contractAcceptances.contractId, parseInt(contractId)));
    }

    // 查询总数
    const [{ total }] = await db
      .select({ total: count() })
      .from(contractAcceptances)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // 查询列表
    const list = await db
      .select()
      .from(contractAcceptances)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(contractAcceptances.createdAt))
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
    console.error('Failed to fetch contract acceptances:', error);
    return NextResponse.json(
      { success: false, error: '获取验收报告列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contract-acceptances
 * 创建验收报告
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 获取合同信息填充冗余字段
    let contractCode = body.contractCode;
    let contractName = body.contractName;
    let contractAmount = body.contractAmount;

    if (body.contractId) {
      const [contract] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, body.contractId));
      
      if (contract) {
        contractCode = contract.contractCode;
        contractName = contract.contractName;
        contractAmount = contract.contractAmount;
      }
    }

    // 插入验收报告
    const [acceptance] = await db
      .insert(contractAcceptances)
      .values({
        contractId: body.contractId || null,
        contractCode,
        contractName,
        contractAmount,
        acceptanceCode: body.acceptanceCode || null,
        department: body.department || null,
        acceptanceDate: body.acceptanceDate || null,
        archiveDate: body.archiveDate || null,
      })
      .returning();

    // 更新合同的验收时间
    if (body.contractId && body.acceptanceDate) {
      await db
        .update(contracts)
        .set({
          acceptanceDate: body.acceptanceDate,
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, body.contractId));
    }

    return NextResponse.json({
      success: true,
      data: acceptance,
    });
  } catch (error) {
    console.error('Failed to create contract acceptance:', error);
    return NextResponse.json(
      { success: false, error: '创建验收报告失败' },
      { status: 500 }
    );
  }
}
