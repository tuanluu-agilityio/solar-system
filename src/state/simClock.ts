/** Simulation speeds offered in the settings (0 = pause). */
export const SPEED_OPTIONS = [0, 0.25, 1, 4, 16] as const;
export type SimSpeed = (typeof SPEED_OPTIONS)[number];

export interface SimClock {
  /** Simulation time in seconds: the sum of every `dt * speed` so far. */
  readonly time: number;
  readonly speed: number;
  advance(dtSec: number): void;
  setSpeed(speed: number): void;
}

/**
 * Time that drives the planets' orbits and spins. Accumulating `dt * speed` (rather than
 * scaling wall time) keeps the time continuous when the speed changes.
 */
export function createSimClock(start = 0): SimClock {
  let time = start;
  let speed = 1;
  return {
    get time() {
      return time;
    },
    get speed() {
      return speed;
    },
    advance(dtSec) {
      if (Number.isFinite(dtSec) && dtSec > 0) time += dtSec * speed;
    },
    setSpeed(next) {
      if (Number.isFinite(next) && next >= 0) speed = next;
    },
  };
}
