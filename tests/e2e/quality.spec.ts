import { expect, test, type Page } from '@playwright/test';

type AppWindow = {
  __app: {
    getState(): { quality: string; ready: boolean };
    pixelRatio(): number;
    downgradeQuality(): string | null;
    asteroidCount(): number;
  };
};

async function boot(page: Page, query: string): Promise<void> {
  await page.goto(`./?e2e=1${query}`);
  await page.waitForFunction(
    () => (window as unknown as AppWindow).__app?.getState().ready === true,
    null,
    { timeout: 30_000 },
  );
}

test.slow();

test('?quality=low selects the low tier with a pixel ratio of at most 1.5', async ({ page }) => {
  await boot(page, '&quality=low');
  expect(await page.evaluate(() => (window as unknown as AppWindow).__app.getState().quality)).toBe(
    'low',
  );
  expect(
    await page.evaluate(() => (window as unknown as AppWindow).__app.pixelRatio()),
  ).toBeLessThanOrEqual(1.5);
});

test('software rendering keeps the quality unchanged (FPS monitor disabled)', async ({ page }) => {
  await boot(page, '&quality=high');
  await page.waitForTimeout(6000);
  expect(await page.evaluate(() => (window as unknown as AppWindow).__app.getState().quality)).toBe(
    'high',
  );
});

test('a downgrade applies pixel ratio and belt count and stops at low', async ({ page }) => {
  await boot(page, '&quality=high');
  const read = (): Promise<{ q: string; pr: number; n: number }> =>
    page.evaluate(() => {
      const a = (window as unknown as AppWindow).__app;
      return { q: a.getState().quality, pr: a.pixelRatio(), n: a.asteroidCount() };
    });
  expect((await read()).n).toBe(8000);
  expect(await page.evaluate(() => (window as unknown as AppWindow).__app.downgradeQuality())).toBe(
    'medium',
  );
  expect(await read()).toMatchObject({ q: 'medium', n: 4000 });
  expect(await page.evaluate(() => (window as unknown as AppWindow).__app.downgradeQuality())).toBe(
    'low',
  );
  const low = await read();
  expect(low).toMatchObject({ q: 'low', n: 1500 });
  expect(low.pr).toBeLessThanOrEqual(1.5);
  expect(await page.evaluate(() => (window as unknown as AppWindow).__app.downgradeQuality())).toBe(
    null,
  );
});
