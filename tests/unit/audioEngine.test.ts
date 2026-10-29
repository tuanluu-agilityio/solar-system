import { describe, expect, it, vi } from 'vitest';
import {
  AMBIENT_DUCKED_GAIN,
  AMBIENT_GAIN,
  DUCK_RAMP_S,
  NARRATION_LOAD_TIMEOUT_MS,
  createAudioEngine,
} from '../../src/audio/audioEngine';
import { nextShimmer, pinkNoise } from '../../src/audio/ambient';
import { WHOOSH_DURATION_S } from '../../src/audio/whoosh';

// Hand-written minimal fake of the Web Audio API: just enough surface for the engine,
// recording every automation event so the tests can check what was scheduled.

type Event = { type: string; value: number; time: number };

class FakeParam {
  events: Event[] = [];
  constructor(public value = 0) {}
  setValueAtTime(value: number, time: number) {
    this.events.push({ type: 'set', value, time });
    return this;
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.events.push({ type: 'linear', value, time });
    return this;
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    this.events.push({ type: 'exp', value, time });
    return this;
  }
  setTargetAtTime(value: number, time: number) {
    this.events.push({ type: 'target', value, time });
    return this;
  }
  cancelScheduledValues(time: number) {
    this.events.push({ type: 'cancel', value: Number.NaN, time });
    return this;
  }
  /** The value the last ramp (or set) heads to. */
  get target(): number | undefined {
    return this.events.filter((e) => e.type !== 'cancel').at(-1)?.value;
  }
  get lastRamp(): Event | undefined {
    return this.events.filter((e) => e.type === 'linear').at(-1);
  }
}

class FakeNode {
  connections: unknown[] = [];
  constructor(public kind: string) {}
  connect(dest: unknown) {
    this.connections.push(dest);
    return dest;
  }
  disconnect() {
    this.connections = [];
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam(1);
  constructor() {
    super('gain');
  }
}

class FakeSource extends FakeNode {
  frequency = new FakeParam(440);
  detune = new FakeParam(0);
  type = 'sine';
  buffer: unknown = null;
  loop = false;
  started = false;
  stopped = false;
  onended: (() => void) | null = null;
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
}

class FakeFilter extends FakeNode {
  frequency = new FakeParam(350);
  Q = new FakeParam(1);
  type = 'lowpass';
  constructor() {
    super('filter');
  }
}

class FakeContext {
  currentTime = 0;
  sampleRate = 8000;
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  destination = new FakeNode('destination');
  gains: FakeGain[] = [];
  sources: FakeSource[] = [];
  filters: FakeFilter[] = [];
  mediaSources: FakeNode[] = [];
  resumeCalls = 0;
  resume() {
    this.resumeCalls++;
    this.state = 'running';
    return Promise.resolve();
  }
  createGain() {
    const g = new FakeGain();
    this.gains.push(g);
    return g;
  }
  createOscillator() {
    const s = new FakeSource('oscillator');
    this.sources.push(s);
    return s;
  }
  createBufferSource() {
    const s = new FakeSource('buffer');
    this.sources.push(s);
    return s;
  }
  createBiquadFilter() {
    const f = new FakeFilter();
    this.filters.push(f);
    return f;
  }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { length, getChannelData: () => data };
  }
  createMediaElementSource() {
    const n = new FakeNode('media');
    this.mediaSources.push(n);
    return n;
  }
  get master(): FakeGain {
    const m = this.gains.find((g) => g.connections.includes(this.destination));
    if (!m) throw new Error('no master');
    return m;
  }
  /** Buses are the gains wired straight into the master gain. */
  get buses(): FakeGain[] {
    const m = this.master;
    return this.gains.filter((g) => g.connections.includes(m));
  }
  get ambientBus(): FakeGain {
    const b = this.buses.find((g) => g.gain.value === AMBIENT_GAIN);
    if (!b) throw new Error('no ambient bus');
    return b;
  }
}

class FakeAudio extends EventTarget {
  src = '';
  currentTime = 0;
  paused = true;
  playCalls = 0;
  rejectPlay = false;
  play(): Promise<void> {
    this.playCalls++;
    if (this.rejectPlay) return Promise.reject(new Error('NotAllowedError'));
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  fire(type: string) {
    this.dispatchEvent(new Event(type));
  }
}

function setup() {
  const ctx = new FakeContext();
  const audio = new FakeAudio();
  let created = 0;
  const engine = createAudioEngine(
    () => {
      created++;
      return ctx as unknown as AudioContext;
    },
    () => audio as unknown as HTMLAudioElement,
  );
  return { ctx, audio, engine, created: () => created };
}

describe('AudioEngine unlock and mute', () => {
  it('creates nothing before unlock and keeps the context muted by default', async () => {
    const { ctx, engine, created } = setup();
    engine.playWhoosh();
    expect(created()).toBe(0);
    await engine.unlock();
    expect(created()).toBe(1);
    expect(ctx.state).toBe('running');
    expect(ctx.master.gain.target).toBe(0);
    // Graph: three buses feed the master gain.
    expect(ctx.buses).toHaveLength(3);
  });

  it('is idempotent: one context, resumed again only when suspended', async () => {
    const { ctx, engine, created } = setup();
    await engine.unlock();
    await engine.unlock();
    expect(created()).toBe(1);
    expect(ctx.resumeCalls).toBe(1);
    ctx.state = 'suspended';
    await engine.unlock();
    expect(ctx.resumeCalls).toBe(2);
  });

  it('setMuted(false) ramps the master gain to 1 over 0.2 s and starts the ambient once', async () => {
    const { ctx, engine } = setup();
    await engine.unlock();
    ctx.currentTime = 5;
    const before = ctx.sources.length;
    engine.setMuted(false);
    expect(ctx.master.gain.lastRamp).toEqual({ type: 'linear', value: 1, time: 5.2 });
    const ambientSources = ctx.sources.length - before;
    expect(ambientSources).toBeGreaterThan(0);
    expect(ctx.sources.slice(before).every((s) => s.started)).toBe(true);
    engine.setMuted(true);
    expect(ctx.master.gain.lastRamp).toEqual({ type: 'linear', value: 0, time: 5.2 });
    engine.setMuted(false);
    expect(ctx.sources.length - before).toBe(ambientSources);
  });

  it('applies an unmute requested before unlock once the context exists', async () => {
    const { ctx, engine } = setup();
    engine.setMuted(false);
    await engine.unlock();
    expect(ctx.master.gain.target).toBe(1);
    expect(ctx.sources.some((s) => s.started)).toBe(true);
  });

  it('survives a missing Web Audio implementation', async () => {
    const engine = createAudioEngine(() => {
      throw new Error('no AudioContext');
    });
    await expect(engine.unlock()).resolves.toBeUndefined();
    engine.setMuted(false);
    engine.playWhoosh();
    await expect(engine.playNarration('x.mp3')).resolves.toBe('error');
  });
});

describe('AudioEngine whoosh', () => {
  it('plays a swept band-pass noise burst into a bus when unmuted', async () => {
    const { ctx, engine } = setup();
    await engine.unlock();
    engine.setMuted(false);
    const before = ctx.sources.length;
    engine.playWhoosh();
    const burst = ctx.sources.slice(before);
    expect(burst).toHaveLength(1);
    expect(burst[0]?.kind).toBe('buffer');
    expect(burst[0]?.started).toBe(true);
    const band = ctx.filters.at(-1);
    expect(band?.type).toBe('bandpass');
    const freqs = band?.frequency.events.map((e) => e.value);
    expect(freqs).toEqual([300, 2000, 400]);
    expect(band?.frequency.events.at(-1)?.time).toBeCloseTo(WHOOSH_DURATION_S);
  });

  it('is silent (creates nothing) while muted', async () => {
    const { ctx, engine } = setup();
    await engine.unlock();
    const before = ctx.sources.length;
    engine.playWhoosh();
    expect(ctx.sources.length).toBe(before);
  });
});

describe('AudioEngine narration and ducking', () => {
  it('ducks the ambient bus while narration plays and restores it on ended', async () => {
    const { ctx, audio, engine } = setup();
    await engine.unlock();
    engine.setMuted(false);
    ctx.currentTime = 10;
    const done = engine.playNarration('a.mp3');
    expect(audio.src).toBe('a.mp3');
    expect(audio.playCalls).toBe(1);
    expect(ctx.mediaSources).toHaveLength(1);
    expect(ctx.ambientBus.gain.lastRamp).toEqual({
      type: 'linear',
      value: AMBIENT_DUCKED_GAIN,
      time: 10 + DUCK_RAMP_S,
    });
    audio.currentTime = 1.5;
    expect(engine.narrationTimeMs).toBe(1500);
    ctx.currentTime = 20;
    audio.fire('ended');
    await expect(done).resolves.toBe('ended');
    expect(ctx.ambientBus.gain.lastRamp).toEqual({
      type: 'linear',
      value: AMBIENT_GAIN,
      time: 20 + DUCK_RAMP_S,
    });
    expect(engine.narrationTimeMs).toBe(0);
  });

  it('resolves error on the error event and restores the ambient gain', async () => {
    const { ctx, audio, engine } = setup();
    await engine.unlock();
    const done = engine.playNarration('missing.mp3');
    audio.fire('error');
    await expect(done).resolves.toBe('error');
    expect(ctx.ambientBus.gain.lastRamp?.value).toBe(AMBIENT_GAIN);
  });

  it('resolves error when play() is rejected', async () => {
    const { ctx, audio, engine } = setup();
    await engine.unlock();
    audio.rejectPlay = true;
    await expect(engine.playNarration('a.mp3')).resolves.toBe('error');
    expect(ctx.ambientBus.gain.lastRamp?.value).toBe(AMBIENT_GAIN);
  });

  it('resolves error after the load timeout when playback never starts', async () => {
    vi.useFakeTimers();
    try {
      const { ctx, engine } = setup();
      await engine.unlock();
      const done = engine.playNarration('slow.mp3');
      vi.advanceTimersByTime(NARRATION_LOAD_TIMEOUT_MS - 1);
      expect(ctx.ambientBus.gain.lastRamp?.value).toBe(AMBIENT_DUCKED_GAIN);
      vi.advanceTimersByTime(1);
      await expect(done).resolves.toBe('error');
      expect(ctx.ambientBus.gain.lastRamp?.value).toBe(AMBIENT_GAIN);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not time out once playback has started', async () => {
    vi.useFakeTimers();
    try {
      const { audio, engine } = setup();
      await engine.unlock();
      const done = engine.playNarration('a.mp3');
      audio.fire('playing');
      vi.advanceTimersByTime(NARRATION_LOAD_TIMEOUT_MS * 2);
      let settled = false;
      void done.then(() => (settled = true));
      await Promise.resolve();
      await Promise.resolve();
      expect(settled).toBe(false);
      audio.fire('ended');
      await expect(done).resolves.toBe('ended');
    } finally {
      vi.useRealTimers();
    }
  });

  it('stopNarration pauses, resolves stopped and restores the gain', async () => {
    const { ctx, audio, engine } = setup();
    await engine.unlock();
    const done = engine.playNarration('a.mp3');
    engine.stopNarration();
    expect(audio.paused).toBe(true);
    await expect(done).resolves.toBe('stopped');
    expect(ctx.ambientBus.gain.lastRamp?.value).toBe(AMBIENT_GAIN);
    // A late event from the stopped clip must not affect anything.
    audio.fire('ended');
    expect(engine.narrationTimeMs).toBe(0);
  });

  it('a new narration stops the previous one and reuses the element and source node', async () => {
    const { ctx, audio, engine } = setup();
    await engine.unlock();
    const first = engine.playNarration('a.mp3');
    const second = engine.playNarration('b.mp3');
    await expect(first).resolves.toBe('stopped');
    expect(audio.src).toBe('b.mp3');
    expect(ctx.mediaSources).toHaveLength(1);
    expect(ctx.ambientBus.gain.lastRamp?.value).toBe(AMBIENT_DUCKED_GAIN);
    audio.fire('ended');
    await expect(second).resolves.toBe('ended');
  });

  it('resolves error without touching the element before unlock (no un-gained playback)', async () => {
    const { audio, engine } = setup();
    await expect(engine.playNarration('a.mp3')).resolves.toBe('error');
    expect(audio.playCalls).toBe(0);
  });
});

describe('ambient helpers', () => {
  it('pinkNoise stays within [-1, 1] and is not silent', () => {
    let seed = 1;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const data = pinkNoise(4000, rand);
    expect(data).toHaveLength(4000);
    expect(Math.max(...data)).toBeLessThanOrEqual(1);
    expect(Math.min(...data)).toBeGreaterThanOrEqual(-1);
    expect(Math.max(...data.map(Math.abs))).toBeGreaterThan(0.1);
  });

  it('nextShimmer picks a 4-9 s gap and a 2-6 kHz ping', () => {
    for (const r of [0, 0.5, 0.999]) {
      const s = nextShimmer(() => r);
      expect(s.delayS).toBeGreaterThanOrEqual(4);
      expect(s.delayS).toBeLessThanOrEqual(9);
      expect(s.freq).toBeGreaterThanOrEqual(2000);
      expect(s.freq).toBeLessThanOrEqual(6000);
    }
  });
});
