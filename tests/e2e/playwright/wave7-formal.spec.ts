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

test.describe('wave 7 formal validation', () => {
  test('shows the personal event inbox with recent-action ordering and alert-task quick actions', async ({ page }) => {
    let anonymousContext: APIRequestContext | null = null;
    let apiContext: APIRequestContext | null = null;
    let dbClient: postgres.Sql | null = null;
    let createdTaskId: number | null = null;
    let createdMessageId: number | null = null;
    let createdAlertHistoryId: number | null = null;
    let createdAlertNotificationId: number | null = null;

    try {
      anonymousContext = await playwrightRequest.newContext({ baseURL: TEST_BASE_URL });
      const anonymousResponse = await anonymousContext.get('/api/activities?types=task,message,alert&limit=10');
      expect(anonymousResponse.status()).toBe(401);

      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      dbClient = createDbClient();

      const uniqueSuffix = Date.now();
      const taskName = `wave7-task-${uniqueSuffix}`;
      const messageTitle = `wave7-message-${uniqueSuffix}`;
      const alertRuleName = `wave7-alert-${uniqueSuffix}`;

      const [task] = await dbClient<{ id: number }[]>`
        INSERT INTO bus_project_task (
          id,
          task_name,
          assignee_id,
          status,
          priority,
          created_at,
          updated_at
        ) VALUES (
          (SELECT COALESCE(MAX(id), 0) + 1 FROM bus_project_task),
          ${taskName},
          ${1},
          'in_progress',
          'high',
          NOW() - INTERVAL '3 minutes',
          NOW() - INTERVAL '2 minutes'
        )
        RETURNING id
      `;
      createdTaskId = task.id;

      const [message] = await dbClient<{ id: number }[]>`
        INSERT INTO sys_message (
          id,
          title,
          content,
          type,
          priority,
          receiver_id,
          related_type,
          related_id,
          action_url,
          action_text,
          is_read,
          is_deleted,
          created_at,
          updated_at
        ) VALUES (
          (SELECT COALESCE(MAX(id), 0) + 1 FROM sys_message),
          ${messageTitle},
          '第七波 formal 消息验证',
          'reminder',
          'high',
          ${1},
          'task',
          ${createdTaskId},
          '/tasks?scope=mine',
          '处理消息',
          false,
          false,
          NOW() - INTERVAL '1 minute',
          NOW() - INTERVAL '1 minute'
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
          related_type,
          related_id,
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
          '第七波 formal 预警验证',
          'task',
          ${createdTaskId},
          NOW() - INTERVAL '5 minutes',
          NOW() - INTERVAL '30 seconds'
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
          '第七波 formal 预警通知',
          NOW() - INTERVAL '30 seconds',
          NOW() - INTERVAL '30 seconds'
        )
        RETURNING id
      `;
      createdAlertNotificationId = alertNotification.id;

      const apiResponse = await apiContext.get('/api/activities?types=task,message,alert&limit=10');
      expect(apiResponse.ok()).toBeTruthy();
      const payload = await apiResponse.json();
      expect(payload.data.list[0]).toMatchObject({ id: `alert-${createdAlertHistoryId}`, href: '/tasks?scope=mine&type=alert' });
      expect(payload.data.list[1]).toMatchObject({ id: `msg-${createdMessageId}` });
      expect(payload.data.list[2]).toMatchObject({ id: `task-${createdTaskId}` });
      expect(payload.data.list[0].quickActions).toEqual([
        { label: '处理任务', href: '/tasks?scope=mine&type=alert' },
        { label: '查看预警', href: '/alerts/histories?status=pending' },
      ]);

      await page.goto('/workbench');
      await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();
      await expect(page.getByText('个人事件收件箱').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(taskName).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(messageTitle).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(alertRuleName).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('link', { name: '处理任务' }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: '查看预警' }).first()).toBeVisible();

      await page.getByRole('link', { name: '处理任务' }).first().click();
      await expect(page).toHaveURL(/\/tasks\?scope=mine&type=alert/);
      await expect(page.getByTestId('tasks-page')).toBeVisible();
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

      if (dbClient && createdTaskId) {
        await dbClient`DELETE FROM bus_project_task WHERE id = ${createdTaskId}`;
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
    throw new Error('DATABASE_URL is required for wave 7 formal setup');
  }

  return postgres(databaseUrl, {
    max: 1,
    prepare: false,
  });
}
