# Phase 7F implementation plan

Goal: visibly moving, geographically anchored illustrative pedestrians using the existing single MapLibre/Three.js layer. User's Phase 7F specification authorises implementation in main master at 3b6e8c0; no Git mutations, other worktree, engine, building preparation/licence, planner or shared citizen-contract changes.

Observed before changes: 180 actors occupy one Ang Mo Kio 15×12 grid, roughly 187×147 m. Selected actor moved 1.783 local metres over a five-second browser wait; root matrices and projection work. At 5.5× rig scale it is ~9.7 m tall. Half the fixtures are stationary; moving paths have a two-second idle, run once for ~85 s and stop. Browser screenshots and DevTools-observed instance matrices are stored in ignored test-results. Pause and Reset work but the original scene snaps pose on pause.

Architecture: independent browser-safe illustrative path/actor definitions, compiled ground-metre arc lengths and deterministic distance/time sampling; only the default illustrative fixture opts into looping movement. Imported modelled data continues using its supplied geometry. Keep 180 stable fixture IDs and invented profile semantics, but spread visual actors across five documented land corridors. Check authored paths against supplied land and building footprints; no pavement, home or behavioural claim. Models use shared faceted geometry, bounded scale, instanced batches and deterministic appearance independent of demographics. Cache per-actor input/appearance; one existing visual clock. Pause preserves pose; hide/graph pause ownership without resetting; reset restores exact start. Scope scene/fixture/motion/controller/UI files; minimal map/workspace wiring only.

Visual direction: retain dark planning dashboard and typography. Muted teal, ochre, blue and terracotta clothing; natural proportions, faceted heads/tapered torsos, jointed opposing limbs and modest bob. Explicit visual scale, ground clearance and normal shared depth. Neighbourhood selector/focus within the existing citizen panel, clear visual-only disclosure; no new giant panel or dependencies. Higher close-up zoom may be needed to inspect physically smaller people.

- [x] TDD: metre-based continuous looping paths, finite extremes, deterministic phases/speeds; footprint/land verification for Tiong Bahru, Sengkang, Tampines, Downtown and Ang Mo Kio.
- [x] Minimal sampler-to-existing-layer wiring and browser proof of meaningful root displacement (about 5 m over five-second waits).
- [x] Improve procedural model and pose; preserve instancing, picking, paused pose and idempotent disposal.
- [x] Citizen-only controls, area focus, selected-position inspection and lifecycle/performance guards.
- [x] Independent review; real multi-area/mobile/camera/play/pause/reset/race/fallback and MRT/AAC regression checks.
- [x] Sequential six CLIs, 368 passing tests, app/strict types, production build, whitespace/source integrity. No Overture extraction rerun.
- [x] Phase 7F report and accurate central roadmap, preserving internal-review-only building restrictions and outstanding true geographic population trajectories.
