import { config as loadEnv } from 'dotenv';
import { expect, test, type Page } from '@playwright/test';
import jwt from 'jsonwebtoken';

loadEnv({ path: '.env.local' });

const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const TEST_BASE_ORIGIN = new URL(TEST_BASE_URL);

test.use({ viewport: { width: 1600, height: 1200 } });

test.describe('data-screen map interactions', () => {
  test('supports zoom controls, reset, and detailed map view', async ({ page }) => {
    const authTokens = createAdminAuthTokens();
    await loginAsAdmin(page, authTokens);

    await page.goto('/data-screen');
    await expect(page.getByTestId('data-screen-page')).toBeVisible({ timeout: 20_000 });

    const mapStage = page.getByTestId('data-screen-center-stage');
    const stageZoomInButton = mapStage.getByTitle('放大地图').first();
    const stageResetButton = mapStage.getByTitle('还原地图视角').first();
    const stageExpandButton = mapStage.getByTitle('放大查看地图').first();
    const zoomHint = mapStage.getByText(/滚轮缩放 拖动平移 当前/i).first();

    await expect(mapStage.getByText('地图载入中')).toBeHidden({ timeout: 20_000 });
    await expect(stageZoomInButton).toBeVisible({ timeout: 20_000 });
    await expect(zoomHint).toContainText('当前 1.0x');

    await stageZoomInButton.click();
    await expect(zoomHint).toContainText('当前 1.2x');

    await stageResetButton.click();
    await expect(zoomHint).toContainText('当前 1.0x');

    await stageExpandButton.click();

    const detailDialog = page.getByTestId('data-screen-map-detail-dialog');
    await expect(detailDialog).toBeVisible({ timeout: 20_000 });
    await expect(detailDialog.getByText('地图详细查看')).toBeVisible();
    await expect(detailDialog.getByText(/支持滚轮缩放、拖动画布和平移后重置视图/)).toBeVisible();

    const detailZoomHint = detailDialog.getByText(/滚轮缩放 拖动平移 当前/i).first();
    await expect(detailZoomHint).toContainText('当前 1.0x');

    await detailDialog.getByRole('button', { name: '放大' }).click();
    await expect(detailZoomHint).toContainText('当前 1.2x');

    await detailDialog.getByRole('button', { name: '关闭查看' }).click();
    await expect(detailDialog).toBeHidden({ timeout: 20_000 });
  });
});

function createAdminAuthTokens() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required for data-screen map interaction auth setup');
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

async function loginAsAdmin(page: Page, tokens: { accessToken: string; refreshToken: string }) {
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

  await page.goto('/');
  await page.waitForLoadState('networkidle');
}