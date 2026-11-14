import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DUST, createDust, generateDust } from '../../src/scene/dust';
import { tierSettings } from '../../src/quality/tiers';

describe('generateDust', () => {
  it('is deterministic and fills the box', () => {
    const a = generateDust(200, 1);
    expect(a).toEqual(generateDust(200, 1));
    expect(a).toHaveLength(600);
    for (const v of a) {
      expect(Math.abs(v)).toBeLessThanOrEqual(DUST.box / 2);
    }
  });
});

describe('createDust', () => {
  it('is disabled on the low tier', () => {
    expect(tierSettings('low').dustCount).toBe(0);
    expect(createDust(tierSettings('low'))).toBeNull();
  });
  it('uses the tier count and follows the camera in the shader', () => {
    const d = createDust(tierSettings('high'));
    expect(d).not.toBeNull();
    if (!d) return;
    expect(d.points.geometry.getAttribute('position').count).toBe(tierSettings('high').dustCount);
    const cam = new THREE.Vector3(10, 20, 30);
    d.update(cam, 2);
    const mat = d.points.material as THREE.ShaderMaterial;
    expect((mat.uniforms.uCamera?.value as THREE.Vector3).equals(cam)).toBe(true);
    expect(mat.uniforms.uPixelRatio?.value).toBe(2);
    expect(mat.depthWrite).toBe(false);
    expect(d.points.frustumCulled).toBe(false);
  });
});
