import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const blacklistHashes = new Set<string>();
const addConnection = vi.fn();
const removeConnection = vi.fn();

const schema = {
  users: {
    id: 'users.id',
    username: 'users.username',
    email: 'users.email',
    realName: 'users.realName',
    phone: 'users.phone',
    department: 'users.department',
    avatar: 'users.avatar',
    roleId: 'users.roleId',
    status: 'users.status',
  },
  roles: {
    id: 'roles.id',
    roleName: 'roles.roleName',
    roleCode: 'roles.roleCode',
    permissions: 'roles.permissions',
  },
  tokenBlacklist: {
    id: 'tokenBlacklist.id',
    tokenHash: 'tokenBlacklist.tokenHash',
    expiresAt: 'tokenBlacklist.expiresAt',
  },
};

vi.mock('@/db/schema', () => schema);

vi.mock('drizzle-orm', () => ({
  eq: (field: unknown, value: unknown) => ({ type: 'eq', field, value }),
  gt: (field: unknown, value: unknown) => ({ type: 'gt', field, value }),
  lt: (field: unknown, value: unknown) => ({ type: 'lt', field, value }),
  and: (...conditions: unknown[]) => ({ type: 'and', conditions }),
}));

function findEqValue(condition: any, field: string): unknown {
  if (!condition) {
    return undefined;
  }

  if (condition.type === 'eq' && condition.field === field) {
    return condition.value;
  }

  if (condition.type === 'and') {
    for (const item of condition.conditions) {
      const value = findEqValue(item, field);
      if (value !== undefined) {
        return value;
      }
    }
  }

  return undefined;
}

vi.mock('@/db', () => ({
  db: {
    select: () => {
      const state: { table?: unknown; condition?: unknown } = {};

      return {
        from(table: unknown) {
          state.table = table;
          return this;
        },
        leftJoin() {
          return this;
        },
        where(condition: unknown) {
          state.condition = condition;
          return this;
        },
        limit() {
          if (state.table === schema.tokenBlacklist) {
            const tokenHash = findEqValue(state.condition, 'tokenBlacklist.tokenHash');
            return Promise.resolve(tokenHash && blacklistHashes.has(String(tokenHash)) ? [{ id: 1 }] : []);
          }

          return Promise.resolve([
            {
              id: 7,
              username: 'tester',
              email: 'tester@example.com',
              realName: 'Tester',
              phone: null,
              department: null,
              avatar: null,
              roleId: 1,
              status: 'active',
              roleName: '管理员',
              roleCode: 'admin',
              permissions: ['*'],
            },
          ]);
        },
      };
    },
    insert: () => ({
      values: (value: { tokenHash?: string }) => {
        if (value.tokenHash) {
          blacklistHashes.add(value.tokenHash);
        }

        return {
          onConflictDoNothing: () => Promise.resolve(),
        };
      },
    }),
    delete: () => ({
      where: () => Promise.resolve(),
    }),
  },
}));

vi.mock('@/lib/realtime-service', () => ({
  sseManager: {
    addConnection,
    removeConnection,
  },
}));

describe('session flow hardening', () => {
  beforeEach(() => {
    blacklistHashes.clear();
    addConnection.mockReset();
    removeConnection.mockReset();
    process.env.JWT_SECRET = 'phase-1-test-secret';
  });

  it('returns 401 for protected api requests without a session token', async () => {
    const { proxy: middleware } = await import('../../../src/proxy');

    const response = await middleware(new NextRequest('http://localhost/api/dashboard'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('allows health endpoints without a session token', async () => {
    const { proxy: middleware } = await import('../../../src/proxy');

    const livenessResponse = await middleware(new NextRequest('http://localhost/api/health'));
    const readinessResponse = await middleware(new NextRequest('http://localhost/api/health/ready'));

    expect(livenessResponse.status).toBe(200);
    expect(readinessResponse.status).toBe(200);
  });

  it('rejects query token for sse connections', async () => {
    const { GET } = await import('../../../src/app/api/events/route');

    const response = await GET(new NextRequest('http://localhost/api/events?token=query-token'));
    const body = await response.text();

    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    expect(body).toContain('QUERY_TOKEN_DISABLED');
  });

  it('blacklists token on logout and reports the token hash as revoked', async () => {
    const jwtModule = await import('../../../src/lib/jwt');
    const { POST: logout } = await import('../../../src/app/api/auth/logout/route');
    const { POST: checkBlacklist } = await import('../../../src/app/api/auth/check-blacklist/route');

    const token = jwtModule.generateAccessToken({
      id: 7,
      email: 'tester@example.com',
      roleCode: 'admin',
      roleId: 1,
    });

    const logoutRequest = new NextRequest('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: {
        cookie: `token=${token}`,
      },
    });

    const logoutResponse = await logout(logoutRequest);
    expect(logoutResponse.status).toBe(200);

    const tokenHash = await jwtModule.hashToken(token);
    const checkResponse = await checkBlacklist(
      new NextRequest('http://localhost/api/auth/check-blacklist', {
        method: 'POST',
        body: JSON.stringify({ tokenHash }),
        headers: {
          'content-type': 'application/json',
        },
      })
    );

    expect(checkResponse.status).toBe(200);
    await expect(checkResponse.json()).resolves.toMatchObject({ blacklisted: true });
  });

  it('allows sse to authenticate with same-origin cookie session', async () => {
    const jwtModule = await import('../../../src/lib/jwt');
    const { GET } = await import('../../../src/app/api/events/route');

    const token = jwtModule.generateAccessToken({
      id: 7,
      email: 'tester@example.com',
      roleCode: 'admin',
      roleId: 1,
    });

    const response = await GET(
      new NextRequest('http://localhost/api/events', {
        headers: {
          cookie: `token=${token}`,
        },
      })
    );

    expect(response.headers.get('Content-Type')).toContain('text/event-stream');

    const reader = response.body?.getReader();
    const firstChunk = await reader?.read();
    await reader?.cancel();

    expect(addConnection).toHaveBeenCalledWith(7, expect.any(Object));
    expect(new TextDecoder().decode(firstChunk?.value)).toContain('connected');
  });
});