import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { TierSettings } from '../quality/tiers';
import { BLOOM, bloomResolution } from './bloomConfig';

/**
 * Render -> bloom -> output. The scene renders into the composer's HalfFloat (linear HDR)
 * target, where the renderer skips tone mapping; OutputPass then applies the renderer's
 * ACES tone mapping and sRGB conversion exactly once.
 */
export function createPostFX(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  s: TierSettings,
): { render(): void; setSize(w: number, h: number): void; setSettings(s: TierSettings): void } {
  let settings = s;
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const res = bloomResolution(settings, size.x, size.y, renderer.getPixelRatio());
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(res.width, res.height),
    BLOOM.strength,
    BLOOM.radius,
    BLOOM.threshold,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let w = size.x;
  let h = size.y;
  const applySize = (): void => {
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    // EffectComposer sizes every pass at full drawing-buffer size; shrink the bloom chain.
    const r = bloomResolution(settings, w, h, renderer.getPixelRatio());
    bloom.resolution.set(r.width, r.height);
    bloom.setSize(r.width, r.height);
  };
  applySize();

  return {
    render() {
      composer.render();
    },
    setSize(width: number, height: number) {
      w = width;
      h = height;
      applySize();
    },
    setSettings(next: TierSettings) {
      settings = next;
      applySize();
    },
  };
}
