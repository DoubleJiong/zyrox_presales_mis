import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const queryMock = vi.fn();

const updateReturningMock = vi.fn();
const updateWhereMock = vi.fn(() => ({ returning: updateReturningMock }));
const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
const updateMock = vi.fn(() => ({ set: updateSetMock }));

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 7 });
  },
}));

vi.mock('@/lib/operation-log-service', () => ({
  OperationLogService: {
    query: queryMock,
  },
}));

vi.mock('@/db', () => ({
  db: {
    update: updateMock,
  },
}));

vi.mock('@/db/schema', () => ({
  operationLogs: {
    id: 'operationLogs.id',
    deletedAt: 'operationLogs.deletedAt',
    createdAt: 'operationLogs.createdAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  isNull: vi.fn((value: unknown) => ({ type: 'isNull', value })),
  lte: vi.fn((...args: unknown[]) => ({ type: 'lte', args })),
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown, options?: { status?: number }) => NextResponse.json({ success: true, data }, { status: options?.status ?? 200 }),
  errorResponse: (code: string, message: string, options?: { status?: number }) =>
    NextResponse.json({ success: false, error: { code, message } }, { status: options?.status ?? 400 }),
  paginatedResponse: (data: unknown, total: number, params?: { page?: number; pageSize?: number }) =>
    NextResponse.json({ success: true, data, meta: { pagination: { page: params?.page ?? 1, pageSize: params?.pageSize ?? 10, total } } }),
  parsePagination: () => ({ page: 1, pageSize: 10, offset: 0 }),
}));

describe('system logs route', () => {
  beforeEach(() => {
    vi.resetModules();
    queryMock.mockReset();
    updateReturningMock.mockReset();
    updateWhereMock.mockClear();
    updateSetMock.mockClear();
    updateMock.mockClear();
  });

  it('lists operation logs through the normalized service response', async () => {
    queryMock.mockResolvedValue({
      list: [
        {
          id: 9,
          userId: 1,
          userName: '管理员',
          module: '系统',
          action: 'login',
          details: 'POST /api/auth/login',
          status: 'success',
          ip: '127.0.0.1',
          createdAt: '2026-04-01T06:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    const { GET } = await import('../../../src/app/api/operation-logs/route');
    const response = await GET(new NextRequest('http://localhost/api/operation-logs?page=1&pageSize=10'));

    expect(response.status).toBe(200);
    expect(queryMock).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 10 }));
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: [expect.objectContaining({ id: 9, module: '系统', details: 'POST /api/auth/login' })],
      meta: { pagination: expect.objectContaining({ total: 1 }) },
    });
  });

  it('rejects invalid daysToKeep values when cleaning logs', async () => {
    const { DELETE } = await import('../../../src/app/api/operation-logs/route');
    const response = await DELETE(new NextRequest('http://localhost/api/operation-logs?daysToKeep=0', {
      method: 'DELETE',
    }));

    expect(response.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: expect.objectContaining({ message: 'daysToKeep 必须是大于 0 的整数' }),
    });
  });

  it('soft deletes expired logs', async () => {
    updateReturningMock.mockResolvedValue([{ id: 2 }, { id: 3 }]);

    const { DELETE } = await import('../../../src/app/api/operation-logs/route');
    const response = await DELETE(new NextRequest('http://localhost/api/operation-logs?daysToKeep=30', {
      method: 'DELETE',
    }));

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: expect.objectContaining({ count: 2 }),
    });
  });
});