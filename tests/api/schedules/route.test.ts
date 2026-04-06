import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const selectMock = vi.fn();
const insertValuesMock = vi.fn();
const insertMock = vi.fn(() => ({ values: insertValuesMock }));
const updateReturningMock = vi.fn();
const updateWhereMock = vi.fn(() => ({ returning: updateReturningMock }));
const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
const updateMock = vi.fn(() => ({ set: updateSetMock }));

const eqMock = vi.fn((field, value) => ({ type: 'eq', field, value }));
const andMock = vi.fn((...args) => ({ type: 'and', args }));
const inArrayMock = vi.fn((field, value) => ({ type: 'inArray', field, value }));
const sqlMock = vi.fn((strings, ...values) => ({ type: 'sql', text: strings.join('?'), values }));

function mockSelectResult(result) {
  const whereMock = vi.fn().mockResolvedValue(result);
  const fromMock = vi.fn(() => ({ where: whereMock }));
  selectMock.mockImplementationOnce(() => ({ from: fromMock }));
}

function mockSelectListResult(result) {
  const limitMock = vi.fn().mockResolvedValue(result);
  const orderByMock = vi.fn(() => ({ limit: limitMock }));
  const whereMock = vi.fn(() => ({ orderBy: orderByMock }));
  const fromMock = vi.fn(() => ({ where: whereMock }));
  selectMock.mockImplementationOnce(() => ({ from: fromMock }));
}

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler) => {
    return async (req, routeContext) => handler(req, {
      userId: 7,
      params: routeContext?.params ? await routeContext.params : undefined,
    });
  },
}));

vi.mock('@/db', () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
  },
}));

vi.mock('@/db/schema', () => ({
  schedules: {
    id: 'schedules.id',
    userId: 'schedules.userId',
  },
  users: {
    id: 'users.id',
    realName: 'users.realName',
  },
  messages: 'messages',
}));

vi.mock('drizzle-orm', () => ({
  eq: eqMock,
  and: andMock,
  inArray: inArrayMock,
  sql: sqlMock,
}));

describe('schedules routes', () => {
  beforeEach(() => {
    vi.resetModules();
    selectMock.mockReset();
    insertValuesMock.mockReset();
    insertMock.mockClear();
    updateReturningMock.mockReset();
    updateWhereMock.mockClear();
    updateSetMock.mockClear();
    updateMock.mockClear();
    eqMock.mockClear();
    andMock.mockClear();
    inArrayMock.mockClear();
    sqlMock.mockClear();
  });

  it('creates collaborative schedules with normalized participants and inbox messages', async () => {
    mockSelectResult([
      { id: 7, realName: '当前用户' },
      { id: 9, realName: '李四' },
    ]);

    insertValuesMock
      .mockImplementationOnce(() => ({
        returning: vi.fn().mockResolvedValue([
          {
            id: 21,
            title: '售前评审',
            startDate: '2026-04-06',
            startTime: '09:30',
            location: '会议室 A',
          },
        ]),
      }))
      .mockResolvedValueOnce(undefined);

    const { POST } = await import('../../../src/app/api/schedules/route');
    const response = await POST(new NextRequest('http://localhost/api/schedules', {
      method: 'POST',
      body: JSON.stringify({
        title: '售前评审',
        startDate: '2026-04-06',
        startTime: '09:30',
        location: '会议室 A',
        participants: [7, 9, 9],
        reminder: { enabled: true, remindType: '30_minutes_before' },
      }),
    }));

    expect(response.status).toBe(201);
    expect(inArrayMock).toHaveBeenCalledWith('users.id', [7, 9]);

    const scheduleInsertPayload = insertValuesMock.mock.calls[0]?.[0];
    const messageInsertPayload = insertValuesMock.mock.calls[1]?.[0];

    expect(scheduleInsertPayload).toMatchObject({
      participants: [
        { userId: 7, userName: '当前用户' },
        { userId: 9, userName: '李四' },
      ],
      reminder: { enabled: true, remindType: '30_minutes_before' },
      repeat: null,
      userId: 7,
    });
    expect(messageInsertPayload).toEqual([
      expect.objectContaining({
        receiverId: 7,
        senderId: 7,
        relatedType: 'schedule',
        relatedId: 21,
      }),
      expect.objectContaining({
        receiverId: 9,
        senderId: 7,
        relatedType: 'schedule',
        relatedId: 21,
      }),
    ]);
  });

  it('updates schedules through route params and preserves owner checks', async () => {
    mockSelectResult([
      {
        id: 21,
        title: '售前评审',
        startDate: '2026-04-06',
        startTime: '09:30',
        location: '会议室 A',
        participants: [{ userId: 9, userName: '李四' }],
        reminder: null,
        repeat: null,
      },
    ]);
    mockSelectResult([
      { id: 9, realName: '李四' },
      { id: 11, realName: '王五' },
    ]);

    updateReturningMock.mockResolvedValue([
      {
        id: 21,
        title: '售前评审更新',
        startDate: '2026-04-07',
        startTime: '10:00',
        location: '会议室 B',
      },
    ]);
    insertValuesMock.mockResolvedValue(undefined);

    const { PUT } = await import('../../../src/app/api/schedules/[id]/route');
    const response = await PUT(
      new NextRequest('http://localhost/api/schedules/21', {
        method: 'PUT',
        body: JSON.stringify({
          title: '售前评审更新',
          startDate: '2026-04-07',
          startTime: '10:00',
          location: '会议室 B',
          participants: [{ userId: 9 }, { userId: 11 }],
          repeat: { type: 'weekly', interval: 2, endDate: '2026-05-01' },
        }),
      }),
      { params: Promise.resolve({ id: '21' }) }
    );

    expect(response.status).toBe(200);
    expect(eqMock).toHaveBeenCalledWith('schedules.id', 21);
    expect(eqMock).toHaveBeenCalledWith('schedules.userId', 7);
    expect(updateSetMock).toHaveBeenCalledWith(expect.objectContaining({
      repeat: { type: 'weekly', interval: 2, endDate: '2026-05-01' },
    }));
    expect(insertValuesMock).toHaveBeenCalledWith([
      expect.objectContaining({ receiverId: 9, relatedId: 21 }),
      expect.objectContaining({ receiverId: 11, relatedId: 21 }),
    ]);
  });

  it('lists schedules shared with the current participant and exposes access metadata', async () => {
    mockSelectListResult([
      {
        id: 31,
        title: '共享例会',
        type: 'meeting',
        startDate: '2026-04-08',
        startTime: '09:00',
        endDate: '2026-04-08',
        endTime: '10:00',
        allDay: false,
        location: '会议室 C',
        participants: [{ userId: 7, userName: '当前用户' }],
        reminder: null,
        repeat: { type: 'weekly', interval: 1 },
        relatedType: 'task',
        relatedId: 66,
        description: '共享给参与人可见',
        scheduleStatus: 'scheduled',
        userId: 9,
        createdAt: '2026-04-05T09:00:00.000Z',
      },
    ]);

    const { GET } = await import('../../../src/app/api/schedules/route');
    const response = await GET(new NextRequest('http://localhost/api/schedules?status=scheduled'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(sqlMock).toHaveBeenCalled();
    expect(payload).toMatchObject({
      success: true,
      data: [
        expect.objectContaining({
          id: 31,
          isOwner: false,
          accessRole: 'participant',
          relatedType: 'task',
          relatedId: 66,
          repeat: { type: 'weekly', interval: 1 },
        }),
      ],
    });
  });

  it('returns shared schedule details to participants with read-only metadata', async () => {
    mockSelectResult([
      {
        id: 31,
        title: '共享例会',
        userId: 9,
        participants: [{ userId: 7, userName: '当前用户' }],
      },
    ]);

    const { GET } = await import('../../../src/app/api/schedules/[id]/route');
    const response = await GET(
      new NextRequest('http://localhost/api/schedules/31'),
      { params: Promise.resolve({ id: '31' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(sqlMock).toHaveBeenCalled();
    expect(payload).toMatchObject({
      success: true,
      data: expect.objectContaining({
        id: 31,
        isOwner: false,
        accessRole: 'participant',
      }),
    });
  });
});