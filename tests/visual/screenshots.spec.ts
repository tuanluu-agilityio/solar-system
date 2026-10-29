import { expect, test, type Page } from '@playwright/test';

type AppWindow = {
  __app: {
    getState(): { ready: boolean; selected: string | null; tour: { status: string } };
    select(id: string): Promise<void>;
    overview(): Promise<void>;
    setTimeScale(n: number): void;
    cameraTargetId(): string | null;
  };
};

const READY = 60_000;
const POLL = 40_000;

async function boot(page: Page, lang: 'en' | 'vi'): Promise<void> {
  await page.addInitScript((l) => {
    localStorage.setItem('sse.lang', l);
    localStorage.setItem('sse.tourSeen', 'true');
  }, lang);
  await page.goto('./?e2e=1');
  await page.waitForFunction(
    () => (window as unknown as AppWindow).__app?.getState().ready === true,
    null,
    { timeout: READY },
  );
  // Flights are frame-bound on software GL (about 1.5 fps); speed the rig up.
  await page.evaluate(() => (window as unknown as AppWindow).__app.setTimeScale(20));
}

/** Flies to a body and waits for the flight to end, then lets textures and the panel settle. */
async function focus(page: Page, id: string): Promise<void> {
  await page.evaluate((i) => (window as unknown as AppWindow).__app.select(i), id);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as AppWindow).__app.cameraTargetId()), {
      timeout: POLL,
    })
    .toBe(id);
  await page.waitForTimeout(2_500);
}

test('screenshots for the visual review', async ({ page }, info) => {
  const project = info.project.name;
  const mobile = project === 'iphone13';
  const shot = async (name: string): Promise<void> => {
    // setTimeScale(0) freezes the rig and the tour timers; orbital motion keeps real time.
    await page.evaluate(() => (window as unknown as AppWindow).__app.setTimeScale(0));
    await page.waitForTimeout(1_000);
    await page.screenshot({
      path: `docs/screenshots/${project}-${name}.png`,
      scale: 'css',
      animations: 'disabled',
    });
    await page.evaluate(() => (window as unknown as AppWindow).__app.setTimeScale(20));
  };

  await boot(page, 'en');
  await page.waitForTimeout(2_000);
  await shot('overview');
  for (const id of ['sun', 'earth', 'saturn', 'jupiter', 'pluto']) {
    await focus(page, id);
    await shot(id);
  }

  // Sheet expanded (mobile) or the full panel (desktop).
  await focus(page, 'earth');
  if (mobile) {
    await page.locator('.panel-grab').click();
    await expect(page.locator('#app')).toHaveAttribute('data-sheet', 'expanded', {
      timeout: POLL,
    });
  }
  await shot('sheet-expanded');

  // Tour subtitle mid-way: start, skip to a planet stop, wait for the caption.
  await page.evaluate(() => (window as unknown as AppWindow).__app.overview());
  await page.evaluate(() => (window as unknown as AppWindow).__app.setTimeScale(5));
  await page.getByTestId('tour').click();
  // Skip to a planet stop (Venus), then wait for the caption text of that stop.
  for (let i = 0; i < 3; i++) {
    await page.getByTestId('tour-next').click();
    await page.waitForTimeout(500);
  }
  await expect(page.getByTestId('subtitles')).toHaveText(/\S/, {
    timeout: 150_000,
  });
  await shot('tour-subtitle');
  await page.getByTestId('tour-exit').click();

  await page.getByTestId('credits').click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: POLL });
  await shot('credits');
});

test('Vietnamese title next to the control cluster', async ({ page }, info) => {
  await boot(page, 'vi');
  await page.waitForTimeout(2_000);
  await page.evaluate(() => (window as unknown as AppWindow).__app.setTimeScale(0));
  await page.waitForTimeout(1_000);
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-vi-overview.png`,
    scale: 'css',
    animations: 'disabled',
  });
  const title = (await page.getByTestId('title').boundingBox())!;
  for (const id of ['tour', 'lang', 'sound', 'credits']) {
    const b = (await page.getByTestId(id).boundingBox())!;
    const overlap =
      title.x < b.x + b.width &&
      b.x < title.x + title.width &&
      title.y < b.y + b.height &&
      b.y < title.y + title.height;
    expect(overlap, `title overlaps ${id}`).toBe(false);
  }
});
