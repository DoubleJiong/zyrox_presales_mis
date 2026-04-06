import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.useFakeTimers();
vi.setSystemTime(new Date('2026-04-06T08:00:00.000Z'));

const selectMock = vi.fn();
const countMock = vi.fn(() => ({ type: 'count' }));
const descMock = vi.fn((value: unknown) => ({ type: 'desc', value }));
const eqMock = vi.fn((left: unknown, right: unknown) => ({ type: 'eq', left, right }));
const isNullMock = vi.fn((field: unknown) => ({ type: 'isNull', field }));
const sqlMock = vi.fn((strings: TemplateStringsArray) => ({ text: strings.join('?') }));

function queueSelectResult(
  result: unknown,
  options: { finalMethod: 'where' | 'groupBy' | 'limit'; leftJoins?: number } = { finalMethod: 'where' },
) {
  const chain: Record<string, any> = {};
  chain.from = vi.fn(() => chain);
  chain.leftJoin = vi.fn(() => chain);

  if (options.finalMethod === 'where') {
    chain.where = vi.fn().mockResolvedValue(result);
  } else {
    chain.where = vi.fn(() => chain);
  }

  if (options.finalMethod === 'groupBy') {
    chain.groupBy = vi.fn().mockResolvedValue(result);
  } else {
    chain.groupBy = vi.fn(() => chain);
  }

  if (options.finalMethod === 'limit') {
    chain.orderBy = vi.fn(() => chain);
    chain.limit = vi.fn().mockResolvedValue(result);
  } else {
    chain.orderBy = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
  }

  selectMock.mockImplementationOnce(() => chain);
  return chain;
}

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 7 });
  },
}));

vi.mock('@/db', () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock('@/db/schema', () => ({
  customers: {
    deletedAt: 'customers.deletedAt',
    region: 'customers.region',
  },
  projects: {
    id: 'projects.id',
    projectName: 'projects.projectName',
    region: 'projects.region',
    deletedAt: 'projects.deletedAt',
    bidResult: 'projects.bidResult',
    actualAmount: 'projects.actualAmount',
    estimatedAmount: 'projects.estimatedAmount',
    createdAt: 'projects.createdAt',
    customerId: 'projects.customerId',
    projectStage: 'projects.projectStage',
    updatedAt: 'projects.updatedAt',
    status: 'projects.status',
  },
  solutions: {
    deletedAt: 'solutions.deletedAt',
  },
  users: {
    status: 'users.status',
    deletedAt: 'users.deletedAt',
  },
  projectOpportunities: {
    projectId: 'projectOpportunities.projectId',
    opportunityStage: 'projectOpportunities.opportunityStage',
    expectedAmount: 'projectOpportunities.expectedAmount',
    winProbability: 'projectOpportunities.winProbability',
    expectedCloseDate: 'projectOpportunities.expectedCloseDate',
    riskAssessment: 'projectOpportunities.riskAssessment',
    nextActionDate: 'projectOpportunities.nextActionDate',
  },
  projectBiddings: {
    projectId: 'projectBiddings.projectId',
    bidDeadline: 'projectBiddings.bidDeadline',
  },
}));

vi.mock('drizzle-orm', () => ({
  count: countMock,
  desc: descMock,
  eq: eqMock,
  isNull: isNullMock,
  sql: sqlMock,
}));

vi.mock('@/lib/project-reporting', () => ({
  aggregateProjectLifecycleRows: (rows: Array<{ projectStage: string | null; bidResult: string | null; count: number }>) => rows.map((row) => ({
    status: row.bidResult === 'won' ? 'won' : row.projectStage === 'opportunity' ? 'lead' : 'in_progress',
    count: row.count,
  })),
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown, options?: { status?: number }) => NextResponse.json({ success: true, data }, { status: options?.status ?? 200 }),
  errorResponse: (code: string, message: string, status = 500) => NextResponse.json({ success: false, error: code, message }, { status }),
}));

describe('data-screen overview route', () => {
  beforeEach(() => {
    vi.resetModules();
    selectMock.mockReset();
    countMock.mockClear();
    descMock.mockClear();
    eqMock.mockClear();
    isNullMock.mockClear();
    sqlMock.mockClear();
  });

  it('returns governed funnel and risk summary data for the cockpit', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const inTwoDays = new Date(today);
    inTwoDays.setDate(today.getDate() + 2);
    const inFiveDays = new Date(today);
    inFiveDays.setDate(today.getDate() + 5);
    const staleDate = new Date(today);
    staleDate.setDate(today.getDate() - 20);

    queueSelectResult([{ count: 12 }], { finalMethod: 'where' });
    queueSelectResult([{ count: 7 }], { finalMethod: 'where' });
    queueSelectResult([{ count: 5 }], { finalMethod: 'where' });
    queueSelectResult([{ count: 9 }], { finalMethod: 'where' });
    queueSelectResult([{ total: '600' }], { finalMethod: 'where' });
    queueSelectResult([
      { region: '浙江', count: 4, amount: '1800' },
      { region: '江苏', count: 2, amount: '5200' },
      { region: '上海', count: 9, amount: '600' },
    ], { finalMethod: 'groupBy' });
    queueSelectResult([{ count: 1 }], { finalMethod: 'where' });
    queueSelectResult([{ region: '浙江', count: 3 }], { finalMethod: 'groupBy' });
    queueSelectResult([
      {
        projectId: 101,
        projectName: '政企专网一期',
        region: '浙江',
        projectStage: 'opportunity',
        bidResult: null,
        estimatedAmount: '1000',
        actualAmount: null,
        projectUpdatedAt: staleDate,
        opportunityStage: 'proposal',
        expectedAmount: '1000',
        winProbability: 20,
        expectedCloseDate: inFiveDays,
        riskAssessment: '高风险：客户预算未锁定',
        nextActionDate: yesterday,
        bidDeadline: null,
      },
      {
        projectId: 102,
        projectName: '算力中心扩容',
        region: '浙江',
        projectStage: 'bidding',
        bidResult: null,
        estimatedAmount: '800',
        actualAmount: null,
        projectUpdatedAt: today,
        opportunityStage: 'negotiation',
        expectedAmount: '800',
        winProbability: 30,
        expectedCloseDate: inFiveDays,
        riskAssessment: '',
        nextActionDate: null,
        bidDeadline: inTwoDays,
      },
      {
        projectId: 103,
        projectName: '教育云平台',
        region: '江苏',
        projectStage: 'opportunity',
        bidResult: null,
        estimatedAmount: '500',
        actualAmount: null,
        projectUpdatedAt: today,
        opportunityStage: 'qualified',
        expectedAmount: '500',
        winProbability: 70,
        expectedCloseDate: inFiveDays,
        riskAssessment: '',
        nextActionDate: inFiveDays,
        bidDeadline: null,
      },
      {
        projectId: 105,
        projectName: '园区网改造',
        region: '上海',
        projectStage: 'opportunity',
        bidResult: null,
        estimatedAmount: '200',
        actualAmount: null,
        projectUpdatedAt: today,
        opportunityStage: 'qualified',
        expectedAmount: '200',
        winProbability: null,
        expectedCloseDate: inFiveDays,
        riskAssessment: '',
        nextActionDate: inFiveDays,
        bidDeadline: null,
      },
      {
        projectId: 104,
        projectName: '政务外网改造',
        region: '浙江',
        projectStage: 'archived',
        bidResult: 'won',
        estimatedAmount: '600',
        actualAmount: '600',
        projectUpdatedAt: today,
        opportunityStage: null,
        expectedAmount: null,
        winProbability: null,
        expectedCloseDate: null,
        riskAssessment: null,
        nextActionDate: null,
        bidDeadline: null,
      },
    ], { finalMethod: 'where' });
    queueSelectResult([{ total: '600' }], { finalMethod: 'where' });
    queueSelectResult([{ total: '900' }], { finalMethod: 'where' });
    queueSelectResult([
      { month: '2026-02', customers: 2, projects: 3, actualRevenue: 100, estimatedRevenue: 120 },
      { month: '2026-03', customers: 3, projects: 4, actualRevenue: 150, estimatedRevenue: 170 },
    ], { finalMethod: 'limit' });
    queueSelectResult([
      { stage: 'opportunity', count: 2 },
      { stage: 'bidding', count: 1 },
    ], { finalMethod: 'groupBy' });
    queueSelectResult([
      { projectStage: 'opportunity', bidResult: null, status: 'draft', count: 3, totalAmount: '2300', actualAmount: '0' },
      { projectStage: 'archived', bidResult: 'won', status: 'completed', count: 1, totalAmount: '600', actualAmount: '600' },
    ], { finalMethod: 'groupBy' });

    const { GET } = await import('../../../src/app/api/data-screen/overview/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/overview?refresh=true'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.funnel).toMatchObject({
      totalOpenCount: 4,
      totalOpenAmount: 2500,
      weightedPipeline: 790,
      avgWinProbability: 40,
      missingWinProbabilityCount: 1,
    });
    expect(payload.data.funnel.stages).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'qualified', count: 2, amount: 700, weightedAmount: 350 }),
      expect.objectContaining({ key: 'proposal', count: 1, amount: 1000, weightedAmount: 200 }),
      expect.objectContaining({ key: 'negotiation', count: 1, amount: 800, weightedAmount: 240 }),
      expect.objectContaining({ key: 'won', count: 1, amount: 600 }),
    ]));
    expect(payload.data.riskSummary).toMatchObject({
      total: 2,
      high: 2,
      overdueActions: 1,
      overdueBids: 0,
      staleProjects: 1,
      dueThisWeek: 1,
    });
    expect(payload.data.riskSummary.items[0]).toEqual(expect.objectContaining({
      projectId: 101,
      riskLevel: 'high',
    }));
    expect(payload.data.forecastSummary).toMatchObject({
      targetBasis: 'rolling_90d_run_rate',
      targetAmount: 300,
      currentWonAmount: 600,
      forecastAmount: 1040,
      weightedOpenAmount: 440,
      gapAmount: 0,
      coverageRate: 347,
      averageWinProbability: 40,
      requiredNewOpportunityAmount: 0,
      confidence: 'on-track',
    });
    expect(payload.data.topRegions.map((item: { name: string }) => item.name).slice(0, 3)).toEqual(['上海', '浙江', '江苏']);
    expect(payload.data.topRevenueRegions.map((item: { name: string }) => item.name).slice(0, 3)).toEqual(['江苏', '浙江', '上海']);
  });
});