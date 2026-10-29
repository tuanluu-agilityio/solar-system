import * as THREE from 'three';
import { BODIES } from '../data/bodies';
import type { BodyId } from '../data/types';
import type { TierSettings } from '../quality/tiers';
import {
  EARTH_YEAR_DAYS,
  INITIAL_PHASE,
  MOON_ORBIT_DISPLAY,
  displayOrbitRadius,
  displayRadius,
  orbitalAngle,
  rotationAngle,
} from '../config/scale';

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
  /** Child of `orbitPivot`, translated out to the orbit radius. Moons attach here. */
  offset: THREE.Object3D;
  orbitRadius: number;
  update(tSec: number): void;
  setSegments(s: TierSettings): void;
}

export const PICK_SCALE = 1.8;
export const PICK_MIN_RADIUS = 2.5;
/** Turning the sphere by PI points its texture centre (u = 0.5, +x) back toward the planet. */
const MOON_NEAR_SIDE_YAW = Math.PI;

/** Low tier is the only one capped at pixel ratio 1.5 (see Global Constraints). */
export function sphereSegments(s: TierSettings): number {
  return s.pixelRatioCap <= 1.5 ? 32 : 64;
}

function orbitPeriodDays(id: BodyId): number {
  // The Earth year is exactly 60 s of display time.
  if (id === 'earth') return EARTH_YEAR_DAYS;
  return BODIES[id].physical.orbitalPeriodDays ?? EARTH_YEAR_DAYS;
}

function orbitRadiusOf(id: BodyId): number {
  if (id === 'moon') return MOON_ORBIT_DISPLAY;
  return displayOrbitRadius(BODIES[id].physical.distanceFromParentMkm ?? 0);
}

function makeGeometry(radius: number, s: TierSettings): THREE.SphereGeometry {
  const seg = sphereSegments(s);
  return new THREE.SphereGeometry(radius, seg, seg / 2);
}

/** Enlarged invisible (but raycastable) tap target, spec 3.3. */
export function createPickProxy(id: BodyId, radius: number): THREE.Mesh {
  const proxy = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(radius * PICK_SCALE, PICK_MIN_RADIUS), 12, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  proxy.name = `${id}-pick`;
  proxy.userData.bodyId = id;
  return proxy;
}

/** Builds one textured body (everything except the sun, whose surface is its own shader). */
export function createPlanet(
  id: BodyId,
  texture: THREE.Texture,
  s: TierSettings,
  parent: THREE.Object3D,
): PlanetRig {
  const phys = BODIES[id].physical;
  const radius = displayRadius(phys.diameterKm);
  const orbitRadius = orbitRadiusOf(id);
  const isMoon = id === 'moon';

  const orbitPivot = new THREE.Group();
  orbitPivot.name = `${id}-orbit`;
  parent.add(orbitPivot);

  const offset = new THREE.Group();
  offset.name = `${id}-offset`;
  offset.position.x = orbitRadius;
  orbitPivot.add(offset);

  const tiltGroup = new THREE.Group();
  tiltGroup.name = `${id}-tilt`;
  tiltGroup.rotation.z = THREE.MathUtils.degToRad(phys.axialTiltDeg);
  offset.add(tiltGroup);

  const mesh = new THREE.Mesh(
    makeGeometry(radius, s),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 }),
  );
  mesh.name = id;
  if (isMoon) mesh.rotation.y = MOON_NEAR_SIDE_YAW;
  tiltGroup.add(mesh);

  const pickProxy = createPickProxy(id, radius);
  offset.add(pickProxy);

  const period = orbitPeriodDays(id);
  const phase = INITIAL_PHASE[id];
  return {
    body: { id, orbitPivot, tiltGroup, mesh, radius, pickProxy },
    offset,
    orbitRadius,
    update(tSec) {
      orbitPivot.rotation.y = orbitalAngle(period, tSec, phase);
      // The Moon is tidally locked: its fixed yaw rides along with the rotating pivot.
      if (!isMoon) mesh.rotation.y = rotationAngle(phys.rotationPeriodHours, tSec);
    },
    setSegments(next) {
      const old = mesh.geometry;
      mesh.geometry = makeGeometry(radius, next);
      old.dispose();
    },
  };
}
