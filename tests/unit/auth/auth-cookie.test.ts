import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { shouldUseSecureCookies } from '../../../src/lib/auth-cookie';

describe('auth cookie policy', () => {
  it('does not require secure cookies for plain http requests', () => {
    const request = new NextRequest('http://localhost:5004/api/auth/login');

    expect(shouldUseSecureCookies(request)).toBe(false);
  });

  it('requires secure cookies for https requests', () => {
    const request = new NextRequest('https://example.com/api/auth/login');

    expect(shouldUseSecureCookies(request)).toBe(true);
  });

  it('prefers x-forwarded-proto when the app is behind a reverse proxy', () => {
    const request = new NextRequest('http://internal-host/api/auth/login', {
      headers: {
        'x-forwarded-proto': 'https',
      },
    });

    expect(shouldUseSecureCookies(request)).toBe(true);
  });
});