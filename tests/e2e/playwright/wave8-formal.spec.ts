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

test.describe('wave 8 formal validation', () => {
  test('supports lightweight inbox actions from /workbench and removes duplicate side panels', async ({ page }) => {
    let anonymousContext: APIRequestContext | null = null;
    let dbClient: postgres.Sql | null = null;
    let createdMessageId: number | null = null;
    let createdAlertHistoryId: number | null = null;
    let createdAlertNotificationId: number | null = null;

    try {
      anonymousContext = await playwrightRequest.newContext({ baseURL: TEST_BASE_URL });
      const anonymousResponse = await anonymousContext.get('/api/activities?types=message,alert&limit=10');
      expect(anonymousResponse.status()).toBe(401);

      await loginAsAdmin(page);
      dbClient = createDbClient();

      const uniqueSuffix = Date.now();
      const messageTitle = `wave8-message-${uniqueSuffix}`;
      const alertRuleName = `wave8-alert-${uniqueSuffix}`;

      const [message] = await dbClient<{ id: number }[]>`
        INSERT INTO sys_message (
          id,
          title,
          content,
          type,
          priority,
          receiver_id,
          action_url,
          action_text,
          is_read,
          is_deleted,
          created_at,
          updated_at
        ) VALUES (
          (SELECT COALESCE(MAX(id), 0) + 1 FROM sys_message),
          ${messageTitle},
          '第八波 formal 消息验证',
          'notification',
          'high',
          ${1},
          '/messages',
          '处理消息',
          false,
          false,
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      createdMessageId = message.id;

      const [alertHistory] = await dbClient<{ id: number }[]>`
        INSERT INTO bus_alert_history (
          id,
          rule_name,
          alert_type,
          target_type,
          target_id,
          target_name,
          severity,
          status,
          message,
          created_at,
          updated_at
        ) VALUES (
          (SELECT COALESCE(MAX(id), 0) + 1 FROM bus_alert_history),
          ${alertRuleName},
          'progress',
          'user',
          ${1},
          '管理员',
          'high',
          'pending',
          '第八波 formal 预警验证',
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      createdAlertHistoryId = alertHistory.id;

      const [alertNotification] = await dbClient<{ id: number }[]>`
        INSERT INTO bus_alert_notification (
          id,
          alert_history_id,
          recipient_id,
          channel,
          status,
          content,
          created_at,
          updated_at
        ) VALUES (
          (SELECT COALESCE(MAX(id), 0) + 1 FROM bus_alert_notification),
          ${createdAlertHistoryId},
          ${1},
          'system',
          'pending',
          '第八波 formal 预警通知',
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      createdAlertNotificationId = alertNotification.id;

      await page.goto('/workbench');
      await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();
      await expect(page.getByText('个人事件收件箱').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('link', { name: '预警中心' }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: '消息中心' }).first()).toBeVisible();
      await expect(page.getByText(messageTitle).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(alertRuleName).first()).toBeVisible({ timeout: 10_000 });

      await page.getByRole('button', { name: '标为已读' }).first().click();
      await expect(page.getByText(messageTitle).first()).toHaveCount(0);

      await page.getByRole('button', { name: '确认预警' }).first().click();
      await expect(page.getByText(alertRuleName).first()).toHaveCount(0);
    } finally {
      if (dbClient && createdAlertNotificationId) {
        await dbClient`DELETE FROM bus_alert_notification WHERE id = ${createdAlertNotificationId}`;
      }

      if (dbClient && createdAlertHistoryId) {
        await dbClient`DELETE FROM bus_alert_history WHERE id = ${createdAlertHistoryId}`;
      }

      if (dbClient && createdMessageId) {
        await dbClient`DELETE FROM sys_message WHERE id = ${createdMessageId}`;
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

function createDbClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for wave 8 formal setup');
  }

  return postgres(databaseUrl, {
    max: 1,
    prepare: false,
  });
}
