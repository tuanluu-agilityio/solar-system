@AGENTS.md

## Claude Code notes

- Model tiers: run the controller session on Sonnet (`/model sonnet`). Dispatch tasks to the subagents in `.claude/agents/`: `implementer-light` (haiku), `implementer` (sonnet), `implementer-heavy` (opus), `reviewer` (sonnet), `final-reviewer` (opus, Task 32).
- Commands: `/resume-work` reconciles in-flight work and continues the Wave Plan; `/status` prints progress; `/add-body <name>` walks through adding a body with TDD (checklist in `src/data/CLAUDE.md`, loaded when you work in `src/data/`).
- Hooks: `session-start.mjs` prints a resume summary; `stop-check.mjs` runs a typecheck when `.ts` files changed (informational only).
- `.claude/settings.json` is frozen after Task 1; do not edit it.
- The run is finished after Task 32; for future features follow brainstorm, spec, plan, run (see `docs/ai-setup.md`, Vietnamese). Human to-dos: `docs/HUMAN_REVIEW.md`.
- Auto mode blocks `npx --yes <external package>`; use installed tools only. E2E is slow under software GL: run one spec at a time while iterating.
