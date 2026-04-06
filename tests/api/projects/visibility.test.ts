import { describe, expect, it } from 'vitest';

import type { AuthUser } from '../../../src/lib/jwt';
import { canViewOrphanProject, hasGlobalProjectView } from '../../../src/shared/policy/project-policy';

function createUser(roleCode: string): AuthUser {
  return {
    id: 9,
    username: roleCode,
    email: `${roleCode}@example.com`,
    realName: roleCode,
    phone: null,
    department: null,
    avatar: null,
    roleId: 1,
    roleCode,
    roleName: roleCode,
    permissions: [],
    status: 'active',
  };
}

describe('project visibility api floor', () => {
  it('treats orphan projects as non-visible for ordinary members', () => {
    const memberUser = createUser('member');

    expect(hasGlobalProjectView(memberUser)).toBe(false);
    expect(canViewOrphanProject(memberUser)).toBe(false);
  });

  it('keeps global project visibility for approved management roles', () => {
    const managerUser = createUser('presales_manager');

    expect(hasGlobalProjectView(managerUser)).toBe(true);
    expect(canViewOrphanProject(managerUser)).toBe(true);
  });
});