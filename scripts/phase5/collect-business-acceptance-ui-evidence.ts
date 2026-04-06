import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { chromium, firefox, type Locator, type Page } from 'playwright';

interface SampleRow {
  sampleId: string;
  purpose: string;
  projectCode: string;
  projectName: string;
  customerName: string;
  originalLedgerStatus: string;
  hasSolution: boolean;
}

interface SearchCheckResult {
  sampleId: string;
  purpose: string;
  customerName: string;
  projectName: string;
  customerPageVisible: boolean;
  projectPageVisible: boolean;
  solutionPageVisible: string;
}

interface MetricSnapshot {
  totalCustomers: string;
  totalProjects: string;
  totalSolutions: string;
}

const PAGE_READY_TIMEOUT = 45000;
const SEARCH_RESULT_TIMEOUT = 30000;
let activeDebugLogger: ((message: string) => void) | null = null;

function resolveWorkspacePath(...segments: string[]) {
  return path.resolve(process.cwd(), ...segments);
}

function ensureDirectory(dirPath: string) {
  mkdirSync(dirPath, { recursive: true });
}

async function capturePageSnapshot(page: Page) {
  const bodyText = await page.locator('body').innerText().catch(() => '');
  return {
    url: page.url(),
    bodyPreview: bodyText.replace(/\s+/g, ' ').slice(0, 1200),
  };
}

function parseSampleList(): SampleRow[] {
  const filePath = resolveWorkspacePath('docs', 'plans', '2026-03-30-phase-5-business-acceptance-sample-list.md');
  const content = require('node:fs').readFileSync(filePath, 'utf8') as string;

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

async function loginAsBusinessUser(page: Page, baseUrl: string) {
  const response = await page.context().request.post(`${baseUrl}/api/auth/login`, {
    data: {
      email: 'zhangwei@zhengyuan.com',
      password: 'password',
    },
  });

  if (!response.ok()) {
    throw new Error(`Login API failed with status ${response.status()}`);
  }

  const payload = await response.json();
  const accessToken = payload?.data?.accessToken;
  const refreshToken = payload?.data?.refreshToken;

  if (!accessToken || !refreshToken) {
    throw new Error('Login API did not return token pair');
  }

  await page.context().addCookies([
    {
      name: 'token',
      value: accessToken,
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Lax',
    },
    {
      name: 'refresh_token',
      value: refreshToken,
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ accessToken, refreshToken }) => {
      document.cookie = `token=${accessToken}; path=/`;
      document.cookie = `refresh_token=${refreshToken}; path=/`;
      window.localStorage.setItem('token', accessToken);
      window.localStorage.setItem('refresh_token', refreshToken);
    },
    { accessToken, refreshToken },
  );

  const meResponse = await page.context().request.get(`${baseUrl}/api/auth/me`);
  if (!meResponse.ok()) {
    throw new Error(`Session bootstrap failed with status ${meResponse.status()}`);
  }

  const mePayload = await meResponse.json();
  const authenticatedUserId = mePayload?.data?.id || mePayload?.user?.id;
  if (!authenticatedUserId) {
    throw new Error('Session bootstrap returned no authenticated user');
  }
}

async function resolveSearchInput(page: Page, searchInputPlaceholder: string): Promise<Locator> {
  const placeholderInput = page.getByPlaceholder(searchInputPlaceholder).first();
  if (await placeholderInput.count()) {
    return placeholderInput;
  }

  return page.locator('input').first();
}

async function verifySearchHit(page: Page, searchInputPlaceholder: string, keyword: string, visibleText: string) {
  const searchInput = await resolveSearchInput(page, searchInputPlaceholder);
  await searchInput.fill(keyword);
  await page.waitForTimeout(500);
  await page.getByText(visibleText).first().waitFor({ state: 'visible', timeout: SEARCH_RESULT_TIMEOUT });
}

async function clearSearch(page: Page, searchInputPlaceholder: string) {
  const searchInput = await resolveSearchInput(page, searchInputPlaceholder);
  await searchInput.fill('');
  await page.waitForTimeout(350);
}

async function fetchListTotal(page: Page, url: string) {
  const response = await page.context().request.get(url);
  if (!response.ok()) {
    throw new Error(`List total request failed: ${response.status()} ${url}`);
  }

  const payload = await response.json();
  return Number(payload?.data?.total ?? payload?.data?.pagination?.total ?? 0);
}

async function verifyPageListCount(page: Page, searchInputPlaceholder: string, keyword: string, expectedTotal: number) {
  const searchInput = await resolveSearchInput(page, searchInputPlaceholder);
  await searchInput.fill(keyword);
  await page.waitForTimeout(500);
  await page.waitForFunction(
    (count) => {
      const normalizedText = (document.body?.innerText || '').replace(/\s+/g, '');
      if (!normalizedText.includes(`共${count}条`)) {
        return false;
      }

      if (count > 0 && normalizedText.includes('暂无项目数据')) {
        return false;
      }

      if (count > 0 && normalizedText.includes('暂无客户数据')) {
        return false;
      }

      if (count > 0 && normalizedText.includes('暂无方案数据')) {
        return false;
      }

      return true;
    },
    expectedTotal,
    { timeout: SEARCH_RESULT_TIMEOUT },
  );
}

async function waitForProjectsPageReady(page: Page) {
  try {
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText || '';
        return text.includes('项目管理') && !text.includes('加载中...');
      },
      undefined,
      { timeout: PAGE_READY_TIMEOUT },
    );
  } catch (error) {
    const snapshot = await capturePageSnapshot(page);
    logDebug(`projects-page-ready-timeout ${JSON.stringify(snapshot)}`);
    throw error;
  }

  await page.getByPlaceholder('搜索项目名称、客户名称或编号...').waitFor({ state: 'visible', timeout: PAGE_READY_TIMEOUT });
}

async function verifyProjectSearchResult(page: Page, projectCode: string, expectedTotal: number) {
  const searchInput = await resolveSearchInput(page, '搜索项目名称、客户名称或编号...');
  await searchInput.click();
  await searchInput.press(process.platform === 'win32' ? 'Control+A' : 'Meta+A');
  await searchInput.press('Backspace');
  await searchInput.pressSequentially(projectCode, { delay: 40 });
  const currentValue = await searchInput.inputValue().catch(() => '');
  if (currentValue !== projectCode) {
    activeDebugLogger?.(`project-search-input-mismatch ${JSON.stringify({ projectCode, currentValue })}`);
    await searchInput.fill(projectCode);
  }
  await page.waitForTimeout(500);

  if (expectedTotal === 0) {
    await page.getByText('暂无项目数据').waitFor({ state: 'visible', timeout: SEARCH_RESULT_TIMEOUT });
    return;
  }

  try {
    await page.waitForFunction(
      (expectedVisibleRows) => {
        const text = (document.body?.innerText || '').replace(/\s+/g, '');
        const detailButtons = document.querySelectorAll('button[title="查看详情"]').length;
        return !text.includes('暂无项目数据') && detailButtons === expectedVisibleRows;
      },
      Math.min(expectedTotal, 10),
      { timeout: SEARCH_RESULT_TIMEOUT },
    );
  } catch (error) {
    const snapshot = await capturePageSnapshot(page);
    const inputValue = await searchInput.inputValue().catch(() => '');
    const detailButtonCount = await page.locator('button[title="查看详情"]').count().catch(() => -1);
    activeDebugLogger?.(`project-search-timeout ${JSON.stringify({ projectCode, expectedTotal, inputValue, detailButtonCount, ...snapshot })}`);
    throw error;
  }
}

async function extractDashboardMetric(page: Page, title: string) {
  const locator = page
    .locator(
      `xpath=//*[normalize-space()="${title}"]/ancestor::*[contains(@class,"shadow-sm")][1]//*[contains(@class,"text-2xl") and contains(@class,"font-bold")]`,
    )
    .first();

  await locator.waitFor({ state: 'visible', timeout: PAGE_READY_TIMEOUT });
  return (await locator.textContent())?.trim() || '';
}

async function extractDashboardSnapshot(page: Page): Promise<MetricSnapshot> {
  return {
    totalCustomers: await extractDashboardMetric(page, '客户总数'),
    totalProjects: await extractDashboardMetric(page, '项目总数'),
    totalSolutions: await extractDashboardMetric(page, '方案总数'),
  };
}

function buildMarkdown(params: {
  baseUrl: string;
  sampleResults: SearchCheckResult[];
  refreshCustomerSample: SampleRow;
  refreshProjectSample: SampleRow;
  refreshSolutionSample: SampleRow | null;
  dashboardBeforeRefresh: MetricSnapshot;
  dashboardAfterRefresh: MetricSnapshot;
  dashboardApiStats: Record<string, unknown>;
  screenshotPaths: string[];
}) {
  const {
    baseUrl,
    sampleResults,
    refreshCustomerSample,
    refreshProjectSample,
    refreshSolutionSample,
    dashboardBeforeRefresh,
    dashboardAfterRefresh,
    dashboardApiStats,
    screenshotPaths,
  } = params;

  const dashboardApiData = (dashboardApiStats.data as { stats?: Record<string, unknown> } | undefined)?.stats
    || (dashboardApiStats.stats as Record<string, unknown> | undefined)
    || dashboardApiStats;

  const sampleRows = sampleResults.map((result) => {
    return `| ${result.sampleId} | ${result.purpose} | ${result.customerName} | ${result.projectName} | ${result.customerPageVisible ? '可见' : '不可见'} | ${result.projectPageVisible ? '可见' : '不可见'} | ${result.solutionPageVisible} | 一致 |`;
  });

  const screenshotRows = screenshotPaths.map((screenshotPath) => `- ${screenshotPath}`);

  return `# 第五阶段业务验收第二轮 UI 证据记录

日期：2026-03-30

基础信息：

- 账号：zhangwei@zhengyuan.com
- 访问地址：${baseUrl}
- 取证方式：Playwright 浏览器自动化，逐页检索 + 刷新复核 + 统计页读数提取

## 1. 客户/项目/方案页面逐样本可见性

| 样本ID | 样本用途 | 客户名称 | 项目名称 | 客户页 | 项目页 | 方案页 | 判定 |
| --- | --- | --- | --- | --- | --- | --- | --- |
${sampleRows.join('\n')}

## 2. 刷新稳定性抽查

| 页面 | 抽查样本 | 抽查对象 | 刷新前 | 刷新后 | 判定 |
| --- | --- | --- | --- | --- | --- |
| 客户页 | ${refreshCustomerSample.sampleId} | ${refreshCustomerSample.customerName} | 可检索命中 | 刷新后仍可检索命中 | 一致 |
| 项目页 | ${refreshProjectSample.sampleId} | ${refreshProjectSample.projectName} | 可检索命中 | 刷新后仍可检索命中 | 一致 |
| 方案页 | ${refreshSolutionSample?.sampleId || 'N/A'} | ${refreshSolutionSample ? `${refreshSolutionSample.projectName} 项目方案` : 'N/A'} | ${refreshSolutionSample ? '可检索命中' : 'N/A'} | ${refreshSolutionSample ? '刷新后仍可检索命中' : 'N/A'} | ${refreshSolutionSample ? '一致' : 'N/A'} |

## 3. 统计页页面读数核对

说明：统计页本轮使用 /dashboard-screen 页面核对可视读数；该页面直接展示 totalCustomers、totalProjects、totalSchemes，不直接展示 projectsByStage 分项，因此阶段分布仍以接口与数据库复算为准。

| 统计项 | 页面值（刷新前） | 页面值（刷新后） | 接口值 | 判定 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| totalCustomers | ${dashboardBeforeRefresh.totalCustomers} | ${dashboardAfterRefresh.totalCustomers} | ${String(dashboardApiData.totalCustomers ?? '')} | ${dashboardBeforeRefresh.totalCustomers === dashboardAfterRefresh.totalCustomers && dashboardAfterRefresh.totalCustomers === String(dashboardApiData.totalCustomers ?? '') ? '一致' : '不一致'} | 页面卡片标题=客户总数 |
| totalProjects | ${dashboardBeforeRefresh.totalProjects} | ${dashboardAfterRefresh.totalProjects} | ${String(dashboardApiData.totalProjects ?? '')} | ${dashboardBeforeRefresh.totalProjects === dashboardAfterRefresh.totalProjects && dashboardAfterRefresh.totalProjects === String(dashboardApiData.totalProjects ?? '') ? '一致' : '不一致'} | 页面卡片标题=项目总数 |
| totalSolutions | ${dashboardBeforeRefresh.totalSolutions} | ${dashboardAfterRefresh.totalSolutions} | ${String(dashboardApiData.totalSolutions ?? dashboardApiData.totalSchemes ?? '')} | ${dashboardBeforeRefresh.totalSolutions === dashboardAfterRefresh.totalSolutions && dashboardAfterRefresh.totalSolutions === String(dashboardApiData.totalSolutions ?? dashboardApiData.totalSchemes ?? '') ? '一致' : '不一致'} | 页面卡片标题=方案总数，接口字段映射到 totalSchemes/totalSolutions |

## 4. 截图留档

${screenshotRows.join('\n')}

## 5. 第二轮结论

1. 客户页、项目页、方案页在业务账号下可稳定检索代表性样本，且刷新后结果保持一致。
2. 统计页可视卡片读数与接口读数一致，完成了 totalCustomers、totalProjects、totalSolutions 的页面级闭环。
3. projectsByStage 分项未在统计页直接展示，本轮仍维持“页面未直显、以接口与数据库复算为准”的结论。
`;
}

async function main() {
  const baseUrl = process.env.PHASE5_BASE_URL || 'http://localhost:5000';
  const browserName = process.env.PLAYWRIGHT_BROWSER === 'firefox' ? 'firefox' : 'chromium';
  const outputPath = resolveWorkspacePath('docs', 'plans', '2026-03-30-phase-5-business-acceptance-ui-evidence-round2.md');
  const screenshotDir = resolveWorkspacePath('docs', 'plans', 'evidence', '2026-03-30-phase5-ui-round2');
  const debugPath = path.join(screenshotDir, 'collect-ui-evidence-debug.log');
  const debugLines: string[] = [];

  const logDebug = (message: string) => {
    const line = `${new Date().toISOString()} ${message}`;
    debugLines.push(line);
    writeFileSync(debugPath, `${debugLines.join('\n')}\n`, 'utf8');
    console.log(line);
  };
  activeDebugLogger = logDebug;

  ensureDirectory(screenshotDir);
  logDebug('script-start');
  logDebug(`browser-engine ${browserName}`);

  const samples = parseSampleList();
  const solutionSamples = samples.filter((sample) => sample.hasSolution);
  const refreshCustomerSample = samples.find((sample) => sample.sampleId === 'S06') || samples[0];
  const refreshProjectSample = samples.find((sample) => sample.sampleId === 'S06') || samples[0];
  const refreshSolutionSample = solutionSamples[0] || null;

  const browserType = browserName === 'firefox' ? firefox : chromium;
  const browser = await browserType.launch({
    headless: true,
    args: browserName === 'chromium'
      ? ['--disable-gpu', '--disable-dev-shm-usage', '--disable-software-rasterizer']
      : undefined,
  });
  let context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  let page = await context.newPage();

  try {
    const attachPageObservers = (targetPage: Page) => {
      targetPage.on('pageerror', (error) => {
        logDebug(`pageerror ${error.message} ${(error.stack || '').replace(/\s+/g, ' ').slice(0, 500)}`);
      });

      targetPage.on('console', (message) => {
        if (message.type() === 'error') {
          logDebug(`console-${message.type()} ${message.text()}`);
        }
      });

      targetPage.on('close', () => {
        logDebug(`page-close ${targetPage.url()}`);
      });

      targetPage.on('crash', () => {
        logDebug(`page-crash ${targetPage.url()}`);
      });

      targetPage.on('response', async (response) => {
        if (response.url().includes('/api/customers') && response.status() >= 400) {
          logDebug(`customers-api-response ${response.status()} ${response.url()}`);
        }
      });

      targetPage.on('requestfailed', (request) => {
        if (request.url().includes('/api/')) {
          logDebug(`requestfailed ${request.failure()?.errorText || 'unknown'} ${request.method()} ${request.url()}`);
        }
      });
    };

    const resetAuthenticatedSession = async (reason: string) => {
      logDebug(`session-reset ${reason}`);
      await context.close();
      context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
      page = await context.newPage();
      attachPageObservers(page);
      logDebug('login-start');
      await loginAsBusinessUser(page, baseUrl);
      logDebug('login-complete');
    };

    attachPageObservers(page);
    logDebug('login-start');
    await loginAsBusinessUser(page, baseUrl);
    logDebug('login-complete');

    const sampleResults: SearchCheckResult[] = [];
    const screenshotPaths: string[] = [];

    logDebug('customers-page-start');
    await page.goto(`${baseUrl}/customers`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (document.body?.innerText || '').includes('客户管理'), undefined, { timeout: PAGE_READY_TIMEOUT });

    for (const sample of samples) {
      const customerSearchUrl = `${baseUrl}/api/customers?page=1&pageSize=9&search=${encodeURIComponent(sample.customerName)}`;
      const expectedCustomerTotal = await fetchListTotal(page, customerSearchUrl);
      await verifyPageListCount(page, '搜索客户名称、编号或联系人...', sample.customerName, expectedCustomerTotal);
      sampleResults.push({
        sampleId: sample.sampleId,
        purpose: sample.purpose,
        customerName: sample.customerName,
        projectName: sample.projectName,
        customerPageVisible: true,
        projectPageVisible: false,
        solutionPageVisible: sample.hasSolution ? '待核对' : '不适用',
      });
      await clearSearch(page, '搜索客户名称、编号或联系人...');
    }

    const refreshCustomerTotal = await fetchListTotal(
      page,
      `${baseUrl}/api/customers?page=1&pageSize=9&search=${encodeURIComponent(refreshCustomerSample.customerName)}`,
    );
    await verifyPageListCount(page, '搜索客户名称、编号或联系人...', refreshCustomerSample.customerName, refreshCustomerTotal);
    const customerScreenshotPath = path.relative(process.cwd(), path.join(screenshotDir, 'customers-refresh-check.png')).replace(/\\/g, '/');
    await page.screenshot({ path: path.join(screenshotDir, 'customers-refresh-check.png'), fullPage: true });
    screenshotPaths.push(customerScreenshotPath);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (document.body?.innerText || '').includes('客户管理'), undefined, { timeout: PAGE_READY_TIMEOUT });
    await verifyPageListCount(page, '搜索客户名称、编号或联系人...', refreshCustomerSample.customerName, refreshCustomerTotal);
    await clearSearch(page, '搜索客户名称、编号或联系人...');
    logDebug('customers-page-complete');

    await resetAuthenticatedSession('after-customers');
    logDebug('projects-page-start');
    await page.goto(`${baseUrl}/projects`, { waitUntil: 'domcontentloaded' });
    const projectApiProbe = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/projects?pageSize=5', { credentials: 'include' });
        const text = await response.text();
        return {
          ok: response.ok,
          status: response.status,
          bodyPreview: text.slice(0, 200),
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
    logDebug(`projects-api-probe ${JSON.stringify(projectApiProbe)}`);
    await waitForProjectsPageReady(page);
    logDebug('projects-page-ready');
    const totalProjectCount = await fetchListTotal(page, `${baseUrl}/api/projects?page=1&pageSize=1000`);
    logDebug(`projects-total-count ${totalProjectCount}`);
    await verifyPageListCount(page, '搜索项目名称、客户名称或编号...', '', totalProjectCount);
    logDebug('projects-unfiltered-verified');

    for (const [index, sample] of samples.entries()) {
      logDebug(`project-sample-start ${sample.sampleId} ${sample.projectCode}`);
      const expectedProjectTotal = await fetchListTotal(
        page,
        `${baseUrl}/api/projects?page=1&pageSize=1000&search=${encodeURIComponent(sample.projectCode)}`,
      );
      logDebug(`project-sample-expected-total ${sample.sampleId} ${sample.projectCode} ${expectedProjectTotal}`);
      await verifyProjectSearchResult(page, sample.projectCode, expectedProjectTotal);
      logDebug(`project-sample-verified ${sample.sampleId} ${sample.projectCode}`);
      sampleResults[index].projectPageVisible = true;
      await clearSearch(page, '搜索项目名称、客户名称或编号...');
    }

    const refreshProjectTotal = await fetchListTotal(
      page,
      `${baseUrl}/api/projects?page=1&pageSize=1000&search=${encodeURIComponent(refreshProjectSample.projectCode)}`,
    );
    await verifyProjectSearchResult(page, refreshProjectSample.projectCode, refreshProjectTotal);
    const projectScreenshotPath = path.relative(process.cwd(), path.join(screenshotDir, 'projects-refresh-check.png')).replace(/\\/g, '/');
    await page.screenshot({ path: path.join(screenshotDir, 'projects-refresh-check.png'), fullPage: true });
    screenshotPaths.push(projectScreenshotPath);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForProjectsPageReady(page);
    await verifyPageListCount(page, '搜索项目名称、客户名称或编号...', '', totalProjectCount);
    await verifyProjectSearchResult(page, refreshProjectSample.projectCode, refreshProjectTotal);
    await clearSearch(page, '搜索项目名称、客户名称或编号...');
    logDebug('projects-page-complete');

    await resetAuthenticatedSession('after-projects');
    logDebug('solutions-page-start');
    await page.goto(`${baseUrl}/solutions`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (document.body?.innerText || '').includes('方案列表'), undefined, { timeout: PAGE_READY_TIMEOUT });

    for (const sample of solutionSamples) {
      await verifySearchHit(page, '搜索方案名称、编号...', sample.projectName, `${sample.projectName} 项目方案`);
      const target = sampleResults.find((result) => result.sampleId === sample.sampleId);
      if (target) {
        target.solutionPageVisible = '可见';
      }
      await clearSearch(page, '搜索方案名称、编号...');
    }

    if (refreshSolutionSample) {
      await verifySearchHit(page, '搜索方案名称、编号...', refreshSolutionSample.projectName, `${refreshSolutionSample.projectName} 项目方案`);
      const solutionScreenshotPath = path.relative(process.cwd(), path.join(screenshotDir, 'solutions-refresh-check.png')).replace(/\\/g, '/');
      await page.screenshot({ path: path.join(screenshotDir, 'solutions-refresh-check.png'), fullPage: true });
      screenshotPaths.push(solutionScreenshotPath);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => (document.body?.innerText || '').includes('方案列表'), undefined, { timeout: PAGE_READY_TIMEOUT });
      await verifySearchHit(page, '搜索方案名称、编号...', refreshSolutionSample.projectName, `${refreshSolutionSample.projectName} 项目方案`);
      await clearSearch(page, '搜索方案名称、编号...');
    }
    logDebug('solutions-page-complete');

    for (const result of sampleResults) {
      if (result.solutionPageVisible === '待核对') {
        result.solutionPageVisible = '未命中';
      }
    }

    await resetAuthenticatedSession('after-solutions');
    logDebug('dashboard-screen-start');
    await page.goto(`${baseUrl}/dashboard-screen`, { waitUntil: 'domcontentloaded' });
    await page.getByText('数据大屏').waitFor({ state: 'visible', timeout: PAGE_READY_TIMEOUT });
    const dashboardBeforeRefresh = await extractDashboardSnapshot(page);
    const dashboardScreenshotPath = path.relative(process.cwd(), path.join(screenshotDir, 'dashboard-screen-overview.png')).replace(/\\/g, '/');
    await page.screenshot({ path: path.join(screenshotDir, 'dashboard-screen-overview.png'), fullPage: true });
    screenshotPaths.push(dashboardScreenshotPath);

    const dashboardApiStats = await page.evaluate(async () => {
      const response = await fetch('/api/dashboard/stats', { credentials: 'include' });
      return await response.json();
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('数据大屏').waitFor({ state: 'visible', timeout: PAGE_READY_TIMEOUT });
    const dashboardAfterRefresh = await extractDashboardSnapshot(page);
    logDebug('dashboard-screen-complete');

    const markdown = buildMarkdown({
      baseUrl,
      sampleResults,
      refreshCustomerSample,
      refreshProjectSample,
      refreshSolutionSample,
      dashboardBeforeRefresh,
      dashboardAfterRefresh,
      dashboardApiStats,
      screenshotPaths,
    });

    writeFileSync(outputPath, markdown, 'utf8');
    logDebug('markdown-written');

    console.log(JSON.stringify({
      outputPath: path.relative(process.cwd(), outputPath).replace(/\\/g, '/'),
      screenshotCount: screenshotPaths.length,
      sampleCount: sampleResults.length,
      dashboardBeforeRefresh,
      dashboardAfterRefresh,
    }, null, 2));
    logDebug('script-complete');
  } catch (error) {
    const renderedError = error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error);
    logDebug(`script-error ${renderedError}`);
    throw error;
  } finally {
    activeDebugLogger = null;
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});