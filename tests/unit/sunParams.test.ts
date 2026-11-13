import { describe, expect, it } from 'vitest';
import {
  LIMB_DARKENING,
  REDUCED_MOTION_SCALE,
  limbDarkening,
  limbRadiusOnPlane,
  prefersReducedMotion,
  sunDetailForTier,
  sunTimeScale,
} from '../../src/bodies/sunParams';

describe('sunParams', () => {
  it('limb darkening is 1 at disc centre and falls to 1 - (a + b) at the limb', () => {
    expect(limbDarkening(1)).toBeCloseTo(1);
    expect(limbDarkening(0)).toBeCloseTo(1 - LIMB_DARKENING.a - LIMB_DARKENING.b);
    // Monotonic: brighter towards the centre.
    expect(limbDarkening(0.5)).toBeGreaterThan(limbDarkening(0.2));
    expect(limbDarkening(0.9)).toBeGreaterThan(limbDarkening(0.5));
    // Real Sun in the visible band: the limb is roughly 30-45 % of the centre.
    expect(limbDarkening(0)).toBeGreaterThan(0.25);
    expect(limbDarkening(0)).toBeLessThan(0.5);
  });

  it('clamps mu outside [0, 1]', () => {
    expect(limbDarkening(-1)).toBeCloseTo(limbDarkening(0));
    expect(limbDarkening(2)).toBeCloseTo(1);
  });

  it('projects the visible limb onto the plane through the centre', () => {
    // Far away the silhouette radius equals the sphere radius.
    expect(limbRadiusOnPlane(1, 1e6)).toBeCloseTo(1, 5);
    // At d = 2R the tangent cone meets the centre plane at R / sqrt(1 - 1/4).
    expect(limbRadiusOnPlane(1, 2)).toBeCloseTo(1 / Math.sqrt(0.75));
    // Inside or on the sphere it stays finite.
    expect(Number.isFinite(limbRadiusOnPlane(1, 0.5))).toBe(true);
    expect(limbRadiusOnPlane(1, 0.5)).toBeGreaterThan(1);
  });

  it('slows the animation strongly for reduced motion', () => {
    expect(sunTimeScale(false)).toBe(1);
    expect(sunTimeScale(true)).toBe(REDUCED_MOTION_SCALE);
    expect(REDUCED_MOTION_SCALE).toBeGreaterThan(0);
    expect(REDUCED_MOTION_SCALE).toBeLessThanOrEqual(0.25);
  });

  it('reads prefers-reduced-motion safely', () => {
    expect(prefersReducedMotion(undefined)).toBe(false);
    expect(prefersReducedMotion({} as unknown as Window)).toBe(false);
    const yes = { matchMedia: (q: string) => ({ matches: q.includes('reduce') }) };
    expect(prefersReducedMotion(yes as unknown as Window)).toBe(true);
    const throws = {
      matchMedia: () => {
        throw new Error('nope');
      },
    };
    expect(prefersReducedMotion(throws as unknown as Window)).toBe(false);
  });

  it('uses the cheap shader path on the phone tiers', () => {
    expect(sunDetailForTier('low')).toBe('low');
    expect(sunDetailForTier('medium')).toBe('low');
    expect(sunDetailForTier('high')).toBe('high');
  });
});
