// Pure (three.js-free) helpers for the Sun shaders: limb darkening, limb projection,
// reduced-motion handling and the tier -> shader detail mapping.

export type SunDetail = 'low' | 'high';

/**
 * Quadratic limb-darkening law I(mu) / I(1) = 1 - a (1 - mu) - b (1 - mu)^2, with mu the cosine
 * between the surface normal and the line of sight. Coefficients are close to the measured
 * visible-band values for the Sun (the limb is roughly 35-40 % of the centre brightness).
 */
export const LIMB_DARKENING = { a: 0.47, b: 0.16 } as const;

/** Animation speed factor when the user prefers reduced motion (strongly slowed, not frozen). */
export const REDUCED_MOTION_SCALE = 0.15;

export function limbDarkening(mu: number): number {
  const m = 1 - Math.min(1, Math.max(0, mu));
  return 1 - LIMB_DARKENING.a * m - LIMB_DARKENING.b * m * m;
}

/**
 * Radius at which the visible limb of a sphere (radius `r`, seen from distance `d` to its
 * centre) meets the camera-facing plane through the centre. Equals `r` far away and grows as the
 * camera closes in; clamped so it stays finite when the camera is at or inside the sphere.
 */
export function limbRadiusOnPlane(r: number, d: number): number {
  const k = Math.min((r / Math.max(d, 1e-6)) ** 2, 0.98);
  return r / Math.sqrt(1 - k);
}

export function sunTimeScale(reducedMotion: boolean): number {
  return reducedMotion ? REDUCED_MOTION_SCALE : 1;
}

/** Reads `prefers-reduced-motion: reduce`; false when `matchMedia` is missing or throws. */
export function prefersReducedMotion(win: Window | undefined): boolean {
  try {
    return typeof win?.matchMedia === 'function'
      ? win.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  } catch {
    return false;
  }
}

/** Phone tiers take the cheaper shader path; desktop tiers (and any tier above) the full one. */
export function sunDetailForTier(tier: string): SunDetail {
  return tier === 'low' || tier === 'medium' ? 'low' : 'high';
}
