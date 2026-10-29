import { defineConfig, devices } from '@playwright/test';

const launchOptions = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000, // software GL makes context creation slow when 3 projects run in parallel
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173/solar-system/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  use: { baseURL: 'http://localhost:4173/solar-system/', launchOptions },
  projects: [
    {
      name: 'iphone13',
      use: { ...devices['iPhone 13'], browserName: 'chromium', launchOptions },
    },
    { name: 'pixel7', use: { ...devices['Pixel 7'], launchOptions } },
    {
      name: 'desktop',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 }, launchOptions },
    },
  ],
});
