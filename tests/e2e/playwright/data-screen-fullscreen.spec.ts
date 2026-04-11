import { config as loadEnv } from 'dotenv';
import { expect, test, type Page } from '@playwright/test';
import jwt from 'jsonwebtoken';

loadEnv({ path: '.env.local' });

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

test.describe('data-screen fullscreen validation', () => {
  test('enters fullscreen on the data-screen container instead of the app shell', async ({ page }) => {
    const authTokens = createAdminAuthTokens();
    await loginAsAdmin(page, authTokens);

    await page.goto('/data-screen');
    await expect(page.getByTestId('data-screen-page')).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: '全屏' }).click();

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const fullscreenElement = document.fullscreenElement as HTMLElement | null;
          return {
            fullscreenTag: fullscreenElement?.dataset?.testid ?? fullscreenElement?.tagName ?? null,
            isPageContainer: fullscreenElement?.dataset?.testid === 'data-screen-page',
          };
        });
      })
      .toEqual({
        fullscreenTag: 'data-screen-page',
        isPageContainer: true,
      });

    await page.getByRole('button', { name: '退出全屏' }).click();

    await expect
      .poll(async () => page.evaluate(() => document.fullscreenElement === null))
      .toBe(true);
  });
});

function createAdminAuthTokens() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required for data-screen fullscreen auth setup');
  }

  const accessToken = jwt.sign(
    {
      userId: 1,
      email: 'admin@zhengyuan.com',
      roleCode: 'ADMIN',
      roleId: 1,
    },
    jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: '7d',
      issuer: 'zhengyuan-presales',
    }
  );

  const refreshToken = jwt.sign(
    {
      userId: 1,
      type: 'refresh',
    },
    jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: '30d',
      issuer: 'zhengyuan-presales',
    }
  );

  return { accessToken, refreshToken };
}

async function loginAsAdmin(page: Page, tokens: { accessToken: string; refreshToken: string }) {
  await page.context().addInitScript(
    ({ token, nextRefreshToken }) => {
      window.localStorage.setItem('token', token);
      window.localStorage.setItem('refresh_token', nextRefreshToken);
    },
    { token: tokens.accessToken, nextRefreshToken: tokens.refreshToken }
  );

  await page.context().addCookies([
    {
      name: 'token',
      value: tokens.accessToken,
      domain: TEST_BASE_ORIGIN.hostname,
      path: '/',
      httpOnly: true,
      secure: TEST_BASE_ORIGIN.protocol === 'https:',
      sameSite: 'Lax',
    },
    {
      name: 'refresh_token',
      value: tokens.refreshToken,
      domain: TEST_BASE_ORIGIN.hostname,
      path: '/',
      httpOnly: true,
      secure: TEST_BASE_ORIGIN.protocol === 'https:',
      sameSite: 'Lax',
    },
  ]);

  await page.goto('/');
  await page.waitForLoadState('networkidle');
}