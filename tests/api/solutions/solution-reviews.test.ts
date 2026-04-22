import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const createReview = vi.fn();
const submitReview = vi.fn();

vi.mock('@/services/solution-review.service', () => ({
  solutionReviewService: {
    getReviewList: vi.fn(),
    createReview,
    getReviewDetail: vi.fn(),
    submitReview,
  },
}));

const mockInsert = vi.fn(() => ({ values: vi.fn().mockResolvedValue([]) }));
const mockSelect = vi.fn();

vi.mock('@/db', () => ({
  db: {
    insert: mockInsert,
    select: mockSelect,
  },
}));

vi.mock('@/db/schema', () => ({
  messages: { id: 'messages.id' },
  solutions: { id: 'solutions.id', authorId: 'solutions.authorId', solutionName: 'solutions.solutionName' },
  solutionReviews: { id: 'solutionReviews.id', solutionId: 'solutionReviews.solutionId' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authenticate: vi.fn().mockResolvedValue({ id: 99, realName: '测试用户', roleId: 1 }),
}));

vi.mock('@/lib/messages/send', () => ({
  sendMessage: vi.fn().mockResolvedValue({ id: 1 }),
}));

describe('solution reviews api', () => {
  beforeEach(() => {
    createReview.mockReset();
    submitReview.mockReset();
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });
    // Default select mock: solution exists, review lookup returns solutionId, solution lookup returns authorId
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 8, authorId: 5, solutionName: '测试方案', solutionId: 8 }]),
      }),
    });
  });

  it('creates review tasks through the solution review service', async () => {
    createReview.mockResolvedValue({ id: 501, approvalRequestId: 9002, reviewStatus: 'pending' });

    const { POST } = await import('../../../src/app/api/solutions/[id]/reviews/route');
    const response = await POST(
      new NextRequest('http://localhost/api/solutions/8/reviews', {
        method: 'POST',
        body: JSON.stringify({
          reviewerId: 12,
          reviewType: 'technical',
          reviewComment: '发起评审',
        }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: '8' }) },
    );

    expect(response.status).toBe(200);
    expect(createReview).toHaveBeenCalledWith(expect.objectContaining({
      solutionId: 8,
      reviewerId: 12,
      reviewType: 'technical',
    }));
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { id: 501, approvalRequestId: 9002 },
    });
  });

  it('submits review decisions through the solution review service', async () => {
    submitReview.mockResolvedValue({ id: 501, approvalRequestId: 9002, reviewStatus: 'approved' });

    const { POST } = await import('../../../src/app/api/solutions/[id]/reviews/[reviewId]/submit/route');
    const response = await POST(
      new NextRequest('http://localhost/api/solutions/8/reviews/501/submit', {
        method: 'POST',
        body: JSON.stringify({
          reviewStatus: 'approved',
          reviewComment: '通过',
          reviewScore: 96,
        }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: '8', reviewId: '501' }) },
    );

    expect(response.status).toBe(200);
    expect(submitReview).toHaveBeenCalledWith({
      reviewId: 501,
      operatorId: 99,
      reviewStatus: 'approved',
      reviewComment: '通过',
      reviewScore: 96,
      reviewCriteria: undefined,
    });
  });
});