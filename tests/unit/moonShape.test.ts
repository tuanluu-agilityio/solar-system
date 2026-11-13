import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { LUMP_AMOUNT, irregularGeometry, lumpFactor } from '../../src/bodies/moonShape';

const PHOBOS: [number, number, number] = [13.0, 11.4, 9.1];

function extents(geo: THREE.BufferGeometry): THREE.Vector3 {
  geo.computeBoundingBox();
  return geo.boundingBox!.getSize(new THREE.Vector3());
}

describe('irregularGeometry', () => {
  it('is deterministic for a seed and differs between seeds', () => {
    const a = irregularGeometry(1, PHOBOS, 32, 7).getAttribute('position').array;
    const b = irregularGeometry(1, PHOBOS, 32, 7).getAttribute('position').array;
    const c = irregularGeometry(1, PHOBOS, 32, 8).getAttribute('position').array;
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(Array.from(a)).not.toEqual(Array.from(c));
  });

  it('is longest toward the planet (x), then along the orbit (z), shortest at the poles (y)', () => {
    const size = extents(irregularGeometry(1, PHOBOS, 64, 3));
    expect(size.x).toBeGreaterThan(size.z);
    expect(size.z).toBeGreaterThan(size.y);
    // Roughly the 13 : 11.4 : 9.1 proportions despite the lumps.
    expect(size.x / size.y).toBeGreaterThan(1.2);
  });

  it('keeps the volume-equivalent radius near the display radius', () => {
    const size = extents(irregularGeometry(0.5, PHOBOS, 64, 3));
    const mean = Math.cbrt((size.x / 2) * (size.y / 2) * (size.z / 2));
    expect(mean).toBeGreaterThan(0.5 * (1 - LUMP_AMOUNT * 1.5));
    expect(mean).toBeLessThan(0.5 * (1 + LUMP_AMOUNT * 1.5));
  });

  it('is not a scaled ellipsoid: the lumps vary with direction', () => {
    const values = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(-1, 0, 0),
    ].map((d) => lumpFactor(d, 3));
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.01);
    for (const v of values) expect(Math.abs(v - 1)).toBeLessThanOrEqual(LUMP_AMOUNT);
  });

  it('keeps the u = 0/1 seam closed with matching normals', () => {
    const geo = irregularGeometry(1, PHOBOS, 16, 3);
    const pos = geo.getAttribute('position');
    const nor = geo.getAttribute('normal');
    const cols = 17;
    for (let row = 0; row <= 8; row++) {
      const first = row * cols;
      const last = row * cols + 16;
      expect(pos.getX(first)).toBeCloseTo(pos.getX(last), 6);
      expect(pos.getZ(first)).toBeCloseTo(pos.getZ(last), 6);
      expect(nor.getX(first)).toBeCloseTo(nor.getX(last), 6);
      expect(nor.getZ(first)).toBeCloseTo(nor.getZ(last), 6);
    }
  });

  it('keeps the SphereGeometry parameters so segment checks still work', () => {
    const geo = irregularGeometry(1, PHOBOS, 32, 3);
    expect(geo).toBeInstanceOf(THREE.SphereGeometry);
    expect(geo.parameters.widthSegments).toBe(32);
  });
});
