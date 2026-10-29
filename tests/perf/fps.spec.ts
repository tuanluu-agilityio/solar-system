import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { isSoftwareRenderer } from '../../src/quality/runtime';

// Task 29 / spec §11.4: average FPS over 10 s in overview and 10 s focused on Saturn, per project.
// Results merge into docs/perf-results.json (one section per project). Targets are asserted only
// when the renderer is a real GPU; software numbers are informational.

type AppWindow = {
  __app: {
    getState(): { ready: boolean; quality: string };
    select(id: string): Promise<void>;
    cameraTargetId(): string | null;
    pixelRatio(): number;
  };
};

interface Section {
  overview: number;
  saturn: number;
  qualityStart: string;
  qualityEnd: string;
  pixelRatio: number;
  viewport: { width: number; height: number };
  cpuThrottle: number;
  measuredAt: string;
}

interface Results {
  renderer: string;
  gpu: boolean;
  mobile?: Section;
  desktop?: Section;
}

const RESULTS = 'docs/perf-results.json';
const MEASURE_MS = 10_000;
const TARGET = { mobile: 30, desktop: 55 } as const;

async function rendererString(page: Page): Promise<string> {
  return page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'no webgl2';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(
      ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    );
  });
}

/** Average requestAnimationFrame rate over `ms` (the app's loop renders once per rAF). */
async function averageFps(page: Page, ms: number): Promise<number> {
  const fps = await page.evaluate(
    (duration) =>
      new Promise<number>((done) => {
        let frames = 0;
        let start = 0;
        const tick = (t: number): void => {
          if (start === 0) start = t;
          else frames++;
          if (t - start >= duration) done((frames * 1000) / (t - start));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
  return Math.round(fps * 10) / 10;
}

test('average FPS in overview and focused on Saturn', async ({ page }, info) => {
  const kind = info.project.name === 'mobile-throttled' ? 'mobile' : 'desktop';
  const cpuThrottle = kind === 'mobile' ? 4 : 1;

  await page.addInitScript(() => localStorage.setItem('sse.tourSeen', 'true'));
  if (cpuThrottle > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });
  }
  // PERF_QUALITY=low|medium|high forces a tier (diagnostics); default is the app's own pick.
  const forced = process.env.PERF_QUALITY;
  await page.goto(forced ? `./?e2e=1&quality=${forced}` : './?e2e=1');
  await page.waitForFunction(
    () => (window as unknown as AppWindow).__app?.getState().ready === true,
    null,
    { timeout: 120_000 },
  );

  const renderer = await rendererString(page);
  const gpu = !isSoftwareRenderer(renderer);
  const qualityStart = await page.evaluate(
    () => (window as unknown as AppWindow).__app.getState().quality,
  );

  await page.waitForTimeout(5_000); // let textures upload, shaders compile and the loop settle
  const overview = await averageFps(page, MEASURE_MS);

  await page.evaluate(() => (window as unknown as AppWindow).__app.select('saturn'));
  await expect
    .poll(() => page.evaluate(() => (window as unknown as AppWindow).__app.cameraTargetId()), {
      timeout: 120_000,
    })
    .toBe('saturn');
  await page.waitForTimeout(4_000); // flight finishes (about 2 s on a GPU) and high-res maps land
  const saturn = await averageFps(page, MEASURE_MS);

  const qualityEnd = await page.evaluate(
    () => (window as unknown as AppWindow).__app.getState().quality,
  );
  const pixelRatio = await page.evaluate(
    () => Math.round((window as unknown as AppWindow).__app.pixelRatio() * 100) / 100,
  );

  const previous: Partial<Results> = existsSync(RESULTS)
    ? (JSON.parse(readFileSync(RESULTS, 'utf8')) as Partial<Results>)
    : {};
  const results: Results = {
    ...previous,
    renderer,
    gpu,
    [kind]: {
      overview,
      saturn,
      qualityStart,
      qualityEnd,
      pixelRatio,
      viewport: page.viewportSize() ?? { width: 0, height: 0 },
      cpuThrottle,
      measuredAt: new Date().toISOString(),
    } satisfies Section,
  };
  writeFileSync(RESULTS, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`[perf] ${kind}: ${JSON.stringify(results[kind])} renderer=${renderer} gpu=${gpu}`);

  if (gpu) {
    expect.soft(overview, `${kind} overview FPS`).toBeGreaterThanOrEqual(TARGET[kind]);
    expect.soft(saturn, `${kind} Saturn FPS`).toBeGreaterThanOrEqual(TARGET[kind]);
  }
});
