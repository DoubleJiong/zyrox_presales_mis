import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { 
  ProjectStatus,
  ProjectStage 
} from '@/lib/utils/status-transitions';
import { validateStageTransition } from '@/lib/utils/stage-transitions';
import { getStageLabel } from '@/lib/utils/project-colors';
import { transitionProjectStage, ProjectStageTransitionError } from '@/modules/project/project-stage-service';
import { isGovernedProjectStage } from '@/modules/project/project-stage-policy';

// POST - 变更项目阶段
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const body = await request.json();
    const projectId = parseInt(context.params?.id || '0');
    const newStage = body.stage as ProjectStage;
    const confirmed = body.confirmed || false;

    // 获取当前项目
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

    const currentStage = (project.projectStage || 'opportunity') as ProjectStage;
    const currentStatus = project.status as ProjectStatus;

    // 验证阶段变更
    const validation = validateStageTransition(currentStage, newStage, currentStatus);

    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: validation.reason || '阶段变更不允许',
          details: { blockedReason: validation.reason }
        }
      }, { status: 400 });
    }

    // 如果有警告且未确认，返回警告
    if (validation.warning && !confirmed) {
      return successResponse({
        success: false,
        requiresConfirm: true,
        warning: validation.warning
      });
    }

    let updatedProject;

    if (isGovernedProjectStage(currentStage) && isGovernedProjectStage(newStage)) {
      try {
        await transitionProjectStage({
          projectId,
          toStage: newStage,
          operatorId: context.userId,
          triggerType: 'manual',
          reason: `手工切换项目阶段到 ${getStageLabel(newStage)}`,
        });
      } catch (serviceError) {
        if (serviceError instanceof ProjectStageTransitionError) {
          return errorResponse(serviceError.code, serviceError.message);
        }
        throw serviceError;
      }

      [updatedProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
    } else {
      [updatedProject] = await db
        .update(projects)
        .set({
          projectStage: newStage,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId))
        .returning();
    }

    return successResponse({
      success: true,
      data: {
        projectId,
        oldStage: currentStage,
        newStage,
        project: updatedProject
      },
      message: `项目阶段已切换为「${getStageLabel(newStage)}」`
    });
  } catch (error) {
    console.error('Failed to update project stage:', error);
    return errorResponse('INTERNAL_ERROR', '更新项目阶段失败');
  }
});
