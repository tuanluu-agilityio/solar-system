import { lowerTier, type QualityTier } from './tiers';
import type { FpsMonitor } from './fpsMonitor';

/** Renderer strings that mean software rasterisation (spec §11.4): FPS says nothing about a phone. */
export function isSoftwareRenderer(rendererName: string | null | undefined): boolean {
  return !!rendererName && /swiftshader|llvmpipe|software/i.test(rendererName);
}

/** Device pixel ratio clamped by the tier's cap (never below 1 for a bogus dpr). */
export function effectivePixelRatio(dpr: number, cap: number): number {
  const d = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  return Math.min(d, cap);
}

export interface FrameContext {
  /** Tab is visible. */
  visible: boolean;
  /** The camera is flying between targets. */
  transitioning: boolean;
}

export interface RuntimeQuality {
  /** Feeds one frame; returns the new tier when it downgraded, otherwise null. */
  frame(dtMs: number, ctx: FrameContext): QualityTier | null;
  /** Downgrades one tier regardless of the monitor (null at the floor). */
  downgrade(): QualityTier | null;
}

export function createRuntimeQuality(deps: {
  monitor: FpsMonitor;
  /** True disables the monitor entirely (software rendering). */
  software: boolean;
  getTier(): QualityTier;
  /** Applies the lower tier (store update + settings); called only on an actual downgrade. */
  onDowngrade(next: QualityTier): void;
}): RuntimeQuality {
  const downgrade = (): QualityTier | null => {
    const current = deps.getTier();
    const next = lowerTier(current);
    if (next === current) return null; // the floor: textured bodies + sun light + bloom
    deps.onDowngrade(next);
    deps.monitor.reset(); // measure the new tier from scratch
    return next;
  };
  return {
    frame(dtMs, ctx) {
      if (deps.software) return null;
      if (!ctx.visible || ctx.transitioning) {
        deps.monitor.reset(); // a window must not span a hitch or a hidden period
        return null;
      }
      return deps.monitor.sample(dtMs) === 'downgrade' ? downgrade() : null;
    },
    downgrade,
  };
}
