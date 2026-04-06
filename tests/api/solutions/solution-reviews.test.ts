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

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn().mockReturnThis(), where: vi.fn(async () => [{ id: 8 }]) })),
  },
}));

vi.mock('@/db/schema', () => ({
  solutions: { id: 'solutions.id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

describe('solution reviews api', () => {
  beforeEach(() => {
    createReview.mockReset();
    submitReview.mockReset();
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
      reviewStatus: 'approved',
      reviewComment: '通过',
      reviewScore: 96,
      reviewCriteria: undefined,
    });
  });
});