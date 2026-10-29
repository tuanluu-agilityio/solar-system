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
  const active = new Set<number>();
  let down: Sample | null = null;
  let multi = false;

  function pick(clientX: number, clientY: number): BodyId | null {
    const rect = dom.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1),
    );
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    const id: unknown = hit?.object.userData.bodyId;
    return isBodyId(id) ? id : null;
  }

  const reset = (): void => {
    active.clear();
    down = null;
    multi = false;
  };

  const onDown = (e: PointerEvent): void => {
    active.add(e.pointerId);
    if (active.size > 1) {
      multi = true;
      return;
    }
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const onUp = (e: PointerEvent): void => {
    if (!active.delete(e.pointerId)) return;
    const start = down;
    const wasMulti = multi;
    if (active.size === 0) reset();
    if (wasMulti || !start) return;
    if (!isTap(start, { x: e.clientX, y: e.clientY, t: performance.now() })) return;
    const id = pick(e.clientX, e.clientY);
    if (id) onPick(id);
  };
  const onMove = (e: PointerEvent): void => {
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
