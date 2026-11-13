import * as THREE from 'three';
import './ui/styles.css';
import { createStore } from './state/store';
import type { ContentId } from './data/types';
import type { AppState } from './state/appState';
import { loadPrefs, savePref } from './state/prefs';
import { getLayout } from './ui/layout';
import {
  initialTier,
  isQualityChoice,
  tierSettings,
  type QualityChoice,
  type QualityTier,
} from './quality/tiers';
import { createFpsMonitor } from './quality/fpsMonitor';
import { createRuntimeQuality, isSoftwareRenderer } from './quality/runtime';
import {
  autostartStillWanted,
  initialTour,
  shouldAutostart,
  type TourEvent,
} from './tour/tourMachine';
import {
  TOUR_AUTOSTART_DELAY_MS,
  createTourController,
  type TourController,
  type TourDeps,
} from './tour/tourController';
import { createScaledTimers } from './tour/scaledTimers';
import type { NarrationManifest } from './tour/narration';
import tourScriptsEn from './data/tour/en.json';
import tourScriptsJa from './data/tour/ja.json';
import tourScriptsDe from './data/tour/de.json';
import tourScriptsVi from './data/tour/vi.json';
import { TOUR_STOPS } from './data/tour/stops';
import {
  applyRendererSettings,
  createRenderer,
  getRendererName,
  isWebGLAvailable,
} from './scene/renderer';
import {
  listTextureKeys,
  loadHighTextures,
  loadLowTextures,
  loadTextureSet,
  makeFallbackTexture,
} from './scene/textures';
import { aggregateProgress, isLazyTextureKey, skyKey, skySet } from './scene/textureKeys';
import { nearPlaneFor } from './scene/nearPlane';
import { createDeepSpace } from './scene/deepSpace';
import { startLoop } from './scene/loop';
import { createPostFX } from './scene/postfx';
import { createSun, sunDetailForTier } from './bodies/sun';
import { createSolarSystem } from './scene/solarSystem';
import { createPicker } from './interaction/picker';
import { createKeyboardNav } from './interaction/keyboard';
import { NAV_ORDER } from './data/navOrder';
import { createLabels } from './ui/labels';
import { createCameraRig } from './camera/cameraRig';
import { createLoadingScreen, showBootError, showWebglUnsupported } from './ui/loadingScreen';
import { createControlBar } from './ui/controlBar';
import { createCredits } from './ui/credits';
import { createLanguagePicker } from './ui/languagePicker';
import { createInfoPanel } from './ui/infoPanel';
import { createTourControls, isTourActive } from './ui/tourControls';
import { createSubtitles } from './ui/subtitles';
import { installE2EApi } from './debug/e2eApi';
import { createAudioEngine } from './audio/audioEngine';
import { createSimClock } from './state/simClock';
import { createBodyNav } from './ui/bodyNav';
import { createSettings } from './ui/settings';

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The `?quality=` URL parameter (e2e and debugging); it wins over the saved choice. */
function urlTier(search: string): QualityTier | null {
  const q = new URLSearchParams(search).get('quality');
  return q === 'low' || q === 'medium' || q === 'high' || q === 'ultra' ? q : null;
}

/** The tier the device would start on (never ultra). */
function deviceTier(): QualityTier {
  return initialTier({
    isMobile: window.matchMedia('(pointer:coarse)').matches,
    dpr: window.devicePixelRatio || 1,
    cores: navigator.hardwareConcurrency || 4,
  });
}

async function loadNarrationManifest(): Promise<NarrationManifest | null> {
  // A missing or broken manifest only costs the audio: every stop falls back to
  // estimated timing with subtitles (Review Focus 4).
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}audio/narration/manifest.json`);
    return res.ok ? ((await res.json()) as NarrationManifest) : null;
  } catch {
    return null;
  }
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

  // Priority: ?quality= (stays automatic, so the FPS monitor still applies), then a saved
  // manual choice, then the device's tier.
  const forcedTier = urlTier(window.location.search);
  const savedChoice: QualityChoice = forcedTier ? 'auto' : prefs.quality;
  const startTier: QualityTier =
    forcedTier ??
    (isQualityChoice(savedChoice) && savedChoice !== 'auto' ? savedChoice : deviceTier());
  const store = createStore<AppState>({
    lang: prefs.lang,
    muted: prefs.muted,
    selected: null,
    view: 'overview',
    layout: getLayout(window.innerWidth, window.innerHeight),
    quality: startTier,
    tour: initialTour(TOUR_STOPS.length),
    ready: false,
  });
  const settings = tierSettings(store.get().quality);

  const storage = safeStorage();
  const params = new URLSearchParams(window.location.search);
  const isE2E = params.has('e2e');
  const manifestPromise = loadNarrationManifest();
  // Tour timers and camera-rig time; the e2e `setTimeScale` speeds both up.
  let rigTimeScale = 1;
  const tourTimers = createScaledTimers({
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (id) => window.clearTimeout(id),
    now: () => performance.now(),
  });
  // Created once the solar system exists; the loading screen covers the UI until then.
  let tour: TourController | null = null;
  const dispatchTour = (e: TourEvent): void => tour?.dispatch(e);
  // A manual tap, drag, zoom, selection or back pauses a running tour (spec §3.8),
  // and also cancels a pending first-visit autostart.
  let userInteracted = false;
  const interruptTour = (): void => {
    userInteracted = true;
    dispatchTour({ type: 'USER_INTERACTED' });
  };
  let tourSeen = prefs.tourSeen;
  const startTour = (): void => {
    // The "seen" flag is set when a tour starts, so autostart happens at most once.
    tourSeen = true;
    savePref(storage, 'tourSeen', true);
    dispatchTour({ type: 'START' });
  };
  // Audio starts only after a user gesture (spec §3.7). Every pointerdown re-runs the
  // idempotent unlock, which also resumes a context iOS suspended after an interruption.
  const audio = createAudioEngine();
  audio.setMuted(store.get().muted);
  window.addEventListener('pointerdown', () => void audio.unlock(), { capture: true });
  const setMuted = (muted: boolean): void => {
    // unlock() creates/resumes the context synchronously inside this click.
    void audio.unlock();
    audio.setMuted(muted);
    savePref(storage, 'muted', muted);
    store.set({ muted });
  };
  const credits = createCredits(root, store);
  // Only the language changes: selection, panel and tour state stay as they are.
  const languagePicker = createLanguagePicker(root, store, (lang) => {
    savePref(storage, 'lang', lang);
    store.set({ lang });
  });
  const controls = createControlBar(root, store, {
    openLanguagePicker: () => languagePicker.open(),
    toggleMute: () => setMuted(!store.get().muted),
    toggleTour() {
      if (isTourActive(store.get().tour.status)) dispatchTour({ type: 'EXIT' });
      else startTour();
    },
    openCredits: () => credits.open(),
  });
  // Faint interface sounds: a tick for every button (the nav buttons make the select sound).
  root.addEventListener(
    'click',
    (e) => {
      const b = e.target instanceof Element ? e.target.closest('button') : null;
      if (b && b.dataset.sound !== 'none') audio.playUi('tick');
    },
    true,
  );

  createTourControls(root, store, dispatchTour);
  const subtitles = createSubtitles(root, store, {
    currentCue: () => tour?.currentCue() ?? null,
    onUnmute: () => setMuted(false),
  });

  const loading = createLoadingScreen(root, prefs.lang);
  const canvas = document.createElement('canvas');
  canvas.id = 'scene';
  root.prepend(canvas);
  // camera-controls reports drags (controlstart) but not taps or wheel zoom.
  canvas.addEventListener('pointerdown', interruptTour);
  canvas.addEventListener('wheel', interruptTour, { passive: true });

  const renderer = createRenderer(canvas, settings);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    20000,
  );
  const rig = createCameraRig(camera, canvas);
  // Zoomed onto a tiny moon, the surface comes closer than the default near plane.
  const targetPos = new THREE.Vector3();
  const syncNearPlane = (): void => {
    const t = rig.getTarget();
    const gap = t
      ? camera.position.distanceTo(t.object.getWorldPosition(targetPos)) - t.radius
      : Infinity;
    const near = nearPlaneFor(gap);
    if (near !== camera.near) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
  };
  rig.setLayout(store.get().layout);
  // Tour stops on a phone are framed above the compact subtitle dock.
  store.subscribe((s, prev) => {
    if (s.tour.status !== prev.tour.status) rig.setTourMode(isTourActive(s.tour.status));
  });
  const postfx = createPostFX(renderer, scene, camera, settings);

  // Runtime quality: the FPS monitor downgrades a tier; software rendering disables it (spec §11.4).
  let solarRef: ReturnType<typeof createSolarSystem> | null = null;
  let orbitsOn = prefs.orbits;
  let labelsOn = prefs.labels;
  const simClock = createSimClock();
  let syncLabels = (): void => undefined;
  // Orbit ribbons keep a constant pixel width: tell them the drawing buffer and pixel ratio.
  const drawingSize = new THREE.Vector2();
  const syncOrbitViewport = (): void => {
    renderer.getDrawingBufferSize(drawingSize);
    solarRef?.setViewport(drawingSize.x, drawingSize.y, renderer.getPixelRatio());
  };
  const rendererName = getRendererName(renderer);
  const software = isSoftwareRenderer(rendererName);
  console.info(
    `[quality] tier ${store.get().quality}, renderer ${rendererName ?? 'unknown'}${software ? ' (software: FPS monitor off)' : ''}`,
  );
  // One path for the FPS monitor and the settings selector. The loaded sky stays, and
  // antialias is fixed when the renderer is created, so ultra differs from high only in the
  // other fields. Textures only ever upgrade (on arrival at a body); a lower tier keeps them.
  let sunRef: ReturnType<typeof createSun> | null = null;
  const applyTier = (next: QualityTier): void => {
    store.set({ quality: next });
    const s = tierSettings(next);
    applyRendererSettings(renderer, s);
    postfx.setSettings(s);
    solarRef?.setTierSettings(s);
    sunRef?.setDetail(sunDetailForTier(next));
    syncOrbitViewport();
    afterTierChange();
  };
  let afterTierChange = (): void => undefined;
  const runtimeQuality = createRuntimeQuality({
    monitor: createFpsMonitor(),
    software,
    getTier: () => store.get().quality,
    onDowngrade(next) {
      applyTier(next);
      console.info(`[quality] downgraded to ${next}`);
    },
  });
  createSettings(root, store, controls.settingsButton, {
    initial: { orbits: orbitsOn, labels: labelsOn, quality: savedChoice },
    onSpeed: (speed) => simClock.setSpeed(speed),
    onOrbits(on) {
      orbitsOn = on;
      savePref(storage, 'orbits', on);
      solarRef?.setOrbitsVisible(on);
    },
    onLabels(on) {
      labelsOn = on;
      savePref(storage, 'labels', on);
      syncLabels();
    },
    onQuality(choice) {
      savePref(storage, 'quality', choice);
      // A manual tier turns the automatic FPS downgrade off; auto turns it back on and
      // re-picks the device's starting tier.
      runtimeQuality.setAuto(choice === 'auto');
      applyTier(choice === 'auto' ? deviceTier() : choice);
    },
  });

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    postfx.setSize(window.innerWidth, window.innerHeight);
    syncOrbitViewport();
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
  const userSelect = (id: ContentId): Promise<void> => {
    interruptTour();
    audio.playUi('select');
    return selectBody(id);
  };
  const backToOverview = async (): Promise<void> => {
    interruptTour();
    store.set({ selected: null, view: 'overview' });
    audio.playWhoosh();
    await rig.flyToOverview();
  };
  const selectFromUi = (id: ContentId): void => void userSelect(id);
  createInfoPanel(root, store, () => void backToOverview(), selectFromUi);
  createBodyNav(root, store, selectFromUi);
  let cameraTargetId = (): ContentId | null => null;
  let projectBody: (id: ContentId) => { x: number; y: number } | null = () => null;

  installE2EApi({
    getState: () => store.get(),
    select: userSelect,
    overview: backToOverview,
    cameraTargetId: () => cameraTargetId(),
    projectBody: (id) => projectBody(id),
    tour: dispatchTour,
    pixelRatio: () => renderer.getPixelRatio(),
    downgradeQuality: () => runtimeQuality.downgrade(),
    orbitViewport: () => {
      const mesh = solarRef?.root.getObjectByName('orbit-line') as THREE.Mesh | undefined;
      const u = (mesh?.material as THREE.ShaderMaterial | undefined)?.uniforms;
      if (!u) return null;
      const v = u.uViewport?.value as THREE.Vector2;
      return { width: v.x, height: v.y, pixelRatio: u.uPixelRatio?.value as number };
    },
    // Read the belt fresh: it can be swapped for a bigger InstancedMesh on growth.
    asteroidCount: () =>
      (
        solarRef?.root.children.find((c) => (c as THREE.InstancedMesh).isInstancedMesh) as
          THREE.InstancedMesh | undefined
      )?.count ?? 0,
    // e2e only: speeds up the tour timers (narration, gap) and camera-rig time (flights,
    // auto-orbit), which is frame-bound and slow on software GL. Orbits keep real time.
    setTimeScale: (n) => {
      if (!Number.isFinite(n) || n <= 0) return;
      tourTimers.setScale(n);
      rigTimeScale = n;
    },
  });

  // Moon maps load when their planet system first comes into view (onFirstShown below).
  const lowKeys = (await listTextureKeys('low')).filter(
    (k) => !k.startsWith('sky') && !isLazyTextureKey(k),
  );
  const parts = [
    { loaded: 0, total: lowKeys.length },
    { loaded: 0, total: 1 },
  ];
  const report = (): void => loading.setProgress(aggregateProgress(parts));
  const sky = settings.skySize;
  const [lowTex, skyTex, manifest] = await Promise.all([
    loadTextureSet('low', lowKeys, (loaded, total) => {
      parts[0] = { loaded, total };
      report();
    }),
    loadTextureSet(skySet(sky), [skyKey(sky)], (loaded, total) => {
      parts[1] = { loaded, total };
      report();
    }),
    manifestPromise,
  ]);
  const skyTexture = skyTex.get(skyKey(sky));
  const deepSpace = createDeepSpace(skyTexture ?? null, settings, { renderer });
  scene.add(deepSpace.group);
  const sun = createSun(lowTex.get('sun') ?? makeFallbackTexture('sun'), {
    detail: sunDetailForTier(store.get().quality),
  });
  sunRef = sun;
  scene.add(sun.group);
  const solar = createSolarSystem(lowTex, tierSettings(store.get().quality), {
    onFirstShown: (id) => {
      loadLowTextures(id)
        .then((tex) => solar.upgradeTextures(id, tex))
        .catch(() => undefined);
    },
  });
  solarRef = solar;
  scene.add(solar.root);
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  solar.setReducedMotion(reducedMotion?.matches ?? false);
  reducedMotion?.addEventListener?.('change', (e) => solar.setReducedMotion(e.matches));
  syncOrbitViewport();
  solar.setOrbitFocus(store.get().view !== 'overview');
  solar.setOrbitsVisible(orbitsOn);

  selectBody = async (id) => {
    store.set({ selected: id, view: 'focus' });
    audio.playWhoosh();
    await rig.flyTo(solar.getFocusTarget(id));
    upgradeOnArrival(id);
  };
  // Only the high tier swaps in the large maps, and only once the camera has arrived.
  // A superseded flight resolves early, so also check the camera really is on this body.
  const upgradeOnArrival = (id: ContentId): void => {
    const s = store.get();
    const arrived = s.selected === id && s.view === 'focus' && cameraTargetId() === id;
    if (arrived && id !== 'asteroid-belt' && tierSettings(s.quality).textureSet === 'high') {
      loadHighTextures(id)
        .then((tex) => solar.upgradeTextures(id, tex))
        .catch(() => undefined);
    }
  };
  afterTierChange = () => {
    // Switching up to a high-texture tier while focused swaps in the large maps right away.
    const id = cameraTargetId();
    if (id) upgradeOnArrival(id);
  };
  const select = (id: ContentId): void => void userSelect(id);
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
  createKeyboardNav(
    window,
    () => ({ order: NAV_ORDER, selected: store.get().selected }),
    (a) => {
      if (a.type === 'select') select(a.id);
      else if (a.type === 'overview') void backToOverview();
      else {
        interruptTour();
        if (a.type === 'zoom') rig.zoomBy(a.factor);
        else rig.rotateBy(a.azimuth);
      }
    },
  );
  // A resting focus view slowly circles its body, unless the user asked for less motion.
  rig.setIdleDrift(!isE2E && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Labels show in the overview only, and only while the user keeps them on.
  syncLabels = (): void => labels.setVisible(store.get().view === 'overview' && labelsOn);
  syncLabels();
  store.subscribe((s, prev) => {
    if (s.view !== prev.view) {
      syncLabels();
      solar.setOrbitFocus(s.view !== 'overview');
    }
  });

  // Tour flights get the same whoosh and high-res upgrade as a manual selection.
  const tourRig: TourDeps['rig'] = {
    async flyTo(target) {
      audio.playWhoosh();
      await rig.flyTo(target);
      const id = cameraTargetId();
      if (id) upgradeOnArrival(id);
    },
    flyToOverview() {
      audio.playWhoosh();
      return rig.flyToOverview();
    },
    setAutoOrbit: (on) => rig.setAutoOrbit(on),
    onUserInteract: (cb) => rig.onUserInteract(cb),
  };
  tour = createTourController({
    rig: tourRig,
    system: solar,
    audio,
    store,
    manifest,
    scripts: { vi: tourScriptsVi, en: tourScriptsEn, ja: tourScriptsJa, de: tourScriptsDe },
    timers: tourTimers,
    audioUrl: (file) => `${import.meta.env.BASE_URL}${file}`,
  });
  const scheduleAutostart = (): void => {
    if (!shouldAutostart(tourSeen, isE2E, params.has('autostart'))) return;
    window.setTimeout(() => {
      // Skip if the user started a tour, touched the scene or selected a body meanwhile.
      if (autostartStillWanted({ tourSeen, userInteracted, selected: store.get().selected })) {
        startTour();
      }
    }, TOUR_AUTOSTART_DELAY_MS);
  };

  startLoop((dt, tSec) => {
    runtimeQuality.frame(dt * 1000, {
      visible: !document.hidden,
      transitioning: rig.isFlying(),
    });
    sun.update(tSec);
    // Planets run on the simulation clock (speed control); the Sun keeps wall time.
    simClock.advance(dt);
    solar.update(simClock.time, dt);
    rig.update(dt * rigTimeScale);
    syncNearPlane();
    deepSpace.update(tSec, camera, renderer.getPixelRatio());
    solar.applyOverviewBoost(camera, canvas.clientHeight || window.innerHeight);
    labels.update();
    subtitles.update();
    postfx.render();
    if (!store.get().ready) {
      store.set({ ready: true });
      loading.hide();
      scheduleAutostart();
    }
  });
}

boot().catch((err: unknown) => {
  console.warn('Boot failed', err);
  const root = document.getElementById('app');
  if (root) showBootError(root, loadPrefs(safeStorage(), navigator.languages ?? []).lang);
});
