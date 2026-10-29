import { BODIES } from '../data/bodies';
import { getContent } from '../data/content';
import type { BodyDef, ContentId, Lang } from '../data/types';
import { formatNumber, t } from '../i18n/i18n';
import type { UiKey } from '../i18n/strings';
import type { AppState } from '../state/appState';
import type { Store } from '../state/store';

export interface PanelField {
  key: UiKey;
  value: string;
}

export type SheetState = 'peek' | 'expanded';

/** Vertical drag distance on the sheet header that toggles peek/expanded. */
const TOGGLE_DRAG_PX = 60;
/** Dragging down from `peek` further than this closes the panel. */
const CLOSE_DRAG_PX = 80;
/** A press that moves less than this is a tap on the handle. */
const TAP_PX = 8;

const MOON_ID = 'moon';

function sig3(lang: Lang, v: number): string {
  return formatNumber(lang, Number(v.toPrecision(3)), 6);
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
    value: withUnit(lang, sig3(lang, p.massEarths), 'unit.earthMass'),
  });
  if (p.distanceFromParentMkm !== undefined) {
    if (def.id === MOON_ID) {
      const km = Math.round(p.distanceFromParentMkm * 1e6);
      out.push({
        key: 'field.distanceEarth',
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
  out.push({ key: 'field.meanTemp', value: `${formatNumber(lang, p.meanTempC)} °C` });
  out.push({ key: 'field.gravity', value: `${formatNumber(lang, p.surfaceGravity, 1)} m/s²` });
  if (p.knownMoons !== undefined) {
    out.push({ key: 'field.moons', value: formatNumber(lang, p.knownMoons) });
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
 * Info panel: a fixed left panel on desktop, a draggable bottom sheet on mobile.
 * Rebuilds its text on `lang`, `selected` and `layout` changes; all content uses textContent.
 */
export function createInfoPanel(
  root: HTMLElement,
  store: Store<AppState>,
  onBack: () => void,
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
  head.append(title, sub);
  grab.append(handle, head);

  const back = el('button', 'ctl-btn glass panel-back');
  back.type = 'button';
  back.setAttribute('data-testid', 'back');

  const scroll = el('div', 'panel-scroll');
  const fields = el('dl', 'panel-fields');
  const desc = el('p', 'panel-desc');
  const factsTitle = el('h3', 'panel-facts-title');
  const facts = el('ul', 'panel-facts');
  const source = el('p', 'panel-source');
  scroll.append(fields, desc, factsTitle, facts, source);
  panel.append(grab, back, scroll);
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
    back.textContent = t(lang, 'backToOverview');
    fields.replaceChildren(
      ...(def ? panelFields(def, lang) : []).flatMap((f) => {
        const row = el('div', 'panel-field');
        const dt = el('dt');
        dt.textContent = t(lang, f.key);
        const dd = el('dd');
        dd.textContent = f.value;
        row.append(dt, dd);
        return [row];
      }),
    );
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
