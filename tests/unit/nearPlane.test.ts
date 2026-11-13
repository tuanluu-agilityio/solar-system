import { describe, expect, it } from 'vitest';
import { NEAR_PLANE, nearPlaneFor } from '../../src/scene/nearPlane';

describe('nearPlaneFor', () => {
  it('keeps the default near plane unless the camera is very close to a surface', () => {
    expect(nearPlaneFor(Infinity)).toBe(NEAR_PLANE.max);
    expect(nearPlaneFor(5)).toBe(NEAR_PLANE.max);
    expect(NEAR_PLANE.max).toBe(0.1);
  });

  it('pulls the near plane in front of a small moon the camera has zoomed onto', () => {
    // Deimos (radius ~0.053) at the rig's closest zoom: the surface is ~0.016 away.
    const near = nearPlaneFor(0.016);
    expect(near).toBeLessThan(0.016);
    expect(near).toBeGreaterThanOrEqual(NEAR_PLANE.min);
  });

  it('never goes below the floor, even inside a body', () => {
    expect(nearPlaneFor(0)).toBe(NEAR_PLANE.min);
    expect(nearPlaneFor(-1)).toBe(NEAR_PLANE.min);
  });
});
