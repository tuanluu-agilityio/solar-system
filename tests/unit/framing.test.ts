import { describe, expect, it } from 'vitest';
import { focusDistance, focusScreenOffset, OVERVIEW_FIT_RADIUS } from '../../src/camera/framing';
import { displayOrbitRadius } from '../../src/config/scale';

describe('focusDistance', () => {
  it('grows linearly with radius', () => {
    const a = focusDistance(2, 50, 1.5);
    const b = focusDistance(4, 50, 1.5);
    expect(b / a).toBeCloseTo(2, 6);
  });
  it('narrower aspect gives larger distance', () => {
    expect(focusDistance(1, 50, 0.5)).toBeGreaterThan(focusDistance(1, 50, 1.5));
  });
  it('stays outside the body', () => {
    expect(focusDistance(1, 50, 1)).toBeGreaterThan(1);
    expect(focusDistance(1, 50, 1)).toBeGreaterThanOrEqual(1.6);
  });
});

describe('focusScreenOffset', () => {
  it('mobile shifts up', () => expect(focusScreenOffset('mobile')).toEqual({ x: 0, y: 0.45 }));
  it('desktop shifts right', () => expect(focusScreenOffset('desktop')).toEqual({ x: 0.25, y: 0 }));
});

describe('OVERVIEW_FIT_RADIUS', () => {
  it('is Pluto orbit plus 10', () =>
    expect(OVERVIEW_FIT_RADIUS).toBeCloseTo(displayOrbitRadius(5906.4) + 10, 9));
});
