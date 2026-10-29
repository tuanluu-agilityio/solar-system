# Backlog

Future ideas, out of scope for v1 (spec section 15).

- NASA sonification audio for each planet (a listen button in the info panel).
- Major moons: Io, Europa, Ganymede, Callisto, Titan, Enceladus, Triton.
- Planet positions for the real date, with a time slider.
- "True scale" mode for comparison.
- Side-by-side size comparison of two planets.
- Comets and spacecraft (Voyager, JWST).
- A third language.
- PWA / offline use.
- Replace the procedural Pluto texture with a New Horizons global map.

- Labels: reuse scratch arrays in `placeLabels` / `labels.ts` (about a dozen small allocations per frame today) and add hysteresis so labels near the collision threshold do not pop in and out (from the Task 28b review).

## For HUMAN_REVIEW.md (Task 31)

Items a human must check; Task 31 moves them into `docs/HUMAN_REVIEW.md` (Vietnamese).

- Measure FPS on a real mid-range phone (2023 Android, iPhone 12): overview and focused on Saturn should hold at least 30 FPS, and the `[quality]` console line should show no downgrade loop. The automated run (Task 29) used a headed desktop Chromium with Pixel 7 emulation and 4x CPU throttling on an Intel Arc iGPU, which is not a phone GPU (see `docs/decisions/0005-performance-results.md`).
- Re-measure desktop FPS on an idle laptop (`npm run test:perf -- --project=desktop`, nothing else running, mains power): Task 29 measured the `high` tier at about 50-54 FPS in overview on an Intel Arc iGPU at 1440x900 with large run-to-run noise (see `docs/KNOWN_ISSUES.md`).
