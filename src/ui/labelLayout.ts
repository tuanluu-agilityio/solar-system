// Pure overview label placement (no DOM, no three.js), unit-tested.

/** Space between a body's disc and its label, CSS px. */
export const LABEL_GAP_PX = 3;

export interface LabelItem {
  id: string;
  /** Body centre on screen, CSS px. */
  x: number;
  y: number;
  /** Label box size, CSS px (0 when not measured yet). */
  w: number;
  h: number;
  /** Projected body radius, CSS px. */
  r: number;
}

/** A body's projected disc, CSS px. */
export interface Disc {
  id: string;
  x: number;
  y: number;
  r: number;
}

export interface LabelPlacement {
  left: number;
  top: number;
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const hits = (a: Box, b: Box): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * Greedy declutter: `items` come in priority order; each label tries below its body, then
 * above, right and left of it, and is dropped when all of them collide with an already placed label or cover one of
 * the `discs` (the bodies on screen; a label's own disc never blocks it). Labels are kept
 * inside `[0, viewW]` horizontally.
 */
export function placeLabels(
  items: readonly LabelItem[],
  discs: readonly Disc[] = [],
  viewW = Infinity,
): Map<string, LabelPlacement> {
  const blockers = discs.map((d) => ({
    id: d.id,
    left: d.x - d.r,
    top: d.y - d.r,
    right: d.x + d.r,
    bottom: d.y + d.r,
  }));
  const placed: Box[] = [];
  const out = new Map<string, LabelPlacement>();
  const clampX = (x: number, w: number): number => Math.max(0, Math.min(x, viewW - w));
  for (const it of items) {
    const centreX = clampX(it.x - it.w / 2, it.w);
    const sideY = it.y - it.h / 2;
    const candidates: LabelPlacement[] = [
      { left: centreX, top: it.y + it.r + LABEL_GAP_PX },
      { left: centreX, top: it.y - it.r - LABEL_GAP_PX - it.h },
      { left: clampX(it.x + it.r + LABEL_GAP_PX, it.w), top: sideY },
      { left: clampX(it.x - it.r - LABEL_GAP_PX - it.w, it.w), top: sideY },
    ];
    for (const c of candidates) {
      const box = { left: c.left, top: c.top, right: c.left + it.w, bottom: c.top + it.h };
      if (placed.some((p) => hits(p, box))) continue;
      if (blockers.some((b) => b.id !== it.id && hits(b, box))) continue;
      placed.push(box);
      out.set(it.id, c);
      break;
    }
  }
  return out;
}
