# 0002. AGENTS.md is the single source of agent context

Status: accepted

## Context
Several AI tools work on this repo. Claude Code reads `CLAUDE.md`; other tools read `AGENTS.md`. Duplicated instructions drift apart.

## Decision
`AGENTS.md` holds all project context and rules. `CLAUDE.md` contains the line `@AGENTS.md` plus a short section of Claude-only notes (model tiers, commands, hooks).

## Consequences
One place to update. Claude-specific details stay out of `AGENTS.md`. Task 31 finalizes both files.
