import { config as loadEnv } from 'dotenv';
import { expect, test, request as playwrightRequest, type APIRequestContext, type Page } from '@playwright/test';
import postgres from 'postgres';
import { acquireWorkbenchLock } from './helpers/workbench-lock';

const ADMIN_USER = {
  email: 'admin@zhengyuan.com',
  password: 'password',
};

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

loadEnv({ path: '.env.local' });
loadEnv({ path: 'app_code/.env.local' });

test.describe('wave 7 formal validation', () => {
  test('shows the personal event inbox with recent-action ordering and alert-task quick actions', async ({ page }) => {
    let anonymousContext: APIRequestContext | null = null;
    let apiContext: APIRequestContext | null = null;
    let dbClient: postgres.Sql | null = null;
    let createdTaskId: number | null = null;
    let createdMessageId: number | null = null;
    let createdAlertHistoryId: number | null = null;
    let createdAlertNotificationId: number | null = null;
    let releaseWorkbenchLock: (() => Promise<void>) | null = null;

    try {
      releaseWorkbenchLock = await acquireWorkbenchLock();
      anonymousContext = await playwrightRequest.newContext({ baseURL: TEST_BASE_URL });
      const anonymousResponse = await anonymousContext.get('/api/activities?types=task,message,alert&limit=200');
      expect(anonymousResponse.status()).toBe(401);

      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      dbClient = createDbClient();

      const uniqueSuffix = Date.now();
      const taskName = `wave7-task-${uniqueSuffix}`;
      const messageTitle = `wave7-message-${uniqueSuffix}`;
      const alertRuleName = `wave7-alert-${uniqueSuffix}`;
      const uniqueBaseId = createUniqueId();

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
          ${uniqueBaseId},
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
          ${uniqueBaseId - 1},
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
          NOW() + INTERVAL '11 minutes',
          NOW() + INTERVAL '11 minutes'
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
          ${uniqueBaseId - 2},
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
          NOW() + INTERVAL '12 minutes',
          NOW() + INTERVAL '12 minutes'
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
          ${uniqueBaseId - 3},
          ${createdAlertHistoryId},
          ${1},
          'system',
          'pending',
          '第七波 formal 预警通知',
          NOW() + INTERVAL '12 minutes',
          NOW() + INTERVAL '12 minutes'
        )
        RETURNING id
      `;
      createdAlertNotificationId = alertNotification.id;

      let payload: {
        data: {
          list: Array<{ id: string; href?: string; quickActions?: Array<{ label: string; href?: string }> }>;
        };
      } | null = null;

      await expect
        .poll(
          async () => {
            const apiResponse = await apiContext!.get('/api/activities?types=task,message,alert&limit=200');
            expect(apiResponse.ok()).toBeTruthy();
            payload = await apiResponse.json();
            const polledPayload = payload!;

            return {
              hasAlert: polledPayload.data.list.some((item) => item.id === `alert-${createdAlertHistoryId}`),
              hasMessage: polledPayload.data.list.some((item) => item.id === `msg-${createdMessageId}`),
            };
          },
          { timeout: 10_000 }
        )
        .toMatchObject({ hasAlert: true, hasMessage: true });

      const resolvedPayload = payload!;
      const alertEntry = resolvedPayload.data.list.find((item: { id: string }) => item.id === `alert-${createdAlertHistoryId}`);
      const messageEntry = resolvedPayload.data.list.find((item: { id: string }) => item.id === `msg-${createdMessageId}`);

      expect(alertEntry).toMatchObject({ id: `alert-${createdAlertHistoryId}`, href: '/tasks?scope=mine&type=alert' });
      expect(messageEntry).toMatchObject({ id: `msg-${createdMessageId}` });
      expect(alertEntry?.quickActions).toEqual(expect.arrayContaining([
        expect.objectContaining({ label: '处理任务', href: '/tasks?scope=mine&type=alert' }),
        expect.objectContaining({ label: '查看预警', href: '/alerts/histories?status=pending' }),
      ]));

      await page.goto('/workbench');
      await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();
      await expect(page.getByText('个人事件收件箱').first()).toBeVisible({ timeout: 10_000 });
      const inboxCard = page.locator('div.rounded-lg.border.bg-card.p-3').filter({ hasText: alertRuleName }).first();
      await expect(inboxCard).toBeVisible({ timeout: 10_000 });
      await expect(inboxCard.getByRole('link', { name: '处理任务' })).toBeVisible();
      await expect(inboxCard.getByRole('link', { name: '查看预警' })).toBeVisible();

      await inboxCard.getByRole('link', { name: '处理任务' }).click();
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

      if (releaseWorkbenchLock) {
        await releaseWorkbenchLock();
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

function createUniqueId(offset = 0) {
  return -((Date.now() % 1_000_000_000) + Math.floor(Math.random() * 10_000) + offset);
}
