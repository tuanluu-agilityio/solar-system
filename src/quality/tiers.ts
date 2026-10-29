export type QualityTier = 'low' | 'medium' | 'high';

export interface DeviceInfo {
  isMobile: boolean;
  dpr: number;
  cores: number;
}

export interface TierSettings {
  pixelRatioCap: number;
  bloomResolutionScale: number;
  asteroidCount: number;
  textureSet: 'low' | 'high';
  atmosphere: boolean;
  ringShadow: boolean;
  skySize: 2048 | 4096;
  antialias: boolean;
}

// Bloom is present in every tier (the quality floor).
const TIERS: Record<QualityTier, TierSettings> = {
  low: {
    pixelRatioCap: 1.5,
    bloomResolutionScale: 0.5,
    asteroidCount: 1500,
    textureSet: 'low',
    atmosphere: true,
    ringShadow: false,
    skySize: 2048,
    antialias: false,
  },
  medium: {
    pixelRatioCap: 2,
    bloomResolutionScale: 0.75,
    asteroidCount: 4000,
    textureSet: 'low',
    atmosphere: true,
    ringShadow: false,
    skySize: 4096,
    antialias: true,
  },
  high: {
    pixelRatioCap: 2,
    bloomResolutionScale: 1,
    asteroidCount: 8000,
    textureSet: 'high',
    atmosphere: true,
    ringShadow: true,
    skySize: 4096,
    antialias: true,
  },
};

export function initialTier(d: DeviceInfo): QualityTier {
  if (d.isMobile) return d.cores <= 4 ? 'low' : 'medium';
  return 'high';
}

export function tierSettings(t: QualityTier): TierSettings {
  return { ...TIERS[t] };
}

export function lowerTier(t: QualityTier): QualityTier {
  return t === 'high' ? 'medium' : 'low';
}
