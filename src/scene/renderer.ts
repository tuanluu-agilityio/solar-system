import * as THREE from 'three';
import type { TierSettings } from '../quality/tiers';
import { effectivePixelRatio } from '../quality/runtime';

export function createRenderer(
  canvas: HTMLCanvasElement,
  settings: TierSettings,
): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: settings.antialias,
    powerPreference: 'high-performance',
  });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  applyRendererSettings(renderer, settings);
  return renderer;
}

/** Applies the tier's pixel-ratio cap and re-sizes the drawing buffer (antialias is fixed at creation). */
export function applyRendererSettings(renderer: THREE.WebGLRenderer, settings: TierSettings): void {
  renderer.setPixelRatio(effectivePixelRatio(window.devicePixelRatio, settings.pixelRatioCap));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}

/** The unmasked GPU string, or null when the debug extension is unavailable. */
export function getRendererName(renderer: THREE.WebGLRenderer): string | null {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return null;
    const name: unknown = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    return typeof name === 'string' ? name : null;
  } catch {
    return null;
  }
}

export function isWebGLAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}
