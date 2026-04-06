import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const selectMock = vi.fn();
const isSystemAdminMock = vi.fn();
const getAccessibleProjectIdsMock = vi.fn();

const eqMock = vi.fn((field: unknown, value: unknown) => ({ type: 'eq', field, value }));
const andMock = vi.fn((...args: unknown[]) => ({ type: 'and', args }));
const orMock = vi.fn((...args: unknown[]) => ({ type: 'or', args }));
const inArrayMock = vi.fn((field: unknown, values: unknown[]) => ({ type: 'inArray', field, values }));
const descMock = vi.fn((field: unknown) => ({ type: 'desc', field }));
const isNullMock = vi.fn((field: unknown) => ({ type: 'isNull', field }));

function mockSelectListResult(result: unknown) {
  const chain = {
    from: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn().mockResolvedValue(result),
  };

  selectMock.mockImplementationOnce(() => ({ from: chain.from }));
  return chain;
}

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 7 });
  },
}));

vi.mock('@/db', () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock('@/lib/permissions/project', () => ({
  isSystemAdmin: (...args: unknown[]) => isSystemAdminMock(...args),
  getAccessibleProjectIds: (...args: unknown[]) => getAccessibleProjectIdsMock(...args),
}));

vi.mock('@/db/schema', () => ({
  opportunities: {
    id: 'opportunities.id',
    projectName: 'opportunities.projectName',
    status: 'opportunities.status',
    createdAt: 'opportunities.createdAt',
    updatedAt: 'opportunities.updatedAt',
    ownerId: 'opportunities.ownerId',
    deletedAt: 'opportunities.deletedAt',
  },
  projects: {
    id: 'projects.id',
    projectName: 'projects.projectName',
    projectStage: 'projects.projectStage',
    status: 'projects.status',
    bidResult: 'projects.bidResult',
    createdAt: 'projects.createdAt',
    updatedAt: 'projects.updatedAt',
    managerId: 'projects.managerId',
    deletedAt: 'projects.deletedAt',
  },
  leadFollowRecords: {
    id: 'leadFollowRecords.id',
    followContent: 'leadFollowRecords.followContent',
    followTime: 'leadFollowRecords.followTime',
    followerId: 'leadFollowRecords.followerId',
  },
  quotations: {
    id: 'quotations.id',
    quotationName: 'quotations.quotationName',
    quotationStatus: 'quotations.quotationStatus',
    createdAt: 'quotations.createdAt',
    updatedAt: 'quotations.updatedAt',
    createdBy: 'quotations.createdBy',
    projectId: 'quotations.projectId',
  },
  tasks: {
    id: 'tasks.id',
    taskName: 'tasks.taskName',
    status: 'tasks.status',
    dueDate: 'tasks.dueDate',
    updatedAt: 'tasks.updatedAt',
    assigneeId: 'tasks.assigneeId',
    projectId: 'tasks.projectId',
    deletedAt: 'tasks.deletedAt',
  },
  alertNotifications: {
    id: 'alertNotifications.id',
    alertHistoryId: 'alertNotifications.alertHistoryId',
    recipientId: 'alertNotifications.recipientId',
    status: 'alertNotifications.status',
    deletedAt: 'alertNotifications.deletedAt',
  },
  alertHistories: {
    id: 'alertHistories.id',
    ruleName: 'alertHistories.ruleName',
    severity: 'alertHistories.severity',
    targetName: 'alertHistories.targetName',
    message: 'alertHistories.message',
    relatedType: 'alertHistories.relatedType',
    relatedId: 'alertHistories.relatedId',
    status: 'alertHistories.status',
    deletedAt: 'alertHistories.deletedAt',
    createdAt: 'alertHistories.createdAt',
    updatedAt: 'alertHistories.updatedAt',
  },
  messages: {
    id: 'messages.id',
    title: 'messages.title',
    type: 'messages.type',
    priority: 'messages.priority',
    actionText: 'messages.actionText',
    receiverId: 'messages.receiverId',
    relatedType: 'messages.relatedType',
    relatedId: 'messages.relatedId',
    relatedName: 'messages.relatedName',
    actionUrl: 'messages.actionUrl',
    isRead: 'messages.isRead',
    isDeleted: 'messages.isDeleted',
    createdAt: 'messages.createdAt',
  },
  users: {
    id: 'users.id',
    realName: 'users.realName',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: eqMock,
  and: andMock,
  or: orMock,
  inArray: inArrayMock,
  desc: descMock,
  isNull: isNullMock,
  count: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('@/lib/project-display', () => ({
  getProjectDisplayStatusLabel: () => '跟进中',
}));

describe('activities route', () => {
  beforeEach(() => {
    vi.resetModules();
    selectMock.mockReset();
    isSystemAdminMock.mockReset();
    getAccessibleProjectIdsMock.mockReset();
    eqMock.mockClear();
    andMock.mockClear();
    orMock.mockClear();
    inArrayMock.mockClear();
    descMock.mockClear();
    isNullMock.mockClear();
  });

  it('returns an auth-bound activity feed scoped to current user and accessible projects', async () => {
    isSystemAdminMock.mockResolvedValue(false);
    getAccessibleProjectIdsMock.mockResolvedValue([11]);

    mockSelectListResult([
      {
        id: 1,
        projectName: '华东商机',
        status: 'proposal',
        createdAt: new Date('2026-04-05T10:00:00.000Z'),
        updatedAt: new Date('2026-04-05T10:30:00.000Z'),
        ownerId: 7,
        ownerName: '当前用户',
      },
    ]);
    mockSelectListResult([
      {
        id: 11,
        projectName: '智慧园区项目',
        projectStage: 'bidding',
        status: 'ongoing',
        bidResult: 'pending',
        createdAt: new Date('2026-04-05T09:00:00.000Z'),
        updatedAt: new Date('2026-04-05T09:30:00.000Z'),
        managerId: 7,
        managerName: '当前用户',
      },
    ]);
    mockSelectListResult([
      {
        id: 21,
        followContent: '完成客户电话沟通',
        followTime: new Date('2026-04-05T08:00:00.000Z'),
        followerId: 7,
        followerName: '当前用户',
      },
    ]);
    mockSelectListResult([
      {
        id: 31,
        quotationName: '华东项目报价',
        quotationStatus: 'pending_approval',
        createdAt: new Date('2026-04-05T07:00:00.000Z'),
        updatedAt: new Date('2026-04-05T07:30:00.000Z'),
        createdBy: 7,
        creatorName: '当前用户',
      },
    ]);
    mockSelectListResult([
      {
        id: 41,
        taskName: '跟进投标文件',
        status: 'in_progress',
        dueDate: '2026-04-06',
        updatedAt: new Date('2026-04-05T11:00:00.000Z'),
        assigneeId: 7,
        projectId: 11,
        projectName: '智慧园区项目',
      },
    ]);
    mockSelectListResult([
      {
        notificationId: 51,
        alertHistoryId: 52,
        ruleName: '项目进度滞后',
        severity: 'high',
        targetName: '智慧园区项目',
        message: '项目进度已落后计划 3 天',
        relatedType: 'project',
        relatedId: 11,
        createdAt: new Date('2026-04-05T12:00:00.000Z'),
        updatedAt: new Date('2026-04-05T12:20:00.000Z'),
      },
    ]);
    mockSelectListResult([
      {
        id: 61,
        title: '请确认本周汇报',
        type: 'reminder',
        priority: 'high',
        relatedType: 'task',
        relatedId: 41,
        relatedName: '跟进投标文件',
        actionUrl: '/tasks?scope=mine',
        actionText: '处理消息',
        createdAt: new Date('2026-04-05T13:00:00.000Z'),
      },
    ]);

    const { GET } = await import('../../../src/app/api/activities/route');
    const response = await GET(new NextRequest('http://localhost/api/activities?limit=10'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(eqMock).toHaveBeenCalledWith('opportunities.ownerId', 7);
    expect(eqMock).toHaveBeenCalledWith('leadFollowRecords.followerId', 7);
    expect(inArrayMock).toHaveBeenCalledWith('projects.id', [11]);
    expect(inArrayMock).toHaveBeenCalledWith('quotations.projectId', [11]);
    expect(eqMock).toHaveBeenCalledWith('tasks.assigneeId', 7);
    expect(eqMock).toHaveBeenCalledWith('alertNotifications.recipientId', 7);
    expect(eqMock).toHaveBeenCalledWith('messages.receiverId', 7);
    expect(payload).toMatchObject({
      success: true,
      data: {
        total: 7,
      },
    });
    expect(payload.data.list).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'opp-1', type: 'opportunity' }),
      expect.objectContaining({ id: 'proj-11', type: 'project' }),
      expect.objectContaining({ id: 'fu-21', type: 'followup' }),
      expect.objectContaining({ id: 'quot-31', type: 'quotation' }),
      expect.objectContaining({
        id: 'task-41',
        type: 'task',
        href: '/tasks?scope=mine',
        sourceLabel: '任务',
        quickActions: [
          { label: '完成任务', href: '/tasks?scope=mine', intent: 'task-complete', targetId: 41, payload: { status: 'completed', progress: 100 } },
          { label: '延后一天', href: '/tasks?scope=mine', intent: 'task-defer', targetId: 41, payload: { dueDate: '2026-04-07' } },
          { label: '打开任务', href: '/tasks?scope=mine' },
        ],
      }),
      expect.objectContaining({ id: 'alert-52', type: 'alert', href: '/alerts/histories?status=pending', sourceLabel: '预警' }),
      expect.objectContaining({ id: 'msg-61', type: 'message', href: '/tasks?scope=mine', sourceLabel: '消息' }),
    ]));
    expect(payload.data.list[0]).toMatchObject({ id: 'msg-61', type: 'message' });
    expect(payload.data.list[1]).toMatchObject({ id: 'alert-52', type: 'alert' });
    expect(payload.data.list[1].quickActions).toEqual([
      { label: '确认预警', href: '/alerts/histories?status=pending', intent: 'alert-acknowledge', targetId: 52 },
      { label: '查看预警', href: '/alerts/histories?status=pending' },
    ]);
    expect(payload.data.list[0].quickActions).toEqual([
      { label: '标为已读', href: '/messages', intent: 'message-read', targetId: 61 },
      { label: '处理消息', href: '/tasks?scope=mine' },
    ]);
  });

  it('routes task-linked alerts into the alert-task view and exposes canonical quick actions', async () => {
    isSystemAdminMock.mockResolvedValue(false);
    getAccessibleProjectIdsMock.mockResolvedValue([]);

    mockSelectListResult([
      {
        notificationId: 81,
        alertHistoryId: 82,
        ruleName: '任务逾期',
        severity: 'critical',
        targetName: '交付任务',
        message: '关联任务已逾期',
        relatedType: 'task',
        relatedId: 41,
        createdAt: new Date('2026-04-05T15:00:00.000Z'),
        updatedAt: new Date('2026-04-05T15:10:00.000Z'),
      },
    ]);

    const { GET } = await import('../../../src/app/api/activities/route');
    const response = await GET(new NextRequest('http://localhost/api/activities?types=alert'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.list).toEqual([
      expect.objectContaining({
        id: 'alert-82',
        type: 'alert',
        href: '/tasks?scope=mine&type=alert',
        quickActions: [
          { label: '处理任务', href: '/tasks?scope=mine&type=alert' },
          { label: '确认预警', href: '/alerts/histories?status=pending', intent: 'alert-acknowledge', targetId: 82 },
          { label: '查看预警', href: '/alerts/histories?status=pending' },
        ],
      }),
    ]);
  });

  it('returns an empty project-and-quotation feed when the current user has no accessible projects', async () => {
    isSystemAdminMock.mockResolvedValue(false);
    getAccessibleProjectIdsMock.mockResolvedValue([]);

    const { GET } = await import('../../../src/app/api/activities/route');
    const response = await GET(new NextRequest('http://localhost/api/activities?types=project,quotation'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(selectMock).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      success: true,
      data: {
        total: 0,
        list: [],
      },
    });
  });
});