import { expect, test, type Page } from '@playwright/test';

type AppWindow = {
  __app: {
    getState(): { ready: boolean; selected: string | null; quality: string };
  };
};

async function open(page: Page, search = ''): Promise<void> {
  await page.addInitScript(() => {
    if (!localStorage.getItem('sse.lang')) localStorage.setItem('sse.lang', 'en');
    localStorage.setItem('sse.tourSeen', 'true');
  });
  await page.goto(`./?e2e=1${search}`);
  await page.waitForFunction(
    () => (window as unknown as AppWindow).__app?.getState().ready === true,
    null,
    { timeout: 40_000 },
  );
}

test('settings popover opens, persists the toggles and applies a manual quality', async ({
  page,
}) => {
  test.slow();
  await open(page);
  await expect(page.getByTestId('settings-panel')).toBeHidden();
  await page.getByTestId('settings').click();
  await expect(page.getByTestId('settings-panel')).toBeVisible();
  await expect(page.getByTestId('settings')).toHaveAttribute('aria-expanded', 'true');

  await page.getByTestId('toggle-orbits').click();
  await page.getByTestId('toggle-labels').click();
  await page.getByTestId('quality-low').click();
  await expect(page.getByTestId('quality-now')).toContainText('Low');
  expect(await page.evaluate(() => (window as unknown as AppWindow).__app.getState().quality)).toBe(
    'low',
  );
  await page.getByTestId('speed-4').click();
  await expect(page.getByTestId('speed-4')).toHaveAttribute('aria-checked', 'true');

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('settings-panel')).toBeHidden();

  const stored = await page.evaluate(() => [
    localStorage.getItem('sse.orbits'),
    localStorage.getItem('sse.labels'),
    localStorage.getItem('sse.quality'),
  ]);
  expect(stored).toEqual(['false', 'false', 'low']);

  await page.reload();
  await page.waitForFunction(
    () => (window as unknown as AppWindow).__app?.getState().ready === true,
    null,
    { timeout: 40_000 },
  );
  expect(await page.evaluate(() => (window as unknown as AppWindow).__app.getState().quality)).toBe(
    'low',
  );
  await page.getByTestId('settings').click();
  await expect(page.getByTestId('toggle-orbits')).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('quality-low')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('speed-1')).toHaveAttribute('aria-checked', 'true');
});

test('the ?quality=ultra URL parameter is accepted', async ({ page }) => {
  await open(page, '&quality=ultra');
  expect(await page.evaluate(() => (window as unknown as AppWindow).__app.getState().quality)).toBe(
    'ultra',
  );
});

test('the body navigator flies to a body and the panel steps to the next one', async ({ page }) => {
  test.slow();
  await open(page);
  const mobile = await page.evaluate(() => innerHeight > innerWidth);
  await expect(page.getByTestId('body-nav')).toBeVisible();
  await page.getByTestId('nav-mars').click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as AppWindow).__app.getState().selected), {
      timeout: 25_000,
    })
    .toBe('mars');
  await expect(page.getByTestId('panel')).toBeVisible();
  if (mobile) {
    // Phones hide the strip while a body is focused; the panel steps instead.
    await expect(page.getByTestId('body-nav')).toBeHidden();
  } else {
    await expect(page.getByTestId('nav-mars')).toHaveAttribute('aria-current', 'true');
  }
  await page.getByTestId('panel-next').click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as AppWindow).__app.getState().selected), {
      timeout: 25_000,
    })
    .toBe('asteroid-belt');
});
