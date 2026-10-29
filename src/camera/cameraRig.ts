import {
  Box3,
  Matrix4,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Sphere,
  Spherical,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import CameraControls from 'camera-controls';
import type { FocusTarget } from '../scene/solarSystem';
import type { Layout } from '../ui/layout';
import { OVERVIEW_FIT_RADIUS, focusDistance, focusScreenOffset } from './framing';

CameraControls.install({
  THREE: { Vector2, Vector3, Vector4, Quaternion, Matrix4, Spherical, Box3, Sphere, Raycaster },
});

export interface CameraRig {
  /** Resolves when the transition completes; a newer flyTo/flyToOverview supersedes it (resolves early). */
  flyTo(target: FocusTarget): Promise<void>;
  flyToOverview(): Promise<void>;
  /** Follows the current target's world position each frame. */
  update(dtSec: number): void;
  /** Azimuth += AUTO_ORBIT_RAD_PER_SEC while on. */
  setAutoOrbit(on: boolean): void;
  /** Re-applies focusScreenOffset and reframes the current target (call on every resize). */
  setLayout(layout: Layout): void;
  /** Fires on the controls' 'controlstart' (user drag or pinch). Returns an unsubscribe. */
  onUserInteract(cb: () => void): () => void;
  /** The focus target the camera is on or flying to; null in overview. */
  getTarget(): FocusTarget | null;
}

export const AUTO_ORBIT_RAD_PER_SEC = 0.08;
const SMOOTH_TIME = 0.25;
const DRAGGING_SMOOTH_TIME = 0.1;
/** Smoothing during a fly-to; with the cap below a flight takes about 2 s. */
const FLIGHT_SMOOTH_TIME = 0.6;
/** A flight counts as done at the controls' rest event or after this long, whichever comes first. */
const FLIGHT_MAX_SEC = 2.5;
const OVERVIEW_POLAR = Math.PI / 3;
const OVERVIEW_MIN_DISTANCE = 30;
const OVERVIEW_MAX_DISTANCE = 1600;
const FOCUS_MIN_FACTOR = 1.3;
const FOCUS_MAX_FACTOR = 12;

/** camera-controls with a rigid shift of both the current and the end state (follow, auto-orbit). */
class RigControls extends CameraControls {
  shift(delta: Vector3, dTheta: number): void {
    if (delta.lengthSq() === 0 && dTheta === 0) return;
    this._target.add(delta);
    this._targetEnd.add(delta);
    this._spherical.theta += dTheta;
    this._sphericalEnd.theta += dTheta;
    this._needsUpdate = true;
  }
}

interface Flight {
  resolve: () => void;
  elapsed: number;
}

export function createCameraRig(camera: PerspectiveCamera, dom: HTMLElement): CameraRig {
  const controls = new RigControls(camera, dom);
  controls.smoothTime = SMOOTH_TIME;
  controls.draggingSmoothTime = DRAGGING_SMOOTH_TIME;
  controls.mouseButtons.left = CameraControls.ACTION.ROTATE;
  controls.mouseButtons.right = CameraControls.ACTION.TRUCK;
  controls.mouseButtons.wheel = CameraControls.ACTION.DOLLY;
  controls.touches.one = CameraControls.ACTION.TOUCH_ROTATE;
  controls.touches.two = CameraControls.ACTION.TOUCH_DOLLY_TRUCK;

  let target: FocusTarget | null = null;
  let layout: Layout = 'desktop';
  let autoOrbit = false;
  let flight: Flight | null = null;
  const lastPos = new Vector3();
  const pos = new Vector3();
  const delta = new Vector3();
  const dir = new Vector3();
  const side = new Vector3();
  const tmp = new Vector3();

  const finishFlight = (): void => {
    if (!flight) return;
    const done = flight;
    flight = null;
    controls.smoothTime = SMOOTH_TIME;
    done.resolve();
  };
  controls.addEventListener('rest', finishFlight);

  const startFlight = (): Promise<void> => {
    finishFlight(); // last request wins: the superseded promise resolves now
    controls.smoothTime = FLIGHT_SMOOTH_TIME;
    return new Promise<void>((resolve) => {
      flight = { resolve, elapsed: 0 };
    });
  };

  const viewSize = (): { w: number; h: number } => ({
    w: dom.clientWidth || window.innerWidth,
    h: dom.clientHeight || window.innerHeight,
  });

  const applyViewOffset = (): void => {
    if (!target) {
      camera.clearViewOffset();
      return;
    }
    const { w, h } = viewSize();
    const o = focusScreenOffset(layout);
    // Shifting the view window by -x moves the centred target right by x (and +y moves it up).
    camera.setViewOffset(w, h, (-o.x * w) / 2, (o.y * h) / 2, w, h);
  };

  const focusLimits = (t: FocusTarget): number => {
    const d = focusDistance(t.radius, camera.fov, camera.aspect);
    controls.minDistance = t.radius * FOCUS_MIN_FACTOR;
    controls.maxDistance = Math.max(t.radius * FOCUS_MAX_FACTOR, d);
    return d;
  };

  const overviewLimits = (): number => {
    const d = controls.getDistanceToFitSphere(OVERVIEW_FIT_RADIUS);
    controls.minDistance = OVERVIEW_MIN_DISTANCE;
    controls.maxDistance = Math.max(OVERVIEW_MAX_DISTANCE, d);
    return d;
  };

  /** Viewing direction from the body: toward the sun and to the side, a little above, so the terminator shows. */
  const approachDirection = (bodyPos: Vector3, out: Vector3): Vector3 => {
    const sunDir = tmp.copy(bodyPos).negate();
    if (sunDir.lengthSq() < 1e-6) {
      // The sun itself: keep the current viewing direction.
      out.copy(camera.position).sub(bodyPos);
      return out.lengthSq() > 1e-6 ? out.normalize() : out.set(0, 0.5, 1).normalize();
    }
    sunDir.normalize();
    side.crossVectors(camera.up, sunDir).normalize();
    return out
      .copy(sunDir)
      .multiplyScalar(0.5)
      .addScaledVector(side, 0.8)
      .addScaledVector(camera.up, 0.35)
      .normalize();
  };

  const overviewPose = (enableTransition: boolean): void => {
    const d = overviewLimits();
    pos.setFromSphericalCoords(d, OVERVIEW_POLAR, controls.azimuthAngle);
    void controls.setLookAt(pos.x, pos.y, pos.z, 0, 0, 0, enableTransition);
  };

  overviewPose(false);
  controls.update(0);

  return {
    flyTo(t) {
      const promise = startFlight();
      target = t;
      t.object.getWorldPosition(lastPos);
      const d = focusLimits(t);
      approachDirection(lastPos, dir);
      pos.copy(lastPos).addScaledVector(dir, d);
      void controls.setLookAt(pos.x, pos.y, pos.z, lastPos.x, lastPos.y, lastPos.z, true);
      applyViewOffset();
      return promise;
    },
    flyToOverview() {
      const promise = startFlight();
      target = null;
      overviewPose(true);
      applyViewOffset();
      return promise;
    },
    update(dtSec) {
      delta.set(0, 0, 0);
      if (target) {
        target.object.getWorldPosition(pos);
        delta.subVectors(pos, lastPos);
        lastPos.copy(pos);
      }
      controls.shift(delta, autoOrbit ? AUTO_ORBIT_RAD_PER_SEC * dtSec : 0);
      controls.update(dtSec);
      if (flight) {
        flight.elapsed += dtSec;
        if (flight.elapsed >= FLIGHT_MAX_SEC) finishFlight();
      }
    },
    setAutoOrbit(on) {
      autoOrbit = on;
    },
    setLayout(next) {
      layout = next;
      applyViewOffset();
      const d = target ? focusLimits(target) : overviewLimits();
      void controls.dollyTo(d, true);
    },
    onUserInteract(cb) {
      const listener = (): void => cb();
      controls.addEventListener('controlstart', listener);
      return () => controls.removeEventListener('controlstart', listener);
    },
    getTarget() {
      return target;
    },
  };
}
