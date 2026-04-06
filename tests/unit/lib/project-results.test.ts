import { describe, expect, it } from 'vitest';

import {
  buildProjectResultSyncPayload,
  normalizeProjectBidResult,
  resolveProjectBidResult,
} from '@/lib/project-results';

describe('project results', () => {
  it('normalizes supported bid results', () => {
    expect(normalizeProjectBidResult('won')).toBe('won');
    expect(normalizeProjectBidResult(' LOST ')).toBe('lost');
    expect(normalizeProjectBidResult('pending')).toBe('pending');
    expect(normalizeProjectBidResult('other')).toBeNull();
  });

  it('prefers project result before bidding result and status fallback', () => {
    expect(resolveProjectBidResult({ projectBidResult: 'won', biddingBidResult: 'pending', projectStatus: 'in_progress' })).toBe('won');
    expect(resolveProjectBidResult({ projectBidResult: null, biddingBidResult: 'lost', projectStatus: 'in_progress' })).toBe('lost');
    expect(resolveProjectBidResult({ projectBidResult: null, biddingBidResult: null, projectStatus: 'won' })).toBe('won');
    expect(resolveProjectBidResult({ projectBidResult: null, biddingBidResult: null, projectStatus: 'draft' })).toBe('pending');
  });

  it('builds synchronized project payloads for won lost and pending', () => {
    expect(buildProjectResultSyncPayload({ bidResult: 'won' })).toEqual({
      bidResult: 'won',
      projectStage: 'archived',
      status: 'won',
      winCompetitor: null,
      loseReason: null,
    });

    expect(buildProjectResultSyncPayload({ bidResult: 'lost', winCompetitor: '对手A', loseReason: '价格原因' })).toEqual({
      bidResult: 'lost',
      projectStage: 'archived',
      status: 'lost',
      winCompetitor: '对手A',
      loseReason: '价格原因',
    });

    expect(buildProjectResultSyncPayload({ bidResult: 'pending' })).toEqual({
      bidResult: 'pending',
      projectStage: 'bidding',
      status: 'in_progress',
      winCompetitor: null,
      loseReason: null,
    });
  });
});