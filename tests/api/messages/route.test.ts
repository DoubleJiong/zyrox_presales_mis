import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const selectMock = vi.fn();

const updateReturningMock = vi.fn();
const updateWhereMock = vi.fn(() => ({ returning: updateReturningMock }));
const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
const updateMock = vi.fn(() => ({ set: updateSetMock }));

const eqMock = vi.fn((field: unknown, value: unknown) => ({ type: 'eq', field, value }));
const andMock = vi.fn((...args: unknown[]) => ({ type: 'and', args }));
const descMock = vi.fn((value: unknown) => ({ type: 'desc', value }));
const sqlMock = vi.fn((strings: TemplateStringsArray) => ({ type: 'sql', text: strings.join('?') }));

function mockSelectWhereResult(result: unknown) {
  const whereMock = vi.fn().mockResolvedValue(result);
  const fromMock = vi.fn(() => ({ where: whereMock }));
  selectMock.mockImplementationOnce(() => ({ from: fromMock }));
  return { fromMock, whereMock };
}

function mockSelectGroupByResult(result: unknown) {
  const groupByMock = vi.fn().mockResolvedValue(result);
  const whereMock = vi.fn(() => ({ groupBy: groupByMock }));
  const fromMock = vi.fn(() => ({ where: whereMock }));
  selectMock.mockImplementationOnce(() => ({ from: fromMock }));
  return { fromMock, whereMock, groupByMock };
}

function mockSelectListResult(result: unknown) {
  const offsetMock = vi.fn().mockResolvedValue(result);
  const limitMock = vi.fn(() => ({ offset: offsetMock }));
  const orderByMock = vi.fn(() => ({ limit: limitMock }));
  const whereMock = vi.fn(() => ({ orderBy: orderByMock }));
  const leftJoinMock = vi.fn(() => ({ where: whereMock }));
  const fromMock = vi.fn(() => ({ leftJoin: leftJoinMock }));
  selectMock.mockImplementationOnce(() => ({ from: fromMock }));
  return { fromMock, leftJoinMock, whereMock, orderByMock, limitMock, offsetMock };
}

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number; params?: Record<string, string> }) => Promise<Response>) => {
    return (req: NextRequest, routeContext?: { params?: Promise<Record<string, string>> }) => {
      const run = async () => handler(req, {
        userId: 7,
        params: routeContext?.params ? await routeContext.params : undefined,
      });
      return run();
    };
  },
}));

vi.mock('@/db', () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

vi.mock('@/db/schema', () => ({
  messages: {
    id: 'messages.id',
    receiverId: 'messages.receiverId',
    isRead: 'messages.isRead',
    isDeleted: 'messages.isDeleted',
    type: 'messages.type',
    priority: 'messages.priority',
    createdAt: 'messages.createdAt',
  },
  users: {
    id: 'users.id',
    realName: 'users.realName',
    avatar: 'users.avatar',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: eqMock,
  and: andMock,
  desc: descMock,
  sql: sqlMock,
}));

vi.mock('@/lib/pagination', () => ({
  parsePaginationParams: () => ({ page: 1, pageSize: 20, offset: 0 }),
}));

describe('messages routes', () => {
  beforeEach(() => {
    vi.resetModules();
    selectMock.mockClear();
    updateReturningMock.mockReset();
    updateWhereMock.mockClear();
    updateSetMock.mockClear();
    updateMock.mockClear();
    eqMock.mockClear();
    andMock.mockClear();
    descMock.mockClear();
  });

  it('lists messages using the authenticated receiver instead of query userId', async () => {
    mockSelectWhereResult([{ count: 1 }]);
    mockSelectListResult([
      {
        message: {
          id: 11,
          title: '待处理提醒',
          content: '请处理任务',
          type: 'reminder',
          category: 'task',
          priority: 'high',
          senderId: 2,
          relatedType: 'task',
          relatedId: 9,
          relatedName: '投标准备',
          actionUrl: '/tasks?id=9',
          actionText: '立即处理',
          isRead: false,
          readAt: null,
          createdAt: '2026-04-04T09:00:00.000Z',
          metadata: null,
        },
        sender: {
          realName: '管理员',
          avatar: null,
        },
      },
    ]);

    const { GET } = await import('../../../src/app/api/messages/route');
    const response = await GET(new NextRequest('http://localhost/api/messages?userId=999&type=reminder'));

    expect(response.status).toBe(200);
    expect(eqMock).toHaveBeenCalledWith('messages.receiverId', 7);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        list: [expect.objectContaining({ id: 11, title: '待处理提醒' })],
        pagination: expect.objectContaining({ total: 1 }),
      },
    });
  });

  it('returns unread counts for the authenticated receiver', async () => {
    mockSelectWhereResult([{ count: 3 }]);
    mockSelectGroupByResult([{ type: 'reminder', count: 2 }]);
    mockSelectGroupByResult([{ priority: 'high', count: 1 }]);

    const { GET } = await import('../../../src/app/api/messages/unread-count/route');
    const response = await GET(new NextRequest('http://localhost/api/messages/unread-count?userId=888'));

    expect(response.status).toBe(200);
    expect(eqMock).toHaveBeenCalledWith('messages.receiverId', 7);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        total: 3,
        byType: { reminder: 2 },
        byPriority: { high: 1 },
      },
    });
  });

  it('marks all messages as read only for the authenticated receiver', async () => {
    updateReturningMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const { POST } = await import('../../../src/app/api/messages/read-all/route');
    const response = await POST(new NextRequest('http://localhost/api/messages/read-all', {
      method: 'POST',
      body: JSON.stringify({ userId: 999, type: 'reminder' }),
    }));

    expect(response.status).toBe(200);
    expect(eqMock).toHaveBeenCalledWith('messages.receiverId', 7);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { count: 2 },
    });
  });

  it('marks a single message as read only when it belongs to the authenticated receiver', async () => {
    updateReturningMock.mockResolvedValue([{ id: 5 }]);

    const { POST } = await import('../../../src/app/api/messages/[id]/read/route');
    const response = await POST(
      new NextRequest('http://localhost/api/messages/5/read', { method: 'POST' }),
      { params: Promise.resolve({ id: '5' }) }
    );

    expect(response.status).toBe(200);
    expect(eqMock).toHaveBeenCalledWith('messages.id', 5);
    expect(eqMock).toHaveBeenCalledWith('messages.receiverId', 7);
    await expect(response.json()).resolves.toMatchObject({ success: true });
  });

  it('returns not found when deleting a message outside the authenticated receiver scope', async () => {
    updateReturningMock.mockResolvedValue([]);

    const { DELETE } = await import('../../../src/app/api/messages/[id]/route');
    const response = await DELETE(
      new NextRequest('http://localhost/api/messages/12', { method: 'DELETE' }),
      { params: Promise.resolve({ id: '12' }) }
    );

    expect(response.status).toBe(404);
    expect(eqMock).toHaveBeenCalledWith('messages.id', 12);
    expect(eqMock).toHaveBeenCalledWith('messages.receiverId', 7);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: '消息不存在或无权访问',
    });
  });
});