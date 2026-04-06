import { config as loadEnv } from 'dotenv';
import { expect, test, type Page } from '@playwright/test';
import jwt from 'jsonwebtoken';
import postgres from 'postgres';

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

loadEnv({ path: '.env.local' });

test.describe('wave 9 formal validation', () => {
  test('uses unified summary fetch on /workbench and supports task inbox lightweight actions', async ({ page }) => {
    let dbClient: postgres.Sql | null = null;
    let createdTaskId: number | null = null;

    try {
      await loginAsAdmin(page);
      dbClient = createDbClient();

      const today = toDateOnly(new Date());
      const tomorrow = toDateOnly(addDays(new Date(), 1));
      const uniqueSuffix = Date.now();
      const taskName = `wave9-task-${uniqueSuffix}`;
      const requestUrls: string[] = [];

      const [task] = await dbClient<{ id: number }[]>`
        INSERT INTO bus_project_task (
          id,
          project_id,
          task_name,
          task_type,
          assignee_id,
          start_date,
          due_date,
          status,
          priority,
          progress,
          deleted_at,
          created_at,
          updated_at
        ) VALUES (
          (SELECT COALESCE(MAX(id), 0) + 1 FROM bus_project_task),
          NULL,
          ${taskName},
          'other',
          ${1},
          ${today},
          ${today},
          'pending',
          'high',
          0,
          NULL,
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      createdTaskId = task.id;

      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('/api/workbench/summary') || url.includes('/api/activities')) {
          requestUrls.push(url);
        }
      });

      await page.goto('/workbench');
      await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();
      await expect(page.getByText('个人事件收件箱').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(taskName).first()).toBeVisible({ timeout: 10_000 });

      const summaryRequests = requestUrls.filter((url) => url.includes('/api/workbench/summary'));
      const activityRequests = requestUrls.filter((url) => url.includes('/api/activities'));
      expect(summaryRequests.length).toBeGreaterThan(0);
      expect(activityRequests).toHaveLength(0);

      const taskCard = page.locator('div.rounded-lg.border.bg-card.p-3').filter({ hasText: taskName }).first();
      await expect(taskCard.getByRole('button', { name: '延后一天' })).toBeVisible();
      await expect(taskCard.getByRole('button', { name: '完成任务' })).toBeVisible();

      await taskCard.getByRole('button', { name: '延后一天' }).click();

      await expect.poll(async () => {
        const rows = await dbClient!<{ due_date: string | null }[]>`
          SELECT due_date::text AS due_date
          FROM bus_project_task
          WHERE id = ${createdTaskId}
        `;
        return rows[0]?.due_date;
      }).toBe(tomorrow);

      await taskCard.getByRole('button', { name: '完成任务' }).click();
      await expect(page.getByText(taskName).first()).toHaveCount(0);

      await expect.poll(async () => {
        const rows = await dbClient!<{ status: string; progress: number }[]>`
          SELECT status, progress
          FROM bus_project_task
          WHERE id = ${createdTaskId}
        `;
        return rows[0];
      }).toEqual({ status: 'completed', progress: 100 });
    } finally {
      if (dbClient && createdTaskId) {
        await dbClient`DELETE FROM bus_project_task WHERE id = ${createdTaskId}`;
      }

      if (dbClient) {
        await dbClient.end({ timeout: 5 });
      }
    }
  });
});

async function loginAsAdmin(page: Page) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required for wave 9 formal auth setup');
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
}

function createDbClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for wave 9 formal setup');
  }

  return postgres(databaseUrl, {
    max: 1,
    prepare: false,
  });
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateOnly(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
