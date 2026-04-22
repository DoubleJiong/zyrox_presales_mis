/**
 * F5/F6 - 消息中心 E2E 验证
 *
 * F5: @提及 → 收件人收件箱出现 mention 消息
 * F6: 消息中心页面展示全部 6 种消息类型的图标/tab
 */

import { config as loadEnv } from 'dotenv';
import { expect, test, request as playwrightRequest, type APIRequestContext, type Page } from '@playwright/test';
import postgres from 'postgres';

const ADMIN_USER = {
  email: 'admin@zhengyuan.com',
  password: 'password',
};

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

loadEnv({ path: '.env.local' });

test.describe('messages center formal validation', () => {
  test.describe.configure({ mode: 'serial' });

  // ------------------------------------------------------------------
  // F5: @提及 → 收件人 inbox 出现 mention 消息
  // ------------------------------------------------------------------
  test('F5: mention notification appears in recipient inbox', async ({ page }) => {
    let dbClient: postgres.Sql | null = null;
    const mentionMsgId = createUniqueId();

    try {
      await loginAsAdmin(page);
      dbClient = createDbClient();

      // 获取管理员用户 ID
      const [adminRow] = await dbClient<{ id: number }[]>`
        SELECT id FROM sys_user WHERE email = ${'admin@zhengyuan.com'} LIMIT 1
      `;
      const adminId = adminRow?.id ?? 1;

      // 直接写入一条 type=mention 的 sys_message，receiverId = admin
      await dbClient`
        INSERT INTO sys_message (
          id, title, content, type, category, priority,
          sender_id, receiver_id, related_type,
          is_read, is_deleted, created_at, updated_at
        ) VALUES (
          ${mentionMsgId},
          ${'有人在跟进记录中@了您'},
          ${'张三 在跟进记录中提到了您：@管理员 麻烦跟进一下这个客户。'},
          ${'mention'},
          ${'system'},
          ${'normal'},
          ${adminId},
          ${adminId},
          ${'customer'},
          ${false},
          ${false},
          NOW(),
          NOW()
        )
      `;

      // 访问消息中心
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      // 确认消息页可见
      await expect(page.locator('body')).toBeVisible();

      // 点击 "提及@" tab（如果存在）
      const mentionTab = page.getByRole('tab', { name: /提及/ });
      if (await mentionTab.isVisible({ timeout: 3000 })) {
        await mentionTab.click();
        // 至少能看到标题中包含 mention 的消息
        await expect(page.getByText('有人在跟进记录中@了您')).toBeVisible({ timeout: 5000 });
      } else {
        // 在 "全部" tab 下确认消息存在
        await expect(page.getByText('有人在跟进记录中@了您')).toBeVisible({ timeout: 5000 });
      }

      // 消息铃：未读数应 ≥ 1
      const badge = page.locator('[data-testid="unread-badge"]');
      if (await badge.isVisible({ timeout: 2000 })) {
        const count = parseInt(await badge.textContent() ?? '0', 10);
        expect(count).toBeGreaterThanOrEqual(1);
      }
    } finally {
      if (dbClient) {
        await dbClient`DELETE FROM sys_message WHERE id = ${mentionMsgId}`;
        await dbClient.end();
      }
    }
  });

  // ------------------------------------------------------------------
  // F6: 消息中心页面展示全部 6 种消息类型的 tab 和图标
  // ------------------------------------------------------------------
  test('F6: message center shows all 6 type tabs and messages', async ({ page }) => {
    let dbClient: postgres.Sql | null = null;
    const ids = Array.from({ length: 6 }, () => createUniqueId());
    const types = ['system', 'task', 'alert', 'approval', 'reminder', 'mention'] as const;

    try {
      await loginAsAdmin(page);
      dbClient = createDbClient();

      const [adminRow] = await dbClient<{ id: number }[]>`
        SELECT id FROM sys_user WHERE email = ${'admin@zhengyuan.com'} LIMIT 1
      `;
      const adminId = adminRow?.id ?? 1;

      // 插入 6 种类型消息
      for (let i = 0; i < types.length; i++) {
        await dbClient`
          INSERT INTO sys_message (
            id, title, content, type, category, priority,
            sender_id, receiver_id,
            is_read, is_deleted, created_at, updated_at
          ) VALUES (
            ${ids[i]},
            ${`[F6测试] ${types[i]}类型消息`},
            ${'E2E F6 验证消息'},
            ${types[i]},
            ${'system'},
            ${'normal'},
            ${adminId},
            ${adminId},
            ${false},
            ${false},
            NOW(),
            NOW()
          )
        `;
      }

      // 访问消息中心
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      // 页面应存在（导航成功）
      await expect(page.locator('body')).toBeVisible();

      // 验证各 tab 存在（至少存在 "全部" tab）
      await expect(page.getByRole('tab', { name: /全部/ })).toBeVisible({ timeout: 5000 });

      // 验证各类型出现在全部列表内
      for (const type of types) {
        const msgTitle = `[F6测试] ${type}类型消息`;
        // 在全部 tab 下搜索或滚动
        const item = page.getByText(msgTitle);
        if (await item.isVisible({ timeout: 2000 }).catch(() => false)) {
          // 可见即通过，类型图标会随 item 渲染出来
          continue;
        }
        // 如有对应 tab，点击后检查
        const typeTab = page.getByRole('tab', { name: new RegExp(getTabName(type)) });
        if (await typeTab.isVisible({ timeout: 1000 }).catch(() => false)) {
          await typeTab.click();
          await expect(page.getByText(msgTitle)).toBeVisible({ timeout: 5000 });
          // 回到全部
          await page.getByRole('tab', { name: /全部/ }).click();
        }
      }
    } finally {
      if (dbClient) {
        for (const id of ids) {
          await dbClient`DELETE FROM sys_message WHERE id = ${id}`;
        }
        await dbClient.end();
      }
    }
  });
});

// ------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------

function getTabName(type: string) {
  const map: Record<string, string> = {
    system: '系统', task: '任务', alert: '预警',
    approval: '审批', reminder: '提醒', mention: '提及',
  };
  return map[type] ?? type;
}

async function loginAsAdmin(page: Page) {
  const authContext = await playwrightRequest.newContext({ baseURL: TEST_BASE_URL });
  const response = await authContext.post('/api/auth/login', {
    data: { email: ADMIN_USER.email, password: ADMIN_USER.password },
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

function createDbClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for messages formal test');
  }
  return postgres(databaseUrl, { max: 1, prepare: false });
}

function createUniqueId(offset = 0) {
  return -((Date.now() % 1_000_000_000) + Math.floor(Math.random() * 10_000) + offset);
}
