import { describe, expect, it } from 'vitest';
import { BODIES, PLANET_ORDER, isMoonId, moonsOf } from '../../src/data/bodies';
import { BODY_IDS, type BodyId, type BodyKind } from '../../src/data/types';

// id, diameterKm, massEarths, gravity, rotH, tilt, tempC, distMkm, orbitDays
const ROWS: [
  BodyId,
  number,
  number,
  number,
  number,
  number,
  number | undefined,
  number?,
  number?,
][] = [
  ['sun', 1392700, 333000, 274, 609.12, 7.25, 5500],
  ['mercury', 4879, 0.0553, 3.7, 1407.6, 0.034, 167, 57.9, 88.0],
  ['venus', 12104, 0.815, 8.9, -5832.5, 177.4, 464, 108.2, 224.7],
  ['earth', 12756, 1, 9.8, 23.9, 23.4, 15, 149.6, 365.2],
  ['moon', 3475, 0.0123, 1.6, 655.7, 6.7, -20, 0.3844, 27.3],
  ['mars', 6792, 0.107, 3.7, 24.6, 25.2, -65, 228.0, 687.0],
  ['jupiter', 142984, 317.8, 23.1, 9.9, 3.1, -110, 778.5, 4331],
  ['saturn', 120536, 95.2, 9.0, 10.7, 26.7, -140, 1432.0, 10747],
  ['uranus', 51118, 14.5, 8.7, -17.2, 97.8, -195, 2867.0, 30589],
  ['neptune', 49528, 17.1, 11.0, 16.1, 28.3, -200, 4515.0, 59800],
  ['pluto', 2376, 0.0022, 0.7, -153.3, 122.5, -225, 5906.4, 90560],
  // Moons: NASA NSSDC satellite fact sheets, JPL satellite physical parameters.
  ['phobos', 22.2, 0.00000000178, 0.0058, 7.65, 0, undefined, 0.009378, 0.31891],
  ['deimos', 12.4, 0.000000000402, 0.0025, 30.3, 0, undefined, 0.023459, 1.26244],
  ['io', 3643, 0.015, 1.8, 42.5, 0, -155, 0.4218, 1.769138],
  ['europa', 3122, 0.00804, 1.31, 85.2, 0, -170, 0.6711, 3.551181],
  ['ganymede', 5262, 0.0248, 1.43, 171.7, 0, -160, 1.0704, 7.154553],
  ['callisto', 4821, 0.018, 1.24, 400.5, 0, -155, 1.8827, 16.689017],
  ['enceladus', 504.2, 0.0000181, 0.113, 32.9, 0, -201, 0.23802, 1.370218],
  ['titan', 5150, 0.0225, 1.35, 382.7, 0, -179, 1.22187, 15.945421],
];

const PARENTS: Partial<Record<BodyId, BodyId>> = {
  moon: 'earth',
  phobos: 'mars',
  deimos: 'mars',
  io: 'jupiter',
  europa: 'jupiter',
  ganymede: 'jupiter',
  callisto: 'jupiter',
  enceladus: 'saturn',
  titan: 'saturn',
};
const MOONS = Object.keys(PARENTS) as BodyId[];

const KINDS: Record<BodyId, BodyKind> = {
  sun: 'star',
  mercury: 'terrestrial',
  venus: 'terrestrial',
  earth: 'terrestrial',
  mars: 'terrestrial',
  jupiter: 'gas-giant',
  saturn: 'gas-giant',
  uranus: 'ice-giant',
  neptune: 'ice-giant',
  pluto: 'dwarf-planet',
  moon: 'moon',
  phobos: 'moon',
  deimos: 'moon',
  io: 'moon',
  europa: 'moon',
  ganymede: 'moon',
  callisto: 'moon',
  enceladus: 'moon',
  titan: 'moon',
};

describe('BODIES', () => {
  it.each(ROWS)('%s matches the fact sheet', (id, d, m, g, rot, tilt, temp, dist, orbit) => {
    const p = BODIES[id].physical;
    expect(BODIES[id].id).toBe(id);
    expect(p.diameterKm).toBe(d);
    // Relative check: moon masses span ten orders of magnitude.
    expect(Math.abs(p.massEarths - m) / m).toBeLessThan(0.01);
    expect(p.surfaceGravity).toBe(g);
    expect(p.rotationPeriodHours).toBe(rot);
    expect(p.axialTiltDeg).toBe(tilt);
    expect(p.meanTempC).toBe(temp);
    expect(p.distanceFromParentMkm).toBe(dist);
    expect(p.orbitalPeriodDays).toBe(orbit);
  });

  it('has kinds', () => {
    for (const id of Object.keys(KINDS) as BodyId[]) expect(BODIES[id].kind).toBe(KINDS[id]);
  });

  it('has parents', () => {
    expect(BODIES.sun.parent).toBeNull();
    for (const id of Object.keys(BODIES) as BodyId[]) {
      if (id !== 'sun') expect(BODIES[id].parent, id).toBe(PARENTS[id] ?? 'sun');
    }
  });

  it('lists every moon after its parent in BODY_IDS', () => {
    for (const id of MOONS) {
      const parent = BODIES[id].parent!;
      expect(BODY_IDS.indexOf(id), id).toBeGreaterThan(BODY_IDS.indexOf(parent));
    }
  });

  it('keeps the moons in real distance order around each planet', () => {
    for (const planet of ['mars', 'jupiter', 'saturn'] as const) {
      const d = moonsOf(planet).map((id) => BODIES[id].physical.distanceFromParentMkm!);
      expect(d, planet).toEqual([...d].sort((a, b) => a - b));
    }
    expect(moonsOf('jupiter')).toEqual(['io', 'europa', 'ganymede', 'callisto']);
    expect(moonsOf('saturn')).toEqual(['enceladus', 'titan']);
    expect(moonsOf('mars')).toEqual(['phobos', 'deimos']);
    expect(moonsOf('earth')).toEqual(['moon']);
    expect(moonsOf('venus')).toEqual([]);
  });

  it('makes every new moon tidally locked: rotation period equals the orbital period', () => {
    for (const id of MOONS.filter((m) => m !== 'moon')) {
      const p = BODIES[id].physical;
      expect(p.rotationPeriodHours / 24 / p.orbitalPeriodDays!, id).toBeCloseTo(1, 2);
    }
  });

  it('gives Phobos and Deimos their triaxial NASA radii (sub-planet axis longest)', () => {
    expect(BODIES.phobos.physical.shapeRadiiKm).toEqual([13.0, 11.4, 9.1]);
    expect(BODIES.deimos.physical.shapeRadiiKm).toEqual([7.8, 6.0, 5.1]);
  });

  it('identifies moons by kind', () => {
    for (const id of BODY_IDS) expect(isMoonId(id), id).toBe(MOONS.includes(id));
  });

  it('has finite J2000 orbital elements for every planet and Pluto only', () => {
    for (const id of PLANET_ORDER) {
      const orbit = BODIES[id].orbit;
      expect(orbit, id).toBeDefined();
      if (!orbit) continue;

      expect(orbit.semiMajorAxisAu, id).toBeGreaterThan(0);
      expect(orbit.eccentricity, id).toBeGreaterThanOrEqual(0);
      expect(orbit.eccentricity, id).toBeLessThan(1);
      expect(
        [
          orbit.semiMajorAxisAu,
          orbit.eccentricity,
          orbit.inclinationDeg,
          orbit.longitudeOfAscendingNodeDeg,
          orbit.argumentOfPerihelionDeg,
          orbit.meanAnomalyAtEpochDeg,
        ].every(Number.isFinite),
        id,
      ).toBe(true);
    }

    expect(BODIES.sun.orbit).toBeUndefined();
    for (const id of MOONS) expect(BODIES[id].orbit, id).toBeUndefined();
  });

  it('has planet order and orderFromSun', () => {
    expect(PLANET_ORDER).toEqual([
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
      'pluto',
    ]);
    PLANET_ORDER.forEach((id, i) => expect(BODIES[id].orderFromSun).toBe(i + 1));
    expect(BODIES.sun.orderFromSun).toBeNull();
    for (const id of MOONS) expect(BODIES[id].orderFromSun, id).toBeNull();
  });

  it('has non-negative integer moon counts for planets', () => {
    for (const id of PLANET_ORDER) {
      expect(Number.isInteger(BODIES[id].physical.knownMoons)).toBe(true);
    }
  });

  it('gives the 8 planets and Pluto a hex orbitColor, and the Sun and the moons none', () => {
    for (const id of Object.keys(BODIES) as BodyId[]) {
      if (id === 'sun' || MOONS.includes(id)) expect(BODIES[id].orbitColor, id).toBeUndefined();
      else expect(BODIES[id].orbitColor, id).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
