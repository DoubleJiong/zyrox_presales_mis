import { NextRequest } from 'next/server';
import { db } from '@/db';
import { biddingWorkLogs } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canWriteProject, isSystemAdmin } from '@/lib/permissions/project';

// 验证日期格式 (YYYY-MM-DD)
function isValidDate(dateString: string | undefined | null): boolean {
  if (!dateString) return true; // 允许空值
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

// PUT - 更新工作日志
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const logId = parseInt(context.params?.logId || '0');
    
    if (isNaN(projectId) || isNaN(logId)) {
      return errorResponse('BAD_REQUEST', '无效的ID');
    }

    const canWrite = await canWriteProject(projectId, context.userId);
    const isAdmin = await isSystemAdmin(context.userId);
    
    if (!canWrite && !isAdmin) {
      return errorResponse('FORBIDDEN', '没有权限编辑工作日志');
    }

    const body = await request.json();
    
    // BUG-BID001: 验证日期格式
    if (body.logDate && !isValidDate(body.logDate)) {
      return errorResponse('BAD_REQUEST', '日期格式无效，请使用 YYYY-MM-DD 格式');
    }
    
    const [log] = await db
      .update(biddingWorkLogs)
      .set({
        logDate: body.logDate,
        workType: body.workType,
        content: body.content,
        workHours: body.workHours || null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(biddingWorkLogs.id, logId),
        eq(biddingWorkLogs.projectId, projectId),
        isNull(biddingWorkLogs.deletedAt)
      ))
      .returning();

    if (!log) {
      return errorResponse('NOT_FOUND', '工作日志不存在');
    }

    return successResponse(log);
  } catch (error) {
    console.error('Failed to update bidding work log:', error);
    return errorResponse('INTERNAL_ERROR', '更新工作日志失败');
  }
});

// DELETE - 删除工作日志
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const logId = parseInt(context.params?.logId || '0');
    
    if (isNaN(projectId) || isNaN(logId)) {
      return errorResponse('BAD_REQUEST', '无效的ID');
    }

    const canWrite = await canWriteProject(projectId, context.userId);
    const isAdmin = await isSystemAdmin(context.userId);
    
    if (!canWrite && !isAdmin) {
      return errorResponse('FORBIDDEN', '没有权限删除工作日志');
    }

    const [log] = await db
      .update(biddingWorkLogs)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(biddingWorkLogs.id, logId),
        eq(biddingWorkLogs.projectId, projectId),
        isNull(biddingWorkLogs.deletedAt)
      ))
      .returning();

    if (!log) {
      return errorResponse('NOT_FOUND', '工作日志不存在');
    }

    return successResponse({ message: '删除成功' });
  } catch (error) {
    console.error('Failed to delete bidding work log:', error);
    return errorResponse('INTERNAL_ERROR', '删除工作日志失败');
  }
});
