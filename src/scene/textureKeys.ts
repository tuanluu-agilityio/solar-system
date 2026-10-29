// Pure helpers for texture loading (no three.js, unit-testable).

// Per-body base colours (sRGB hex) used when a texture fails to load.
const FALLBACK_COLORS: Record<string, number> = {
  sun: 0xffb347,
  mercury: 0x9a9a9a,
  venus_surface: 0xd9a45b,
  venus_atmosphere: 0xe6c88a,
  earth_day: 0x2f6fb5,
  earth_night: 0x05070f,
  earth_clouds: 0xffffff,
  moon: 0xb5b5b5,
  mars: 0xc1572e,
  jupiter: 0xc9a27a,
  saturn: 0xe3c98f,
  saturn_ring: 0xcdb98f,
  uranus: 0x9bd8e0,
  neptune: 0x3f5fd0,
  pluto: 0xb89b82,
};
const DEFAULT_FALLBACK = 0x808080;
const SKY_FALLBACK = 0x02030a;

export function fallbackColor(key: string): number {
  if (key.startsWith('sky')) return SKY_FALLBACK;
  return FALLBACK_COLORS[key] ?? DEFAULT_FALLBACK;
}

export function skyKey(size: 2048 | 4096): string {
  return `sky_${size}`;
}

export function skySet(size: 2048 | 4096): 'low' | 'high' {
  return size === 2048 ? 'low' : 'high';
}

/** Combines several (loaded,total) progress sources into a 0..1 fraction. */
export function aggregateProgress(parts: ReadonlyArray<{ loaded: number; total: number }>): number {
  const total = parts.reduce((a, p) => a + p.total, 0);
  if (total <= 0) return 0;
  const loaded = parts.reduce((a, p) => a + Math.min(p.loaded, p.total), 0);
  return loaded / total;
}
