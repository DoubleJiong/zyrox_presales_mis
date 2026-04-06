import type { AuthUser } from '@/lib/jwt';
import { hasRoleCode, isAdminUser } from './project-policy';

const GLOBAL_DASHBOARD_ROLE_CODES = [
  'presales_manager',
  'presale_manager',
  'sales_manager',
  'commercial_manager',
  'finance_specialist',
];

export function canViewGlobalDashboard(user: AuthUser | null | undefined): boolean {
  return isAdminUser(user) || hasRoleCode(user, GLOBAL_DASHBOARD_ROLE_CODES);
}

export function getDashboardScope(user: AuthUser | null | undefined): 'global' | 'self' {
  return canViewGlobalDashboard(user) ? 'global' : 'self';
}