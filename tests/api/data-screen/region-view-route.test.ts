import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Chainable DB mock — returns configurable results per call sequence
// ---------------------------------------------------------------------------
type Rows = Record<string, unknown>[];
let dbCallResults: Rows[] = [];
let dbCallIndex = 0;
let dbExecuteResults: Rows[] = [];
let dbExecuteIndex = 0;

function nextRows(): Rows {
  return dbCallResults[dbCallIndex++] ?? [];
}

function makeChain(rows: Rows): object {
  const thenFn = (resolve: (v: Rows) => void) => Promise.resolve(rows).then(resolve);
  const handler: ProxyHandler<object> = {
    get(_: object, prop: string | symbol) {
      if (prop === 'then') return thenFn;
      if (prop === Symbol.iterator) return rows[Symbol.iterator].bind(rows);
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

const selectMock = vi.fn(() => makeChain(nextRows()));
const executeMock = vi.fn(() => Promise.resolve(dbExecuteResults[dbExecuteIndex++] ?? []));

vi.mock('@/db', () => ({
  db: {
    select: selectMock,
    execute: executeMock,
  },
}));

vi.mock('@/db/schema', () => ({
  projects: {
    id: 'p.id', deletedAt: 'p.deletedAt', projectStage: 'p.stage', region: 'p.region',
    industry: 'p.industry', projectType: 'p.type', estimatedAmount: 'p.estAmt',
    actualAmount: 'p.actAmt', bidResult: 'p.bidResult', contractAmount: 'p.contractAmt',
    contractingCompanyId: 'p.contractingCompanyId', projectName: 'p.name',
  },
  customers: { deletedAt: 'c.deletedAt', region: 'c.region' },
  subsidiaries: { id: 's.id', subsidiaryName: 's.subsidiaryName', deletedAt: 's.deletedAt', status: 's.status' },
  projectPresalesRecords: { projectId: 'ppr.projectId', totalWorkHours: 'ppr.hours', deletedAt: 'ppr.deletedAt' },
}));

vi.mock('@/lib/permissions', () => ({
  PERMISSIONS: { DATASCREEN_VIEW: 'datascreen:view' },
}));

vi.mock('drizzle-orm', () => ({
  sql: vi.fn((strings: TemplateStringsArray, ...vals: unknown[]) => ({ _sql: strings.join('?'), _vals: vals })),
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  not: vi.fn(),
  isNull: vi.fn(),
  inArray: vi.fn(),
  count: vi.fn(() => 0),
  sum: vi.fn(() => null),
}));

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>, _opts?: unknown) => {
    return (req: NextRequest) => handler(req, { userId: 7 });
  },
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown) =>
    new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'content-type': 'application/json' } }),
  errorResponse: (code: string, msg: string, opts?: { status?: number }) =>
    new Response(JSON.stringify({ success: false, error: { code, message: msg } }), { status: opts?.status ?? 500 }),
}));

describe('data-screen region-view route', () => {
  beforeEach(() => {
    vi.resetModules();
    selectMock.mockClear();
    executeMock.mockClear();
    dbCallIndex = 0;
    dbExecuteIndex = 0;
    // Default: all queries return empty arrays
    dbCallResults = Array.from({ length: 20 }, () => []);
    dbExecuteResults = Array.from({ length: 5 }, () => []);
    // Inject stub minimal data for first two queries (customerCount, kpiAgg)
    dbCallResults[0] = [{ count: 5 }];
    dbCallResults[1] = [{ totalProjects: 3, opportunityAmount: '10000000', wonAmount: '5000000', contractAmount: '7000000', wonCount: '2', bidCount: '4' }];
    // presalesHours
    dbCallResults[2] = [{ total: '80' }];
    // contractCount
    dbCallResults[3] = [{ cnt: 2 }];
  });

  it('returns regional KPI summary when DB queries succeed', async () => {
    const { GET } = await import('../../../src/app/api/data-screen/region-view/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/region-view'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    // Verify KPI shape
    expect(payload.data.kpi).toMatchObject({
      totalCustomers: 5,
      totalProjects: 3,
      winRate: 50,        // 2 won / 4 bids = 50%
      presalesHours: 80,
      totalContracts: 2,
    });
    // Verify structural completeness
    expect(payload.data).toHaveProperty('stageDistribution');
    expect(payload.data).toHaveProperty('industryDistribution');
    expect(payload.data).toHaveProperty('projectTypeScatter');
    expect(payload.data).toHaveProperty('regionMap');
    expect(payload.data).toHaveProperty('funnelData');
    expect(payload.data).toHaveProperty('projectList');
    expect(payload.data).toHaveProperty('subsidiaryStats');
    expect(payload.data).toHaveProperty('monthlyTrend');
    expect(payload.data).toHaveProperty('presalesService');
  });

  it('returns 500 when the DB throws an error', async () => {
    selectMock.mockImplementationOnce(() => { throw new Error('DB connection failed'); });

    const { GET } = await import('../../../src/app/api/data-screen/region-view/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/region-view'));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('INTERNAL_ERROR');
  });
});