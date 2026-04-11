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

test.describe('wave 1 formal validation', () => {
  test('loads messages on the formal artifact and keeps schedules aliases on calendar', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;
    let dbClient: postgres.Sql | null = null;
    let createdMessageId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      dbClient = createDbClient();

      const title = `wave1-message-${Date.now()}`;
      createdMessageId = createUniqueId();

      await dbClient`
        INSERT INTO sys_message (
          id,
          title,
          content,
          type,
          category,
          priority,
          sender_id,
          receiver_id,
          is_read,
          is_deleted,
          created_at,
          updated_at
        ) VALUES (
          ${createdMessageId},
          ${title},
          'wave 1 formal runtime validation',
          'message',
          'system',
          'normal',
          ${1},
          ${1},
          false,
          false,
          NOW(),
          NOW()
        )
      `;

      await page.goto('/messages');
      await expect(page.getByRole('heading', { name: '消息中心' })).toBeVisible();
      await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

      const markAllReadButton = page.getByRole('button', { name: '全部已读' });
      await expect(markAllReadButton).toBeVisible({ timeout: 10_000 });
      await markAllReadButton.click();
      await expect(markAllReadButton).not.toBeVisible({ timeout: 10_000 });

      await page.goto('/calendar');
      await expect(page.getByRole('heading', { name: '日程管理' })).toBeVisible();

      await page.goto('/schedules');
      await expect(page).toHaveURL(/\/calendar\?view=list/);
      await expect(page.getByRole('heading', { name: '日程管理' })).toBeVisible();
      await expect(page.getByText('全部事项').first()).toBeVisible();

      await page.goto('/schedules/new');
      await expect(page).toHaveURL(/\/calendar/);
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
    } finally {
      if (dbClient && createdMessageId) {
        await dbClient`DELETE FROM sys_message WHERE id = ${createdMessageId}`;
      }

      if (apiContext) {
        await apiContext.dispose();
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
    throw new Error('DATABASE_URL is required for wave 1 formal setup');
  }

  return postgres(databaseUrl, {
    max: 1,
    prepare: false,
  });
}

function createUniqueId(offset = 0) {
  return -((Date.now() % 1_000_000_000) + Math.floor(Math.random() * 10_000) + offset);
}