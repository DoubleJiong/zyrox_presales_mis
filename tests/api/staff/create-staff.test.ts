import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const valuesMock = vi.fn();
const returningMock = vi.fn(async () => [{ id: 101, username: 'new.user' }]);

vi.mock('drizzle-orm', () => ({
  desc: vi.fn(),
  eq: vi.fn(),
  inArray: vi.fn(),
}));

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 1 });
  },
}));

vi.mock('@/db/schema', () => ({
  users: {
    id: 'users.id',
  },
  roles: {
    id: 'roles.id',
  },
  userRoles: {
    userId: 'userRoles.userId',
  },
}));

vi.mock('@/db', () => ({
  db: {
    insert: () => ({
      values: valuesMock,
    }),
  },
}));

vi.mock('@/modules/identity/password-lifecycle-service', () => ({
  markInitialPasswordLifecycle: vi.fn(async () => undefined),
}));

describe('staff creation hardening', () => {
  beforeEach(() => {
    valuesMock.mockReset();
    returningMock.mockClear();
    valuesMock.mockReturnValue({
      returning: returningMock,
    });
  });

  it('rejects staff creation when password is missing', async () => {
    const { POST } = await import('../../../src/app/api/staff/route');

    const response = await POST(
      new NextRequest('http://localhost/api/staff', {
        method: 'POST',
        body: JSON.stringify({
          username: 'new_user',
          realName: '新员工',
          email: 'new.user@example.com',
        }),
        headers: {
          'content-type': 'application/json',
        },
      })
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
      },
    });
    expect(valuesMock).not.toHaveBeenCalled();
  });

  it('requires an explicit password and hashes it before insert', async () => {
    const { POST } = await import('../../../src/app/api/staff/route');

    const response = await POST(
      new NextRequest('http://localhost/api/staff', {
        method: 'POST',
        body: JSON.stringify({
          username: 'new_user',
          password: 'StrongPass1',
          realName: '新员工',
          email: 'new.user@example.com',
          phone: '',
          department: '售前部',
          roleId: null,
          status: 'active',
        }),
        headers: {
          'content-type': 'application/json',
        },
      })
    );

    expect(response.status).toBe(200);
    expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({
      username: 'new_user',
      password: expect.any(String),
      realName: '新员工',
      email: 'new.user@example.com',
      department: '售前部',
      roleId: null,
      status: 'active',
    }));
    expect(valuesMock.mock.calls[0][0].password).not.toBe('StrongPass1');
  });
});