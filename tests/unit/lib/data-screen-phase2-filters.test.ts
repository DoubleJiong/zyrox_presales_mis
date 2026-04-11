import { describe, expect, it } from 'vitest';
import {
  buildDataScreenPhase2SearchParams,
  getDefaultDataScreenDateRange,
  parseDataScreenPhase2Filters,
} from '../../../src/lib/data-screen-phase2-filters';

describe('data-screen phase2 filters', () => {
  it('parses primary view and shared URL state from search params', () => {
    const filters = parseDataScreenPhase2Filters(new URLSearchParams('view=personnel&preset=presales-focus&panel=sales&map=zhejiang&heatmap=contract&startDate=2026-04-01&endDate=2026-04-08&autoRefresh=0'));

    expect(filters).toMatchObject({
      view: 'personnel',
      preset: 'presales-focus',
      panel: 'sales',
      map: 'zhejiang',
      heatmap: 'contract',
      startDate: '2026-04-01',
      endDate: '2026-04-08',
      autoRefresh: false,
    });
  });

  it('drops invalid values and restores default-safe filter state', () => {
    const filters = parseDataScreenPhase2Filters(new URLSearchParams('view=invalid&preset=broken&panel=unknown&map=earth&heatmap=none&startDate=20260408'));

    expect(filters).toMatchObject({
      view: 'region',
      preset: 'management',
      panel: 'projects',
      map: 'province-outside',
      heatmap: 'customer',
      startDate: '',
      endDate: '',
      autoRefresh: true,
    });
  });

  it('serializes only non-default URL state while preserving explicit dates', () => {
    const params = buildDataScreenPhase2SearchParams({
      view: 'personnel',
      preset: 'business-focus',
      panel: 'customers',
      map: 'zhejiang',
      heatmap: 'project',
      startDate: '2026-04-01',
      endDate: '2026-04-08',
      autoRefresh: false,
    });

    expect(params.toString()).toContain('view=personnel');
    expect(params.toString()).toContain('preset=business-focus');
    expect(params.toString()).toContain('panel=customers');
    expect(params.toString()).toContain('map=zhejiang');
    expect(params.toString()).toContain('heatmap=project');
    expect(params.toString()).toContain('startDate=2026-04-01');
    expect(params.toString()).toContain('endDate=2026-04-08');
    expect(params.toString()).toContain('autoRefresh=0');
  });

  it('builds a default 30-day date window', () => {
    const range = getDefaultDataScreenDateRange(new Date('2026-04-08T10:00:00.000Z'));

    expect(range).toEqual({
      startDate: '2026-03-09',
      endDate: '2026-04-08',
    });
  });
});