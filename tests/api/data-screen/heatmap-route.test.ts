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
  errorResponse: (code: string, message: string, status = 500) => NextResponse.json({ success: false, error: code, message }, { status }),
}));

describe('data-screen heatmap route', () => {
  beforeEach(() => {
    vi.resetModules();
    executeMock.mockReset();
    sqlMock.mockClear();
  });

  it('derives open-project and won-contract amounts from governed lifecycle buckets', async () => {
    executeMock
      .mockResolvedValueOnce([
        { name: '浙江', customerCount: 3 },
      ])
      .mockResolvedValueOnce([
        { name: '浙江', projectStage: 'opportunity', bidResult: 'pending', status: 'draft', count: 1, totalAmount: 100, actualAmount: 0 },
        { name: '浙江', projectStage: 'delivering', bidResult: 'pending', status: 'in_progress', count: 2, totalAmount: 300, actualAmount: 0 },
        { name: '浙江', projectStage: 'archived', bidResult: 'won', status: 'won', count: 1, totalAmount: 400, actualAmount: 350 },
        { name: '浙江', projectStage: 'archived', bidResult: 'lost', status: 'lost', count: 1, totalAmount: 500, actualAmount: 0 },
      ])
      .mockResolvedValueOnce([
        { name: '浙江', projectStage: 'opportunity', bidResult: 'pending', status: 'draft', count: 1, totalAmount: 100, actualAmount: 0 },
        { name: '浙江', projectStage: 'delivering', bidResult: 'pending', status: 'in_progress', count: 2, totalAmount: 300, actualAmount: 0 },
        { name: '浙江', projectStage: 'archived', bidResult: 'won', status: 'won', count: 1, totalAmount: 400, actualAmount: 350 },
        { name: '浙江', projectStage: 'archived', bidResult: 'lost', status: 'lost', count: 1, totalAmount: 500, actualAmount: 0 },
      ]);

    const { GET } = await import('../../../src/app/api/data-screen/heatmap/route');

    const projectResponse = await GET(new NextRequest('http://localhost/api/data-screen/heatmap?mode=project'));
    const projectPayload = await projectResponse.json();
    const zhejiangProject = projectPayload.data.regions.find((region: { name: string }) => region.name === '浙江');

    expect(projectResponse.status).toBe(200);
    expect(zhejiangProject).toMatchObject({
      name: '浙江',
      customerCount: 3,
      projectCount: 5,
      projectAmount: 1300,
      ongoingProjectAmount: 400,
    });

    const contractResponse = await GET(new NextRequest('http://localhost/api/data-screen/heatmap?mode=contract'));
    const contractPayload = await contractResponse.json();
    const zhejiangContract = contractPayload.data.regions.find((region: { name: string }) => region.name === '浙江');

    expect(contractResponse.status).toBe(200);
    expect(zhejiangContract).toMatchObject({
      name: '浙江',
      contractAmount: 350,
    });
  });
});