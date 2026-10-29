---
description: Add a new body (planet, dwarf planet or moon) step by step with TDD
---

Add the body named `$ARGUMENTS` to the Solar System Explorer. Read `src/data/CLAUDE.md` first; it is the checklist. Follow AGENTS.md invariants and never ask the user (log `DECISION:` lines in the progress file).

1. Work in a task worktree (`git worktree add .worktrees/<slug> -b feat/<slug> origin/main`, `npm ci`).
2. Gather facts: NASA Planetary Fact Sheet / NASA Science pages (WebFetch to nasa.gov domains is allowed). Note diameter, mass, gravity, rotation (negative if retrograde), tilt, temperature, distance, orbital period, moons.
3. Failing tests first: extend `tests/unit/bodies.test.ts` (reference values), `tests/unit/content.test.ts` (vi and en content for the id), `tests/unit/solarSystem.test.ts` (counts), and `tests/unit/tourScripts.test.ts` if it is a tour stop. Run `npm test` and watch them fail.
4. Implement in the order of `src/data/CLAUDE.md`: `types.ts`, `bodies.ts`, `config/scale.ts` (`INITIAL_PHASE`), `content/vi.ts` + `content/en.ts`, tour stop and `tour/*.json`, texture key (`textureKeys.ts`, `solarSystem.ts` if needed, `scripts/fetch-textures.mjs` source entry), `ui/labels.ts`.
5. Run `npm run fetch:textures` and, for a tour stop, `npm run narration`. If the network or Edge TTS is unavailable, add a `docs/KNOWN_ISSUES.md` entry and continue without the asset.
6. Make the tests pass, then `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check:budget`, and the related Playwright spec (one at a time; port 4173 is shared).
7. Commit with Conventional Commits (`feat(<scope>): add <name>`), then follow the normal branch, PR, CI and merge flow from AGENTS.md.
