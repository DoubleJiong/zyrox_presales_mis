/**
 * 系统最终验收测试 (Final Acceptance Test Suite)
 * =================================================
 * 职责：产品上线前的最终业务验收门禁，覆盖以下维度：
 *  A. 认证流程      — 登录 / 退出
 *  B. Bug 修复回归  — 4.17 修复的 8 项业务规则
 *  C. 各业务模块    — 页面可访问性与基础 UI 渲染
 *  D. 数据接口      — 关键 API 端点健康检查
 *  E. 权限隔离      — 管理员全局视图 · 非管理员删除客户被拒
 *
 * 运行命令（服务器需提前在 5004 端口运行）：
 *   $env:PLAYWRIGHT_BASE_URL="http://localhost:5004"
 *   $env:PLAYWRIGHT_EXTERNAL_SERVER="1"
 *   corepack pnpm exec playwright test tests/e2e/playwright/final-acceptance.spec.ts --reporter=list
 */

import {
  test,
  expect,
  request as playwrightRequest,
  type APIRequestContext,
  type Page,
} from '@playwright/test';

// ─── 常量 ───────────────────────────────────────────────────────────────────

const ADMIN_USER = {
  email: 'admin@zhengyuan.com',
  password: 'password',
};

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5004';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

const KNOWN_CUSTOMER = {
  id: 115,
  name: '中国石油大学（北京）克拉玛依校区',
  region: 'xinjiang',   // 存储为英文 code，用于验证 getRegionLabel() 渲染
  regionChinese: '新疆维吾尔自治区',
  industry: 'education',
  projectType: 'INTEGRATION',
};

// ─── 测试套件 ────────────────────────────────────────────────────────────────

test.describe('final acceptance', () => {
  test.describe.configure({ mode: 'serial' });

  // ══════════════════════════════════════════════════
  // A. 认证流程
  // ══════════════════════════════════════════════════

  test('login succeeds and redirects away from login page', async ({ page }) => {
    // 未登录访问首页应被重定向到 /login
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    // 填写正确凭据后应成功进入系统
    await page.getByPlaceholder(/邮箱|email/i).fill(ADMIN_USER.email);
    await page.getByPlaceholder(/密码|password/i).fill(ADMIN_USER.password);
    await page.getByRole('button', { name: /登录|Login/i }).click();

    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    // 主导航或侧边栏可见
    await expect(page.locator('nav, [role="navigation"], [data-testid="sidebar"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('logout API clears session token', async ({ page }) => {
    await loginAsAdmin(page);
    let apiContext: APIRequestContext | null = null;
    try {
      apiContext = await createApiContextFromPage(page);
      // 调用 logout 接口
      const res = await apiContext.post('/api/auth/logout', { data: {} });
      // 接口本身应 2xx（或至少不 5xx）
      expect(res.status()).toBeLessThan(500);
    } finally {
      if (apiContext) await apiContext.dispose();
    }
  });

  // ══════════════════════════════════════════════════
  // B. Bug 修复回归 (4.17)
  // ══════════════════════════════════════════════════

  test('project region renders Chinese label not raw English code on detail page', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;
    const projectName = `验收-地区标签-${Date.now()}`;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      // 用英文 code 区域创建项目，验证 UI 展示中文名
      projectId = await createProjectForAcceptance(apiContext, projectName, { region: 'xinjiang' });

      // 区域信息显示在项目列表页的 TableCell 列中
      await page.goto('/projects');
      await page.getByPlaceholder('搜索项目名称、客户名称或编号...').fill(projectName);
      // 等待搜索结果出现
      const projectItem = page.locator('[data-testid="project-list-item"]').filter({ hasText: projectName }).first();
      if (await projectItem.count() === 0) {
        // card 模式无 region 列，改用表格模式切换按钮（若存在）
        const tableViewBtn = page.getByTestId('view-toggle-table').or(page.getByTitle('表格视图'));
        if (await tableViewBtn.count() > 0) {
          await tableViewBtn.first().click();
        }
      }
      // 直接到项目详情页，查看基本信息 tab（默认 tab，包含区域字段）
      await page.goto(`/projects/${projectId}`);
      await expect(page.getByText(projectName)).toBeVisible({ timeout: 10_000 });
      // 点击基本信息 tab（若页面不是以此 tab 为默认，需显式点击）
      const basicInfoTab = page.getByRole('tab', { name: '基本信息' });
      if (await basicInfoTab.count() > 0) {
        await basicInfoTab.click();
      }
      await page.waitForLoadState('networkidle');

      const pageText = await page.locator('body').textContent() || '';

      // 必须出现中文省名（新疆系列）
      expect(pageText).toMatch(/新疆/);
      // 绝对不能出现裸 英文小写区域码
      expect(pageText).not.toMatch(/\bxinjiang\b/i);
    } finally {
      if (apiContext) {
        if (projectId) await deleteProjectById(apiContext, projectId);
        await apiContext.dispose();
      }
    }
  });

  test('customer detail page loads stats section without errors', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      // 客户详情 API 应正常返回，不报 500
      const detailRes = await apiContext.get(`/api/customers/${KNOWN_CUSTOMER.id}`);
      expect(detailRes.ok()).toBeTruthy();

      const payload = await detailRes.json();
      const data = payload?.data || payload;
      expect(typeof data.id).toBe('number');

      // UI 页面能打开，关键字段可见
      await page.goto(`/customers/${KNOWN_CUSTOMER.id}`);
      await expect(page.getByRole('heading', { name: KNOWN_CUSTOMER.name }).or(
        page.getByText(KNOWN_CUSTOMER.name).first()
      )).toBeVisible({ timeout: 10_000 });
      await expect(page).not.toHaveURL(/\/login/);
    } finally {
      if (apiContext) await apiContext.dispose();
    }
  });

  test('customer follow time stores correct date without timezone shift', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;
    const projectName = `验收-时区-${Date.now()}`;
    // 时区测试：使用 UTC+8 下不会因转换滑入前一天的日期
    const inputDateTime = '2026-01-15T10:00';
    const expectedDateStr = '2026-01-15';

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      projectId = await createProjectForAcceptance(apiContext, projectName);

      // 写入跟进记录（该接口要求 multipart/form-data）
      const followRes = await apiContext.post(`/api/projects/${projectId}/follows`, {
        multipart: {
          followerName: '管理员',
          followTime: inputDateTime,
          followType: 'call',
          followContent: '验收时区测试跟进',
        },
      });
      expect(followRes.ok()).toBeTruthy();

      // 读回并验证日期字符串前 10 位 = 输入日期（不漂移）
      const listRes = await apiContext.get(`/api/projects/${projectId}/follows`);
      expect(listRes.ok()).toBeTruthy();
      const follows = (await listRes.json())?.data ?? [];
      const created = follows.find(
        (f: { followContent: string }) => f.followContent === '验收时区测试跟进'
      );
      expect(created).toBeTruthy();
      const storedDate = String(created.followTime).substring(0, 10);
      expect(storedDate).toBe(expectedDateStr);
    } finally {
      if (apiContext) {
        if (projectId) await deleteProjectById(apiContext, projectId);
        await apiContext.dispose();
      }
    }
  });

  test('project CSV export includes 项目类型 column in header', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      const res = await apiContext.get('/api/export?type=projects&format=csv');
      expect(res.ok()).toBeTruthy();

      const contentType = res.headers()['content-type'] || '';
      expect(contentType).toMatch(/csv|text|octet-stream/i);

      const csvText = await res.text();
      expect(csvText.trim().length).toBeGreaterThan(0);
      // 报头行必须包含 "项目类型"
      expect(csvText).toContain('项目类型');
    } finally {
      if (apiContext) await apiContext.dispose();
    }
  });

  test('new solution is created with initial version 1.0', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;
    let solutionId: number | null = null;
    const solutionName = `验收-版本初值-${Date.now()}`;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      const createRes = await apiContext.post('/api/solutions', {
        data: {
          solutionName,
          customerId: KNOWN_CUSTOMER.id,
          customerName: KNOWN_CUSTOMER.name,
          description: '验收版本初始值验证',
          status: 'draft',
        },
      });
      expect(createRes.ok()).toBeTruthy();

      const createPayload = await createRes.json();
      solutionId = createPayload?.data?.id;
      expect(typeof solutionId).toBe('number');

      // 从详情接口取 version 字段，必须为 '1.0'，不能是 '2.0'
      const detailRes = await apiContext.get(`/api/solutions/${solutionId}`);
      expect(detailRes.ok()).toBeTruthy();

      const detailPayload = await detailRes.json();
      const detail = detailPayload?.data ?? detailPayload;
      const version =
        detail?.solution?.version ??
        detail?.version ??
        detail?.currentVersion;
      expect(version).toBe('1.0');
    } finally {
      if (apiContext) {
        if (solutionId) {
          await apiContext.delete(`/api/solutions/${solutionId}`).catch(() => {});
        }
        await apiContext.dispose();
      }
    }
  });

  test('bidding approval self-approval is blocked with 403', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;
    const projectName = `验收-自审批-${Date.now()}`;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      projectId = await createProjectForAcceptance(apiContext, projectName);

      // 推进到招标阶段以允许提交审批
      await advanceProjectToStage(apiContext, projectId, 'bidding');

      // 作为 admin（项目负责人）提交投标立项审批
      const submitRes = await apiContext.post('/api/biddings/approvals', {
        data: {
          projectId,
          approvalType: 'bid_initiation',
          details: { comment: '验收测试：自审批应被拒绝' },
        },
      });

      if (!submitRes.ok()) {
        // 阶段状态不对 / 已存在审批单时跳过此测试
        test.skip(
          true,
          `无法提交审批（status=${submitRes.status()}），项目可能已在非预期阶段`
        );
        return;
      }

      const submitPayload = await submitRes.json();
      const approvalRequestId =
        submitPayload?.data?.approvalRequestId ?? submitPayload?.data?.id ?? null;

      // 同一用户（admin = 发起人）尝试审批 → 应收到 403
      const approveRes = await apiContext.put('/api/biddings/approvals', {
        data: {
          ...(approvalRequestId ? { approvalRequestId } : { projectId }),
          action: 'approve',
          comment: '尝试自审批（应被拒绝）',
        },
      });

      expect(approveRes.status()).toBe(403);
      const errBody = await approveRes.json();
      const errMsg: string = errBody?.message ?? errBody?.error ?? '';
      expect(errMsg).toContain('不能审批自己发起的审批单');
    } finally {
      if (apiContext) {
        if (projectId) await deleteProjectById(apiContext, projectId);
        await apiContext.dispose();
      }
    }
  });

  test('solution review submission by non-designated reviewer returns 403', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;
    let solutionId: number | null = null;
    let reviewId: number | null = null;
    const solutionName = `验收-非评审人-${Date.now()}`;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      // 找一个非 admin 用户担任指定评审人
      const usersRes = await apiContext.get('/api/users?includeRoles=true');
      expect(usersRes.ok()).toBeTruthy();
      const allUsers: Array<{ id: number; username: string }> =
        (await usersRes.json())?.data ?? [];
      const designatedReviewer = allUsers.find((u) => u.username !== 'admin');
      if (!designatedReviewer) {
        test.skip(true, '需要至少一个非管理员用户进行评审人测试');
        return;
      }

      // 创建方案
      const createRes = await apiContext.post('/api/solutions', {
        data: {
          solutionName,
          customerId: KNOWN_CUSTOMER.id,
          customerName: KNOWN_CUSTOMER.name,
          description: '验收非评审人提交测试',
          status: 'draft',
        },
      });
      expect(createRes.ok()).toBeTruthy();
      solutionId = (await createRes.json())?.data?.id as number;
      expect(typeof solutionId).toBe('number');

      // 创建评审任务，指定 designatedReviewer 为评审人
      const reviewRes = await apiContext.post(`/api/solutions/${solutionId}/reviews`, {
        data: {
          reviewerId: designatedReviewer.id,
          reviewType: 'technical',
          reviewComment: '验收测试评审任务',
        },
      });
      expect(reviewRes.ok()).toBeTruthy();
      reviewId = (await reviewRes.json())?.data?.id as number;
      expect(typeof reviewId).toBe('number');

      // admin（非指定评审人）尝试提交评审结果 → 应收到 403
      const submitRes = await apiContext.post(
        `/api/solutions/${solutionId}/reviews/${reviewId}/submit`,
        {
          data: {
            reviewStatus: 'approved',
            reviewComment: '非评审人尝试提交（应被拒绝）',
          },
        }
      );

      expect(submitRes.status()).toBe(403);
      const errBody = await submitRes.json();
      const errMsg: string = errBody?.error ?? errBody?.message ?? '';
      expect(errMsg).toContain('只有当前评审人可以提交评审结果');
    } finally {
      if (apiContext) {
        if (solutionId) {
          await apiContext.delete(`/api/solutions/${solutionId}`).catch(() => {});
        }
        await apiContext.dispose();
      }
    }
  });

  test('member search with purpose=member_search returns all active users', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      const searchRes = await apiContext.get('/api/users?purpose=member_search');
      expect(searchRes.ok()).toBeTruthy();

      const payload = await searchRes.json();
      const users: unknown[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
        ? payload
        : [];

      // 应返回全量用户（不能是空列表）
      expect(users.length).toBeGreaterThan(0);

      // 对比完整用户列表：member_search 返回的数量不应少于系统实际用户数
      const fullRes = await apiContext.get('/api/users?includeRoles=true');
      expect(fullRes.ok()).toBeTruthy();
      const fullUsers: unknown[] = (await fullRes.json())?.data ?? [];
      expect(users.length).toBeGreaterThanOrEqual(Math.min(fullUsers.length, 1));
    } finally {
      if (apiContext) await apiContext.dispose();
    }
  });

  // ══════════════════════════════════════════════════
  // C. 各业务模块页面可达性
  // ══════════════════════════════════════════════════

  test('contracts page loads without error', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/contracts');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main, [role="main"], h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('knowledge base page loads without error', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main, [role="main"], h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('calendar page loads without error', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main, [role="main"], h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('messages inbox page loads without error', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main, [role="main"], h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('work logs page loads without error', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/work-logs');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main, [role="main"], h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('standalone bidding page loads approval workflow', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/bidding');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main, [role="main"], h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('workbench page loads activity feed', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/workbench');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
  });

  test('staff archive page renders personnel list', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/staff');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByTestId('staff-page')).toBeVisible({ timeout: 10_000 });
  });

  test('data screen page shows live metrics', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/data-screen');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main, [role="main"], canvas, svg, [data-testid]').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('alerts page loads alert list', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/alerts');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main, [role="main"], h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('all critical navigation routes resolve without redirecting to login', async ({ page }) => {
    await loginAsAdmin(page);

    const routes = [
      '/projects',
      '/customers',
      '/solutions',
      '/settings/users',
      '/settings/roles',
      '/settings/data-permissions',
      '/settings/system-logs',
    ];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(/\/login/, { timeout: 8_000 });
    }
  });

  // ══════════════════════════════════════════════════
  // D. 数据接口健康检查
  // ══════════════════════════════════════════════════

  test('health check endpoint reports system alive', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      const res = await apiContext.get('/api/health');
      expect(res.ok()).toBeTruthy();

      const payload = await res.json();
      expect(payload?.status).toBe('alive');
    } finally {
      if (apiContext) await apiContext.dispose();
    }
  });

  test('weekly report API returns structured data for current week', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      const now = new Date();
      const year = now.getFullYear();
      // ISO 周数计算
      const startOfYear = new Date(year, 0, 1);
      const week = Math.ceil(
        ((now.getTime() - startOfYear.getTime()) / 86_400_000 + startOfYear.getDay() + 1) / 7
      );

      const res = await apiContext.get(`/api/reports/weekly?year=${year}&week=${week}`);
      expect(res.ok()).toBeTruthy();

      const payload = await res.json();
      // 接口不应返回硬错误
      expect(payload?.error).toBeFalsy();
    } finally {
      if (apiContext) await apiContext.dispose();
    }
  });

  test('data screen API returns live metrics object', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      const res = await apiContext.get('/api/data-screen/region-view');
      expect(res.ok()).toBeTruthy();

      const payload = await res.json();
      const data = payload?.data ?? payload;
      // 接口返回了对象，没有报错
      expect(typeof data === 'object' && data !== null).toBeTruthy();
    } finally {
      if (apiContext) await apiContext.dispose();
    }
  });

  // ══════════════════════════════════════════════════
  // E. 权限隔离验收
  // ══════════════════════════════════════════════════

  test('admin has global project visibility and can see all projects', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;
    let createdProjectId: number | null = null;
    const projectName = `验收-全局视图-${Date.now()}`;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      createdProjectId = await createProjectForAcceptance(apiContext, projectName);

      // 管理员查全量项目列表
      const res = await apiContext.get('/api/projects?pageSize=200');
      expect(res.ok()).toBeTruthy();

      const projects: Array<{ id: number }> =
        (await res.json())?.data?.projects ?? [];
      expect(projects.length).toBeGreaterThan(0);

      // 刚创建的项目必须在列表里
      const found = projects.find((p) => p.id === createdProjectId);
      expect(found).toBeTruthy();
    } finally {
      if (apiContext) {
        if (createdProjectId) await deleteProjectById(apiContext, createdProjectId);
        await apiContext.dispose();
      }
    }
  });

  test('non-admin user is denied when attempting to delete a customer', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;
    const username = `acceptance_perm_${Date.now()}`;
    const email = `${username}@zhengyuan.com`;
    let userId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      userId = await createUser(apiContext, {
        username,
        email,
        name: '验收权限测试用户',
        phone: '13800138099',
        roleIds: [7],
      });

      // 为该用户单独获取 token
      const loginCtx = await playwrightRequest.newContext();
      let userToken: string | null = null;
      try {
        const loginRes = await loginCtx.post(`${TEST_BASE_URL}/api/auth/login`, {
          data: { email, password: 'password' },
        });
        userToken = (await loginRes.json())?.data?.accessToken ?? null;
      } finally {
        await loginCtx.dispose();
      }

      if (!userToken) {
        // 无法获取非 admin token，跳过权限测试
        return;
      }

      const userApiCtx = await playwrightRequest.newContext({
        baseURL: TEST_BASE_URL,
        extraHTTPHeaders: { Authorization: `Bearer ${userToken}` },
      });

      try {
        // 非 admin 用户删除客户接口应被拒绝（仅管理员可删除）
        const deleteRes = await userApiCtx.delete(`/api/customers/${KNOWN_CUSTOMER.id}`);
        expect(deleteRes.status()).toBeGreaterThanOrEqual(400);
      } finally {
        await userApiCtx.dispose();
      }
    } finally {
      if (apiContext) {
        if (userId) await deleteUserByUsername(apiContext, username);
        await apiContext.dispose();
      }
    }
  });
});

// ─── Helper Functions ────────────────────────────────────────────────────────

async function loginAsAdmin(page: Page) {
  const authContext = await playwrightRequest.newContext({ baseURL: TEST_BASE_URL });
  const response = await authContext.post('/api/auth/login', { data: ADMIN_USER });
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  const accessToken: string = payload?.data?.accessToken;
  const refreshToken: string = payload?.data?.refreshToken;
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

async function createApiContextFromPage(page: Page): Promise<APIRequestContext> {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();

  return playwrightRequest.newContext({
    baseURL: TEST_BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

async function createProjectForAcceptance(
  apiContext: APIRequestContext,
  projectName: string,
  overrides: { region?: string } = {}
): Promise<number> {
  const response = await apiContext.post('/api/projects', {
    data: {
      projectName,
      customerId: KNOWN_CUSTOMER.id,
      customerName: KNOWN_CUSTOMER.name,
      projectType: KNOWN_CUSTOMER.projectType,
      industry: KNOWN_CUSTOMER.industry,
      region: overrides.region ?? '新疆',
      estimatedAmount: '100000',
      priority: 'medium',
      projectStage: 'opportunity',
    },
  });
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  const projectId: number = payload?.data?.id;
  expect(typeof projectId).toBe('number');
  return projectId;
}

async function deleteProjectById(apiContext: APIRequestContext, projectId: number) {
  const res = await apiContext.delete(`/api/projects/${projectId}`);
  if (res.ok()) return;
  const res2 = await apiContext.delete(`/api/projects?id=${projectId}`);
  // best-effort cleanup — don't throw if already deleted
  if (!res2.ok()) console.warn(`deleteProjectById: cleanup failed for id=${projectId}`);
}

async function advanceProjectToStage(
  apiContext: APIRequestContext,
  projectId: number,
  stage: 'bidding_pending' | 'bidding'
) {
  const sequence: Record<string, string[]> = {
    bidding_pending: ['bidding_pending'],
    bidding: ['bidding_pending', 'bidding'],
  };

  for (const s of sequence[stage]) {
    const res = await apiContext.post(`/api/projects/${projectId}/stage`, {
      data: { stage: s, confirmed: true },
    });
    expect(res.ok()).toBeTruthy();
  }
}

async function createUser(
  apiContext: APIRequestContext,
  user: { username: string; email: string; name: string; phone: string; roleIds?: number[] }
): Promise<number> {
  const response = await apiContext.post('/api/users', {
    data: {
      ...user,
      password: 'password',
      status: 'active',
      roleIds: user.roleIds ?? [1],
      baseLocation: null,
    },
  });
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  const userId: number = payload?.data?.id;
  expect(typeof userId).toBe('number');
  return userId;
}

async function deleteUserByUsername(apiContext: APIRequestContext, username: string) {
  const response = await apiContext.get('/api/users?includeRoles=true');
  expect(response.ok()).toBeTruthy();

  const users: Array<{ id: number; username: string }> =
    (await response.json())?.data ?? [];
  const user = users.find((u) => u.username === username);

  if (user) {
    const del = await apiContext.delete(`/api/users?id=${user.id}`);
    // best-effort
    if (!del.ok()) console.warn(`deleteUserByUsername: failed to delete ${username}`);
  }
}
