import { describe, expect, it } from 'vitest';
import { initialTier, lowerTier, tierSettings } from '../../src/quality/tiers';
import { createFpsMonitor } from '../../src/quality/fpsMonitor';

describe('tiers', () => {
  it('has the table values', () => {
    expect(tierSettings('low')).toEqual({
      pixelRatioCap: 1.5,
      bloomResolutionScale: 0.5,
      asteroidCount: 1500,
      textureSet: 'low',
      atmosphere: true,
      ringShadow: false,
      planetDetail: false,
      skySize: 2048,
      antialias: false,
      starCount: 7000,
      dustCount: 0,
      kuiperCount: 0,
    });
    expect(tierSettings('medium')).toEqual({
      pixelRatioCap: 2,
      bloomResolutionScale: 0.75,
      asteroidCount: 4000,
      textureSet: 'low',
      atmosphere: true,
      ringShadow: false,
      planetDetail: true,
      skySize: 4096,
      antialias: true,
      starCount: 12000,
      dustCount: 250,
      kuiperCount: 1500,
    });
    expect(tierSettings('high')).toEqual({
      pixelRatioCap: 2,
      bloomResolutionScale: 1,
      asteroidCount: 8000,
      textureSet: 'high',
      atmosphere: true,
      ringShadow: true,
      planetDetail: true,
      skySize: 4096,
      antialias: true,
      starCount: 18000,
      dustCount: 500,
      kuiperCount: 3000,
    });
  });
  it('has an ultra tier that is never picked automatically', () => {
    expect(tierSettings('ultra')).toMatchObject({
      pixelRatioCap: 2,
      bloomResolutionScale: 1,
      asteroidCount: 12000,
      textureSet: 'high',
      skySize: 4096,
      antialias: true,
      kuiperCount: 4500,
    });
    for (const isMobile of [true, false]) {
      for (const cores of [2, 8, 32]) {
        expect(initialTier({ isMobile, dpr: 3, cores })).not.toBe('ultra');
      }
    }
  });
  it('lowers tiers with floor', () => {
    expect(lowerTier('ultra')).toBe('high');
    expect(lowerTier('high')).toBe('medium');
    expect(lowerTier('medium')).toBe('low');
    expect(lowerTier('low')).toBe('low');
  });
  it('picks initial tier', () => {
    expect(initialTier({ isMobile: true, dpr: 3, cores: 4 })).toBe('low');
    expect(initialTier({ isMobile: true, dpr: 3, cores: 8 })).toBe('medium');
    expect(initialTier({ isMobile: false, dpr: 1, cores: 2 })).toBe('high');
  });
});

describe('fps monitor', () => {
  const run = (m: ReturnType<typeof createFpsMonitor>, dt: number, ms: number) => {
    const out: (string | null)[] = [];
    for (let t = 0; t < ms; t += dt) out.push(m.sample(dt));
    return out;
  };
  it('downgrades exactly once on slow window, until reset', () => {
    const m = createFpsMonitor();
    expect(run(m, 40, 3000).filter((r) => r === 'downgrade')).toHaveLength(1);
    expect(run(m, 40, 3000).every((r) => r === null)).toBe(true);
    m.reset();
    expect(run(m, 40, 3000).filter((r) => r === 'downgrade')).toHaveLength(1);
  });
  it('never downgrades at 60fps', () => {
    expect(run(createFpsMonitor(), 16, 3000).every((r) => r === null)).toBe(true);
  });
  it('returns null with a partial window', () => {
    expect(run(createFpsMonitor(), 40, 2900).every((r) => r === null)).toBe(true);
  });
});

describe('softwareFallback', () => {
  it('keeps the tier-visible numbers and drops shader detail and particle layers to low', async () => {
    const { softwareFallback, tierSettings } = await import('../../src/quality/tiers');
    const high = tierSettings('high');
    const low = tierSettings('low');
    const s = softwareFallback(high);
    expect(s.pixelRatioCap).toBe(high.pixelRatioCap);
    expect(s.asteroidCount).toBe(high.asteroidCount);
    expect(s.textureSet).toBe(high.textureSet);
    expect(s.bloomResolutionScale).toBe(high.bloomResolutionScale);
    expect(s.planetDetail).toBe(false);
    expect(s.starCount).toBe(low.starCount);
    expect(s.dustCount).toBe(0);
    expect(s.kuiperCount).toBe(0);
    // The input is not mutated, and low stays low.
    expect(high.planetDetail).toBe(true);
    expect(softwareFallback(low)).toEqual(low);
  });
});
