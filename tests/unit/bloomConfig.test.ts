import { describe, expect, it } from 'vitest';
import { BLOOM, bloomResolution } from '../../src/scene/bloomConfig';
import { tierSettings } from '../../src/quality/tiers';

describe('bloomConfig', () => {
  it('uses the spec bloom parameters', () => {
    expect(BLOOM).toEqual({ strength: 1.2, radius: 0.6, threshold: 0.85 });
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
