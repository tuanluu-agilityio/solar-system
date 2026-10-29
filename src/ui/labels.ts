import * as THREE from 'three';
import type { BodyObject } from '../bodies/planet';
import { getContent } from '../data/content';
import type { BodyId, Lang } from '../data/types';
import { placeLabels, type Disc, type LabelItem } from './labelLayout';

/** Labels shown in overview on every device. */
const ALWAYS_VISIBLE: ReadonlySet<BodyId> = new Set([
  'mercury',
  'venus',
  'earth',
  'mars',
  'moon',
  'pluto',
]);

/**
 * Declutter priority, highest first (the hovered body always goes first). Earth and the
 * large planets win; the Sun needs no label to be found, and the Moon only shows when it
 * is not hidden next to a boosted Earth and there is room.
 */
const PRIORITY: readonly BodyId[] = [
  'earth',
  'jupiter',
  'saturn',
  'mars',
  'venus',
  'mercury',
  'uranus',
  'neptune',
  'pluto',
  'sun',
  'moon',
];

export interface LabelOptions {
  onSelect?: (id: BodyId) => void;
  /**
   * Mobile wants every label; desktop the always-set plus the hovered body. Labels that
   * would overlap a higher-priority one are hidden (`placeLabels`).
   */
  isMobile?: () => boolean;
}

export interface Labels {
  update(): void;
  setVisible(v: boolean): void;
  setHovered(id: BodyId | null): void;
}

/** HTML labels positioned each frame next to the body's projected disc. */
export function createLabels(
  container: HTMLElement,
  bodies: Map<BodyId, BodyObject>,
  camera: THREE.PerspectiveCamera,
  getLang: () => Lang,
  opts: LabelOptions = {},
): Labels {
  const layer = document.createElement('div');
  layer.className = 'body-labels';
  container.append(layer);

  const rank = (id: BodyId): number => {
    const i = PRIORITY.indexOf(id);
    return i < 0 ? PRIORITY.length : i;
  };
  const entries = [...bodies.keys()]
    .sort((a, b) => rank(a) - rank(b))
    .map((id) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'body-label';
      el.dataset.body = id;
      el.hidden = true;
      el.addEventListener('click', () => opts.onSelect?.(id));
      layer.append(el);
      return { id, el, text: '', w: 0, h: 0 };
    });

  let visible = true;
  let hovered: BodyId | null = null;
  const pos = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  return {
    setVisible(v) {
      visible = v;
      if (!v) for (const e of entries) e.el.hidden = true;
    },
    setHovered(id) {
      hovered = id;
    },
    update() {
      if (!visible) return;
      const lang = getLang();
      const mobile = opts.isMobile?.() ?? false;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.updateMatrixWorld();
      camera.getWorldPosition(camPos);
      const pxPerUnit = h / 2 / Math.tan((camera.fov * Math.PI) / 360);
      const items: LabelItem[] = [];
      const discs: Disc[] = [];
      const shown = new Map<string, (typeof entries)[number]>();
      for (const e of entries) {
        const body = bodies.get(e.id);
        // A body hidden by the overview boost (the Moon next to Earth) gets no label.
        if (!body || !body.tiltGroup.visible) {
          e.el.hidden = true;
          continue;
        }
        body.mesh.getWorldPosition(pos);
        const dist = pos.distanceTo(camPos);
        pos.project(camera);
        if (pos.z > 1 || pos.z < -1) {
          e.el.hidden = true;
          continue;
        }
        const x = ((pos.x + 1) / 2) * w;
        const y = ((1 - pos.y) / 2) * h;
        const r = ((body.radius * body.tiltGroup.scale.x) / Math.max(dist, 1e-6)) * pxPerUnit;
        // Every body on screen is an obstacle, labelled or not.
        discs.push({ id: e.id, x, y, r });
        const wanted = mobile || ALWAYS_VISIBLE.has(e.id) || hovered === e.id;
        if (!wanted) {
          e.el.hidden = true;
          continue;
        }
        const text = getContent(e.id, lang).name;
        if (text !== e.text) {
          e.text = text;
          e.el.textContent = text;
          e.w = 0;
        }
        if (e.w === 0) {
          // Measured once per text change (jsdom reports 0: such labels never collide).
          e.el.hidden = false;
          e.w = e.el.offsetWidth;
          e.h = e.el.offsetHeight;
        }
        const item = { id: e.id, x, y, w: e.w, h: e.h, r };
        if (hovered === e.id) items.unshift(item);
        else items.push(item);
        shown.set(e.id, e);
      }
      const placed = placeLabels(items, discs, w);
      for (const [id, e] of shown) {
        const p = placed.get(id);
        e.el.hidden = !p;
        if (p) e.el.style.transform = `translate(${p.left}px, ${p.top}px)`;
      }
    },
  };
}
