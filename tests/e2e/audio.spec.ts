import { expect, test, type Page } from '@playwright/test';

type AppWindow = {
  __app: { getState(): { ready: boolean; muted: boolean } };
};

const READY = 40_000;
const POLL = 25_000;

async function open(page: Page): Promise<void> {
  await page.goto('./?e2e=1');
  await page.waitForFunction(
    () => (window as unknown as AppWindow).__app?.getState().ready === true,
    null,
    { timeout: READY },
  );
}

const muted = (page: Page): Promise<boolean> =>
  page.evaluate(() => (window as unknown as AppWindow).__app.getState().muted);

test('sound button toggles mute, persists across reload, and creates no page errors', async ({
  page,
}) => {
  // Three boots (two reloads) on software GL: about 20 s each on the desktop project.
  test.slow();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  expect(await muted(page)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('sse.muted'))).toBeNull();

  await page.getByTestId('sound').click();
  await expect.poll(() => muted(page), { timeout: POLL }).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('sse.muted'))).toBe('false');

  await page.reload();
  await open(page);
  expect(await muted(page)).toBe(false);

  await page.getByTestId('sound').click();
  await expect.poll(() => muted(page), { timeout: POLL }).toBe(true);
  await page.reload();
  await open(page);
  expect(await muted(page)).toBe(true);
  expect(errors).toEqual([]);
});
