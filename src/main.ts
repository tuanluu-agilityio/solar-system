import * as THREE from 'three';
import './ui/styles.css';
import { createStore } from './state/store';
import type { AppState } from './state/appState';
import { loadPrefs } from './state/prefs';
import { getLayout } from './ui/layout';
import { initialTier, tierSettings, type QualityTier } from './quality/tiers';
import { initialTour } from './tour/tourMachine';
import { TOUR_STOPS } from './data/tour/stops';
import { createRenderer, isWebGLAvailable } from './scene/renderer';
import { listTextureKeys, loadTextureSet } from './scene/textures';
import { aggregateProgress, skyKey, skySet } from './scene/textureKeys';
import { createSky } from './scene/sky';
import { startLoop } from './scene/loop';
import { createLoadingScreen, showBootError, showWebglUnsupported } from './ui/loadingScreen';
import { installE2EApi } from './debug/e2eApi';

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function pickTier(search: string): QualityTier {
  const q = new URLSearchParams(search).get('quality');
  if (q === 'low' || q === 'medium' || q === 'high') return q;
  return initialTier({
    isMobile: window.matchMedia('(pointer:coarse)').matches,
    dpr: window.devicePixelRatio || 1,
    cores: navigator.hardwareConcurrency || 4,
  });
}

async function boot(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) return;
  const prefs = loadPrefs(safeStorage(), navigator.languages ?? [navigator.language]);
  document.documentElement.lang = prefs.lang;

  if (!isWebGLAvailable()) {
    showWebglUnsupported(root, prefs.lang);
    return;
  }

  const store = createStore<AppState>({
    lang: prefs.lang,
    muted: prefs.muted,
    selected: null,
    view: 'overview',
    layout: getLayout(window.innerWidth, window.innerHeight),
    quality: pickTier(window.location.search),
    tour: initialTour(TOUR_STOPS.length),
    ready: false,
  });
  const settings = tierSettings(store.get().quality);

  const loading = createLoadingScreen(root, prefs.lang);
  const canvas = document.createElement('canvas');
  canvas.id = 'scene';
  root.prepend(canvas);

  const renderer = createRenderer(canvas, settings);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 20000);
  camera.position.set(0, 0, 10);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    store.set({ layout: getLayout(window.innerWidth, window.innerHeight) });
  });

  installE2EApi({
    getState: () => store.get(),
    select: async (id) => store.set({ selected: id, view: 'focus' }),
    overview: async () => store.set({ selected: null, view: 'overview' }),
    tour: () => {
      // Wired by the tour controller task.
    },
    setTimeScale: () => {
      // Wired by the time-control task.
    },
  });

  const lowKeys = (await listTextureKeys('low')).filter((k) => !k.startsWith('sky'));
  const parts = [
    { loaded: 0, total: lowKeys.length },
    { loaded: 0, total: 1 },
  ];
  const report = (): void => loading.setProgress(aggregateProgress(parts));
  const sky = settings.skySize;
  const [, skyTex] = await Promise.all([
    loadTextureSet('low', lowKeys, (loaded, total) => {
      parts[0] = { loaded, total };
      report();
    }),
    loadTextureSet(skySet(sky), [skyKey(sky)], (loaded, total) => {
      parts[1] = { loaded, total };
      report();
    }),
  ]);
  const skyTexture = skyTex.get(skyKey(sky));
  if (skyTexture) scene.add(createSky(skyTexture));

  startLoop(() => {
    renderer.render(scene, camera);
    if (!store.get().ready) {
      store.set({ ready: true });
      loading.hide();
    }
  });
}

boot().catch((err: unknown) => {
  console.warn('Boot failed', err);
  const root = document.getElementById('app');
  if (root) showBootError(root, loadPrefs(safeStorage(), navigator.languages ?? []).lang);
});
