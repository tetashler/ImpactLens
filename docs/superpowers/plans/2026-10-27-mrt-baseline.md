# MRT baseline graph implementation plan

> Execute inline with the executing-plans and test-driven-development skills. This is pre-hackathon research, separate from the competition submission.

**Goal:** Build a reproducible, auditable TypeScript baseline graph and validate routing without changing raw datasets.

**Spec:** The user's Phase 2 request and `docs/DATA_VALIDATION_REPORT.md`.

**Architecture:** Native Node 24 TypeScript, no installed dependencies. Separate CSV/GTFS parsing, evidence policy, graph construction, Dijkstra routing, connectivity analysis and report generation. Station metadata has one physical node per verified interchange; routing uses station/line states with explicit transfer edges. A service-date-filtered, static median arrival-to-arrival hop time includes origin dwell. It is an approximate typical-service model, not a departure-time itinerary planner.

**Files:** `prototype/mrt/{csv,gtfs,policy,graph,routing,validation,cli}.ts`, tests alongside under `prototype/mrt/tests/`, a root `package.json` for commands, derived artifacts under `data/derived/mrt/`, and `docs/MRT_GRAPH_VALIDATION.md`.

**Global constraints:** Raw data is read-only. No frontend, Gemini, synthetic citizens, hypothetical-line implementation or network access at runtime. Retain source row numbers and dataset hashes. No Git repository exists here; no worktree or commits are applicable.

**Implementation choices:** Default service date 2026-10-27. Initial wait 120 seconds, line-change walking 180 seconds plus 120 seconds reboarding wait; configurable and explicitly unmeasured. No automatic station-name merges or proximity links. Exact verified aliases: BP1→NS4, BP6→DT1. Quarantine whole trips containing any of the three identified suspect directed pairs rather than invent replacement calls. Preserve a raw mode for diagnostics. Date exceptions override weekly calendars; unsupported service dates fail clearly.

## Review focus

- Midnight times remain service-day seconds; invalid dates/times and missing references fail.
- Same-name stations are not merged without explicit evidence.
- Shortcuts cannot leak through a quarantined trip or a free line change.
- Directional reachability is measured separately from undirected components.
- Static medians do not imply that selected segments form a feasible same-train itinerary.

## Tasks

1. **Parser and service calendar.** Write failing tests for quoted CSV/newlines, GTFS times beyond midnight, malformed values, date filtering and exceptions. Implement `parseCsv`, `parseTime`, `activeServices`, `loadFeed` with row provenance and hashes. Run `node --test prototype/mrt/tests/*.test.ts`.
2. **Evidence policy and graph.** Write failing fixture tests for exact aliases, missing transfers, full-trip quarantine, median hop times, dwell and source references. Implement `buildGraph(feed, options)` returning station catalogue, line states, travel/transfer edges and audit. Raw mode disables aliases/transfers/quarantine for comparison. Reject structurally invalid trips with explicit diagnostics; no inferred repair.
3. **Routing and validation.** Write failing hand-calculated fixture tests for shortest paths, transfer cost, unreachable/unknown stations, negative edges and directional connectivity. Implement `shortestPath` and `analyseConnectivity`. Validate all ordered station pairs on weekday/Saturday/Sunday graphs and compare raw versus derived components.
4. **CLI, artifacts and report.** Implement `node prototype/mrt/cli.ts [--date YYYY-MM-DD] [--write]`; read-only by default, explicit write regenerates owned outputs. Export a graph with complete source references, all-feed suspicious-trip evidence and hashes, and generated report tables. Inspect representative journeys, run the complete suite, confirm dataset hashes unchanged, and document provenance/timetable limitations and conditions for hypothetical-line experiments.

## Execution record

- Planning: repository contains only data/docs, Node v24.18.0, no TypeScript compiler or package dependencies. Native TS execution chosen to avoid an install.
- Investigation: all three suspect pairs reproduced in original trip rows; sequences are consecutive despite missing intermediate calls. NS16→NS20 appears in a northbound-labelled trip whose listed calls proceed south. Actual cause/provenance remains unknown.
- Updated context: an OD CSV now exists at `data/transport/origin_destination_train_202609.csv`, outside the previously inspected passenger directory. It is outside this phase's graph scope and will not be treated as already validated.
- Task 1 complete: CSV/time/calendar tests observed failing against unimplemented functions, then passing. Source references use physical file lines, including quoted multiline CSV.
- Task 2 complete: graph fixture tests observed failing, then passing; exact alias rules and full-trip quarantine implemented. All-service audit finds 17 suspect trips and zero structurally invalid trips. Active excluded counts are 1 weekday, 8 Saturday, 8 Sunday.
- Task 3 complete: routing/connectivity tests observed failing, then passing. Independent Floyd-Warshall oracle agrees with every origin-station-to-state Dijkstra distance on three real-data dates. Derived baseline: 184 physical stations, 217 service states, 426 travel + 72 transfer edges, one strongly connected component, zero unreachable station pairs.
- Task 4 complete: CLI tests observed failing before implementation, then passing. Generated Markdown plus graph/audit JSON. Default CLI is read-only; explicit --write owns regeneration. Sandbox initially blocked derived-directory creation; the approved elevated generator run created outputs within the project.
- Final verification: complete suite has 21 passing tests. All 130,031 exported observation references were independently resolved to matching source trips, lines and station endpoints, and every exported median independently recomputed. All eight source hashes remain unchanged.
- Independent read-only review: no critical or important findings; reviewer independently ran all 21 tests and confirmed generated report/artifacts match fresh construction. Remaining limits (uniform waits/transfers, static line-level routing, dwell convention, provenance and calibration) are documented, intentional and unresolved. No additional implementation or competition submission was created.
