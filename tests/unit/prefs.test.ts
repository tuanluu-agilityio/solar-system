import { describe, expect, it } from 'vitest';
import { detectLang, loadPrefs, savePref, PREF_KEYS, type KeyValueStorage } from '../../src/state/prefs';

function mem(init: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...init };
  return {
    data,
    getItem: (k) => (k in data ? (data[k] as string) : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}
const throwing: KeyValueStorage = {
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('quota');
  },
};

describe('detectLang', () => {
  it('vi when any entry starts with vi', () => expect(detectLang(['vi-VN', 'en'])).toBe('vi'));
  it('vi when vi is not first', () => expect(detectLang(['en-US', 'vi'])).toBe('vi'));
  it('en otherwise', () => expect(detectLang(['en-US'])).toBe('en'));
  it('en for empty', () => expect(detectLang([])).toBe('en'));
});

describe('loadPrefs', () => {
  it('defaults with empty storage', () => {
    expect(loadPrefs(mem(), ['vi'])).toEqual({ lang: 'vi', muted: true, tourSeen: false });
  });
  it('stored muted=false', () => {
    expect(loadPrefs(mem({ [PREF_KEYS.muted]: 'false' }), ['en']).muted).toBe(false);
  });
  it('stored tourSeen=true and lang=en', () => {
    const p = loadPrefs(mem({ [PREF_KEYS.tourSeen]: 'true', [PREF_KEYS.lang]: 'en' }), ['vi']);
    expect(p).toEqual({ lang: 'en', muted: true, tourSeen: true });
  });
  it('invalid stored lang falls back to detected', () => {
    expect(loadPrefs(mem({ [PREF_KEYS.lang]: 'xx' }), ['vi']).lang).toBe('vi');
  });
  it('throwing storage yields defaults', () => {
    expect(loadPrefs(throwing, ['en'])).toEqual({ lang: 'en', muted: true, tourSeen: false });
  });
  it('null storage yields defaults', () => {
    expect(loadPrefs(null, ['vi'])).toEqual({ lang: 'vi', muted: true, tourSeen: false });
  });
});

describe('savePref', () => {
  it('writes string values', () => {
    const s = mem();
    savePref(s, 'muted', false);
    savePref(s, 'lang', 'en');
    expect(s.data['sse.muted']).toBe('false');
    expect(s.data['sse.lang']).toBe('en');
  });
  it('does not throw when setItem throws', () => {
    expect(() => savePref(throwing, 'muted', true)).not.toThrow();
  });
  it('does not throw with null storage', () => {
    expect(() => savePref(null, 'tourSeen', true)).not.toThrow();
  });
});
