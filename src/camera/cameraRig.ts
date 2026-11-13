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
import {
  OVERVIEW_FIT_RADIUS,
  flightArcHeight,
  focusDistance,
  focusFill,
  focusScreenOffset,
  overviewFrame,
  overviewPolar,
} from './framing';

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
  /** Tour stops on a phone use a smaller fill and a lower offset (the subtitle dock). */
  setTourMode(on: boolean): void;
  /** Fires on the controls' 'controlstart' (user drag or pinch). Returns an unsubscribe. */
  onUserInteract(cb: () => void): () => void;
  /** The focus target the camera is on or flying to; null in overview. */
  getTarget(): FocusTarget | null;
  /** True while a fly-to / fly-to-overview transition is in progress. */
  isFlying(): boolean;
  /** Multiplies the camera distance by `factor` (clamped to the zoom limits), smoothly. */
  zoomBy(factor: number): void;
  /** Turns the view about the vertical axis by `azimuthRad`, smoothly. */
  rotateBy(azimuthRad: number): void;
  /**
   * Idle drift: while a body is focused and the user has not touched the view for
   * IDLE_DRIFT_DELAY_SEC, the camera slowly circles it. Off by default.
   */
  setIdleDrift(on: boolean): void;
  /** Flights rise in a gentle arc and clear the Sun (on by default; off for reduced motion). */
  setFlightArc(on: boolean): void;
}

export const AUTO_ORBIT_RAD_PER_SEC = 0.08;
/** Idle drift speed around a focused body, and how long the view must rest before it starts. */
export const IDLE_DRIFT_RAD_PER_SEC = 0.025;
export const IDLE_DRIFT_DELAY_SEC = 6;
/** The drift eases in over this long instead of starting abruptly. */
const IDLE_DRIFT_RAMP_SEC = 3;
/** A flight's lift rises and falls over this long (within FLIGHT_MAX_SEC). */
export const FLIGHT_ARC_SEC = 2.2;
const SMOOTH_TIME = 0.25;
const DRAGGING_SMOOTH_TIME = 0.1;
/** Smoothing during a fly-to; with the cap below a flight takes about 2 s. */
const FLIGHT_SMOOTH_TIME = 0.6;
/** A flight counts as done at the controls' rest event or after this long, whichever comes first. */
const FLIGHT_MAX_SEC = 2.5;
const OVERVIEW_MIN_DISTANCE = 30;
const OVERVIEW_MAX_DISTANCE = 1600;
const FOCUS_MIN_FACTOR = 1.3;
const FOCUS_MAX_FACTOR = 12;

/** camera-controls with a rigid shift of both the current and the end state (follow, auto-orbit). */
class RigControls extends CameraControls {
  /** Makes the next `update` rewrite the camera pose even when the controls are at rest. */
  invalidate(): void {
    this._needsUpdate = true;
  }

  /** The distance the camera is heading to (repeated zoom steps compound from it). */
  get endDistance(): number {
    return this._sphericalEnd.radius;
  }

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
  let tourMode = false;
  /** NDC shift that centres the overview disc; recomputed with the overview distance. */
  let overviewOffsetY = 0;
  let autoOrbit = false;
  let idleDrift = false;
  let idleSec = 0;
  let flight: Flight | null = null;
  /** Lift of the current flight: peak height and time since the flight began. */
  let arc: { height: number; elapsed: number } | null = null;
  let arcOn = true;
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
  // Any touch of the view (drag, pinch, tap, wheel) restarts the idle clock.
  const touch = (): void => {
    idleSec = 0;
  };
  controls.addEventListener('controlstart', touch);
  dom.addEventListener('pointerdown', touch);
  dom.addEventListener('wheel', touch, { passive: true });

  const from = new Vector3();
  /** Starts the lift for a flight from the current look-at point to `to`. */
  const startArc = (to: Vector3): void => {
    controls.getTarget(from);
    const height = arcOn ? flightArcHeight(from, to) : 0;
    arc = height > 1e-6 ? { height, elapsed: 0 } : null;
  };

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
    const { w, h } = viewSize();
    const o = target ? focusScreenOffset(layout, tourMode) : { x: 0, y: overviewOffsetY };
    // Shifting the view window by -x moves the centred target right by x (and +y moves it up).
    camera.setViewOffset(w, h, (-o.x * w) / 2, (o.y * h) / 2, w, h);
  };

  const focusLimits = (t: FocusTarget): number => {
    const d = focusDistance(t.radius, camera.fov, camera.aspect, focusFill(layout, tourMode));
    controls.minDistance = t.radius * FOCUS_MIN_FACTOR;
    controls.maxDistance = Math.max(t.radius * FOCUS_MAX_FACTOR, d);
    return d;
  };

  const overviewLimits = (): number => {
    const frame = overviewFrame(
      OVERVIEW_FIT_RADIUS,
      camera.fov,
      camera.aspect,
      overviewPolar(camera.aspect),
    );
    const d = frame.distance;
    overviewOffsetY = frame.offsetY;
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
    pos.setFromSphericalCoords(d, overviewPolar(camera.aspect), controls.azimuthAngle);
    void controls.setLookAt(pos.x, pos.y, pos.z, 0, 0, 0, enableTransition);
  };

  overviewPose(false);
  applyViewOffset();
  controls.update(0);

  const reframe = (): void => {
    const d = target ? focusLimits(target) : overviewLimits();
    applyViewOffset();
    void controls.dollyTo(d, true);
  };

  return {
    flyTo(t) {
      const promise = startFlight();
      target = t;
      t.object.getWorldPosition(lastPos);
      startArc(lastPos);
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
      startArc(tmp.set(0, 0, 0));
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
      let turn = autoOrbit ? AUTO_ORBIT_RAD_PER_SEC * dtSec : 0;
      if (idleDrift && target && !flight && !autoOrbit) {
        idleSec += dtSec;
        const ramp = Math.min(
          1,
          Math.max(0, (idleSec - IDLE_DRIFT_DELAY_SEC) / IDLE_DRIFT_RAMP_SEC),
        );
        // Smoothstep ease-in.
        turn += IDLE_DRIFT_RAD_PER_SEC * ramp * ramp * (3 - 2 * ramp) * dtSec;
      } else {
        idleSec = 0;
      }
      controls.shift(delta, turn);
      // The lift is added on top of the pose the controls write, so they must rewrite it
      // every frame while it lasts (and once more when it ends).
      if (arc) controls.invalidate();
      controls.update(dtSec);
      if (arc) {
        arc.elapsed += dtSec;
        const u = Math.min(1, arc.elapsed / FLIGHT_ARC_SEC);
        const s = Math.sin(Math.PI * u);
        camera.position.y += arc.height * s * s;
        camera.lookAt(controls.getTarget(tmp));
        camera.updateMatrixWorld();
        if (u >= 1) {
          arc = null;
          controls.invalidate();
        }
      }
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
      reframe();
    },
    setTourMode(on) {
      if (on === tourMode) return;
      tourMode = on;
      if (target) reframe();
    },
    onUserInteract(cb) {
      const listener = (): void => cb();
      controls.addEventListener('controlstart', listener);
      return () => controls.removeEventListener('controlstart', listener);
    },
    getTarget() {
      return target;
    },
    isFlying() {
      return flight !== null;
    },
    zoomBy(factor) {
      if (!Number.isFinite(factor) || factor <= 0) return;
      idleSec = 0;
      const d = Math.min(
        controls.maxDistance,
        Math.max(controls.minDistance, controls.endDistance * factor),
      );
      void controls.dollyTo(d, true);
    },
    rotateBy(azimuthRad) {
      idleSec = 0;
      void controls.rotate(azimuthRad, 0, true);
    },
    setFlightArc(on) {
      arcOn = on;
      if (!on) arc = null;
    },
    setIdleDrift(on) {
      idleDrift = on;
      idleSec = 0;
    },
  };
}
