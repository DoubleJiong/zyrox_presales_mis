import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const executeMock = vi.fn();
const sqlMock = vi.fn((strings: TemplateStringsArray) => ({ text: strings.join('?') }));

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 7 });
  },
}));

vi.mock('@/db', () => ({
  db: {
    execute: executeMock,
  },
}));

vi.mock('drizzle-orm', () => ({
  sql: sqlMock,
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown, options?: { status?: number }) => NextResponse.json({ success: true, data }, { status: options?.status ?? 200 }),
  errorResponse: (code: string, message: string, options?: { status?: number }) => NextResponse.json({ success: false, error: { code, message } }, { status: options?.status ?? 500 }),
}));

describe('data-screen region-detail route', () => {
  beforeEach(() => {
    vi.resetModules();
    executeMock.mockReset();
    sqlMock.mockClear();
  });

  it('returns a unified region drilldown payload for the selected region', async () => {
    executeMock
      .mockResolvedValueOnce([{ count: 6 }])
      .mockResolvedValueOnce([{ projectCount: 4, projectAmount: 1800000, contractAmount: 950000, wonCount: 2 }])
      .mockResolvedValueOnce([{ riskCount: 3, highRiskCount: 1 }])
      .mockResolvedValueOnce([{ count: 5 }])
      .mockResolvedValueOnce([{ total: 7 }])
      .mockResolvedValueOnce([{ total: 9 }])
      .mockResolvedValueOnce([
        { id: 10, customerName: '浙江大学', status: 'active', totalAmount: 800000, currentProjectCount: 2, lastInteractionTime: '2026-04-08T10:00:00.000Z', address: '浙江省杭州市西湖区' },
      ])
      .mockResolvedValueOnce([
        { projectId: 21, projectName: '智算中心建设', customerName: '浙江大学', projectStage: 'execution', status: 'ongoing', estimatedAmount: 1200000, actualAmount: 450000, managerName: '李工' },
      ])
      .mockResolvedValueOnce([
        { id: 31, projectId: 21, projectName: '智算中心建设', riskLevel: 'high', riskDescription: '招标窗口收紧', status: 'active' },
      ])
      .mockResolvedValueOnce([
        { userId: 41, realName: '王工', position: '售前经理', projectCount: 3 },
      ]);

    const { GET } = await import('../../../src/app/api/data-screen/region-detail/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/region-detail?region=杭州市&map=zhejiang&heatmap=contract&startDate=2026-04-01&endDate=2026-04-08'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(executeMock).toHaveBeenCalledTimes(10);
    expect(payload.data).toMatchObject({
      filtersEcho: {
        region: '杭州市',
        map: 'zhejiang',
        heatmap: 'contract',
      },
      summary: {
        customerCount: 6,
        projectCount: 4,
        riskCount: 3,
        activeStaffCount: 5,
        solutionUsage: 7,
        preSalesActivity: 9,
      },
      customerSnapshot: {
        items: [
          {
            id: 10,
            name: '浙江大学',
          },
        ],
      },
      projectSnapshot: {
        wonCount: 2,
        items: [
          {
            id: 21,
            name: '智算中心建设',
          },
        ],
      },
      riskSnapshot: {
        items: [
          {
            id: 31,
            projectName: '智算中心建设',
          },
        ],
      },
      collaborationSnapshot: {
        items: [
          {
            userId: 41,
            realName: '王工',
          },
        ],
      },
    });
  });

  it('rejects requests without a region parameter', async () => {
    const { GET } = await import('../../../src/app/api/data-screen/region-detail/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/region-detail?map=province-outside'));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
  });
});