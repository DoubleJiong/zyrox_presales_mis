import { describe, expect, it } from 'vitest';

import type { AuthUser } from '../../../src/lib/jwt';
import { canUploadContractMaterial } from '../../../src/shared/policy/commercial-policy';
import { canViewGlobalDashboard } from '../../../src/shared/policy/dashboard-policy';
import { canViewOrphanProject } from '../../../src/shared/policy/project-policy';

function createUser(roleCode: string): AuthUser {
  return {
    id: 1,
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

describe('phase 1 policy floors', () => {
  it('only allows admin and presales management roles to view orphan projects', () => {
    expect(canViewOrphanProject(createUser('member'))).toBe(false);
    expect(canViewOrphanProject(createUser('admin'))).toBe(true);
    expect(canViewOrphanProject(createUser('presales_manager'))).toBe(true);
  });

  it('limits global dashboard scope to management and commercial roles', () => {
    expect(canViewGlobalDashboard(createUser('member'))).toBe(false);
    expect(canViewGlobalDashboard(createUser('commercial_manager'))).toBe(true);
    expect(canViewGlobalDashboard(createUser('admin'))).toBe(true);
  });

  it('denies contract material upload for ordinary members', () => {
    expect(canUploadContractMaterial(createUser('member'))).toBe(false);
    expect(canUploadContractMaterial(createUser('finance_specialist'))).toBe(true);
    expect(canUploadContractMaterial(createUser('admin'))).toBe(true);
  });
});