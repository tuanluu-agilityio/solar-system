import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createSolarSystem } from '../../src/scene/solarSystem';
import { tierSettings } from '../../src/quality/tiers';
import { BODY_IDS, type BodyId } from '../../src/data/types';
import { BODIES } from '../../src/data/bodies';
import { MOON_ORBIT_DISPLAY } from '../../src/config/scale';

function textures(): Map<string, THREE.Texture> {
  const keys = [
    'mercury',
    'venus_surface',
    'earth_day',
    'moon',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
  ];
  return new Map(
    keys.map((k) => [k, new THREE.DataTexture(new Uint8Array([200, 200, 200, 255]), 1, 1)]),
  );
}

function worldPos(o: THREE.Object3D): THREE.Vector3 {
  o.updateWorldMatrix(true, false);
  return o.getWorldPosition(new THREE.Vector3());
}

function make(tier: 'low' | 'high' = 'high') {
  return createSolarSystem(textures(), tierSettings(tier));
}

describe('createSolarSystem', () => {
  it('has all 11 bodies and 11 pickables', () => {
    const ss = make();
    expect(ss.bodies.size).toBe(11);
    for (const id of BODY_IDS) expect(ss.bodies.has(id)).toBe(true);
    expect(ss.pickables.length).toBe(11);
  });

  it('returns Earth to its start position after one year (60 s)', () => {
    const ss = make();
    const earth = ss.bodies.get('earth')!;
    ss.update(0);
    const a = worldPos(earth.mesh).clone();
    ss.update(60);
    const b = worldPos(earth.mesh);
    expect(b.distanceTo(a)).toBeLessThan(1e-3);
  });

  it('keeps the Moon at MOON_ORBIT_DISPLAY from Earth', () => {
    const ss = make();
    for (const t of [0, 7.3, 31]) {
      ss.update(t);
      const d = worldPos(ss.bodies.get('moon')!.mesh).distanceTo(
        worldPos(ss.bodies.get('earth')!.mesh),
      );
      expect(d).toBeCloseTo(MOON_ORBIT_DISPLAY, 3);
    }
  });

  it('keeps the same Moon face toward Earth (tidal lock)', () => {
    const ss = make();
    const moon = ss.bodies.get('moon')!;
    const earth = ss.bodies.get('earth')!;
    const facing = (t: number): THREE.Vector3 => {
      ss.update(t);
      const toEarth = worldPos(earth.mesh).sub(worldPos(moon.mesh)).normalize();
      moon.mesh.updateWorldMatrix(true, false);
      const inv = moon.mesh.matrixWorld.clone().invert();
      return toEarth.transformDirection(inv);
    };
    const f0 = facing(0);
    expect(facing(5).distanceTo(f0)).toBeLessThan(1e-6);
    expect(facing(13.7).distanceTo(f0)).toBeLessThan(1e-6);
  });

  it('makes pick proxies at least 1.8x the mesh radius or 2.5', () => {
    const ss = make();
    for (const b of ss.bodies.values()) {
      const geo = b.pickProxy.geometry as THREE.SphereGeometry;
      const r = geo.parameters.radius;
      expect(r).toBeGreaterThanOrEqual(Math.min(b.radius * 1.8, 2.5));
      expect(r).toBeCloseTo(Math.max(b.radius * 1.8, 2.5));
      expect(b.pickProxy.userData.bodyId).toBe(b.id);
      expect(ss.pickables).toContain(b.pickProxy);
    }
  });

  it('applies real axial tilts and retrograde spin for Venus and Uranus', () => {
    const ss = make();
    ss.update(10);
    for (const id of ['earth', 'uranus', 'venus'] as BodyId[]) {
      const b = ss.bodies.get(id)!;
      expect(b.tiltGroup.rotation.z).toBeCloseTo(
        THREE.MathUtils.degToRad(BODIES[id].physical.axialTiltDeg),
      );
    }
    expect(ss.bodies.get('venus')!.mesh.rotation.y).toBeLessThan(0);
    expect(ss.bodies.get('uranus')!.mesh.rotation.y).toBeLessThan(0);
    expect(ss.bodies.get('earth')!.mesh.rotation.y).toBeGreaterThan(0);
  });

  it('draws 256-segment orbit lines for the 8 planets and Pluto', () => {
    const ss = make();
    const lines: THREE.LineLoop[] = [];
    ss.root.traverse((o) => {
      if (o instanceof THREE.LineLoop) lines.push(o);
    });
    expect(lines.length).toBe(9);
    for (const l of lines) {
      expect(l.geometry.getAttribute('position').count).toBe(256);
      const m = l.material as THREE.LineBasicMaterial;
      expect(m.opacity).toBeCloseTo(0.15);
    }
  });

  it('uses 64 sphere segments, or 32 on the low tier and after setTierSettings', () => {
    const seg = (ss: ReturnType<typeof make>): number =>
      (ss.bodies.get('mars')!.mesh.geometry as THREE.SphereGeometry).parameters.widthSegments;
    expect(seg(make('high'))).toBe(64);
    const low = make('low');
    expect(seg(low)).toBe(32);
    low.setTierSettings(tierSettings('high'));
    expect(seg(low)).toBe(64);
    low.setTierSettings(tierSettings('low'));
    expect(seg(low)).toBe(32);
  });

  it('provides focus targets for every body and the asteroid belt', () => {
    const ss = make();
    ss.update(12);
    for (const id of BODY_IDS) {
      const f = ss.getFocusTarget(id);
      expect(f.radius).toBe(ss.bodies.get(id)!.radius);
    }
    const belt = ss.getFocusTarget('asteroid-belt');
    expect(belt.radius).toBe(12);
    const earthPos = worldPos(ss.bodies.get('earth')!.mesh);
    const beltPos = worldPos(belt.object);
    // On the belt (between 329 and 479 Mkm worth of display radius) and on Earth's side.
    expect(beltPos.length()).toBeGreaterThan(earthPos.length());
    expect(beltPos.angleTo(earthPos)).toBeLessThan(1e-6);
  });
});
