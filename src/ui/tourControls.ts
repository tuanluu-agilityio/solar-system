import { t } from '../i18n/i18n';
import type { AppState } from '../state/appState';
import type { Store } from '../state/store';
import type { TourEvent, TourStatus } from '../tour/tourMachine';

/** The bottom-centre column shared by the subtitles and the tour controls. */
export function getTourDock(root: HTMLElement): HTMLElement {
  const existing = root.querySelector<HTMLElement>(':scope > .tour-dock');
  if (existing) return existing;
  const dock = document.createElement('div');
  dock.className = 'tour-dock';
  root.append(dock);
  return dock;
}

export function isTourActive(status: TourStatus): boolean {
  return status !== 'idle' && status !== 'finished';
}

function button(testId: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ctl-btn glass tour-btn';
  b.setAttribute('data-testid', testId);
  return b;
}

/**
 * Pause/resume, previous, next, exit and the "Stop n of 14" progress. Shown only while a
 * tour is active. While paused the pause button becomes a prominent labelled resume button.
 * Also marks `root` (`data-tour`, `data-panel`) so CSS can hide the hint and keep the dock
 * clear of the desktop panel.
 */
export function createTourControls(
  root: HTMLElement,
  store: Store<AppState>,
  dispatch: (e: TourEvent) => void,
): { dispose(): void } {
  const dock = getTourDock(root);
  const bar = document.createElement('div');
  bar.className = 'tour-controls';
  bar.hidden = true;
  const prev = button('tour-prev');
  prev.textContent = '⏮';
  const pause = button('tour-pause');
  const next = button('tour-next');
  next.textContent = '⏭';
  const exit = button('tour-exit');
  exit.textContent = '✕';
  const progress = document.createElement('span');
  progress.className = 'tour-progress';
  progress.setAttribute('data-testid', 'tour-progress');
  progress.setAttribute('aria-live', 'polite');
  bar.append(prev, pause, next, progress, exit);
  dock.append(bar);

  const render = (): void => {
    const { lang, tour, selected, layout } = store.get();
    const active = isTourActive(tour.status);
    bar.hidden = !active;
    if (active) root.dataset.tour = 'active';
    else delete root.dataset.tour;
    if (active && selected !== null && layout === 'desktop') root.dataset.panel = 'desktop';
    else delete root.dataset.panel;

    const paused = tour.status === 'paused';
    pause.classList.toggle('tour-resume', paused);
    pause.textContent = paused ? `▶ ${t(lang, 'tour.resume')}` : '⏸';
    pause.setAttribute('aria-label', t(lang, paused ? 'tour.resume' : 'tour.pause'));
    prev.setAttribute('aria-label', t(lang, 'tour.prev'));
    next.setAttribute('aria-label', t(lang, 'tour.next'));
    exit.setAttribute('aria-label', t(lang, 'tour.exit'));
    progress.textContent = t(lang, 'tour.progress', {
      current: tour.index + 1,
      total: tour.total,
    });
  };
  render();

  pause.addEventListener('click', () =>
    dispatch({ type: store.get().tour.status === 'paused' ? 'RESUME' : 'PAUSE' }),
  );
  prev.addEventListener('click', () => dispatch({ type: 'PREV' }));
  next.addEventListener('click', () => dispatch({ type: 'NEXT' }));
  exit.addEventListener('click', () => dispatch({ type: 'EXIT' }));
  const unsub = store.subscribe(render);

  return {
    dispose() {
      unsub();
      bar.remove();
      if (dock.childElementCount === 0) dock.remove();
      delete root.dataset.tour;
      delete root.dataset.panel;
    },
  };
}
