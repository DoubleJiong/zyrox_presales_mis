import { describe, expect, it } from 'vitest';

import {
  buildCustomerNameLookupKeywords,
  matchCustomerName,
  normalizeCustomerNameForDedup,
} from '../../../src/lib/customer-name-dedup';

describe('customer-name-dedup', () => {
  it('normalizes whitespace case and company suffixes for matching', () => {
    expect(normalizeCustomerNameForDedup(' 杭州数智科技股份有限公司 ')).toBe('杭州数智科技');
    expect(normalizeCustomerNameForDedup('Hangzhou Data Company')).toBe('hangzhoudatacompany');
  });

  it('builds lookup keywords with original and suffix-stripped variants', () => {
    expect(buildCustomerNameLookupKeywords('杭州数智科技有限公司')).toEqual([
      '杭州数智科技有限公司',
      '杭州数智科技',
    ]);
  });

  it('treats suffix-only differences as exact duplicates', () => {
    expect(matchCustomerName('杭州数智科技有限公司', '杭州数智科技').matchType).toBe('exact');
  });

  it('treats containment or high textual overlap as similar matches', () => {
    expect(matchCustomerName('浙江联通政企', '浙江联通政企客户事业部').matchType).toBe('similar');
    expect(matchCustomerName('杭州智算中心项目', '杭州智算中心平台').matchType).toBe('similar');
  });
});