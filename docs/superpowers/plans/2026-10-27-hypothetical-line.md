# Hypothetical MRT line implementation plan

**Goal:** Extend the verified baseline with one validated, separately cloned hypothetical line and deterministic journey comparisons. Spec: user's Phase 2 request and revised development roadmap. Pre-hackathon research only.

**Architecture:** Reuse `buildGraph` and Dijkstra. Add `scenario.ts` (schema, validation, overlay), `simulation.ts` (outcomes/metrics), a TypeScript illustrative config and terminal CLI. Clone with `structuredClone` to isolate nested provenance, arrays, Maps and audit. No dependencies.

**Schema:** Version 1; ordered existing/new station union. Existing stops resolve IDs/coordinates from baseline and specify transfer walking seconds. New stops include ID/name/lat/lon/location note. Ordered segments specify positive running seconds and nonnegative origin dwell seconds; never derive times from distance. Declare bidirectionality. Proposal is assumed open on selected service date; construction not modelled. Optional proposed waiting seconds apply at initial boarding and transfers into that line; omitted waits inherit baseline initial/reboarding policies separately.

## Tasks

1. Test then extend `State` with optional wait overrides and `Station` with hypothetical provenance. Router seeds use state-specific boarding waits and return the chosen wait correctly; existing states keep current fallback.
2. Test then implement `addHypotheticalLine(baseline, proposal)` in `scenario.ts`. Reject malformed input, IDs/collisions (including aliases/platforms), duplicate canonical stations, bad/unordered segments, coordinates/costs, nonexistent/unserved attachments and all-new disconnected lines. Add declared bidirectional rides and explicit same-station transfers. Preserve all baseline edges and raw GTFS.
3. Test then implement `simulateIntervention(baseline, proposal, pairs)`. Structured reachable/unreachable/station-unavailable/invalid outcomes; baseline/scenario minutes, signed savings, signed percentage duration change (null for zero/unavailable baseline), proposed travel use and transfer differences. Same service date and existing costs; no departure-time or ridership invention.
4. Add illustrative two-new-station config, CLI/npm command, integration tests, simulation docs, README and .gitignore. Run baseline validation/demo/all tests, verify hashes and repeatability, and update only the supplied revised roadmap, preserving eldercare scope.

## Verification and review focus

- Hand-calculated fixture: line-specific initial wait, run/dwell and target-line transfer wait; cheaper route and unchanged route.
- Deep baseline isolation, preserved source references/quarantine, no negative edges, deterministic repeat results.
- Alias duplicates, malformed JSON-like input, wrong/missing connections and identifier collisions rejected.
- Unreachable baseline becomes reachable; proposed station unavailable before; unknown station invalid; zero denominator undefined.
- Real weekday/weekend additive graphs preserve existing journeys; original 21 tests remain passing.

Execute inline with test-first checks and final independent review if available. No git add/commit/push or branch operations. Roadmap was initially missing; user supplied exact path before implementation. No duplicate roadmap.

## Completion evidence

- Each new implementation stage followed failing focused tests, then passing tests: per-service boarding, scenario construction, comparisons and CLI.
- Full suite: 37 passing tests, including all original 21. Three real-data dates verify old-edge preservation, unchanged quarantine and non-worsening distances for all existing OD pairs. Raw hashes checked unchanged.
- Existing `npm.cmd run mrt:validate` passed with 184 physical stations, 217 states, 498 edges, one strong component and zero unreachable station pairs. `npm.cmd run mrt:simulate` passed with a 186-station/221-state/512-edge scenario and reproducible before/after metrics.
- Independent read-only engine review reran all 37 tests and found no actionable code defect; line direction, static times and unverified provenance remain intentional documented limitations.
- Created simulation documentation and README/.gitignore. Updated only the supplied revised roadmap after verification; all eight phases retained and the full eldercare phase preserved unchanged. No staging, commits or pushes.
