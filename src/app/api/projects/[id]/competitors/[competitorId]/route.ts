import { NextRequest } from 'next/server';
import { db } from '@/db';
import { projectCompetitorProfiles } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canWriteProject, isSystemAdmin } from '@/lib/permissions/project';

// GET - 获取单个竞争对手
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const competitorId = parseInt(context.params?.competitorId || '0');
    
    if (isNaN(competitorId)) {
      return errorResponse('BAD_REQUEST', '无效的竞争对手ID');
    }

    const [competitor] = await db
      .select()
      .from(projectCompetitorProfiles)
      .where(and(
        eq(projectCompetitorProfiles.id, competitorId),
        isNull(projectCompetitorProfiles.deletedAt)
      ))
      .limit(1);

    if (!competitor) {
      return errorResponse('NOT_FOUND', '竞争对手不存在');
    }

    return successResponse(competitor);
  } catch (error) {
    console.error('Failed to fetch competitor:', error);
    return errorResponse('INTERNAL_ERROR', '获取竞争对手失败');
  }
});

// PUT - 更新竞争对手
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const competitorId = parseInt(context.params?.competitorId || '0');
    
    if (isNaN(projectId) || isNaN(competitorId)) {
      return errorResponse('BAD_REQUEST', '无效的ID');
    }

    // 检查权限
    const canWrite = await canWriteProject(projectId, context.userId);
    const isAdmin = await isSystemAdmin(context.userId);
    
    if (!canWrite && !isAdmin) {
      return errorResponse('FORBIDDEN', '没有权限管理竞争对手');
    }

    const body = await request.json();
    
    const [competitor] = await db
      .update(projectCompetitorProfiles)
      .set({
        name: body.name,
        strengths: body.strengths || null,
        weaknesses: body.weaknesses || null,
        strategy: body.strategy || null,
        threatLevel: body.threatLevel || 'medium',
        notes: body.notes || null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(projectCompetitorProfiles.id, competitorId),
        eq(projectCompetitorProfiles.projectId, projectId),
        isNull(projectCompetitorProfiles.deletedAt)
      ))
      .returning();

    if (!competitor) {
      return errorResponse('NOT_FOUND', '竞争对手不存在');
    }

    return successResponse(competitor);
  } catch (error) {
    console.error('Failed to update competitor:', error);
    return errorResponse('INTERNAL_ERROR', '更新竞争对手失败');
  }
});

// DELETE - 删除竞争对手
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const competitorId = parseInt(context.params?.competitorId || '0');
    
    if (isNaN(projectId) || isNaN(competitorId)) {
      return errorResponse('BAD_REQUEST', '无效的ID');
    }

    // 检查权限
    const canWrite = await canWriteProject(projectId, context.userId);
    const isAdmin = await isSystemAdmin(context.userId);
    
    if (!canWrite && !isAdmin) {
      return errorResponse('FORBIDDEN', '没有权限管理竞争对手');
    }

    const [competitor] = await db
      .update(projectCompetitorProfiles)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(projectCompetitorProfiles.id, competitorId),
        eq(projectCompetitorProfiles.projectId, projectId),
        isNull(projectCompetitorProfiles.deletedAt)
      ))
      .returning();

    if (!competitor) {
      return errorResponse('NOT_FOUND', '竞争对手不存在');
    }

    return successResponse({ message: '删除成功' });
  } catch (error) {
    console.error('Failed to delete competitor:', error);
    return errorResponse('INTERNAL_ERROR', '删除竞争对手失败');
  }
});
