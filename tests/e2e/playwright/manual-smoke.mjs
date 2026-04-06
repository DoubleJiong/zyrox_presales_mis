import { chromium } from 'playwright';

const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5000';

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto(`${baseUrl}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  try {
    await page.waitForSelector('main form[data-testid="login-form"]', { timeout: 15000 });
    await page.waitForSelector('#email', { timeout: 15000 });
    await page.waitForSelector('#password', { timeout: 15000 });
  } catch (error) {
    const bodyText = await page.textContent('body');
    console.log(JSON.stringify({
      renderFailure: true,
      url: page.url(),
      bodyText: bodyText?.slice(0, 2000) ?? '',
    }));
    throw error;
  }
  const title = await page.locator('[data-slot="card-title"]').innerText();

  await page.locator('#email').fill('invalid-email');
  await page.locator('#password').fill('123');
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForTimeout(500);

  const pageText = await page.textContent('body');
  const emailValidationVisible = pageText?.includes('请输入有效的邮箱地址') ?? false;
  const passwordValidationVisible = pageText?.includes('密码长度不能少于4位') ?? false;

  console.log(JSON.stringify({
    title,
    emailVisible: true,
    passwordVisible: true,
    emailValidationVisible,
    passwordValidationVisible,
  }));
} finally {
  await browser.close();
}