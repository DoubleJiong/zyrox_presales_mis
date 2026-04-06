import { config as loadEnv } from 'dotenv';
import { expect, test, request as playwrightRequest, type APIRequestContext, type Page } from '@playwright/test';
import postgres from 'postgres';

const ADMIN_USER = {
  email: 'admin@zhengyuan.com',
  password: 'password',
};

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

loadEnv({ path: '.env.local' });

test.describe('wave 5 formal validation', () => {
  test('protects /api/activities and shows auth-bound activity entries on /workbench', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;
    let anonymousContext: APIRequestContext | null = null;
    let dbClient: postgres.Sql | null = null;
    let createdOpportunityId: number | null = null;

    try {
      anonymousContext = await playwrightRequest.newContext({ baseURL: TEST_BASE_URL });
      const anonymousResponse = await anonymousContext.get('/api/activities?limit=5');
      expect(anonymousResponse.status()).toBe(401);

      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      dbClient = createDbClient();

      const opportunityTitle = `wave5-opportunity-${Date.now()}`;
      const [opportunity] = await dbClient<[{ id: number }][]>`
        INSERT INTO bus_opportunity (
          id,
          customer_name,
          project_name,
          contact_name,
          contact_phone,
          owner_id,
          status,
          created_at,
          updated_at
        ) VALUES (
          (SELECT COALESCE(MAX(id), 0) + 1 FROM bus_opportunity),
          '第五波客户',
          ${opportunityTitle},
          '张三',
          '13800138000',
          ${1},
          'proposal',
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      createdOpportunityId = opportunity.id;

      await page.goto('/workbench');
      await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();
      await expect(page.getByText('最近动态').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(opportunityTitle).first()).toBeVisible({ timeout: 10_000 });
    } finally {
      if (dbClient && createdOpportunityId) {
        await dbClient`DELETE FROM bus_opportunity WHERE id = ${createdOpportunityId}`;
      }

      if (apiContext) {
        await apiContext.dispose();
      }

      if (anonymousContext) {
        await anonymousContext.dispose();
      }

      if (dbClient) {
        await dbClient.end({ timeout: 5 });
      }
    }
  });
});

async function loginAsAdmin(page: Page) {
  const authContext = await playwrightRequest.newContext({ baseURL: TEST_BASE_URL });
  const response = await authContext.post('/api/auth/login', {
    data: ADMIN_USER,
  });

  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const accessToken = payload?.data?.accessToken;
  const refreshToken = payload?.data?.refreshToken;

  expect(accessToken).toBeTruthy();
  expect(refreshToken).toBeTruthy();

  await page.context().addInitScript(
    ({ token, nextRefreshToken }) => {
      window.localStorage.setItem('token', token);
      window.localStorage.setItem('refresh_token', nextRefreshToken);
    },
    { token: accessToken, nextRefreshToken: refreshToken }
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
  await authContext.dispose();
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

function createDbClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for wave 5 formal setup');
  }

  return postgres(databaseUrl, {
    max: 1,
    prepare: false,
  });
}