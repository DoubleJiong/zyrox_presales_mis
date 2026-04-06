import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const selectMock = vi.fn();
const descMock = vi.fn((value: unknown) => ({ type: 'desc', value }));
const eqMock = vi.fn((field: unknown, value: unknown) => ({ type: 'eq', field, value }));
const andMock = vi.fn((...args: unknown[]) => ({ type: 'and', args }));

function mockSelectListResult(result: unknown) {
  const limitMock = vi.fn().mockResolvedValue(result);
  const orderByMock = vi.fn(() => ({ limit: limitMock }));
  const whereMock = vi.fn(() => ({ orderBy: orderByMock }));
  const fromMock = vi.fn(() => ({ where: whereMock }));
  selectMock.mockImplementationOnce(() => ({ from: fromMock }));
  return { fromMock, whereMock, orderByMock, limitMock };
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

vi.mock('@/db/schema', () => ({
  messages: {
    receiverId: 'messages.receiverId',
    isDeleted: 'messages.isDeleted',
    createdAt: 'messages.createdAt',
  },
  projects: {
    id: 'projects.id',
    projectName: 'projects.projectName',
    projectStage: 'projects.projectStage',
    bidResult: 'projects.bidResult',
    status: 'projects.status',
    region: 'projects.region',
    updatedAt: 'projects.updatedAt',
    managerId: 'projects.managerId',
    deletedAt: 'projects.deletedAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  and: andMock,
  desc: descMock,
  eq: eqMock,
  isNull: vi.fn((field: unknown) => ({ type: 'isNull', field })),
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown, options?: { status?: number }) => NextResponse.json({ success: true, data }, { status: options?.status ?? 200 }),
  errorResponse: (code: string, message: string, status = 500) => NextResponse.json({ success: false, error: code, message }, { status }),
}));

vi.mock('@/lib/project-display', () => ({
  getProjectDisplayStatusLabel: () => '跟进中',
}));

describe('data-screen stream route', () => {
  beforeEach(() => {
    vi.resetModules();
    selectMock.mockReset();
    descMock.mockClear();
    eqMock.mockClear();
    andMock.mockClear();
  });

  it('uses the authenticated receiver scope for message stream queries', async () => {
    mockSelectListResult([
      {
        id: 1,
        type: 'reminder',
        title: '请处理任务',
        content: '任务即将到期',
        createdAt: '2026-04-05T08:00:00.000Z',
        isRead: false,
      },
    ]);

    const { GET } = await import('../../../src/app/api/data-screen/stream/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/stream?limit=5'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(eqMock).toHaveBeenCalledWith('messages.receiverId', 7);
    expect(eqMock).toHaveBeenCalledWith('messages.isDeleted', false);
    expect(payload).toMatchObject({
      success: true,
      data: {
        messages: [expect.objectContaining({ id: 1, title: '请处理任务' })],
        total: 1,
      },
    });
  });
});