import { describe, expect, it, vi } from 'vitest';

import { dataCache } from '../../../src/lib/data-cache';

describe('dataCache', () => {
  it('deduplicates concurrent async fetches for the same key', async () => {
    dataCache.clear();
    const fetcher = vi.fn(async () => {
      await Promise.resolve();
      return { ok: true };
    });

    const [first, second] = await Promise.all([
      dataCache.getOrSetAsync('data-screen:test', fetcher, 1000),
      dataCache.getOrSetAsync('data-screen:test', fetcher, 1000),
    ]);

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('invalidates cache entries by prefix', async () => {
    dataCache.clear();
    await dataCache.getOrSetAsync('data-screen:region-view:test', async () => ({ scope: 'region' }), 1000);
    await dataCache.getOrSetAsync('data-screen:personnel-view:test', async () => ({ scope: 'personnel' }), 1000);

    const deletedCount = dataCache.invalidateByPrefix('data-screen:region-view');

    expect(deletedCount).toBe(1);
    expect(dataCache.get('data-screen:region-view:test')).toBeNull();
    expect(dataCache.get('data-screen:personnel-view:test')).toEqual({ scope: 'personnel' });
  });
});