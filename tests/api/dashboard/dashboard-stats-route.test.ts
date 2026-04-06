import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getDashboardMetrics = vi.fn();
const select = vi.fn();
const from = vi.fn();
const where = vi.fn();
const groupBy = vi.fn();
const orderBy = vi.fn();
const limit = vi.fn();

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number; user: { roleCodes?: string[] } }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 1, user: { roleCodes: [] } });
  },
}));

vi.mock('@/lib/permissions/project', () => ({
  getAccessibleProjectIds: vi.fn(async () => [11, 12]),
}));

vi.mock('@/shared/policy/dashboard-policy', () => ({
  canViewGlobalDashboard: vi.fn(() => false),
}));

vi.mock('@/modules/dashboard/dashboard-metric-service', () => ({
  getDashboardMetrics,
}));

vi.mock('@/lib/api-response', async () => {
  const { NextResponse } = await import('next/server');

  return {
    successResponse: (data: unknown) => NextResponse.json({ success: true, data }),
    errorResponse: (code: string, message: string) => NextResponse.json({ success: false, error: { code, message } }, { status: 500 }),
  };
});

vi.mock('@/db', () => ({
  db: {
    select,
  },
}));

vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual<typeof import('drizzle-orm')>('drizzle-orm');

  return {
    ...actual,
    count: vi.fn(),
    and: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    sql: vi.fn((strings: TemplateStringsArray) => strings.join('')),
    desc: vi.fn(),
    isNull: vi.fn(),
    eq: vi.fn(),
    inArray: vi.fn(),
  };
});

describe('dashboard stats api', () => {
  it('returns solution metrics without legacy scheme compatibility fields', async () => {
    select
      .mockImplementationOnce(() => ({
        from: () => ({ where: async () => [{ count: 5 }] }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({ where: async () => [{ count: 8 }] }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({ where: async () => [{ count: 2 }] }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            groupBy: async () => [{
              projectStage: 'archived',
              bidResult: 'won',
              status: 'won',
              actualAmount: 0,
              estimatedAmount: 0,
            }],
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({ where: async () => [{ avg: 0 }] }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            groupBy: () => ({
              orderBy: () => ({
                limit: async () => [],
              }),
            }),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            groupBy: () => ({
              orderBy: () => ({
                limit: async () => [{ name: 'software', value: 2 }],
              }),
            }),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            groupBy: () => ({
              orderBy: () => ({
                limit: async () => [{ name: '北京市', value: 3 }],
              }),
            }),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            groupBy: () => ({
              orderBy: () => ({
                limit: async () => [{ name: '上海市', value: 1 }],
              }),
            }),
          }),
        }),
      }));

    getDashboardMetrics.mockResolvedValue({
      totalCustomers: 5,
      totalProjects: 3,
      totalSolutions: 4,
      pendingTasks: 2,
      projectsByStage: { opportunity: 1, bidding: 2 },
      recentProjects: [],
    });

    const { GET } = await import('../../../src/app/api/dashboard/stats/route');
    const response = await GET(new NextRequest('http://localhost/api/dashboard/stats'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        stats: {
          totalProjects: 3,
          totalSolutions: 4,
          pendingTasks: 2,
          projectsByStage: { opportunity: 1, bidding: 2 },
          projectTypeDistribution: [{ name: 'software', value: 2 }],
          customerRegionDistribution: [{ name: '北京', value: 3 }],
          projectRegionDistribution: [{ name: '上海', value: 1 }],
        },
      },
    });
  });
});