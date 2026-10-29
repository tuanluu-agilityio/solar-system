import { describe, expect, it } from 'vitest';
import { getContent } from '../../src/data/content';
import { TOUR_STOPS } from '../../src/data/tour/stops';
import en from '../../src/data/tour/en.json';
import vi from '../../src/data/tour/vi.json';
import type { ContentId, Lang } from '../../src/data/types';

const EXPECTED_IDS = [
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

type Script = Record<string, { text: string }>;
const SCRIPTS: Record<Lang, Script> = { vi, en };
const WORD_LIMITS: Record<Lang, [number, number]> = { vi: [60, 110], en: [50, 100] };
const LANGS: Lang[] = ['vi', 'en'];

function words(text: string): string[] {
  return text.trim().split(/\s+/);
}

function sentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+/g) ?? [];
}

describe('TOUR_STOPS', () => {
  it('has 14 stops in the spec order', () => {
    expect(TOUR_STOPS).toHaveLength(14);
    expect(TOUR_STOPS.map((s) => s.id)).toEqual(EXPECTED_IDS);
  });

  it('frames intro and outro on the overview and body stops on the body', () => {
    for (const stop of TOUR_STOPS) {
      const expected = stop.id === 'intro' || stop.id === 'outro' ? 'overview' : stop.id;
      expect(stop.focus).toBe(expected);
    }
  });
});

describe.each(LANGS)('tour script (%s)', (lang) => {
  const script = SCRIPTS[lang];
  const [min, max] = WORD_LIMITS[lang];

  it('has exactly the 14 stop keys', () => {
    expect(Object.keys(script).sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it.each(EXPECTED_IDS)('%s has a non-empty text within the word limits', (id) => {
    const text = script[id]?.text ?? '';
    const count = words(text).length;
    expect(count).toBeGreaterThanOrEqual(min);
    expect(count).toBeLessThanOrEqual(max);
  });

  it.each(EXPECTED_IDS)('%s has at least 2 sentences and ends with . ! or ?', (id) => {
    const text = (script[id]?.text ?? '').trim();
    expect(sentences(text).length).toBeGreaterThanOrEqual(2);
    expect(text).toMatch(/[.!?]$/);
  });

  it.each(EXPECTED_IDS)('%s is TTS-friendly (no markdown, emoji or unit symbols)', (id) => {
    const text = script[id]?.text ?? '';
    expect(text).not.toMatch(/[*_#`[\]<>|~]/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/[°%²³₂&]/);
    expect(text).not.toMatch(/\n/);
  });

  it.each(TOUR_STOPS.filter((s) => s.focus !== 'overview').map((s) => s.focus as ContentId))(
    '%s mentions the localized body name',
    (id) => {
      const text = script[id]?.text ?? '';
      const name = getContent(id, lang).name;
      expect(text.toLocaleLowerCase(lang)).toContain(name.toLocaleLowerCase(lang));
    },
  );
});
