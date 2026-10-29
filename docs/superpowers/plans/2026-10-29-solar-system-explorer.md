# Solar System Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mobile-first, bilingual (vi/en) three.js web app showing a realistic, animated Solar System with fly-to inspection, info panels, ambient audio and a narrated auto Tour Guide, plus a complete AI-agent harness so any agent can resume or extend the work.

**Architecture:** Vite + strict TypeScript, vanilla DOM UI. Pure logic (scale math, tour state machine, i18n, prefs, quality tiers, narration cues) lives in three.js-free modules that are unit-tested with Vitest. Rendering modules consume that logic. A tiny store connects modules. Pre-generated assets (WebP textures, Edge TTS mp3 + cue manifest) are committed, so build and CI need no network services.

**Tech Stack:** three.js, camera-controls, TypeScript (strict), Vite, Vitest, Playwright (Chromium), ESLint + Prettier, sharp (texture processing), Python 3.14 + edge-tts 7.3.x (narration, build-time only), GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-29-solar-system-explorer-design.md` (Vietnamese). Section numbers like "§3.8" refer to it.

## How this plan is executed (read first)

- **Task 1 runs with the user present.** It creates `.claude/settings.json`, the file that pre-approves every command the run needs. Until it exists, Claude Code will ask permission for its edits and its push. From Task 2 on, the run is fully automatic.
- **Session model:** the orchestrating session (the "controller") runs on **Sonnet** (the user sets it with `/model sonnet`). Each task header says `Model:`. Dispatch it to the subagent of that tier, defined in Task 3: `implementer-light` = haiku, `implementer` = sonnet, `implementer-heavy` = opus. Reviews go to `reviewer` (sonnet). Task 32 goes to `final-reviewer` (opus). If a task fails twice on its tier, re-dispatch one tier up and log `DECISION:`.

### Per-task flow (user-approved: one branch + one PR per task, AI merges after CI passes)

1. **Prepare.** `git fetch origin` and `git switch main && git pull --ff-only origin main`. Create the task's worktree from the Branch Map: `git worktree add .worktrees/t<NN> -b <branch> origin/main`, then in it run `npm ci` (from Task 3 on; Task 2 creates the lockfile). Serial tasks may also use a worktree; this keeps the main checkout always on a clean `main`.
2. **Implement.** Dispatch the implementer subagent with: the task's full text from this plan, the spec sections the task cites, the `Global Constraints` section, and the worktree path (all work happens in that folder). It follows the task's TDD steps and commits on the branch with Conventional Commits: `feat(t04): add display scale math`, followed by the trailer `Co-Authored-By: Claude <noreply@anthropic.com>`.
3. **Verify.** The controller re-runs the task's verification commands in the worktree itself; it does not trust the report.
4. **Review.** Dispatch `reviewer` with the task text + `git diff origin/main...<branch>`. Pass 1: spec/task compliance (nothing missing, nothing extra). Pass 2: code quality against `AGENTS.md`. If it reports fixes, send them to the implementer. At most 2 fix rounds, then escalate one model tier (`DECISION:`).
5. **Record.** In the worktree, tick the task's checkboxes in this plan and write `docs/progress/t<NN>.md`:
   - status;
   - a one-paragraph summary;
   - verification output (short);
   - `DECISION:` lines;
   - review verdict.

   Commit `docs(t<NN>): record progress`. One file per task means parallel branches never conflict on the log.
6. **Pull request.**
   - `git push -u origin <branch>`.
   - `gh pr create --base main --head <branch> --title "<type>(t<NN>): <task title>" --body-file <tmp>`. The body has: task link (plan heading), summary, files changed, test results, `DECISION:`s, the reviewer verdict, and the attribution line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
7. **CI.**
   - If the PR is behind `main`, run `gh pr update-branch <n>` first.
   - Run `gh pr checks <n> --watch --fail-fast`.
   - On failure: read the log with `gh run view --log-failed`, fix it on the branch (implementer), push, and watch again. After 2 failed rounds the task is blocked (step 9).
   - Task 1 runs before CI exists. When `gh pr checks` reports no checks, merge after step 3 passed.
8. **Merge.** `gh pr merge <n> --merge --delete-branch` (a merge commit, so `git log --first-parent main` reads as the task list). Then remove the worktree (`git worktree remove .worktrees/t<NN>`), then `git switch main && git pull --ff-only origin main`.
9. **Blocked.**
   - Leave the PR open with a comment explaining the block, and add the label `blocked` (`gh pr edit <n> --add-label blocked`; create the label if missing).
   - Add a `docs/KNOWN_ISSUES.md` entry (committed on the next task's branch).
   - Every task that depends on it (Wave Plan) is skipped and also logged as blocked. Independent tasks continue.
   - If nothing independent remains, write `RUN HALTED — see KNOWN_ISSUES` in `docs/progress/halt.md` on a branch, open its PR, and stop.

### Wave Plan (user-approved: parallel by waves, at most 3 implementers at once)

| Wave | Tasks | Mode | Depends on |
|---|---|---|---|
| A | 1 → 2 → 3 → 4 | serial | — |
| B | 5, 6, 9, 10, 11, 12, 13 | parallel, ≤ 3 at a time | Wave A |
| C | 7 and 8 in parallel, then 14 | 7 ∥ 8, then 14 | 7 needs 5, 6; 8 needs 6, 9, 10, 11; 14 needs 7, 13 |
| D | 15 → 16 → … → 32 | serial | Waves B and C |

- In parallel waves, each task has its own worktree, branch and PR. Steps 1–9 run independently per task.
- PRs merge one at a time. Before each merge, step 7's `update-branch` + re-check guarantees the PR was tested against the current `main`.
- If an update causes a merge conflict, resolve it on the branch (the implementer that owns the task), re-run the verification, and push.
- Wave tasks were chosen to touch disjoint files. The only shared file is this plan (checkboxes in different sections, which git merges cleanly).

### Other rules

- **Resume after interruption:** run `/resume-work` (Task 3). It reconciles `git worktree list`, open PRs (`gh pr list --state open`), and the plan's checkboxes. The first unticked task of the earliest unfinished wave is current. For tasks already in flight it resumes at the right step: a branch without a PR resumes at step 3; a PR whose checks pass resumes at step 8.
- **Never ask the user mid-run** (§12.6):
  - Unspecified detail: choose the option most faithful to the spec, log `DECISION:` in the task's progress file (or write an ADR in `docs/decisions/` if it is architectural), and continue.
  - Blocked: follow step 9.
- **Never:**
  - push to `main` directly or force-push;
  - merge a PR whose checks fail;
  - edit `.claude/settings.json` after Task 1;
  - delete or weaken a passing test to get green.
- **"PROGRESS" in task steps** means the current task's `docs/progress/t<NN>.md`.

## Branch Map

| Task | Branch |
|---|---|
| 1 | `chore/t01-agent-permissions-hooks` |
| 2 | `chore/t02-project-scaffold` |
| 3 | `chore/t03-agent-context-files` |
| 4 | `feat/t04-scale-math` |
| 5 | `feat/t05-body-data` |
| 6 | `feat/t06-bilingual-content` |
| 7 | `feat/t07-tour-scripts` |
| 8 | `feat/t08-prefs-i18n-store` |
| 9 | `feat/t09-layout-framing` |
| 10 | `feat/t10-tour-state-machine` |
| 11 | `feat/t11-quality-tiers` |
| 12 | `feat/t12-texture-pipeline` |
| 13 | `feat/t13-narration-script` |
| 14 | `feat/t14-narration-audio` |
| 15 | `feat/t15-renderer-sky-loading` |
| 16 | `feat/t16-sun-bloom` |
| 17 | `feat/t17-planets-orbits` |
| 18 | `feat/t18-earth-rings-atmosphere` |
| 19 | `feat/t19-asteroid-belt` |
| 20 | `feat/t20-picking-labels` |
| 21 | `feat/t21-camera-rig` |
| 22 | `perf/t22-lazy-hires-textures` |
| 23 | `feat/t23-control-bar` |
| 24 | `feat/t24-info-panel` |
| 25 | `feat/t25-audio-engine` |
| 26 | `feat/t26-tour-controller` |
| 27 | `perf/t27-runtime-quality` |
| 28 | `test/t28-e2e-visual-review` |
| 29 | `perf/t29-budget-fps` |
| 30 | `ci/t30-pages-deploy` |
| 31 | `docs/t31-agent-harness-final` |
| 32 | `chore/t32-final-review` |

## Global Constraints

- Windows 11, Node 24, npm 11, Python 3.14. Every npm script must run on Windows. Use cross-platform Node scripts, not bash-only syntax.
- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`. No `any` without an eslint-disable comment explaining why.
- No UI framework (no React/Vue/Svelte), no state library, no backend.
- Body data lives ONLY in `src/data/`. Scale/time constants live ONLY in `src/config/scale.ts`. Quality numbers live ONLY in `src/quality/tiers.ts`.
- Every user-visible string goes through `t()` or the content modules, and must exist in both `vi` and `en`.
- Default language: `vi` if any `navigator.languages` entry starts with `vi`, else `en`. Persisted under the `localStorage` key `sse.lang`.
- Sound is **muted by default** (`sse.muted` absent ⇒ muted). Audio starts only after a user gesture.
- Tour autostarts once: only when `sse.tourSeen` is absent. The flag is set at tour start.
- All audio goes through the Web Audio API (`GainNode`s). Never set `HTMLAudioElement.volume`.
- Earth year = 60 s of display time. Real axial tilts. Venus and Uranus rotate retrograde (negative rotation period).
- Layout is `mobile` if `width < 768` OR `height > width`, else `desktop`.
- Tap targets are ≥ 44×44 CSS px.
- Performance targets:
  - ≥ 30 FPS on a mid-range phone, ≥ 55 FPS on a laptop iGPU;
  - initial load (JS + low textures + sky) ≤ 8 MB;
  - JS ≤ 800 KB gzip;
  - pixel ratio ≤ 2 (≤ 1.5 on the `low` tier).
- Quality must never drop below: textured bodies + sun light + sun bloom.
- Voices: `vi-VN-HoaiMyNeural`, `en-US-AvaNeural`.
- Credits must show:
  - "Textures: Solar System Scope (CC BY 4.0)" with a link to https://www.solarsystemscope.com/textures/;
  - NASA as the data source;
  - "Narration voice generated with Microsoft Edge TTS".
- UI disclaimer (both languages): sizes and distances are not to scale.
- Code, comments, commit messages, `AGENTS.md`/`CLAUDE.md`: English. `docs/ai-setup.md` and `docs/HUMAN_REVIEW.md`: Vietnamese.

## Review Focus

1. **A drag/pinch that ends over a planet must not select it.** Only a tap selects: pointer moves < 8 px and lasts < 350 ms. Pinned by a test in Task 20.
2. **Selecting a second body while the camera is still flying to the first** must end focused on the second, with the second's panel shown. Last request wins, no stuck controls. Pinned by tests in Task 21 and Task 28.
3. **`localStorage` throwing** (Safari private mode, blocked storage) must not crash the app: defaults are used and writes are ignored. Pinned by a test in Task 8.
4. **A missing or failed narration mp3** (404, decode error, edge-tts gap) must not stall the tour: the stop lasts the manifest duration, or `estimateDurationMs(text)` when the duration is missing, with subtitles only. Pinned by tests in Task 14 and Task 26.
5. **Rotating the phone or resizing while a body is focused** must switch between bottom sheet and left panel without losing the selection, and re-frame the body. Pinned by a test in Task 28.

---

## File Structure

```
.claude/settings.json            permissions + hooks (T1)
.claude/hooks/session-start.mjs  prints resume summary (T1)
.claude/hooks/stop-check.mjs     quick typecheck gate (T3)
.claude/agents/*.md              implementer-light|implementer|implementer-heavy|reviewer|final-reviewer (T3)
.claude/commands/*.md            resume-work, status (T3), add-body (T31)
AGENTS.md, CLAUDE.md             agent context; CLAUDE.md imports AGENTS.md (T3, finalized T31)
docs/progress/t<NN>.md, KNOWN_ISSUES.md, BACKLOG.md, HUMAN_REVIEW.md, ai-setup.md, decisions/NNNN-*.md, screenshots/
scripts/fetch-textures.mjs       download + resize + WebP + manifest (T13)
scripts/generate-narration.py    edge-tts → mp3 + cues manifest (T14)
scripts/check-budget.mjs         size budget check (T30)
src/main.ts                      composition root
src/config/scale.ts              display scale + time math (pure)
src/data/types.ts, bodies.ts, content/{vi,en,index}.ts, tour/{stops.ts,vi.json,en.json}
src/i18n/{strings.ts,i18n.ts}
src/state/{store.ts,appState.ts,prefs.ts}
src/quality/{tiers.ts,fpsMonitor.ts}
src/tour/{tourMachine.ts,narration.ts,tourController.ts}
src/scene/{renderer.ts,sky.ts,postfx.ts,textures.ts,solarSystem.ts,loop.ts}
src/bodies/{planet.ts,sun.ts,earth.ts,rings.ts,asteroidBelt.ts,orbitLine.ts}
src/camera/{framing.ts,cameraRig.ts}
src/interaction/picker.ts
src/audio/{audioEngine.ts,ambient.ts,whoosh.ts}
src/ui/{layout.ts,styles.css,loadingScreen.ts,controlBar.ts,infoPanel.ts,labels.ts,subtitles.ts,tourControls.ts,credits.ts}
src/debug/e2eApi.ts
public/textures/{low,high}/*.webp, public/textures/manifest.json
public/audio/narration/*.mp3, public/audio/narration/manifest.json
tests/unit/**, tests/e2e/**, tests/visual/screenshots.spec.ts, tests/perf/fps.spec.ts
playwright.config.ts, playwright.perf.config.ts, vite.config.ts, tsconfig.json, eslint.config.js, .prettierrc
.github/workflows/ci.yml         PR gate (T2)
.github/workflows/deploy.yml     Pages deploy (T30)
```

---

## Phase 0 — Harness and scaffold

### Task 1: Permissions, session-start hook, tracking docs
**Model:** sonnet · **Run with the user present** (see the "How this plan is executed" section).

**Files:**
- Create: `.claude/settings.json`
- Create: `.claude/hooks/session-start.mjs`
- Create: `docs/progress/README.md`, `docs/KNOWN_ISSUES.md`, `docs/BACKLOG.md`, `docs/decisions/0001-record-architecture-decisions.md`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `node .claude/hooks/session-start.mjs` prints the resume summary to stdout and exits 0, even when files are missing.

- [x] **Step 1: Read the permission-rule syntax**

  Fetch https://code.claude.com/docs/en/settings and https://code.claude.com/docs/en/hooks, then use the current syntax.

- [x] **Step 2: Write `.claude/settings.json`**

  `permissions.allow` gets one rule per command family from spec §12.3:
  - npm: `npm install`, `npm ci`, `npm run *`;
  - npx: `npx playwright *`, `npx vitest *`, `npx tsc *`, `npx eslint *`, `npx prettier *`;
  - Python: `python -m venv .venv`, `.venv/Scripts/python *`, `.venv/Scripts/pip install *`;
  - Node: `node scripts/*`, `node .claude/hooks/*`;
  - git: `init`, `add`, `commit`, `status`, `diff`, `log`, `branch`, `checkout`, `switch`, `stash`, `rev-parse`, `show`, `merge *`, `fetch *`, `pull --ff-only *`, `worktree *`;
  - push, branches only: `git push -u origin <type>/t*` for each type `feat`, `fix`, `chore`, `docs`, `test`, `perf`, `ci`, `refactor`, and `git push origin <type>/t*`;
  - GitHub CLI: `gh pr create *`, `gh pr checks *`, `gh pr merge *`, `gh pr view *`, `gh pr list *`, `gh pr edit *`, `gh pr comment *`, `gh pr update-branch *`, `gh run view *`, `gh run list *`, `gh label create *`, `gh api repos/tuanluu-agilityio/solar-system/pages*`;
  - file tools: `Read`, `Edit`, `Write`, `Glob`, `Grep`;
  - `WebFetch` for these domains: `www.solarsystemscope.com`, `nasa.gov` subdomains, `nssdc.gsfc.nasa.gov`, `science.nasa.gov`, `code.claude.com`, `registry.npmjs.org`, `pypi.org`.

  `permissions.deny`:
  - `git push origin main*`, `git push * main`, `git push --force*`, `git push -f*`, `git push * --force*`, `git push --delete *`, `git remote *`, `git reset --hard *`, `git clean *`, `git branch -D *`, `git rebase *`;
  - `gh repo delete *`, `gh pr merge * --admin*`, `gh api -X DELETE *`;
  - `npm install -g *`, `pip install *` outside `.venv`;
  - `rm -rf /*`, `rm -rf ~*`;
  - `Edit(.claude/settings.json)`, `Write(.claude/settings.json)`.

  `hooks.SessionStart`: command `node .claude/hooks/session-start.mjs`. `hooks.Stop`: command `node .claude/hooks/stop-check.mjs` (the script arrives in Task 3; until then the hook fails harmlessly and Claude Code continues).

- [x] **Step 3: Write `session-start.mjs`**

  Plain Node, no dependencies. It prints at most 40 lines:
  1. the newest file in `docs/superpowers/plans/`;
  2. the first heading `### Task N` that still has an unticked `- [ ]` under it;
  3. the 5 most recently modified files in `docs/progress/` (first 3 lines of each), plus open PRs from `gh pr list --state open --json number,headRefName,title` (skip silently if `gh` fails) and `git worktree list`;
  4. the titles of open entries in `docs/KNOWN_ISSUES.md` (`## ` headings without `(resolved)`);
  5. the current branch (`git branch --show-current`) and `git status --porcelain` (first 10 lines).

  It catches every error and exits 0.

- [x] **Step 4: Create the docs**

  - `docs/progress/README.md`: explains the one-file-per-task log (`t<NN>.md` with Status / Summary / Verification / Decisions / Review).
  - `KNOWN_ISSUES.md`: heading plus the entry format `## <title>` / `Task:` / `Symptom:` / `Tried:` / `Status:`.
  - `BACKLOG.md`: the spec §15 items as bullets.
  - ADR 0001: the format to use (Context / Decision / Consequences).

- [x] **Step 5: Update `.gitignore`**

  Append `node_modules/`, `dist/`, `.venv/`, `.cache/`, `.worktrees/`, `test-results/`, `playwright-report/`, `__pycache__/`.

- [x] **Step 6: Verify**

  Run: `node .claude/hooks/session-start.mjs`
  Expected: it prints the plan path, "Task 1" as the current task, and exits 0.

- [x] **Step 7: Commit** (format from the "How this plan is executed" section)

### Task 2: Project scaffold and toolchain
**Model:** sonnet

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc`, `index.html`, `src/main.ts`, `vitest.config.ts` (or a `test` block in vite config), `playwright.config.ts`, `tests/unit/smoke.test.ts`, `tests/e2e/smoke.spec.ts`, `.github/workflows/ci.yml`

**Interfaces:**
- Produces npm scripts:
  - `dev`, `build` (`tsc --noEmit && vite build`), `preview`;
  - `lint`, `format`, `typecheck`;
  - `test` (`vitest run`), `test:e2e` (`playwright test`);
  - `test:visual`, `test:perf`, `fetch:textures`, `narration`, `check:budget` (filled in by later tasks; define them now as scripts that point at the future files).
- `vite.config.ts`: `base` is `'/'` in dev and `process.env.BASE_PATH ?? '/solar-system/'` in build. That is the single place to change the base path.

- [x] **Step 1: Install dependencies**

  `npm install three camera-controls` and `npm install -D typescript vite vitest @types/three eslint typescript-eslint prettier @playwright/test sharp jsdom`. Then run `npx playwright install chromium`.

- [x] **Step 2: Write `playwright.config.ts`**

  - `webServer` runs `npm run build && npm run preview -- --port 4173`, `baseURL` is `http://localhost:4173/solar-system/`.
  - Three Chromium projects:
    - `iphone13`: iPhone 13 viewport/UA/touch, with `browserName: 'chromium'`;
    - `pixel7`: `devices['Pixel 7']`;
    - `desktop`: 1440×900.
  - `launchOptions.args`: `['--use-angle=swiftshader','--enable-unsafe-swiftshader']`.
  - `testDir: tests/e2e`.

- [x] **Step 3: Write the smoke tests**

  - Unit: `expect(1+1).toBe(2)`.
  - E2E: `page.goto('./')`, then expect `page.locator('canvas, #app')` to have count ≥ 1.

- [x] **Step 4: Write `.github/workflows/ci.yml`** (the PR gate)

  - Trigger: `pull_request` to `main`.
  - Runner: `ubuntu-latest`, Node 24 with npm cache.
  - Steps: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npx playwright install --with-deps chromium`, `npm run test:e2e`.
  - If `scripts/test_generate_narration.py` exists: setup-python 3.14, `pip install -r scripts/requirements.txt`, `python -m unittest scripts/test_generate_narration.py`.
  - Upload `playwright-report/` as an artifact on failure.
  - Concurrency group per PR with `cancel-in-progress`.
  - It must not run `test:visual`, `test:perf`, `fetch:textures` or `narration`.

- [x] **Step 5: Verify**

  Run: `npm run lint && npm run typecheck && npm test && npm run test:e2e`
  Expected: all pass, 1 unit test and 3 e2e results (one per project). Then the PR's CI (flow step 7) must pass. That is the first real run of `ci.yml`.

- [x] **Step 6: Commit**

### Task 3: Agent context files, subagents, resume commands, stop hook
**Model:** sonnet

**Files:**
- Create: `AGENTS.md`, `CLAUDE.md`
- Create: `.claude/agents/{implementer-light,implementer,implementer-heavy,reviewer,final-reviewer}.md`
- Create: `.claude/commands/{resume-work,status}.md`
- Create: `.claude/hooks/stop-check.mjs`
- Create: ADR `docs/decisions/0002-agents-md-single-source.md`

**Interfaces:**
- `CLAUDE.md` = the line `@AGENTS.md` plus a short section of Claude-only notes (model tiers, commands). `AGENTS.md` is the single source.

- [x] **Step 1: Write `AGENTS.md`** (under 150 lines)

  - one-paragraph purpose;
  - links to the spec and plan;
  - commands;
  - folder map (from File Structure);
  - Invariants (copy the Global Constraints);
  - Workflow: a summary of the per-task flow (worktree → branch → TDD → verify → review → progress file → PR → CI → merge), the Branch Map location, the Wave Plan, Conventional Commits, the `DECISION:` rule and the blocked rule;
  - How to resume;
  - Where things go (ADRs, KNOWN_ISSUES, BACKLOG).

- [x] **Step 2: Write the five subagent files**

  Each has frontmatter `name`, `description` and `model`: `implementer-light` haiku, `implementer` sonnet, `implementer-heavy` opus, `reviewer` sonnet, `final-reviewer` opus. The body tells the agent to:
  - read `AGENTS.md`, the given task and the referenced spec sections only;
  - follow TDD;
  - never ask the user;
  - report changed files plus the test output.

  `reviewer` checks spec compliance and code quality, then returns APPROVE or a list of required fixes.

- [x] **Step 3: Write `resume-work.md`**

  Steps:
  1. read the session-start summary (or run the hook);
  2. reconcile in-flight work:
     - `git worktree list`, `gh pr list --state open`, and `git branch --no-merged origin/main`;
     - for each in-flight task, find its flow step (no PR → step 3 verify; PR open with failing or pending checks → step 7; PR green → step 8 merge);
     - uncommitted changes in a worktree: commit them if that task's tests pass, otherwise `git stash push -m "t<NN>-partial"` and redo the task's implementation step;
  3. continue with the Wave Plan (respect dependencies and the ≤ 3 parallel limit) using superpowers:subagent-driven-development.

- [x] **Step 4: Write `status.md`**

  It prints done/total task counts, the current wave and in-flight tasks, open PRs with check status, open issues, and the latest 5 progress files.

- [x] **Step 5: Write `stop-check.mjs` and register it**

  The hook runs `npm run typecheck` only when `git diff --name-only` contains `.ts` files. It prints a short failure summary and exits 0 (it informs, it does not block). It is already registered under `hooks.Stop` by Task 1. If that entry is missing, log it in KNOWN_ISSUES for the user; do not edit settings.

- [x] **Step 6: Verify**

  Run: `node .claude/hooks/stop-check.mjs && node .claude/hooks/session-start.mjs`
  Expected: both exit 0; the second shows Task 3 as current.

- [x] **Step 7: Commit**

---

## Phase 1 — Data and pure logic

### Task 4: Domain types and scale math
**Model:** sonnet

**Files:**
- Create: `src/data/types.ts`, `src/config/scale.ts`
- Test: `tests/unit/scale.test.ts`

**Interfaces — Produces:**
```ts
// src/data/types.ts
export type Lang = 'vi' | 'en';
export const BODY_IDS = ['sun','mercury','venus','earth','moon','mars','jupiter','saturn','uranus','neptune','pluto'] as const;
export type BodyId = typeof BODY_IDS[number];
export type ContentId = BodyId | 'asteroid-belt';
export type BodyKind = 'star'|'terrestrial'|'gas-giant'|'ice-giant'|'dwarf-planet'|'moon';
export interface PhysicalData {
  diameterKm: number; massEarths: number; surfaceGravity: number; // m/s²
  rotationPeriodHours: number;          // negative = retrograde
  axialTiltDeg: number; meanTempC: number;
  distanceFromParentMkm?: number;       // million km (Moon: from Earth)
  orbitalPeriodDays?: number; knownMoons?: number;
}
export interface BodyDef { id: BodyId; kind: BodyKind; parent: BodyId | null; orderFromSun: number | null; physical: PhysicalData; }
export interface BodyContent { name: string; kindLabel: string; description: string; facts: string[]; }
export type TourStopId = 'intro' | ContentId | 'outro';
export interface TourStopDef { id: TourStopId; focus: ContentId | 'overview'; }
```
```ts
// src/config/scale.ts
export const EARTH_YEAR_SECONDS = 60;
export const EARTH_DAY_SECONDS = 20;
export const MOON_ORBIT_DISPLAY = 4;                 // display units from Earth centre
export const ASTEROID_BELT_MKM = { inner: 329, outer: 479 } as const;
export function displayRadius(diameterKm: number): number;          // 1.2 * (d / 12756) ** 0.45
export function displayOrbitRadius(distanceMkm: number): number;    // 20 + 28 * Math.sqrt(d / 57.9)
export function orbitalAngle(periodDays: number, tSeconds: number, phase: number): number;
export function rotationAngle(rotationPeriodHours: number, tSeconds: number): number;
export const INITIAL_PHASE: Record<BodyId, number>;   // radians, spread so no two planets line up at t=0
```
The formulas above are the default. They may be retuned after the screenshots in Task 28 if the constraints below still hold; log any change as an ADR.

- [ ] **Step 1: Write the failing tests** in `tests/unit/scale.test.ts`
  - `displayRadius` is strictly increasing. Using the Task 5 diameters (literal values here): sun > jupiter > saturn > uranus > neptune > earth > venus > mars > mercury > moon > pluto.
  - `displayOrbitRadius(57.9)` ≈ 48; Neptune's (4515) < Pluto's (5906.4); the planet orbit order is preserved.
  - `displayRadius(1392700) < displayOrbitRadius(57.9) - 5`: the Sun doesn't swallow Mercury.
  - Saturn's ring outer radius (`2.3 * displayRadius(120536)`) < half the gap between the Saturn and Jupiter orbits.
  - `orbitalAngle(365.25, 60, 0)` ≈ 2π (±1e-6); the ratio of `orbitalAngle` for Mars (687) to Earth over the same t ≈ 365.25/687.
  - `rotationAngle(-5832.5, 10) < 0`; `rotationAngle(23.93, EARTH_DAY_SECONDS)` ≈ 2π.
  - Belt inner/outer display radii fall strictly between the Mars and Jupiter orbits.
- [ ] **Step 2:** Run `npx vitest run tests/unit/scale.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement the types and the scale functions with the formulas above**

  - `orbitalAngle = phase + 2π · tSeconds / (EARTH_YEAR_SECONDS · periodDays / 365.25)`.
  - `rotationAngle = 2π · tSeconds / (EARTH_DAY_SECONDS · hours / 23.93)`; the sign follows the sign of the period.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Commit**

### Task 5: Body physical data (NASA)
**Model:** sonnet

**Files:**
- Create: `src/data/bodies.ts`
- Test: `tests/unit/bodies.test.ts`

**Interfaces — Produces:** `export const BODIES: Record<BodyId, BodyDef>`; `export const PLANET_ORDER: BodyId[]` (mercury…neptune, pluto).

Reference values (NASA Planetary Fact Sheet; massEarths is derived from 10²⁴ kg ÷ 5.97). These literals go in both the data and the test:

| id | diameterKm | massEarths | gravity | rotH | tilt° | tempC | distMkm | orbitDays |
|---|---|---|---|---|---|---|---|---|
| sun | 1392700 | 333000 | 274 | 609.12 | 7.25 | 5500 | – | – |
| mercury | 4879 | 0.0553 | 3.7 | 1407.6 | 0.034 | 167 | 57.9 | 88.0 |
| venus | 12104 | 0.815 | 8.9 | -5832.5 | 177.4 | 464 | 108.2 | 224.7 |
| earth | 12756 | 1 | 9.8 | 23.9 | 23.4 | 15 | 149.6 | 365.2 |
| moon | 3475 | 0.0123 | 1.6 | 655.7 | 6.7 | -20 | 0.384 | 27.3 |
| mars | 6792 | 0.107 | 3.7 | 24.6 | 25.2 | -65 | 228.0 | 687.0 |
| jupiter | 142984 | 317.8 | 23.1 | 9.9 | 3.1 | -110 | 778.5 | 4331 |
| saturn | 120536 | 95.2 | 9.0 | 10.7 | 26.7 | -140 | 1432.0 | 10747 |
| uranus | 51118 | 14.5 | 8.7 | -17.2 | 97.8 | -195 | 2867.0 | 30589 |
| neptune | 49528 | 17.1 | 11.0 | 16.1 | 28.3 | -200 | 4515.0 | 59800 |
| pluto | 2376 | 0.0022 | 0.7 | -153.3 | 122.5 | -225 | 5906.4 | 90560 |

`knownMoons`: take the current counts from https://science.nasa.gov/solar-system/moons/ at implementation time. Put the date in a comment `// knownMoons as of YYYY-MM-DD`. Do not pin these in tests (they change).

`orderFromSun`: mercury = 1 … neptune = 8, pluto = 9; sun and moon are `null`. `parent`: moon → earth; everything else → sun; sun → `null`.

- [ ] **Step 1: Write the failing test**

  For each row, every field equals the table (`toBeCloseTo` with 2 significant digits for massEarths). Also:
  - every body except sun/moon has `parent === 'sun'`;
  - kinds: mercury/venus/earth/mars terrestrial; jupiter/saturn gas-giant; uranus/neptune ice-giant; pluto dwarf-planet; moon moon; sun star.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Implement `bodies.ts`**
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Commit**

### Task 6: Bilingual body content and UI strings
**Model:** opus (content writing, §12.5)

**Files:**
- Create: `src/data/content/vi.ts`, `src/data/content/en.ts`, `src/data/content/index.ts`
- Create: `src/i18n/strings.ts`
- Test: `tests/unit/content.test.ts`

**Interfaces — Produces:**
- `CONTENT_VI`, `CONTENT_EN: Record<ContentId, BodyContent>`;
- `getContent(id: ContentId, lang: Lang): BodyContent`;
- `UI_STRINGS: Record<Lang, Record<UiKey, string>>`, where `UiKey` is the union of the keys of `UI_STRINGS.en` (declared `as const`).

Required UI keys:
- `appTitle`, `hintDesktop`, `hintMobile`, `backToOverview`, `notToScale`;
- `sound.on`, `sound.off`, `tour.start`, `tour.stop`, `tour.pause`, `tour.resume`, `tour.next`, `tour.prev`, `tour.exit`, `tour.progress` (with `{current}`/`{total}`), `tour.unmuteHint`;
- `credits.title`, `credits.textures`, `credits.data`, `credits.voice`, `credits.close`;
- `loading`, `webglUnsupported`;
- `field.*` for: `kind`, `order`, `diameter`, `mass`, `distance`, `orbitalPeriod`, `rotationPeriod`, `meanTemp`, `moons`, `gravity`;
- `kind.*` for each `BodyKind`;
- `lang.switch`.

- [ ] **Step 1: Write the failing test**
  - For both languages and every `ContentId`: `name`, `kindLabel` and `description` are non-empty; `description` has 2–4 sentences; `facts.length` is between 3 and 5.
  - `Object.keys(UI_STRINGS.vi)` equals `Object.keys(UI_STRINGS.en)` (sorted).
  - No value contains `TODO` or is empty.
  - `getContent('pluto','vi').kindLabel` mentions "hành tinh lùn".
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Write the content**

  Base it on NASA Science pages (fetch them), with friendly, specific, accurate wording. Write the English natively, not as a translation of the Vietnamese.
  - The Pluto content explains the 2006 IAU reclassification.
  - `asteroid-belt` content: location 2.2–3.2 AU, Ceres, total mass < Moon's.
  - Number formatting is not part of the content (done by the panel in Task 24).
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Commit**

### Task 7: Tour stops and narration scripts
**Model:** opus

**Files:**
- Create: `src/data/tour/stops.ts`, `src/data/tour/vi.json`, `src/data/tour/en.json`
- Test: `tests/unit/tourScripts.test.ts`

**Interfaces — Produces:**
```ts
export const TOUR_STOPS: TourStopDef[]; // TourStopDef comes from src/data/types.ts // intro(overview), sun, mercury, venus, earth, moon, mars, asteroid-belt, jupiter, saturn, uranus, neptune, pluto, outro(overview) — 14 entries, this order
```
JSON shape (both files, read by Python in Task 13): `{ "<stopId>": { "text": "<narration>" } }`. Sentences end with `.`, `!` or `?`.

- [ ] **Step 1: Write the failing test**
  - `TOUR_STOPS.length === 14`, with the ids in exactly the order above.
  - Both JSON files have exactly those 14 keys.
  - Word count (split on whitespace): vi between 60 and 110, en between 50 and 100.
  - Every text has ≥ 2 sentences.
  - Each body stop's text contains the body's localized name from `getContent`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Write the scripts**

  Tone: friendly science presenter, concrete numbers and one surprising fact per stop, consistent with the Task 5 data and Task 6 content. Intro welcomes and explains the controls briefly; outro invites free exploration. English is written natively.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Commit**

### Task 8: Prefs, i18n and the app store
**Model:** sonnet

**Files:**
- Create: `src/state/prefs.ts`, `src/i18n/i18n.ts`, `src/state/store.ts`, `src/state/appState.ts`
- Test: `tests/unit/prefs.test.ts`, `tests/unit/i18n.test.ts`, `tests/unit/store.test.ts`

**Interfaces — Produces:**
```ts
// prefs.ts
export interface KeyValueStorage { getItem(k: string): string | null; setItem(k: string, v: string): void; }
export interface Prefs { lang: Lang; muted: boolean; tourSeen: boolean; }
export const PREF_KEYS = { lang: 'sse.lang', muted: 'sse.muted', tourSeen: 'sse.tourSeen' } as const;
export function detectLang(languages: readonly string[]): Lang;
export function loadPrefs(storage: KeyValueStorage | null, languages: readonly string[]): Prefs;
export function savePref<K extends keyof Prefs>(storage: KeyValueStorage | null, key: K, value: Prefs[K]): void;
// i18n.ts
export function t(lang: Lang, key: UiKey, params?: Record<string, string | number>): string;
export function formatNumber(lang: Lang, value: number, maxFractionDigits?: number): string; // Intl.NumberFormat('vi-VN'|'en-US')
// store.ts
export interface Store<T> { get(): T; set(patch: Partial<T>): void; subscribe(fn: (s: T, prev: T) => void): () => void; }
export function createStore<T extends object>(initial: T): Store<T>;
// appState.ts
export type View = 'overview' | 'focus';
export interface AppState { lang: Lang; muted: boolean; selected: ContentId | null; view: View; layout: Layout; quality: QualityTier; tour: TourSnapshot; ready: boolean; }
```
`AppState` imports `Layout` from `src/ui/layout.ts` (Task 9), `QualityTier` from `src/quality/tiers.ts` (Task 11), `TourSnapshot` from `src/tour/tourMachine.ts` (Task 10) and `UiKey` from `src/i18n/strings.ts` (Task 6). All of these are merged before Task 8 starts (Wave Plan).

- [ ] **Step 1: Write the failing tests**
  - `detectLang(['vi-VN','en'])` → `'vi'`; `detectLang(['en-US'])` → `'en'`; `detectLang([])` → `'en'`.
  - `loadPrefs` with an empty storage → `{lang: detected, muted: true, tourSeen: false}`.
  - Stored `sse.muted='false'` → `muted: false`. Stored `sse.lang='xx'` → falls back to the detected language.
  - **Review Focus 3:** with a storage whose `getItem`/`setItem` throw, `loadPrefs` returns the defaults and `savePref` does not throw. `loadPrefs(null, …)` also returns the defaults.
  - `t('vi','tour.progress',{current:5,total:14})` contains `5` and `14`. An unknown param is left as-is.
  - `formatNumber('vi', 1392700)` → `'1.392.700'`; `formatNumber('en', 1392700)` → `'1,392,700'`.
  - Store: `set` notifies subscribers with `(next, prev)`; unsubscribe stops notifications; a `set` with identical values does not notify.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement** (prefs wraps every storage call in try/catch).
- [ ] **Step 4:** Run them. Expected: PASS.
- [ ] **Step 5: Commit**

### Task 9: Layout rule and framing math
**Model:** sonnet

**Files:**
- Create: `src/ui/layout.ts`, `src/camera/framing.ts`
- Test: `tests/unit/layout.test.ts`, `tests/unit/framing.test.ts`

**Interfaces — Produces:**
```ts
export type Layout = 'mobile' | 'desktop';
export function getLayout(width: number, height: number): Layout;            // mobile if width < 768 || height > width
export function focusDistance(radius: number, fovDeg: number, aspect: number, fill?: number): number; // fill default 0.35 of the limiting dimension
export function focusScreenOffset(layout: Layout): { x: number; y: number }; // NDC shift: mobile {0, 0.45}, desktop {0.25, 0}
export const OVERVIEW_FIT_RADIUS: number; // displayOrbitRadius(5906.4) + 10
```

- [ ] **Step 1: Write the failing tests**
  - `getLayout(390,844)` → `'mobile'`; `getLayout(1024,1366)` → `'mobile'` (portrait); `getLayout(1440,900)` → `'desktop'`; `getLayout(767,500)` → `'mobile'`.
  - `focusDistance` grows linearly with radius.
  - A narrower aspect gives a larger distance.
  - `focusDistance(1,50,1)` > 1 (the camera stays outside the body).
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement**

  `focusDistance = radius / Math.sin(atan(tan(fov/2) · min(1, aspect)) · fill)`. Clamp it to ≥ `radius * 1.6`.
- [ ] **Step 4:** Run them. Expected: PASS.
- [ ] **Step 5: Commit**

### Task 10: Tour state machine
**Model:** opus

**Files:**
- Create: `src/tour/tourMachine.ts`
- Test: `tests/unit/tourMachine.test.ts`

**Interfaces — Produces:**
```ts
export type TourStatus = 'idle' | 'flying' | 'narrating' | 'gap' | 'paused' | 'finished';
export interface TourSnapshot { status: TourStatus; index: number; total: number; pausedFrom: TourStatus | null; }
export type TourEvent =
  | { type: 'START' } | { type: 'FLIGHT_DONE' } | { type: 'NARRATION_ENDED' } | { type: 'GAP_ELAPSED' }
  | { type: 'USER_INTERACTED' } | { type: 'PAUSE' } | { type: 'RESUME' }
  | { type: 'NEXT' } | { type: 'PREV' } | { type: 'EXIT' } | { type: 'LANG_CHANGED' };
export type TourEffect =
  | { type: 'flyTo'; stop: TourStopDef } | { type: 'showPanel'; id: ContentId | null }
  | { type: 'playNarration'; stopId: TourStopId } | { type: 'stopNarration' }
  | { type: 'startGap'; ms: number } | { type: 'cancelGap' } | { type: 'autoOrbit'; on: boolean };
export const TOUR_GAP_MS = 1500;
export function initialTour(total: number): TourSnapshot;
export function tourReducer(s: TourSnapshot, e: TourEvent, stops: TourStopDef[]): { state: TourSnapshot; effects: TourEffect[] };
export function shouldAutostart(tourSeen: boolean, isE2E: boolean, forceAutostart: boolean): boolean;
```

- [ ] **Step 1: Write the failing tests** (state transitions with exact effects)
  - `START` from `idle` → `flying` at index 0, effects `[cancelGap? none, flyTo(stops[0]), showPanel(null)]`. The intro/outro focus `'overview'` gives `showPanel(null)`; a body stop gives `showPanel(id)`.
  - `FLIGHT_DONE` in `flying` → `narrating`, effects include `playNarration(stopId)` and `autoOrbit(true)`.
  - `NARRATION_ENDED` → `gap` with `startGap(1500)`.
  - `GAP_ELAPSED` → next index `flying` with `flyTo`. On the last index → `finished`, effects `[autoOrbit(false)]`, then `showPanel(null)`.
  - `USER_INTERACTED` while `flying|narrating|gap` → `paused` with `pausedFrom` set, effects `[stopNarration, cancelGap, autoOrbit(false)]`. While `idle|finished` → no change, no effects.
  - `RESUME` from `paused` → `flying` at the same index with `flyTo` (always re-fly and restart that stop's narration).
  - `NEXT`/`PREV` clamp to [0, total−1] and emit `stopNarration`, `cancelGap`, `flyTo`. `PREV` at 0 stays at 0 and re-flies.
  - `EXIT` from any active state → `idle` with `[stopNarration, cancelGap, autoOrbit(false)]`.
  - `LANG_CHANGED` while `narrating` → stays `narrating` with `[stopNarration, playNarration(sameStop)]`. In other states → no effects.
  - `shouldAutostart(false,false,false)` → true; `shouldAutostart(true,false,false)` → false; `isE2E` true → false unless `forceAutostart`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement `tourReducer` as a pure switch**
- [ ] **Step 4:** Run them. Expected: PASS.
- [ ] **Step 5: Commit**

### Task 11: Quality tiers and FPS monitor
**Model:** sonnet

**Files:**
- Create: `src/quality/tiers.ts`, `src/quality/fpsMonitor.ts`
- Test: `tests/unit/quality.test.ts`

**Interfaces — Produces:**
```ts
export type QualityTier = 'low' | 'medium' | 'high';
export interface DeviceInfo { isMobile: boolean; dpr: number; cores: number; }
export interface TierSettings { pixelRatioCap: number; bloomResolutionScale: number; asteroidCount: number; textureSet: 'low' | 'high'; atmosphere: boolean; ringShadow: boolean; skySize: 2048 | 4096; antialias: boolean; }
export function initialTier(d: DeviceInfo): QualityTier;    // mobile → 'low' if cores<=4 else 'medium'; desktop → 'high'
export function tierSettings(t: QualityTier): TierSettings;
export function lowerTier(t: QualityTier): QualityTier;     // high→medium→low→low
export function createFpsMonitor(opts?: { thresholdFps?: number; windowMs?: number }): { sample(dtMs: number): 'downgrade' | null; reset(): void };
```
Values:

| tier | pixelRatioCap | bloomResolutionScale | asteroidCount | textureSet | atmosphere | ringShadow | skySize | antialias |
|---|---|---|---|---|---|---|---|---|
| low | 1.5 | 0.5 | 1500 | low | true | false | 2048 | false |
| medium | 2 | 0.75 | 4000 | low | true | false | 4096 | true |
| high | 2 | 1 | 8000 | high | true | true | 4096 | true |

Bloom is present in every tier (the quality floor).

- [ ] **Step 1: Write the failing tests**
  - Table values for each tier.
  - `lowerTier('low') === 'low'`.
  - `initialTier({isMobile:true,dpr:3,cores:4})` → `'low'`.
  - FPS monitor: 3000 ms of 40 ms frames → `'downgrade'` exactly once, then `null` until `reset()`. 3000 ms of 16 ms frames → never. Fewer than 3000 ms of samples → `null`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement**
- [ ] **Step 4:** Run them. Expected: PASS.
- [ ] **Step 5: Commit**

---

## Phase 2 — Assets

### Task 12: Texture pipeline
**Model:** sonnet

**Files:**
- Create: `scripts/fetch-textures.mjs`, `public/textures/manifest.json` (generated), `public/textures/{low,high}/*.webp` (generated, committed)
- Create: ADR `0003-webp-textures.md`
- Test: `tests/unit/textureManifest.test.ts`

**Interfaces — Produces:**

`manifest.json` shape: `{ "low": { "<key>": "textures/low/<key>.webp" }, "high": { … } }` (paths are relative to `import.meta.env.BASE_URL`).

Keys: `sun`, `mercury`, `venus_surface`, `venus_atmosphere`, `earth_day`, `earth_night`, `earth_clouds`, `moon`, `mars`, `jupiter`, `saturn`, `saturn_ring`, `uranus`, `neptune`, `pluto`, `sky_2048`, `sky_4096`.

Sources (verified 2026-10-29) are `https://www.solarsystemscope.com/textures/download/<file>`:
- `8k_sun.jpg`, `8k_mercury.jpg`, `8k_venus_surface.jpg`, `4k_venus_atmosphere.jpg`;
- `8k_earth_daymap.jpg`, `8k_earth_nightmap.jpg`, `8k_earth_clouds.jpg`, `8k_moon.jpg`, `8k_mars.jpg`;
- `8k_jupiter.jpg`, `8k_saturn.jpg`, `8k_saturn_ring_alpha.png`;
- `2k_uranus.jpg`, `2k_neptune.jpg`, `8k_stars_milky_way.jpg`.

- [ ] **Step 1: Write the failing test**

  Every key exists in both `low` and `high` (sky keys only in `low`). Every referenced file exists on disk. `low` files are ≤ 2048 px wide (check with `sharp(...).metadata()`), `high` files are ≤ 4096. The sum of `low` sizes + `sky_2048` ≤ 5.5 MB.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Implement `fetch-textures.mjs`**
  - Download to `.cache/textures-src/` (skip files already cached).
  - With sharp, write `low` (2048×1024; uranus/neptune at their native 2048) and `high` (4096×2048, never upscaled) as WebP q=82. The ring is a PNG→WebP with alpha, 2048 wide in both sets.
  - Earth clouds: convert the source luminance to the alpha channel (white clouds on transparent).
  - **Pluto (no source):** generate a 2048×1024 procedural equirectangular map with sharp from SVG noise: base tan/beige, darker reddish equatorial band (Cthulhu region), and a lighter heart-shaped patch (Tombaugh Regio) centred at lon ≈ 180°. Use the same file for both sets. Add a BACKLOG line "replace procedural Pluto texture with a New Horizons global map".
  - The script is idempotent and prints a size summary.
- [ ] **Step 4:** Run `npm run fetch:textures` then `npx vitest run tests/unit/textureManifest.test.ts`. Expected: PASS.

  If the download fails after 3 retries: KNOWN_ISSUES entry, mark `[blocked]`, and continue. Task 15 has a fallback.
- [ ] **Step 5: Commit** (including the generated assets; the `.cache` folder stays ignored)

### Task 13: Narration generation script
**Model:** sonnet

**Files:**
- Create: `scripts/generate-narration.py`, `scripts/requirements.txt` (`edge-tts==7.3.*`), `scripts/test_generate_narration.py`

**Interfaces — Produces:** `public/audio/narration/<stopId>.<lang>.mp3` and `public/audio/narration/manifest.json`:
```json
{ "version": 1, "voices": { "vi": "vi-VN-HoaiMyNeural", "en": "en-US-AvaNeural" },
  "segments": { "<stopId>": { "<lang>": { "file": "audio/narration/<stopId>.<lang>.mp3", "durationMs": 0, "hash": "<sha256 of text+voice>",
      "cues": [ { "startMs": 0, "endMs": 0, "text": "…" } ] } } } }
```
edge-tts 7.3 API: `edge_tts.Communicate(text, voice, boundary="SentenceBoundary")`; iterate `async for chunk in c.stream()`. `chunk["type"]` is one of `"audio"` (`chunk["data"]` bytes), `"SentenceBoundary"` and `"WordBoundary"`; `offset`/`duration` are in 100-ns units (ms = value / 10_000).

- [ ] **Step 1: Write failing tests** (`unittest`) for the pure helpers:
  - `ticks_to_ms(12_340_000) == 1234`;
  - `text_hash(text, voice)` is stable and changes when either input changes;
  - `split_sentences("A. B! C?") == ["A.","B!","C?"]`;
  - `fallback_cues(sentences, duration_ms)` gives contiguous cues proportional to character counts, covering [0, duration_ms];
  - `needs_regen(manifest_entry, hash, mp3_exists)`.
- [ ] **Step 2:** Run `.venv/Scripts/python -m unittest scripts/test_generate_narration.py` (create the venv first with `python -m venv .venv` and `.venv/Scripts/pip install -r scripts/requirements.txt`). Expected: FAIL.
- [ ] **Step 3: Implement the helpers and `main()`**
  - Read `src/data/tour/{vi,en}.json`.
  - For each segment whose hash changed: stream it, write the mp3, and build cues from the `SentenceBoundary` events (fall back to `fallback_cues` if there are none).
  - `durationMs` = the last boundary offset + duration, else the mp3 length estimated at 48 kbps.
  - Retry 3× with backoff 2/4/8 s. On final failure, keep the old entry if there is one, print `FAILED <stopId>.<lang>`, and exit 1 after processing everything else.
- [ ] **Step 4:** Run the unit tests. Expected: PASS.
- [ ] **Step 5: Commit**

### Task 14: Generate narration audio and the client-side manifest reader
**Model:** haiku

**Files:**
- Create (generated): `public/audio/narration/*`
- Create: `src/tour/narration.ts`
- Test: `tests/unit/narration.test.ts`

**Interfaces — Produces:**
```ts
export interface Cue { startMs: number; endMs: number; text: string; }
export interface NarrationSegment { file: string; durationMs: number; cues: Cue[]; }
export interface NarrationManifest { version: 1; segments: Record<TourStopId, Partial<Record<Lang, NarrationSegment>>>; }
export function cueAt(cues: Cue[], ms: number): Cue | null;
export function estimateDurationMs(text: string): number;   // 400 ms per word, min 4000
export function resolveSegment(m: NarrationManifest | null, stopId: TourStopId, lang: Lang, scriptText: string): NarrationSegment & { audio: boolean };
```

- [ ] **Step 1:** Run `npm run narration` (`.venv/Scripts/python scripts/generate-narration.py`). Expected: 28 mp3 files plus `manifest.json`. On failure follow the blocked rule. `resolveSegment` still gives a subtitle-only fallback.
- [ ] **Step 2: Write the failing tests**
  - `cueAt` finds the cue at boundaries (start inclusive, end exclusive) and returns null past the end.
  - **Review Focus 4:** `resolveSegment(null, 'saturn', 'vi', text)` returns `audio:false`, `durationMs = estimateDurationMs(text)` and cues from sentence-proportional splitting. A missing language entry behaves the same.
  - Test file (`tests/unit/narrationAssets.test.ts`): if the manifest exists, every one of the 14×2 entries has an existing mp3 and `durationMs` between 10000 and 50000.
- [ ] **Step 3: Implement `narration.ts`**
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** (mp3s included)

---

## Phase 3 — Rendering

### Task 15: Renderer, sky, loop, loading screen, e2e API
**Model:** sonnet

**Files:**
- Create: `src/scene/renderer.ts`, `src/scene/sky.ts`, `src/scene/textures.ts`, `src/scene/loop.ts`, `src/ui/loadingScreen.ts`, `src/ui/styles.css`, `src/debug/e2eApi.ts`
- Modify: `src/main.ts`, `index.html`
- Test: `tests/e2e/boot.spec.ts`

**Interfaces — Produces:**
```ts
export function createRenderer(canvas: HTMLCanvasElement, settings: TierSettings): THREE.WebGLRenderer; // ACESFilmic, SRGBColorSpace, exposure 1.0
export function isWebGLAvailable(): boolean;
export function loadTextureSet(set: 'low' | 'high', keys: string[], onProgress: (loaded: number, total: number) => void): Promise<Map<string, THREE.Texture>>;
export function createSky(tex: THREE.Texture): THREE.Mesh;  // inverted sphere radius 5000, depthWrite false
export function startLoop(tick: (dtSec: number, tSec: number) => void): { stop(): void }; // pauses on document.hidden
export interface E2EApi { getState(): AppState; select(id: ContentId): Promise<void>; overview(): Promise<void>; tour(e: TourEvent): void; setTimeScale(n: number): void; }
export function installE2EApi(api: E2EApi): void; // only when location.search has 'e2e'; sets window.__app
```
- Missing texture fallback: if a texture key fails to load, use a 2×2 solid-colour `DataTexture` (per-body base colour) and log a warning. The scene must still render.
- `AppState.ready` becomes true when the low set and sky are loaded and the first frame has rendered.

- [ ] **Step 1: Write the failing e2e** (`?e2e=1`)
  - within 20 s `window.__app.getState().ready === true`;
  - a `canvas` is visible;
  - zero `console.error` messages;
  - the loading screen is hidden;
  - with WebGL disabled (a separate test, `page.addInitScript` stubbing `getContext` to return null) the `webglUnsupported` text is shown in the detected language.
- [ ] **Step 2:** Run `npx playwright test tests/e2e/boot.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**

  The loading screen shows `t('loading')` and a % bar driven by `onProgress`. Full-viewport canvas; `touch-action: none` on the canvas; `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
- [ ] **Step 4:** Run it. Expected: PASS on 3 projects.
- [ ] **Step 5: Commit**

### Task 16: Sun, light and bloom
**Model:** opus

**Files:**
- Create: `src/bodies/sun.ts`, `src/scene/postfx.ts`
- Create: ADR `0004-bloom-implementation.md` (choose three's `EffectComposer` + `UnrealBloomPass`; switch to the `postprocessing` package only if it measurably beats it in Task 29)

**Interfaces — Produces:**
```ts
export function createSun(tex: THREE.Texture): { group: THREE.Group; light: THREE.PointLight; update(tSec: number): void; radius: number };
export function createPostFX(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, s: TierSettings): { render(): void; setSize(w: number, h: number): void; setSettings(s: TierSettings): void };
```
- Sun: `MeshBasicMaterial`-like emissive surface via a `ShaderMaterial`. It samples the texture with two slowly scrolling UV offsets and multiplies by a granulation noise. Add a soft additive corona sprite (radius × 1.6).
- Light: `PointLight` colour `#fff4e0`, intensity tuned, `decay: 0`. Ambient light `0x223344` at intensity 0.04.
- Bloom: strength 1.2, radius 0.6, threshold 0.85; resolution × `bloomResolutionScale`.
- The only test here is a visual check: verify with a temporary e2e that `getState().ready` stays true. Real visual checks happen in Task 28.

- [ ] **Step 1: Implement `createSun`, `createPostFX`, and wire them in `main.ts`**
- [ ] **Step 2: Verify**

  Run: `npm run typecheck && npx playwright test tests/e2e/boot.spec.ts`
  Expected: PASS.
- [ ] **Step 3: Take a screenshot and check it**

  Run `npx playwright screenshot --viewport-size=1440,900 "http://localhost:4173/solar-system/?e2e=1" .cache/sun.png`, with `npm run preview` running. Then open the PNG (Read tool) and check the sun glows and is not a flat disc. Log the result in PROGRESS (the task's progress file).
- [ ] **Step 4: Commit**

### Task 17: Planets, orbits, Moon, solar system assembly
**Model:** sonnet

**Files:**
- Create: `src/bodies/planet.ts`, `src/bodies/orbitLine.ts`, `src/scene/solarSystem.ts`
- Test: `tests/unit/solarSystem.test.ts` (three.js without a renderer)

**Interfaces — Produces:**
```ts
export interface BodyObject { id: BodyId; orbitPivot: THREE.Object3D; tiltGroup: THREE.Object3D; mesh: THREE.Mesh; radius: number; pickProxy: THREE.Mesh; }
export interface FocusTarget { object: THREE.Object3D; radius: number; }
export interface SolarSystem {
  root: THREE.Group; bodies: Map<BodyId, BodyObject>; pickables: THREE.Object3D[];
  update(tSec: number): void; getFocusTarget(id: ContentId): FocusTarget; setTierSettings(s: TierSettings): void;
}
export function createSolarSystem(tex: Map<string, THREE.Texture>, s: TierSettings): SolarSystem;
```
- Planets use `MeshStandardMaterial` (roughness 1, metalness 0) and sphere segments 64 (32 on the `low` tier).
- Hierarchy: `orbitPivot` (rotates by `orbitalAngle`, positioned at the parent) → offset by `displayOrbitRadius` → `tiltGroup` (rotation.z = tilt) → `mesh` (rotation.y = `rotationAngle`).
- The Moon's pivot is Earth's offset node (not the tilt group), radius `MOON_ORBIT_DISPLAY`. Tidally locked: mesh rotation.y = −(its orbital angle) so the same face points at Earth.
- `pickProxy`: an invisible sphere (`visible=false` but raycastable via `layers`, or `material.visible=false`) with radius `max(radius * 1.8, 2.5)` and `userData.bodyId`. This is the enlarged tap target from §3.3.
- Orbit lines: `LineLoop` with 256 segments, white at opacity 0.15, one per planet and Pluto.
- `getFocusTarget('asteroid-belt')` returns an `Object3D` placed on the belt at the Earth-facing side, with radius 12.

- [ ] **Step 1: Write the failing test**
  - `createSolarSystem` with 1×1 `DataTexture`s for every key has 11 bodies.
  - After `update(60)`, Earth's world position has returned to within 1e-3 of its `update(0)` position (one year).
  - Moon's world distance from Earth ≈ `MOON_ORBIT_DISPLAY`.
  - Each body's `pickProxy` radius ≥ `mesh` radius × 1.8 or ≥ 2.5.
  - `pickables.length === 11`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Implement it and add it to the scene in `main.ts`, driven by the loop**
- [ ] **Step 4:** Run it plus `npm run test:e2e`. Expected: PASS.
- [ ] **Step 5: Commit**

### Task 18: Earth, Venus atmosphere, Saturn and Uranus rings
**Model:** opus

**Files:**
- Create: `src/bodies/earth.ts`, `src/bodies/rings.ts`
- Modify: `src/scene/solarSystem.ts`

**Interfaces — Produces:**
```ts
export function createEarthMaterial(day: THREE.Texture, night: THREE.Texture, sunWorldPos: THREE.Vector3): THREE.ShaderMaterial; // day/night blend by N·L, night lights on dark side, smooth terminator
export function createCloudLayer(clouds: THREE.Texture, radius: number): THREE.Mesh;   // radius*1.01, rotates 1.2x Earth
export function createAtmosphere(radius: number, color: THREE.ColorRepresentation, intensity: number): THREE.Mesh; // Fresnel rim, additive, BackSide, radius*1.04
export function createRing(innerR: number, outerR: number, tex: THREE.Texture | null, opacity: number): THREE.Mesh;  // RingGeometry with radial UV remap
```
- Saturn ring: inner `radius*1.24`, outer `radius*2.3`, alpha texture, `DoubleSide`, receives the planet shadow when `ringShadow` (a cheap analytic shadow in the shader is acceptable).
- Uranus ring: inner `radius*1.6`, outer `radius*2.0`, no texture, opacity 0.12. It sits in Uranus' tilt group, so it is ~vertical.
- Atmospheres: Earth `#4da6ff` intensity 1.0; Venus uses the `venus_atmosphere` texture as its surface map plus a pale-yellow atmosphere at intensity 0.6. Skip atmospheres when `atmosphere=false`.

- [ ] **Step 1: Implement**
- [ ] **Step 2:** Run `npm run typecheck && npm test && npm run test:e2e`. Expected: PASS.
- [ ] **Step 3: Screenshot check**

  Use `window.__app.select('earth')` after Task 21 exists. For now, set a temporary camera via `?e2e=1&debugCam=earth` (handled in `e2eApi.ts`; remove it in Task 21), then Read the PNG.

  Check:
  - Earth shows a lit side and a dark side with city lights;
  - clouds are visible;
  - there is a blue rim;
  - Saturn's rings are translucent.

  Log the result in PROGRESS (the task's progress file).
- [ ] **Step 4: Commit**

### Task 19: Asteroid belt
**Model:** sonnet

**Files:**
- Create: `src/bodies/asteroidBelt.ts`
- Modify: `src/scene/solarSystem.ts`
- Test: `tests/unit/asteroidBelt.test.ts`

**Interfaces — Produces:**
`export function createAsteroidBelt(count: number, seed?: number): { mesh: THREE.InstancedMesh; update(tSec: number): void; setCount(n: number): void }`

- An `InstancedMesh` of low-poly icosahedra (detail 0), sized 0.08–0.35, grey-brown `MeshStandardMaterial`.
- Radii are uniform in the display range of `ASTEROID_BELT_MKM`; heights are ±1.5 (gaussian-ish).
- Seeded PRNG (mulberry32) for determinism.
- The whole belt rotates at the angular speed of a 4.6-year orbit.

- [ ] **Step 1: Write the failing test**

  The same seed gives the same first matrix. All instance radii are within the inner/outer display radii. `setCount(1500)` sets `mesh.count` to 1500.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Implement it and add it with `asteroidCount` from the tier**
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Commit**

### Task 20: Picking (tap vs drag) and labels
**Model:** sonnet

**Files:**
- Create: `src/interaction/picker.ts`, `src/ui/labels.ts`
- Test: `tests/unit/picker.test.ts`

**Interfaces — Produces:**
```ts
export const TAP_MAX_MOVE_PX = 8; export const TAP_MAX_MS = 350;
export function isTap(down: { x: number; y: number; t: number }, up: { x: number; y: number; t: number }): boolean;
export function createPicker(dom: HTMLElement, camera: THREE.Camera, pickables: THREE.Object3D[], onPick: (id: BodyId) => void): { dispose(): void };
export function createLabels(container: HTMLElement, bodies: Map<BodyId, BodyObject>, camera: THREE.Camera, getLang: () => Lang): { update(): void; setVisible(v: boolean): void };
```
- The picker uses pointer events. It only raycasts when `isTap` is true, and only for single-pointer gestures: if a second pointer went down during the gesture, it is not a tap.
- Labels are HTML `div`s positioned by projecting each body's world position every frame. They are hidden when behind the camera.
- Label visibility:
  - Mercury, Venus, Earth, Mars, Moon, Pluto: always visible in overview;
  - the others: visible on desktop hover, and always on mobile;
  - all labels hidden in `focus` view.
- Labels are clickable too (select that body). Label font 12px; tap area padding ≥ 44px height via `::before` hit-area.

- [ ] **Step 1: Write the failing tests** (Review Focus 1)
  - `isTap({0,0,0},{3,4,200})` → true (moved 5 px);
  - `isTap({0,0,0},{10,0,100})` → false;
  - `isTap({0,0,0},{0,0,400})` → false;
  - with a synthetic jsdom pointer sequence (down, move 30 px, up) over the canvas, `onPick` is never called. Stub the raycast by passing a pickable whose raycast always hits.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement**
- [ ] **Step 4:** Run them. Expected: PASS.
- [ ] **Step 5: Commit**

### Task 21: Camera rig (fly-to, follow, overview, auto-orbit)
**Model:** opus

**Files:**
- Create: `src/camera/cameraRig.ts`
- Modify: `src/main.ts`, `src/debug/e2eApi.ts` (remove `debugCam`)
- Test: `tests/e2e/select.spec.ts`

**Interfaces — Produces:**
```ts
export interface CameraRig {
  flyTo(target: FocusTarget): Promise<void>;     // resolves when transition completes; a newer flyTo/flyToOverview supersedes (older promise resolves, no-op)
  flyToOverview(): Promise<void>;
  update(dtSec: number): void;                   // follows the current target's world position each frame
  setAutoOrbit(on: boolean): void;               // azimuth += 0.08 rad/s while on
  setLayout(layout: Layout): void;               // re-applies focusScreenOffset + reframes current target
  onUserInteract(cb: () => void): () => void;    // fires on controls 'controlstart'
}
export function createCameraRig(camera: THREE.PerspectiveCamera, dom: HTMLElement): CameraRig;
```
- Use `camera-controls` (`CameraControls.install({ THREE: subsetOfTHREE })`).
- Touch: one finger = `TOUCH_ROTATE`, two fingers = `TOUCH_DOLLY_TRUCK`. Mouse: left = rotate, wheel = dolly, right = truck. `smoothTime` 0.25, `draggingSmoothTime` 0.1.
- Fly duration ≈ 2 s. Use `setLookAt(..., true)` and set `smoothTime` to ~0.6 during flights, then restore it.
- Focus: `minDistance = radius*1.3`, `maxDistance = radius*12`, distance = `focusDistance(...)`. Apply `focusScreenOffset(layout)` via `camera.setViewOffset` so the body sits in the upper half (mobile) or right of centre (desktop, clear of the left panel).
- Overview: target the origin, `fitToSphere(OVERVIEW_FIT_RADIUS)` from polar angle 60°; `minDistance` 30, `maxDistance` 1600.
- Follow: each frame, move both camera position and target by the target's world-position delta (`controls.setTarget`/`setPosition` with `enableTransition=false`, preserving the user's orbit).
- In `main.ts`, the selection flow:
  1. `store.set({selected:id, view:'focus'})`;
  2. whoosh (Task 25 hook, a no-op until then);
  3. `rig.flyTo`.

  The back action does `flyToOverview` and sets `{selected:null, view:'overview'}`.
- Rapid re-selection: the latest call wins (a generation counter).

- [ ] **Step 1: Write the failing e2e** (`?e2e=1`, all 3 projects)
  - `select('saturn')`: within 5 s `getState()` gives `{selected:'saturn', view:'focus'}`;
  - `overview()` gives `{selected:null, view:'overview'}`;
  - **Review Focus 2:** `select('mars')` immediately followed by `select('jupiter')`: within 5 s `selected === 'jupiter'` and `window.__app.cameraTargetId()` is `'jupiter'`. Add `cameraTargetId(): ContentId | null` to `E2EApi`.
  - A real tap on the screen-projected position of Jupiter (computed via `__app.projectBody('jupiter')` → `{x,y}` in CSS px; add it to `E2EApi`) selects Jupiter.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Implement**
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Commit**

### Task 22: Lazy high-resolution textures on focus
**Model:** sonnet

**Files:**
- Modify: `src/scene/textures.ts`, `src/scene/solarSystem.ts`, `src/main.ts`
- Test: `tests/e2e/hires.spec.ts`

**Interfaces — Produces:** `export function textureKeysFor(id: BodyId): string[]` (e.g. earth → `earth_day`, `earth_night`, `earth_clouds`); `SolarSystem.upgradeTextures(id: BodyId, tex: Map<string, THREE.Texture>): void`.

- Only when `tierSettings(quality).textureSet === 'high'`: after `flyTo` resolves, load the `high` keys for that body and swap the maps, disposing the low textures only if no other body uses them.
- Cache it, so it loads once per body.

- [ ] **Step 1: Write the failing e2e** (desktop project only)

  After `select('jupiter')` and waiting 5 s, the network log contains a request for `textures/high/jupiter.webp`. On the `iphone13` project there are no `textures/high/` requests.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Implement**
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Commit**

---

## Phase 4 — UI, audio, tour

### Task 23: Control bar, credits, hint, disclaimer, language switching
**Model:** sonnet

**Files:**
- Create: `src/ui/controlBar.ts`, `src/ui/credits.ts`
- Modify: `src/ui/styles.css`, `src/main.ts`
- Test: `tests/e2e/controls.spec.ts`

**Interfaces — Produces:** `export function createControlBar(root: HTMLElement, store: Store<AppState>, actions: { toggleLang(): void; toggleMute(): void; toggleTour(): void; openCredits(): void }): { dispose(): void }`

- Top-right cluster: `VI|EN` toggle, speaker (🔇/🔊 icon + `aria-label` from `sound.*`), Tour (`tour.start`/`tour.stop`), ⓘ Credits.
- Every button has `data-testid` in `{lang,sound,tour,credits}` and a ≥ 44 px hit area.
- Title top-left (`appTitle`). Bottom-centre hint (`hintMobile`/`hintDesktop` by layout), hidden after the first successful tap/drag.
- Bottom-left tiny `notToScale` text.
- Credits: a modal with the three Global Constraints credits plus a link, and `credits.close`.
- Styling: dark glass (`rgba(13,15,34,.85)`, `backdrop-filter: blur(8px)`, 1px `rgba(255,255,255,.13)` border), system font stack, `env(safe-area-inset-*)` padding.
- `toggleLang` persists `sse.lang` and updates `store.lang`. Every UI module re-renders text on lang change.
- `resize` / `orientationchange` → `store.set({ layout: getLayout(innerWidth, innerHeight) })` and `rig.setLayout`.

- [ ] **Step 1: Write the failing e2e**
  - Clicking `lang` switches `document.documentElement.lang` and visible texts (e.g. the hint text changes between the vi and en strings from `UI_STRINGS`). After a reload the choice persists.
  - Credits open with "Solar System Scope", "CC BY 4.0", "NASA" and "Edge TTS" visible, and close again.
  - Every `[data-testid]` button's bounding box is ≥ 44×44.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Implement**
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Commit**

### Task 24: Info panel (desktop left panel, mobile bottom sheet)
**Model:** sonnet

**Files:**
- Create: `src/ui/infoPanel.ts`
- Modify: `src/ui/styles.css`, `src/main.ts`
- Test: `tests/unit/infoPanel.test.ts` (jsdom), `tests/e2e/panel.spec.ts`

**Interfaces — Produces:**
```ts
export interface PanelField { key: UiKey; value: string; }
export function panelFields(def: BodyDef, lang: Lang): PanelField[];  // omits fields not applicable (undefined) — never "N/A"
export function createInfoPanel(root: HTMLElement, store: Store<AppState>, onBack: () => void): { dispose(): void };
```
- Field formatting:
  - diameter: `formatNumber` + " km";
  - mass: `× Earth` / `× Trái Đất` (≤ 3 significant digits);
  - distance: Mkm → `"{n} million km"` / `"{n} triệu km"`, except the Moon (`384,400 km` from Earth);
  - orbital period: days if < 1000, else years (1 decimal);
  - rotation period: hours if < 48, else days; append "(retrograde)/(quay ngược)" when negative;
  - temp: `°C`; gravity: `m/s²`; moons: the integer.

  Units and words come from `UI_STRINGS` keys you add (e.g. `unit.km`, `unit.millionKm`, `unit.days`, `unit.years`, `unit.hours`, `unit.earthMass`, `unit.retrograde`).
- Panel content: name, kindLabel + order ("Planet #6" / "Hành tinh thứ 6"), fields, description, facts list, source line (`credits.data`), back button (`backToOverview`, `data-testid="back"`).
- Desktop: fixed left, width 340px, top 72px, bottom 24px, scrollable.
- Mobile bottom sheet, `data-testid="panel"`, with a handle:
  - states `peek` (50vh) and `expanded` (88vh);
  - drag on the handle/header with a 60px threshold toggles between them; dragging down from `peek` by > 80px closes and goes back to overview;
  - the content scrolls only when `expanded`.
- Asteroid belt (tour only): name, description and facts, no fields.
- Re-renders on `lang`, `selected` or `layout` change.

- [ ] **Step 1: Write the failing tests**
  - `panelFields(BODIES.sun,'en')` has no `distance`/`orbitalPeriod`/`moons`.
  - `panelFields(BODIES.venus,'vi')` rotation value contains "quay ngược".
  - Moon distance contains `384`.
  - e2e: on `desktop`, `select('earth')` → the panel is visible and its bounding box `x < 400`. On `iphone13` → the panel bounding box `y > viewport.height * 0.4`.
  - Switching lang while it is open changes the panel title from "Earth" to "Trái Đất".
  - The `back` button returns to overview.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement**
- [ ] **Step 4:** Run them. Expected: PASS.
- [ ] **Step 5: Commit**

### Task 25: Audio engine (ambient, whoosh, narration, ducking)
**Model:** opus

**Files:**
- Create: `src/audio/audioEngine.ts`, `src/audio/ambient.ts`, `src/audio/whoosh.ts`
- Modify: `src/main.ts`
- Test: `tests/unit/audioEngine.test.ts` (with a hand-written minimal fake `AudioContext`), `tests/e2e/audio.spec.ts`

**Interfaces — Produces:**
```ts
export const AMBIENT_GAIN = 0.22; export const AMBIENT_DUCKED_GAIN = 0.06; export const NARRATION_GAIN = 1.0; export const WHOOSH_GAIN = 0.35; export const DUCK_RAMP_S = 0.6;
export interface AudioEngine {
  unlock(): Promise<void>;              // creates/resumes AudioContext; idempotent; call from a user gesture
  setMuted(m: boolean): void;           // master gain 0/1 with 0.2 s ramp; ambient starts on first unmute
  playWhoosh(): void;
  playNarration(url: string): Promise<'ended' | 'stopped' | 'error'>;
  stopNarration(): void;
  readonly narrationTimeMs: number;     // current playback position, 0 when idle
}
export function createAudioEngine(ctxFactory?: () => AudioContext): AudioEngine;
```
- Graph: `master` → destination; `ambientBus` → `master`; `sfxBus` → `master`; `narrationBus` → `master`.
- Ambient (procedural):
  - two detuned sine/triangle drones (≈ 55 Hz and 82.4 Hz) through a slowly LFO-modulated lowpass (200–700 Hz, 0.03 Hz);
  - plus filtered pink noise at a very low level;
  - plus a sparse high "shimmer" sine (random 2–6 kHz pings with long release, every 4–9 s).

  It loops forever. No files.
- Whoosh: 1.2 s bandpass-swept noise burst (300 → 2000 → 400 Hz), gain envelope.
- Narration: a single reused `HTMLAudioElement` → `MediaElementAudioSourceNode` → `narrationBus`. While it plays, ramp `ambientBus` to `AMBIENT_DUCKED_GAIN` over `DUCK_RAMP_S`, and restore it when it ends, stops or errors. `playNarration` resolves `'error'` on the `error` event or after an 8 s load timeout.
- Wiring:
  - the first `pointerdown` anywhere calls `unlock()`;
  - the sound toggle calls `unlock()` then `setMuted(...)` and persists `sse.muted`;
  - selection calls `playWhoosh()`.

- [ ] **Step 1: Write the failing tests**
  - Unit: `setMuted(false)` schedules master gain → 1. While narration plays, ambientBus is ramped to 0.06; after the `ended` event it ramps to 0.22. A narration `error` resolves `'error'` and restores the gain.
  - e2e: the `sound` button toggles `getState().muted`, and the setting persists across reload.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement**
- [ ] **Step 4:** Run them. Expected: PASS.
- [ ] **Step 5: Commit**

### Task 26: Tour controller, subtitles, tour controls, autostart
**Model:** opus

**Files:**
- Create: `src/tour/tourController.ts`, `src/ui/subtitles.ts`, `src/ui/tourControls.ts`
- Modify: `src/main.ts`
- Test: `tests/unit/tourController.test.ts`, `tests/e2e/tour.spec.ts`

**Interfaces — Produces:**
```ts
export interface TourDeps {
  rig: Pick<CameraRig, 'flyTo' | 'flyToOverview' | 'setAutoOrbit' | 'onUserInteract'>;
  system: Pick<SolarSystem, 'getFocusTarget'>;
  audio: Pick<AudioEngine, 'playNarration' | 'stopNarration' | 'narrationTimeMs'>;
  store: Store<AppState>; manifest: NarrationManifest | null; scripts: Record<Lang, Record<string, { text: string }>>;
  timers: { setTimeout(fn: () => void, ms: number): number; clearTimeout(id: number): void; now(): number };
}
export function createTourController(deps: TourDeps): { dispatch(e: TourEvent): void; currentCue(): Cue | null; dispose(): void };
```
- The controller applies `tourReducer` effects:
  - `flyTo` → `rig.flyTo`/`flyToOverview`, then dispatch `FLIGHT_DONE`. Ignore stale completions with a generation counter.
  - `showPanel` → `store.set({selected, view})`.
  - `playNarration` → `resolveSegment`:
    - if `audio` is true and not muted, call `audio.playNarration` and dispatch `NARRATION_ENDED` on `'ended'`, or on `'error'` after waiting out the remaining `durationMs`;
    - if muted or there is no audio, run a timer of `durationMs` and drive cue timing from `timers.now()`.
  - `startGap` → a timer then `GAP_ELAPSED`.
- `rig.onUserInteract` → `USER_INTERACTED`; a canvas tap during the tour → `USER_INTERACTED` too.
- `store.tour` mirrors the snapshot. `store.lang` changes → `LANG_CHANGED`.
- Subtitles: a bottom-centre caption box above the mobile sheet's top edge or the desktop bottom. Text = `currentCue().text`, updated each frame. Hidden when not narrating. When muted, `tour.unmuteHint` is shown above it with a tap target that unmutes.
- Tour controls: ⏸/▶ (`tour.pause`/`tour.resume`), ⏮ prev, ⏭ next, ✕ exit, and the progress text `tour.progress`. `data-testid` in `tour-pause`, `tour-prev`, `tour-next`, `tour-exit`, `tour-progress`. While paused by interaction, show a prominent `tour.resume` button.
- Autostart: on `ready`, if `shouldAutostart(prefs.tourSeen, isE2E, params.has('autostart'))`, wait 3000 ms, `savePref('tourSeen', true)`, then dispatch `START`. The control-bar Tour button dispatches `START`/`EXIT`.
- In e2e mode, `setTimeScale(n)` also scales the controller's timers (via `timers`) so tests run fast.

- [ ] **Step 1: Write the failing tests**
  - Unit with fake timers, muted:
    - `START` → flyTo resolves → narrating;
    - after `durationMs` → gap → after 1500 → next stop's flyTo.
  - **Review Focus 4:** `playNarration` resolving `'error'` at 100 ms still waits until `durationMs` before `NARRATION_ENDED`.
  - A stale `FLIGHT_DONE` from a superseded flight is ignored.
  - e2e:
    - `?e2e=1&autostart=1` with clean storage → within 6 s `tour.status !== 'idle'` and `localStorage['sse.tourSeen']` is set;
    - after a reload, `?e2e=1&autostart=1` with the flag present → status stays `idle` for 6 s;
    - `tour-next` advances `tour.index`;
    - a canvas drag pauses (`status === 'paused'`);
    - `tour-exit` → `idle`;
    - with `setTimeScale(20)` the tour reaches `finished`, and the subtitle element had non-empty text at some point.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement**
- [ ] **Step 4:** Run them. Expected: PASS.
- [ ] **Step 5: Commit**

---

## Phase 5 — Quality, verification, delivery

### Task 27: Runtime quality tiers
**Model:** sonnet

**Files:**
- Modify: `src/main.ts`, `src/scene/renderer.ts`, `src/scene/postfx.ts`, `src/scene/solarSystem.ts`
- Test: `tests/e2e/quality.spec.ts`

- On boot: `initialTier({isMobile: matchMedia('(pointer:coarse)').matches, dpr: devicePixelRatio, cores: navigator.hardwareConcurrency ?? 4})`. `?quality=low|medium|high` overrides it.
- The FPS monitor samples every frame **only when the tab is visible and not during camera transitions**. A `'downgrade'` result → `store.set({quality: lowerTier(q)})` → apply the settings: pixel ratio, bloom scale, asteroid count, sky size (keep the loaded sky; never reload a lower one), and `ringShadow`. Then log `console.info('[quality] downgraded to …')`.
- The FPS monitor is disabled when the renderer reports software rendering (`WEBGL_debug_renderer_info` string contains `SwiftShader`, `llvmpipe` or `Software`), per spec §11.4.

- [ ] **Step 1: Write the failing e2e**

  `?e2e=1&quality=low` → `getState().quality === 'low'` and `renderer.getPixelRatio() <= 1.5` (add `pixelRatio()` to `E2EApi`). Under SwiftShader, after 6 s the quality is unchanged (the monitor is disabled).
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Implement**
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Commit**

### Task 28: Full e2e pass, screenshots and visual review
**Model:** sonnet

**Files:**
- Create: `tests/e2e/flows.spec.ts`, `tests/visual/screenshots.spec.ts`, `docs/screenshots/*.png`
- Create: `docs/progress/t28.md` (holds the visual checklist results)

- `flows.spec.ts` covers anything from §11.2 not covered yet:
  - select each of the 11 clickable bodies in turn → the panel title equals `getContent(id, lang).name` (in both languages);
  - **Review Focus 2** again via real taps: tap Mars, then immediately tap Jupiter's label → Jupiter;
  - **Review Focus 5:** on `pixel7`, `select('saturn')`, then `page.setViewportSize({width: 915, height: 412})` → the panel switches to the desktop left layout (bounding box `x < 400`), `selected` is still `'saturn'`, and Saturn's projected position is inside the right 60% of the viewport;
  - zero `console.error` throughout.
- `screenshots.spec.ts` (run via `npm run test:visual`, using `playwright.config.ts` with `--project=desktop` and `--project=iphone13`; it saves to `docs/screenshots/<project>-<name>.png`):
  - overview, sun, earth, saturn, jupiter, pluto;
  - tour subtitle mid-way;
  - mobile sheet expanded;
  - credits.

  Use a fixed `setTimeScale(0)` and fixed time for determinism.
- The agent then **Reads each PNG** and checks against this checklist, recording PASS/FAIL per item per image in PROGRESS:
  - textures visible (no flat colour);
  - visible day/night side;
  - the sun glows;
  - Milky Way visible;
  - panel not covering the focused body;
  - no text overflow or overlap;
  - labels readable;
  - controls inside the safe area.

  A FAIL must be fixed in this task if it is ≤ 30 min of work. Otherwise it goes to a KNOWN_ISSUES entry.
- If screenshots render blank under SwiftShader: retry headed (`--headed` with `--use-angle=d3d11`). If they are still blank, log KNOWN_ISSUES and rely on the e2e state checks.

- [ ] **Step 1: Write the flows and screenshot specs**
- [ ] **Step 2:** Run `npm run test:e2e && npm run test:visual`. Expected: PASS; 18 PNGs written.
- [ ] **Step 3: Visual review against the checklist; fix or log**
- [ ] **Step 4: Commit** (screenshots included)

### Task 29: Performance and budget verification
**Model:** opus

**Files:**
- Create: `playwright.perf.config.ts`, `tests/perf/fps.spec.ts`, `scripts/check-budget.mjs`
- Create: ADR `0005-performance-results.md`
- Modify: `src/quality/tiers.ts` only if measured on a real GPU (see below)

- `check-budget.mjs`:
  - after `npm run build`, sum the gzip size of `dist/**/*.js` (must be ≤ 800 KB);
  - sum the initial payload = JS + CSS + `index.html` + all `textures/low/*` + `sky_2048` (must be ≤ 8 MB);
  - print a table; exit 1 if over budget.
- `playwright.perf.config.ts`:
  - `headless: false`, Chromium args `['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']`;
  - project `mobile-throttled` (Pixel 7 viewport) with CDP `Emulation.setCPUThrottlingRate {rate: 4}`;
  - project `desktop`.
- `fps.spec.ts`:
  - read the renderer string via `WEBGL_debug_renderer_info`;
  - measure the average FPS over 10 s in overview and 10 s focused on Saturn (via `requestAnimationFrame` counting in `page.evaluate`);
  - write `docs/perf-results.json` (`{renderer, gpu: boolean, mobile: {overview, saturn}, desktop: {...}}`);
  - assert only when `gpu === true`: desktop ≥ 55, mobile-throttled ≥ 30.
- If GPU measurements miss their targets: lower the **mobile `low`/`medium`** settings (asteroid count, bloom scale, sphere segments), re-measure, and stay above the quality floor in Global Constraints. If it is still under target at the floor, log KNOWN_ISSUES. Do not go below the floor.
- If `gpu === false`: record the results in the ADR as informational only, and add "measure FPS on real phone" to `HUMAN_REVIEW.md` (Task 31).

- [ ] **Step 1: Write the budget script and the perf spec**
- [ ] **Step 2:** Run `npm run build && npm run check:budget`. Expected: exit 0. Fix overruns: lower the WebP quality to 75 for `low`, or code-split.
- [ ] **Step 3:** Run `npm run test:perf`. Expected: results written; assertions pass on GPU. A browser window opens; this is expected.
- [ ] **Step 4: Write the ADR with the numbers. Commit.**

### Task 30: GitHub Pages deploy workflow
**Model:** haiku

**Files:**
- Create: `.github/workflows/deploy.yml`

- Trigger: push to `main` and `workflow_dispatch`.
- Jobs:
  1. checkout;
  2. setup-node 24 with npm cache;
  3. `npm ci`;
  4. `npm run lint && npm run typecheck && npm test`;
  5. `npm run build` with env `BASE_PATH: /${{ github.event.repository.name }}/`;
  6. `actions/upload-pages-artifact` (path `dist`);
  7. `actions/deploy-pages`.
- Permissions: `pages: write`, `id-token: write`, `contents: read`. Concurrency group `pages`.
- No TTS or texture fetching; the assets are committed.
- Enable Pages for Actions builds: run `gh api -X POST repos/tuanluu-agilityio/solar-system/pages -f build_type=workflow`. If Pages already exists, use `-X PUT` with the same field instead. If that fails (permissions), add "Settings → Pages → Source: GitHub Actions" to `HUMAN_REVIEW.md` and continue. The first deploy runs when this PR merges.

- [ ] **Step 1: Write the workflow**
- [ ] **Step 2: Verify**

  Run: `npx --yes yaml-lint .github/workflows/deploy.yml || node -e "require('fs').readFileSync('.github/workflows/deploy.yml','utf8')"`, then simulate the build: `BASE_PATH=/solar-system/ npm run build` (PowerShell: `$env:BASE_PATH='/solar-system/'; npm run build`).
  Expected: `dist/index.html` references `/solar-system/assets/...`.
- [ ] **Step 3: Commit**

### Task 31: Finalize the AI harness and human docs
**Model:** sonnet

**Files:**
- Modify: `AGENTS.md`, `CLAUDE.md`
- Create: `src/data/CLAUDE.md`, `.claude/commands/add-body.md`, `docs/ai-setup.md` (Vietnamese), `docs/HUMAN_REVIEW.md` (Vietnamese)

- `AGENTS.md`: update it to the real final structure, commands and invariants. Keep it under 150 lines.
- `src/data/CLAUDE.md`: how to add a body. The data, content and tour files, texture key, `fetch-textures` source entry, narration regeneration, tests to update.
- `add-body.md`: a step-by-step command that does the same with TDD (it takes a body name as `$ARGUMENTS`).
- `docs/ai-setup.md` (Vietnamese). For each piece:
  - `AGENTS.md`/`CLAUDE.md` (and the `@` import);
  - nested CLAUDE.md;
  - `settings.json` permissions (each rule explained, plus how to tighten it after the run);
  - hooks (SessionStart, Stop);
  - subagents and model tiers (the §12.5 table);
  - commands;
  - plan / per-task progress files (`docs/progress/`) / KNOWN_ISSUES / ADR / BACKLOG;
  - the branch → PR → CI → merge flow and the Wave Plan (why some tasks run in parallel and others don't);
  - how resume works step by step;
  - how to add a feature in future (brainstorm → spec → plan → run).

  For each one: what it is, why, the file path, and how to change it.
- `docs/HUMAN_REVIEW.md` (Vietnamese checklist):
  - listen to the ambient sound, the whoosh and all 28 narrations;
  - proofread the content and scripts;
  - test on a real phone (iOS + Android) for FPS, touch and the sheet;
  - review the screenshots in `docs/screenshots/`;
  - check the KNOWN_ISSUES items;
  - deploy: every task was merged through a PR, so `main` on GitHub is already up to date and the Pages workflow deploys on each merge from Task 30 on. Site: https://tuanluu-agilityio.github.io/solar-system/. If Task 30 could not enable Pages, do it in Settings → Pages → Source: GitHub Actions. Optionally protect `main` (require the CI check) now that the run is over;
  - how to read the history: one PR per task on GitHub, plus `git log --first-parent main`;
  - optionally tighten `settings.json`.

- [ ] **Step 1: Write the files**
- [ ] **Step 2: Verify**

  Run: `node .claude/hooks/session-start.mjs` — expected: "Task 31" is current. Also check `AGENTS.md` is under 150 lines: `node -e "console.log(require('fs').readFileSync('AGENTS.md','utf8').split('\n').length)"`.
- [ ] **Step 3: Commit**

### Task 32: Final whole-project review
**Model:** opus (`final-reviewer`)

- [ ] **Step 1: Run the full gate**

  Run: `npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build && npm run check:budget`
  Expected: all green.
- [ ] **Step 2: Review against the spec**

  Go through spec §2 (goals and anti-goals) and §11 item by item, plus the Review Focus list. Produce `docs/FINAL_REVIEW.md` with each item marked ✅ / ⚠️ (and a pointer to KNOWN_ISSUES) / ❌.
- [ ] **Step 3: Fix any ❌ that takes ≤ 30 min, then re-run the gate.** Everything else goes to KNOWN_ISSUES.
- [ ] **Step 4: Final commit**

  Commit `chore(t32): final review` and finish the per-task flow (PR, CI, merge). `docs/progress/t32.md` ends with "RUN COMPLETE — see docs/HUMAN_REVIEW.md". List any open (blocked) PRs from `gh pr list --state open` in `docs/FINAL_REVIEW.md`.
