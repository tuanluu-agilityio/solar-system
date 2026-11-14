import { describe, expect, it } from 'vitest';
import { SPEED_OPTIONS, createSimClock } from '../../src/state/simClock';

describe('simClock', () => {
  it('starts at the given time at 1x and follows wall time at 1x', () => {
    const c = createSimClock(5);
    expect(c.time).toBe(5);
    expect(c.speed).toBe(1);
    c.advance(0.5);
    c.advance(0.25);
    expect(c.time).toBeCloseTo(5.75, 10);
  });
  it('accumulates dt * speed so changing speed never jumps the time', () => {
    const c = createSimClock();
    c.advance(2);
    c.setSpeed(4);
    expect(c.time).toBe(2);
    c.advance(1);
    expect(c.time).toBe(6);
    c.setSpeed(0.25);
    c.advance(4);
    expect(c.time).toBe(7);
  });
  it('freezes at speed 0', () => {
    const c = createSimClock();
    c.advance(1);
    c.setSpeed(0);
    c.advance(10);
    expect(c.time).toBe(1);
  });
  it('ignores negative or non-finite dt and speeds', () => {
    const c = createSimClock();
    c.advance(-1);
    c.advance(Number.NaN);
    c.setSpeed(-3);
    c.setSpeed(Number.POSITIVE_INFINITY);
    expect(c.time).toBe(0);
    expect(c.speed).toBe(1);
  });
  it('offers pause, 0.25x, 1x, 4x and 16x', () => {
    expect([...SPEED_OPTIONS]).toEqual([0, 0.25, 1, 4, 16]);
  });
});
