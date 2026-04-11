import { config as loadEnv } from 'dotenv';
import { expect, test, type Page } from '@playwright/test';
import jwt from 'jsonwebtoken';

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

loadEnv({ path: '.env.local' });
loadEnv({ path: 'app_code/.env.local' });

test.describe('wave 10 formal validation', () => {
  test('keeps workbench metrics above the compact module tag section', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/workbench', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/workbench$/);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible({ timeout: 15_000 });

    const metricGrid = page.getByTestId('workbench-metric-grid');
    const moduleTagsSection = page.getByTestId('workbench-module-tags-section');

    await expect(metricGrid).toBeVisible();
    await expect(moduleTagsSection).toBeVisible();
    await expect(page.getByTestId('workbench-module-tag-日程管理')).toBeVisible();
    await expect(page.getByTestId('workbench-module-tag-任务中心')).toBeVisible();
    await expect(page.getByTestId('workbench-module-tag-消息中心')).toBeVisible();
    await expect(page.getByTestId('workbench-module-tag-预警管理')).toBeVisible();

    const metricsAppearBeforeTags = await page.evaluate(() => {
      const metricNode = document.querySelector('[data-testid="workbench-metric-grid"]');
      const tagNode = document.querySelector('[data-testid="workbench-module-tags-section"]');

      if (!metricNode || !tagNode) {
        return false;
      }

      return Boolean(metricNode.compareDocumentPosition(tagNode) & Node.DOCUMENT_POSITION_FOLLOWING);
    });

    expect(metricsAppearBeforeTags).toBeTruthy();
  });
});

async function loginAsAdmin(page: Page) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required for wave 10 formal auth setup');
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
    },
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
    },
  );

  expect(accessToken).toBeTruthy();
  expect(refreshToken).toBeTruthy();

  await page.context().addInitScript(
    ({ token, nextRefreshToken }) => {
      window.localStorage.setItem('token', token);
      window.localStorage.setItem('refresh_token', nextRefreshToken);
    },
    { token: accessToken, nextRefreshToken: refreshToken },
  );

  await page.context().addCookies([
    {
      name: 'token',
      value: accessToken,
      domain: TEST_BASE_ORIGIN.hostname,
      path: '/',
      httpOnly: true,
      secure: TEST_BASE_ORIGIN.protocol === 'https:',
      sameSite: 'Lax',
    },
    {
      name: 'refresh_token',
      value: refreshToken,
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