import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, projectSettlements } from '@/db/schema';
import { desc, eq, and, isNull } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

function getArchivedProjectStatus(currentStatus: string, bidResult: string | null) {
  if (bidResult === 'won' || bidResult === 'lost') {
    return bidResult;
  }

  return 'archived';
}

// GET - 获取结算列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const archiveStatus = searchParams.get('archiveStatus');

    const conditions = [isNull(projects.deletedAt)];
    
    if (projectId) {
      conditions.push(eq(projectSettlements.projectId, parseInt(projectId)));
    }
    
    if (archiveStatus) {
      conditions.push(eq(projectSettlements.archiveStatus, archiveStatus));
    }

    const settlementList = await db
      .select({
        id: projects.id,
        projectCode: projects.projectCode,
        projectName: projects.projectName,
        customerName: projects.customerName,
        contractAmount: projects.contractAmount,
        actualCost: projects.actualCost,
        projectStage: projects.projectStage,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        // 结算详情
        settlementId: projectSettlements.id,
        settlementAmount: projectSettlements.settlementAmount,
        settlementDate: projectSettlements.settlementDate,
        totalRevenue: projectSettlements.totalRevenue,
        totalCost: projectSettlements.totalCost,
        grossProfit: projectSettlements.grossProfit,
        grossMargin: projectSettlements.grossMargin,
        teamBonus: projectSettlements.teamBonus,
        archiveStatus: projectSettlements.archiveStatus,
        archivedAt: projectSettlements.archivedAt,
      })
      .from(projects)
      .leftJoin(
        projectSettlements,
        eq(projects.id, projectSettlements.projectId)
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(projects.createdAt));

    return NextResponse.json({
      success: true,
      data: settlementList,
    });
  } catch (error) {
    console.error('Failed to fetch settlements:', error);
    return errorResponse('INTERNAL_ERROR', '获取结算列表失败');
  }
}

// POST - 创建结算
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 计算利润和毛利率
    const totalRevenue = parseFloat(body.totalRevenue || '0');
    const totalCost = parseFloat(body.totalCost || '0');
    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(2) : '0';

    // 创建结算记录
    const [newSettlement] = await db
      .insert(projectSettlements)
      .values({
        projectId: body.projectId,
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
      })
      .returning();

    if (body.archiveStatus === 'archived') {
      const [project] = await db
        .select({ status: projects.status, bidResult: projects.bidResult })
        .from(projects)
        .where(eq(projects.id, body.projectId))
        .limit(1);

      if (project) {
        await db
          .update(projects)
          .set({
            projectStage: 'archived',
            status: getArchivedProjectStatus(project.status, project.bidResult),
            updatedAt: new Date(),
          })
          .where(eq(projects.id, body.projectId));
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: newSettlement,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create settlement:', error);
    return errorResponse('INTERNAL_ERROR', '创建结算失败');
  }
}
