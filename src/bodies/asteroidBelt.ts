import * as THREE from 'three';
import {
  ASTEROID_BELT_MKM,
  ASTEROID_BELT_PERIOD_YEARS,
  EARTH_YEAR_DAYS,
  KUIPER_BELT_AU,
  KUIPER_BELT_PERIOD_YEARS,
  displayOrbitRadius,
  displaySemiMajorAxis,
  orbitalAngle,
} from '../config/scale';

/** Rock sizes (display units): mostly tiny, a few larger (power-law skew). */
export const SIZE_MIN = 0.02;
export const SIZE_MAX = 0.2;
/** Kuiper belt bodies: small icy specks, a touch larger since they are seen from farther away. */
export const KUIPER_SIZE_MIN = 0.03;
export const KUIPER_SIZE_MAX = 0.3;
const SIZE_SKEW = 3;
/** Each axis keeps at least this share of the size, so rocks are lumpy, not spheres. */
const AXIS_MIN = 0.55;
/** Vertex jitter of the shared rock mesh (share of its radius). */
const ROCK_JITTER = 0.28;
const ROCK_SEED = 4242;
const DEFAULT_SEED = 1337;
const KUIPER_SEED = 3031;
/** Camera distances (display units) over which nearby rocks fade in by shrinking. */
export const NEAR_FADE = { start: 1.5, end: 6 } as const;

/** Smallest angular size (radians) a distant rock is drawn at: about a pixel at 720p. */
const MIN_ROCK_ANGLE = 0.0007;

const glslFloat = (x: number): string => (Number.isInteger(x) ? `${x}.0` : String(x));
/** Shape of one belt: radii and half-thickness in display units, period, sizes and tints. */
export interface BeltSpec {
  name: string;
  inner: number;
  outer: number;
  maxHeight: number;
  periodDays: number;
  sizeMin: number;
  sizeMax: number;
  colorA: THREE.Color;
  colorB: THREE.Color;
  /** Brightness factor range [min, min + span] applied to each tint. */
  brightness: readonly [number, number];
}

/** Carbonaceous grey to stony brown, with a brightness spread. */
export const ASTEROID_BELT_SPEC: BeltSpec = {
  name: 'asteroid-belt',
  inner: displayOrbitRadius(ASTEROID_BELT_MKM.inner),
  outer: displayOrbitRadius(ASTEROID_BELT_MKM.outer),
  maxHeight: 1.5,
  periodDays: ASTEROID_BELT_PERIOD_YEARS * EARTH_YEAR_DAYS,
  sizeMin: SIZE_MIN,
  sizeMax: SIZE_MAX,
  colorA: new THREE.Color('#77736c'),
  colorB: new THREE.Color('#8c7457'),
  brightness: [0.6, 0.6],
};

/**
 * The Kuiper belt: icy grey to reddish (tholin) bodies, a much thicker band (its objects have
 * inclinations of tens of degrees) and very dim, so it reads as a faint haze of specks.
 */
export const KUIPER_BELT_SPEC: BeltSpec = {
  name: 'kuiper-belt',
  inner: displaySemiMajorAxis(KUIPER_BELT_AU.inner),
  outer: displaySemiMajorAxis(KUIPER_BELT_AU.outer),
  maxHeight: 14,
  periodDays: KUIPER_BELT_PERIOD_YEARS * EARTH_YEAR_DAYS,
  sizeMin: KUIPER_SIZE_MIN,
  sizeMax: KUIPER_SIZE_MAX,
  colorA: new THREE.Color('#8f8c8a'),
  colorB: new THREE.Color('#8a6a58'),
  brightness: [0.22, 0.2],
};

/** Small deterministic PRNG returning floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface AsteroidBelt {
  /** Do not cache across `setCount`: growing swaps in a new mesh. */
  readonly mesh: THREE.InstancedMesh;
  update(tSec: number): void;
  setCount(n: number): void;
}

/** One lumpy low-poly rock shared by every instance: a jittered, flat-shaded icosahedron (20 faces keep 8000 instances cheap). */
function makeRockGeometry(): THREE.BufferGeometry {
  const base = new THREE.IcosahedronGeometry(1, 0);
  const rand = mulberry32(ROCK_SEED);
  // Jitter shared corners identically, so the faces stay closed.
  const pos = base.getAttribute('position');
  const offsets = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    let k = offsets.get(key);
    if (k === undefined) {
      k = 1 + (rand() * 2 - 1) * ROCK_JITTER;
      offsets.set(key, k);
    }
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
  }
  base.computeVertexNormals();
  return base;
}

/** Fills `mesh` with `n` seeded instances; instance i is the same for any n > i. */
function fill(mesh: THREE.InstancedMesh, n: number, seed: number, spec: BeltSpec): void {
  const rand = mulberry32(seed);
  const { inner, outer } = spec;
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const r = inner + rand() * (outer - inner);
    const a = rand() * Math.PI * 2;
    // Sum of three uniforms: a cheap bell curve in [-1, 1].
    const h = ((rand() + rand() + rand()) / 3 - 0.5) * 2 * spec.maxHeight;
    pos.set(Math.cos(a) * r, h, Math.sin(a) * r);
    euler.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    quat.setFromEuler(euler);
    const size = spec.sizeMin + Math.pow(rand(), SIZE_SKEW) * (spec.sizeMax - spec.sizeMin);
    const axis = (): number => size * (AXIS_MIN + rand() * (1 - AXIS_MIN));
    scale.set(axis(), axis(), axis());
    m.compose(pos, quat, scale);
    mesh.setMatrixAt(i, m);
    color
      .lerpColors(spec.colorA, spec.colorB, rand())
      .multiplyScalar(spec.brightness[0] + rand() * spec.brightness[1]);
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

export function createAsteroidBelt(
  count: number,
  seed: number = DEFAULT_SEED,
  spec: BeltSpec = ASTEROID_BELT_SPEC,
): AsteroidBelt {
  const geometry = makeRockGeometry();
  // White base: the per-instance colour carries each rock's tint.
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  // Rocks near the camera shrink away, so the belt never blocks a focused planet.
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float camDist = length((modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz);
        transformed *= smoothstep(${glslFloat(NEAR_FADE.start)}, ${glslFloat(NEAR_FADE.end)}, camDist);
        // Far away, every rock keeps about a pixel, so the belt still reads as a band of specks.
        float rockSize = length(instanceMatrix[0].xyz);
        transformed *= max(1.0, camDist * ${glslFloat(MIN_ROCK_ANGLE)} / rockSize);
      #endif`,
    );
  };
  let mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = spec.name;
  mesh.frustumCulled = false;
  fill(mesh, count, seed, spec);
  let capacity = count;
  let angle = 0;

  const belt: AsteroidBelt = {
    get mesh() {
      return mesh;
    },
    update(tSec) {
      angle = orbitalAngle(spec.periodDays, tSec, 0);
      mesh.rotation.y = angle;
    },
    setCount(n) {
      if (n > capacity) {
        // Grow in place: a larger buffer with the same seed keeps the first instances.
        const next = new THREE.InstancedMesh(geometry, material, n);
        next.name = mesh.name;
        next.frustumCulled = false;
        next.rotation.y = angle;
        fill(next, n, seed, spec);
        const parent = mesh.parent;
        if (parent) {
          parent.add(next);
          parent.remove(mesh);
        }
        mesh.dispose();
        mesh = next;
        capacity = n;
      }
      mesh.count = n;
    },
  };
  return belt;
}

/** The visual Kuiper belt: the same instanced rocks, spread and tinted by `KUIPER_BELT_SPEC`. */
export function createKuiperBelt(count: number, seed: number = KUIPER_SEED): AsteroidBelt {
  return createAsteroidBelt(count, seed, KUIPER_BELT_SPEC);
}
