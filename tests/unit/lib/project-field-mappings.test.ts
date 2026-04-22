import { describe, expect, it } from 'vitest';

import {
  getProjectCustomerTypeOrIndustryLabel,
  getProjectStageLabel,
  getProjectStatusLabel,
  normalizeImportedProjectCustomerTypeOrIndustry,
  normalizeImportedRegion,
  PROJECT_IMPORT_TEMPLATE_HEADERS,
  PROJECT_REGION_MAP,
} from '../../../src/lib/project-field-mappings';

describe('project field mappings', () => {
  it('maps current project status codes to labels', () => {
    expect(getProjectStatusLabel('lead')).toBe('商机线索');
    expect(getProjectStatusLabel('in_progress')).toBe('跟进中');
    expect(getProjectStatusLabel('won')).toBe('已中标');
    expect(getProjectStatusLabel('ongoing')).toBe('进行中');
    expect(getProjectStatusLabel('completed')).toBe('已完成');
  });

  it('maps governed project stage codes to labels', () => {
    expect(getProjectStageLabel('bidding_pending')).toBe('投标立项待审批');
    expect(getProjectStageLabel('contract_pending')).toBe('合同/商务确认中');
    expect(getProjectStageLabel('archived')).toBe('已归档');
  });

  it('normalizes customer type or industry values for display and import', () => {
    expect(getProjectCustomerTypeOrIndustryLabel('education')).toBe('教育');
    expect(getProjectCustomerTypeOrIndustryLabel('university')).toBe('高校');
    expect(normalizeImportedProjectCustomerTypeOrIndustry('healthcare')).toBe('医疗');
    expect(normalizeImportedProjectCustomerTypeOrIndustry('军警')).toBe('军警');
  });
});

describe('normalizeImportedRegion', () => {
  it('returns null for empty/null input', () => {
    expect(normalizeImportedRegion(null)).toBeNull();
    expect(normalizeImportedRegion(undefined)).toBeNull();
    expect(normalizeImportedRegion('')).toBeNull();
    expect(normalizeImportedRegion('  ')).toBeNull();
  });

  it('passes through macro region names unchanged', () => {
    expect(normalizeImportedRegion('华北')).toBe('华北');
    expect(normalizeImportedRegion('华东')).toBe('华东');
    expect(normalizeImportedRegion('华南')).toBe('华南');
    expect(normalizeImportedRegion('华中')).toBe('华中');
    expect(normalizeImportedRegion('西北')).toBe('西北');
    expect(normalizeImportedRegion('西南')).toBe('西南');
    expect(normalizeImportedRegion('东北')).toBe('东北');
    expect(normalizeImportedRegion('港澳台')).toBe('港澳台');
  });

  it('maps province short names to macro regions', () => {
    expect(normalizeImportedRegion('北京')).toBe('华北');
    expect(normalizeImportedRegion('天津')).toBe('华北');
    expect(normalizeImportedRegion('上海')).toBe('华东');
    expect(normalizeImportedRegion('浙江')).toBe('华东');
    expect(normalizeImportedRegion('广东')).toBe('华南');
    expect(normalizeImportedRegion('四川')).toBe('西南');
    expect(normalizeImportedRegion('辽宁')).toBe('东北');
    expect(normalizeImportedRegion('新疆')).toBe('西北');
  });

  it('maps province full names (with 市/省 suffix) to macro regions', () => {
    // These are the critical regression cases: must NOT return English codes
    expect(normalizeImportedRegion('北京市')).toBe('华北');
    expect(normalizeImportedRegion('上海市')).toBe('华东');
    expect(normalizeImportedRegion('四川省')).toBe('西南');
    expect(normalizeImportedRegion('广东省')).toBe('华南');
    expect(normalizeImportedRegion('浙江省')).toBe('华东');
    expect(normalizeImportedRegion('黑龙江省')).toBe('东北');
  });

  it('passes through unrecognised values without converting to English codes', () => {
    // Unknown region strings must be preserved as-is, never turned into English codes
    expect(normalizeImportedRegion('其他区域')).toBe('其他区域');
    expect(normalizeImportedRegion('beijing')).toBe('beijing'); // raw English should pass through
  });

  it('trims surrounding whitespace before matching', () => {
    expect(normalizeImportedRegion('  华北  ')).toBe('华北');
    expect(normalizeImportedRegion(' 北京市 ')).toBe('华北');
  });

  it('PROJECT_REGION_MAP covers all 31 provinces/direct-controlled municipalities', () => {
    const provinces = [
      '北京', '天津', '河北', '山西', '内蒙古',
      '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东',
      '广东', '广西', '海南',
      '河南', '湖北', '湖南',
      '重庆', '四川', '贵州', '云南', '西藏',
      '陕西', '甘肃', '青海', '宁夏', '新疆',
      '辽宁', '吉林', '黑龙江',
    ];
    for (const province of provinces) {
      expect(PROJECT_REGION_MAP[province], `missing mapping for ${province}`).toBeDefined();
    }
  });
});

describe('normalizeImportedProjectCustomerTypeOrIndustry — extended', () => {
  it('maps English industry codes to Chinese labels', () => {
    expect(normalizeImportedProjectCustomerTypeOrIndustry('university')).toBe('高校');
    expect(normalizeImportedProjectCustomerTypeOrIndustry('higher_vocational')).toBe('高职');
    expect(normalizeImportedProjectCustomerTypeOrIndustry('secondary_vocational')).toBe('中专');
    expect(normalizeImportedProjectCustomerTypeOrIndustry('k12')).toBe('K12');
    expect(normalizeImportedProjectCustomerTypeOrIndustry('government')).toBe('政府');
    expect(normalizeImportedProjectCustomerTypeOrIndustry('enterprise')).toBe('企业');
    expect(normalizeImportedProjectCustomerTypeOrIndustry('military_police')).toBe('军警');
    expect(normalizeImportedProjectCustomerTypeOrIndustry('hospital')).toBe('医院');
    expect(normalizeImportedProjectCustomerTypeOrIndustry('healthcare')).toBe('医疗');
    expect(normalizeImportedProjectCustomerTypeOrIndustry('medical')).toBe('医疗');
  });

  it('passes through Chinese labels unchanged', () => {
    expect(normalizeImportedProjectCustomerTypeOrIndustry('高校')).toBe('高校');
    expect(normalizeImportedProjectCustomerTypeOrIndustry('政府')).toBe('政府');
    expect(normalizeImportedProjectCustomerTypeOrIndustry('军警')).toBe('军警');
    expect(normalizeImportedProjectCustomerTypeOrIndustry('其他')).toBe('其他');
  });

  it('returns null for empty/null input', () => {
    expect(normalizeImportedProjectCustomerTypeOrIndustry(null)).toBeNull();
    expect(normalizeImportedProjectCustomerTypeOrIndustry(undefined)).toBeNull();
    expect(normalizeImportedProjectCustomerTypeOrIndustry('')).toBeNull();
  });

  it('returns the same string for unrecognised values (route uses this to detect bad input)', () => {
    // When the normalized result === the trimmed input, the route treats it as unrecognised and raises an error.
    expect(normalizeImportedProjectCustomerTypeOrIndustry('未知行业')).toBe('未知行业');
    expect(normalizeImportedProjectCustomerTypeOrIndustry('software')).toBe('software');
  });
});

describe('PROJECT_IMPORT_TEMPLATE_HEADERS', () => {
  it('contains the required import column headers', () => {
    const required = ['项目名称', '客户名称', '项目阶段', '区域', '负责人'];
    for (const col of required) {
      expect(PROJECT_IMPORT_TEMPLATE_HEADERS, `missing header: ${col}`).toContain(col);
    }
  });
});