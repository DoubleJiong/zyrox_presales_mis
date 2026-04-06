import { expect, test } from '@playwright/test';

test('login page does not expose demo credentials', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const bodyText = await page.locator('body').textContent();
  expect(bodyText ?? '').not.toContain('测试账号:');
  expect(bodyText ?? '').not.toContain('admin@zy-presale.com');
  expect(bodyText ?? '').not.toContain('admin123');

  if (await page.locator('#email').count()) {
    await expect(page.locator('#email')).toHaveValue('');
  }

  if (await page.locator('#password').count()) {
    await expect(page.locator('#password')).toHaveValue('');
  }
});