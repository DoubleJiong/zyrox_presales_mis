import { config as loadEnv } from 'dotenv';
import { expect, test, request as playwrightRequest, type APIRequestContext, type Page } from '@playwright/test';
import postgres from 'postgres';

const USERS = {
  admin: {
    email: 'admin@zhengyuan.com',
    password: 'password',
  },
  zhangwei: {
    email: 'zhangwei@zhengyuan.com',
    password: 'password',
  },
} as const;

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

loadEnv({ path: '.env.local' });

test.describe('wave 3 formal validation', () => {
  test('creates a collaborative schedule on /calendar and delivers the invite to /messages', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;
    let createdScheduleId: number | null = null;

    try {
      await loginAsUser(page, USERS.admin);
      apiContext = await createApiContextFromPage(page);

      const meResponse = await apiContext.get('/api/auth/me');
      expect(meResponse.ok()).toBeTruthy();
      const mePayload = await meResponse.json();
      const currentUserId = mePayload?.data?.id;
      const currentUserName = mePayload?.data?.realName || mePayload?.data?.username;

      expect(currentUserId).toBeTruthy();
      expect(currentUserName).toBeTruthy();

      const scheduleTitle = `wave3-schedule-${Date.now()}`;
      const createScheduleResponse = await apiContext.post('/api/schedules', {
        data: {
          title: scheduleTitle,
          type: 'meeting',
          startDate: '2026-04-06',
          startTime: '10:30',
          endDate: '2026-04-06',
          endTime: '11:30',
          allDay: false,
          location: '线上会议室',
          participants: [currentUserId],
          reminder: {
            enabled: true,
            remindType: '30_minutes_before',
          },
          description: 'wave 3 formal runtime validation',
        },
      });

      expect(createScheduleResponse.ok()).toBeTruthy();
      const createSchedulePayload = await createScheduleResponse.json();
      createdScheduleId = createSchedulePayload?.data?.id ?? null;

      await page.goto('/calendar?view=list');
      await expect(page.getByRole('heading', { name: '日程管理' })).toBeVisible();
      await expect(page.getByText(scheduleTitle).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('参与1人').first()).toBeVisible({ timeout: 10_000 });

      await page.getByText(scheduleTitle).first().click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('dialog').getByText(currentUserName).last()).toBeVisible({ timeout: 10_000 });

      await page.goto('/messages');
      await expect(page.getByRole('heading', { name: '消息中心' })).toBeVisible();
      await expect(page.getByText(scheduleTitle).first()).toBeVisible({ timeout: 10_000 });
    } finally {
      if (apiContext && createdScheduleId) {
        const messageListResponse = await apiContext.get('/api/messages?type=reminder');
        if (messageListResponse.ok()) {
          const messageListPayload = await messageListResponse.json();
          const relatedMessages = (messageListPayload?.data?.list || []).filter((message: any) => message.relatedId === createdScheduleId);

          for (const message of relatedMessages) {
            await apiContext.delete(`/api/messages/${message.id}`);
          }
        }

        await apiContext.delete(`/api/schedules/${createdScheduleId}`);
      }

      if (apiContext) {
        await apiContext.dispose();
      }
    }
  });

  test('shows shared schedules as read-only and surfaces repeat and task-linked context on /calendar', async ({ page }) => {
    let adminApiContext: APIRequestContext | null = null;
    let dbClient: postgres.Sql | null = null;
    let sharedScheduleId: number | null = null;
    let createdTaskId: number | null = null;
    let relatedTaskScheduleId: number | null = null;

    try {
      await loginAsUser(page, USERS.admin);
      adminApiContext = await createApiContextFromPage(page);
      dbClient = createDbClient();

      const sharedScheduleTitle = `wave3-shared-repeat-${Date.now()}`;
      const createSharedScheduleResponse = await adminApiContext.post('/api/schedules', {
        data: {
          title: sharedScheduleTitle,
          type: 'meeting',
          startDate: '2026-04-08',
          startTime: '14:00',
          endDate: '2026-04-08',
          endTime: '15:00',
          allDay: false,
          location: '协作会议室',
          participants: [1],
          repeat: {
            type: 'weekly',
            interval: 2,
            endDate: '2026-05-06',
          },
          description: 'wave 3 shared read-only validation',
        },
      });

      expect(createSharedScheduleResponse.ok()).toBeTruthy();
      const createSharedSchedulePayload = await createSharedScheduleResponse.json();
      sharedScheduleId = createSharedSchedulePayload?.data?.id ?? null;

      await dbClient`
        UPDATE bus_schedule
        SET user_id = ${2}
        WHERE id = ${sharedScheduleId}
      `;

      const taskTitle = `wave3-task-link-${Date.now()}`;
      const createTaskResponse = await adminApiContext.post('/api/tasks', {
        data: {
          taskName: taskTitle,
          priority: 'medium',
          assigneeId: 1,
          startDate: '2026-04-09',
          dueDate: '2026-04-09',
        },
      });

      expect(createTaskResponse.ok()).toBeTruthy();
      const createTaskPayload = await createTaskResponse.json();
      createdTaskId = createTaskPayload?.data?.id ?? null;

      await page.goto('/calendar?view=list');
      await expect(page.getByRole('heading', { name: '日程管理' })).toBeVisible();
      await expect(page.getByText(sharedScheduleTitle).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('共享给我').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('每周重复（每 2 次）').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(`任务：${taskTitle}`).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('关联任务').first()).toBeVisible({ timeout: 10_000 });

      await page.getByText(sharedScheduleTitle).first().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      await expect(dialog.getByText('您是协作参与人，可查看该日程，但不能直接修改或删除。')).toBeVisible();
      await expect(dialog.getByText('当前规则：每周重复（每 2 次）')).toBeVisible();
      await expect(dialog.getByRole('button', { name: '关闭' })).toBeVisible();
      await expect(dialog.getByRole('button', { name: '保存' })).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: '删除' })).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden({ timeout: 10_000 });

      await page.getByText(`任务：${taskTitle}`).first().click();
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      await expect(dialog.getByText('该日程来自任务联动')).toBeVisible();
      await expect(dialog.getByRole('link', { name: '打开任务中心' })).toBeVisible();
    } finally {
      if (adminApiContext && sharedScheduleId) {
        const messageListResponse = await adminApiContext.get('/api/messages?type=reminder');
        if (messageListResponse.ok()) {
          const messageListPayload = await messageListResponse.json();
          const relatedMessages = (messageListPayload?.data?.list || []).filter((message: any) => message.relatedId === sharedScheduleId);

          for (const message of relatedMessages) {
            await adminApiContext.delete(`/api/messages/${message.id}`);
          }
        }
      }

      if (adminApiContext && createdTaskId) {
        const scheduleListResponse = await adminApiContext.get('/api/schedules');
        if (scheduleListResponse.ok()) {
          const scheduleListPayload = await scheduleListResponse.json();
          const relatedTaskSchedule = (scheduleListPayload?.data || []).find((schedule: any) => schedule.relatedType === 'task' && schedule.relatedId === createdTaskId);
          relatedTaskScheduleId = relatedTaskSchedule?.id ?? null;
        }
      }

      if (dbClient && sharedScheduleId) {
        await dbClient`DELETE FROM bus_schedule WHERE id = ${sharedScheduleId}`;
      }

      if (adminApiContext && relatedTaskScheduleId) {
        await adminApiContext.delete(`/api/schedules/${relatedTaskScheduleId}`);
      }

      if (adminApiContext && createdTaskId) {
        await adminApiContext.delete(`/api/tasks/${createdTaskId}`);
      }

      if (adminApiContext) {
        await adminApiContext.dispose();
      }

      if (dbClient) {
        await dbClient.end({ timeout: 5 });
      }
    }
  });
});

async function loginAsUser(page: Page, user: { email: string; password: string }) {
  const authContext = await playwrightRequest.newContext({ baseURL: TEST_BASE_URL });
  const response = await authContext.post('/api/auth/login', {
    data: user,
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
    throw new Error('DATABASE_URL is required for wave 3 formal shared-schedule setup');
  }

  return postgres(databaseUrl, {
    max: 1,
    prepare: false,
  });
}