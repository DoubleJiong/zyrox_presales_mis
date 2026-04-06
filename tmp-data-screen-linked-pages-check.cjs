require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
const fs = require('fs');

(async () => {
  const baseUrl = 'http://localhost:5004';
  const baseOrigin = new URL(baseUrl);
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET missing');

  const accessToken = jwt.sign({ userId: 1, email: 'admin@zhengyuan.com', roleCode: 'ADMIN', roleId: 1 }, jwtSecret, {
    algorithm: 'HS256', expiresIn: '7d', issuer: 'zhengyuan-presales'
  });
  const refreshToken = jwt.sign({ userId: 1, type: 'refresh' }, jwtSecret, {
    algorithm: 'HS256', expiresIn: '30d', issuer: 'zhengyuan-presales'
  });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => pageErrors.push(String(err)));

  await page.context().addInitScript(({ token, nextRefreshToken }) => {
    window.localStorage.setItem('token', token);
    window.localStorage.setItem('refresh_token', nextRefreshToken);
  }, { token: accessToken, nextRefreshToken: refreshToken });

  await page.context().addCookies([
    { name: 'token', value: accessToken, domain: baseOrigin.hostname, path: '/', httpOnly: true, secure: false, sameSite: 'Lax' },
    { name: 'refresh_token', value: refreshToken, domain: baseOrigin.hostname, path: '/', httpOnly: true, secure: false, sameSite: 'Lax' },
  ]);

  const results = [];
  const targets = [
    { name: 'data-screen', path: '/data-screen', readyTestId: 'data-screen-page' },
    { name: 'open-projects', path: '/projects?stage=opportunity', readyText: '项目' },
    { name: 'risk-alerts', path: '/tasks?scope=mine&type=alert', readyText: '任务' },
    { name: 'workbench', path: '/workbench', readyText: '工作台' },
    { name: 'staff', path: '/staff', readyText: '员工' },
  ];

  for (const target of targets) {
    const item = { ...target, ok: false, finalUrl: null, title: null, bodySnippet: null, consoleErrors: [], pageErrors: [] };
    try {
      await page.goto(`${baseUrl}${target.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      if (target.readyTestId) {
        await page.getByTestId(target.readyTestId).waitFor({ timeout: 15000 });
      }
      if (target.readyText) {
        await page.getByText(target.readyText, { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {});
      }
      const bodyText = await page.textContent('body');
      const fatal = /(Application error|Server Error|Unhandled Runtime Error|Something went wrong)/i.test(bodyText || '');
      item.ok = !fatal;
      item.finalUrl = page.url();
      item.title = await page.title();
      item.bodySnippet = (bodyText || '').slice(0, 300);
    } catch (error) {
      item.ok = false;
      item.finalUrl = page.url();
      item.title = await page.title().catch(() => null);
      const bodyText = await page.textContent('body').catch(() => '');
      item.bodySnippet = (bodyText || '').slice(0, 300);
      item.error = String(error);
    }
    item.consoleErrors = consoleErrors.splice(0, consoleErrors.length);
    item.pageErrors = pageErrors.splice(0, pageErrors.length);
    results.push(item);
  }

  fs.writeFileSync('data-screen-linked-pages-5004.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
