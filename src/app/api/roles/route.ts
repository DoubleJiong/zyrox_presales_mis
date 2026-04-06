import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roles } from '@/db/schema';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

const SYSTEM_ROLE_CODES = new Set([
  'admin',
  'presale_manager',
  'hq_presale_engineer',
  'regional_presale_engineer',
  'solution_engineer',
  'sales_rep',
  'finance_specialist',
]);

function isSystemRoleCode(roleCode: string | null | undefined) {
  return !!roleCode && SYSTEM_ROLE_CODES.has(roleCode.toLowerCase());
}

async function syncRolesIdSequence() {
  await db.execute(sql`
    SELECT setval(
      pg_get_serial_sequence('sys_role', 'id'),
      COALESCE((SELECT MAX(id) FROM sys_role), 1),
      true
    )
  `);
}

// GET - 获取角色列表
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const roleList = await db
      .select({
        id: roles.id,
        roleName: roles.roleName,
        roleCode: roles.roleCode,
        description: roles.description,
        status: roles.status,
        permissions: roles.permissions,
        createdAt: roles.createdAt,
      })
      .from(roles)
      .where(isNull(roles.deletedAt))
      .orderBy(desc(roles.id));

    return successResponse(roleList);
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    return errorResponse('INTERNAL_ERROR', '获取角色列表失败');
  }
});

// POST - 创建角色
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const body = await request.json();
    const { roleName, roleCode, description, status, permissions } = body;
    const normalizedRoleName = typeof roleName === 'string' ? roleName.trim() : '';
    const normalizedRoleCode = typeof roleCode === 'string' ? roleCode.trim().toLowerCase() : '';
    const normalizedPermissions = Array.isArray(permissions) ? permissions : [];

    if (!normalizedRoleName || !normalizedRoleCode) {
      return errorResponse('BAD_REQUEST', '角色名称和编码不能为空', { status: 400 });
    }

    // 检查角色编码是否已存在
    const existing = await db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.roleCode, normalizedRoleCode),
          isNull(roles.deletedAt)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return errorResponse('BAD_REQUEST', '角色编码已存在', { status: 400 });
    }

    await syncRolesIdSequence();

    const [newRole] = await db
      .insert(roles)
      .values({
        roleName: normalizedRoleName,
        roleCode: normalizedRoleCode,
        description: description || null,
        status: status || 'active',
        permissions: normalizedPermissions,
      })
      .returning();

    return successResponse(newRole, { status: 201 });
  } catch (error) {
    console.error('Failed to create role:', error);
    return errorResponse('INTERNAL_ERROR', '创建角色失败');
  }
});

// PUT - 更新角色
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const body = await request.json();
    const { id, roleName, description, status, permissions } = body;
    const normalizedId = Number(id);
    const normalizedRoleName = typeof roleName === 'string' ? roleName.trim() : '';
    const normalizedPermissions = Array.isArray(permissions) ? permissions : undefined;

    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      return errorResponse('BAD_REQUEST', '角色ID不能为空', { status: 400 });
    }

    // 检查角色是否存在
    const existing = await db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.id, normalizedId),
          isNull(roles.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return errorResponse('NOT_FOUND', '角色不存在', { status: 404 });
    }

    // 更新角色
    const [updatedRole] = await db
      .update(roles)
      .set({
        roleName: normalizedRoleName || existing[0].roleName,
        description: description !== undefined ? description : existing[0].description,
        status: status || existing[0].status,
        permissions: normalizedPermissions ?? existing[0].permissions,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, normalizedId))
      .returning();

    return successResponse(updatedRole);
  } catch (error) {
    console.error('Failed to update role:', error);
    return errorResponse('INTERNAL_ERROR', '更新角色失败');
  }
});

// DELETE - 删除角色
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      return errorResponse('BAD_REQUEST', '角色ID不能为空', { status: 400 });
    }

    // 检查角色是否存在
    const existing = await db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.id, id),
          isNull(roles.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return errorResponse('NOT_FOUND', '角色不存在', { status: 404 });
    }

    if (isSystemRoleCode(existing[0].roleCode)) {
      return errorResponse('BAD_REQUEST', '系统预设角色不能删除', { status: 400 });
    }

    // 软删除（设置deletedAt）
    await db
      .update(roles)
      .set({
        deletedAt: new Date(),
        status: 'inactive',
        updatedAt: new Date(),
      })
      .where(eq(roles.id, id));

    return successResponse({ deleted: true });
  } catch (error) {
    console.error('Failed to delete role:', error);
    return errorResponse('INTERNAL_ERROR', '删除角色失败');
  }
});
