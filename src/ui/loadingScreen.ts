import { t } from '../i18n/i18n';
import type { Lang } from '../data/types';

export interface LoadingScreen {
  setProgress(fraction: number): void;
  hide(): void;
}

export function percent(fraction: number): number {
  if (!Number.isFinite(fraction)) return 0;
  return Math.round(Math.min(1, Math.max(0, fraction)) * 100);
}

export function createLoadingScreen(parent: HTMLElement, lang: Lang): LoadingScreen {
  const root = document.createElement('div');
  root.id = 'loading-screen';
  root.setAttribute('role', 'status');
  const label = document.createElement('p');
  label.className = 'loading-label';
  label.textContent = t(lang, 'loading');
  const bar = document.createElement('div');
  bar.className = 'loading-bar';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  const fill = document.createElement('div');
  fill.className = 'loading-fill';
  bar.append(fill);
  const pct = document.createElement('p');
  pct.className = 'loading-percent';
  root.append(label, bar, pct);
  parent.append(root);

  const set = (f: number): void => {
    const p = percent(f);
    fill.style.width = `${p}%`;
    bar.setAttribute('aria-valuenow', String(p));
    pct.textContent = `${p}%`;
  };
  set(0);
  return {
    setProgress: set,
    hide() {
      root.hidden = true;
      root.remove();
    },
  };
}

export function showWebglUnsupported(parent: HTMLElement, lang: Lang): void {
  const el = document.createElement('div');
  el.id = 'webgl-unsupported';
  el.setAttribute('role', 'alert');
  el.textContent = t(lang, 'webglUnsupported');
  parent.append(el);
}

export function showBootError(parent: HTMLElement, lang: Lang): void {
  parent.querySelector('#loading-screen')?.remove();
  const el = document.createElement('div');
  el.id = 'boot-error';
  el.setAttribute('role', 'alert');
  el.textContent = t(lang, 'error.boot');
  parent.append(el);
}
