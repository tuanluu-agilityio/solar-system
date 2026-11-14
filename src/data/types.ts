/** Locales shipped in this phase: UI, body content, tour script and narration are complete for each. */
export const SUPPORTED_LANGS = ['vi', 'en', 'ja', 'de'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(value);
}

/** Every body, the Sun outward; a moon follows its planet (and its inner siblings). */
export const BODY_IDS = [
  'sun',
  'mercury',
  'venus',
  'earth',
  'moon',
  'mars',
  'phobos',
  'deimos',
  'jupiter',
  'io',
  'europa',
  'ganymede',
  'callisto',
  'saturn',
  'enceladus',
  'titan',
  'uranus',
  'neptune',
  'pluto',
] as const;
export type BodyId = (typeof BODY_IDS)[number];
export type ContentId = BodyId | 'asteroid-belt';
export type BodyKind = 'star' | 'terrestrial' | 'gas-giant' | 'ice-giant' | 'dwarf-planet' | 'moon';

export interface PhysicalData {
  diameterKm: number;
  massEarths: number;
  surfaceGravity: number; // m/s²
  rotationPeriodHours: number; // negative = retrograde
  axialTiltDeg: number;
  /** Omitted where NASA gives no mean (Phobos and Deimos: only day and night extremes). */
  meanTempC?: number;
  distanceFromParentMkm?: number; // million km (a moon: from its planet)
  orbitalPeriodDays?: number;
  knownMoons?: number;
  /** Main atmospheric gases (NASA Planetary Fact Sheet); formulas use Unicode subscripts. */
  atmosphere?: readonly { gas: string; percent: number }[];
  /**
   * Irregular moons: triaxial radii in km, [toward the planet, along the orbit, polar].
   * Spherical bodies omit it.
   */
  shapeRadiiKm?: readonly [number, number, number];
}

export interface OrbitalElements {
  semiMajorAxisAu: number;
  eccentricity: number;
  inclinationDeg: number;
  longitudeOfAscendingNodeDeg: number;
  argumentOfPerihelionDeg: number;
  meanAnomalyAtEpochDeg: number;
}

export interface BodyDef {
  id: BodyId;
  kind: BodyKind;
  parent: BodyId | null;
  orderFromSun: number | null;
  physical: PhysicalData;
  orbit?: OrbitalElements;
  /** Hex tint of the orbit ribbon; planets and Pluto only (the Sun and the Moon draw none). */
  orbitColor?: string;
}

export interface BodyContent {
  name: string;
  kindLabel: string;
  description: string;
  facts: string[];
}

export type TourStopId = 'intro' | ContentId | 'outro';

export interface TourStopDef {
  id: TourStopId;
  focus: ContentId | 'overview';
}
