import { config as loadEnv } from 'dotenv';
import { expect, test, request as playwrightRequest, type APIRequestContext, type Page } from '@playwright/test';
import jwt from 'jsonwebtoken';

loadEnv({ path: '.env.local' });

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

test.describe('data-screen formal validation', () => {
  test('shows region-view data-screen with API-aligned KPI stats', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;

    try {
      const authTokens = createAdminAuthTokens();
      await loginAsAdmin(page, authTokens);
      apiContext = await createApiContextFromPage(page);

      // Navigate to the data screen and wait for it to fully render first.
      // Fetching the API reference AFTER page load minimises the race window
      // with other concurrent test workers that create/delete projects.
      await page.goto('/data-screen');
      await expect(page.getByTestId('data-screen-page')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('data-screen-region-layout')).toBeVisible({ timeout: 20_000 });

      // KPI bar is present
      await expect(page.getByTestId('data-screen-kpi-bar')).toBeVisible({ timeout: 20_000 });

      // Fetch reference data AFTER the page has settled so both sources
      // reflect the same DB snapshot (or at most ±1 project).
      const regionViewResponse = await apiContext.get('/api/data-screen/region-view');
      expect(regionViewResponse.ok()).toBeTruthy();
      const regionViewPayload = await regionViewResponse.json();
      const kpi = regionViewPayload?.data?.kpi;
      expect(kpi).toBeTruthy();

      const expectedCustomers = kpi.totalCustomers ?? 0;
      const expectedProjects  = kpi.totalProjects  ?? 0;

      // API-aligned KPI values
      await expect(page.getByTestId('data-screen-kpi-totalCustomers')).toContainText(
        String(expectedCustomers),
        { timeout: 20_000 },
      );
      await expect(page.getByTestId('data-screen-kpi-totalProjects')).toContainText(
        String(expectedProjects),
        { timeout: 20_000 },
      );

      // Map stage and chart area are rendered
      await expect(page.getByTestId('data-screen-region-map-stage')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('项目阶段分布').first()).toBeVisible({ timeout: 20_000 });
    } finally {
      if (apiContext) {
        await apiContext.dispose();
      }
    }
  });

  test('remains stable during repeated data-screen navigation', async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (error) => {
      pageErrors.push(String(error));
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    const authTokens = createAdminAuthTokens();
    await loginAsAdmin(page, authTokens);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await page.goto('/data-screen');
      await expect(page.getByTestId('data-screen-page')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('data-screen-region-layout')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('data-screen-kpi-bar')).toBeVisible({ timeout: 20_000 });
    }

    const blockingConsoleErrors = consoleErrors.filter(
      (message) => !message.includes('Failed to fetch permissions')
    );

    expect(pageErrors).toEqual([]);
    expect(blockingConsoleErrors).toEqual([]);
  });
});

function createAdminAuthTokens() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required for data-screen formal auth setup');
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

async function createApiContextFromPage(page: Page) {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();

  return playwrightRequest.newContext({
    baseURL: TEST_BASE_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}