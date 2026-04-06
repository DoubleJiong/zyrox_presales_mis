import { expect, test, request as playwrightRequest, type APIRequestContext, type Page } from '@playwright/test';

const ADMIN_USER = {
  email: 'admin@zhengyuan.com',
  password: 'password',
};

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

test.describe('wave 1 formal validation', () => {
  test('loads messages on the formal artifact and keeps schedules aliases on calendar', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;
    let createdMessageId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      const meResponse = await apiContext.get('/api/auth/me');
      expect(meResponse.ok()).toBeTruthy();
      const mePayload = await meResponse.json();
      const currentUserId = mePayload?.data?.id;
      expect(currentUserId).toBeTruthy();

      const title = `wave1-message-${Date.now()}`;
      const createMessageResponse = await apiContext.post('/api/messages', {
        data: {
          title,
          content: 'wave 1 formal runtime validation',
          type: 'message',
          category: 'system',
          priority: 'normal',
          receiverId: currentUserId,
        },
      });

      expect(createMessageResponse.ok()).toBeTruthy();
      const createMessagePayload = await createMessageResponse.json();
      createdMessageId = createMessagePayload?.data?.id ?? null;

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
      if (apiContext && createdMessageId) {
        await apiContext.delete(`/api/messages/${createdMessageId}`);
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