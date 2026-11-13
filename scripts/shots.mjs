// Real-GPU screenshots for visual iteration (not a test): drives a running dev or preview
// server through the `?e2e` API and saves PNGs. Unlike `npm run test:visual` (SwiftShader,
// about 1.5 fps) this uses the machine's GPU, so shaders can be judged at full quality.
//
//   node scripts/shots.mjs --url http://localhost:5173/ --out <dir> [--views overview,sun,earth]
//        [--quality high] [--size 1280x720] [--mobile] [--headed] [--settle 2500] [--close 1]
//        [--lang de] [--click settings,quality-low] [--tag popover]
//
// `--lang <code>` sets `sse.lang`; `--click <testid,...>` clicks those elements (in order) before
// each shot and `--tag` is appended to the file name (for popover or open-state shots).
// `--close <factor>` dollies in after arriving (wheel steps), for close-up detail shots.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, devices } from '@playwright/test';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}

const url = String(arg('url', 'http://localhost:5173/'));
const out = String(arg('out', 'shots'));
const views = String(arg('views', 'overview,sun,earth,saturn,jupiter')).split(',');
const quality = arg('quality', null);
const [w, h] = String(arg('size', '1280x720')).split('x').map(Number);
const mobile = arg('mobile', false) === true;
const settle = Number(arg('settle', 2500));
const close = Number(arg('close', 0));
const lang = String(arg('lang', 'en'));
const clicks = String(arg('click', '')).split(',').filter(Boolean);
const tag = String(arg('tag', ''));
const prefix = String(arg('prefix', mobile ? 'mobile' : 'desktop'));

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: arg('headed', false) !== true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext(
  mobile
    ? { ...devices['iPhone 13'], defaultBrowserType: undefined }
    : { viewport: { width: w, height: h }, deviceScaleFactor: 1 },
);
const page = await context.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
await page.addInitScript((lang) => {
  localStorage.setItem('sse.lang', lang);
  localStorage.setItem('sse.tourSeen', 'true');
}, lang);
const q = quality ? `&quality=${quality}` : '';
await page.goto(`${url}?e2e=1${q}`);
await page.waitForFunction(() => window.__app?.getState().ready === true, null, {
  timeout: 90_000,
});
const renderer = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const ext = gl?.getExtension('WEBGL_debug_renderer_info');
  return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown';
});
console.log(`renderer: ${renderer}`);
await page.waitForTimeout(1500);

for (const view of views) {
  if (view === 'overview') await page.evaluate(() => window.__app.overview());
  else await page.evaluate((id) => window.__app.select(id), view);
  await page.waitForTimeout(settle + 2500);
  if (close > 0 && view !== 'overview') {
    await page.mouse.move(w * 0.6, h * 0.5);
    for (let i = 0; i < close; i++) await page.mouse.wheel(0, -400);
    await page.waitForTimeout(1500);
  }
  const fps = await page.evaluate(
    () =>
      new Promise((done) => {
        let frames = 0;
        let start = 0;
        const tick = (t) => {
          if (start === 0) start = t;
          else frames++;
          if (t - start >= 1000) done(Math.round((frames * 1000) / (t - start)));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
  for (const id of clicks) {
    await page.locator(`[data-testid="${id}"]`).click();
    await page.waitForTimeout(500);
  }
  const file = join(
    out,
    `${prefix}-${view}${close > 0 ? '-close' : ''}${tag ? `-${tag}` : ''}.png`,
  );
  await page.screenshot({ path: file, scale: 'css' });
  for (const id of [...clicks].reverse()) {
    // Leave the page as it was for the next view (toggles and popovers close again).
    if (id === 'settings') await page.keyboard.press('Escape');
  }
  console.log(
    `${file}  (${fps} fps, tier ${await page.evaluate(() => window.__app.getState().quality)})`,
  );
}
if (errors.length) console.log(`console issues:\n${[...new Set(errors)].join('\n')}`);
await browser.close();
