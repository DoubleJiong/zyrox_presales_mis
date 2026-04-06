import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const useExternalServer = process.env.PLAYWRIGHT_EXTERNAL_SERVER === '1';

export default defineConfig({
  testDir: './tests/e2e/playwright',
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: useExternalServer
    ? undefined
    : {
        command: 'corepack pnpm dev',
        url: `${baseURL}/login`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});