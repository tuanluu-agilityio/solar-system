import { describe, expect, it } from 'vitest';
import { aggregateProgress, fallbackColor, skyKey, skySet } from '../../src/scene/textureKeys';
import { percent } from '../../src/ui/loadingScreen';
import { installE2EApi, type E2EApi } from '../../src/debug/e2eApi';
import manifest from '../../public/textures/manifest.json';

describe('texture keys', () => {
  it('has a non-default fallback colour for every low-set body texture', () => {
    for (const key of Object.keys(manifest.low).filter((k) => !k.startsWith('sky'))) {
      expect(fallbackColor(key), key).not.toBe(0x808080);
    }
  });
  it('uses a neutral colour for unknown keys and dark for sky', () => {
    expect(fallbackColor('nope')).toBe(0x808080);
    expect(fallbackColor('sky_2048')).toBe(0x02030a);
  });
  it('maps sky sizes to the right set and key, present in the manifest', () => {
    expect(skySet(2048)).toBe('low');
    expect(skySet(4096)).toBe('high');
    expect(skyKey(2048) in manifest.low).toBe(true);
    expect(skyKey(4096) in manifest.high).toBe(true);
  });
});

describe('progress', () => {
  it('aggregates across sources', () => {
    expect(
      aggregateProgress([
        { loaded: 5, total: 10 },
        { loaded: 0, total: 10 },
      ]),
    ).toBe(0.25);
    expect(aggregateProgress([])).toBe(0);
  });
  it('formats percent clamped to 0..100', () => {
    expect(percent(0.456)).toBe(46);
    expect(percent(2)).toBe(100);
    expect(percent(-1)).toBe(0);
    expect(percent(Number.NaN)).toBe(0);
  });
});

describe('installE2EApi', () => {
  const api = {} as E2EApi;
  it('installs only when the query has e2e', () => {
    delete window.__app;
    expect(installE2EApi(api, '?foo=1')).toBe(false);
    expect(window.__app).toBeUndefined();
    expect(installE2EApi(api, '?e2e=1')).toBe(true);
    expect(window.__app).toBe(api);
    delete window.__app;
  });
});
