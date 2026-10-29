import { expect, test, type Page } from '@playwright/test';

type AppWindow = {
  __app: {
    getState(): { ready: boolean; selected: string | null; view: string };
    select(id: string): Promise<void>;
    overview(): Promise<void>;
    cameraTargetId(): string | null;
    projectBody(id: string): { x: number; y: number } | null;
  };
};

async function boot(page: Page): Promise<void> {
  await page.goto('./?e2e=1');
  await page.waitForFunction(
    () => (window as unknown as AppWindow).__app?.getState().ready === true,
    null,
    { timeout: 20_000 },
  );
}

const state = (page: Page) =>
  page.evaluate(() => {
    const s = (window as unknown as AppWindow).__app.getState();
    return { selected: s.selected, view: s.view };
  });

test('select focuses a body and overview returns to the overview', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    void (window as unknown as AppWindow).__app.select('saturn');
  });
  await expect
    .poll(() => state(page), { timeout: 5_000 })
    .toEqual({
      selected: 'saturn',
      view: 'focus',
    });
  await expect
    .poll(() => page.evaluate(() => (window as unknown as AppWindow).__app.cameraTargetId()), {
      timeout: 5_000,
    })
    .toBe('saturn');

  await page.evaluate(() => {
    void (window as unknown as AppWindow).__app.overview();
  });
  await expect
    .poll(() => state(page), { timeout: 5_000 })
    .toEqual({
      selected: null,
      view: 'overview',
    });
  await expect
    .poll(() => page.evaluate(() => (window as unknown as AppWindow).__app.cameraTargetId()))
    .toBeNull();
});

test('re-selecting mid-flight ends focused on the latest body (Review Focus 2)', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => {
    const app = (window as unknown as AppWindow).__app;
    void app.select('mars');
    void app.select('jupiter');
  });
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const app = (window as unknown as AppWindow).__app;
          return { selected: app.getState().selected, camera: app.cameraTargetId() };
        }),
      { timeout: 25_000 },
    )
    .toEqual({ selected: 'jupiter', camera: 'jupiter' });
  // Still on Jupiter after the first flight would have finished.
  await page.waitForTimeout(3_000);
  expect(await page.evaluate(() => (window as unknown as AppWindow).__app.cameraTargetId())).toBe(
    'jupiter',
  );
});

test('a real tap on the projected position of Jupiter selects it', async ({ page }) => {
  await boot(page);
  const hasTouch = Boolean((test.info().project.use as { hasTouch?: boolean }).hasTouch);
  // Software GL under parallel load can stall a frame between pointerdown and pointerup
  // past the 350 ms tap limit, so a tap that was not recognised is retried.
  await expect(async () => {
    const p = await page.evaluate(() =>
      (window as unknown as AppWindow).__app.projectBody('jupiter'),
    );
    expect(p).not.toBeNull();
    if (hasTouch) {
      await page.touchscreen.tap(p!.x, p!.y);
    } else {
      // Hover first, as a user does; the hover label must not swallow the click.
      await page.mouse.move(p!.x, p!.y);
      await page.waitForTimeout(300);
      await page.mouse.click(p!.x, p!.y);
    }
    await expect
      .poll(() => state(page), { timeout: 3_000 })
      .toEqual({ selected: 'jupiter', view: 'focus' });
  }).toPass({ timeout: 30_000 });
});
