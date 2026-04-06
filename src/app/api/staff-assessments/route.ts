import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { performances, users, roles } from '@/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

// Assessment types and ratings
const assessmentTypes = [
  { value: '季度考核', label: '季度考核' },
  { value: '半年考核', label: '半年考核' },
  { value: '年度考核', label: '年度考核' },
  { value: '专项考核', label: '专项考核' },
];

const ratings = [
  { value: '优秀', label: '优秀', minScore: 90 },
  { value: '良好', label: '良好', minScore: 80 },
  { value: '合格', label: '合格', minScore: 70 },
  { value: '待改进', label: '待改进', minScore: 0 },
];

// GET - 获取员工考核列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const assessmentPeriod = searchParams.get('assessmentPeriod');
    const assessmentType = searchParams.get('assessmentType');

    const conditions = [];
    
    if (staffId) {
      conditions.push(eq(performances.userId, parseInt(staffId)));
    }

    const performanceList = await db
      .select({
        id: performances.id,
        staffId: performances.userId,
        staffName: users.realName,
        department: users.department,
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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(performances.createdAt));

    // 转换为考核格式
    const assessments = performanceList.map(p => {
      const totalScore = Number(p.totalScore) || 0;
      const rating = totalScore >= 90 ? '优秀' : totalScore >= 80 ? '良好' : totalScore >= 70 ? '合格' : '待改进';
      
      return {
        id: p.id,
        staffId: p.staffId,
        staffName: p.staffName,
        department: p.department,
        assessmentPeriod: `${p.year}-${String(p.month).padStart(2, '0')}`,
        assessmentType: '月度考核',
        overallScore: totalScore,
        rating,
        status: p.status,
        criteria: {
          工作量: Number(p.workloadScore) || 0,
          工作质量: Number(p.qualityScore) || 0,
          工作效率: Number(p.efficiencyScore) || 0,
          创新能力: Number(p.innovationScore) || 0,
        },
        createdAt: p.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: assessments,
      meta: {
        assessmentTypes,
        ratings,
      },
    });
  } catch (error) {
    console.error('Failed to fetch staff assessments:', error);
    return errorResponse('INTERNAL_ERROR', '获取员工考核列表失败');
  }
}

// POST - 创建员工考核
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 计算总分
    const criteria = body.criteria || {};
    const workloadScore = criteria['工作量'] || 0;
    const qualityScore = criteria['工作质量'] || 0;
    const efficiencyScore = criteria['工作效率'] || 0;
    const innovationScore = criteria['创新能力'] || 0;
    
    const totalScore = Math.round(
      workloadScore * 0.25 +
      qualityScore * 0.3 +
      efficiencyScore * 0.25 +
      innovationScore * 0.2
    );

    // 解析考核周期
    const [year, month] = body.assessmentPeriod 
      ? body.assessmentPeriod.split('-').map(Number)
      : [new Date().getFullYear(), new Date().getMonth() + 1];

    const newAssessment = await db
      .insert(performances)
      .values({
        userId: body.staffId,
        year,
        month,
        workloadScore: workloadScore.toString(),
        qualityScore: qualityScore.toString(),
        efficiencyScore: efficiencyScore.toString(),
        innovationScore: innovationScore.toString(),
        totalScore: totalScore.toString(),
        status: body.status || 'draft',
        reviewerId: body.assessor ? parseInt(body.assessor) : null,
        reviewComments: body.comments || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        id: newAssessment[0].id,
        staffId: body.staffId,
        assessmentPeriod: body.assessmentPeriod,
        totalScore,
        status: newAssessment[0].status,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create staff assessment:', error);
    return errorResponse('INTERNAL_ERROR', '创建员工考核失败');
  }
}

// PUT - 更新员工考核
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少考核ID');
    }

    // 计算总分
    const criteria = updateData.criteria || {};
    const workloadScore = criteria['工作量'] || 0;
    const qualityScore = criteria['工作质量'] || 0;
    const efficiencyScore = criteria['工作效率'] || 0;
    const innovationScore = criteria['创新能力'] || 0;
    
    const totalScore = Math.round(
      workloadScore * 0.25 +
      qualityScore * 0.3 +
      efficiencyScore * 0.25 +
      innovationScore * 0.2
    );

    const updatedAssessment = await db
      .update(performances)
      .set({
        workloadScore: workloadScore.toString(),
        qualityScore: qualityScore.toString(),
        efficiencyScore: efficiencyScore.toString(),
        innovationScore: innovationScore.toString(),
        totalScore: totalScore.toString(),
        status: updateData.status || 'draft',
        reviewComments: updateData.comments || null,
        updatedAt: new Date(),
      })
      .where(eq(performances.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedAssessment[0],
    });
  } catch (error) {
    console.error('Failed to update staff assessment:', error);
    return errorResponse('INTERNAL_ERROR', '更新员工考核失败');
  }
}

// DELETE - 删除员工考核
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');

    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少考核ID');
    }

    await db
      .delete(performances)
      .where(eq(performances.id, id));

    return successResponse({ success: true });
  } catch (error) {
    console.error('Failed to delete staff assessment:', error);
    return errorResponse('INTERNAL_ERROR', '删除员工考核失败');
  }
}
