import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const canWriteProject = vi.fn();
const syncSingleCustomerStats = vi.fn();

const projectsTable = {
  __table: 'projects',
  id: 'projects.id',
  deletedAt: 'projects.deletedAt',
  updatedAt: 'projects.updatedAt',
  projectTypeId: 'projects.projectTypeId',
};

const projectTypesTable = {
  __table: 'projectTypes',
  id: 'projectTypes.id',
  code: 'projectTypes.code',
  name: 'projectTypes.name',
  deletedAt: 'projectTypes.deletedAt',
};

const usersTable = {
  __table: 'users',
  id: 'users.id',
  realName: 'users.realName',
};

let projectRows: any[] = [];
let projectTypeRows: any[] = [];
let userRows: any[] = [];
let projectUpdatePayloads: Array<Record<string, unknown>> = [];

function createSelectResult(rows: any[]) {
  const result = [...rows] as any[] & { limit?: (count: number) => Promise<any[]> };
  result.limit = async () => rows;
  return result;
}

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number; params?: Record<string, string> }) => Promise<Response>) => {
    return (req: NextRequest, context?: { params?: Record<string, string> }) => handler(req, {
      userId: 1,
      params: context?.params ?? { id: '11' },
    });
  },
}));

vi.mock('@/lib/permissions/project', () => ({
  canReadProject: vi.fn(),
  canWriteProject,
  canAdminProject: vi.fn(),
}));

vi.mock('@/db/schema', () => ({
  projects: projectsTable,
  users: usersTable,
  tasks: { __table: 'tasks' },
  projectBudgetHistory: { __table: 'projectBudgetHistory' },
  projectBiddings: { __table: 'projectBiddings' },
  projectTypes: projectTypesTable,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: vi.fn((strings: TemplateStringsArray) => strings.join('')),
  and: vi.fn(),
  isNull: vi.fn(),
  or: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn((_fields?: unknown) => ({
      from: vi.fn((table: { __table: string }) => ({
        where: vi.fn(() => {
          if (table.__table === 'projects') {
            return createSelectResult(projectRows);
          }

          if (table.__table === 'projectTypes') {
            return createSelectResult(projectTypeRows);
          }

          if (table.__table === 'users') {
            return createSelectResult(userRows);
          }

          return createSelectResult([]);
        }),
      })),
    })),
    update: vi.fn((table: { __table: string }) => ({
      set: vi.fn((payload: Record<string, unknown>) => {
        if (table.__table === 'projects') {
          projectUpdatePayloads.push(payload);
        }

        return {
          where: vi.fn(() => ({
            returning: vi.fn(async () => [{ id: 11, ...payload }]),
          })),
        };
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async () => undefined),
    })),
  },
}));

vi.mock('@/lib/customer-stats', () => ({
  syncSingleCustomerStats,
}));

vi.mock('@/lib/project-results', () => ({
  buildProjectResultSyncPayload: vi.fn(),
  resolveProjectBidResult: vi.fn(),
}));

vi.mock('@/lib/xss', () => ({
  sanitizeString: (value: string) => value,
  containsHtml: vi.fn(),
}));

vi.mock('@/lib/project-customer-snapshot', () => ({
  resolveProjectCustomerSnapshot: vi.fn(),
}));

vi.mock('@/lib/utils', () => ({
  formatDateField: (value: unknown) => value,
}));

vi.mock('@/modules/project/project-stage-policy', () => ({
  isGovernedProjectStage: vi.fn(() => false),
}));

vi.mock('@/lib/idempotency', () => ({
  OptimisticLock: {
    validateVersion: vi.fn(() => true),
    createConflictError: vi.fn(() => ({ success: false })),
  },
}));

describe('project detail route', () => {
  beforeEach(() => {
    projectRows = [
      {
        id: 11,
        customerId: 8,
        customerName: '测试客户',
        projectTypeId: 1,
        projectType: 'integration',
        projectStage: 'opportunity',
        status: 'in_progress',
        bidResult: null,
        estimatedAmount: null,
        actualAmount: null,
        updatedAt: new Date('2026-04-10T08:00:00Z'),
      },
    ];
    projectTypeRows = [
      {
        id: 2,
        code: 'software',
        name: '软件',
      },
      {
        id: 3,
        code: 'integration',
        name: '集成',
      },
    ];
    userRows = [{ realName: '管理员' }];
    projectUpdatePayloads = [];
    canWriteProject.mockReset();
    canWriteProject.mockResolvedValue(true);
    syncSingleCustomerStats.mockReset();
    syncSingleCustomerStats.mockResolvedValue(undefined);
  });

  it('accepts uppercase projectType code when updating via /api/projects/[id]', async () => {
    const { PUT } = await import('../../../src/app/api/projects/[id]/route');

    const response = await PUT(new NextRequest('http://localhost/api/projects/11', {
      method: 'PUT',
      body: JSON.stringify({
        projectType: 'SOFTWARE',
      }),
      headers: { 'content-type': 'application/json' },
    }), {
      params: { id: '11' },
    });

    expect(response.status).toBe(200);
    expect(projectUpdatePayloads).toHaveLength(1);
    expect(projectUpdatePayloads[0]).toMatchObject({
      projectTypeId: 2,
      projectType: 'software',
    });
  });

  it('accepts multi-select projectTypes when updating via /api/projects/[id]', async () => {
    const { PUT } = await import('../../../src/app/api/projects/[id]/route');

    const response = await PUT(new NextRequest('http://localhost/api/projects/11', {
      method: 'PUT',
      body: JSON.stringify({
        projectTypes: ['SOFTWARE', 'integration'],
      }),
      headers: { 'content-type': 'application/json' },
    }), {
      params: { id: '11' },
    });

    expect(response.status).toBe(200);
    expect(projectUpdatePayloads).toHaveLength(1);
    expect(projectUpdatePayloads[0]).toMatchObject({
      projectTypeId: 2,
      projectType: 'software,integration',
    });
  });
});