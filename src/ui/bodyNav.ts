import { moonDisplay } from '../config/scale';
import { BODIES } from '../data/bodies';
import { getContent } from '../data/content';
import { NAV_ORDER } from '../data/navOrder';
import type { BodyId, ContentId } from '../data/types';
import { t } from '../i18n/i18n';
import type { AppState } from '../state/appState';
import type { Store } from '../state/store';
import { DEEP_SPACE_URL } from './credits';
import { isTourActive } from './tourControls';

// Neutral dots for the entries that draw no orbit ribbon (presentation only, not body data).
const NEUTRAL_DOTS: Partial<Record<ContentId, string>> = {
  sun: '#ffc857',
  moon: '#b9bfcc',
  'asteroid-belt': '#8d8479',
};
const FALLBACK_DOT = '#9aa6bd';

/** Colour dot for a body: its orbit colour, a moon its planet's, else a neutral tone. */
export function navDot(id: ContentId): string {
  const neutral = NEUTRAL_DOTS[id];
  if (neutral) return neutral;
  if (id !== 'asteroid-belt') {
    const def = BODIES[id];
    const c = def.orbitColor ?? (def.parent !== null ? BODIES[def.parent].orbitColor : undefined);
    if (c) return c;
  }
  return FALLBACK_DOT;
}

/**
 * The planet whose moons the strip lists for `selected`: the planet itself or a moon's planet.
 * Moons hidden from the overview (all but Earth's Moon) show only for that planet.
 */
function moonHost(selected: ContentId | null): ContentId | null {
  if (selected === null || selected === 'asteroid-belt') return null;
  const def = BODIES[selected];
  return def.kind === 'moon' ? def.parent : selected;
}

function isDiscoveredMoon(id: ContentId): id is BodyId {
  return id !== 'asteroid-belt' && BODIES[id].kind === 'moon' && !moonDisplay(id).overview;
}

/**
 * Body navigator: a compact strip of every body in `NAV_ORDER`, the current target marked
 * with `aria-current`. A planet's moons (other than Earth's Moon) appear as smaller chips
 * after it only while the planet or one of its moons is the target. On phones it shows only in the overview (the bottom sheet and the tour
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
    b.className = isDiscoveredMoon(id) ? 'nav-item nav-moon' : 'nav-item';
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
  // After the last body: the way onward, to the companion project beyond the Solar System.
  const beyond = document.createElement('a');
  beyond.className = 'nav-item nav-beyond';
  beyond.href = DEEP_SPACE_URL;
  beyond.target = '_blank';
  beyond.rel = 'noopener noreferrer';
  beyond.setAttribute('data-testid', 'nav-beyond');
  const beyondName = document.createElement('span');
  beyondName.className = 'nav-name';
  beyond.append(beyondName);
  nav.append(beyond);
  root.append(nav);

  let lang = '';
  let current: ContentId | null | undefined;
  const render = (): void => {
    const s = store.get();
    nav.setAttribute('aria-label', t(s.lang, 'nav.label'));
    if (s.lang !== lang) {
      lang = s.lang;
      beyondName.textContent = t(s.lang, 'beyond.link');
      beyond.title = t(s.lang, 'beyond.hint');
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
      const host = moonHost(s.selected);
      for (const [id, b] of buttons) {
        if (isDiscoveredMoon(id)) b.hidden = BODIES[id].parent !== host;
      }
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
