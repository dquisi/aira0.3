import { defineConfig, devices, PlaywrightTestConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);

const config: PlaywrightTestConfig = defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: 'html',
  use: {
    actionTimeout: 0,
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    headless: isCI
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: {
    command: isCI ? 'vite preview --port 5173' : 'vite dev',
    port: 5173,
    reuseExistingServer: !isCI
  }
});

export default config;
