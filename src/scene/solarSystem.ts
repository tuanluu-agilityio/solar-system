import * as THREE from 'three';
import { BODIES, moonsOf } from '../data/bodies';
import { BODY_IDS, type BodyId, type ContentId } from '../data/types';
import type { TierSettings } from '../quality/tiers';
import {
  ASTEROID_BELT_MKM,
  MOON_ORBIT_DISPLAY,
  MOON_SYSTEM_VIEW_FACTOR,
  displayOrbitRadius,
  displayPlanetRadius,
  displayRadius,
  moonDisplay,
} from '../config/scale';
import { overviewBoost } from '../camera/framing';
import {
  createPickProxy,
  createPlanet,
  sphereSegments,
  type BodyObject,
  type PlanetRig,
} from '../bodies/planet';
import {
  CLOUD_SPIN_FACTOR,
  EARTH_ATMOSPHERE_SCALE,
  createAtmosphere,
  createCloudLayer,
  createEarthMaterial,
  setEarthMap,
} from '../bodies/earth';
import { createRing } from '../bodies/rings';
import {
  createPlanetClock,
  createPlanetMaterial,
  setPlanetMap,
  type PlanetClock,
  type RingShadowSource,
} from '../bodies/planetMaterial';
import {
  PLANET_LOOKS,
  cloudUvOffset,
  driftOffset,
  shaderTime,
  type LookBodyId,
  type PlanetLook,
} from '../bodies/planetLook';
import { createAsteroidBelt, createKuiperBelt } from '../bodies/asteroidBelt';
import { createOrbitLine, type OrbitLine } from '../bodies/orbitLine';
import { ORBIT_STYLE, stepEmphasis } from '../bodies/orbitMath';
import { isFallbackTexture, makeFallbackTexture } from './textures';

export type { BodyObject };

export interface FocusTarget {
  object: THREE.Object3D;
  radius: number;
}

export interface SolarSystemOptions {
  /**
   * Called once for each moon the first time its planet system comes into view (moons are
   * hidden in the overview), so its map can load lazily. Until then it shows its fallback colour.
   */
  onFirstShown?: (id: BodyId) => void;
}

export interface SolarSystem {
  root: THREE.Group;
  bodies: Map<BodyId, BodyObject>;
  pickables: THREE.Object3D[];
  /**
   * Advances orbits and spins to simulation time `tSec`. `wallDtSec` (real seconds since the
   * last frame) drives UI fades such as the orbit-ribbon dimming, so pausing or speeding up
   * time does not affect them; when omitted the fade follows `tSec`.
   */
  update(tSec: number, wallDtSec?: number): void;
  getFocusTarget(id: ContentId): FocusTarget;
  setTierSettings(s: TierSettings): void;
  /** Swaps in higher-resolution maps; fallback stand-ins are ignored. */
  upgradeTextures(id: BodyId, tex: Map<string, THREE.Texture>): void;
  /**
   * Screen-space minimum size: scales each far body up (`overviewBoost`) so it stays
   * visible on a view `viewH` CSS px tall; a body the camera is near keeps its true size.
   * Hides the Moon while a boosted Earth would cover its orbit, and every other moon unless the
   * camera is near its planet (`moonSystemVisible`).
   */
  applyOverviewBoost(camera: THREE.PerspectiveCamera, viewH: number): void;
  /** Keeps the orbit ribbons a constant pixel width: drawing-buffer size and pixel ratio. */
  setViewport(drawingWidthPx: number, drawingHeightPx: number, pixelRatio: number): void;
  /** Dims the orbit ribbons while the camera is focused on a body. */
  setOrbitFocus(focused: boolean): void;
  /** Shows or hides every orbit ribbon (the settings toggle). */
  setOrbitsVisible(on: boolean): void;
  /** Freezes the animated cloud and band flow (`prefers-reduced-motion`); orbits keep moving. */
  setReducedMotion(reduced: boolean): void;
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

type ShellLook = NonNullable<PlanetLook['shell']>;

/** Thin Rayleigh blue by day, warming toward orange at the terminator. */
const EARTH_ATMOSPHERE: ShellLook = {
  color: '#5b9dff',
  intensity: 0.8,
  scale: EARTH_ATMOSPHERE_SCALE,
  twilight: '#e8925f',
};
const SATURN_RING = { inner: 1.24, outer: 2.3, opacity: 0.9, plainOpacity: 0.35 };
const URANUS_RING = { inner: 1.6, outer: 2.0, opacity: 0.12 };
/** Uranus' rings are a few narrow ringlets: no fine ringlet noise or tint on top. */
const URANUS_RING_STYLE = { ringlets: 0, narrow: 1, tint: 0 };
/** The Moon hides while Earth's and its own shown radii would cover this share of its orbit. */
const MOON_CLEARANCE = 0.8;
/** A boosted pick proxy stays this much larger than the shown body. */
const PICK_BOOST_MARGIN = 1.2;
/** Layer the raycaster never tests: a hidden moon cannot be picked. */
const UNPICKABLE_LAYER = 1;
/** The sun is the world origin. */
const SUN_WORLD_POS = new THREE.Vector3(0, 0, 0);

type TexUniform = THREE.IUniform<THREE.Texture | null>;
type NumUniform = THREE.IUniform<number>;

/**
 * A planet's modelled moons that are hidden from the overview show only while the camera is
 * within `MOON_SYSTEM_VIEW_FACTOR` times the outermost moon's orbit radius of the planet.
 */
export function moonSystemVisible(cameraDistance: number, outermostOrbitRadius: number): boolean {
  return cameraDistance < outermostOrbitRadius * MOON_SYSTEM_VIEW_FACTOR;
}

/** Image width of a texture (0 for a solid fallback or an unloaded image). */
function textureWidth(t: THREE.Texture | null | undefined): number {
  if (!t || isFallbackTexture(t)) return 0;
  const img = t.image as { width?: number } | null | undefined;
  return img?.width ?? 0;
}

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

/** A loaded map, or null when it is absent or a solid fallback stand-in. */
function realTexture(tex: Map<string, THREE.Texture>, key: string): THREE.Texture | null {
  const t = tex.get(key);
  return t && !isFallbackTexture(t) ? t : null;
}

function materialsOf(o: THREE.Object3D): THREE.Material[] {
  const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
  return m ? (Array.isArray(m) ? m : [m]) : [];
}

function uniformsOf(o: THREE.Object3D | undefined): Record<string, THREE.IUniform<unknown>> {
  const m = (o as THREE.Mesh | undefined)?.material as THREE.ShaderMaterial | undefined;
  return m?.uniforms ?? {};
}

function usesTexture(m: THREE.Material, t: THREE.Texture): boolean {
  if ((m as THREE.MeshStandardMaterial).map === t) return true;
  const u = (m as THREE.ShaderMaterial).uniforms as
    Record<string, THREE.IUniform<unknown>> | undefined;
  return u !== undefined && Object.values(u).some((x) => x.value === t);
}

/** Saturn's ring strip as its shadow source on the globe (no map: the plain faint band). */
function saturnRingSource(tex: Map<string, THREE.Texture>): RingShadowSource {
  const radius = displayPlanetRadius(BODIES.saturn.physical.diameterKm);
  const map = realTexture(tex, 'saturn_ring');
  return {
    map,
    inner: radius * SATURN_RING.inner,
    outer: radius * SATURN_RING.outer,
    opacity: map ? SATURN_RING.opacity : SATURN_RING.plainOpacity,
  };
}

/** Earth gets its own shader; every other body the shared planet shader with its look. */
function createBodyMaterial(
  id: Exclude<BodyId, 'sun'>,
  texture: THREE.Texture,
  tex: Map<string, THREE.Texture>,
  clock: PlanetClock,
): THREE.ShaderMaterial {
  if (id === 'earth') {
    return createEarthMaterial(
      texture,
      texOrFallback(tex, 'earth_night'),
      SUN_WORLD_POS,
      {
        normal: realTexture(tex, 'earth_normal'),
        specular: realTexture(tex, 'earth_specular'),
        clouds: realTexture(tex, 'earth_clouds'),
      },
      clock.uDetail,
    );
  }
  const ring = id === 'saturn' ? saturnRingSource(tex) : undefined;
  return createPlanetMaterial(texture, PLANET_LOOKS[id], clock, ring);
}

/** Extra layers: Earth clouds, atmosphere shells, Saturn and Uranus rings. */
interface Decorations {
  update(): void;
  /** Swaps the cloud map and the Saturn ring strip when `tex` has real ones. */
  upgrade(tex: Map<string, THREE.Texture>): void;
  apply(s: TierSettings): void;
  /** Keeps the ring shadow in step with Saturn's overview boost. */
  setSaturnScale(k: number): void;
}

function decorate(
  bodies: Map<BodyId, BodyObject>,
  tex: Map<string, THREE.Texture>,
  s: TierSettings,
  clock: PlanetClock,
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
  const earthMat = earth.mesh.material as THREE.ShaderMaterial;
  const cloudTex = realTexture(tex, 'earth_clouds');
  // A solid fallback colour would be an opaque shell hiding Earth: no real map, no clouds.
  const clouds = cloudTex ? createCloudLayer(cloudTex, earth.radius, segments) : null;
  if (clouds) {
    clouds.name = 'earth-clouds';
    earth.tiltGroup.add(clouds);
  }

  // Airless bodies have no shell (their look's `shell` is null).
  const shells: [BodyId, ShellLook][] = [['earth', EARTH_ATMOSPHERE]];
  for (const id of Object.keys(PLANET_LOOKS) as LookBodyId[]) {
    const shell = PLANET_LOOKS[id].shell;
    if (shell) shells.push([id, shell]);
  }
  for (const [id, a] of shells) {
    const body = get(id);
    const atmo = createAtmosphere(body.radius, a.color, a.intensity, segments, {
      scale: a.scale,
      twilight: a.twilight,
    });
    atmo.name = `${id}-atmosphere`;
    body.tiltGroup.add(atmo);
    atmospheres.push(atmo);
  }

  const saturn = get('saturn');
  const saturnMat = saturn.mesh.material as THREE.ShaderMaterial;
  // Without the real alpha strip, a plain faint band beats an opaque solid disc.
  const ringSource = saturnRingSource(tex);
  const sRing = createRing(
    saturn.radius * SATURN_RING.inner,
    saturn.radius * SATURN_RING.outer,
    ringSource.map,
    ringSource.opacity,
  );
  sRing.name = 'saturn-ring';
  const sMat = sRing.material as THREE.ShaderMaterial;
  (sMat.uniforms.uPlanetRadius as NumUniform).value = saturn.radius;
  shadowedRings.push(sMat);
  saturn.tiltGroup.add(sRing);

  // In Uranus' tilt group, so the ring stands almost vertical.
  const uranus = get('uranus');
  const uRing = createRing(
    uranus.radius * URANUS_RING.inner,
    uranus.radius * URANUS_RING.outer,
    null,
    URANUS_RING.opacity,
    URANUS_RING_STYLE,
  );
  uRing.name = 'uranus-ring';
  uranus.tiltGroup.add(uRing);
  const ringMats = [sMat, uRing.material as THREE.ShaderMaterial];

  const deco: Decorations = {
    update() {
      if (!clouds) return;
      clouds.rotation.y = earth.mesh.rotation.y * CLOUD_SPIN_FACTOR;
      (earthMat.uniforms.uCloudOffset as NumUniform).value = cloudUvOffset(
        earth.mesh.rotation.y,
        clouds.rotation.y,
      );
    },
    upgrade(next) {
      const hiClouds = realTexture(next, 'earth_clouds');
      if (clouds && hiClouds) {
        (uniformsOf(clouds).uMap as TexUniform).value = hiClouds;
        setEarthMap(earthMat, 'clouds', hiClouds);
      }
      const hiRing = realTexture(next, 'saturn_ring');
      if (hiRing) {
        const u = sMat.uniforms;
        (u.uMap as TexUniform).value = hiRing;
        (u.uHasMap as THREE.IUniform<boolean>).value = true;
        (u.uOpacity as NumUniform).value = SATURN_RING.opacity;
        const p = saturnMat.uniforms;
        (p.uRingMap as TexUniform).value = hiRing;
        (p.uRingHasMap as NumUniform).value = 1;
        (p.uRingOpacity as NumUniform).value = SATURN_RING.opacity;
      }
    },
    setSaturnScale(k) {
      (sMat.uniforms.uPlanetRadius as NumUniform).value = saturn.radius * k;
    },
    apply(next) {
      for (const a of atmospheres) a.visible = next.atmosphere;
      const shadow = next.ringShadow ? 1 : 0;
      for (const m of shadowedRings) (m.uniforms.uShadow as NumUniform).value = shadow;
      (saturnMat.uniforms.uRingShadow as NumUniform).value = shadow;
      const detail = next.planetDetail ? 1 : 0;
      clock.uDetail.value = detail;
      for (const m of ringMats) (m.uniforms.uDetail as NumUniform).value = detail;
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

/** A planet with moons that hide in the overview, the moons and the radius that shows them. */
interface MoonSystem {
  planet: BodyObject;
  moons: BodyObject[];
  viewRadius: number;
  shown: boolean;
}

export function createSolarSystem(
  tex: Map<string, THREE.Texture>,
  s: TierSettings,
  opts: SolarSystemOptions = {},
): SolarSystem {
  const root = new THREE.Group();
  root.name = 'solar-system';
  const bodies = new Map<BodyId, BodyObject>();
  const rigs = new Map<BodyId, PlanetRig>();
  const orbitLines: OrbitLine[] = [];
  const orbitLineByBody = new Map<BodyId, OrbitLine>();
  const clock = createPlanetClock(s.planetDetail);
  let reducedMotion = false;

  bodies.set('sun', createSunStandIn(root));

  // A moon hangs off its planet's offset node; BODY_IDS lists every planet before its moons.
  // Regular moons orbit in the planet's equatorial plane: a frame tilted like the planet but
  // outside its tilt group, so neither the spin nor the overview boost carries them.
  const equators = new Map<BodyId, THREE.Object3D>();
  const frameFor = (id: BodyId): THREE.Object3D => {
    const parentId = BODIES[id].parent;
    if (parentId === null || parentId === 'sun') return root;
    const planet = rigs.get(parentId);
    if (!planet) throw new Error(`${parentId} must be created before ${id}`);
    if (!moonDisplay(id).equatorial) return planet.offset;
    let eq = equators.get(parentId);
    if (!eq) {
      eq = new THREE.Group();
      eq.name = `${parentId}-equator`;
      eq.rotation.z = THREE.MathUtils.degToRad(BODIES[parentId].physical.axialTiltDeg);
      planet.offset.add(eq);
      equators.set(parentId, eq);
    }
    return eq;
  };
  for (const id of BODY_IDS) {
    if (id === 'sun') continue;
    const texture = bodyTexture(tex, id);
    const material = createBodyMaterial(id, texture, tex, clock);
    const rig = createPlanet(id, texture, s, frameFor(id), material);
    rigs.set(id, rig);
    bodies.set(id, rig.body);
    // One orbit ribbon per planet and Pluto; moon orbits stay unmarked.
    const orbitColor = BODIES[id].orbitColor;
    if (orbitColor && rig.orbitShape) {
      const line = createOrbitLine(rig.orbitShape, orbitColor);
      orbitLines.push(line);
      orbitLineByBody.set(id, line);
      root.add(line.object);
    }
  }

  // Focus anchor for the asteroid belt: mid-belt, kept on Earth's side of the Sun.
  const beltMid = (ASTEROID_BELT_MKM.inner + ASTEROID_BELT_MKM.outer) / 2;
  const beltAnchor = new THREE.Object3D();
  beltAnchor.name = 'asteroid-belt-focus';
  beltAnchor.position.x = displayOrbitRadius(beltMid);
  root.add(beltAnchor);

  const belt = createAsteroidBelt(s.asteroidCount);
  root.add(belt.mesh);
  // Visual only: no pick proxy, label or panel. In its own group, so the asteroid belt stays
  // the only instanced mesh among the root's children.
  const kuiper = createKuiperBelt(s.kuiperCount);
  const kuiperGroup = new THREE.Group();
  kuiperGroup.name = 'kuiper-belt-group';
  kuiperGroup.add(kuiper.mesh);
  root.add(kuiperGroup);

  // Planets whose moons hide in the overview (Earth's Moon has its own rule below).
  const moonSystems: MoonSystem[] = [];
  for (const planetId of BODY_IDS) {
    const moons = moonsOf(planetId).filter((m) => !moonDisplay(m).overview);
    const planet = bodies.get(planetId);
    if (moons.length === 0 || !planet) continue;
    moonSystems.push({
      planet,
      moons: moons.map((m) => bodies.get(m)!),
      viewRadius: Math.max(...moons.map((m) => moonDisplay(m).orbitRadius)),
      shown: false,
    });
  }
  const firstShown = new Set<BodyId>();
  const setMoonShown = (b: BodyObject, on: boolean): void => {
    b.tiltGroup.visible = on;
    b.pickProxy.layers.set(on ? 0 : UNPICKABLE_LAYER);
  };
  // Hidden (not drawn, not pickable, no map requested) until the camera first comes near.
  for (const sys of moonSystems) for (const m of sys.moons) setMoonShown(m, false);

  const deco = decorate(bodies, tex, s, clock);
  const venusUniforms = uniformsOf(bodies.get('venus')?.mesh);
  const pickables = [...bodies.values()].map((b) => b.pickProxy);
  const camPos = new THREE.Vector3();
  const bodyPos = new THREE.Vector3();
  const boosts = new Map<BodyId, number>();
  let emphasis = 1;
  let emphasisTarget = 1;
  let lastT: number | null = null;

  const solar: SolarSystem = {
    root,
    bodies,
    pickables,
    update(tSec, wallDtSec) {
      for (const rig of rigs.values()) {
        const meanAnomaly = rig.update(tSec);
        orbitLineByBody.get(rig.body.id)?.setPlanetMeanAnomaly(meanAnomaly);
      }
      const elapsed = wallDtSec ?? (lastT === null ? 0 : tSec - lastT);
      const dt = Math.min(0.25, Math.max(0, elapsed));
      lastT = tSec;
      emphasis = stepEmphasis(emphasis, emphasisTarget, dt);
      for (const line of orbitLines) line.setEmphasis(emphasis);
      deco.update();
      clock.uTime.value = shaderTime(tSec, reducedMotion);
      const drift = venusUniforms.uDrift as NumUniform | undefined;
      if (drift) drift.value = driftOffset(PLANET_LOOKS.venus.drift, tSec, reducedMotion);
      belt.update(tSec);
      kuiper.update(tSec);
      const earthPosition = rigs.get('earth')!.offset.position;
      const earthDistance = Math.hypot(earthPosition.x, earthPosition.y, earthPosition.z);
      const beltRadius = displayOrbitRadius(beltMid);
      beltAnchor.position.set(
        (earthPosition.x / earthDistance) * beltRadius,
        (earthPosition.y / earthDistance) * beltRadius,
        (earthPosition.z / earthDistance) * beltRadius,
      );
    },
    getFocusTarget(id) {
      if (id === 'asteroid-belt') return { object: beltAnchor, radius: BELT_FOCUS_RADIUS };
      const b = bodies.get(id);
      if (!b) throw new Error(`Unknown body ${id}`);
      return { object: b.mesh, radius: b.radius };
    },
    upgradeTextures(id, next) {
      const body = bodies.get(id);
      if (!body) return;
      const real = (key: string): THREE.Texture | null => realTexture(next, key);
      const replaced: THREE.Texture[] = [];
      const old = (u: THREE.IUniform<unknown> | undefined): void => {
        if (u?.value instanceof THREE.Texture) replaced.push(u.value);
      };
      // Every body is a ShaderMaterial: Earth's own shader or the shared planet shader.
      const mat = body.mesh.material as THREE.ShaderMaterial;
      const u = mat.uniforms ?? {};
      if (id === 'earth') {
        for (const [key, name] of [
          ['earth_day', 'uDay'],
          ['earth_night', 'uNight'],
        ] as const) {
          const t = real(key);
          const un = u[name] as THREE.IUniform<THREE.Texture> | undefined;
          if (t && un) {
            old(un);
            un.value = t;
          }
        }
        for (const [key, which, name] of [
          ['earth_normal', 'normal', 'uNormal'],
          ['earth_specular', 'specular', 'uSpecular'],
        ] as const) {
          const t = real(key);
          if (t) {
            old(u[name]);
            setEarthMap(mat, which, t);
          }
        }
        if (real('earth_clouds')) {
          old(u.uClouds);
          old(uniformsOf(root.getObjectByName('earth-clouds')).uMap);
        }
      } else if (u.uMap) {
        const key = (TEXTURE_KEYS[id] ?? [id]).find((k) => real(k));
        const t = key ? real(key) : null;
        // Never swap a larger map for a smaller one (a lazy low map arriving after the high one).
        const current = u.uMap.value as THREE.Texture | null;
        if (t && textureWidth(t) >= textureWidth(current)) {
          old(u.uMap);
          setPlanetMap(mat, t);
        }
      }
      if (id === 'saturn' && real('saturn_ring')) {
        old(uniformsOf(root.getObjectByName('saturn-ring')).uMap);
        old(u.uRingMap);
      }
      if (id === 'earth' || id === 'saturn') deco.upgrade(next);
      // Free the low maps only when nothing in the scene still samples them.
      for (const o of new Set(replaced)) {
        let used = false;
        root.traverse((obj) => {
          if (!used) used = materialsOf(obj).some((m) => usesTexture(m, o));
        });
        if (!used) o.dispose();
      }
    },
    applyOverviewBoost(camera, viewH) {
      camera.getWorldPosition(camPos);
      for (const b of bodies.values()) {
        if (b.id === 'sun') continue;
        b.mesh.getWorldPosition(bodyPos);
        const k = overviewBoost(b.radius, bodyPos.distanceTo(camPos), camera.fov, viewH);
        boosts.set(b.id, k);
        b.tiltGroup.scale.setScalar(k);
        const proxyR = b.pickProxy.userData.baseRadius as number;
        b.pickProxy.scale.setScalar(Math.max(1, (b.radius * k * PICK_BOOST_MARGIN) / proxyR));
        // The picker prefers the body whose visible disc is under the tap.
        b.pickProxy.userData.shownRadius = b.radius * k;
      }
      deco.setSaturnScale(boosts.get('saturn') ?? 1);
      const earth = bodies.get('earth');
      const moon = bodies.get('moon');
      if (earth && moon) {
        const shown =
          earth.radius * (boosts.get('earth') ?? 1) + moon.radius * (boosts.get('moon') ?? 1);
        const visible = shown < MOON_ORBIT_DISPLAY * MOON_CLEARANCE;
        moon.tiltGroup.visible = visible;
        moon.pickProxy.layers.set(visible ? 0 : UNPICKABLE_LAYER);
      }
      // Systems are independent: when Jupiter and Saturn line up in the compressed layout, a
      // focus on one can show the other's moons too, just as it shows the other planet.
      for (const sys of moonSystems) {
        sys.planet.mesh.getWorldPosition(bodyPos);
        const shown = moonSystemVisible(bodyPos.distanceTo(camPos), sys.viewRadius);
        if (shown === sys.shown) continue;
        sys.shown = shown;
        for (const m of sys.moons) {
          setMoonShown(m, shown);
          if (shown && !firstShown.has(m.id)) {
            firstShown.add(m.id);
            opts.onFirstShown?.(m.id);
          }
        }
      }
    },
    setViewport(w, h, pixelRatio) {
      for (const line of orbitLines) line.setViewport(w, h, pixelRatio);
    },
    setOrbitsVisible(on) {
      for (const line of orbitLines) line.object.visible = on;
    },
    setOrbitFocus(focused) {
      emphasisTarget = focused ? ORBIT_STYLE.focusEmphasis : 1;
    },
    setReducedMotion(reduced) {
      reducedMotion = reduced;
    },
    setTierSettings(next) {
      for (const rig of rigs.values()) rig.setSegments(next);
      deco.apply(next);
      belt.setCount(next.asteroidCount);
      kuiper.setCount(next.kuiperCount);
    },
  };
  solar.update(0);
  return solar;
}
