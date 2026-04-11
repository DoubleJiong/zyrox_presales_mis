import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const fetchMock = vi.fn();

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 7 });
  },
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown, options?: { status?: number }) => NextResponse.json({ success: true, data }, { status: options?.status ?? 200 }),
}));

describe('data-screen region-view route', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('returns a unified region init payload and forces Zhejiang map requests through the Zhejiang heatmap builder', async () => {
    fetchMock
      .mockResolvedValueOnce(new NextResponse(JSON.stringify({
        success: true,
        data: {
          totalCustomers: 18,
          totalProjects: 9,
          totalSolutions: 6,
          totalStaff: 12,
          totalRevenue: 560,
          wonProjects: 2,
          topRegions: [{ name: '浙江', value: 5, amount: 320 }],
          topRevenueRegions: [{ name: '浙江', value: 5, amount: 320 }],
          funnel: { totalOpenCount: 4, totalOpenAmount: 120, weightedPipeline: 66, avgWinProbability: 55, missingWinProbabilityCount: 0, stages: [] },
          forecastSummary: { targetBasis: 'rolling_90d_run_rate', targetLabel: '滚动90天中标 run-rate', periodDays: 30, targetAmount: 100, currentWonAmount: 40, forecastAmount: 86, weightedOpenAmount: 46, gapAmount: 14, coverageRate: 86, averageWinProbability: 55, requiredNewOpportunityAmount: 26, confidence: 'watch' },
          riskSummary: { total: 3, high: 1, medium: 2, overdueActions: 1, overdueBids: 0, staleProjects: 1, dueThisWeek: 1, items: [] },
          monthlyData: [{ month: '2026-04', customers: 5, projects: 3, revenue: 120 }],
          stageStats: [{ stage: 'opportunity', count: 4 }],
          statusStats: [{ status: 'lead', count: 4 }],
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new NextResponse(JSON.stringify({
        success: true,
        data: {
          type: 'zhejiang',
          regions: [
            { name: '杭州市', customerCount: 3, projectCount: 2, projectAmount: 180, ongoingProjectAmount: 120, solutionUsage: 2, preSalesActivity: 5, budget: 180, contractAmount: 90 },
            { name: '宁波市', customerCount: 1, projectCount: 1, projectAmount: 60, ongoingProjectAmount: 30, solutionUsage: 0, preSalesActivity: 1, budget: 60, contractAmount: 20 },
          ],
          timestamp: '2026-04-09T08:00:00.000Z',
        },
      }), { status: 200 }));

    const { GET } = await import('../../../src/app/api/data-screen/region-view/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/region-view?map=zhejiang&heatmap=contract&startDate=2026-04-01&endDate=2026-04-08'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/data-screen/overview?');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/data-screen/heatmap?');
    expect(String(fetchMock.mock.calls[1][0])).toContain('mode=zhejiang');
    expect(payload.data).toMatchObject({
      filtersEcho: {
        map: 'zhejiang',
        heatmap: 'contract',
        startDate: '2026-04-01',
        endDate: '2026-04-08',
      },
      summary: {
        totalCustomers: 18,
        totalProjects: 9,
        totalRevenue: 560,
        riskProjectCount: 3,
        activeRegionCount: 2,
      },
      map: {
        mode: 'zhejiang',
        heatmap: 'contract',
        label: '中标金额',
        unit: '万',
      },
      rankings: {
        topRegions: [
          { name: '杭州市', value: 2, amount: 180 },
          { name: '宁波市', value: 1, amount: 60 },
        ],
        topRevenueRegions: [
          { name: '杭州市', value: 180, amount: 180 },
          { name: '宁波市', value: 60, amount: 60 },
        ],
      },
    });
  });

  it('returns a stable empty payload when the unified region read model fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('overview exploded'));

    const { GET } = await import('../../../src/app/api/data-screen/region-view/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/region-view?map=province-outside&heatmap=customer&startDate=2026-04-01&endDate=2026-04-08'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      filtersEcho: {
        map: 'province-outside',
        heatmap: 'customer',
        startDate: '2026-04-01',
        endDate: '2026-04-08',
      },
      summary: {
        totalCustomers: 0,
        totalProjects: 0,
      },
      map: {
        regions: [],
      },
    });
  });
});