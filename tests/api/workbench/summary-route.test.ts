import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getWorkbenchSummaryReadModelMock = vi.fn();
const buildEmptyWorkbenchSummaryReadModelMock = vi.fn(() => ({
  stats: {
    pendingTodos: 0,
    myTasks: 0,
    pendingAlerts: 0,
    unreadMessages: 0,
    myProjects: 0,
  },
  focusQueue: [],
  todayTodos: [],
  weekSchedules: [],
  starredProjects: [],
  inboxFeed: [],
}));

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: any) => {
    return async (req: NextRequest) => handler(req, { userId: 7 });
  },
}));

vi.mock('@/lib/workbench/read-model', () => ({
  getWorkbenchSummaryReadModel: (...args: unknown[]) => getWorkbenchSummaryReadModelMock(...args),
  buildEmptyWorkbenchSummaryReadModel: () => buildEmptyWorkbenchSummaryReadModelMock(),
}));

describe('workbench summary route', () => {
  beforeEach(() => {
    vi.resetModules();
    getWorkbenchSummaryReadModelMock.mockReset();
    buildEmptyWorkbenchSummaryReadModelMock.mockClear();
  });

  it('returns unified summary data and derives legacy alert and message panels from inboxFeed', async () => {
    getWorkbenchSummaryReadModelMock.mockResolvedValue({
      stats: {
        pendingTodos: 3,
        myTasks: 4,
        pendingAlerts: 3,
        unreadMessages: 5,
        myProjects: 2,
      },
      focusQueue: [
        { id: 'todo-1', source: 'todo', title: '今天跟进客户', href: '/calendar?view=list', priority: 'urgent', meta: '2026-04-05 09:00', description: '华东项目' },
      ],
      todayTodos: [
        { id: 1, title: '今天跟进客户', type: 'followup', priority: 'urgent', dueDate: '2026-04-05', dueTime: '09:00', todoStatus: 'pending', relatedName: '华东项目' },
      ],
      weekSchedules: [
        { id: 41, title: '共享评审会', type: 'meeting', startDate: '2026-04-05', startTime: '14:00', location: '会议室 A', isOwner: false },
      ],
      starredProjects: [
        { id: 66, projectCode: 'P-001', projectName: '智慧园区项目', customerName: '华东集团', status: 'active', statusLabel: '跟进中', progress: 65 },
      ],
      inboxFeed: [
        {
          id: 'alert-99',
          type: 'alert',
          action: '收到预警',
          title: '严重级预警：项目超期风险',
          description: '项目已超过计划里程碑',
          actorId: 7,
          actorName: '风险雷达',
          href: '/alerts/histories?status=pending',
          createdAt: new Date('2026-04-05T09:30:00.000Z'),
        },
        {
          id: 'msg-77',
          type: 'message',
          action: '收到消息',
          title: '请确认共享评审会',
          description: '提醒 · high',
          actorId: 7,
          actorName: '消息中心',
          href: '/messages',
          createdAt: new Date('2026-04-05T08:00:00.000Z'),
        },
      ],
    });

    const { GET } = await import('../../../src/app/api/workbench/summary/route');
    const response = await GET(new NextRequest('http://localhost/api/workbench/summary'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getWorkbenchSummaryReadModelMock).toHaveBeenCalledWith(7);
    expect(payload).toMatchObject({
      success: true,
      data: {
        stats: {
          pendingTodos: 3,
          myTasks: 4,
          pendingAlerts: 3,
          unreadMessages: 5,
          myProjects: 2,
        },
        inboxFeed: [
          expect.objectContaining({ id: 'alert-99', type: 'alert' }),
          expect.objectContaining({ id: 'msg-77', type: 'message' }),
        ],
        riskAlerts: [
          expect.objectContaining({
            id: 'alert-99',
            severity: 'critical',
            ruleName: '严重级预警：项目超期风险',
            href: '/alerts/histories?status=pending',
          }),
        ],
        unreadMessages: [
          expect.objectContaining({
            id: 'msg-77',
            title: '请确认共享评审会',
            href: '/messages',
          }),
        ],
      },
    });
  });

  it('falls back to empty cockpit data when the read model fails', async () => {
    getWorkbenchSummaryReadModelMock.mockRejectedValue(new Error('boom'));

    const { GET } = await import('../../../src/app/api/workbench/summary/route');
    const response = await GET(new NextRequest('http://localhost/api/workbench/summary'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(buildEmptyWorkbenchSummaryReadModelMock).toHaveBeenCalled();
    expect(payload).toMatchObject({
      success: true,
      data: {
        stats: {
          pendingTodos: 0,
          myTasks: 0,
          pendingAlerts: 0,
          unreadMessages: 0,
          myProjects: 0,
        },
        focusQueue: [],
        inboxFeed: [],
        riskAlerts: [],
        unreadMessages: [],
      },
    });
  });
});
