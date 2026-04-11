import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const getPersonnelViewMock = vi.fn();
const parseFiltersMock = vi.fn();
const buildEmptyPersonnelViewMock = vi.fn();

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 7 });
  },
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown, options?: { status?: number }) => NextResponse.json({ success: true, data }, { status: options?.status ?? 200 }),
}));

vi.mock('@/lib/data-screen-personnel-view', () => ({
  parseDataScreenPersonnelViewInitFilters: parseFiltersMock,
  buildEmptyDataScreenPersonnelViewInitData: buildEmptyPersonnelViewMock,
  getDataScreenPersonnelViewInitData: getPersonnelViewMock,
}));

describe('data-screen personnel-view route', () => {
  beforeEach(() => {
    vi.resetModules();
    getPersonnelViewMock.mockReset();
    parseFiltersMock.mockReset();
    buildEmptyPersonnelViewMock.mockReset();

    parseFiltersMock.mockReturnValue({
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
    });
    buildEmptyPersonnelViewMock.mockImplementation((filters) => ({
      filtersEcho: filters,
      summary: {
        managedPeopleCount: 0,
        activePeopleCount: 0,
        overloadedPeopleCount: 0,
        lowActivityPeopleCount: 0,
        riskPeopleCount: 0,
        pendingItemCount: 0,
        overdueItemCount: 0,
        highPriorityItemCount: 0,
        activeProjectPeopleCount: 0,
        activeSolutionPeopleCount: 0,
      },
      loadDistribution: [],
      roleGroups: [],
      regionGroups: [],
      itemStatusSummary: [],
      itemAbnormalSummary: [],
      riskRanking: [],
      peopleList: { items: [], pagination: { page: 1, pageSize: 8, total: 0, totalPages: 1 } },
      selectedPerson: null,
      itemList: { items: [], pagination: { page: 1, pageSize: 8, total: 0, totalPages: 1 } },
      selectedItem: null,
      timestamp: '2026-04-09T10:00:00.000Z',
    }));
  });

  it('returns the canonical personnel init payload', async () => {
    parseFiltersMock.mockReturnValueOnce({
      startDate: '2026-04-01',
      endDate: '2026-04-08',
      preset: 'presales-focus',
      personId: null,
      abnormalFilter: 'all',
      selectedItemId: null,
      peoplePage: 1,
      peoplePageSize: 8,
      itemPage: 1,
      itemPageSize: 8,
    });

    getPersonnelViewMock.mockResolvedValueOnce({
      filtersEcho: {
        startDate: '2026-04-01',
        endDate: '2026-04-08',
        preset: 'presales-focus',
        personId: null,
        abnormalFilter: 'all',
        selectedItemId: null,
        peoplePage: 1,
        peoplePageSize: 8,
        itemPage: 1,
        itemPageSize: 8,
      },
      summary: {
        managedPeopleCount: 12,
        activePeopleCount: 10,
        overloadedPeopleCount: 3,
        lowActivityPeopleCount: 1,
        riskPeopleCount: 4,
        pendingItemCount: 28,
        overdueItemCount: 6,
        highPriorityItemCount: 9,
        activeProjectPeopleCount: 9,
        activeSolutionPeopleCount: 5,
      },
      loadDistribution: [],
      roleGroups: [],
      regionGroups: [],
      itemStatusSummary: [],
      itemAbnormalSummary: [],
      riskRanking: [],
      peopleList: { items: [], pagination: { page: 1, pageSize: 8, total: 12, totalPages: 2 } },
      selectedPerson: null,
      itemList: { items: [], pagination: { page: 1, pageSize: 8, total: 0, totalPages: 1 } },
      selectedItem: null,
      timestamp: '2026-04-09T10:00:00.000Z',
    });

    const { GET } = await import('../../../src/app/api/data-screen/personnel-view/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/personnel-view?preset=presales-focus&startDate=2026-04-01&endDate=2026-04-08'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getPersonnelViewMock).toHaveBeenCalledWith(7, expect.objectContaining({
      preset: 'presales-focus',
      startDate: '2026-04-01',
      endDate: '2026-04-08',
    }));
    expect(payload.data.summary).toMatchObject({
      managedPeopleCount: 12,
      overloadedPeopleCount: 3,
      pendingItemCount: 28,
    });
  });

  it('returns a stable empty payload when the unified personnel read model fails', async () => {
    parseFiltersMock.mockReturnValueOnce({
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
    });
    getPersonnelViewMock.mockRejectedValueOnce(new Error('personnel exploded'));

    const { GET } = await import('../../../src/app/api/data-screen/personnel-view/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/personnel-view?preset=management&startDate=2026-04-01&endDate=2026-04-08'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      filtersEcho: {
        preset: 'management',
        startDate: '2026-04-01',
        endDate: '2026-04-08',
      },
      summary: {
        managedPeopleCount: 0,
        pendingItemCount: 0,
      },
      selectedPerson: null,
      peopleList: {
        items: [],
      },
    });
  });
});