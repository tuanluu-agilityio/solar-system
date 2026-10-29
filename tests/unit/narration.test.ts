import { describe, expect, it } from 'vitest';
import {
  cueAt,
  estimateDurationMs,
  resolveSegment,
  type Cue,
  type NarrationManifest,
} from '../../src/tour/narration';

const CUES: Cue[] = [
  { startMs: 0, endMs: 1000, text: 'One.' },
  { startMs: 1000, endMs: 2500, text: 'Two.' },
];

describe('cueAt', () => {
  it('is start-inclusive', () => {
    expect(cueAt(CUES, 0)?.text).toBe('One.');
    expect(cueAt(CUES, 1000)?.text).toBe('Two.');
  });

  it('is end-exclusive', () => {
    expect(cueAt(CUES, 999)?.text).toBe('One.');
    expect(cueAt(CUES, 2499)?.text).toBe('Two.');
  });

  it('returns null at or past the last end', () => {
    expect(cueAt(CUES, 2500)).toBeNull();
    expect(cueAt(CUES, 9999)).toBeNull();
  });

  it('returns null before the first start and for empty cues', () => {
    expect(cueAt(CUES, -1)).toBeNull();
    expect(cueAt([], 0)).toBeNull();
  });
});

describe('estimateDurationMs', () => {
  it('uses 400 ms per word', () => {
    const words = Array.from({ length: 20 }, () => 'word').join(' ');
    expect(estimateDurationMs(words)).toBe(8000);
  });

  it('has a 4000 ms minimum', () => {
    expect(estimateDurationMs('Hi there')).toBe(4000);
    expect(estimateDurationMs('')).toBe(4000);
  });

  it('counts words separated by any whitespace', () => {
    const text = Array.from({ length: 12 }, () => 'w').join('\n  ');
    expect(estimateDurationMs(text)).toBe(4800);
  });
});

describe('resolveSegment', () => {
  const TEXT = 'Saturn has rings. They are made of ice! Are they old?';
  const MANIFEST: NarrationManifest = {
    version: 1,
    segments: {
      saturn: {
        vi: {
          file: 'audio/narration/saturn.vi.mp3',
          durationMs: 12000,
          cues: [{ startMs: 0, endMs: 12000, text: 'Saturn has rings.' }],
        },
      },
    } as NarrationManifest['segments'],
  };

  it('returns the manifest segment with audio:true when present', () => {
    const seg = resolveSegment(MANIFEST, 'saturn', 'vi', TEXT);
    expect(seg).toEqual({
      file: 'audio/narration/saturn.vi.mp3',
      durationMs: 12000,
      cues: [{ startMs: 0, endMs: 12000, text: 'Saturn has rings.' }],
      audio: true,
    });
  });

  it('falls back to subtitle-only when the manifest is null', () => {
    const seg = resolveSegment(null, 'saturn', 'vi', TEXT);
    expect(seg.audio).toBe(false);
    expect(seg.durationMs).toBe(estimateDurationMs(TEXT));
    expect(seg.cues.map((c) => c.text)).toEqual([
      'Saturn has rings.',
      'They are made of ice!',
      'Are they old?',
    ]);
  });

  it('falls back when the language entry is missing', () => {
    const seg = resolveSegment(MANIFEST, 'saturn', 'en', TEXT);
    expect(seg.audio).toBe(false);
    expect(seg.durationMs).toBe(estimateDurationMs(TEXT));
    expect(seg.cues).toHaveLength(3);
  });

  it('splits cues proportionally to sentence length, contiguous and covering', () => {
    const seg = resolveSegment(null, 'saturn', 'vi', TEXT);
    const duration = seg.durationMs;
    expect(seg.cues[0]?.startMs).toBe(0);
    expect(seg.cues[seg.cues.length - 1]?.endMs).toBe(duration);
    for (let i = 1; i < seg.cues.length; i++) {
      expect(seg.cues[i]?.startMs).toBe(seg.cues[i - 1]?.endMs);
    }
    // Sentence lengths are 17 + 21 + 13 = 51 characters, so the first cue
    // covers 17/51 of the duration.
    expect(seg.cues[0]?.endMs).toBe(Math.round((duration * 17) / 51));
  });

  it('returns no cues for empty script text', () => {
    const seg = resolveSegment(null, 'saturn', 'en', '   ');
    expect(seg.cues).toEqual([]);
    expect(seg.audio).toBe(false);
  });
});
