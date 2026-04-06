const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5004/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill('zhangwei@zhengyuan.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 15000 });
  await page.getByRole('button').nth(0).click().catch(() => {});
  await page.goto('http://localhost:5004/workbench', { waitUntil: 'domcontentloaded' });
  console.log(JSON.stringify({ afterLogin: page.url() }));
  await browser.close();
})();
