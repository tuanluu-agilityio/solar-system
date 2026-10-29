import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { NarrationManifest } from '../../src/tour/narration';

const PUBLIC_DIR = resolve(__dirname, '../../public');
const MANIFEST_PATH = resolve(PUBLIC_DIR, 'audio/narration/manifest.json');
const STOP_IDS = [
  'intro',
  'sun',
  'mercury',
  'venus',
  'earth',
  'moon',
  'mars',
  'asteroid-belt',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
  'outro',
];
const LANGS = ['vi', 'en'] as const;

// The generated assets are build inputs committed to git. This suite only runs
// meaningful checks once the manifest exists (after `npm run narration`).
describe.runIf(existsSync(MANIFEST_PATH))('narration assets', () => {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as NarrationManifest;

  it('has every stop in both languages', () => {
    expect(manifest.version).toBe(1);
    expect(Object.keys(manifest.segments).sort()).toEqual([...STOP_IDS].sort());
    for (const id of STOP_IDS) {
      for (const lang of LANGS) {
        expect(
          manifest.segments[id as keyof typeof manifest.segments]?.[lang],
          `${id}.${lang}`,
        ).toBeDefined();
      }
    }
  });

  it('references an existing mp3 with a 10-50 s duration for every entry', () => {
    for (const id of STOP_IDS) {
      for (const lang of LANGS) {
        const seg = manifest.segments[id as keyof typeof manifest.segments]?.[lang];
        expect(seg, `${id}.${lang}`).toBeDefined();
        if (!seg) continue;
        expect(existsSync(resolve(PUBLIC_DIR, seg.file)), seg.file).toBe(true);
        expect(seg.file.endsWith('.mp3'), seg.file).toBe(true);
        expect(seg.durationMs, `${id}.${lang}`).toBeGreaterThanOrEqual(10000);
        expect(seg.durationMs, `${id}.${lang}`).toBeLessThanOrEqual(50000);
      }
    }
  });

  it('has contiguous cues that cover the segment', () => {
    for (const id of STOP_IDS) {
      for (const lang of LANGS) {
        const seg = manifest.segments[id as keyof typeof manifest.segments]?.[lang];
        if (!seg) continue;
        const cues = seg.cues;
        expect(cues.length, `${id}.${lang} cues`).toBeGreaterThan(0);
        expect(cues[0]?.startMs, `${id}.${lang} first`).toBe(0);
        for (let i = 1; i < cues.length; i++) {
          expect(cues[i]?.startMs, `${id}.${lang} cue ${i}`).toBe(cues[i - 1]?.endMs);
        }
        expect(cues[cues.length - 1]?.endMs, `${id}.${lang} last`).toBe(seg.durationMs);
      }
    }
  });
});
