import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createOrbitLine } from '../../src/bodies/orbitLine';
import { ORBIT_STYLE } from '../../src/bodies/orbitMath';

const N = ORBIT_STYLE.segments;

function make() {
  return createOrbitLine(80, '#6fb6ff');
}

function mat(o: ReturnType<typeof make>): THREE.ShaderMaterial {
  return o.object.material as THREE.ShaderMaterial;
}

/** True when `src` contains `n` as a standalone numeric literal (optionally written with a trailing ".0"). */
function hasLiteral(src: string, n: number): boolean {
  const s = String(n).replace('.', '\\.');
  return new RegExp(`(?<![\\d.])${s}(\\.0+)?(?![\\d])`).test(src);
}

describe('createOrbitLine', () => {
  it('is a mesh named orbit-line that is never frustum culled', () => {
    const o = make();
    expect(o.object).toBeInstanceOf(THREE.Mesh);
    expect(o.object.name).toBe('orbit-line');
    expect(o.object.frustumCulled).toBe(false);
  });

  it('is a closed strip: 2 * (segments + 1) vertices and 6 * segments indices', () => {
    const geo = make().object.geometry;
    expect(geo.getAttribute('position').count).toBe(2 * (N + 1));
    expect(geo.getAttribute('aSide').count).toBe(2 * (N + 1));
    expect(geo.getAttribute('aAngle').count).toBe(2 * (N + 1));
    expect(geo.getIndex()?.count).toBe(6 * N);
    const idx = geo.getIndex()!;
    for (let i = 0; i < idx.count; i++) {
      expect(idx.getX(i)).toBeLessThan(2 * (N + 1));
    }
  });

  it('puts the centre line on a circle of radius 80 in the XZ plane, angle a at (r cos a, 0, -r sin a)', () => {
    const geo = make().object.geometry;
    const pos = geo.getAttribute('position');
    const side = geo.getAttribute('aSide');
    const ang = geo.getAttribute('aAngle');
    for (let i = 0; i < pos.count; i++) {
      const a = ang.getX(i);
      expect(pos.getX(i)).toBeCloseTo(80 * Math.cos(a), 3);
      expect(pos.getY(i)).toBe(0);
      expect(pos.getZ(i)).toBeCloseTo(-80 * Math.sin(a), 3);
      expect(Math.hypot(pos.getX(i), pos.getZ(i))).toBeCloseTo(80, 3);
      expect(Math.abs(side.getX(i))).toBe(1);
    }
    // Both sides of each station share the angle; the seam is duplicated (0 and 2π).
    expect(ang.getX(0)).toBe(0);
    expect(ang.getX(1)).toBe(0);
    expect(side.getX(0)).toBe(-side.getX(1));
    expect(ang.getX(2 * N)).toBeCloseTo(Math.PI * 2, 5);
    expect(ang.getX(2 * N + 1)).toBeCloseTo(Math.PI * 2, 5);
    expect(ang.getX(2 * 64)).toBeCloseTo((64 / N) * Math.PI * 2, 5);
  });

  it('uses an additive, transparent ShaderMaterial that tests depth but does not write it', () => {
    const m = mat(make());
    expect(m).toBeInstanceOf(THREE.ShaderMaterial);
    expect(m.blending).toBe(THREE.AdditiveBlending);
    expect(m.transparent).toBe(true);
    expect(m.depthWrite).toBe(false);
    expect(m.depthTest).toBe(true);
  });

  it('tints by the given colour', () => {
    const c = mat(make()).uniforms.uColor!.value as THREE.Color;
    expect(c.getHexString()).toBe(new THREE.Color('#6fb6ff').getHexString());
  });

  it('setViewport sets the viewport and pixel-ratio uniforms', () => {
    const o = make();
    o.setViewport(1000, 500, 2);
    const u = mat(o).uniforms;
    const vp = u.uViewport!.value as THREE.Vector2;
    expect(vp.x).toBe(1000);
    expect(vp.y).toBe(500);
    expect(u.uPixelRatio!.value).toBe(2);
  });

  it('setPlanetAngle and setEmphasis set their uniforms, emphasis clamped to 0..1', () => {
    const o = make();
    const u = mat(o).uniforms;
    o.setPlanetAngle(1.25);
    expect(u.uPlanetAngle!.value).toBe(1.25);
    o.setEmphasis(0.3);
    expect(u.uEmphasis!.value).toBe(0.3);
    o.setEmphasis(4);
    expect(u.uEmphasis!.value).toBe(1);
    o.setEmphasis(-1);
    expect(u.uEmphasis!.value).toBe(0);
  });

  it('dispose() disposes geometry and material', () => {
    const o = make();
    const g = vi.spyOn(o.object.geometry, 'dispose');
    const m = vi.spyOn(mat(o), 'dispose');
    o.dispose();
    expect(g).toHaveBeenCalled();
    expect(m).toHaveBeenCalled();
  });

  it('builds the shaders from ORBIT_STYLE constants instead of retyping them', () => {
    const m = mat(make());
    const src = m.vertexShader + m.fragmentShader;
    const S = ORBIT_STYLE;
    for (const n of [
      S.baseIntensity,
      S.headIntensity,
      S.tailRad,
      S.haloShare,
      S.totalWidthPx / 2,
    ]) {
      expect(hasLiteral(src, n), String(n)).toBe(true);
    }
    expect(hasLiteral(src, S.coreWidthPx / S.totalWidthPx)).toBe(true);
  });

  it('guards against projected points behind or at the camera (w <= 0.001)', () => {
    const vs = mat(make()).vertexShader;
    expect(vs).toMatch(/\.w\s*<=\s*0\.001/);
    expect(mat(make()).fragmentShader).toContain('#include <tonemapping_fragment>');
    expect(mat(make()).fragmentShader).toContain('#include <colorspace_fragment>');
  });
});
