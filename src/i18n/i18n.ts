import type { Lang } from '../data/types';
import { UI_STRINGS, type UiKey } from './strings';

export function t(lang: Lang, key: UiKey, params?: Record<string, string | number>): string {
  const s = UI_STRINGS[lang][key];
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    return v === undefined ? m : String(v);
  });
}

export function formatNumber(lang: Lang, value: number, maxFractionDigits = 0): string {
  return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}
