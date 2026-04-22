/**
 * /api/alerts/check was deprecated in Phase 2 and now returns HTTP 410 Gone.
 * Scheduling is handled by pg-boss workers in alert-scheduler.ts instead.
 *
 * For test/development environments, use POST /api/internal/alerts/trigger-check
 * (src/app/api/internal/alerts/trigger-check/route.ts) to synchronously execute
 * a threshold rule scan and seed alert histories. That endpoint returns 404 in production.
 */
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 7 });
  },
}));

describe('alerts check api', () => {
  it('returns 410 Gone because the endpoint is deprecated in favour of pg-boss scheduling', async () => {
    const { POST } = await import('../../../src/app/api/alerts/check/route');
    const response = await POST(new NextRequest('http://localhost/api/alerts/check', { method: 'POST' }));

    expect(response.status).toBe(410);
  });
});