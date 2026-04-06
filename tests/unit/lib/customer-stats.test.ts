import { describe, expect, it } from 'vitest';

import { summarizeCustomerProjectStats } from '@/lib/customer-stats';

describe('customer stats summarization', () => {
  it('counts active projects by governed lifecycle and only sums won project amounts', () => {
    expect(
      summarizeCustomerProjectStats([
        { projectStage: 'opportunity', bidResult: null, status: 'lead', amount: '100' },
        { projectStage: 'bidding', bidResult: null, status: 'in_progress', amount: '200' },
        { projectStage: 'archived', bidResult: 'won', status: 'won', amount: '300' },
        { projectStage: 'archived', bidResult: 'lost', status: 'lost', amount: '50' },
        { projectStage: 'cancelled', bidResult: null, status: 'cancelled', amount: '25' },
      ])
    ).toEqual({
      totalAmount: '300.00',
      maxProjectAmount: '300.00',
      currentProjectCount: 2,
    });
  });

  it('keeps won-only amounts at zero when the customer has no won projects', () => {
    expect(
      summarizeCustomerProjectStats([
        { projectStage: 'opportunity', bidResult: null, status: 'lead', amount: '100' },
        { projectStage: 'bidding', bidResult: 'pending', status: 'in_progress', amount: '200' },
        { projectStage: 'archived', bidResult: 'lost', status: 'lost', amount: '500' },
      ])
    ).toEqual({
      totalAmount: '0.00',
      maxProjectAmount: '0.00',
      currentProjectCount: 2,
    });
  });
});