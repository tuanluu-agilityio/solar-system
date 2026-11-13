import { BODIES } from '../data/bodies';
import { getContent } from '../data/content';
import { NAV_ORDER } from '../data/navOrder';
import type { ContentId } from '../data/types';
import { t } from '../i18n/i18n';
import type { AppState } from '../state/appState';
import type { Store } from '../state/store';
import { isTourActive } from './tourControls';

// Neutral dots for the entries that draw no orbit ribbon (presentation only, not body data).
const NEUTRAL_DOTS: Partial<Record<ContentId, string>> = {
  sun: '#ffc857',
  moon: '#b9bfcc',
  'asteroid-belt': '#8d8479',
};
const FALLBACK_DOT = '#9aa6bd';

/** Colour dot for a body: its orbit colour, else a neutral tone. */
export function navDot(id: ContentId): string {
  if (id !== 'asteroid-belt') {
    const c = BODIES[id].orbitColor;
    if (c) return c;
  }
  return NEUTRAL_DOTS[id] ?? FALLBACK_DOT;
}

/**
 * Body navigator: a compact strip of every body in `NAV_ORDER`, the current target marked
 * with `aria-current`. On phones it shows only in the overview (the bottom sheet and the tour
 * dock need the space); on desktop it hides only while a tour runs.
 */
export function createBodyNav(
  root: HTMLElement,
  store: Store<AppState>,
  onSelect: (id: ContentId) => void,
): { dispose(): void } {
  const nav = document.createElement('nav');
  nav.className = 'body-nav glass';
  nav.setAttribute('data-testid', 'body-nav');
  const buttons = new Map<ContentId, HTMLButtonElement>();
  for (const id of NAV_ORDER) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nav-item';
    b.setAttribute('data-testid', `nav-${id}`);
    // The nav click selects with its own sound (userSelect); skip the generic button tick.
    b.dataset.sound = 'none';
    const dot = document.createElement('span');
    dot.className = 'nav-dot';
    dot.style.setProperty('--dot', navDot(id));
    dot.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.className = 'nav-name';
    b.append(dot, name);
    b.addEventListener('click', () => onSelect(id));
    buttons.set(id, b);
    nav.append(b);
  }
  root.append(nav);

  let lang = '';
  let current: ContentId | null | undefined;
  const render = (): void => {
    const s = store.get();
    nav.setAttribute('aria-label', t(s.lang, 'nav.label'));
    if (s.lang !== lang) {
      lang = s.lang;
      for (const [id, b] of buttons) {
        const name = getContent(id, s.lang).name;
        const label = b.querySelector('.nav-name');
        if (label) label.textContent = name;
      }
    }
    nav.hidden = isTourActive(s.tour.status) || (s.layout === 'mobile' && s.selected !== null);
    nav.classList.toggle('with-panel', s.layout === 'desktop' && s.selected !== null);
    if (s.selected !== current) {
      current = s.selected;
      for (const [id, b] of buttons) {
        if (id === s.selected) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      }
      const active = s.selected ? buttons.get(s.selected) : undefined;
      if (active && !nav.hidden) active.scrollIntoView?.({ inline: 'center', block: 'nearest' });
    }
  };
  render();
  const unsub = store.subscribe(render);
  return {
    dispose() {
      unsub();
      nav.remove();
    },
  };
}
