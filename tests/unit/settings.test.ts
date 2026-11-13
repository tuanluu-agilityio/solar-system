import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../src/state/store';
import type { AppState } from '../../src/state/appState';
import { initialTour } from '../../src/tour/tourMachine';
import { createSettings } from '../../src/ui/settings';

function setup(patch: Partial<AppState> = {}, quality: 'auto' | 'low' = 'auto') {
  const root = document.createElement('div');
  document.body.append(root);
  const anchor = document.createElement('button');
  anchor.setAttribute('data-testid', 'settings');
  root.append(anchor);
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
  const deps = {
    initial: { orbits: true, labels: true, quality },
    onSpeed: vi.fn(),
    onOrbits: vi.fn(),
    onLabels: vi.fn(),
    onQuality: vi.fn(),
  };
  const settings = createSettings(root, store, anchor, deps);
  const q = (id: string): HTMLElement => root.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
  return { root, anchor, store, deps, settings, q };
}

const press = (el: Element, type = 'pointerdown'): void => {
  el.dispatchEvent(new Event(type, { bubbles: true }));
};

describe('createSettings', () => {
  afterEach(() => document.body.replaceChildren());

  it('starts closed and wires aria between the gear and the panel', () => {
    const { anchor, q } = setup();
    expect(q('settings-panel').hidden).toBe(true);
    expect(anchor.getAttribute('aria-expanded')).toBe('false');
    expect(anchor.getAttribute('aria-controls')).toBe(q('settings-panel').id);
    expect(anchor.getAttribute('aria-label')).toBe('Settings');
  });

  it('opens on press, focuses the current speed, and closes on a second press', () => {
    const { anchor, q } = setup();
    anchor.click();
    expect(q('settings-panel').hidden).toBe(false);
    expect(anchor.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(q('speed-1'));
    anchor.click();
    expect(q('settings-panel').hidden).toBe(true);
    expect(anchor.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(anchor);
  });

  it('closes on Escape (claiming the key) and returns focus to the gear', () => {
    const { anchor, q } = setup();
    anchor.click();
    const e = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    window.dispatchEvent(e);
    expect(q('settings-panel').hidden).toBe(true);
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(anchor);
  });

  it('ignores Escape while closed', () => {
    setup();
    const e = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    window.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });

  it('closes on an outside press but not on a press inside', () => {
    const { anchor, q } = setup();
    anchor.click();
    press(q('speed-4'));
    expect(q('settings-panel').hidden).toBe(false);
    press(document.body);
    expect(q('settings-panel').hidden).toBe(true);
  });

  it('speed is a segmented control: pause, 0.25, 1, 4, 16 with 1x checked by default', () => {
    const { q, deps } = setup();
    for (const s of [0, 0.25, 1, 4, 16]) expect(q(`speed-${s}`)).toBeTruthy();
    expect(q('speed-1').getAttribute('aria-checked')).toBe('true');
    q('speed-16').click();
    expect(deps.onSpeed).toHaveBeenCalledWith(16);
    expect(q('speed-16').getAttribute('aria-checked')).toBe('true');
    expect(q('speed-1').getAttribute('aria-checked')).toBe('false');
    q('speed-0').click();
    expect(deps.onSpeed).toHaveBeenLastCalledWith(0);
    expect(q('speed-0').getAttribute('aria-label')).toBe('Pause');
  });

  it('toggles orbits and labels as switches', () => {
    const { q, deps } = setup();
    expect(q('toggle-orbits').getAttribute('aria-checked')).toBe('true');
    q('toggle-orbits').click();
    expect(deps.onOrbits).toHaveBeenCalledWith(false);
    expect(q('toggle-orbits').getAttribute('aria-checked')).toBe('false');
    q('toggle-labels').click();
    expect(deps.onLabels).toHaveBeenCalledWith(false);
    q('toggle-labels').click();
    expect(deps.onLabels).toHaveBeenLastCalledWith(true);
  });

  it('offers the five quality choices and reports the tier in effect', () => {
    const { q, deps, store } = setup();
    for (const c of ['auto', 'low', 'medium', 'high', 'ultra']) {
      expect(q(`quality-${c}`)).toBeTruthy();
    }
    expect(q('quality-auto').getAttribute('aria-checked')).toBe('true');
    expect(q('quality-now').textContent).toBe('In use: Auto · High');
    q('quality-low').click();
    expect(deps.onQuality).toHaveBeenCalledWith('low');
    store.set({ quality: 'low' });
    expect(q('quality-now').textContent).toBe('In use: Low');
  });

  it('starts from the saved choice', () => {
    const { q } = setup({}, 'low');
    expect(q('quality-low').getAttribute('aria-checked')).toBe('true');
    expect(q('quality-auto').getAttribute('aria-checked')).toBe('false');
  });

  it('follows the language', () => {
    const { q, store } = setup();
    store.set({ lang: 'de' });
    expect(q('settings-panel').getAttribute('aria-label')).toBe('Einstellungen');
    expect(q('toggle-orbits').textContent).toContain('Bahnlinien');
  });

  it('removes itself on dispose', () => {
    const { settings, root } = setup();
    settings.dispose();
    expect(root.querySelector('[data-testid="settings-panel"]')).toBeNull();
  });
});
