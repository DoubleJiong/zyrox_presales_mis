import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const usersTable = { __table: 'users', id: 'users.id' };
const projectsTable = { __table: 'projects', id: 'projects.id', projectName: 'projects.projectName' };
const tasksTable = {
  __table: 'tasks',
  id: 'tasks.id',
  taskName: 'tasks.taskName',
  assigneeId: 'tasks.assigneeId',
  completedDate: 'tasks.completedDate',
  status: 'tasks.status',
  progress: 'tasks.progress',
  dueDate: 'tasks.dueDate',
  projectId: 'tasks.projectId',
};
const workLogsTable = {
  __table: 'workLogs',
  userId: 'workLogs.userId',
  logDate: 'workLogs.logDate',
  workHours: 'workLogs.workHours',
  workType: 'workLogs.workType',
  workContent: 'workLogs.workContent',
};
const weeklyReportsTable = {
  __table: 'weeklyReports',
  id: 'weeklyReports.id',
  type: 'weeklyReports.type',
  userId: 'weeklyReports.userId',
  weekStart: 'weeklyReports.weekStart',
  weekEnd: 'weeklyReports.weekEnd',
  generatedAt: 'weeklyReports.generatedAt',
};

let userRow: any;
let workLogRows: any[];
let completedTaskRows: any[];
let inProgressTaskRows: any[];
let existingWeeklyReport: any;
let weeklyReportRows: any[];
let insertPayloads: Array<Record<string, unknown>>;
let updatePayloads: Array<Record<string, unknown>>;
let currentUser: { realName?: string; roleCode?: string };

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number; user?: { realName?: string; roleCode?: string } }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 7, user: currentUser });
  },
}));

vi.mock('@/shared/policy/dashboard-policy', () => ({
  canViewGlobalDashboard: vi.fn((user?: { roleCode?: string }) => user?.roleCode === 'presales_manager' || user?.roleCode === 'admin'),
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown, options?: { status?: number }) => NextResponse.json({ success: true, data }, { status: options?.status ?? 200 }),
  errorResponse: (code: string, message: string, options?: { status?: number }) => NextResponse.json({ success: false, error: { code, message } }, { status: options?.status ?? 500 }),
}));

vi.mock('@/db/schema', () => ({
  users: usersTable,
  projects: projectsTable,
  tasks: tasksTable,
  workLogs: workLogsTable,
  weeklyReports: weeklyReportsTable,
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn(() => 'desc'),
  eq: vi.fn(() => 'eq'),
  and: vi.fn(() => 'and'),
  sql: vi.fn((strings: TemplateStringsArray) => strings.join('')),
  gte: vi.fn(() => 'gte'),
  lte: vi.fn(() => 'lte'),
  isNotNull: vi.fn(() => 'isNotNull'),
}));

vi.mock('@/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(async () => userRow),
      },
      weeklyReports: {
        findFirst: vi.fn(async () => existingWeeklyReport),
        findMany: vi.fn(async () => weeklyReportRows),
      },
    },
    select: vi.fn((fields?: Record<string, unknown>) => ({
      from: vi.fn((table: { __table: string }) => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(async () => {
            if (table.__table === 'tasks' && fields && 'taskName' in fields && 'completedDate' in fields) {
              return completedTaskRows;
            }

            if (table.__table === 'tasks' && fields && 'taskName' in fields && 'progress' in fields) {
              return inProgressTaskRows;
            }

            return [];
          }),
        })),
        where: vi.fn(() => ({
          orderBy: vi.fn(async () => workLogRows),
          then: undefined,
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((payload: Record<string, unknown>) => {
        insertPayloads.push(payload);
        return {
          returning: vi.fn(async () => [{
            id: 31,
            sent: false,
            sentAt: null,
            generatedAt: new Date('2026-04-11T09:00:00Z'),
            ...payload,
          }]),
        };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((payload: Record<string, unknown>) => {
        updatePayloads.push(payload);
        return {
          where: vi.fn(() => ({
            returning: vi.fn(async () => [{
              id: 19,
              type: 'personal',
              userId: 7,
              weekStart: '2026-04-06',
              weekEnd: '2026-04-12',
              sent: false,
              sentAt: null,
              generatedAt: new Date('2026-04-11T10:00:00Z'),
              ...payload,
            }]),
          })),
        };
      }),
    })),
  },
}));

describe('weekly reports route', () => {
  beforeEach(() => {
    currentUser = { realName: '张伟', roleCode: 'user' };
    userRow = { id: 7, realName: '张伟' };
    workLogRows = [
      { logDate: '2026-04-10', workHours: '3', workType: 'followup', workContent: '客户回访' },
      { logDate: '2026-04-09', workHours: '2', workType: 'bidding', workContent: '整理投标材料' },
    ];
    completedTaskRows = [
      { id: 1, taskName: '完成方案评审', projectName: '智慧校园项目', completedDate: '2026-04-10' },
      { id: 2, taskName: '提交报价单', projectName: '政务云项目', completedDate: '2026-04-11' },
    ];
    inProgressTaskRows = [
      { id: 3, taskName: '跟进商机', projectName: '智算中心项目', progress: 60, dueDate: '2026-04-15' },
    ];
    existingWeeklyReport = null;
    weeklyReportRows = [];
    insertPayloads = [];
    updatePayloads = [];
    vi.resetModules();
  });

  it('persists a formal weekly report when POST receives edited content', async () => {
    const { POST } = await import('../../../src/app/api/reports/weekly/route');

    const response = await POST(new NextRequest('http://localhost/api/reports/weekly', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        year: 2026,
        week: 15,
        content: '本周重点推进智慧校园项目，完成两项关键任务。',
      }),
    }));

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(insertPayloads).toHaveLength(1);
    expect(insertPayloads[0]).toMatchObject({
      type: 'personal',
      userId: 7,
      weekStart: '2026-04-06',
      weekEnd: '2026-04-12',
    });
    expect(insertPayloads[0].content).toMatchObject({
      summary: '本周重点推进智慧校园项目，完成两项关键任务。',
      statistics: {
        taskCompleted: 2,
        followUpCount: 1,
        biddingCount: 1,
        projectProgress: 60,
      },
    });
    expect(payload.data.id).toBe(31);
    expect(payload.data.generatedContent).toBe('本周重点推进智慧校园项目，完成两项关键任务。');
  });

  it('updates the existing formal weekly report for the same week instead of inserting a duplicate', async () => {
    existingWeeklyReport = {
      id: 19,
      type: 'personal',
      userId: 7,
      weekStart: '2026-04-06',
      weekEnd: '2026-04-12',
      content: { summary: '旧周报' },
    };

    const { POST } = await import('../../../src/app/api/reports/weekly/route');

    const response = await POST(new NextRequest('http://localhost/api/reports/weekly', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        year: 2026,
        week: 15,
        content: '更新后的正式周报内容',
      }),
    }));

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(insertPayloads).toHaveLength(0);
    expect(updatePayloads).toHaveLength(1);
    expect(updatePayloads[0].content).toMatchObject({
      summary: '更新后的正式周报内容',
    });
    expect(payload.data.id).toBe(19);
  });

  it('returns persisted weekly report records for the list view', async () => {
    weeklyReportRows = [
      {
        id: 55,
        type: 'personal',
        userId: 7,
        weekStart: '2026-04-06',
        weekEnd: '2026-04-12',
        content: {
          summary: '已保存的周报摘要',
          statistics: {
            newCustomers: 0,
            followUpCount: 2,
            projectProgress: 50,
            taskCompleted: 3,
            opportunityCount: 1,
            biddingCount: 0,
          },
          highlights: [],
          nextWeekPlan: [],
          issues: [],
          supportNeeds: [],
        },
        generatedAt: new Date('2026-04-11T09:00:00Z'),
        sentAt: null,
        sent: false,
        user: { realName: '张伟' },
      },
    ];

    const { GET } = await import('../../../src/app/api/reports/weekly/route');

    const response = await GET(new NextRequest('http://localhost/api/reports/weekly?page=1&pageSize=20'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.reports).toHaveLength(1);
    expect(payload.data.reports[0]).toMatchObject({
      id: 55,
      userName: '张伟',
      content: {
        summary: '已保存的周报摘要',
      },
    });
  });

  it('allows management scope users to list other users personal weekly reports', async () => {
    currentUser = { realName: '李经理', roleCode: 'presales_manager' };
    weeklyReportRows = [
      {
        id: 56,
        type: 'personal',
        userId: 99,
        weekStart: '2026-04-06',
        weekEnd: '2026-04-12',
        content: {
          summary: '下属周报摘要',
          statistics: {
            newCustomers: 0,
            followUpCount: 1,
            projectProgress: 80,
            taskCompleted: 2,
            opportunityCount: 0,
            biddingCount: 0,
          },
          highlights: [],
          nextWeekPlan: [],
          issues: [],
          supportNeeds: [],
        },
        generatedAt: new Date('2026-04-11T09:00:00Z'),
        sentAt: null,
        sent: false,
        user: { realName: '王工程师' },
      },
    ];

    const { GET } = await import('../../../src/app/api/reports/weekly/route');

    const response = await GET(new NextRequest('http://localhost/api/reports/weekly?page=1&pageSize=20'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.reports).toHaveLength(1);
    expect(payload.data.reports[0]).toMatchObject({
      id: 56,
      userId: 99,
      userName: '王工程师',
      content: {
        summary: '下属周报摘要',
      },
    });
  });

  it('filters weekly report list by selected user in management view', async () => {
    currentUser = { realName: '李经理', roleCode: 'presales_manager' };
    weeklyReportRows = [
      {
        id: 56,
        type: 'personal',
        userId: 99,
        weekStart: '2026-04-06',
        weekEnd: '2026-04-12',
        content: {
          summary: '王工程师周报',
          statistics: {
            newCustomers: 0,
            followUpCount: 1,
            projectProgress: 80,
            taskCompleted: 2,
            opportunityCount: 0,
            biddingCount: 0,
          },
          highlights: [],
          nextWeekPlan: [],
          issues: [],
          supportNeeds: [],
        },
        generatedAt: new Date('2026-04-11T09:00:00Z'),
        sentAt: null,
        sent: false,
        user: { realName: '王工程师' },
      },
      {
        id: 57,
        type: 'personal',
        userId: 100,
        weekStart: '2026-04-06',
        weekEnd: '2026-04-12',
        content: {
          summary: '李顾问周报',
          statistics: {
            newCustomers: 0,
            followUpCount: 1,
            projectProgress: 60,
            taskCompleted: 1,
            opportunityCount: 0,
            biddingCount: 0,
          },
          highlights: [],
          nextWeekPlan: [],
          issues: [],
          supportNeeds: [],
        },
        generatedAt: new Date('2026-04-11T08:00:00Z'),
        sentAt: null,
        sent: false,
        user: { realName: '李顾问' },
      },
    ];

    const { GET } = await import('../../../src/app/api/reports/weekly/route');

    const response = await GET(new NextRequest('http://localhost/api/reports/weekly?page=1&pageSize=20&userId=99'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.reports).toHaveLength(1);
    expect(payload.data.reports[0]).toMatchObject({
      id: 56,
      userId: 99,
      userName: '王工程师',
    });
  });

  it('filters weekly report list by report week in management view', async () => {
    currentUser = { realName: '李经理', roleCode: 'presales_manager' };
    weeklyReportRows = [
      {
        id: 58,
        type: 'personal',
        userId: 99,
        weekStart: '2026-04-06',
        weekEnd: '2026-04-12',
        content: {
          summary: '第15周周报',
          statistics: {
            newCustomers: 0,
            followUpCount: 1,
            projectProgress: 80,
            taskCompleted: 2,
            opportunityCount: 0,
            biddingCount: 0,
          },
          highlights: [],
          nextWeekPlan: [],
          issues: [],
          supportNeeds: [],
        },
        generatedAt: new Date('2026-04-11T09:00:00Z'),
        sentAt: null,
        sent: false,
        user: { realName: '王工程师' },
      },
      {
        id: 59,
        type: 'personal',
        userId: 99,
        weekStart: '2026-04-13',
        weekEnd: '2026-04-19',
        content: {
          summary: '第16周周报',
          statistics: {
            newCustomers: 0,
            followUpCount: 1,
            projectProgress: 60,
            taskCompleted: 1,
            opportunityCount: 0,
            biddingCount: 0,
          },
          highlights: [],
          nextWeekPlan: [],
          issues: [],
          supportNeeds: [],
        },
        generatedAt: new Date('2026-04-18T09:00:00Z'),
        sentAt: null,
        sent: false,
        user: { realName: '王工程师' },
      },
    ];

    const { GET } = await import('../../../src/app/api/reports/weekly/route');

    const response = await GET(new NextRequest('http://localhost/api/reports/weekly?page=1&pageSize=20&year=2026&reportWeek=15'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.reports).toHaveLength(1);
    expect(payload.data.reports[0]).toMatchObject({
      id: 58,
      content: {
        summary: '第15周周报',
      },
    });
  });
});