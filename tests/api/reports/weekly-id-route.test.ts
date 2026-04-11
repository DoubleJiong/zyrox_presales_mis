import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const weeklyReportsTable = {
  __table: 'weeklyReports',
  id: 'weeklyReports.id',
};

let currentUserId = 7;
let currentUser: { realName?: string; roleCode?: string };
let existingWeeklyReport: any;

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number; user?: { realName?: string; roleCode?: string }; params?: Record<string, string> }) => Promise<Response>) => {
    return async (req: NextRequest, routeContext?: { params: Promise<Record<string, string>> }) => {
      const params = routeContext?.params ? await routeContext.params : undefined;
      return handler(req, {
        userId: currentUserId,
        user: currentUser,
        params,
      });
    };
  },
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown, options?: { status?: number }) => NextResponse.json({ success: true, data }, { status: options?.status ?? 200 }),
  errorResponse: (code: string, message: string, options?: { status?: number }) => NextResponse.json({ success: false, error: { code, message } }, { status: options?.status ?? 500 }),
}));

vi.mock('@/shared/policy/dashboard-policy', () => ({
  canViewGlobalDashboard: vi.fn((user?: { roleCode?: string }) => user?.roleCode === 'presales_manager' || user?.roleCode === 'admin'),
}));

vi.mock('@/db/schema', () => ({
  weeklyReports: weeklyReportsTable,
  users: {},
  tasks: {},
  projects: {},
  opportunities: {},
  customers: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'),
  and: vi.fn(() => 'and'),
  sql: vi.fn(() => 'sql'),
  between: vi.fn(() => 'between'),
  gte: vi.fn(() => 'gte'),
  lte: vi.fn(() => 'lte'),
}));

vi.mock('@/db', () => ({
  db: {
    query: {
      weeklyReports: {
        findFirst: vi.fn(async () => existingWeeklyReport),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => [existingWeeklyReport]),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(async () => undefined),
    })),
  },
}));

describe('weekly report detail route', () => {
  beforeEach(() => {
    currentUserId = 7;
    currentUser = { realName: '张伟', roleCode: 'user' };
    existingWeeklyReport = {
      id: 19,
      type: 'personal',
      userId: 99,
      weekStart: '2026-04-06',
      weekEnd: '2026-04-12',
      content: {
        summary: '他人周报',
        statistics: {
          newCustomers: 0,
          followUpCount: 0,
          projectProgress: 0,
          taskCompleted: 0,
          opportunityCount: 0,
          biddingCount: 0,
        },
        highlights: [],
        nextWeekPlan: [],
        issues: [],
        supportNeeds: [],
      },
      generatedAt: new Date('2026-04-11T10:00:00Z'),
      sentAt: null,
      sent: false,
      user: {
        id: 99,
        realName: '王工程师',
        email: 'wang@example.com',
      },
    };
    vi.resetModules();
  });

  it('forbids a regular user from viewing another users personal weekly report', async () => {
    const { GET } = await import('../../../src/app/api/reports/weekly/[id]/route');

    const response = await GET(new NextRequest('http://localhost/api/reports/weekly/19'), {
      params: Promise.resolve({ id: '19' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toMatchObject({
      code: 'FORBIDDEN',
      message: '无权查看他人周报',
    });
  });

  it('allows a management scope user to view another users personal weekly report', async () => {
    currentUser = { realName: '李经理', roleCode: 'presales_manager' };

    const { GET } = await import('../../../src/app/api/reports/weekly/[id]/route');

    const response = await GET(new NextRequest('http://localhost/api/reports/weekly/19'), {
      params: Promise.resolve({ id: '19' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      id: 19,
      userId: 99,
      userName: '王工程师',
    });
  });
});