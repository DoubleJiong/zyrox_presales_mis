import { NextRequest } from 'next/server';
import { db } from '@/db';
import { biddingWorkLogs } from '@/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canWriteProject, isSystemAdmin } from '@/lib/permissions/project';

// GET - 获取工作日志列表
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    
    if (isNaN(projectId)) {
      return errorResponse('BAD_REQUEST', '无效的项目ID');
    }

    const logs = await db
      .select()
      .from(biddingWorkLogs)
      .where(and(
        eq(biddingWorkLogs.projectId, projectId),
        isNull(biddingWorkLogs.deletedAt)
      ))
      .orderBy(desc(biddingWorkLogs.logDate));

    return successResponse(logs);
  } catch (error) {
    console.error('Failed to fetch bidding work logs:', error);
    return errorResponse('INTERNAL_ERROR', '获取工作日志失败');
  }
});

// POST - 添加工作日志
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    
    if (isNaN(projectId)) {
      return errorResponse('BAD_REQUEST', '无效的项目ID');
    }

    const canWrite = await canWriteProject(projectId, context.userId);
    const isAdmin = await isSystemAdmin(context.userId);
    
    if (!canWrite && !isAdmin) {
      return errorResponse('FORBIDDEN', '没有权限添加工作日志');
    }

    const body = await request.json();
    const { logDate, workType, content, workHours } = body;

    if (!logDate || !workType || !content) {
      return errorResponse('BAD_REQUEST', '请填写完整信息');
    }

    const [log] = await db
      .insert(biddingWorkLogs)
      .values({
        projectId,
        logDate,
        authorId: context.userId,
        workType,
        content,
        workHours: workHours || null,
      })
      .returning();

    return successResponse(log);
  } catch (error) {
    console.error('Failed to add bidding work log:', error);
    return errorResponse('INTERNAL_ERROR', '添加工作日志失败');
  }
});
