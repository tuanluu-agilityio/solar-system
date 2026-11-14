import { t } from '../i18n/i18n';
import type { AppState } from '../state/appState';
import type { Store } from '../state/store';

export const TEXTURES_URL = 'https://www.solarsystemscope.com/textures/';
/** USGS Astrogeology map search: the public-domain global mosaics used for the moons. */
export const MOON_MAPS_URL = 'https://astrogeology.usgs.gov/search';

/** The author's companion project: a 3D voyage beyond the Solar System. */
export const DEEP_SPACE_URL = 'https://deep-space-odyssey.netlify.app/';

export interface Credits {
  open(): void;
  close(): void;
  dispose(): void;
}

/** Credits modal: the three required credits, the moon maps and a close button. Text follows `store.lang`. */
export function createCredits(root: HTMLElement, store: Store<AppState>): Credits {
  const overlay = document.createElement('div');
  overlay.className = 'credits-overlay';
  overlay.hidden = true;
  const dialog = document.createElement('div');
  dialog.className = 'credits-dialog glass';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  const title = document.createElement('h2');
  title.className = 'credits-title';
  const list = document.createElement('ul');
  list.className = 'credits-list';
  const support = document.createElement('a');
  support.className = 'credits-support';
  support.href = 'https://me.momo.vn/bbk9x';
  support.target = '_blank';
  support.rel = 'noopener noreferrer';
  support.setAttribute('data-testid', 'credits-support');
  const beyond = document.createElement('a');
  beyond.className = 'credits-support credits-beyond';
  beyond.href = DEEP_SPACE_URL;
  beyond.target = '_blank';
  beyond.rel = 'noopener noreferrer';
  beyond.setAttribute('data-testid', 'credits-beyond');
  const textures = document.createElement('li');
  const textureLink = document.createElement('a');
  textureLink.href = TEXTURES_URL;
  textureLink.target = '_blank';
  textureLink.rel = 'noopener noreferrer';
  textures.append(textureLink);
  const moonMaps = document.createElement('li');
  const moonMapsLink = document.createElement('a');
  moonMapsLink.href = MOON_MAPS_URL;
  moonMapsLink.target = '_blank';
  moonMapsLink.rel = 'noopener noreferrer';
  moonMaps.append(moonMapsLink);
  const data = document.createElement('li');
  const voice = document.createElement('li');
  list.append(textures, moonMaps, data, voice);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'ctl-btn glass credits-close';
  close.setAttribute('data-testid', 'credits-close');
  dialog.append(title, list, beyond, support, close);
  overlay.append(dialog);
  root.append(overlay);

  const render = (): void => {
    const { lang } = store.get();
    dialog.setAttribute('aria-label', t(lang, 'credits.title'));
    title.textContent = t(lang, 'credits.title');
    textureLink.textContent = t(lang, 'credits.textures');
    moonMapsLink.textContent = t(lang, 'credits.moonMaps');
    data.textContent = t(lang, 'credits.data');
    voice.textContent = t(lang, 'credits.voice');
    beyond.textContent = t(lang, 'beyond.link');
    beyond.title = t(lang, 'beyond.hint');
    support.textContent = t(lang, 'credits.support');
    close.textContent = t(lang, 'credits.close');
  };
  render();

  let opener: Element | null = null;
  const hide = (): void => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    if (opener instanceof HTMLElement) opener.focus();
    opener = null;
  };
  const show = (): void => {
    opener = document.activeElement;
    overlay.hidden = false;
    close.focus();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') hide();
  };
  const onOverlayClick = (e: MouseEvent): void => {
    if (e.target === overlay) hide();
  };
  close.addEventListener('click', hide);
  overlay.addEventListener('click', onOverlayClick);
  window.addEventListener('keydown', onKey);
  const unsub = store.subscribe((s, prev) => {
    if (s.lang !== prev.lang) render();
  });

  return {
    open: show,
    close: hide,
    dispose() {
      unsub();
      window.removeEventListener('keydown', onKey);
      overlay.remove();
    },
  };
}
