import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contractBids, contracts } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/contract-bids/:id
 * 获取中标信息详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const bidId = parseInt(id);

    const [bid] = await db
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
        updatedAt: contractBids.updatedAt,
      })
      .from(contractBids)
      .where(eq(contractBids.id, bidId));

    if (!bid) {
      return NextResponse.json(
        { success: false, error: '中标信息不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bid,
    });
  } catch (error) {
    console.error('Failed to fetch contract bid:', error);
    return NextResponse.json(
      { success: false, error: '获取中标信息失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/contract-bids/:id
 * 更新中标信息
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const bidId = parseInt(id);
    const body = await request.json();

    const [existing] = await db
      .select()
      .from(contractBids)
      .where(eq(contractBids.id, bidId));

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '中标信息不存在' },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(contractBids)
      .set({
        contractId: body.contractId ?? existing.contractId,
        contractCode: body.contractCode ?? existing.contractCode,
        bidCode: body.bidCode ?? existing.bidCode,
        projectName: body.projectName ?? existing.projectName,
        bidAmount: body.bidAmount ?? existing.bidAmount,
        bidDate: body.bidDate ?? existing.bidDate,
        department: body.department ?? existing.department,
        updatedAt: new Date(),
      })
      .where(eq(contractBids.id, bidId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Failed to update contract bid:', error);
    return NextResponse.json(
      { success: false, error: '更新中标信息失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contract-bids/:id
 * 删除中标信息
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const bidId = parseInt(id);

    const [deleted] = await db
      .delete(contractBids)
      .where(eq(contractBids.id, bidId))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '中标信息不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: deleted.id },
    });
  } catch (error) {
    console.error('Failed to delete contract bid:', error);
    return NextResponse.json(
      { success: false, error: '删除中标信息失败' },
      { status: 500 }
    );
  }
}
