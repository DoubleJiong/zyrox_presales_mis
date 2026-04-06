import { describe, expect, it } from 'vitest';

import {
  canAccessBiddingTab,
  canAccessResultTab,
  canAccessSettlementTab,
  getStageOptions,
  validateStageTransition,
} from '@/lib/utils/stage-transitions';

describe('stage transitions', () => {
  it('allows governed forward transitions defined by the project stage policy', () => {
    expect(validateStageTransition('opportunity', 'bidding_pending', 'draft')).toEqual({
      valid: true,
      warning: '该阶段通常应由投标立项审批提交动作触发，请确认当前操作符合治理流程。',
    });

    expect(validateStageTransition('bidding_pending', 'bidding', 'ongoing')).toEqual({ valid: true });
    expect(validateStageTransition('solution_review', 'contract_pending', 'ongoing')).toEqual({
      valid: true,
      warning: '进入合同/商务确认前，请确认投标或评审结论已明确。',
    });
  });

  it('rejects invalid governed shortcuts', () => {
    expect(validateStageTransition('opportunity', 'bidding', 'draft')).toEqual({
      valid: false,
      reason: '不支持的阶段变更',
    });

    expect(validateStageTransition('settlement', 'bidding', 'completed')).toEqual({
      valid: false,
      reason: '不支持的阶段变更',
    });
  });

  it('exposes governed stage options and bidding-tab visibility consistently', () => {
    const options = getStageOptions('bidding_pending', 'ongoing');
    const biddingOption = options.find((option) => option.stage === 'bidding');
    const opportunityOption = options.find((option) => option.stage === 'opportunity');
    const archivedOption = options.find((option) => option.stage === 'archived');

    expect(biddingOption?.disabled).toBe(false);
    expect(opportunityOption?.disabled).toBe(false);
    expect(archivedOption?.disabled).toBe(true);

    expect(canAccessBiddingTab('opportunity')).toBe(false);
    expect(canAccessBiddingTab('bidding_pending')).toBe(true);
    expect(canAccessBiddingTab('delivery_preparing')).toBe(true);
  });

  it('allows result-tab access once a project reaches bidding or later result phases', () => {
    expect(canAccessResultTab('bidding', 'in_progress', 'pending')).toBe(true);
    expect(canAccessResultTab('archived', 'won', 'won')).toBe(true);
    expect(canAccessResultTab('delivery_preparing', 'ongoing', null)).toBe(true);
    expect(canAccessResultTab('bidding', 'lost', null)).toBe(true);
  });

  it('only exposes settlement tab at settlement and archived stages', () => {
    expect(canAccessSettlementTab('delivery_preparing')).toBe(false);
    expect(canAccessSettlementTab('delivering')).toBe(false);
    expect(canAccessSettlementTab('settlement')).toBe(true);
    expect(canAccessSettlementTab('archived')).toBe(true);
  });
});