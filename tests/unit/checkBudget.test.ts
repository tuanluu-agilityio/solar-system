// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(__dirname, '../../scripts/check-budget.mjs');
const KB = 1024;
const MB = 1024 * KB;

let dirs: string[] = [];

function put(root: string, rel: string, data: string | Buffer): void {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
}

/** A minimal built site: one JS chunk, CSS, index.html, a texture manifest with low/high sets. */
function fakeDist(opts: { jsBytes?: number; lowTextureBytes?: number } = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'sse-budget-'));
  dirs.push(root);
  // Random bytes do not compress, so gzip size is close to the raw size.
  put(root, 'assets/index-abc.js', randomBytes(opts.jsBytes ?? 10 * KB));
  put(root, 'assets/index-abc.css', 'body{margin:0}');
  put(root, 'index.html', '<!doctype html><title>x</title>');
  put(root, 'textures/low/earth_day.webp', randomBytes(opts.lowTextureBytes ?? 100 * KB));
  put(root, 'textures/low/sky_2048.webp', randomBytes(20 * KB));
  put(root, 'textures/high/earth_day.webp', randomBytes(9 * MB)); // lazy: never counted
  put(
    root,
    'textures/manifest.json',
    JSON.stringify({
      low: {
        earth_day: 'textures/low/earth_day.webp',
        sky_2048: 'textures/low/sky_2048.webp',
      },
      high: { earth_day: 'textures/high/earth_day.webp' },
    }),
  );
  return root;
}

function run(dist: string): { status: number | null; out: string } {
  const r = spawnSync(process.execPath, [SCRIPT, '--dist', dist], { encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

describe('scripts/check-budget.mjs', () => {
  it('passes a small build, prints a table and ignores high textures', () => {
    const { status, out } = run(fakeDist());
    expect(status).toBe(0);
    expect(out).toMatch(/JS \(gzip\)/);
    expect(out).toMatch(/Initial payload/);
    expect(out).toContain('textures/low/earth_day.webp');
    expect(out).toContain('textures/low/sky_2048.webp');
    expect(out).not.toContain('textures/high/');
    expect(out).toMatch(/PASS/);
  });

  it('fails when the gzip JS exceeds 800 KB', () => {
    const { status, out } = run(fakeDist({ jsBytes: 850 * KB }));
    expect(status).toBe(1);
    expect(out).toMatch(/JS \(gzip\).*FAIL/);
  });

  it('fails when the initial payload exceeds 8 MB', () => {
    const { status, out } = run(fakeDist({ lowTextureBytes: 8 * MB }));
    expect(status).toBe(1);
    expect(out).toMatch(/Initial payload.*FAIL/);
  });

  it('fails clearly when there is no build', () => {
    const { status, out } = run(join(tmpdir(), 'sse-budget-missing-dir'));
    expect(status).toBe(1);
    expect(out).toMatch(/npm run build/);
  });
});
