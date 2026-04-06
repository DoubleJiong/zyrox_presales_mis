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

test.describe('wave 4 formal validation', () => {
  test('surfaces the cockpit priority queue, risk radar, unread inbox, and shared schedules on /workbench', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;
    let dbClient: postgres.Sql | null = null;
    let createdTodoId: number | null = null;
    let createdTaskId: number | null = null;
    let createdMessageId: number | null = null;
    let sharedScheduleId: number | null = null;
    let createdAlertHistoryId: number | null = null;
    let createdAlertNotificationId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      dbClient = createDbClient();

      const today = new Date().toISOString().split('T')[0];
      const todoTitle = `wave4-todo-${Date.now()}`;
      const taskTitle = `wave4-task-${Date.now()}`;
      const messageTitle = `wave4-message-${Date.now()}`;
      const sharedScheduleTitle = `wave4-shared-${Date.now()}`;
      const alertRuleName = `wave4-risk-${Date.now()}`;

      const createTodoResponse = await apiContext.post('/api/todos', {
        data: {
          title: todoTitle,
          type: 'followup',
          priority: 'urgent',
          dueDate: today,
          dueTime: '09:00',
          relatedName: '第四波优先待办',
        },
      });
      expect(createTodoResponse.ok()).toBeTruthy();
      createdTodoId = (await createTodoResponse.json())?.data?.id ?? null;

      const createTaskResponse = await apiContext.post('/api/tasks', {
        data: {
          taskName: taskTitle,
          priority: 'high',
          assigneeId: 1,
          dueDate: today,
        },
      });
      expect(createTaskResponse.ok()).toBeTruthy();
      createdTaskId = (await createTaskResponse.json())?.data?.id ?? null;

      const createMessageResponse = await apiContext.post('/api/messages', {
        data: {
          title: messageTitle,
          content: '第四波工作台 formal 验证消息',
          type: 'reminder',
          priority: 'high',
          receiverId: 1,
          actionUrl: '/messages',
        },
      });
      expect(createMessageResponse.ok()).toBeTruthy();
      createdMessageId = (await createMessageResponse.json())?.data?.id ?? null;

      const createSharedScheduleResponse = await apiContext.post('/api/schedules', {
        data: {
          title: sharedScheduleTitle,
          type: 'meeting',
          startDate: today,
          startTime: '14:00',
          endDate: today,
          endTime: '15:00',
          allDay: false,
          location: '第四波共享会议室',
          participants: [1],
          description: '第四波共享日程验证',
        },
      });
      expect(createSharedScheduleResponse.ok()).toBeTruthy();
      sharedScheduleId = (await createSharedScheduleResponse.json())?.data?.id ?? null;

      await dbClient`
        UPDATE bus_schedule
        SET user_id = ${2}
        WHERE id = ${sharedScheduleId}
      `;

      const [alertHistory] = await dbClient<[{ id: number }][]>`
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
          'project_risk',
          'project',
          ${1},
          '第四波风险项目',
          'critical',
          'pending',
          '第四波风险雷达验证',
          'project',
          ${1},
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      createdAlertHistoryId = alertHistory.id;

      const [alertNotification] = await dbClient<[{ id: number }][]>`
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
          '第四波风险雷达验证',
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      createdAlertNotificationId = alertNotification.id;

      await page.goto('/workbench');
      await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();
      await expect(page.getByText('待处理预警').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('未读消息').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('今日优先队列').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('风险雷达').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('消息待办').first()).toBeVisible({ timeout: 10_000 });

      await expect(page.getByText(todoTitle).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(taskTitle).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(sharedScheduleTitle).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('共享').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(alertRuleName).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(messageTitle).first()).toBeVisible({ timeout: 10_000 });
    } finally {
      if (apiContext && createdTodoId) {
        await apiContext.delete(`/api/todos/${createdTodoId}`);
      }

      if (apiContext && createdTaskId) {
        await apiContext.delete(`/api/tasks/${createdTaskId}`);
      }

      if (apiContext && createdMessageId) {
        await apiContext.delete(`/api/messages/${createdMessageId}`);
      }

      if (dbClient && createdAlertNotificationId) {
        await dbClient`DELETE FROM bus_alert_notification WHERE id = ${createdAlertNotificationId}`;
      }

      if (dbClient && createdAlertHistoryId) {
        await dbClient`DELETE FROM bus_alert_history WHERE id = ${createdAlertHistoryId}`;
      }

      if (dbClient && sharedScheduleId) {
        await dbClient`DELETE FROM bus_schedule WHERE id = ${sharedScheduleId}`;
      }

      if (dbClient && createdTaskId) {
        await dbClient`DELETE FROM bus_schedule WHERE related_type = 'task' AND related_id = ${createdTaskId}`;
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
    throw new Error('DATABASE_URL is required for wave 4 formal setup');
  }

  return postgres(databaseUrl, {
    max: 1,
    prepare: false,
  });
}