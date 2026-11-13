import * as THREE from 'three';
import { BODIES } from '../data/bodies';
import type { BodyId } from '../data/types';
import type { TierSettings } from '../quality/tiers';
import {
  EARTH_YEAR_DAYS,
  displayPlanetRadius,
  INITIAL_PHASE,
  displaySemiMajorAxis,
  displayRadius,
  moonDisplay,
  orbitalAngle,
  rotationAngle,
  type MoonDisplay,
} from '../config/scale';
import { writePositionAtMeanAnomaly, type KeplerOrbitShape } from './kepler';
import { irregularGeometry } from './moonShape';

export interface BodyObject {
  id: BodyId;
  orbitPivot: THREE.Object3D;
  tiltGroup: THREE.Object3D;
  mesh: THREE.Mesh;
  radius: number;
  pickProxy: THREE.Mesh;
}

/** Internal handle: the public BodyObject plus what `update` and parenting need. */
export interface PlanetRig {
  body: BodyObject;
  /** Child of `orbitPivot`, positioned at the current orbit point. Moons attach here. */
  offset: THREE.Object3D;
  orbitShape: KeplerOrbitShape | null;
  update(tSec: number): number;
  setSegments(s: TierSettings): void;
}

export const PICK_SCALE = 1.8;
export const PICK_MIN_RADIUS = 2.5;
/**
 * A moon seen only near its planet gets a tap target of at most this share of its orbit
 * radius, so it never swallows the planet or its sibling moons (Phobos orbits 0.66 units out).
 */
export const MOON_PICK_ORBIT_SHARE = 0.3;
/**
 * Turning the sphere by PI points its texture centre (u = 0.5, +x, longitude 0: the sub-planet
 * point of a synchronous moon's map) back toward the planet.
 */
const MOON_NEAR_SIDE_YAW = Math.PI;
/** Seed of the lumpy shape of irregular moons (Phobos, Deimos): fixed, so it never changes. */
const SHAPE_SEED = 1877;

/** Low tier is the only one capped at pixel ratio 1.5 (see Global Constraints). */
export function sphereSegments(s: TierSettings): number {
  return s.pixelRatioCap <= 1.5 ? 32 : 64;
}

function orbitPeriodDays(id: BodyId, moon: MoonDisplay | null): number {
  if (moon) return moon.periodDays;
  // The Earth year is exactly 60 s of display time.
  if (id === 'earth') return EARTH_YEAR_DAYS;
  return BODIES[id].physical.orbitalPeriodDays ?? EARTH_YEAR_DAYS;
}

function orbitShapeOf(id: BodyId): KeplerOrbitShape | null {
  const orbit = BODIES[id].orbit;
  if (!orbit) return null;
  return {
    semiMajorAxisDisplay: displaySemiMajorAxis(orbit.semiMajorAxisAu),
    eccentricity: orbit.eccentricity,
    inclinationRad: THREE.MathUtils.degToRad(orbit.inclinationDeg),
    ascendingNodeRad: THREE.MathUtils.degToRad(orbit.longitudeOfAscendingNodeDeg),
    argumentOfPerihelionRad: THREE.MathUtils.degToRad(orbit.argumentOfPerihelionDeg),
  };
}

/** A per-body seed: Phobos and Deimos get different lumps. */
function shapeSeed(id: BodyId): number {
  let h = SHAPE_SEED;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** A UV sphere, or for a body with triaxial radii (Phobos, Deimos) a lumpy irregular shape. */
function makeGeometry(id: BodyId, radius: number, s: TierSettings): THREE.SphereGeometry {
  const seg = sphereSegments(s);
  const shape = BODIES[id].physical.shapeRadiiKm;
  if (shape) return irregularGeometry(radius, shape, seg, shapeSeed(id));
  return new THREE.SphereGeometry(radius, seg, seg / 2);
}

/** Radius of the tap target: 1.8x the body, at least `minRadius`. */
export function pickRadius(radius: number, minRadius: number = PICK_MIN_RADIUS): number {
  return Math.max(radius * PICK_SCALE, minRadius);
}

/**
 * Enlarged invisible (but raycastable) tap target, spec 3.3. `minRadius` defaults to the
 * overview-sized `PICK_MIN_RADIUS`; moons seen only up close pass a smaller one.
 */
export function createPickProxy(
  id: BodyId,
  radius: number,
  minRadius: number = PICK_MIN_RADIUS,
): THREE.Mesh {
  const baseRadius = pickRadius(radius, minRadius);
  const proxy = new THREE.Mesh(
    new THREE.SphereGeometry(baseRadius, 12, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  proxy.name = `${id}-pick`;
  proxy.userData.bodyId = id;
  // Unscaled tap-target radius: the overview boost scales the proxy relative to it.
  proxy.userData.baseRadius = baseRadius;
  // Radius of the visible body (updated by the overview boost); the picker prefers it.
  proxy.userData.shownRadius = radius;
  return proxy;
}

/**
 * Builds one textured body (everything except the sun, whose surface is its own shader).
 * `material` overrides the default lit material (Earth's day/night shader).
 */
export function createPlanet(
  id: BodyId,
  texture: THREE.Texture,
  s: TierSettings,
  parent: THREE.Object3D,
  material?: THREE.Material,
): PlanetRig {
  const phys = BODIES[id].physical;
  // A moon circles its planet on a display orbit; planets and Pluto follow Kepler ellipses.
  const moon = BODIES[id].kind === 'moon' ? moonDisplay(id) : null;
  const isMoon = moon !== null;
  const radius = isMoon ? displayRadius(phys.diameterKm) : displayPlanetRadius(phys.diameterKm);
  const orbitShape = orbitShapeOf(id);
  if (!isMoon && !orbitShape) throw new Error(`Missing orbit elements for ${id}`);

  const orbitPivot = new THREE.Group();
  orbitPivot.name = `${id}-orbit`;
  parent.add(orbitPivot);

  const offset = new THREE.Group();
  offset.name = `${id}-offset`;
  if (moon) offset.position.x = moon.orbitRadius;
  orbitPivot.add(offset);

  const tiltGroup = new THREE.Group();
  tiltGroup.name = `${id}-tilt`;
  tiltGroup.rotation.z = THREE.MathUtils.degToRad(phys.axialTiltDeg);
  offset.add(tiltGroup);

  const mesh = new THREE.Mesh(
    makeGeometry(id, radius, s),
    material ?? new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 }),
  );
  mesh.name = id;
  if (isMoon) mesh.rotation.y = MOON_NEAR_SIDE_YAW;
  tiltGroup.add(mesh);

  // Moons hidden from the overview never need the overview-sized minimum tap target.
  const pickMin =
    moon && !moon.overview
      ? Math.min(PICK_MIN_RADIUS, moon.orbitRadius * MOON_PICK_ORBIT_SHARE)
      : PICK_MIN_RADIUS;
  const pickProxy = createPickProxy(id, radius, pickMin);
  offset.add(pickProxy);

  // A tilt above 90 deg already flips the spin axis, which renders the retrograde direction.
  // Data keeps the negative period; using it here too would double-count and spin prograde.
  const spinHours =
    phys.axialTiltDeg > 90 ? Math.abs(phys.rotationPeriodHours) : phys.rotationPeriodHours;
  const period = orbitPeriodDays(id, moon);
  const phase = isMoon
    ? INITIAL_PHASE[id]
    : THREE.MathUtils.degToRad(BODIES[id].orbit!.meanAnomalyAtEpochDeg);
  return {
    body: { id, orbitPivot, tiltGroup, mesh, radius, pickProxy },
    offset,
    orbitShape,
    update(tSec) {
      const meanAnomaly = orbitalAngle(period, tSec, phase);
      if (orbitShape) {
        writePositionAtMeanAnomaly(orbitShape, meanAnomaly, offset.position);
      } else {
        orbitPivot.rotation.y = meanAnomaly;
      }
      // Moons are tidally locked: the fixed yaw rides along with the rotating pivot.
      if (!isMoon) mesh.rotation.y = rotationAngle(spinHours, tSec);
      return meanAnomaly;
    },
    setSegments(next) {
      const old = mesh.geometry;
      mesh.geometry = makeGeometry(id, radius, next);
      old.dispose();
    },
  };
}
