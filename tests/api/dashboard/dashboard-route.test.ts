import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getDashboardMetrics = vi.fn();

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

describe('dashboard api', () => {
  it('returns unified solution and project-stage metrics', async () => {
    getDashboardMetrics.mockResolvedValue({
      totalCustomers: 5,
      totalProjects: 3,
      totalSolutions: 4,
      pendingTasks: 2,
      projectsByStage: { opportunity: 1, bidding: 2 },
      recentProjects: [],
    });

    const { GET } = await import('../../../src/app/api/dashboard/route');
    const response = await GET(new NextRequest('http://localhost/api/dashboard'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      totalCustomers: 5,
      totalProjects: 3,
      totalSolutions: 4,
      pendingTasks: 2,
      projectsByStage: { opportunity: 1, bidding: 2 },
    });
  });
});