import { t } from '../i18n/i18n';
import type { UiKey } from '../i18n/strings';
import { QUALITY_CHOICES, type QualityChoice } from '../quality/tiers';
import type { AppState } from '../state/appState';
import { SPEED_OPTIONS } from '../state/simClock';
import type { Store } from '../state/store';
import { icon } from './icons';

export interface SettingsDeps {
  initial: { orbits: boolean; labels: boolean; quality: QualityChoice };
  onSpeed(speed: number): void;
  onOrbits(on: boolean): void;
  onLabels(on: boolean): void;
  onQuality(choice: QualityChoice): void;
}

export interface Settings {
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  dispose(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

const SHORTCUTS: readonly { keys: readonly string[]; label: UiKey }[] = [
  { keys: ['[', ']'], label: 'shortcut.bodies' },
  { keys: ['Esc'], label: 'shortcut.overview' },
  { keys: ['+', '−'], label: 'shortcut.zoom' },
  { keys: ['←', '→'], label: 'shortcut.rotate' },
];

/**
 * Non-modal settings popover anchored to the gear button: time speed, orbit lines, labels,
 * quality and (desktop) the keyboard shortcuts. Closes on Escape, outside press or a second
 * press of the gear. Speed is not persisted; the owner persists the rest in its callbacks.
 */
export function createSettings(
  root: HTMLElement,
  store: Store<AppState>,
  anchor: HTMLButtonElement,
  deps: SettingsDeps,
): Settings {
  const state = { speed: 1, ...deps.initial };

  const panel = el('div', 'settings-panel glass');
  panel.id = 'settings-panel';
  panel.setAttribute('data-testid', 'settings-panel');
  panel.setAttribute('role', 'group');
  panel.hidden = true;
  anchor.setAttribute('aria-controls', panel.id);
  anchor.setAttribute('aria-expanded', 'false');
  anchor.setAttribute('aria-haspopup', 'true');

  const head = el('div', 'settings-head');
  const title = el('h2', 'settings-title');
  const closeBtn = el('button', 'icon-btn');
  closeBtn.type = 'button';
  closeBtn.setAttribute('data-testid', 'settings-close');
  closeBtn.append(icon('close'));
  head.append(title, closeBtn);

  const section = (): { box: HTMLElement; label: HTMLElement } => {
    const box = el('section', 'settings-section');
    const label = el('h3', 'settings-label');
    box.append(label);
    return { box, label };
  };

  const speed = section();
  const speedGroup = el('div', 'segmented speed-group');
  speedGroup.setAttribute('role', 'radiogroup');
  const speedBtns = new Map<number, HTMLButtonElement>();
  for (const s of SPEED_OPTIONS) {
    const b = el('button', 'seg-btn');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('data-testid', `speed-${s}`);
    if (s === 0) b.append(icon('pause'));
    else b.textContent = `${s}×`;
    b.addEventListener('click', () => {
      state.speed = s;
      deps.onSpeed(s);
      renderState();
    });
    speedBtns.set(s, b);
    speedGroup.append(b);
  }
  speed.box.append(speedGroup);

  const display = section();
  const makeSwitch = (testId: string): { row: HTMLButtonElement; name: HTMLElement } => {
    const row = el('button', 'switch-row');
    row.type = 'button';
    row.setAttribute('role', 'switch');
    row.setAttribute('data-testid', testId);
    const name = el('span', 'switch-name');
    const track = el('span', 'switch-track');
    track.setAttribute('aria-hidden', 'true');
    track.append(el('span', 'switch-thumb'));
    row.append(name, track);
    return { row, name };
  };
  const orbits = makeSwitch('toggle-orbits');
  const labels = makeSwitch('toggle-labels');
  orbits.row.addEventListener('click', () => {
    state.orbits = !state.orbits;
    deps.onOrbits(state.orbits);
    renderState();
  });
  labels.row.addEventListener('click', () => {
    state.labels = !state.labels;
    deps.onLabels(state.labels);
    renderState();
  });
  display.box.append(orbits.row, labels.row);

  const quality = section();
  const qualityGroup = el('div', 'segmented quality-group');
  qualityGroup.setAttribute('role', 'radiogroup');
  const qualityBtns = new Map<QualityChoice, HTMLButtonElement>();
  for (const q of QUALITY_CHOICES) {
    const b = el('button', 'seg-btn');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('data-testid', `quality-${q}`);
    b.addEventListener('click', () => {
      state.quality = q;
      deps.onQuality(q);
      renderState();
    });
    qualityBtns.set(q, b);
    qualityGroup.append(b);
  }
  const qualityNow = el('p', 'settings-note');
  qualityNow.setAttribute('data-testid', 'quality-now');
  qualityNow.setAttribute('aria-live', 'polite');
  quality.box.append(qualityGroup, qualityNow);

  const keys = section();
  keys.box.classList.add('settings-keys');
  const keyList = el('dl', 'key-list');
  const keyLabels: [HTMLElement, UiKey][] = [];
  for (const sc of SHORTCUTS) {
    const dt = el('dt');
    dt.append(
      ...sc.keys.flatMap((k, i) => {
        const kbd = el('kbd');
        kbd.textContent = k;
        return i === 0 ? [kbd] : [document.createTextNode(' '), kbd];
      }),
    );
    const dd = el('dd');
    keyLabels.push([dd, sc.label]);
    keyList.append(dt, dd);
  }
  keys.box.append(keyList);

  panel.append(head, speed.box, display.box, quality.box, keys.box);
  root.append(panel);

  const renderText = (): void => {
    const { lang } = store.get();
    title.textContent = t(lang, 'settings.title');
    panel.setAttribute('aria-label', t(lang, 'settings.title'));
    closeBtn.setAttribute('aria-label', t(lang, 'credits.close'));
    anchor.setAttribute('aria-label', t(lang, 'settings.open'));
    speed.label.textContent = t(lang, 'settings.speed');
    speedBtns.get(0)?.setAttribute('aria-label', t(lang, 'speed.pause'));
    display.label.textContent = t(lang, 'settings.display');
    orbits.name.textContent = t(lang, 'settings.orbits');
    labels.name.textContent = t(lang, 'settings.labels');
    quality.label.textContent = t(lang, 'settings.quality');
    for (const [q, b] of qualityBtns) b.textContent = t(lang, `quality.${q}`);
    keys.label.textContent = t(lang, 'settings.shortcuts');
    for (const [dd, key] of keyLabels) dd.textContent = t(lang, key);
  };
  const renderState = (): void => {
    const { lang, quality: tier, layout } = store.get();
    panel.dataset.layout = layout;
    for (const [s, b] of speedBtns) {
      b.setAttribute('aria-checked', String(s === state.speed));
      b.tabIndex = s === state.speed ? 0 : -1;
    }
    orbits.row.setAttribute('aria-checked', String(state.orbits));
    labels.row.setAttribute('aria-checked', String(state.labels));
    for (const [q, b] of qualityBtns) {
      b.setAttribute('aria-checked', String(q === state.quality));
      b.tabIndex = q === state.quality ? 0 : -1;
    }
    const tierName = t(lang, `quality.${tier}`);
    const inUse = state.quality === 'auto' ? `${t(lang, 'quality.auto')} · ${tierName}` : tierName;
    qualityNow.textContent = t(lang, 'settings.qualityNow', { tier: inUse });
  };
  renderText();
  renderState();

  /** Arrow keys move within a segmented control (radio-group pattern). */
  const onGroupKey = (e: KeyboardEvent): void => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const group = e.currentTarget as HTMLElement;
    const items = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    const next = items[(i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length];
    next?.focus();
    next?.click();
  };
  speedGroup.addEventListener('keydown', onGroupKey);
  qualityGroup.addEventListener('keydown', onGroupKey);

  let isOpen = false;
  const setOpen = (open: boolean, returnFocus: boolean): void => {
    if (open === isOpen) return;
    isOpen = open;
    panel.hidden = !open;
    anchor.setAttribute('aria-expanded', String(open));
    if (open) {
      renderState();
      (speedBtns.get(state.speed) ?? closeBtn).focus();
    } else if (returnFocus) {
      anchor.focus();
    }
  };

  const onKey = (e: KeyboardEvent): void => {
    if (!isOpen || e.key !== 'Escape') return;
    // Claim the key so the scene's Escape (back to overview) does not also fire.
    e.preventDefault();
    setOpen(false, true);
  };
  const onPointerDown = (e: Event): void => {
    if (!isOpen) return;
    const target = e.target as Node | null;
    if (target && (panel.contains(target) || anchor.contains(target))) return;
    setOpen(false, false);
  };
  const onAnchor = (): void => setOpen(!isOpen, true);
  anchor.addEventListener('click', onAnchor);
  closeBtn.addEventListener('click', () => setOpen(false, true));
  window.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', onPointerDown, true);
  const unsub = store.subscribe((s, prev) => {
    if (s.lang !== prev.lang) renderText();
    renderState();
  });

  return {
    open: () => setOpen(true, false),
    close: () => setOpen(false, false),
    toggle: onAnchor,
    isOpen: () => isOpen,
    dispose() {
      unsub();
      anchor.removeEventListener('click', onAnchor);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown, true);
      panel.remove();
    },
  };
}
