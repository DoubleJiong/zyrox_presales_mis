import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contractBids, contracts } from '@/db/schema';
import { desc, eq, ilike, and, isNull, or, sql, count } from 'drizzle-orm';

/**
 * GET /api/contract-bids
 * 获取中标信息列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const contractId = searchParams.get('contractId') || '';

    // 构建查询条件
    const conditions: any[] = [];
    
    if (contractId) {
      conditions.push(eq(contractBids.contractId, parseInt(contractId)));
    }

    // 查询总数
    const [{ total }] = await db
      .select({ total: count() })
      .from(contractBids)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // 查询列表
    const list = await db
      .select({
        id: contractBids.id,
        contractId: contractBids.contractId,
        contractCode: contractBids.contractCode,
        bidCode: contractBids.bidCode,
        projectName: contractBids.projectName,
        bidAmount: contractBids.bidAmount,
        bidDate: contractBids.bidDate,
        department: contractBids.department,
        createdAt: contractBids.createdAt,
      })
      .from(contractBids)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(contractBids.createdAt))
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
    console.error('Failed to fetch contract bids:', error);
    return NextResponse.json(
      { success: false, error: '获取中标信息列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contract-bids
 * 创建中标信息
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 获取合同信息
    if (body.contractId) {
      const [contract] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, body.contractId));
      
      if (!contract) {
        return NextResponse.json(
          { success: false, error: '关联合同不存在' },
          { status: 400 }
        );
      }
    }

    // 插入中标信息
    const [bid] = await db
      .insert(contractBids)
      .values({
        contractId: body.contractId || null,
        contractCode: body.contractCode || null,
        bidCode: body.bidCode || null,
        projectName: body.projectName || null,
        bidAmount: body.bidAmount || null,
        bidDate: body.bidDate || null,
        department: body.department || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: bid,
    });
  } catch (error) {
    console.error('Failed to create contract bid:', error);
    return NextResponse.json(
      { success: false, error: '创建中标信息失败' },
      { status: 500 }
    );
  }
}
