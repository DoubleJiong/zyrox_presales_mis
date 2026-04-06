import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { proxy as middleware } from '../../../src/proxy';

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  DEV_TEST_SETUP_ENABLED: process.env.DEV_TEST_SETUP_ENABLED,
  TEST_SECRET: process.env.TEST_SECRET,
};

describe('test setup user endpoint guards', () => {
  afterEach(() => {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.DEV_TEST_SETUP_ENABLED = originalEnv.DEV_TEST_SETUP_ENABLED;
    process.env.TEST_SECRET = originalEnv.TEST_SECRET;
    vi.resetModules();
  });

  it('returns 401 from middleware for unauthenticated access by default', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.DEV_TEST_SETUP_ENABLED;
    delete process.env.TEST_SECRET;

    const request = new NextRequest('http://localhost:5000/api/test/setup-user', {
      method: 'POST',
    });

    const response = await middleware(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: '请先登录',
      code: 'UNAUTHORIZED',
    });
  });
});