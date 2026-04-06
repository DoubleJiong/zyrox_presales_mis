import { describe, expect, it } from 'vitest';

import {
  aggregateProjectLifecycleRows,
  isProjectLifecycleOpenForAlerts,
  resolveProjectLifecycleBucket,
  summarizeProjectLifecycle,
} from '@/lib/project-reporting';

describe('project reporting lifecycle aggregation', () => {
  it('maps governed stage and bid result rows into compatibility buckets', () => {
    expect(resolveProjectLifecycleBucket({ projectStage: 'opportunity', status: 'lead' })).toBe('lead');
    expect(resolveProjectLifecycleBucket({ projectStage: 'delivery_preparing', status: 'in_progress' })).toBe('in_progress');
    expect(resolveProjectLifecycleBucket({ projectStage: 'archived', bidResult: 'won', status: 'archived' })).toBe('won');
    expect(resolveProjectLifecycleBucket({ projectStage: 'archived', bidResult: 'lost', status: 'archived' })).toBe('lost');
    expect(resolveProjectLifecycleBucket({ projectStage: 'cancelled', status: 'cancelled' })).toBe('cancelled');
  });

  it('aggregates lifecycle counts and amounts from governed rows', () => {
    const rows = aggregateProjectLifecycleRows([
      { projectStage: 'opportunity', status: 'lead', count: 2, totalAmount: '1000' },
      { projectStage: 'bidding', status: 'in_progress', count: 3, totalAmount: '2500' },
      { projectStage: 'archived', bidResult: 'won', status: 'won', count: 1, totalAmount: '500', actualAmount: '450' },
      { projectStage: 'archived', bidResult: 'lost', status: 'lost', count: 1, totalAmount: '300' },
      { projectStage: 'cancelled', status: 'cancelled', count: 1, totalAmount: '200' },
    ]);

    expect(rows).toEqual([
      { status: 'lead', count: 2, totalAmount: 1000, actualAmount: 0 },
      { status: 'in_progress', count: 3, totalAmount: 2500, actualAmount: 0 },
      { status: 'won', count: 1, totalAmount: 500, actualAmount: 450 },
      { status: 'lost', count: 1, totalAmount: 300, actualAmount: 0 },
      { status: 'cancelled', count: 1, totalAmount: 200, actualAmount: 0 },
    ]);
  });

  it('summarizes active won archived and cancelled counts consistently', () => {
    expect(
      summarizeProjectLifecycle([
        { projectStage: 'opportunity', status: 'lead', count: 2, totalAmount: '1000' },
        { projectStage: 'bidding', status: 'in_progress', count: 3, totalAmount: '2500' },
        { projectStage: 'archived', bidResult: 'won', status: 'won', count: 1, totalAmount: '500', actualAmount: '450' },
        { projectStage: 'archived', bidResult: 'lost', status: 'lost', count: 1, totalAmount: '300' },
        { projectStage: 'cancelled', status: 'cancelled', count: 1, totalAmount: '200' },
      ])
    ).toEqual({
      total: 8,
      active: 5,
      completed: 1,
      cancelled: 1,
      won: 1,
      lost: 1,
      archived: 2,
      totalAmount: 4500,
      actualAmount: 450,
    });
  });

  it('treats only lead and in-progress lifecycle buckets as alert-eligible', () => {
    expect(isProjectLifecycleOpenForAlerts({ projectStage: 'opportunity', status: 'lead' })).toBe(true);
    expect(isProjectLifecycleOpenForAlerts({ projectStage: 'settlement', status: 'in_progress' })).toBe(true);
    expect(isProjectLifecycleOpenForAlerts({ projectStage: 'archived', bidResult: 'won', status: 'won' })).toBe(false);
    expect(isProjectLifecycleOpenForAlerts({ projectStage: 'archived', bidResult: 'lost', status: 'lost' })).toBe(false);
    expect(isProjectLifecycleOpenForAlerts({ projectStage: 'cancelled', status: 'cancelled' })).toBe(false);
  });
});