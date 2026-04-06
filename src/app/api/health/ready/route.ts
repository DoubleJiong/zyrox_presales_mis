import { NextResponse } from 'next/server';
import { checkDatabaseConnection, getPoolStatus } from '@/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const databaseReady = await checkDatabaseConnection();
  const pool = getPoolStatus();

  return NextResponse.json(
    {
      status: databaseReady ? 'ready' : 'degraded',
      service: 'presales-app',
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseReady ? 'up' : 'down',
      },
      pool,
    },
    {
      status: databaseReady ? 200 : 503,
    }
  );
}