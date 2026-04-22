import { describe, expect, it } from 'vitest';
import {
  getProjectTypeDisplayLabel,
  getProjectTypeCategoryLabel,
  normalizeProjectTypeCodes,
  serializeProjectTypeCodes,
} from '../../../src/lib/project-type-codec';

describe('project-type-codec', () => {
  it('normalizes multi-select project type values', () => {
    expect(normalizeProjectTypeCodes([' ONE_CARD ', 'big_data', 'one_card'])).toEqual(['one_card', 'big_data']);
    expect(normalizeProjectTypeCodes('one_card，big_data,one_card')).toEqual(['one_card', 'big_data']);
  });

  it('serializes normalized project type values', () => {
    expect(serializeProjectTypeCodes([' ONE_CARD ', 'big_data'])).toBe('one_card,big_data');
    expect(serializeProjectTypeCodes([])).toBeNull();
  });

  it('returns display and category labels', () => {
    expect(getProjectTypeDisplayLabel('one_card')).toBe('一卡通');
    expect(getProjectTypeCategoryLabel('security')).toBe('集成/安防类');
  });
});