import { defineConfig, devices } from '@playwright/test';

const launchOptions = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };

// Screenshots for the Task 28 visual review: desktop and iPhone 13, one worker (shared port 4173).
export default defineConfig({
  testDir: 'tests/visual',
  timeout: 420_000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
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
    {
      name: 'desktop',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 720 }, launchOptions },
    },
  ],
});
