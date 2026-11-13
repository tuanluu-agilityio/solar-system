export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';
/** What the user picks: a fixed tier, or `auto` (device-based start plus FPS downgrade). */
export type QualityChoice = 'auto' | QualityTier;
export const QUALITY_CHOICES: readonly QualityChoice[] = ['auto', 'low', 'medium', 'high', 'ultra'];

export function isQualityChoice(v: unknown): v is QualityChoice {
  return typeof v === 'string' && (QUALITY_CHOICES as readonly string[]).includes(v);
}

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
  /** Procedural background stars (src/scene/starfield.ts). */
  starCount: number;
  /** Near-camera parallax dust motes (src/scene/dust.ts); 0 disables the layer. */
  dustCount: number;
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
    starCount: 7000,
    dustCount: 0,
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
    starCount: 12000,
    dustCount: 250,
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
    starCount: 18000,
    dustCount: 500,
  },
  // Never chosen automatically. Antialiasing is fixed when the renderer is created, so a
  // live switch to or from ultra keeps the context's antialias setting.
  ultra: {
    pixelRatioCap: 2,
    bloomResolutionScale: 1,
    asteroidCount: 12000,
    textureSet: 'high',
    atmosphere: true,
    ringShadow: true,
    skySize: 4096,
    antialias: true,
    starCount: 26000,
    dustCount: 800,
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
  if (t === 'ultra') return 'high';
  return t === 'high' ? 'medium' : 'low';
}
