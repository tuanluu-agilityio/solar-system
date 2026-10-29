import type { TourTimers } from './tourController';

export interface ScaledTimers extends TourTimers {
  /** Runs the clock and new timeouts `n` times faster (e2e only). Pending timeouts keep their delay. */
  setScale(n: number): void;
}

/** Wraps real timers with a speed factor; the scaled clock stays continuous across changes. */
export function createScaledTimers(base: TourTimers): ScaledTimers {
  let scale = 1;
  let realAnchor = base.now();
  let scaledAnchor = realAnchor;
  const now = (): number => scaledAnchor + (base.now() - realAnchor) * scale;
  return {
    now,
    setTimeout: (fn, ms) => base.setTimeout(fn, ms / scale),
    clearTimeout: (id) => base.clearTimeout(id),
    setScale(n) {
      if (!Number.isFinite(n) || n <= 0) return;
      scaledAnchor = now();
      realAnchor = base.now();
      scale = n;
    },
  };
}
