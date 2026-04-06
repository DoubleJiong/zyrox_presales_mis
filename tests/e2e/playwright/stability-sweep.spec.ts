import { test, expect, request as playwrightRequest, type APIRequestContext, type Page } from '@playwright/test';

const ADMIN_USER = {
  email: 'admin@zhengyuan.com',
  password: 'password',
};

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

const KNOWN_CUSTOMER = {
  id: 115,
  name: '中国石油大学（北京）克拉玛依校区',
  region: '新疆',
  industry: 'education',
  projectType: 'INTEGRATION',
};

const KNOWN_SOLUTION_NAME = '中国石油大学克拉玛依校区思政 项目方案';

test.describe('stability sweep', () => {
  test.describe.configure({ mode: 'serial' });

  test('creates a user from users management page', async ({ page }) => {
    const username = `stability_user_${Date.now()}`;
    const email = `${username}@zhengyuan.com`;
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      await page.goto('/settings/users');
      await expect(page.getByRole('heading', { name: '用户配置' })).toBeVisible();

      await page.getByRole('button', { name: '新增用户' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.getByPlaceholder('例如：zhang_san').fill(username);
      await page.getByPlaceholder('例如：张三').fill('稳定性扫雷用户');
      await page.getByPlaceholder('例如：zhang@example.com').fill(email);
      await page.getByPlaceholder('例如：13800138000').fill('13800138000');
      await page.locator('input[type="password"]').fill('password');

      await page.getByRole('tab', { name: '角色分配' }).click();
      const roleCheckbox = page.getByRole('tabpanel').getByRole('checkbox').first();
      await expect(roleCheckbox).toBeVisible();
      await roleCheckbox.click();

      if (await page.getByText('Base所在地 *').isVisible()) {
        await page.getByRole('button', { name: '请选择Base所在地' }).click();
        await page.getByRole('option').first().click();
      }

      await page.getByRole('button', { name: '创建' }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('row', { name: new RegExp(username) })).toBeVisible({ timeout: 10_000 });
    } finally {
      if (apiContext) {
        await deleteUserByUsername(apiContext, username);
        await apiContext.dispose();
      }
    }
  });

  test('creates a project from projects page', async ({ page }) => {
    const projectName = `稳定性扫雷项目-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      await page.goto('/projects');
      await expect(page.getByRole('button', { name: '新建项目' })).toBeVisible();

      await page.getByRole('button', { name: '新建项目' }).click();
      const dialog = page.getByRole('dialog', { name: '新建项目' });
      await expect(dialog).toBeVisible();

      await page.locator('#projectName').fill(projectName);

      await dialog.locator('[role="combobox"]').first().click();
      await page.getByPlaceholder('搜索客户名称...').fill(KNOWN_CUSTOMER.name);
      const customerOption = page.locator('[cmdk-item]').filter({ hasText: KNOWN_CUSTOMER.name }).first();
      await expect(customerOption).toBeVisible();
      await customerOption.click();

      const emptyProjectTypeButton = dialog.locator('[role="combobox"]').nth(1);
      const projectTypeText = await emptyProjectTypeButton.textContent();
      if (projectTypeText?.includes('搜索并选择项目类型')) {
        await emptyProjectTypeButton.click();
        await page.getByPlaceholder('搜索项目类型...').fill('集成');
        const integrationOption = page.locator('[cmdk-item]').filter({ hasText: /^集成$/ }).first();
        await expect(integrationOption).toBeVisible();
        await integrationOption.click();
      }

      await page.locator('#estimatedAmount').fill('120000');
      await page.getByRole('button', { name: '保存' }).click();

      await expect(page.getByRole('dialog', { name: '新建项目' })).not.toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(projectName, { exact: true })).toBeVisible({ timeout: 10_000 });
    } finally {
      if (apiContext) {
        await deleteProjectByName(apiContext, projectName);
        await apiContext.dispose();
      }
    }
  });

  test('associates a solution from project planning tab', async ({ page }) => {
    const projectName = `稳定性关联项目-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      projectId = await createProjectForAssociation(apiContext, projectName);

      await page.goto(`/projects/${projectId}`);
      await expect(page.getByText(projectName, { exact: true })).toBeVisible({ timeout: 10_000 });

      await page.getByRole('tab', { name: '项目策划' }).click();
      await expect(page.getByRole('button', { name: '关联方案' })).toBeVisible();
      await page.getByRole('button', { name: '关联方案' }).click();

      const dialog = page.getByRole('dialog', { name: '从方案库选择方案' });
      await expect(dialog).toBeVisible();

      await dialog.getByTestId('solution-selector-search-input').fill(KNOWN_SOLUTION_NAME);
      await Promise.all([
        page.waitForResponse((response) => response.url().includes('/api/solutions?') && response.request().method() === 'GET'),
        dialog.getByTestId('solution-selector-search-button').click(),
      ]);
      await expect(dialog.getByText(/全部方案（共 1 个）/)).toBeVisible({ timeout: 10_000 });
      await dialog.locator('[data-testid="solution-card"]').filter({ hasText: /中国石油大学克拉玛依校区思政/ }).first().click();
      await dialog.getByRole('button', { name: '确定关联' }).click();

      await expect(page.getByText(/中国石油大学克拉玛依校区思政/)).toBeVisible({ timeout: 10_000 });
    } finally {
      if (apiContext) {
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('edits and deletes a user from users management page', async ({ page }) => {
    const username = `stability_edit_user_${Date.now()}`;
    const email = `${username}@zhengyuan.com`;
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      await createUser(apiContext, {
        username,
        email,
        name: '稳定性待编辑用户',
        phone: '13800138001',
      });

      await page.goto('/settings/users');
      const userRow = page.getByRole('row').filter({ hasText: username });
      await expect(userRow).toBeVisible({ timeout: 10_000 });

      await userRow.getByTestId('user-edit-button').click();
      await expect(page.getByRole('dialog', { name: '编辑用户' })).toBeVisible();
      await page.getByPlaceholder('例如：张三').fill('稳定性已编辑用户');
      await page.getByPlaceholder('例如：13800138000').fill('13800138123');
      await page.getByRole('button', { name: '更新' }).click();

      await expect(page.getByRole('dialog', { name: '编辑用户' })).not.toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('row').filter({ hasText: '稳定性已编辑用户' })).toBeVisible({ timeout: 10_000 });

      page.once('dialog', (dialog) => dialog.accept());
      await userRow.getByTestId('user-delete-button').click();
      await expect(page.getByRole('row').filter({ hasText: username })).not.toBeVisible({ timeout: 10_000 });
    } finally {
      if (apiContext) {
        await deleteUserByUsername(apiContext, username);
        await apiContext.dispose();
      }
    }
  });

  test('edits and deletes a project from projects page', async ({ page }) => {
    const projectName = `稳定性编辑项目-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      await createProjectForAssociation(apiContext, projectName);

      await page.goto('/projects');
      await page.getByPlaceholder('搜索项目名称、客户名称或编号...').fill(projectName);

      const projectItem = page.locator('[data-testid="project-list-item"]').filter({ hasText: projectName }).first();
      await expect(projectItem).toBeVisible({ timeout: 10_000 });

      await projectItem.getByTestId('project-edit-button').click();
      const dialog = page.getByRole('dialog', { name: '编辑项目' });
      await expect(dialog).toBeVisible();
      await page.locator('#projectName').fill(`${projectName}-已更新`);
      await page.locator('#estimatedAmount').fill('230000');
      await page.getByRole('button', { name: '保存' }).click();

      await expect(dialog).not.toBeVisible({ timeout: 10_000 });
      await expect(page.locator('[data-testid="project-list-item"]').filter({ hasText: `${projectName}-已更新` }).first()).toBeVisible({ timeout: 10_000 });

      const updatedItem = page.locator('[data-testid="project-list-item"]').filter({ hasText: `${projectName}-已更新` }).first();
      page.once('dialog', (dialogEvent) => dialogEvent.accept());
      await updatedItem.getByTestId('project-delete-button').click();
      await expect(page.locator('[data-testid="project-list-item"]').filter({ hasText: `${projectName}-已更新` })).toHaveCount(0, { timeout: 10_000 });
    } finally {
      if (apiContext) {
        await deleteProjectByName(apiContext, projectName);
        await deleteProjectByName(apiContext, `${projectName}-已更新`);
        await apiContext.dispose();
      }
    }
  });

  test('cancels a linked solution from project planning tab', async ({ page }) => {
    const projectName = `稳定性取消关联项目-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      projectId = await createProjectForAssociation(apiContext, projectName);

      await associateSolution(apiContext, projectId, 1);

      await page.goto(`/projects/${projectId}`);
      await page.getByRole('tab', { name: '项目策划' }).click();

      const solutionCard = page.locator('[data-testid="project-associated-solution-card"]').filter({ hasText: /中国石油大学克拉玛依校区思政/ }).first();
      await expect(solutionCard).toBeVisible({ timeout: 10_000 });
      await solutionCard.hover();
      await solutionCard.getByTestId('project-solution-actions-button').click();
      await page.getByRole('menuitem', { name: '取消关联' }).click();
      await page.getByRole('button', { name: '确认取消' }).click();

      await expect(page.locator('[data-testid="project-associated-solution-card"]').filter({ hasText: /中国石油大学克拉玛依校区思政/ })).toHaveCount(0, { timeout: 10_000 });
    } finally {
      if (apiContext) {
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('changes a user role from users management page', async ({ page }) => {
    const username = `stability_role_user_${Date.now()}`;
    const email = `${username}@zhengyuan.com`;
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      const roles = await listRoles(apiContext);
      const targetRole = roles.find((role) => role.id !== 1);
      test.skip(!targetRole, 'No secondary role available for role change verification.');

      await createUser(apiContext, {
        username,
        email,
        name: '稳定性角色变更用户',
        phone: '13800138002',
        roleIds: [1],
      });

      await page.goto('/settings/users');
      const userRow = page.getByRole('row').filter({ hasText: username });
      await expect(userRow).toBeVisible({ timeout: 10_000 });

      await userRow.getByTestId('user-edit-button').click();
      const dialog = page.getByRole('dialog', { name: '编辑用户' });
      await expect(dialog).toBeVisible();

      await dialog.getByRole('tab', { name: '角色分配' }).click();
      const targetRoleToggle = dialog.getByTestId(`user-role-toggle-${targetRole!.id}`);
      await expect(targetRoleToggle).toBeVisible();
      await targetRoleToggle.click();

      if (await dialog.getByText('Base所在地 *').isVisible()) {
        await dialog.getByRole('button', { name: '请选择Base所在地' }).click();
        await page.getByRole('option').first().click();
      }

      await dialog.getByRole('button', { name: '更新' }).click();
      await expect(dialog).not.toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('row').filter({ hasText: username }).getByText(targetRole!.name)).toBeVisible({ timeout: 10_000 });
    } finally {
      if (apiContext) {
        await deleteUserByUsername(apiContext, username);
        await apiContext.dispose();
      }
    }
  });

  test('shows staff archive and routes account changes to users settings', async ({ page }) => {
    const username = `stability_staff_${Date.now()}`;
    const email = `${username}@zhengyuan.com`;
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      const userId = await createUser(apiContext, {
        username,
        email,
        name: '稳定性人员用户',
        phone: '13800138111',
      });

      await page.goto('/staff');
      await expect(page.getByTestId('staff-page')).toBeVisible();

      await page.getByTestId('staff-search-input').fill(username);
      const createdRow = page.getByRole('row').filter({ hasText: username });
      await expect(createdRow).toBeVisible({ timeout: 10_000 });

      await page.getByTestId(`staff-view-button-${userId}`).click();
      await expect(page.getByText('账号变更入口已收敛到“系统设置 / 用户配置”')).toBeVisible();
      await page.getByRole('link', { name: '查看完整档案' }).click();
      await expect(page).toHaveURL(new RegExp(`/staff/${userId}$`));

      await page.goto('/staff');
      await page.getByTestId('staff-account-entry-link').click();
      await expect(page).toHaveURL(/\/settings\/users$/);
    } finally {
      if (apiContext) {
        await deleteUserByUsername(apiContext, username);
        await apiContext.dispose();
      }
    }
  });

  test('manages data permissions from settings page', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      const roles = await listRoles(apiContext);
      const targetRole = roles.find((role) => role.code !== 'admin');
      test.skip(!targetRole, 'No non-admin role available for data-permission verification.');

      await deleteDataPermission(apiContext, targetRole!.id, 'alert');

      await page.goto('/settings/data-permissions');
      await expect(page.getByTestId('data-permissions-card')).toBeVisible();

      await page.getByTestId('data-permissions-add-button').click();
      const dialog = page.getByRole('dialog', { name: '添加数据权限' });
      await expect(dialog).toBeVisible();

      await dialog.getByTestId('data-permissions-role-trigger').click({ force: true });
      await page.getByRole('option', { name: targetRole!.name, exact: true }).click();
      await dialog.getByTestId('data-permissions-resource-trigger').click({ force: true });
      await page.getByRole('option', { name: '预警管理', exact: true }).click();
      await dialog.getByTestId('data-permissions-scope-trigger').click({ force: true });
      await page.getByRole('option', { name: /仅自己/ }).click();
      await dialog.getByTestId('data-permissions-save-button').click();

      await expect(dialog).not.toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('row').filter({ hasText: targetRole!.name }).filter({ hasText: '预警管理' }).filter({ hasText: '仅自己' })).toBeVisible({ timeout: 10_000 });

      const createdPermission = await findDataPermission(apiContext, targetRole!.id, 'alert');
      expect(createdPermission).not.toBeNull();

      await page.getByTestId(`data-permissions-edit-${createdPermission!.id}`).click();
      const editDialog = page.getByRole('dialog', { name: '编辑数据权限' });
      await expect(editDialog).toBeVisible();
      await editDialog.getByTestId('data-permissions-scope-trigger').click({ force: true });
      await page.getByRole('option', { name: /全部数据/ }).click();
      await editDialog.getByTestId('data-permissions-save-button').click();
      await expect(editDialog).not.toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('row').filter({ hasText: targetRole!.name }).filter({ hasText: '预警管理' }).filter({ hasText: '全部数据' })).toBeVisible({ timeout: 10_000 });

      page.once('dialog', (dialogEvent) => dialogEvent.accept());
      await page.getByTestId(`data-permissions-delete-${createdPermission!.id}`).click();
      await expect(page.getByTestId(`data-permissions-row-${createdPermission!.id}`)).toHaveCount(0, { timeout: 10_000 });
    } finally {
      if (apiContext) {
        if (typeof targetRole !== 'undefined' && targetRole) {
          await deleteDataPermission(apiContext, targetRole.id, 'alert');
        }
        await apiContext.dispose();
      }
    }
  });

  test('manages roles from settings page', async ({ page }) => {
    const roleCode = `stability_role_${Date.now()}`;
    const roleName = `稳定性角色${Date.now()}`;
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      await deleteRoleByCode(apiContext, roleCode);

      await page.goto('/settings/roles');
      await expect(page.getByTestId('roles-page')).toBeVisible();

      await page.getByTestId('roles-add-button').click();
      const createDialog = page.getByRole('dialog', { name: '新增角色' });
      await expect(createDialog).toBeVisible();

      await createDialog.getByTestId('roles-role-name-input').fill(roleName);
      await createDialog.getByTestId('roles-role-code-input').fill(roleCode);
      await createDialog.getByTestId('roles-description-input').fill('稳定性角色权限配置');
      await createDialog.getByTestId('roles-permissions-tab').click();
      await createDialog.getByTestId('roles-permission-checkbox-alert:read').click({ force: true });
      await createDialog.getByTestId('roles-save-button').click();

      await expect(createDialog).not.toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('row').filter({ hasText: roleName }).filter({ hasText: roleCode })).toBeVisible({ timeout: 10_000 });

      const createdRole = await findRoleByCode(apiContext, roleCode);
      expect(createdRole).not.toBeNull();

      await page.getByTestId(`roles-edit-button-${createdRole!.id}`).click();
      const editDialog = page.getByRole('dialog', { name: '编辑角色' });
      await expect(editDialog).toBeVisible();
      await editDialog.getByTestId('roles-role-name-input').fill(`${roleName}-已编辑`);
      await editDialog.getByTestId('roles-description-input').fill('稳定性角色权限配置-已编辑');
      await editDialog.getByTestId('roles-permissions-tab').click();
      await editDialog.getByTestId('roles-permission-checkbox-project:read').click({ force: true });
      await editDialog.getByTestId('roles-save-button').click();

      await expect(editDialog).not.toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('row').filter({ hasText: `${roleName}-已编辑` }).filter({ hasText: roleCode })).toBeVisible({ timeout: 10_000 });

      page.once('dialog', (dialogEvent) => dialogEvent.accept());
      await page.getByTestId(`roles-delete-button-${createdRole!.id}`).click();
      await expect(page.getByTestId(`roles-row-${createdRole!.id}`)).toHaveCount(0, { timeout: 10_000 });
    } finally {
      if (apiContext) {
        await deleteRoleByCode(apiContext, roleCode);
        await apiContext.dispose();
      }
    }
  });

  test('shows live operation logs on system logs page', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      const logs = await listOperationLogs(apiContext);

      await page.goto('/settings/system-logs');
      await expect(page.getByTestId('system-logs-card')).toBeVisible();

      if (logs.length === 0) {
        await expect(page.getByTestId('system-logs-empty-state')).toBeVisible();
        return;
      }

      const targetLog = logs[0];
      await expect(page.getByTestId(`system-logs-row-${targetLog.id}`)).toBeVisible({ timeout: 10_000 });

      if (targetLog.action) {
        await page.getByTestId('system-logs-search-input').fill(targetLog.action);
        await expect(page.getByTestId(`system-logs-row-${targetLog.id}`)).toBeVisible({ timeout: 10_000 });
      }

      await page.getByTestId('system-logs-refresh-button').click();
      await expect(page.getByTestId('system-logs-card')).toBeVisible();
    } finally {
      if (apiContext) {
        await apiContext.dispose();
      }
    }
  });

  test('shows data maintenance boundary on settings page', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/settings/data-backup');
    await expect(page.getByTestId('data-maintenance-page')).toBeVisible();
    await expect(page.getByTestId('data-maintenance-boundary-alert')).toContainText('当前不是“数据备份”能力');
    await expect(page.getByTestId('data-maintenance-stats-card')).toBeVisible();

    await page.getByTestId('data-maintenance-open-reset-dialog').click();
    const dialog = page.getByTestId('data-maintenance-reset-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('data-maintenance-confirm-reset')).toBeDisabled();
    await dialog.getByTestId('data-maintenance-confirm-input').fill('恢复出厂设置x');
    await expect(dialog.getByTestId('data-maintenance-confirm-reset')).toBeDisabled();
    await dialog.getByTestId('data-maintenance-cancel-reset').click();
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
  });

  test('edits project info from project detail page', async ({ page }) => {
    const projectName = `稳定性详情编辑项目-${Date.now()}`;
    const updatedRisk = `稳定性详情风险说明-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      projectId = await createProjectForAssociation(apiContext, projectName);

      await page.goto(`/projects/${projectId}`);
      await expect(page.getByText(projectName, { exact: true })).toBeVisible({ timeout: 10_000 });

      await page.getByRole('tab', { name: '项目信息' }).click();
      await page.getByTestId('project-info-edit-button').click();
      await page.getByTestId('project-info-estimated-amount-input').fill('345678');
      await page.getByTestId('project-info-expected-bidding-date-input').fill('2026-04-30');
      await page.getByTestId('project-info-estimated-duration-input').fill('7');
      await page.getByTestId('project-info-urgency-level-trigger').click();
      await page.getByRole('option', { name: '紧急', exact: true }).last().click();
      await page.getByTestId('project-info-risks-textarea').fill(updatedRisk);
      await page.getByTestId('project-info-save-button').click();

      await expect(page.getByText(updatedRisk)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('¥345,678')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('2026-04-30')).toBeVisible({ timeout: 10_000 });
    } finally {
      if (apiContext) {
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('re-associates a solution after cancellation from project planning tab', async ({ page }) => {
    const projectName = `稳定性重新关联项目-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      projectId = await createProjectForAssociation(apiContext, projectName);

      await associateSolution(apiContext, projectId, 1);

      await page.goto(`/projects/${projectId}`);
      await page.getByRole('tab', { name: '项目策划' }).click();

      const solutionCard = page.locator('[data-testid="project-associated-solution-card"]').filter({ hasText: /中国石油大学克拉玛依校区思政/ }).first();
      await expect(solutionCard).toBeVisible({ timeout: 10_000 });
      await solutionCard.hover();
      await solutionCard.getByTestId('project-solution-actions-button').click();
      await page.getByRole('menuitem', { name: '取消关联' }).click();
      await page.getByRole('button', { name: '确认取消' }).click();
      await expect(page.locator('[data-testid="project-associated-solution-card"]').filter({ hasText: /中国石油大学克拉玛依校区思政/ })).toHaveCount(0, { timeout: 10_000 });

      await page.getByRole('button', { name: '关联方案' }).click();
      const dialog = page.getByRole('dialog', { name: '从方案库选择方案' });
      await expect(dialog).toBeVisible();
      await dialog.getByTestId('solution-selector-search-input').fill(KNOWN_SOLUTION_NAME);
      await Promise.all([
        page.waitForResponse((response) => response.url().includes('/api/solutions?') && response.request().method() === 'GET'),
        dialog.getByTestId('solution-selector-search-button').click(),
      ]);
      await dialog.locator('[data-testid="solution-card"]').filter({ hasText: /中国石油大学克拉玛依校区思政/ }).first().click();
      const associateResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/solutions`) && response.request().method() === 'POST'
      );
      await dialog.getByRole('button', { name: '确定关联' }).click();
      const associateResponse = await associateResponsePromise;
      expect(associateResponse.ok()).toBeTruthy();

      await page.reload();
      await page.getByRole('tab', { name: '项目策划' }).click();

      await expect(page.locator('[data-testid="project-associated-solution-card"]').filter({ hasText: /中国石油大学克拉玛依校区思政/ })).toHaveCount(1, { timeout: 10_000 });
    } finally {
      if (apiContext) {
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('manages a planning team member from project planning tab', async ({ page }) => {
    const username = `stability_member_user_${Date.now()}`;
    const email = `${username}@zhengyuan.com`;
    const projectName = `稳定性团队成员项目-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      await createUser(apiContext, {
        username,
        email,
        name: '稳定性团队成员用户',
        phone: '13800138003',
      });
      projectId = await createProjectForAssociation(apiContext, projectName);

      await page.goto(`/projects/${projectId}`);
      await page.getByRole('tab', { name: '项目策划' }).click();
      await page.getByTestId('planning-add-member-button').click();

      await page.getByRole('dialog', { name: '添加团队成员' }).locator('.planning-member-user-select-trigger').click();
      await page.getByPlaceholder('搜索姓名...').fill(username);
      await page.locator('[cmdk-item]').filter({ hasText: '稳定性团队成员用户' }).first().click();
      await page.getByTestId('planning-member-role-select-trigger').click();
      await page.getByRole('option', { name: '主管' }).click();

      const addMemberResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/members`) && response.request().method() === 'POST'
      );
      await page.getByTestId('planning-member-add-confirm-button').click();
      const addMemberResponse = await addMemberResponsePromise;
      expect(addMemberResponse.ok()).toBeTruthy();

      const memberRow = page.locator('[data-testid="planning-team-member-row"]').filter({ hasText: '稳定性团队成员用户' }).first();
      await expect(memberRow).toBeVisible({ timeout: 10_000 });

      const roleUpdateResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/members`) && response.request().method() === 'PUT'
      );
      await memberRow.getByTestId(/planning-member-role-trigger-/).click();
      await page.getByRole('option', { name: '负责人' }).click();
      const roleUpdateResponse = await roleUpdateResponsePromise;
      expect(roleUpdateResponse.ok()).toBeTruthy();

      await expect(memberRow.getByText('负责人')).toBeVisible({ timeout: 10_000 });

      page.once('dialog', () => {});
      await memberRow.getByTestId(new RegExp('planning-member-remove-button-')).click();
      const removeMemberResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/members?userId=`) && response.request().method() === 'DELETE'
      );
      await page.getByRole('button', { name: '确认移除' }).click();
      const removeMemberResponse = await removeMemberResponsePromise;
      expect(removeMemberResponse.ok()).toBeTruthy();

      await expect(page.locator('[data-testid="planning-team-member-row"]').filter({ hasText: '稳定性团队成员用户' })).toHaveCount(0, { timeout: 10_000 });
    } finally {
      if (apiContext) {
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await deleteUserByUsername(apiContext, username);
        await apiContext.dispose();
      }
    }
  });

  test('creates a project follow record from project planning tab', async ({ page }) => {
    const projectName = `稳定性跟进记录项目-${Date.now()}`;
    const followContent = `稳定性跟进内容-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;
    let userId: number | null = null;
    let userName = '';

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      const reusableUser = await findFirstNonAdminUser(apiContext);
      expect(reusableUser).toBeTruthy();
      userId = reusableUser!.id;
      userName = reusableUser!.name;
      projectId = await createProjectForAssociation(apiContext, projectName);
      await addProjectMember(apiContext, projectId, userId, 'manager', 'planning');

      await page.goto(`/projects/${projectId}`);
      await page.getByRole('tab', { name: '项目策划' }).click();
      await page.getByTestId('planning-add-follow-button').click();

      await page.getByTestId('planning-follow-follower-trigger').click();
      await page.getByRole('option', { name: new RegExp(userName) }).click();
      await page.getByTestId('planning-follow-time-input').fill('2026-03-31T10:30');
      await page.getByTestId('planning-follow-type-trigger').click();
      await page.getByRole('option', { name: '电话' }).click();
      await page.getByTestId('planning-follow-content-textarea').fill(followContent);

      const addFollowResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/follows`) && response.request().method() === 'POST'
      );
      await page.getByTestId('planning-follow-add-confirm-button').click();
      const addFollowResponse = await addFollowResponsePromise;
      expect(addFollowResponse.ok()).toBeTruthy();

      const followItem = page.locator('[data-testid="planning-follow-record-item"]').filter({ hasText: followContent }).first();
      await expect(followItem).toBeVisible({ timeout: 10_000 });
      await expect(followItem.getByText(/跟进人：/)).toBeVisible({ timeout: 10_000 });
    } finally {
      if (apiContext) {
        if (projectId && userId) {
          await removeProjectMember(apiContext, projectId, userId);
        }
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('creates and deletes a business trip follow record from project planning tab', async ({ page }) => {
    const projectName = `稳定性出差跟进项目-${Date.now()}`;
    const followContent = `稳定性出差跟进内容-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;
    let userId: number | null = null;
    let userName = '';

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      const reusableUser = await findFirstNonAdminUser(apiContext);
      expect(reusableUser).toBeTruthy();
      userId = reusableUser!.id;
      userName = reusableUser!.name;
      projectId = await createProjectForAssociation(apiContext, projectName);
      await addProjectMember(apiContext, projectId, userId, 'manager', 'planning');

      await page.goto(`/projects/${projectId}`);
      await page.getByRole('tab', { name: '项目策划' }).click();
      await page.getByTestId('planning-add-follow-button').click();

      await page.getByTestId('planning-follow-follower-trigger').click();
      await page.getByRole('option', { name: new RegExp(userName) }).click();
      await page.getByTestId('planning-follow-time-input').fill('2026-03-31T14:30');
      await page.getByTestId('planning-follow-type-trigger').click();
      await page.getByRole('option', { name: '现场拜访' }).click();
      await page.getByTestId('planning-follow-content-textarea').fill(followContent);
      await page.getByTestId('planning-follow-business-trip-checkbox').check();
      await page.getByTestId('planning-follow-trip-start-date-input').fill('2026-03-31');
      await page.getByTestId('planning-follow-trip-end-date-input').fill('2026-04-01');
      await page.getByTestId('planning-follow-trip-cost-input').fill('1200');

      const addFollowResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/follows`) && response.request().method() === 'POST'
      );
      await page.getByTestId('planning-follow-add-confirm-button').click();
      const addFollowResponse = await addFollowResponsePromise;
      expect(addFollowResponse.ok()).toBeTruthy();

      const followItem = page.locator('[data-testid="planning-follow-record-item"]').filter({ hasText: followContent }).first();
      await expect(followItem).toBeVisible({ timeout: 10_000 });

      const follows = await getProjectFollows(apiContext, projectId);
      const businessTripFollow = follows.find((item) => item.followContent === followContent);
      expect(businessTripFollow).toBeTruthy();
      expect(businessTripFollow?.isBusinessTrip).toBeTruthy();
      expect(businessTripFollow?.tripStartDate).toContain('2026-03-31');
      expect(businessTripFollow?.tripEndDate).toContain('2026-04-01');

      page.once('dialog', (dialog) => dialog.accept());
      const deleteFollowResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/follows?followId=`) && response.request().method() === 'DELETE'
      );
      await followItem.getByTestId(/planning-follow-delete-button-/).click();
      const deleteFollowResponse = await deleteFollowResponsePromise;
      expect(deleteFollowResponse.ok()).toBeTruthy();

      await expect(page.locator('[data-testid="planning-follow-record-item"]').filter({ hasText: followContent })).toHaveCount(0, { timeout: 10_000 });
    } finally {
      if (apiContext) {
        if (projectId && userId) {
          await removeProjectMember(apiContext, projectId, userId);
        }
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('creates a follow record with attachment from project planning tab', async ({ page }) => {
    const projectName = `稳定性附件跟进项目-${Date.now()}`;
    const followContent = `稳定性附件跟进内容-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;
    let userId: number | null = null;
    let userName = '';

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      const reusableUser = await findFirstNonAdminUser(apiContext);
      expect(reusableUser).toBeTruthy();
      userId = reusableUser!.id;
      userName = reusableUser!.name;
      projectId = await createProjectForAssociation(apiContext, projectName);
      await addProjectMember(apiContext, projectId, userId, 'manager', 'planning');

      await page.goto(`/projects/${projectId}`);
      await page.getByRole('tab', { name: '项目策划' }).click();
      await page.getByTestId('planning-add-follow-button').click();

      await page.getByTestId('planning-follow-follower-trigger').click();
      await page.getByRole('option', { name: new RegExp(userName) }).click();
      await page.getByTestId('planning-follow-time-input').fill('2026-03-31T16:30');
      await page.getByTestId('planning-follow-type-trigger').click();
      await page.getByRole('option', { name: '邮件' }).click();
      await page.getByTestId('planning-follow-content-textarea').fill(followContent);
      await page.getByTestId('planning-follow-attachment-input').setInputFiles({
        name: 'follow-proof.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('follow attachment proof'),
      });

      const addFollowResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/follows`) && response.request().method() === 'POST'
      );
      await page.getByTestId('planning-follow-add-confirm-button').click();
      const addFollowResponse = await addFollowResponsePromise;
      expect(addFollowResponse.ok()).toBeTruthy();

      const followItem = page.locator('[data-testid="planning-follow-record-item"]').filter({ hasText: followContent }).first();
      await expect(followItem).toBeVisible({ timeout: 10_000 });
      await expect(followItem.getByText('1 个附件')).toBeVisible({ timeout: 10_000 });

      const follows = await getProjectFollows(apiContext, projectId);
      const attachedFollow = follows.find((item) => item.followContent === followContent);
      expect(attachedFollow).toBeTruthy();
      expect(Array.isArray(attachedFollow?.attachments)).toBeTruthy();
      expect(attachedFollow?.attachments).toHaveLength(1);
    } finally {
      if (apiContext) {
        if (projectId && userId) {
          await removeProjectMember(apiContext, projectId, userId);
        }
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('shows and opens attachment links from project planning follow records', async ({ page }) => {
    const projectName = `稳定性附件展示项目-${Date.now()}`;
    const followContent = `稳定性附件展示内容-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;
    let userId: number | null = null;
    let userName = '';

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      const reusableUser = await findFirstNonAdminUser(apiContext);
      expect(reusableUser).toBeTruthy();
      userId = reusableUser!.id;
      userName = reusableUser!.name;
      projectId = await createProjectForAssociation(apiContext, projectName);
      await addProjectMember(apiContext, projectId, userId, 'manager', 'planning');

      await page.goto(`/projects/${projectId}`);
      await page.getByRole('tab', { name: '项目策划' }).click();
      await page.getByTestId('planning-add-follow-button').click();

      await page.getByTestId('planning-follow-follower-trigger').click();
      await page.getByRole('option', { name: new RegExp(userName) }).click();
      await page.getByTestId('planning-follow-time-input').fill('2026-03-31T17:00');
      await page.getByTestId('planning-follow-type-trigger').click();
      await page.getByRole('option', { name: '邮件' }).click();
      await page.getByTestId('planning-follow-content-textarea').fill(followContent);
      await page.getByTestId('planning-follow-attachment-input').setInputFiles({
        name: 'follow-link-proof.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('follow attachment link proof'),
      });

      const addFollowResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/follows`) && response.request().method() === 'POST'
      );
      await page.getByTestId('planning-follow-add-confirm-button').click();
      const addFollowResponse = await addFollowResponsePromise;
      expect(addFollowResponse.ok()).toBeTruthy();

      const followItem = page.locator('[data-testid="planning-follow-record-item"]').filter({ hasText: followContent }).first();
      await expect(followItem).toBeVisible({ timeout: 10_000 });

      const attachmentLink = followItem.locator('a').filter({ hasText: 'follow-link-proof.txt' }).first();
      await expect(attachmentLink).toBeVisible({ timeout: 10_000 });
      await expect(attachmentLink).toHaveAttribute('href', /local-uploads|http/);

      const href = await attachmentLink.getAttribute('href');
      expect(href).toBeTruthy();

      const popupPromise = page.waitForEvent('popup');
      await attachmentLink.click();
      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded');
      await expect(popup).toHaveURL(new RegExp((href || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      await popup.close();
    } finally {
      if (apiContext) {
        if (projectId && userId) {
          await removeProjectMember(apiContext, projectId, userId);
        }
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('edits bidding info from project bidding tab', async ({ page }) => {
    const projectName = `稳定性投标信息项目-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      projectId = await createProjectForAssociation(apiContext, projectName);
      await updateProjectStage(apiContext, projectId, 'bidding');

      await page.goto(`/projects/${projectId}`);
      await page.getByRole('tab', { name: '招投标' }).click();
      await page.getByTestId('bidding-info-edit-button').click();

      await page.getByTestId('bidding-bid-number-input').fill('BID-2026-031');
      await page.getByTestId('bidding-bid-project-name-input').fill(`${projectName}-标上名称`);
      await page.getByTestId('bidding-method-trigger').click();
      await page.getByRole('option', { name: '公开招标' }).click();
      await page.getByTestId('bidding-scoring-method-trigger').click();
      await page.getByRole('option', { name: '综合评分法' }).click();
      await page.getByTestId('bidding-price-limit-input').fill('888000');
      await page.getByTestId('bidding-fund-source-trigger').click();
      await page.getByRole('option', { name: '财政资金' }).click();
      await page.getByTestId('bidding-type-trigger').click();
      await page.getByRole('option', { name: '公开招标' }).click();
      await page.getByTestId('bidding-deadline-input').fill('2026-04-20T09:30');
      await page.getByTestId('bidding-open-date-input').fill('2026-04-21T09:30');
      await page.getByTestId('bidding-bid-price-input').fill('820000');

      const saveResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/bidding`) && response.request().method() === 'PUT'
      );
      await page.getByTestId('bidding-save-button').click();
      const saveResponse = await saveResponsePromise;
      expect(saveResponse.ok()).toBeTruthy();

      await expect(page.getByText('BID-2026-031')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(`${projectName}-标上名称`)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('¥820,000')).toBeVisible({ timeout: 10_000 });
    } finally {
      if (apiContext) {
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('archives a project after winning from project archive tab', async ({ page }) => {
    const projectName = `稳定性中标结果项目-${Date.now()}`;
    const contractNumber = `WIN-CN-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      projectId = await createProjectForAssociation(apiContext, projectName);
      await updateProjectStage(apiContext, projectId, 'bidding');

      await page.goto(`/projects/${projectId}`);
      await page.getByRole('tab', { name: '招投标' }).click();
      await page.getByTestId('bidding-info-edit-button').click();

      await page.getByTestId('bidding-bid-number-input').fill('BID-2026-WON-01');
      await page.getByTestId('bidding-bid-price-input').fill('960000');

      const saveResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/bidding`) && response.request().method() === 'PUT'
      );
      await page.getByTestId('bidding-save-button').click();
      const saveResponse = await saveResponsePromise;
      expect(saveResponse.ok()).toBeTruthy();

      await expect(page.getByText('BID-2026-WON-01')).toBeVisible({ timeout: 10_000 });

      await openArchiveTab(page, projectId);
      await page.getByTestId('project-archive-edit-button').click();
      await page.getByTestId('project-archive-bid-result-trigger').click();
      await page.getByRole('option', { name: '已中标' }).click();
      await page.getByTestId('project-archive-actual-amount-input').fill('960000');
      await page.getByTestId('project-archive-contract-number-input').fill(contractNumber);

      const archiveSaveResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}`) && response.request().method() === 'PUT'
      );
      await page.getByTestId('project-archive-save-button').click();
      const archiveSaveResponse = await archiveSaveResponsePromise;
      expect(archiveSaveResponse.ok()).toBeTruthy();

      const projectDetail = await getProjectDetail(apiContext, projectId);
      expect(projectDetail.projectStage).toBe('archived');
      expect(projectDetail.status).toBe('won');
      expect(projectDetail.bidResult).toBe('won');
      expect(projectDetail.contractNumber).toBe(contractNumber);
      expect(projectDetail.winCompetitor).toBeFalsy();
      expect(projectDetail.loseReason).toBeFalsy();
    } finally {
      if (apiContext) {
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('archives a project after losing from project archive tab', async ({ page }) => {
    const projectName = `稳定性落标结果项目-${Date.now()}`;
    const loseReason = `稳定性落标原因-${Date.now()}`;
    const competitor = `竞争对手-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      projectId = await createProjectForAssociation(apiContext, projectName);
      await updateProjectStage(apiContext, projectId, 'bidding');

      await page.goto(`/projects/${projectId}`);
      await page.getByRole('tab', { name: '招投标' }).click();
      await page.getByTestId('bidding-info-edit-button').click();
      await page.getByTestId('bidding-bid-number-input').fill('BID-2026-LOST-01');
      await page.getByTestId('bidding-bid-price-input').fill('730000');

      const saveResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/bidding`) && response.request().method() === 'PUT'
      );
      await page.getByTestId('bidding-save-button').click();
      const saveResponse = await saveResponsePromise;
      expect(saveResponse.ok()).toBeTruthy();

      await openArchiveTab(page, projectId);
      await page.getByTestId('project-archive-edit-button').click();
      await page.getByTestId('project-archive-bid-result-trigger').click();
      await page.getByRole('option', { name: '已丢标' }).click();
      await page.getByTestId('project-archive-win-competitor-input').fill(competitor);
      await page.getByTestId('project-archive-lose-reason-textarea').fill(loseReason);
      await page.getByTestId('project-archive-lessons-learned-textarea').fill('稳定性落标复盘');

      const archiveSaveResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}`) && response.request().method() === 'PUT'
      );
      await page.getByTestId('project-archive-save-button').click();
      const archiveSaveResponse = await archiveSaveResponsePromise;
      expect(archiveSaveResponse.ok()).toBeTruthy();

      const projectDetail = await getProjectDetail(apiContext, projectId);
      expect(projectDetail.projectStage).toBe('archived');
      expect(projectDetail.status).toBe('lost');
      expect(projectDetail.bidResult).toBe('lost');
      expect(projectDetail.winCompetitor).toBe(competitor);
      expect(projectDetail.loseReason).toBe(loseReason);
    } finally {
      if (apiContext) {
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('manages a bidding team member from project bidding tab', async ({ page }) => {
    const username = `stability_bidding_member_${Date.now()}`;
    const email = `${username}@zhengyuan.com`;
    const projectName = `稳定性招投标成员项目-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      await createUser(apiContext, {
        username,
        email,
        name: '稳定性招投标成员用户',
        phone: '13800138005',
      });
      projectId = await createProjectForAssociation(apiContext, projectName);
      await updateProjectStage(apiContext, projectId, 'bidding');

      await page.goto(`/projects/${projectId}`);
      await page.getByRole('tab', { name: '招投标' }).click();
      await page.getByTestId('bidding-add-member-button').click();

      await page.getByRole('dialog', { name: '添加招投标团队成员' }).locator('.bidding-member-user-select-trigger').click();
      await page.getByPlaceholder('搜索姓名...').fill(username);
      await page.locator('[cmdk-item]').filter({ hasText: '稳定性招投标成员用户' }).first().click();
      await page.getByTestId('bidding-member-role-trigger').click();
      await page.getByRole('option', { name: '技术负责人' }).click();

      const addMemberResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/members`) && response.request().method() === 'POST'
      );
      await page.getByTestId('bidding-member-add-confirm-button').click();
      const addMemberResponse = await addMemberResponsePromise;
      expect(addMemberResponse.ok()).toBeTruthy();

      const memberRow = page.locator('[data-testid="bidding-team-member-row"]').filter({ hasText: '稳定性招投标成员用户' }).first();
      await expect(memberRow).toBeVisible({ timeout: 10_000 });
      await expect(memberRow.getByText('主管')).toBeVisible({ timeout: 10_000 });

      const removeMemberResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/members?userId=`) && response.request().method() === 'DELETE'
      );
      await memberRow.getByTestId(new RegExp('bidding-member-remove-button-')).click();
      await page.getByRole('button', { name: '确认移除' }).click();
      const removeMemberResponse = await removeMemberResponsePromise;
      expect(removeMemberResponse.ok()).toBeTruthy();

      await expect(page.locator('[data-testid="bidding-team-member-row"]').filter({ hasText: '稳定性招投标成员用户' })).toHaveCount(0, { timeout: 10_000 });
    } finally {
      if (apiContext) {
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await deleteUserByUsername(apiContext, username);
        await apiContext.dispose();
      }
    }
  });

  test('creates edits and deletes a bidding proposal from project bidding tab', async ({ page }) => {
    const projectName = `稳定性投标方案项目-${Date.now()}`;
    const proposalName = `技术标书-${Date.now()}`;
    const updatedProposalName = `${proposalName}-已更新`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      projectId = await createProjectForAssociation(apiContext, projectName);
      await updateProjectStage(apiContext, projectId, 'bidding');

      await page.goto(`/projects/${projectId}`);
      await page.getByRole('tab', { name: '招投标' }).click();
      await page.getByTestId('bidding-create-proposal-button').click();

      await page.getByTestId('bidding-proposal-name-input').fill(proposalName);
      await page.getByTestId('bidding-proposal-type-trigger').click();
      await page.getByRole('option', { name: '技术标' }).click();
      await page.getByTestId('bidding-proposal-status-trigger').click();
      await page.getByRole('option', { name: '进行中' }).click();
      await page.getByTestId('bidding-proposal-progress-input').fill('55');
      await page.getByTestId('bidding-proposal-deadline-input').fill('2026-04-18');
      await page.getByTestId('bidding-proposal-notes-textarea').fill('稳定性投标方案备注');

      const createProposalResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/bidding-proposals`) && response.request().method() === 'POST'
      );
      await page.getByTestId('bidding-proposal-save-button').click();
      const createProposalResponse = await createProposalResponsePromise;
      expect(createProposalResponse.ok()).toBeTruthy();

      const proposalRow = page.locator('[data-testid="bidding-proposal-row"]').filter({ hasText: proposalName }).first();
      await expect(proposalRow).toBeVisible({ timeout: 10_000 });

      const updateProposalResponsePromise = page.waitForResponse(
        (response) => /\/api\/projects\/\d+\/bidding-proposals\/\d+$/.test(response.url()) && response.request().method() === 'PUT'
      );
      await proposalRow.getByTestId(/bidding-proposal-edit-button-/).click();
      await page.getByTestId('bidding-proposal-name-input').fill(updatedProposalName);
      await page.getByTestId('bidding-proposal-status-trigger').click();
      await page.getByRole('option', { name: '已完成' }).click();
      await page.getByTestId('bidding-proposal-progress-input').fill('100');
      await page.getByTestId('bidding-proposal-notes-textarea').fill('稳定性投标方案已完成');
      await page.getByTestId('bidding-proposal-save-button').click();
      const updateProposalResponse = await updateProposalResponsePromise;
      expect(updateProposalResponse.ok()).toBeTruthy();

      const updatedProposalRow = page.locator('[data-testid="bidding-proposal-row"]').filter({ hasText: updatedProposalName }).first();
      await expect(updatedProposalRow).toBeVisible({ timeout: 10_000 });
      await expect(updatedProposalRow.getByText('已完成')).toBeVisible({ timeout: 10_000 });

      page.once('dialog', (dialog) => dialog.accept());
      const deleteProposalResponsePromise = page.waitForResponse(
        (response) => /\/api\/projects\/\d+\/bidding-proposals\/\d+$/.test(response.url()) && response.request().method() === 'DELETE'
      );
      await updatedProposalRow.getByTestId(/bidding-proposal-delete-button-/).click();
      const deleteProposalResponse = await deleteProposalResponsePromise;
      expect(deleteProposalResponse.ok()).toBeTruthy();

      await expect(page.locator('[data-testid="bidding-proposal-row"]').filter({ hasText: updatedProposalName })).toHaveCount(0, { timeout: 10_000 });
    } finally {
      if (apiContext) {
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('creates edits and deletes a bidding work log from project bidding tab', async ({ page }) => {
    const projectName = `稳定性投标日志项目-${Date.now()}`;
    const logContent = `稳定性投标工作日志-${Date.now()}`;
    const updatedLogContent = `${logContent}-已更新`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      projectId = await createProjectForAssociation(apiContext, projectName);
      await updateProjectStage(apiContext, projectId, 'bidding');

      await page.goto(`/projects/${projectId}`);
      await page.getByRole('tab', { name: '招投标' }).click();
      await page.getByTestId('bidding-add-work-log-button').click();

      await page.getByTestId('bidding-work-log-date-input').fill('2026-03-31');
      await page.getByTestId('bidding-work-log-type-trigger').click();
      await page.getByRole('option', { name: '标书编制' }).click();
      await page.getByTestId('bidding-work-log-content-textarea').fill(logContent);
      await page.getByTestId('bidding-work-log-hours-input').fill('6');

      const createLogResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/bidding-logs`) && response.request().method() === 'POST'
      );
      await page.getByTestId('bidding-work-log-save-button').click();
      const createLogResponse = await createLogResponsePromise;
      expect(createLogResponse.ok()).toBeTruthy();

      const workLogRow = page.locator('[data-testid="bidding-work-log-row"]').filter({ hasText: logContent }).first();
      await expect(workLogRow).toBeVisible({ timeout: 10_000 });

      const updateLogResponsePromise = page.waitForResponse(
        (response) => /\/api\/projects\/\d+\/bidding-logs\/\d+$/.test(response.url()) && response.request().method() === 'PUT'
      );
      await workLogRow.getByTestId(/bidding-work-log-edit-button-/).click();
      await page.getByTestId('bidding-work-log-type-trigger').click();
      await page.getByRole('option', { name: '投标决策' }).click();
      await page.getByTestId('bidding-work-log-content-textarea').fill(updatedLogContent);
      await page.getByTestId('bidding-work-log-hours-input').fill('8');
      await page.getByTestId('bidding-work-log-save-button').click();
      const updateLogResponse = await updateLogResponsePromise;
      expect(updateLogResponse.ok()).toBeTruthy();

      const updatedWorkLogRow = page.locator('[data-testid="bidding-work-log-row"]').filter({ hasText: updatedLogContent }).first();
      await expect(updatedWorkLogRow).toBeVisible({ timeout: 10_000 });
      await expect(updatedWorkLogRow.getByText('投标决策')).toBeVisible({ timeout: 10_000 });

      page.once('dialog', (dialog) => dialog.accept());
      const deleteLogResponsePromise = page.waitForResponse(
        (response) => /\/api\/projects\/\d+\/bidding-logs\/\d+$/.test(response.url()) && response.request().method() === 'DELETE'
      );
      await updatedWorkLogRow.getByTestId(/bidding-work-log-delete-button-/).click();
      const deleteLogResponse = await deleteLogResponsePromise;
      expect(deleteLogResponse.ok()).toBeTruthy();

      await expect(page.locator('[data-testid="bidding-work-log-row"]').filter({ hasText: updatedLogContent })).toHaveCount(0, { timeout: 10_000 });
    } finally {
      if (apiContext) {
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('edits won archive details from project archive tab', async ({ page }) => {
    const projectName = `稳定性归档编辑项目-${Date.now()}`;
    const bidNumber = `BID-ARCHIVE-${Date.now()}`;
    const updatedBidNumber = `${bidNumber}-REV`;
    const actualAmount = '1250000';
    const contractNumber = `CN-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      projectId = await createProjectForAssociation(apiContext, projectName);
      await updateProjectStage(apiContext, projectId, 'bidding');

      await page.goto(`/projects/${projectId}`);
      await page.getByRole('tab', { name: '招投标' }).click();
      await page.getByTestId('bidding-info-edit-button').click();
      await page.getByTestId('bidding-bid-number-input').fill(bidNumber);

      const biddingSaveResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/bidding`) && response.request().method() === 'PUT'
      );
      await page.getByTestId('bidding-save-button').click();
      const biddingSaveResponse = await biddingSaveResponsePromise;
      expect(biddingSaveResponse.ok()).toBeTruthy();

      await openArchiveTab(page, projectId);
      await page.getByTestId('project-archive-edit-button').click();
      await page.getByTestId('project-archive-bid-result-trigger').click();
      await page.getByRole('option', { name: '已中标' }).click();
      await page.getByTestId('project-archive-actual-amount-input').fill(actualAmount);
      await page.getByTestId('project-archive-contract-number-input').fill(contractNumber);

      const archiveSaveResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}`) && response.request().method() === 'PUT'
      );
      await page.getByTestId('project-archive-save-button').click();
      const archiveSaveResponse = await archiveSaveResponsePromise;
      expect(archiveSaveResponse.ok()).toBeTruthy();

      await expect(page.getByText('¥1,250,000')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(contractNumber)).toBeVisible({ timeout: 10_000 });

      await page.getByRole('tab', { name: '招投标' }).click();
      await page.getByTestId('bidding-info-edit-button').click();
      await page.getByTestId('bidding-bid-number-input').fill(updatedBidNumber);

      const biddingResaveResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/bidding`) && response.request().method() === 'PUT'
      );
      await page.getByTestId('bidding-save-button').click();
      const biddingResaveResponse = await biddingResaveResponsePromise;
      expect(biddingResaveResponse.ok()).toBeTruthy();

      const projectDetail = await getProjectDetail(apiContext, projectId);
      expect(projectDetail.projectStage).toBe('archived');
      expect(projectDetail.status).toBe('won');
      expect(projectDetail.bidResult).toBe('won');
      expect(Number(projectDetail.actualAmount)).toBe(Number(actualAmount));
      expect(projectDetail.contractNumber).toBe(contractNumber);
    } finally {
      if (apiContext) {
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('edits lost archive details from project archive tab', async ({ page }) => {
    const projectName = `稳定性落标归档项目-${Date.now()}`;
    const bidNumber = `BID-ARCHIVE-LOST-${Date.now()}`;
    const updatedBidNumber = `${bidNumber}-REV`;
    const competitor = `落标竞争对手-${Date.now()}`;
    const loseReason = `落标原因复盘-${Date.now()}`;
    const lessonsLearned = `落标经验总结-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let projectId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      projectId = await createProjectForAssociation(apiContext, projectName);
      await updateProjectStage(apiContext, projectId, 'bidding');

      await page.goto(`/projects/${projectId}`);
      await page.getByRole('tab', { name: '招投标' }).click();
      await page.getByTestId('bidding-info-edit-button').click();
      await page.getByTestId('bidding-bid-number-input').fill(bidNumber);

      const biddingSaveResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/bidding`) && response.request().method() === 'PUT'
      );
      await page.getByTestId('bidding-save-button').click();
      const biddingSaveResponse = await biddingSaveResponsePromise;
      expect(biddingSaveResponse.ok()).toBeTruthy();

      await openArchiveTab(page, projectId);
      await page.getByTestId('project-archive-edit-button').click();
      await page.getByTestId('project-archive-bid-result-trigger').click();
      await page.getByRole('option', { name: '已丢标' }).click();
      await page.getByTestId('project-archive-win-competitor-input').fill(competitor);
      await page.getByTestId('project-archive-lose-reason-textarea').fill(loseReason);
      await page.getByTestId('project-archive-lessons-learned-textarea').fill(lessonsLearned);

      const archiveSaveResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}`) && response.request().method() === 'PUT'
      );
      await page.getByTestId('project-archive-save-button').click();
      const archiveSaveResponse = await archiveSaveResponsePromise;
      expect(archiveSaveResponse.ok()).toBeTruthy();

      await expect(page.getByText(competitor)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(loseReason)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(lessonsLearned)).toBeVisible({ timeout: 10_000 });

      await page.getByRole('tab', { name: '招投标' }).click();
      await page.getByTestId('bidding-info-edit-button').click();
      await page.getByTestId('bidding-bid-number-input').fill(updatedBidNumber);

      const biddingResaveResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${projectId}/bidding`) && response.request().method() === 'PUT'
      );
      await page.getByTestId('bidding-save-button').click();
      const biddingResaveResponse = await biddingResaveResponsePromise;
      expect(biddingResaveResponse.ok()).toBeTruthy();

      const projectDetail = await getProjectDetail(apiContext, projectId);
      expect(projectDetail.projectStage).toBe('archived');
      expect(projectDetail.bidResult).toBe('lost');
      expect(projectDetail.status).toBe('lost');
      expect(projectDetail.winCompetitor).toBe(competitor);
      expect(projectDetail.loseReason).toBe(loseReason);
      expect(projectDetail.lessonsLearned).toBe(lessonsLearned);
    } finally {
      if (apiContext) {
        if (projectId) {
          await deleteProjectById(apiContext, projectId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('keeps project type maintenance on the dedicated settings path', async ({ page }) => {
    const projectTypeCode = `stype${Date.now().toString().slice(-8)}`;
    const projectTypeName = `稳定性项目类型-${Date.now()}`;

    await loginAsAdmin(page);

    await page.goto('/settings/project-types');
    await expect(page.getByRole('heading', { name: '项目类型管理' })).toBeVisible();

    await page.getByRole('button', { name: '新增项目类型' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('编码').fill(projectTypeCode);
    await dialog.getByLabel('名称').fill(projectTypeName);
    await dialog.getByLabel('描述').fill('稳定性扫雷项目类型');
    const createProjectTypeResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/project-types') && response.request().method() === 'POST'
    );
    await dialog.getByRole('button', { name: '创建' }).click();

    const createProjectTypeResponse = await createProjectTypeResponsePromise;
    const createProjectTypePayload = await createProjectTypeResponse.json();
    expect(createProjectTypeResponse.ok(), JSON.stringify(createProjectTypePayload)).toBeTruthy();
    expect(createProjectTypePayload.success, JSON.stringify(createProjectTypePayload)).toBeTruthy();

    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    const projectTypeRow = page.getByTestId('project-types-row').filter({ hasText: projectTypeName }).first();
    await expect(projectTypeRow).toBeVisible({ timeout: 10_000 });

    await page.goto('/settings/dictionary?category=project_type');
    await expect(page.getByText('当前分类已迁移到项目类型主数据管理页，不在通用字典中维护。')).toBeVisible();
    await expect(page.getByRole('button', { name: '导入' })).toBeDisabled();
    await expect(page.getByRole('button', { name: '导出JSON' })).toBeDisabled();
    await expect(page.getByRole('button', { name: '导出CSV' })).toBeDisabled();
    await expect(page.getByRole('button', { name: '新增字典项' })).toBeDisabled();

    await page.getByRole('link', { name: '前往项目类型管理' }).click();
    await expect(page).toHaveURL(/\/settings\/project-types$/);
    await expect(page.getByTestId('project-types-row').filter({ hasText: projectTypeName }).first()).toBeVisible({ timeout: 10_000 });

    page.once('dialog', (dialogEvent) => dialogEvent.accept());
    await page.getByTestId('project-types-row').filter({ hasText: projectTypeName }).first().getByTestId(new RegExp('project-type-delete-button-')).click();
    await expect(page.getByTestId('project-types-row').filter({ hasText: projectTypeName })).toHaveCount(0, { timeout: 10_000 });
  });

  test('shows live metrics on the canonical data screen page', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      const heatmapResponse = await apiContext.get('/api/data-screen/heatmap?mode=customer');
      expect(heatmapResponse.ok()).toBeTruthy();

      await page.goto('/data-screen');
      await expect(page.getByTestId('data-screen-page')).toBeVisible();
      await expect(page.getByRole('heading', { name: '双江数据大屏' })).toBeVisible();
      await expect(page.getByTestId('data-screen-active-view-preset')).toContainText('管理层视图');
      await expect(page.getByTestId('data-screen-management-focus-panel')).toBeVisible();
    } finally {
      if (apiContext) {
        await apiContext.dispose();
      }
    }
  });

  test('shows live alerts data on alerts pages', async ({ page }) => {
    let apiContext: APIRequestContext | null = null;
    let createdRuleId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      let historiesResponse = await apiContext.get('/api/alerts/histories');
      expect(historiesResponse.ok()).toBeTruthy();
      let historiesPayload = await historiesResponse.json();
      let histories = Array.isArray(historiesPayload?.data) ? historiesPayload.data : [];

      if (histories.length === 0) {
        const ruleName = `稳定性预警规则-${Date.now()}`;
        const createRuleResponse = await apiContext.post('/api/alerts/rules', {
          data: {
            ruleName,
            ruleType: 'project',
            ruleCategory: 'not_updated',
            conditionField: 'updatedAt',
            thresholdValue: 0,
            thresholdUnit: 'day',
            severity: 'high',
            notificationChannels: ['system'],
          },
        });
        const createRulePayload = await createRuleResponse.json();
        expect(createRuleResponse.ok(), JSON.stringify(createRulePayload)).toBeTruthy();

        createdRuleId = createRulePayload?.data?.id ?? null;
        expect(createdRuleId).toBeTruthy();

        const checkResponse = await apiContext.post('/api/alerts/check');
        const checkPayload = await checkResponse.json();
        expect(checkResponse.ok(), JSON.stringify(checkPayload)).toBeTruthy();

        historiesResponse = await apiContext.get(`/api/alerts/histories?ruleId=${createdRuleId}`);
        historiesPayload = await historiesResponse.json();
        histories = Array.isArray(historiesPayload?.data) ? historiesPayload.data : [];
      }

      expect(histories.length).toBeGreaterThan(0);
      const firstAlert = histories[0];

      await page.goto('/alerts');
      await expect(page.getByTestId('alerts-page')).toBeVisible();
      await expect(page.getByRole('heading', { name: '预警管理' })).toBeVisible();
      await expect(page.getByTestId('alerts-recent-card')).toContainText(firstAlert.ruleName);
      await expect(page.getByTestId('alerts-recent-card')).toContainText(firstAlert.targetName);

      const historiesPath = firstAlert.ruleId ? `/alerts/histories?ruleId=${firstAlert.ruleId}` : '/alerts/histories';
      await page.goto(historiesPath);
      await expect(page.getByTestId('alerts-histories-page')).toBeVisible();
      const alertRow = page.getByRole('row').filter({ hasText: firstAlert.ruleName }).first();
      await expect(alertRow).toContainText(firstAlert.targetName);

      if (createdRuleId && firstAlert.status === 'pending') {
        const acknowledgeResponse = await apiContext.post('/api/alerts/histories', {
          data: { id: firstAlert.id },
        });
        const acknowledgePayload = await acknowledgeResponse.json();
        expect(acknowledgeResponse.ok(), JSON.stringify(acknowledgePayload)).toBeTruthy();

        await page.reload();
        await expect(page.getByRole('row').filter({ hasText: firstAlert.ruleName }).first()).toContainText('已确认');

        const resolveResponse = await apiContext.put('/api/alerts/histories', {
          data: { id: firstAlert.id, resolutionNote: '稳定性扫雷回归已验证' },
        });
        const resolvePayload = await resolveResponse.json();
        expect(resolveResponse.ok(), JSON.stringify(resolvePayload)).toBeTruthy();

        await page.reload();
        await expect(page.getByRole('row').filter({ hasText: firstAlert.ruleName }).first()).toContainText('已解决');
      } else {
        const statusText = firstAlert.status === 'pending'
          ? '待处理'
          : firstAlert.status === 'acknowledged'
            ? '已确认'
            : firstAlert.status === 'resolved'
              ? '已解决'
              : '已忽略';
        await expect(alertRow).toContainText(statusText);
      }
    } finally {
      if (apiContext) {
        if (createdRuleId) {
          await deleteAlertRuleById(apiContext, createdRuleId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('manages alert rules from alerts rules page', async ({ page }) => {
    const ruleName = `稳定性预警规则页-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let createdRuleId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      const createRuleResponse = await apiContext.post('/api/alerts/rules', {
        data: {
          ruleName,
          ruleType: 'project',
          ruleCategory: 'not_updated',
          conditionField: 'updatedAt',
          thresholdValue: 30,
          thresholdUnit: 'day',
          severity: 'medium',
          notificationChannels: ['system'],
        },
      });
      const createRulePayload = await createRuleResponse.json();
      expect(createRuleResponse.ok(), JSON.stringify(createRulePayload)).toBeTruthy();
      createdRuleId = createRulePayload?.data?.id ?? null;

      await page.goto('/alerts/rules');
      await expect(page.getByRole('heading', { name: '预警规则管理' })).toBeVisible();
      await page.getByPlaceholder('搜索规则名称或编码...').fill(ruleName);

      const ruleRow = page.getByRole('row').filter({ hasText: ruleName }).first();
      await expect(ruleRow).toBeVisible({ timeout: 10_000 });
      await expect(ruleRow).toContainText('启用');

      await ruleRow.getByRole('switch').click();
      await expect(ruleRow).toContainText('停用');

      page.once('dialog', (dialogEvent) => dialogEvent.accept());
      await ruleRow.locator('button').nth(1).click();
      await expect(page.getByRole('row').filter({ hasText: ruleName })).toHaveCount(0, { timeout: 10_000 });

      createdRuleId = null;
    } finally {
      if (apiContext) {
        if (createdRuleId) {
          await deleteAlertRuleById(apiContext, createdRuleId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('creates a customer from customers page', async ({ page }) => {
    const customerName = `稳定性客户-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      await page.goto('/customers');
      await expect(page.getByTestId('customers-page')).toBeVisible();

      await page.getByRole('button', { name: '新建客户' }).click();
      const dialog = page.getByRole('dialog', { name: '新建客户' });
      await expect(dialog).toBeVisible();

      await page.locator('#customerName').fill(customerName);
      await selectFirstRadixOption(page, 'customer-create-type-field');
      await selectCommandOption(page, 'customer-create-region-field', '北京', '北京市');
      await page.locator('#contactName').fill('稳定联系人');
      await page.locator('#contactPhone').fill('13800138022');
      await page.locator('#description').fill('客户闭环创建回归');

      await page.getByTestId('customer-create-submit-button').click();

      await expect(dialog).not.toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(customerName, { exact: true })).toBeVisible({ timeout: 10_000 });
    } finally {
      if (apiContext) {
        await deleteCustomerByName(apiContext, customerName);
        await apiContext.dispose();
      }
    }
  });

  test('edits a customer from customers page', async ({ page }) => {
    const customerName = `稳定性待编辑客户-${Date.now()}`;
    const updatedCustomerName = `${customerName}-已更新`;
    let apiContext: APIRequestContext | null = null;
    let customerId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      customerId = await createCustomer(apiContext, customerName);

      await page.goto('/customers');
      const customerRow = page.getByRole('row').filter({ hasText: customerName });
      await expect(customerRow).toBeVisible({ timeout: 10_000 });

      await customerRow.getByRole('button', { name: '编辑' }).click();
      const dialog = page.getByRole('dialog', { name: '编辑客户' });
      await expect(dialog).toBeVisible();

      await page.locator('#edit-customerName').fill(updatedCustomerName);
      await page.locator('#edit-contactPhone').fill('13800138023');
      await page.locator('#edit-description').fill('客户列表编辑回归');

      await page.getByTestId('customer-edit-submit-button').click();

      await expect(dialog).not.toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(updatedCustomerName, { exact: true })).toBeVisible({ timeout: 10_000 });
    } finally {
      if (apiContext) {
        await deleteCustomerByName(apiContext, customerName);
        await deleteCustomerByName(apiContext, updatedCustomerName);
        await apiContext.dispose();
      }
    }
  });

  test('does not expose customer edit entry from customer detail page', async ({ page }) => {
    const customerName = `稳定性详情客户-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let customerId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      customerId = await createCustomer(apiContext, customerName);

      await page.goto(`/customers/${customerId}`);
      await expect(page.getByTestId('customer-detail-page')).toBeVisible();

      await expect(page.getByTestId('customer-detail-edit-button')).toHaveCount(0);
      await expect(page.getByRole('button', { name: '编辑客户信息' })).toHaveCount(0);

      const customerDetail = await getCustomerDetail(apiContext, customerId);
      expect(customerDetail.customerName).toBe(customerName);
    } finally {
      if (apiContext) {
        if (customerId) {
          await deleteCustomerById(apiContext, customerId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('shows merged customer follow records without create entry on customer detail page', async ({ page }) => {
    const customerName = `稳定性跟进客户-${Date.now()}`;
    const olderFollowContent = `客户较早跟进-${Date.now()}`;
    const latestFollowContent = `客户最新跟进-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let customerId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      customerId = await createCustomer(apiContext, customerName);
      await createCustomerFollow(apiContext, customerId, {
        followContent: olderFollowContent,
        followTime: '2026-04-03T09:00:00',
      });
      await createCustomerFollow(apiContext, customerId, {
        followContent: latestFollowContent,
        followTime: '2026-04-04T09:00:00',
      });

      await page.goto(`/customers/${customerId}`);
      await expect(page.getByTestId('customer-detail-page')).toBeVisible();

      await expect(page.getByTestId('customer-add-follow-button')).toHaveCount(0);
      await expect(page.getByRole('button', { name: '添加跟进' })).toHaveCount(0);
      await expect(page.getByText(/按跟进时间倒序合并展示/)).toBeVisible();

      const firstToggle = page.locator('[data-testid^="customer-follow-record-toggle-"]').nth(0);
      const secondToggle = page.locator('[data-testid^="customer-follow-record-toggle-"]').nth(1);
      await expect(firstToggle).toBeVisible({ timeout: 10_000 });
      await firstToggle.click();
      await expect(page.getByText(latestFollowContent, { exact: true })).toBeVisible({ timeout: 10_000 });

      await secondToggle.click();
      await expect(page.getByText(olderFollowContent, { exact: true })).toBeVisible({ timeout: 10_000 });

      const followRecords = await getCustomerFollows(apiContext, customerId);
      expect(followRecords[0]?.followContent).toBe(latestFollowContent);
      expect(followRecords.some((record: { followContent?: string }) => record.followContent === olderFollowContent)).toBeTruthy();
    } finally {
      if (apiContext) {
        if (customerId) {
          await deleteCustomerById(apiContext, customerId);
        }
        await apiContext.dispose();
      }
    }
  });

  test('creates a solution from solutions page', async ({ page }) => {
    const solutionName = `稳定性解决方案-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);

      await page.goto('/solutions');
      await expect(page.getByTestId('solutions-page')).toBeVisible();

      await page.getByTestId('solution-create-button').click();
      const dialog = page.getByTestId('solution-create-dialog');
      await expect(dialog).toBeVisible();

      await page.getByTestId('solution-create-name-input').fill(solutionName);
      await page.getByTestId('solution-create-version-input').fill('2.0');
      await page.getByTestId('solution-create-description-input').fill('方案列表创建闭环回归');
      await page.getByTestId('solution-create-submit-button').click();

      await expect(page.getByTestId('solution-detail-page')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(solutionName, { exact: true })).toBeVisible({ timeout: 10_000 });

      const solutions = await listSolutions(apiContext, solutionName);
      expect(solutions.some((item) => item.solutionName === solutionName)).toBeTruthy();
    } finally {
      if (apiContext) {
        await deleteSolutionByName(apiContext, solutionName);
        await apiContext.dispose();
      }
    }
  });

  test('edits solution details from solution detail page', async ({ page }) => {
    const solutionName = `稳定性待编辑方案-${Date.now()}`;
    const updatedSolutionName = `${solutionName}-已更新`;
    const updatedDescription = `方案详情编辑闭环-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let solutionId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      solutionId = await createSolution(apiContext, solutionName);

      await page.goto(`/solutions/${solutionId}`);
      await expect(page.getByTestId('solution-detail-page')).toBeVisible();

      await page.getByTestId('solution-detail-edit-button').click();
      await page.getByTestId('solution-detail-name-input').fill(updatedSolutionName);
      await page.getByTestId('solution-detail-description-input').fill(updatedDescription);
      await page.getByTestId('solution-detail-save-button').click();

      await expect(page.getByText(updatedSolutionName, { exact: true })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(updatedDescription, { exact: true })).toBeVisible({ timeout: 10_000 });

      const solutionDetail = await getSolutionDetail(apiContext, solutionId);
      expect(solutionDetail.solutionName).toBe(updatedSolutionName);
      expect(solutionDetail.description).toBe(updatedDescription);
    } finally {
      if (apiContext) {
        if (solutionId) {
          await deleteSolutionById(apiContext, solutionId);
        }
        await deleteSolutionByName(apiContext, solutionName);
        await deleteSolutionByName(apiContext, updatedSolutionName);
        await apiContext.dispose();
      }
    }
  });

  test('adds and removes a solution team member from solution detail page', async ({ page }) => {
    const solutionName = `稳定性团队方案-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let solutionId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      solutionId = await createSolution(apiContext, solutionName);

      const reusableUser = await findFirstNonAdminUser(apiContext);
      expect(reusableUser).toBeTruthy();

      await page.goto(`/solutions/${solutionId}`);
      await expect(page.getByTestId('solution-detail-page')).toBeVisible();

      await page.getByTestId('solution-team-open-dialog-button').click();
      await expect(page.getByTestId('solution-team-dialog')).toBeVisible();
      await page.getByTestId('solution-team-user-search-input').fill(reusableUser!.username);
      await expect(page.getByTestId(new RegExp(`solution-team-user-option-`))).toBeVisible({ timeout: 10_000 });
      await page.getByTestId(new RegExp(`solution-team-user-option-`)).filter({ hasText: reusableUser!.name }).first().click();
      await page.getByTestId('solution-team-role-trigger').click();
      await page.getByRole('option', { name: '贡献者' }).click();
      await page.getByTestId('solution-team-submit-button').click();

      const memberRow = page.locator('[data-testid^="solution-team-member-"]').filter({ hasText: reusableUser!.name }).first();
      await expect(memberRow).toBeVisible({ timeout: 10_000 });

      page.once('dialog', (dialog) => dialog.accept());
      await memberRow.getByTestId(/solution-team-remove-button-/).click();
      await expect(page.locator('[data-testid^="solution-team-member-"]').filter({ hasText: reusableUser!.name })).toHaveCount(0, { timeout: 10_000 });

      const teamMembers = await getSolutionTeamMembers(apiContext, solutionId);
      expect(teamMembers.some((member) => member.userId === reusableUser!.id)).toBeFalsy();
    } finally {
      if (apiContext) {
        if (solutionId) {
          await deleteSolutionById(apiContext, solutionId);
        }
        await deleteSolutionByName(apiContext, solutionName);
        await apiContext.dispose();
      }
    }
  });

  test('submits and approves a solution review from solution detail page', async ({ page }) => {
    const solutionName = `稳定性评审方案-${Date.now()}`;
    let apiContext: APIRequestContext | null = null;
    let solutionId: number | null = null;

    try {
      await loginAsAdmin(page);
      apiContext = await createApiContextFromPage(page);
      solutionId = await createSolution(apiContext, solutionName);

      const reusableUser = await findFirstNonAdminUser(apiContext);
      expect(reusableUser).toBeTruthy();

      await page.goto(`/solutions/${solutionId}`);
      await expect(page.getByTestId('solution-detail-page')).toBeVisible();
      await page.getByRole('tab', { name: '评审' }).click();

      await page.getByTestId('solution-review-open-dialog-button').click();
      await expect(page.getByTestId('solution-review-dialog')).toBeVisible();
      await page.getByTestId('solution-reviewer-search-input').fill(reusableUser!.username);
      await expect(page.getByTestId(new RegExp(`solution-reviewer-option-`))).toBeVisible({ timeout: 10_000 });
      await page.getByTestId(new RegExp(`solution-reviewer-option-`)).filter({ hasText: reusableUser!.name }).first().click();
      await page.getByTestId('solution-review-submit-button').click();

      await expect(page.getByText('审核中')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('[data-testid^="solution-review-record-"]').filter({ hasText: reusableUser!.name }).first()).toBeVisible({ timeout: 10_000 });

      await page.getByTestId('solution-review-approve-button').click();
      await expect.poll(async () => {
        const detail = await getSolutionDetail(apiContext!, solutionId!);
        return detail.status;
      }).toBe('approved');

      const reviews = await getSolutionReviews(apiContext, solutionId);
      expect(reviews.some((review) => review.reviewerId === reusableUser!.id && review.reviewStatus === 'approved')).toBeTruthy();
    } finally {
      if (apiContext) {
        if (solutionId) {
          await deleteSolutionById(apiContext, solutionId);
        }
        await deleteSolutionByName(apiContext, solutionName);
        await apiContext.dispose();
      }
    }
  });
});

type RoleSummary = {
  id: number;
  name: string;
  code: string;
};

type SolutionSummary = {
  id: number;
  solutionName: string;
  description?: string | null;
  status?: string;
};

type UserSummary = {
  id: number;
  username: string;
  name: string;
};

async function openArchiveTab(page: Page, projectId: number) {
  const archiveTab = page.getByRole('tab', { name: '中标/丢标' });
  const archiveEditButton = page.getByTestId('project-archive-edit-button');

  await page.goto(`/projects/${projectId}`);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await archiveTab.click();

    try {
      await expect(page.getByRole('tab', { name: '中标/丢标', selected: true })).toBeVisible({ timeout: 5_000 });
      await expect(archiveEditButton).toBeVisible({ timeout: 5_000 });
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }

      await page.reload();
    }
  }
}

async function loginAsAdmin(page: Page) {
  const authContext = await playwrightRequest.newContext({ baseURL: TEST_BASE_URL });
  const response = await authContext.post('/api/auth/login', {
    data: ADMIN_USER,
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

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await authContext.dispose();
}

async function createApiContextFromPage(page: Page) {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();

  return playwrightRequest.newContext({
    baseURL: TEST_BASE_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async function listRoles(apiContext: APIRequestContext) {
  const response = await apiContext.get('/api/roles');
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  const roles = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];

  return roles.map((role: { id: number; name?: string; roleName?: string; code?: string; roleCode?: string }) => ({
    id: role.id,
    name: role.name || role.roleName || `role-${role.id}`,
    code: role.code || role.roleCode || '',
  })) as RoleSummary[];
}

async function findRoleByCode(apiContext: APIRequestContext, roleCode: string) {
  const roles = await listRoles(apiContext);
  return roles.find((role) => role.code === roleCode) || null;
}

async function deleteRoleByCode(apiContext: APIRequestContext, roleCode: string) {
  const role = await findRoleByCode(apiContext, roleCode);

  if (role) {
    const response = await apiContext.delete(`/api/roles?id=${role.id}`);
    expect(response.ok()).toBeTruthy();
  }
}

async function deleteUserByUsername(apiContext: APIRequestContext, username: string) {
  const response = await apiContext.get('/api/users?includeRoles=true');
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  const users = Array.isArray(payload?.data) ? payload.data : [];
  const user = users.find((item: { id: number; username: string }) => item.username === username);

  if (user) {
    const deleteResponse = await apiContext.delete(`/api/users?id=${user.id}`);
    expect(deleteResponse.ok()).toBeTruthy();
  }
}

async function findUserByUsername(apiContext: APIRequestContext, username: string) {
  const response = await apiContext.get('/api/users?includeRoles=true');
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  const users = Array.isArray(payload?.data) ? payload.data : [];
  const user = users.find((item: { id: number; username: string; name: string }) => item.username === username);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
  } as UserSummary;
}

async function findFirstNonAdminUser(apiContext: APIRequestContext) {
  const response = await apiContext.get('/api/users?includeRoles=true');
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  const users = Array.isArray(payload?.data) ? payload.data : [];
  const user = users.find((item: { id: number; username: string; name: string }) => item.username !== 'admin');

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
  } as UserSummary;
}

async function deleteProjectByName(apiContext: APIRequestContext, projectName: string) {
  const response = await apiContext.get(`/api/projects?search=${encodeURIComponent(projectName)}&pageSize=100`);
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  const projects = Array.isArray(payload?.data?.projects) ? payload.data.projects : [];
  const project = projects.find((item: { id: number; projectName: string }) => item.projectName === projectName);

  if (project) {
    await deleteProjectById(apiContext, project.id);
  }
}

async function deleteProjectById(apiContext: APIRequestContext, projectId: number) {
  const detailResponse = await apiContext.delete(`/api/projects/${projectId}`);
  if (detailResponse.ok()) {
    return;
  }

  const response = await apiContext.delete(`/api/projects?id=${projectId}`);
  expect(response.ok()).toBeTruthy();
}

async function deleteAlertRuleById(apiContext: APIRequestContext, ruleId: number) {
  const response = await apiContext.delete(`/api/alerts/rules?id=${ruleId}`);
  expect(response.ok()).toBeTruthy();
}

async function getProjectDetail(apiContext: APIRequestContext, projectId: number) {
  const response = await apiContext.get(`/api/projects/${projectId}`);
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  return payload?.data || payload;
}

async function getProjectFollows(apiContext: APIRequestContext, projectId: number) {
  const response = await apiContext.get(`/api/projects/${projectId}/follows`);
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  return Array.isArray(payload?.data) ? payload.data : [];
}

async function listCustomers(apiContext: APIRequestContext, search = '') {
  const response = await apiContext.get(`/api/customers?search=${encodeURIComponent(search)}&pageSize=100`);
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  return Array.isArray(payload?.data?.customers) ? payload.data.customers : [];
}

async function createCustomer(apiContext: APIRequestContext, customerName: string) {
  const response = await apiContext.post('/api/customers', {
    data: {
      customerName,
      customerTypeId: 1,
      region: '北京市',
      status: 'potential',
      contactName: '稳定联系人',
      contactPhone: '13800138021',
      description: '客户闭环测试数据',
    },
  });

  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  const customerId = payload?.data?.id;
  expect(typeof customerId).toBe('number');
  return customerId as number;
}

async function getCustomerDetail(apiContext: APIRequestContext, customerId: number) {
  const response = await apiContext.get(`/api/customers/${customerId}`);
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  return payload?.data || payload;
}

async function getCustomerFollows(apiContext: APIRequestContext, customerId: number) {
  const response = await apiContext.get(`/api/customers/${customerId}/follows`);
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  return Array.isArray(payload?.data) ? payload.data : [];
}

async function createCustomerFollow(
  apiContext: APIRequestContext,
  customerId: number,
  overrides: {
    followContent?: string;
    followType?: string;
    followTime?: string;
    projectId?: string;
  } = {},
) {
  const usersResponse = await apiContext.get('/api/users');
  expect(usersResponse.ok()).toBeTruthy();

  const usersPayload = await usersResponse.json();
  const users = Array.isArray(usersPayload?.data) ? usersPayload.data : Array.isArray(usersPayload) ? usersPayload : [];
  const followerName = users.find((item: { realName?: string; status?: string }) => item?.realName && item?.status !== 'inactive')?.realName;
  expect(typeof followerName).toBe('string');

  const response = await apiContext.post(`/api/customers/${customerId}/follows`, {
    multipart: {
      followContent: overrides.followContent || `客户跟进记录-${Date.now()}`,
      followType: overrides.followType || 'phone',
      followTime: overrides.followTime || '2026-04-04T10:00:00',
      followerName: followerName as string,
      projectId: overrides.projectId || 'none',
      isBusinessTrip: 'false',
    },
  });
  expect(response.ok()).toBeTruthy();
}

async function listSolutions(apiContext: APIRequestContext, keyword = '') {
  const response = await apiContext.get(`/api/solutions?keyword=${encodeURIComponent(keyword)}&pageSize=100`);
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  return (Array.isArray(payload?.data) ? payload.data : []) as SolutionSummary[];
}

async function createSolution(apiContext: APIRequestContext, solutionName: string) {
  const response = await apiContext.post('/api/solutions', {
    data: {
      solutionName,
      description: '方案闭环测试数据',
      version: '1.0',
      industry: ['education'],
      status: 'draft',
    },
  });

  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  const solutionId = payload?.data?.id;
  expect(typeof solutionId).toBe('number');
  return solutionId as number;
}

async function getSolutionDetail(apiContext: APIRequestContext, solutionId: number) {
  const response = await apiContext.get(`/api/solutions/${solutionId}`);
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  return payload?.data?.solution || payload?.data || payload;
}

async function getSolutionReviews(apiContext: APIRequestContext, solutionId: number) {
  const response = await apiContext.get(`/api/solutions/${solutionId}/reviews`);
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  return Array.isArray(payload?.data) ? payload.data : [];
}

async function getSolutionTeamMembers(apiContext: APIRequestContext, solutionId: number) {
  const response = await apiContext.get(`/api/solutions/${solutionId}/team`);
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  return Array.isArray(payload?.data) ? payload.data : [];
}

async function deleteSolutionByName(apiContext: APIRequestContext, solutionName: string) {
  const solutions = await listSolutions(apiContext, solutionName);
  const target = solutions.find((item) => item.solutionName === solutionName);

  if (target) {
    await deleteSolutionById(apiContext, target.id);
  }
}

async function deleteSolutionById(apiContext: APIRequestContext, solutionId: number) {
  const response = await apiContext.delete(`/api/solutions/${solutionId}`);

  if (response.status() === 404) {
    return;
  }

  expect(response.ok()).toBeTruthy();
}

async function deleteCustomerByName(apiContext: APIRequestContext, customerName: string) {
  const customers = await listCustomers(apiContext, customerName);
  const customer = customers.find((item: { id: number; customerName: string }) => item.customerName === customerName);

  if (customer) {
    await deleteCustomerById(apiContext, customer.id);
  }
}

async function deleteCustomerById(apiContext: APIRequestContext, customerId: number) {
  const response = await apiContext.delete(`/api/customers/${customerId}`);

  if (response.status() === 404) {
    return;
  }

  expect(response.ok()).toBeTruthy();
}

async function selectFirstRadixOption(page: Page, fieldTestId: string) {
  const field = page.getByTestId(fieldTestId);
  await field.locator('[role="combobox"], button').first().click();
  await page.getByRole('option').first().click();
}

async function selectCommandOption(
  page: Page,
  fieldTestId: string,
  searchText: string,
  optionText?: string,
  pickFirst = false
) {
  const field = page.getByTestId(fieldTestId);
  await field.locator('[role="combobox"], button').first().click();

  const commandInput = page.locator('[cmdk-input]').last();
  await expect(commandInput).toBeVisible();
  if (searchText) {
    await commandInput.fill(searchText);
  }

  if (pickFirst) {
    await page.locator('[cmdk-item]').first().click();
    return;
  }

  await page.locator('[cmdk-item]').filter({ hasText: optionText || searchText }).first().click();
}

async function createUser(
  apiContext: APIRequestContext,
  user: { username: string; email: string; name: string; phone: string; roleIds?: number[] }
) {
  const response = await apiContext.post('/api/users', {
    data: {
      ...user,
      password: 'password',
      status: 'active',
      roleIds: user.roleIds || [1],
      baseLocation: null,
    },
  });

  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  const userId = payload?.data?.id;
  expect(typeof userId).toBe('number');
  return userId as number;
}

async function addProjectMember(
  apiContext: APIRequestContext,
  projectId: number,
  userId: number,
  role: 'manager' | 'supervisor' | 'member' = 'member',
  stage: 'planning' | 'bidding' | 'all' = 'planning'
) {
  const response = await apiContext.post(`/api/projects/${projectId}/members`, {
    data: {
      userId,
      role,
      stage,
    },
  });

  expect(response.ok()).toBeTruthy();
}

async function updateProjectStage(apiContext: APIRequestContext, projectId: number, projectStage: string) {
  const stageSequenceByTarget: Record<string, string[]> = {
    bidding_pending: ['bidding_pending'],
    bidding: ['bidding_pending', 'bidding'],
  };

  const stageSequence = stageSequenceByTarget[projectStage] || [projectStage];

  for (const stage of stageSequence) {
    const response = await apiContext.post(`/api/projects/${projectId}/stage`, {
      data: {
        stage,
        confirmed: true,
      },
    });

    expect(response.ok()).toBeTruthy();
  }
}

async function removeProjectMember(apiContext: APIRequestContext, projectId: number, userId: number) {
  const response = await apiContext.delete(`/api/projects/${projectId}/members?userId=${userId}`);
  if (response.ok()) {
    return;
  }
}

async function associateSolution(apiContext: APIRequestContext, projectId: number, solutionId: number) {
  const response = await apiContext.post(`/api/projects/${projectId}/solutions`, {
    data: {
      solutionId,
      usageType: 'reference',
    },
  });

  expect(response.ok()).toBeTruthy();
}

async function createProjectForAssociation(apiContext: APIRequestContext, projectName: string) {
  const response = await apiContext.post('/api/projects', {
    data: {
      projectName,
      customerId: KNOWN_CUSTOMER.id,
      customerName: KNOWN_CUSTOMER.name,
      projectType: KNOWN_CUSTOMER.projectType,
      industry: KNOWN_CUSTOMER.industry,
      region: KNOWN_CUSTOMER.region,
      estimatedAmount: '100000',
      priority: 'medium',
      projectStage: 'opportunity',
    },
  });

  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const projectId = payload?.data?.id;

  expect(typeof projectId).toBe('number');
  return projectId as number;
}

async function listDataPermissions(apiContext: APIRequestContext) {
  const response = await apiContext.get('/api/settings/data-permissions');
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  return Array.isArray(payload?.data?.permissions) ? payload.data.permissions : [];
}

async function findDataPermission(apiContext: APIRequestContext, roleId: number, resource: string) {
  const permissions = await listDataPermissions(apiContext);
  return permissions.find((item: { id: number; roleId: number; resource: string }) => item.roleId === roleId && item.resource === resource) || null;
}

async function deleteDataPermission(apiContext: APIRequestContext, roleId: number, resource: string) {
  const permission = await findDataPermission(apiContext, roleId, resource);

  if (permission) {
    const response = await apiContext.delete(`/api/settings/data-permissions?id=${permission.id}`);
    expect(response.ok()).toBeTruthy();
  }
}

async function listOperationLogs(apiContext: APIRequestContext) {
  const response = await apiContext.get('/api/operation-logs?page=1&pageSize=20');
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  return Array.isArray(payload?.data) ? payload.data : [];
}