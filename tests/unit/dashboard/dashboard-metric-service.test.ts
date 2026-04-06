import { describe, expect, it, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {},
}));

describe('dashboard metric service', () => {
  it('fills governed project stages with zeros when counts are missing', async () => {
    const { normalizeProjectsByStage } = await import('../../../src/modules/dashboard/dashboard-metric-service');
    const result = normalizeProjectsByStage([
      { projectStage: 'bidding', count: 3 },
      { projectStage: 'solution_review', count: 1 },
    ]);

    expect(result.opportunity).toBe(0);
    expect(result.bidding).toBe(3);
    expect(result.solution_review).toBe(1);
    expect(result.contract_pending).toBe(0);
    expect(result.archived).toBe(0);
  });
});