import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createSolarSystem, moonSystemVisible } from '../../src/scene/solarSystem';
import { tierSettings } from '../../src/quality/tiers';
import { BODY_IDS, type BodyId } from '../../src/data/types';
import { BODIES, moonsOf } from '../../src/data/bodies';
import {
  EARTH_YEAR_DAYS,
  MOON_ORBIT_DISPLAY,
  MOON_SYSTEM_VIEW_FACTOR,
  moonDisplay,
  displaySemiMajorAxis,
  displayRadius,
  orbitalAngle,
  OVERVIEW_MAX_BOOST,
} from '../../src/config/scale';
import {
  OVERVIEW_FIT_RADIUS,
  overviewFrame,
  overviewMinPx,
  overviewPolar,
} from '../../src/camera/framing';
import { positionAtMeanAnomaly } from '../../src/bodies/kepler';
import * as kepler from '../../src/bodies/kepler';
import { ORBIT_STYLE } from '../../src/bodies/orbitMath';

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

/** Bodies circling the Sun on Kepler ellipses: the planets and Pluto (a moon's parent is a planet). */
type OrbitingBodyId = BodyId;
const ORBITING = BODY_IDS.filter((id) => BODIES[id].parent === 'sun');
/** Moons hidden from the overview: every moon except Earth's. */
const SYSTEM_MOONS = BODY_IDS.filter((id) => BODIES[id].kind === 'moon' && id !== 'moon');

function orbitShape(id: OrbitingBodyId) {
  const orbit = BODIES[id].orbit;
  if (!orbit) throw new Error(`Missing orbit for ${id}`);
  return {
    semiMajorAxisDisplay: displaySemiMajorAxis(orbit.semiMajorAxisAu),
    eccentricity: orbit.eccentricity,
    inclinationRad: THREE.MathUtils.degToRad(orbit.inclinationDeg),
    ascendingNodeRad: THREE.MathUtils.degToRad(orbit.longitudeOfAscendingNodeDeg),
    argumentOfPerihelionRad: THREE.MathUtils.degToRad(orbit.argumentOfPerihelionDeg),
  };
}

function meanAnomalyAt(id: OrbitingBodyId, tSec: number): number {
  const orbit = BODIES[id].orbit;
  if (!orbit) throw new Error(`Missing orbit for ${id}`);
  return orbitalAngle(
    id === 'earth' ? EARTH_YEAR_DAYS : (BODIES[id].physical.orbitalPeriodDays ?? EARTH_YEAR_DAYS),
    tSec,
    THREE.MathUtils.degToRad(orbit.meanAnomalyAtEpochDeg),
  );
}

describe('createSolarSystem', () => {
  it('has all 19 bodies and 19 pickables', () => {
    const ss = make();
    expect(ss.bodies.size).toBe(19);
    for (const id of BODY_IDS) expect(ss.bodies.has(id)).toBe(true);
    expect(ss.pickables.length).toBe(19);
    expect(ORBITING).toHaveLength(9);
    expect(SYSTEM_MOONS).toHaveLength(8);
  });

  it('uses linear planet radii and preserves the Sun and Moon display sizes', () => {
    const ss = make();
    const earthRadius = ss.bodies.get('earth')!.radius;
    for (const id of ORBITING) {
      expect(ss.bodies.get(id)!.radius / earthRadius).toBeCloseTo(
        BODIES[id].physical.diameterKm / BODIES.earth.physical.diameterKm,
        10,
      );
    }
    for (const id of ['sun', 'moon', ...SYSTEM_MOONS] as const) {
      expect(ss.bodies.get(id)!.radius).toBeCloseTo(
        displayRadius(BODIES[id].physical.diameterKm),
        10,
      );
    }
  });

  it('places each planet at its J2000 Kepler position at t=0', () => {
    const ss = make();
    ss.update(0);
    for (const id of ORBITING) {
      const expected = positionAtMeanAnomaly(orbitShape(id), meanAnomalyAt(id, 0));
      const actual = worldPos(ss.bodies.get(id)!.mesh);
      expect([actual.x, actual.y, actual.z], id).toEqual([
        expect.closeTo(expected[0], 3),
        expect.closeTo(expected[1], 3),
        expect.closeTo(expected[2], 3),
      ]);
    }
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
      if (SYSTEM_MOONS.includes(b.id)) continue;
      const geo = b.pickProxy.geometry as THREE.SphereGeometry;
      const r = geo.parameters.radius;
      expect(r).toBeGreaterThanOrEqual(Math.min(b.radius * 1.8, 2.5));
      expect(r).toBeCloseTo(Math.max(b.radius * 1.8, 2.5));
      expect(b.pickProxy.userData.bodyId).toBe(b.id);
      expect(ss.pickables).toContain(b.pickProxy);
    }
  });

  it('gives moons seen only near their planet a tap target that never swallows a neighbour', () => {
    const ss = make();
    for (const id of SYSTEM_MOONS) {
      const b = ss.bodies.get(id)!;
      const r = (b.pickProxy.geometry as THREE.SphereGeometry).parameters.radius;
      const orbit = moonDisplay(id).orbitRadius;
      expect(r, id).toBeCloseTo(Math.max(b.radius * 1.8, Math.min(2.5, orbit * 0.3)));
      expect(r, id).toBeLessThan(orbit - ss.bodies.get(BODIES[id].parent!)!.radius);
      expect(ss.pickables).toContain(b.pickProxy);
    }
  });

  it('orbits every other moon in its planet equatorial plane at its display radius', () => {
    const ss = make();
    for (const t of [0, 3.7, 41]) {
      ss.update(t);
      for (const id of SYSTEM_MOONS) {
        const planet = ss.bodies.get(BODIES[id].parent!)!;
        const rel = worldPos(ss.bodies.get(id)!.mesh).sub(worldPos(planet.mesh));
        expect(rel.length(), id).toBeCloseTo(moonDisplay(id).orbitRadius, 4);
        // The planet's spin axis in world space: the moon stays perpendicular to it.
        const axis = new THREE.Vector3(0, 1, 0).applyAxisAngle(
          new THREE.Vector3(0, 0, 1),
          THREE.MathUtils.degToRad(BODIES[planet.id].physical.axialTiltDeg),
        );
        expect(Math.abs(rel.normalize().dot(axis)), id).toBeLessThan(1e-6);
      }
    }
  });

  it('keeps the same face of every moon toward its planet (tidal lock)', () => {
    const ss = make();
    for (const id of SYSTEM_MOONS) {
      const moon = ss.bodies.get(id)!;
      const planet = ss.bodies.get(BODIES[id].parent!)!;
      const facing = (t: number): THREE.Vector3 => {
        ss.update(t);
        const toPlanet = worldPos(planet.mesh).sub(worldPos(moon.mesh)).normalize();
        moon.mesh.updateWorldMatrix(true, false);
        return toPlanet.transformDirection(moon.mesh.matrixWorld.clone().invert());
      };
      const f0 = facing(0);
      expect(facing(2.9).distanceTo(f0), id).toBeLessThan(1e-6);
      expect(facing(17.3).distanceTo(f0), id).toBeLessThan(1e-6);
      // The map centre (u = 0.5, local +x, longitude 0) is the sub-planet point.
      expect(f0.x, id).toBeGreaterThan(0.999);
    }
  });

  it('moves moons on the slowed display period (Io returns after one display orbit)', () => {
    const ss = make();
    const io = ss.bodies.get('io')!;
    const jupiter = ss.bodies.get('jupiter')!;
    const rel = (t: number): THREE.Vector3 => {
      ss.update(t);
      return worldPos(io.mesh).sub(worldPos(jupiter.mesh));
    };
    const period = (60 * moonDisplay('io').periodDays) / EARTH_YEAR_DAYS;
    const a = rel(5).clone();
    expect(rel(5 + period).distanceTo(a)).toBeLessThan(1e-3);
    expect(rel(5 + period / 2).distanceTo(a)).toBeGreaterThan(moonDisplay('io').orbitRadius);
  });

  it('gives Phobos and Deimos lumpy, non-spherical shapes', () => {
    const ss = make();
    for (const id of ['phobos', 'deimos'] as const) {
      const pos = ss.bodies.get(id)!.mesh.geometry.getAttribute('position');
      const v = new THREE.Vector3();
      let min = Infinity;
      let max = 0;
      for (let i = 0; i < pos.count; i++) {
        const r = v.fromBufferAttribute(pos, i).length();
        min = Math.min(min, r);
        max = Math.max(max, r);
      }
      expect(max / min, id).toBeGreaterThan(1.2);
    }
    const io = ss.bodies.get('io')!.mesh.geometry as THREE.SphereGeometry;
    expect(io.parameters.radius).toBeCloseTo(ss.bodies.get('io')!.radius);
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
  });

  it('spins Venus, Uranus and Pluto retrograde and the others prograde as seen from world up', () => {
    const ss = make();
    ss.update(10);
    ss.root.updateMatrixWorld(true);
    const retro = new Set<BodyId>(['venus', 'uranus', 'pluto']);
    for (const id of [
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
      'pluto',
    ] as BodyId[]) {
      const b = ss.bodies.get(id)!;
      const axis = new THREE.Vector3(0, 1, 0).transformDirection(b.tiltGroup.matrixWorld);
      // Angular velocity about world up = (spin sign) * (spin axis . up); positive = prograde (counter-clockwise from above).
      const visible = Math.sign(b.mesh.rotation.y) * axis.y;
      expect(visible > 0, id).toBe(!retro.has(id));
    }
  });

  describe('orbit ribbons', () => {
    type Orbit = { id: OrbitingBodyId; mesh: THREE.Mesh; mat: THREE.ShaderMaterial };

    function orbits(ss: ReturnType<typeof make>): Orbit[] {
      const meshes: THREE.Mesh[] = [];
      ss.root.traverse((o) => {
        if (o.name === 'orbit-line') meshes.push(o as THREE.Mesh);
      });
      expect(meshes.length).toBe(9);
      // Meshes are added in BODY_IDS order (planets, then Pluto).
      return meshes.map((mesh, i) => ({
        id: ORBITING[i]!,
        mesh,
        mat: mesh.material as THREE.ShaderMaterial,
      }));
    }
    const num = (m: THREE.ShaderMaterial, k: string): number => m.uniforms[k]!.value as number;

    it('draws each ribbon on the corresponding Kepler ellipse', () => {
      const ss = make();
      for (const { id, mesh, mat } of orbits(ss)) {
        expect(mesh).toBeInstanceOf(THREE.Mesh);
        expect(mesh).not.toBeInstanceOf(THREE.LineLoop);
        expect(mat).toBeInstanceOf(THREE.ShaderMaterial);
        const p = mesh.geometry.getAttribute('position');
        const expected = positionAtMeanAnomaly(orbitShape(id), 0);
        expect([p.getX(0), p.getY(0), p.getZ(0)], id).toEqual([
          expect.closeTo(expected[0], 3),
          expect.closeTo(expected[1], 3),
          expect.closeTo(expected[2], 3),
        ]);
      }
    });

    it('tints each ribbon with its body orbitColor', () => {
      const ss = make();
      for (const { id, mat } of orbits(ss)) {
        const c = mat.uniforms.uColor!.value as THREE.Color;
        expect(c.getHexString(), id).toBe(new THREE.Color(BODIES[id].orbitColor).getHexString());
      }
    });

    it('feeds each ribbon the mean anomaly returned by the corresponding rig update', () => {
      const ss = make();
      for (const t of [0, 7.3, 123.4]) {
        ss.update(t);
        for (const { id, mat } of orbits(ss)) {
          expect(num(mat, 'uPlanetMeanAnomaly'), id).toBeCloseTo(meanAnomalyAt(id, t), 10);
        }
      }
    });

    it('passes setViewport to every orbit material', () => {
      const ss = make();
      ss.setViewport(1000, 500, 2);
      for (const { mat } of orbits(ss)) {
        const v = mat.uniforms.uViewport!.value as THREE.Vector2;
        expect([v.x, v.y, num(mat, 'uPixelRatio')]).toEqual([1000, 500, 2]);
      }
    });

    it('dims orbits towards focusEmphasis while focused and restores them', () => {
      const ss = make();
      let t = 0;
      const run = (sec: number): void => {
        for (let i = 0; i < sec * 20; i++) ss.update((t += 0.05));
      };
      run(1);
      for (const { mat } of orbits(ss)) expect(num(mat, 'uEmphasis')).toBe(1);
      ss.setOrbitFocus(true);
      run(8);
      for (const { mat } of orbits(ss)) {
        expect(Math.abs(num(mat, 'uEmphasis') - ORBIT_STYLE.focusEmphasis)).toBeLessThan(0.01);
      }
      ss.setOrbitFocus(false);
      run(8);
      for (const { mat } of orbits(ss))
        expect(Math.abs(num(mat, 'uEmphasis') - 1)).toBeLessThan(0.01);
    });

    it('hides and shows every orbit ribbon with setOrbitsVisible', () => {
      const ss = make();
      const lines = ss.root.children.filter((c) => c.name === 'orbit-line');
      expect(lines.length).toBeGreaterThan(0);
      ss.setOrbitsVisible(false);
      for (const l of lines) expect(l.visible).toBe(false);
      ss.setOrbitsVisible(true);
      for (const l of lines) expect(l.visible).toBe(true);
    });

    it('clamps a huge time jump to 0.25 s of emphasis smoothing', () => {
      const ss = make();
      ss.update(1);
      ss.setOrbitFocus(true);
      ss.update(1000);
      const e = num(orbits(ss)[0]!.mat, 'uEmphasis');
      expect(e).toBeGreaterThan(ORBIT_STYLE.focusEmphasis + 0.05);
      expect(e).toBeLessThan(1);
    });

    it('fades on real frame time when given, so paused simulation time still fades', () => {
      const ss = make();
      ss.update(5, 0.05);
      ss.setOrbitFocus(true);
      // Simulation time stands still (paused); only wall time passes.
      for (let i = 0; i < 160; i++) ss.update(5, 0.05);
      for (const { mat } of orbits(ss)) {
        expect(Math.abs(num(mat, 'uEmphasis') - ORBIT_STYLE.focusEmphasis)).toBeLessThan(0.01);
      }
    });

    it('does not allocate objects or call the tuple helper per update', () => {
      const ss = make();
      ss.update(1);
      const v3 = vi.spyOn(THREE.Vector3.prototype, 'set');
      const clone = vi.spyOn(THREE.Vector3.prototype, 'clone');
      const colorClone = vi.spyOn(THREE.Color.prototype, 'clone');
      const arr = vi.spyOn(Array, 'from');
      const tuplePosition = vi.spyOn(kepler, 'positionAtMeanAnomaly');
      try {
        ss.setOrbitFocus(true);
        for (let i = 0; i < 10; i++) ss.update(2 + i * 0.1);
        expect(clone).not.toHaveBeenCalled();
        expect(colorClone).not.toHaveBeenCalled();
        expect(arr).not.toHaveBeenCalled();
        expect(tuplePosition).not.toHaveBeenCalled();
      } finally {
        v3.mockRestore();
        clone.mockRestore();
        colorClone.mockRestore();
        arr.mockRestore();
        tuplePosition.mockRestore();
      }
    });
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

describe('overview boost', () => {
  function cameraAt(
    x: number,
    y: number,
    z: number,
    look: THREE.Vector3 = new THREE.Vector3(),
    aspect = 390 / 664,
  ) {
    const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 20000);
    camera.position.set(x, y, z);
    camera.lookAt(look);
    camera.updateMatrixWorld(true);
    return camera;
  }
  const scaleOf = (ss: ReturnType<typeof make>, id: BodyId): number =>
    ss.bodies.get(id)!.tiltGroup.scale.x;

  it('keeps every planet above its radius-scaled pixel floor in portrait and landscape overview', () => {
    const ss = make();
    ss.update(0);
    let requiredCap = 1;
    const floorFailures: string[] = [];
    const viewports = [
      { width: 1280, height: 720 },
      { width: 390, height: 844 },
    ];

    for (const viewport of viewports) {
      const aspect = viewport.width / viewport.height;
      const polar = overviewPolar(aspect);
      const frame = overviewFrame(OVERVIEW_FIT_RADIUS, 50, aspect, polar);
      const camera = cameraAt(
        0,
        frame.distance * Math.cos(polar),
        frame.distance * Math.sin(polar),
        new THREE.Vector3(),
        aspect,
      );
      ss.root.updateMatrixWorld(true);
      ss.applyOverviewBoost(camera, viewport.height);

      for (const id of ORBITING) {
        const body = ss.bodies.get(id)!;
        const basePx =
          (body.radius /
            (worldPos(body.mesh).distanceTo(camera.position) * Math.tan((50 * Math.PI) / 360))) *
          (viewport.height / 2);
        requiredCap = Math.max(requiredCap, overviewMinPx(body.radius) / basePx);
        const shownPx = basePx * scaleOf(ss, id);

        expect(scaleOf(ss, id), `${id} overview boost`).toBeLessThanOrEqual(OVERVIEW_MAX_BOOST);
        if (shownPx < overviewMinPx(body.radius) - 0.01) {
          floorFailures.push(
            `${id} ${viewport.width}x${viewport.height}: ${shownPx.toFixed(3)}px < ${overviewMinPx(body.radius).toFixed(3)}px`,
          );
        }
      }
    }

    expect(floorFailures, `required boost cap ${requiredCap}`).toEqual([]);
    expect(OVERVIEW_MAX_BOOST, `smallest required boost cap ${requiredCap}`).toBeGreaterThanOrEqual(
      requiredCap,
    );
    expect(OVERVIEW_MAX_BOOST).toBeLessThan(requiredCap + 0.05);
  });

  it('enlarges far bodies in a phone overview, larger bodies stay larger on screen', () => {
    const ss = make();
    ss.root.updateMatrixWorld(true);
    ss.applyOverviewBoost(cameraAt(0, 600, 1000), 664);
    for (const id of ['mercury', 'earth', 'jupiter', 'pluto'] as const) {
      expect(scaleOf(ss, id)).toBeGreaterThan(1);
    }
    const shown = (id: BodyId): number => ss.bodies.get(id)!.radius * scaleOf(ss, id);
    expect(shown('jupiter')).toBeGreaterThan(shown('earth'));
    expect(shown('earth')).toBeGreaterThan(shown('mercury'));
    // The sun is never scaled.
    expect(scaleOf(ss, 'sun')).toBe(1);
  });

  it('leaves a body the camera is close to at its true display size', () => {
    const ss = make();
    ss.root.updateMatrixWorld(true);
    const earth = worldPos(ss.bodies.get('earth')!.mesh);
    ss.applyOverviewBoost(cameraAt(earth.x + 8, earth.y + 2, earth.z, earth), 664);
    expect(scaleOf(ss, 'earth')).toBe(1);
    expect(ss.bodies.get('moon')!.tiltGroup.visible).toBe(true);
  });

  it('returns each focused planet to its unboosted base radius', () => {
    const ss = make();
    ss.update(0);
    ss.root.updateMatrixWorld(true);
    for (const id of ORBITING) {
      const body = ss.bodies.get(id)!;
      const pos = worldPos(body.mesh);
      ss.applyOverviewBoost(cameraAt(pos.x + 8, pos.y + 2, pos.z, pos), 664);
      expect(scaleOf(ss, id), id).toBe(1);
    }
  });

  describe('moon systems', () => {
    const ray = new THREE.Raycaster();
    const shown = (ss: ReturnType<typeof make>, id: BodyId): boolean => {
      const b = ss.bodies.get(id)!;
      return b.tiltGroup.visible && ray.layers.test(b.pickProxy.layers);
    };

    it('shows a system only while the camera is within the view factor of its outermost moon', () => {
      expect(moonSystemVisible(5 * MOON_SYSTEM_VIEW_FACTOR - 0.01, 5)).toBe(true);
      expect(moonSystemVisible(5 * MOON_SYSTEM_VIEW_FACTOR, 5)).toBe(false);
    });

    it('hides every moon but Earth\u2019s in the overview: not drawn and not pickable', () => {
      const ss = make();
      ss.update(0);
      ss.root.updateMatrixWorld(true);
      // Hidden from creation, before the first boost pass.
      for (const id of SYSTEM_MOONS) expect(shown(ss, id), id).toBe(false);
      ss.applyOverviewBoost(cameraAt(0, 600, 1000), 664);
      for (const id of SYSTEM_MOONS) expect(shown(ss, id), id).toBe(false);
    });

    it('shows a planet\u2019s moons when the camera is near it (a focus view), others by distance', () => {
      const ss = make();
      ss.update(0);
      const viewRadius = (planet: BodyId): number =>
        Math.max(...moonsOf(planet).map((m) => moonDisplay(m).orbitRadius));
      for (const t of [0, 7, 30]) {
        ss.update(t);
        ss.root.updateMatrixWorld(true);
        for (const planet of ['mars', 'jupiter', 'saturn'] as const) {
          const b = ss.bodies.get(planet)!;
          const p = worldPos(b.mesh);
          // About the rig's focus distance (6.6 radii).
          const camera = cameraAt(p.x + b.radius * 6.6, p.y, p.z, p);
          ss.applyOverviewBoost(camera, 664);
          for (const id of SYSTEM_MOONS) {
            const parent = BODIES[id].parent!;
            const d = worldPos(ss.bodies.get(parent)!.mesh).distanceTo(camera.position);
            // Its own moons always; a neighbour's only when that planet is in range too.
            const expected = parent === planet || moonSystemVisible(d, viewRadius(parent));
            expect(shown(ss, id), `${planet} t=${t}: ${id}`).toBe(expected);
          }
        }
      }
    });

    it('keeps a planet\u2019s moons shown while one of them is focused', () => {
      const ss = make();
      ss.update(7);
      ss.root.updateMatrixWorld(true);
      for (const id of SYSTEM_MOONS) {
        const b = ss.bodies.get(id)!;
        const p = worldPos(b.mesh);
        ss.applyOverviewBoost(cameraAt(p.x + b.radius * 6.6, p.y + b.radius, p.z, p), 664);
        for (const sibling of moonsOf(BODIES[id].parent!)) {
          expect(shown(ss, sibling), `${id}: ${sibling}`).toBe(true);
        }
      }
    });

    it('reports each moon once, the first time its system comes into view', () => {
      const seen: BodyId[] = [];
      const ss = createSolarSystem(textures(), tierSettings('high'), {
        onFirstShown: (id) => seen.push(id),
      });
      ss.update(0);
      ss.root.updateMatrixWorld(true);
      ss.applyOverviewBoost(cameraAt(0, 600, 1000), 664);
      expect(seen).toEqual([]);
      const mars = worldPos(ss.bodies.get('mars')!.mesh);
      const near = cameraAt(mars.x + 2, mars.y, mars.z, mars);
      ss.applyOverviewBoost(near, 664);
      // Jupiter's system may be in range of this camera too, depending on the planets' phases.
      expect(seen).toEqual(expect.arrayContaining(moonsOf('mars')));
      const first = [...seen];
      ss.applyOverviewBoost(cameraAt(0, 600, 1000), 664);
      ss.applyOverviewBoost(near, 664);
      expect(seen).toEqual(first);
      expect(new Set(seen).size).toBe(seen.length);
    });

    it('draws no orbit ribbon for any moon', () => {
      const ss = make();
      const lines = ss.root.children.filter((c) => c.name === 'orbit-line');
      expect(lines).toHaveLength(ORBITING.length);
    });
  });

  it('hides the Moon while a boosted Earth would swallow its orbit, and makes it unpickable', () => {
    const ss = make();
    ss.root.updateMatrixWorld(true);
    ss.applyOverviewBoost(cameraAt(0, 600, 1000), 664);
    const earthShown = ss.bodies.get('earth')!.radius * scaleOf(ss, 'earth');
    expect(earthShown).toBeGreaterThan(MOON_ORBIT_DISPLAY * 0.5);
    const moon = ss.bodies.get('moon')!;
    expect(moon.tiltGroup.visible).toBe(false);
    const ray = new THREE.Raycaster();
    expect(ray.layers.test(moon.pickProxy.layers)).toBe(false);
  });

  it('grows pick proxies with the boost and keeps the Saturn ring shadow radius in step', () => {
    const ss = make();
    ss.root.updateMatrixWorld(true);
    ss.applyOverviewBoost(cameraAt(0, 600, 1000), 664);
    const earth = ss.bodies.get('earth')!;
    const proxyR = (earth.pickProxy.geometry as THREE.SphereGeometry).parameters.radius;
    expect(proxyR * earth.pickProxy.scale.x).toBeGreaterThanOrEqual(
      earth.radius * scaleOf(ss, 'earth'),
    );
    expect(earth.pickProxy.userData.shownRadius).toBeCloseTo(earth.radius * scaleOf(ss, 'earth'));
    expect(ss.bodies.get('sun')!.pickProxy.userData.shownRadius).toBe(ss.bodies.get('sun')!.radius);
    const ring = ss.root.getObjectByName('saturn-ring') as THREE.Mesh;
    const u = (ring.material as THREE.ShaderMaterial).uniforms.uPlanetRadius!;
    expect(u.value).toBeCloseTo(ss.bodies.get('saturn')!.radius * scaleOf(ss, 'saturn'), 6);
  });
});
