/**
 * 项目阶段状态机测试
 */
import { describe, it, expect } from 'vitest';
import { GOVERNED_PROJECT_STAGES, type GovernedProjectStage } from '@/modules/project/project-stage-types';
import {
  isGovernedProjectStage,
  canTransitionProjectStage,
  getCompatProjectStatusForStage,
} from '@/modules/project/project-stage-policy';

describe('GOVERNED_PROJECT_STAGES', () => {
  it('包含 11 个阶段（含 suspended）', () => {
    expect(GOVERNED_PROJECT_STAGES).toHaveLength(11);
  });

  it('包含 suspended', () => {
    expect(GOVERNED_PROJECT_STAGES).toContain('suspended');
  });

  const EXPECTED_STAGES = [
    'opportunity', 'bidding_pending', 'bidding', 'solution_review',
    'contract_pending', 'delivery_preparing', 'delivering',
    'settlement', 'archived', 'cancelled', 'suspended',
  ];

  for (const stage of EXPECTED_STAGES) {
    it(`包含 "${stage}"`, () => {
      expect(GOVERNED_PROJECT_STAGES).toContain(stage);
    });
  }
});

describe('阶段转换策略', () => {
  it('isGovernedProjectStage 识别合法阶段', () => {
    expect(isGovernedProjectStage('opportunity')).toBe(true);
    expect(isGovernedProjectStage('suspended')).toBe(true);
    expect(isGovernedProjectStage('nonexistent')).toBe(false);
  });

  // ── suspended 的转换规则 ──────────────────────────────────
  describe('suspended 的转换', () => {
    it('delivering → suspended 允许', () => {
      expect(canTransitionProjectStage('delivering', 'suspended')).toBe(true);
    });

    it('suspended → delivering 允许', () => {
      expect(canTransitionProjectStage('suspended', 'delivering')).toBe(true);
    });

    it('suspended → cancelled 允许', () => {
      expect(canTransitionProjectStage('suspended', 'cancelled')).toBe(true);
    });

    it('opportunity → suspended 不允许', () => {
      expect(canTransitionProjectStage('opportunity', 'suspended')).toBe(false);
    });

    it('suspended 不能直接到 settlement', () => {
      expect(canTransitionProjectStage('suspended', 'settlement')).toBe(false);
    });
  });

  // ── 原有规则回归 ──────────────────────────────────────────
  describe('原有阶段转换回归', () => {
    it('opportunity → bidding_pending', () => {
      expect(canTransitionProjectStage('opportunity', 'bidding_pending')).toBe(true);
    });

    it('delivering → settlement', () => {
      expect(canTransitionProjectStage('delivering', 'settlement')).toBe(true);
    });

    it('settlement → archived', () => {
      expect(canTransitionProjectStage('settlement', 'archived')).toBe(true);
    });

    it('archived 是终态', () => {
      for (const stage of GOVERNED_PROJECT_STAGES) {
        if (stage === 'archived') continue;
        expect(canTransitionProjectStage('archived', stage as GovernedProjectStage)).toBe(false);
      }
    });

    it('cancelled 是终态', () => {
      for (const stage of GOVERNED_PROJECT_STAGES) {
        if (stage === 'cancelled') continue;
        expect(canTransitionProjectStage('cancelled', stage as GovernedProjectStage)).toBe(false);
      }
    });
  });
});

describe('兼容状态映射', () => {
  it('suspended 映射到 ongoing', () => {
    expect(getCompatProjectStatusForStage('suspended')).toBe('ongoing');
  });

  it('opportunity 映射到 draft', () => {
    expect(getCompatProjectStatusForStage('opportunity')).toBe('draft');
  });

  it('archived 映射到 archived', () => {
    expect(getCompatProjectStatusForStage('archived')).toBe('archived');
  });

  it('每个阶段都有兼容映射', () => {
    for (const stage of GOVERNED_PROJECT_STAGES) {
      expect(getCompatProjectStatusForStage(stage)).toBeTruthy();
    }
  });
});
