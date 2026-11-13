import * as THREE from 'three';

/** Share of the radius the seeded low-frequency lumps may push the surface in or out. */
export const LUMP_AMOUNT = 0.09;
const LUMP_WAVES = 7;

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

interface Wave {
  dir: THREE.Vector3;
  freq: number;
  phase: number;
  weight: number;
}

function makeWaves(seed: number): Wave[] {
  const rand = mulberry32(seed);
  const waves: Wave[] = [];
  let total = 0;
  for (let i = 0; i < LUMP_WAVES; i++) {
    const z = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - z * z);
    const weight = 0.5 + rand();
    total += weight;
    waves.push({
      dir: new THREE.Vector3(s * Math.cos(a), z, s * Math.sin(a)),
      // Low frequencies only: a few broad bulges and hollows, not noise.
      freq: 1.2 + rand() * 1.8,
      phase: rand() * Math.PI * 2,
      weight,
    });
  }
  for (const w of waves) w.weight /= total;
  return waves;
}

/** Surface height factor (around 1) for a unit direction: a deterministic sum of broad waves. */
export function lumpFactor(dir: THREE.Vector3, seed: number): number {
  return lumpFactorWith(dir, makeWaves(seed));
}

function lumpFactorWith(dir: THREE.Vector3, waves: readonly Wave[]): number {
  let h = 0;
  for (const w of waves) h += w.weight * Math.sin(dir.dot(w.dir) * w.freq * Math.PI + w.phase);
  return 1 + LUMP_AMOUNT * h;
}

/**
 * An irregular small moon: a UV sphere (the map still wraps as on a sphere) stretched to the
 * body's triaxial radii, `[toward the planet (+x), along the orbit (+z), polar (+y)]`, scaled so
 * the volume-equivalent radius is `radius`, then dented by seeded low-frequency lumps. Every
 * vertex moves as a function of its direction, so the u = 0/1 seam and the poles stay closed;
 * normals are averaged across the seam's duplicated vertices so no shading crease shows.
 */
export function irregularGeometry(
  radius: number,
  radiiKm: readonly [number, number, number],
  segments: number,
  seed: number,
): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(1, segments, segments / 2);
  const [a, b, c] = radiiKm;
  const mean = Math.cbrt(a * b * c);
  const sx = (radius * a) / mean;
  const sz = (radius * b) / mean;
  const sy = (radius * c) / mean;
  const waves = makeWaves(seed);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const dir = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    dir.fromBufferAttribute(pos, i).normalize();
    const k = lumpFactorWith(dir, waves);
    pos.setXYZ(i, dir.x * sx * k, dir.y * sy * k, dir.z * sz * k);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  // Average the normals of vertices that share a position (the seam and the poles).
  const normal = geo.getAttribute('normal') as THREE.BufferAttribute;
  const groups = new Map<string, number[]>();
  for (let i = 0; i < pos.count; i++) {
    // Integer keys: `-0` and `0` (sin 2PI is a tiny negative) must land in the same group.
    const q = (v: number): number => Math.round(v * 1e5) | 0;
    const key = `${q(pos.getX(i))},${q(pos.getY(i))},${q(pos.getZ(i))}`;
    const list = groups.get(key);
    if (list) list.push(i);
    else groups.set(key, [i]);
  }
  const n = new THREE.Vector3();
  const sum = new THREE.Vector3();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    sum.set(0, 0, 0);
    for (const i of list) sum.add(n.fromBufferAttribute(normal, i));
    sum.normalize();
    for (const i of list) normal.setXYZ(i, sum.x, sum.y, sum.z);
  }
  normal.needsUpdate = true;
  geo.computeBoundingSphere();
  return geo;
}
