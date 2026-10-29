import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '../../src/i18n/i18n';
import type { AppState } from '../../src/state/appState';
import { createStore, type Store } from '../../src/state/store';
import type { Cue } from '../../src/tour/narration';
import { initialTour, type TourSnapshot } from '../../src/tour/tourMachine';
import { createSubtitles } from '../../src/ui/subtitles';
import { createTourControls } from '../../src/ui/tourControls';

function makeStore(): Store<AppState> {
  return createStore<AppState>({
    lang: 'en',
    muted: true,
    selected: null,
    view: 'overview',
    layout: 'desktop',
    quality: 'medium',
    tour: initialTour(14),
    ready: true,
  });
}

const tour = (status: TourSnapshot['status'], index = 0): TourSnapshot => ({
  status,
  index,
  total: 14,
  pausedFrom: status === 'paused' ? 'narrating' : null,
});

const byId = (root: HTMLElement, id: string): HTMLElement =>
  root.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('tour controls', () => {
  function setup() {
    const root = document.createElement('div');
    document.body.append(root);
    const store = makeStore();
    const dispatch = vi.fn();
    const ui = createTourControls(root, store, dispatch);
    return { root, store, dispatch, ui };
  }

  it('is hidden while idle or finished and shows progress while running', () => {
    const { root, store } = setup();
    const bar = root.querySelector<HTMLElement>('.tour-controls')!;
    expect(bar.hidden).toBe(true);
    expect(root.dataset.tour).toBeUndefined();
    store.set({ tour: tour('flying', 4) });
    expect(bar.hidden).toBe(false);
    expect(root.dataset.tour).toBe('active');
    expect(byId(root, 'tour-progress').textContent).toBe(
      t('en', 'tour.progress', { current: 5, total: 14 }),
    );
    store.set({ lang: 'vi' });
    expect(byId(root, 'tour-progress').textContent).toBe(
      t('vi', 'tour.progress', { current: 5, total: 14 }),
    );
    store.set({ tour: tour('finished', 13) });
    expect(bar.hidden).toBe(true);
  });

  it('dispatches PAUSE, PREV, NEXT and EXIT', () => {
    const { root, store, dispatch } = setup();
    store.set({ tour: tour('narrating', 3) });
    for (const [id, type] of [
      ['tour-pause', 'PAUSE'],
      ['tour-prev', 'PREV'],
      ['tour-next', 'NEXT'],
      ['tour-exit', 'EXIT'],
    ] as const) {
      byId(root, id).click();
      expect(dispatch).toHaveBeenLastCalledWith({ type });
    }
    expect(byId(root, 'tour-pause').getAttribute('aria-label')).toBe(t('en', 'tour.pause'));
  });

  it('turns the pause button into a prominent resume button while paused', () => {
    const { root, store, dispatch } = setup();
    store.set({ tour: tour('paused', 3) });
    const pause = byId(root, 'tour-pause');
    expect(pause.textContent).toContain(t('en', 'tour.resume'));
    expect(pause.classList.contains('tour-resume')).toBe(true);
    pause.click();
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'RESUME' });
  });

  it('marks the root when the desktop panel is open so the dock clears it', () => {
    const { root, store } = setup();
    store.set({ tour: tour('narrating', 4), selected: 'earth', view: 'focus' });
    expect(root.dataset.panel).toBe('desktop');
    store.set({ layout: 'mobile' });
    expect(root.dataset.panel).toBeUndefined();
  });

  it('dispose removes everything', () => {
    const { root, store, ui } = setup();
    store.set({ tour: tour('flying', 1) });
    ui.dispose();
    expect(root.querySelector('.tour-dock')).toBeNull();
    expect(root.dataset.tour).toBeUndefined();
  });
});

describe('subtitles', () => {
  function setup(cue: { current: Cue | null }) {
    const root = document.createElement('div');
    document.body.append(root);
    const store = makeStore();
    const onUnmute = vi.fn();
    const subs = createSubtitles(root, store, { currentCue: () => cue.current, onUnmute });
    return { root, store, onUnmute, subs };
  }

  it('shows the current cue as text only while narrating', () => {
    const cue: { current: Cue | null } = {
      current: { startMs: 0, endMs: 1, text: '<b>Hello</b> Sun.' },
    };
    const { root, store, subs } = setup(cue);
    const box = byId(root, 'subtitles');
    subs.update();
    expect(box.hidden).toBe(true);
    store.set({ tour: tour('narrating', 1) });
    subs.update();
    expect(box.hidden).toBe(false);
    expect(box.textContent).toBe('<b>Hello</b> Sun.');
    expect(box.querySelector('b')).toBeNull();
    cue.current = null;
    subs.update();
    expect(box.hidden).toBe(true);
    cue.current = { startMs: 0, endMs: 1, text: 'Next.' };
    store.set({ tour: tour('gap', 1) });
    subs.update();
    expect(box.hidden).toBe(true);
  });

  it('shows a bilingual unmute hint while the tour runs muted, which unmutes on tap', () => {
    const { root, store, onUnmute } = setup({ current: null });
    const hint = byId(root, 'tour-unmute');
    expect(hint.hidden).toBe(true);
    store.set({ tour: tour('flying', 0) });
    expect(hint.hidden).toBe(false);
    expect(hint.textContent).toContain(t('en', 'tour.unmuteHint'));
    store.set({ lang: 'vi' });
    expect(hint.textContent).toContain(t('vi', 'tour.unmuteHint'));
    // The text sits in a collapsible label (phones show only the icon); the name stays.
    expect(hint.querySelector('.ctl-label')?.textContent).toBe(t('vi', 'tour.unmuteHint'));
    expect(hint.getAttribute('aria-label')).toBe(t('vi', 'tour.unmuteHint'));
    hint.click();
    expect(onUnmute).toHaveBeenCalledTimes(1);
    store.set({ muted: false });
    expect(hint.hidden).toBe(true);
  });
});
