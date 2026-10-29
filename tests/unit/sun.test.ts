import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createSun } from '../../src/bodies/sun';
import { displayRadius } from '../../src/config/scale';

function tex(): THREE.Texture {
  return new THREE.DataTexture(new Uint8Array([255, 200, 100, 255]), 1, 1);
}

describe('createSun', () => {
  it('sizes the sun from displayRadius of its diameter', () => {
    const sun = createSun(tex());
    expect(sun.radius).toBeCloseTo(displayRadius(1392700));
  });

  it('has a warm point light without decay and a faint ambient', () => {
    const sun = createSun(tex());
    expect(sun.light.color.getHex()).toBe(0xfff4e0);
    expect(sun.light.decay).toBe(0);
    expect(sun.light.intensity).toBeGreaterThan(0);
    const ambient = sun.group.children.find(
      (c): c is THREE.AmbientLight => c instanceof THREE.AmbientLight,
    );
    expect(ambient?.color.getHex()).toBe(0x223344);
    expect(ambient?.intensity).toBe(0.04);
  });

  it('has an additive corona sprite of radius x1.6', () => {
    const sun = createSun(tex());
    const corona = sun.group.children.find((c): c is THREE.Sprite => c instanceof THREE.Sprite);
    expect(corona).toBeDefined();
    expect(corona?.material.blending).toBe(THREE.AdditiveBlending);
    expect(corona?.scale.x).toBeCloseTo(sun.radius * 1.6 * 2);
  });

  it('advances the surface time uniform on update', () => {
    const sun = createSun(tex());
    const surface = sun.group.children.find((c): c is THREE.Mesh => c instanceof THREE.Mesh);
    const mat = surface?.material as THREE.ShaderMaterial;
    expect(mat).toBeInstanceOf(THREE.ShaderMaterial);
    sun.update(12.5);
    expect(mat.uniforms.uTime?.value).toBe(12.5);
  });
});
