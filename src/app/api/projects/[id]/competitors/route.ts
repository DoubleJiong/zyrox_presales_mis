import { NextRequest } from 'next/server';
import { db } from '@/db';
import { projectCompetitorProfiles } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canWriteProject, isSystemAdmin } from '@/lib/permissions/project';

// GET - 获取竞争对手列表
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    
    if (isNaN(projectId)) {
      return errorResponse('BAD_REQUEST', '无效的项目ID');
    }

    const competitors = await db
      .select()
      .from(projectCompetitorProfiles)
      .where(and(
        eq(projectCompetitorProfiles.projectId, projectId),
        isNull(projectCompetitorProfiles.deletedAt)
      ))
      .orderBy(projectCompetitorProfiles.createdAt);

    return successResponse(competitors);
  } catch (error) {
    console.error('Failed to fetch competitors:', error);
    return errorResponse('INTERNAL_ERROR', '获取竞争对手列表失败');
  }
});

// POST - 添加竞争对手
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    
    if (isNaN(projectId)) {
      return errorResponse('BAD_REQUEST', '无效的项目ID');
    }

    // 检查权限
    const canWrite = await canWriteProject(projectId, context.userId);
    const isAdmin = await isSystemAdmin(context.userId);
    
    if (!canWrite && !isAdmin) {
      return errorResponse('FORBIDDEN', '没有权限管理竞争对手');
    }

    const body = await request.json();
    const { name, strengths, weaknesses, strategy, threatLevel, notes } = body;

    if (!name) {
      return errorResponse('BAD_REQUEST', '请填写竞争对手名称');
    }

    const [competitor] = await db
      .insert(projectCompetitorProfiles)
      .values({
        projectId,
        name,
        strengths: strengths || null,
        weaknesses: weaknesses || null,
        strategy: strategy || null,
        threatLevel: threatLevel || 'medium',
        notes: notes || null,
      })
      .returning();

    return successResponse(competitor);
  } catch (error) {
    console.error('Failed to add competitor:', error);
    return errorResponse('INTERNAL_ERROR', '添加竞争对手失败');
  }
});
