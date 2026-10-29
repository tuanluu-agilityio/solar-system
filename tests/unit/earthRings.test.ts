import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createAtmosphere, createCloudLayer, createEarthMaterial } from '../../src/bodies/earth';
import { createRing } from '../../src/bodies/rings';
import { createSolarSystem } from '../../src/scene/solarSystem';
import { tierSettings } from '../../src/quality/tiers';
import { debugCamTarget } from '../../src/debug/e2eApi';

function tex(): THREE.DataTexture {
  return new THREE.DataTexture(new Uint8Array([200, 200, 200, 255]), 1, 1);
}

function allTextures(): Map<string, THREE.Texture> {
  const keys = [
    'mercury',
    'venus_surface',
    'venus_atmosphere',
    'earth_day',
    'earth_night',
    'earth_clouds',
    'moon',
    'mars',
    'jupiter',
    'saturn',
    'saturn_ring',
    'uranus',
    'neptune',
    'pluto',
  ];
  return new Map(keys.map((k) => [k, tex()]));
}

function radiusOf(m: THREE.Mesh): number {
  return (m.geometry as THREE.SphereGeometry).parameters.radius;
}

describe('debugCamTarget', () => {
  it('returns a body id only with e2e and a known debugCam', () => {
    expect(debugCamTarget('?e2e=1&debugCam=earth')).toBe('earth');
    expect(debugCamTarget('?debugCam=earth')).toBeNull();
    expect(debugCamTarget('?e2e=1&debugCam=nowhere')).toBeNull();
    expect(debugCamTarget('?e2e=1')).toBeNull();
  });
});

describe('createEarthMaterial', () => {
  it('blends day and night maps lit from the sun position', () => {
    const day = tex();
    const night = tex();
    const sun = new THREE.Vector3(0, 0, 0);
    const m = createEarthMaterial(day, night, sun);
    expect(m).toBeInstanceOf(THREE.ShaderMaterial);
    expect(m.uniforms.uDay!.value).toBe(day);
    expect(m.uniforms.uNight!.value).toBe(night);
    expect(m.uniforms.uSunPos!.value).toBe(sun);
    expect(m.fragmentShader).toContain('uNight');
  });
});

describe('createCloudLayer', () => {
  it('is a transparent shell at radius * 1.01', () => {
    const clouds = tex();
    const mesh = createCloudLayer(clouds, 2);
    expect(radiusOf(mesh)).toBeCloseTo(2.02);
    const m = mesh.material as THREE.MeshStandardMaterial;
    expect(m.map).toBe(clouds);
    expect(m.transparent).toBe(true);
    expect(m.depthWrite).toBe(false);
  });
});

describe('createAtmosphere', () => {
  it('is an additive back-side Fresnel shell at radius * 1.04', () => {
    const mesh = createAtmosphere(2, '#4da6ff', 0.7);
    expect(radiusOf(mesh)).toBeCloseTo(2.08);
    const m = mesh.material as THREE.ShaderMaterial;
    expect(m).toBeInstanceOf(THREE.ShaderMaterial);
    expect(m.side).toBe(THREE.BackSide);
    expect(m.blending).toBe(THREE.AdditiveBlending);
    expect(m.transparent).toBe(true);
    expect(m.depthWrite).toBe(false);
    expect((m.uniforms.uColor!.value as THREE.Color).getHexString()).toBe('4da6ff');
    expect(m.uniforms.uIntensity!.value).toBeCloseTo(0.7);
  });
});

describe('createRing', () => {
  it('lies flat in the equatorial (XZ) plane with u remapped from inner (0) to outer (1)', () => {
    const mesh = createRing(3, 6, tex(), 0.9);
    const pos = mesh.geometry.getAttribute('position');
    const uv = mesh.geometry.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      expect(pos.getY(i)).toBeCloseTo(0);
      const r = Math.hypot(x, z);
      expect(r).toBeGreaterThanOrEqual(3 - 1e-6);
      expect(r).toBeLessThanOrEqual(6 + 1e-6);
      expect(uv.getX(i)).toBeCloseTo((r - 3) / 3);
    }
    const m = mesh.material as THREE.ShaderMaterial;
    expect(m.side).toBe(THREE.DoubleSide);
    expect(m.transparent).toBe(true);
    expect(m.uniforms.uOpacity!.value).toBeCloseTo(0.9);
    expect(m.uniforms.uHasMap!.value).toBe(true);
  });

  it('works without a texture', () => {
    const m = createRing(1, 2, null, 0.12).material as THREE.ShaderMaterial;
    expect(m.uniforms.uHasMap!.value).toBe(false);
    expect(m.uniforms.uOpacity!.value).toBeCloseTo(0.12);
  });
});

describe('solar system decorations', () => {
  const make = (tier: 'low' | 'high' = 'high') =>
    createSolarSystem(allTextures(), tierSettings(tier));

  it('gives Earth the day/night shader, clouds and a blue atmosphere', () => {
    const ss = make();
    const earth = ss.bodies.get('earth')!;
    expect(earth.mesh.material).toBeInstanceOf(THREE.ShaderMaterial);
    const clouds = earth.tiltGroup.getObjectByName('earth-clouds') as THREE.Mesh;
    expect(radiusOf(clouds)).toBeCloseTo(earth.radius * 1.01);
    const atmo = earth.tiltGroup.getObjectByName('earth-atmosphere') as THREE.Mesh;
    expect(radiusOf(atmo)).toBeCloseTo(earth.radius * 1.04);
    const am = atmo.material as THREE.ShaderMaterial;
    expect((am.uniforms.uColor!.value as THREE.Color).getHexString()).toBe('4da6ff');
    expect(am.uniforms.uIntensity!.value).toBeCloseTo(1.0);
  });

  it('spins the clouds 1.2x as fast as Earth', () => {
    const ss = make();
    ss.update(3.7);
    const earth = ss.bodies.get('earth')!;
    const clouds = earth.tiltGroup.getObjectByName('earth-clouds')!;
    expect(earth.mesh.rotation.y).not.toBe(0);
    expect(clouds.rotation.y).toBeCloseTo(earth.mesh.rotation.y * 1.2);
  });

  it('maps Venus with the atmosphere texture and adds a pale-yellow atmosphere', () => {
    const textures = allTextures();
    const ss = createSolarSystem(textures, tierSettings('high'));
    const venus = ss.bodies.get('venus')!;
    const m = venus.mesh.material as THREE.MeshStandardMaterial;
    expect(m.map).toBe(textures.get('venus_atmosphere'));
    const atmo = venus.tiltGroup.getObjectByName('venus-atmosphere') as THREE.Mesh;
    const am = atmo.material as THREE.ShaderMaterial;
    expect(am.uniforms.uIntensity!.value).toBeCloseTo(0.6);
  });

  it('puts Saturn and Uranus rings in their tilt groups at the planned radii', () => {
    const textures = allTextures();
    const ss = createSolarSystem(textures, tierSettings('high'));
    const saturn = ss.bodies.get('saturn')!;
    const sRing = saturn.tiltGroup.getObjectByName('saturn-ring') as THREE.Mesh;
    expect(sRing.parent).toBe(saturn.tiltGroup);
    const sp = (sRing.geometry as THREE.RingGeometry).parameters;
    expect(sp.innerRadius).toBeCloseTo(saturn.radius * 1.24);
    expect(sp.outerRadius).toBeCloseTo(saturn.radius * 2.3);
    const sm = sRing.material as THREE.ShaderMaterial;
    expect(sm.uniforms.uMap!.value).toBe(textures.get('saturn_ring'));
    expect(sm.side).toBe(THREE.DoubleSide);

    const uranus = ss.bodies.get('uranus')!;
    const uRing = uranus.tiltGroup.getObjectByName('uranus-ring') as THREE.Mesh;
    expect(uRing.parent).toBe(uranus.tiltGroup);
    const up = (uRing.geometry as THREE.RingGeometry).parameters;
    expect(up.innerRadius).toBeCloseTo(uranus.radius * 1.6);
    expect(up.outerRadius).toBeCloseTo(uranus.radius * 2.0);
    const um = uRing.material as THREE.ShaderMaterial;
    expect(um.uniforms.uHasMap!.value).toBe(false);
    expect(um.uniforms.uOpacity!.value).toBeCloseTo(0.12);
  });

  it('follows the atmosphere and ringShadow tier flags', () => {
    const ss = make('high');
    const atmo = (id: 'earth' | 'venus') =>
      ss.bodies.get(id)!.tiltGroup.getObjectByName(`${id}-atmosphere`)!;
    const shadow = () =>
      (
        (ss.bodies.get('saturn')!.tiltGroup.getObjectByName('saturn-ring') as THREE.Mesh)
          .material as THREE.ShaderMaterial
      ).uniforms.uShadow!.value as number;
    expect(atmo('earth').visible).toBe(true);
    expect(shadow()).toBe(1);
    ss.setTierSettings({ ...tierSettings('high'), atmosphere: false, ringShadow: false });
    expect(atmo('earth').visible).toBe(false);
    expect(atmo('venus').visible).toBe(false);
    expect(shadow()).toBe(0);
    ss.setTierSettings(tierSettings('high'));
    expect(atmo('venus').visible).toBe(true);
    expect(shadow()).toBe(1);
  });

  it('skips atmospheres when the tier starts with atmosphere=false', () => {
    const ss = createSolarSystem(allTextures(), { ...tierSettings('low'), atmosphere: false });
    expect(
      ss.bodies.get('earth')!.tiltGroup.getObjectByName('earth-atmosphere')?.visible ?? false,
    ).toBe(false);
  });

  it('omits the cloud layer when the cloud texture is missing', () => {
    const textures = allTextures();
    textures.delete('earth_clouds');
    const ss = createSolarSystem(textures, tierSettings('high'));
    expect(ss.bodies.get('earth')!.tiltGroup.getObjectByName('earth-clouds')).toBeUndefined();
  });
});
