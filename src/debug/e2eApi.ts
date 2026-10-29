import { BODY_IDS, type BodyId, type ContentId } from '../data/types';
import type { AppState } from '../state/appState';
import type { TourEvent } from '../tour/tourMachine';

export interface E2EApi {
  getState(): AppState;
  select(id: ContentId): Promise<void>;
  overview(): Promise<void>;
  tour(e: TourEvent): void;
  setTimeScale(n: number): void;
}

declare global {
  interface Window {
    __app?: E2EApi;
  }
}

/**
 * Temporary close-up camera for screenshot checks (`?e2e=1&debugCam=earth`), only with `e2e`.
 * Removed once the camera rig exists (Task 21).
 */
export function debugCamTarget(search: string = window.location.search): BodyId | null {
  const q = new URLSearchParams(search);
  if (!q.has('e2e')) return null;
  const id = q.get('debugCam');
  return id && (BODY_IDS as readonly string[]).includes(id) ? (id as BodyId) : null;
}

/** Exposes window.__app only when the URL query contains `e2e`. Returns whether it was installed. */
export function installE2EApi(api: E2EApi, search: string = window.location.search): boolean {
  if (!new URLSearchParams(search).has('e2e')) return false;
  window.__app = api;
  return true;
}
