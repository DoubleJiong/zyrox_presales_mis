import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, users } from '@/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET - 获取甘特图数据
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const { searchParams } = new URL(request.url);
    
    // 获取视图范围参数
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 构建查询条件
    const conditions = [eq(tasks.projectId, projectId), isNull(tasks.deletedAt)];

    // 查询所有任务
    const taskList = await db
      .select({
        id: tasks.id,
        taskName: tasks.taskName,
        taskType: tasks.taskType,
        description: tasks.description,
        assigneeId: tasks.assigneeId,
        assigneeName: users.realName,
        startDate: tasks.startDate,
        dueDate: tasks.dueDate,
        completedDate: tasks.completedDate,
        status: tasks.status,
        priority: tasks.priority,
        progress: tasks.progress,
        parentId: tasks.parentId,
        sequence: tasks.sequence,
        estimatedHours: tasks.estimatedHours,
        actualHours: tasks.actualHours,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(and(...conditions))
      .orderBy(asc(tasks.sequence), asc(tasks.startDate));

    // 转换为甘特图数据格式
    interface GanttTask {
      id: number;
      name: string;
      start: string | null;
      end: string | null;
      progress: number;
      type: string;
      status: string;
      priority: string;
      assignee: string | null;
      assigneeId: number | null;
      parentId: number | null;
      dependencies: number[];
      color: string;
      isDisabled: boolean;
    }

    const ganttTasks: GanttTask[] = taskList.map(task => {
      // 根据状态确定颜色
      let color = '#94a3b8'; // 默认灰色
      if (task.status === 'completed') {
        color = '#22c55e'; // 绿色
      } else if (task.status === 'in_progress') {
        color = '#3b82f6'; // 蓝色
      } else if (task.status === 'cancelled') {
        color = '#ef4444'; // 红色
      } else if (task.priority === 'high') {
        color = '#f97316'; // 橙色（高优先级）
      }

      return {
        id: task.id,
        name: task.taskName,
        start: task.startDate,
        end: task.dueDate || task.completedDate,
        progress: task.progress || 0,
        type: task.taskType,
        status: task.status,
        priority: task.priority,
        assignee: task.assigneeName,
        assigneeId: task.assigneeId,
        parentId: task.parentId,
        dependencies: task.parentId ? [task.parentId] : [],
        color,
        isDisabled: task.status === 'cancelled',
      };
    });

    // 构建任务树结构
    const taskMap = new Map<number, GanttTask>();
    const rootTasks: GanttTask[] = [];
    const childrenMap = new Map<number, GanttTask[]>();

    ganttTasks.forEach(task => {
      taskMap.set(task.id, task);
      if (task.parentId) {
        const children = childrenMap.get(task.parentId) || [];
        children.push(task);
        childrenMap.set(task.parentId, children);
      } else {
        rootTasks.push(task);
      }
    });

    // 计算项目时间范围
    const dates = ganttTasks
      .filter(t => t.start || t.end)
      .flatMap(t => [t.start, t.end])
      .filter(Boolean) as string[];

    const projectStart = dates.length > 0 
      ? dates.reduce((min, d) => d < min ? d : min, dates[0])
      : null;
    const projectEnd = dates.length > 0 
      ? dates.reduce((max, d) => d > max ? d : max, dates[0])
      : null;

    // 里程碑（关键任务）
    const milestones = ganttTasks
      .filter(t => t.priority === 'high' || t.progress === 100)
      .map(t => ({
        id: t.id,
        name: t.name,
        date: t.end || t.start,
        type: t.progress === 100 ? 'completed' : 'milestone',
      }));

    return successResponse({
      tasks: ganttTasks,
      tree: {
        roots: rootTasks.map(t => t.id),
        children: Object.fromEntries(childrenMap),
      },
      timeline: {
        start: projectStart,
        end: projectEnd,
      },
      milestones,
      assignees: [...new Set(ganttTasks.filter(t => t.assignee).map(t => ({
        id: t.assigneeId,
        name: t.assignee,
      })))].filter(Boolean),
    });
  } catch (error) {
    console.error('Failed to fetch gantt data:', error);
    return errorResponse('INTERNAL_ERROR', '获取甘特图数据失败');
  }
});
