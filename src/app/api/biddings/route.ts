import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, projectBiddings } from '@/db/schema';
import { desc, eq, and, isNull } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET - 获取投标列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, won, lost
    const projectId = searchParams.get('projectId');

    const conditions = [
      eq(projects.projectStage, 'bidding'),
      isNull(projects.deletedAt)
    ];
    
    if (projectId) {
      conditions.push(eq(projects.id, parseInt(projectId)));
    }

    const biddingList = await db
      .select({
        id: projects.id,
        projectCode: projects.projectCode,
        projectName: projects.projectName,
        customerName: projects.customerName,
        region: projects.region,
        managerId: projects.managerId,
        estimatedAmount: projects.estimatedAmount,
        contractAmount: projects.contractAmount,
        projectStage: projects.projectStage,
        bidResult: projects.bidResult,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        // 投标详情
        biddingId: projectBiddings.id,
        biddingMethod: projectBiddings.biddingMethod,
        biddingType: projectBiddings.biddingType,
        bidDeadline: projectBiddings.bidDeadline,
        bidBondAmount: projectBiddings.bidBondAmount,
        bidBondStatus: projectBiddings.bidBondStatus,
        bidPrice: projectBiddings.bidPrice,
        bidOpenDate: projectBiddings.bidOpenDate,
        bidResult_detail: projectBiddings.bidResult,
        loseReason: projectBiddings.loseReason,
        winCompetitor: projectBiddings.winCompetitor,
        bidTeam: projectBiddings.bidTeam,
        tenderDocuments: projectBiddings.tenderDocuments,
        bidDocuments: projectBiddings.bidDocuments,
      })
      .from(projects)
      .leftJoin(
        projectBiddings,
        eq(projects.id, projectBiddings.projectId)
      )
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt));

    // 按状态筛选
    let filteredList = biddingList;
    if (status) {
      filteredList = biddingList.filter(item => item.bidResult_detail === status);
    }

    return NextResponse.json({
      success: true,
      data: filteredList,
    });
  } catch (error) {
    console.error('Failed to fetch biddings:', error);
    return errorResponse('INTERNAL_ERROR', '获取投标列表失败');
  }
}
