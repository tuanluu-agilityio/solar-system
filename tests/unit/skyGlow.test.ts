import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SKY_GLOW, discOffsets, glowSize } from '../../src/scene/skyGlow';
import { SKY_FX, createSky } from '../../src/scene/sky';

describe('glowSize', () => {
  it('is half the source resolution', () => {
    expect(glowSize(4096, 2048)).toEqual({ width: 2048, height: 1024 });
    expect(glowSize(2048, 1024)).toEqual({ width: 1024, height: 512 });
    expect(glowSize(1, 1)).toEqual({ width: 1, height: 1 });
  });
});

describe('discOffsets', () => {
  it('holds every integer offset inside the disc, including the centre', () => {
    const d = discOffsets(SKY_GLOW.openRadius4096);
    expect(d).toContainEqual([0, 0]);
    for (const [i, j] of d) expect(i * i + j * j).toBeLessThanOrEqual(SKY_GLOW.openRadius4096 ** 2);
    expect(discOffsets(1)).toHaveLength(5);
    expect(discOffsets(1.5)).toHaveLength(9);
  });
  it('is wider than the texture point stars (1-3 texels at 4096)', () => {
    expect(SKY_GLOW.openRadius4096).toBeGreaterThanOrEqual(3);
  });
});

describe('sky procedural terms', () => {
  it('feeds the glow gain, nebula strength and nebula map to the shader', () => {
    const neb = new THREE.Texture();
    const mat = createSky(new THREE.Texture(), neb).material as THREE.ShaderMaterial;
    expect(mat.uniforms.uGlowGain?.value).toBe(SKY_FX.glowGain);
    expect(mat.uniforms.uNebula?.value).toBe(SKY_FX.nebula);
    expect(mat.uniforms.uNebulaMap?.value).toBe(neb);
  });
  it('has no nebula without a baked nebula map', () => {
    const mat = createSky(new THREE.Texture()).material as THREE.ShaderMaterial;
    const map = mat.uniforms.uNebulaMap?.value as THREE.DataTexture;
    expect(Array.from(map.image.data as Uint8Array).slice(0, 3)).toEqual([0, 0, 0]);
  });
  it('keeps the nebula faint: far below the bloom threshold', () => {
    expect(SKY_FX.nebula).toBeLessThan(0.2);
    expect(SKY_FX.lanes).toBeGreaterThan(0);
    expect(SKY_FX.lanes).toBeLessThan(1);
  });
});
