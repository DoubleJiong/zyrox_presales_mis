/**
 * 字典数据完整性回归测试
 * 
 * 确保 dictionary-config.ts 中定义的分类与枚举项
 * 满足统一字典改造后的全部业务需求。
 */
import { describe, it, expect } from 'vitest';
import {
  DICT_CATEGORIES,
  ALL_DICT_ITEMS,
  type DictCategoryConfig,
  type DictCategoryItems,
} from '@/lib/config/dictionary-config';
import { GOVERNED_PROJECT_STAGES } from '@/modules/project/project-stage-types';

// ── 分类级别 ──────────────────────────────────────────────────

describe('字典分类完整性', () => {
  it('每个 DICT_CATEGORIES 条目都有对应的 ALL_DICT_ITEMS 记录', () => {
    const itemCategories = new Set(ALL_DICT_ITEMS.map(i => i.category));
    for (const cat of DICT_CATEGORIES) {
      expect(itemCategories.has(cat.code), `分类 "${cat.code}" 在 ALL_DICT_ITEMS 中缺失`).toBe(true);
    }
  });

  it('ALL_DICT_ITEMS 中无孤儿条目（所有 category 都存在于 DICT_CATEGORIES）', () => {
    const categoryCodes = new Set(DICT_CATEGORIES.map(c => c.code));
    for (const entry of ALL_DICT_ITEMS) {
      expect(categoryCodes.has(entry.category), `ALL_DICT_ITEMS 中的 "${entry.category}" 不在 DICT_CATEGORIES 中`).toBe(true);
    }
  });

  it('所有分类的 code 唯一', () => {
    const codes = DICT_CATEGORIES.map(c => c.code);
    const unique = new Set(codes);
    expect(codes.length).toBe(unique.size);
  });

  it('所有分类都有 description 字段', () => {
    for (const cat of DICT_CATEGORIES) {
      expect(cat.description, `分类 "${cat.code}" 缺少 description`).toBeTruthy();
    }
  });

  it('所有分类都有 referencedBy 元数据', () => {
    for (const cat of DICT_CATEGORIES) {
      expect((cat as any).referencedBy, `分类 "${cat.code}" 缺少 referencedBy`).toBeDefined();
      expect(Array.isArray((cat as any).referencedBy), `分类 "${cat.code}" 的 referencedBy 应为数组`).toBe(true);
    }
  });
});

// ── 枚举项级别 ────────────────────────────────────────────────

describe('枚举项数据一致性', () => {
  it('所有 item 在同分类内 code 唯一', () => {
    for (const entry of ALL_DICT_ITEMS) {
      const codes = entry.items.map(i => i.code);
      const unique = new Set(codes);
      expect(codes.length, `分类 "${entry.category}" 内有重复 code`).toBe(unique.size);
    }
  });

  it('所有 item 都有 name', () => {
    for (const entry of ALL_DICT_ITEMS) {
      for (const item of entry.items) {
        expect(item.name, `分类 "${entry.category}" 中 code="${item.code}" 缺少 name`).toBeTruthy();
      }
    }
  });

  it('所有 item 都有非零 sortOrder', () => {
    for (const entry of ALL_DICT_ITEMS) {
      for (const item of entry.items) {
        expect(typeof item.sortOrder, `分类 "${entry.category}" 中 code="${item.code}" 的 sortOrder 应为 number`).toBe('number');
      }
    }
  });
});

// ── 具体分类的值集校验 ────────────────────────────────────────

describe('project_stage 分类与状态机同步', () => {
  it('project_stage 的值集 === GOVERNED_PROJECT_STAGES（含 suspended）', () => {
    const stageItems = ALL_DICT_ITEMS.find(i => i.category === 'project_stage');
    expect(stageItems, 'project_stage 分类缺失').toBeDefined();

    const stageCodes = new Set(stageItems!.items.map(i => i.code));
    const governedCodes = new Set(GOVERNED_PROJECT_STAGES);

    // 字典应包含状态机所有值
    for (const code of governedCodes) {
      expect(stageCodes.has(code), `字典缺少阶段 "${code}"`).toBe(true);
    }
    // 字典不应有状态机之外的值
    for (const code of stageCodes) {
      expect(governedCodes.has(code as any), `字典中多余阶段 "${code}"`).toBe(true);
    }
  });

  it('project_stage 包含 suspended', () => {
    const stageItems = ALL_DICT_ITEMS.find(i => i.category === 'project_stage');
    const codes = stageItems!.items.map(i => i.code);
    expect(codes).toContain('suspended');
  });

  it('project_stage 有 11 个值', () => {
    const stageItems = ALL_DICT_ITEMS.find(i => i.category === 'project_stage');
    expect(stageItems!.items.length).toBe(11);
  });
});

describe('project_type 分类校验', () => {
  it('project_type 分类有 14 个值', () => {
    const typeItems = ALL_DICT_ITEMS.find(i => i.category === 'project_type');
    expect(typeItems, 'project_type 分类缺失').toBeDefined();
    expect(typeItems!.items.length).toBe(14);
  });

  it('project_type 包含所有 14 个业务类型', () => {
    const typeItems = ALL_DICT_ITEMS.find(i => i.category === 'project_type');
    const names = typeItems!.items.map(i => i.name);
    const expected = [
      '一卡通', '大数据', '物联网', '智慧餐厅', '食安',
      '智慧校园', '数字孪生', '系统集成', '安防项目', 'K12项目',
      '数智后勤', '运营后勤', '创新项目', '其他类型',
    ];
    for (const name of expected) {
      expect(names, `project_type 缺少 "${name}"`).toContain(name);
    }
  });
});

describe('region 分类校验', () => {
  it('region 分类有 42 个值（31省级+浙江11地市）', () => {
    const regionItems = ALL_DICT_ITEMS.find(i => i.category === 'region');
    expect(regionItems, 'region 分类缺失').toBeDefined();
    expect(regionItems!.items.length).toBe(42);
  });

  it('region 包含浙江 11 个地市', () => {
    const regionItems = ALL_DICT_ITEMS.find(i => i.category === 'region');
    const names = regionItems!.items.map(i => i.name);
    const zjCities = [
      '杭州市(浙江)', '宁波市(浙江)', '温州市(浙江)', '嘉兴市(浙江)',
      '湖州市(浙江)', '绍兴市(浙江)', '金华市(浙江)', '衢州市(浙江)',
      '舟山市(浙江)', '台州市(浙江)', '丽水市(浙江)',
    ];
    for (const city of zjCities) {
      expect(names, `region 缺少 "${city}"`).toContain(city);
    }
  });

  it('region 不包含旧的大区域分类', () => {
    const regionItems = ALL_DICT_ITEMS.find(i => i.category === 'region');
    const codes = regionItems!.items.map(i => i.code);
    const oldRegions = ['华北', '华东', '华南', '华中', '西北', '西南', '东北', '港澳台', '海外'];
    for (const old of oldRegions) {
      expect(codes, `region 仍包含旧分区 "${old}"`).not.toContain(old);
    }
  });
});

describe('fund_source 分类校验', () => {
  it('fund_source 有 6 个值', () => {
    const fundItems = ALL_DICT_ITEMS.find(i => i.category === 'fund_source');
    expect(fundItems, 'fund_source 分类缺失').toBeDefined();
    expect(fundItems!.items.length).toBe(6);
  });

  it('fund_source 包含所有指定值', () => {
    const fundItems = ALL_DICT_ITEMS.find(i => i.category === 'fund_source');
    const names = fundItems!.items.map(i => i.name);
    const expected = ['银行投资', '运营商投资', '财政拨款', '消防自筹', '贷款', '混合资金'];
    for (const name of expected) {
      expect(names, `fund_source 缺少 "${name}"`).toContain(name);
    }
  });
});

// ── 废弃分类清理校验 ──────────────────────────────────────────

describe('废弃分类已清除', () => {
  const DEPRECATED_CATEGORIES = [
    'demand_type', 'intent_level', 'project_status', 'opportunity_stage',
    'service_type', 'todo_type', 'worklog_type', 'alert_category',
    'alert_target_type', 'member_role', 'bid_type', 'bond_status',
    'archive_status', 'sub_scheme_type', 'complexity', 'solution_type',
  ];

  it('DICT_CATEGORIES 中不存在废弃分类', () => {
    const codes = new Set(DICT_CATEGORIES.map(c => c.code));
    for (const dep of DEPRECATED_CATEGORIES) {
      expect(codes.has(dep), `废弃分类 "${dep}" 仍存在于 DICT_CATEGORIES`).toBe(false);
    }
  });

  it('ALL_DICT_ITEMS 中不存在废弃分类', () => {
    const categories = new Set(ALL_DICT_ITEMS.map(i => i.category));
    for (const dep of DEPRECATED_CATEGORIES) {
      expect(categories.has(dep), `废弃分类 "${dep}" 仍存在于 ALL_DICT_ITEMS`).toBe(false);
    }
  });
});

// ── 新增分类存在性校验 ────────────────────────────────────────

describe('新增分类已就位', () => {
  const REQUIRED_NEW_CATEGORIES = [
    'task_status', 'contract_status', 'contract_process_status',
    'alert_rule_type', 'alert_rule_status', 'alert_history_status',
    'arbitration_status', 'performance_status', 'schedule_status',
    'risk_level', 'alert_channel', 'arbitration_type',
    'contract_sign_mode', 'contract_user_type', 'contract_project_category',
  ];

  it('所有新增分类都存在于 DICT_CATEGORIES', () => {
    const codes = new Set(DICT_CATEGORIES.map(c => c.code));
    for (const cat of REQUIRED_NEW_CATEGORIES) {
      expect(codes.has(cat), `新增分类 "${cat}" 缺失`).toBe(true);
    }
  });

  it('所有新增分类都有对应的枚举项', () => {
    const categories = new Set(ALL_DICT_ITEMS.map(i => i.category));
    for (const cat of REQUIRED_NEW_CATEGORIES) {
      expect(categories.has(cat), `新增分类 "${cat}" 缺少枚举项`).toBe(true);
    }
  });
});
