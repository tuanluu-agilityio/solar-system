import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createSun } from '../../src/bodies/sun';
import { displayRadius } from '../../src/config/scale';
import { REDUCED_MOTION_SCALE } from '../../src/bodies/sunParams';

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

  it('has an additive, camera-facing corona that reaches well beyond the disc', () => {
    const sun = createSun(tex());
    const corona = sun.group.getObjectByName('sun-corona') as THREE.Mesh | undefined;
    expect(corona).toBeInstanceOf(THREE.Mesh);
    const mat = corona?.material as THREE.ShaderMaterial;
    expect(mat).toBeInstanceOf(THREE.ShaderMaterial);
    expect(mat.blending).toBe(THREE.AdditiveBlending);
    expect(mat.depthWrite).toBe(false);
    expect(mat.transparent).toBe(true);
    // The quad is billboarded in the vertex shader, so frustum culling must not use its geometry.
    expect(corona?.frustumCulled).toBe(false);
    expect(mat.uniforms.uRadius?.value).toBeCloseTo(sun.radius);
    expect(mat.uniforms.uExtent?.value).toBeGreaterThanOrEqual(3);
  });

  it('advances the surface and corona time uniforms on update', () => {
    const sun = createSun(tex(), { reducedMotion: false });
    const surface = sun.group.getObjectByName('sun-surface') as THREE.Mesh;
    const corona = sun.group.getObjectByName('sun-corona') as THREE.Mesh;
    const mat = surface.material as THREE.ShaderMaterial;
    expect(mat).toBeInstanceOf(THREE.ShaderMaterial);
    sun.update(12.5);
    expect(mat.uniforms.uTime?.value).toBe(12.5);
    expect((corona.material as THREE.ShaderMaterial).uniforms.uTime?.value).toBe(12.5);
  });

  it('slows the animation strongly with reduced motion', () => {
    const sun = createSun(tex(), { reducedMotion: true });
    const mat = (sun.group.getObjectByName('sun-surface') as THREE.Mesh)
      .material as THREE.ShaderMaterial;
    sun.update(100);
    expect(mat.uniforms.uTime?.value).toBeCloseTo(100 * REDUCED_MOTION_SCALE);
  });

  it('keeps the animation continuous when reduced motion is toggled', () => {
    const sun = createSun(tex(), { reducedMotion: false });
    const mat = (sun.group.getObjectByName('sun-surface') as THREE.Mesh)
      .material as THREE.ShaderMaterial;
    sun.update(10);
    sun.setReducedMotion(true);
    sun.update(20);
    expect(mat.uniforms.uTime?.value).toBeCloseTo(10 + 10 * REDUCED_MOTION_SCALE);
  });

  it('switches the shader detail level through a define', () => {
    const sun = createSun(tex(), { detail: 'low' });
    const surface = sun.group.getObjectByName('sun-surface') as THREE.Mesh;
    const mat = surface.material as THREE.ShaderMaterial;
    expect(mat.defines.SUN_DETAIL).toBe(0);
    const v = mat.version;
    sun.setDetail('high');
    expect(mat.defines.SUN_DETAIL).toBe(1);
    expect(mat.version).toBeGreaterThan(v);
    // Default is the full-detail path.
    const full = createSun(tex()).group.getObjectByName('sun-surface') as THREE.Mesh;
    expect((full.material as THREE.ShaderMaterial).defines.SUN_DETAIL).toBe(1);
  });

  it('ends every custom shader with tone mapping and colour-space includes', () => {
    const sun = createSun(tex());
    for (const name of ['sun-surface', 'sun-corona']) {
      const mat = (sun.group.getObjectByName(name) as THREE.Mesh).material as THREE.ShaderMaterial;
      expect(mat.fragmentShader).toMatch(
        /#include <tonemapping_fragment>\s*#include <colorspace_fragment>\s*}\s*$/,
      );
    }
  });
});
