import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const findManyRolePermissions = vi.fn();
const findFirstRolePermission = vi.fn();
const findManyRoles = vi.fn();
const findFirstRole = vi.fn();

const returningMock = vi.fn();
const insertValuesMock = vi.fn(() => ({ returning: returningMock }));
const insertMock = vi.fn(() => ({ values: insertValuesMock }));

const updateReturningMock = vi.fn();
const updateWhereMock = vi.fn(() => ({ returning: updateReturningMock }));
const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
const updateMock = vi.fn(() => ({ set: updateSetMock }));

const deleteWhereMock = vi.fn();
const deleteMock = vi.fn(() => ({ where: deleteWhereMock }));

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 9 });
  },
}));

vi.mock('@/db', () => ({
  db: {
    query: {
      roleDataPermissions: {
        findMany: findManyRolePermissions,
        findFirst: findFirstRolePermission,
      },
      roles: {
        findMany: findManyRoles,
        findFirst: findFirstRole,
      },
    },
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  },
}));

vi.mock('@/db/schema', () => ({
  roles: { id: 'roles.id' },
  roleDataPermissions: { id: 'roleDataPermissions.id', roleId: 'roleDataPermissions.roleId', resource: 'roleDataPermissions.resource' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown) => NextResponse.json({ success: true, data }),
  errorResponse: (code: string, message: string, options?: { status?: number }) =>
    NextResponse.json({ success: false, error: { code, message } }, { status: options?.status ?? 500 }),
}));

describe('settings data permissions route', () => {
  beforeEach(() => {
    vi.resetModules();
    findManyRolePermissions.mockReset();
    findFirstRolePermission.mockReset();
    findManyRoles.mockReset();
    findFirstRole.mockReset();
    returningMock.mockReset();
    insertValuesMock.mockClear();
    insertMock.mockClear();
    updateReturningMock.mockReset();
    updateWhereMock.mockClear();
    updateSetMock.mockClear();
    updateMock.mockClear();
    deleteWhereMock.mockReset();
    deleteMock.mockClear();
  });

  it('lists permissions and roles', async () => {
    findManyRolePermissions.mockResolvedValue([{ id: 3, roleId: 2, resource: 'project', scope: 'self', role: { id: 2, roleName: '售前主管', roleCode: 'presale_manager' } }]);
    findManyRoles.mockResolvedValue([{ id: 2, roleName: '售前主管', roleCode: 'presale_manager' }]);

    const { GET } = await import('../../../src/app/api/settings/data-permissions/route');
    const response = await GET(new NextRequest('http://localhost/api/settings/data-permissions'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        permissions: [expect.objectContaining({ id: 3, resource: 'project', scope: 'self' })],
        roles: [expect.objectContaining({ id: 2, roleName: '售前主管' })],
      },
    });
  });

  it('creates a new permission while normalizing string role ids', async () => {
    findFirstRole.mockResolvedValue({ id: 2, roleName: '售前主管', roleCode: 'presale_manager' });
    findFirstRolePermission.mockResolvedValue(null);
    returningMock.mockResolvedValue([{ id: 11, roleId: 2, resource: 'alert', scope: 'self' }]);

    const { POST } = await import('../../../src/app/api/settings/data-permissions/route');
    const response = await POST(new NextRequest('http://localhost/api/settings/data-permissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roleId: '2', resource: 'alert', scope: 'self' }),
    }));

    expect(response.status).toBe(200);
    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({ roleId: 2, resource: 'alert', scope: 'self' }));
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: expect.objectContaining({ id: 11, roleId: 2, resource: 'alert', scope: 'self' }),
    });
  });

  it('updates an existing permission for the same role and resource', async () => {
    findFirstRole.mockResolvedValue({ id: 2, roleName: '售前主管', roleCode: 'presale_manager' });
    findFirstRolePermission.mockResolvedValue({ id: 11, roleId: 2, resource: 'alert', scope: 'self' });
    updateReturningMock.mockResolvedValue([{ id: 11, roleId: 2, resource: 'alert', scope: 'all' }]);

    const { POST } = await import('../../../src/app/api/settings/data-permissions/route');
    const response = await POST(new NextRequest('http://localhost/api/settings/data-permissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roleId: 2, resource: 'alert', scope: 'all' }),
    }));

    expect(response.status).toBe(200);
    expect(insertMock).not.toHaveBeenCalled();
    expect(updateSetMock).toHaveBeenCalledWith(expect.objectContaining({ scope: 'all' }));
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: expect.objectContaining({ id: 11, scope: 'all' }),
    });
  });

  it('deletes a permission by id', async () => {
    deleteWhereMock.mockResolvedValue(undefined);

    const { DELETE } = await import('../../../src/app/api/settings/data-permissions/route');
    const response = await DELETE(new NextRequest('http://localhost/api/settings/data-permissions?id=11', {
      method: 'DELETE',
    }));

    expect(response.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { deleted: true },
    });
  });
});