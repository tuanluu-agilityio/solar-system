import { afterEach, describe, expect, it, vi } from 'vitest';
import { BODIES } from '../../src/data/bodies';
import { NAV_ORDER } from '../../src/data/navOrder';
import { createStore } from '../../src/state/store';
import type { AppState } from '../../src/state/appState';
import { initialTour } from '../../src/tour/tourMachine';
import { createBodyNav, navDot } from '../../src/ui/bodyNav';

function setup(patch: Partial<AppState> = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  const store = createStore<AppState>({
    lang: 'en',
    muted: true,
    selected: null,
    view: 'overview',
    layout: 'desktop',
    quality: 'high',
    tour: initialTour(3),
    ready: true,
    ...patch,
  });
  const onSelect = vi.fn();
  createBodyNav(root, store, onSelect);
  const nav = root.querySelector<HTMLElement>('[data-testid="body-nav"]')!;
  return { root, store, onSelect, nav };
}

describe('createBodyNav', () => {
  afterEach(() => document.body.replaceChildren());

  it('lists every NAV_ORDER body with its localized name', () => {
    const { nav, store } = setup();
    const items = [...nav.querySelectorAll('button')];
    expect(items.map((b) => b.getAttribute('data-testid'))).toEqual(
      NAV_ORDER.map((id) => `nav-${id}`),
    );
    expect(nav.querySelector('[data-testid="nav-earth"]')?.textContent).toBe('Earth');
    store.set({ lang: 'de' });
    expect(nav.querySelector('[data-testid="nav-earth"]')?.textContent).toBe('Erde');
    expect(nav.getAttribute('aria-label')).toBe('Himmelskörper');
  });

  it('selects through the callback on click', () => {
    const { nav, onSelect } = setup();
    nav.querySelector<HTMLButtonElement>('[data-testid="nav-mars"]')!.click();
    expect(onSelect).toHaveBeenCalledWith('mars');
  });

  it('marks only the current target with aria-current', () => {
    const { nav, store } = setup({ selected: 'earth', view: 'focus' });
    expect(nav.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
    expect(nav.querySelector('[data-testid="nav-earth"]')?.getAttribute('aria-current')).toBe(
      'true',
    );
    store.set({ selected: 'asteroid-belt' });
    expect(nav.querySelector('[data-testid="nav-earth"]')?.hasAttribute('aria-current')).toBe(
      false,
    );
    expect(
      nav.querySelector('[data-testid="nav-asteroid-belt"]')?.getAttribute('aria-current'),
    ).toBe('true');
    store.set({ selected: null, view: 'overview' });
    expect(nav.querySelector('[aria-current]')).toBeNull();
  });

  it('on desktop stays visible while focused and hides during a tour', () => {
    const { nav, store } = setup({ selected: 'earth', view: 'focus' });
    expect(nav.hidden).toBe(false);
    expect(nav.classList.contains('with-panel')).toBe(true);
    store.set({ tour: { ...store.get().tour, status: 'narrating' } });
    expect(nav.hidden).toBe(true);
  });

  it('on mobile shows only in the overview', () => {
    const { nav, store } = setup({ layout: 'mobile' });
    expect(nav.hidden).toBe(false);
    store.set({ selected: 'earth', view: 'focus' });
    expect(nav.hidden).toBe(true);
    store.set({ selected: null, view: 'overview' });
    expect(nav.hidden).toBe(false);
  });

  it('uses the orbit colour for planets and a neutral dot for the rest', () => {
    expect(navDot('earth')).toBe(BODIES.earth.orbitColor);
    for (const id of ['sun', 'moon', 'asteroid-belt'] as const) {
      expect(navDot(id)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  describe('moons', () => {
    const visibleIds = (nav: HTMLElement): string[] =>
      [...nav.querySelectorAll<HTMLButtonElement>('button')]
        .filter((b) => !b.hidden)
        .map((b) => b.dataset.testid!.slice(4));
    const PLANETS_AND_MORE = NAV_ORDER.filter(
      (id) => id === 'asteroid-belt' || id === 'moon' || BODIES[id].kind !== 'moon',
    );

    it('hides every moon but Earth’s in the overview', () => {
      const { nav } = setup();
      expect(visibleIds(nav)).toEqual(PLANETS_AND_MORE);
    });

    it('inserts a planet’s moons right after it while the planet is the target', () => {
      const { nav, store } = setup({ selected: 'jupiter', view: 'focus' });
      const shown = visibleIds(nav);
      const i = shown.indexOf('jupiter');
      expect(shown.slice(i + 1, i + 5)).toEqual(['io', 'europa', 'ganymede', 'callisto']);
      expect(shown).not.toContain('phobos');
      expect(shown).not.toContain('titan');
      const io = nav.querySelector<HTMLButtonElement>('[data-testid="nav-io"]')!;
      expect(io.classList.contains('nav-moon')).toBe(true);
      expect(io.textContent).toBe('Io');
      store.set({ selected: 'mars' });
      const mars = visibleIds(nav);
      expect(mars.slice(mars.indexOf('mars') + 1, mars.indexOf('mars') + 4)).toEqual([
        'phobos',
        'deimos',
        'asteroid-belt',
      ]);
      expect(mars).not.toContain('io');
    });

    it('keeps the moons while one of them is the target, and selects them on click', () => {
      const { nav, store, onSelect } = setup({ selected: 'titan', view: 'focus' });
      expect(visibleIds(nav)).toEqual(expect.arrayContaining(['saturn', 'enceladus', 'titan']));
      expect(nav.querySelector('[data-testid="nav-titan"]')?.getAttribute('aria-current')).toBe(
        'true',
      );
      nav.querySelector<HTMLButtonElement>('[data-testid="nav-enceladus"]')!.click();
      expect(onSelect).toHaveBeenCalledWith('enceladus');
      store.set({ selected: null, view: 'overview' });
      expect(visibleIds(nav)).toEqual(PLANETS_AND_MORE);
    });

    it('gives a moon its planet’s orbit colour as its dot', () => {
      expect(navDot('io')).toBe(BODIES.jupiter.orbitColor);
      expect(navDot('phobos')).toBe(BODIES.mars.orbitColor);
    });
  });
});
