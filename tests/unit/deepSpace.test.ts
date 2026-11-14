import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createDeepSpace } from '../../src/scene/deepSpace';
import { tierSettings } from '../../src/quality/tiers';

describe('createDeepSpace', () => {
  it('keeps the sky, stars (and dust above low) and follows the camera', () => {
    const ds = createDeepSpace(new THREE.Texture(), tierSettings('high'));
    const cam = new THREE.PerspectiveCamera();
    cam.position.set(100, 200, -300);
    ds.update(5, cam, 1);
    expect(ds.far.position.equals(cam.position)).toBe(true);
    expect(ds.far.children).toHaveLength(2);
    expect(ds.group.children).toHaveLength(2);
  });
  it('has no dust on the low tier', () => {
    const ds = createDeepSpace(new THREE.Texture(), tierSettings('low'));
    expect(ds.group.children).toHaveLength(1);
  });
  it('accepts a missing sky texture (stars only)', () => {
    const ds = createDeepSpace(null, tierSettings('medium'));
    expect(ds.far.children).toHaveLength(1);
  });
});

describe('reduced motion', () => {
  it('freezes the twinkle when the OS asks for reduced motion', () => {
    const listeners: ((e: { matches: boolean }) => void)[] = [];
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: q.includes('reduce'),
      addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.push(cb),
    })) as unknown as typeof window.matchMedia;
    try {
      const ds = createDeepSpace(null, tierSettings('high'));
      const stars = ds.far.children[0] as THREE.Points;
      const mat = stars.material as THREE.ShaderMaterial;
      expect(mat.uniforms.uTwinkle?.value).toBe(0);
      listeners.forEach((cb) => cb({ matches: false }));
      expect(mat.uniforms.uTwinkle?.value).toBeGreaterThan(0);
    } finally {
      window.matchMedia = original;
    }
  });
});
