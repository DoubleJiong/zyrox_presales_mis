import { beforeEach, describe, expect, it, vi } from 'vitest';

const executeMock = vi.fn();

vi.mock('@/db', () => ({
  db: {
    execute: executeMock,
  },
}));

describe('idempotency storage recovery', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    executeMock.mockReset();
  });

  it('creates the missing idempotency table and retries reads', async () => {
    const missingTableError = Object.assign(new Error('relation "idempotency_keys" does not exist'), {
      code: '42P01',
    });

    executeMock
      .mockRejectedValueOnce(missingTableError)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ response: '{"success":true}', createdAt: new Date() }] });

    const { checkIdempotencyKey } = await import('../../../src/lib/idempotency');
    const result = await checkIdempotencyKey('project:1:create:test');

    expect(result).toBe('{"success":true}');
    expect(executeMock).toHaveBeenCalledTimes(4);
  });

  it('creates the missing idempotency table and retries writes', async () => {
    vi.useFakeTimers();
    const missingTableError = Object.assign(new Error('relation "idempotency_keys" does not exist'), {
      code: '42P01',
    });

    executeMock
      .mockRejectedValueOnce(missingTableError)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const { storeIdempotencyKey } = await import('../../../src/lib/idempotency');
    await storeIdempotencyKey('project:1:create:test', '{"success":true}');
    await vi.runAllTimersAsync();

    expect(executeMock).toHaveBeenCalledTimes(4);
  });
});