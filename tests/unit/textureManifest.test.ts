import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const PUBLIC_DIR = resolve(__dirname, '../../public');
const KEYS = [
  'sun',
  'mercury',
  'venus_surface',
  'venus_atmosphere',
  'earth_day',
  'earth_night',
  'earth_clouds',
  'moon',
  'mars',
  'jupiter',
  'saturn',
  'saturn_ring',
  'uranus',
  'neptune',
  'pluto',
  'sky_2048',
  'sky_4096',
];
const SKY_LOW_ONLY = ['sky_2048'];
const SKY_HIGH_ONLY = ['sky_4096'];

type Manifest = { low: Record<string, string>; high: Record<string, string> };

function loadManifest(): Manifest {
  const path = resolve(PUBLIC_DIR, 'textures/manifest.json');
  return JSON.parse(readFileSync(path, 'utf8')) as Manifest;
}

describe('texture manifest', () => {
  it('lists every key in the right sets', () => {
    const m = loadManifest();
    for (const key of KEYS) {
      if (!SKY_HIGH_ONLY.includes(key)) expect(m.low[key], `low.${key}`).toBeTruthy();
      if (!SKY_LOW_ONLY.includes(key)) expect(m.high[key], `high.${key}`).toBeTruthy();
    }
    expect(m.high['sky_2048']).toBeUndefined();
    expect(m.low['sky_4096']).toBeUndefined();
  });

  it('references files that exist on disk', () => {
    const m = loadManifest();
    for (const set of [m.low, m.high]) {
      for (const rel of Object.values(set)) {
        expect(existsSync(resolve(PUBLIC_DIR, rel)), rel).toBe(true);
      }
    }
  });

  it('keeps low <= 2048 px and high <= 4096 px wide', async () => {
    const m = loadManifest();
    for (const [set, max] of [
      [m.low, 2048],
      [m.high, 4096],
    ] as const) {
      for (const rel of Object.values(set)) {
        const meta = await sharp(resolve(PUBLIC_DIR, rel)).metadata();
        expect(meta.width ?? Infinity, rel).toBeLessThanOrEqual(max);
      }
    }
  });

  it('keeps the low set plus sky_2048 within 5.5 MB', () => {
    const m = loadManifest();
    const total = Object.values(m.low).reduce(
      (sum, rel) => sum + statSync(resolve(PUBLIC_DIR, rel)).size,
      0,
    );
    expect(total).toBeLessThanOrEqual(5.5 * 1024 * 1024);
  });
});
