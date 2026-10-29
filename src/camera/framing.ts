import { displayOrbitRadius } from '../config/scale';
import type { Layout } from '../ui/layout';

export const OVERVIEW_FIT_RADIUS: number = displayOrbitRadius(5906.4) + 10;

/** Distance at which a sphere of `radius` fills `fill` of the limiting view dimension. */
export function focusDistance(radius: number, fovDeg: number, aspect: number, fill = 0.35): number {
  const halfFov = (fovDeg * Math.PI) / 360;
  const limitingHalf = Math.atan(Math.tan(halfFov) * Math.min(1, aspect));
  const d = radius / Math.sin(limitingHalf * fill);
  return Math.max(d, radius * 1.6);
}

/** NDC shift that keeps the focused body clear of the info panel. */
export function focusScreenOffset(layout: Layout): { x: number; y: number } {
  return layout === 'mobile' ? { x: 0, y: 0.45 } : { x: 0.25, y: 0 };
}
