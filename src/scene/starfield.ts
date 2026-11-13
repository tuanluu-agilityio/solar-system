import * as THREE from 'three';
import type { TierSettings } from '../quality/tiers';
import { SKY_RADIUS, SKY_TILT_RAD, SKY_YAW_RAD } from './sky';

/**
 * Procedural background stars: crisp round points with a realistic magnitude distribution,
 * blackbody colours and a slow twinkle, drawn over the Milky Way texture (which supplies the
 * diffuse galactic glow). Positions are generated in the sky mesh's local frame, where the
 * texture's galactic band lies in the y = 0 plane with the galactic centre toward -x, and the
 * points get the same rotation as the sky so both agree.
 */
export const STARFIELD = {
  /** Inside the sky sphere, so the stars draw in front of it. */
  radius: SKY_RADIUS * 0.9,
  seed: 20261114,
  /** Brightest and faintest apparent magnitude generated. */
  magBright: -1,
  magFaint: 6.5,
  /** log10 growth of the star count per magnitude (real sky: about 0.4-0.5). */
  countSlope: 0.4,
  /**
   * Linear peak of the brightest star. The bloom threshold is 0.85 linear: with the small halo
   * on the brightest stars the peak stays below it, so bloom never smears stars into blobs.
   */
  maxIntensity: 0.62,
  /** Intensity falls by 10^(-0.4 * k) per magnitude: a compressed (k < 1) Pogson scale. */
  intensityCompression: 0.32,
  /** Fraction of the colour taken from the blackbody (the rest is white): subtle tints. */
  saturation: 0.6,
  /** Spread of the galactic band in latitude (radians) and of the centre bulge in longitude. */
  bandSigma: THREE.MathUtils.degToRad(9),
  bulgeSigma: THREE.MathUtils.degToRad(50),
  /** Relative twinkle amplitude (0 disables). */
  twinkle: 0.16,
  /** Peak of the faint halo on the brightest stars, relative to the core. */
  halo: 0.12,
} as const;

/** Small seeded PRNG (same algorithm as the asteroid belt), deterministic in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inverse CDF of N(<m) proportional to 10^(slope * m) on [magBright, magFaint]. */
export function sampleMagnitude(u: number): number {
  const { magBright: lo, magFaint: hi, countSlope: a } = STARFIELD;
  const pLo = Math.pow(10, a * lo);
  const pHi = Math.pow(10, a * hi);
  return Math.log10(pLo + u * (pHi - pLo)) / a;
}

/** Linear peak intensity of a star of magnitude `m`. */
export function magnitudeToIntensity(m: number): number {
  const k = STARFIELD.intensityCompression;
  return STARFIELD.maxIntensity * Math.pow(10, -0.4 * k * (m - STARFIELD.magBright));
}

/** Approximate blackbody colour (Tanner Helland fit), normalised so the brightest channel is 1. */
export function blackbodyColor(kelvin: number): [number, number, number] {
  const t = Math.min(Math.max(kelvin, 1000), 40000) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = [r, g, b].map((v) => Math.min(Math.max(v, 0), 255));
  const max = Math.max(...c);
  return [c[0]! / max, c[1]! / max, c[2]! / max];
}

/** Stellar temperature: mostly sun-like and white, some orange K/M and blue-white B stars. */
function sampleTemperature(u: number, v: number): number {
  const bins: [number, number, number][] = [
    // cumulative probability, min K, max K
    [0.12, 3000, 4200],
    [0.38, 4200, 5600],
    [0.75, 5600, 7500],
    [0.9, 7500, 10000],
    [1, 10000, 25000],
  ];
  for (const [p, lo, hi] of bins) if (u < p) return lo + v * (hi - lo);
  return 6000;
}

/** Point sprite size in device pixels: 1-3 px for most stars, a little more for the brightest. */
export function starPointSize(intensity: number, pixelRatio: number): number {
  const s = Math.min(Math.max(intensity / STARFIELD.maxIntensity, 0), 1);
  return pixelRatio * (1.3 + 2.0 * Math.sqrt(s) + 3.5 * Math.pow(s, 4));
}

export interface StarData {
  positions: Float32Array;
  colors: Float32Array;
  intensities: Float32Array;
  phases: Float32Array;
}

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Deterministic star catalogue in the sky's local frame (band in y = 0, centre toward -x). */
export function generateStars(count: number, seed: number = STARFIELD.seed): StarData {
  const rand = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const intensities = new Float32Array(count);
  const phases = new Float32Array(count);
  const { radius, magBright, magFaint, saturation } = STARFIELD;
  for (let i = 0; i < count; i++) {
    const m = sampleMagnitude(rand());
    // Faint stars crowd the galactic plane; bright (near) stars are almost isotropic.
    const faint = (m - magBright) / (magFaint - magBright);
    const inBand = rand() < 0.2 + 0.45 * faint;
    let sinB: number;
    let lon: number;
    if (inBand) {
      const b = Math.max(-1.5, Math.min(1.5, gaussian(rand) * STARFIELD.bandSigma));
      sinB = Math.sin(b);
      lon = rand() < 0.5 ? gaussian(rand) * STARFIELD.bulgeSigma : rand() * 2 * Math.PI;
    } else {
      sinB = 2 * rand() - 1;
      lon = rand() * 2 * Math.PI;
    }
    const cosB = Math.sqrt(Math.max(0, 1 - sinB * sinB));
    positions[i * 3] = -radius * cosB * Math.cos(lon);
    positions[i * 3 + 1] = radius * sinB;
    positions[i * 3 + 2] = radius * cosB * Math.sin(lon);
    const bb = blackbodyColor(sampleTemperature(rand(), rand()));
    for (let k = 0; k < 3; k++) colors[i * 3 + k] = 1 - saturation + saturation * bb[k]!;
    intensities[i] = magnitudeToIntensity(m);
    phases[i] = rand() * 1000;
  }
  return { positions, colors, intensities, phases };
}

const vertexShader = /* glsl */ `
  attribute float aIntensity;
  attribute float aPhase;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uTwinkle;
  uniform float uMaxIntensity;
  varying vec3 vColor;
  varying float vSize;
  varying float vGlow;
  void main() {
    float s = clamp(aIntensity / uMaxIntensity, 0.0, 1.0);
    // Two incommensurate slow waves per star: an irregular, gentle scintillation.
    float f = 0.7 + fract(aPhase * 0.137) * 1.6;
    float tw = 0.6 * sin(uTime * f + aPhase) + 0.4 * sin(uTime * f * 2.37 + aPhase * 1.71);
    float intensity = aIntensity * (1.0 + uTwinkle * tw);
    vColor = color * intensity;
    vGlow = s * s * s;
    vSize = uPixelRatio * (1.3 + 2.0 * sqrt(s) + 3.5 * s * s * s * s);
    gl_PointSize = vSize;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vSize;
  varying float vGlow;
  void main() {
    // Distance from the sprite centre in device pixels: a ~1.2-2 px Gaussian core keeps every
    // star crisp; only the brightest get a faint exponential halo.
    float d = length(gl_PointCoord - 0.5) * vSize;
    float sigma = (0.5 + 0.3 * pow(vGlow, 0.33)) * uPixelRatio;
    float core = exp(-d * d / (2.0 * sigma * sigma));
    float halo = ${STARFIELD.halo.toFixed(3)} * vGlow * exp(-d / (1.1 * uPixelRatio));
    float edge = 1.0 - smoothstep(0.42, 0.5, length(gl_PointCoord - 0.5));
    gl_FragColor = vec4(vColor * (core + halo) * edge, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface Starfield {
  points: THREE.Points;
  update(tSec: number, pixelRatio: number): void;
  /** False (reduced motion) freezes the twinkle. */
  setMotion(on: boolean): void;
}

export function createStarfield(
  settings: TierSettings,
  opts: { motion?: boolean } = {},
): Starfield {
  const data = generateStars(settings.starCount);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
  geo.setAttribute('aIntensity', new THREE.BufferAttribute(data.intensities, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(data.phases, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uTwinkle: { value: opts.motion === false ? 0 : STARFIELD.twinkle },
      uMaxIntensity: { value: STARFIELD.maxIntensity },
    },
    vertexShader,
    fragmentShader,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.rotation.set(0, SKY_YAW_RAD, SKY_TILT_RAD);
  points.renderOrder = -1;
  points.frustumCulled = false;
  const u = mat.uniforms;
  return {
    points,
    update(tSec, pixelRatio) {
      if (u.uTime) u.uTime.value = tSec;
      if (u.uPixelRatio) u.uPixelRatio.value = pixelRatio;
    },
    setMotion(on) {
      if (u.uTwinkle) u.uTwinkle.value = on ? STARFIELD.twinkle : 0;
    },
  };
}
