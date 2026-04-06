import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { performances, users, roles } from '@/db/schema';
import { desc, and, eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET - 获取绩效列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    const query = db
      .select({
        id: performances.id,
        userId: performances.userId,
        userName: users.realName,
        userRole: roles.roleName,
        year: performances.year,
        month: performances.month,
        workloadScore: performances.workloadScore,
        qualityScore: performances.qualityScore,
        efficiencyScore: performances.efficiencyScore,
        innovationScore: performances.innovationScore,
        totalScore: performances.totalScore,
        rank: performances.rank,
        bonusAmount: performances.bonusAmount,
        status: performances.status,
        createdAt: performances.createdAt,
      })
      .from(performances)
      .leftJoin(users, eq(performances.userId, users.id))
      .leftJoin(roles, eq(users.roleId, roles.id));

    if (year && month) {
      query.where(and(eq(performances.year, parseInt(year)), eq(performances.month, parseInt(month))));
    }

    const performanceList = await query.orderBy(desc(performances.totalScore));

    // 计算统计数据
    const stats = {
      totalStaff: performanceList.length,
      avgWorkloadScore: performanceList.length > 0 
        ? performanceList.reduce((sum, p) => sum + Number(p.workloadScore || 0), 0) / performanceList.length 
        : 0,
      avgQualityScore: performanceList.length > 0 
        ? performanceList.reduce((sum, p) => sum + Number(p.qualityScore || 0), 0) / performanceList.length 
        : 0,
      avgEfficiencyScore: performanceList.length > 0 
        ? performanceList.reduce((sum, p) => sum + Number(p.efficiencyScore || 0), 0) / performanceList.length 
        : 0,
      avgInnovationScore: performanceList.length > 0 
        ? performanceList.reduce((sum, p) => sum + Number(p.innovationScore || 0), 0) / performanceList.length 
        : 0,
      totalBonusAmount: performanceList.reduce((sum, p) => sum + Number(p.bonusAmount || 0), 0),
    };

    return NextResponse.json({ list: performanceList, stats });
  } catch (error) {
    console.error('Failed to fetch performance:', error);
    return errorResponse('INTERNAL_ERROR', '获取绩效列表失败');
  }
}

// POST - 创建绩效记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newPerformance = await db
      .insert(performances)
      .values({
        userId: body.userId,
        year: body.year,
        month: body.month,
        workloadScore: body.workloadScore || null,
        qualityScore: body.qualityScore || null,
        efficiencyScore: body.efficiencyScore || null,
        innovationScore: body.innovationScore || null,
        totalScore: body.totalScore || null,
        rank: body.rank || null,
        bonusAmount: body.bonusAmount || null,
        status: body.status || 'draft',
        reviewerId: body.reviewerId || null,
      })
      .returning();

    return NextResponse.json(newPerformance[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create performance:', error);
    return errorResponse('INTERNAL_ERROR', '创建绩效记录失败');
  }
}
