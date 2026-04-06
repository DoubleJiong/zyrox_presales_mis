import type { AuthUser } from '@/lib/jwt';

const ADMIN_ROLE_CODES = ['admin', 'super_admin', 'system_admin'];
const PRESALES_MANAGER_ROLE_CODES = ['presales_manager', 'presale_manager', 'sales_manager', 'presales'];

function normalizeRoleCode(roleCode: string | null | undefined): string {
  return (roleCode || '').trim().toLowerCase();
}

export function hasRoleCode(
  user: AuthUser | null | undefined,
  acceptedRoleCodes: string[]
): boolean {
  const normalizedRoleCode = normalizeRoleCode(user?.roleCode);
  return acceptedRoleCodes.includes(normalizedRoleCode);
}

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  return hasRoleCode(user, ADMIN_ROLE_CODES);
}

export function hasGlobalProjectView(user: AuthUser | null | undefined): boolean {
  return isAdminUser(user) || hasRoleCode(user, PRESALES_MANAGER_ROLE_CODES);
}

export function canViewOrphanProject(user: AuthUser | null | undefined): boolean {
  return hasGlobalProjectView(user);
}