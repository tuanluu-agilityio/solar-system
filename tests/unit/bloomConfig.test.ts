import { describe, expect, it } from 'vitest';
import { BLOOM, bloomResolution } from '../../src/scene/bloomConfig';
import { tierSettings } from '../../src/quality/tiers';

describe('bloomConfig', () => {
  it('keeps bloom present but gentle enough to preserve the solar surface detail', () => {
    // Bloom is part of the quality floor: it must never be switched off.
    expect(BLOOM.strength).toBeGreaterThan(0);
    // UnrealBloomPass adds about 3 x strength of every above-threshold pixel (five mips whose
    // factors sum to 3); at the old 1.2 the Sun clipped to a white blob.
    expect(BLOOM.strength * 3).toBeLessThanOrEqual(1.5);
    // The threshold sits at or above display white so only HDR highlights (the Sun's hot
    // granules, Earth's city lights at gain 1.6) bloom, not every lit surface.
    expect(BLOOM.threshold).toBeGreaterThanOrEqual(0.9);
    expect(BLOOM.threshold).toBeLessThan(1.6);
    // A soft knee instead of the pass's default hard 0.01 step avoids a hard bloom edge.
    expect(BLOOM.smoothWidth).toBeGreaterThan(0.01);
    expect(BLOOM.radius).toBeGreaterThan(0);
    expect(BLOOM.radius).toBeLessThanOrEqual(1);
  });

  it('scales the drawing-buffer size by bloomResolutionScale', () => {
    expect(bloomResolution(tierSettings('high'), 1440, 900, 2)).toEqual({
      width: 2880,
      height: 1800,
    });
    expect(bloomResolution(tierSettings('medium'), 1440, 900, 2)).toEqual({
      width: 2160,
      height: 1350,
    });
    expect(bloomResolution(tierSettings('low'), 1440, 900, 1.5)).toEqual({
      width: 1080,
      height: 675,
    });
  });

  it('rounds and never returns less than 1 pixel', () => {
    expect(bloomResolution(tierSettings('low'), 333, 1, 1)).toEqual({ width: 167, height: 1 });
    expect(bloomResolution(tierSettings('low'), 0, 0, 1)).toEqual({ width: 1, height: 1 });
  });
});
