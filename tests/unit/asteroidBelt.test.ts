import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createAsteroidBelt } from '../../src/bodies/asteroidBelt';
import { createSolarSystem } from '../../src/scene/solarSystem';
import { tierSettings } from '../../src/quality/tiers';
import {
  ASTEROID_BELT_MKM,
  ASTEROID_BELT_PERIOD_YEARS,
  EARTH_YEAR_SECONDS,
  displayOrbitRadius,
} from '../../src/config/scale';

function firstMatrix(m: THREE.InstancedMesh): number[] {
  const out = new THREE.Matrix4();
  m.getMatrixAt(0, out);
  return out.toArray();
}

describe('createAsteroidBelt', () => {
  it('is deterministic for the same seed and differs for another', () => {
    const a = createAsteroidBelt(200, 7);
    const b = createAsteroidBelt(200, 7);
    const c = createAsteroidBelt(200, 8);
    expect(firstMatrix(a.mesh)).toEqual(firstMatrix(b.mesh));
    expect(firstMatrix(a.mesh)).not.toEqual(firstMatrix(c.mesh));
  });

  it('keeps every instance within the display radii, heights within +-1.5 and sizes in range', () => {
    const { mesh } = createAsteroidBelt(500, 1);
    const inner = displayOrbitRadius(ASTEROID_BELT_MKM.inner);
    const outer = displayOrbitRadius(ASTEROID_BELT_MKM.outer);
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, m);
      m.decompose(p, q, s);
      const r = Math.hypot(p.x, p.z);
      expect(r).toBeGreaterThanOrEqual(inner - 1e-6);
      expect(r).toBeLessThanOrEqual(outer + 1e-6);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(1.5);
      expect(s.x).toBeGreaterThanOrEqual(0.08 - 1e-6);
      expect(s.x).toBeLessThanOrEqual(0.35 + 1e-6);
    }
  });

  it('setCount changes the drawn count, growing beyond the initial capacity', () => {
    const belt = createAsteroidBelt(100, 3);
    const before = firstMatrix(belt.mesh);
    belt.setCount(1500);
    expect(belt.mesh.count).toBe(1500);
    expect(firstMatrix(belt.mesh)).toEqual(before);
    belt.setCount(50);
    expect(belt.mesh.count).toBe(50);
  });

  it('rotates with the belt period', () => {
    const belt = createAsteroidBelt(10, 1);
    const period = ASTEROID_BELT_PERIOD_YEARS * EARTH_YEAR_SECONDS;
    belt.update(period / 4);
    expect(belt.mesh.rotation.y).toBeCloseTo(Math.PI / 2, 5);
  });
});

describe('solar system belt wiring', () => {
  it('adds the belt with the tier asteroid count and spins it', () => {
    const s = tierSettings('low');
    const solar = createSolarSystem(new Map(), s);
    const belt = solar.root.getObjectByName('asteroid-belt') as THREE.InstancedMesh;
    expect(belt).toBeDefined();
    expect(belt.count).toBe(s.asteroidCount);
    solar.update(10);
    expect(belt.rotation.y).not.toBe(0);
    solar.setTierSettings(tierSettings('medium'));
    const grown = solar.root.getObjectByName('asteroid-belt') as THREE.InstancedMesh;
    expect(grown.count).toBe(tierSettings('medium').asteroidCount);
    expect(solar.root.getObjectsByProperty('name', 'asteroid-belt')).toHaveLength(1);
  });
});
