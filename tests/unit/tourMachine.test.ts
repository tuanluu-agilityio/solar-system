import { describe, expect, it } from 'vitest';
import type { TourStopDef } from '../../src/data/types';
import {
  TOUR_GAP_MS,
  initialTour,
  shouldAutostart,
  tourReducer,
  type TourEvent,
  type TourSnapshot,
  type TourStatus,
} from '../../src/tour/tourMachine';

const STOPS: TourStopDef[] = [
  { id: 'intro', focus: 'overview' },
  { id: 'sun', focus: 'sun' },
  { id: 'earth', focus: 'earth' },
  { id: 'outro', focus: 'overview' },
];
const TOTAL = STOPS.length;

function snap(status: TourStatus, index = 0, pausedFrom: TourStatus | null = null): TourSnapshot {
  return { status, index, total: TOTAL, pausedFrom };
}

function run(s: TourSnapshot, e: TourEvent) {
  return tourReducer(s, e, STOPS);
}

const ALL_EVENTS: TourEvent[] = [
  { type: 'START' },
  { type: 'FLIGHT_DONE' },
  { type: 'NARRATION_ENDED' },
  { type: 'GAP_ELAPSED' },
  { type: 'USER_INTERACTED' },
  { type: 'PAUSE' },
  { type: 'RESUME' },
  { type: 'NEXT' },
  { type: 'PREV' },
  { type: 'EXIT' },
  { type: 'LANG_CHANGED' },
];

describe('constants and initial state', () => {
  it('uses a 1500 ms gap', () => {
    expect(TOUR_GAP_MS).toBe(1500);
  });

  it('starts idle at index 0', () => {
    expect(initialTour(13)).toEqual({ status: 'idle', index: 0, total: 13, pausedFrom: null });
  });
});

describe('START', () => {
  it('from idle flies to the first stop; overview focus shows no panel', () => {
    const r = run(initialTour(TOTAL), { type: 'START' });
    expect(r.state).toEqual(snap('flying', 0));
    expect(r.effects).toEqual([
      { type: 'flyTo', stop: STOPS[0] },
      { type: 'showPanel', id: null },
    ]);
  });

  it('from finished restarts at index 0', () => {
    const r = run(snap('finished', TOTAL - 1), { type: 'START' });
    expect(r.state).toEqual(snap('flying', 0));
    expect(r.effects).toEqual([
      { type: 'flyTo', stop: STOPS[0] },
      { type: 'showPanel', id: null },
    ]);
  });

  it('is ignored while a tour is active', () => {
    for (const status of ['flying', 'narrating', 'gap'] as const) {
      const s = snap(status, 2);
      const r = run(s, { type: 'START' });
      expect(r.state).toBe(s);
      expect(r.effects).toEqual([]);
    }
  });

  it('is ignored when there are no stops', () => {
    const s = initialTour(0);
    const r = tourReducer(s, { type: 'START' }, []);
    expect(r.state).toBe(s);
    expect(r.effects).toEqual([]);
  });
});

describe('FLIGHT_DONE', () => {
  it('in flying starts narration and auto-orbit', () => {
    const r = run(snap('flying', 1), { type: 'FLIGHT_DONE' });
    expect(r.state).toEqual(snap('narrating', 1));
    expect(r.effects).toEqual([
      { type: 'playNarration', stopId: 'sun' },
      { type: 'autoOrbit', on: true },
    ]);
  });

  it('is ignored outside flying', () => {
    for (const status of ['idle', 'narrating', 'gap', 'paused', 'finished'] as const) {
      const s = snap(status, 1);
      const r = run(s, { type: 'FLIGHT_DONE' });
      expect(r.state).toBe(s);
      expect(r.effects).toEqual([]);
    }
  });
});

describe('NARRATION_ENDED', () => {
  it('in narrating enters the gap', () => {
    const r = run(snap('narrating', 1), { type: 'NARRATION_ENDED' });
    expect(r.state).toEqual(snap('gap', 1));
    expect(r.effects).toEqual([{ type: 'startGap', ms: 1500 }]);
  });

  it('is ignored outside narrating', () => {
    const s = snap('paused', 1, 'narrating');
    const r = run(s, { type: 'NARRATION_ENDED' });
    expect(r.state).toBe(s);
    expect(r.effects).toEqual([]);
  });
});

describe('GAP_ELAPSED', () => {
  it('flies to the next stop and shows its body panel', () => {
    const r = run(snap('gap', 1), { type: 'GAP_ELAPSED' });
    expect(r.state).toEqual(snap('flying', 2));
    expect(r.effects).toEqual([
      { type: 'flyTo', stop: STOPS[2] },
      { type: 'showPanel', id: 'earth' },
    ]);
  });

  it('on the last stop finishes the tour', () => {
    const r = run(snap('gap', TOTAL - 1), { type: 'GAP_ELAPSED' });
    expect(r.state).toEqual(snap('finished', TOTAL - 1));
    expect(r.effects).toEqual([
      { type: 'autoOrbit', on: false },
      { type: 'showPanel', id: null },
    ]);
  });

  it('is ignored outside gap', () => {
    const s = snap('paused', 1, 'gap');
    const r = run(s, { type: 'GAP_ELAPSED' });
    expect(r.state).toBe(s);
    expect(r.effects).toEqual([]);
  });
});

describe('USER_INTERACTED and PAUSE', () => {
  for (const type of ['USER_INTERACTED', 'PAUSE'] as const) {
    it(`${type} pauses flying, narrating and gap`, () => {
      for (const status of ['flying', 'narrating', 'gap'] as const) {
        const r = run(snap(status, 2), { type });
        expect(r.state).toEqual(snap('paused', 2, status));
        expect(r.effects).toEqual([
          { type: 'stopNarration' },
          { type: 'cancelGap' },
          { type: 'autoOrbit', on: false },
        ]);
      }
    });

    it(`${type} is ignored in idle, finished and paused`, () => {
      for (const s of [snap('idle'), snap('finished', 3), snap('paused', 2, 'gap')]) {
        const r = run(s, { type });
        expect(r.state).toBe(s);
        expect(r.effects).toEqual([]);
      }
    });
  }
});

describe('RESUME', () => {
  it('re-flies the same stop regardless of where it paused', () => {
    for (const from of ['flying', 'narrating', 'gap'] as const) {
      const r = run(snap('paused', 2, from), { type: 'RESUME' });
      expect(r.state).toEqual(snap('flying', 2));
      expect(r.effects).toEqual([
        { type: 'flyTo', stop: STOPS[2] },
        { type: 'showPanel', id: 'earth' },
      ]);
    }
  });

  it('is ignored outside paused', () => {
    const s = snap('narrating', 2);
    const r = run(s, { type: 'RESUME' });
    expect(r.state).toBe(s);
    expect(r.effects).toEqual([]);
  });
});

describe('NEXT and PREV', () => {
  it('NEXT advances and re-flies', () => {
    const r = run(snap('narrating', 1), { type: 'NEXT' });
    expect(r.state).toEqual(snap('flying', 2));
    expect(r.effects).toEqual([
      { type: 'stopNarration' },
      { type: 'cancelGap' },
      { type: 'flyTo', stop: STOPS[2] },
      { type: 'showPanel', id: 'earth' },
    ]);
  });

  it('NEXT clamps at the last stop and re-flies it', () => {
    const r = run(snap('gap', TOTAL - 1), { type: 'NEXT' });
    expect(r.state).toEqual(snap('flying', TOTAL - 1));
    expect(r.effects).toEqual([
      { type: 'stopNarration' },
      { type: 'cancelGap' },
      { type: 'flyTo', stop: STOPS[TOTAL - 1] },
      { type: 'showPanel', id: null },
    ]);
  });

  it('PREV goes back one stop', () => {
    const r = run(snap('flying', 2), { type: 'PREV' });
    expect(r.state).toEqual(snap('flying', 1));
    expect(r.effects).toEqual([
      { type: 'stopNarration' },
      { type: 'cancelGap' },
      { type: 'flyTo', stop: STOPS[1] },
      { type: 'showPanel', id: 'sun' },
    ]);
  });

  it('PREV at 0 stays at 0 and re-flies', () => {
    const r = run(snap('narrating', 0), { type: 'PREV' });
    expect(r.state).toEqual(snap('flying', 0));
    expect(r.effects).toEqual([
      { type: 'stopNarration' },
      { type: 'cancelGap' },
      { type: 'flyTo', stop: STOPS[0] },
      { type: 'showPanel', id: null },
    ]);
  });

  it('works from paused and clears pausedFrom', () => {
    const r = run(snap('paused', 1, 'narrating'), { type: 'NEXT' });
    expect(r.state).toEqual(snap('flying', 2));
  });

  it('is ignored in idle and finished', () => {
    for (const s of [snap('idle'), snap('finished', 3)]) {
      for (const type of ['NEXT', 'PREV'] as const) {
        const r = run(s, { type });
        expect(r.state).toBe(s);
        expect(r.effects).toEqual([]);
      }
    }
  });
});

describe('EXIT', () => {
  it('from any non-idle state returns to idle', () => {
    const states = [
      snap('flying', 2),
      snap('narrating', 2),
      snap('gap', 2),
      snap('paused', 2, 'gap'),
      snap('finished', 3),
    ];
    for (const s of states) {
      const r = run(s, { type: 'EXIT' });
      expect(r.state).toEqual(snap('idle', 0));
      expect(r.effects).toEqual([
        { type: 'stopNarration' },
        { type: 'cancelGap' },
        { type: 'autoOrbit', on: false },
      ]);
    }
  });

  it('is ignored in idle', () => {
    const s = initialTour(TOTAL);
    const r = run(s, { type: 'EXIT' });
    expect(r.state).toBe(s);
    expect(r.effects).toEqual([]);
  });
});

describe('LANG_CHANGED', () => {
  it('while narrating restarts the same stop narration', () => {
    const s = snap('narrating', 2);
    const r = run(s, { type: 'LANG_CHANGED' });
    expect(r.state).toEqual(s);
    expect(r.effects).toEqual([
      { type: 'stopNarration' },
      { type: 'playNarration', stopId: 'earth' },
    ]);
  });

  it('in other states does nothing', () => {
    for (const status of ['idle', 'flying', 'gap', 'finished'] as const) {
      const s = snap(status, 1);
      const r = run(s, { type: 'LANG_CHANGED' });
      expect(r.state).toBe(s);
      expect(r.effects).toEqual([]);
    }
    const p = snap('paused', 1, 'narrating');
    expect(run(p, { type: 'LANG_CHANGED' }).effects).toEqual([]);
  });
});

describe('purity', () => {
  it('never mutates the input snapshot', () => {
    const statuses: TourStatus[] = ['idle', 'flying', 'narrating', 'gap', 'paused', 'finished'];
    for (const status of statuses) {
      for (const e of ALL_EVENTS) {
        const s = Object.freeze(snap(status, 1, status === 'paused' ? 'flying' : null));
        expect(() => run(s, e)).not.toThrow();
      }
    }
  });

  it('drives a full tour from start to finished', () => {
    let s = initialTour(TOTAL);
    s = run(s, { type: 'START' }).state;
    for (let i = 0; i < TOTAL; i++) {
      expect(s).toEqual(snap('flying', i));
      s = run(s, { type: 'FLIGHT_DONE' }).state;
      s = run(s, { type: 'NARRATION_ENDED' }).state;
      s = run(s, { type: 'GAP_ELAPSED' }).state;
    }
    expect(s).toEqual(snap('finished', TOTAL - 1));
  });
});

describe('shouldAutostart', () => {
  it('autostarts only when the tour has not been seen', () => {
    expect(shouldAutostart(false, false, false)).toBe(true);
    expect(shouldAutostart(true, false, false)).toBe(false);
  });

  it('never autostarts under E2E unless forced', () => {
    expect(shouldAutostart(false, true, false)).toBe(false);
    expect(shouldAutostart(false, true, true)).toBe(true);
  });

  it('forceAutostart never overrides tourSeen (autostart only once)', () => {
    expect(shouldAutostart(true, true, true)).toBe(false);
    expect(shouldAutostart(true, false, true)).toBe(false);
    expect(shouldAutostart(false, false, true)).toBe(true);
  });
});
