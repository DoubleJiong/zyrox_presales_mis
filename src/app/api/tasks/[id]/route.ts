import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, users, taskDeliverables, projects, projectMembers, messages, schedules } from '@/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { getPermissionContext } from '@/lib/permissions/data-scope';
import { hasFullAccess } from '@/lib/permissions/middleware';
import { DataScope } from '@/lib/permissions/types';
import type { ResourceType } from '@/lib/permissions/types';
import { OperationLogService } from '@/lib/operation-log-service';

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

// GET - 获取任务详情
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const taskId = parseInt(context.params?.id || '0');
    const userId = context.userId;

    // 查询任务详情
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), isNull(tasks.deletedAt)),
      with: {
        project: {
          columns: {
            id: true,
            projectName: true,
            status: true,
            managerId: true,
            deliveryManagerId: true,
          },
        },
      },
    });

    if (!task) {
      return errorResponse('NOT_FOUND', '任务不存在', { status: 404 });
    }

    // 检查访问权限
    const permissionContext = await getPermissionContext(userId, 'task' as ResourceType);
    const isFullAccess = hasFullAccess(permissionContext);

    // 对于非管理员，检查是否是任务负责人或项目负责人
    if (!isFullAccess) {
      const isAssignee = task.assigneeId === userId;
      const isProjectManager = task.project?.managerId === userId;
      const isDeliveryManager = task.project?.deliveryManagerId === userId;
      const isCreator = task.createdBy === userId;

      if (!isAssignee && !isProjectManager && !isDeliveryManager && !isCreator) {
        return errorResponse('FORBIDDEN', '无权访问此任务', { status: 403 });
      }
    }

    // 获取负责人信息
    let assignee = null;
    if (task.assigneeId) {
      assignee = await db.query.users.findFirst({
        where: eq(users.id, task.assigneeId),
        columns: {
          id: true,
          realName: true,
          email: true,
        },
      });
    }

    // 获取交付物
    const deliverables = await db.query.taskDeliverables.findMany({
      where: eq(taskDeliverables.taskId, taskId),
    });

    // 获取子任务
    const subTasks = await db.query.tasks.findMany({
      where: and(eq(tasks.parentId, taskId), isNull(tasks.deletedAt)),
      columns: {
        id: true,
        taskName: true,
        status: true,
        progress: true,
        dueDate: true,
      },
    });

    const responseData = {
      ...task,
      assignee,
      deliverables,
      subTasks,
      permission: {
        canUpdate: isFullAccess || task.assigneeId === userId || task.project?.managerId === userId || task.project?.deliveryManagerId === userId,
        canDelete: isFullAccess,
      },
    };

    return successResponse(responseData);
  } catch (error) {
    console.error('Failed to fetch task:', error);
    return errorResponse('INTERNAL_ERROR', '获取任务详情失败');
  }
});

// PUT - 更新任务
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const taskId = parseInt(context.params?.id || '0');
    const body = await request.json();
    const userId = context.userId;

    // 查询任务
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), isNull(tasks.deletedAt)),
    });

    if (!task) {
      return errorResponse('NOT_FOUND', '任务不存在', { status: 404 });
    }

    // 检查更新权限
    const permissionContext = await getPermissionContext(userId, 'task' as ResourceType);
    const isFullAccess = hasFullAccess(permissionContext);
    const isAssignee = task.assigneeId === userId;
    const [taskProject] = task.projectId
      ? await db
          .select({ managerId: projects.managerId, deliveryManagerId: projects.deliveryManagerId, projectName: projects.projectName })
          .from(projects)
          .where(eq(projects.id, task.projectId))
          .limit(1)
      : [];
    const canUpdate = isFullAccess || isAssignee || taskProject?.managerId === userId || taskProject?.deliveryManagerId === userId;

    if (!canUpdate) {
      return errorResponse('FORBIDDEN', '无权更新此任务', { status: 403 });
    }

    // 构建更新数据
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    // P1-16: 验证任务分配与项目成员关联
    let assigneeWarning: string | null = null;
    const newAssigneeId = body.assigneeId !== undefined ? body.assigneeId : task.assigneeId;
    const projectId = task.projectId;
    
    if (projectId && newAssigneeId && newAssigneeId !== task.assigneeId) {
      // 检查被分配人是否是项目负责人或成员
      const [project] = await db
        .select({ managerId: projects.managerId, deliveryManagerId: projects.deliveryManagerId })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (project) {
        const isManager = project.managerId === newAssigneeId || project.deliveryManagerId === newAssigneeId;
        
        if (!isManager) {
          // 检查是否是项目成员
          const [member] = await db
            .select({ id: projectMembers.id })
            .from(projectMembers)
            .where(and(
              eq(projectMembers.projectId, projectId),
              eq(projectMembers.userId, newAssigneeId)
            ))
            .limit(1);

          if (!member) {
            assigneeWarning = '被分配人不是项目负责人、交付负责人或成员，建议先将其添加为项目成员';
          }
        }
      }
    }

    // 允许更新的字段
    const allowedFields = [
      'taskName', 'taskType', 'description', 'assigneeId',
      'estimatedHours', 'actualHours', 'startDate', 'dueDate',
      'status', 'priority', 'progress', 'parentId', 'sequence',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // 如果状态变为完成，记录完成时间
    if (body.status === 'completed' && task.status !== 'completed') {
      updateData.completedDate = toDateOnly(new Date());
    }

    // 更新任务
    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    // 任务重分配通知
    if (
      body.assigneeId !== undefined &&
      body.assigneeId !== null &&
      body.assigneeId !== task.assigneeId
    ) {
      try {
        const newAssignee = parseInt(body.assigneeId);
        if (!isNaN(newAssignee)) {
          await db.insert(messages).values({
            title: '任务重新指派',
            content: `您被指派了任务「${updatedTask.taskName}」${taskProject?.projectName ? `（项目：${taskProject.projectName}）` : ''}，请及时处理。`,
            type: 'task',
            category: 'task',
            priority: updatedTask.priority === 'urgent' ? 'urgent' : updatedTask.priority === 'high' ? 'high' : 'normal',
            receiverId: newAssignee,
            senderId: userId,
            relatedType: 'task',
            relatedId: taskId,
            relatedName: updatedTask.taskName,
            actionUrl: `/tasks/${taskId}`,
            actionText: '查看任务',
            isRead: false,
            isDeleted: false,
            updatedAt: new Date(),
          });
        }
      } catch (msgErr) {
        console.error('[Tasks] Failed to write task reassignment message:', msgErr);
      }
    }

    // 任务完成通知（通知项目负责人）
    if (
      body.status === 'completed' &&
      task.status !== 'completed' &&
      taskProject?.managerId &&
      taskProject.managerId !== userId
    ) {
      try {
        await db.insert(messages).values({
          title: '任务已完成',
          content: `任务「${updatedTask.taskName}」已完成${taskProject?.projectName ? `（项目：${taskProject.projectName}）` : ''}。`,
          type: 'task',
          category: 'task',
          priority: 'normal',
          receiverId: taskProject.managerId,
          senderId: userId,
          relatedType: 'task',
          relatedId: taskId,
          relatedName: updatedTask.taskName,
          actionUrl: `/tasks/${taskId}`,
          actionText: '查看任务',
          isRead: false,
          isDeleted: false,
          updatedAt: new Date(),
        });
      } catch (msgErr) {
        console.error('[Tasks] Failed to write task completion message:', msgErr);
      }
    }

    // 同步关联日程状态（D1/D2/D3）
    const statusChanged = body.status !== undefined && body.status !== task.status;
    const dueDateChanged = body.dueDate !== undefined && body.dueDate !== task.dueDate;

    if (statusChanged && (body.status === 'completed' || body.status === 'cancelled')) {
      // D1/D2: 任务完成或取消时，同步关联日程状态
      try {
        await db
          .update(schedules)
          .set({ scheduleStatus: body.status, updatedAt: new Date() })
          .where(and(
            eq(schedules.relatedType, 'task'),
            eq(schedules.relatedId, taskId),
            inArray(schedules.scheduleStatus, ['scheduled'])
          ));
      } catch (syncErr) {
        console.error('[Tasks] Failed to sync schedule status:', syncErr);
      }
    }

    if (dueDateChanged && body.dueDate) {
      // D3: 任务截止日期变更时，同步关联日程的 endDate
      try {
        await db
          .update(schedules)
          .set({ endDate: body.dueDate, updatedAt: new Date() })
          .where(and(
            eq(schedules.relatedType, 'task'),
            eq(schedules.relatedId, taskId)
          ));
      } catch (syncErr) {
        console.error('[Tasks] Failed to sync schedule end date:', syncErr);
      }
    }

    // 操作日志
    if (statusChanged && body.status === 'completed') {
      OperationLogService.log({
        userId,
        module: 'task',
        action: 'update',
        resource: 'task',
        resourceId: taskId,
        status: 'success',
      }).catch(() => {});
    }

    return successResponse({
      ...updatedTask,
      warning: assigneeWarning,
    });
  } catch (error) {
    console.error('Failed to update task:', error);
    return errorResponse('INTERNAL_ERROR', '更新任务失败');
  }
});

// DELETE - 删除任务（软删除）
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const taskId = parseInt(context.params?.id || '0');
    const userId = context.userId;

    // 查询任务
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), isNull(tasks.deletedAt)),
    });

    if (!task) {
      return errorResponse('NOT_FOUND', '任务不存在', { status: 404 });
    }

    // 检查删除权限（仅管理员可删除）
    const permissionContext = await getPermissionContext(userId, 'task' as ResourceType);
    const canDelete = hasFullAccess(permissionContext);

    if (!canDelete) {
      return errorResponse('FORBIDDEN', '无权删除任务，请联系管理员', { status: 403 });
    }

    // 检查是否有子任务
    const subTasks = await db.query.tasks.findMany({
      where: and(eq(tasks.parentId, taskId), isNull(tasks.deletedAt)),
    });

    if (subTasks.length > 0) {
      return errorResponse('BAD_REQUEST', '请先删除子任务', { status: 400 });
    }

    // 软删除任务
    await db
      .update(tasks)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));

    return successResponse({ message: '任务已删除' });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return errorResponse('INTERNAL_ERROR', '删除任务失败');
  }
});
