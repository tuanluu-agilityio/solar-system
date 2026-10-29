import { afterEach, describe, expect, it, vi } from 'vitest';
import { BODIES } from '../../src/data/bodies';
import { createStore } from '../../src/state/store';
import type { AppState } from '../../src/state/appState';
import { initialTour } from '../../src/tour/tourMachine';
import { createInfoPanel, panelFields } from '../../src/ui/infoPanel';

const val = (id: keyof typeof BODIES, lang: 'vi' | 'en', key: string): string | undefined =>
  panelFields(BODIES[id], lang).find((f) => f.key === key)?.value;

describe('panelFields', () => {
  it('omits inapplicable fields for the Sun', () => {
    const keys = panelFields(BODIES.sun, 'en').map((f) => f.key);
    expect(keys).not.toContain('field.distance');
    expect(keys).not.toContain('field.orbitalPeriod');
    expect(keys).not.toContain('field.moons');
    expect(keys).toContain('field.diameter');
  });
  it('never emits N/A or undefined text', () => {
    for (const def of Object.values(BODIES)) {
      for (const f of panelFields(def, 'en')) expect(f.value).not.toMatch(/N\/A|undefined|NaN/);
    }
  });
  it('marks retrograde rotation in Vietnamese and English', () => {
    expect(val('venus', 'vi', 'field.rotationPeriod')).toContain('quay ngược');
    expect(val('venus', 'en', 'field.rotationPeriod')).toContain('retrograde');
    expect(val('uranus', 'en', 'field.rotationPeriod')).toContain('retrograde');
    expect(val('earth', 'en', 'field.rotationPeriod')).not.toContain('retrograde');
  });
  it('shows the Moon distance in km from Earth', () => {
    expect(val('moon', 'en', 'field.distanceEarth')).toBe('384,400 km');
    expect(val('moon', 'vi', 'field.distanceEarth')).toContain('384');
    expect(val('moon', 'en', 'field.distance')).toBeUndefined();
  });
  it('formats planet distance in million km', () => {
    expect(val('earth', 'en', 'field.distance')).toContain('million km');
    expect(val('earth', 'vi', 'field.distance')).toContain('triệu km');
  });
  it('uses days below 1000 and years above for the orbital period', () => {
    expect(val('mercury', 'en', 'field.orbitalPeriod')).toBe('88 days');
    expect(val('jupiter', 'en', 'field.orbitalPeriod')).toBe('11.9 years');
  });
  it('uses hours below 48 and days above for the rotation period', () => {
    expect(val('earth', 'en', 'field.rotationPeriod')).toBe('23.9 hours');
    expect(val('mercury', 'en', 'field.rotationPeriod')).toBe('58.7 days');
  });
  it('shows mass as a multiple of Earth with at most 3 significant digits', () => {
    expect(val('mercury', 'en', 'field.mass')).toBe('0.0553 × Earth');
    expect(val('jupiter', 'vi', 'field.mass')).toBe('318 × Trái Đất');
  });
  it('formats diameter, temperature, gravity and moons', () => {
    expect(val('earth', 'en', 'field.diameter')).toBe('12,756 km');
    expect(val('mars', 'en', 'field.moons')).toBe('2');
    expect(val('moon', 'en', 'field.meanTemp')).toBe('-20 °C');
    expect(val('mars', 'en', 'field.gravity')).toContain('m/s²');
  });
});

function makeStore(patch: Partial<AppState> = {}) {
  return createStore<AppState>({
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
}

describe('createInfoPanel', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  function setup(patch: Partial<AppState> = {}) {
    const root = document.createElement('div');
    document.body.append(root);
    const store = makeStore(patch);
    const onBack = vi.fn();
    const panel = createInfoPanel(root, store, onBack);
    const el = () => root.querySelector<HTMLElement>('[data-testid="panel"]')!;
    return { root, store, onBack, panel, el };
  }

  it('is hidden with no selection and shows the body when selected', () => {
    const { store, el } = setup();
    expect(el().hidden).toBe(true);
    store.set({ selected: 'earth', view: 'focus' });
    expect(el().hidden).toBe(false);
    expect(el().querySelector('h2')?.textContent).toBe('Earth');
  });

  it('re-renders on language change', () => {
    const { store, el } = setup({ selected: 'earth', view: 'focus' });
    store.set({ lang: 'vi' });
    expect(el().querySelector('h2')?.textContent).toBe('Trái Đất');
    expect(el().textContent).toContain('Về toàn cảnh');
  });

  it('shows the order line, source line and facts', () => {
    const { el } = setup({ selected: 'mars', view: 'focus' });
    expect(el().textContent).toContain('#4');
    expect(el().textContent).toContain('NASA');
    expect(el().querySelectorAll('li.panel-fact').length).toBeGreaterThan(0);
  });

  it('the asteroid belt has no data fields', () => {
    const { el } = setup({ selected: 'asteroid-belt', view: 'focus' });
    expect(el().querySelector('h2')?.textContent).toBe('Asteroid Belt');
    expect(el().querySelectorAll('.panel-field').length).toBe(0);
    expect(el().querySelectorAll('li.panel-fact').length).toBeGreaterThan(0);
  });

  it('back button calls onBack', () => {
    const { el, onBack } = setup({ selected: 'earth', view: 'focus' });
    el().querySelector<HTMLButtonElement>('[data-testid="back"]')!.click();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('switches layout without losing the selection and resets to peek', () => {
    const { store, el } = setup({ selected: 'earth', view: 'focus', layout: 'mobile' });
    expect(el().dataset.layout).toBe('mobile');
    expect(el().dataset.state).toBe('peek');
    store.set({ layout: 'desktop' });
    expect(el().dataset.layout).toBe('desktop');
    expect(el().querySelector('h2')?.textContent).toBe('Earth');
    expect(store.get().selected).toBe('earth');
  });

  describe('bottom sheet drag', () => {
    function drag(el: HTMLElement, dy: number): void {
      const grab = el.querySelector<HTMLElement>('.panel-grab')!;
      const ev = (type: string, y: number): void => {
        grab.dispatchEvent(new MouseEvent(type, { clientX: 100, clientY: y, bubbles: true }));
      };
      ev('pointerdown', 300);
      ev('pointermove', 300 + dy);
      ev('pointerup', 300 + dy);
    }

    it('drag up > 60 px expands, drag down > 60 px returns to peek', () => {
      const { el, onBack } = setup({ selected: 'earth', view: 'focus', layout: 'mobile' });
      drag(el(), -70);
      expect(el().dataset.state).toBe('expanded');
      drag(el(), 70);
      expect(el().dataset.state).toBe('peek');
      expect(onBack).not.toHaveBeenCalled();
    });

    it('drag up < 60 px does nothing', () => {
      const { el } = setup({ selected: 'earth', view: 'focus', layout: 'mobile' });
      drag(el(), -40);
      expect(el().dataset.state).toBe('peek');
    });

    it('drag down > 80 px from peek goes back to overview', () => {
      const { el, onBack } = setup({ selected: 'earth', view: 'focus', layout: 'mobile' });
      drag(el(), 90);
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('drag down 70 px from peek does not close', () => {
      const { el, onBack } = setup({ selected: 'earth', view: 'focus', layout: 'mobile' });
      drag(el(), 70);
      expect(onBack).not.toHaveBeenCalled();
      expect(el().dataset.state).toBe('peek');
    });

    it('a new selection resets to peek', () => {
      const { el, store } = setup({ selected: 'earth', view: 'focus', layout: 'mobile' });
      drag(el(), -70);
      store.set({ selected: 'mars' });
      expect(el().dataset.state).toBe('peek');
    });
  });

  it('removes its element on dispose', () => {
    const { panel, root } = setup({ selected: 'earth', view: 'focus' });
    panel.dispose();
    expect(root.querySelector('[data-testid="panel"]')).toBeNull();
  });
});

describe('createInfoPanel render guard and root state', () => {
  it('does not rebuild when unrelated state changes', () => {
    const root = document.createElement('div');
    const store = makeStore({ selected: 'earth', view: 'focus', layout: 'mobile' });
    createInfoPanel(root, store, () => undefined);
    const title = root.querySelector('h2')!;
    const facts = root.querySelector('.panel-facts')!.firstElementChild;
    store.set({ ready: false });
    expect(root.querySelector('.panel-facts')!.firstElementChild).toBe(facts);
    expect(title.textContent).toBe('Earth');
  });

  it('exposes the sheet state on the root only while the mobile sheet is visible', () => {
    const root = document.createElement('div');
    const store = makeStore({ selected: 'earth', view: 'focus', layout: 'mobile' });
    createInfoPanel(root, store, () => undefined);
    expect(root.dataset.sheet).toBe('peek');
    store.set({ layout: 'desktop' });
    expect(root.dataset.sheet).toBeUndefined();
    store.set({ layout: 'mobile', selected: null, view: 'overview' });
    expect(root.dataset.sheet).toBeUndefined();
  });
});
