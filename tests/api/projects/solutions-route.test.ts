import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const canReadProject = vi.fn();
const canWriteProject = vi.fn();

const solutionProjectsTable = {
  __table: 'solutionProjects',
  id: 'solutionProjects.id',
  projectId: 'solutionProjects.projectId',
  deletedAt: 'solutionProjects.deletedAt',
};

let associationRows: any[] = [];
let updatePayloads: Array<Record<string, unknown>> = [];

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number; params?: Record<string, string> }) => Promise<Response>) => {
    return (req: NextRequest, context?: { params?: Record<string, string> }) => handler(req, {
      userId: 7,
      params: context?.params ?? { id: '21', solutionId: '301' },
    });
  },
}));

vi.mock('@/lib/permissions/project', () => ({
  canReadProject,
  canWriteProject,
}));

vi.mock('@/db/schema', () => ({
  solutionProjects: solutionProjectsTable,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => associationRows),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((payload: Record<string, unknown>) => {
        updatePayloads.push(payload);
        return {
          where: vi.fn(() => ({
            returning: vi.fn(async () => [{ id: 301, projectId: 21, ...payload }]),
          })),
        };
      }),
    })),
  },
}));

describe('project solutions association route', () => {
  beforeEach(() => {
    associationRows = [];
    updatePayloads = [];
    canReadProject.mockReset();
    canWriteProject.mockReset();
    canReadProject.mockResolvedValue(true);
    canWriteProject.mockResolvedValue(true);
  });

  it('updates contribution confirmation fields through the project-side route', async () => {
    associationRows = [{
      id: 301,
      projectId: 21,
      contributionConfirmed: false,
    }];

    const { PUT } = await import('../../../src/app/api/projects/[id]/solutions/[solutionId]/route');

    const response = await PUT(new NextRequest('http://localhost/api/projects/21/solutions/301', {
      method: 'PUT',
      body: JSON.stringify({
        contributionConfirmed: true,
        contributionRatio: '35',
        estimatedValue: '88000',
        actualValue: '92000',
        winContributionScore: '8',
        feedbackScore: '4.5',
        feedbackContent: '项目侧确认方案价值',
      }),
      headers: { 'content-type': 'application/json' },
    }), {
      params: { id: '21', solutionId: '301' },
    });

    expect(response.status).toBe(200);
    expect(updatePayloads).toHaveLength(1);
    expect(updatePayloads[0]).toMatchObject({
      contributionConfirmed: true,
      contributionRatio: '0.35',
      estimatedValue: '88000',
      actualValue: '92000',
      winContributionScore: '8',
      feedbackScore: '4.5',
      feedbackContent: '项目侧确认方案价值',
      confirmedBy: 7,
    });
    expect(updatePayloads[0].confirmedAt).toBeInstanceOf(Date);
  });
});