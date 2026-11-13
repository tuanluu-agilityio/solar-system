# Enhancement plan: photorealistic cosmic experience (Task 39)

Living document. A new session must be able to continue from this file plus
`docs/IMPLEMENTATION_STATUS.md` without any conversation context. This is an enhancement of the
existing app, not a rebuild: `AGENTS.md` invariants (budgets, locales, muted by default, tap
targets, data locations) stay in force.

## 1. Existing architecture (audit, 2026-11-14, `main` at e295172)

- Stack: Vite 8, strict TypeScript 6, three.js 0.186, `camera-controls` 3.1, vanilla DOM UI,
  Vitest (760 unit tests, all passing), Playwright (e2e on SwiftShader, visual, perf).
- Entry `src/main.ts` wires everything: prefs and store, audio engine, UI, renderer, camera rig,
  post-processing, texture loading, sky, sun, solar system, picker, labels, tour, render loop.
- Rendering: `WebGLRenderer` (ACES, sRGB) -> `EffectComposer` (RenderPass, UnrealBloomPass,
  OutputPass) in `src/scene/postfx.ts`. Custom shaders end with the tonemapping and colorspace
  includes, so they work both in the composer's HDR target and direct to screen.
- Sky: one equirect Milky Way texture on an inverted sphere with a tone curve (`src/scene/sky.ts`).
- Sun: shader sphere (two scrolling texture layers + value noise), one additive corona sprite, a
  decay-0 `PointLight` and a faint ambient light (`src/bodies/sun.ts`).
- Bodies: `createPlanet` gives every body the same `MeshStandardMaterial({ map })`; Earth has a
  day/night shader, a cloud shell and a Fresnel atmosphere shell; Venus has an atmosphere shell;
  Saturn and Uranus have a flat ring with an analytic planet shadow (`src/bodies/*`,
  `src/scene/solarSystem.ts`). Orbits are Keplerian (JPL elements) with screen-space ribbons.
  The asteroid belt is one `InstancedMesh` of icosahedra.
- Scale: compressed distances (`20 + 28 * sqrt(d / 57.9)`), linear planet radii, compressed Sun
  and Moon radii, an overview boost that keeps far bodies visible (`src/config/scale.ts`,
  `src/camera/framing.ts`). The UI states that sizes and distances are not to scale.
- Camera: `camera-controls` wrapped by `src/camera/cameraRig.ts` (fly-to, follow, auto-orbit,
  overview framing, view offset for the info panel).
- Quality: tiers `low | medium | high` in `src/quality/tiers.ts`, an FPS monitor that downgrades
  at runtime, lazy high-resolution textures on arrival (high tier only).
- UI: title, control cluster (language, sound, tour, credits), info panel / bottom sheet, labels
  with collision layout, tour controls, subtitles, loading screen, credits, language picker.
- Audio: procedural ambient drone and whoosh through Web Audio gain nodes, narration mp3s.
- Assets: Solar System Scope textures as WebP in `public/textures/{low,high}` (3.5 MB / 14 MB),
  narration in `public/audio/narration` (12 MB).

## 2. Feature inventory (must keep working)

Fly-to selection by tap, click and label; info panel with NASA data in vi/en/ja/de; back to
overview; narrated 14-stop tour with subtitles, pause, next, previous, exit and one-time
autostart; language picker; mute toggle (muted by default); credits; quality tiers with runtime
downgrade; lazy high-resolution textures; overview boost and label layout; mobile bottom sheet;
WebGL-unsupported and boot-error screens; the `?e2e` debug API used by every Playwright suite.

## 3. Baseline and identified issues

Baseline on the development laptop (Intel Arc iGPU, 1280x720, high tier): 60 FPS in the overview
and in every focus view, no console errors. Real-GPU baseline shots were taken with
`scripts/shots.mjs` (see section 7).

| #   | Area     | Issue                                                                                                      |
| --- | -------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Sun      | Bloom and gain clip the disc to a white blob; no visible plasma, limb darkening, corona structure.         |
| 2   | Sky      | A single magnified texture: stars are blocky, there is no depth, parallax, twinkle or colour variety.      |
| 3   | Planets  | One generic Lambert material: no relief on rocky bodies, no haze on Mars, Jupiter, Saturn, Uranus, Neptune. |
| 4   | Earth    | No ocean glint, no surface relief, clouds are not shaded at the terminator and cast no shadow.              |
| 5   | Saturn   | The ring is a flat unlit strip; it casts no shadow on the planet; no forward-scatter or fine structure.     |
| 6   | Gas      | Jupiter, Saturn and Venus cloud decks are static.                                                           |
| 7   | Belt     | Asteroids are large faceted icosahedra that block the view near Earth and Mars and look like toys.          |
| 8   | Moons    | Only Earth's Moon exists; no Galilean moons, Titan, Enceladus, Phobos, Deimos; no Kuiper belt.              |
| 9   | Camera   | Flights are a straight eased lerp; no keyboard navigation; no next/previous body shortcut.                  |
| 10  | UI       | No time control, orbit or label toggles, quality selector or body navigator; emoji icons; plain panel.      |
| 11  | A11y     | No `prefers-reduced-motion` handling.                                                                       |
| 12  | Quality  | No `ultra` tier; the high tier has an open FPS issue on the test laptop (`docs/KNOWN_ISSUES.md`).           |

## 4. Technical approach

No new framework and no new runtime dependency. Everything is shader work on the existing
three.js pipeline, plus small vanilla DOM UI modules.

- Stars: a procedural `THREE.Points` layer (seeded positions, magnitude distribution, blackbody
  colours, per-star twinkle in the vertex shader) over the existing Milky Way texture, plus a
  subtle procedural nebula term in the sky shader and a sparse near-camera dust layer for parallax.
- Sun: domain-warped fbm plasma on the sphere, limb darkening, an animated corona shell with
  ray structure, prominences on the limb; gain and bloom retuned so the disc keeps its detail.
- Planets: one shared lit shader (`src/bodies/planetMaterial.ts`) with per-body parameters:
  relief derived from the albedo map (rocky bodies), atmosphere rim and terminator tint, band
  flow for gas giants, ring shadow for Saturn. Earth gains a normal map, an ocean specular mask,
  cloud shading and cloud shadows. Per-body values stay in one table.
- Rings: lit ring shader with a phase function (back-lit translucency), procedural fine
  ringlets on top of the strip texture, planet shadow kept, ring shadow cast onto Saturn.
- Belt: smaller irregular rocks with per-instance tint; a faint, non-selectable Kuiper belt.
- Moons: new bodies through the `src/data/CLAUDE.md` checklist, discoverable from their planet,
  hidden in the overview so the first view is not crowded.
- Camera: arced flights with ease-in/out, keyboard navigation, zoom limits kept.
- UI: a settings popover (time speed, orbits, labels, quality), a body navigator, a redesigned
  panel and control styling, soft interface sounds; every string in all four locales.
- Quality: add an `ultra` tier; expensive effects are tier-gated; reduced motion is respected.

## 5. Phases and tasks

One integration branch, `feat/t39-cinematic-enhancement` (worktree `.worktrees/t39`). Sub-tasks
branch from it into their own worktrees, are merged back locally, and the integration branch
goes to a single PR once the user approves the push.

| Phase | Task | Scope                                                              | Main files                                                                                     | Status  |
| ----- | ---- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------- |
| 0     | t39  | Audit, baseline, this plan, `scripts/shots.mjs`                    | `docs/ENHANCEMENT_PLAN.md`, `scripts/shots.mjs`                                                | done    |
| 1     | t39a | Deep space: star layers, twinkle, nebula, dust                     | `src/scene/sky.ts`, new `src/scene/starfield.ts`, `src/scene/dust.ts`, `src/main.ts` (wiring)  | done    |
| 2     | t39b | The Sun and bloom tuning                                           | `src/bodies/sun.ts`, `src/scene/bloomConfig.ts`, `src/scene/postfx.ts`                         | done    |
| 2     | t39c | Planet materials, Earth, rings and ring shadows, asteroid belt     | `src/bodies/{planet,earth,rings,asteroidBelt}.ts`, new `planetMaterial.ts`, `solarSystem.ts`   | done    |
| 2     | t39e | Major moons and Kuiper belt                                        | `src/data/*`, `src/scene/solarSystem.ts`, `scripts/fetch-textures.mjs`, `public/textures`      | done    |
| 3     | t39f | Cinematic camera and keyboard navigation                           | `src/camera/*`, `src/main.ts`                                                                  | done    |
| 4     | t39d | HUD, settings, body navigator, panel polish, interface sounds      | `src/ui/*`, `src/i18n/strings.ts`, `src/state/*`, `src/quality/tiers.ts`, `src/audio/*`        | done    |
| 5     | t39g | Performance pass, `ultra` tier checks, budget, mobile              | `src/quality/*`, `docs/perf-results.json`                                                      | pending |
| 6     | t39h | Full QA (unit, lint, typecheck, build, budget, e2e), screenshots   | `tests/*`, `docs/screenshots`, `docs/IMPLEMENTATION_STATUS.md`                                 | pending |

Order: t39a, t39b and t39c run in parallel (disjoint files); then t39d, t39e and t39f; then t39g
and t39h on the integration branch.

## 6. Risks and mitigation

- Shader cost on phones: every new effect is gated by `TierSettings`; the low tier keeps the
  cheap paths. Measure with `scripts/shots.mjs` (prints FPS) and `npm run test:perf`.
- Initial payload budget (8 MB) and JS budget (800 KB gzip): new maps go to the lazy high set
  where possible; run `npm run build` then `npm run check:budget`.
- E2E on SwiftShader is slow: heavier shaders may need the software path to stay cheap. The app
  already detects a software renderer (`isSoftwareRenderer`); e2e runs once at integration.
- Regressions in picking, labels and the tour: unit tests stay green on every task; no test is
  weakened to pass.
- Scientific credibility: only NASA/JPL numbers; visual-only additions (Kuiper belt, nebula
  tint) are not presented as data.

## 7. Working method

- Dev server: `npx vite --port <port> --strictPort` in the task worktree (base path `/`).
- Screenshots on the real GPU: `node scripts/shots.mjs --url http://localhost:<port>/ --out <dir>
  --views overview,sun,earth,saturn [--close 3] [--quality low] [--mobile]`. Read the PNGs and
  iterate until the result is convincing; the script also prints FPS and console issues.
- Per task: `npm run typecheck`, `npm run lint`, `npm test` must pass before the commit.
- Do not run `npm run test:e2e` or `test:visual` in parallel worktrees (shared port 4173).

## 8. Completion checklist

- [x] Phase 0: audit, baseline, plan
- [x] Phase 1: deep space environment
- [x] Phase 2: Sun, planets, rings, moons
- [x] Phase 3: camera and exploration
- [x] Phase 4: interface and audio
- [ ] Phase 5: performance and polish
- [ ] Phase 6: final QA and `docs/IMPLEMENTATION_STATUS.md`

## 9. Decisions

- DECISION: one integration branch with local sub-task merges instead of one PR per sub-task,
  because pushing and merging deploy to production and wait for the user's approval.
- DECISION: the brainstorm/spec steps are replaced by the user's written mission brief and this
  plan; the brief asks for autonomous execution without questions.
- DECISION: no new runtime dependencies; relief comes from albedo-derived normals except Earth,
  which gets the Solar System Scope normal and specular maps (same CC BY 4.0 source).
