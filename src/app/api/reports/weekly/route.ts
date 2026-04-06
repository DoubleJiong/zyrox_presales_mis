import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, projects, tasks, workLogs } from '@/db/schema';
import { desc, eq, and, sql, gte, lte, isNotNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

// 辅助函数：获取周一
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// 辅助函数：获取周日
function getSunday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d;
}

/**
 * GET /api/reports/weekly - 获取周报列表/生成周报
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'personal';
    const year = searchParams.get('year');
    const week = searchParams.get('week');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const userId = context.userId;

    // 如果指定了周数，生成该周的周报内容
    if (week) {
      const weekNum = parseInt(week);
      const yearNum = year ? parseInt(year) : new Date().getFullYear();
      const report = await generateWeeklyReport(userId, yearNum, weekNum);
      return successResponse(report);
    }

    // 否则返回最近几周的周报摘要
    const today = new Date();
    const reports = [];

    for (let i = 0; i < pageSize; i++) {
      const monday = getMonday(new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000));
      const sunday = getSunday(monday);
      const weekNum = getWeekNumber(monday);
      const yearNum = monday.getFullYear();

      if (year && yearNum !== parseInt(year)) continue;

      const summary = await getWeekSummary(userId, monday, sunday);

      reports.push({
        id: `week-${yearNum}-${weekNum}`,
        type: 'personal',
        userId,
        userName: context.user?.realName || '用户',
        year: yearNum,
        week: weekNum,
        weekStart: monday.toISOString().split('T')[0],
        weekEnd: sunday.toISOString().split('T')[0],
        summary,
        generatedAt: new Date().toISOString(),
      });
    }

    return successResponse({
      reports,
      pagination: {
        page,
        pageSize,
        total: reports.length,
      },
    });
  } catch (error) {
    console.error('Failed to fetch weekly reports:', error);
    return errorResponse('INTERNAL_ERROR', '获取周报列表失败');
  }
});

/**
 * POST /api/reports/weekly - 生成并发送周报
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const userId = context.userId;
    const body = await request.json();
    
    const { year, week } = body;

    const yearNum = year || new Date().getFullYear();
    const weekNum = week || getWeekNumber(new Date());

    const report = await generateWeeklyReport(userId, yearNum, weekNum);

    return successResponse(report);
  } catch (error) {
    console.error('Failed to generate weekly report:', error);
    return errorResponse('INTERNAL_ERROR', '生成周报失败');
  }
});

// 获取周数
function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// 获取周摘要
async function getWeekSummary(userId: number, startDate: Date, endDate: Date) {
  try {
    // 获取工作日志统计
    const workLogRecords = await db
      .select()
      .from(workLogs)
      .where(and(
        eq(workLogs.userId, userId),
        gte(workLogs.logDate, startDate.toISOString().split('T')[0]),
        lte(workLogs.logDate, endDate.toISOString().split('T')[0])
      ));

    // 获取任务完成统计
    const completedTasks = await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.assigneeId, userId),
        gte(tasks.completedDate, startDate.toISOString().split('T')[0]),
        lte(tasks.completedDate, endDate.toISOString().split('T')[0])
      ));

    const totalHours = workLogRecords.reduce((sum, log) => sum + (Number(log.workHours) || 0), 0);

    return {
      workDays: workLogRecords.length,
      totalHours,
      tasksCompleted: completedTasks.length,
      projectCount: new Set(completedTasks.map(t => t.projectId)).size,
    };
  } catch (error) {
    console.error('Error getting week summary:', error);
    return {
      workDays: 0,
      totalHours: 0,
      tasksCompleted: 0,
      projectCount: 0,
    };
  }
}

// 生成完整周报
async function generateWeeklyReport(userId: number, year: number, week: number) {
  // 计算该周的日期范围
  const januaryFirst = new Date(year, 0, 1);
  const daysOffset = (week - 1) * 7;
  const monday = new Date(januaryFirst);
  monday.setDate(januaryFirst.getDate() + daysOffset + (januaryFirst.getDay() <= 1 ? 1 - januaryFirst.getDay() : 8 - januaryFirst.getDay()));
  const sunday = getSunday(monday);

  // 获取用户信息
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  // 获取工作日志
  const workLogRecords = await db
    .select()
    .from(workLogs)
    .where(and(
      eq(workLogs.userId, userId),
      gte(workLogs.logDate, monday.toISOString().split('T')[0]),
      lte(workLogs.logDate, sunday.toISOString().split('T')[0])
    ))
    .orderBy(desc(workLogs.logDate));

  // 获取完成的任务
  const completedTasks = await db
    .select({
      id: tasks.id,
      taskName: tasks.taskName,
      projectName: projects.projectName,
      completedDate: tasks.completedDate,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(
      eq(tasks.assigneeId, userId),
      isNotNull(tasks.completedDate),
      gte(tasks.completedDate, monday.toISOString().split('T')[0]),
      lte(tasks.completedDate, sunday.toISOString().split('T')[0])
    ));

  // 获取进行中的任务
  const inProgressTasks = await db
    .select({
      id: tasks.id,
      taskName: tasks.taskName,
      projectName: projects.projectName,
      progress: tasks.progress,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(
      eq(tasks.assigneeId, userId),
      eq(tasks.status, 'in_progress')
    ));

  // 统计数据
  const statistics = {
    workDays: workLogRecords.length,
    totalHours: workLogRecords.reduce((sum, log) => sum + (Number(log.workHours) || 0), 0),
    tasksCompleted: completedTasks.length,
    tasksInProgress: inProgressTasks.length,
  };

  // 构建周报内容
  const weekInfo = {
    year,
    week,
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
  };

  const workLogsData = workLogRecords.map(log => ({
    date: log.logDate,
    hours: log.workHours ? Number(log.workHours) : null,
    type: log.workType,
    content: log.workContent?.substring(0, 100),
  }));

  const completedTasksData = completedTasks.map(t => ({
    name: t.taskName,
    project: t.projectName,
    completedDate: t.completedDate,
  }));

  const inProgressTasksData = inProgressTasks.map(t => ({
    name: t.taskName,
    project: t.projectName,
    progress: t.progress,
    dueDate: t.dueDate,
  }));

  // 生成周报文本内容
  const generatedContent = generateWeeklyReportText({
    userName: user?.realName || '用户',
    weekInfo,
    statistics,
    workLogs: workLogsData,
    completedTasks: completedTasksData,
    inProgressTasks: inProgressTasksData,
  });

  return {
    id: `week-${year}-${week}`,
    type: 'personal',
    userId,
    userName: user?.realName || '用户',
    year,
    week,
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
    weekInfo,
    statistics,
    workLogs: workLogsData,
    completedTasks: completedTasksData,
    inProgressTasks: inProgressTasksData,
    generatedContent,
    generatedAt: new Date().toISOString(),
  };
}

// 生成周报文本
function generateWeeklyReportText(data: {
  userName: string;
  weekInfo: { year: number; week: number; weekStart: string; weekEnd: string };
  statistics: { workDays: number; totalHours: number; tasksCompleted: number; tasksInProgress: number };
  workLogs: Array<{ date: string; hours: number | null; type: string | null; content: string | null }>;
  completedTasks: Array<{ name: string; project: string | null; completedDate: string | null }>;
  inProgressTasks: Array<{ name: string; project: string | null; progress: number | null; dueDate: string | null }>;
}): string {
  const lines: string[] = [];
  
  // 标题
  lines.push(`${data.weekInfo.year}年第${data.weekInfo.week}周工作周报`);
  lines.push('='.repeat(40));
  lines.push('');
  
  // 基本信息
  lines.push(`姓名：${data.userName}`);
  lines.push(`时间：${data.weekInfo.weekStart} 至 ${data.weekInfo.weekEnd}`);
  lines.push('');
  
  // 工作总结
  lines.push('【本周工作总结】');
  lines.push(`本周共工作 ${data.statistics.workDays} 天，累计 ${data.statistics.totalHours} 小时，完成 ${data.statistics.tasksCompleted} 项任务，${data.statistics.tasksInProgress} 项任务进行中。`);
  lines.push('');
  
  // 工作日志详情
  if (data.workLogs.length > 0) {
    lines.push('【每日工作记录】');
    data.workLogs.forEach(log => {
      const typeLabel: Record<string, string> = {
        followup: '客户跟进',
        bidding: '投标工作',
        project: '项目执行',
        meeting: '会议',
        other: '其他',
      };
      lines.push(`  ${log.date} [${typeLabel[log.type || 'other'] || '其他'}] ${log.hours || 0}h`);
      if (log.content) {
        lines.push(`    ${log.content}`);
      }
    });
    lines.push('');
  }
  
  // 已完成任务
  if (data.completedTasks.length > 0) {
    lines.push('【本周完成任务】');
    data.completedTasks.forEach((task, index) => {
      lines.push(`  ${index + 1}. ${task.name}${task.project ? ` (${task.project})` : ''}`);
    });
    lines.push('');
  }
  
  // 进行中任务
  if (data.inProgressTasks.length > 0) {
    lines.push('【进行中任务】');
    data.inProgressTasks.forEach((task, index) => {
      const progress = task.progress !== null ? `${task.progress}%` : '未知进度';
      const dueDate = task.dueDate ? ` 截止:${task.dueDate}` : '';
      lines.push(`  ${index + 1}. ${task.name}${task.project ? ` (${task.project})` : ''} - ${progress}${dueDate}`);
    });
    lines.push('');
  }
  
  // 下周计划（预留）
  lines.push('【下周工作计划】');
  lines.push('  （请补充下周工作计划）');
  lines.push('');
  
  // 问题与风险（预留）
  lines.push('【问题与风险】');
  lines.push('  （请补充问题与风险）');
  lines.push('');
  
  lines.push('='.repeat(40));
  lines.push(`生成时间：${new Date().toLocaleString('zh-CN')}`);
  
  return lines.join('\n');
}
