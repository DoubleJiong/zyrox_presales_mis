import { describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const executeAllRules = vi.fn();

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 7 });
  },
}));

vi.mock('@/lib/alert-executor', () => ({
  alertExecutor: {
    executeAllRules,
  },
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown) => NextResponse.json({ success: true, data }),
  errorResponse: (code: string, message: string, options?: { status?: number; details?: unknown }) =>
    NextResponse.json({ success: false, error: { code, message, details: options?.details } }, { status: options?.status ?? 500 }),
}));

describe('alerts check api', () => {
  it('returns executor results for a real alert check run', async () => {
    executeAllRules.mockResolvedValue({
      rulesChecked: 2,
      alertsCreated: 3,
      results: [
        { ruleId: 11, ruleName: '项目长期未更新', alertsCreated: 2 },
        { ruleId: 12, ruleName: '客户长期未跟进', alertsCreated: 1 },
      ],
    });

    const { POST } = await import('../../../src/app/api/alerts/check/route');
    const response = await POST(new NextRequest('http://localhost/api/alerts/check', { method: 'POST' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        rulesChecked: 2,
        alertsCreated: 3,
      },
    });
    expect(executeAllRules).toHaveBeenCalledTimes(1);
  });
});