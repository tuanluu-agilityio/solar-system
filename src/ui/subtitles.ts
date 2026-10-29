import { t } from '../i18n/i18n';
import type { AppState } from '../state/appState';
import type { Store } from '../state/store';
import type { Cue } from '../tour/narration';
import { getTourDock, isTourActive } from './tourControls';

export interface SubtitleOptions {
  currentCue(): Cue | null;
  onUnmute(): void;
}

/**
 * Tour captions: the current narration cue (textContent only), shown only while narrating.
 * While the tour runs muted, a tappable "turn on sound" hint sits above it.
 * `update()` runs every frame and touches the DOM only when the text changes.
 */
export function createSubtitles(
  root: HTMLElement,
  store: Store<AppState>,
  opts: SubtitleOptions,
): { update(): void; dispose(): void } {
  const dock = getTourDock(root);
  const wrap = document.createElement('div');
  wrap.className = 'subtitles-wrap';
  const unmute = document.createElement('button');
  unmute.type = 'button';
  unmute.className = 'ctl-btn glass tour-unmute';
  unmute.setAttribute('data-testid', 'tour-unmute');
  unmute.hidden = true;
  const caption = document.createElement('p');
  caption.className = 'subtitles glass';
  caption.setAttribute('data-testid', 'subtitles');
  caption.setAttribute('aria-live', 'polite');
  caption.hidden = true;
  wrap.append(unmute, caption);
  dock.prepend(wrap);

  let shown = '';
  const renderHint = (): void => {
    const { lang, muted, tour } = store.get();
    unmute.textContent = `🔊 ${t(lang, 'tour.unmuteHint')}`;
    unmute.hidden = !(muted && isTourActive(tour.status));
  };
  renderHint();
  unmute.addEventListener('click', () => opts.onUnmute());
  const unsub = store.subscribe(renderHint);

  return {
    update() {
      const cue = store.get().tour.status === 'narrating' ? opts.currentCue() : null;
      const text = cue?.text ?? '';
      if (text !== shown) {
        shown = text;
        caption.textContent = text;
      }
      caption.hidden = text === '';
    },
    dispose() {
      unsub();
      wrap.remove();
      if (dock.childElementCount === 0) dock.remove();
    },
  };
}
