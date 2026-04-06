import { describe, expect, it } from 'vitest';

import { hasPermission, type UserWithPermissions } from '../../../src/lib/rbac';

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
});