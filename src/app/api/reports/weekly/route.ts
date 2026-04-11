import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, projects, tasks, workLogs, weeklyReports } from '@/db/schema';
import { desc, eq, and, sql, gte, lte, isNotNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canViewGlobalDashboard } from '@/shared/policy/dashboard-policy';

type SavedWeeklyReportContent = {
  summary: string;
  statistics: {
    newCustomers: number;
    followUpCount: number;
    projectProgress: number;
    taskCompleted: number;
    opportunityCount: number;
    biddingCount: number;
  };
  highlights: string[];
  nextWeekPlan: string[];
  issues: string[];
  supportNeeds: string[];
};

type WeeklyReportUserSummary = {
  realName?: string | null;
};

function normalizeWeeklyReportUser(value: unknown): WeeklyReportUserSummary | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    const firstUser = value[0];
    return firstUser && typeof firstUser === 'object' ? firstUser as WeeklyReportUserSummary : null;
  }

  return typeof value === 'object' ? value as WeeklyReportUserSummary : null;
}

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

function getIsoWeekRange(year: number, week: number) {
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const januaryFourthDay = januaryFourth.getUTCDay() || 7;
  const monday = new Date(januaryFourth);

  monday.setUTCDate(januaryFourth.getUTCDate() - januaryFourthDay + 1 + ((week - 1) * 7));

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return {
    monday: new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate())),
    sunday: new Date(Date.UTC(sunday.getUTCFullYear(), sunday.getUTCMonth(), sunday.getUTCDate())),
  };
}

function toIsoDateString(value: string | Date) {
  if (typeof value === 'string') {
    return value;
  }

  return value.toISOString().split('T')[0];
}

function toIsoDateTimeString(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return value.toISOString();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function calculateAverageProjectProgress(
  inProgressTasks: Array<{ progress: number | null }>,
) {
  const validProgress = inProgressTasks
    .map((task) => task.progress)
    .filter((value): value is number => typeof value === 'number');

  if (validProgress.length === 0) {
    return 0;
  }

  return Math.round(validProgress.reduce((sum, value) => sum + value, 0) / validProgress.length);
}

function buildWeeklyReportContent(
  report: Awaited<ReturnType<typeof generateWeeklyReport>>,
  overrideContent?: unknown,
): SavedWeeklyReportContent {
  const defaultContent: SavedWeeklyReportContent = {
    summary: report.generatedContent,
    statistics: {
      newCustomers: 0,
      followUpCount: report.workLogs.filter((log) => log.type === 'followup').length,
      projectProgress: calculateAverageProjectProgress(report.inProgressTasks),
      taskCompleted: report.statistics.tasksCompleted,
      opportunityCount: 0,
      biddingCount: report.workLogs.filter((log) => log.type === 'bidding').length,
    },
    highlights: report.completedTasks.slice(0, 5).map((task) => task.project ? `${task.name}（${task.project}）` : task.name),
    nextWeekPlan: [],
    issues: [],
    supportNeeds: [],
  };

  if (typeof overrideContent === 'string') {
    return {
      ...defaultContent,
      summary: overrideContent.trim() || defaultContent.summary,
    };
  }

  if (!overrideContent || typeof overrideContent !== 'object') {
    return defaultContent;
  }

  const content = overrideContent as Partial<SavedWeeklyReportContent> & {
    statistics?: Partial<SavedWeeklyReportContent['statistics']>;
  };

  return {
    summary: typeof content.summary === 'string' && content.summary.trim().length > 0
      ? content.summary
      : defaultContent.summary,
    statistics: {
      ...defaultContent.statistics,
      ...(content.statistics ?? {}),
    },
    highlights: toStringArray(content.highlights).length > 0 ? toStringArray(content.highlights) : defaultContent.highlights,
    nextWeekPlan: toStringArray(content.nextWeekPlan),
    issues: toStringArray(content.issues),
    supportNeeds: toStringArray(content.supportNeeds),
  };
}

async function upsertWeeklyReportRecord(params: {
  type: 'personal' | 'global';
  userId: number | null;
  weekStart: string;
  weekEnd: string;
  content: SavedWeeklyReportContent;
}) {
  const existingReport = await db.query.weeklyReports.findFirst({
    where: and(
      eq(weeklyReports.type, params.type),
      eq(weeklyReports.userId, params.userId),
      eq(weeklyReports.weekStart, params.weekStart),
    ),
  });

  if (existingReport) {
    const [updatedReport] = await db
      .update(weeklyReports)
      .set({
        weekEnd: params.weekEnd,
        content: params.content,
        generatedAt: new Date(),
      })
      .where(eq(weeklyReports.id, existingReport.id))
      .returning();

    return updatedReport;
  }

  const [createdReport] = await db
    .insert(weeklyReports)
    .values({
      type: params.type,
      userId: params.userId,
      weekStart: params.weekStart,
      weekEnd: params.weekEnd,
      content: params.content,
    })
    .returning();

  return createdReport;
}

function mapStoredWeeklyReport(record: {
  id: number;
  type: string;
  userId: number | null;
  weekStart: string | Date;
  weekEnd: string | Date;
  content: SavedWeeklyReportContent;
  generatedAt: string | Date;
  sentAt: string | Date | null;
  sent: boolean | null;
  user?: unknown;
}) {
  const user = normalizeWeeklyReportUser(record.user);

  return {
    id: record.id,
    type: record.type,
    userId: record.userId,
    userName: user?.realName || null,
    weekStart: toIsoDateString(record.weekStart),
    weekEnd: toIsoDateString(record.weekEnd),
    content: record.content,
    generatedAt: toIsoDateTimeString(record.generatedAt),
    sentAt: toIsoDateTimeString(record.sentAt),
    sent: Boolean(record.sent),
  };
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
    const reportWeek = searchParams.get('reportWeek');
    const requestedUserId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const userId = context.userId;
    const hasGlobalScope = canViewGlobalDashboard(context.user);
    const filterUserId = requestedUserId ? parseInt(requestedUserId, 10) : null;
    const filterReportWeek = reportWeek ? parseInt(reportWeek, 10) : null;

    if (requestedUserId && (Number.isNaN(filterUserId) || filterUserId <= 0)) {
      return errorResponse('BAD_REQUEST', '筛选人员无效', { status: 400 });
    }

    if (reportWeek && (Number.isNaN(filterReportWeek) || filterReportWeek <= 0 || filterReportWeek > 53)) {
      return errorResponse('BAD_REQUEST', '筛选周次无效', { status: 400 });
    }

    if (filterUserId && !hasGlobalScope && filterUserId !== userId) {
      return errorResponse('FORBIDDEN', '无权按其他人员筛选周报', { status: 403 });
    }

    // 如果指定了自定义日期范围，直接生成报告
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      const monday = new Date(startDate + 'T00:00:00.000Z');
      const sunday = new Date(endDate + 'T23:59:59.999Z');
      const report = await generateWeeklyReport(userId, 0, 0, { monday, sunday });
      return successResponse(report);
    }

    // 如果指定了周数，生成该周的周报内容
    if (week) {
      const weekNum = parseInt(week);
      const yearNum = year ? parseInt(year) : new Date().getFullYear();
      const report = await generateWeeklyReport(userId, yearNum, weekNum);
      return successResponse(report);
    }

    const allReports = await db.query.weeklyReports.findMany({
      with: {
        user: {
          columns: {
            realName: true,
          },
        },
      },
      orderBy: [desc(weeklyReports.generatedAt), desc(weeklyReports.id)],
    });

    const filteredReports = allReports.filter((report) => {
      if (type && report.type !== type) {
        return false;
      }

      if (!hasGlobalScope && report.type === 'personal' && report.userId !== userId) {
        return false;
      }

      if (filterUserId && report.userId !== filterUserId) {
        return false;
      }

      if (filterReportWeek) {
        const reportWeekNumber = getWeekNumber(new Date(toIsoDateString(report.weekStart)));
        if (reportWeekNumber !== filterReportWeek) {
          return false;
        }
      }

      if (!year) {
        return true;
      }

      const reportYear = new Date(toIsoDateString(report.weekStart)).getFullYear();
      return reportYear === parseInt(year);
    });

    const pagedReports = filteredReports.slice((page - 1) * pageSize, page * pageSize);
    const reports = pagedReports.map(mapStoredWeeklyReport);

    return successResponse({
      reports,
      pagination: {
        page,
        pageSize,
        total: filteredReports.length,
      },
    });
  } catch (error) {
    console.error('Failed to fetch weekly reports:', error);
    return errorResponse('INTERNAL_ERROR', '获取周报列表失败');
  }
});

/**
 * POST /api/reports/weekly - 生成并保存周报
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const userId = context.userId;
    const body = await request.json();
    
    const { year, week, content } = body;
    const type = body.type === 'global' ? 'global' : 'personal';

    const yearNum = year || new Date().getFullYear();
    const weekNum = week || getWeekNumber(new Date());

    const generatedReport = await generateWeeklyReport(userId, yearNum, weekNum);
    const structuredContent = buildWeeklyReportContent(generatedReport, content);
    const savedReport = await upsertWeeklyReportRecord({
      type,
      userId: type === 'personal' ? userId : null,
      weekStart: generatedReport.weekInfo.weekStart,
      weekEnd: generatedReport.weekInfo.weekEnd,
      content: structuredContent,
    });

    return successResponse({
      ...generatedReport,
      id: savedReport.id,
      type: savedReport.type,
      userId: savedReport.userId,
      userName: context.user?.realName || generatedReport.userName,
      weekStart: toIsoDateString(savedReport.weekStart),
      weekEnd: toIsoDateString(savedReport.weekEnd),
      content: structuredContent,
      generatedAt: toIsoDateTimeString(savedReport.generatedAt),
      sentAt: toIsoDateTimeString(savedReport.sentAt),
      sent: Boolean(savedReport.sent),
      generatedContent: structuredContent.summary,
    });
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
async function generateWeeklyReport(
  userId: number,
  year: number,
  week: number,
  dateOverride?: { monday: Date; sunday: Date },
) {
  // 按 ISO 周规则计算该周日期范围，避免 year/week 与实际周起止错位。
  const { monday, sunday } = dateOverride ?? getIsoWeekRange(year, week);
  // 对外展示信息：自定义范围时用实际日期，周报时用规范周数
  const displayYear = dateOverride ? monday.getUTCFullYear() : year;
  const displayWeek = dateOverride ? getWeekNumber(monday) : week;
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
    year: displayYear,
    week: displayWeek,
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
