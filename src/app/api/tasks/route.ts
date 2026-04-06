import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, projects, users, schedules, projectMembers } from '@/db/schema';
import { desc, eq, and, like, sql, isNull, inArray } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { getAccessibleProjectIds, isSystemAdmin } from '@/lib/permissions/project';
import { parsePaginationParams } from '@/lib/pagination';
import { sanitizeSearchString } from '@/lib/xss';

function isTaskSequenceDriftError(error: unknown) {
  const databaseError = error as { cause?: { code?: string; constraint_name?: string } };
  return databaseError?.cause?.code === '23505' && databaseError?.cause?.constraint_name === 'bus_project_task_pkey';
}

async function resetTaskIdSequence() {
  await db.execute(sql.raw(`
    SELECT setval(
      pg_get_serial_sequence('bus_project_task', 'id'),
      COALESCE((SELECT MAX(id) FROM bus_project_task), 0) + 1,
      false
    )
  `));
}

/**
 * GET /api/tasks - 获取任务列表（带权限过滤）
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assigneeId = searchParams.get('assigneeId');
    const taskType = searchParams.get('taskType');
    // BUG-035, BUG-036: 清理搜索字符串，限制长度并移除危险字符
    const search = sanitizeSearchString(searchParams.get('search') || '');
    const { page, pageSize, offset } = parsePaginationParams(searchParams);

    // 检查是否是系统管理员
    const isAdmin = await isSystemAdmin(context.userId);

    // 获取用户可访问的项目ID列表
    let accessibleProjectIds: number[] = [];
    if (!isAdmin) {
      accessibleProjectIds = await getAccessibleProjectIds(context.userId);
    }

    // 构建查询条件
    const conditions = [isNull(tasks.deletedAt)];

    // 权限过滤：非管理员只能看到自己可访问项目的任务
    if (!isAdmin) {
      if (accessibleProjectIds.length === 0) {
        // 用户没有任何可访问的项目，返回空列表
        return successResponse({
          tasks: [],
          pagination: {
            page,
            pageSize,
            total: 0,
          },
        });
      }
      // 使用 sql 模板字符串替代 inArray，避免参数绑定问题
      conditions.push(sql`${tasks.projectId} IN ${accessibleProjectIds}`);
    }

    if (projectId) {
      // 验证用户是否有权访问该项目
      const projectIdNum = parseInt(projectId);
      if (!isAdmin && !accessibleProjectIds.includes(projectIdNum)) {
        return errorResponse('FORBIDDEN', '您没有权限查看此项目的任务');
      }
      conditions.push(eq(tasks.projectId, projectIdNum));
    }
    
    // BUG-021: 验证状态参数是否有效
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return errorResponse('BAD_REQUEST', `无效的任务状态，有效值为: ${validStatuses.join(', ')}`);
    }
    if (status) {
      conditions.push(eq(tasks.status, status));
    }
    
    // BUG-041: 验证优先级参数是否有效
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return errorResponse('BAD_REQUEST', `无效的优先级，有效值为: ${validPriorities.join(', ')}`);
    }
    if (priority) {
      conditions.push(eq(tasks.priority, priority));
    }
    if (assigneeId) {
      conditions.push(eq(tasks.assigneeId, parseInt(assigneeId)));
    }
    if (taskType) {
      conditions.push(eq(tasks.taskType, taskType));
    }
    if (search) {
      conditions.push(like(tasks.taskName, `%${search}%`));
    }

    // 查询任务列表
    const taskList = await db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        projectName: projects.projectName,
        taskName: tasks.taskName,
        taskType: tasks.taskType,
        description: tasks.description,
        assigneeId: tasks.assigneeId,
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
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt))
      .limit(pageSize)
      .offset(offset);

    // 获取负责人名称
    const assigneeIds = taskList
      .map(t => t.assigneeId)
      .filter((id): id is number => id !== null);

    let assigneeNames: Record<number, string> = {};
    if (assigneeIds.length > 0) {
      const assigneeList = await db
        .select({ id: users.id, realName: users.realName })
        .from(users)
        .where(inArray(users.id, assigneeIds));
      
      assigneeNames = assigneeList.reduce((acc, u) => {
        acc[u.id] = u.realName || '';
        return acc;
      }, {} as Record<number, string>);
    }

    // 添加负责人名称到结果
    const tasksWithAssignee = taskList.map(t => ({
      ...t,
      assigneeName: t.assigneeId ? assigneeNames[t.assigneeId] : null,
    }));

    // 获取总数
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(...conditions));

    return successResponse({
      tasks: tasksWithAssignee,
      pagination: {
        page,
        pageSize,
        total,
      },
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return errorResponse('INTERNAL_ERROR', '获取任务列表失败');
  }
});

/**
 * POST /api/tasks - 创建任务
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const body = await request.json();
    const userId = context.userId;

    const {
      projectId,
      taskName,
      taskType,
      description,
      priority = 'medium',
      assigneeId,
      startDate,
      dueDate,
      estimatedHours,
      parentId,
    } = body;

    if (!taskName || !taskName.trim()) {
      return errorResponse('BAD_REQUEST', '任务名称不能为空');
    }

    // 验证和处理 assigneeId
    let parsedAssigneeId: number | null = null;
    if (assigneeId !== undefined && assigneeId !== null && assigneeId !== '') {
      const parsed = parseInt(assigneeId);
      if (isNaN(parsed)) {
        return errorResponse('BAD_REQUEST', '负责人ID格式无效');
      }
      parsedAssigneeId = parsed;
    }

    // 验证和处理 projectId
    let parsedProjectId: number | null = null;
    if (projectId !== undefined && projectId !== null && projectId !== '') {
      const parsed = parseInt(projectId);
      if (isNaN(parsed)) {
        return errorResponse('BAD_REQUEST', '项目ID格式无效');
      }
      parsedProjectId = parsed;
      
      // BUG-002: 验证项目是否存在
      const [projectExists] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, parsedProjectId))
        .limit(1);
      
      if (!projectExists) {
        return errorResponse('NOT_FOUND', '指定的项目不存在');
      }
    }

    // P1-16: 验证任务分配与项目成员关联
    let assigneeWarning: string | null = null;
    if (parsedProjectId && parsedAssigneeId) {
      // 检查被分配人是否是项目负责人或成员
      const [project] = await db
        .select({ managerId: projects.managerId, deliveryManagerId: projects.deliveryManagerId })
        .from(projects)
        .where(eq(projects.id, parsedProjectId))
        .limit(1);

      if (project) {
        const isManager = project.managerId === parsedAssigneeId || project.deliveryManagerId === parsedAssigneeId;
        
        if (!isManager) {
          // 检查是否是项目成员
          const [member] = await db
            .select({ id: projectMembers.id })
            .from(projectMembers)
            .where(and(
              eq(projectMembers.projectId, parsedProjectId),
              eq(projectMembers.userId, parsedAssigneeId)
            ))
            .limit(1);

          if (!member) {
            // 返回警告信息给前端，但不阻止创建
            assigneeWarning = '被分配人不是项目负责人、交付负责人或成员，建议先将其添加为项目成员';
            console.warn(`[Tasks API] Warning: Assignee ${parsedAssigneeId} is not a member of project ${parsedProjectId}`);
          }
        }
      }
    }

    // 验证和处理 parentId
    let parsedParentId: number | null = null;
    if (parentId !== undefined && parentId !== null && parentId !== '') {
      const parsed = parseInt(parentId);
      if (isNaN(parsed)) {
        return errorResponse('BAD_REQUEST', '父任务ID格式无效');
      }
      parsedParentId = parsed;
    }

    // 验证日期格式
    let parsedStartDate: string | null = null;
    if (startDate) {
      const dateStr = typeof startDate === 'string' ? startDate : String(startDate);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return errorResponse('BAD_REQUEST', '开始日期格式无效，应为 YYYY-MM-DD');
      }
      parsedStartDate = dateStr;
    }

    let parsedDueDate: string | null = null;
    if (dueDate) {
      const dateStr = typeof dueDate === 'string' ? dueDate : String(dueDate);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return errorResponse('BAD_REQUEST', '截止日期格式无效，应为 YYYY-MM-DD');
      }
      parsedDueDate = dateStr;
    }

    // 验证预计工时
    let parsedEstimatedHours: string | null = null;
    if (estimatedHours !== undefined && estimatedHours !== null && estimatedHours !== '') {
      const hours = parseFloat(estimatedHours);
      if (isNaN(hours) || hours < 0) {
        return errorResponse('BAD_REQUEST', '预计工时必须为非负数');
      }
      parsedEstimatedHours = String(hours);
    }

    const insertData = {
      projectId: parsedProjectId,
      taskName: taskName.trim(),
      taskType: taskType || null,
      description: description || null,
      status: 'pending' as const,
      priority: priority || 'medium',
      assigneeId: parsedAssigneeId || userId,
      startDate: parsedStartDate,
      dueDate: parsedDueDate,
      estimatedHours: parsedEstimatedHours,
      parentId: parsedParentId,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let newTask;

    try {
      [newTask] = await db
        .insert(tasks)
        .values(insertData)
        .returning();
    } catch (error) {
      if (!isTaskSequenceDriftError(error)) {
        throw error;
      }

      await resetTaskIdSequence();

      [newTask] = await db
        .insert(tasks)
        .values(insertData)
        .returning();
    }

    // 如果有开始日期或截止日期，自动创建关联的日程
    if (parsedStartDate || parsedDueDate) {
      try {
        const scheduleDate = parsedStartDate || parsedDueDate;
        await db.insert(schedules).values({
          title: `任务：${taskName.trim()}`,
          type: 'task',
          startDate: scheduleDate!,
          startTime: '09:00',
          endDate: parsedDueDate || scheduleDate!,
          endTime: '18:00',
          allDay: true,
          relatedType: 'task',
          relatedId: newTask.id,
          description: description || `关联任务：${taskName.trim()}`,
          userId: parsedAssigneeId || userId,
          scheduleStatus: 'scheduled',
        });
      } catch (scheduleError) {
        // 日程创建失败不影响任务创建，仅记录日志
        console.error('Failed to create related schedule:', scheduleError);
      }
    }

    return successResponse({
      ...newTask,
      warning: assigneeWarning,
    });
  } catch (error) {
    console.error('Failed to create task:', error);
    // BUG-003: 隐藏SQL错误详情，返回通用错误信息
    return errorResponse('INTERNAL_ERROR', '创建任务失败，请检查输入参数是否正确');
  }
});
