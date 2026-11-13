import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  createPlanetClock,
  createPlanetMaterial,
  setPlanetMap,
  texelOf,
} from '../../src/bodies/planetMaterial';
import { PLANET_LOOKS, cloudUvOffset } from '../../src/bodies/planetLook';
import { RING_RENDER_ORDER, createRing } from '../../src/bodies/rings';
import { createSolarSystem } from '../../src/scene/solarSystem';
import { tierSettings } from '../../src/quality/tiers';

function tex(w = 1, h = 1): THREE.DataTexture {
  return new THREE.DataTexture(new Uint8Array(w * h * 4).fill(200), w, h);
}

function allTextures(): Map<string, THREE.Texture> {
  const keys = [
    'mercury',
    'venus_surface',
    'venus_atmosphere',
    'earth_day',
    'earth_night',
    'earth_clouds',
    'earth_normal',
    'earth_specular',
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

const num = (m: THREE.Material, k: string): number =>
  (m as THREE.ShaderMaterial).uniforms[k]!.value as number;

describe('createPlanetMaterial', () => {
  it('is a sun-lit shader fed by the look table and the shared clock', () => {
    const map = tex(8, 4);
    const clock = createPlanetClock(true);
    const m = createPlanetMaterial(map, PLANET_LOOKS.moon, clock);
    expect(m).toBeInstanceOf(THREE.ShaderMaterial);
    expect(m.uniforms.uMap!.value).toBe(map);
    // Flow and drift offsets cross the u seam: the map must repeat in u.
    expect(map.wrapS).toBe(THREE.RepeatWrapping);
    expect(m.uniforms.uRelief!.value).toBe(PLANET_LOOKS.moon.relief);
    expect(m.uniforms.uLommel!.value).toBe(PLANET_LOOKS.moon.lommel);
    expect(m.uniforms.uHaze!.value).toBe(0);
    expect(m.uniforms.uTime).toBe(clock.uTime);
    expect(m.uniforms.uDetail).toBe(clock.uDetail);
    expect((m.uniforms.uTexel!.value as THREE.Vector2).toArray()).toEqual([1 / 8, 1 / 4]);
    expect(m.fragmentShader).toContain('tonemapping_fragment');
    expect(m.fragmentShader).toContain('colorspace_fragment');
  });

  it('gives gas giants flow and haze but no relief', () => {
    const m = createPlanetMaterial(tex(), PLANET_LOOKS.jupiter, createPlanetClock(true));
    expect(m.uniforms.uRelief!.value).toBe(0);
    expect((m.uniforms.uFlow!.value as THREE.Vector4).y).toBeGreaterThan(0);
    expect(m.uniforms.uHaze!.value).toBeGreaterThan(0);
  });

  it('swaps maps with a fresh texel size', () => {
    const m = createPlanetMaterial(tex(4, 2), PLANET_LOOKS.mars, createPlanetClock(true));
    const hi = tex(16, 8);
    setPlanetMap(m, hi);
    expect(m.uniforms.uMap!.value).toBe(hi);
    expect((m.uniforms.uTexel!.value as THREE.Vector2).toArray()).toEqual([1 / 16, 1 / 8]);
    expect(hi.wrapS).toBe(THREE.RepeatWrapping);
  });

  it('guesses a texel size while the image is unknown', () => {
    const t = new THREE.Texture();
    expect(texelOf(t).toArray()).toEqual([1 / 2048, 1 / 1024]);
  });
});

describe('createRing', () => {
  it('draws after the atmosphere shells and keeps fine detail switchable', () => {
    const ring = createRing(1, 2, tex(), 0.9);
    expect(ring.renderOrder).toBe(RING_RENDER_ORDER);
    expect(RING_RENDER_ORDER).toBeGreaterThan(0);
    const m = ring.material as THREE.ShaderMaterial;
    expect(m.uniforms.uDetail!.value).toBe(1);
    expect(m.uniforms.uRinglets!.value).toBeGreaterThan(0);
    // The fine structure fades with screen-space derivatives (no moire at grazing angles).
    expect(m.fragmentShader).toContain('fwidth');
  });

  it('accepts a style for thin, narrow rings', () => {
    const m = createRing(1, 2, null, 0.12, { ringlets: 0, narrow: 1 })
      .material as THREE.ShaderMaterial;
    expect(m.uniforms.uRinglets!.value).toBe(0);
    expect(m.uniforms.uNarrow!.value).toBe(1);
  });
});

describe('solar system planet shading', () => {
  const make = (tier: 'low' | 'medium' | 'high' = 'high') =>
    createSolarSystem(allTextures(), tierSettings(tier));

  it('shades every body but Earth with the shared planet shader and its own look', () => {
    const ss = make();
    for (const [id, look] of Object.entries(PLANET_LOOKS)) {
      const m = ss.bodies.get(id as keyof typeof PLANET_LOOKS)!.mesh.material as THREE.Material;
      expect(m, id).toBeInstanceOf(THREE.ShaderMaterial);
      expect(m.name, id).toBe('planet');
      expect(num(m, 'uRelief'), id).toBe(look.relief);
    }
    expect((ss.bodies.get('earth')!.mesh.material as THREE.Material).name).toBe('earth');
  });

  it('gives atmospheres only to bodies that have air', () => {
    const ss = make();
    for (const id of [
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ] as const) {
      expect(ss.bodies.get(id)!.tiltGroup.getObjectByName(`${id}-atmosphere`), id).toBeDefined();
    }
    for (const id of ['mercury', 'moon', 'pluto'] as const) {
      expect(ss.bodies.get(id)!.tiltGroup.getObjectByName(`${id}-atmosphere`), id).toBeUndefined();
    }
  });

  it('casts the Saturn ring shadow on the globe from the same strip, gated by ringShadow', () => {
    const textures = allTextures();
    const ss = createSolarSystem(textures, tierSettings('high'));
    const saturn = ss.bodies.get('saturn')!;
    const m = saturn.mesh.material as THREE.ShaderMaterial;
    expect(m.uniforms.uRingMap!.value).toBe(textures.get('saturn_ring'));
    const radii = m.uniforms.uRingRadii!.value as THREE.Vector2;
    expect(radii.x).toBeCloseTo(saturn.radius * 1.24);
    expect(radii.y).toBeCloseTo(saturn.radius * 2.3);
    expect(num(m, 'uRingShadow')).toBe(1);
    ss.setTierSettings({ ...tierSettings('high'), ringShadow: false });
    expect(num(m, 'uRingShadow')).toBe(0);
    // No other body has a ring shadow.
    expect(num(ss.bodies.get('jupiter')!.mesh.material as THREE.Material, 'uRingShadow')).toBe(0);
  });

  it('switches relief, flow and fine ring detail off on the low tier', () => {
    const ss = make('low');
    const jupiter = ss.bodies.get('jupiter')!.mesh.material as THREE.Material;
    const earth = ss.bodies.get('earth')!.mesh.material as THREE.Material;
    const ring = (ss.root.getObjectByName('saturn-ring') as THREE.Mesh).material as THREE.Material;
    expect(num(jupiter, 'uDetail')).toBe(0);
    expect(num(earth, 'uDetail')).toBe(0);
    expect(num(ring, 'uDetail')).toBe(0);
    ss.setTierSettings(tierSettings('medium'));
    expect(num(jupiter, 'uDetail')).toBe(1);
    expect(num(earth, 'uDetail')).toBe(1);
    expect(num(ring, 'uDetail')).toBe(1);
  });

  it('animates the cloud flow and Venus drift, frozen for reduced motion', () => {
    const ss = make();
    const jupiter = ss.bodies.get('jupiter')!.mesh.material as THREE.Material;
    const venus = ss.bodies.get('venus')!.mesh.material as THREE.Material;
    ss.update(12);
    expect(num(jupiter, 'uTime')).toBeCloseTo(12);
    expect(num(venus, 'uDrift')).toBeGreaterThan(0);
    ss.setReducedMotion(true);
    ss.update(20);
    expect(num(jupiter, 'uTime')).toBe(0);
    expect(num(venus, 'uDrift')).toBe(0);
    ss.setReducedMotion(false);
    ss.update(21);
    expect(num(jupiter, 'uTime')).toBeCloseTo(21);
  });

  it('keeps Earth cloud shadows aligned with the spinning cloud shell', () => {
    const ss = make();
    ss.update(7.3);
    const earth = ss.bodies.get('earth')!;
    const clouds = earth.tiltGroup.getObjectByName('earth-clouds')!;
    expect(num(earth.mesh.material as THREE.Material, 'uCloudOffset')).toBeCloseTo(
      cloudUvOffset(earth.mesh.rotation.y, clouds.rotation.y),
    );
    expect(num(earth.mesh.material as THREE.Material, 'uHasClouds')).toBe(1);
  });
});
