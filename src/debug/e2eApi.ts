import type { ContentId } from '../data/types';
import type { AppState } from '../state/appState';
import type { TourEvent } from '../tour/tourMachine';
import type { QualityTier } from '../quality/tiers';

export interface E2EApi {
  getState(): AppState;
  select(id: ContentId): Promise<void>;
  overview(): Promise<void>;
  tour(e: TourEvent): void;
  setTimeScale(n: number): void;
  /** Renderer pixel ratio currently in use. */
  pixelRatio(): number;
  /** Runs one runtime downgrade (same path as the FPS monitor); returns the new tier or null at the floor. */
  downgradeQuality(): QualityTier | null;
  /** Viewport the first orbit ribbon was last told about (drawing-buffer px and pixel ratio); null before the solar system exists. */
  orbitViewport(): { width: number; height: number; pixelRatio: number } | null;
  /** Visible asteroid instances. */
  asteroidCount(): number;
  /** The body the camera rig is focused on (or flying to); null in overview. */
  cameraTargetId(): ContentId | null;
  /** Screen position of a body's centre in CSS px (viewport coordinates); null when behind the camera. */
  projectBody(id: ContentId): { x: number; y: number } | null;
}

declare global {
  interface Window {
    __app?: E2EApi;
  }
}

/** Exposes window.__app only when the URL query contains `e2e`. Returns whether it was installed. */
export function installE2EApi(api: E2EApi, search: string = window.location.search): boolean {
  if (!new URLSearchParams(search).has('e2e')) return false;
  window.__app = api;
  return true;
}
