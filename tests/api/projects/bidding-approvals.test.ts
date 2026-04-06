import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const submitBiddingInitiationApproval = vi.fn();
const approveBiddingInitiationApproval = vi.fn();
const rejectBiddingInitiationApproval = vi.fn();
const resolveOpenBiddingApprovalRequestId = vi.fn();
const listBiddingApprovalsForRoute = vi.fn();

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 1 });
  },
}));

vi.mock('@/lib/permissions/data-scope', () => ({
  getPermissionContext: vi.fn(async () => ({ accessScope: 'all' })),
}));

vi.mock('@/lib/permissions/middleware', () => ({
  hasFullAccess: vi.fn(() => true),
}));

vi.mock('@/modules/approval/approval-service', () => ({
  ApprovalServiceError: class ApprovalServiceError extends Error {
    code: string;
    status: number;

    constructor(code: string, message: string, status = 400) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
  submitBiddingInitiationApproval,
  approveBiddingInitiationApproval,
  rejectBiddingInitiationApproval,
  resolveOpenBiddingApprovalRequestId,
  listBiddingApprovalsForRoute,
}));

vi.mock('@/db', () => ({
  db: {
    query: {
      projects: {
        findFirst: vi.fn(async () => ({ id: 11, managerId: 1, projectStage: 'opportunity' })),
      },
      projectBiddings: {
        findFirst: vi.fn(async () => null),
      },
      users: {
        findMany: vi.fn(async () => []),
      },
    },
    update: vi.fn(() => ({ set: vi.fn().mockReturnThis(), where: vi.fn() })),
    insert: vi.fn(() => ({ values: vi.fn() })),
    select: vi.fn(() => ({ from: vi.fn().mockReturnThis(), leftJoin: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), orderBy: vi.fn(async () => []) })),
  },
}));

vi.mock('@/db/schema', () => ({
  projects: { id: 'projects.id', projectStage: 'projects.projectStage' },
  projectBiddings: { projectId: 'projectBiddings.projectId', id: 'projectBiddings.id', biddingType: 'projectBiddings.biddingType', bidDeadline: 'projectBiddings.bidDeadline', bidPrice: 'projectBiddings.bidPrice', bidResult: 'projectBiddings.bidResult' },
  users: { id: 'users.id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}));

describe('bidding approvals api', () => {
  beforeEach(() => {
    submitBiddingInitiationApproval.mockReset();
    approveBiddingInitiationApproval.mockReset();
    rejectBiddingInitiationApproval.mockReset();
    resolveOpenBiddingApprovalRequestId.mockReset();
    listBiddingApprovalsForRoute.mockReset();
  });

  it('submits bid initiation through the unified approval service', async () => {
    submitBiddingInitiationApproval.mockResolvedValue({
      approvalRequestId: 9001,
      projectId: 11,
      status: 'submitted',
    });

    const { POST } = await import('../../../src/app/api/biddings/approvals/route');

    const response = await POST(new NextRequest('http://localhost/api/biddings/approvals', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 11,
        approvalType: 'bid_initiation',
        details: { comment: '进入投标立项' },
      }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    expect(submitBiddingInitiationApproval).toHaveBeenCalledWith({
      projectId: 11,
      initiatorId: 1,
      comment: '进入投标立项',
    });
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        approvalRequestId: 9001,
        projectId: 11,
      },
    });
  });

  it('approves by approvalRequestId through the unified approval service', async () => {
    approveBiddingInitiationApproval.mockResolvedValue({
      approvalRequestId: 9001,
      projectId: 11,
      status: 'approved',
    });

    const { PUT } = await import('../../../src/app/api/biddings/approvals/route');

    const response = await PUT(new NextRequest('http://localhost/api/biddings/approvals', {
      method: 'PUT',
      body: JSON.stringify({
        approvalRequestId: 9001,
        action: 'approve',
        comment: '同意',
      }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    expect(approveBiddingInitiationApproval).toHaveBeenCalledWith({
      approvalRequestId: 9001,
      operatorId: 1,
      comment: '同意',
    });
  });
});