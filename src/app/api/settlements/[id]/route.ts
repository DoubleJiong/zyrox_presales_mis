import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, projectSettlements } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

// GET - 获取结算详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [project] = await db
      .select()
      .from(projects)
      .where(and(
        eq(projects.id, parseInt(id)),
        isNull(projects.deletedAt)
      ));

    if (!project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    const [settlement] = await db
      .select()
      .from(projectSettlements)
      .where(eq(projectSettlements.projectId, parseInt(id)));

    return NextResponse.json({
      success: true,
      data: {
        ...project,
        settlement: settlement || null,
      },
    });
  } catch (error) {
    console.error('Failed to fetch settlement:', error);
    return NextResponse.json(
      { success: false, error: '获取结算详情失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新结算信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 计算利润和毛利率
    const totalRevenue = parseFloat(body.totalRevenue || '0');
    const totalCost = parseFloat(body.totalCost || '0');
    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(2) : '0';

    const [updatedSettlement] = await db
      .update(projectSettlements)
      .set({
        settlementAmount: body.settlementAmount,
        settlementDate: body.settlementDate || null,
        totalRevenue: body.totalRevenue,
        totalCost: body.totalCost,
        grossProfit: grossProfit.toString(),
        grossMargin: grossMargin,
        teamBonus: body.teamBonus,
        projectReview: body.projectReview,
        lessonsLearned: body.lessonsLearned,
        customerFeedback: body.customerFeedback,
        updatedAt: new Date(),
      })
      .where(eq(projectSettlements.projectId, parseInt(id)))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedSettlement,
    });
  } catch (error) {
    console.error('Failed to update settlement:', error);
    return NextResponse.json(
      { success: false, error: '更新结算失败' },
      { status: 500 }
    );
  }
}
