# Connected synthetic society implementation plan

**Goal:** A reproducible, locally persisted Census-constrained population feeding one event-driven social/map/report world, with no paid calls.

**Architecture:** Retain the existing Census joint-cell allocator, staged planner, four-role/eight-action gateway, Cytoscape/D3 graph and MapLibre renderer. New versioned population recipes/snapshots and a browser-safe deterministic society reducer own identities, clock, social exposure, memories and activities. All views project these records. Existing LLM outputs are explicitly attributed inputs, not additional calls. Local simulated social environments never access real social services.

**Phase gates (sequential):**

- [x] Phase 3: `lib/population/` provenance/fidelity/view contracts and `lib/server/population/` persistence, `/api/population`, tests. Reuse `prototype/agents/` unchanged. Gate: joint/marginal fidelity, seed replay, archive integrity, source discrepancy and unsupported-field tests; full regressions/TypeScript/build.
- [x] Phase 4: `lib/society/` versioned genesis, event reducer, network, scheduler, persistence and social workspace. Gate: exposed-only actions, Reddit/Instagram differences, cross-platform memory, state transitions and exact replay; mocked browser and regression checks.
- [x] Phase 5: MapLibre batched society layer and shared selection/graph projection. Gate: event-linked geographic state, canonical identity across views, bounded rendering and browser navigation.
- [x] Phase 6: event-derived metrics, population/active-sample breakdowns, evidence/uncertainty and sensitivity reports. Gate: counts reconcile with events and all views; full tests/strict TypeScript/build/model CLIs and desktop/mobile browser.

**Limits:** No external paid calls, environment-file access, Git mutations or secondary-directory access. No unsupported households, income, individual home/workplace facts or demographic-opinion correlations. Preserve raw source files, numerical models, licensing, old plan/run identities and inference bounds. Defaults are explicit synthetic assumptions, not calibrated social forecasts.

**Research decision:** Compare OASIS integration with an independently implemented TypeScript reducer before Phase 4. No Python service or package installation by default. Research details and pinned sources belong in the Phase 4 report.

**Failure review:** sparse Census strata/small samples; ambiguous geography; missing household/employment joints; hidden social information; stale scenario bindings; corrupted saves; event/memory caps; platform-incompatible actions; playback cancellation; active-sample weights mistaken for national opinion.

All four bounded prototype gates passed sequentially. Final total: 895 Node tests, application/strict TypeScript, production build, six model CLIs and mocked desktop/mobile acceptance. See each phase report for the limits and exact evidence.
