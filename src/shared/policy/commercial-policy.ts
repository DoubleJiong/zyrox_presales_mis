import type { AuthUser } from '@/lib/jwt';
import { hasRoleCode, isAdminUser } from './project-policy';

const CONTRACT_MATERIAL_UPLOAD_ROLE_CODES = [
  'commercial_manager',
  'finance_specialist',
];

export function canUploadContractMaterial(user: AuthUser | null | undefined): boolean {
  return isAdminUser(user) || hasRoleCode(user, CONTRACT_MATERIAL_UPLOAD_ROLE_CODES);
}