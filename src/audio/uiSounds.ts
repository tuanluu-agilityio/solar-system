// Interface sounds: soft, very short sine blips (never noise, never loud). A `tick` for
// buttons and toggles, a slightly rounder two-note `select` for choosing a body.

export type UiSound = 'tick' | 'select';

/** Peak envelope level before the sfx bus; kept low so a tick is a whisper under the whoosh. */
export const UI_PEAK = 0.18;
/** Sounds closer together than this are dropped, so rapid input never builds into a buzz. */
export const UI_MIN_GAP_S = 0.07;

interface Note {
  freq: number;
  at: number;
  dur: number;
}

const NOTES: Record<UiSound, readonly Note[]> = {
  tick: [{ freq: 1320, at: 0, dur: 0.045 }],
  select: [
    { freq: 660, at: 0, dur: 0.07 },
    { freq: 990, at: 0.055, dur: 0.09 },
  ],
};

/** Total length of a sound in seconds. */
export function uiSoundDuration(kind: UiSound): number {
  return Math.max(...NOTES[kind].map((n) => n.at + n.dur));
}

/** Plays one interface sound into `out` (the sfx bus sets the overall level). */
export function playUiSound(ctx: AudioContext, out: AudioNode, kind: UiSound): void {
  const t0 = ctx.currentTime;
  for (const n of NOTES[kind]) {
    const start = t0 + n.at;
    const end = start + n.dur;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(n.freq, start);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(UI_PEAK, start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(env).connect(out);
    osc.onended = () => env.disconnect();
    osc.start(start);
    osc.stop(end + 0.01);
  }
}
