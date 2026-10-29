import * as THREE from 'three';
import './ui/styles.css';
import { createStore } from './state/store';
import type { ContentId } from './data/types';
import type { AppState } from './state/appState';
import { loadPrefs, savePref } from './state/prefs';
import { getLayout } from './ui/layout';
import { initialTier, tierSettings, type QualityTier } from './quality/tiers';
import { initialTour } from './tour/tourMachine';
import { TOUR_STOPS } from './data/tour/stops';
import { createRenderer, isWebGLAvailable } from './scene/renderer';
import {
  listTextureKeys,
  loadHighTextures,
  loadTextureSet,
  makeFallbackTexture,
} from './scene/textures';
import { aggregateProgress, skyKey, skySet } from './scene/textureKeys';
import { createSky } from './scene/sky';
import { startLoop } from './scene/loop';
import { createPostFX } from './scene/postfx';
import { createSun } from './bodies/sun';
import { createSolarSystem } from './scene/solarSystem';
import { createPicker } from './interaction/picker';
import { createLabels } from './ui/labels';
import { createCameraRig } from './camera/cameraRig';
import { createLoadingScreen, showBootError, showWebglUnsupported } from './ui/loadingScreen';
import { createControlBar } from './ui/controlBar';
import { createCredits } from './ui/credits';
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

  const storage = safeStorage();
  const credits = createCredits(root, store);
  createControlBar(root, store, {
    toggleLang() {
      const lang = store.get().lang === 'vi' ? 'en' : 'vi';
      savePref(storage, 'lang', lang);
      store.set({ lang });
    },
    toggleMute() {
      const muted = !store.get().muted;
      savePref(storage, 'muted', muted);
      store.set({ muted });
    },
    toggleTour() {
      // Wired by the tour controller task.
    },
    openCredits: () => credits.open(),
  });

  const loading = createLoadingScreen(root, prefs.lang);
  const canvas = document.createElement('canvas');
  canvas.id = 'scene';
  root.prepend(canvas);

  const renderer = createRenderer(canvas, settings);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    20000,
  );
  const rig = createCameraRig(camera, canvas);
  rig.setLayout(store.get().layout);
  const postfx = createPostFX(renderer, scene, camera, settings);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    postfx.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    const layout = getLayout(window.innerWidth, window.innerHeight);
    store.set({ layout });
    // Every resize (not only a layout switch) changes the aspect, so re-frame each time.
    rig.setLayout(layout);
  });

  // Selection flow; `selectBody` is replaced once the solar system exists.
  let selectBody = async (id: ContentId): Promise<void> => {
    store.set({ selected: id, view: 'focus' });
  };
  const backToOverview = async (): Promise<void> => {
    store.set({ selected: null, view: 'overview' });
    await rig.flyToOverview();
  };
  let cameraTargetId = (): ContentId | null => null;
  let projectBody: (id: ContentId) => { x: number; y: number } | null = () => null;

  installE2EApi({
    getState: () => store.get(),
    select: (id) => selectBody(id),
    overview: backToOverview,
    cameraTargetId: () => cameraTargetId(),
    projectBody: (id) => projectBody(id),
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
  const [lowTex, skyTex] = await Promise.all([
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
  const sun = createSun(lowTex.get('sun') ?? makeFallbackTexture('sun'));
  scene.add(sun.group);
  const solar = createSolarSystem(lowTex, settings);
  scene.add(solar.root);

  const whoosh = (): void => {
    // Fly-to whoosh; wired by the audio engine task.
  };
  selectBody = async (id) => {
    store.set({ selected: id, view: 'focus' });
    whoosh();
    await rig.flyTo(solar.getFocusTarget(id));
    // Only the high tier swaps in the large maps, and only once the camera has arrived.
    // A superseded flight resolves early, so also check the camera really is on this body.
    const s = store.get();
    const arrived = s.selected === id && s.view === 'focus' && cameraTargetId() === id;
    if (arrived && id !== 'asteroid-belt' && tierSettings(s.quality).textureSet === 'high') {
      loadHighTextures(id)
        .then((tex) => solar.upgradeTextures(id, tex))
        .catch(() => undefined);
    }
  };
  const select = (id: ContentId): void => void selectBody(id);
  const contentIds: ContentId[] = [...solar.bodies.keys(), 'asteroid-belt'];
  cameraTargetId = () => {
    const t = rig.getTarget();
    return t
      ? (contentIds.find((id) => solar.getFocusTarget(id).object === t.object) ?? null)
      : null;
  };
  const projected = new THREE.Vector3();
  projectBody = (id) => {
    solar.getFocusTarget(id).object.getWorldPosition(projected);
    camera.updateMatrixWorld();
    projected.project(camera);
    if (Math.abs(projected.z) > 1) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + ((projected.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - projected.y) / 2) * rect.height,
    };
  };
  const labels = createLabels(root, solar.bodies, camera, () => store.get().lang, {
    onSelect: select,
    isMobile: () => store.get().layout === 'mobile',
  });
  createPicker(canvas, camera, solar.pickables, select, (id) => labels.setHovered(id));
  labels.setVisible(store.get().view === 'overview');
  store.subscribe((s, prev) => {
    if (s.view !== prev.view) labels.setVisible(s.view === 'overview');
  });

  startLoop((dt, tSec) => {
    sun.update(tSec);
    solar.update(tSec);
    rig.update(dt);
    labels.update();
    postfx.render();
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
