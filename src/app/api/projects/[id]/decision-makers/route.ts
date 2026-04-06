import { NextRequest } from 'next/server';
import { db } from '@/db';
import { projectDecisionMakers } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canWriteProject, isSystemAdmin } from '@/lib/permissions/project';

// GET - 获取决策人列表
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    
    if (isNaN(projectId)) {
      return errorResponse('BAD_REQUEST', '无效的项目ID');
    }

    const makers = await db
      .select()
      .from(projectDecisionMakers)
      .where(and(
        eq(projectDecisionMakers.projectId, projectId),
        isNull(projectDecisionMakers.deletedAt)
      ))
      .orderBy(projectDecisionMakers.createdAt);

    return successResponse(makers);
  } catch (error) {
    console.error('Failed to fetch decision makers:', error);
    return errorResponse('INTERNAL_ERROR', '获取决策人列表失败');
  }
});

// POST - 添加决策人
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
      return errorResponse('FORBIDDEN', '没有权限管理决策人');
    }

    const body = await request.json();
    const { name, position, department, attitude, influenceLevel, contactInfo, notes } = body;

    if (!name) {
      return errorResponse('BAD_REQUEST', '请填写姓名');
    }

    const [maker] = await db
      .insert(projectDecisionMakers)
      .values({
        projectId,
        name,
        position: position || null,
        department: department || null,
        attitude: attitude || 'unknown',
        influenceLevel: influenceLevel || 3,
        contactInfo: contactInfo || null,
        notes: notes || null,
      })
      .returning();

    return successResponse(maker);
  } catch (error) {
    console.error('Failed to add decision maker:', error);
    return errorResponse('INTERNAL_ERROR', '添加决策人失败');
  }
});
