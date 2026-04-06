/**
 * 项目阶段历史记录API
 * 
 * 功能：
 * - GET: 获取项目阶段迁移历史
 * - POST: 记录新的阶段迁移
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { projectStageHistory, projects } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canReadProject, canWriteProject } from '@/lib/permissions/project';
import { withAuth } from '@/lib/auth-middleware';

/**
 * GET /api/projects/[id]/stage-history
 * 获取项目阶段迁移历史
 */
export const GET = withAuth(async (
  req: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (!projectId) {
      return errorResponse('BAD_REQUEST', '缺少项目ID');
    }

    // 权限检查
    const canRead = await canReadProject(projectId, context.userId);
    if (!canRead) {
      return errorResponse('FORBIDDEN', '您没有权限查看此项目');
    }

    // 查询阶段迁移历史
    const history = await db
      .select()
      .from(projectStageHistory)
      .where(eq(projectStageHistory.projectId, projectId))
      .orderBy(desc(projectStageHistory.createdAt));

    return successResponse(history);
  } catch (error) {
    console.error('Failed to fetch stage history:', error);
    return errorResponse('INTERNAL_ERROR', '获取阶段迁移历史失败');
  }
});

/**
 * POST /api/projects/[id]/stage-history
 * 记录新的阶段迁移
 */
export const POST = withAuth(async (
  req: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (!projectId) {
      return errorResponse('BAD_REQUEST', '缺少项目ID');
    }

    // 权限检查
    const canWrite = await canWriteProject(projectId, context.userId);
    if (!canWrite) {
      return errorResponse('FORBIDDEN', '您没有权限修改此项目');
    }

    const body = await req.json();
    const { fromStage, toStage, reason } = body;

    if (!toStage) {
      return errorResponse('BAD_REQUEST', '缺少目标阶段');
    }

    // 获取当前项目状态
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return errorResponse('NOT_FOUND', '项目不存在');
    }

    // 记录阶段迁移历史
    const [historyRecord] = await db
      .insert(projectStageHistory)
      .values({
        projectId,
        fromStage: fromStage || project.projectStage,
        toStage,
        changedBy: context.userId,
        reason,
      })
      .returning();

    // 更新项目阶段
    await db
      .update(projects)
      .set({
        projectStage: toStage,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    return successResponse(historyRecord);
  } catch (error) {
    console.error('Failed to create stage history:', error);
    return errorResponse('INTERNAL_ERROR', '记录阶段迁移失败');
  }
});
