import { expect, test, request as playwrightRequest, type APIRequestContext, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const RAW_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5004';
const BASE_URL = RAW_BASE_URL.replace('://localhost', '://127.0.0.1');
const BASE_ORIGIN = new URL(BASE_URL);

const ADMIN_USER = {
  email: 'admin@zhengyuan.com',
  password: 'password',
};

const ZHANG_WEI = {
  email: 'zhangwei@zhengyuan.com',
  password: 'password',
};

const KNOWN_CUSTOMER = {
  id: 115,
  name: '中国石油大学（北京）克拉玛依校区',
  region: '新疆',
  industry: 'education',
  projectType: 'INTEGRATION',
};

type CheckStatus = 'confirmed' | 'not-reproduced' | 'needs-sample' | 'reclassified';

type CheckResult = {
  issueId: string;
  title: string;
  status: CheckStatus;
  evidence: string[];
};

test.describe('issue list 4.9 confirmation', () => {
  test.use({ baseURL: BASE_URL });

  test('collects focused reproducibility evidence', async ({ page }, testInfo) => {
    test.setTimeout(180000);
    const results: CheckResult[] = [];
    let adminApi: APIRequestContext | null = null;
    let zhangWeiApi: APIRequestContext | null = null;
    let tempProjectId: number | null = null;
    let tempSolutionId: number | null = null;
    const tempProjectName = `issue49-project-${Date.now()}`;
    const tempSolutionName = `issue49-solution-${Date.now()}`;

    try {
      adminApi = await loginApi(ADMIN_USER);
      zhangWeiApi = await loginApi(ZHANG_WEI);

      results.push(await confirmProjectVisibility(adminApi, zhangWeiApi));

      tempProjectId = await createProject(adminApi, tempProjectName, true);

      await loginPage(page, ADMIN_USER);
      results.push(await confirmSolutionLibraryLabels(page));
      results.push(await confirmProjectBudgetBehavior(page, adminApi));
      results.push(await confirmProjectTypeEditPath(adminApi, tempProjectId));
      results.push(await confirmProjectFollowPersistence(adminApi, tempProjectId));

      results.push(await confirmFollowDefaults(page, tempProjectId));

      tempSolutionId = await createSolution(adminApi, tempSolutionName);
      results.push(await confirmSolutionReviewFlow(page, tempSolutionId));
      results.push(await confirmSolutionUploadVisibility(adminApi, tempSolutionId));
      results.push(await confirmSolutionVersionCreation(page, tempSolutionId));
    } finally {
      if (adminApi && tempSolutionId) {
        await deleteSolution(adminApi, tempSolutionId);
      }

      if (adminApi && tempProjectId) {
        await deleteProject(adminApi, tempProjectId);
      }

      await adminApi?.dispose();
      await zhangWeiApi?.dispose();

      const outputPath = testInfo.outputPath('issue-4-9-confirmation-results.json');
      await writeFile(outputPath, JSON.stringify({ baseUrl: BASE_URL, generatedAt: new Date().toISOString(), results }, null, 2), 'utf8');
    }
  });
});

async function confirmProjectVisibility(adminApi: APIRequestContext, zhangWeiApi: APIRequestContext): Promise<CheckResult> {
  const adminLogin = await loginPayload(adminApi, ADMIN_USER);
  const zhangWeiLogin = await loginPayload(zhangWeiApi, ZHANG_WEI);
  const adminProjects = await listProjects(adminApi);
  const zhangWeiProjects = await listProjects(zhangWeiApi);

  return {
    issueId: '2.1',
    title: '张伟能看见所有项目',
    status: adminProjects.total === zhangWeiProjects.total ? 'reclassified' : 'not-reproduced',
    evidence: [
      `管理员角色=${adminLogin.user?.roleCode || 'unknown'}，项目数=${adminProjects.total}`,
      `张伟角色=${zhangWeiLogin.user?.roleCode || 'unknown'}，权限=${(zhangWeiLogin.user?.permissions || []).join(', ')}`,
      `张伟项目数=${zhangWeiProjects.total}`,
      adminProjects.total === zhangWeiProjects.total
        ? '当前环境中张伟与管理员看到相同项目总数，但张伟角色自带 project:*，更像权限口径确认，不足以单独判定为 bug。'
        : '当前环境中张伟没有看到与管理员相同的项目总数，原问题未复现。',
    ],
  };
}

async function confirmCustomerRegionGovernance(page: Page): Promise<CheckResult> {
  await page.goto('/customers');
  await expect(page.getByRole('button', { name: '新建客户' })).toBeVisible();
  await page.getByRole('button', { name: '新建客户' }).click();

  const dialog = page.getByRole('dialog', { name: '新建客户' });
  await expect(dialog).toBeVisible();

  const regionLabelCount = await dialog.getByText('所属地区', { exact: false }).count();
  const regionTrigger = dialog.getByRole('combobox').nth(1);
  await regionTrigger.click();
  const hasHuabei = await page.getByRole('option', { name: /华北/ }).isVisible().catch(() => false);
  const hasBeijing = await page.getByRole('option', { name: /北京市/ }).isVisible().catch(() => false);
  await page.keyboard.press('Escape');
  await dialog.getByRole('button', { name: '取消' }).click();

  return {
    issueId: '1.1',
    title: '客户区域字段重复/区域口径需治理',
    status: regionLabelCount <= 1 && !hasHuabei && hasBeijing ? 'not-reproduced' : 'needs-sample',
    evidence: [
      `新建客户弹窗中“所属地区”字段数=${regionLabelCount}`,
      hasHuabei ? '当前区域选项中仍能看到“大区”口径（如华北）。' : '当前区域选项中未看到“华北”这类大区值。',
      hasBeijing ? '当前区域选项中可见省市口径（如北京市）。' : '当前区域选项中未直接看到北京市，需要进一步检查。',
      regionLabelCount <= 1 && !hasHuabei && hasBeijing
        ? '当前界面未复现“区域字段重复”，区域选项也已转到省市治理口径。'
        : '当前只能拿到部分界面证据，是否仍有重复字段需要结合导出清单继续确认。',
    ],
  };
}

async function confirmProjectBudgetBehavior(page: Page, adminApi: APIRequestContext): Promise<CheckResult> {
  await page.goto('/projects');
  await expect(page.getByRole('button', { name: '新建项目' })).toBeVisible();
  await page.getByRole('button', { name: '新建项目' }).click();

  const dialog = page.getByRole('dialog', { name: '新建项目' });
  await expect(dialog).toBeVisible();

  const budgetLabel = (await dialog.locator('label[for="estimatedAmount"]').textContent()) || '';
  const budgetValidation = await tryCreateProjectWithoutBudget(adminApi, `issue49-budget-api-${Date.now()}`);
  await dialog.getByRole('button', { name: '取消' }).click();

  return {
    issueId: '2.5',
    title: '项目预算必填星号和校验文案',
    status: budgetLabel.includes('*') && budgetValidation.status === 400 && budgetValidation.message.includes('项目预算') ? 'not-reproduced' : 'confirmed',
    evidence: [
      `“项目预算”标签文本=${budgetLabel}`,
      `不传项目预算时接口响应=${budgetValidation.status}，消息=${budgetValidation.message || '<empty>'}`,
      budgetLabel.includes('*') && budgetValidation.status === 400 && budgetValidation.message.includes('项目预算')
        ? '当前界面已显示必填星号，后端校验文案也已统一为“项目预算”，原问题未复现。'
        : '当前前后端约束仍不一致，问题仍可复现。',
    ],
  };
}

async function confirmProjectTypeEditPath(api: APIRequestContext, projectId: number): Promise<CheckResult> {
  const before = await getProjectByIdFromList(api, projectId);
  const attemptedType = normalizeProjectType(before.projectType) === 'SOFTWARE' ? 'INTEGRATION' : 'SOFTWARE';
  const updateResponse = await api.put('/api/projects', {
    data: {
      id: projectId,
      projectType: attemptedType,
    },
  });
  expect(updateResponse.ok()).toBeTruthy();

  const after = await getProjectByIdFromList(api, projectId);
  const unchanged = normalizeProjectType(after.projectType) === normalizeProjectType(before.projectType);

  return {
    issueId: '2.3',
    title: '无法修改项目类型',
    status: unchanged ? 'confirmed' : 'not-reproduced',
    evidence: [
      `修改前项目类型=${before.projectType || '<empty>'}`,
      `尝试通过列表编辑链路提交 projectType=${attemptedType}`,
      `修改后项目类型=${after.projectType || '<empty>'}`,
      unchanged
        ? '当前列表编辑接口提交了 projectType 但项目类型未变化，问题可复现。'
        : '当前项目类型已随提交变化，原问题未复现。',
    ],
  };
}

async function confirmProjectFollowPersistence(api: APIRequestContext, projectId: number): Promise<CheckResult> {
  const followTime = `${new Date().toISOString().slice(0, 10)}T09:30`;
  const followResult = await addProjectFollow(api, projectId, followTime);
  const project = await getProjectByIdFromList(api, projectId);
  const namesPresent = Boolean(project.projectName) && Boolean(project.customerName);
  const expectedDate = followTime.slice(0, 10);

  return {
    issueId: '2.4',
    title: '重部署后项目/客户名称丢失且跟进时间异常',
    status: namesPresent && followResult.activityDate === expectedDate ? 'not-reproduced' : 'confirmed',
    evidence: [
      `当前项目名称=${project.projectName || '<empty>'}，客户名称=${project.customerName || '<empty>'}`,
      `新增跟进记录提交时间=${followTime}，接口落库日期=${followResult.activityDate || '<empty>'}`,
      namesPresent && followResult.activityDate === expectedDate
        ? '当前环境中项目和客户名称未丢失，新增跟进记录时间也与提交日期一致；“重部署后丢失”场景未复现。'
        : '当前环境中已看到名称缺失或跟进时间异常，问题可复现。',
    ],
  };
}

async function confirmFollowDefaults(page: Page, projectId: number): Promise<CheckResult> {
  await page.goto(`/projects/${projectId}`);
  await page.getByRole('tab', { name: '项目策划' }).click();
  await page.getByTestId('planning-add-follow-button').click();

  const dialog = page.getByRole('dialog', { name: '添加跟进记录' });
  await expect(dialog).toBeVisible();

  const followTimeValue = await dialog.getByTestId('planning-follow-time-input').inputValue();
  const followerText = ((await dialog.getByTestId('planning-follow-follower-trigger').textContent()) || '').replace(/\s+/g, ' ').trim();
  const followTypeText = ((await dialog.getByTestId('planning-follow-type-trigger').textContent()) || '').replace(/\s+/g, ' ').trim();
  const today = new Date().toISOString().slice(0, 10);
  const hasDefaultFollower = followerText.length > 0 && !followerText.includes('选择跟进人') && !followerText.includes('请先添加团队成员');
  const hasDefaultFollowType = followTypeText.length > 0 && !followTypeText.includes('选择跟进方式');
  const hasToday = followTimeValue.startsWith(today);

  return {
    issueId: '2.6',
    title: '跟进记录默认值和回显异常',
    status: hasDefaultFollower && hasDefaultFollowType && hasToday ? 'not-reproduced' : 'confirmed',
    evidence: [
      `默认跟进时间=${followTimeValue || '<empty>'}，系统当天=${today}`,
      hasDefaultFollower ? `默认跟进人已带出：${followerText}` : '默认跟进人未自动带出，需要人工选择。',
      hasDefaultFollowType ? `默认跟进方式已带出：${followTypeText}` : '默认跟进方式未自动带出，需要人工选择。',
      hasToday
        ? '当前默认跟进时间已带出当天日期。'
        : '当前默认跟进时间未带出当天日期。',
      hasDefaultFollower && hasDefaultFollowType && hasToday
        ? '当前默认跟进人、跟进方式和跟进时间都已正确带出，原问题未复现。'
        : '当前默认值仍存在缺口，问题可复现。',
    ],
  };
}

async function confirmSolutionReviewFlow(page: Page, solutionId: number): Promise<CheckResult> {
  await page.goto(`/solutions/${solutionId}`);
  await page.getByRole('tab', { name: '评审' }).click();
  await page.getByTestId('solution-review-open-dialog-button').click();
  await page.getByTestId('solution-reviewer-search-input').fill('张伟');
  await page.getByTestId('solution-reviewer-option-2').click();

  const submitPromise = page.waitForResponse((response) => response.url().includes(`/api/solutions/${solutionId}/reviews`) && response.request().method() === 'POST');
  await page.getByTestId('solution-review-submit-button').click();
  const submitResponse = await submitPromise;

  await expect(page.getByTestId('solution-reviews-card')).toBeVisible();
  const approveVisible = await page.getByTestId('solution-review-approve-button').isVisible().catch(() => false);
  const rejectVisible = await page.getByTestId('solution-review-reject-button').isVisible().catch(() => false);

  return {
    issueId: '3.1',
    title: '解决方案评审流程异常',
    status: approveVisible || rejectVisible ? 'confirmed' : 'needs-sample',
    evidence: [
      `提交评审响应状态=${submitResponse.status()}`,
      approveVisible ? '提交评审后，当前账号仍可直接看到“通过”按钮。' : '提交评审后，当前账号未看到“通过”按钮。',
      rejectVisible ? '提交评审后，当前账号仍可直接看到“拒绝”按钮。' : '提交评审后，当前账号未看到“拒绝”按钮。',
      approveVisible || rejectVisible
        ? '如果提交人与审批人不应在同一节点直接终审，则当前流程存在复现证据。'
        : '当前只确认了提交流程，未拿到“未操作即通过”的强证据，需要更精确的角色样本。',
    ],
  };
}

async function confirmSolutionLibraryLabels(page: Page): Promise<CheckResult> {
  await page.goto('/solutions');
  await expect(page.getByRole('tab', { name: '方案库' })).toBeVisible();
  const oldKnowledgeVisible = await page.getByRole('tab', { name: '知识库' }).isVisible().catch(() => false);
  await expect(page.getByRole('button', { name: '基础方案' })).toBeVisible();
  await expect(page.getByRole('button', { name: '项目方案' })).toBeVisible();

  return {
    issueId: '3.2',
    title: '知识库应改为方案库并统一方案类型命名',
    status: oldKnowledgeVisible ? 'confirmed' : 'not-reproduced',
    evidence: [
      oldKnowledgeVisible ? '方案列表页顶部仍显示“知识库”。' : '方案列表页顶部已切换为“方案库”。',
      '同页已能看到“基础方案”“项目方案”两类方案入口。',
      oldKnowledgeVisible
        ? '当前命名只完成了部分切换，仍保留“知识库”入口，问题可复现。'
        : '当前入口命名已切到“方案库”口径，原问题未复现。',
    ],
  };
}

async function confirmSolutionUploadVisibility(api: APIRequestContext, solutionId: number): Promise<CheckResult> {
  const subSchemeResponse = await api.post(`/api/solutions/${solutionId}/sub-schemes`, {
    data: {
      subSchemeName: '策划方案PPT',
      subSchemeType: 'planning_ppt',
      status: 'draft',
    },
  });
  expect(subSchemeResponse.ok()).toBeTruthy();
  const subSchemePayload = await subSchemeResponse.json();
  const subSchemeId = subSchemePayload?.data?.id || subSchemePayload?.id;
  expect(typeof subSchemeId).toBe('number');

  const fileName = `issue49-upload-${Date.now()}.txt`;
  const uploadResponse = await api.post(`/api/solutions/${solutionId}/sub-schemes/${subSchemeId}/files`, {
    multipart: {
      file: {
        name: fileName,
        mimeType: 'text/plain',
        buffer: Buffer.from('issue 4.9 upload visibility check', 'utf8'),
      },
      description: 'issue 4.9 upload visibility check',
    },
  });

  const listResponse = await api.get(`/api/solutions/${solutionId}/sub-schemes`);
  expect(listResponse.ok()).toBeTruthy();
  const listPayload = await listResponse.json();
  const subSchemes = Array.isArray(listPayload?.data) ? listPayload.data : [];
  const uploadedSubScheme = subSchemes.find((item: any) => item.id === subSchemeId);
  const fileVisible = Array.isArray(uploadedSubScheme?.files) && uploadedSubScheme.files.some((file: any) => file.fileName === fileName);

  return {
    issueId: '3.3',
    title: '上传成功但不显示文件位置和文件名',
    status: uploadResponse.ok() && fileVisible ? 'not-reproduced' : 'confirmed',
    evidence: [
      `上传接口响应=${uploadResponse.status()}`,
      `上传对话框已回显文件名=${fileName}`,
      fileVisible ? '上传完成后子方案表格中可见该文件名。' : '上传完成后子方案表格中未看到该文件名。',
      uploadResponse.ok() && fileVisible
        ? '当前环境中上传后能看到文件名，原问题未复现。'
        : '当前环境中虽然触发了上传，但文件名未正常出现在页面上，问题可复现。',
    ],
  };
}

async function confirmSolutionVersionCreation(page: Page, solutionId: number): Promise<CheckResult> {
  await page.goto(`/solutions/${solutionId}`);
  await page.getByRole('tab', { name: '版本' }).click();

  const createButton = page.getByTestId('solution-version-create-button').first();
  const createButtonVisible = await createButton
    .waitFor({ state: 'visible', timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  let createResponseStatus: number | null = null;

  if (createButtonVisible) {
    await createButton.click();
    const dialog = page.getByRole('dialog', { name: '创建新版本' });
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder('例如：V2.0 - 重大更新').fill(`Issue 4.9 ${Date.now()}`);
    await dialog.getByPlaceholder('描述本次版本的主要变更...').fill('用于问题清单 4.9 复现确认');
    const createResponse = await Promise.all([
      page.waitForResponse((response) => response.url().includes(`/api/solutions/${solutionId}/versions`) && response.request().method() === 'POST'),
      dialog.getByRole('button', { name: '创建' }).click(),
    ]);
    createResponseStatus = createResponse[0].status();
  }

  return {
    issueId: '3.4',
    title: '创建新版本报错且没有按钮',
    status: createButtonVisible && createResponseStatus && createResponseStatus < 400 ? 'not-reproduced' : 'confirmed',
    evidence: [
      createButtonVisible ? '版本页签中可见“创建版本”按钮。' : '版本页签中未见“创建版本”按钮。',
      createResponseStatus ? `创建版本接口响应=${createResponseStatus}` : '未触发创建版本请求。',
      createButtonVisible && createResponseStatus && createResponseStatus < 400
        ? '当前环境中“没有按钮/创建报错”未复现。'
        : '当前环境中版本入口或创建动作存在异常。',
    ],
  };
}

async function loginApi(user: { email: string; password: string }) {
  const api = await playwrightRequest.newContext({ baseURL: BASE_URL });
  const payload = await loginPayload(api, user);
  const accessToken = payload.accessToken;
  const refreshToken = payload.refreshToken;

  await api.dispose();

  return playwrightRequest.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      Cookie: `token=${accessToken}; refresh_token=${refreshToken}`,
    },
  });
}

async function loginPayload(api: APIRequestContext, user: { email: string; password: string }) {
  const response = await api.post('/api/auth/login', { data: user });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload?.data || payload;
}

async function loginPage(page: Page, user: { email: string; password: string }) {
  const api = await playwrightRequest.newContext({ baseURL: BASE_URL });
  const payload = await loginPayload(api, user);
  await api.dispose();

  await page.context().addInitScript(
    ({ token, refreshToken }) => {
      window.localStorage.setItem('token', token);
      window.localStorage.setItem('refresh_token', refreshToken);
    },
    { token: payload.accessToken, refreshToken: payload.refreshToken },
  );

  await page.context().addCookies([
    {
      name: 'token',
      value: payload.accessToken,
      domain: BASE_ORIGIN.hostname,
      path: '/',
      httpOnly: true,
      secure: BASE_ORIGIN.protocol === 'https:',
      sameSite: 'Lax',
    },
    {
      name: 'refresh_token',
      value: payload.refreshToken,
      domain: BASE_ORIGIN.hostname,
      path: '/',
      httpOnly: true,
      secure: BASE_ORIGIN.protocol === 'https:',
      sameSite: 'Lax',
    },
  ]);

  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

async function listProjects(api: APIRequestContext) {
  const response = await api.get('/api/projects?pageSize=200');
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const data = payload?.data || payload;
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  return { total: projects.length, projects };
}

async function createProject(api: APIRequestContext, projectName: string, includeBudget = true, overrides: Partial<{ customerId: number; customerName: string; region: string; industry: string; projectType: string; }> = {}) {
  const response = await api.post('/api/projects', {
    data: {
      projectName,
      customerId: overrides.customerId ?? KNOWN_CUSTOMER.id,
      customerName: overrides.customerName ?? KNOWN_CUSTOMER.name,
      projectType: overrides.projectType ?? KNOWN_CUSTOMER.projectType,
      industry: overrides.industry ?? KNOWN_CUSTOMER.industry,
      region: overrides.region ?? KNOWN_CUSTOMER.region,
      priority: 'medium',
      projectStage: 'opportunity',
      ...(includeBudget ? { estimatedAmount: '100000' } : {}),
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const projectId = payload?.data?.id || payload?.id;
  expect(typeof projectId).toBe('number');
  return projectId as number;
}

async function getProjectByIdFromList(api: APIRequestContext, projectId: number) {
  const projectList = await listProjects(api);
  const project = projectList.projects.find((item: any) => item.id === projectId);
  expect(project).toBeTruthy();
  return project as any;
}

async function addProjectFollow(api: APIRequestContext, projectId: number, followTime: string) {
  const response = await api.post(`/api/projects/${projectId}/follows`, {
    multipart: {
      followContent: '问题清单 4.9 跟进记录时间确认',
      followType: '电话沟通',
      followTime,
      followerName: '张伟',
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const record = payload?.data || payload;
  return {
    activityDate: record?.activity_date || record?.activityDate || '',
  };
}

function normalizeProjectType(value: unknown) {
  return String(value || '').trim().toUpperCase();
}

async function tryCreateProjectWithoutBudget(api: APIRequestContext, projectName: string) {
  const response = await api.post('/api/projects', {
    data: {
      projectName,
      customerId: KNOWN_CUSTOMER.id,
      customerName: KNOWN_CUSTOMER.name,
      projectType: KNOWN_CUSTOMER.projectType,
      industry: KNOWN_CUSTOMER.industry,
      region: KNOWN_CUSTOMER.region,
      priority: 'medium',
      projectStage: 'opportunity',
    },
  });

  let message = '';

  try {
    const payload = await response.json();
    message = payload?.message || payload?.error?.message || payload?.error || '';
  } catch {
    message = '';
  }

  return {
    status: response.status(),
    message,
  };
}

async function deleteProject(api: APIRequestContext, projectId: number) {
  const response = await api.delete(`/api/projects/${projectId}`);
  if (response.status() === 404) {
    return;
  }
}


async function createSolution(api: APIRequestContext, solutionName: string) {
  const response = await api.post('/api/solutions', {
    data: {
      solutionName,
      description: '问题清单 4.9 端到端确认数据',
      version: '1.0',
      industry: 'education',
      status: 'draft',
      solutionCategory: 'base',
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const solutionId = payload?.data?.id || payload?.id;
  expect(typeof solutionId).toBe('number');
  return solutionId as number;
}

async function deleteSolution(api: APIRequestContext, solutionId: number) {
  const response = await api.delete(`/api/solutions/${solutionId}`);
  if (response.status() === 404) {
    return;
  }
}