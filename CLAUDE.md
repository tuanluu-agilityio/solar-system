@AGENTS.md

## Claude Code notes

- Model tiers: run the controller session on Sonnet (`/model sonnet`). Dispatch tasks to the subagents in `.claude/agents/`: `implementer-light` (haiku), `implementer` (sonnet), `implementer-heavy` (opus), `reviewer` (sonnet), `final-reviewer` (opus, Task 32).
- Commands: `/resume-work` reconciles in-flight work and continues the Wave Plan; `/status` prints progress.
- Hooks: `session-start.mjs` prints a resume summary; `stop-check.mjs` runs a typecheck when `.ts` files changed (informational only).
- `.claude/settings.json` is frozen after Task 1; do not edit it.
