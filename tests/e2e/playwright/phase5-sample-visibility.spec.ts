import { expect, test, request as playwrightRequest, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const BUSINESS_USER = {
  email: 'zhangwei@zhengyuan.com',
  password: 'password',
};

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

interface SampleRow {
  sampleId: string;
  purpose: string;
  projectCode: string;
  projectName: string;
  customerName: string;
  originalLedgerStatus: string;
  hasSolution: boolean;
}

function parseSampleList(): SampleRow[] {
  const filePath = path.resolve(process.cwd(), 'docs/plans/2026-03-30-phase-5-business-acceptance-sample-list.md');
  const content = readFileSync(filePath, 'utf8');

  return content
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| S'))
    .map((line) => {
      const columns = line.split('|').map((item) => item.trim()).filter(Boolean);

      return {
        sampleId: columns[0],
        purpose: columns[1],
        projectCode: columns[2],
        projectName: columns[3],
        customerName: columns[4],
        originalLedgerStatus: columns[5],
        hasSolution: columns[10] === '有',
      } satisfies SampleRow;
    });
}

async function loginAsBusinessUser(page: Page) {
  const authContext = await playwrightRequest.newContext({ baseURL: TEST_BASE_URL });
  const response = await authContext.post('/api/auth/login', {
    data: BUSINESS_USER,
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

  await authContext.dispose();
  await page.goto('/');
}

test.describe('Phase 5 representative sample visibility', () => {
  const samples = parseSampleList();
  const refreshSample = samples.find((sample) => sample.sampleId === 'S06') || samples[0];

  test('customers page can locate all representative sample customers and survive a refresh spot-check', async ({ page }) => {
    await loginAsBusinessUser(page);
    await page.goto('/customers', { waitUntil: 'networkidle' });
    await expect(page.getByText('客户列表')).toBeVisible();

    const searchInput = page.getByPlaceholder('搜索客户名称、编号或联系人...');

    for (const sample of samples) {
      await searchInput.fill(sample.customerName);
      await expect(page.getByText(sample.customerName).first()).toBeVisible({ timeout: 10000 });
      await searchInput.clear();
    }

    await searchInput.fill(refreshSample.customerName);
    await expect(page.getByText(refreshSample.customerName).first()).toBeVisible({ timeout: 10000 });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('客户列表')).toBeVisible();
    await searchInput.fill(refreshSample.customerName);
    await expect(page.getByText(refreshSample.customerName).first()).toBeVisible({ timeout: 10000 });
  });

  test('projects page can locate all representative sample projects and survive a refresh spot-check', async ({ page }) => {
    await loginAsBusinessUser(page);
    await page.goto('/projects', { waitUntil: 'networkidle' });
    await expect(page.getByText('项目列表')).toBeVisible();

    const searchInput = page.getByPlaceholder('搜索项目名称、客户名称或编号...');

    for (const sample of samples) {
      await searchInput.fill(sample.projectName);
      await expect(page.getByText(sample.projectName).first()).toBeVisible({ timeout: 10000 });
      await searchInput.clear();
    }

    await searchInput.fill(refreshSample.projectName);
    await expect(page.getByText(refreshSample.projectName).first()).toBeVisible({ timeout: 10000 });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('项目列表')).toBeVisible();
    await searchInput.fill(refreshSample.projectName);
    await expect(page.getByText(refreshSample.projectName).first()).toBeVisible({ timeout: 10000 });
  });

  test('solutions page can locate linked project solutions and survive a refresh spot-check', async ({ page }) => {
    await loginAsBusinessUser(page);
    await page.goto('/solutions', { waitUntil: 'networkidle' });
    await expect(page.getByText('方案列表')).toBeVisible();

    const searchInput = page.getByPlaceholder('搜索方案名称、编号...');
    const solutionSamples = samples.filter((sample) => sample.hasSolution);

    for (const sample of solutionSamples) {
      await searchInput.fill(sample.projectName);
      await expect(page.getByText(`${sample.projectName} 项目方案`).first()).toBeVisible({ timeout: 10000 });
      await searchInput.clear();
    }

    if (solutionSamples.length > 0) {
      const refreshSolutionSample = solutionSamples[0];
      await searchInput.fill(refreshSolutionSample.projectName);
      await expect(page.getByText(`${refreshSolutionSample.projectName} 项目方案`).first()).toBeVisible({ timeout: 10000 });
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.getByText('方案列表')).toBeVisible();
      await searchInput.fill(refreshSolutionSample.projectName);
      await expect(page.getByText(`${refreshSolutionSample.projectName} 项目方案`).first()).toBeVisible({ timeout: 10000 });
    }
  });
});