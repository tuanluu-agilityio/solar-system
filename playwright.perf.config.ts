import { defineConfig, devices } from '@playwright/test';

// Task 29 FPS measurement (spec §11.4): headed Chromium on the machine's real GPU via ANGLE D3D11.
// A browser window opens while it runs. If the renderer still reports software rendering, the
// numbers are informational only (the spec forbids tuning quality from software FPS).
const PORT = 4179; // not 4173, so it never collides with the e2e/visual preview server
const launchOptions = {
  headless: false,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
};

export default defineConfig({
  testDir: 'tests/perf',
  timeout: 300_000,
  workers: 1, // one GPU, one window: projects run one after the other
  retries: 0,
  reporter: [['list']],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/solar-system/`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  use: { baseURL: `http://localhost:${PORT}/solar-system/`, headless: false, launchOptions },
  projects: [
    {
      // Pixel 7 viewport and touch; the spec applies CDP CPU throttling x4 in this project.
      name: 'mobile-throttled',
      use: { ...devices['Pixel 7'], headless: false, launchOptions },
    },
    {
      name: 'desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        headless: false,
        launchOptions,
      },
    },
  ],
});
