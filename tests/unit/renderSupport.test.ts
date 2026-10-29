import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
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

describe('sky', () => {
  it('is visible from inside: front faces point toward the centre, depthWrite off', async () => {
    const { createSky, SKY_RADIUS } = await import('../../src/scene/sky');
    const sky = createSky(new THREE.Texture());
    const mat = sky.material as THREE.MeshBasicMaterial;
    expect(mat.side).toBe(THREE.FrontSide);
    expect(mat.depthWrite).toBe(false);
    const pos = sky.geometry.getAttribute('position');
    const idx = sky.geometry.getIndex();
    const tri = idx ? [idx.getX(30), idx.getX(31), idx.getX(32)] : [30 * 3, 30 * 3 + 1, 30 * 3 + 2];
    const [a, b, c] = tri.map((i) => new THREE.Vector3().fromBufferAttribute(pos, i)) as [
      THREE.Vector3,
      THREE.Vector3,
      THREE.Vector3,
    ];
    const n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
    const centroid = a.clone().add(b).add(c).divideScalar(3);
    expect(a.length()).toBeCloseTo(SKY_RADIUS, 0);
    expect(n.dot(centroid)).toBeLessThan(0); // front-face normal points inward
  });
});

describe('fallback textures', () => {
  it('makes a 2x2 sRGB texture holding the exact base colour bytes', async () => {
    const { makeFallbackTexture } = await import('../../src/scene/textures');
    const tex = makeFallbackTexture('mars');
    expect(tex.image.width).toBe(2);
    expect(tex.image.height).toBe(2);
    expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
    const d = tex.image.data as Uint8Array;
    expect([d[0], d[1], d[2], d[3]]).toEqual([0xc1, 0x57, 0x2e, 255]);
    expect(d.length).toBe(16);
  });

  it('loadTextureSet falls back with a warning instead of throwing', async () => {
    const { loadTextureSet } = await import('../../src/scene/textures');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const progress: Array<[number, number]> = [];
    const out = await loadTextureSet('low', ['mars', 'jupiter'], (l, t) => progress.push([l, t]));
    expect(out.size).toBe(2);
    expect((out.get('mars')?.image as { width: number }).width).toBe(2);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(progress.at(-1)).toEqual([2, 2]);
    vi.unstubAllGlobals();
    warn.mockRestore();
  });
});
