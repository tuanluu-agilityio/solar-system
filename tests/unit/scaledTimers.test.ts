import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createScaledTimers } from '../../src/tour/scaledTimers';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const base = {
  setTimeout: (fn: () => void, ms: number) => window.setTimeout(fn, ms),
  clearTimeout: (id: number) => window.clearTimeout(id),
  now: () => Date.now(),
};

describe('createScaledTimers', () => {
  it('behaves like the base timers at scale 1', () => {
    const t = createScaledTimers(base);
    const fn = vi.fn();
    const t0 = t.now();
    t.setTimeout(fn, 1000);
    vi.advanceTimersByTime(999);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(t.now() - t0).toBe(1000);
  });

  it('runs timeouts and the clock n times faster after setScale(n)', () => {
    const t = createScaledTimers(base);
    vi.advanceTimersByTime(500);
    const t0 = t.now();
    t.setScale(20);
    const fn = vi.fn();
    t.setTimeout(fn, 2000);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(t.now() - t0).toBe(2000);
  });

  it('keeps the clock continuous across scale changes and ignores invalid scales', () => {
    const t = createScaledTimers(base);
    t.setScale(10);
    vi.advanceTimersByTime(100);
    const mid = t.now();
    t.setScale(1);
    expect(t.now()).toBe(mid);
    t.setScale(0);
    t.setScale(Number.NaN);
    vi.advanceTimersByTime(100);
    expect(t.now() - mid).toBe(100);
  });

  it('clearTimeout cancels', () => {
    const t = createScaledTimers(base);
    const fn = vi.fn();
    t.clearTimeout(t.setTimeout(fn, 10));
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });
});
