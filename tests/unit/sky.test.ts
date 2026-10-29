import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BLOOM } from '../../src/scene/bloomConfig';
import { SKY_TILT_RAD, SKY_TONE, SKY_YAW_RAD, createSky, skyTone } from '../../src/scene/sky';

/** sRGB 8-bit value to linear. */
const lin = (v: number): number => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

describe('skyTone', () => {
  it('keeps empty space black', () => expect(skyTone(0)).toBe(0));
  it('lifts the faint Milky Way band (texel ~10/255) to a clearly visible level', () => {
    // The committed sky maps are very dark: the band is about 3-10 of 255.
    expect(skyTone(lin(10))).toBeGreaterThan(0.025);
    expect(skyTone(lin(30))).toBeGreaterThan(0.1);
  });
  it('keeps the 1-2 of 255 compression noise of empty space black', () => {
    expect(skyTone(lin(1))).toBe(0);
    expect(skyTone(lin(2))).toBe(0);
  });
  it('keeps the brightest stars below the bloom threshold, so the Sun stays the brightest', () => {
    expect(skyTone(1)).toBeLessThan(BLOOM.threshold);
    expect(skyTone(1)).toBeCloseTo(SKY_TONE.max, 3);
  });
  it('is monotonic', () => {
    let prev = -1;
    for (let v = 0; v <= 255; v++) {
      const t = skyTone(lin(v));
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });
});

describe('createSky', () => {
  it('tilts the sphere so the galactic band crosses the overview, as the real sky does', () => {
    const sky = createSky(new THREE.Texture());
    expect(sky.rotation.z).toBeCloseTo(SKY_TILT_RAD, 6);
    expect(sky.rotation.x).toBe(0);
    expect(sky.rotation.y).toBeCloseTo(SKY_YAW_RAD, 6);
    expect(sky.rotation.order).toBe('XYZ');
    expect(Math.abs(SKY_TILT_RAD)).toBeGreaterThan(THREE.MathUtils.degToRad(45));
  });
  it('feeds the tone constants to its shader and never writes depth', () => {
    const sky = createSky(new THREE.Texture());
    const mat = sky.material as THREE.ShaderMaterial;
    expect(mat.uniforms.uBlack?.value).toBe(SKY_TONE.black);
    expect(mat.uniforms.uGain?.value).toBe(SKY_TONE.gain);
    expect(mat.uniforms.uGamma?.value).toBe(SKY_TONE.gamma);
    expect(mat.uniforms.uMax?.value).toBe(SKY_TONE.max);
    expect(mat.depthWrite).toBe(false);
  });
});
