import type { Lang } from '../data/types';

export interface KeyValueStorage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
export interface Prefs {
  lang: Lang;
  muted: boolean;
  tourSeen: boolean;
}
export const PREF_KEYS = {
  lang: 'sse.lang',
  muted: 'sse.muted',
  tourSeen: 'sse.tourSeen',
} as const;

export function detectLang(languages: readonly string[]): Lang {
  return languages.some((l) => l.toLowerCase().startsWith('vi')) ? 'vi' : 'en';
}

function read(storage: KeyValueStorage | null, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function loadPrefs(storage: KeyValueStorage | null, languages: readonly string[]): Prefs {
  const storedLang = read(storage, PREF_KEYS.lang);
  const lang: Lang =
    storedLang === 'vi' || storedLang === 'en' ? storedLang : detectLang(languages);
  return {
    lang,
    muted: read(storage, PREF_KEYS.muted) !== 'false',
    tourSeen: read(storage, PREF_KEYS.tourSeen) === 'true',
  };
}

export function savePref<K extends keyof Prefs>(
  storage: KeyValueStorage | null,
  key: K,
  value: Prefs[K],
): void {
  if (!storage) return;
  try {
    storage.setItem(PREF_KEYS[key], String(value));
  } catch {
    // storage unavailable or full: ignore
  }
}
