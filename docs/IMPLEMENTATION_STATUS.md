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
| 1     | t39a | In progress on `feat/t39a` (not merged) |
| 2     | t39b | In progress on `feat/t39b` (not merged) |
| 2     | t39c | In progress on `feat/t39c` (not merged) |
| 2     | t39e | Not started (after t39c is merged)      |
| 3     | t39f | Done on the integration branch          |
| 4     | t39d | In progress on `feat/t39d` (not merged) |
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

## Outstanding issues and known limitations

- Flights are still an eased straight transition (no arced path around the Sun).
- See `docs/KNOWN_ISSUES.md` for the open high-tier FPS entry.

## Exact next steps

1. Wait for t39a, t39b, t39c and t39d; review each (screenshots, diff, tests), merge into the
   integration branch, resolve conflicts in `src/main.ts` and `src/quality/tiers.ts`.
2. Start t39e (moons, Kuiper belt) from the merged integration branch.
3. t39g: performance pass (`npm run test:perf`, `scripts/shots.mjs --quality low --mobile`).
4. t39h: lint, typecheck, unit, build, budget, e2e one spec at a time, refresh
   `docs/screenshots`, final update of this file; then ask the user to approve the push and PR.
