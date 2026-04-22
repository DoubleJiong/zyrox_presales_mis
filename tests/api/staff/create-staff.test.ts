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

  it('blocks staff creation (POST) with 405 METHOD_NOT_ALLOWED', async () => {
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

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
      },
    });
    expect(valuesMock).not.toHaveBeenCalled();
  });

  it('blocks all staff write operations — POST always returns 405', async () => {
    const { POST } = await import('../../../src/app/api/staff/route');

    const response = await POST(
      new NextRequest('http://localhost/api/staff', {
        method: 'POST',
        body: JSON.stringify({
          username: 'new_user',
          password: 'StrongPass1',
          realName: '新员工',
          email: 'new.user@example.com',
        }),
        headers: {
          'content-type': 'application/json',
        },
      })
    );

    expect(response.status).toBe(405);
    expect(valuesMock).not.toHaveBeenCalled();
  });
});