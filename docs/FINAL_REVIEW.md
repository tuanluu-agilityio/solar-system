# Final review (Task 32)

Reviewer: `final-reviewer` (opus), 2026-10-30, on `main` at `ec1a222` (Tasks 1-31 plus 28b merged) in the worktree `chore/t32-final-review`.

Legend: ✅ met, with evidence · ⚠️ met with a caveat or an open item (pointer to `docs/KNOWN_ISSUES.md` or an ADR) · ❌ not met.

**Verdict: APPROVE.** There is no ❌. One ⚠️ is a real open item: the desktop `high` FPS in the overview, see `docs/KNOWN_ISSUES.md` and ADR 0005. The others are small caveats. The small fixes made during this review are listed in "Fixes made in Task 32".

## 1. Gate (test output)

| Command | Result |
|---|---|
| `npm run lint` | ✅ exit 0, no findings |
| `npm run typecheck` | ✅ exit 0 |
| `npm test` (Vitest) | ✅ 34 files, 462 tests passed (33.7 s) |
| `npm run build` | ✅ `dist/assets/index-*.js` 711.5 kB (188.9 kB gzip), CSS 6.7 kB. The Vite "chunk > 500 kB" warning is informational: the budget is 800 KB gzip. |
| `npm run check:budget` | ✅ JS 182.7 KB / 800 KB gzip (22.8 %), initial payload 3.61 MB / 8 MB (45.1 %) |
| `npm run test:e2e` (iPhone 13, Pixel 7, desktop; SwiftShader) | ✅ 82 passed, 8 skipped (device-specific: phone rotation only on pixel7, high-res tests per tier), 0 failed, 0 flaky, 26.2 min, 2 workers. After the Task 32 edit, the Review Focus 2 test was re-run on all three projects: 3 passed. |
| `npx prettier --check --end-of-line auto .` | ✅ after formatting the 6 files that had drifted (see Fixes) |
| `python -m unittest scripts/test_generate_narration.py` | ✅ 19 tests OK |
| CI on `main` | ✅ `gh pr checks`: every merged PR from #2 to #32 has a passing `verify` check (lint, typecheck, Vitest, Playwright e2e, Python narration tests). PR #1 (Task 1) has no checks because CI did not exist before Task 2. From #21 on, a Netlify `deploy-preview` check also appears; it comes from a Netlify app connected to the GitHub repo, not from this repo's workflows. The two Pages deploys after Task 30 (#31, #32) succeeded. |

## 2. Spec §2: goals

| # | Goal | Status | Evidence |
|---|---|---|---|
| 1 | 3D overview, Milky Way background, planets orbiting | ✅ | `src/scene/sky.ts`, `src/scene/solarSystem.ts`; `docs/screenshots/desktop-overview.png`, `iphone13-overview.png`; `tests/unit/sky.test.ts`, `solarSystem.test.ts`; `tests/e2e/boot.spec.ts` |
| 2 | Tap/click a body: smooth fly-to, then the info panel | ✅ | `src/camera/cameraRig.ts`, `src/ui/infoPanel.ts`; `tests/unit/cameraRig.test.ts`; `tests/e2e/select.spec.ts`, `flows.spec.ts` (all 11 bodies in both languages) |
| 3 | Free orbit/zoom with mouse and touch | ✅ | `camera-controls` in `cameraRig.ts`; drag pauses the tour in `tests/e2e/tour.spec.ts`. A real-phone touch check is in `docs/HUMAN_REVIEW.md` §3. |
| 4 | Tour Guide with narration and subtitles | ✅ | `src/tour/*`, `src/ui/subtitles.ts`; `tests/unit/tourMachine.test.ts`, `tourController.test.ts`; `tests/e2e/tour.spec.ts` (runs to `finished` with subtitles) |
| 5 | Bilingual vi/en with a switch | ✅ | `src/i18n/strings.ts`, `src/data/content/{vi,en}.ts`; `tests/unit/content.test.ts`; `tests/e2e/controls.spec.ts`, `panel.spec.ts`, `flows.spec.ts` |
| 6 | Ambient sound + whoosh with an on/off button | ✅ | `src/audio/{ambient,whoosh,audioEngine}.ts` (procedural Web Audio); `tests/unit/audioEngine.test.ts`; `tests/e2e/audio.spec.ts`. Listening is in `HUMAN_REVIEW.md` §1. |
| 7 | Mobile-first, smooth on a mid-range phone | ⚠️ | Emulated Pixel 7 with CPU x4 on a real GPU: 48 / 55.3 FPS (target 30). This is not a real phone, so a real-phone check is in `HUMAN_REVIEW.md` §3 (ADR 0005). |
| 8 | AI harness complete and explained | ✅ | `AGENTS.md` (88 lines), `CLAUDE.md` (`@AGENTS.md`), `src/data/CLAUDE.md`, `.claude/{agents,commands,hooks}`, `docs/ai-setup.md` (vi, 10 sections), `docs/progress/t01..t31 + t28b`, ADRs 0001-0005 |
| 9 | Ready for GitHub Pages | ✅ | `.github/workflows/deploy.yml`. https://tuanluu-agilityio.github.io/solar-system/ returns 200; the JS/CSS bundles (same hashes as the local build), textures (low and high), the narration manifest and the mp3 files all return 200. |

### Non-goals (must not be in v1)

| Non-goal | Status | Evidence |
|---|---|---|
| True scale; real-date ephemeris; moons other than the Moon; comets/spacecraft; sonification; backend/accounts/CMS; third language; VR/AR | ✅ none present | `package.json` has only `three` and `camera-controls` as runtime dependencies; `BODY_IDS` holds the 11 bodies; all of these are listed in `docs/BACKLOG.md` (matches spec §15) |

### Anti-goals (failure even if it "runs")

| Anti-goal | Status | Evidence |
|---|---|---|
| Looks like a graphics exercise (flat colours, no light/shade) | ✅ | WebP textures for every body (procedural Pluto, see BACKLOG), sun PointLight + weak ambient, bloom in every tier, ACES + sRGB; screenshots in `docs/screenshots/` |
| Janky or hot on a mid-range phone; slow on 4G | ⚠️ | Initial payload 3.61 MB of 8 MB; emulated phone FPS passes. Real-phone check in `HUMAN_REVIEW.md` §3. |
| Narration with wrong numbers, generic, or out of sync with the screen | ⚠️ | `tests/unit/bodies.test.ts` (NASA reference values), `tourScripts.test.ts` (word counts, stop order). Proofreading is human work: `HUMAN_REVIEW.md` §2. |
| Sound that autoplays and startles | ✅ | Muted by default (`loadPrefs`: `sse.muted` absent means muted); `audioEngine.unlock()` runs only on a gesture; `tests/unit/prefs.test.ts`, `audioEngine.test.ts` ("creates nothing before unlock"), `tests/e2e/tour.spec.ts` (unmute hint shown while muted) |
| Tour that cannot be exited or replays on every visit | ✅ | EXIT from every state (`tourMachine.test.ts`); autostart only when `sse.tourSeen` is absent, flag set at start (`tests/e2e/tour.spec.ts` "autostarts once"; `tourMachine.test.ts` `shouldAutostart`; `autostart.test.ts`) |
| Future agents cannot understand the conventions | ✅ | `AGENTS.md` invariants, folder map and workflow; `src/data/CLAUDE.md`; `/add-body` |
| An interruption forces a restart from scratch | ✅ | `/resume-work`, `.claude/hooks/session-start.mjs` (prints "Current: Task 32"), per-task progress files, plan checkboxes |

## 3. Spec §11: completion criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | lint, typecheck, Vitest, build pass | ✅ | Section 1 |
| 2 | e2e passes on iPhone 13, Pixel 7, desktop | ✅ | Section 1 (82 passed locally; green on CI for every PR) |
| 2a | Page load without console errors | ✅ | `boot.spec.ts`; `flows.spec.ts` `afterEach` asserts zero console errors |
| 2b | Each clickable body shows the right name and language | ✅ | `flows.spec.ts` "selecting each clickable body…" (11 bodies, both languages) |
| 2c | Back-to-overview button | ✅ | `select.spec.ts`, `panel.spec.ts` |
| 2d | Language switch changes all strings | ✅ | `controls.spec.ts` (persists across reload), `panel.spec.ts`; `content.test.ts` (same key set in vi and en) |
| 2e | Tour: autostart first visit only, pause on interaction, next/prev/exit | ✅ | `tour.spec.ts`; `tourUi.test.ts` (PREV dispatch) |
| 2f | Sound button state persists | ✅ | `audio.spec.ts`, `controls.spec.ts` |
| 2g | Mobile uses the bottom sheet, desktop the left panel | ✅ | `panel.spec.ts`, `flows.spec.ts` (rotation); `tests/unit/layout.test.ts` |
| 3 | Screenshots in `docs/screenshots/`, reviewed against the visual checklist | ✅ | 20 PNGs (desktop + iPhone 13); checklist in `docs/progress/t28.md`; the four visual issues from T28 were fixed in T28b (KNOWN_ISSUES entries marked resolved). Spot-checked `desktop-overview.png` and `iphone13-saturn.png` in this review. |
| 4 | Performance: headed real-GPU run; budgets pass/fail | ⚠️ | Budget passes (section 1). Real-GPU FPS: phone emulation passes; desktop `high` overview 45-54 FPS (target 55), see `docs/KNOWN_ISSUES.md` "Desktop `high` tier overview below 55 FPS" and ADR 0005. The runtime monitor downgrades to `medium` (about 56 FPS) on its own. |
| 5 | Credits complete | ✅ | Section 5 |
| 6 | AI harness complete (§12) | ✅ | Section 8 |

## 4. Review Focus

| # | Item | Status | Code | Pinning tests |
|---|---|---|---|---|
| 1 | A drag/pinch ending over a planet does not select it (tap = < 8 px and < 350 ms) | ✅ | `src/interaction/picker.ts` (`TAP_MAX_MOVE_PX = 8`, `TAP_MAX_MS = 350`, max displacement tracked, second pointer cancels) | `tests/unit/picker.test.ts`: "does not select when a drag ends over a body", "…wanders past 8 px and returns", "…a second pointer joined the gesture"; `tests/e2e/select.spec.ts` real tap |
| 2 | Re-selection mid-flight ends on the second body with its panel; no stuck controls | ✅ | `cameraRig.flyTo` supersedes (the older promise resolves, the latest target wins); `main.ts` `upgradeOnArrival` checks the camera really arrived | `tests/unit/cameraRig.test.ts` "a newer flyTo supersedes…"; `tests/e2e/select.spec.ts` "re-selecting mid-flight…"; `tests/e2e/flows.spec.ts` "tapping Mars then immediately Jupiter…" (now also asserts the panel title, see Fixes); `tests/e2e/hires.spec.ts` "a superseded selection does not load the first body high-res map" |
| 3 | `localStorage` throwing does not crash; defaults used, writes ignored | ✅ | `src/state/prefs.ts` (`read`/`savePref` try/catch), `src/main.ts` `safeStorage()` | `tests/unit/prefs.test.ts` "throwing storage yields defaults", "does not throw when setItem throws", "null storage yields defaults" |
| 4 | A missing or failed narration mp3 does not stall the tour | ✅ | `src/tour/tourController.ts` (stop lasts the manifest duration, or `estimateDurationMs` without one; load watchdog), `src/audio/audioEngine.ts` (error/timeout resolve `error`), `main.ts` `loadNarrationManifest` returns null on failure | `tests/unit/tourController.test.ts` "Review Focus 4: an error at 100 ms still waits until durationMs", "uses estimateDurationMs … without a manifest", "ends a clip that stalls"; `tests/unit/audioEngine.test.ts` error/timeout cases; `tests/unit/narration.test.ts`; `tests/e2e/tour.spec.ts` "a missing narration mp3 does not stall the tour" (all mp3 routes return 404) |
| 5 | Rotate/resize while focused: sheet ⇄ left panel, selection kept, body re-framed | ✅ | `main.ts` resize handler (`store.set({ layout })` + `rig.setLayout` on every resize), `infoPanel.ts` | `tests/unit/cameraRig.test.ts` "setLayout reframes the focused body"; `tests/unit/infoPanel.test.ts` "switches layout without losing the selection"; `tests/e2e/flows.spec.ts` "rotating the phone while Saturn is focused…" (pixel7); `tests/e2e/panel.spec.ts` "resizing between layouts…" |

## 5. Global Constraints (plan header and AGENTS.md invariants)

| Constraint | Status | Evidence |
|---|---|---|
| Windows 11 / Node 24 / npm 11 / Python 3.14; npm scripts run on Windows | ✅ | All scripts are Node or Windows paths (`narration` uses `.venv\Scripts\python`); the whole gate ran on Windows 11 in this review |
| TS `strict` + `noUncheckedIndexedAccess`; no unexplained `any` | ✅ | `tsconfig.json`; `typescript-eslint` recommended (`no-explicit-any`) passes; no `eslint-disable` in `src/` or `tests/` |
| No UI framework, state library or backend | ✅ | `package.json` |
| Body data only in `src/data/`; scale/time only in `src/config/scale.ts`; quality numbers only in `src/quality/tiers.ts` | ✅ | grep for tilts, periods and `EARTH_YEAR` outside these files finds only imports |
| Every user-visible string through `t()`/content, in vi and en | ✅ | `content.test.ts` (same key set, no empty/TODO values, 12 content ids in both languages); `VI: Record<UiKey, string>` makes a missing key a type error; no hard-coded UI text found by grep in `src/ui` or `main.ts` |
| Default language `vi` if any `navigator.languages` entry starts with `vi`; `sse.lang` | ✅ | `prefs.ts` `detectLang`; `prefs.test.ts`; `controls.spec.ts` persists across reload |
| Muted by default; audio only after a gesture | ✅ | `prefs.ts`, `audioEngine.ts` `unlock`; tests in section 2 |
| Tour autostarts once; flag set at start | ✅ | `main.ts` `startTour`; `tour.spec.ts`; `shouldAutostart` tests |
| All audio through `GainNode`s; never `HTMLAudioElement.volume` | ✅ | `grep -rn "\.volume" src tests scripts` finds only a comment in `audioEngine.ts` saying it is never set; narration uses `MediaElementAudioSourceNode` |
| Earth year = 60 s; real tilts; Venus and Uranus retrograde | ✅ | `scale.ts` `EARTH_YEAR_SECONDS = 60`; `scale.test.ts`; `bodies.ts`; `solarSystem.test.ts` "spins Venus, Uranus and Pluto retrograde… as seen from world up" (no double count with tilt > 90°) |
| Layout `mobile` if `width < 768` or `height > width` | ✅ | `src/ui/layout.ts`; `layout.test.ts` |
| Tap targets ≥ 44×44 | ✅ | `.ctl-btn` min 44 px, label `::before` hit area 44 px, sheet grab 44 px; `controls.spec.ts`, `tour.spec.ts` measure the bounding boxes |
| Perf: ≥ 30 FPS phone, ≥ 55 laptop iGPU; ≤ 8 MB initial; ≤ 800 KB JS gzip; pixel ratio ≤ 2 (≤ 1.5 low) | ⚠️ | Budgets pass; pixel ratio caps in `tiers.ts` (`runtimeQuality.test.ts`, `quality.spec.ts`); laptop 55 FPS missed by the `high` tier → `docs/KNOWN_ISSUES.md`, ADR 0005 |
| Quality floor: textured bodies + sun light + sun bloom | ✅ | Bloom in every tier (`tiers.ts` comment, `bloomConfig.test.ts`); `lowerTier` stops at `low` (`quality.test.ts`, `runtimeQuality.test.ts`); FPS monitor off under software GL |
| Voices `vi-VN-HoaiMyNeural`, `en-US-AvaNeural` | ✅ | `public/audio/narration/manifest.json` `voices`; `scripts/generate-narration.py` |
| Credits text and link | ✅ | Section 6 |
| Not-to-scale disclaimer in both languages | ✅ | Section 6 |
| English for code/comments/commits/AGENTS/CLAUDE; Vietnamese for `ai-setup.md` and `HUMAN_REVIEW.md` | ✅ | Checked by reading |

## 6. Credits, disclaimer, bilingual coverage

- ✅ Credits (`src/ui/credits.ts`, `src/i18n/strings.ts`). EN: "Textures: Solar System Scope (CC BY 4.0)" as a link to `https://www.solarsystemscope.com/textures/` (`target=_blank`, `rel=noopener noreferrer`); "Data: NASA Planetary Fact Sheet and NASA Science"; "Narration voice generated with Microsoft Edge TTS". VI: "Texture: Solar System Scope (CC BY 4.0)", "Dữ liệu: NASA Planetary Fact Sheet và NASA Science", "Giọng thuyết minh được tạo bằng Microsoft Edge TTS". Tests: `content.test.ts` "credits carry the required attributions", `controls.spec.ts` "credits modal shows the required credits" (checks the link href). The info panel also shows a source line per body (`infoPanel.test.ts`).
- ✅ Disclaimer `notToScale`. EN "Sizes and distances are not to scale", VI "Kích thước và khoảng cách không theo đúng tỉ lệ". Always shown by `controlBar.ts`, kept clear of the sheet (`panel.spec.ts` "the disclaimer stays clear of the mobile sheet"), pinned by `content.test.ts`.
- ✅ Bilingual coverage. `UI_STRINGS` vi and en have the same key set (test plus type). `CONTENT_VI`/`CONTENT_EN` cover all 11 bodies + `asteroid-belt` (`content.test.ts` "has an entry for exactly every ContentId in both languages", shape checks: 2-4 sentence descriptions, 3-5 facts). Tour scripts `src/data/tour/{vi,en}.json` have the 14 stops (`tourScripts.test.ts`). The WebGL-unsupported and boot-error messages are bilingual (`boot.spec.ts`).

## 7. Tour, narration, audio

- ✅ 14 stops in the spec order (`src/data/tour/stops.ts`, `tourScripts.test.ts` "has 14 stops in the spec order").
- ✅ 28 mp3 files tracked in `public/audio/narration/` (`<stop>.<lang>.mp3`) plus `manifest.json` (14 segments x 2 languages, cues, durations, voices). `narrationAssets.test.ts` checks that every entry exists, lasts 10-50 s, and has contiguous cues. The live site serves them.
- ✅ Autostart only on the first visit, after 3 s (`TOUR_AUTOSTART_DELAY_MS = 3000`), cancelled by any interaction (`autostartStillWanted`).
- ✅ Muted by default; no `HTMLAudioElement.volume` anywhere (grep).
- ✅ Muted tour runs with subtitles for the manifest duration and shows the unmute hint (`tourController.test.ts`, `tourUi.test.ts`, `tour.spec.ts`).

## 8. Harness docs

| Item | Status | Notes |
|---|---|---|
| `AGENTS.md` | ✅ (fixed) | Accurate against the repo. One wrong command fixed in this review: `npm run format -- --check` actually writes (the script is `prettier --write .`). |
| `CLAUDE.md` | ✅ | `@AGENTS.md` import plus Claude-specific notes |
| `src/data/CLAUDE.md` | ✅ | Add-a-body checklist matches `types.ts`, `bodies.ts`, `scale.ts` `INITIAL_PHASE`, `textureKeys.ts`, `labels.ts`, `fetch-textures.mjs` |
| `.claude/commands` (`resume-work`, `status`, `add-body`) | ✅ | Consistent with AGENTS.md; `session-start.mjs` prints the current task |
| `.claude/agents` (5 tiers) | ✅ | Matches the AGENTS.md tier table |
| `.claude/settings.json` | ✅ | Only commit is Task 1 (`4ce3154`): frozen as required |
| `docs/ai-setup.md` (vi) | ✅ | 10 sections cover every item the plan requires |
| `docs/HUMAN_REVIEW.md` (vi) | ✅ (fixed) | §4 said the `high` overview measured "50-54 FPS"; corrected to 45-54 with the controller re-measure (47.2 / 42.2) |
| `docs/KNOWN_ISSUES.md` | ✅ | One open entry (desktop `high` FPS), updated with the re-measure; four resolved entries |
| ADRs 0001-0005, `docs/BACKLOG.md` | ✅ | BACKLOG matches spec §15 plus Pluto and label hysteresis |

## 9. Deployment

- ✅ `.github/workflows/deploy.yml`: push to `main` + `workflow_dispatch`, lint/typecheck/test before the build, `BASE_PATH=/<repo>/`, `upload-pages-artifact` + `deploy-pages`, least-privilege permissions, `pages` concurrency group.
- ✅ The deploy runs for #31 and #32 succeeded (`gh run list --branch main`).
- ✅ https://tuanluu-agilityio.github.io/solar-system/ returns 200. `assets/index-6SURw4Lv.js` and `assets/index-DjAJ5A1D.css` (identical hashes to the local build), `textures/manifest.json`, `textures/low/earth_day.webp`, `textures/low/sky_2048.webp`, `textures/high/jupiter.webp`, `audio/narration/manifest.json`, `intro.vi.mp3` and `outro.en.mp3` all return 200.

## 10. Git hygiene, secrets, leftovers

- ✅ `git log --first-parent main`: after the pre-run spec/plan commits, every change landed through a merge commit of PRs #1 to #32 (31 tasks + 28b), one PR per task. No direct pushes to `main`.
- ✅ Open PRs (`gh pr list --state open`): **none**. No blocked tasks.
- ✅ No secrets (grep for keys, tokens, private keys; only `id-token: write` in `deploy.yml`).
- ✅ No leftover debug code. `debugCam` (temporary in T18) is gone. There is no `console.log` in `src/`. The only `console.*` calls in `src/` are intentional: two `console.info` `[quality]` lines (renderer/tier at boot and downgrades, referenced by `HUMAN_REVIEW.md` §3) and `console.warn` on boot, texture and audio failures. No `TODO`/`FIXME`/`HACK` in code. The e2e API (`window.__app`) is installed only with `?e2e`.
- ⚠️ Stale folders `.worktrees/t08 … t29` remain on disk in the main checkout from Windows `Permission denied` removals. They are not registered worktrees (`git worktree list` shows only `main` and `t32`), and `.worktrees/` is in `.gitignore` and the ESLint ignores, so they do not affect the repo. A human can delete them after closing the processes that hold them.

## 11. Open items (⚠️)

1. Desktop `high` tier overview below 55 FPS on the test laptop: `docs/KNOWN_ISSUES.md`, ADR 0005. Re-measure on an idle laptop (`HUMAN_REVIEW.md` §4); the first lever is `high` `bloomResolutionScale` 0.75.
2. Real-phone FPS, touch and iOS audio cannot be verified by an agent: `HUMAN_REVIEW.md` §3.
3. Content proofreading and listening to the 28 narrations: `HUMAN_REVIEW.md` §1-2.
4. Procedural Pluto texture (no free New Horizons map in the source set): `docs/BACKLOG.md`, ADR 0003.
5. Stale ignored `.worktrees/*` folders on disk (section 10).

## 12. Fixes made in Task 32

There was no ❌. Each of these small fixes took under 30 minutes. Lint, typecheck, Vitest (462), build, check:budget and the changed e2e test were re-run, and all are green.

1. `tests/e2e/flows.spec.ts`: the Review Focus 2 test ("tapping Mars then immediately Jupiter") now also asserts that the panel title is Jupiter's, both right after the switch and after the first flight would have ended. The spec item says "with the second's panel shown". Before this, only the selection and camera target were asserted. The test passes on all three projects; the behaviour was already correct.
2. `AGENTS.md`: `npm run format -- --check` was documented as the check command, but the script is `prettier --write .`, so that command writes to every file. The doc now says to use `npx prettier --check .` (with `--end-of-line auto` on a Windows `core.autocrlf` checkout). This review hit the bug: the documented command reformatted the worktree, and the change was reverted with `git checkout`.
3. Prettier drift: 6 files were not Prettier-formatted (`scripts/fetch-textures.mjs`, `src/data/CLAUDE.md`, `src/state/prefs.ts`, `tests/e2e/boot.spec.ts`, `tests/unit/narrationAssets.test.ts`, `tests/unit/prefs.test.ts`). They were formatted; the changes are whitespace and line wrapping only.
4. `.github/workflows/ci.yml`: added `npm run check:budget` after `npm run test:e2e`. The e2e web server already builds `dist/`, so the 8 MB / 800 KB budget gate now runs on every PR instead of only by hand. `AGENTS.md` mentions it.
5. `docs/HUMAN_REVIEW.md` §4: corrected the measured desktop `high` overview range (45-54 FPS, controller re-measure 47.2 / 42.2, monitor downgrade to `medium`). `docs/KNOWN_ISSUES.md`: added the re-measure to the open FPS entry.

## 13. Open PRs

`gh pr list --state open` returned nothing on 2026-10-30: no open or blocked PRs.
