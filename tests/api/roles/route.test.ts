import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const limitMock = vi.fn();
const orderByMock = vi.fn();
const whereMock = vi.fn();
const fromMock = vi.fn();
const selectMock = vi.fn();

const returningMock = vi.fn();
const insertValuesMock = vi.fn(() => ({ returning: returningMock }));
const insertMock = vi.fn(() => ({ values: insertValuesMock }));
const executeMock = vi.fn();

const updateWhereMock = vi.fn();
const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
const updateMock = vi.fn(() => ({ set: updateSetMock }));

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 5 });
  },
}));

vi.mock('@/db', () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    execute: executeMock,
  },
}));

vi.mock('@/db/schema', () => ({
  roles: {
    id: 'roles.id',
    roleName: 'roles.roleName',
    roleCode: 'roles.roleCode',
    description: 'roles.description',
    status: 'roles.status',
    permissions: 'roles.permissions',
    createdAt: 'roles.createdAt',
    deletedAt: 'roles.deletedAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  desc: vi.fn((value: unknown) => ({ type: 'desc', value })),
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  isNull: vi.fn((value: unknown) => ({ type: 'isNull', value })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ type: 'sql', strings, values })),
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown, options?: { status?: number }) => NextResponse.json({ success: true, data }, { status: options?.status ?? 200 }),
  errorResponse: (code: string, message: string, options?: { status?: number }) =>
    NextResponse.json({ success: false, error: { code, message } }, { status: options?.status ?? 400 }),
}));

function configureSelectChain() {
  limitMock.mockReset();
  orderByMock.mockReset();
  whereMock.mockReset();
  fromMock.mockReset();
  selectMock.mockReset();

  whereMock.mockImplementation(() => ({
    limit: limitMock,
    orderBy: orderByMock,
  }));
  fromMock.mockImplementation(() => ({
    where: whereMock,
    orderBy: orderByMock,
    limit: limitMock,
  }));
  selectMock.mockImplementation(() => ({ from: fromMock }));
}

describe('roles route', () => {
  beforeEach(() => {
    vi.resetModules();
    configureSelectChain();
    returningMock.mockReset();
    insertValuesMock.mockClear();
    insertMock.mockClear();
    executeMock.mockReset();
    updateWhereMock.mockReset();
    updateSetMock.mockClear();
    updateMock.mockClear();
  });

  it('lists active roles only', async () => {
    orderByMock.mockResolvedValue([{ id: 7, roleName: '售前经理', roleCode: 'presale_manager', status: 'active', permissions: [] }]);

    const { GET } = await import('../../../src/app/api/roles/route');
    const response = await GET(new NextRequest('http://localhost/api/roles'));

    expect(response.status).toBe(200);
    expect(whereMock).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: [expect.objectContaining({ id: 7, roleCode: 'presale_manager' })],
    });
  });

  it('creates a role with normalized code and permissions', async () => {
    limitMock.mockResolvedValue([]);
    executeMock.mockResolvedValue(undefined);
    returningMock.mockResolvedValue([{ id: 12, roleName: '稳定性角色', roleCode: 'stability_role', permissions: ['alert_view'], status: 'active' }]);

    const { POST } = await import('../../../src/app/api/roles/route');
    const response = await POST(new NextRequest('http://localhost/api/roles', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        roleName: '  稳定性角色  ',
        roleCode: ' Stability_Role ',
        description: 'desc',
        permissions: ['alert_view'],
      }),
    }));

    expect(response.status).toBe(201);
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      roleName: '稳定性角色',
      roleCode: 'stability_role',
      permissions: ['alert_view'],
    }));
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: expect.objectContaining({ id: 12, roleCode: 'stability_role' }),
    });
  });

  it('updates an existing active role', async () => {
    limitMock.mockResolvedValue([{ id: 12, roleName: '稳定性角色', description: 'old', status: 'active', permissions: ['alert_view'] }]);
    updateWhereMock.mockReturnValue({
      returning: returningMock,
    });
    returningMock.mockResolvedValue([{ id: 12, roleName: '稳定性角色-已编辑', description: 'new', status: 'active', permissions: ['alert_view', 'project_view'] }]);

    const { PUT } = await import('../../../src/app/api/roles/route');
    const response = await PUT(new NextRequest('http://localhost/api/roles', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 12,
        roleName: ' 稳定性角色-已编辑 ',
        description: 'new',
        permissions: ['alert_view', 'project_view'],
      }),
    }));

    expect(response.status).toBe(200);
    expect(updateSetMock).toHaveBeenCalledWith(expect.objectContaining({
      roleName: '稳定性角色-已编辑',
      description: 'new',
      permissions: ['alert_view', 'project_view'],
    }));
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: expect.objectContaining({ id: 12, roleName: '稳定性角色-已编辑' }),
    });
  });

  it('rejects deleting a system role', async () => {
    limitMock.mockResolvedValue([{ id: 1, roleName: '系统管理员', roleCode: 'admin', status: 'active', permissions: ['*'] }]);

    const { DELETE } = await import('../../../src/app/api/roles/route');
    const response = await DELETE(new NextRequest('http://localhost/api/roles?id=1', {
      method: 'DELETE',
    }));

    expect(response.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: expect.objectContaining({ message: '系统预设角色不能删除' }),
    });
  });
});