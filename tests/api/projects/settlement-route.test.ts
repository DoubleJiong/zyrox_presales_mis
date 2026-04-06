import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const canReadProject = vi.fn();
const canWriteProject = vi.fn();

const projectsTable = {
  __table: 'projects',
  id: 'projects.id',
  deletedAt: 'projects.deletedAt',
  projectStage: 'projects.projectStage',
  status: 'projects.status',
  bidResult: 'projects.bidResult',
};

const projectSettlementsTable = {
  __table: 'projectSettlements',
  projectId: 'projectSettlements.projectId',
};

let projectRows: any[] = [];
let settlementRows: any[] = [];
let projectUpdatePayloads: Array<Record<string, unknown>> = [];
let settlementUpdatePayloads: Array<Record<string, unknown>> = [];
let settlementInsertPayloads: Array<Record<string, unknown>> = [];

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
  projectSettlements: projectSettlementsTable,
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

            return settlementRows;
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

        settlementUpdatePayloads.push(payload);
        return {
          where: vi.fn(() => ({
            returning: vi.fn(async () => [{ projectId: 11, ...payload }]),
          })),
        };
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((payload: Record<string, unknown>) => {
        settlementInsertPayloads.push(payload);
        return {
          returning: vi.fn(async () => [{ projectId: 11, ...payload }]),
        };
      }),
    })),
  },
}));

describe('project settlement route', () => {
  beforeEach(() => {
    projectRows = [];
    settlementRows = [];
    projectUpdatePayloads = [];
    settlementUpdatePayloads = [];
    settlementInsertPayloads = [];
    canReadProject.mockReset();
    canWriteProject.mockReset();
    canReadProject.mockResolvedValue(true);
    canWriteProject.mockResolvedValue(true);
  });

  it('returns a default empty settlement payload when no record exists yet', async () => {
    projectRows = [{ id: 11 }];
    settlementRows = [];

    const { GET } = await import('../../../src/app/api/projects/[id]/settlement/route');

    const response = await GET(new NextRequest('http://localhost/api/projects/11/settlement'), {
      params: { id: '11' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        projectId: 11,
        archiveStatus: 'unarchived',
        settlementAmount: null,
      },
    });
  });

  it('does not push the project into settlement stage when saving non-archived settlement data', async () => {
    projectRows = [{
      id: 11,
      projectStage: 'delivering',
      status: 'ongoing',
      bidResult: null,
    }];
    settlementRows = [{
      projectId: 11,
      settlementDate: '2026-04-03',
    }];

    const { PUT } = await import('../../../src/app/api/projects/[id]/settlement/route');

    const response = await PUT(new NextRequest('http://localhost/api/projects/11/settlement', {
      method: 'PUT',
      body: JSON.stringify({
        settlementAmount: '1000000',
        archiveStatus: 'unarchived',
      }),
      headers: { 'content-type': 'application/json' },
    }), {
      params: { id: '11' },
    });

    expect(response.status).toBe(200);
    expect(settlementInsertPayloads).toHaveLength(0);
    expect(settlementUpdatePayloads).toHaveLength(1);
    expect(projectUpdatePayloads).toHaveLength(1);
    expect(projectUpdatePayloads[0]).not.toHaveProperty('projectStage');
    expect(projectUpdatePayloads[0]).not.toHaveProperty('status');
  });

  it('archives the project and preserves won status when settlement is archived', async () => {
    projectRows = [{
      id: 11,
      projectStage: 'settlement',
      status: 'ongoing',
      bidResult: 'won',
    }];
    settlementRows = [{
      projectId: 11,
      settlementDate: '2026-04-03',
    }];

    const { PUT } = await import('../../../src/app/api/projects/[id]/settlement/route');

    const response = await PUT(new NextRequest('http://localhost/api/projects/11/settlement', {
      method: 'PUT',
      body: JSON.stringify({
        settlementAmount: '1000000',
        archiveStatus: 'archived',
      }),
      headers: { 'content-type': 'application/json' },
    }), {
      params: { id: '11' },
    });

    expect(response.status).toBe(200);
    expect(projectUpdatePayloads).toHaveLength(1);
    expect(projectUpdatePayloads[0]).toMatchObject({
      projectStage: 'archived',
      status: 'won',
    });
  });
});