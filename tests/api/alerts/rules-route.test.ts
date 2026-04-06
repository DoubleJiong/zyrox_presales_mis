import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const returning = vi.fn();
const values = vi.fn(() => ({ returning }));
const insert = vi.fn(() => ({ values }));
const execute = vi.fn();

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 7 });
  },
}));

vi.mock('@/db', () => ({
  db: {
    insert,
    execute,
  },
}));

vi.mock('@/db/schema', () => ({
  alertRules: {},
  users: { id: 'users.id', realName: 'users.realName' },
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  inArray: vi.fn(),
  sql: {
    raw: vi.fn((value: string) => value),
  },
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown) => NextResponse.json({ success: true, data }),
  errorResponse: (code: string, message: string, options?: { status?: number }) =>
    NextResponse.json({ success: false, error: { code, message } }, { status: options?.status ?? 500 }),
}));

describe('alerts rules api', () => {
  beforeEach(() => {
    insert.mockImplementation(() => ({ values }));
    values.mockImplementation(() => ({ returning }));
    returning.mockReset();
    execute.mockReset();
  });

  it('creates an active alert rule with normalized numeric threshold', async () => {
    returning.mockResolvedValue([{ id: 9, ruleName: '项目长期未更新', status: 'active', thresholdValue: 30 }]);

    const { POST } = await import('../../../src/app/api/alerts/rules/route');
    const response = await POST(new NextRequest('http://localhost/api/alerts/rules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ruleName: '项目长期未更新',
        ruleType: 'project',
        ruleCategory: 'not_updated',
        conditionField: 'updatedAt',
        thresholdValue: '30',
        thresholdUnit: 'day',
        notificationChannels: ['system'],
      }),
    }));

    expect(response.status).toBe(200);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      ruleName: '项目长期未更新',
      ruleType: 'project',
      ruleCategory: 'not_updated',
      thresholdValue: 30,
      status: 'active',
      createdBy: 7,
    }));
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: expect.objectContaining({
        id: 9,
        message: '预警规则创建成功',
      }),
    });
  });

  it('self-heals alert rule id sequence drift and retries once', async () => {
    returning
      .mockRejectedValueOnce({ cause: { code: '23505', constraint_name: 'bus_alert_rule_pkey' } })
      .mockResolvedValueOnce([{ id: 10, ruleName: '项目长期未更新', status: 'active', thresholdValue: 15 }]);

    const { POST } = await import('../../../src/app/api/alerts/rules/route');
    const response = await POST(new NextRequest('http://localhost/api/alerts/rules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ruleName: '项目长期未更新',
        ruleType: 'project',
        ruleCategory: 'not_updated',
        conditionField: 'updatedAt',
        thresholdValue: '15',
        thresholdUnit: 'day',
      }),
    }));

    expect(response.status).toBe(200);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(returning).toHaveBeenCalledTimes(2);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: expect.objectContaining({
        id: 10,
        message: '预警规则创建成功',
      }),
    });
  });
});