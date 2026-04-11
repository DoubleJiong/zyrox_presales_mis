import { config as loadEnv } from 'dotenv';
import { expect, test, request as playwrightRequest, type APIRequestContext, type Page } from '@playwright/test';
import jwt from 'jsonwebtoken';

loadEnv({ path: '.env.local' });

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

test.describe('data-screen formal validation', () => {
  test('shows staged cockpit modules with API-aligned stats and canonical drill-through', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;

    try {
      const authTokens = createAdminAuthTokens();
      await loginAsAdmin(page, authTokens);
      apiContext = await createApiContextFromPage(page);

      const endDate = toDateOnly(new Date());
      const startDate = toDateOnly(addDays(new Date(), -30));

      const heatmapResponse = await apiContext.get(`/api/data-screen/heatmap?mode=customer&startDate=${startDate}&endDate=${endDate}`);
      expect(heatmapResponse.ok()).toBeTruthy();
      const heatmapPayload = await heatmapResponse.json();
      const regions = Array.isArray(heatmapPayload?.data?.regions) ? heatmapPayload.data.regions : [];

      const overviewResponse = await apiContext.get(`/api/data-screen/overview?startDate=${startDate}&endDate=${endDate}`);
      expect(overviewResponse.ok()).toBeTruthy();
      const overviewPayload = await overviewResponse.json();
      const funnel = overviewPayload?.data?.funnel;
      const forecastSummary = overviewPayload?.data?.forecastSummary;
      const riskSummary = overviewPayload?.data?.riskSummary;
      const overviewSummary = overviewPayload?.data;

      const summaryTotalCustomers = overviewSummary?.totalCustomers || 0;
      const summaryTotalProjects = overviewSummary?.totalProjects || 0;
      const totalCustomers = regions.reduce((sum: number, region: { customerCount?: number }) => sum + (region.customerCount || 0), 0);
      const totalProjects = regions.reduce((sum: number, region: { projectCount?: number }) => sum + (region.projectCount || 0), 0);
      const totalAmount = regions.reduce((sum: number, region: { projectAmount?: number }) => sum + (region.projectAmount || 0), 0);

      await page.goto('/data-screen');
      await expect(page.getByTestId('data-screen-page')).toBeVisible();
      await expect(page.getByTestId('data-screen-primary-view-bar')).toBeVisible();
      await expect(page.getByTestId('data-screen-region-summary-belt')).toBeVisible();
      await expect(page.getByTestId('data-screen-region-map-stage')).toBeVisible();
      await expect(page.getByTestId('data-screen-region-bottom-band')).toBeVisible();
      await expect(page.getByTestId('data-screen-active-view-preset')).toContainText('管理层视图');
      await expect(page.getByTestId('data-screen-view-preset-card')).toContainText('仅切换模块编排与默认维度');
      await expect(page.getByTestId('data-screen-left-rail-zone-summary')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('data-screen-right-rail-secondary-modules')).toBeVisible({ timeout: 20_000 });

      await expect(page.getByTestId('data-screen-management-focus-panel')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('data-screen-region-summary-card-customers')).toContainText(String(summaryTotalCustomers), { timeout: 20_000 });
      await expect(page.getByTestId('data-screen-region-summary-card-projects')).toContainText(String(summaryTotalProjects), { timeout: 20_000 });

      await page.getByTestId('data-screen-right-rail-secondary-card-operations').click();
      await expect(page.getByTestId('data-screen-right-rail-secondary-drawer')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('data-screen-quick-stats-panel')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('data-screen-total-customers')).toHaveText(String(totalCustomers), { timeout: 20_000 });
      await expect(page.getByTestId('data-screen-total-projects')).toHaveText(String(totalProjects), { timeout: 20_000 });
      await expect(page.getByTestId('data-screen-total-amount')).toHaveText(`¥${(totalAmount / 10000).toFixed(0)}万`, { timeout: 20_000 });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('data-screen-right-rail-secondary-drawer')).toBeHidden({ timeout: 20_000 });

      await page.getByTestId('data-screen-right-rail-secondary-card-funnel').click();
      await expect(page.getByTestId('data-screen-right-rail-secondary-drawer')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('data-screen-funnel-open-projects-link')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('data-screen-funnel-total-open')).toHaveText(String(funnel?.totalOpenCount || 0), { timeout: 20_000 });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('data-screen-right-rail-secondary-drawer')).toBeHidden({ timeout: 20_000 });

      await page.getByTestId('data-screen-right-rail-secondary-card-forecast').click();
      await expect(page.getByTestId('data-screen-right-rail-secondary-drawer')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('data-screen-forecast-panel')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('data-screen-forecast-coverage-rate')).toHaveText(`${forecastSummary?.coverageRate || 0}%`, { timeout: 20_000 });
      await expect(page.getByTestId('data-screen-forecast-gap-amount')).toHaveText(`¥${((forecastSummary?.gapAmount || 0) / 10000).toFixed((forecastSummary?.gapAmount || 0) >= 1000000 ? 0 : 1)}万`, { timeout: 20_000 });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('data-screen-right-rail-secondary-drawer')).toBeHidden({ timeout: 20_000 });

      await page.getByTestId('data-screen-right-rail-secondary-card-risk').click();
      await expect(page.getByTestId('data-screen-right-rail-secondary-drawer')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('data-screen-risk-alerts-link')).toContainText(`风险总量 ${riskSummary?.total || 0}`, { timeout: 20_000 });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('data-screen-right-rail-secondary-drawer')).toBeHidden({ timeout: 20_000 });

      await page.getByTestId('data-screen-view-preset-business-focus').evaluate((element: HTMLElement) => element.click());
      await expect(page.getByTestId('data-screen-business-focus-panel')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('data-screen-tab-customers')).toHaveAttribute('data-active', 'true');

      await page.getByTestId('data-screen-view-preset-personal-focus').evaluate((element: HTMLElement) => element.click());
      await expect(page.getByTestId('data-screen-personal-focus-panel')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('data-screen-personal-focus-open-workbench')).toBeVisible({ timeout: 20_000 });
      await page.getByTestId('data-screen-personal-focus-open-workbench').evaluate((element: HTMLElement) => element.click());
      await expect(page).toHaveURL(/\/workbench$/);

      await page.goto('/data-screen');
      await expect(page.getByTestId('data-screen-page')).toBeVisible({ timeout: 20_000 });

      await page.getByTestId('data-screen-view-preset-presales-focus').evaluate((element: HTMLElement) => element.click());
      await expect(page.getByTestId('data-screen-view-preset-presales-focus')).toHaveAttribute('data-active', 'true');
      await expect(page.getByTestId('data-screen-presales-focus-panel')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('data-screen-presales-open-staff')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('data-screen-tab-sales')).toHaveAttribute('data-active', 'true');
      await page.getByTestId('data-screen-presales-open-staff').evaluate((element: HTMLElement) => element.click());
      await expect(page).toHaveURL(/\/staff$/);

      await page.goto('/data-screen');
      await expect(page.getByTestId('data-screen-page')).toBeVisible({ timeout: 20_000 });

      await page.getByTestId('data-screen-right-rail-secondary-card-risk').click();
      await expect(page.getByTestId('data-screen-right-rail-secondary-drawer')).toBeVisible({ timeout: 20_000 });
      await page.getByTestId('data-screen-risk-alerts-link').evaluate((element: HTMLElement) => element.click());
      await expect(page).toHaveURL(/\/tasks\?scope=mine&type=alert$/);

      await page.goto('/data-screen');
      await expect(page.getByTestId('data-screen-page')).toBeVisible({ timeout: 20_000 });

      await page.getByTestId('data-screen-right-rail-secondary-card-forecast').click();
      await expect(page.getByTestId('data-screen-right-rail-secondary-drawer')).toBeVisible({ timeout: 20_000 });
      await page.getByTestId('data-screen-forecast-gap-link').evaluate((element: HTMLElement) => element.click());
      await expect(page).toHaveURL(/\/projects\?stage=opportunity$/);

      if ((riskSummary?.items?.length || 0) > 0) {
        const firstRiskProjectId = riskSummary.items[0].projectId;

        await page.goto('/data-screen');
        await expect(page.getByTestId('data-screen-page')).toBeVisible({ timeout: 20_000 });
        await page.getByTestId('data-screen-right-rail-secondary-card-risk').click();
        await expect(page.getByTestId('data-screen-right-rail-secondary-drawer')).toBeVisible({ timeout: 20_000 });

        if ((riskSummary?.items?.length || 0) > 2) {
          await page
            .getByTestId('data-screen-right-rail-secondary-drawer')
            .getByRole('button', { name: '查看全部' })
            .click();
        }

        const riskProjectLink = page.getByTestId(`data-screen-risk-project-link-${firstRiskProjectId}`);
        if (await riskProjectLink.count()) {
          await riskProjectLink.evaluate((element: HTMLElement) => element.click());
          await expect(page).toHaveURL(new RegExp(`/projects/${firstRiskProjectId}$`));
        }
      }

      await page.goto('/data-screen');
      await expect(page.getByTestId('data-screen-page')).toBeVisible({ timeout: 20_000 });
      await page.getByTestId('data-screen-right-rail-secondary-card-funnel').click();
      await expect(page.getByTestId('data-screen-right-rail-secondary-drawer')).toBeVisible({ timeout: 20_000 });
      await page.getByTestId('data-screen-funnel-open-projects-link').evaluate((element: HTMLElement) => element.click());
      await expect(page).toHaveURL(/\/projects\?stage=opportunity$/);
    } finally {
      if (apiContext) {
        await apiContext.dispose();
      }
    }
  });

  test('remains stable during repeated province and heatmap dimension switching', async ({ page }) => {
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

    await page.goto('/data-screen');
    await expect(page.getByTestId('data-screen-page')).toBeVisible({ timeout: 20_000 });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await page.getByTestId('data-screen-map-zhejiang-button').click();
      await expect(page.getByTestId('data-screen-map-zhejiang-button')).toHaveText('浙江省');
      await expect(page.getByTestId('data-screen-page')).toBeVisible({ timeout: 20_000 });

      await page.getByTestId('data-screen-map-nation-button').click();
      await expect(page.getByTestId('data-screen-page')).toBeVisible({ timeout: 20_000 });
    }

    const heatmapOptions = [
      'project_count_heatmap',
      'budget',
      'contract_amount',
      'pre_sales_activity',
      'solution_usage',
      'customer_count_heatmap',
    ] as const;

    for (const option of heatmapOptions) {
      await page.getByTestId('data-screen-heatmap-dimension-trigger').click();
      await page.getByTestId(`data-screen-heatmap-option-${option}`).click();
      await expect(page.getByTestId('data-screen-page')).toBeVisible({ timeout: 20_000 });
    }

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
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

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function toDateOnly(date: Date) {
  return date.toISOString().split('T')[0];
}