import { describe, expect, it } from 'vitest';
import { moonsOf } from '../../src/data/bodies';
import { NAV_ORDER } from '../../src/data/navOrder';
import { BODY_IDS } from '../../src/data/types';

describe('NAV_ORDER', () => {
  it('lists every body once plus the asteroid belt right after Mars and its moons', () => {
    expect(new Set(NAV_ORDER).size).toBe(NAV_ORDER.length);
    expect(NAV_ORDER.filter((id) => id !== 'asteroid-belt')).toEqual([...BODY_IDS]);
    const lastOfMars = moonsOf('mars').at(-1) ?? 'mars';
    expect(NAV_ORDER[NAV_ORDER.indexOf(lastOfMars) + 1]).toBe('asteroid-belt');
    expect(NAV_ORDER[NAV_ORDER.indexOf('asteroid-belt') + 1]).toBe('jupiter');
    expect(NAV_ORDER[0]).toBe('sun');
  });

  it('puts every planet’s moons right after it, innermost first', () => {
    for (const planet of ['earth', 'mars', 'jupiter', 'saturn'] as const) {
      const i = NAV_ORDER.indexOf(planet);
      const moons = moonsOf(planet);
      expect(moons.length).toBeGreaterThan(0);
      expect(NAV_ORDER.slice(i + 1, i + 1 + moons.length)).toEqual(moons);
    }
  });
});
