import { describe, expect, it } from 'vitest';
import {
  ORBIT_STYLE,
  ribbonProfile,
  stepEmphasis,
  trailIntensity,
} from '../../src/bodies/orbitMath';
import { BLOOM } from '../../src/scene/bloomConfig';

const TAU = Math.PI * 2;
const S = ORBIT_STYLE;

describe('ORBIT_STYLE invariants', () => {
  it('keeps the head below the bloom threshold so the Sun stays the brightest element', () => {
    expect(S.headIntensity).toBeLessThan(BLOOM.threshold);
  });

  it('has a dimmer tail than head, a core narrower than the ribbon and a focus dim in (0, 1)', () => {
    expect(S.baseIntensity).toBeLessThan(S.headIntensity);
    expect(S.baseIntensity).toBeGreaterThan(0);
    expect(S.coreWidthPx).toBeLessThan(S.totalWidthPx);
    expect(S.coreWidthPx).toBeGreaterThan(0);
    expect(S.focusEmphasis).toBeGreaterThan(0);
    expect(S.focusEmphasis).toBeLessThan(1);
    expect(S.tailRad).toBeGreaterThan(0);
    expect(S.emphasisHalfLifeS).toBeGreaterThan(0);
    expect(S.haloShare).toBeGreaterThan(0);
    expect(S.haloShare).toBeLessThan(1);
    expect(Number.isInteger(S.segments)).toBe(true);
    expect(S.segments).toBeGreaterThanOrEqual(64);
  });
});

describe('trailIntensity', () => {
  it('is headIntensity at the planet', () => {
    for (const a of [0, 1.3, -2, 100]) expect(trailIntensity(a, a)).toBeCloseTo(S.headIntensity, 9);
  });

  it('trails behind the motion: just behind the planet is brighter than just ahead', () => {
    for (const a of [0, 1.3, 5, -4]) {
      expect(trailIntensity(a - 0.3, a)).toBeGreaterThan(trailIntensity(a + 0.3, a));
    }
  });

  it('fades monotonically behind the planet', () => {
    let prev = trailIntensity(0, 0);
    for (let d = 0.1; d < TAU; d += 0.1) {
      const v = trailIntensity(-d, 0);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });

  it('stays within [baseIntensity, headIntensity]', () => {
    for (let x = -20; x <= 20; x += 0.137) {
      for (const p of [-7, 0, 2.5, 13]) {
        const v = trailIntensity(x, p);
        expect(v).toBeGreaterThanOrEqual(S.baseIntensity - 1e-12);
        expect(v).toBeLessThanOrEqual(S.headIntensity + 1e-12);
      }
    }
  });

  it('is 2-pi periodic, also for negative and very large angles', () => {
    for (const [x, p] of [
      [0.4, 1.1],
      [-3, 2],
      [-50.2, -49],
      [1e4 + 0.2, 1e4 + 0.9],
    ] as const) {
      expect(trailIntensity(x + TAU, p)).toBeCloseTo(trailIntensity(x, p), 6);
      expect(trailIntensity(x, p + TAU)).toBeCloseTo(trailIntensity(x, p), 6);
    }
    expect(trailIntensity(1e5 - 0.3, 1e5)).toBeCloseTo(trailIntensity(-0.3, 0), 6);
  });
});

describe('ribbonProfile', () => {
  const core = S.coreWidthPx / S.totalWidthPx;

  it('is 1 at the centre and 0 at both edges', () => {
    expect(ribbonProfile(0)).toBeCloseTo(1, 9);
    expect(ribbonProfile(1)).toBeCloseTo(0, 9);
    expect(ribbonProfile(-1)).toBeCloseTo(0, 9);
  });

  it('is symmetric and non-increasing in |v|', () => {
    let prev = ribbonProfile(0);
    for (let v = 0.01; v <= 1.0001; v += 0.01) {
      expect(ribbonProfile(-v)).toBeCloseTo(ribbonProfile(v), 12);
      const cur = ribbonProfile(v);
      expect(cur).toBeLessThanOrEqual(prev + 1e-12);
      expect(cur).toBeGreaterThanOrEqual(0);
      prev = cur;
    }
  });

  it('keeps the core bright and the halo faint', () => {
    expect(ribbonProfile(core)).toBeGreaterThanOrEqual(0.5);
    expect(ribbonProfile(-core)).toBeGreaterThanOrEqual(0.5);
    expect(ribbonProfile(0.75)).toBeLessThanOrEqual(S.haloShare);
    expect(ribbonProfile(0.75)).toBeGreaterThan(0);
  });
});

describe('stepEmphasis', () => {
  it('returns current for dt = 0 and for negative dt', () => {
    expect(stepEmphasis(0.4, 1, 0)).toBe(0.4);
    expect(stepEmphasis(0.4, 1, -3)).toBe(0.4);
  });

  it('is halfway to the target after one half-life, from either side', () => {
    expect(stepEmphasis(0, 1, S.emphasisHalfLifeS)).toBeCloseTo(0.5, 9);
    expect(stepEmphasis(1, 0.3, S.emphasisHalfLifeS)).toBeCloseTo(0.65, 9);
  });

  it('never overshoots and lands on the target for a very large dt', () => {
    for (const dt of [0.01, 0.1, 0.5, 2, 10]) {
      const up = stepEmphasis(0.3, 1, dt);
      expect(up).toBeGreaterThan(0.3);
      expect(up).toBeLessThanOrEqual(1);
      const down = stepEmphasis(1, 0.3, dt);
      expect(down).toBeLessThan(1);
      expect(down).toBeGreaterThanOrEqual(0.3);
    }
    expect(stepEmphasis(0.3, 1, 1e6)).toBe(1);
    expect(stepEmphasis(1, 0.3, 1e6)).toBe(0.3);
  });

  it('is frame-rate independent', () => {
    let a = 0;
    for (let i = 0; i < 10; i++) a = stepEmphasis(a, 1, 0.05);
    expect(a).toBeCloseTo(stepEmphasis(0, 1, 0.5), 9);
  });
});
