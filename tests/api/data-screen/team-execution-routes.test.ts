import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mockGetSummary = vi.fn();
const mockBuildEmptySummary = vi.fn();
const mockGetCustomer = vi.fn();
const mockBuildEmptyCustomer = vi.fn();
const mockGetSolution = vi.fn();
const mockBuildEmptySolution = vi.fn();
const mockGetDetail = vi.fn();
const mockParseFilters = vi.fn();
const mockResolveDateRange = vi.fn();
const mockErrorResponse = vi.fn((code: string, message: string, status = 500) => NextResponse.json({ success: false, error: code, message }, { status }));

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 7 });
  },
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown, options?: { status?: number }) => NextResponse.json({ success: true, data }, { status: options?.status ?? 200 }),
  errorResponse: mockErrorResponse,
}));

vi.mock('@/lib/team-execution-cockpit/filters', () => ({
  parseTeamExecutionFilters: mockParseFilters,
  resolveTeamExecutionDateRange: mockResolveDateRange,
}));

vi.mock('@/lib/team-execution-cockpit/read-model', () => ({
  getTeamExecutionSummaryReadModel: mockGetSummary,
  buildEmptyTeamExecutionSummaryReadModel: mockBuildEmptySummary,
  getTeamExecutionCustomerReadModel: mockGetCustomer,
  buildEmptyTeamExecutionCustomerReadModel: mockBuildEmptyCustomer,
  getTeamExecutionSolutionReadModel: mockGetSolution,
  buildEmptyTeamExecutionSolutionReadModel: mockBuildEmptySolution,
}));

vi.mock('@/lib/team-execution-cockpit/detail-read-model', () => ({
  getTeamExecutionObjectDetailReadModel: mockGetDetail,
}));

describe('team-execution cockpit routes', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetSummary.mockReset();
    mockBuildEmptySummary.mockReset();
    mockGetCustomer.mockReset();
    mockBuildEmptyCustomer.mockReset();
    mockGetSolution.mockReset();
    mockBuildEmptySolution.mockReset();
    mockGetDetail.mockReset();
    mockParseFilters.mockReset();
    mockResolveDateRange.mockReset();
    mockErrorResponse.mockClear();

    mockParseFilters.mockReturnValue({ view: 'role', range: '7d', focus: 'all', q: '' });
    mockResolveDateRange.mockReturnValue({ startDate: '2026-04-02', endDate: '2026-04-08' });
  });

  it('returns summary read model with normalized filters', async () => {
    mockGetSummary.mockResolvedValueOnce({ summary: { pendingTotal: 12 } });

    const { GET } = await import('../../../src/app/api/data-screen/team-execution/summary/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/team-execution/summary?view=role&range=7d'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockParseFilters).toHaveBeenCalled();
    expect(mockResolveDateRange).toHaveBeenCalledWith('7d');
    expect(mockGetSummary).toHaveBeenCalledWith(7, { view: 'role', range: '7d', focus: 'all', q: '' }, { startDate: '2026-04-02', endDate: '2026-04-08' });
    expect(payload).toMatchObject({ success: true, data: { summary: { pendingTotal: 12 } } });
  });

  it('falls back to empty customer read model when customer route aggregation fails', async () => {
    mockGetCustomer.mockRejectedValueOnce(new Error('aggregation failed'));
    mockBuildEmptyCustomer.mockReturnValueOnce({ overview: { totalCustomers: 0 } });

    const { GET } = await import('../../../src/app/api/data-screen/team-execution/customer/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/team-execution/customer?view=customer'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockBuildEmptyCustomer).toHaveBeenCalledWith({ view: 'role', range: '7d', focus: 'all', q: '' });
    expect(payload).toMatchObject({ success: true, data: { overview: { totalCustomers: 0 } } });
  });

  it('returns solution read model for the solution view route', async () => {
    mockGetSolution.mockResolvedValueOnce({ overview: { totalSolutions: 6, overdueReviews: 2 } });

    const { GET } = await import('../../../src/app/api/data-screen/team-execution/solution/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/team-execution/solution?view=solution&focus=abnormal'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetSolution).toHaveBeenCalledWith(7, { view: 'role', range: '7d', focus: 'all', q: '' }, { startDate: '2026-04-02', endDate: '2026-04-08' });
    expect(payload).toMatchObject({ success: true, data: { overview: { totalSolutions: 6, overdueReviews: 2 } } });
  });

  it('rejects detail requests with invalid entity params before touching the read model', async () => {
    const { GET } = await import('../../../src/app/api/data-screen/team-execution/detail/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/team-execution/detail?entityType=invalid&entityId=0'));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(mockGetDetail).not.toHaveBeenCalled();
    expect(payload).toMatchObject({ success: false, error: 'BAD_REQUEST' });
  });

  it('returns not-found when detail object is outside cockpit scope', async () => {
    mockGetDetail.mockResolvedValueOnce(null);

    const { GET } = await import('../../../src/app/api/data-screen/team-execution/detail/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/team-execution/detail?entityType=project&entityId=18&view=project'));
    const payload = await response.json();

    expect(mockGetDetail).toHaveBeenCalledWith(7, 'project', 18, { view: 'role', range: '7d', focus: 'all', q: '' }, { startDate: '2026-04-02', endDate: '2026-04-08' });
    expect(payload).toMatchObject({ success: false, error: 'NOT_FOUND' });
  });
});