import type { TierSettings } from '../quality/tiers';

/**
 * UnrealBloomPass parameters (same in every tier: bloom is part of the quality floor).
 *
 * The pass adds about 3 x strength of every pixel whose luminance passes the threshold (five
 * blurred mips whose factors sum to 3), so the old strength 1.2 / threshold 0.85 turned the
 * whole solar disc into a clipped white blob. Now only HDR highlights bloom (the Sun's hottest
 * granules, Earth's city lights at gain 1.6), gently, and the Sun's halo comes from its own
 * corona shader. `smoothWidth` is the soft knee above the threshold (the pass default is 0.01).
 */
export const BLOOM = { strength: 0.42, radius: 0.55, threshold: 0.9, smoothWidth: 0.6 } as const;

/** Bloom buffer size: the drawing-buffer size scaled by the tier's bloomResolutionScale. */
export function bloomResolution(
  s: TierSettings,
  cssWidth: number,
  cssHeight: number,
  pixelRatio: number,
): { width: number; height: number } {
  const k = pixelRatio * s.bloomResolutionScale;
  return {
    width: Math.max(1, Math.round(cssWidth * k)),
    height: Math.max(1, Math.round(cssHeight * k)),
  };
}
