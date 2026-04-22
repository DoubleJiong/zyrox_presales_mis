import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';

/**
 * POST /api/alerts/check  -- DEPRECATED
 *
 * Alert scheduling is now handled by pg-boss cron workers registered
 * in src/lib/alert-scheduler.ts.
 */
export const POST = withAuth(async (
  _request: NextRequest,
  _context: { userId: number }
) => {
  return NextResponse.json(
    {
      error: 'DEPRECATED',
      message: 'Manual alert checks are no longer supported. Alerts are driven by pg-boss cron jobs.',
      hint: 'Use POST /api/internal/alerts/scheduler to re-register cron jobs.',
    },
    { status: 410 },
  );
});

/**
 * GET /api/alerts/check  -- DEPRECATED
 */
export const GET = withAuth(async (
  _request: NextRequest,
  _context: { userId: number }
) => {
  return NextResponse.json(
    {
      error: 'DEPRECATED',
      message: 'This endpoint is deprecated. Alert scheduling is driven by pg-boss.',
    },
    { status: 410 },
  );
});