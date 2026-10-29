import { expect, test, type Page } from '@playwright/test';

type AppWindow = {
  __app: {
    getState(): { ready: boolean };
    select(id: string): Promise<void>;
  };
};

async function boot(page: Page): Promise<void> {
  await page.goto('./?e2e=1');
  await page.waitForFunction(
    () => (window as unknown as AppWindow).__app?.getState().ready === true,
    null,
    { timeout: 30_000 },
  );
}

/** Body maps only: the 4096 sky also lives under `textures/high/` and loads at boot on medium. */
function trackBodyHighRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (r) => {
    const u = r.url();
    if (u.includes('/textures/high/') && !u.includes('/sky_')) urls.push(u);
  });
  return urls;
}

test('desktop (high tier) loads the high-res map once the camera arrives', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'high tier is the desktop default');
  test.setTimeout(150_000); // software GL under 3 parallel projects is slow

  const urls = trackBodyHighRequests(page);
  await boot(page);
  expect(urls).toEqual([]);
  await page.evaluate(() => {
    void (window as unknown as AppWindow).__app.select('jupiter');
  });
  await expect
    .poll(() => urls.some((u) => u.endsWith('textures/high/jupiter.webp')), { timeout: 90_000 })
    .toBe(true);
  // Re-selecting does not fetch it again.
  await page.evaluate(() => (window as unknown as AppWindow).__app.select('jupiter'));
  await page.waitForTimeout(500);
  expect(urls.filter((u) => u.endsWith('textures/high/jupiter.webp'))).toHaveLength(1);
});

test('mobile (low/medium tier) never requests high-res body maps', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone13', 'mobile only');
  const urls = trackBodyHighRequests(page);
  await boot(page);
  await page.evaluate(() => (window as unknown as AppWindow).__app.select('jupiter'));
  await page.waitForTimeout(5_000);
  expect(urls).toEqual([]);
});

test('a superseded selection does not load the first body high-res map', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'high tier is the desktop default');
  test.setTimeout(150_000);
  const urls = trackBodyHighRequests(page);
  await boot(page);
  // Select Jupiter, then Mars before the camera arrives: only Mars may load.
  await page.evaluate(() => {
    const app = (window as unknown as AppWindow).__app;
    void app.select('jupiter');
    void app.select('mars');
  });
  await expect
    .poll(() => urls.some((u) => u.endsWith('textures/high/mars.webp')), { timeout: 90_000 })
    .toBe(true);
  await page.waitForTimeout(1_000);
  expect(urls.some((u) => u.endsWith('textures/high/jupiter.webp'))).toBe(false);
});
