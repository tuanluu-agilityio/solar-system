/**
 * Pure maths for the glowing orbit ribbons (no three.js import, unit-tested).
 * The ribbon shader in `orbitLine.ts` is generated from these constants and mirrors these formulas.
 */

const TAU = Math.PI * 2;

/** Visual style of the orbit ribbons: the single source of truth for the shader constants. */
export const ORBIT_STYLE = {
  /** CSS px, bright centre line. */
  coreWidthPx: 2.4,
  /** CSS px, whole ribbon including the halo. */
  totalWidthPx: 9,
  /** Intensity of the halo relative to the core. */
  haloShare: 0.35,
  /** Brightness far behind the planet. */
  baseIntensity: 0.28,
  /** Brightness at the planet (kept below the bloom threshold). */
  headIntensity: 0.8,
  /** e-fold length of the trail behind the planet, radians. */
  tailRad: 1.1,
  /** Emphasis multiplier while a body is focused. */
  focusEmphasis: 0.3,
  /** Seconds for the emphasis to cover half the distance to its target. */
  emphasisHalfLifeS: 0.35,
  /** Segments around the circle. */
  segments: 256,
} as const;

/** `x` wrapped into [0, 2π). */
function wrapAngle(x: number): number {
  const w = x % TAU;
  return w < 0 ? w + TAU : w;
}

/**
 * Brightness of the ribbon at `vertexAngle`: `headIntensity` on the planet, fading to
 * `baseIntensity` behind its motion.
 * Angles are radians in the sense of `orbitPivot.rotation.y`; a vertex at angle a sits at (r cos a, 0, -r sin a).
 */
export function trailIntensity(vertexAngle: number, planetAngle: number): number {
  const delta = wrapAngle(planetAngle - vertexAngle);
  const { baseIntensity: base, headIntensity: head, tailRad } = ORBIT_STYLE;
  return base + (head - base) * Math.exp(-delta / tailRad);
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Half-width of the core as a share of the ribbon half-width. */
export const CORE_SHARE = ORBIT_STYLE.coreWidthPx / ORBIT_STYLE.totalWidthPx;
/** Half of the core's smooth falloff band (centred on the core edge, kept inside [0, 1]). */
export const CORE_FEATHER = Math.min(CORE_SHARE * 0.5, 1 - CORE_SHARE);

/**
 * Cross-section of the ribbon, `v` in [-1, 1] across its width: a bright core of half-width
 * `CORE_SHARE` (0.5 at its edge) combined with a faint halo of `haloShare`; both reach 0 at |v| = 1.
 */
export function ribbonProfile(v: number): number {
  const x = Math.abs(v);
  const core = 1 - smoothstep(CORE_SHARE - CORE_FEATHER, CORE_SHARE + CORE_FEATHER, x);
  const halo = ORBIT_STYLE.haloShare * (1 - smoothstep(CORE_SHARE, 1, x));
  // Screen-style union: never darker than either part, 1 at the centre, 0 at the edge.
  return 1 - (1 - core) * (1 - halo);
}

/** Frame-rate independent approach of `current` to `target` (exponential, half-life `emphasisHalfLifeS`). */
export function stepEmphasis(current: number, target: number, dtSec: number): number {
  if (!(dtSec > 0)) return current;
  const k = 1 - Math.pow(2, -dtSec / ORBIT_STYLE.emphasisHalfLifeS);
  if (k >= 1) return target;
  return current + (target - current) * k;
}
