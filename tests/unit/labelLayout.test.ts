import { describe, expect, it } from 'vitest';
import { LABEL_GAP_PX, placeLabels, type LabelItem } from '../../src/ui/labelLayout';

const item = (id: string, x: number, y: number, w = 40, r = 3, h = 16): LabelItem => ({
  id,
  x,
  y,
  w,
  h,
  r,
});

type Rect = { left: number; top: number; w: number; h: number };
const overlaps = (a: Rect, b: Rect): boolean =>
  a.left < b.left + b.w && b.left < a.left + a.w && a.top < b.top + b.h && b.top < a.top + a.h;

describe('placeLabels', () => {
  it('puts a lone label centred just below its body', () => {
    const out = placeLabels([item('earth', 100, 50, 40, 5)]);
    expect(out.get('earth')).toEqual({ left: 80, top: 50 + 5 + LABEL_GAP_PX });
  });

  it('keeps far-apart labels', () => {
    const out = placeLabels([item('a', 100, 100), item('b', 300, 100)]);
    expect([...out.keys()]).toEqual(['a', 'b']);
  });

  it('moves a colliding label above its body when that is free', () => {
    const out = placeLabels([item('a', 100, 100), item('b', 110, 105)]);
    const b = out.get('b');
    expect(b).toBeDefined();
    expect(b!.top).toBeLessThan(105);
  });

  it('tries below, above, right, then left, and drops a label when all four are taken', () => {
    const items = ['a', 'b', 'c', 'd', 'e'].map((id) => item(id, 100, 100, 40, 20));
    const out = placeLabels(items);
    expect(out.get('a')!.top).toBeGreaterThan(100);
    expect(out.get('b')!.top).toBeLessThan(100);
    expect(out.get('c')!.left).toBeGreaterThan(100);
    expect(out.get('d')!.left + 40).toBeLessThan(100);
    expect(out.has('e')).toBe(false);
  });

  it('never returns two overlapping labels (dense cluster around the Sun)', () => {
    const items: LabelItem[] = [];
    for (let i = 0; i < 11; i++) {
      const a = i * 0.9;
      items.push(item(`b${i}`, 200 + Math.cos(a) * (10 + i * 6), 300 + Math.sin(a) * 5 * i, 50));
    }
    const out = placeLabels(items);
    const rects = [...out.entries()].map(([id, p]) => {
      const it = items.find((x) => x.id === id)!;
      return { left: p.left, top: p.top, w: it.w, h: it.h };
    });
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) expect(overlaps(rects[i]!, rects[j]!)).toBe(false);
    expect(out.size).toBeGreaterThan(1);
    // Priority order wins: the first item is always placed.
    expect(out.has('b0')).toBe(true);
  });

  it('zero-sized (unmeasured) labels never collide', () => {
    const out = placeLabels([item('a', 10, 10, 0, 1, 0), item('b', 10, 10, 0, 1, 0)]);
    expect(out.size).toBe(2);
  });

  it('does not cover another body: a label whose slot hides a disc moves or drops', () => {
    // Body b sits right under a's label slot.
    const discs = [
      { id: 'a', x: 100, y: 100, r: 3 },
      { id: 'b', x: 100, y: 112, r: 4 },
    ];
    const out = placeLabels([item('a', 100, 100)], discs);
    expect(out.get('a')!.top).toBeLessThan(100);
  });

  it('ignores its own disc', () => {
    const out = placeLabels([item('a', 100, 100, 40, 30)], [{ id: 'a', x: 100, y: 100, r: 30 }]);
    expect(out.get('a')).toEqual({ left: 80, top: 100 + 30 + LABEL_GAP_PX });
  });

  it('keeps a label inside the view horizontally', () => {
    const out = placeLabels([item('pluto', 385, 100, 40), item('left', 5, 300, 40)], [], 390);
    expect(out.get('pluto')!.left).toBe(350);
    expect(out.get('left')!.left).toBe(0);
  });
});
