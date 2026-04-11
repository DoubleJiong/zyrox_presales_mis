import { describe, expect, it } from 'vitest';

import { getRequiredPermissions, hasPermission, type UserWithPermissions } from '../../../src/lib/rbac';
import { PERMISSIONS } from '../../../src/lib/permissions';

function createUser(permissions: string[]): UserWithPermissions {
  return {
    id: 1,
    username: 'tester',
    realName: 'Tester',
    email: 'tester@example.com',
    roleCode: 'TEST',
    permissions: permissions as UserWithPermissions['permissions'],
    isSuperAdmin: false,
  };
}

describe('hasPermission', () => {
  it('supports colon wildcard permissions stored in legacy roles', () => {
    const user = createUser(['project:*', 'customer:*']);

    expect(hasPermission(user, 'project:view')).toBe(true);
    expect(hasPermission(user, 'customer:update')).toBe(true);
  });

  it('maps legacy scheme permissions to solution module access', () => {
    const user = createUser(['scheme:*', 'scheme:view', 'scheme:create']);

    expect(hasPermission(user, 'solution:view')).toBe(true);
    expect(hasPermission(user, 'solution:create')).toBe(true);
  });

  it('matches bracketed API permission routes against concrete ids', () => {
    expect(getRequiredPermissions('GET', '/api/projects/123/members')).toEqual([PERMISSIONS.PROJECT_VIEW]);
  });

  it('returns the canonical data-screen permissions for phase-2 and team-execution APIs', () => {
    expect(getRequiredPermissions('GET', '/api/data-screen/panels')).toEqual([PERMISSIONS.DATASCREEN_VIEW]);
    expect(getRequiredPermissions('GET', '/api/data-screen/team-execution/detail')).toEqual([PERMISSIONS.TEAM_EXECUTION_COCKPIT_VIEW]);
  });
});