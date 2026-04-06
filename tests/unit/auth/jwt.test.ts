import { beforeEach, describe, expect, it, vi } from 'vitest';

const blacklistHashes = new Set<string>();

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
      values: () => ({
        onConflictDoNothing: () => Promise.resolve(),
      }),
    }),
    delete: () => ({
      where: () => Promise.resolve(),
    }),
  },
}));

describe('jwt auth helpers', () => {
  beforeEach(() => {
    blacklistHashes.clear();
    process.env.JWT_SECRET = 'phase-1-test-secret';
  });

  it('generates and verifies access token with the unified secret', async () => {
    const { generateAccessToken, verifyToken } = await import('../../../src/lib/jwt');

    const token = generateAccessToken({
      id: 7,
      email: 'tester@example.com',
      roleCode: 'admin',
      roleId: 1,
    });

    const payload = verifyToken(token);

    expect(payload).toMatchObject({
      userId: 7,
      email: 'tester@example.com',
      roleCode: 'admin',
      roleId: 1,
    });
  });

  it('extracts token from header but rejects query token by default', async () => {
    const { extractToken } = await import('../../../src/lib/jwt');

    const headerRequest = new Request('http://localhost/api/projects', {
      headers: {
        authorization: 'Bearer header-token',
      },
    });

    const queryRequest = new Request('http://localhost/api/events?token=query-token');

    expect(extractToken(headerRequest)).toBe('header-token');
    expect(extractToken(queryRequest)).toBeNull();
  });
});