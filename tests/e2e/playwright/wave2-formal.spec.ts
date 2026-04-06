import { expect, test, request as playwrightRequest, type APIRequestContext, type Page } from '@playwright/test';

const ADMIN_USER = {
  email: 'admin@zhengyuan.com',
  password: 'password',
};

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

test.describe('wave 2 formal validation', () => {
  test('uses /tasks as the canonical personal-task view and redirects /my-tasks', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;
    let createdTaskId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      const meResponse = await apiContext.get('/api/auth/me');
      expect(meResponse.ok()).toBeTruthy();
      const mePayload = await meResponse.json();
      const currentUserId = mePayload?.data?.id;
      expect(currentUserId).toBeTruthy();

      const taskTitle = `wave2-task-${Date.now()}`;
      const createTaskResponse = await apiContext.post('/api/tasks', {
        data: {
          taskName: taskTitle,
          priority: 'medium',
          assigneeId: currentUserId,
        },
      });

      expect(createTaskResponse.ok()).toBeTruthy();
      const createTaskPayload = await createTaskResponse.json();
      createdTaskId = createTaskPayload?.data?.id ?? null;

      await page.goto('/tasks?scope=mine');
      await expect(page.getByRole('heading', { name: '任务中心' })).toBeVisible();
      await expect(page.getByRole('tab', { name: '我的任务视角' })).toHaveAttribute('data-state', 'active');
      await expect(page.getByRole('tab', { name: '预警任务' })).toBeVisible();
      await expect(page.getByRole('tab', { name: '指派任务' })).toBeVisible();
      await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });

      await page.goto('/my-tasks');
      await expect(page).toHaveURL(/\/tasks\?scope=mine/);
      await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });
    } finally {
      if (apiContext && createdTaskId) {
        await apiContext.delete(`/api/tasks/${createdTaskId}`);
      }

      if (apiContext) {
        await apiContext.dispose();
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