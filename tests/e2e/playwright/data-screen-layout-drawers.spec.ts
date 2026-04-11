import { config as loadEnv } from 'dotenv';
import { expect, test, type Page } from '@playwright/test';
import jwt from 'jsonwebtoken';

loadEnv({ path: '.env.local' });

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

test.describe('data-screen drawer layout validation', () => {
  test('opens left rail, right rail, and bottom band drawers from summary cards', async ({ page }) => {
    const authTokens = createAdminAuthTokens();
    await loginAsAdmin(page, authTokens);

    await page.goto('/data-screen');
    await expect(page.getByTestId('data-screen-page')).toBeVisible({ timeout: 20_000 });

    await expect(page.getByTestId('data-screen-left-rail-zone-summary')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('data-screen-right-rail-secondary-modules')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('data-screen-region-bottom-band')).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('data-screen-left-rail-open-detail').click();
    await expect(page.getByTestId('data-screen-left-rail-detail-drawer')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('data-screen-left-rail-detail-drawer-title')).toContainText('完整面板');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('data-screen-left-rail-detail-drawer')).toBeHidden({ timeout: 20_000 });

    await page.getByTestId('data-screen-right-rail-secondary-card-risk').click();
    await expect(page.getByTestId('data-screen-right-rail-secondary-drawer')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('data-screen-right-rail-secondary-drawer-title')).toHaveText('风险摘要');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('data-screen-right-rail-secondary-drawer')).toBeHidden({ timeout: 20_000 });

    await page.getByTestId('data-screen-region-bottom-panel-customers').getByRole('button', { name: '查看客户全景' }).click();
    await expect(page.getByTestId('data-screen-region-bottom-drawer')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('data-screen-region-bottom-drawer-title')).toHaveText('客户盘子');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('data-screen-region-bottom-drawer')).toBeHidden({ timeout: 20_000 });
  });
});

function createAdminAuthTokens() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required for data-screen drawer layout auth setup');
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