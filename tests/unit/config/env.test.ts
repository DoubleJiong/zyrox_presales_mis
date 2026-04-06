import { afterEach, describe, expect, it } from 'vitest';

import { getEnv, resetEnvCacheForTests } from '../../../src/shared/config/env';

const originalDatabaseUrl = process.env.DATABASE_URL;

describe('getEnv', () => {
  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    resetEnvCacheForTests();
  });

  it('throws when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;

    expect(() => getEnv()).toThrowError(
      'Missing required environment variable: DATABASE_URL'
    );
  });

  it('returns the config when DATABASE_URL is present', () => {
    process.env.DATABASE_URL = 'postgresql://username:password@localhost:5432/presales_system';

    expect(getEnv()).toMatchObject({
      DATABASE_URL: 'postgresql://username:password@localhost:5432/presales_system',
    });
  });
});