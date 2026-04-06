import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { getPermissionContext } from '@/lib/permissions/data-scope';
import { hasFullAccess } from '@/lib/permissions/middleware';
import { DataScope } from '@/lib/permissions/types';
import type { ResourceType } from '@/lib/permissions/types';

// POST - 批量操作
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const body = await request.json();
    const userId = context.userId;

    const { action, taskIds, data } = body;

    if (!action || !taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return errorResponse('BAD_REQUEST', '参数错误');
    }

    // 检查权限
    const permissionContext = await getPermissionContext(userId, 'task' as ResourceType);
    const isFullAccess = hasFullAccess(permissionContext);

    // 根据操作类型检查权限
    switch (action) {
      case 'updateStatus':
      case 'updatePriority':
      case 'updateAssignee':
      case 'updateDueDate':
      case 'updateSequence':
        // 更新操作：需要管理员或任务负责人权限
        if (!isFullAccess) {
          // 验证用户是否是所有任务负责人
          const userTasks = await db.query.tasks.findMany({
            where: and(
              inArray(tasks.id, taskIds),
              isNull(tasks.deletedAt)
            ),
            columns: {
              id: true,
              assigneeId: true,
            },
          });

          const unauthorizedTasks = userTasks.filter(t => t.assigneeId !== userId);
          if (unauthorizedTasks.length > 0) {
            return errorResponse('FORBIDDEN', '只能操作自己负责的任务', { status: 403 });
          }
        }
        break;

      case 'delete':
        // 删除操作：仅管理员可操作
        if (!isFullAccess) {
          return errorResponse('FORBIDDEN', '仅管理员可批量删除任务', { status: 403 });
        }
        break;

      default:
        return errorResponse('BAD_REQUEST', '未知的操作类型');
    }

    // 执行批量操作
    let result: any = { success: true, affected: 0 };

    switch (action) {
      case 'updateStatus':
        if (!data?.status) {
          return errorResponse('BAD_REQUEST', '缺少状态参数');
        }
        const statusUpdate = await db
          .update(tasks)
          .set({ 
            status: data.status, 
            updatedAt: new Date(),
            ...(data.status === 'completed' ? { completedDate: new Date() } : {}),
          })
          .where(and(inArray(tasks.id, taskIds), isNull(tasks.deletedAt)))
          .returning();
        result.affected = statusUpdate.length;
        break;

      case 'updatePriority':
        if (!data?.priority) {
          return errorResponse('BAD_REQUEST', '缺少优先级参数');
        }
        const priorityUpdate = await db
          .update(tasks)
          .set({ priority: data.priority, updatedAt: new Date() })
          .where(and(inArray(tasks.id, taskIds), isNull(tasks.deletedAt)))
          .returning();
        result.affected = priorityUpdate.length;
        break;

      case 'updateAssignee':
        const assigneeUpdate = await db
          .update(tasks)
          .set({ 
            assigneeId: data?.assigneeId || null, 
            updatedAt: new Date() 
          })
          .where(and(inArray(tasks.id, taskIds), isNull(tasks.deletedAt)))
          .returning();
        result.affected = assigneeUpdate.length;
        break;

      case 'updateDueDate':
        const dueDateUpdate = await db
          .update(tasks)
          .set({ 
            dueDate: data?.dueDate || null, 
            updatedAt: new Date() 
          })
          .where(and(inArray(tasks.id, taskIds), isNull(tasks.deletedAt)))
          .returning();
        result.affected = dueDateUpdate.length;
        break;

      case 'updateSequence':
        if (!data?.sequences || !Array.isArray(data.sequences)) {
          return errorResponse('BAD_REQUEST', '缺少排序数据');
        }
        // 批量更新排序
        for (const item of data.sequences) {
          await db
            .update(tasks)
            .set({ sequence: item.sequence, updatedAt: new Date() })
            .where(eq(tasks.id, item.id));
        }
        result.affected = data.sequences.length;
        break;

      case 'delete':
        const deleteUpdate = await db
          .update(tasks)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(and(inArray(tasks.id, taskIds), isNull(tasks.deletedAt)))
          .returning();
        result.affected = deleteUpdate.length;
        break;
    }

    return successResponse(result);
  } catch (error) {
    console.error('Failed to batch update tasks:', error);
    return errorResponse('INTERNAL_ERROR', '批量操作失败');
  }
});
