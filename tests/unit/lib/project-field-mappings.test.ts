import { describe, expect, it } from 'vitest';

import {
  getProjectCustomerTypeOrIndustryLabel,
  getProjectStageLabel,
  getProjectStatusLabel,
  normalizeImportedProjectCustomerTypeOrIndustry,
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