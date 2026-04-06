import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contractAcceptances, contracts } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/contract-acceptances/:id
 * 获取验收报告详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const acceptanceId = parseInt(id);

    const [acceptance] = await db
      .select()
      .from(contractAcceptances)
      .where(eq(contractAcceptances.id, acceptanceId));

    if (!acceptance) {
      return NextResponse.json(
        { success: false, error: '验收报告不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: acceptance,
    });
  } catch (error) {
    console.error('Failed to fetch contract acceptance:', error);
    return NextResponse.json(
      { success: false, error: '获取验收报告失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/contract-acceptances/:id
 * 更新验收报告
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const acceptanceId = parseInt(id);
    const body = await request.json();

    const [existing] = await db
      .select()
      .from(contractAcceptances)
      .where(eq(contractAcceptances.id, acceptanceId));

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '验收报告不存在' },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(contractAcceptances)
      .set({
        contractId: body.contractId ?? existing.contractId,
        contractCode: body.contractCode ?? existing.contractCode,
        contractName: body.contractName ?? existing.contractName,
        contractAmount: body.contractAmount ?? existing.contractAmount,
        acceptanceCode: body.acceptanceCode ?? existing.acceptanceCode,
        department: body.department ?? existing.department,
        acceptanceDate: body.acceptanceDate ?? existing.acceptanceDate,
        archiveDate: body.archiveDate ?? existing.archiveDate,
        updatedAt: new Date(),
      })
      .where(eq(contractAcceptances.id, acceptanceId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Failed to update contract acceptance:', error);
    return NextResponse.json(
      { success: false, error: '更新验收报告失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contract-acceptances/:id
 * 删除验收报告
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const acceptanceId = parseInt(id);

    const [deleted] = await db
      .delete(contractAcceptances)
      .where(eq(contractAcceptances.id, acceptanceId))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '验收报告不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: deleted.id },
    });
  } catch (error) {
    console.error('Failed to delete contract acceptance:', error);
    return NextResponse.json(
      { success: false, error: '删除验收报告失败' },
      { status: 500 }
    );
  }
}
