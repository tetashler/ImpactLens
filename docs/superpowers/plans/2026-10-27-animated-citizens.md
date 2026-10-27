# Phase 4B implementation plan

Starting branch master, HEAD98c91d6, clean checkout; existing84 tests pass. Terminal1 owns renderer/UI/roadmap. No generator, Phase4C, shared-contract, environment or Git-history edits.

## Architecture

- Three.js custom3d layer shares MapLibre WebGL/camera/depth. Twelve instanced cuboid-part batches plus a selection ring; no per-agent React trees or React Three Fiber.
- Convert supplied named WGS84 coordinates to local Mercator metres; Z-up parts, path-derived headings. Exaggerated toy size is explicitly visual-only. No invented positions for missing animations.
- One MapLibre-driven render loop and pause-safe visual clock. Idle/walk/travel/arrival/paused; no movement-derived outcomes. Reduced-motion/hidden/paused/low-zoom stop continuous rendering.
- Two validated payloads carry baseline/scenario streams with stable agent IDs; contract remains unchanged. Frozen invented180-agent fixtures until independently produced Phase4C payloads can be loaded.
- Inspector tabs retain MRT controls while exposing accessible selection, supplied categories/weights/journey values/provenance and disabled Gemini. External JSON is validated, not coerced.

## Tasks

1. Data worker: lib/citizens/{data,fixtures,playback}.ts and tests; clone/freeze, ID matching, profile projection and deterministic controller.
2. Profile worker: components/citizens-panel.tsx and scoped CSS using exact contract types.
3. Inline: lib/citizens/{scene,layer}.ts and tests for coordinate axes, appearance, batching and disposal; integrate map/workspace. Install only Three.js/types.
4. Test actual rendering, selection, play/pause/reset, view switching, pan/zoom, MRT edit/rerun, desktop/narrow/reduced motion; measure real draw count/frame cadence. Run required CLI/tests/build/typecheck.
5. Write implementation report and update existing roadmap preserving Gemini/eldercare and leaving fullPhase4 incomplete. No commits or pushes.
