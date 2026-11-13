import type { BodyId } from '../data/types';
import { BODIES } from '../data/bodies';

/** Real seconds for one Earth orbit. */
export const EARTH_YEAR_SECONDS = 60;
/** Real seconds for one Earth rotation. */
export const EARTH_DAY_SECONDS = 20;
/**
 * Earth's Moon orbit radius in display units from Earth's centre. Pinned: the Moon's compressed
 * globe is drawn larger than Earth's linear one, so the shared moon formula would not clear it.
 */
export const MOON_ORBIT_DISPLAY = 4;
/**
 * Moon orbits (other than Earth's Moon) are drawn at `R * (1 + MOON_ORBIT_LOG * ln(a / R))`
 * from the planet's centre, where R is the planet's display radius and a / R the real distance
 * in planet radii. The log keeps the real order, clears the globe (and Saturn's main ring,
 * 2.3 R) and keeps Callisto within about 4.4 Jupiter radii, so a system fits its focus view.
 */
export const MOON_ORBIT_LOG = 1.05;
/**
 * One slow-down for every moon orbit except Earth's Moon (already about 4.5 s per orbit):
 * at the real ratio Io would circle Jupiter in 0.3 s and Phobos Mars in 0.05 s. Times 60,
 * Phobos takes about 3 s and Io about 17 s; ratios (Io : Europa : Ganymede = 1 : 2 : 4) stay real.
 */
export const MOON_ORBIT_SLOWDOWN = 60;
/**
 * A planet's moons (other than Earth's Moon) show only while the camera is within this many
 * outermost-moon orbit radii of the planet, so the overview stays uncluttered.
 */
export const MOON_SYSTEM_VIEW_FACTOR = 4;
/** Asteroid belt extent, million km from the Sun. */
export const ASTEROID_BELT_MKM = { inner: 329, outer: 479 } as const;
/** Asteroid belt orbital period in Earth years. */
export const ASTEROID_BELT_PERIOD_YEARS = 4.6;
/**
 * Kuiper belt extent in AU (visual only, not selectable): the classical belt from Neptune's
 * orbit out to about 50 AU, which Pluto's orbit (39.5 AU) crosses.
 */
export const KUIPER_BELT_AU = { inner: 30, outer: 50 } as const;
/** Kuiper belt turning period in Earth years (about Pluto's, 248 years). */
export const KUIPER_BELT_PERIOD_YEARS = 248;

/** Earth orbital period in days used by the orbit maths (a 60 s display year). */
export const EARTH_YEAR_DAYS = 365.25;
const EARTH_DAY_HOURS = 23.93;
const TWO_PI = 2 * Math.PI;
const AU_MKM = 149.5978707;
const EARTH_DIAMETER_KM = BODIES.earth.physical.diameterKm;
const PLANET_RADIUS_COEFFICIENT = 0.6 / EARTH_DIAMETER_KM;

/** Compressed (non-linear) Sun and Moon radius in display units. */
export function displayRadius(diameterKm: number): number {
  return 1.2 * (diameterKm / EARTH_DIAMETER_KM) ** 0.45;
}

/** Linear planet radius in display units, with one coefficient shared by all planets. */
export function displayPlanetRadius(diameterKm: number): number {
  return PLANET_RADIUS_COEFFICIENT * diameterKm;
}

/** Compressed orbit radius in display units; Mercury lands near 48. */
export function displayOrbitRadius(distanceMkm: number): number {
  return 20 + 28 * Math.sqrt(distanceMkm / 57.9);
}

/** Compressed display distance for a semi-major axis given in astronomical units. */
export function displaySemiMajorAxis(semiMajorAxisAu: number): number {
  return displayOrbitRadius(semiMajorAxisAu * AU_MKM);
}

/** Orbital angle in radians at time tSeconds. */
export function orbitalAngle(periodDays: number, tSeconds: number, phase: number): number {
  return phase + (TWO_PI * tSeconds) / ((EARTH_YEAR_SECONDS * periodDays) / EARTH_YEAR_DAYS);
}

/** Spin angle in radians; negative for retrograde (negative period). */
export function rotationAngle(rotationPeriodHours: number, tSeconds: number): number {
  return (TWO_PI * tSeconds) / ((EARTH_DAY_SECONDS * rotationPeriodHours) / EARTH_DAY_HOURS);
}

/**
 * Starting orbital phase (radians), spread so no two planets line up at t=0. Moons: angle
 * around their planet; Io, Europa and Ganymede start in the Laplace configuration
 * (Io - 3 Europa + 2 Ganymede = 180 deg), which the shared slow-down preserves.
 */
export const INITIAL_PHASE: Record<BodyId, number> = {
  sun: 0,
  mercury: 0.6,
  venus: 2.1,
  earth: 3.6,
  moon: 0,
  mars: 5.0,
  phobos: 1.0,
  deimos: 3.9,
  jupiter: 1.2,
  io: 0.3,
  europa: 2.4,
  ganymede: (Math.PI - 0.3 + 3 * 2.4) / 2,
  callisto: 1.4,
  saturn: 4.3,
  enceladus: 3.3,
  titan: 5.4,
  uranus: 2.8,
  neptune: 5.7,
  pluto: 0.1,
};

/**
 * Overview legibility (spec 3.2 "pretty and easy to see"): a far body is drawn at least this
 * many CSS px in radius when it has Earth's display radius; the minimum grows with the square
 * root of the display radius, so the size order between bodies is kept.
 */
export const OVERVIEW_MIN_BODY_PX = 6;
/** Upper bound of that screen-space scale-up. */
export const OVERVIEW_MAX_BOOST = 42.29;

/** Display orbit radius of a moon `distanceInPlanetRadii` planet radii from a planet of display radius `parentRadius`. */
export function displayMoonOrbitRadius(
  parentRadius: number,
  distanceInPlanetRadii: number,
): number {
  return parentRadius * (1 + MOON_ORBIT_LOG * Math.log(distanceInPlanetRadii));
}

export interface MoonDisplay {
  /** Distance from the planet's centre, display units. */
  orbitRadius: number;
  /** Orbital period fed to `orbitalAngle` (real period times the slow-down). */
  periodDays: number;
  /** Orbits in the planet's equatorial plane (regular moons); else in the ecliptic frame. */
  equatorial: boolean;
  /** Shown in the overview; otherwise only near its planet (`MOON_SYSTEM_VIEW_FACTOR`). */
  overview: boolean;
}

/**
 * Earth's Moon keeps its long-standing display: the pinned radius, its real 27.3-day period,
 * an orbit in the ecliptic frame (the Moon's orbit follows the ecliptic, not Earth's equator)
 * and a place in the overview.
 */
const EARTH_MOON_DISPLAY: MoonDisplay = {
  orbitRadius: MOON_ORBIT_DISPLAY,
  periodDays: BODIES.moon.physical.orbitalPeriodDays ?? 27.3,
  equatorial: false,
  overview: true,
};

/** How a moon (a body whose parent is a planet) is placed and timed. */
export function moonDisplay(id: BodyId): MoonDisplay {
  if (id === 'moon') return EARTH_MOON_DISPLAY;
  const body = BODIES[id];
  const parent = body.parent ? BODIES[body.parent] : null;
  const distanceMkm = body.physical.distanceFromParentMkm;
  const periodDays = body.physical.orbitalPeriodDays;
  if (body.kind !== 'moon' || !parent || distanceMkm === undefined || periodDays === undefined) {
    throw new Error(`${id} is not a moon with an orbit around a planet`);
  }
  const parentRadiusKm = parent.physical.diameterKm / 2;
  return {
    orbitRadius: displayMoonOrbitRadius(
      displayPlanetRadius(parent.physical.diameterKm),
      (distanceMkm * 1e6) / parentRadiusKm,
    ),
    periodDays: periodDays * MOON_ORBIT_SLOWDOWN,
    equatorial: true,
    overview: false,
  };
}
