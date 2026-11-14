import * as THREE from 'three';
import type { TierSettings } from '../quality/tiers';
import { mulberry32 } from './starfield';

/**
 * Sparse, faint dust motes around the camera. The points live in a box that wraps around the
 * camera in the vertex shader (so the layer is infinite and costs one draw call); they fade
 * with distance and are tiny and dim, so they are barely noticeable while the camera rests
 * and give a sense of depth (parallax) while it moves.
 */
export const DUST = {
  /** Edge of the wrapping box in scene units (the Earth orbit radius is about 65). */
  box: 40,
  seed: 7,
  /** Linear peak brightness of a mote. */
  intensity: 0.07,
  /** Sprite size in CSS px is `sizeK / distance`, clamped to [minPx, maxPx]. */
  sizeK: 9,
  minPx: 1,
  maxPx: 2.2,
  /** Motes nearer than this fade out, so none ever pops up large in front of the lens. */
  near: 1.2,
  color: [0.92, 0.88, 0.82] as const,
} as const;

/** Deterministic mote positions in [-box/2, box/2]^3. */
export function generateDust(count: number, seed: number = DUST.seed): Float32Array {
  const rand = mulberry32(seed);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < out.length; i++) out[i] = (rand() - 0.5) * DUST.box;
  return out;
}

const vertexShader = /* glsl */ `
  uniform vec3 uCamera;
  uniform float uBox;
  uniform float uPixelRatio;
  uniform float uSizeK;
  uniform float uMinPx;
  uniform float uMaxPx;
  uniform float uNear;
  varying float vFade;
  void main() {
    // Wrap each mote into the box centred on the camera.
    vec3 rel = mod(position - uCamera + 0.5 * uBox, uBox) - 0.5 * uBox;
    vec4 mv = viewMatrix * vec4(uCamera + rel, 1.0);
    float dist = length(rel);
    vFade = (1.0 - smoothstep(0.25 * uBox, 0.5 * uBox, dist)) * smoothstep(uNear, 2.5 * uNear, dist);
    gl_PointSize = uPixelRatio * clamp(uSizeK / max(dist, 0.001), uMinPx, uMaxPx);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying float vFade;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float a = exp(-r * r * 3.0) * (1.0 - smoothstep(0.8, 1.0, r));
    gl_FragColor = vec4(uColor * uIntensity * vFade * a, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface Dust {
  points: THREE.Points;
  update(cameraPosition: THREE.Vector3, pixelRatio: number): void;
}

/** The dust layer, or null when the tier disables it (low). */
export function createDust(settings: TierSettings): Dust | null {
  if (settings.dustCount <= 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(generateDust(settings.dustCount), 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uCamera: { value: new THREE.Vector3() },
      uBox: { value: DUST.box },
      uPixelRatio: { value: 1 },
      uSizeK: { value: DUST.sizeK },
      uMinPx: { value: DUST.minPx },
      uMaxPx: { value: DUST.maxPx },
      uNear: { value: DUST.near },
      uColor: { value: new THREE.Color(...DUST.color) },
      uIntensity: { value: DUST.intensity },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const u = mat.uniforms;
  return {
    points,
    update(cameraPosition, pixelRatio) {
      (u.uCamera?.value as THREE.Vector3).copy(cameraPosition);
      if (u.uPixelRatio) u.uPixelRatio.value = pixelRatio;
    },
  };
}
