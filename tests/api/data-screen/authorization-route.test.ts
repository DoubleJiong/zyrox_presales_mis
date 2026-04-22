import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const performSecurityChecksMock = vi.fn();
const addSecurityHeadersMock = vi.fn((response: Response) => response);
const getValidatedAuthContextMock = vi.fn();
const getUserPermissionsMock = vi.fn();
const checkApiPermissionMock = vi.fn();
const getPersonnelViewMock = vi.fn();
const getTeamExecutionSummaryReadModelMock = vi.fn();

// DB mock — region-view route queries DB directly
const makeChain = (rows: unknown[] = []): object => {
  const thenFn = (resolve: (v: unknown[]) => void) => Promise.resolve(rows).then(resolve);
  const handler: ProxyHandler<object> = {
    get(_: object, prop: string | symbol) {
      if (prop === 'then') return thenFn;
      if (prop === Symbol.iterator) return rows[Symbol.iterator].bind(rows);
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
};

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => makeChain([{ count: 0 }])),
    execute: vi.fn(async () => []),
  },
}));

vi.mock('@/db/schema', () => ({
  projects: { id: 'p.id', deletedAt: 'p.deletedAt', projectStage: 'p.stage', region: 'p.region', industry: 'p.industry', projectType: 'p.type', estimatedAmount: 'p.estAmt', actualAmount: 'p.actAmt', bidResult: 'p.bidResult', contractAmount: 'p.contractAmt', contractingCompanyId: 'p.cid', projectName: 'p.name' },
  customers: { deletedAt: 'c.deletedAt', region: 'c.region' },
  subsidiaries: { id: 's.id', subsidiaryName: 's.name', deletedAt: 's.deletedAt', status: 's.status' },
  projectPresalesRecords: { projectId: 'ppr.pid', totalWorkHours: 'ppr.hours', deletedAt: 'ppr.deletedAt' },
}));

vi.mock('drizzle-orm', () => ({
  sql: vi.fn((strings: TemplateStringsArray) => ({ _sql: strings.join('?') })),
  eq: vi.fn(), and: vi.fn(), or: vi.fn(), not: vi.fn(), isNull: vi.fn(), inArray: vi.fn(),
  count: vi.fn(() => 0), sum: vi.fn(() => null),
}));

vi.mock('@/lib/permissions', () => ({
  PERMISSIONS: { DATASCREEN_VIEW: 'datascreen:view' },
}));

vi.mock('@/lib/security', () => ({
  performSecurityChecks: performSecurityChecksMock,
  addSecurityHeaders: addSecurityHeadersMock,
}));

vi.mock('@/lib/jwt', () => ({
  getValidatedAuthContext: getValidatedAuthContextMock,
}));

vi.mock('@/lib/rbac', () => ({
  getUserPermissions: getUserPermissionsMock,
  checkApiPermission: checkApiPermissionMock,
}));

vi.mock('@/lib/data-screen-personnel-view', () => ({
  parseDataScreenPersonnelViewInitFilters: vi.fn(() => ({
    startDate: '2026-04-01',
    endDate: '2026-04-08',
    preset: 'management',
    personId: null,
    abnormalFilter: 'all',
    selectedItemId: null,
    peoplePage: 1,
    peoplePageSize: 8,
    itemPage: 1,
    itemPageSize: 8,
  })),
  buildEmptyDataScreenPersonnelViewInitData: vi.fn(() => ({ summary: { managedPeopleCount: 0 } })),
  getDataScreenPersonnelViewInitData: getPersonnelViewMock,
}));

vi.mock('@/lib/team-execution-cockpit/filters', () => ({
  parseTeamExecutionFilters: vi.fn(() => ({ view: 'role', range: '7d', focus: 'all', q: '' })),
  resolveTeamExecutionDateRange: vi.fn(() => ({ startDate: '2026-04-02', endDate: '2026-04-08' })),
}));

vi.mock('@/lib/team-execution-cockpit/read-model', () => ({
  buildEmptyTeamExecutionSummaryReadModel: vi.fn(() => ({ summary: { pendingTotal: 0 } })),
  getTeamExecutionSummaryReadModel: getTeamExecutionSummaryReadModelMock,
}));

describe('data-screen authorization regression', () => {
  beforeEach(() => {
    vi.resetModules();
    performSecurityChecksMock.mockReset();
    addSecurityHeadersMock.mockClear();
    getValidatedAuthContextMock.mockReset();
    getUserPermissionsMock.mockReset();
    checkApiPermissionMock.mockReset();
    getPersonnelViewMock.mockReset();
    getTeamExecutionSummaryReadModelMock.mockReset();

    performSecurityChecksMock.mockResolvedValue({ allowed: true });
    getUserPermissionsMock.mockResolvedValue({
      userId: 7,
      permissions: ['datascreen:view'],
      isSuperAdmin: false,
    });
    checkApiPermissionMock.mockResolvedValue({ allowed: true });
  });

  it('returns 401 when the region-view route has no authenticated user', async () => {
    getValidatedAuthContextMock.mockResolvedValueOnce(null);

    const { GET } = await import('../../../src/app/api/data-screen/region-view/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/region-view'));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '请先登录',
      },
    });
    expect(getUserPermissionsMock).not.toHaveBeenCalled();
    expect(getPersonnelViewMock).not.toHaveBeenCalled();
  });

  it('returns 403 when the region-view route misses datascreen:view', async () => {
    getValidatedAuthContextMock.mockResolvedValueOnce({
      payload: { userId: 7 },
      user: null,
    });
    getUserPermissionsMock.mockResolvedValueOnce({
      userId: 7,
      permissions: [],
      isSuperAdmin: false,
    });
    checkApiPermissionMock.mockResolvedValueOnce({ allowed: false, reason: '需要权限: datascreen:view' });

    const { GET } = await import('../../../src/app/api/data-screen/region-view/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/region-view'));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 when the region-view route is blocked by API permission lookup', async () => {
    getValidatedAuthContextMock.mockResolvedValueOnce({
      payload: { userId: 7 },
      user: null,
    });
    checkApiPermissionMock.mockResolvedValueOnce({
      allowed: false,
      reason: '需要权限: datascreen:view',
    });

    const { GET } = await import('../../../src/app/api/data-screen/region-view/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/region-view'));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'FORBIDDEN',
      },
    });
    expect(getTeamExecutionSummaryReadModelMock).not.toHaveBeenCalled();
  });
});