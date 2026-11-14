// Pure helpers for texture loading (no three.js, unit-testable).
import { moonDisplay } from '../config/scale';
import { BODIES } from '../data/bodies';
import { BODY_IDS, type BodyId } from '../data/types';

// Per-body base colours (sRGB hex) used when a texture fails to load.
const FALLBACK_COLORS: Record<string, number> = {
  sun: 0xffb347,
  mercury: 0x9a9a9a,
  venus_surface: 0xd9a45b,
  venus_atmosphere: 0xe6c88a,
  earth_day: 0x2f6fb5,
  earth_night: 0x05070f,
  earth_clouds: 0xffffff,
  // Flat tangent-space normal and an all-land (no glint) mask.
  earth_normal: 0x8080ff,
  earth_specular: 0x000000,
  moon: 0xb5b5b5,
  mars: 0xc1572e,
  phobos: 0x5f574f,
  deimos: 0x857a6f,
  jupiter: 0xc9a27a,
  io: 0xcfb45a,
  europa: 0xd9cdb8,
  ganymede: 0x8a8076,
  callisto: 0x4a423a,
  saturn: 0xe3c98f,
  enceladus: 0xf2f5f7,
  titan: 0xc8873f,
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

/** Maps that hold data, not colour: sampled linearly (no sRGB decode). */
const DATA_KEYS = new Set(['earth_normal', 'earth_specular']);

export function isDataTextureKey(key: string): boolean {
  return DATA_KEYS.has(key);
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

const EXTRA_KEYS: Partial<Record<BodyId, string[]>> = {
  sun: [], // the sun has its own shader and is not part of the lazy upgrade
  venus: ['venus_atmosphere', 'venus_surface'],
  earth: ['earth_day', 'earth_night', 'earth_clouds', 'earth_normal', 'earth_specular'],
  saturn: ['saturn', 'saturn_ring'],
};

/** Every texture key a body uses (earth: day, night, clouds, normal, specular). */
export function textureKeysFor(id: BodyId): string[] {
  return [...(EXTRA_KEYS[id] ?? [id])];
}

/**
 * Maps of the moons hidden from the overview: left out of the boot download and loaded the
 * first time their planet system comes into view (the fallback colour shows until then).
 */
const LAZY_KEYS: ReadonlySet<string> = new Set(
  BODY_IDS.filter((id) => BODIES[id].kind === 'moon' && !moonDisplay(id).overview).flatMap((id) =>
    textureKeysFor(id),
  ),
);

export function isLazyTextureKey(key: string): boolean {
  return LAZY_KEYS.has(key);
}
