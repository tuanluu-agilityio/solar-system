import { startAmbient } from './ambient';
import { playWhoosh as whooshInto } from './whoosh';

// Audio engine (spec §3.7). Everything is routed through Web Audio GainNodes:
// master -> destination; ambientBus, sfxBus, narrationBus -> master.
// Narration uses one reused HTMLAudioElement through a MediaElementAudioSourceNode,
// because iOS Safari ignores HTMLAudioElement.volume (never set here).

export const AMBIENT_GAIN = 0.22;
export const AMBIENT_DUCKED_GAIN = 0.06;
export const NARRATION_GAIN = 1.0;
export const WHOOSH_GAIN = 0.35;
export const DUCK_RAMP_S = 0.6;
export const MUTE_RAMP_S = 0.2;
export const NARRATION_LOAD_TIMEOUT_MS = 8000;

export type NarrationResult = 'ended' | 'stopped' | 'error';

export interface AudioEngine {
  /** Creates/resumes the AudioContext; idempotent; call from a user gesture. */
  unlock(): Promise<void>;
  /** Master gain 0/1 with a 0.2 s ramp; the ambient starts on the first unmute. */
  setMuted(m: boolean): void;
  playWhoosh(): void;
  playNarration(url: string): Promise<NarrationResult>;
  stopNarration(): void;
  /** Current narration playback position, 0 when idle. */
  readonly narrationTimeMs: number;
}

interface Graph {
  ctx: AudioContext;
  master: GainNode;
  ambientBus: GainNode;
  sfxBus: GainNode;
  narrationBus: GainNode;
}

/** Cancels pending automation and ramps linearly from the current value to `value`. */
function rampTo(ctx: AudioContext, param: AudioParam, value: number, seconds: number): void {
  const now = ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(value, now + seconds);
}

function bus(ctx: AudioContext, gain: number, out: AudioNode): GainNode {
  const g = ctx.createGain();
  g.gain.value = gain;
  g.connect(out);
  return g;
}

export function createAudioEngine(
  ctxFactory: () => AudioContext = () => new AudioContext(),
  audioFactory: () => HTMLAudioElement = () => new Audio(),
): AudioEngine {
  let graph: Graph | null = null;
  let failed = false;
  let muted = true;
  let ambientStarted = false;
  let element: HTMLAudioElement | null = null;
  // Settles the narration in flight, if any.
  let finishNarration: ((r: NarrationResult) => void) | null = null;

  const build = (): Graph | null => {
    if (graph || failed) return graph;
    try {
      const ctx = ctxFactory();
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      graph = {
        ctx,
        master,
        ambientBus: bus(ctx, AMBIENT_GAIN, master),
        sfxBus: bus(ctx, WHOOSH_GAIN, master),
        narrationBus: bus(ctx, NARRATION_GAIN, master),
      };
    } catch (err) {
      // No Web Audio (very old browser or blocked): the app runs silent.
      console.warn('Web Audio unavailable', err);
      failed = true;
    }
    return graph;
  };

  const applyMuted = (): void => {
    if (!graph) return;
    rampTo(graph.ctx, graph.master.gain, muted ? 0 : 1, MUTE_RAMP_S);
    if (!muted && !ambientStarted) {
      ambientStarted = true;
      startAmbient(graph.ctx, graph.ambientBus);
    }
  };

  const duck = (on: boolean): void => {
    if (!graph) return;
    rampTo(graph.ctx, graph.ambientBus.gain, on ? AMBIENT_DUCKED_GAIN : AMBIENT_GAIN, DUCK_RAMP_S);
  };

  return {
    unlock() {
      const hadGraph = graph !== null;
      const g = build();
      if (!g) return Promise.resolve();
      if (!hadGraph) applyMuted();
      if (g.ctx.state === 'running') return Promise.resolve();
      // resume() runs synchronously inside the gesture; only its settling is awaited.
      return g.ctx.resume().catch((err: unknown) => {
        console.warn('AudioContext resume failed', err);
      });
    },

    setMuted(m) {
      muted = m;
      applyMuted();
    },

    playWhoosh() {
      if (!graph || muted) return;
      whooshInto(graph.ctx, graph.sfxBus);
    },

    playNarration(url) {
      finishNarration?.('stopped');
      // Before unlock there is no gain stage: never play the element un-gained.
      if (!graph) return Promise.resolve('error');
      const g = graph;
      if (!element) {
        element = audioFactory();
        element.preload = 'auto';
        g.ctx.createMediaElementSource(element).connect(g.narrationBus);
      }
      const el = element;
      return new Promise<NarrationResult>((resolve) => {
        // Load timeout: cleared once playback actually starts.
        const timer = setTimeout(() => finish('error'), NARRATION_LOAD_TIMEOUT_MS);
        const onPlaying = (): void => clearTimeout(timer);
        const onEnded = (): void => finish('ended');
        const onError = (): void => finish('error');
        const finish = (r: NarrationResult): void => {
          if (finishNarration !== finish) return;
          finishNarration = null;
          clearTimeout(timer);
          el.removeEventListener('playing', onPlaying);
          el.removeEventListener('ended', onEnded);
          el.removeEventListener('error', onError);
          if (r !== 'ended') el.pause();
          duck(false);
          resolve(r);
        };
        finishNarration = finish;
        el.addEventListener('playing', onPlaying);
        el.addEventListener('ended', onEnded);
        el.addEventListener('error', onError);
        duck(true);
        el.src = url;
        el.currentTime = 0;
        el.play().catch(() => finish('error'));
      });
    },

    stopNarration() {
      finishNarration?.('stopped');
    },

    get narrationTimeMs() {
      return finishNarration && element ? element.currentTime * 1000 : 0;
    },
  };
}
