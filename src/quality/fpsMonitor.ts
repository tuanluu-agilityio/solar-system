export interface FpsMonitor {
  sample(dtMs: number): 'downgrade' | null;
  reset(): void;
}

export function createFpsMonitor(
  opts: { thresholdFps?: number; windowMs?: number } = {},
): FpsMonitor {
  const thresholdFps = opts.thresholdFps ?? 30;
  const windowMs = opts.windowMs ?? 3000;
  let elapsed = 0;
  let frames = 0;
  let fired = false;

  return {
    sample(dtMs) {
      if (fired) return null;
      elapsed += dtMs;
      frames += 1;
      if (elapsed < windowMs) return null;
      const avgFps = (frames * 1000) / elapsed;
      elapsed = 0;
      frames = 0;
      if (avgFps < thresholdFps) {
        fired = true;
        return 'downgrade';
      }
      return null;
    },
    reset() {
      elapsed = 0;
      frames = 0;
      fired = false;
    },
  };
}
