import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, projectStageHistory } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { 
  ProjectStage,
  ProjectStatus,
} from '@/lib/utils/status-transitions';
import { 
  validateStageRollback, 
  getRecommendedCompatStatusForStage,
  isStageRollback,
  STAGE_ROLLBACK_RULES 
} from '@/lib/utils/stage-transitions';
import { getStageLabel } from '@/lib/utils/project-colors';

// POST - 阶段回退
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const body = await request.json();
    const projectId = parseInt(context.params?.id || '0');
    const targetStage = body.targetStage as ProjectStage;
    const rollbackReason = body.reason as string;

    // 验证必填参数
    if (!targetStage) {
      return errorResponse('BAD_REQUEST', '请指定目标阶段');
    }

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

    // 检查是否为回退操作
    if (!isStageRollback(currentStage, targetStage)) {
      return errorResponse('BAD_REQUEST', '目标阶段不是回退操作，请使用正常的阶段变更接口');
    }

    // 验证回退规则
    const validation = validateStageRollback(currentStage, targetStage, currentStatus, project.bidResult);

    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: validation.reason || '回退操作不允许',
          details: { blockedReason: validation.reason }
        }
      }, { status: 400 });
    }

    // 检查是否需要填写原因
    const rule = STAGE_ROLLBACK_RULES[currentStage];
    if (rule?.requiresReason && !rollbackReason) {
      return errorResponse('BAD_REQUEST', '请填写回退原因');
    }

    // 兼容状态由目标阶段自动派生，前端不再参与选择。
    const newStatus = getRecommendedCompatStatusForStage(targetStage);

    // 更新项目阶段和状态
    const [updatedProject] = await db
      .update(projects)
      .set({
        projectStage: targetStage,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    // 记录阶段变更历史
    await db.insert(projectStageHistory).values({
      projectId,
      fromStage: currentStage,
      toStage: targetStage,
      changedBy: context.userId,
      reason: rollbackReason || `阶段回退：${getStageLabel(currentStage)} → ${getStageLabel(targetStage)}`,
    });

    return successResponse({
      success: true,
      data: {
        projectId,
        oldStage: currentStage,
        newStage: targetStage,
        oldStatus: currentStatus,
        newStatus,
        project: updatedProject,
        preservedData: rule?.preserveData ?? true,
      },
      message: `项目已从「${getStageLabel(currentStage)}」回退到「${getStageLabel(targetStage)}」`,
      warning: validation.warning,
    });
  } catch (error) {
    console.error('Failed to rollback project stage:', error);
    return errorResponse('INTERNAL_ERROR', '阶段回退失败');
  }
});

// GET - 获取可回退的阶段选项
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

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
    const rule = STAGE_ROLLBACK_RULES[currentStage];

    // 构建可回退的阶段选项
    const rollbackOptions = rule.canRollbackTo.map(targetStage => {
      const validation = validateStageRollback(currentStage, targetStage, currentStatus, project.bidResult);
      return {
        stage: targetStage,
        label: getStageLabel(targetStage),
        disabled: !validation.valid,
        reason: validation.reason,
        warning: validation.warning,
      };
    });

    return successResponse({
      currentStage,
      currentStatus,
      currentStageLabel: getStageLabel(currentStage),
      canRollback: rule.canRollbackTo.length > 0,
      requiresReason: rule.requiresReason,
      requiresApproval: rule.requiresApproval,
      preserveData: rule.preserveData,
      rollbackOptions,
    });
  } catch (error) {
    console.error('Failed to get rollback options:', error);
    return errorResponse('INTERNAL_ERROR', '获取回退选项失败');
  }
});
