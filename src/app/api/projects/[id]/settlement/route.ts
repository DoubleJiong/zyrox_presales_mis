import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projectSettlements, projects } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { canReadProject, canWriteProject } from '@/lib/permissions/project';

function getArchivedProjectStatus(currentStatus: string, bidResult: string | null) {
  if (bidResult === 'won' || bidResult === 'lost') {
    return bidResult;
  }

  return 'archived';
}

// GET - 获取项目结算信息
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

    const [projectSettlement] = await db
      .select()
      .from(projectSettlements)
      .where(eq(projectSettlements.projectId, projectId))
      .limit(1);

    if (!projectSettlement) {
      return successResponse({
        projectId,
        settlementAmount: null,
        settlementDate: null,
        totalRevenue: null,
        totalCost: null,
        grossProfit: null,
        grossMargin: null,
        teamBonus: null,
        projectReview: null,
        lessonsLearned: null,
        customerFeedback: null,
        archiveStatus: 'unarchived',
        archivedAt: null,
        archivedBy: null,
      });
    }

    return successResponse(projectSettlement);
  } catch (error) {
    console.error('Get project settlement error:', error);
    return errorResponse('INTERNAL_ERROR', '获取项目结算信息失败');
  }
});

// POST - 创建项目结算信息
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const body = await request.json();

    // 检查项目是否存在且未被删除
    const [project] = await db
      .select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        isNull(projects.deletedAt)
      ))
      .limit(1);

    if (!project) {
      return errorResponse('NOT_FOUND', '项目不存在');
    }

    // 权限检查
    const canWrite = await canWriteProject(projectId, context.userId);
    if (!canWrite) {
      return errorResponse('FORBIDDEN', '您没有权限编辑此项目');
    }

    // 检查是否已有结算记录
    const [existing] = await db
      .select()
      .from(projectSettlements)
      .where(eq(projectSettlements.projectId, projectId))
      .limit(1);

    if (existing) {
      return errorResponse('BAD_REQUEST', '该项目已有结算记录，请使用 PUT 方法更新');
    }

    // 创建结算记录
    const [result] = await db
      .insert(projectSettlements)
      .values({
        projectId,
        settlementAmount: body.settlementAmount || null,
        settlementDate: body.settlementDate ? body.settlementDate : null,
        totalRevenue: body.totalRevenue || null,
        totalCost: body.totalCost || null,
        grossProfit: body.grossProfit || null,
        grossMargin: body.grossMargin || null,
        teamBonus: body.teamBonus || null,
        projectReview: body.projectReview || null,
        lessonsLearned: body.lessonsLearned || null,
        customerFeedback: body.customerFeedback || null,
        archiveStatus: body.archiveStatus || 'unarchived',
      })
      .returning();

    if (body.archiveStatus === 'archived') {
      await db
        .update(projects)
        .set({
          projectStage: 'archived',
          status: getArchivedProjectStatus(project.status, project.bidResult),
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));
    }

    return successResponse({
      ...result,
      message: '项目结算记录创建成功',
    });
  } catch (error) {
    console.error('Create project settlement error:', error);
    return errorResponse('INTERNAL_ERROR', '创建项目结算信息失败');
  }
});

// PUT - 更新项目结算信息
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const body = await request.json();

    // 检查项目是否存在且未被删除
    const [projectExists] = await db
      .select({ id: projects.id, projectStage: projects.projectStage, status: projects.status, bidResult: projects.bidResult })
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

    const [existing] = await db
      .select()
      .from(projectSettlements)
      .where(eq(projectSettlements.projectId, projectId))
      .limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(projectSettlements)
        .set({
          ...body,
          settlementDate: body.settlementDate || existing.settlementDate,
          updatedAt: new Date(),
        })
        .where(eq(projectSettlements.projectId, projectId))
        .returning();
    } else {
      [result] = await db
        .insert(projectSettlements)
        .values({
          projectId,
          settlementAmount: body.settlementAmount || null,
          settlementDate: body.settlementDate || null,
          totalRevenue: body.totalRevenue || null,
          totalCost: body.totalCost || null,
          grossProfit: body.grossProfit || null,
          grossMargin: body.grossMargin || null,
          teamBonus: body.teamBonus || null,
          projectReview: body.projectReview || null,
          lessonsLearned: body.lessonsLearned || null,
          customerFeedback: body.customerFeedback || null,
          archiveStatus: body.archiveStatus || 'unarchived',
        })
        .returning();
    }

    // 同步更新项目阶段
    const projectUpdates: any = {
      updatedAt: new Date(),
    };

    // 三阶段模型下，结算记录本身不再把项目推进到 settlement 阶段。
    if (body.archiveStatus === 'archived') {
      projectUpdates.projectStage = 'archived';
      projectUpdates.status = getArchivedProjectStatus(projectExists.status, projectExists.bidResult);
    }

    await db
      .update(projects)
      .set(projectUpdates)
      .where(eq(projects.id, projectId));

    return successResponse({
      ...result,
      message: '保存成功',
    });
  } catch (error) {
    console.error('Update project settlement error:', error);
    return errorResponse('INTERNAL_ERROR', '更新项目结算信息失败');
  }
});
