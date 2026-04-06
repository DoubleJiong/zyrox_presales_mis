import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { config as loadEnv } from 'dotenv';
import jwt from 'jsonwebtoken';
import { chromium, request as playwrightRequest, type APIRequestContext, type Page } from 'playwright';

loadEnv({ path: '.env.local' });

const BASE_URL = process.env.TASK8_FORMAL_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5004';
const BUILD_ID = process.env.TASK8_FORMAL_BUILD_ID || 'QtQJ7V2Xl8fJVkIswY6tx';
const OUTPUT_DIR = resolveWorkspacePath('docs', 'plans', 'evidence', '2026-04-06-task8-data-screen');
const RECORD_PATH = resolveWorkspacePath('docs', 'plans', '2026-04-06-data-screen-screenshot-evidence-record.md');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'task8-screenshot-evidence-manifest.json');
const READY_TIMEOUT = 45_000;

interface EvidenceItem {
  id: string;
  title: string;
  path: string;
  url: string;
  focus: string;
}

interface OverviewMetrics {
  totalOpenCount: number;
  totalOpenAmount: number;
  avgWinProbability: number;
  weightedPipeline: number;
  missingWinProbabilityCount: number;
}

interface PresalesMetrics {
  totalSupportHours: number;
  activeSupportProjects: number;
  missingWorklogRecordCount: number;
}

function resolveWorkspacePath(...segments: string[]) {
  return path.resolve(process.cwd(), ...segments);
}

function formatTimestamp(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function createAdminAuthTokens() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required for Task 8 screenshot evidence collection');
  }

  const accessToken = jwt.sign(
    {
      userId: 1,
      email: 'admin@zhengyuan.com',
      roleCode: 'ADMIN',
      roleId: 1,
    },
    jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: '7d',
      issuer: 'zhengyuan-presales',
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: 1,
      type: 'refresh',
    },
    jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: '30d',
      issuer: 'zhengyuan-presales',
    },
  );

  return { accessToken, refreshToken };
}

async function loginAsAdmin(page: Page, tokens: { accessToken: string; refreshToken: string }) {
  const origin = new URL(BASE_URL);

  await page.context().addInitScript(
    ({ token, nextRefreshToken }) => {
      window.localStorage.setItem('token', token);
      window.localStorage.setItem('refresh_token', nextRefreshToken);
    },
    { token: tokens.accessToken, nextRefreshToken: tokens.refreshToken },
  );

  await page.context().addCookies([
    {
      name: 'token',
      value: tokens.accessToken,
      domain: origin.hostname,
      path: '/',
      httpOnly: true,
      secure: origin.protocol === 'https:',
      sameSite: 'Lax',
    },
    {
      name: 'refresh_token',
      value: tokens.refreshToken,
      domain: origin.hostname,
      path: '/',
      httpOnly: true,
      secure: origin.protocol === 'https:',
      sameSite: 'Lax',
    },
  ]);

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
}

async function createApiContext(accessToken: string) {
  return playwrightRequest.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function fetchOverviewMetrics(apiContext: APIRequestContext): Promise<OverviewMetrics> {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  const response = await apiContext.get(
    `/api/data-screen/overview?startDate=${toDateOnly(startDate)}&endDate=${toDateOnly(endDate)}`,
  );

  if (!response.ok()) {
    throw new Error(`Overview API failed with status ${response.status()}`);
  }

  const payload = await response.json();
  const funnel = payload?.data?.funnel || {};

  return {
    totalOpenCount: Number(funnel.totalOpenCount || 0),
    totalOpenAmount: Number(funnel.totalOpenAmount || 0),
    avgWinProbability: Number(funnel.avgWinProbability || 0),
    weightedPipeline: Number(funnel.weightedPipeline || 0),
    missingWinProbabilityCount: Number(funnel.missingWinProbabilityCount || 0),
  };
}

async function fetchPresalesMetrics(apiContext: APIRequestContext): Promise<PresalesMetrics> {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  const response = await apiContext.get(
    `/api/data-screen/presales-focus-summary?startDate=${toDateOnly(startDate)}&endDate=${toDateOnly(endDate)}`,
  );

  if (!response.ok()) {
    throw new Error(`Presales summary API failed with status ${response.status()}`);
  }

  const payload = await response.json();
  const summary = payload?.data?.summary || payload?.data || {};

  return {
    totalSupportHours: Number(summary.totalSupportHours || 0),
    activeSupportProjects: Number(summary.activeSupportProjects || 0),
    missingWorklogRecordCount: Number(summary.missingWorklogRecordCount || 0),
  };
}

function toDateOnly(date: Date) {
  return date.toISOString().split('T')[0];
}

async function waitForDataScreen(page: Page) {
  await page.goto(`${BASE_URL}/data-screen`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.getByTestId('data-screen-page').waitFor({ state: 'visible', timeout: READY_TIMEOUT });
}

async function updateEvidenceBanner(page: Page, label: string) {
  const stamp = formatTimestamp(new Date());

  await page.evaluate(
    ({ currentLabel, generatedAt }) => {
      const bannerId = 'task8-evidence-banner';
      const bannerText = `${currentLabel} | ${window.location.pathname}${window.location.search} | ${generatedAt}`;
      let banner = document.getElementById(bannerId);

      if (!banner) {
        banner = document.createElement('div');
        banner.id = bannerId;
        banner.setAttribute(
          'style',
          [
            'position: fixed',
            'right: 16px',
            'bottom: 16px',
            'z-index: 2147483647',
            'max-width: 70vw',
            'padding: 10px 14px',
            'border-radius: 10px',
            'background: rgba(15, 23, 42, 0.9)',
            'color: #f8fafc',
            'font: 12px/1.4 Consolas, "Courier New", monospace',
            'box-shadow: 0 10px 30px rgba(15, 23, 42, 0.35)',
            'pointer-events: none',
            'white-space: nowrap',
          ].join('; '),
        );
        document.body.appendChild(banner);
      }

      banner.textContent = bannerText;
    },
    { currentLabel: label, generatedAt: stamp },
  );
}

async function captureViewportScreenshot(page: Page, fileName: string, label: string) {
  await updateEvidenceBanner(page, label);
  await page.waitForTimeout(600);
  const targetPath = path.join(OUTPUT_DIR, fileName);
  await page.screenshot({ path: targetPath, fullPage: false });
  return path.relative(process.cwd(), targetPath).replace(/\\/g, '/');
}

async function activateViewPreset(page: Page, testId: string, panelTestId: string) {
  await page.getByTestId(testId).evaluate((element: HTMLElement) => element.click());
  await page.getByTestId(panelTestId).waitFor({ state: 'visible', timeout: READY_TIMEOUT });
  await page.waitForTimeout(800);
}

async function scrollToText(page: Page, text: string) {
  await page.getByText(text, { exact: false }).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
}

function buildMarkdown(params: {
  generatedAt: string;
  screenshots: EvidenceItem[];
  overview: OverviewMetrics;
  presales: PresalesMetrics;
}) {
  const rows = params.screenshots
    .map(
      (item) =>
        `| ${item.id} | ${item.title} | ${item.url} | ${item.path} | ${item.focus} |`,
    )
    .join('\n');

  return `# 数据大屏 Task 8 页面截图证据记录\n\n日期：2026-04-06\n\n生成时间：${params.generatedAt}\n\n取证环境：formal ${BASE_URL}\n\nBUILD_ID：${BUILD_ID}\n\n取证账号：admin@zhengyuan.com（JWT 签发会话）\n\n说明：浏览器自动化截图无法包含原生地址栏，因此本次取证在页面右下角注入了路径条，作为 drill-through 落点留痕。\n\n## 1. 关键指标快照\n\n1. 经营漏斗：在手机会 ${params.overview.totalOpenCount}，敞口金额 ${params.overview.totalOpenAmount}，平均赢率 ${params.overview.avgWinProbability}%，加权合同池 ${params.overview.weightedPipeline}，缺失赢率计数 ${params.overview.missingWinProbabilityCount}。\n2. 售前汇总：总支撑工时 ${params.presales.totalSupportHours}，活跃支撑项目 ${params.presales.activeSupportProjects}，缺失工时记录 ${params.presales.missingWorklogRecordCount}。\n\n## 2. 截图清单\n\n| 编号 | 内容 | 页面路径 | 文件 | 取证焦点 |\n| --- | --- | --- | --- | --- |\n${rows}\n`;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1680, height: 1400 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  const tokens = createAdminAuthTokens();
  const apiContext = await createApiContext(tokens.accessToken);
  const evidenceItems: EvidenceItem[] = [];

  try {
    await loginAsAdmin(page, tokens);
    await waitForDataScreen(page);

    const overview = await fetchOverviewMetrics(apiContext);
    const presales = await fetchPresalesMetrics(apiContext);

    evidenceItems.push({
      id: 'SS-01',
      title: '管理层默认首屏总览',
      path: await captureViewportScreenshot(page, 'ss-01-management-overview.png', 'SS-01 管理层默认首屏总览'),
      url: '/data-screen',
      focus: '经营总览、目标与预测、风险摘要',
    });

    await scrollToText(page, '区域金额贡献 TOP3');
    evidenceItems.push({
      id: 'SS-02',
      title: '管理层区域金额贡献 TOP3',
      path: await captureViewportScreenshot(page, 'ss-02-management-top3.png', 'SS-02 区域金额贡献 TOP3'),
      url: '/data-screen',
      focus: '证明当前展示为金额榜而非热点榜',
    });

    await waitForDataScreen(page);
    await activateViewPreset(page, 'data-screen-view-preset-business-focus', 'data-screen-business-focus-panel');
    await page.getByTestId('data-screen-business-focus-panel').scrollIntoViewIfNeeded();
    evidenceItems.push({
      id: 'SS-03',
      title: '经营负责人首屏整卡',
      path: await captureViewportScreenshot(page, 'ss-03-business-overview.png', 'SS-03 经营负责人首屏整卡'),
      url: '/data-screen',
      focus: '在手机会、敞口金额、平均赢率、本周到期',
    });

    await scrollToText(page, '平均赢率');
    evidenceItems.push({
      id: 'SS-04',
      title: '经营负责人漏斗与风险区域',
      path: await captureViewportScreenshot(page, 'ss-04-business-funnel-risk.png', 'SS-04 经营负责人漏斗与风险区域'),
      url: '/data-screen',
      focus: `missingWinProbabilityCount=${overview.missingWinProbabilityCount} 与 weightedPipeline=${overview.weightedPipeline}`,
    });

    await page.getByTestId('data-screen-funnel-open-projects-link').evaluate((element: HTMLElement) => element.click());
    await page.waitForURL(/\/projects\?stage=opportunity$/, { timeout: READY_TIMEOUT });
    await page.waitForLoadState('networkidle');
    evidenceItems.push({
      id: 'SS-05',
      title: '经营负责人钻取项目页',
      path: await captureViewportScreenshot(page, 'ss-05-projects-drillthrough.png', 'SS-05 钻取项目页 /projects?stage=opportunity'),
      url: '/projects?stage=opportunity',
      focus: '证明 drill-through 进入 canonical 项目页',
    });

    await waitForDataScreen(page);
    await activateViewPreset(page, 'data-screen-view-preset-presales-focus', 'data-screen-presales-focus-panel');
    await page.getByTestId('data-screen-presales-focus-panel').scrollIntoViewIfNeeded();
    evidenceItems.push({
      id: 'SS-06',
      title: '售前负责人首屏整卡',
      path: await captureViewportScreenshot(page, 'ss-06-presales-overview.png', 'SS-06 售前负责人首屏整卡'),
      url: '/data-screen',
      focus: `总支撑工时=${presales.totalSupportHours}，活跃支撑项目=${presales.activeSupportProjects}`,
    });

    await scrollToText(page, '未填工时');
    evidenceItems.push({
      id: 'SS-07',
      title: '售前负责人工时提示区域',
      path: await captureViewportScreenshot(page, 'ss-07-presales-worklog-hint.png', 'SS-07 售前负责人工时提示区域'),
      url: '/data-screen',
      focus: `missingWorklogRecordCount=${presales.missingWorklogRecordCount}`,
    });

    await page.getByTestId('data-screen-presales-open-staff').evaluate((element: HTMLElement) => element.click());
    await page.waitForURL(/\/staff$/, { timeout: READY_TIMEOUT });
    await page.waitForLoadState('networkidle');
    evidenceItems.push({
      id: 'SS-08',
      title: '售前负责人钻取人员页',
      path: await captureViewportScreenshot(page, 'ss-08-staff-drillthrough.png', 'SS-08 钻取人员页 /staff'),
      url: '/staff',
      focus: '证明人员管理入口进入 canonical /staff',
    });

    const generatedAt = formatTimestamp(new Date());
    writeFileSync(
      RECORD_PATH,
      buildMarkdown({ generatedAt, screenshots: evidenceItems, overview, presales }),
      'utf8',
    );
    writeFileSync(
      MANIFEST_PATH,
      JSON.stringify(
        {
          generatedAt,
          baseUrl: BASE_URL,
          buildId: BUILD_ID,
          overview,
          presales,
          screenshots: evidenceItems,
        },
        null,
        2,
      ),
      'utf8',
    );

    console.log(
      JSON.stringify(
        {
          generatedAt,
          screenshotCount: evidenceItems.length,
          recordPath: path.relative(process.cwd(), RECORD_PATH).replace(/\\/g, '/'),
          manifestPath: path.relative(process.cwd(), MANIFEST_PATH).replace(/\\/g, '/'),
          screenshots: evidenceItems,
          overview,
          presales,
        },
        null,
        2,
      ),
    );
  } finally {
    await apiContext.dispose();
    await context.close();
    await browser.close();
  }
}

void main().catch((error) => {
  console.error('task8-collect-screenshot-evidence failed:', error);
  process.exitCode = 1;
});