import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projectOpportunities, projects } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canReadProject, canWriteProject } from '@/lib/permissions/project';

// GET - 获取项目商机信息
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    // 检查项目是否存在且未被删除
    const [projectExists] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        isNull(projects.deletedAt)
      ))
      .limit(1);

    if (!projectExists) {
      return errorResponse('NOT_FOUND', '项目不存在');
    }

    // 权限检查
    const canRead = await canReadProject(projectId, context.userId);
    if (!canRead) {
      return errorResponse('FORBIDDEN', '您没有权限查看此项目');
    }

    // 查询项目商机信息
    const [projectOpp] = await db
      .select()
      .from(projectOpportunities)
      .where(eq(projectOpportunities.projectId, projectId))
      .limit(1);

    if (!projectOpp) {
      // 如果没有商机信息，返回默认结构
      return NextResponse.json({
        success: true,
        data: {
          projectId,
          opportunityStage: 'lead',
          expectedAmount: null,
          winProbability: 10,
          expectedCloseDate: null,
          competitorList: [],
          decisionMaker: null,
          requirementSummary: null,
          solutionOutline: null,
          keySuccessFactors: null,
          riskAssessment: null,
          nextAction: null,
          nextActionDate: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: projectOpp,
    });
  } catch (error) {
    console.error('Get project opportunity error:', error);
    return errorResponse('INTERNAL_ERROR', '获取项目商机信息失败');
  }
});

// PUT - 更新项目商机信息
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const body = await request.json();

    // 检查项目是否存在且未被删除
    const [projectExists] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        isNull(projects.deletedAt)
      ))
      .limit(1);

    if (!projectExists) {
      return errorResponse('NOT_FOUND', '项目不存在');
    }

    // 权限检查
    const canWrite = await canWriteProject(projectId, context.userId);
    if (!canWrite) {
      return errorResponse('FORBIDDEN', '您没有权限编辑此项目');
    }

    // BUG-021: 商机胜率与阶段一致性验证
    const winProbability = body.winProbability;
    const opportunityStage = body.opportunityStage;
    
    if (winProbability !== undefined) {
      // 胜率必须在0-100之间
      if (winProbability < 0 || winProbability > 100) {
        return errorResponse('BAD_REQUEST', '胜率必须在0-100之间');
      }
      
      // negotiation阶段胜率不能为0
      if (opportunityStage === 'negotiation' && winProbability === 0) {
        return errorResponse('BAD_REQUEST', '商务谈判阶段的商机胜率不能为0');
      }
      
      // proposal阶段胜率建议大于20%
      if (opportunityStage === 'proposal' && winProbability < 20) {
        return errorResponse('BAD_REQUEST', '方案建议阶段的商机胜率建议不低于20%');
      }
    }

    // BUG-004: 商机预期金额不能为负数
    if (body.expectedAmount !== undefined && body.expectedAmount !== null) {
      const amount = parseFloat(body.expectedAmount);
      if (!isNaN(amount) && amount < 0) {
        return errorResponse('BAD_REQUEST', '预期金额不能为负数');
      }
    }

    // 检查是否已有商机记录
    const [existing] = await db
      .select()
      .from(projectOpportunities)
      .where(eq(projectOpportunities.projectId, projectId))
      .limit(1);

    let result;
    if (existing) {
      // 更新现有记录
      [result] = await db
        .update(projectOpportunities)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(projectOpportunities.projectId, projectId))
        .returning();
    } else {
      // 创建新记录
      [result] = await db
        .insert(projectOpportunities)
        .values({
          projectId,
          ...body,
        })
        .returning();
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: '保存成功',
    });
  } catch (error) {
    console.error('Update project opportunity error:', error);
    return errorResponse('INTERNAL_ERROR', '更新项目商机信息失败');
  }
});
