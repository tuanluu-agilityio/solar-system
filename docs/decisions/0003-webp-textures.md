# 0003. Textures are pre-converted WebP, committed to the repo

Status: accepted

## Context
Textures come from Solar System Scope (CC BY 4.0) as 8K JPEG/PNG files of 1-15 MB each. The initial load budget is 8 MB (JS + low textures + sky), and the build and CI must work without network access.

## Decision
`npm run fetch:textures` (`scripts/fetch-textures.mjs`) downloads sources into the git-ignored `.cache/textures-src/` and converts them with sharp to WebP (quality 82) in two sets: `low` (max 2048 px wide) and `high` (max 4096 px wide, never upscaled). The generated WebP files and `public/textures/manifest.json` are committed. Earth clouds carry luminance as alpha; the Saturn ring keeps its alpha channel. Pluto has no source, so a procedural equirectangular map is generated (tracked in BACKLOG).

## Consequences
Build and CI need no network. The low set plus `sky_2048` is about 3.4 MB, inside the 8 MB initial budget; the high set adds about 13.5 MB to the repository. WebP is supported by all target browsers.
