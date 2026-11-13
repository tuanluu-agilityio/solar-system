import { describe, expect, it } from 'vitest';
import { NAV_ORDER } from '../../src/data/navOrder';
import { BODY_IDS } from '../../src/data/types';

describe('NAV_ORDER', () => {
  it('lists every body once plus the asteroid belt right after Mars', () => {
    expect(new Set(NAV_ORDER).size).toBe(NAV_ORDER.length);
    expect(NAV_ORDER.filter((id) => id !== 'asteroid-belt')).toEqual([...BODY_IDS]);
    expect(NAV_ORDER[NAV_ORDER.indexOf('mars') + 1]).toBe('asteroid-belt');
    expect(NAV_ORDER[0]).toBe('sun');
  });
});
