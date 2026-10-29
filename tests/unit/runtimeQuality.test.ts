import { describe, expect, it, vi } from 'vitest';
import {
  createRuntimeQuality,
  effectivePixelRatio,
  isSoftwareRenderer,
} from '../../src/quality/runtime';
import { createFpsMonitor } from '../../src/quality/fpsMonitor';
import type { QualityTier } from '../../src/quality/tiers';

describe('isSoftwareRenderer', () => {
  it('detects SwiftShader, llvmpipe and Software', () => {
    expect(isSoftwareRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))')).toBe(true);
    expect(isSoftwareRenderer('llvmpipe (LLVM 15)')).toBe(true);
    expect(isSoftwareRenderer('Microsoft Basic Render Driver Software')).toBe(true);
  });
  it('is false for real GPUs and unknown', () => {
    expect(isSoftwareRenderer('ANGLE (NVIDIA, GeForce RTX 3060)')).toBe(false);
    expect(isSoftwareRenderer(null)).toBe(false);
    expect(isSoftwareRenderer('')).toBe(false);
  });
});

describe('effectivePixelRatio', () => {
  it('caps by tier and tolerates bad dpr', () => {
    expect(effectivePixelRatio(3, 1.5)).toBe(1.5);
    expect(effectivePixelRatio(3, 2)).toBe(2);
    expect(effectivePixelRatio(1, 2)).toBe(1);
    expect(effectivePixelRatio(0, 2)).toBe(1);
    expect(effectivePixelRatio(Number.NaN, 2)).toBe(1);
  });
});

function setup(tier: QualityTier, software = false) {
  let current = tier;
  const onDowngrade = vi.fn((t: QualityTier) => {
    current = t;
  });
  const rq = createRuntimeQuality({
    monitor: createFpsMonitor({ windowMs: 1000 }),
    software,
    getTier: () => current,
    onDowngrade,
  });
  return { rq, onDowngrade };
}
const SLOW = 100; // 10 fps
const run = (
  rq: ReturnType<typeof setup>['rq'],
  n: number,
  ctx = { visible: true, transitioning: false },
) => {
  let out: QualityTier | null = null;
  for (let i = 0; i < n; i++) out = rq.frame(SLOW, ctx) ?? out;
  return out;
};

describe('runtime quality', () => {
  it('downgrades one tier per slow window and keeps going to the floor', () => {
    const { rq, onDowngrade } = setup('high');
    expect(run(rq, 10)).toBe('medium');
    expect(run(rq, 10)).toBe('low');
    expect(run(rq, 30)).toBeNull();
    expect(onDowngrade.mock.calls.map((c) => c[0])).toEqual(['medium', 'low']);
  });
  it('never samples with software rendering', () => {
    const { rq, onDowngrade } = setup('high', true);
    expect(run(rq, 100)).toBeNull();
    expect(onDowngrade).not.toHaveBeenCalled();
  });
  it('ignores hidden tabs and camera transitions', () => {
    const { rq, onDowngrade } = setup('high');
    expect(run(rq, 50, { visible: false, transitioning: false })).toBeNull();
    expect(run(rq, 50, { visible: true, transitioning: true })).toBeNull();
    expect(onDowngrade).not.toHaveBeenCalled();
  });
  it('a transition resets the partial window', () => {
    const { rq } = setup('high');
    run(rq, 9); // 900 ms of slow frames
    run(rq, 1, { visible: true, transitioning: true });
    expect(run(rq, 9)).toBeNull(); // would have fired at the 10th frame otherwise
    expect(run(rq, 1)).toBe('medium');
  });
  it('manual downgrade stops at low', () => {
    const { rq } = setup('medium');
    expect(rq.downgrade()).toBe('low');
    expect(rq.downgrade()).toBeNull();
  });
});
