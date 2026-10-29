import { NARRATION_LOAD_TIMEOUT_MS, type AudioEngine } from '../audio/audioEngine';
import type { CameraRig } from '../camera/cameraRig';
import { TOUR_STOPS } from '../data/tour/stops';
import type { Lang, TourStopId } from '../data/types';
import type { SolarSystem } from '../scene/solarSystem';
import type { AppState } from '../state/appState';
import type { Store } from '../state/store';
import { cueAt, resolveSegment, type Cue, type NarrationManifest } from './narration';
import { tourReducer, type TourEffect, type TourEvent } from './tourMachine';

export interface TourTimers {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
  now(): number;
}

export interface TourDeps {
  rig: Pick<CameraRig, 'flyTo' | 'flyToOverview' | 'setAutoOrbit' | 'onUserInteract'>;
  system: Pick<SolarSystem, 'getFocusTarget'>;
  audio: Pick<AudioEngine, 'playNarration' | 'stopNarration' | 'narrationTimeMs'>;
  store: Store<AppState>;
  manifest: NarrationManifest | null;
  scripts: Record<Lang, Record<string, { text: string }>>;
  timers: TourTimers;
  /** Maps a manifest file path to a fetchable URL (main prefixes the deploy base). */
  audioUrl?: (file: string) => string;
}

export interface TourController {
  dispatch(e: TourEvent): void;
  /** The subtitle cue to show now; null unless narrating. */
  currentCue(): Cue | null;
  dispose(): void;
}

/**
 * Extra time past the clip length (plus the engine's load timeout) after which a clip that
 * started but stalled (network, decoder) is abandoned so the tour never hangs.
 */
export const NARRATION_STALL_GRACE_MS = 2000;

/** First visit: the tour starts this long after the scene is ready (spec §3.8). */
export const TOUR_AUTOSTART_DELAY_MS = 3000;

interface Narration {
  stopId: TourStopId;
  cues: Cue[];
  startedAt: number;
  /** True while the audio element drives the cue clock (it played and has not failed). */
  audioClock: boolean;
  /** The manifest has a recording for this stop and language. */
  hasAudio: boolean;
}

/**
 * Runs the tour: feeds events to the pure `tourReducer`, mirrors the snapshot into
 * `store.tour` and applies the effects (camera flights, panel, narration, gap timer).
 * Every async completion carries a generation number, so stale completions are ignored.
 */
export function createTourController(deps: TourDeps): TourController {
  const { rig, system, audio, store, manifest, scripts, timers } = deps;
  const audioUrl = deps.audioUrl ?? ((file: string) => file);

  let flightGen = 0;
  let narrationGen = 0;
  let narration: Narration | null = null;
  const narrationTimers: number[] = [];
  let gapTimer: number | null = null;
  let disposed = false;

  const queue: TourEvent[] = [];
  let dispatching = false;

  function clearNarrationTimers(): void {
    for (const id of narrationTimers.splice(0)) timers.clearTimeout(id);
  }

  function stopNarration(): void {
    narrationGen++;
    clearNarrationTimers();
    narration = null;
    audio.stopNarration();
  }

  function narrationEnded(gen: number): void {
    if (gen !== narrationGen) return;
    clearNarrationTimers();
    dispatch({ type: 'NARRATION_ENDED' });
  }

  function playNarration(stopId: TourStopId): void {
    narrationGen++;
    clearNarrationTimers();
    const gen = narrationGen;
    const { lang, muted } = store.get();
    const text = scripts[lang][stopId]?.text ?? '';
    const seg = resolveSegment(manifest, stopId, lang, text);
    const useAudio = seg.audio && !muted;
    const startedAt = timers.now();
    narration = { stopId, cues: seg.cues, startedAt, audioClock: useAudio, hasAudio: seg.audio };

    if (!useAudio) {
      narrationTimers.push(timers.setTimeout(() => narrationEnded(gen), seg.durationMs));
      return;
    }
    // Watchdog: a clip that never loads resolves 'error' after the engine's load timeout,
    // but one that stalls after it started would never end on its own.
    narrationTimers.push(
      timers.setTimeout(
        () => {
          if (gen !== narrationGen) return;
          audio.stopNarration();
          narrationEnded(gen);
        },
        seg.durationMs + NARRATION_LOAD_TIMEOUT_MS + NARRATION_STALL_GRACE_MS,
      ),
    );
    void audio.playNarration(audioUrl(seg.file)).then((result) => {
      if (gen !== narrationGen || disposed) return;
      if (result === 'ended') {
        narrationEnded(gen);
      } else if (result === 'error') {
        // Review Focus 4: the stop still lasts the manifest duration, subtitles only.
        if (narration) narration.audioClock = false;
        clearNarrationTimers();
        const remaining = Math.max(0, seg.durationMs - (timers.now() - startedAt));
        narrationTimers.push(timers.setTimeout(() => narrationEnded(gen), remaining));
      }
      // 'stopped': superseded by another clip; the generation check covers it.
    });
  }

  function flyTo(effect: Extract<TourEffect, { type: 'flyTo' }>): void {
    const gen = ++flightGen;
    const { focus } = effect.stop;
    const flight =
      focus === 'overview' ? rig.flyToOverview() : rig.flyTo(system.getFocusTarget(focus));
    void flight.then(() => {
      if (gen === flightGen && !disposed) dispatch({ type: 'FLIGHT_DONE' });
    });
  }

  function cancelGap(): void {
    if (gapTimer !== null) timers.clearTimeout(gapTimer);
    gapTimer = null;
  }

  function apply(effect: TourEffect): void {
    switch (effect.type) {
      case 'flyTo':
        flyTo(effect);
        break;
      case 'showPanel':
        store.set({ selected: effect.id, view: effect.id === null ? 'overview' : 'focus' });
        break;
      case 'playNarration':
        playNarration(effect.stopId);
        break;
      case 'stopNarration':
        stopNarration();
        break;
      case 'startGap':
        cancelGap();
        gapTimer = timers.setTimeout(() => {
          gapTimer = null;
          dispatch({ type: 'GAP_ELAPSED' });
        }, effect.ms);
        break;
      case 'cancelGap':
        cancelGap();
        break;
      case 'autoOrbit':
        rig.setAutoOrbit(effect.on);
        break;
    }
  }

  function dispatch(e: TourEvent): void {
    if (disposed) return;
    queue.push(e);
    if (dispatching) return; // applied in order after the current event's effects
    dispatching = true;
    try {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const { state, effects } = tourReducer(store.get().tour, next, TOUR_STOPS);
        if (state !== store.get().tour) store.set({ tour: state });
        effects.forEach(apply);
      }
    } finally {
      dispatching = false;
    }
  }

  const offInteract = rig.onUserInteract(() => dispatch({ type: 'USER_INTERACTED' }));
  const offStore = store.subscribe((s, prev) => {
    if (s.lang !== prev.lang) dispatch({ type: 'LANG_CHANGED' });
    // Unmuting during a subtitle-only stop restarts that stop with its recording.
    if (
      !s.muted &&
      prev.muted &&
      s.tour.status === 'narrating' &&
      narration &&
      narration.hasAudio &&
      !narration.audioClock
    ) {
      const { stopId } = narration;
      stopNarration();
      playNarration(stopId);
    }
  });

  return {
    dispatch,
    currentCue() {
      if (!narration || store.get().tour.status !== 'narrating') return null;
      const ms = narration.audioClock ? audio.narrationTimeMs : timers.now() - narration.startedAt;
      return cueAt(narration.cues, ms);
    },
    dispose() {
      disposed = true;
      offInteract();
      offStore();
      clearNarrationTimers();
      cancelGap();
      narrationGen++;
      flightGen++;
    },
  };
}
