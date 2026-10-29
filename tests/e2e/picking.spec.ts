import { expect, test } from '@playwright/test';

type AppWindow = {
  __app: { getState(): { ready: boolean; selected: string | null; view: string } };
};

test('tapping a label selects that body and hides labels in focus view', async ({ page }) => {
  await page.goto('./?e2e=1');
  await page.waitForFunction(
    () => (window as unknown as AppWindow).__app?.getState().ready === true,
    null,
    {
      timeout: 20_000,
    },
  );
  const label = page.locator('.body-label[data-body="earth"]');
  await expect(label).toBeVisible();
  await label.dispatchEvent('click');
  await expect
    .poll(() => page.evaluate(() => (window as unknown as AppWindow).__app.getState().selected))
    .toBe('earth');
  await expect(label).toBeHidden();
});
