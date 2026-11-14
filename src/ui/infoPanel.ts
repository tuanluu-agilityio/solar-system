import { BODIES, moonsOf } from '../data/bodies';
import { getContent } from '../data/content';
import type { BodyDef, BodyId, ContentId, Lang } from '../data/types';
import { NAV_ORDER } from '../data/navOrder';
import { formatNumber, t } from '../i18n/i18n';
import { neighbour } from '../interaction/keyboard';
import { icon } from './icons';
import type { UiKey } from '../i18n/strings';
import type { AppState } from '../state/appState';
import type { Store } from '../state/store';

export interface PanelField {
  key: UiKey;
  value: string;
}

/** Rows of the orbit and rotation section; every other row is physical. */
const ORBIT_KEYS: ReadonlySet<UiKey> = new Set<UiKey>([
  'field.distance',
  'field.distanceEarth',
  'field.distanceMars',
  'field.distanceJupiter',
  'field.distanceSaturn',
  'field.orbitalPeriod',
  'field.rotationPeriod',
]);

/** Splits the rows into the physical and the orbit sections (empty sections are dropped). */
export function panelSections(
  fields: readonly PanelField[],
): { title: UiKey; fields: PanelField[] }[] {
  const sections: { title: UiKey; fields: PanelField[] }[] = [
    { title: 'section.physical', fields: fields.filter((f) => !ORBIT_KEYS.has(f.key)) },
    { title: 'section.orbit', fields: fields.filter((f) => ORBIT_KEYS.has(f.key)) },
  ];
  return sections.filter((s) => s.fields.length > 0);
}

export type SheetState = 'peek' | 'expanded';

/** Vertical drag distance on the sheet header that toggles peek/expanded. */
const TOGGLE_DRAG_PX = 60;
/** Dragging down from `peek` further than this closes the panel. */
const CLOSE_DRAG_PX = 80;
/** A press that moves less than this is a tap on the handle. */
const TAP_PX = 8;

/** "Average distance from <planet>" for each planet with modelled moons. */
const DISTANCE_FROM: Partial<Record<BodyId, UiKey>> = {
  earth: 'field.distanceEarth',
  mars: 'field.distanceMars',
  jupiter: 'field.distanceJupiter',
  saturn: 'field.distanceSaturn',
};

function sig3(lang: Lang, v: number): string {
  return formatNumber(lang, Number(v.toPrecision(3)), 6);
}

const SUPERSCRIPT: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};
/** Below this a mass (in Earths) is written in powers of ten: small moons would read "0". */
const SCIENTIFIC_BELOW = 1e-3;

/** 3 significant digits; tiny values as `m × 10ⁿ` (1.78 × 10⁻⁹). */
function massValue(lang: Lang, v: number): string {
  if (v === 0 || v >= SCIENTIFIC_BELOW) return sig3(lang, v);
  const exp = Math.floor(Math.log10(v));
  const mantissa = Number((v / 10 ** exp).toPrecision(3));
  const power = [...String(exp)].map((c) => SUPERSCRIPT[c] ?? c).join('');
  return `${formatNumber(lang, mantissa, 2)} × 10${power}`;
}

/** One decimal (9.8 m/s²); weak gravity keeps 2 significant digits (0.0058, not 0). */
function gravityValue(lang: Lang, g: number): string {
  return g >= 0.5 ? formatNumber(lang, g, 1) : formatNumber(lang, Number(g.toPrecision(2)), 6);
}

function withUnit(lang: Lang, n: string, unit: UiKey): string {
  return `${n} ${t(lang, unit)}`;
}

function rotationValue(lang: Lang, hours: number): string {
  const abs = Math.abs(hours);
  const base =
    abs < 48
      ? withUnit(lang, formatNumber(lang, abs, 1), 'unit.hours')
      : withUnit(lang, formatNumber(lang, abs / 24, 1), 'unit.days');
  return hours < 0 ? `${base} ${t(lang, 'unit.retrograde')}` : base;
}

/** Data rows for a body; fields that do not apply (undefined) are omitted, never shown as "N/A". */
export function panelFields(def: BodyDef, lang: Lang): PanelField[] {
  const p = def.physical;
  const out: PanelField[] = [];
  out.push({
    key: 'field.diameter',
    value: withUnit(lang, formatNumber(lang, p.diameterKm), 'unit.km'),
  });
  out.push({
    key: 'field.mass',
    value: withUnit(lang, massValue(lang, p.massEarths), 'unit.earthMass'),
  });
  if (p.distanceFromParentMkm !== undefined) {
    // A moon: distance from its planet, in km.
    const fromPlanet = def.parent !== null ? DISTANCE_FROM[def.parent] : undefined;
    if (fromPlanet) {
      const km = Math.round(p.distanceFromParentMkm * 1e6);
      out.push({
        key: fromPlanet,
        value: withUnit(lang, formatNumber(lang, km), 'unit.km'),
      });
    } else {
      out.push({
        key: 'field.distance',
        value: withUnit(lang, formatNumber(lang, p.distanceFromParentMkm, 1), 'unit.millionKm'),
      });
    }
  }
  if (p.orbitalPeriodDays !== undefined) {
    const d = p.orbitalPeriodDays;
    out.push({
      key: 'field.orbitalPeriod',
      value:
        d < 1000
          ? withUnit(lang, formatNumber(lang, d, 1), 'unit.days')
          : withUnit(lang, formatNumber(lang, d / 365.25, 1), 'unit.years'),
    });
  }
  out.push({ key: 'field.rotationPeriod', value: rotationValue(lang, p.rotationPeriodHours) });
  if (p.meanTempC !== undefined) {
    out.push({ key: 'field.meanTemp', value: `${formatNumber(lang, p.meanTempC)} °C` });
  }
  out.push({ key: 'field.gravity', value: `${gravityValue(lang, p.surfaceGravity)} m/s²` });
  if (p.knownMoons !== undefined) {
    out.push({ key: 'field.moons', value: formatNumber(lang, p.knownMoons) });
  }
  if (p.atmosphere && p.atmosphere.length > 0) {
    out.push({
      key: 'field.atmosphere',
      value: p.atmosphere.map((a) => `${a.gas} ${formatNumber(lang, a.percent, 2)}%`).join(' · '),
    });
  }
  return out;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function bodyDef(id: ContentId): BodyDef | null {
  return id === 'asteroid-belt' ? null : BODIES[id];
}

/**
 * Related bodies shown as chips: a planet's modelled moons, or a moon's planet. Null when
 * there are none (the Sun, planets without modelled moons, the asteroid belt).
 */
export function relatedBodies(
  id: ContentId,
): { title: UiKey; prefix: 'moon' | 'parent'; ids: BodyId[] } | null {
  const def = bodyDef(id);
  if (!def) return null;
  if (def.kind === 'moon' && def.parent !== null) {
    return { title: 'panel.parent', prefix: 'parent', ids: [def.parent] };
  }
  const moons = moonsOf(def.id);
  return moons.length > 0 ? { title: 'panel.moons', prefix: 'moon', ids: moons } : null;
}

/**
 * Info panel: a fixed left panel on desktop, a draggable bottom sheet on mobile.
 * Rebuilds its text on `lang`, `selected` and `layout` changes; all content uses textContent.
 */
export function createInfoPanel(
  root: HTMLElement,
  store: Store<AppState>,
  onBack: () => void,
  onStep: (id: ContentId) => void = () => undefined,
): { dispose(): void } {
  const panel = el('aside', 'info-panel glass');
  panel.setAttribute('data-testid', 'panel');
  panel.hidden = true;

  const grab = el('div', 'panel-grab');
  const handle = el('div', 'panel-handle');
  handle.setAttribute('aria-hidden', 'true');
  const head = el('div', 'panel-head');
  const title = el('h2', 'panel-title');
  const sub = el('p', 'panel-sub');
  head.append(sub, title);
  grab.append(handle, head);

  const actions = el('div', 'panel-actions');
  const back = el('button', 'ctl-btn panel-back');
  back.type = 'button';
  back.setAttribute('data-testid', 'back');
  const backLabel = el('span');
  back.append(icon('chevronLeft'), backLabel);
  const stepper = el('div', 'panel-stepper');
  const prev = el('button', 'ctl-btn panel-step');
  prev.type = 'button';
  prev.setAttribute('data-testid', 'panel-prev');
  prev.append(icon('chevronLeft'));
  const next = el('button', 'ctl-btn panel-step');
  next.type = 'button';
  next.setAttribute('data-testid', 'panel-next');
  next.append(icon('chevronRight'));
  stepper.append(prev, next);
  actions.append(back, stepper);

  const scroll = el('div', 'panel-scroll');
  const sections = el('div', 'panel-sections');
  const related = el('section', 'panel-section panel-related');
  const desc = el('p', 'panel-desc');
  const factsTitle = el('h3', 'panel-facts-title');
  const facts = el('ul', 'panel-facts');
  const source = el('p', 'panel-source');
  scroll.append(sections, related, desc, factsTitle, facts, source);
  panel.append(grab, actions, scroll);
  root.append(panel);

  let sheet: SheetState = 'peek';
  // The root carries the visible mobile sheet state so CSS can lift the disclaimer above it.
  const syncRoot = (): void => {
    const { selected, layout } = store.get();
    if (selected !== null && layout === 'mobile') root.dataset.sheet = sheet;
    else delete root.dataset.sheet;
  };
  const setSheet = (s: SheetState): void => {
    sheet = s;
    panel.dataset.state = s;
    syncRoot();
  };

  let renderedKey = '';
  const render = (): void => {
    const s = store.get();
    const key = `${s.selected}|${s.lang}|${s.layout}`;
    if (key === renderedKey) return;
    renderedKey = key;
    panel.dataset.layout = s.layout;
    syncRoot();
    if (s.selected === null) {
      panel.hidden = true;
      return;
    }
    const lang = s.lang;
    const content = getContent(s.selected, lang);
    const def = bodyDef(s.selected);
    panel.hidden = false;
    title.textContent = content.name;
    sub.textContent =
      def && def.orderFromSun !== null
        ? t(lang, 'panel.order', { kind: content.kindLabel, n: def.orderFromSun })
        : content.kindLabel;
    backLabel.textContent = t(lang, 'backToOverview');
    prev.setAttribute('aria-label', t(lang, 'panel.prev'));
    next.setAttribute('aria-label', t(lang, 'panel.next'));
    sections.replaceChildren(
      ...panelSections(def ? panelFields(def, lang) : []).map((sec) => {
        const box = el('section', 'panel-section');
        const h = el('h3', 'panel-section-title');
        h.textContent = t(lang, sec.title);
        const list = el('dl', 'panel-fields');
        list.append(
          ...sec.fields.map((f) => {
            const row = el('div', 'panel-field');
            const dt = el('dt');
            dt.textContent = t(lang, f.key);
            const dd = el('dd');
            dd.textContent = f.value;
            row.append(dt, dd);
            return row;
          }),
        );
        box.append(h, list);
        return box;
      }),
    );
    const rel = relatedBodies(s.selected);
    related.hidden = rel === null;
    related.replaceChildren();
    if (rel) {
      const h = el('h3', 'panel-section-title');
      h.textContent = t(lang, rel.title);
      const row = el('div', 'panel-chips');
      row.append(
        ...rel.ids.map((id) => {
          const chip = el('button', 'panel-chip');
          chip.type = 'button';
          chip.setAttribute('data-testid', `${rel.prefix}-${id}`);
          chip.textContent = getContent(id, lang).name;
          chip.addEventListener('click', () => onStep(id));
          return chip;
        }),
      );
      related.append(h, row);
    }
    desc.textContent = content.description;
    factsTitle.textContent = t(lang, 'panel.facts');
    facts.replaceChildren(
      ...content.facts.map((text) => {
        const li = el('li', 'panel-fact');
        li.textContent = text;
        return li;
      }),
    );
    source.textContent = t(lang, 'credits.data');
  };
  setSheet('peek');
  render();

  back.addEventListener('click', () => onBack());
  const step = (dir: 1 | -1): void => {
    const id = neighbour({ order: NAV_ORDER, selected: store.get().selected }, dir);
    if (id) onStep(id);
  };
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));

  // Drag on the handle/header: up toggles to expanded, down returns to peek or closes.
  let startY: number | null = null;
  const onDown = (e: PointerEvent): void => {
    if (store.get().layout !== 'mobile') return;
    startY = e.clientY;
    try {
      grab.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic events and old browsers have no active pointer to capture.
    }
  };
  const onUp = (e: PointerEvent): void => {
    if (startY === null) return;
    const dy = e.clientY - startY;
    startY = null;
    if (Math.abs(dy) < TAP_PX) {
      setSheet(sheet === 'peek' ? 'expanded' : 'peek');
    } else if (dy < -TOGGLE_DRAG_PX && sheet === 'peek') {
      setSheet('expanded');
    } else if (dy > TOGGLE_DRAG_PX && sheet === 'expanded') {
      setSheet('peek');
    } else if (dy > CLOSE_DRAG_PX && sheet === 'peek') {
      onBack();
    }
  };
  const onCancel = (): void => {
    startY = null;
  };
  grab.addEventListener('pointerdown', onDown);
  grab.addEventListener('pointerup', onUp);
  grab.addEventListener('pointercancel', onCancel);

  const unsub = store.subscribe((s, prev) => {
    if (s.selected !== prev.selected || s.layout !== prev.layout) setSheet('peek');
    render();
  });

  return {
    dispose() {
      unsub();
      delete root.dataset.sheet;
      panel.remove();
    },
  };
}
