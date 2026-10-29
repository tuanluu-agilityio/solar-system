import * as THREE from 'three';
import type { BodyObject } from '../bodies/planet';
import { getContent } from '../data/content';
import type { BodyId, Lang } from '../data/types';

/** Labels shown in overview on every device. */
const ALWAYS_VISIBLE: ReadonlySet<BodyId> = new Set([
  'mercury',
  'venus',
  'earth',
  'mars',
  'moon',
  'pluto',
]);

export interface LabelOptions {
  onSelect?: (id: BodyId) => void;
  /** Mobile shows every label; desktop shows the always-set plus the hovered body. */
  isMobile?: () => boolean;
}

export interface Labels {
  update(): void;
  setVisible(v: boolean): void;
  setHovered(id: BodyId | null): void;
}

/** HTML labels positioned each frame by projecting the body's world position. */
export function createLabels(
  container: HTMLElement,
  bodies: Map<BodyId, BodyObject>,
  camera: THREE.Camera,
  getLang: () => Lang,
  opts: LabelOptions = {},
): Labels {
  const layer = document.createElement('div');
  layer.className = 'body-labels';
  container.append(layer);

  const entries = [...bodies.keys()].map((id) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'body-label';
    el.dataset.body = id;
    el.hidden = true;
    el.addEventListener('click', () => opts.onSelect?.(id));
    layer.append(el);
    return { id, el, text: '' };
  });

  let visible = true;
  let hovered: BodyId | null = null;
  const pos = new THREE.Vector3();

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
      for (const e of entries) {
        const body = bodies.get(e.id);
        const wanted = mobile || ALWAYS_VISIBLE.has(e.id) || hovered === e.id;
        if (!body || !wanted) {
          e.el.hidden = true;
          continue;
        }
        body.mesh.getWorldPosition(pos);
        pos.project(camera);
        if (pos.z > 1 || pos.z < -1) {
          e.el.hidden = true;
          continue;
        }
        const text = getContent(e.id, lang).name;
        if (text !== e.text) {
          e.text = text;
          e.el.textContent = text;
        }
        e.el.hidden = false;
        e.el.style.transform = `translate(${((pos.x + 1) / 2) * w}px, ${((1 - pos.y) / 2) * h}px) translate(-50%, 0)`;
      }
    },
  };
}
