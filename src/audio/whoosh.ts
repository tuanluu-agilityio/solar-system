// Fly-to "whoosh" (spec §3.7): a band-pass noise burst swept 300 -> 2000 -> 400 Hz.

export const WHOOSH_DURATION_S = 1.2;
const PEAK_AT_S = 0.45;

const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>();

function whiteNoise(ctx: AudioContext): AudioBuffer {
  const cached = noiseBuffers.get(ctx);
  if (cached) return cached;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * WHOOSH_DURATION_S), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffers.set(ctx, buffer);
  return buffer;
}

/** Plays one whoosh into `out` (the sfx bus sets its level). */
export function playWhoosh(ctx: AudioContext, out: AudioNode): void {
  const t = ctx.currentTime;
  const end = t + WHOOSH_DURATION_S;
  const src = ctx.createBufferSource();
  src.buffer = whiteNoise(ctx);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 1.2;
  band.frequency.setValueAtTime(300, t);
  band.frequency.exponentialRampToValueAtTime(2000, t + PEAK_AT_S);
  band.frequency.exponentialRampToValueAtTime(400, end);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(1, t + PEAK_AT_S);
  env.gain.exponentialRampToValueAtTime(0.0001, end);
  src.connect(band).connect(env).connect(out);
  src.onended = () => env.disconnect();
  src.start(t);
  src.stop(end);
}
