import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';

/**
 * POST /api/internal/alerts/trigger-check
 *
 * Internal-only endpoint for test and development environments.
 * Synchronously executes one threshold rule scan via alertExecutor.
 *
 * Returns 404 in production.
 * Used by E2E tests (stability-sweep Test 32) to seed alert histories
 * when the table is empty, replacing the deprecated /api/alerts/check endpoint.
 */
export const POST = withAuth(async (
  request: NextRequest,
  _context: { userId: number },
) => {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { ruleId } = body;

    if (!ruleId || typeof ruleId !== 'number') {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'ruleId (number) is required' } },
        { status: 400 },
      );
    }

    const { alertExecutor } = await import('@/lib/alert-executor');
    await alertExecutor.executeThresholdRule(ruleId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[trigger-check] failed:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'trigger check failed' } },
      { status: 500 },
    );
  }
});
