import { expect, test } from '@playwright/test';

test('frontend smoke: login page renders', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  const loginForm = page.locator('main form[data-testid="login-form"]');

  await expect(page.locator('[data-slot="card-title"]')).toHaveText('售前管理系统');
  await expect(loginForm).toBeVisible();
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
});

test('backend smoke: protected dashboard requires authentication', async ({ request }) => {
  const response = await request.get('/api/dashboard');
  const data = await response.json();

  expect(response.status()).toBe(401);
  expect(data).toEqual({
    success: false,
    error: '请先登录',
    code: 'UNAUTHORIZED',
  });
});

test('e2e smoke: login form remains interactive and shows client validation', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('main form[data-testid="login-form"]');

  await page.locator('#email').fill('invalid-email');
  await page.locator('#password').fill('123');
  await page.getByRole('button', { name: '登录' }).click();

  await expect(page.getByText('请输入有效的邮箱地址')).toBeVisible();
  await expect(page.getByText('密码长度不能少于4位')).toBeVisible();
});