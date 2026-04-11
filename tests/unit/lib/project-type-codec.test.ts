import { describe, expect, it } from 'vitest';
import {
  getProjectTypeDisplayLabel,
  getProjectTypeOaCategoryLabel,
  normalizeProjectTypeCodes,
  serializeProjectTypeCodes,
} from '../../../src/lib/project-type-codec';

describe('project-type-codec', () => {
  it('normalizes multi-select project type values', () => {
    expect(normalizeProjectTypeCodes([' SOFTWARE ', 'integration', 'software'])).toEqual(['software', 'integration']);
    expect(normalizeProjectTypeCodes('software，integration,software')).toEqual(['software', 'integration']);
  });

  it('serializes normalized project type values', () => {
    expect(serializeProjectTypeCodes([' SOFTWARE ', 'integration'])).toBe('software,integration');
    expect(serializeProjectTypeCodes([])).toBeNull();
  });

  it('returns display and OA category labels', () => {
    expect(getProjectTypeDisplayLabel('software')).toBe('软件');
    expect(getProjectTypeOaCategoryLabel('consulting')).toBe('服务支撑类');
  });
});