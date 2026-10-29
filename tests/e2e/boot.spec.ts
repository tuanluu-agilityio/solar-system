import { expect, test } from '@playwright/test';

type AppWindow = { __app: { getState(): { ready: boolean } } };

test('boots, renders a canvas, hides loading screen, no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('./?e2e=1');
  await page.waitForFunction(() => (window as unknown as AppWindow).__app?.getState().ready === true, null, {
    timeout: 20_000,
  });
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('#loading-screen')).toBeHidden();
  expect(errors).toEqual([]);
});

test('shows webglUnsupported in the detected language when WebGL is unavailable', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'vi-VN' });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto('./?e2e=1');
  await expect(page.locator('#webgl-unsupported')).toContainText('không hỗ trợ WebGL');
  await ctx.close();
  const ctxEn = await browser.newContext({ locale: 'en-US' });
  const pageEn = await ctxEn.newPage();
  await pageEn.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await pageEn.goto('./?e2e=1');
  await expect(pageEn.locator('#webgl-unsupported')).toContainText('does not support WebGL');
  await ctxEn.close();
});
