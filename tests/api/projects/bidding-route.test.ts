import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const canReadProject = vi.fn();
const canWriteProject = vi.fn();

const projectsTable = {
  __table: 'projects',
  id: 'projects.id',
  deletedAt: 'projects.deletedAt',
  status: 'projects.status',
  bidResult: 'projects.bidResult',
  winCompetitor: 'projects.winCompetitor',
  loseReason: 'projects.loseReason',
  lessonsLearned: 'projects.lessonsLearned',
};

const projectBiddingsTable = {
  __table: 'projectBiddings',
  projectId: 'projectBiddings.projectId',
};

let projectRows: any[] = [];
let biddingRows: any[] = [];
let projectUpdatePayloads: Array<Record<string, unknown>> = [];
let biddingUpdatePayloads: Array<Record<string, unknown>> = [];
let biddingInsertPayloads: Array<Record<string, unknown>> = [];

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number; params?: Record<string, string> }) => Promise<Response>) => {
    return (req: NextRequest, context?: { params?: Record<string, string> }) => handler(req, {
      userId: 1,
      params: context?.params ?? { id: '11' },
    });
  },
}));

vi.mock('@/lib/permissions/project', () => ({
  canReadProject,
  canWriteProject,
}));

vi.mock('@/db/schema', () => ({
  projects: projectsTable,
  projectBiddings: projectBiddingsTable,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: { __table: string }) => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => {
            if (table.__table === 'projects') {
              return projectRows;
            }

            return biddingRows;
          }),
        })),
      })),
    })),
    update: vi.fn((table: { __table: string }) => ({
      set: vi.fn((payload: Record<string, unknown>) => {
        if (table.__table === 'projects') {
          projectUpdatePayloads.push(payload);
          return {
            where: vi.fn(async () => undefined),
          };
        }

        biddingUpdatePayloads.push(payload);
        return {
          where: vi.fn(() => ({
            returning: vi.fn(async () => [{ projectId: 11, ...payload }]),
          })),
        };
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((payload: Record<string, unknown>) => {
        biddingInsertPayloads.push(payload);
        return {
          returning: vi.fn(async () => [{ projectId: 11, ...payload }]),
        };
      }),
    })),
  },
}));

describe('project bidding route', () => {
  beforeEach(() => {
    projectRows = [];
    biddingRows = [];
    projectUpdatePayloads = [];
    biddingUpdatePayloads = [];
    biddingInsertPayloads = [];
    canReadProject.mockReset();
    canWriteProject.mockReset();
    canReadProject.mockResolvedValue(true);
    canWriteProject.mockResolvedValue(true);
  });

  it('prefers the parent archived result over stale bidding data when reading', async () => {
    projectRows = [{
      id: 11,
      status: 'won',
      bidResult: 'won',
      winCompetitor: null,
      loseReason: null,
      lessonsLearned: '复盘',
    }];
    biddingRows = [{
      projectId: 11,
      bidResult: 'pending',
      loseReason: null,
      winCompetitor: null,
      lessonsLearned: null,
    }];

    const { GET } = await import('../../../src/app/api/projects/[id]/bidding/route');

    const response = await GET(new NextRequest('http://localhost/api/projects/11/bidding'), {
      params: { id: '11' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        bidResult: 'won',
        lessonsLearned: '复盘',
      },
    });
  });

  it('keeps archived won state when later bidding edits omit bidResult', async () => {
    projectRows = [{
      id: 11,
      status: 'won',
      bidResult: 'won',
      winCompetitor: null,
      loseReason: null,
    }];
    biddingRows = [{
      projectId: 11,
      bidResult: 'pending',
      bidNumber: 'OLD-BID',
    }];

    const { PUT } = await import('../../../src/app/api/projects/[id]/bidding/route');

    const response = await PUT(new NextRequest('http://localhost/api/projects/11/bidding', {
      method: 'PUT',
      body: JSON.stringify({
        bidNumber: 'NEW-BID',
        bidPrice: '880000',
      }),
      headers: { 'content-type': 'application/json' },
    }), {
      params: { id: '11' },
    });

    expect(response.status).toBe(200);
    expect(biddingInsertPayloads).toHaveLength(0);
    expect(biddingUpdatePayloads).toHaveLength(1);
    expect(projectUpdatePayloads).toHaveLength(1);
    expect(projectUpdatePayloads[0]).toMatchObject({
      bidResult: 'won',
      projectStage: 'archived',
      status: 'won',
      winCompetitor: null,
      loseReason: null,
    });
  });
});