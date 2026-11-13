import * as THREE from 'three';
import type { TierSettings } from '../quality/tiers';
import { createDust } from './dust';
import { createSky } from './sky';
import { bakeSkyGlow } from './skyGlow';
import { createStarfield } from './starfield';

export interface DeepSpace {
  /** Add this to the scene. */
  group: THREE.Group;
  /** Sky sphere and stars; follows the camera so they sit at infinity (no parallax). */
  far: THREE.Group;
  /** Call once per frame after the camera has moved. */
  update(tSec: number, camera: THREE.Camera, pixelRatio: number): void;
  /** False (prefers-reduced-motion) freezes the star twinkle. */
  setMotion(on: boolean): void;
}

/**
 * The deep-space environment: Milky Way sky, procedural stars and near-camera dust. Without
 * `opts.motion` the twinkle follows the OS `prefers-reduced-motion` setting. Pass
 * `opts.renderer` to bake the sky map into a star-free glow (see `skyGlow.ts`).
 */
export function createDeepSpace(
  skyTexture: THREE.Texture | null,
  settings: TierSettings,
  opts: { motion?: boolean; renderer?: THREE.WebGLRenderer } = {},
): DeepSpace {
  const group = new THREE.Group();
  group.name = 'deep-space';
  const far = new THREE.Group();
  group.add(far);
  if (skyTexture) {
    // With a renderer, the sky shows the baked star-free glow and nebula; the source map is
    // then unused and its GPU copy is freed.
    if (opts.renderer) {
      const maps = bakeSkyGlow(opts.renderer, skyTexture);
      skyTexture.dispose();
      far.add(createSky(maps.glow, maps.nebula));
    } else {
      far.add(createSky(skyTexture));
    }
  }
  const mq = reducedMotionQuery();
  const stars = createStarfield(settings, { motion: opts.motion ?? !mq?.matches });
  // Follow live OS changes unless the caller fixed the motion setting.
  if (opts.motion === undefined) mq?.addEventListener('change', (e) => stars.setMotion(!e.matches));
  far.add(stars.points);
  const dust = createDust(settings);
  if (dust) group.add(dust.points);
  return {
    group,
    far,
    update(tSec, camera, pixelRatio) {
      far.position.copy(camera.position);
      stars.update(tSec, pixelRatio);
      dust?.update(camera.position, pixelRatio);
    },
    setMotion: (on) => stars.setMotion(on),
  };
}

/** The `prefers-reduced-motion: reduce` media query, or null where matchMedia is missing. */
function reducedMotionQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
}
