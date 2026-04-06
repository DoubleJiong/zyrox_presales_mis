import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutionProjects } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canReadProject, canWriteProject } from '@/lib/permissions/project';

// GET - 获取单个关联详情
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const associationId = parseInt(context.params?.solutionId || '0');

    // 权限检查
    const canRead = await canReadProject(projectId, context.userId);
    if (!canRead) {
      return errorResponse('FORBIDDEN', '您没有权限查看此项目');
    }

    const [record] = await db
      .select()
      .from(solutionProjects)
      .where(
        and(
          eq(solutionProjects.id, associationId),
          eq(solutionProjects.projectId, projectId),
          isNull(solutionProjects.deletedAt)
        )
      )
      .limit(1);

    if (!record) {
      return errorResponse('NOT_FOUND', '关联记录不存在');
    }

    return successResponse(record);
  } catch (error) {
    console.error('Failed to fetch association:', error);
    return errorResponse('INTERNAL_ERROR', '获取关联详情失败');
  }
});

// PUT - 更新关联信息
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const associationId = parseInt(context.params?.solutionId || '0');
    const body = await request.json();

    // 权限检查
    const canWrite = await canWriteProject(projectId, context.userId);
    if (!canWrite) {
      return errorResponse('FORBIDDEN', '您没有权限编辑此项目');
    }

    // 检查关联是否存在
    const [existing] = await db
      .select()
      .from(solutionProjects)
      .where(
        and(
          eq(solutionProjects.id, associationId),
          eq(solutionProjects.projectId, projectId),
          isNull(solutionProjects.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      return errorResponse('NOT_FOUND', '关联记录不存在');
    }

    // 构建更新对象
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.implementationStatus !== undefined) {
      updateData.implementationStatus = body.implementationStatus;
    }
    if (body.implementationDate !== undefined) {
      updateData.implementationDate = body.implementationDate ? new Date(body.implementationDate) : null;
    }
    if (body.implementationNotes !== undefined) {
      updateData.implementationNotes = body.implementationNotes;
    }
    if (body.businessValue !== undefined) {
      updateData.businessValue = body.businessValue;
    }
    if (body.userFeedback !== undefined) {
      updateData.userFeedback = body.userFeedback;
    }
    if (body.successMetrics !== undefined) {
      updateData.successMetrics = body.successMetrics;
    }
    if (body.customizationDetails !== undefined) {
      updateData.customizationDetails = body.customizationDetails;
    }
    if (body.usageType !== undefined) {
      updateData.usageType = body.usageType;
    }
    if (body.stageBound !== undefined) {
      updateData.stageBound = body.stageBound;
    }
    if (body.contributionConfirmed !== undefined) {
      updateData.contributionConfirmed = body.contributionConfirmed;
      updateData.confirmedAt = body.contributionConfirmed ? new Date() : null;
      updateData.confirmedBy = body.contributionConfirmed ? context.userId : null;
    }
    if (body.contributionRatio !== undefined) {
      updateData.contributionRatio = body.contributionRatio !== null && body.contributionRatio !== ''
        ? String(Number(body.contributionRatio) / 100)
        : null;
    }
    if (body.estimatedValue !== undefined) {
      updateData.estimatedValue = body.estimatedValue !== null && body.estimatedValue !== ''
        ? String(Number(body.estimatedValue))
        : null;
    }
    if (body.actualValue !== undefined) {
      updateData.actualValue = body.actualValue !== null && body.actualValue !== ''
        ? String(Number(body.actualValue))
        : null;
    }
    if (body.winContributionScore !== undefined) {
      updateData.winContributionScore = body.winContributionScore !== null && body.winContributionScore !== ''
        ? String(Number(body.winContributionScore))
        : null;
    }
    if (body.feedbackScore !== undefined) {
      updateData.feedbackScore = body.feedbackScore !== null && body.feedbackScore !== ''
        ? String(Number(body.feedbackScore))
        : null;
    }
    if (body.feedbackContent !== undefined) {
      updateData.feedbackContent = body.feedbackContent;
    }

    // 更新
    const [updated] = await db
      .update(solutionProjects)
      .set(updateData)
      .where(eq(solutionProjects.id, associationId))
      .returning();

    return successResponse(updated);
  } catch (error) {
    console.error('Failed to update association:', error);
    return errorResponse('INTERNAL_ERROR', '更新关联信息失败');
  }
});

// DELETE - 取消关联（软删除）
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const associationId = parseInt(context.params?.solutionId || '0');

    // 权限检查
    const canWrite = await canWriteProject(projectId, context.userId);
    if (!canWrite) {
      return errorResponse('FORBIDDEN', '您没有权限编辑此项目');
    }

    // 软删除
    const [deleted] = await db
      .update(solutionProjects)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(solutionProjects.id, associationId),
          eq(solutionProjects.projectId, projectId),
          isNull(solutionProjects.deletedAt)
        )
      )
      .returning();

    if (!deleted) {
      return errorResponse('NOT_FOUND', '关联记录不存在');
    }

    return successResponse({ message: '已取消关联' });
  } catch (error) {
    console.error('Failed to remove association:', error);
    return errorResponse('INTERNAL_ERROR', '取消关联失败');
  }
});
