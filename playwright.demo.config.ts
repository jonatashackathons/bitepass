import { defineConfig, devices } from '@playwright/test';

/**
 * Dedicated Slow-Mo Pitch & Walkthrough Video Recording Config (`npm run test:pitch`).
 * Keeps slow-mo visual pauses isolated from fast deterministic CI E2E gates (`playwright.config.ts`).
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/pitch-*.spec.ts'],
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  webServer: {
    command: 'npm run dev -- -p 3005',
    url: 'http://localhost:3005',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
  use: {
    baseURL: 'http://localhost:3005',
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'on',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

