import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const executeMock = vi.fn();
const insertValuesMock = vi.fn();
const insertMock = vi.fn(() => ({ values: insertValuesMock }));

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 7 });
  },
  superAdminOnly: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => {
      if (req.headers.get('x-test-admin') === '1') {
        return handler(req, { userId: 1 });
      }

      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: '需要超级管理员权限' } }, { status: 403 });
    };
  },
}));

vi.mock('@/db', () => ({
  db: {
    execute: executeMock,
    insert: insertMock,
  },
}));

vi.mock('@/db/schema', () => ({
  operationLogs: {},
}));

vi.mock('drizzle-orm', () => ({
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ type: 'sql', strings, values }),
    {
      identifier: (value: string) => ({ type: 'identifier', value }),
    }
  ),
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown, options?: { status?: number }) => NextResponse.json({ success: true, data }, { status: options?.status ?? 200 }),
  errorResponse: (code: string, message: string, options?: { status?: number }) =>
    NextResponse.json({ success: false, error: { code, message } }, { status: options?.status ?? 400 }),
}));

describe('reset system route', () => {
  beforeEach(() => {
    vi.resetModules();
    executeMock.mockReset();
    insertValuesMock.mockReset();
    insertMock.mockClear();
  });

  it('returns stats through the protected GET route', async () => {
    executeMock.mockResolvedValue([{ count: '3' }]);

    const { GET } = await import('../../../src/app/api/settings/reset-system/route');
    const response = await GET(new NextRequest('http://localhost/api/settings/reset-system'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: expect.objectContaining({
        角色: 3,
        项目: 3,
      }),
    });
  });

  it('blocks non-admin reset attempts', async () => {
    const { POST } = await import('../../../src/app/api/settings/reset-system/route');
    const response = await POST(new NextRequest('http://localhost/api/settings/reset-system', {
      method: 'POST',
    }));

    expect(response.status).toBe(403);
    expect(executeMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: expect.objectContaining({ code: 'FORBIDDEN' }),
    });
  });

  it('resets base data and records the operation for admins', async () => {
    executeMock.mockResolvedValue([]);
    insertValuesMock.mockResolvedValue(undefined);

    const { POST } = await import('../../../src/app/api/settings/reset-system/route');
    const response = await POST(new NextRequest('http://localhost/api/settings/reset-system', {
      method: 'POST',
      headers: new Headers({ 'x-test-admin': '1' }),
    }));

    expect(response.status).toBe(200);
    expect(executeMock).toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 1,
      action: '恢复出厂设置',
      status: 'success',
    }));
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: expect.objectContaining({
        message: '系统已恢复出厂设置',
        executionResult: expect.objectContaining({ success: true }),
      }),
    });
  });
});