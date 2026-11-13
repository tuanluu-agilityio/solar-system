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
});
