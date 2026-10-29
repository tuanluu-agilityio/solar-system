# src/data: adding a body

Body data lives ONLY here (AGENTS.md invariant). Use `/add-body <name>` for the TDD walkthrough. Checklist for a new body `<id>`:

1. `types.ts`: add `<id>` to `BODY_IDS` (Earth must stay before the Moon; a moon needs a `parent`). `BodyId`, `ContentId` follow. Add a new `BodyKind` only if none fits.
2. `bodies.ts`: add `BODIES.<id> = def(id, kind, parent, orderFromSun, physical)` with NASA Planetary Fact Sheet numbers (diameter, mass in Earths, gravity, rotation hours, negative = retrograde, real axial tilt, temperature, distance in million km, orbital days, moons). Keep the source comment.
3. `../config/scale.ts`: add `<id>` to `INITIAL_PHASE` (typed `Record<BodyId, number>`, so tsc points at it). Scale math itself is not edited.
4. `content/vi.ts` and `content/en.ts`: add `<id>: { name, kindLabel, description, facts }` to `CONTENT_VI` and `CONTENT_EN` (typed `Record<ContentId, BodyContent>`; both languages required, written natively, not machine-translated).
5. Tour (only if the body is a stop): `tour/stops.ts` add `{ id, focus }` in route order; `tour/vi.json` and `tour/en.json` add `"<id>": { "text": "..." }` (plain spoken text, numbers spelled out as words).
6. Texture: pick a key (same as the id, or several keys like `earth_day`). Add the key to `../scene/textureKeys.ts` `FALLBACK_COLORS`; if the body uses several maps add them to `EXTRA_KEYS` (`textureKeysFor`) and to `TEXTURE_KEYS` in `../scene/solarSystem.ts` (first available wins). Add the source to `SOURCES` in `scripts/fetch-textures.mjs` (`{ key, file }`, file from Solar System Scope; a body without a free map gets a procedural pipeline like `plutoPipeline`). Run `npm run fetch:textures` (network) and commit `public/textures/{low,high}/<key>.webp` plus `manifest.json`.
7. UI label lists in `../ui/labels.ts`: add the id to `PRIORITY` (and `ALWAYS_VISIBLE` if it should always show in overview).
8. Narration (only if it is a tour stop): `npm run narration` (needs `.venv` and network). It regenerates only stops whose text hash changed, writes `public/audio/narration/<id>.{vi,en}.mp3` and updates `manifest.json`. Commit the mp3s and manifest.
9. Tests to update: `tests/unit/solarSystem.test.ts` (body and pickable counts, currently 11), `tests/unit/tourScripts.test.ts` (`EXPECTED_IDS`, stop count 14), plus whatever `bodies`, `content`, `textureManifest`, `narrationAssets`, `picker` tests fail. Add the new body to `tests/unit/bodies.test.ts` reference values. Run `npm test`, `npm run typecheck`, `npm run lint`, and a visual check with `npm run test:visual`.
10. Credits and docs: if a new texture source appears, update the credits text (both languages).
