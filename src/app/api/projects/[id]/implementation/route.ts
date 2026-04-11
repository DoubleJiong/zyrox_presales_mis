import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projectImplementations, projects } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { canReadProject, canWriteProject } from '@/lib/permissions/project';

// GET - 获取项目实施方案
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

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

    const canRead = await canReadProject(projectId, context.userId);
    if (!canRead) {
      return errorResponse('FORBIDDEN', '您没有权限查看此项目');
    }

    const [record] = await db
      .select()
      .from(projectImplementations)
      .where(eq(projectImplementations.projectId, projectId))
      .limit(1);

    if (!record) {
      return successResponse({
        projectId,
        implementationStatus: 'planning',
        deliveryPlan: null,
        implementationSteps: null,
        acceptanceCriteria: null,
        riskMitigation: null,
        progressNotes: null,
        plannedStartDate: null,
        plannedEndDate: null,
        actualStartDate: null,
      });
    }

    return successResponse(record);
  } catch (error) {
    console.error('Get project implementation error:', error);
    return errorResponse('INTERNAL_ERROR', '获取实施方案失败');
  }
});

// PUT - 创建或更新项目实施方案
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const body = await request.json();

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

    const canWrite = await canWriteProject(projectId, context.userId);
    if (!canWrite) {
      return errorResponse('FORBIDDEN', '您没有权限编辑此项目');
    }

    const [existing] = await db
      .select()
      .from(projectImplementations)
      .where(eq(projectImplementations.projectId, projectId))
      .limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(projectImplementations)
        .set({
          implementationStatus: body.implementationStatus ?? existing.implementationStatus,
          deliveryPlan: body.deliveryPlan ?? existing.deliveryPlan,
          implementationSteps: body.implementationSteps ?? existing.implementationSteps,
          acceptanceCriteria: body.acceptanceCriteria ?? existing.acceptanceCriteria,
          riskMitigation: body.riskMitigation ?? existing.riskMitigation,
          progressNotes: body.progressNotes ?? existing.progressNotes,
          plannedStartDate: body.plannedStartDate ?? existing.plannedStartDate,
          plannedEndDate: body.plannedEndDate ?? existing.plannedEndDate,
          actualStartDate: body.actualStartDate ?? existing.actualStartDate,
          updatedAt: new Date(),
        })
        .where(eq(projectImplementations.projectId, projectId))
        .returning();
    } else {
      [result] = await db
        .insert(projectImplementations)
        .values({
          projectId,
          implementationStatus: body.implementationStatus || 'planning',
          deliveryPlan: body.deliveryPlan || null,
          implementationSteps: body.implementationSteps || null,
          acceptanceCriteria: body.acceptanceCriteria || null,
          riskMitigation: body.riskMitigation || null,
          progressNotes: body.progressNotes || null,
          plannedStartDate: body.plannedStartDate || null,
          plannedEndDate: body.plannedEndDate || null,
          actualStartDate: body.actualStartDate || null,
        })
        .returning();
    }

    return successResponse({ ...result, message: '保存成功' });
  } catch (error) {
    console.error('Update project implementation error:', error);
    return errorResponse('INTERNAL_ERROR', '保存实施方案失败');
  }
});
