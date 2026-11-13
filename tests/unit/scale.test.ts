import { describe, expect, it } from 'vitest';
import {
  ASTEROID_BELT_MKM,
  EARTH_DAY_SECONDS,
  EARTH_YEAR_DAYS,
  EARTH_YEAR_SECONDS,
  INITIAL_PHASE,
  MOON_ORBIT_DISPLAY,
  MOON_ORBIT_SLOWDOWN,
  displayMoonOrbitRadius,
  displayPlanetRadius,
  moonDisplay,
  displaySemiMajorAxis,
  displayOrbitRadius,
  displayRadius,
  orbitalAngle,
  rotationAngle,
} from '../../src/config/scale';
import { BODIES, isMoonId, moonsOf } from '../../src/data/bodies';
import { BODY_IDS, type BodyId } from '../../src/data/types';

const DIAMETER = {
  sun: 1392700,
  jupiter: 139820,
  saturn: 116460,
  uranus: 50724,
  neptune: 49244,
  earth: 12756,
  venus: 12104,
  mars: 6792,
  mercury: 4879,
  moon: 3475,
  pluto: 2376,
} as const;

const ORBIT_MKM = {
  mercury: 57.9,
  venus: 108.2,
  earth: 149.6,
  mars: 228,
  jupiter: 778.5,
  saturn: 1432,
  uranus: 2867,
  neptune: 4515,
  pluto: 5906.4,
} as const;

describe('displayRadius', () => {
  it('is strictly increasing in the expected body order', () => {
    const order = [
      'sun',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
      'earth',
      'venus',
      'mars',
      'mercury',
      'moon',
      'pluto',
    ] as const;
    for (let i = 0; i < order.length - 1; i++) {
      const a = order[i]!;
      const b = order[i + 1]!;
      expect(displayRadius(DIAMETER[a])).toBeGreaterThan(displayRadius(DIAMETER[b]));
    }
  });

  it('keeps the Sun from swallowing Mercury', () => {
    expect(displayRadius(1392700)).toBeLessThan(displayOrbitRadius(57.9) - 5);
  });
});

describe('displayPlanetRadius', () => {
  it('uses a shared linear coefficient relative to Earth', () => {
    const earth = displayPlanetRadius(BODIES.earth.physical.diameterKm);
    expect(displayPlanetRadius(BODIES.jupiter.physical.diameterKm) / earth).toBeCloseTo(
      BODIES.jupiter.physical.diameterKm / BODIES.earth.physical.diameterKm,
      10,
    );
    expect(displayPlanetRadius(BODIES.pluto.physical.diameterKm) / earth).toBeCloseTo(
      BODIES.pluto.physical.diameterKm / BODIES.earth.physical.diameterKm,
      10,
    );
  });

  it('keeps Jupiter and Saturn with its rings clear across their eccentric orbit gap', () => {
    const jupiter = BODIES.jupiter.orbit!;
    const saturn = BODIES.saturn.orbit!;
    const jupiterApoapsis =
      displaySemiMajorAxis(jupiter.semiMajorAxisAu) * (1 + jupiter.eccentricity);
    const saturnPeriapsis =
      displaySemiMajorAxis(saturn.semiMajorAxisAu) * (1 - saturn.eccentricity);
    const jupiterOuterEdge =
      jupiterApoapsis + displayPlanetRadius(BODIES.jupiter.physical.diameterKm);
    const saturnRingInnerEdge =
      saturnPeriapsis - 2.3 * displayPlanetRadius(BODIES.saturn.physical.diameterKm);

    expect(jupiterOuterEdge).toBeLessThan(saturnRingInnerEdge);
  });
});

describe('displayOrbitRadius', () => {
  it('maps Mercury to about 48', () => {
    expect(displayOrbitRadius(57.9)).toBeCloseTo(48, 5);
  });

  it('keeps Neptune inside Pluto', () => {
    expect(displayOrbitRadius(4515)).toBeLessThan(displayOrbitRadius(5906.4));
  });

  it('preserves planet orbit order', () => {
    const values = Object.values(ORBIT_MKM).map(displayOrbitRadius);
    for (let i = 0; i < values.length - 1; i++) {
      expect(values[i]!).toBeLessThan(values[i + 1]!);
    }
  });

  it('fits the Saturn ring inside half the Saturn-Jupiter gap', () => {
    const ringOuter = 2.3 * displayRadius(120536);
    const gap = displayOrbitRadius(1432) - displayOrbitRadius(778.5);
    expect(ringOuter).toBeLessThan(gap / 2);
  });

  it('places the asteroid belt strictly between Mars and Jupiter', () => {
    const mars = displayOrbitRadius(ORBIT_MKM.mars);
    const jupiter = displayOrbitRadius(ORBIT_MKM.jupiter);
    const inner = displayOrbitRadius(ASTEROID_BELT_MKM.inner);
    const outer = displayOrbitRadius(ASTEROID_BELT_MKM.outer);
    expect(inner).toBeGreaterThan(mars);
    expect(outer).toBeGreaterThan(inner);
    expect(outer).toBeLessThan(jupiter);
  });
});

describe('displaySemiMajorAxis', () => {
  it('converts an AU to million kilometres before applying orbit compression', () => {
    expect(displaySemiMajorAxis(1)).toBeCloseTo(65.00714405559911, 10);
  });
});

describe('orbitalAngle', () => {
  it('completes one revolution per Earth year (60 s)', () => {
    expect(orbitalAngle(365.25, 60, 0)).toBeCloseTo(2 * Math.PI, 6);
  });

  it('scales inversely with period', () => {
    const ratio = orbitalAngle(687, 30, 0) / orbitalAngle(365.25, 30, 0);
    expect(ratio).toBeCloseTo(365.25 / 687, 6);
  });

  it('adds the phase offset', () => {
    expect(orbitalAngle(365.25, 0, 1.25)).toBeCloseTo(1.25, 10);
  });
});

describe('rotationAngle', () => {
  it('is negative for retrograde rotation', () => {
    expect(rotationAngle(-5832.5, 10)).toBeLessThan(0);
  });

  it('completes one turn per Earth day (20 s)', () => {
    expect(rotationAngle(23.93, EARTH_DAY_SECONDS)).toBeCloseTo(2 * Math.PI, 6);
  });
});

describe('INITIAL_PHASE', () => {
  it('has a finite phase for every body', () => {
    for (const id of BODY_IDS) {
      expect(Number.isFinite(INITIAL_PHASE[id])).toBe(true);
    }
  });

  it('gives every planet a distinct phase', () => {
    const planets = BODY_IDS.filter((id) => id !== 'sun' && !isMoonId(id));
    const phases = planets.map((id) => INITIAL_PHASE[id]);
    expect(new Set(phases).size).toBe(planets.length);
    const sorted = [...phases].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i + 1]! - sorted[i]!).toBeGreaterThan(0.2);
    }
  });
});

describe('moon display orbits and timing', () => {
  const NEW_MOONS = BODY_IDS.filter((id) => isMoonId(id) && id !== 'moon');
  const parentRadius = (id: BodyId): number =>
    displayPlanetRadius(BODIES[BODIES[id].parent!].physical.diameterKm);
  /** Seconds of display time per orbit at simulation speed 1. */
  const secondsPerOrbit = (id: BodyId): number =>
    (EARTH_YEAR_SECONDS * moonDisplay(id).periodDays) / EARTH_YEAR_DAYS;

  it('keeps Earth’s Moon exactly as before: pinned radius, real period, ecliptic, overview', () => {
    expect(moonDisplay('moon')).toEqual({
      orbitRadius: MOON_ORBIT_DISPLAY,
      periodDays: BODIES.moon.physical.orbitalPeriodDays,
      equatorial: false,
      overview: true,
    });
  });

  it('puts every new moon in its planet’s equatorial plane, hidden from the overview', () => {
    for (const id of NEW_MOONS) {
      expect(moonDisplay(id).equatorial, id).toBe(true);
      expect(moonDisplay(id).overview, id).toBe(false);
    }
  });

  it('derives the radius from the real distance in planet radii (log compression)', () => {
    const io = BODIES.io.physical;
    const jupiterKm = BODIES.jupiter.physical.diameterKm / 2;
    expect(moonDisplay('io').orbitRadius).toBeCloseTo(
      displayMoonOrbitRadius(parentRadius('io'), (io.distanceFromParentMkm! * 1e6) / jupiterKm),
      10,
    );
    expect(displayMoonOrbitRadius(2, 1)).toBe(2);
  });

  it('clears each planet’s globe with room for the moon’s own disc', () => {
    for (const id of NEW_MOONS) {
      const r = displayRadius(BODIES[id].physical.diameterKm);
      expect(moonDisplay(id).orbitRadius - r, id).toBeGreaterThan(parentRadius(id) * 1.3);
    }
  });

  it('keeps Saturn’s moons outside the main ring (2.3 planet radii)', () => {
    for (const id of moonsOf('saturn')) {
      const r = displayRadius(BODIES[id].physical.diameterKm);
      expect(moonDisplay(id).orbitRadius - r, id).toBeGreaterThan(parentRadius(id) * 2.3);
    }
  });

  it('keeps the real distance order around every planet', () => {
    for (const planet of ['mars', 'jupiter', 'saturn'] as const) {
      const radii = moonsOf(planet).map((id) => moonDisplay(id).orbitRadius);
      for (let i = 1; i < radii.length; i++) expect(radii[i]!).toBeGreaterThan(radii[i - 1]!);
    }
  });

  it('keeps every moon system within 4.5 planet radii, so it fits a focus view', () => {
    for (const id of NEW_MOONS) {
      expect(moonDisplay(id).orbitRadius / parentRadius(id), id).toBeLessThan(4.5);
    }
  });

  it('slows the new moons by one factor: the fastest takes several seconds, ratios are real', () => {
    expect(MOON_ORBIT_SLOWDOWN).toBeGreaterThan(1);
    for (const id of NEW_MOONS) {
      expect(moonDisplay(id).periodDays, id).toBeCloseTo(
        BODIES[id].physical.orbitalPeriodDays! * MOON_ORBIT_SLOWDOWN,
        10,
      );
    }
    const fastest = Math.min(...NEW_MOONS.map(secondsPerOrbit));
    expect(fastest).toBeGreaterThanOrEqual(3);
    // Io : Europa : Ganymede stay locked near 1 : 2 : 4 (the Laplace resonance).
    expect(secondsPerOrbit('europa') / secondsPerOrbit('io')).toBeCloseTo(2, 1);
    expect(secondsPerOrbit('ganymede') / secondsPerOrbit('europa')).toBeCloseTo(2, 1);
  });

  it('starts Io, Europa and Ganymede in the Laplace configuration', () => {
    const l = INITIAL_PHASE.io - 3 * INITIAL_PHASE.europa + 2 * INITIAL_PHASE.ganymede;
    const wrapped = ((l % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    expect(wrapped).toBeCloseTo(Math.PI, 6);
  });
});
