import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const performSecurityChecksMock = vi.fn();
const addSecurityHeadersMock = vi.fn((response: Response) => response);
const getValidatedAuthContextMock = vi.fn();
const getUserPermissionsMock = vi.fn();
const checkApiPermissionMock = vi.fn();
const getPersonnelViewMock = vi.fn();
const getTeamExecutionSummaryReadModelMock = vi.fn();

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

  it('returns 401 when the canonical personnel-view route has no authenticated user', async () => {
    getValidatedAuthContextMock.mockResolvedValueOnce(null);

    const { GET } = await import('../../../src/app/api/data-screen/personnel-view/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/personnel-view?preset=management'));
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

  it('returns 403 when the canonical personnel-view route misses datascreen:view', async () => {
    getValidatedAuthContextMock.mockResolvedValueOnce({
      payload: { userId: 7 },
      user: null,
    });
    getUserPermissionsMock.mockResolvedValueOnce({
      userId: 7,
      permissions: [],
      isSuperAdmin: false,
    });

    const { GET } = await import('../../../src/app/api/data-screen/personnel-view/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/personnel-view?preset=management'));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '需要权限: datascreen:view',
      },
    });
    expect(checkApiPermissionMock).toHaveBeenCalledWith(7, 'GET', '/api/data-screen/personnel-view');
    expect(getPersonnelViewMock).not.toHaveBeenCalled();
  });

  it('returns 403 when the team-execution route is blocked by API permission lookup', async () => {
    getValidatedAuthContextMock.mockResolvedValueOnce({
      payload: { userId: 7 },
      user: null,
    });
    checkApiPermissionMock.mockResolvedValueOnce({
      allowed: false,
      reason: '需要权限: team-execution-cockpit:view',
    });

    const { GET } = await import('../../../src/app/api/data-screen/team-execution/summary/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/team-execution/summary?view=role&range=7d'));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '需要权限: team-execution-cockpit:view',
      },
    });
    expect(checkApiPermissionMock).toHaveBeenCalledWith(7, 'GET', '/api/data-screen/team-execution/summary');
    expect(getTeamExecutionSummaryReadModelMock).not.toHaveBeenCalled();
  });
});