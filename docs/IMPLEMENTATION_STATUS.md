# Implementation status: photorealistic enhancement (Task 39)

Companion to `docs/ENHANCEMENT_PLAN.md`. Updated after every merged sub-task. Read both files
before continuing the work in a new session.

Last update: 2026-11-14.

## Where the work lives

- Integration branch `feat/t39-cinematic-enhancement`, worktree `.worktrees/t39`. Not pushed:
  pushing and the PR wait for the user's approval (a merge to `main` deploys to production).
- Sub-task branches `feat/t39a` .. `feat/t39e` in `.worktrees/t39a` .. `t39e`, each branched
  from the integration branch and merged back locally with `git merge --no-ff`.

## Phase status

| Phase | Task | Status                                  |
| ----- | ---- | --------------------------------------- |
| 0     | t39  | Done (plan, baseline, `scripts/shots.mjs`) |
| 1     | t39a | Done, merged                            |
| 2     | t39b | Done, merged                            |
| 2     | t39c | Done, merged                            |
| 2     | t39e | In progress on `feat/t39e` (not merged) |
| 3     | t39f | Done on the integration branch          |
| 4     | t39d | Done, merged                            |
| 5     | t39g | Not started                             |
| 6     | t39h | Not started                             |

## Completed

### Phase 0 (t39)

- Audit and baseline (60 FPS on the Intel Arc iGPU at 1280x720, high tier; 760 unit tests).
- `docs/ENHANCEMENT_PLAN.md`; `scripts/shots.mjs` (real-GPU screenshots with FPS and console
  output through the `?e2e` API).

### Phase 3 (t39f): camera and keyboard

- `src/interaction/keyboard.ts`: `[` / `]` and PageUp / PageDown step through the bodies,
  Escape and Home return to the overview, `+` / `-` zoom, the left and right arrows turn the
  view. Ignored inside text fields, with modifiers and while a modal dialog is open.
- `src/data/navOrder.ts`: `NAV_ORDER` (the Sun outward, asteroid belt after Mars).
- `src/camera/cameraRig.ts`: `zoomBy`, `rotateBy`, and an idle drift that slowly circles a
  focused body after 6 s without interaction (off under `prefers-reduced-motion` and in e2e).
- Files: `src/camera/cameraRig.ts`, `src/interaction/keyboard.ts`, `src/data/navOrder.ts`,
  `src/main.ts`, `tests/unit/{cameraRig,keyboard,navOrder}.test.ts`.

### Phase 1 (t39a): deep space

- `src/scene/starfield.ts` (seeded `THREE.Points`, magnitude spread, blackbody tints, twinkle,
  density along the galactic band, brightness kept under the bloom threshold),
  `src/scene/skyGlow.ts` (one-time GPU bake: star-free Milky Way glow, dust lanes, faint
  nebula), `src/scene/dust.ts` (near-camera motes, off on low), `src/scene/deepSpace.ts`
  (assembly; sky and stars follow the camera). Tier fields `starCount`, `dustCount`.
- Star and dust counts are fixed at scene creation: a runtime tier change does not rebuild them.

### Phase 2 (t39b): the Sun and bloom

- `src/bodies/sun.ts` rewritten (3D-position plasma flow, granulation, sunspots, limb
  darkening, layered corona quad with streamers, rays and prominences), `sunParams.ts`.
  `createSun(tex, { detail, reducedMotion })`, `setDetail`, `setReducedMotion`.
- Bloom: strength 0.42, radius 0.55, threshold 0.9 with a soft knee (0.6), same in every tier.
- Shader noise hashes integer lattice coordinates (float hashing produced visible seams).

### Phase 2 (t39c): planets, Earth, rings, belt

- `src/bodies/planetLook.ts` (per-body shading table) and `planetMaterial.ts` (shared shader):
  albedo-derived relief and Lommel-Seeliger response for rocky bodies, Minnaert limb darkening,
  haze and bounded two-phase band flow for the giants, Venus cloud drift, Saturn ring shadow on
  the globe. Every body except the Sun is now a `ShaderMaterial` (maps are `uniforms.uMap`).
- Earth: normal and specular maps (`earth_normal`, `earth_specular`, loaded as linear data),
  ocean glint, cloud shadows, sun-lit cloud shader, city lights dimmed under clouds, thin
  Rayleigh limb that warms at the terminator.
- Rings: lit and back-lit shading, procedural ringlets with derivative fade, soft planet shadow.
- Belt: small lumpy 20-face rocks with a power-law size skew and per-instance tint; rocks near
  the camera shrink away.
- Tier field `planetDetail` (off on low). `SolarSystem.setReducedMotion`.
  `scripts/fetch-textures.mjs --only key1,key2` adds maps without touching committed ones.
- Integration fix: `SolarSystem.update(tSec, wallDtSec)` fades the orbit ribbons on real frame
  time, so pause and fast-forward no longer affect the fade.

### Phase 4 (t39d): interface, settings, sounds

- Design tokens and restyle in `src/ui/styles.css`; inline SVG icons (`src/ui/icons.ts`).
- Settings popover (`src/ui/settings.ts`): time speed (pause, 0.25x, 1x, 4x, 16x through
  `src/state/simClock.ts`), orbit and label toggles, quality (Auto, Low, Medium, High, Ultra),
  keyboard shortcut list. Prefs `sse.orbits`, `sse.labels`, `sse.quality`.
- `ultra` tier; one `applyTier` path in `src/main.ts` for the FPS monitor and the selector
  (a manual choice disables the automatic downgrade; `?quality=` still wins).
- Body navigator (`src/ui/bodyNav.ts`), previous/next buttons and grouped sections in the info
  panel, atmosphere composition row (NASA fact sheet values in `src/data/bodies.ts`).
- Interface sounds (`src/audio/uiSounds.ts`, `AudioEngine.playUi`), silent while muted.
- New e2e spec `tests/e2e/settings.spec.ts`; `scripts/shots.mjs` gained `--lang`, `--click`,
  `--tag`.

## Outstanding issues and known limitations

- The night disc of Mercury and Venus looks brownish with the Sun behind them (Sun glare).
- The Sun's granulation has hard cell edges in an extreme close-up.
- Antialiasing is fixed when the renderer is created, so a live tier switch keeps it.
- E2E specs not yet re-run after the merges: `quality`, `audio`, `tour`, `flows`, `hires`,
  `picking`.

- Flights are still an eased straight transition (no arced path around the Sun).
- See `docs/KNOWN_ISSUES.md` for the open high-tier FPS entry.

## Exact next steps

1. Wait for t39e (moons, Kuiper belt); review it and merge it (the `ultra` tier needs any new
   `TierSettings` fields).
2. Fix whatever the full e2e run on the integration branch reports.
3. t39g: performance pass (`npm run test:perf`, `scripts/shots.mjs --quality low --mobile`).
4. t39h: lint, typecheck, unit, build, budget, e2e one spec at a time, refresh
   `docs/screenshots`, final update of this file; then ask the user to approve the push and PR.
