// Per-body shading parameters for the shared planet shader (`planetMaterial.ts`). Pure data and
// helpers, no three.js, so the table is unit-tested. Earth has its own shader (`earth.ts`).
import type { BodyId } from '../data/types';

/** How a surface is lit: hard rocky regolith, a cloud deck, or a banded gas/ice giant. */
export type SurfaceKind = 'rocky' | 'cloudDeck' | 'gas' | 'ice';

export interface PlanetLook {
  kind: SurfaceKind;
  /** Relief from albedo luminance gradients (bump strength). 0 = no hard surface. */
  relief: number;
  /** 0 = Lambert, 1 = Lommel-Seeliger (dusty regolith: flat-looking full disc, no limb darkening). */
  lommel: number;
  /** Extra brightening as the phase angle nears zero (opposition surge). */
  opposition: number;
  /** Minnaert exponent: 1 = Lambert; above 1 darkens the limb (gas giants). */
  minnaert: number;
  /** Width of the terminator wrap: 0 = razor sharp (airless), larger = softer (thick air). */
  terminatorSoftness: number;
  /** Albedo multiplier, so every body sits in a similar exposure range. */
  exposure: number;
  /** Limb haze inside the disc. Null for airless bodies. */
  haze: { color: string; strength: number; power: number } | null;
  /** Tint of the twilight band at the terminator (Mars' faint blue). */
  terminatorTint: { color: string; strength: number } | null;
  /**
   * Animated cloud-band flow (gas giants, Venus): bounded two-phase flow-map offsets, so
   * features drift and shear a little but never smear (the Great Red Spot stays put).
   * `speed` is flow cycles per display second, `amount` the largest UV offset, `jets` the
   * number of alternating zonal jets pole to pole, `turbulence` the noise share of the flow.
   */
  flow: { speed: number; amount: number; jets: number; turbulence: number } | null;
  /** Steady eastward drift of the whole deck relative to the body, in turns per display second. */
  drift: number;
  /** Contrast of procedural zonal banding added on top of the map (Uranus). */
  bands: number;
  /** Contrast of procedural low-contrast streaks and a dark-spot hint (Neptune). */
  streaks: number;
  /** Thin additive glow shell beyond the limb. Null for airless bodies. */
  shell: { color: string; intensity: number; scale: number; twilight: string } | null;
  /** Saturn: the ring casts its shadow onto the globe. */
  ringShadow: boolean;
}

export type LookBodyId = Exclude<BodyId, 'sun' | 'earth'>;

const ROCKY = {
  kind: 'rocky',
  minnaert: 1,
  haze: null,
  terminatorTint: null,
  flow: null,
  drift: 0,
  bands: 0,
  streaks: 0,
  shell: null,
  ringShadow: false,
} as const;

const GIANT = {
  relief: 0,
  lommel: 0,
  opposition: 0,
  terminatorTint: null,
  drift: 0,
  bands: 0,
  streaks: 0,
  ringShadow: false,
} as const;

export const PLANET_LOOKS: Record<LookBodyId, PlanetLook> = {
  mercury: {
    ...ROCKY,
    relief: 5,
    lommel: 0.75,
    opposition: 0.25,
    terminatorSoftness: 0.02,
    exposure: 1.05,
  },
  moon: {
    ...ROCKY,
    relief: 4,
    lommel: 0.85,
    opposition: 0.3,
    terminatorSoftness: 0.02,
    exposure: 1.05,
  },
  pluto: {
    ...ROCKY,
    relief: 1.5,
    lommel: 0.6,
    opposition: 0.15,
    terminatorSoftness: 0.03,
    exposure: 1,
  },
  // Moons. Albedo maps already carry each surface's brightness; `exposure` only nudges the
  // greyscale-derived maps toward their real albedo spread (Enceladus ~1.0, Phobos ~0.07).
  phobos: {
    ...ROCKY,
    relief: 4,
    lommel: 0.85,
    opposition: 0.3,
    terminatorSoftness: 0.02,
    exposure: 1,
  },
  deimos: {
    ...ROCKY,
    relief: 2.5,
    lommel: 0.85,
    opposition: 0.3,
    terminatorSoftness: 0.02,
    exposure: 1,
  },
  io: {
    ...ROCKY,
    relief: 1.5,
    lommel: 0.6,
    opposition: 0.15,
    terminatorSoftness: 0.02,
    exposure: 1.05,
  },
  europa: {
    ...ROCKY,
    relief: 2,
    lommel: 0.55,
    opposition: 0.2,
    terminatorSoftness: 0.02,
    exposure: 1.05,
  },
  ganymede: {
    ...ROCKY,
    relief: 3,
    lommel: 0.6,
    opposition: 0.2,
    terminatorSoftness: 0.02,
    exposure: 1.05,
  },
  callisto: {
    ...ROCKY,
    relief: 3,
    lommel: 0.75,
    opposition: 0.25,
    terminatorSoftness: 0.02,
    exposure: 1,
  },
  enceladus: {
    ...ROCKY,
    relief: 3,
    lommel: 0.5,
    opposition: 0.2,
    terminatorSoftness: 0.02,
    exposure: 1.1,
  },
  // Titan: a featureless orange smog in visible light; the surface map shows only faintly.
  titan: {
    kind: 'cloudDeck',
    relief: 0,
    lommel: 0,
    opposition: 0,
    minnaert: 1.1,
    terminatorSoftness: 0.18,
    exposure: 1,
    haze: { color: '#e3a65a', strength: 0.6, power: 1.8 },
    terminatorTint: null,
    flow: null,
    drift: 0,
    bands: 0,
    streaks: 0,
    shell: { color: '#d9984f', intensity: 0.55, scale: 1.06, twilight: '#9a6a3a' },
    ringShadow: false,
  },
  venus: {
    kind: 'cloudDeck',
    relief: 0,
    lommel: 0,
    opposition: 0,
    minnaert: 1.1,
    terminatorSoftness: 0.15,
    exposure: 1,
    haze: { color: '#fff1cf', strength: 0.55, power: 2.2 },
    terminatorTint: { color: '#ff9a4a', strength: 0.12 },
    flow: { speed: 0.05, amount: 0.006, jets: 3, turbulence: 0.8 },
    drift: 0.004,
    bands: 0,
    streaks: 0,
    shell: { color: '#ffe9b0', intensity: 0.6, scale: 1.04, twilight: '#ff9f55' },
    ringShadow: false,
  },
  mars: {
    kind: 'rocky',
    relief: 3,
    lommel: 0.45,
    opposition: 0.15,
    minnaert: 1,
    terminatorSoftness: 0.05,
    exposure: 1,
    haze: { color: '#e8b48a', strength: 0.32, power: 3.5 },
    terminatorTint: { color: '#5d8bd6', strength: 0.05 },
    flow: null,
    drift: 0,
    bands: 0,
    streaks: 0,
    shell: { color: '#e9b088', intensity: 0.32, scale: 1.015, twilight: '#7f9fd8' },
    ringShadow: false,
  },
  jupiter: {
    ...GIANT,
    kind: 'gas',
    minnaert: 1.25,
    terminatorSoftness: 0.1,
    exposure: 1.05,
    haze: { color: '#d9cfc0', strength: 0.3, power: 3 },
    flow: { speed: 0.06, amount: 0.0022, jets: 14, turbulence: 0.55 },
    shell: { color: '#e6d8c2', intensity: 0.3, scale: 1.012, twilight: '#d49a6a' },
  },
  saturn: {
    ...GIANT,
    kind: 'gas',
    minnaert: 1.2,
    terminatorSoftness: 0.1,
    exposure: 1.05,
    haze: { color: '#efe2c4', strength: 0.3, power: 3 },
    flow: { speed: 0.05, amount: 0.0016, jets: 10, turbulence: 0.4 },
    shell: { color: '#f0dfb6', intensity: 0.28, scale: 1.012, twilight: '#d8a06a' },
    ringShadow: true,
  },
  uranus: {
    ...GIANT,
    kind: 'ice',
    minnaert: 1.15,
    terminatorSoftness: 0.12,
    exposure: 1,
    haze: { color: '#d8fbff', strength: 0.4, power: 2.5 },
    flow: null,
    bands: 0.035,
    shell: { color: '#c4f4f7', intensity: 0.4, scale: 1.02, twilight: '#9fd0e0' },
  },
  neptune: {
    ...GIANT,
    kind: 'ice',
    minnaert: 1.15,
    terminatorSoftness: 0.12,
    exposure: 1,
    haze: { color: '#9ec0ff', strength: 0.38, power: 2.5 },
    flow: { speed: 0.04, amount: 0.0015, jets: 6, turbulence: 0.6 },
    streaks: 0.08,
    shell: { color: '#7aa6ff', intensity: 0.45, scale: 1.02, twilight: '#5f7fd0' },
  },
};

export function planetLook(id: LookBodyId): PlanetLook {
  return PLANET_LOOKS[id];
}

/** Display seconds after which the shader clock wraps, keeping float precision in the shader. */
export const SHADER_TIME_WRAP = 3600;

/** Shader clock: wraps every `SHADER_TIME_WRAP` s; frozen at 0 when motion is reduced. */
export function shaderTime(tSec: number, reducedMotion: boolean): number {
  if (reducedMotion || !Number.isFinite(tSec)) return 0;
  const t = tSec % SHADER_TIME_WRAP;
  return t < 0 ? t + SHADER_TIME_WRAP : t;
}

/** Steady deck drift as a texture u offset in [0, 1). Frozen when motion is reduced. */
export function driftOffset(turnsPerSec: number, tSec: number, reducedMotion: boolean): number {
  if (reducedMotion || !Number.isFinite(tSec)) return 0;
  const u = (turnsPerSec * tSec) % 1;
  return u < 0 ? u + 1 : u;
}

/**
 * U offset that maps a ground texture coordinate to the cloud-shell coordinate above it, for
 * shells spun about the same axis: `cloudU = groundU + offset`. A y-rotation by `a` moves
 * longitude u by a / 2PI, so the cloud shell's extra spin shifts it the other way.
 */
export function cloudUvOffset(groundRotY: number, cloudRotY: number): number {
  const u = -(cloudRotY - groundRotY) / (2 * Math.PI);
  const f = u % 1;
  return f < 0 ? f + 1 : f;
}

/**
 * Atmosphere shell edge: the back-face n.v at the planet's limb for a shell `scale` times the
 * planet radius. The glow ramps from 0 at the shell silhouette to full at the limb.
 */
export function shellLimbCosine(scale: number): number {
  return Math.sqrt(Math.max(0, 1 - 1 / (scale * scale)));
}
