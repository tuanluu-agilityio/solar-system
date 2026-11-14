import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BLOOM } from '../../src/scene/bloomConfig';
import { SKY_RADIUS, SKY_TILT_RAD, SKY_YAW_RAD } from '../../src/scene/sky';
import {
  STARFIELD,
  blackbodyColor,
  createStarfield,
  generateStars,
  magnitudeToIntensity,
  mulberry32,
  sampleMagnitude,
  starPointSize,
} from '../../src/scene/starfield';
import { tierSettings } from '../../src/quality/tiers';

describe('mulberry32', () => {
  it('is deterministic and in [0, 1)', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('sampleMagnitude', () => {
  it('maps [0, 1] onto the magnitude range, monotonically', () => {
    expect(sampleMagnitude(0)).toBeCloseTo(STARFIELD.magBright, 6);
    expect(sampleMagnitude(1)).toBeCloseTo(STARFIELD.magFaint, 6);
    let prev = -Infinity;
    for (let u = 0; u <= 1; u += 0.01) {
      const m = sampleMagnitude(u);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });
});

describe('magnitudeToIntensity', () => {
  it('is brighter for lower magnitudes and stays below the bloom threshold', () => {
    expect(magnitudeToIntensity(0)).toBeGreaterThan(magnitudeToIntensity(3));
    expect(magnitudeToIntensity(STARFIELD.magBright)).toBeLessThan(BLOOM.threshold);
    expect(magnitudeToIntensity(STARFIELD.magFaint)).toBeGreaterThan(0);
  });
});

describe('peak brightness', () => {
  it('stays below the bloom threshold at full twinkle with the halo of the brightest star', () => {
    // Shader peak: intensity * (1 + twinkle) * (core 1 + halo).
    const peak = STARFIELD.maxIntensity * (1 + STARFIELD.twinkle) * (1 + STARFIELD.halo);
    expect(peak).toBeLessThan(BLOOM.threshold);
  });
});

describe('blackbodyColor', () => {
  it('returns channels in [0, 1] with the brightest channel at 1', () => {
    for (const t of [2500, 3500, 5800, 10000, 30000]) {
      const c = blackbodyColor(t);
      for (const v of c) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(Math.max(...c)).toBeCloseTo(1, 6);
    }
  });
  it('is orange for cool stars and blue-white for hot stars', () => {
    const cool = blackbodyColor(3500);
    const hot = blackbodyColor(20000);
    expect(cool[0]).toBeGreaterThan(cool[2]);
    expect(hot[2]).toBeGreaterThan(hot[0]);
  });
});

describe('starPointSize', () => {
  it('scales with pixel ratio and stays crisp (about 1 to 3 px, brightest a bit more)', () => {
    expect(starPointSize(0, 1)).toBeGreaterThanOrEqual(1);
    expect(starPointSize(1, 1)).toBeLessThanOrEqual(8);
    expect(starPointSize(0.5, 2)).toBeCloseTo(2 * starPointSize(0.5, 1), 6);
    expect(starPointSize(0.8, 1)).toBeGreaterThan(starPointSize(0.1, 1));
  });
});

describe('generateStars', () => {
  it('is deterministic for a seed and sized by the count', () => {
    const a = generateStars(500, 3);
    const b = generateStars(500, 3);
    expect(a.positions).toEqual(b.positions);
    expect(a.colors).toEqual(b.colors);
    expect(a.positions).toHaveLength(1500);
    expect(a.colors).toHaveLength(1500);
    expect(a.intensities).toHaveLength(500);
    expect(a.phases).toHaveLength(500);
    expect(generateStars(500, 4).positions).not.toEqual(a.positions);
  });
  it('places stars on the star sphere, inside the sky sphere', () => {
    const { positions } = generateStars(300, 1);
    for (let i = 0; i < 300; i++) {
      const r = Math.hypot(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!);
      expect(r).toBeCloseTo(STARFIELD.radius, 2);
    }
    expect(STARFIELD.radius).toBeLessThan(SKY_RADIUS);
  });
  it('has many faint stars and few bright ones, all below the bloom threshold', () => {
    const { intensities } = generateStars(10000, 11);
    const sorted = Array.from(intensities).sort((x, y) => x - y);
    const median = sorted[5000]!;
    const top = sorted[9999]!;
    expect(top).toBeLessThan(BLOOM.threshold);
    expect(top).toBeGreaterThan(4 * median);
    const bright = sorted.filter((v) => v > 0.4).length;
    expect(bright).toBeGreaterThan(0);
    expect(bright).toBeLessThan(200);
  });
  it('is mostly near white, with some warm and some blue stars', () => {
    const { colors } = generateStars(5000, 5);
    let warm = 0;
    let blue = 0;
    let white = 0;
    for (let i = 0; i < 5000; i++) {
      const r = colors[i * 3]!;
      const b = colors[i * 3 + 2]!;
      if (r - b > 0.25) warm++;
      else if (b - r > 0.1) blue++;
      if (Math.abs(r - b) < 0.25) white++;
    }
    expect(warm).toBeGreaterThan(50);
    expect(blue).toBeGreaterThan(50);
    expect(white).toBeGreaterThan(2500);
  });
  it('concentrates stars toward the galactic band (the local y = 0 plane)', () => {
    const { positions } = generateStars(10000, 9);
    let band = 0;
    for (let i = 0; i < 10000; i++) {
      const sinB = positions[i * 3 + 1]! / STARFIELD.radius;
      if (Math.abs(sinB) < Math.sin(THREE.MathUtils.degToRad(15))) band++;
    }
    // An isotropic sky would put sin(15 deg) = 26 % of stars within 15 degrees of the band.
    expect(band / 10000).toBeGreaterThan(0.35);
  });
});

describe('createStarfield', () => {
  it('uses the tier star count and the sky rotation', () => {
    const s = createStarfield(tierSettings('medium'));
    const geo = s.points.geometry;
    const n = tierSettings('medium').starCount;
    expect(geo.getAttribute('position').count).toBe(n);
    expect(geo.getAttribute('color').itemSize).toBe(3);
    expect(geo.getAttribute('aIntensity').count).toBe(n);
    expect(geo.getAttribute('aPhase').count).toBe(n);
    expect(s.points.rotation.y).toBeCloseTo(SKY_YAW_RAD, 6);
    expect(s.points.rotation.z).toBeCloseTo(SKY_TILT_RAD, 6);
  });
  it('animates twinkle through uTime and can switch it off', () => {
    const s = createStarfield(tierSettings('high'));
    const mat = s.points.material as THREE.ShaderMaterial;
    s.update(12, 2);
    expect(mat.uniforms.uTime?.value).toBe(12);
    expect(mat.uniforms.uPixelRatio?.value).toBe(2);
    expect(mat.uniforms.uTwinkle?.value).toBeGreaterThan(0);
    s.setMotion(false);
    expect(mat.uniforms.uTwinkle?.value).toBe(0);
    expect(mat.depthWrite).toBe(false);
  });
});
