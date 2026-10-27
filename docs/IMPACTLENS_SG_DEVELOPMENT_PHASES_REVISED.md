# ImpactLens SG — Development Phases & Hackathon Rebuild Roadmap

**Status:** Pre-hackathon prototype; Phases 1–3 and Phase 4A integrated and validated locally; Phase 4B pending  
**Last updated:** 27 October 2026  
**Team:** 3 (2 AI/data science, 1 mass communications)  
**Hackathon build window:** 24 hours  
**Development:** Local Next.js App Router application (`npm run dev`) plus Node 24 TypeScript CLI; no Vercel required  
**AI:** Gemini API (budget approximately US$200)  
**Main judging proposition:** Quantify how proposed interventions affect **different demographic groups**.

> **Competition constraint:** The prototype is for learning. Do not bring a completed implementation into the competition if rules prohibit it. Bring permitted documentation, architecture, findings, and reconstruction instructions; verify whether pre-downloaded datasets, generated code, or other materials are allowed.

## 1. Project Definition

ImpactLens SG is an evidence-informed, interactive Singapore social-impact sandbox. Users can propose new MRT lines, eldercare facilities, and—eventually—other infrastructure or policy interventions. A synthetic population reacts through a deterministic simulation, while blocky animated characters visualize agent movement and Gemini supports structured explanations, generated dashboard configurations, and conversations with representative citizens.

**Model integrity rules**

- Official statistics and infrastructure records are **observations**, with source and reference date.
- Synthetic residents, their routines, and behaviour parameters are **modelled assumptions**, not individual government records.
- Travel times and access changes are **calculated estimates**, with documented algorithms.
- Longer-term business, housing, health or social outcomes are **scenarios**, not factual predictions without independent empirical models.
- Gemini **does not invent** numerical impacts or modify validated simulation results.
- Daily agent movement animation is separate from 1–10-year scenario projections.

## 2. At-a-Glance Build Sequence

1. **Baseline MRT graph** — verify routing through existing train stations (**prototype validated**).
2. **New MRT-line intervention** — add proposed stations/links and compare journeys (**flagship; engine prototype validated**).
3. **Miniature Singapore map** — draw the line and visualize the changed network (**local prototype validated**).
4. **Synthetic citizens** — Phase 4A demographic foundation integrated; Phase 4B daily activity, demographic impact integration, and blocky movement pending.
5. **Impact dashboard + Gemini** — show who benefits, and enable grounded citizen conversations.
6. **New eldercare / active-ageing centre intervention** — place a facility, model travel-time coverage and capacity, and reuse the map, agents, and dashboard (**second committed demonstration scenario**, not merely future roadmap).
7. **Reliability, documentation, and pitch** — demonstrate both interventions where feasible.

**Important:** Phase order is for the prototype learning sequence, not a rule that the entire MRT experience must be perfected before eldercare work begins. Both interventions are part of the planned product, with MRT taking priority in the 24-hour build.

## 3. Phased Pre-Hackathon Prototype Roadmap

Each phase has a narrow deliverable and an exit check. Stop expanding scope when a phase is validated; capture learnings for rebuilding during the event.

### Phase 0 — Data Acquisition and Quality Review

**Status: Mostly complete / remaining gap**

**Goal:** Establish trustworthy transport and population inputs.

- [x] Obtain access to LTA DataMall.
- [x] Download and extract the train GTFS files.
- [x] Have Codex inspect the GTFS files and create `docs/DATA_VALIDATION_REPORT.md`.
- [ ] Validate downloaded train OD data at `data/transport/origin_destination_train_202609.csv`; the originally inspected passenger-volume directory was empty. The current transport engine does not use this file.
- [ ] Confirm availability, licensing, geographic units, reference years, and retrieval method for population, building, and eldercare data.

**Verified transport findings:** 1,211 stop records include 186 parent station records; 19,119 trips and 348,777 stop times. Graph checks verify 184 physical stations after two evidenced interchange consolidations. Seventeen trips containing three suspicious connections remain quarantined with source rows retained. Feed provenance/timetable accuracy remain unverified; actual calendars cover 2026 only. Passenger-volume and demographic suitability have not been validated by these graph tests.

**Exit check:** Data sources and gaps are documented, raw source files remain unmodified, and no missing data is disguised as simulated evidence.

### Phase 1 — Baseline MRT Network Graph Validation

**Status: Complete for baseline prototype scope; operational calibration unresolved**

**Goal:** Make the existing MRT/LRT network queryable before attempting hypothetical infrastructure changes.

**Tasks**

- [x] Parse valid GTFS stop, trip, timetable and route records.
- [x] Build a transport graph with station nodes, train edges and explicit transfer edges.
- [x] Investigate missing Bukit Panjang LRT interchange links.
- [x] Investigate and document the three suspicious station connections.
- [x] Distinguish stations, platforms, stop records and interchange groups as necessary.
- [x] Implement shortest-travel-time routing; state assumptions for wait/transfer/walk times.
- [x] Test direct journeys, transfers, unreachable journeys and graph connectivity.
- [x] Write `docs/MRT_GRAPH_VALIDATION.md` including unresolved limitations.

**Deliverable:** Tested TypeScript graph/routing library plus concise validation documentation. No polished map required.

**Exit check:** Multiple representative journeys produce reproducible, explainable paths and times; unresolved data issues are clearly flagged rather than silently patched.

**Verified results (27 October 2026):** Baseline CLI validation passes: 184 physical stations, 217 station/line states, 426 travel edges, 72 explicit transfer edges; one strongly connected component, zero unreachable ordered distinct station pairs. Tuesday/Saturday/Sunday graphs pass. Original 21 automated tests remain passing within the current 37-test suite. Both BPLRT interchanges are explicitly handled; suspicious records are retained in audit and excluded, not silently repaired.

**Remaining limitations:** Static median times and uniform default wait/transfer assumptions; source provenance, public-holiday exceptions, real timetable/track coverage and calibration remain unresolved. This exit check verifies reproducible graph routing, not authoritative current railway operations.

### Phase 2 — Hypothetical MRT Line Simulation

**Status: Complete for the requested engine prototype; Phase 3 map integration validated**

**Goal:** Calculate a meaningful **before/after** comparison when a hypothetical rail line and stations are added.

**Tasks**

- [x] Define a versioned `MrtIntervention` schema: station coordinates, ordered links, explicit running/dwell times, validated interchanges, optional waiting assumptions, and declared construction/opening assumptions. Prototype uses explicit seconds rather than inferred operating speeds or simulated frequency; engineering/frequency refinement remains below.
- [x] Connect proposed stations to the existing graph using explicit existing-station IDs and transfer rules; reject structurally invalid/disconnected proposals. No automatic geometric snapping, unverified proximity connections or engineering-feasibility claims.
- [x] Run routing on an immutable baseline graph and on a separately modified scenario graph.
- [x] Report per-origin/destination travel-time, reachability and transfer differences; preserve unaffected journeys. Population/catchment accessibility metrics remain later work.
- [x] Implement reproducible tests: beneficial route, no-benefit route, disconnected route, invalid station coordinates, transfer penalty.
- [x] Label infrastructure and timetable assumptions visibly.

**Deliverable:** One API/library call that accepts an intervention and returns structured baseline/scenario metrics. Initially use test fixtures, not invented passenger-demand totals.

**Exit check:** A hypothetical line changes only plausible journeys; the same inputs produce the same results.

**Acceptance evidence (27 October 2026):** `npm.cmd run mrt:validate`, `npm.cmd run mrt:simulate` and `npm.cmd test` pass. All 37 automated tests pass, including the original 21. Independent read-only review found no blocking code defects. Tests verify deep baseline/proposal isolation, explicit transfers with target-service waits, malformed inputs, unreachable/new/invalid journeys, exact repeatability, and no worsened distance to any existing service-state target from any existing station across three service dates (all 33,672 distinct existing OD pairs per date). All eight raw GTFS hashes remain unchanged; the 17-trip quarantine is preserved.

**Completed deliverables:** `prototype/mrt/scenario.ts`, `simulation.ts`, `examples/illustrative-line.ts`, `simulate-cli.ts`, the `mrt:simulate` npm command, focused tests, `docs/MRT_HYPOTHETICAL_LINE_SIMULATION.md`, root README and `.gitignore`. No frontend, agents, Gemini, demand weighting or new infrastructure services were introduced. At the end of the implementation step, no git add, commit or push had been executed.

**Source-control handoff (27 October 2026):** The user subsequently authorised staging, committing and pushing the verified Phase 2 work to the configured GitHub repository. Handoff verification: 37 passing tests, no raw GTFS modifications, and no credential patterns detected in pending files. Commit subject: `feat: add hypothetical MRT line simulation`; the final commit ID and remote state are verifiable in Git history.

**Example:** Illustrative North Link connects NS4 to NE16 through two explicitly hypothetical locations. On 2026-10-27, NS4→NE16 changes from 62.77 to 20.00 modelled minutes; EW1→EW3 remains 11.30 minutes. The scenario has 186 physical stations, 221 service states and 512 directed edges, with one strongly connected component. These are calculated differences under assumed times, not validated real-world predictions or ridership benefits.

**Known limitations / deferred refinements:** No departure-clock timetable, speed-from-geometry calculation, headway/capacity simulation, construction programme, commissioning history, physical alignment/buildability validation or new catchment-accessibility metric. Proposed service is assumed open on the baseline service date. WGS84 bounds do not establish that a proposed location is buildable or inside Singapore. Existing provenance, calibration and public-holiday gaps remain.

**Next step:** Begin only the Phase 3 map/editor adapter: serialize explicit intervention inputs, convert GeoJSON coordinate order correctly, load the baseline on the Node side, return compact route/metric payloads, and keep scenario assumptions visible. The intended future speed/frequency/opening and engineering refinements are not removed from product scope. Demographics and the committed Phase 6 eldercare intervention remain planned.

### Phase 3 — Interactive Singapore Map and Intervention Editor

**Status: Complete for the scoped local prototype; geography/model limitations documented**

**Goal:** Make Phase 2 understandable and demonstrable in a local browser.

**Tasks**

- [x] Prototype MapLibre GL JS with geographically grounded Singapore coordinates and suitable tile access.
- [x] Display existing MRT stations and accepted logical connections from the baseline; label links schematic because verified rail alignment geometry is absent.
- [x] Add controls to place proposed stations and draw a connecting MRT line.
- [x] Validate geometry, provide edit/undo/reset, and distinguish existing vs hypothetical infrastructure.
- [x] Wire the editor to the Phase 2 simulation and display before/after routes.
- [x] Handle map loading failures and provide a clear local demo fallback.

**Deliverable:** Local Next.js page (`npm run dev`) where a user draws a proposed MRT line and sees real calculated journey changes.

**Exit check:** End-to-end demo works without editing source files or manually altering result numbers.

**Completed functionality (27 October 2026):** Next.js 16 App Router, TypeScript, Tailwind and MapLibre 6 run locally. A responsive editor/map/results workspace supports station selection, hypothetical point placement, marker dragging/numeric coordinate edits, station ordering/removal, segment removal/restoration, undo/reset/example loading, explicit running/dwell/walk/wait assumptions, dated OD selection and compact before/after results. Node API routes reuse the existing quarantined baseline and `simulateIntervention`; no routing calculation was duplicated or changed. Stale results are cleared and outdated requests cannot replace newer drafts.

**Geographic inputs:** All 332 supplied subzone polygons and 13,436 HDB footprint geometries are preserved in derived local assets (six-decimal rounding; no raw-data modification). Heights are uniformly illustrative 12 m because the source contains no measured heights. Country view loads local geography; the 23.53 MB building layer loads separately at neighbourhood zoom. Online OSM street tiles are optional, attributed and subject to OSM policy. Default core operation needs no tile account/API key or external map requests.

**Acceptance evidence:** `npm.cmd run dev` starts at `http://127.0.0.1:3000`; actual Chromium/Playwright MCP interaction verified reset → existing anchor → two map-placed stations → existing anchor → configure assumptions → run → edit/drag → rerun. A custom NS4→NE16 proposal returned 20.50 minutes, then 22.50 after its explicit running time changed, against a 62.77-minute baseline. Undo/reorder/removal, disconnected-run blocking, negative-cost errors and baseline-unavailable new-station outcomes were exercised. Real HDB extrusions rendered; 390×844 layout had no horizontal overflow. Deliberate street-tile failure left map/simulation usable; deliberate worker failure produced a geographic fallback and successful 20.00-minute example.

**Validation:** Independent Phase 3 validation passes `npm.cmd run mrt:validate`, `npm.cmd run mrt:simulate`, `npm.cmd test` (43/43) and `npm.cmd run build`, including TypeScript checking. The 43 tests comprise the original 37 plus five adapter/API tests and one geodata integrity test. Phase 3 is checkpointed in `9572cde` (`feat: implement interactive Singapore MRT simulation map`). Raw GTFS and geography hashes remain unchanged; core graph/routing/scenario/simulation files are unchanged in this phase. No push was performed during integration.

**Combined integration validation (27 October 2026):** Local `master` integrates `feature/synthetic-population` checkpoint `33f27ce` through an ordinary merge preserving both histories. Only `.gitignore` and `package.json` conflicted: retain all generated-output exclusions, frontend dependencies and preparation hooks, and add the population CLI scripts and test glob. The lockfile dependencies still match. The combined suite has **59 passed, 0 failed** (37 baseline MRT + 6 map/adapter + 16 population tests), not 43 + 53. MRT graph validation passes for Tuesday/Saturday/Sunday with 184 stations and zero unreachable ordered distinct pairs; the hypothetical-line CLI retains the NS4→NE16 62.77→20.00-minute example. Default/national population generation and preprocessing pass. Application TypeScript, explicit population TypeScript checking and the Next.js production build pass. For the standalone population check with the installed TypeScript 7 compiler, use `--ignoreConfig` with explicit source files; the application check uses the existing tsconfig.

**Integrated browser smoke test:** Production server on a separate local port, exercised through Playwright MCP: 184 stations load, the MapLibre canvas is visible, the illustrative line returns 62.77→20.00 minutes, changing boarding wait to 180 s clears the previous result and reruns to 20.50 minutes, and the neighbourhood camera works. No browser console errors were observed during the initial smoke flow. This focused integration check supplements the broader Phase 3 browser verification above; it is not a committed browser regression suite. Both `.env.local` files remain unchanged, ignored, untracked and unstaged; `.env.example` has empty placeholders only. Pending/staged repository contents were scanned for known local credential values and common credential patterns without exposing values.

**Remaining issues / incomplete refinements:** No verified rail alignment, measured building heights, street/terrain completeness, engineering assessment or real-time/departure-clock model. GTFS timing provenance and supplied geodata licensing provenance remain unresolved. Footprints are not spatially tiled, so first neighbourhood load is larger than ideal. SVG fallback retains geographic editing and numeric results but omits full 3D/pan/zoom, numbered proposed markers and calculated route overlays. Browser flow was genuinely tested through MCP; a committed automated browser regression suite is not yet present. These do not establish demographic or demand-weighted predictions.

**Handoff:** See `docs/INTERACTIVE_MAP_IMPLEMENTATION.md`, `docs/MAP_GEODATA_NOTES.md`, `docs/SYNTHETIC_POPULATION_IMPLEMENTATION.md` and root README for contracts, attribution/policy, rebuild commands and verification. The demographic engine now coexists with the map/MRT engine; population-to-MRT behaviour and visual integration remain pending. Animate schematic calculated paths honestly until reliable transport geometry is acquired. Preserve Phase 5 Gemini and Phase 6 eldercare commitments; neither is implemented here. Minor deferred UI issue from review: the displayed 40-station limit is enforced by the API, but station-add controls can exceed it.

### Phase 4 — Synthetic Population and Animated Citizens

**Status: Phase 4A foundation complete and integrated; Phase 4B and full Phase 4 exit check pending**

**Goal:** Link transport changes to representative demographic experiences and visually animate them.

**Tasks**

- [x] Select geographic units and obtain dated demographic distributions (Census 2020 joint age/sex cells across 55 planning areas and 332 subzones).
- [x] Generate a seeded, weighted synthetic population; document missing joint distributions/assumptions.
- [ ] Assign modelled home/destination/travel preferences without claiming they are real individuals.
- [ ] Route agents on baseline/scenario networks, computing differences by demographic group.
- [ ] Visualize ~100–300 blocky citizens initially; thousands can remain simulation-only.
- [ ] Animate daily movement from calculated routes, using aggregation/LOD for performance.
- [ ] Allow clicking a citizen to see synthetic profile, routine, baseline journey and scenario change.

**Deliverable:** Visually engaging miniature Singapore where citizen activity and summaries reflect the same simulation state.

**Exit check:** Weighted population totals reconcile to input distributions; visual and numeric outputs agree; animation remains usable on the presentation laptop.

**Phase 4A — Completed foundation:** `prototype/agents/` provides source validation, seeded stratified allocation, population expansion weights, provenance, and separate observation/assumption/render contracts. Checkpoint `33f27ce` (`feat: implement deterministic synthetic population generator`) passed 53 independent tests (37 baseline MRT + 16 population tests). It also passes an explicit compiler check using the main worktree's existing TypeScript installation without adding dependencies. The integrated suite passes 59 tests. `npm.cmd run agents:generate` produces 2,000 representatives of 162,520 Ang Mo Kio leaf counts; `npm.cmd run agents:generate -- --all --size 10000 --seed integration` represents 4,047,260 national leaf counts. `npm.cmd run agents:prepare` validates 55 planning areas, 332 subzones and 12,616 joint cells and writes ignored, reproducible derived data. Use weights for demographic totals; agent counts intentionally overrepresent small cells. National generation requires at least 8,359 representatives to retain every positive cell.

**Demographic limitations to preserve:** This is historical Census 2020 data, not live population or passenger demand. The represented rounded age/sex leaf-cell total **4,047,260** differs from the separately published national total **4,044,210** by **3,050**; neither total is silently normalised. Nil/negligible source markers are explicitly approximated as zero, not proof of absence; selections such as Boon Lay can have published residents but no positive detailed cells and therefore fail generation. Retain the discrepancy audit, source licence/attribution and reference year. Exact ages, home coordinates, destinations, daily routines, income/employment joint distributions, mobility, travel demand and behavioural responses remain unassigned or unsupported.

**Phase 4B — Pending:** Agree explicit home/destination, eligibility and travel assumptions before assigning origins or destinations. Connect representative citizens to the existing MRT result contracts and compute weighted demographic differences with reproducibility and coverage tests. Then animate a small blocky visual sample on clearly schematic calculated paths, using LOD for performance and displaying synthetic status, provenance and model assumptions. No population-to-MRT assignments, demographic-impact metrics or citizens were added by this integration. Full Phase 4 is not complete.

### Phase 5 — Societal Impact Dashboard and Gemini Layer

**Status: Planned**

**Goal:** Make demographic differences the centre of the judging story.

**Tasks**

- [ ] Show travel time improvement, access to relevant amenities, percentage benefiting, and changes broken down by age or other supported groups.
- [ ] Separate directly calculated accessibility changes from speculative downstream business/housing effects.
- [ ] Provide source year, assumptions, simple sensitivity ranges and model limitations.
- [ ] Send only structured simulation outputs to Gemini for interpretation, not calculation.
- [ ] Validate Gemini's dashboard layout JSON against a strict schema and render only predefined React components.
- [ ] Add opt-in on-demand conversations with selected synthetic citizen personas, grounded in their recorded simulation state.
- [ ] Prevent persona narratives from being presented as surveyed real residents.

**Deliverable:** A visually polished, evidence-informed impact dashboard and one reliable citizen chat interaction.

**Exit check:** Every numerical claim traces to a calculation, official input, or clearly labelled assumption; the experience works if Gemini is unavailable (core simulation remains usable).

### Phase 6 — Second Intervention: New Eldercare / Active-Ageing Centre

**Status: Planned — confirmed second simulation; implementation after the flagship MRT vertical slice**

**Goal:** Deliver the second agreed simulation: users place a hypothetical eldercare or active-ageing centre, then evaluate how access to services changes for older residents. Reuse the map, population model and dashboard.

**Tasks**

- [ ] Import verified eldercare facility locations and relevant eligibility/capacity assumptions.
- [ ] Let a user place a hypothetical centre and choose whether it is residential eldercare, day care, or an active-ageing/community programme; model only supported service types and relevant capacity assumptions.
- [ ] Recompute time/distance to suitable facilities and access within a threshold.
- [ ] Report improvement by elderly subgroups and note capacity constraints.
- [ ] Reuse citizen inspection, animations, dashboard components and Gemini explanation pipeline.

**Deliverable:** One functioning eldercare or active-ageing centre scenario with defensible accessibility metrics and a clear before/after comparison.

**Exit check:** Results are calculated, not generated as arbitrary forecast percentages. Actual service uptake or loneliness reduction is not asserted without a supported model.

### Phase 7 — Demo Reliability, Documentation and Pitch

**Status: Planned**

- [ ] Run a complete three-minute scenario: baseline → new line → agents reroute → demographic impacts → inspect/talk to citizen.
- [ ] Verify local startup from a fresh terminal (`npm install` if needed, then `npm run dev`).
- [ ] Test failure cases: API unavailable, Gemini timeout, map-tile outage, malformed intervention.
- [ ] Prepare a permitted **rebuild-from-scratch** checklist with installation, dataset retrieval, API configuration, tests and common failures.
- [ ] Keep a clear disclaimer: evidence-informed **scenario modelling**, not authoritative government forecast.
- [ ] Create a short presentation script and assign speakers.

**Exit check:** The team can explain exactly which figures are observed, calculated, assumed or speculative, and reliably reproduce the flagship demo.

## 4. Suggested 24-Hour Competition Rebuild Plan

This is a **target schedule**, not a commitment; adjust based on prototype findings and actual contest rules.

| Competition time | Core objective | Lead(s) |
|---|---|---|
| Hours 0–2 | Scaffold local Next.js app, configure APIs, ingest permitted data, define interfaces | AI/data-science developers |
| Hours 2–6 | Rebuild validated MRT graph and hypothetical-line engine with smoke tests | Developer A |
| Hours 2–7 (parallel) | Build map, existing rail overlay and draw/place-station interaction | Developer B |
| Hours 6–10 | Integrate route simulation with map; baseline/scenario results | Developers A + B |
| Hours 10–14 | Generate demographic agents and render blocky citizen movement | Developers A + B |
| Hours 14–17 | Show demographic impact dashboard; integrate Gemini explanation/persona chat | Developers A + B |
| Hours 17–20 | Integrate the **planned second scenario** (eldercare/active-ageing centre) using shared access calculations; if blocked, demonstrate the validated portion without fabricating outcomes | Developers A + B |
| Hours 20–22 | Test laptop/browser/internet failure modes, freeze core demo | Both developers |
| Hours 22–24 | Rehearse presentation, record fallback screenshots/video if allowed, resolve critical bugs | Entire team |

**Mass-communications teammate (throughout):** refine problem framing, design copy, validate user journey, collect evidence/citations, prepare pitch slides, rehearse timing, and challenge unsupported societal claims. This person should be involved from Hour 0, not only at the end.

## 5. Scope Guardrails

**Must ship**

1. Real Singapore geography and operational train baseline (with dated/verified inputs).
2. A user-created hypothetical MRT line.
3. Calculated, reproducible before/after travel-accessibility changes.
4. At least one demographic-group comparison.
5. Clear map/dashboard storytelling with understandable limitations.

**Planned second intervention (scope after MRT is functional)**

- Place a new eldercare or active-ageing centre, quantify changes in access for older residents and show capacity assumptions.

**Highly desirable**

- Animated blocky citizens whose movements match the simulation.
- Click-to-inspect representative synthetic citizen.
- Gemini-grounded explanation and persona conversation.

**Future roadmap, not required for the 24-hour submission**

- Arbitrary bus route construction, housing developments, subsidy policies and other interventions.
- Precise property price, business revenue and healthcare savings forecasts.
- Research-grade multi-year demographic/economic feedback models.
- Full Singapore-wide realistic daily travel demand.

## 6. Key Architecture Decisions

- **One local application:** Next.js + TypeScript where feasible, started with `npm run dev`.
- **Transport algorithms:** Deterministic graph/routing calculations; no Gemini involvement in shortest paths.
- **Model separation:** Baseline graph, scenario graph, synthetic population, metrics, visualization, and AI explanation are separate modules.
- **Data access:** API adapters with validation and local caching; live requests do not imply real-time data. The LTA monthly OD data cannot produce live rider locations.
- **Generative UI:** Gemini returns **validated configuration**, not executable UI code; predefined charts/components render its choices.
- **Security:** API keys remain server-side and out of source control.
- **Integrity:** Every impact metric includes provenance and whether it is observed, calculated or scenario-assumed.

## 7. Phase Handoffs and Documents

| Phase | Suggested documentation |
|---|---|
| 0 | `docs/DATA_VALIDATION_REPORT.md`, `docs/DATA_SOURCES.md` |
| 1 | `docs/MRT_GRAPH_VALIDATION.md` |
| 2 | `docs/MRT_HYPOTHETICAL_LINE_SIMULATION.md` (implemented prototype spec, results and tests); optional later split into `docs/MRT_INTERVENTION_SPEC.md` and `docs/MRT_SIMULATION_TESTS.md` |
| 3 | `docs/INTERACTIVE_MAP_IMPLEMENTATION.md`, `docs/MAP_GEODATA_NOTES.md`; optional later `docs/MAP_UI_SPEC.md` |
| 4 | `docs/SYNTHETIC_POPULATION_IMPLEMENTATION.md` (completed Phase 4A); `docs/AGENT_ANIMATION.md` (pending Phase 4B) |
| 5 | `docs/IMPACT_METRICS.md`, `docs/GEMINI_STRUCTURED_OUTPUTS.md` |
| 6 | `docs/ELDERCARE_SIMULATION.md` |
| 7 | `docs/HACKATHON_REBUILD_GUIDE.md`, `docs/PITCH_SCRIPT.md` |

## 8. Immediate Next Action

**Agree the population-to-MRT assumptions and interfaces before beginning Phase 4B.** The map/MRT engine and deterministic population foundation now coexist in one tested local repository. The integration checkpoint is the merge commit after `9572cde` and `33f27ce`; obtain its exact hash from Git history. Both worktrees and the feature branch are retained, with no integration push or pull request. Demographic source values and weighting assumptions remain unchanged.

**Recommended parallel ownership for the next phase (not started by this integration):** Terminal 1 owns Phase 4B map/rendering, blocky citizen animation, selection/inspection and performance; consume a small versioned render/result contract rather than inventing travel behaviour in the frontend. Terminal 2 owns the documented population-to-MRT assignment assumptions, weighted demographic comparison and deterministic tests, then Phase 6A facility-data validation and an independent eldercare/active-ageing accessibility engine. Define supported service type, eligibility, travel and capacity assumptions before calculating facility access; keep access estimates separate from uptake, health or loneliness outcomes. Terminal 1 can later add the Phase 6A placement/results UI once that contract is stable. Terminal 3 coordinates shared configuration, review and integration; avoid simultaneous edits to the roadmap or package files. Keep Phase 5 Gemini pending until grounded structured results are available.

Do not treat animated movement as observed passenger behaviour, claim real rail alignment for schematic links, or ask Gemini to calculate impacts. Continue provenance and timing calibration, consider spatial tiling of HDB geometry, and add repeatable browser regression coverage as the UI grows. Keep the planned Phase 5 dashboard/Gemini and Phase 6 eldercare / active-ageing centre simulation intact.
