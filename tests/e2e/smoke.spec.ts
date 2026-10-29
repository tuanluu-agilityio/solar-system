import { expect, test } from '@playwright/test';

test('app shell loads', async ({ page }) => {
  await page.goto('./');
  expect(await page.locator('canvas, #app').count()).toBeGreaterThanOrEqual(1);
});
