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
import {
  createPickProxy,
  createPlanet,
  sphereSegments,
  type BodyObject,
  type PlanetRig,
} from '../bodies/planet';
import {
  CLOUD_SPIN_FACTOR,
  createAtmosphere,
  createCloudLayer,
  createEarthMaterial,
} from '../bodies/earth';
import { createRing } from '../bodies/rings';
import { createAsteroidBelt } from '../bodies/asteroidBelt';
import { createOrbitLine } from '../bodies/orbitLine';
import { isFallbackTexture, makeFallbackTexture } from './textures';

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

/**
 * Texture keys per body, first available wins. Venus shows its cloud deck (the atmosphere
 * map), falling back to the surface map.
 */
const TEXTURE_KEYS: Partial<Record<BodyId, string[]>> = {
  venus: ['venus_atmosphere', 'venus_surface'],
  earth: ['earth_day'],
};

const EARTH_ATMOSPHERE = { color: '#4da6ff', intensity: 1.0 };
const VENUS_ATMOSPHERE = { color: '#ffe9b0', intensity: 0.6 };
const SATURN_RING = { inner: 1.24, outer: 2.3, opacity: 0.9, plainOpacity: 0.35 };
const URANUS_RING = { inner: 1.6, outer: 2.0, opacity: 0.12 };
/** The sun is the world origin. */
const SUN_WORLD_POS = new THREE.Vector3(0, 0, 0);

function bodyTexture(tex: Map<string, THREE.Texture>, id: BodyId): THREE.Texture {
  const keys = TEXTURE_KEYS[id] ?? [id];
  for (const k of keys) {
    const t = tex.get(k);
    if (t) return t;
  }
  return makeFallbackTexture(keys[0] ?? id);
}

function texOrFallback(tex: Map<string, THREE.Texture>, key: string): THREE.Texture {
  return tex.get(key) ?? makeFallbackTexture(key);
}

/** Extra layers: Earth clouds and atmospheres, Saturn and Uranus rings. */
interface Decorations {
  update(): void;
  apply(s: TierSettings): void;
}

function decorate(
  bodies: Map<BodyId, BodyObject>,
  tex: Map<string, THREE.Texture>,
  s: TierSettings,
): Decorations {
  const get = (id: BodyId): BodyObject => {
    const b = bodies.get(id);
    if (!b) throw new Error(`Missing body ${id}`);
    return b;
  };
  const segments = sphereSegments(s);
  const atmospheres: THREE.Mesh[] = [];
  const shadowedRings: THREE.ShaderMaterial[] = [];

  const earth = get('earth');
  const cloudTex = tex.get('earth_clouds');
  // A solid fallback colour would be an opaque shell hiding Earth: no real map, no clouds.
  const clouds =
    cloudTex && !isFallbackTexture(cloudTex)
      ? createCloudLayer(cloudTex, earth.radius, segments)
      : null;
  if (clouds) {
    clouds.name = 'earth-clouds';
    earth.tiltGroup.add(clouds);
  }

  for (const [id, a] of [
    ['earth', EARTH_ATMOSPHERE],
    ['venus', VENUS_ATMOSPHERE],
  ] as const) {
    const body = get(id);
    const atmo = createAtmosphere(body.radius, a.color, a.intensity, segments);
    atmo.name = `${id}-atmosphere`;
    body.tiltGroup.add(atmo);
    atmospheres.push(atmo);
  }

  const saturn = get('saturn');
  // Without the real alpha strip, a plain faint band beats an opaque solid disc.
  const ringTex = tex.get('saturn_ring');
  const hasRingMap = ringTex !== undefined && !isFallbackTexture(ringTex);
  const sRing = createRing(
    saturn.radius * SATURN_RING.inner,
    saturn.radius * SATURN_RING.outer,
    hasRingMap ? ringTex : null,
    hasRingMap ? SATURN_RING.opacity : SATURN_RING.plainOpacity,
  );
  sRing.name = 'saturn-ring';
  const sMat = sRing.material as THREE.ShaderMaterial;
  (sMat.uniforms.uPlanetRadius as THREE.IUniform<number>).value = saturn.radius;
  shadowedRings.push(sMat);
  saturn.tiltGroup.add(sRing);

  // In Uranus' tilt group, so the ring stands almost vertical.
  const uranus = get('uranus');
  const uRing = createRing(
    uranus.radius * URANUS_RING.inner,
    uranus.radius * URANUS_RING.outer,
    null,
    URANUS_RING.opacity,
  );
  uRing.name = 'uranus-ring';
  uranus.tiltGroup.add(uRing);

  const deco: Decorations = {
    update() {
      if (clouds) clouds.rotation.y = earth.mesh.rotation.y * CLOUD_SPIN_FACTOR;
    },
    apply(next) {
      for (const a of atmospheres) a.visible = next.atmosphere;
      const shadow = next.ringShadow ? 1 : 0;
      for (const m of shadowedRings) (m.uniforms.uShadow as THREE.IUniform<number>).value = shadow;
    },
  };
  deco.apply(s);
  return deco;
}

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
    const texture = bodyTexture(tex, id);
    const parent = id === 'moon' ? rigs.get('earth')?.offset : root;
    if (!parent) throw new Error('Earth must be created before the Moon');
    const material =
      id === 'earth'
        ? createEarthMaterial(texture, texOrFallback(tex, 'earth_night'), SUN_WORLD_POS)
        : undefined;
    const rig = createPlanet(id, texture, s, parent, material);
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

  const belt = createAsteroidBelt(s.asteroidCount);
  root.add(belt.mesh);

  const deco = decorate(bodies, tex, s);
  const pickables = [...bodies.values()].map((b) => b.pickProxy);

  const solar: SolarSystem = {
    root,
    bodies,
    pickables,
    update(tSec) {
      for (const rig of rigs.values()) rig.update(tSec);
      deco.update();
      belt.update(tSec);
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
      deco.apply(next);
      belt.setCount(next.asteroidCount);
    },
  };
  solar.update(0);
  return solar;
}
