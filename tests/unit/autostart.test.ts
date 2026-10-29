import { describe, expect, it } from 'vitest';
import { autostartStillWanted } from '../../src/tour/tourMachine';

describe('autostartStillWanted (checked when the 3 s autostart delay ends)', () => {
  const quiet = { tourSeen: false, userInteracted: false, selected: null };

  it('starts when nothing happened during the wait', () => {
    expect(autostartStillWanted(quiet)).toBe(true);
  });
  it('skips when a tour was already started (the flag is set)', () => {
    expect(autostartStillWanted({ ...quiet, tourSeen: true })).toBe(false);
  });
  it('skips after a canvas tap, drag or zoom, or a selection', () => {
    expect(autostartStillWanted({ ...quiet, userInteracted: true })).toBe(false);
  });
  it('skips while a body is selected', () => {
    expect(autostartStillWanted({ ...quiet, selected: 'mars' })).toBe(false);
  });
});
