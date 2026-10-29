import * as THREE from 'three';
import {
  ASTEROID_BELT_MKM,
  EARTH_YEAR_DAYS,
  displayOrbitRadius,
  orbitalAngle,
} from '../config/scale';

const BELT_PERIOD_YEARS = 4.6;
const MAX_HEIGHT = 1.5;
const SIZE_MIN = 0.08;
const SIZE_MAX = 0.35;
const DEFAULT_SEED = 1337;

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
  mesh: THREE.InstancedMesh;
  update(tSec: number): void;
  setCount(n: number): void;
}

/** Fills `mesh` with `n` seeded instances; instance i is the same for any n > i. */
function fill(mesh: THREE.InstancedMesh, n: number, seed: number): void {
  const rand = mulberry32(seed);
  const inner = displayOrbitRadius(ASTEROID_BELT_MKM.inner);
  const outer = displayOrbitRadius(ASTEROID_BELT_MKM.outer);
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const r = inner + rand() * (outer - inner);
    const a = rand() * Math.PI * 2;
    // Sum of three uniforms: a cheap bell curve in [-1, 1].
    const h = ((rand() + rand() + rand()) / 3 - 0.5) * 2 * MAX_HEIGHT;
    pos.set(Math.cos(a) * r, h, Math.sin(a) * r);
    euler.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    quat.setFromEuler(euler);
    scale.setScalar(SIZE_MIN + rand() * (SIZE_MAX - SIZE_MIN));
    m.compose(pos, quat, scale);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

export function createAsteroidBelt(count: number, seed: number = DEFAULT_SEED): AsteroidBelt {
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const material = new THREE.MeshStandardMaterial({
    color: '#8a7a68',
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  let mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = 'asteroid-belt';
  mesh.frustumCulled = false;
  fill(mesh, count, seed);
  let capacity = count;
  let angle = 0;

  const belt: AsteroidBelt = {
    get mesh() {
      return mesh;
    },
    update(tSec) {
      angle = orbitalAngle(BELT_PERIOD_YEARS * EARTH_YEAR_DAYS, tSec, 0);
      mesh.rotation.y = angle;
    },
    setCount(n) {
      if (n > capacity) {
        // Grow in place: a larger buffer with the same seed keeps the first instances.
        const next = new THREE.InstancedMesh(geometry, material, n);
        next.name = mesh.name;
        next.frustumCulled = false;
        next.rotation.y = angle;
        fill(next, n, seed);
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
