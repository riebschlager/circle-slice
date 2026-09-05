import { defineConfig, devices } from '@playwright/test';

const liveURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  ...(liveURL ? { testMatch: '**/smoke.spec.ts' } : {}),
  testDir: './tests/browser',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: liveURL ?? 'http://127.0.0.1:4273/circle-slice/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: liveURL
    ? []
    : {
        command: 'npm run preview -- --host 127.0.0.1 --port 4273 --strictPort',
        url: 'http://127.0.0.1:4273/circle-slice/',
        reuseExistingServer: false,
      },
});
