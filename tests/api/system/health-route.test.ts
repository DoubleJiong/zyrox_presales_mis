import { describe, expect, it, beforeEach, vi } from 'vitest';

const checkDatabaseConnection = vi.fn();
const getPoolStatus = vi.fn();

vi.mock('@/db', () => ({
  checkDatabaseConnection,
  getPoolStatus,
}));

describe('health api', () => {
  beforeEach(() => {
    vi.resetModules();
    checkDatabaseConnection.mockReset();
    getPoolStatus.mockReset();
  });

  it('returns liveness payload', async () => {
    const { GET } = await import('../../../src/app/api/health/route');
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'alive',
      service: 'presales-app',
    });
  });

  it('returns readiness payload when database is up', async () => {
    checkDatabaseConnection.mockResolvedValue(true);
    getPoolStatus.mockReturnValue({ total: 4, idle: 3, waiting: 0 });

    const { GET } = await import('../../../src/app/api/health/ready/route');
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ready',
      checks: { database: 'up' },
      pool: { total: 4, idle: 3, waiting: 0 },
    });
  });

  it('returns degraded readiness payload when database is down', async () => {
    checkDatabaseConnection.mockResolvedValue(false);
    getPoolStatus.mockReturnValue({ total: 0, idle: 0, waiting: 0 });

    const { GET } = await import('../../../src/app/api/health/ready/route');
    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: 'degraded',
      checks: { database: 'down' },
    });
  });
});