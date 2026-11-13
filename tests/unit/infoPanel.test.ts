import { afterEach, describe, expect, it, vi } from 'vitest';
import { BODIES } from '../../src/data/bodies';
import { createStore } from '../../src/state/store';
import type { AppState } from '../../src/state/appState';
import { initialTour } from '../../src/tour/tourMachine';
import { createInfoPanel, panelFields, panelSections } from '../../src/ui/infoPanel';

const val = (id: keyof typeof BODIES, lang: 'vi' | 'en' | 'de', key: string): string | undefined =>
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
  it('lists the atmosphere only for bodies that have one, formatted per locale', () => {
    expect(val('earth', 'en', 'field.atmosphere')).toBe('N₂ 78.08% · O₂ 20.95% · Ar 0.93%');
    expect(val('saturn', 'vi', 'field.atmosphere')).toBe('H₂ 96,3% · He 3,25%');
    expect(val('neptune', 'de', 'field.atmosphere')).toBe(
      'H₂ 80 % · He 19 % · CH₄ 1,5 %'.replace(/ %/g, '%'),
    );
    for (const id of ['sun', 'mercury', 'moon', 'pluto'] as const) {
      expect(val(id, 'en', 'field.atmosphere')).toBeUndefined();
    }
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

describe('panel sections and stepping', () => {
  it('groups rows into physical and orbit sections, dropping empty ones', () => {
    const secs = panelSections(panelFields(BODIES.earth, 'en'));
    expect(secs.map((s) => s.title)).toEqual(['section.physical', 'section.orbit']);
    const orbit = secs[1]!.fields.map((f) => f.key);
    expect(orbit).toEqual(['field.distance', 'field.orbitalPeriod', 'field.rotationPeriod']);
    expect(secs[0]!.fields.map((f) => f.key)).toContain('field.atmosphere');
    const sun = panelSections(panelFields(BODIES.sun, 'en'));
    expect(sun.map((s) => s.title)).toEqual(['section.physical', 'section.orbit']);
    expect(panelSections([])).toEqual([]);
  });

  it('prev and next step through NAV_ORDER and wrap', () => {
    const root = document.createElement('div');
    const store = makeStore({ selected: 'earth', view: 'focus' });
    const onStep = vi.fn();
    createInfoPanel(root, store, () => undefined, onStep);
    const btn = (id: string): HTMLButtonElement =>
      root.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!;
    btn('panel-next').click();
    expect(onStep).toHaveBeenLastCalledWith('moon');
    btn('panel-prev').click();
    expect(onStep).toHaveBeenLastCalledWith('venus');
    store.set({ selected: 'sun' });
    btn('panel-prev').click();
    expect(onStep).toHaveBeenLastCalledWith('pluto');
    expect(btn('panel-next').getAttribute('aria-label')).toBe('Next body');
  });

  it('shows an atmosphere row for Earth and none for the Moon', () => {
    const root = document.createElement('div');
    const store = makeStore({ selected: 'earth', view: 'focus' });
    createInfoPanel(root, store, () => undefined);
    expect(root.textContent).toContain('Atmosphere');
    expect(root.textContent).toContain('O₂ 20.95%');
    store.set({ selected: 'moon' });
    expect(root.textContent).not.toContain('Atmosphere');
  });
});

describe('moons in the panel', () => {
  const MOONS = (Object.keys(BODIES) as (keyof typeof BODIES)[]).filter(
    (id) => BODIES[id].kind === 'moon',
  );

  it('shows every moon distance in km from its own planet, in every language', () => {
    const keyOf = {
      earth: 'field.distanceEarth',
      mars: 'field.distanceMars',
      jupiter: 'field.distanceJupiter',
      saturn: 'field.distanceSaturn',
    } as const;
    expect(MOONS).toHaveLength(9);
    for (const id of MOONS) {
      const parent = BODIES[id].parent as keyof typeof keyOf;
      expect(keyOf[parent], id).toBeDefined();
      for (const lang of ['en', 'vi', 'ja', 'de'] as const) {
        const keys = panelFields(BODIES[id], lang).map((f) => f.key);
        expect(keys, `${lang}/${id}`).toContain(keyOf[parent]);
        expect(keys, `${lang}/${id}`).not.toContain('field.distance');
      }
    }
    expect(val('phobos', 'en', 'field.distanceMars')).toBe('9,378 km');
    expect(val('io', 'en', 'field.distanceJupiter')).toBe('421,800 km');
    expect(val('titan', 'de', 'field.distanceSaturn')).toBe('1.221.870 km');
  });

  it('omits the mean temperature where NASA gives none (Phobos, Deimos)', () => {
    for (const id of ['phobos', 'deimos'] as const) {
      expect(val(id, 'en', 'field.meanTemp')).toBeUndefined();
    }
    expect(val('europa', 'en', 'field.meanTemp')).toBe('-170 °C');
  });

  function panelFor(selected: AppState['selected'], lang: AppState['lang'] = 'en') {
    const root = document.createElement('div');
    const store = makeStore({ selected, view: 'focus', lang });
    const onStep = vi.fn();
    createInfoPanel(root, store, () => undefined, onStep);
    const chips = (prefix: string): HTMLButtonElement[] => [
      ...root.querySelectorAll<HTMLButtonElement>(`[data-testid^="${prefix}-"]`),
    ];
    return { root, store, onStep, chips };
  }

  it('gives a planet with modelled moons a Moons chip row that flies to the moon', () => {
    const { root, store, onStep, chips } = panelFor('jupiter');
    expect(chips('moon').map((b) => b.dataset.testid)).toEqual([
      'moon-io',
      'moon-europa',
      'moon-ganymede',
      'moon-callisto',
    ]);
    expect(chips('moon').map((b) => b.textContent)).toEqual([
      'Io',
      'Europa',
      'Ganymede',
      'Callisto',
    ]);
    expect(root.textContent).toContain('Moons');
    chips('moon')[2]!.click();
    expect(onStep).toHaveBeenLastCalledWith('ganymede');
    store.set({ selected: 'mars' });
    expect(chips('moon').map((b) => b.dataset.testid)).toEqual(['moon-phobos', 'moon-deimos']);
    store.set({ selected: 'earth' });
    expect(chips('moon').map((b) => b.dataset.testid)).toEqual(['moon-moon']);
    store.set({ selected: 'venus' });
    expect(chips('moon')).toHaveLength(0);
    expect(root.textContent).not.toContain('Moons');
    store.set({ selected: 'asteroid-belt' });
    expect(chips('moon')).toHaveLength(0);
  });

  it('gives a moon a chip back to its planet', () => {
    const { root, store, onStep, chips } = panelFor('titan');
    expect(chips('parent').map((b) => b.dataset.testid)).toEqual(['parent-saturn']);
    expect(chips('parent')[0]!.textContent).toBe('Saturn');
    expect(root.textContent).toContain('Parent planet');
    expect(chips('moon')).toHaveLength(0);
    chips('parent')[0]!.click();
    expect(onStep).toHaveBeenLastCalledWith('saturn');
    store.set({ lang: 'de' });
    expect(root.textContent).toContain('Mutterplanet');
    store.set({ selected: 'moon' });
    expect(chips('parent').map((b) => b.dataset.testid)).toEqual(['parent-earth']);
  });

  it('labels the chip rows in every language', () => {
    for (const [lang, word] of [
      ['vi', 'Vệ tinh'],
      ['ja', '衛星'],
      ['de', 'Monde'],
    ] as const) {
      const { root, chips } = panelFor('saturn', lang);
      expect(root.textContent, lang).toContain(word);
      expect(chips('moon')).toHaveLength(2);
    }
  });
});
