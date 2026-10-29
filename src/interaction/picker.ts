import * as THREE from 'three';
import { BODY_IDS, type BodyId } from '../data/types';

export const TAP_MAX_MOVE_PX = 8;
export const TAP_MAX_MS = 350;

interface Sample {
  x: number;
  y: number;
  t: number;
}

/** A tap moves less than 8 px and lasts less than 350 ms (drags and long presses never select). */
export function isTap(down: Sample, up: Sample): boolean {
  return Math.hypot(up.x - down.x, up.y - down.y) < TAP_MAX_MOVE_PX && up.t - down.t < TAP_MAX_MS;
}

function isBodyId(v: unknown): v is BodyId {
  return typeof v === 'string' && (BODY_IDS as readonly string[]).includes(v);
}

/**
 * Pointer picking. Raycasts only on a single-pointer tap; a drag or pinch that ends over a
 * body never selects it. `onHover` (mouse only) reports the body under the cursor or null.
 */
export function createPicker(
  dom: HTMLElement,
  camera: THREE.Camera,
  pickables: THREE.Object3D[],
  onPick: (id: BodyId) => void,
  onHover?: (id: BodyId | null) => void,
): { dispose(): void } {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const centre = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const proxyRadius = (o: THREE.Object3D): number => {
    const geo = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (!geo) return 0;
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    return (geo.boundingSphere?.radius ?? 0) * o.getWorldScale(scale).x;
  };
  const active = new Set<number>();
  let down: Sample | null = null;
  let multi = false;
  let dragged = false;

  function pick(clientX: number, clientY: number): BodyId | null {
    const rect = dom.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1),
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    // Enlarged tap targets of neighbouring bodies can overlap (inner planets in a phone
    // overview). The front-most body whose visible disc (`userData.shownRadius`) is under
    // the tap wins; failing that, the proxy whose centre is closest to the ray, relative
    // to its size.
    let best: THREE.Object3D | null = null;
    let bestScore = Infinity;
    for (const h of hits) {
      const o = h.object;
      o.getWorldPosition(centre);
      const d = Math.sqrt(raycaster.ray.distanceSqToPoint(centre));
      const shown: unknown = o.userData.shownRadius;
      if (typeof shown === 'number' && d <= shown) {
        best = o;
        break;
      }
      const r = proxyRadius(o);
      const score = r > 0 ? d / r : Infinity;
      if (best === null || score < bestScore) {
        best = o;
        bestScore = score;
      }
    }
    const id: unknown = best?.userData.bodyId;
    return isBodyId(id) ? id : null;
  }

  const reset = (): void => {
    active.clear();
    down = null;
    multi = false;
    dragged = false;
  };

  const onDown = (e: PointerEvent): void => {
    active.add(e.pointerId);
    if (active.size > 1) {
      multi = true;
      return;
    }
    dragged = false;
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const onUp = (e: PointerEvent): void => {
    if (!active.delete(e.pointerId)) return;
    const start = down;
    const wasMulti = multi;
    const wasDragged = dragged;
    if (active.size === 0) reset();
    if (wasMulti || wasDragged || !start) return;
    if (!isTap(start, { x: e.clientX, y: e.clientY, t: performance.now() })) return;
    const id = pick(e.clientX, e.clientY);
    if (id) onPick(id);
  };
  const onMove = (e: PointerEvent): void => {
    // A drag that wanders past the tap radius never counts as a tap, even if it returns.
    if (down && active.has(e.pointerId)) {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) >= TAP_MAX_MOVE_PX) dragged = true;
    }
    if (!onHover || e.pointerType !== 'mouse' || active.size > 0) return;
    onHover(pick(e.clientX, e.clientY));
  };
  const onLeave = (): void => onHover?.(null);

  dom.addEventListener('pointerdown', onDown);
  dom.addEventListener('pointerup', onUp);
  dom.addEventListener('pointercancel', reset);
  dom.addEventListener('pointermove', onMove);
  dom.addEventListener('pointerleave', onLeave);
  return {
    dispose() {
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('pointercancel', reset);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerleave', onLeave);
    },
  };
}
