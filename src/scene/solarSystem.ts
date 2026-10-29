import * as THREE from 'three';
import { BODIES } from '../data/bodies';
import { BODY_IDS, type BodyId, type ContentId } from '../data/types';
import type { TierSettings } from '../quality/tiers';
import {
  ASTEROID_BELT_MKM,
  EARTH_YEAR_DAYS,
  INITIAL_PHASE,
  displayOrbitRadius,
  displayRadius,
  orbitalAngle,
} from '../config/scale';
import { createPickProxy, createPlanet, type BodyObject, type PlanetRig } from '../bodies/planet';
import { createOrbitLine } from '../bodies/orbitLine';
import { makeFallbackTexture } from './textures';

export type { BodyObject };

export interface FocusTarget {
  object: THREE.Object3D;
  radius: number;
}

export interface SolarSystem {
  root: THREE.Group;
  bodies: Map<BodyId, BodyObject>;
  pickables: THREE.Object3D[];
  update(tSec: number): void;
  getFocusTarget(id: ContentId): FocusTarget;
  setTierSettings(s: TierSettings): void;
}

const BELT_FOCUS_RADIUS = 12;

/** Texture key per body (Venus and Earth use their surface/day maps). */
const TEXTURE_KEY: Partial<Record<BodyId, string>> = {
  venus: 'venus_surface',
  earth: 'earth_day',
};

/**
 * The sun's visible surface, light and bloom come from `createSun`. Here it only needs a
 * body entry so it can be focused and picked: a hidden stand-in sphere at the origin.
 */
function createSunStandIn(root: THREE.Group): BodyObject {
  const radius = displayRadius(BODIES.sun.physical.diameterKm);
  const orbitPivot = new THREE.Group();
  orbitPivot.name = 'sun-orbit';
  const tiltGroup = new THREE.Group();
  tiltGroup.name = 'sun-tilt';
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 8, 4),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  mesh.name = 'sun';
  const pickProxy = createPickProxy('sun', radius);
  tiltGroup.add(mesh, pickProxy);
  orbitPivot.add(tiltGroup);
  root.add(orbitPivot);
  return { id: 'sun', orbitPivot, tiltGroup, mesh, radius, pickProxy };
}

export function createSolarSystem(tex: Map<string, THREE.Texture>, s: TierSettings): SolarSystem {
  const root = new THREE.Group();
  root.name = 'solar-system';
  const bodies = new Map<BodyId, BodyObject>();
  const rigs = new Map<BodyId, PlanetRig>();

  bodies.set('sun', createSunStandIn(root));

  // BODY_IDS lists Earth before the Moon, which hangs off Earth's offset node.
  for (const id of BODY_IDS) {
    if (id === 'sun') continue;
    const key = TEXTURE_KEY[id] ?? id;
    const texture = tex.get(key) ?? makeFallbackTexture(key);
    const parent = id === 'moon' ? rigs.get('earth')?.offset : root;
    if (!parent) throw new Error('Earth must be created before the Moon');
    const rig = createPlanet(id, texture, s, parent);
    rigs.set(id, rig);
    bodies.set(id, rig.body);
    // One orbit line per planet and Pluto; the Moon's tiny orbit stays unmarked.
    if (id !== 'moon') root.add(createOrbitLine(rig.orbitRadius));
  }

  // Focus anchor for the asteroid belt: mid-belt, kept on Earth's side of the Sun.
  const beltMid = (ASTEROID_BELT_MKM.inner + ASTEROID_BELT_MKM.outer) / 2;
  const beltPivot = new THREE.Group();
  beltPivot.name = 'belt-pivot';
  const beltAnchor = new THREE.Object3D();
  beltAnchor.name = 'asteroid-belt-focus';
  beltAnchor.position.x = displayOrbitRadius(beltMid);
  beltPivot.add(beltAnchor);
  root.add(beltPivot);

  const pickables = [...bodies.values()].map((b) => b.pickProxy);

  const solar: SolarSystem = {
    root,
    bodies,
    pickables,
    update(tSec) {
      for (const rig of rigs.values()) rig.update(tSec);
      beltPivot.rotation.y = orbitalAngle(EARTH_YEAR_DAYS, tSec, INITIAL_PHASE.earth);
    },
    getFocusTarget(id) {
      if (id === 'asteroid-belt') return { object: beltAnchor, radius: BELT_FOCUS_RADIUS };
      const b = bodies.get(id);
      if (!b) throw new Error(`Unknown body ${id}`);
      return { object: b.mesh, radius: b.radius };
    },
    setTierSettings(next) {
      for (const rig of rigs.values()) rig.setSegments(next);
    },
  };
  solar.update(0);
  return solar;
}
