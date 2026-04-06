import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const selectLimit = vi.fn();
const selectWhere = vi.fn(() => ({ limit: selectLimit }));
const selectFrom = vi.fn(() => ({ where: selectWhere }));
const select = vi.fn(() => ({ from: selectFrom }));
const updateReturning = vi.fn();
const updateWhere = vi.fn(() => ({ returning: updateReturning }));
const updateSet = vi.fn(() => ({ where: updateWhere }));
const update = vi.fn(() => ({ set: updateSet }));
const isSystemAdmin = vi.fn();
const getAccessibleProjectIds = vi.fn();

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 7 });
  },
}));

vi.mock('@/lib/permissions/project', () => ({
  isSystemAdmin,
  getAccessibleProjectIds,
}));

vi.mock('@/db', () => ({
  db: {
    select,
    update,
  },
}));

vi.mock('@/db/schema', () => ({
  alertHistories: {
    id: 'alert_histories.id',
    deletedAt: 'alert_histories.deletedAt',
    status: 'alert_histories.status',
    targetType: 'alert_histories.targetType',
    targetId: 'alert_histories.targetId',
    acknowledgedAt: 'alert_histories.acknowledgedAt',
    acknowledgedBy: 'alert_histories.acknowledgedBy',
    resolvedAt: 'alert_histories.resolvedAt',
    resolvedBy: 'alert_histories.resolvedBy',
    resolutionNote: 'alert_histories.resolutionNote',
    updatedAt: 'alert_histories.updatedAt',
  },
  alertRules: {},
  users: { id: 'users.id', realName: 'users.realName' },
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  or: vi.fn(),
  inArray: vi.fn(),
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown) => NextResponse.json({ success: true, data }),
  errorResponse: (code: string, message: string, options?: { status?: number }) =>
    NextResponse.json({ success: false, error: { code, message } }, { status: options?.status ?? 400 }),
}));

describe('alerts histories api', () => {
  beforeEach(() => {
    select.mockImplementation(() => ({ from: selectFrom }));
    selectFrom.mockImplementation(() => ({ where: selectWhere }));
    selectWhere.mockImplementation(() => ({ limit: selectLimit }));
    update.mockImplementation(() => ({ set: updateSet }));
    updateSet.mockImplementation(() => ({ where: updateWhere }));
    updateWhere.mockImplementation(() => ({ returning: updateReturning }));
    selectLimit.mockReset();
    updateReturning.mockReset();
    isSystemAdmin.mockReset();
    getAccessibleProjectIds.mockReset();
  });

  it('acknowledges a pending project alert with the authenticated user id', async () => {
    isSystemAdmin.mockResolvedValue(false);
    getAccessibleProjectIds.mockResolvedValue([101]);
    selectLimit.mockResolvedValue([{ id: 33, status: 'pending', targetType: 'project', targetId: 101 }]);
    updateReturning.mockResolvedValue([{ id: 33, status: 'acknowledged', acknowledgedBy: 7 }]);

    const { POST } = await import('../../../src/app/api/alerts/histories/route');
    const response = await POST(new NextRequest('http://localhost/api/alerts/histories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 33 }),
    }));

    expect(response.status).toBe(200);
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      status: 'acknowledged',
      acknowledgedBy: 7,
    }));
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: expect.objectContaining({
        id: 33,
        message: '预警已确认',
      }),
    });
  });

  it('resolves an acknowledged project alert with a resolution note', async () => {
    isSystemAdmin.mockResolvedValue(false);
    getAccessibleProjectIds.mockResolvedValue([101]);
    selectLimit.mockResolvedValue([{ id: 33, status: 'acknowledged', targetType: 'project', targetId: 101 }]);
    updateReturning.mockResolvedValue([{ id: 33, status: 'resolved', resolvedBy: 7, resolutionNote: '已安排跟进' }]);

    const { PUT } = await import('../../../src/app/api/alerts/histories/route');
    const response = await PUT(new NextRequest('http://localhost/api/alerts/histories', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 33, resolutionNote: '已安排跟进' }),
    }));

    expect(response.status).toBe(200);
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      status: 'resolved',
      resolvedBy: 7,
      resolutionNote: '已安排跟进',
    }));
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: expect.objectContaining({
        id: 33,
        message: '预警已解决',
      }),
    });
  });
});