import * as THREE from 'three';
import { fallbackColor } from './textureKeys';

type Manifest = Record<'low' | 'high', Record<string, string>>;
let manifestPromise: Promise<Manifest | null> | null = null;

function fetchManifest(): Promise<Manifest | null> {
  manifestPromise ??= fetch(`${import.meta.env.BASE_URL}textures/manifest.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null))
    .catch(() => null);
  return manifestPromise;
}

/** Keys available in a texture set (empty when the manifest cannot be read). */
export async function listTextureKeys(set: 'low' | 'high'): Promise<string[]> {
  const m = await fetchManifest();
  return Object.keys(m?.[set] ?? {});
}

export function makeFallbackTexture(key: string): THREE.DataTexture {
  // Write the hex bytes as-is: the texture is tagged sRGB, so no linear conversion.
  const hex = fallbackColor(key);
  const data = new Uint8Array(4 * 4);
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  for (let i = 0; i < 4; i++) data.set([r, g, b, 255], i * 4);
  const tex = new THREE.DataTexture(data, 2, 2, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export async function loadTextureSet(
  set: 'low' | 'high',
  keys: string[],
  onProgress: (loaded: number, total: number) => void,
): Promise<Map<string, THREE.Texture>> {
  const out = new Map<string, THREE.Texture>();
  const manifest = await fetchManifest();
  const loader = new THREE.TextureLoader();
  let done = 0;
  onProgress(0, keys.length);
  await Promise.all(
    keys.map(async (key) => {
      const rel = manifest?.[set]?.[key];
      let tex: THREE.Texture;
      try {
        if (!rel) throw new Error('not in manifest');
        tex = await loader.loadAsync(`${import.meta.env.BASE_URL}${rel}`);
        tex.colorSpace = THREE.SRGBColorSpace;
      } catch (err) {
        console.warn(`Texture "${set}/${key}" failed to load, using fallback colour`, err);
        tex = makeFallbackTexture(key);
      }
      out.set(key, tex);
      done++;
      onProgress(done, keys.length);
    }),
  );
  return out;
}
