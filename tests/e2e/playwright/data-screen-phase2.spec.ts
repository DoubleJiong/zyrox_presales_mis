import { config as loadEnv } from 'dotenv';
import { expect, test, type Page, type Route } from '@playwright/test';
import jwt from 'jsonwebtoken';

loadEnv({ path: '.env.local' });

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

test.use({ viewport: { width: 1600, height: 1200 } });

test.describe('data-screen phase2 validation', () => {
  test('supports primary-view switching and unified drilldown drawers', async ({ page }) => {
    const authTokens = createAdminAuthTokens();
    await installMockAuth(page, authTokens);
    await mockAuthApis(page, authTokens);
    await mockPhase2DataScreenApis(page);

    await page.goto('/data-screen?view=personnel&preset=management&panel=projects&map=province-outside&heatmap=customer&startDate=2026-04-01&endDate=2026-04-08&autoRefresh=0');

    await expect(page.getByTestId('data-screen-page')).toBeVisible();
    await expect(page.getByTestId('data-screen-personnel-layout')).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('data-screen-personnel-item-task-101').click();
    await expect(page.getByTestId('data-screen-personnel-item-detail-drawer')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('data-screen-personnel-item-detail-title')).toContainText('招标文件复核');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('data-screen-personnel-item-detail-drawer')).toBeHidden({ timeout: 20_000 });

    await page.getByTestId('data-screen-primary-view-topic').evaluate((element) => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await expect(page.getByTestId('data-screen-topic-layout')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('data-screen-topic-risk-project-3001').click();
    await expect(page.getByTestId('data-screen-topic-project-risk-drawer')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('data-screen-topic-project-risk-title')).toContainText('宁波云医院平台');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('data-screen-topic-project-risk-drawer')).toBeHidden({ timeout: 20_000 });

    await page.getByTestId('data-screen-primary-view-region').evaluate((element) => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await expect(page.getByTestId('data-screen-region-layout')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('data-screen-region-bottom-panel-customers').getByRole('button', { name: '查看客户全景' }).click();
    await expect(page.getByTestId('data-screen-region-bottom-drawer')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('data-screen-region-bottom-drawer').getByRole('button', { name: /宁波市/ }).click();
    await expect(page.getByTestId('data-screen-region-detail-drawer')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('data-screen-region-detail-title')).toContainText('宁波市');
  });
});

async function mockPhase2DataScreenApis(page: Page) {
  await page.route('**/api/navigation/badges**', async (route) => {
    await fulfillJson(route, { success: true, data: {}, error: null });
  });

  await page.route('**/api/data-screen/panels**', async (route) => {
    await fulfillJson(route, {
      success: true,
      data: {
        statusDistribution: [],
        stageDistribution: [
          { stage: '立项', count: 2, amount: 1800000 },
          { stage: '投标', count: 1, amount: 1200000 },
        ],
        typeDistribution: [],
        regionDistribution: [],
        bidResultDistribution: [],
        recentProjects: [
          { id: 3001, name: '宁波云医院平台', customerName: '宁波市一院', status: '推进中', stage: '投标', amount: 1200000, time: '2026-04-08' },
        ],
        funnelData: [
          { stage: '商机', count: 2 },
          { stage: '投标', count: 1 },
        ],
        projectTrends: [
          { month: '2026-03', newProjects: 2, wonProjects: 1 },
          { month: '2026-04', newProjects: 1, wonProjects: 0 },
        ],
        summary: {
          totalProjects: 3,
          totalAmount: 3200000,
          wonCount: 1,
          winRate: 33,
        },
      },
      error: null,
    });
  });

  await page.route('**/api/data-screen/personnel-view**', async (route) => {
    const url = new URL(route.request().url());
    const personId = url.searchParams.get('personId') || '101';
    const selectedItemId = url.searchParams.get('selectedItemId');
    await fulfillJson(route, {
      success: true,
      data: buildPersonnelViewPayload(personId, selectedItemId),
      error: null,
    });
  });

  await page.route('**/api/data-screen/region-view**', async (route) => {
    const url = new URL(route.request().url());
    await fulfillJson(route, {
      success: true,
      data: buildRegionViewPayload(url.searchParams.get('map') || 'province-outside'),
      error: null,
    });
  });

  await page.route('**/api/data-screen/region-detail**', async (route) => {
    const url = new URL(route.request().url());
    const region = url.searchParams.get('region') || '宁波市';
    await fulfillJson(route, {
      success: true,
      data: buildRegionDetailPayload(region),
      error: null,
    });
  });
}

async function mockAuthApis(page: Page, tokens: { accessToken: string; refreshToken: string }) {
  await page.route('**/api/auth/me', async (route) => {
    await fulfillJson(route, {
      success: true,
      data: {
        id: 1,
        username: 'admin',
        realName: '管理员',
        email: 'admin@example.com',
        roleCode: 'ADMIN',
      },
      error: null,
    });
  });

  await page.route('**/api/auth/refresh', async (route) => {
    await fulfillJson(route, {
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 3600,
      },
      error: null,
    });
  });

  await page.route('**/api/auth/permissions', async (route) => {
    await fulfillJson(route, {
      success: true,
      data: {
        id: 1,
        username: 'admin',
        realName: '管理员',
        email: 'admin@example.com',
        roleCode: 'ADMIN',
        permissions: ['datascreen:view'],
        isSuperAdmin: false,
      },
      error: null,
    });
  });
}

function buildPersonnelViewPayload(personId: string, selectedItemId: string | null) {
  const activePersonId = Number(personId);
  const items = [
    {
      id: 'task-101',
      title: '招标文件复核',
      type: 'task',
      status: '处理中',
      priority: 'high',
      dueDate: '2026-04-10',
      lastUpdatedAt: '2026-04-08T10:00:00.000Z',
      isOverdue: false,
      progress: 65,
      customerName: '宁波市一院',
      projectName: '宁波云医院平台',
      solutionName: '医疗云底座',
      abnormalFlags: ['high-priority-stalled'],
      description: '需要在投标前完成关键条款与交付边界复核。',
      blockerReason: '法务意见尚未回传。',
      collaborationContext: [
        { label: '协同销售', value: '王欣' },
        { label: '法务接口人', value: '周宁' },
      ],
      timeline: [
        { label: '2026-04-06', value: '完成技术条款初审', tone: 'neutral' },
        { label: '2026-04-08', value: '等待法务复核意见', tone: 'warning' },
      ],
      jumpLinks: [
        { label: '查看项目详情', href: '/projects/3001' },
        { label: '进入任务中心', href: '/tasks?scope=mine' },
      ],
    },
    {
      id: 'todo-202',
      title: '售前演示环境确认',
      type: 'todo',
      status: '待处理',
      priority: 'medium',
      dueDate: '2026-04-11',
      lastUpdatedAt: '2026-04-07T09:00:00.000Z',
      isOverdue: false,
      progress: 20,
      customerName: '宁波市一院',
      projectName: '宁波云医院平台',
      solutionName: '医疗云底座',
      abnormalFlags: [],
      description: '核对演示账号和环境连通性。',
      blockerReason: '',
      collaborationContext: [],
      timeline: [],
      jumpLinks: [],
    },
  ];

  return {
    filtersEcho: {
      startDate: '2026-04-01',
      endDate: '2026-04-08',
      preset: 'management',
      personId: activePersonId,
      abnormalFilter: 'all',
      selectedItemId,
      peoplePage: 1,
      peoplePageSize: 8,
      itemPage: 1,
      itemPageSize: 8,
    },
    summary: {
      managedPeopleCount: 6,
      activePeopleCount: 5,
      overloadedPeopleCount: 1,
      lowActivityPeopleCount: 1,
      riskPeopleCount: 2,
      pendingItemCount: 8,
      overdueItemCount: 1,
      highPriorityItemCount: 3,
      activeProjectPeopleCount: 4,
      activeSolutionPeopleCount: 3,
    },
    loadDistribution: [
      { bucket: 'balanced', label: '均衡', description: '负载在健康区间内', count: 3 },
      { bucket: 'busy', label: '偏忙', description: '需关注但可控', count: 2 },
      { bucket: 'overloaded', label: '过载', description: '需要尽快调节', count: 1 },
    ],
    roleGroups: [
      { roleName: '售前经理', memberCount: 2, avgRiskScore: 72, pendingTotal: 4, overdueTotal: 1 },
    ],
    regionGroups: [
      { region: '宁波市', memberCount: 3, overloadedCount: 1, riskCount: 2 },
    ],
    itemStatusSummary: [
      { key: 'open', label: '处理中', count: 5, overdueCount: 1 },
      { key: 'todo', label: '待处理', count: 3, overdueCount: 0 },
    ],
    itemAbnormalSummary: [
      { key: 'all', label: '全部事项', count: 8, description: '全部待处理事项' },
      { key: 'overdue', label: '逾期', count: 1, description: '已逾期事项' },
      { key: 'high-priority-stalled', label: '高优未推进', count: 2, description: '高优先级但推进迟滞' },
      { key: 'stale', label: '长时间未更新', count: 1, description: '更新明显滞后' },
      { key: 'cross-project-overload', label: '跨项目过载', count: 1, description: '跨项目负载过高' },
    ],
    riskRanking: [
      { userId: 101, name: '李晨', roleName: '售前经理', department: '华东一部', region: '宁波市', riskScore: 86, loadBucket: 'overloaded', pendingCount: 4, overdueCount: 1 },
      { userId: 102, name: '周雅', roleName: '解决方案经理', department: '华东一部', region: '杭州市', riskScore: 71, loadBucket: 'busy', pendingCount: 3, overdueCount: 0 },
    ],
    peopleList: {
      items: [
        { userId: 101, name: '李晨', roleName: '售前经理', region: '宁波市', loadBucket: 'overloaded', pendingCount: 4, overdueCount: 1, highPriorityCount: 2 },
        { userId: 102, name: '周雅', roleName: '解决方案经理', region: '杭州市', loadBucket: 'busy', pendingCount: 3, overdueCount: 0, highPriorityCount: 1 },
      ],
      pagination: { page: 1, pageSize: 8, total: 2, totalPages: 1 },
    },
    selectedPerson: {
      userId: activePersonId,
      name: activePersonId === 101 ? '李晨' : '周雅',
      roleName: activePersonId === 101 ? '售前经理' : '解决方案经理',
      department: '华东一部',
      region: activePersonId === 101 ? '宁波市' : '杭州市',
      loadBucket: activePersonId === 101 ? 'overloaded' : 'busy',
      currentTaskCount: activePersonId === 101 ? 4 : 3,
      overdueItemCount: activePersonId === 101 ? 1 : 0,
      highPriorityItemCount: activePersonId === 101 ? 2 : 1,
      activeProjectCount: 2,
      activeSolutionCount: 1,
      riskScore: activePersonId === 101 ? 86 : 71,
      lastActivityAt: '2026-04-08T10:00:00.000Z',
      reasons: ['投标前复核密集', '跨团队协同待确认'],
    },
    itemList: {
      items,
      pagination: { page: 1, pageSize: 8, total: items.length, totalPages: 1 },
    },
    selectedItem: selectedItemId ? items.find((item) => item.id === selectedItemId) || null : null,
    timestamp: '2026-04-09T10:00:00.000Z',
  };
}

function buildRegionViewPayload(mapType: string) {
  return {
    filtersEcho: {
      map: mapType,
      heatmap: 'customer',
      startDate: '2026-04-01',
      endDate: '2026-04-08',
    },
    summary: {
      totalCustomers: 16,
      totalProjects: 7,
      totalSolutions: 4,
      totalRevenue: 5600000,
      wonProjects: 2,
      riskProjectCount: 3,
      activeRegionCount: 3,
    },
    map: {
      mode: mapType,
      heatmap: 'customer',
      label: '客户数',
      unit: '家',
      regions: [
        { name: '宁波市', customerCount: 6, projectCount: 3, projectAmount: 2200000, ongoingProjectAmount: 1600000, solutionUsage: 2, preSalesActivity: 4, budget: 2600000, contractAmount: 1200000 },
        { name: '杭州市', customerCount: 5, projectCount: 2, projectAmount: 1800000, ongoingProjectAmount: 1200000, solutionUsage: 1, preSalesActivity: 3, budget: 2000000, contractAmount: 900000 },
        { name: '温州市', customerCount: 5, projectCount: 2, projectAmount: 1600000, ongoingProjectAmount: 900000, solutionUsage: 1, preSalesActivity: 2, budget: 1800000, contractAmount: 600000 },
      ],
    },
    rankings: {
      topRegions: [
        { name: '宁波市', value: 3, amount: 2200000 },
        { name: '杭州市', value: 2, amount: 1800000 },
      ],
      topRevenueRegions: [
        { name: '宁波市', value: 2200000, amount: 2200000 },
        { name: '杭州市', value: 1800000, amount: 1800000 },
      ],
    },
    funnel: {
      totalOpenCount: 5,
      totalOpenAmount: 3600000,
      weightedPipeline: 2200000,
      avgWinProbability: 57,
      missingWinProbabilityCount: 0,
      stages: [
        { label: '商机', count: 2, amount: 1200000 },
        { label: '投标', count: 2, amount: 1800000 },
      ],
    },
    forecastSummary: {
      coverageRate: 84,
    },
    riskSummary: {
      total: 3,
      high: 1,
      medium: 2,
      overdueActions: 1,
      overdueBids: 0,
      staleProjects: 1,
      dueThisWeek: 2,
      items: [
        { projectId: 3001, projectName: '宁波云医院平台', region: '宁波市', stage: '投标', amount: 1200000, riskLevel: 'high', reason: '法务条款待确认', winProbability: 62, score: 88 },
        { projectId: 3002, projectName: '杭州数智治理平台', region: '杭州市', stage: '方案', amount: 900000, riskLevel: 'medium', reason: '客户需求反复变更', winProbability: 54, score: 72 },
      ],
    },
    timestamp: '2026-04-09T08:00:00.000Z',
  };
}

function buildRegionDetailPayload(region: string) {
  return {
    regionLabel: region,
    filtersEcho: {
      map: 'province-outside',
      heatmap: 'customer',
      startDate: '2026-04-01',
      endDate: '2026-04-08',
    },
    summary: {
      customerCount: 6,
      projectCount: 3,
      projectAmount: 2200000,
      contractAmount: 1200000,
      riskCount: 2,
      highRiskCount: 1,
      activeStaffCount: 4,
      solutionUsage: 2,
      preSalesActivity: 4,
    },
    customerSnapshot: {
      items: [
        { id: 11, name: '宁波市一院', status: '重点推进', currentProjectCount: 2, totalAmount: 1800000, lastInteractionTime: '2026-04-08T10:00:00.000Z' },
      ],
    },
    projectSnapshot: {
      wonCount: 1,
      items: [
        { id: 3001, name: '宁波云医院平台', customerName: '宁波市一院', stage: '投标', status: '推进中', amount: 1200000, managerName: '王欣' },
      ],
    },
    riskSnapshot: {
      items: [
        { id: 901, projectName: '宁波云医院平台', riskLevel: 'high', status: '待处置', description: '法务条款待确认' },
      ],
    },
    collaborationSnapshot: {
      items: [
        { userId: 101, realName: '李晨', position: '售前经理', projectCount: 2 },
      ],
    },
    actions: [
      { label: '查看项目详情', href: '/projects/3001' },
    ],
  };
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
  });
}

function createAdminAuthTokens() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required for data-screen phase2 auth setup');
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

async function installMockAuth(page: Page, tokens: { accessToken: string; refreshToken: string }) {
  await page.context().addInitScript(
    ({ token, nextRefreshToken }) => {
      window.localStorage.setItem('token', token);
      window.localStorage.setItem('refresh_token', nextRefreshToken);
    },
    { token: tokens.accessToken, nextRefreshToken: tokens.refreshToken }
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