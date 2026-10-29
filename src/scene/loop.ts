const MAX_DT = 0.1;

export function startLoop(tick: (dtSec: number, tSec: number) => void): { stop(): void } {
  let raf = 0;
  let last: number | null = null;
  let stopped = false;

  const frame = (nowMs: number): void => {
    raf = 0;
    if (stopped || document.hidden) return;
    const t = nowMs / 1000;
    const dt = last === null ? 0 : Math.min(t - last, MAX_DT);
    last = t;
    try {
      tick(dt, t);
    } finally {
      if (!stopped && !document.hidden && raf === 0) raf = requestAnimationFrame(frame);
    }
  };
  const onVisibility = (): void => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else if (!stopped && raf === 0) {
      last = null; // avoid a huge dt after resuming
      raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  if (!document.hidden) raf = requestAnimationFrame(frame);
  return {
    stop() {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
