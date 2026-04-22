import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { eq, and, or, inArray, isNull } from 'drizzle-orm';

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
    severity: 'alert_histories.severity',
    ruleId: 'alert_histories.ruleId',
    ruleName: 'alert_histories.ruleName',
    targetType: 'alert_histories.targetType',
    targetId: 'alert_histories.targetId',
    targetName: 'alert_histories.targetName',
    alertData: 'alert_histories.alertData',
    acknowledgedAt: 'alert_histories.acknowledgedAt',
    acknowledgedBy: 'alert_histories.acknowledgedBy',
    resolvedAt: 'alert_histories.resolvedAt',
    resolvedBy: 'alert_histories.resolvedBy',
    resolutionNote: 'alert_histories.resolutionNote',
    ignoredAt: 'alert_histories.ignoredAt',
    ignoredBy: 'alert_histories.ignoredBy',
    ignoreReason: 'alert_histories.ignoreReason',
    createdAt: 'alert_histories.createdAt',
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

  it('ignores a pending alert and writes ignoreReason from query param', async () => {
    isSystemAdmin.mockResolvedValue(true);
    selectLimit.mockResolvedValue([{ id: 33, status: 'pending', targetType: 'project', targetId: 101 }]);
    updateReturning.mockResolvedValue([{ id: 33, status: 'ignored', ignoredBy: 7, ignoreReason: '已知风险，无需处理' }]);

    const { DELETE } = await import('../../../src/app/api/alerts/histories/route');
    const response = await DELETE(new NextRequest(
      'http://localhost/api/alerts/histories?id=33&ignoreReason=%E5%B7%B2%E7%9F%A5%E9%A3%8E%E9%99%A9%EF%BC%8C%E6%97%A0%E9%9C%80%E5%A4%84%E7%90%86',
      { method: 'DELETE' },
    ));

    expect(response.status).toBe(200);
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      status: 'ignored',
      ignoredBy: 7,
      ignoreReason: '已知风险，无需处理',
    }));
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: expect.objectContaining({ id: 33, message: '预警已忽略' }),
    });
  });

  it('uses default ignoreReason text when query param is absent', async () => {
    isSystemAdmin.mockResolvedValue(true);
    selectLimit.mockResolvedValue([{ id: 44, status: 'acknowledged', targetType: 'project', targetId: 101 }]);
    updateReturning.mockResolvedValue([{ id: 44, status: 'ignored', ignoredBy: 7, ignoreReason: '用户已忽略此预警' }]);

    const { DELETE } = await import('../../../src/app/api/alerts/histories/route');
    const response = await DELETE(new NextRequest(
      'http://localhost/api/alerts/histories?id=44',
      { method: 'DELETE' },
    ));

    expect(response.status).toBe(200);
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      status: 'ignored',
      ignoredBy: 7,
      ignoreReason: '用户已忽略此预警',
    }));
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: expect.objectContaining({ id: 44, message: '预警已忽略' }),
    });
  });

  describe('GET /api/alerts/histories', () => {
    let getOrderBy: ReturnType<typeof vi.fn>;
    let getWhere: ReturnType<typeof vi.fn>;
    let getLeftJoin: ReturnType<typeof vi.fn>;
    let getFrom: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Reset drizzle-orm condition mocks so call args are scoped per test
      (eq as ReturnType<typeof vi.fn>).mockReset().mockReturnValue('mocked_condition');
      (and as ReturnType<typeof vi.fn>).mockReset().mockReturnValue('mocked_and');
      (isNull as ReturnType<typeof vi.fn>).mockReset().mockReturnValue('mocked_isNull');
      (or as ReturnType<typeof vi.fn>).mockReset().mockReturnValue('mocked_or');
      (inArray as ReturnType<typeof vi.fn>).mockReset().mockReturnValue('mocked_inArray');

      // Rebuild the GET chain: select({}).from().leftJoin().where().orderBy()
      getOrderBy = vi.fn().mockResolvedValue([]);
      getWhere = vi.fn(() => ({ orderBy: getOrderBy }));
      getLeftJoin = vi.fn(() => ({ where: getWhere }));
      getFrom = vi.fn(() => ({ leftJoin: getLeftJoin }));
      select.mockImplementation(() => ({ from: getFrom }));
    });

    it('admin sees all histories without permission filter', async () => {
      isSystemAdmin.mockResolvedValue(true);

      const { GET } = await import('../../../src/app/api/alerts/histories/route');
      const response = await GET(new NextRequest('http://localhost/api/alerts/histories'));

      expect(response.status).toBe(200);
      expect(isSystemAdmin).toHaveBeenCalledWith(7);
      expect(getAccessibleProjectIds).not.toHaveBeenCalled();
      expect(or).not.toHaveBeenCalled();
    });

    it('non-admin filters by accessible project ids', async () => {
      isSystemAdmin.mockResolvedValue(false);
      getAccessibleProjectIds.mockResolvedValue([3, 5]);

      const { GET } = await import('../../../src/app/api/alerts/histories/route');
      const response = await GET(new NextRequest('http://localhost/api/alerts/histories'));

      expect(response.status).toBe(200);
      expect(getAccessibleProjectIds).toHaveBeenCalledWith(7);
      expect(inArray).toHaveBeenCalledWith('alert_histories.targetId', [3, 5]);
      expect(or).toHaveBeenCalled();
    });

    it('filters by status param', async () => {
      isSystemAdmin.mockResolvedValue(true);

      const { GET } = await import('../../../src/app/api/alerts/histories/route');
      const response = await GET(new NextRequest('http://localhost/api/alerts/histories?status=pending'));

      expect(response.status).toBe(200);
      expect(eq).toHaveBeenCalledWith('alert_histories.status', 'pending');
    });

    it('filters by severity param', async () => {
      isSystemAdmin.mockResolvedValue(true);

      const { GET } = await import('../../../src/app/api/alerts/histories/route');
      const response = await GET(new NextRequest('http://localhost/api/alerts/histories?severity=high'));

      expect(response.status).toBe(200);
      expect(eq).toHaveBeenCalledWith('alert_histories.severity', 'high');
    });

    it('filters by ruleId param', async () => {
      isSystemAdmin.mockResolvedValue(true);

      const { GET } = await import('../../../src/app/api/alerts/histories/route');
      const response = await GET(new NextRequest('http://localhost/api/alerts/histories?ruleId=42'));

      expect(response.status).toBe(200);
      expect(eq).toHaveBeenCalledWith('alert_histories.ruleId', 42);
    });

    it('ignores status filter when param is "all"', async () => {
      isSystemAdmin.mockResolvedValue(true);

      const { GET } = await import('../../../src/app/api/alerts/histories/route');
      const response = await GET(new NextRequest('http://localhost/api/alerts/histories?status=all'));

      expect(response.status).toBe(200);
      const statusCalls = (eq as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => call[0] === 'alert_histories.status',
      );
      expect(statusCalls).toHaveLength(0);
    });
  });
});