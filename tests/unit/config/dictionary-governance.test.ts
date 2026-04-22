/**
 * 字典治理策略测试
 */
import { describe, it, expect } from 'vitest';
import {
  isGuiManagedSystemAttributeCategory,
  isDedicatedMasterDataAttributeCategory,
  canManageAttributeCategoryInGui,
  shouldSkipDictionaryConfigSync,
} from '@/lib/config/dictionary-governance';

describe('字典治理策略', () => {
  // ── GUI 可管理的系统分类 ─────────────────────────────────
  const GUI_MANAGED = [
    'industry', 'region', 'project_priority', 'priority',
    'bidding_method', 'scoring_method', 'fund_source',
  ];

  describe('isGuiManagedSystemAttributeCategory', () => {
    for (const code of GUI_MANAGED) {
      it(`"${code}" 应该是 GUI 管理分类`, () => {
        expect(isGuiManagedSystemAttributeCategory(code)).toBe(true);
      });
    }

    it('"project_stage" 不可在 GUI 管理（状态机治理）', () => {
      expect(isGuiManagedSystemAttributeCategory('project_stage')).toBe(false);
    });

    it('"customer_status" 不可在 GUI 管理', () => {
      expect(isGuiManagedSystemAttributeCategory('customer_status')).toBe(false);
    });
  });

  // ── 专用主数据分类（独立表管理） ────────────────────────────
  describe('isDedicatedMasterDataAttributeCategory', () => {
    it('"project_type" 不再是专用主数据分类（已收归字典）', () => {
      expect(isDedicatedMasterDataAttributeCategory('project_type')).toBe(false);
    });

    it('随机分类不是专用主数据分类', () => {
      expect(isDedicatedMasterDataAttributeCategory('region')).toBe(false);
    });
  });

  // ── canManageAttributeCategoryInGui ─────────────────────────
  describe('canManageAttributeCategoryInGui', () => {
    it('允许管理 GUI 可管理的系统分类', () => {
      expect(canManageAttributeCategoryInGui('region', true)).toBe(true);
    });

    it('允许管理非系统分类', () => {
      expect(canManageAttributeCategoryInGui('custom_category', false)).toBe(true);
    });

    it('拒绝管理非 GUI 可管理的系统分类（如 project_stage）', () => {
      expect(canManageAttributeCategoryInGui('project_stage', true)).toBe(false);
    });

    it('允许管理 project_type（已收归 GUI 管理）', () => {
      expect(canManageAttributeCategoryInGui('project_type', true)).toBe(true);
    });
  });

  // ── shouldSkipDictionaryConfigSync ──────────────────────────
  describe('shouldSkipDictionaryConfigSync', () => {
    it('GUI 管理的分类跳过 sync', () => {
      expect(shouldSkipDictionaryConfigSync('region')).toBe(true);
    });

    it('非 GUI 管理、非专用主数据的分类不跳过 sync', () => {
      expect(shouldSkipDictionaryConfigSync('customer_status')).toBe(false);
    });
  });
});
