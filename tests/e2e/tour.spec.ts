import { expect, test, type Page } from '@playwright/test';

type TourState = { status: string; index: number; total: number };
type AppWindow = {
  __app: {
    getState(): { ready: boolean; tour: TourState; muted: boolean };
    tour(e: { type: string }): void;
    setTimeScale(n: number): void;
  };
  __subtitlesSeen?: string[];
};

const READY = 40_000;
const POLL = 25_000;

async function open(page: Page, query = '?e2e=1'): Promise<void> {
  await page.goto(`./${query}`);
  await page.waitForFunction(
    () => (window as unknown as AppWindow).__app?.getState().ready === true,
    null,
    { timeout: READY },
  );
}

const tour = (page: Page): Promise<TourState> =>
  page.evaluate(() => {
    const s = (window as unknown as AppWindow).__app.getState().tour;
    return { status: s.status, index: s.index, total: s.total };
  });
const status = async (page: Page): Promise<string> => (await tour(page)).status;

test('autostarts once on the first visit and sets sse.tourSeen', async ({ page }) => {
  // Two boots on software GL.
  test.slow();
  await open(page, '?e2e=1&autostart=1');
  expect(await page.evaluate(() => localStorage.getItem('sse.tourSeen'))).toBeNull();
  await expect.poll(() => status(page), { timeout: POLL }).not.toBe('idle');
  expect(await page.evaluate(() => localStorage.getItem('sse.tourSeen'))).toBe('true');

  await page.reload();
  await open(page, '?e2e=1&autostart=1');
  await page.waitForTimeout(6_000);
  expect(await status(page)).toBe('idle');
});

test('tour controls: next advances, a canvas drag pauses, resume and exit', async ({ page }) => {
  await open(page);
  await page.getByTestId('tour').click();
  await expect.poll(() => status(page), { timeout: POLL }).not.toBe('idle');
  await expect(page.getByTestId('tour-progress')).toBeVisible();
  // Muted by default: the unmute hint is shown during the tour.
  await expect(page.getByTestId('tour-unmute')).toBeVisible();
  for (const id of ['tour-pause', 'tour-prev', 'tour-next', 'tour-exit']) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }

  await page.getByTestId('tour-next').click();
  await expect.poll(async () => (await tour(page)).index, { timeout: POLL }).toBe(1);

  const vp = page.viewportSize()!;
  // Upper-right canvas area, below the control cluster: clear of the tour dock, the
  // desktop left panel and the mobile bottom sheet.
  const x = vp.width * 0.7;
  const y = vp.height * 0.2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y + 20, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => status(page), { timeout: POLL }).toBe('paused');
  await expect(page.getByTestId('tour-pause')).toHaveClass(/tour-resume/);

  await page.getByTestId('tour-pause').click();
  await expect.poll(() => status(page), { timeout: POLL }).not.toBe('paused');
  expect((await tour(page)).index).toBe(1);

  await page.getByTestId('tour-exit').click();
  await expect.poll(() => status(page), { timeout: POLL }).toBe('idle');
  await expect(page.getByTestId('tour-progress')).toBeHidden();
});

test('with setTimeScale(20) the tour reaches finished and shows subtitles', async ({ page }) => {
  // 14 real-time camera flights on software GL.
  test.setTimeout(300_000);
  await open(page);
  await page.evaluate(() => {
    const w = window as unknown as AppWindow;
    w.__subtitlesSeen = [];
    const el = document.querySelector('[data-testid="subtitles"]')!;
    new MutationObserver(() => {
      const text = el.textContent ?? '';
      if (text.trim()) w.__subtitlesSeen!.push(text);
    }).observe(el, { childList: true, characterData: true, subtree: true });
    w.__app.setTimeScale(20);
    w.__app.tour({ type: 'START' });
  });
  await expect.poll(() => status(page), { timeout: 270_000, intervals: [1_000] }).toBe('finished');
  const seen = await page.evaluate(() => (window as unknown as AppWindow).__subtitlesSeen ?? []);
  expect(seen.length).toBeGreaterThan(0);
});

test('a missing narration mp3 does not stall the tour (Review Focus 4)', async ({ page }) => {
  test.slow();
  await page.route('**/audio/narration/*.mp3', (route) => route.fulfill({ status: 404 }));
  await open(page);
  // Unmute (a user gesture, which also unlocks audio) so the tour really tries the mp3.
  await page.getByTestId('sound').click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as AppWindow).__app.getState().muted))
    .toBe(false);
  await page.evaluate(() => (window as unknown as AppWindow).__app.setTimeScale(20));
  await page.getByTestId('tour').click();
  await expect
    .poll(async () => (await tour(page)).index, { timeout: 90_000, intervals: [1_000] })
    .toBeGreaterThanOrEqual(2);
});
