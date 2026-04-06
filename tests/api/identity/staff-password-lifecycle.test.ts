import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const returning = vi.fn();
const values = vi.fn(() => ({ returning }));
const insert = vi.fn(() => ({ values }));
const updateReturning = vi.fn();
const updateWhere = vi.fn(() => ({ returning: updateReturning }));
const updateSet = vi.fn(() => ({ where: updateWhere }));
const update = vi.fn(() => ({ set: updateSet }));
const selectWhere = vi.fn();
const selectFrom = vi.fn(() => ({ where: selectWhere }));
const select = vi.fn(() => ({ from: selectFrom }));

const markInitialPasswordLifecycle = vi.fn();
const markAdminPasswordReset = vi.fn();

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 99 });
  },
}));

vi.mock('@/db', () => ({
  db: {
    insert,
    update,
    select,
  },
}));

vi.mock('@/modules/identity/password-lifecycle-service', () => ({
  markInitialPasswordLifecycle,
  markAdminPasswordReset,
}));

vi.mock('@/db/schema', () => ({
  users: {
    id: 'users.id',
    password: 'users.password',
    username: 'users.username',
    realName: 'users.realName',
    email: 'users.email',
    phone: 'users.phone',
    department: 'users.department',
    roleId: 'users.roleId',
    avatar: 'users.avatar',
    status: 'users.status',
    mustChangePassword: 'users.mustChangePassword',
    passwordResetAt: 'users.passwordResetAt',
    passwordResetBy: 'users.passwordResetBy',
    updatedAt: 'users.updatedAt',
    lastLoginTime: 'users.lastLoginTime',
    createdAt: 'users.createdAt',
    hireDate: 'users.hireDate',
    position: 'users.position',
    location: 'users.location',
    birthday: 'users.birthday',
    gender: 'users.gender',
  },
  roles: { id: 'roles.id', roleName: 'roles.roleName', roleCode: 'roles.roleCode' },
  userRoles: { userId: 'userRoles.userId', roleId: 'userRoles.roleId' },
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn(),
  eq: vi.fn(),
  inArray: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  hash: vi.fn(async () => 'hashed-pass'),
}));

describe('staff password lifecycle', () => {
  beforeEach(() => {
    insert.mockImplementation(() => ({ values }));
    values.mockImplementation(() => ({ returning }));
    update.mockImplementation(() => ({ set: updateSet }));
    updateSet.mockImplementation(() => ({ where: updateWhere }));
    select.mockImplementation(() => ({ from: selectFrom }));
    selectFrom.mockImplementation(() => ({ where: selectWhere }));
    markInitialPasswordLifecycle.mockReset();
    markAdminPasswordReset.mockReset();
  });

  it('marks new accounts as requiring password change', async () => {
    returning.mockResolvedValue([{ id: 12, username: 'new_user' }]);

    const { POST } = await import('../../../src/app/api/staff/route');
    const response = await POST(new NextRequest('http://localhost/api/staff', {
      method: 'POST',
      body: JSON.stringify({
        username: 'new_user',
        password: 'NewPass123',
        realName: '新用户',
        email: 'new.user@example.com',
      }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      mustChangePassword: true,
      passwordResetBy: 99,
    }));
    expect(markInitialPasswordLifecycle).toHaveBeenCalledWith(12, 99);
  });

  it('marks admin password resets as requiring password change', async () => {
    selectWhere.mockResolvedValue([{ id: 12, username: 'existing', realName: '旧用户', email: 'u@example.com', password: 'hashed-old', status: 'active', mustChangePassword: false }]);
    updateReturning.mockResolvedValue([{ id: 12 }]);

    const { PUT } = await import('../../../src/app/api/staff/route');
    const response = await PUT(new NextRequest('http://localhost/api/staff', {
      method: 'PUT',
      body: JSON.stringify({
        id: 12,
        password: 'ResetPass123',
      }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      mustChangePassword: true,
      passwordResetBy: 99,
    }));
    expect(markAdminPasswordReset).toHaveBeenCalledWith(12, 99);
  });
});