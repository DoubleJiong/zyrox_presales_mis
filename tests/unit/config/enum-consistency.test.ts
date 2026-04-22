/**
 * 枚举一致性测试 — 确保前端各处标签映射与字典 config 保持同步
 */
import { describe, it, expect } from 'vitest';
import { ALL_DICT_ITEMS } from '@/lib/config/dictionary-config';
import { GOVERNED_PROJECT_STAGES } from '@/modules/project/project-stage-types';
import { PROJECT_STAGE_LABELS as DATA_SCREEN_STAGE_LABELS } from '@/lib/data-screen-i18n';

// 从 project-field-mappings 导入标签
import { getProjectStageLabel } from '@/lib/project-field-mappings';

describe('项目阶段标签同步', () => {
  it('data-screen-i18n 中的每个 stage 都是合法的 governed stage', () => {
    for (const key of Object.keys(DATA_SCREEN_STAGE_LABELS)) {
      expect(
        (GOVERNED_PROJECT_STAGES as readonly string[]).includes(key),
        `data-screen-i18n 包含非法阶段 "${key}"`
      ).toBe(true);
    }
  });

  it('project-field-mappings 为每个 governed stage 返回非原值标签', () => {
    for (const stage of GOVERNED_PROJECT_STAGES) {
      const label = getProjectStageLabel(stage);
      expect(label, `project-field-mappings 缺少阶段 "${stage}" 的标签`).not.toBe(stage);
    }
  });

  it('data-screen-i18n 覆盖所有 governed stages', () => {
    for (const stage of GOVERNED_PROJECT_STAGES) {
      expect(
        DATA_SCREEN_STAGE_LABELS[stage],
        `data-screen-i18n 缺少阶段 "${stage}"`
      ).toBeTruthy();
    }
  });
});

describe('字典项与前端映射无孤儿', () => {
  it('ALL_DICT_ITEMS 中每个 category 无空 items 数组', () => {
    for (const entry of ALL_DICT_ITEMS) {
      expect(entry.items.length, `分类 "${entry.category}" 的 items 为空`).toBeGreaterThan(0);
    }
  });
});

describe('废弃枚举不再出现', () => {
  it('data-screen-i18n 不再包含 OPPORTUNITY_STAGE_LABELS', async () => {
    const mod = await import('@/lib/data-screen-i18n');
    expect((mod as any).OPPORTUNITY_STAGE_LABELS).toBeUndefined();
  });

  it('data-screen-i18n 不再导出 translateOpportunityStage', async () => {
    const mod = await import('@/lib/data-screen-i18n');
    expect((mod as any).translateOpportunityStage).toBeUndefined();
  });
});
