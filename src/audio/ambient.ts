// Procedural ambient space drone (spec §3.7): no audio files, loops until stopped.
// Two detuned low drones through an LFO-swept lowpass, a bed of filtered pink noise,
// and sparse high "shimmer" pings.

const DRONE_GAIN = 0.22;
const NOISE_GAIN = 0.035;
const SHIMMER_PEAK = 0.03;
const LFO_HZ = 0.03;
const FILTER_MIN_HZ = 200;
const FILTER_MAX_HZ = 700;
const NOISE_SECONDS = 4;

/** Pink noise (Paul Kellet's economy filter), normalised to [-1, 1]. */
export function pinkNoise(length: number, random: () => number = Math.random): Float32Array {
  const out = new Float32Array(length);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let peak = 0;
  for (let i = 0; i < length; i++) {
    const white = random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    const v = b0 + b1 + b2 + white * 0.1848;
    out[i] = v;
    peak = Math.max(peak, Math.abs(v));
  }
  if (peak > 0) for (let i = 0; i < length; i++) out[i] = (out[i] ?? 0) / peak;
  return out;
}

/** The next shimmer ping: a 4-9 s gap and a 2-6 kHz pitch. */
export function nextShimmer(random: () => number = Math.random): { delayS: number; freq: number } {
  return { delayS: 4 + random() * 5, freq: 2000 + random() * 4000 };
}

/** Starts the ambient into `out`; returns a function that stops it. */
export function startAmbient(ctx: AudioContext, out: AudioNode): () => void {
  const t = ctx.currentTime;
  const stoppers: (() => void)[] = [];

  // Drones: ~A1 (55 Hz) and ~E2 (82.4 Hz), each a slightly detuned pair for slow beating.
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.Q.value = 0.8;
  lowpass.frequency.value = (FILTER_MIN_HZ + FILTER_MAX_HZ) / 2;
  const droneGain = ctx.createGain();
  droneGain.gain.value = DRONE_GAIN;
  lowpass.connect(droneGain).connect(out);
  const voices: [OscillatorType, number, number][] = [
    ['sine', 55, -6],
    ['sine', 55, 7],
    ['triangle', 82.4, -4],
    ['triangle', 82.4, 5],
  ];
  for (const [type, freq, detune] of voices) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(lowpass);
    osc.start(t);
    stoppers.push(() => osc.stop());
  }

  // LFO sweeps the lowpass cutoff between 200 and 700 Hz.
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = LFO_HZ;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = (FILTER_MAX_HZ - FILTER_MIN_HZ) / 2;
  lfo.connect(lfoDepth).connect(lowpass.frequency);
  lfo.start(t);
  stoppers.push(() => lfo.stop());

  // Pink noise bed, low-passed to a soft rumble.
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * NOISE_SECONDS), ctx.sampleRate);
  buffer.getChannelData(0).set(pinkNoise(buffer.length));
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 500;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = NOISE_GAIN;
  noise.connect(noiseFilter).connect(noiseGain).connect(out);
  noise.start(t);
  stoppers.push(() => noise.stop());

  // Shimmer: sparse high sine pings with a long release.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ping = (freq: number): void => {
    const now = ctx.currentTime;
    const release = 3 + Math.random() * 2;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(SHIMMER_PEAK, now + 0.05);
    env.gain.exponentialRampToValueAtTime(0.0001, now + release);
    osc.connect(env).connect(out);
    osc.onended = () => env.disconnect();
    osc.start(now);
    osc.stop(now + release + 0.05);
  };
  const schedule = (): void => {
    const next = nextShimmer();
    timer = setTimeout(() => {
      ping(next.freq);
      schedule();
    }, next.delayS * 1000);
  };
  schedule();

  return () => {
    clearTimeout(timer);
    for (const stop of stoppers) stop();
  };
}
