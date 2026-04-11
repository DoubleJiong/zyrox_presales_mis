import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const canWriteProject = vi.fn();
const resolveProjectLifecycleForCreate = vi.fn();
const syncSingleCustomerStats = vi.fn();

const projectsTable = {
  __table: 'projects',
  id: 'projects.id',
  deletedAt: 'projects.deletedAt',
};

const projectTypesTable = {
  __table: 'projectTypes',
  id: 'projectTypes.id',
  code: 'projectTypes.code',
  name: 'projectTypes.name',
  deletedAt: 'projectTypes.deletedAt',
};

let projectRows: any[] = [];
let projectTypeRows: any[] = [];
let updatePayloads: Array<Record<string, unknown>> = [];

function createSelectResult(rows: any[]) {
  const result = [...rows] as any[] & { limit?: (count: number) => Promise<any[]> };
  result.limit = async () => rows;
  return result;
}

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number; user?: unknown }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 1, user: undefined });
  },
}));

vi.mock('@/lib/permissions/project', () => ({
  canWriteProject,
  canAdminProject: vi.fn(),
  getAccessibleProjectIds: vi.fn(),
}));

vi.mock('@/db/schema', () => ({
  projects: projectsTable,
  customers: { __table: 'customers' },
  projectMembers: { __table: 'projectMembers' },
  solutionProjects: { __table: 'solutionProjects' },
  users: { __table: 'users' },
  projectTypes: projectTypesTable,
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn(),
  eq: vi.fn(),
  sql: vi.fn((strings: TemplateStringsArray) => strings.join('')),
  and: vi.fn(),
  or: vi.fn(),
  inArray: vi.fn(),
  isNull: vi.fn(),
  count: vi.fn(),
  lt: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: { __table: string }) => ({
        where: vi.fn(() => {
          if (table.__table === 'projects') {
            return createSelectResult(projectRows);
          }

          if (table.__table === 'projectTypes') {
            return createSelectResult(projectTypeRows);
          }

          return createSelectResult([]);
        }),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((payload: Record<string, unknown>) => {
        updatePayloads.push(payload);
        return {
          where: vi.fn(() => ({
            returning: vi.fn(async () => [{ id: 11, ...payload }]),
          })),
        };
      }),
    })),
  },
}));

vi.mock('@/lib/customer-stats', () => ({
  syncSingleCustomerStats,
}));

vi.mock('@/lib/project-lifecycle', () => ({
  resolveProjectLifecycleForCreate,
}));

vi.mock('@/shared/policy/project-policy', () => ({
  canViewOrphanProject: vi.fn(),
  hasGlobalProjectView: vi.fn(),
}));

vi.mock('@/lib/api-response', async () => {
  const actual = await vi.importActual<typeof import('../../../src/lib/api-response')>('../../../src/lib/api-response');
  return actual;
});

vi.mock('@/lib/xss', () => ({
  sanitizeString: (value: string) => value,
  sanitizeSearchString: (value: string) => value,
}));

vi.mock('@/lib/idempotency', () => ({
  generateIdempotencyKey: vi.fn(),
  checkIdempotencyKey: vi.fn(),
  storeIdempotencyKey: vi.fn(),
  OptimisticLock: {
    validateVersion: vi.fn(() => true),
    createConflictError: vi.fn(() => ({ success: false })),
  },
}));

vi.mock('@/lib/project-customer-snapshot', () => ({
  resolveProjectCustomerSnapshot: vi.fn(async ({ customerId, customerName }) => ({
    customerId: customerId ?? 8,
    customerName: customerName ?? '测试客户',
  })),
}));

vi.mock('@/lib/project-query-filters', () => ({
  buildProjectStatusFilter: vi.fn(),
  isValidProjectStatusFilter: vi.fn(),
  VALID_PROJECT_STATUS_FILTERS: [],
}));

vi.mock('@/lib/utils/status-transitions', () => ({
  PROJECT_STAGE_ORDER: ['opportunity', 'bidding', 'execution', 'settlement', 'archived'],
}));

vi.mock('@/lib/utils', () => ({
  formatDateField: (value: unknown) => value,
}));

describe('projects route', () => {
  beforeEach(() => {
    projectRows = [
      {
        id: 11,
        customerId: 8,
        customerName: '测试客户',
        projectTypeId: 1,
        projectType: 'integration',
        projectStage: 'opportunity',
        bidResult: null,
        priority: 'medium',
        progress: 0,
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
    updatePayloads = [];
    canWriteProject.mockReset();
    canWriteProject.mockResolvedValue(true);
    resolveProjectLifecycleForCreate.mockReset();
    resolveProjectLifecycleForCreate.mockReturnValue({
      projectStage: 'opportunity',
      status: 'in_progress',
      bidResult: null,
    });
    syncSingleCustomerStats.mockReset();
    syncSingleCustomerStats.mockResolvedValue(undefined);
  });

  it('accepts uppercase projectType code when updating via /api/projects', async () => {
    const { PUT } = await import('../../../src/app/api/projects/route');

    const response = await PUT(new NextRequest('http://localhost/api/projects', {
      method: 'PUT',
      body: JSON.stringify({
        id: 11,
        projectType: 'SOFTWARE',
      }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    expect(updatePayloads).toHaveLength(1);
    expect(updatePayloads[0]).toMatchObject({
      projectTypeId: 2,
      projectType: 'software',
    });
  });

  it('accepts multi-select projectTypes when updating via /api/projects', async () => {
    const { PUT } = await import('../../../src/app/api/projects/route');

    const response = await PUT(new NextRequest('http://localhost/api/projects', {
      method: 'PUT',
      body: JSON.stringify({
        id: 11,
        projectTypes: ['SOFTWARE', 'integration'],
      }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    expect(updatePayloads).toHaveLength(1);
    expect(updatePayloads[0]).toMatchObject({
      projectTypeId: 2,
      projectType: 'software,integration',
    });
  });
});