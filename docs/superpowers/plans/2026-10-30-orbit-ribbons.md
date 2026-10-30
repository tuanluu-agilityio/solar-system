# Orbit Ribbons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 1 px white orbit lines (the circles that show each planet's path around the Sun) with glowing, constant-width ribbons whose brightness trails behind each planet, so the orbits read clearly on phones and desktops.

**Architecture:** Each orbit becomes one flat mesh: a closed strip around the circle, expanded sideways in the vertex shader so its width is constant in screen pixels at any camera angle and distance. The fragment shader draws a soft core plus halo (per-planet tint, additive blending) and a trail that is brightest at the planet's current angle and fades behind it, which also shows the direction of motion. Pure maths (trail, profile, smoothing) lives in a three-free module with unit tests; the shader gets its constants from the same module. Orbits dim when the camera is focused on a body.

**Tech Stack:** three.js `ShaderMaterial` (no new dependency), TypeScript strict, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-29-solar-system-explorer-design.md` (graphics, overview, mobile). This plan supersedes the "256-segment white `LineLoop` at opacity 0.15" orbit line of Task 17 in `docs/superpowers/plans/2026-10-29-solar-system-explorer.md`. Execute with the same per-task flow ("How this plan is executed" there, `AGENTS.md` Workflow): one worktree, branch and PR per task, reviewer, CI-gated merge, `docs/progress/t<NN>.md`. Tasks are strictly serial.

## Global Constraints

- Windows 11, Node 24, npm 11. TypeScript `strict: true`, `noUncheckedIndexedAccess: true`. No new runtime dependency.
- Body data ONLY in `src/data/`. Scale/time constants ONLY in `src/config/scale.ts`. Quality numbers ONLY in `src/quality/tiers.ts`. Visual style constants for orbits live in `ORBIT_STYLE` (Task 33).
- Quality never drops below textured bodies + sun light + sun bloom. The Sun must stay the brightest element: orbit colour never reaches the bloom threshold (`BLOOM.threshold` in `src/scene/bloomConfig.ts`, 0.85).
- Performance: at least 30 FPS on a mid-range phone, 55 FPS target on a laptop iGPU (the `high` tier currently measures 42-54 FPS, see ADR 0005); JS at most 800 KB gzip; initial load at most 8 MB; pixel ratio at most 2 (1.5 on `low`).
- Every user-visible string goes through `t()`; this plan adds none.
- The e2e preview server uses the shared port 4173: never run two Playwright runs at once. `playwright.config.ts` uses `workers: 2`, `retries: 1`, 60 s timeout: use poll timeouts of 25 s or more in new specs and `test.slow()` for specs that boot the app several times. The full e2e suite takes 15-45 minutes locally (CI runs it): run only the specs you touch.
- Do not run `npm run format` on the whole repo; format only the files you touch (`npx prettier --write <files>`).
- Never edit `.claude/settings.json`. Branch names `<type>/t<NN>-<slug>`; commits end with the `Co-Authored-By` trailer given by the harness.

## Review Focus

Failure modes the tasks' own happy-path tests would miss, most likely first. Each is pinned in the task named in brackets.

1. **Width drifts after a pixel-ratio or size change** (window resize, phone rotation, runtime quality downgrade from 2 to 1.5): ribbons must keep their pixel width. [Task 34: unit test on the viewport uniforms plus an e2e check after `downgradeQuality()`]
2. **Wrong trail direction or head offset:** the brightest point must sit on the planet and the glow must trail behind its motion, not ahead. [Task 33 unit tests; Task 34 test that the uniform follows `orbitPivot.rotation.y`]
3. **Camera very close to or inside an orbit** (focused on a planet, tour stops): vertices behind the camera must not produce streaks, NaN or flashing; ribbons must not cover the focused body or the panel. [Task 33: shader guards; Task 34: dimming test; Task 35: focus screenshots and zero console errors]
4. **Shallow viewing angle:** an orbit seen almost edge-on must still show as a ribbon at least as wide as its core width, never collapse to nothing. [Task 35: low-angle screenshot]
5. **Cost on phones:** nine orbits must not push the `low`/`medium` tiers under target or add per-frame allocations. [Task 34: no per-frame allocation in the update path; Task 35: perf run]

---

### Task 33: Orbit ribbon module

**Model:** opus (`implementer-heavy`) · **Branch:** `feat/t33-orbit-ribbon`

**Files:**
- Create: `src/bodies/orbitMath.ts`, `tests/unit/orbitMath.test.ts`, `tests/unit/orbitLine.test.ts`
- Rewrite: `src/bodies/orbitLine.ts`

**Interfaces:**
- Consumes: `THREE` from `three`; `BLOOM` from `src/scene/bloomConfig.ts`.
- Produces (`src/bodies/orbitMath.ts`, no three import):
```ts
export const ORBIT_STYLE: {
  coreWidthPx: number;      // 2.4  CSS px, bright centre line
  totalWidthPx: number;     // 9    CSS px, whole ribbon including halo
  haloShare: number;        // 0.35 intensity of the halo relative to the core
  baseIntensity: number;    // 0.28 brightness far behind the planet
  headIntensity: number;    // 0.8  brightness at the planet
  tailRad: number;          // 1.1  e-fold length of the trail behind the planet, radians
  focusEmphasis: number;    // 0.3  multiplier while a body is focused
  emphasisHalfLifeS: number;// 0.35 seconds for emphasis to cover half the distance to its target
  segments: number;         // 256
};
/** Angles are radians in the sense of `orbitPivot.rotation.y`; a vertex at angle a sits at (r cos a, 0, -r sin a). */
export function trailIntensity(vertexAngle: number, planetAngle: number): number;
/** Cross-section of the ribbon, `v` in [-1, 1] across its width. */
export function ribbonProfile(v: number): number;
/** Frame-rate independent approach of `current` to `target`. */
export function stepEmphasis(current: number, target: number, dtSec: number): number;
```
- Produces (`src/bodies/orbitLine.ts`):
```ts
export interface OrbitLine {
  object: THREE.Mesh;                       // name 'orbit-line', frustumCulled = false
  setPlanetAngle(angle: number): void;
  setViewport(drawingWidthPx: number, drawingHeightPx: number, pixelRatio: number): void;
  setEmphasis(e: number): void;             // 0..1 multiplier
  dispose(): void;
}
export function createOrbitLine(radius: number, color: THREE.ColorRepresentation): OrbitLine;
```

- [ ] **Step 1: Write the failing maths tests** in `tests/unit/orbitMath.test.ts`:
  - `trailIntensity(a, a)` equals `headIntensity`; `trailIntensity(a - 0.3, a) > trailIntensity(a + 0.3, a)` (the glow trails behind the motion); intensity never exceeds `headIntensity` or drops below `baseIntensity`; periodic: `trailIntensity(x, p) ≈ trailIntensity(x + 2π, p)` and works for negative and very large angles.
  - `ribbonProfile(0) = 1`, `ribbonProfile(±1) = 0`, symmetric, non-increasing in `|v|`, `≥ 0.5` at `|v| = coreWidthPx / totalWidthPx`, `≤ haloShare` at `|v| = 0.75`.
  - Style invariants (so tuning in Task 35 needs no test edits): `headIntensity < BLOOM.threshold`, `baseIntensity < headIntensity`, `coreWidthPx < totalWidthPx`, `0 < focusEmphasis < 1`.
  - `stepEmphasis`: `dt = 0` returns `current`; after one half-life it is halfway to `target`; never overshoots; a very large `dt` lands on `target`; negative `dt` is treated as 0.
- [ ] **Step 2: Run** `npx vitest run tests/unit/orbitMath.test.ts` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement `orbitMath.ts`.** Trail: `delta = (planetAngle - vertexAngle)` wrapped into `[0, 2π)`; `base + (head - base) * exp(-delta / tailRad)`. Profile: a bright core of half-width `coreWidthPx / totalWidthPx` plus a halo, both reaching exactly 0 at the edge (smoothstep falloff).
- [ ] **Step 4: Run it again** — Expected: PASS.
- [ ] **Step 5: Write the failing ribbon tests** in `tests/unit/orbitLine.test.ts`: `createOrbitLine(80, '#6fb6ff')` returns an object named `orbit-line` whose geometry has `2 * (segments + 1)` vertices (closed strip with a duplicated seam) and an index buffer of `6 * segments` entries; the centre-line positions lie on a circle of radius 80 in the XZ plane (`y = 0`) and a vertex at angle `a` is at `(80 cos a, 0, -80 sin a)`; material is a `ShaderMaterial` with additive blending, `transparent`, `depthWrite: false`, `depthTest: true`; `setViewport(1000, 500, 2)` sets the viewport and pixel-ratio uniforms; `setPlanetAngle` and `setEmphasis` set their uniforms (emphasis clamped to 0..1); `dispose()` disposes geometry and material; the shader source contains the numeric constants of `ORBIT_STYLE` (it is built from them, not retyped).
- [ ] **Step 6: Implement `orbitLine.ts`.** Vertex attributes: the centre-line `position` (repeated for the two sides), `aSide` (-1 / +1) and `aAngle` (0 to 2π, duplicated seam). Vertex shader: project the centre-line point and a point a small angle ahead (analytic: `(−r sin a, 0, −r cos a)` direction), take the screen-space normal of their difference, and offset the clip position by `side * halfWidthPx * pixelRatio / viewport * clip.w` so the width is constant in pixels; when either projected point has `w <= 0.001`, collapse the vertex onto the centre line instead of computing a normal (Review Focus 3). Fragment shader: `intensity = trail(aAngle, uPlanetAngle) * profile(side) * uEmphasis`, colour `uColor * intensity`, with the `tonemapping_fragment` and `colorspace_fragment` includes like `rings.ts`. The shader's trail and profile formulas must mirror `orbitMath.ts` (inject the constants via a template literal).
- [ ] **Step 7: Run** `npx vitest run tests/unit/orbitMath.test.ts tests/unit/orbitLine.test.ts && npm run typecheck && npm run lint` — Expected: all pass.
- [ ] **Step 8: Commit** `feat(t33): add orbit ribbon module`, write `docs/progress/t33.md`, tick this task, then the per-task flow (PR, CI, merge).

---

### Task 34: Wire orbit ribbons into the solar system

**Model:** sonnet (`implementer`) · **Branch:** `feat/t34-orbit-wiring`

**Files:**
- Modify: `src/data/bodies.ts` (+ `src/data/types.ts`), `src/scene/solarSystem.ts`, `src/main.ts`, `src/debug/e2eApi.ts`
- Modify tests: `tests/unit/solarSystem.test.ts` (the "draws 256-segment orbit lines" test), `tests/unit/bodies.test.ts`, `tests/e2e/quality.spec.ts`

**Interfaces:**
- Consumes: `createOrbitLine`, `OrbitLine`, `ORBIT_STYLE`, `stepEmphasis` from Task 33; `PlanetRig.body.orbitPivot` and `orbitRadius` from `src/bodies/planet.ts`.
- Produces:
  - `BodyDef.orbitColor?: string` (hex) for the 8 planets and Pluto, in `src/data/`. Suggested palette, tune freely against screenshots: Mercury `#c9bfb3`, Venus `#f3d58a`, Earth `#6fb6ff`, Mars `#ff8a5c`, Jupiter `#e8c9a0`, Saturn `#f0dca0`, Uranus `#8fe3ea`, Neptune `#6f8cff`, Pluto `#c9b8d9`. The Sun and the Moon have none (the Moon keeps no orbit line).
  - `SolarSystem.setViewport(drawingWidthPx: number, drawingHeightPx: number, pixelRatio: number): void` and `SolarSystem.setOrbitFocus(focused: boolean): void`.
  - e2e API: `orbitViewport(): { width: number; height: number; pixelRatio: number } | null` (reads the first orbit material), only present under `?e2e=1`.

- [ ] **Step 1: Write the failing tests.**
  - `bodies.test.ts`: every planet and Pluto has `orbitColor` matching `/^#[0-9a-f]{6}$/i`; Sun and Moon have none.
  - `solarSystem.test.ts` (replace the old LineLoop test): exactly 9 meshes named `orbit-line`, none a `LineLoop`, each a `ShaderMaterial`, geometry radius equal to the body's `orbitRadius`; after `update(t)` the `uPlanetAngle` uniform of each equals that body's `orbitPivot.rotation.y` (Review Focus 2); `setViewport(1000, 500, 2)` reaches every orbit material (Review Focus 1); `setOrbitFocus(true)` then repeated `update` over a few seconds drives each `uEmphasis` to `ORBIT_STYLE.focusEmphasis` within 0.01, and `setOrbitFocus(false)` returns it to 1 (Review Focus 3); a spy confirms `update` allocates no new `Vector3`/arrays per call (reuse scratch objects).
- [ ] **Step 2: Run** `npx vitest run tests/unit/bodies.test.ts tests/unit/solarSystem.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.** `solarSystem.ts`: replace `root.add(createOrbitLine(rig.orbitRadius))` with a per-body `OrbitLine` coloured by `BODIES[id].orbitColor`, keep them in a map, update their planet angle inside `update(tSec)` after the rigs update, and smooth emphasis with `stepEmphasis` using the `tSec` delta (clamp the delta to `[0, 0.25]`). `main.ts`: call `solar.setViewport(...)` once after creation, in the `resize` handler after `renderer.setSize`, and in `onDowngrade` after `applyRendererSettings` (the pixel ratio changes there); use `renderer.getDrawingBufferSize` and `renderer.getPixelRatio`. Call `solar.setOrbitFocus(store.get().view !== 'overview')` at start and next to the existing `labels.setVisible(...)` view-change subscription. `e2eApi.ts`: add `orbitViewport()`.
- [ ] **Step 4: Add the e2e check** in `tests/e2e/quality.spec.ts`: after the existing forced downgrade to `low`, `orbitViewport()` reports `pixelRatio` equal to `pixelRatio()` and `width`/`height` equal to the canvas size in device pixels (poll 25 s or more).
- [ ] **Step 5: Run** `npm run typecheck && npm run lint && npm test` and `npx playwright test tests/e2e/quality.spec.ts --project=desktop` — Expected: all pass. Take one desktop overview screenshot to confirm the ribbons render (no blank canvas, no shader error in the console).
- [ ] **Step 6: Commit** `feat(t34): draw orbit ribbons with per-planet colour and focus dimming`, write `docs/progress/t34.md`, tick this task, per-task flow.

---

### Task 35: Visual tuning, perf check and docs

**Model:** sonnet (`implementer`) · **Branch:** `feat/t35-orbit-look-tuning`

**Files:**
- Modify: `src/bodies/orbitMath.ts` (values in `ORBIT_STYLE` only), `src/data/bodies.ts` (palette only), `tests/visual/screenshots.spec.ts` (one low-angle shot), `docs/screenshots/*.png`, `docs/decisions/0005-performance-results.md`, `docs/perf-results.json`

**Interfaces:** Consumes everything from Tasks 33 and 34. Produces nothing new.

- [ ] **Step 1: Add a low-angle shot** to `tests/visual/screenshots.spec.ts` (desktop project): after the overview shot, drag the canvas vertically about 300 px with the mouse, wait for the camera to settle (poll 25 s or more), save `desktop-overview-low-angle.png`.
- [ ] **Step 2: Run** `npm run test:visual` (about 8 minutes, one Playwright run at a time), then **Read every changed PNG** and record PASS/FAIL per item in `docs/progress/t35.md`:
  - at overview on desktop and phone each orbit is a clearly visible glowing ribbon (core about 2-3 px) and the planets still stand out against it;
  - the bright head sits on each planet and the trail fades behind its motion, and tints are distinguishable;
  - labels, planets and the Sun glow are not covered or washed out; the Sun stays the brightest element;
  - in focus views (Saturn, Earth, a phone tour stop) orbits are dimmed and do not hurt readability of the panel, subtitles or the focused body;
  - in the low-angle shot the ribbons stay at least as wide as the core width (Review Focus 4).
- [ ] **Step 3: Tune** `ORBIT_STYLE` values and the palette until the checklist passes (the Task 33 invariant tests bound the values; do not edit those tests). A FAIL needing more than 30 minutes goes to `docs/KNOWN_ISSUES.md`.
- [ ] **Step 4: Perf check** (Review Focus 5): run `npm run test:perf` once for the desktop project with nothing else running (the headed window opening is expected) and compare with the numbers recorded before this work in `docs/perf-results.json` (overview 47.2, Saturn 42.2 on the Intel Arc iGPU, run-to-run noise about 8 FPS). If the overview or Saturn figure is more than 8 FPS lower, narrow `totalWidthPx` (the halo costs fill rate) and re-measure. Append the before/after numbers and the decision to ADR 0005. Run `npm run build && npm run check:budget` — Expected: exit 0.
- [ ] **Step 5: Verify** `npm run typecheck && npm run lint && npm test` and the specs you touched (`npx playwright test tests/e2e/select.spec.ts --project=pixel7` as a smoke test). The refreshed PNGs are the ones in `docs/screenshots/`; `README.md` already links three of them, so check the three still look right.
- [ ] **Step 6: Commit** `feat(t35): tune orbit ribbon look and record perf`, write `docs/progress/t35.md` (visual checklist table, perf numbers, DECISION lines), tick this task, per-task flow.

---

## Self-review

- **Spec coverage:** the request (orbit circles look like thin threads, make them more impressive) is covered by Task 33 (constant-width glowing ribbon with trail) and Task 34 (per-planet colour, focus dimming, wiring); Task 35 verifies the look, the low-angle case and the cost. The old Task 17 test that pinned `LineLoop`/opacity 0.15 is replaced in Task 34 because its intent (nine faint orbit guides) changes on purpose.
- **Type consistency:** `OrbitLine`, `createOrbitLine(radius, color)`, `setViewport`, `setOrbitFocus`, `ORBIT_STYLE`, `trailIntensity`, `ribbonProfile`, `stepEmphasis` and the `orbitColor` field are named identically wherever they appear.
- **Review Focus:** all five items have a named test or screenshot check in the task that owns the code.
- **Proportion:** three tasks, signatures and assertions only; the only algorithms spelled out (trail wrap, constant-pixel offset with the `w` guard) are the ones the tests do not determine.
- **Hook compatibility:** headings use `### Task NN`, so `.claude/hooks/session-start.mjs` (newest plan file wins) reports the first unticked step of this plan.
