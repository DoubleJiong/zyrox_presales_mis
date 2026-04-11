import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(async () => []) })) })),
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  inArray: vi.fn(),
  isNull: vi.fn(),
  relations: vi.fn(() => ({})),
}));

vi.mock('@/lib/team-execution-cockpit/read-model', () => ({
  buildUserExecutionStats: vi.fn(() => []),
  loadTeamExecutionScope: vi.fn(async () => ({
    projectRows: [],
    projectMemberRows: [],
    taskRows: [],
    todoRows: [],
    solutionRows: [],
    solutionProjectRows: [],
    scopedUserIds: [],
    memberIdsByProject: new Map(),
    userMap: new Map(),
  })),
}));

import {
  buildEmptyDataScreenPersonnelViewInitData,
  parseDataScreenPersonnelViewInitFilters,
} from '../../../src/lib/data-screen-personnel-view';

describe('data-screen personnel view filters and empty state', () => {
  it('parses preset, person selection, and pagination from search params', () => {
    const filters = parseDataScreenPersonnelViewInitFilters(new URLSearchParams('preset=presales-focus&personId=18&abnormalFilter=overdue&selectedItemId=task-25&peoplePage=2&peoplePageSize=12&itemPage=3&itemPageSize=15&startDate=2026-04-01&endDate=2026-04-08'));

    expect(filters).toMatchObject({
      preset: 'presales-focus',
      personId: 18,
      abnormalFilter: 'overdue',
      selectedItemId: 'task-25',
      peoplePage: 2,
      peoplePageSize: 12,
      itemPage: 3,
      itemPageSize: 15,
      startDate: '2026-04-01',
      endDate: '2026-04-08',
    });
  });

  it('falls back to safe defaults for invalid personnel query params', () => {
    const filters = parseDataScreenPersonnelViewInitFilters(new URLSearchParams('preset=broken&personId=-1&abnormalFilter=broken&selectedItemId=nope&peoplePage=0&peoplePageSize=1000&itemPage=abc&itemPageSize=-2'));

    expect(filters).toMatchObject({
      preset: 'management',
      personId: null,
      abnormalFilter: 'all',
      selectedItemId: null,
      peoplePage: 1,
      peoplePageSize: 24,
      itemPage: 1,
      itemPageSize: 8,
    });
  });

  it('builds a stable empty payload for the personnel init route', () => {
    const filters = parseDataScreenPersonnelViewInitFilters(new URLSearchParams('preset=business-focus&startDate=2026-04-01&endDate=2026-04-08'));
    const payload = buildEmptyDataScreenPersonnelViewInitData(filters);

    expect(payload).toMatchObject({
      filtersEcho: {
        preset: 'business-focus',
        startDate: '2026-04-01',
        endDate: '2026-04-08',
      },
      summary: {
        managedPeopleCount: 0,
        activePeopleCount: 0,
      },
      selectedPerson: null,
      selectedItem: null,
      itemList: {
        items: [],
      },
    });

    expect(payload.itemAbnormalSummary).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'all', count: 0, label: '全部事项' }),
      expect.objectContaining({ key: 'overdue', count: 0 }),
    ]));
  });
});