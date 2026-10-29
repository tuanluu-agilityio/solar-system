import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../../src/state/store';

describe('createStore', () => {
  it('notifies with (next, prev)', () => {
    const s = createStore({ a: 1, b: 2 });
    const fn = vi.fn();
    s.subscribe(fn);
    s.set({ a: 5 });
    expect(fn).toHaveBeenCalledWith({ a: 5, b: 2 }, { a: 1, b: 2 });
    expect(s.get()).toEqual({ a: 5, b: 2 });
  });
  it('unsubscribe stops notifications', () => {
    const s = createStore({ a: 1 });
    const fn = vi.fn();
    const off = s.subscribe(fn);
    off();
    s.set({ a: 2 });
    expect(fn).not.toHaveBeenCalled();
  });
  it('identical set does not notify', () => {
    const s = createStore({ a: 1 });
    const fn = vi.fn();
    s.subscribe(fn);
    s.set({ a: 1 });
    s.set({});
    expect(fn).not.toHaveBeenCalled();
  });
});
