import type { TierSettings } from '../quality/tiers';

/** UnrealBloomPass parameters (same in every tier: bloom is part of the quality floor). */
export const BLOOM = { strength: 1.2, radius: 0.6, threshold: 0.85 } as const;

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
