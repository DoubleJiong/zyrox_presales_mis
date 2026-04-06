import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const returning = vi.fn();
const values = vi.fn(() => ({ returning }));
const deleteWhere = vi.fn();
const deleteMock = vi.fn(() => ({ where: deleteWhere }));
const insert = vi.fn(() => ({ values }));
const updateReturning = vi.fn();
const updateWhere = vi.fn(() => ({ returning: updateReturning }));
const updateSet = vi.fn(() => ({ where: updateWhere }));
const update = vi.fn(() => ({ set: updateSet }));
const execute = vi.fn();

const markInitialPasswordLifecycle = vi.fn();
const markAdminPasswordReset = vi.fn();

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 88 });
  },
}));

vi.mock('@/db', () => ({
  db: {
    insert,
    update,
    delete: deleteMock,
    execute,
  },
}));

vi.mock('@/modules/identity/password-lifecycle-service', () => ({
  markInitialPasswordLifecycle,
  markAdminPasswordReset,
}));

vi.mock('@/lib/permissions/data-scope', () => ({
  DataPermissionService: {
    getPermissionContext: vi.fn(),
  },
  DataScope: {
    NONE: 'none',
    ALL: 'all',
    ROLE: 'role',
    SELF: 'self',
  },
}));

vi.mock('@/lib/permissions/types', () => ({
  ADMIN_ROLE_CODES: ['admin'],
}));

vi.mock('@/db/schema', () => ({
  users: {
    id: 'users.id',
    username: 'users.username',
    email: 'users.email',
    realName: 'users.realName',
    password: 'users.password',
    roleId: 'users.roleId',
    department: 'users.department',
    phone: 'users.phone',
    baseLocation: 'users.baseLocation',
    status: 'users.status',
    mustChangePassword: 'users.mustChangePassword',
    passwordResetAt: 'users.passwordResetAt',
    passwordResetBy: 'users.passwordResetBy',
    updatedAt: 'users.updatedAt',
    createdAt: 'users.createdAt',
  },
  roles: {
    id: 'roles.id',
    roleName: 'roles.roleName',
    roleCode: 'roles.roleCode',
  },
  userRoles: {
    userId: 'userRoles.userId',
    roleId: 'userRoles.roleId',
  },
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn(),
  eq: vi.fn(),
  inArray: vi.fn(),
  and: vi.fn(),
  sql: vi.fn((strings: TemplateStringsArray) => strings.join('')),
}));

vi.mock('bcrypt', () => ({
  hash: vi.fn(async () => 'hashed-pass'),
}));

describe('users route password lifecycle', () => {
  beforeEach(() => {
    insert.mockImplementation(() => ({ values }));
    values.mockImplementation(() => ({ returning }));
    update.mockImplementation(() => ({ set: updateSet }));
    updateSet.mockImplementation(() => ({ where: updateWhere }));
    deleteMock.mockImplementation(() => ({ where: deleteWhere }));
    execute.mockReset();
    deleteWhere.mockReset();
    markInitialPasswordLifecycle.mockReset();
    markAdminPasswordReset.mockReset();
  });

  it('marks new users as requiring password change when created from canonical users api', async () => {
    returning.mockResolvedValueOnce([{ id: 15, username: 'new_user', email: 'new@example.com', realName: '新用户', status: 'active' }]);
    values.mockImplementationOnce(() => ({ returning }));
    values.mockImplementationOnce(() => ({ }));

    const { POST } = await import('../../../src/app/api/users/route');
    const response = await POST(new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({
        username: 'new_user',
        email: 'new@example.com',
        name: '新用户',
        password: 'ResetMe123',
        roleIds: [1],
      }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(201);
    expect(values).toHaveBeenNthCalledWith(1, expect.objectContaining({
      mustChangePassword: true,
      passwordResetBy: 88,
    }));
    expect(markInitialPasswordLifecycle).toHaveBeenCalledWith(15, 88);
  });

  it('marks admin password resets as requiring password change on canonical users api', async () => {
    updateReturning.mockResolvedValue([{ id: 15, username: 'existing', email: 'existing@example.com', realName: '旧用户', status: 'active' }]);

    const { PUT } = await import('../../../src/app/api/users/route');
    const response = await PUT(new NextRequest('http://localhost/api/users', {
      method: 'PUT',
      body: JSON.stringify({
        id: 15,
        password: 'ResetPass123',
      }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      password: expect.any(String),
      mustChangePassword: true,
      passwordResetBy: 88,
    }));
    expect(updateSet.mock.calls[0][0].password).not.toBe('ResetPass123');
    expect(markAdminPasswordReset).toHaveBeenCalledWith(15, 88);
  });
});