# 0004. Bloom uses three's EffectComposer + UnrealBloomPass

Status: accepted

## Context
The spec (§3 rendering, §5 stack) requires the Sun to glow via bloom, and bloom is part of the quality floor: no tier may drop it. Options are three's own `examples/jsm` post-processing (`EffectComposer`, `UnrealBloomPass`, `OutputPass`) or the third-party `postprocessing` package. The renderer uses ACES Filmic tone mapping and sRGB output, which must be applied exactly once.

## Decision
Use `EffectComposer` with `RenderPass` -> `UnrealBloomPass` (strength 1.2, radius 0.6, threshold 0.85) -> `OutputPass` (`src/scene/postfx.ts`). The scene renders into the composer's HalfFloat linear target, where three skips tone mapping; `OutputPass` applies the renderer's tone mapping and colour-space conversion once at the end. The bloom chain is resized to the drawing-buffer size times the tier's `bloomResolutionScale` (pure helper `src/scene/bloomConfig.ts`). The Sun surface writes HDR values (gain above 1) so it clears the threshold while dimmer bodies and the sky mostly do not.

We switch to the `postprocessing` package only if it measurably beats this setup in the performance task (Task 29).

## Consequences
No extra dependency; it ships with `three` and is versioned with it. Every frame costs the bloom mip chain (reduced by `bloomResolutionScale` on lower tiers). The sky is now tone mapped by `OutputPass` like everything else, because per-material `toneMapped: false` has no effect when rendering into a render target. MSAA from `antialias` does not apply to the composer's render target; anti-aliasing for the composited image is a later performance/quality concern.
