import { describe, expect, it } from 'vitest';

import { resolveProjectLifecycleForCreate } from '@/lib/project-lifecycle';

describe('project lifecycle create mapping', () => {
  it('defaults new projects to opportunity/lead', () => {
    expect(resolveProjectLifecycleForCreate({})).toEqual({
      projectStage: 'opportunity',
      status: 'lead',
      bidResult: null,
    });
  });

  it('maps active stages to in-progress compatibility status', () => {
    expect(resolveProjectLifecycleForCreate({ projectStage: 'bidding' })).toEqual({
      projectStage: 'bidding',
      status: 'in_progress',
      bidResult: null,
    });

    expect(resolveProjectLifecycleForCreate({ projectStage: 'settlement' })).toEqual({
      projectStage: 'settlement',
      status: 'in_progress',
      bidResult: null,
    });
  });

  it('does not allow direct create to fake won/lost outside archived result state', () => {
    expect(resolveProjectLifecycleForCreate({ projectStage: 'opportunity', bidResult: 'won' })).toEqual({
      projectStage: 'archived',
      status: 'won',
      bidResult: 'won',
    });
  });
});