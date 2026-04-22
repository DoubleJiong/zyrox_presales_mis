/**
 * POST /api/migrations/fix-role-permissions
 * 修复角色权限：为 regional_presale_engineer 和 sales_rep 补充所缺少的方案权限
 * 仅在权限缺失时追加，不影响已有权限
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roles } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { isSystemAdmin } from '@/lib/permissions/project';

const ROLE_PERMISSION_PATCHES: Record<string, string[]> = {
  regional_presale_engineer: [
    'project:create', 'project:update',
    'solution:create', 'solution:update', 'solution:delete',
  ],
  sales_rep: [
    'project:create', 'project:update',
    'solution:create',
  ],
};

export const POST = withAuth(async (
  _request: NextRequest,
  context: { userId: number }
) => {
  const isAdmin = await isSystemAdmin(context.userId);
  if (!isAdmin) {
    return errorResponse('FORBIDDEN', '仅管理员可执行此操作');
  }

  const results: { roleCode: string; added: string[]; skipped: string[] }[] = [];

  for (const [roleCode, permissionsToAdd] of Object.entries(ROLE_PERMISSION_PATCHES)) {
    const [role] = await db
      .select({ id: roles.id, permissions: roles.permissions })
      .from(roles)
      .where(eq(roles.roleCode, roleCode))
      .limit(1);

    if (!role) {
      results.push({ roleCode, added: [], skipped: ['角色不存在'] });
      continue;
    }

    const existing: string[] = Array.isArray(role.permissions) ? (role.permissions as string[]) : [];
    const toAdd = permissionsToAdd.filter(p => !existing.includes(p));
    const skipped = permissionsToAdd.filter(p => existing.includes(p));

    if (toAdd.length > 0) {
      const updated = [...existing, ...toAdd];
      await db
        .update(roles)
        .set({ permissions: updated as any, updatedAt: new Date() })
        .where(eq(roles.id, role.id));
    }

    results.push({ roleCode, added: toAdd, skipped });
  }

  return successResponse({ message: '角色权限修复完成', results });
});
