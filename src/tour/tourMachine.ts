import type { ContentId, TourStopDef, TourStopId } from '../data/types';

export type TourStatus = 'idle' | 'flying' | 'narrating' | 'gap' | 'paused' | 'finished';

export interface TourSnapshot {
  status: TourStatus;
  index: number;
  total: number;
  pausedFrom: TourStatus | null;
}

export type TourEvent =
  | { type: 'START' }
  | { type: 'FLIGHT_DONE' }
  | { type: 'NARRATION_ENDED' }
  | { type: 'GAP_ELAPSED' }
  | { type: 'USER_INTERACTED' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'EXIT' }
  | { type: 'LANG_CHANGED' };

export type TourEffect =
  | { type: 'flyTo'; stop: TourStopDef }
  | { type: 'showPanel'; id: ContentId | null }
  | { type: 'playNarration'; stopId: TourStopId }
  | { type: 'stopNarration' }
  | { type: 'startGap'; ms: number }
  | { type: 'cancelGap' }
  | { type: 'autoOrbit'; on: boolean };

export interface TourResult {
  state: TourSnapshot;
  effects: TourEffect[];
}

export const TOUR_GAP_MS = 1500;

export function initialTour(total: number): TourSnapshot {
  return { status: 'idle', index: 0, total, pausedFrom: null };
}

/** Autostart once: never after the tour was seen; under E2E only when forced. */
export function shouldAutostart(
  tourSeen: boolean,
  isE2E: boolean,
  forceAutostart: boolean,
): boolean {
  return !tourSeen && (!isE2E || forceAutostart);
}

function stopAt(stops: TourStopDef[], index: number): TourStopDef {
  const stop = stops[index];
  if (!stop) throw new Error(`Tour stop ${index} is missing`);
  return stop;
}

function panelFor(stop: TourStopDef): ContentId | null {
  return stop.focus === 'overview' ? null : stop.focus;
}

/** Enter `flying` at `index`: fly to the stop and show its panel. */
function flyToIndex(
  s: TourSnapshot,
  index: number,
  stops: TourStopDef[],
  prefix: TourEffect[],
): TourResult {
  const stop = stopAt(stops, index);
  return {
    state: { ...s, status: 'flying', index, pausedFrom: null },
    effects: [...prefix, { type: 'flyTo', stop }, { type: 'showPanel', id: panelFor(stop) }],
  };
}

const HALT: TourEffect[] = [
  { type: 'stopNarration' },
  { type: 'cancelGap' },
  { type: 'autoOrbit', on: false },
];

function isRunning(status: TourStatus): boolean {
  return status === 'flying' || status === 'narrating' || status === 'gap';
}

export function tourReducer(s: TourSnapshot, e: TourEvent, stops: TourStopDef[]): TourResult {
  const unchanged: TourResult = { state: s, effects: [] };
  const last = s.total - 1;

  switch (e.type) {
    case 'START':
      if ((s.status !== 'idle' && s.status !== 'finished') || s.total <= 0) return unchanged;
      return flyToIndex(s, 0, stops, []);

    case 'FLIGHT_DONE':
      if (s.status !== 'flying') return unchanged;
      return {
        state: { ...s, status: 'narrating' },
        effects: [
          { type: 'playNarration', stopId: stopAt(stops, s.index).id },
          { type: 'autoOrbit', on: true },
        ],
      };

    case 'NARRATION_ENDED':
      if (s.status !== 'narrating') return unchanged;
      return { state: { ...s, status: 'gap' }, effects: [{ type: 'startGap', ms: TOUR_GAP_MS }] };

    case 'GAP_ELAPSED':
      if (s.status !== 'gap') return unchanged;
      if (s.index >= last) {
        return {
          state: { ...s, status: 'finished', pausedFrom: null },
          effects: [
            { type: 'autoOrbit', on: false },
            { type: 'showPanel', id: null },
          ],
        };
      }
      return flyToIndex(s, s.index + 1, stops, []);

    case 'USER_INTERACTED':
    case 'PAUSE':
      if (!isRunning(s.status)) return unchanged;
      return { state: { ...s, status: 'paused', pausedFrom: s.status }, effects: [...HALT] };

    case 'RESUME':
      if (s.status !== 'paused') return unchanged;
      return flyToIndex(s, s.index, stops, []);

    case 'NEXT':
    case 'PREV': {
      if (!isRunning(s.status) && s.status !== 'paused') return unchanged;
      const target = Math.min(Math.max(s.index + (e.type === 'NEXT' ? 1 : -1), 0), last);
      return flyToIndex(s, target, stops, [{ type: 'stopNarration' }, { type: 'cancelGap' }]);
    }

    case 'EXIT':
      if (s.status === 'idle') return unchanged;
      return { state: initialTour(s.total), effects: [...HALT] };

    case 'LANG_CHANGED':
      if (s.status !== 'narrating') return unchanged;
      return {
        state: s,
        effects: [
          { type: 'stopNarration' },
          { type: 'playNarration', stopId: stopAt(stops, s.index).id },
        ],
      };
  }
}
