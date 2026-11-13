/**
 * Camera near plane: 0.1 normally; while the camera is closer than that to the focused body's
 * surface (zoomed onto Phobos or Deimos, a few hundredths of a unit across) it moves in to half
 * the gap, down to a floor that keeps enough depth precision for the far scene.
 */
export const NEAR_PLANE = { max: 0.1, min: 0.002, share: 0.5 } as const;

/** Near plane for a camera `surfaceDistance` display units from the focused body's surface. */
export function nearPlaneFor(surfaceDistance: number): number {
  if (!(surfaceDistance > 0)) return NEAR_PLANE.min;
  return Math.min(NEAR_PLANE.max, Math.max(NEAR_PLANE.min, surfaceDistance * NEAR_PLANE.share));
}
