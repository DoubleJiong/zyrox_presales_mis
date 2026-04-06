import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, users, projects } from '@/db/schema';
import { eq, and, isNull, desc, asc, sql, inArray } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { getPermissionContext, buildScopeCondition } from '@/lib/permissions/data-scope';
import { hasFullAccess } from '@/lib/permissions/middleware';
import { DataScope } from '@/lib/permissions/types';
import type { ResourceType } from '@/lib/permissions/types';

// GET - 获取项目的任务列表
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const { searchParams } = new URL(request.url);
    const userId = context.userId;
    
    // 获取查询参数
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assigneeId = searchParams.get('assigneeId');
    const parentId = searchParams.get('parentId');
    const view = searchParams.get('view') || 'list'; // list, board, gantt
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    // 检查项目访问权限
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return errorResponse('NOT_FOUND', '项目不存在', { status: 404 });
    }

    // 获取任务数据权限上下文
    const permissionContext = await getPermissionContext(userId, 'task' as ResourceType);
    const isFullAccess = hasFullAccess(permissionContext);

    // 构建基础查询条件
    const conditions = [eq(tasks.projectId, projectId), isNull(tasks.deletedAt)];
    
    // 如果不是全部权限，添加权限过滤
    if (!isFullAccess) {
      const scopeCondition = buildScopeCondition(permissionContext, 'task' as ResourceType, 'task');
      if (scopeCondition) {
        // 对于 MANAGE 权限，检查项目负责人或任务负责人
        if (permissionContext.dataPermission?.scope === DataScope.MANAGE) {
          conditions.push(sql`(task."assigneeId" = ${userId} OR project."managerId" = ${userId} OR project."createdBy" = ${userId})`);
        } else {
          // SELF 权限，只看自己负责的任务
          conditions.push(eq(tasks.assigneeId, userId));
        }
      }
    }

    // 添加过滤条件
    if (status) {
      conditions.push(eq(tasks.status, status));
    }
    if (priority) {
      conditions.push(eq(tasks.priority, priority));
    }
    if (assigneeId) {
      conditions.push(eq(tasks.assigneeId, parseInt(assigneeId)));
    }
    if (parentId !== null) {
      if (parentId === 'null' || parentId === 'root') {
        conditions.push(isNull(tasks.parentId));
      } else {
        conditions.push(eq(tasks.parentId, parseInt(parentId)));
      }
    }

    // 查询任务列表
    const taskList = await db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        taskName: tasks.taskName,
        taskType: tasks.taskType,
        description: tasks.description,
        assigneeId: tasks.assigneeId,
        assigneeName: users.realName,
        estimatedHours: tasks.estimatedHours,
        actualHours: tasks.actualHours,
        startDate: tasks.startDate,
        dueDate: tasks.dueDate,
        completedDate: tasks.completedDate,
        status: tasks.status,
        priority: tasks.priority,
        progress: tasks.progress,
        parentId: tasks.parentId,
        sequence: tasks.sequence,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(and(...conditions))
      .orderBy(asc(tasks.sequence), desc(tasks.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // 获取任务统计
    const statsResult = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${tasks.status} = 'pending')::int`,
        inProgress: sql<number>`count(*) filter (where ${tasks.status} = 'in_progress')::int`,
        completed: sql<number>`count(*) filter (where ${tasks.status} = 'completed')::int`,
        cancelled: sql<number>`count(*) filter (where ${tasks.status} = 'cancelled')::int`,
        overdue: sql<number>`count(*) filter (where ${tasks.status} not in ('completed', 'cancelled') and ${tasks.dueDate} < current_date)::int`,
        highPriority: sql<number>`count(*) filter (where ${tasks.priority} = 'high')::int`,
        mediumPriority: sql<number>`count(*) filter (where ${tasks.priority} = 'medium')::int`,
        lowPriority: sql<number>`count(*) filter (where ${tasks.priority} = 'low')::int`,
      })
      .from(tasks)
      .where(and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt)));

    const rawStats = statsResult[0] || {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      overdue: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
    };

    // 构建统计对象
    const stats = {
      total: rawStats.total,
      pending: rawStats.pending,
      inProgress: rawStats.inProgress,
      completed: rawStats.completed,
      cancelled: rawStats.cancelled,
      overdue: rawStats.overdue,
      highPriority: rawStats.highPriority,
      mediumPriority: rawStats.mediumPriority,
      lowPriority: rawStats.lowPriority,
      totalEstimatedHours: 0,
      totalActualHours: 0,
      byStatus: {
        pending: rawStats.pending,
        in_progress: rawStats.inProgress,
        completed: rawStats.completed,
        cancelled: rawStats.cancelled,
      },
      byPriority: {
        high: rawStats.highPriority,
        medium: rawStats.mediumPriority,
        low: rawStats.lowPriority,
      },
    };

    // 根据视图类型组织数据
    let responseData: any = { tasks: taskList, stats };

    if (view === 'board') {
      // 看板视图：按状态分组
      const boardData = {
        pending: taskList.filter(t => t.status === 'pending'),
        in_progress: taskList.filter(t => t.status === 'in_progress'),
        completed: taskList.filter(t => t.status === 'completed'),
        cancelled: taskList.filter(t => t.status === 'cancelled'),
      };
      responseData.board = boardData;
    } else if (view === 'gantt') {
      // 甘特图视图：包含时间线数据
      const ganttData = taskList.map(t => ({
        id: t.id,
        name: t.taskName,
        start: t.startDate,
        end: t.dueDate,
        progress: t.progress,
        assignee: t.assigneeName,
        type: t.taskType,
        parentId: t.parentId,
      }));
      responseData.gantt = ganttData;
    }

    // 添加权限信息
    responseData.permission = {
      canCreate: isFullAccess || permissionContext.dataPermission?.scope !== undefined,
      canUpdate: isFullAccess || permissionContext.dataPermission?.scope === DataScope.MANAGE,
      canDelete: isFullAccess,
      scope: permissionContext.dataPermission?.scope || DataScope.SELF,
    };

    return successResponse(responseData);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return errorResponse('INTERNAL_ERROR', '获取任务列表失败');
  }
});

// POST - 创建任务
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const body = await request.json();
    const userId = context.userId;

    // 验证必填字段
    if (!body.taskName || !body.taskType) {
      return errorResponse('BAD_REQUEST', '任务名称和类型为必填项');
    }

    // 检查项目是否存在
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return errorResponse('NOT_FOUND', '项目不存在', { status: 404 });
    }

    // 检查创建权限
    const permissionContext = await getPermissionContext(userId, 'task' as ResourceType);
    const canCreate = hasFullAccess(permissionContext) || 
      permissionContext.dataPermission?.scope === DataScope.MANAGE ||
      permissionContext.dataPermission?.scope === DataScope.SELF;

    if (!canCreate) {
      return errorResponse('FORBIDDEN', '无权在此项目中创建任务', { status: 403 });
    }

    // 获取最大排序号
    const maxSeqResult = await db
      .select({ maxSeq: sql<number>`coalesce(max(${tasks.sequence}), 0)` })
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
    
    const nextSequence = (maxSeqResult[0]?.maxSeq || 0) + 1;

    // 创建任务
    const [newTask] = await db
      .insert(tasks)
      .values({
        projectId,
        taskName: body.taskName,
        taskType: body.taskType,
        description: body.description || null,
        assigneeId: body.assigneeId || null,
        estimatedHours: body.estimatedHours || null,
        actualHours: body.actualHours || null,
        startDate: body.startDate || null,
        dueDate: body.dueDate || null,
        status: body.status || 'pending',
        priority: body.priority || 'medium',
        progress: body.progress || 0,
        parentId: body.parentId || null,
        sequence: nextSequence,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return successResponse(newTask);
  } catch (error) {
    console.error('Failed to create task:', error);
    return errorResponse('INTERNAL_ERROR', '创建任务失败');
  }
});
