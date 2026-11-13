import { describe, expect, it } from 'vitest';
import {
  PLANET_LOOKS,
  SHADER_TIME_WRAP,
  cloudUvOffset,
  driftOffset,
  shaderTime,
  shellLimbCosine,
  type LookBodyId,
} from '../../src/bodies/planetLook';
import { BODY_IDS } from '../../src/data/types';

const ROCKY: LookBodyId[] = ['mercury', 'moon', 'pluto'];
const GIANTS: LookBodyId[] = ['jupiter', 'saturn', 'uranus', 'neptune'];

describe('PLANET_LOOKS', () => {
  it('covers every body except the sun and Earth (which has its own shader)', () => {
    const ids = BODY_IDS.filter((id) => id !== 'sun' && id !== 'earth');
    expect(Object.keys(PLANET_LOOKS).sort()).toEqual([...ids].sort());
  });

  it('gives airless rocky bodies relief, a regolith response and no atmosphere at all', () => {
    for (const id of ROCKY) {
      const l = PLANET_LOOKS[id];
      expect(l.kind, id).toBe('rocky');
      expect(l.relief, id).toBeGreaterThan(0);
      expect(l.lommel, id).toBeGreaterThanOrEqual(0.5);
      expect(l.haze, id).toBeNull();
      expect(l.shell, id).toBeNull();
      expect(l.terminatorTint, id).toBeNull();
      expect(l.flow, id).toBeNull();
      expect(l.terminatorSoftness, id).toBeLessThan(0.05);
    }
  });

  it('gives gas and ice giants no hard relief, limb darkening, haze and a thin shell', () => {
    for (const id of GIANTS) {
      const l = PLANET_LOOKS[id];
      expect(['gas', 'ice'], id).toContain(l.kind);
      expect(l.relief, id).toBe(0);
      expect(l.lommel, id).toBe(0);
      expect(l.minnaert, id).toBeGreaterThan(1);
      expect(l.haze, id).not.toBeNull();
      expect(l.shell!.scale, id).toBeLessThanOrEqual(1.03);
    }
    expect(PLANET_LOOKS.jupiter.flow).not.toBeNull();
    expect(PLANET_LOOKS.saturn.flow).not.toBeNull();
    // Flow offsets stay tiny so the Great Red Spot does not smear.
    expect(PLANET_LOOKS.jupiter.flow!.amount).toBeLessThan(0.005);
    expect(PLANET_LOOKS.uranus.bands).toBeGreaterThan(0);
    expect(PLANET_LOOKS.neptune.streaks).toBeGreaterThan(0);
  });

  it('gives Venus a flowing, drifting cloud deck with a soft terminator and dense glow', () => {
    const v = PLANET_LOOKS.venus;
    expect(v.kind).toBe('cloudDeck');
    expect(v.relief).toBe(0);
    expect(v.flow).not.toBeNull();
    expect(v.drift).toBeGreaterThan(0);
    expect(v.terminatorSoftness).toBeGreaterThanOrEqual(0.1);
    expect(v.shell).toMatchObject({ color: '#ffe9b0', intensity: 0.6, scale: 1.04 });
  });

  it('gives Mars relief, a subtle haze and only a faint blue terminator', () => {
    // Its polar caps come from the map itself.
    const m = PLANET_LOOKS.mars;
    expect(m.relief).toBeGreaterThan(0);
    expect(m.haze!.strength).toBeLessThan(0.5);
    expect(m.terminatorTint!.strength).toBeLessThanOrEqual(0.08);
    expect(m.shell!.scale).toBeLessThan(1.03);
  });

  it('casts a ring shadow only on Saturn', () => {
    for (const [id, l] of Object.entries(PLANET_LOOKS)) {
      expect(l.ringShadow, id).toBe(id === 'saturn');
    }
  });
});

describe('shader clocks', () => {
  it('wraps the shader time and freezes it for reduced motion', () => {
    expect(shaderTime(12.5, false)).toBeCloseTo(12.5);
    expect(shaderTime(SHADER_TIME_WRAP + 3, false)).toBeCloseTo(3);
    expect(shaderTime(-1, false)).toBeCloseTo(SHADER_TIME_WRAP - 1);
    expect(shaderTime(12.5, true)).toBe(0);
    expect(shaderTime(Number.NaN, false)).toBe(0);
  });

  it('turns a drift rate into a [0, 1) offset, frozen for reduced motion', () => {
    expect(driftOffset(0.1, 2.5, false)).toBeCloseTo(0.25);
    expect(driftOffset(0.1, 12.5, false)).toBeCloseTo(0.25);
    expect(driftOffset(-0.1, 2.5, false)).toBeCloseTo(0.75);
    expect(driftOffset(0.1, 2.5, true)).toBe(0);
  });
});

describe('cloudUvOffset', () => {
  it('is zero when the shell turns with the ground and shifts against the extra spin', () => {
    expect(cloudUvOffset(1.3, 1.3)).toBeCloseTo(0);
    expect(cloudUvOffset(0, Math.PI / 2)).toBeCloseTo(0.75);
    expect(cloudUvOffset(0, -Math.PI / 2)).toBeCloseTo(0.25);
    const u = cloudUvOffset(10, 12);
    expect(u).toBeGreaterThanOrEqual(0);
    expect(u).toBeLessThan(1);
  });
});

describe('shellLimbCosine', () => {
  it('matches the back-face n.v at the limb', () => {
    expect(shellLimbCosine(1.04)).toBeCloseTo(0.2746, 3);
    expect(shellLimbCosine(1.025)).toBeCloseTo(0.2195, 3);
    expect(shellLimbCosine(1)).toBe(0);
  });
});
