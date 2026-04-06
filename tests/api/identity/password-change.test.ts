import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const selectLimit = vi.fn();
const selectWhere = vi.fn(() => ({ limit: selectLimit }));
const selectFrom = vi.fn(() => ({ where: selectWhere }));
const select = vi.fn(() => ({ from: selectFrom }));
const updateWhere = vi.fn();
const updateSet = vi.fn(() => ({ where: updateWhere }));
const update = vi.fn(() => ({ set: updateSet }));
const insertValues = vi.fn();
const insert = vi.fn(() => ({ values: insertValues }));

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 7 });
  },
}));

vi.mock('@/db', () => ({
  db: {
    select,
    update,
    insert,
  },
}));

vi.mock('@/db/schema', () => ({
  users: {
    id: 'users.id',
    password: 'users.password',
    mustChangePassword: 'users.mustChangePassword',
    passwordChangedAt: 'users.passwordChangedAt',
    updatedAt: 'users.updatedAt',
  },
  operationLogs: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(async (plain: string) => plain === 'old-pass'),
    hash: vi.fn(async () => 'hashed-new-pass'),
  },
}));

describe('change password api', () => {
  beforeEach(() => {
    select.mockImplementation(() => ({ from: selectFrom }));
    selectFrom.mockImplementation(() => ({ where: selectWhere }));
    selectWhere.mockImplementation(() => ({ limit: selectLimit }));
    update.mockImplementation(() => ({ set: updateSet }));
    updateSet.mockImplementation(() => ({ where: updateWhere }));
    insert.mockImplementation(() => ({ values: insertValues }));
    selectLimit.mockReset();
    updateWhere.mockReset();
    insertValues.mockReset();
  });

  it('changes password and clears mustChangePassword flag', async () => {
    selectLimit.mockResolvedValue([{ id: 7, password: 'hashed-old-pass' }]);

    const { POST } = await import('../../../src/app/api/auth/change-password/route');
    const response = await POST(new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        oldPassword: 'old-pass',
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123',
      }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      password: 'hashed-new-pass',
      mustChangePassword: false,
    }));
    expect(insertValues).toHaveBeenCalled();
  });
});