import { config as loadEnv } from 'dotenv';
import { expect, test, type Page } from '@playwright/test';
import jwt from 'jsonwebtoken';

loadEnv({ path: '.env.local', quiet: true });

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);
const MOCK_AUTH_TOKENS = createAdminAuthTokens();

const summaryPayload = {
  filtersEcho: { view: 'role', range: '7d', focus: 'all', q: '' },
  window: { range: '7d', startDate: '2026-04-02', endDate: '2026-04-08', label: '近 7 天', activityThresholdDays: 7 },
  summary: {
    pendingTotal: 18,
    dueTodayTasks: 3,
    overdueTasks: 4,
    highPriorityTasks: 5,
    activeProjects: 6,
    keyProjectPeople: 4,
    overloadedPeople: 2,
    lowActivityPeople: 1,
  },
};

const riskPayload = {
  filtersEcho: { view: 'role', range: '7d', focus: 'all', q: '' },
  window: { range: '7d', startDate: '2026-04-02', endDate: '2026-04-08', label: '近 7 天', activityThresholdDays: 7 },
  overview: {
    highRiskPeople: 1,
    highRiskProjects: 1,
    overdueItems: 2,
    blockedItems: 1,
  },
  people: [
    {
      userId: 101,
      name: '张晨',
      department: '解决方案部',
      position: '架构师',
      pendingCount: 8,
      overdueCount: 2,
      highPriorityCount: 3,
      keyProjectCount: 2,
      riskScore: 68,
      lastActivityAt: '2026-04-08T09:00:00.000Z',
      reasons: ['当前待处理 8 项', '逾期事项 2 项'],
    },
  ],
  projects: [
    {
      projectId: 201,
      projectName: '算力中心升级',
      customerName: '杭州数智集团',
      stage: '方案设计',
      status: 'in_progress',
      priority: 'high',
      openTaskCount: 7,
      overdueTaskCount: 2,
      blockedTodoCount: 1,
      staleDays: 9,
      riskScore: 61,
      reasons: ['逾期任务 2 项', '近 9 天推进偏慢'],
    },
  ],
  blockedList: [
    {
      type: 'task',
      id: 1,
      title: '提交初版方案',
      ownerName: '张晨',
      projectName: '算力中心升级',
      dueDate: '2026-04-05',
      priority: 'high',
      status: 'in_progress',
      overdueDays: 3,
    },
  ],
};

const rolePayload = {
  filtersEcho: { view: 'role', range: '7d', focus: 'all', q: '' },
  window: { range: '7d', startDate: '2026-04-02', endDate: '2026-04-08', label: '近 7 天', activityThresholdDays: 7 },
  overview: { totalPeople: 3, overloadedPeople: 1, lowActivityPeople: 0, overduePeople: 1 },
  loadDistribution: [
    { bucket: 'reserve', label: '储备', count: 0, description: '当前待处理较少，可承接新增事项。' },
    { bucket: 'balanced', label: '平衡', count: 1, description: '负载平衡，推进节奏正常。' },
    { bucket: 'busy', label: '繁忙', count: 1, description: '事项集中，需要持续关注节奏。' },
    { bucket: 'overloaded', label: '过载', count: 1, description: '待处理或逾期明显偏高，应优先干预。' },
  ],
  roleGroups: [
    { roleName: '架构师', memberCount: 2, pendingTotal: 11, overdueTotal: 2, avgRiskScore: 44, overloadedCount: 1, lowActivityCount: 0 },
  ],
  riskRanking: [
    {
      userId: 101,
      name: '张晨',
      roleName: '架构师',
      department: '解决方案部',
      region: '杭州',
      pendingCount: 8,
      overdueCount: 2,
      highPriorityCount: 3,
      keyProjectCount: 2,
      activeProjectCount: 3,
      riskScore: 68,
      loadBucket: 'overloaded',
      lastActivityAt: '2026-04-08T09:00:00.000Z',
      reasons: ['当前待处理 8 项', '逾期事项 2 项'],
    },
  ],
  details: [
    {
      userId: 101,
      name: '张晨',
      roleName: '架构师',
      department: '解决方案部',
      position: '高级架构师',
      region: '杭州',
      pendingCount: 8,
      overdueCount: 2,
      highPriorityCount: 3,
      keyProjectCount: 2,
      activeProjectCount: 3,
      riskScore: 68,
      loadBucket: 'overloaded',
      lastActivityAt: '2026-04-08T09:00:00.000Z',
      lowActivity: false,
      reasons: ['当前待处理 8 项', '逾期事项 2 项'],
    },
  ],
};

const projectPayload = {
  filtersEcho: { view: 'project', range: '7d', focus: 'all', q: '' },
  window: { range: '7d', startDate: '2026-04-02', endDate: '2026-04-08', label: '近 7 天', activityThresholdDays: 7 },
  overview: { totalProjects: 2, highRiskProjects: 1, stalledProjects: 1, staffingTightProjects: 1 },
  stageDistribution: [
    { stage: '方案设计', label: '方案设计', count: 2, highRiskCount: 1, overdueTaskTotal: 2 },
  ],
  staffingOverview: [
    { projectId: 201, projectName: '算力中心升级', customerName: '杭州数智集团', memberCount: 4, activePeopleCount: 3, overloadedPeopleCount: 1, openTaskCount: 7, blockedTodoCount: 1 },
  ],
  riskHeat: [
    { projectId: 201, projectName: '算力中心升级', customerName: '杭州数智集团', stage: '方案设计', status: 'in_progress', priority: 'high', openTaskCount: 7, overdueTaskCount: 2, blockedTodoCount: 1, highPriorityTaskCount: 3, activePeopleCount: 3, overloadedPeopleCount: 1, staleDays: 9, riskScore: 61, lastProgressAt: '2026-04-07T11:00:00.000Z', reasons: ['逾期任务 2 项'] },
  ],
  details: [
    { projectId: 201, projectName: '算力中心升级', customerName: '杭州数智集团', stage: '方案设计', status: 'in_progress', priority: 'high', memberCount: 4, activePeopleCount: 3, overloadedPeopleCount: 1, openTaskCount: 7, overdueTaskCount: 2, blockedTodoCount: 1, highPriorityTaskCount: 3, staleDays: 9, riskScore: 61, keyProject: true, lastProgressAt: '2026-04-07T11:00:00.000Z', reasons: ['逾期任务 2 项'] },
  ],
};

const customerPayload = {
  filtersEcho: { view: 'customer', range: '7d', focus: 'all', q: '' },
  window: { range: '7d', startDate: '2026-04-02', endDate: '2026-04-08', label: '近 7 天', activityThresholdDays: 7 },
  overview: { totalCustomers: 2, lowInteractionCustomers: 1, highBacklogCustomers: 1, highRiskCustomers: 1 },
  activityDistribution: [
    { bucket: 'active', label: '活跃互动', count: 1, description: '最近持续互动，推进节奏正常。' },
    { bucket: 'watch', label: '关注观察', count: 0, description: '互动开始放缓，需要保持跟进。' },
    { bucket: 'cooling', label: '降温预警', count: 1, description: '近期互动明显减少，应安排回访。' },
    { bucket: 'silent', label: '沉默客户', count: 0, description: '较长时间无互动，需重点修复关系。' },
  ],
  scaleRanking: [
    { customerId: 301, customerName: '杭州数智集团', customerTypeName: '企业', region: '杭州', currentProjectCount: 2, activeProjectCount: 1, openItemCount: 8, overdueItemCount: 2, keyProjectCount: 1, riskScore: 52, interactionStatus: 'cooling', lastInteractionTime: '2026-04-01T10:00:00.000Z', reasons: ['互动降温', '关联事项 8 项'] },
  ],
  details: [
    { customerId: 301, customerName: '杭州数智集团', customerTypeName: '企业', region: '杭州', contactName: '李敏', currentProjectCount: 2, activeProjectCount: 1, openItemCount: 8, overdueItemCount: 2, keyProjectCount: 1, riskScore: 52, interactionStatus: 'cooling', lastInteractionTime: '2026-04-01T10:00:00.000Z', reasons: ['互动降温', '关联事项 8 项'] },
  ],
};

const solutionPayload = {
  filtersEcho: { view: 'solution', range: '7d', focus: 'all', q: '' },
  window: { range: '7d', startDate: '2026-04-02', endDate: '2026-04-08', label: '近 7 天', activityThresholdDays: 7 },
  overview: { totalSolutions: 2, reviewingSolutions: 1, overdueReviews: 1, staleSolutions: 1 },
  statusDistribution: [
    { status: 'reviewing', label: '审核中', count: 1, pendingReviewCount: 2 },
    { status: 'draft', label: '草稿', count: 1, pendingReviewCount: 0 },
  ],
  pressureRanking: [
    { solutionId: 401, solutionName: '智算平台总集成方案', solutionTypeName: '平台方案', version: '2.1', status: 'reviewing', approvalStatus: 'pending', relatedProjectCount: 2, pendingReviewCount: 2, overdueReviewCount: 1, staleDays: 9, riskScore: 66, lastUpdatedAt: '2026-04-07T11:30:00.000Z', reasons: ['待评审 2 条', '逾期评审 1 条'] },
  ],
  details: [
    { solutionId: 401, solutionName: '智算平台总集成方案', solutionTypeName: '平台方案', version: '2.1', status: 'reviewing', approvalStatus: 'pending', ownerName: '王磊', reviewerName: '周宁', relatedProjectCount: 2, pendingReviewCount: 2, overdueReviewCount: 1, staleDays: 9, riskScore: 66, lastUpdatedAt: '2026-04-07T11:30:00.000Z', reasons: ['待评审 2 条', '逾期评审 1 条'] },
  ],
};

const detailPayloads = {
  person: {
    filtersEcho: { view: 'role', range: '7d', focus: 'all', q: '' },
    entityType: 'person',
    entityId: 101,
    title: '张晨',
    subtitle: '架构师 / 解决方案部',
    description: '当前待处理 8 项 / 逾期事项 2 项',
    statusLabel: '执行画像',
    metrics: [{ label: '待处理', value: '8' }, { label: '逾期事项', value: '2' }],
    fields: [{ label: '岗位', value: '高级架构师' }, { label: '区域', value: '杭州' }],
    sections: [],
    actions: [
      { label: '打开人员页面', href: '/staff/101', variant: 'default' },
      { label: '进入任务中心', href: '/tasks?scope=all&assigneeId=101', variant: 'outline' },
    ],
  },
  customer: {
    filtersEcho: { view: 'customer', range: '7d', focus: 'all', q: '' },
    entityType: 'customer',
    entityId: 301,
    title: '杭州数智集团',
    subtitle: '企业 / 杭州',
    description: '当前主要联系人：李敏',
    statusLabel: 'active',
    metrics: [{ label: '当前项目数', value: '2' }, { label: '关联项目', value: '2' }],
    fields: [{ label: '联系人', value: '李敏' }, { label: '最近互动', value: '2026.04.01' }],
    sections: [],
    actions: [{ label: '打开客户页面', href: '/customers/301', variant: 'default' }],
  },
  solution: {
    filtersEcho: { view: 'solution', range: '7d', focus: 'all', q: '' },
    entityType: 'solution',
    entityId: 401,
    title: '智算平台总集成方案',
    subtitle: '平台方案 / 版本 2.1',
    description: '待评审 2 条 / 逾期评审 1 条',
    statusLabel: 'reviewing',
    metrics: [{ label: '关联项目', value: '2' }, { label: '相关人员', value: '2' }],
    fields: [{ label: '方案类型', value: '平台方案' }, { label: '方案状态', value: 'reviewing' }],
    sections: [],
    actions: [{ label: '打开方案页面', href: '/solutions/401', variant: 'default' }],
  },
};

test.describe('team execution cockpit', () => {
  test('supports view switching, detail drawer, canonical drill-through, and filter persistence', async ({ page }) => {
    await installMockAuth(page, MOCK_AUTH_TOKENS);
    await mockTeamExecutionApis(page);

    await page.goto('/data-screen/team-execution');
    await expect(page.getByRole('heading', { name: '团队执行驾驶舱' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('radio', { name: '角色视角' })).toBeChecked();

    await page.getByRole('radio', { name: '项目视角' }).click();
    await expect(page.getByRole('radio', { name: '项目视角' })).toBeChecked();
    await expect(page.getByText('算力中心升级').first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole('radio', { name: '客户视角' }).click();
    await expect(page.getByRole('radio', { name: '客户视角' })).toBeChecked();
    await page.getByRole('button', { name: /杭州数智集团/ }).first().click();
    await expect(page.getByText('当前对象不可用')).not.toBeVisible();
    await expect(page.getByRole('heading', { name: '杭州数智集团' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('link', { name: /打开客户页面/ })).toHaveAttribute('href', /\/customers\/301/);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('link', { name: /打开客户页面/ })).not.toBeVisible();

    await page.getByRole('radio', { name: '方案视角' }).click();
    await expect(page.getByRole('radio', { name: '方案视角' })).toBeChecked();
    await page.getByRole('button', { name: /智算平台总集成方案/ }).first().click();
    await expect(page.getByRole('heading', { name: '智算平台总集成方案' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('link', { name: /打开方案页面/ })).toHaveAttribute('href', /\/solutions\/401/);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('link', { name: /打开方案页面/ })).not.toBeVisible();

    await page.getByRole('radio', { name: '角色视角' }).click();
    await expect(page.getByRole('radio', { name: '角色视角' })).toBeChecked();
    await page.getByRole('button', { name: /张晨/ }).first().click();
    await expect(page.getByRole('heading', { name: '张晨' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('link', { name: /进入任务中心/ })).toHaveAttribute('href', /\/tasks\?scope=all&assigneeId=101/);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('link', { name: /进入任务中心/ })).not.toBeVisible();

    await page.getByRole('radio', { name: '客户视角' }).click();
    await page.getByPlaceholder('搜索人员、项目、客户、方案').fill('杭州');
    await page.locator('[data-testid="team-execution-keyword-apply"]').click();

    await expect(page).toHaveURL(/view=customer/);
    await expect(page).toHaveURL(/q=%E6%9D%AD%E5%B7%9E/);

    await page.reload();
    await expect(page.getByRole('radio', { name: '客户视角' })).toBeChecked();
    await expect(page.getByPlaceholder('搜索人员、项目、客户、方案')).toHaveValue('杭州');

    await page.getByRole('button', { name: /重置/ }).click();
    await expect(page).not.toHaveURL(/view=customer/);
    await expect(page.getByPlaceholder('搜索人员、项目、客户、方案')).toHaveValue('');
    await expect(page.getByRole('radio', { name: '角色视角' })).toBeChecked();
  });
});

async function mockTeamExecutionApis(page: Page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 1,
          username: 'admin',
          realName: '管理员',
          email: 'admin@example.com',
          roleCode: 'ADMIN',
        },
      }),
    });
  });
  await page.route('**/api/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: MOCK_AUTH_TOKENS.accessToken,
          refreshToken: MOCK_AUTH_TOKENS.refreshToken,
          expiresIn: 3600,
        },
      }),
    });
  });
  await page.route('**/api/auth/permissions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 1,
          username: 'admin',
          realName: '管理员',
          email: 'admin@example.com',
          roleCode: 'ADMIN',
          permissions: ['team-execution-cockpit:view'],
          isSuperAdmin: false,
        },
      }),
    });
  });

  await page.route('**/api/data-screen/team-execution/summary**', async (route) => {
    await route.fulfill(jsonOk(summaryPayload));
  });
  await page.route('**/api/data-screen/team-execution/risk**', async (route) => {
    await route.fulfill(jsonOk(riskPayload));
  });
  await page.route('**/api/data-screen/team-execution/role**', async (route) => {
    await route.fulfill(jsonOk(rolePayload));
  });
  await page.route('**/api/data-screen/team-execution/project**', async (route) => {
    await route.fulfill(jsonOk(projectPayload));
  });
  await page.route('**/api/data-screen/team-execution/customer**', async (route) => {
    await route.fulfill(jsonOk(customerPayload));
  });
  await page.route('**/api/data-screen/team-execution/solution**', async (route) => {
    await route.fulfill(jsonOk(solutionPayload));
  });
  await page.route('**/api/data-screen/team-execution/detail**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const entityType = requestUrl.searchParams.get('entityType') as keyof typeof detailPayloads | null;
    const payload = entityType ? detailPayloads[entityType] : null;

    await route.fulfill(
      payload
        ? jsonOk(payload)
        : {
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: { message: 'not found' } }),
          }
    );
  });
}

function jsonOk(data: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
  };
}

async function installMockAuth(page: Page, tokens: { accessToken: string; refreshToken: string }) {
  await page.context().addInitScript(
    ({ token, refreshToken }) => {
      window.localStorage.setItem('token', token);
      window.localStorage.setItem('refresh_token', refreshToken);
    },
    { token: tokens.accessToken, refreshToken: tokens.refreshToken }
  );

  await page.context().addCookies([
    {
      name: 'token',
      value: tokens.accessToken,
      domain: TEST_BASE_ORIGIN.hostname,
      path: '/',
      httpOnly: true,
      secure: TEST_BASE_ORIGIN.protocol === 'https:',
      sameSite: 'Lax',
    },
    {
      name: 'refresh_token',
      value: tokens.refreshToken,
      domain: TEST_BASE_ORIGIN.hostname,
      path: '/',
      httpOnly: true,
      secure: TEST_BASE_ORIGIN.protocol === 'https:',
      sameSite: 'Lax',
    },
  ]);
}

function createAdminAuthTokens() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required for team execution cockpit auth setup');
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
    }
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
    }
  );

  return { accessToken, refreshToken };
}