# ImpactLens SG — Development Phases & Hackathon Rebuild Roadmap

**Status:** Phase 7D/7E are integrated and locally verified on the existing Phase 7F/7G checkpoint. The real frozen experiment -> scripted stakeholder run -> combined graph -> A/B comparison journey passes combined production-browser acceptance. Final validation: 521 Node tests, 19 GIS tests, six model CLIs, application/strict TypeScript and production build. Both branches remain at `6c6fb831f72b79e47776417096997c5862fefee9`, unstaged/uncommitted; source worktree retained. Live web retrieval, authorised live stakeholder LLM execution, public building-data licensing, OpenRouter live authentication and calculated-population trajectories remain unresolved.
**Last updated:** 28 October 2026
**Team:** 3 (2 AI/data science, 1 mass communications)  
**Hackathon build window:** 24 hours  
**Development:** Local Next.js App Router application (`npm run dev`) plus Node 24 TypeScript CLI; no Vercel required  
**AI:** Configurable Gemini API or OpenRouter through a shared server interface (planning budget approximately US$200)
**Main judging proposition:** Quantify how proposed interventions affect **different demographic groups**.

> **Competition constraint:** The prototype is for learning. Do not bring a completed implementation into the competition if rules prohibit it. Bring permitted documentation, architecture, findings, and reconstruction instructions; verify whether pre-downloaded datasets, generated code, or other materials are allowed.

## 1. Project Definition

ImpactLens SG is an evidence-informed, interactive Singapore social-impact sandbox. Users can propose new MRT lines, eldercare facilities, and—eventually—other infrastructure or policy interventions. A synthetic population reacts through a deterministic simulation, while blocky animated characters visualize agent movement and Gemini supports structured explanations, generated dashboard configurations, and conversations with representative citizens.

**Model integrity rules**

**ImpactLens SG 2.0 direction:** Start with an open-ended question and user-drawn geographic context in General. Explicitly confirm meaning, network connections and assumptions before calculation. Only registered validated engines execute (currently MRT and limited AAC). Future exploratory stakeholders must be labelled hypothetical, never representative public opinion. Evidence planning does not imply documents were fetched or findings verified. Phase 7B interprets without executing; Phase 7A.1 supplies a plotting-to-calculation layer with optional Advanced editors. Phase 7G constructs an inspectable relationship graph from current structured inputs and accepted results; it does not retrieve evidence or execute stakeholder simulations.

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
4. **Synthetic citizens** — Phase 4A foundation, shared contract, Phase 4B illustrative movement and Phase 4C weighted MRT outcomes integrated. Current-proposal metrics/profiles work; calculated citizens still lack justified geographic movement paths.
5. **Impact dashboard + AI** — weighted dashboard, finite layouts/evidence and synthetic conversations implemented for Gemini/OpenRouter; Gemini adapter live smoke passed, both providers tested with mocks, wider live verification pending.
6. **New eldercare / active-ageing centre intervention** — AAC placement and straight-line access/threshold dashboard implemented for the limited Bukit Merah preset (**second committed demonstration scenario**). Optional speed/capacity are explicit assumptions; walking routes, service allocation and individual eldercare journeys remain unsupported.
7. **Scenario-first exploration** - General plotting, planner, internal-review buildings, illustrative pedestrians, Knowledge Graph and the limited Phase 7D/7E experiment/evidence/scripted-run workflow are integrated and locally verified. Source-backed replay and synthetic dialogue remain separate. Public licensing, live retrieval/provider execution and original demo reliability/rebuild/pitch work remain pending.
8. **Reliability, documentation, and pitch (parallel preparation)** — demonstrate both interventions where feasible.

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

**Status: Phase 4A, shared contract, Phase 4B and Phase 4C local scopes validated and integrated; original full Phase 4 exit check partially met**

**Goal:** Link transport changes to representative demographic experiences and visually animate them.

**Tasks**

- [x] Select geographic units and obtain dated demographic distributions (Census 2020 joint age/sex cells across 55 planning areas and 332 subzones).
- [x] Generate a seeded, weighted synthetic population; document missing joint distributions/assumptions.
- [x] Define a shared, versioned citizen simulation contract with JSON validation, illustrative fixtures and profile/animation/aggregate boundaries for parallel work.
- [x] Assign explicitly hypothetical station-pair journeys under declared deterministic travel-demand assumptions; preserve unassigned/unknown residents.
- [ ] Establish justified individual/geographic starting locations, daily routines, walking/egress and mobility assumptions before attaching movement to calculated residents.
- [x] Route assigned representatives on baseline/scenario networks and compute full-population weighted differences by age, sex, planning area and subzone.
- [x] Visualize ~100–300 blocky citizens initially; thousands can remain simulation-only (180-agent illustrative fixture measured; configured cap 300 desktop/100 narrow).
- [ ] Animate daily movement from calculated routes, using aggregation/LOD for performance (fixture controller/LOD implemented; calculated residents intentionally have no unsupported individual paths).
- [x] Allow clicking a citizen to inspect synthetic categories, weight, supplied baseline/scenario journey and provenance; leave unsupported routines unassigned and label fixture values illustrative.

**Deliverable:** Visually engaging miniature Singapore where citizen activity and summaries reflect the same simulation state.

**Exit check:** Weighted population totals reconcile to input distributions; visual and numeric outputs agree; animation remains usable on the presentation laptop.

**Phase 4A — Completed foundation:** `prototype/agents/` provides source validation, seeded stratified allocation, population expansion weights, provenance, and separate observation/assumption/render contracts. Checkpoint `33f27ce` (`feat: implement deterministic synthetic population generator`) passed 53 independent tests (37 baseline MRT + 16 population tests). It also passes an explicit compiler check using the main worktree's existing TypeScript installation without adding dependencies. The integrated suite passes 59 tests. `npm.cmd run agents:generate` produces 2,000 representatives of 162,520 Ang Mo Kio leaf counts; `npm.cmd run agents:generate -- --all --size 10000 --seed integration` represents 4,047,260 national leaf counts. `npm.cmd run agents:prepare` validates 55 planning areas, 332 subzones and 12,616 joint cells and writes ignored, reproducible derived data. Use weights for demographic totals; agent counts intentionally overrepresent small cells. National generation requires at least 8,359 representatives to retain every positive cell.

**Demographic limitations to preserve:** This is historical Census 2020 data, not live population or passenger demand. The represented rounded age/sex leaf-cell total **4,047,260** differs from the separately published national total **4,044,210** by **3,050**; neither total is silently normalised. Nil/negligible source markers are explicitly approximated as zero, not proof of absence; selections such as Boon Lay can have published residents but no positive detailed cells and therefore fail generation. Retain the discrepancy audit, source licence/attribution and reference year. Exact ages, home coordinates, destinations, daily routines, income/employment joint distributions, mobility, travel demand and behavioural responses remain unassigned or unsupported.

**Shared contract — Implemented (27 October 2026):** `lib/contracts/citizen-simulation.ts` exports version 1 browser-safe metadata, deduplicated provenance/assumption catalogues, synthetic citizen references, compact journey outcomes, separate visual-only schematic animation, demographic metric denominators and selected-profile responses. Reuses existing population category/provenance conventions and compact MRT fields through type-only imports; no dependencies or algorithm changes. Public `parseCitizenSimulation` / `assertCitizenSimulation` and `parseCitizenProfile` / `assertCitizenProfile` reject malformed JSON boundaries, contradictory null/status/denominator combinations and unsupported observation claims. Fixtures are explicitly invented, not Census observations. See `docs/CITIZEN_SIMULATION_CONTRACT.md` for exact terminal handoffs, units, sign conventions, sampling rules and source limitations.

**Shared-contract validation:** **84 passed, 0 failed** (all existing 59 + 25 focused contract tests). Tests cover JSON round trips, invalid versions/IDs/weights/coordinates/provenance/references, status/null/sign consistency, full/partial population bounds, full-coverage and subgroup denominators, beneficiary/mean consistency, schematic movement and profiles. A real generated population preserves its IDs and weights; an actual compact MRT result retains 62.77→20.00 minutes and the existing longitude-first route coordinates. Importing the public contract with Node built-ins blocked succeeds. Application TypeScript, explicit population/contract/test TypeScript and Next.js production build all pass. Read-only design/code review completed; three denominator/mean consistency gaps were reproduced with failing tests and fixed before the checkpoint. Existing MRT/population algorithms, frontend, raw data and lockfile remain unchanged; both environment files remain unchanged and Git-ignored/untracked. No push or new development phase is included.

**Phase 4B — Illustrative rendering/inspection validated (Terminal 1, 27 October 2026):** One MapLibre/Three.js shared-context 3D layer batches twelve procedural cuboid parts; no per-agent React trees or second render loop. Added ID-based visual variation, supplied-coordinate movement, idle/walking/travelling/arrival/paused states, play/pause/reset/speed, reduced-motion support, 450 ms view transitions, selected-path/ring highlighting and searchable profiles. Baseline/scenario keeps identity/camera/clock; baseline hides proposed infrastructure. MRT editing/results remain available in their inspector tab, with a pause control beside the map and responsive citizen inspector. Profiles show supplied categories, weight, journey/status/transfers and provenance; no invented name, occupation, mobility or routine. Talk-to-citizen is honestly disabled for future Phase 5 Gemini.

**Phase 4B data boundary:** The existing version-1 parsers validate immutable `{baseline, scenario}` payload pairs and profiles. Import a small JSON pair without requiring Terminal 2's endpoint. The 180-agent fixture, its 9,000 represented weight, spatial grid and 30→20-minute example are entirely invented, never Census or routing-engine predictions. MRT proposal edits do not regenerate citizen outcomes; supplied modelled results must match the intervention/date through the future Phase 4C integration. No shared-contract, population-generator, demographic-impact engine, raw dataset or environment-file changes were made.

**Phase 4B validation:** All **97 tests pass, 0 fail**, preserving the original 84 and adding 13 rendering/data/controller regressions. MRT validation and hypothetical-line CLI pass; TypeScript, `git diff --check` and Next production build pass. Playwright MCP verified actual character rendering/movement, click selection (Citizen 128), accessible profiles and all four fixture outcomes, pause/reset, stable view selection, reduced motion, import rejection/success, pan/zoom and LOD. Existing MRT scenario returned 20.00 minutes; adding 60 s to segment 1 returned 21.00. Adding NS16 plus a new map station produced a valid six-station proposal and reran. Tested 1600×1000, 820×1000 and 390×844 without horizontal overflow. No final-session browser console errors. Read-only review and regression tests resolved Mercator scaling and stale selection bounds. Starting branch remained `master` containing `98c91d6`; no commit, push, merge, rebase or reset was performed.

**Phase 4B performance/limitations:** Foreground Intel UHD/ANGLE browser samples showed roughly 103–128 custom-layer frames/s with 179–180 drawn citizens/HDB and 12 body draws plus a selection ring; narrow samples reached roughly 122–123 with a 100-character cap. These are short local cadence observations, not sustained/GPU benchmarks. Background throttling initially produced ~1 frame/s; a scrolling/focus transient was ~30. Low zoom simplifies to 60 heads/torsos, then hides below 13.5. Configured capacity 300 is unbenchmarked. Drawn counts can include occluded people; picking does not test building occlusion. Untiled 23.5 MB HDB geometry, illustrative heights/toy scale, schematic paths, simple travelling poses and absent behavioural daily routines remain limitations. No long-duration memory or forced-context-loss profiling, and no committed browser regression suite. See `docs/ANIMATED_CITIZENS_IMPLEMENTATION.md` for reproduction, exact tests and handoff. Full Phase 4 is **not complete**.

**Phase 4C — Complete for scoped hypothetical-demand calculation:** `prototype/agents/impact/` and its server/CLI entry points provide deterministic explicit/distributed OD assignment, declared origin/reference-point options, deduplicated existing MRT routing, full-population weighted outcomes, named benefit/accessibility denominators, group comparisons and full-population `getProfile`. Independently validated at `b87db99`: 104 tests, impact CLI, explicit TypeScript and production build pass. Journeys are assumed, not observed demographic commuting. No individual home/path geometry is produced. The 3,050 source-total discrepancy and original weights remain unchanged. See `docs/DEMOGRAPHIC_IMPACT_SIMULATION.md`.

**Combined full-stack integration — Validated (27 October 2026):** Phase 4B was checkpointed at `2a99dbb`, Phase 4C at `b87db99`, and ordinary merge `7b7f33d` passed 117 tests/build with no conflicts. Subsequent integration adds bounded `POST /api/impact`, expiring run-bound profile retrieval, exact proposal/date/settings fingerprints, abort/revision guards, a compact demographic report and calculated-profile inspector. One Phase 4C comparison payload supplies baseline/scenario views; no schema-v1 rewrite or duplicate outcome calculation. The animation fixture remains a separately labelled mode with the editable proposal hidden. The main MRT editor, algorithms, Three.js dependencies/lockfile, source values and shared contract remain intact. Final local checkpoint/feature fast-forward are identifiable in Git history; nothing is pushed.

**Combined validation:** **131 tests pass, 0 fail** (117 merged + 14 integration tests); MRT validation/simulation, population generation, impact CLI, application/explicit TypeScript and production build pass. Playwright production-browser flows verify the original 62.77→20.00-minute example, segment-time edits/reruns, current-proposal weighted report, 19 age bands plus sex/area comparisons, calculated profiles including an outside-display-sample ID, baseline/scenario stability, stale-report clearing, deliberately delayed-response rejection and 0% participation with unknown/null savings. Illustrative play/pause/reset/speed/selection remains functional and separate. Desktop 1440×1000 and narrow 390×844 layouts have no horizontal overflow; deliberate invalid requests return controlled errors and no unexpected console errors were observed. Foreground short sample: 180 citizens, 13 draws, layer 135.97 FPS; first measured impact HTTP response about 1.98 s. These are local observations, not performance guarantees.

**Reproducibility finding:** The existing main Census CSV is LF (`9d1183c4…`), while agents is CRLF (`6ac3e693…`); parsed cells are identical. Raw provenance is part of synthetic IDs, so seeded assignments differ despite identical cell counts. Main's default 2,000-agent CCK example yields 192,150 represented, approximately 153,096.27 comparable, 50.8601% benefiting among comparables and 21.7512 mean minutes saved. The earlier Phase 4C 49.2877% / 21.0787 example uses the other raw hash. Both raw files are preserved; neither result is reused for another proposal. Record source bytes/hash as well as seed, size, date and assumptions when reproducing results. No silent encoding/identity policy change is made.

**Full Phase 4 exit assessment — Partial:** Weighted totals and numerical/profile outputs reconcile and refer to the current intervention. The animated miniature city still uses invented fixture people/paths and does not depict that same calculated population. Calculated residents remain profile-only until defensible starting positions and geographic movement assumptions exist. Do not mark the original visual/numeric-agreement exit check fully met or infer social outcomes from animation. `docs/PHASE4_FULL_INTEGRATION.md` records architecture, HTTP bounds/cache, browser evidence, source-byte caveat, exact reproduction and rebuild order. Optional AI presentation/conversations follow in Phase 5 below; eldercare integration remains pending.

### Phase 5 — Societal Impact Dashboard and Provider-Independent AI

**Status: Core implemented and validated; wider live-provider verification and amenity/sensitivity extensions remain pending**

**Goal:** Make demographic differences the centre of the judging story.

**Tasks**

- [ ] Show travel time improvement, access to relevant amenities, percentage benefiting, and changes broken down by age or other supported groups (journey/threshold/age/sex/area/subzone dashboard implemented; amenity-specific inputs await the relevant facility/data model).
- [x] Separate directly calculated accessibility changes from speculative downstream business/housing effects; no causal forecast is generated.
- [ ] Provide source year, assumptions, simple sensitivity ranges and model limitations (source/assumption/limit labels implemented; no calibrated uncertainty interval or automatic sensitivity range is claimed).
- [x] Send compact, server-resolved simulation summaries to either configured Gemini or OpenRouter; no AI routing or impact calculation.
- [x] Validate a finite version-1 layout/evidence/topic schema on server and client; render approved React components and trusted factual templates only.
- [x] Add opt-in on-demand conversations with selected calculated synthetic profiles, preserving bounded per-run/per-citizen history.
- [x] Label personas synthetic and reject unsupported personal facts; invented fixture chat remains disabled.

**Deliverable:** A visually polished, evidence-informed impact dashboard and one reliable citizen chat interaction.

**Exit check:** Every numerical claim traces to a calculation, official input, or clearly labelled assumption; the experience works if either AI provider is unavailable. The implemented bounded core meets this check under automated/mock/browser validation; do not mark the entire wider phase complete while live OpenRouter and the unchecked extensions remain outstanding.

**Implemented (Terminal 1, 27 October 2026):** Expanded dark-mode dashboard, weighted coverage/KPIs, fixed 0–100% benefit bars, shared absolute-count coverage bars, age/sex/area/subzone sorting, selected-group details, exact tables, threshold and transfer results. Existing MRT editor/map/illustrative animation and calculated profile workflow are preserved. The AI layer uses native fetch and fixed official hosts, independent provider/model configuration, metadata/capability checks, strict schemas, usage/deadline/body limits and process-wide duplicate/two-request protection. No new dependency or service. The only Phase 4 server adapter change is a read-only cached-run accessor; weights, v1 citizen contracts and calculation algorithms are unchanged.

**Grounding/lifecycle:** Layouts contain approved metric IDs and chart choices, never arbitrary code/new values. Explanations select evidence references; conversational topic selections are rendered through trusted first-person templates. Actual run/request IDs and the existing engine `getProfile` resolve facts server-side. Edits invalidate explanations/chat; reset aborts pending AI layout changes. Unknown/unassigned remains unknown, including the zero-comparable case. No provider/key is needed for deterministic charts or profiles. `.env.example` has placeholders; `.env.local` is unchanged.

**Validation:** **166 tests passed, 0 failed** (131 existing + 35 new); TypeScript, production build, MRT validation/simulation and population-impact CLI pass. Playwright MCP verified default/edited MRT journeys (20→21 scenario minutes), default demographic mean 21.75→21.24, full weighted coverage, 19/2/1/6 age/sex/area/subzone groups, sorting/details and profiles. Both provider UI paths use accepted mock responses through the same application schema. Grounded chat shows supplied 62.77→21.00 minutes; unsupported personal questions are acknowledged. Delayed reset/edited-scenario responses are ignored. Malformed/schema-invalid/504 responses retain the dashboard. At 0% participation, all 192,150 weight remains unassigned with Unknown mean/share and no fabricated trip. Desktop/narrow views have no horizontal overflow; illustrative animation still works and triggered zero AI generation calls during the check. Final fresh page has no console errors; deliberate 504 testing produced its expected resource error.

**Provider verification:** Gemini `gemini-3.5-flash-lite` passed one capped live adapter/schema smoke: 48 input, 108 output, 156 total provider-reported tokens, with synthetic smoke context only. It does not establish every live explanation/chat workflow. OpenRouter docs/public catalogue and HTTP/service/browser mocks were validated; no OpenRouter key was available, so authenticated/live generation remains pending. Current model candidates are recommendations verified on this date, not hardcoded defaults. The private project configuration has a Gemini key but no selected provider/model; the application intentionally stays in deterministic mode until the owner configures them and reloads. No exact charge is asserted.

**Final production integration check:** Both providers additionally passed the actual browser → Node AI routes → adapter → client-schema path using mocked upstream HTTP, switching server process configuration without application edits. Layout/explanation/chat succeeded on isolated local production servers with dummy keys; calculated chat retained 62.77→20/21-minute facts and acknowledged unsupported personal details. This caught and fixed request-only fields leaking into the strict chat identity envelope and Next production's internal localhost normalisation. Regression tests now cover server-to-client round trips for all operations and both providers, plus valid browser Host/Origin handling. Temporary fixture servers were cleaned up. This is not a live OpenRouter claim.

**Review and limits:** Independent review found and fixed missing explanation units, a pending-layout reset race and oversized retained conversation history, with regression evidence. Bounded template answers are intentional, not a general-purpose free-form persona. Raw GTFS timing calibration, Census rounding and the 3,050 national discrepancy, source-byte identity sensitivity, assumed demand, absent access/egress/crowding and the Phase 4 geographic-trajectory limitation remain. No long-term causal benefits, amenity model, Gemini-generated calculations or eldercare engine were added. See `docs/PHASE5_DASHBOARD_AI_IMPLEMENTATION.md` for modules, protocols, exact constraints and rebuild steps. Integrated locally in Phase 5 checkpoint `5a5d56e` and merge `6d37175`. Combined validation: **205 tests passed, zero failed**, application/explicit module TypeScript and production build passed. Production Playwright checks retained MRT editing, dashboard/group/profile flows, no-key fallback, both mocked providers, guarded citizen chat and illustrative animation at desktop/narrow widths. No paid requests were repeated; OpenRouter live authentication remains pending. See `docs/PHASE5_PHASE6_BACKEND_INTEGRATION.md`. Nothing was pushed.

### Phase 6 — Second Intervention: New Eldercare / Active-Ageing Centre

**Status: Phase 6A/6B and Phase 6C interactive AAC scope validated; broader eldercare service types, capacity allocation and eldercare-specific AI remain pending**

**Goal:** Deliver the second agreed simulation: users place a hypothetical eldercare or active-ageing centre, then evaluate how access to services changes for older residents. Reuse the map, population model and dashboard.

**Tasks**

- [x] Phase 6A: Validate 133 historical MOH locations, including four operator-corroborated AAC classifications and 129 unknown classifications; preserve unknown opening/capacity and age-only eligibility assumptions. Checkpoint `3b61efc`.
- [x] Phase 6A: Deterministic WGS84 straight-line accessibility, threshold comparisons and weighted elderly age/sex/geographic metrics, with explicit unlocated/unavailable statuses. Two provenance-labelled Bukit Merah proxies provide limited-area illustration, not nationwide coverage.
- [x] Phase 6B: `GET /api/eldercare/facilities` and `POST /api/eldercare/simulate`, browser-safe validators, bounded inputs, calculation-sensitive identity and local-input caching. Checkpoint `7c3dcde`.
- [x] Validate actual HTTP/CLI parity, coordinate/threshold identity changes, weighted denominators and controlled 400/413/415 responses. Default preset: 44,520 represented older residents, 6,230 located/comparable, 38,290 unlocated (unknown, not unaffected); capacity and service allocation are unmodelled.
- [x] Merge with Phase 5 without conflicts (`6d37175`); **205 combined tests passed, zero failed**, application/explicit module TypeScript and production build passed. All six MRT/population/eldercare CLI checks passed. Raw bytes and formulas unchanged.
- [x] Phase 6C: Add MRT Line / Active Ageing Centre selector with separate drafts/results and one persistent map; only supported AAC service type is exposed.
- [x] Let a user place, drag/reposition, manually locate, cancel and reset a hypothetical AAC, with explicit radius, age, availability and optional capacity/speed assumptions.
- [ ] Expand service selection to residential eldercare, day care and other programmes only after compatible data, eligibility and calculation models are validated. These unsupported types remain unavailable.
- [x] Backend: Recompute straight-line distance to compatible facilities and access within a threshold.
- [x] Phase 6C: Four corroborated historical AAC markers, distinct hypothetical site, geographic straight-line radius and two result-provided proxy markers. Before/after distance/threshold dashboard, age/sex/area/subzone sorting/details, unlocated coverage and unknown capacity.
- [x] Phase 6C: Invalidate pending/current results on every calculation input edit; cancellation plus revision/attempt guards and complete token/fingerprint/scenario validation reject obsolete responses.
- [x] Phase 6C: Real Playwright desktop 1440×900 and narrow 390×844 placement/drag/results/edit/reset/mode checks; delayed move/threshold/reset/mode responses, catalogue/simulation failures and mismatched identities verified. No horizontal overflow; mobile popup stacking fixed.
- [x] Preserve MRT editor, route/weighted dashboard, calculated profile, no-key AI state and illustrative animation when switching modes. No Phase 5 algorithms or AI provider modules changed.
- [ ] Extend eldercare-specific citizen inspection/animation and Gemini/OpenRouter explanations only with justified trajectories and separately reviewed grounding. No invented eldercare trips or service-use conversations.

**Deliverable:** One functioning eldercare or active-ageing centre scenario with defensible accessibility metrics and a clear before/after comparison.

**Exit check:** Results are calculated, not generated as arbitrary forecast percentages. Actual service uptake or loneliness reduction is not asserted without a supported model.

**Phase 6C validation (28 October 2026):** **227 tests passed, zero failed** (205 retained + 22 new editor/geometry/dashboard/lifecycle regressions). All eight required commands—MRT validation/simulation, population generation/impact, eldercare preparation/simulation, tests and production build—passed, as did application/explicit eldercare/frontend-helper TypeScript and `git diff --check`. Run test/build preparation hooks sequentially on Windows; one repeated concurrent attempt hit a shared worker-copy lock and the sequential retry passed. Independent review defects in popup re-selection and nested API error handling were fixed; final review found no remaining concrete blocker. Actual API results reproduce 44,520 age-targeted weight, 6,230 comparable, 38,290 unlocated, 3,890 closer and 410.44→347.46 m mean distance, with zero new-within/percentage-point change at 500/1,000 m. Browser checks also confirmed unknown baseline/reduction when unconfirmed centres are excluded, optional assumed capacity/speed and age changes. No new live AI request was made; existing no-key behaviour and provider regression tests pass.

**Integration assessment:** The scoped placement-to-calculated-results AAC demonstration and its browser exit check are implemented and independently validated at the Phase 6C Git checkpoint. Full eldercare service modelling is not complete. The four-AAC catalogue is limited, with historical coordinates, unknown current opening/capacity, two assumed public landmark proxies and a large unlocated population. Unknown residents are not unaffected. The radius is not a walking catchment; capacity does not allocate services, and no health/attendance outcome is asserted. Phase 4's missing individual geographic trajectories remain unresolved. See `docs/PHASE6C_ELDERCARE_UI_IMPLEMENTATION.md` for architecture, evidence, browser screenshots and rebuild steps, alongside the existing Phase 6A/6B and integration reports. Terminal 3 independently revalidated the 227-test checkpoint, production browser workflows and raw/environment hashes, then checkpointed Phase 6C and synchronised the feature branch by fast-forward. See `docs/PHASE6C_INTEGRATION_CHECKPOINT.md`; final commit/branch hashes are recorded in the post-commit completion response. No push was performed.

### Phase 7 — Scenario-First Exploration and Parallel Demo Preparation

**Status: Phases 7A/7A.1/7B, internal-review 7C/7C.1, 7F/7G and the scoped 7D/7E workflow are implemented and integrated locally. Public-demo licensing, live retrieval, authorised live stakeholder LLM execution and reliability/rebuild/pitch preparation remain pending. Full Phase 7 is not complete.**

**Phase 7A — Implemented and validated: map-first scenario interface (Terminal 1, 28 October 2026)**

- [x] Live miniature Singapore landing page, approximately 75% map / 25% right composer at desktop; non-interactive gradient seam, existing HDB buildings visible from a geometry-supported Tiong Bahru opening camera. Mobile upper map and readable lower composer.
- [x] Four natural-language examples and chat-style question/interpretation using real `POST /api/scenarios/plan`; strict request and async response correlation/hash validation, actual provider/fallback notices and controlled errors.
- [x] Guided Question/Plan → Configure → Calculate → Results, advanced MRT timing disclosure, fresh proposal on explicit handoff, Back/resume and Start new scenario. Existing MRT/AAC workspaces, dashboards, profiles, optional AI and illustrative animation retained.
- [x] Clearly label unavailable, evidence-planning and planned exploratory-agent states; no implied Run action for unimplemented engines. Polyclinic cannot invoke AAC; ASEAN does not produce polling or executed stakeholders.
- [x] Responsive layout and token/revision/attempt checks invalidate plans after question, category or map-point edits, including A→B→A, supersession, mode/context/reset and corrupted identity responses. No plan ID is used as a calculation ID.
- [x] Map ownership retained across stages and catalogue loading. Landing/read-only results cannot edit MRT stations, including WebGL fallback; Configure restores the editable network after citizen/baseline views. Style readiness is tied to the loaded map instance.

**Phase 7A validation:** **266 tests passed, zero failed** (245 retained + 21 new client/lifecycle/presentation/React SSR tests). All six MRT/population/eldercare CLIs, application and strict helper/test TypeScript, Next production build and whitespace checks passed sequentially. Playwright exercised actual no-key planner → MRT map editing → journey → demographic dashboard/profile, and planner → AAC placement/demo → actual access metrics → drag/edit/rerun. Existing 360 s / 21.00-minute example and 180 illustrative citizens with play/pause/reset passed. Desktop 1440×900, wide 1920×1080, intermediate 1024×900 and narrow 390×844 had no horizontal overflow. Pan through the gradient and wheel zoom worked. Delayed/corrupted planner responses, back/resume, unsupported questions, safe text, controlled failures and forced-WebGL read-only fallback were checked. All 14 raw hashes match. No paid provider request or secret/environment change was made. See `docs/PHASE7A_SCENARIO_FIRST_UI_IMPLEMENTATION.md` for exact files, screenshots, checks and rebuild steps.

**Phase 7A limits:** The existing 23.53 MB / 13,436-footprint HDB source still loads asynchronously and uses illustrative 12 m heights; this is not Phase 7C building fidelity. Opening camera/loading changed, no geometry was invented. Composer map-point capture, a general conversation model, evidence retrieval and stakeholder execution are not implemented. The two validated calculation engines remain separate; no universal prediction or Phase 7E completion is claimed. Full Phase 4 calculated-population trajectories, Census/source/assumed-demand caveats and limited AAC proxies/unlocated coverage remain unchanged. Provider-assisted status rendering was fixture-checked; live Gemini/OpenRouter calls were not repeated.

**Phase 7A.1 — Implemented and validated: General workspace and universal point/line plotting (Terminal 1, 28 October 2026)**

- [x] General / Knowledge Graph navigation replaces permanent intervention tabs. Empty General shows question/drawing preparation, not a preloaded technical MRT scenario. Map and context remain mounted across tabs.
- [x] Explore enters General immediately while the real planner request runs; shared Fit Singapore bounds, queued camera commands, reduced-motion handling and persistent street-detail preference (initially on).
- [x] Strict independent geometry v1, stable user IDs, ordered lines, separate station dots, selection, edit-only dragging, numeric coordinate alternatives, labels/roles, point/vertex order/removal, bounded undo/redo, Finish/Cancel/Escape and reset.
- [x] Thin plotted-MRT adapter: explicit station order and actual catalogue anchor confirmation, proximity-only suggestions, acknowledged 300 s run / 30 s dwell / 150 s wait / 180 s walking assumptions, valid existing engine input and actual journey/demographic calculation. Advanced editor remains optional.
- [x] One confirmed plotted point feeds the existing AAC hook/request/session and actual API. One primary hypothetical marker, existing historical AAC markers/radius, geographic unknowns and source caveats retained. Unsupported polyclinic/policy drawings remain planning-only.
- [x] Monotonic geometry revisions, exact local keys, current-plan execution binding and existing request gates reject obsolete results. Tool/selection/graph changes retain valid calculations; geometry/assumption/question changes invalidate them. Cross-plan advanced drafts/history and pending anchor cancellation reviewed.
- [x] Honest Knowledge Graph destination and responsive component boundary; no fabricated entities, edges, GraphRAG or stakeholder execution.

**Phase 7A.1 validation:** **313 tests passed, zero failed** (all 266 retained plus 47 geometry/store/adapter/controller/camera/execution/SSR regressions). Six MRT/population/eldercare CLIs, application and strict module/test TypeScript, Next production build and whitespace checks passed sequentially. The ignored derived eldercare catalogue required a permission-correct retry after sandbox EPERM; preparation then passed. All 14 raw-input hashes match. No environment, dependency or engine-formula changes; no paid AI calls.

Real Playwright verified plot-first and question-first MRT proposals with three explicit dots and NS4/NE16 connections: **62.77 → 13.50 modelled minutes** under acknowledged illustrative seconds, followed by weighted demographic results/calculated profile. Direct map selection proposed NS16 for confirmation; searchable fallback also worked. Existing illustrative citizens drew 180 / 13 calls and the play clock advanced; these remain independent of calculated population paths. Plot edits/drag/undo cleared results, delayed MRT/AAC replies could not restore them, and planner edit/A→B→A/new-scenario/corrupt-token/hash cases were rejected. AAC at 1.287,103.824 reproduced **44,520 represented / 6,230 comparable / 38,290 unlocated / 3,890 closer**, **410.44→347.46 m**, and zero threshold gain. Moving it changed the fingerprint. Both plotted calculations worked at 390 px. All four requested widths (1920/1440/1024/390) had no document overflow; graph return kept plot/camera/run context; street preference survived navigation. Forced WebGL fallback allowed plotting and a real 20.00-minute advanced example, blocked online tiles retained local plotting, and controlled planner failure recovered. Final fresh unmocked page: zero console/page errors, one canvas, 317 rendered building features and working pan/zoom through the gradient. Independent re-review found no remaining concrete blocker. See `docs/PHASE7A1_GENERAL_MAP_PLOTTING_IMPLEMENTATION.md` for exact scope, screenshot references and rebuild sequence.

**Phase 7A.1 remaining limits:** Geometry is in-memory; no polygon, saved-project or general graph renderer. Route curvature does not determine times or snap dots into an engineered alignment. Uniform assumed link times need calibration/sensitivity work before decision use. Four historical AAC points/two proxies do not imply nationwide coverage, actual walking access, service uptake or health outcomes. Full Phase 4 calculated-population trajectories, original Census/source discrepancies and unknown/unassigned population remain unresolved. No Phase 7C/7D/7E/7G completion is claimed.

**Phase 7B — Implemented: scenario contract, capability registry and planning API**

- [x] Browser-safe version-1 contract, semantic/identity validation, detached capability registry and validated MRT/AAC/polyclinic/ASEAN fixtures.
- [x] `POST /api/scenarios/plan`, conservative no-key fallback and finite Gemini/OpenRouter interpretation using existing providers and the shared two-request AI gate.
- [x] Four capabilities: `mrt-accessibility-v1` (available), `aac-accessibility-v1` (available-limited), `stakeholder-exploration-v1` (planned), `evidence-exploration-v1` (planning-only).
- [x] Feature checkpoint `263ef96`: **245 tests passed, zero failed**, application/explicit TypeScript, production build and all six CLI regressions. Main integrates by fast-forward; combined verification is recorded in `docs/PHASE7B_INTEGRATION_CHECKPOINT.md`.
- [x] Every plan requires confirmation and remains `not-executed`; v1 cannot return `ready`. No automatic simulation, numerical prediction, evidence retrieval or executable stakeholder engine was added. Polyclinics cannot use AAC; ASEAN questions do not produce a poll.

**Phase 7C — Implemented: building-source audit, preparation and bounded MapLibre adapter**

- [x] Preserve supplied raw HDB and reviewed URA inputs, audit provenance/geometry/heights and compare source inventory with rendering. The historical 14,212-feature URA-only alternative remains distinct; it is not the current unified catalogue.
- [x] Integrate one viewport-aware adapter into Terminal 1's persistent map; retain explicit limited-HDB fallback, one active extrusion system, cancellation, source readiness, retry and disposal. Camera coordination and universal plotting retain their existing owners.

**Phase 7C.1 — Integrated and locally verified; public-demo clearance blocked**

- [x] Transfer the exact reviewed manifest and its 1,119 referenced chunks: **234,739 footprints**, **176,643,869 referenced bytes**, 339,308-byte manifest SHA-256 `5ab917ca747b51527868499c58ac6ecc21c82dd8897d3243ed9ff52ef0bfc32b`. No obsolete chunks or raw geometry were copied; audit sidecars, licence notice and stable receipts remain in ignored local paths.
- [x] Preserve 13,209 HDB / 1,912 URA / 219,618 Overture footprints; 2,392 direct-source heights, 20,610 estimates at an assumed 3 m per floor and 211,737 illustrative 12 m heights. Direct-source is not independently surveyed; no random heights or population allocation were added.
- [x] Full emitted-data validation, 19 isolated Python GIS tests and the integrated Node/TypeScript/build/CLI checks. Maintain whole footprints, the corrected candidate-union overlap rule and explicit residual-overlap audit; opaque shading does not prove geometry correctness.
- [x] Actual integrated 14-district fixed-camera sweep reached ready at zoom 15.65, pitch 52°, bearing -9°. Rendered tile features, distinct visible IDs, selected bounding-box features and complete inventory remain different scopes. Screenshots were independently inspected.
- [x] Replace obsolete HDB-only labels with source-aware status, always-visible source links, complete source/height/licence details and responsive controls. Preserve real MRT/AAC plotting, confirmations, stale-result handling, empty Knowledge Graph navigation and the separate illustrative citizens.
- [ ] Resolve combined SODL/ODbL compatibility, HDB acquisition provenance and publication obligations **before any public demonstration, hosting or redistribution**, including presentations served from localhost. Manifest remains `local-review-only`; loopback guard remains enforced. A fallback requires its own licence/provenance review.

See `docs/PHASE7A1_7C1_INTEGRATION_CHECKPOINT.md` for actual final results, failure/recovery boundaries, ignored assets, screenshots, preserved inputs and the proposed Git scope. This is an uncommitted local integration, not a Git merge or public-release approval.

**Phase 7D — Integrated and locally verified: interactive fictional stakeholder experiments**

- [x] Strict immutable scenario/evidence/role/run contracts, genuine sequential turns with bounded participant memory, and an explicitly scripted deterministic mode. No public-opinion, GDP, employment or diplomatic prediction is implied.
- [x] Replayable event inspection, assumption changes, completed-run comparison, validated JSON history and a separately labelled synthetic Knowledge Graph projection. Existing MRT/AAC calculations and Phase 7F/7G ownership are preserved.
- [x] A narrow independent Phase 7E snapshot/evidence converter; no uncommitted Terminal 1 imports. Live provider calls remain unauthorised; optional LLM execution is mock-tested and fails explicitly when unavailable.
- [x] Actual development/production browser interaction, cancellation/delayed-response guards, four viewports, complete regressions/types/build and independent review verified the local slice. The production run graph retains the existing three-level inspector; no provider call or retrieval is implied.

Terminal 2 starts this phase from clean `6c6fb831f72b79e47776417096997c5862fefee9`. Implementation, exact exports and final evidence are recorded in `docs/PHASE7D_MULTI_AGENT_STAKEHOLDER_SIMULATION_IMPLEMENTATION.md`, `docs/PHASE7D_TERMINAL3_INTEGRATION_GUIDE.md` and `docs/PHASE7D_PHASE7E_COMPATIBILITY.md`. The original independent converter is retained for compatibility; the integrated application uses the actual validated Phase 7E bridge. The planner itself still does not execute simulations.

Final Phase 7D checks: **435 Node tests passed, zero failures; 19 GIS tests passed**. All six MRT/population/eldercare CLIs, application and strict stakeholder/server/API/test TypeScript and production build passed sequentially. Actual production immediate/unresolved and negotiated/replacement runs each recorded 18 turns with different fingerprints; replay, comparison, a 27-node/123-edge synthetic graph and General/Graph navigation passed. Four requested viewports had no horizontal overflow; a fresh session had zero page/console errors and one MapLibre map. Review findings were corrected with no remaining blockers. No live paid calls, credentials read, raw/model changes or Git mutations occurred; the public LLM mode remains explicitly unavailable. Those were the standalone results. The combined Phase 7D/7E checkpoint below now verifies the real saved-experiment execution path; no real-world forecast is claimed.

**Phase 7E - Integrated and locally verified: Evidence-Grounded Scenario Experiment Lab (28 October 2026)**

- [x] General-integrated Configure / Evidence / Snapshots / Compare workflow, retaining the persistent map, plotting and actual MRT/AAC dashboards.
- [x] Typed ASEAN immediate/negotiated/custom withdrawal, unresolved/hypothetical trade arrangements, 1/5/10-year horizon, stakeholder focus and notes. Default: immediate / unresolved / five years. All assumptions remain hypothetical.
- [x] Polyclinic planning site/scope, generic focus/hypotheses/named assumptions, and actual MRT/AAC plan/drawing references. Engine snapshots are references only, not complete replayable calculator inputs.
- [x] Strict version-1 experiment/evidence contracts, complete SHA-256 identities, detached frozen records, bounded browser persistence and validated JSON export/import. Archives remain separate from active calculations; restoration requires explicit action.
- [x] Working bounded `/api/evidence/research` **verified replay** of two checked official-source excerpts. No live search or paid provider calls. ASEAN source access was search-index verification with direct HTTP 403; trade-page update date/source redirect limitations remain visible. Other topics have explicit empty evidence gaps.
- [x] Field-level assumption and evidence comparison, including missing evidence, shared/different sources/findings/gaps and verification freshness. No invented economic, diplomatic, health or stakeholder outcomes.
- [x] Read-only `ScenarioExperimentInputV1` and asynchronous validator, complete JSON fixtures/specification and independent Terminal 3 handoff. Saved execution remains `not-executed`; the integrated executor produces a separate validated linked run.
- [x] Existing Knowledge Graph projection for assumptions/sources/findings/gaps; standalone archive scope, source provenance and all three inspector levels. No second map/graph renderer or causal implication.
- [x] Cancellation, retry, A ? B ? A, geometry/configuration edits, reset, hydration/persistence ordering and disposal safeguards. Independent review findings fixed with focused regressions.

**Standalone Phase 7E validation:** **457 Node tests passed, zero failed/skipped** (396 retained + 61 new), **19 GIS tests**, six CLIs, application and strict module/test TypeScript, production build and diff check passed sequentially. Real Playwright verified ASEAN A/B snapshots, source inspection, comparison, JSON export/import/refresh/restore, archive graph (22 nodes / 24 edges / 2 sources / 0 results), controlled failures/recovery, delayed-response rejection, polyclinic/generic inputs and actual MRT/AAC/demographic regression. Pedestrian roots still displaced 4.936 m over a five-second observation with exact Pause/Reset. Four requested viewport widths had no horizontal overflow; fresh isolated context had zero page/console errors, one map, one citizen layer and visible buildings. All 14 tracked raw inputs match HEAD; unified building manifest hash and local-review restrictions are unchanged. No credentials, source datasets, engine formulas, dependencies or other worktree files changed. No stage/commit/push/deployment occurred.

**Combined Phase 7D/7E checkpoint:** **521 Node tests passed, zero failures/skips**, **19 GIS tests**, all six existing model CLIs, application and strict module/route/test TypeScript, production build and whitespace checks passed. Real production Playwright completed immediate/unresolved Experiment A and negotiated/replacement Experiment B, two separate 18-turn scripted runs, actual source/event references, immutable input linkage, scenario/run comparison, linked JSON export/import, archived run graphs (52 nodes; 250/246 edges; two original sources and six fictional roles), all three inspector levels, cancellation/delayed-response rejection, corrupt/immutable-ID import rejection and recovery. Four requested viewports fit without horizontal overflow. A fresh production context had zero page/console errors and one map. Existing real MRT, weighted demographic/profile/no-key dashboard, AAC and geographic pedestrian Play/Pause/Reset regressions passed. Changes remain unstaged/uncommitted at `6c6fb83`; see `docs/PHASE7D_7E_INTEGRATION_CHECKPOINT.md` for exact inventory and later approval-only Git procedure.

**Phase 7D/7E limits / next:** Replay remains small and historical, not live retrieval or comprehensive research. Stakeholder turns are deterministic scripted fictional exploration; public live LLM execution remains disabled. Only explicitly supported ASEAN inputs cross the current bridge; custom/continuity assumptions reject safely. MRT/AAC notebook references are not full replayable engine inputs. No economic/public-opinion forecast, signed evidence, cross-device/multi-tab transactional persistence or GraphRAG retrieval is claimed. The existing planner remains planning-only for this question; the user separately chooses a saved snapshot for execution. Preserve Phase 4 calculated-population trajectory limits, Census/assumed-demand caveats, limited AAC proxies/unlocated residents and internal-only building licensing. Full Phase 7 remains incomplete.

**Phase 7F — Integrated and locally verified: illustrative geographic pedestrians (28 October 2026)**

- [x] Reproduced original grid/scale/pacing issues before editing: 180 actors in one Ang Mo Kio grid, ~9.7 m displayed height, one-shot paths and only 1.783 m selected-root displacement after a five-second wait. Root transforms and repainting were functional; low-FPS clock clamping was separately reproduced.
- [x] Deterministic independent visual pool across Tiong Bahru, Sengkang, Tampines, Downtown and Ang Mo Kio: 36 actors per area, ten authored short closed loops, 0.95–1.55 m/s illustrative speeds and minimum 3.47 m initial separation. Local land/footprint-clearance regression actually ran; no verified pavement/home/behaviour claim.
- [x] Absolute-time path sampling, closed-loop continuity, geographic facing, distance-based gait cadence, exact Pause/Reset, visibility/navigation pause and frame-rate independence. Imported payload positions remain supplied data; local looping is explicit demo opt-in only. Exported demo waypoints start at each declared actor position.
- [x] Faceted human proportions, opposing jointed limbs, subtle body dip, grounded shoes, muted ID-based variation and 2.63–2.80 m documented display height. One existing custom layer/clock; 18 instanced body batches plus selected ring. Cached inputs/resources and bounded viewport drawing; no second renderer loop.
- [x] Existing inspector/list retained, with visual-area focus, selected-coordinate disclosure, optional schematic path and touch-friendly playback. Map selection does not add plotting points. Baseline/Scenario motion is identical and independent of calculated MRT/AAC outcomes.
- [x] Style detach/reattach and selected-path restoration, pending option reconciliation, hide/show, reduced motion, disabled WebGL playback and existing SVG fallback validated. No source/licence declaration, building extraction, engine, weight, citizen contract or other-worktree changes.

**Phase 7F validation:** **368 Node tests passed, zero failed, zero skipped** (343 retained + 25 new). All six MRT/population/eldercare CLI checks, application and strict citizen-module/test TypeScript, Next production build and whitespace checks passed sequentially. The derived eldercare catalogue needed its known permission-correct retry. The existing unified manifest remained valid at **1,119 chunks / 234,739 features / local-review-only**; preservation hashes for 14 original inputs, three local geography outputs, unified manifest and private environment file matched. No Overture extraction, dependency installation, paid AI call, staging, commit or push occurred.

Real Playwright observed ~4.89–5.34 m selected rendered-root displacement after five-second waits, exact sampled matrix Pause/Reset, directional turning and geographic stability through pan/zoom/bearing/pitch. Five areas showed 36 drawn actors after building readiness. Four requested viewports had no document overflow; brief 36-actor / 19-draw cadence samples were ~39.5–49.0 frames/s, with no sustained benchmark claim. Actual pick selected actor126, graph navigation held the exact clock, full style replacement retained one owner/path, rapid controls and reduced motion worked, and forced source/WebGL failures retained appropriate fallbacks. Real plotted MRT remained **62.77→13.50 minutes** with the same impact run after animation; AAC retained **6,230 comparable / 38,290 unlocated** and **410.44→347.46 m**. Final fresh unmocked session: zero console/page errors, one canvas/layer/active scene, buildings visible and attribution readable. Independent review findings were fixed/re-reviewed. See `docs/PHASE7F_CITIZEN_VISUALS_MOVEMENT_IMPLEMENTATION.md` for evidence, limitations and rebuild steps.

**Phase 7F limits / next work:** This completes the scoped illustrative animation, not true Census-derived trajectories or observed daily behaviour. Only five authored areas are populated. Paths are schematic loops, not verified crossings or a pedestrian network; there is no collision avoidance, terrain model or calibrated demand response. Picking does not test building occlusion, and long-duration/GPU-context-loss/300-visible-actor benchmarks remain unperformed. Preserve full Phase 4's geographic-trajectory gap and all Census/AAC unknown-population limitations. Phase 7G is now integrated, with calculated graph outcomes kept separate from visual actors. Source/licence clearance remains necessary before public building demonstrations.

**Phase 7G — Integrated and locally verified: source-backed interactive Knowledge Graph**

- [x] Existing General/Knowledge Graph navigation retains current question, drawings and valid calculations.
- [x] Browser-safe bounded graph contract and deterministic MRT/AAC/planning-only adapters; source data, assumptions, user inputs and calculated lineage remain distinct. Duplicate/orphaned/unsafe/oversized data is rejected.
- [x] Cytoscape network renderer, settled force layout, search/category filters, neighbour/relationship inspection and compact → expanded → full-window details. Inspectors/tab changes preserve valid layout/camera; the existing map stays mounted.
- [x] Current scenario/execution bindings, keyboard/responsive interaction, delayed-response/edit/reset invalidation and independent review. Isolated Terminal 2 validation passed 371 Node / 19 GIS tests. The combined main checkpoint passes **396 Node / 19 GIS tests**, all six model CLIs, app/strict TypeScript, production build and whitespace checks, with actual production-browser acceptance for both phases.

Real graph evidence includes MRT inputs 211 nodes / 642 edges with zero result nodes, MRT journey results 219 / 657, actual weighted results 250 / 688 and limited AAC results 64 / 66. Polyclinic/ASEAN routes remain planning-only. Four requested viewports fit without horizontal overflow; three-level inspection/focus preservation, search/filter/pan/zoom and production safe-text/reset/related-node checks pass. The diagnostic 500-node fixture is performance-only and takes about four seconds to arrange; no thousand-node or sustained memory/FPS claim is made. Unsubmitted General-panel timing/order state is not exported; full confirmed engine-draft values appear after submission or a current advanced binding.

At the historical Phase 7F/7G checkpoint, no document-retrieval GraphRAG or stakeholder executor was implemented. The later Phase 7D/7E integration is recorded above. Exact exports, measured acceptance, limitations and coordinated workspace changes are recorded in `docs/PHASE7G_INTERACTIVE_KNOWLEDGE_GRAPH_IMPLEMENTATION.md` and `docs/PHASE7G_TERMINAL3_INTEGRATION_GUIDE.md`. The combined main application passes 396 tests plus 19 GIS tests. Both implementations are reconciled and browser-verified together; changes remain unstaged/uncommitted at `3b6e8c0`. The combined report records the identity and rerun fixes.

**Parallel preparation — demo reliability, competition rebuild and pitch (original planned stage retained)**

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
- **Generative UI:** Configured Gemini or OpenRouter returns **validated finite configuration/evidence references**, not executable UI or new numerical claims; predefined charts and factual templates render its choices.
- **Security:** API keys remain server-side and out of source control.
- **Integrity:** Every impact metric includes provenance and whether it is observed, calculated or scenario-assumed.

## 7. Phase Handoffs and Documents

| Phase | Suggested documentation |
|---|---|
| 0 | `docs/DATA_VALIDATION_REPORT.md`, `docs/DATA_SOURCES.md` |
| 1 | `docs/MRT_GRAPH_VALIDATION.md` |
| 2 | `docs/MRT_HYPOTHETICAL_LINE_SIMULATION.md` (implemented prototype spec, results and tests); optional later split into `docs/MRT_INTERVENTION_SPEC.md` and `docs/MRT_SIMULATION_TESTS.md` |
| 3 | `docs/INTERACTIVE_MAP_IMPLEMENTATION.md`, `docs/MAP_GEODATA_NOTES.md`; optional later `docs/MAP_UI_SPEC.md` |
| 4 | `docs/SYNTHETIC_POPULATION_IMPLEMENTATION.md` (4A); `docs/CITIZEN_SIMULATION_CONTRACT.md` (interface); `docs/ANIMATED_CITIZENS_IMPLEMENTATION.md` (4B); `docs/DEMOGRAPHIC_IMPACT_SIMULATION.md` (4C); `docs/PHASE4_FULL_INTEGRATION.md` (browser/API integration) |
| 5 | `docs/PHASE5_DASHBOARD_AI_IMPLEMENTATION.md` (implemented dashboard/provider/schema/chat guide); optional future metric/sensitivity deep dives |
| 6 | `docs/ELDERCARE_ACCESSIBILITY_ENGINE.md` (6A), `docs/ELDERCARE_API_INTEGRATION.md` (6B), `docs/PHASE5_PHASE6_BACKEND_INTEGRATION.md` (integration), `docs/PHASE6C_ELDERCARE_UI_IMPLEMENTATION.md` (interactive AAC/browser/rebuild guide) |
| 7 | `docs/PHASE7A_SCENARIO_FIRST_UI_IMPLEMENTATION.md`, `docs/PHASE7A1_GENERAL_MAP_PLOTTING_IMPLEMENTATION.md`, `docs/PHASE7F_CITIZEN_VISUALS_MOVEMENT_IMPLEMENTATION.md`, `docs/PHASE7G_INTERACTIVE_KNOWLEDGE_GRAPH_IMPLEMENTATION.md`, `docs/PHASE7G_TERMINAL3_INTEGRATION_GUIDE.md`, `docs/PHASE7F_7G_INTEGRATION_CHECKPOINT.md`, `docs/PHASE7D_7E_INTEGRATION_CHECKPOINT.md`, `docs/PHASE7E_EXPERIMENT_INPUT_CONTRACT.md`, `docs/PHASE7E_TERMINAL3_INTEGRATION_GUIDE.md`, `docs/PHASE7D_TERMINAL3_INTEGRATION_GUIDE.md`, `docs/SCENARIO_PLAN_CONTRACT.md`, `docs/PHASE7B_SCENARIO_PLANNER_IMPLEMENTATION.md`, `docs/PHASE7B_INTEGRATION_CHECKPOINT.md`; planned reliability artifacts: `docs/HACKATHON_REBUILD_GUIDE.md`, `docs/PITCH_SCRIPT.md` |

## 8. Immediate Next Action

Review the uncommitted dynamic scenario-generation slice on main `master`, starting at `e466f16cfdbd630a6ff3037d39ff67b13f5e2fba`. The primary UI now uses AI planning rather than the three-preset gate, with a mock-validated question ? generated roles ? action engine ? graph/report pathway. See `docs/DYNAMIC_SCENARIO_GENERATION.md` for contracts, exact paths, results and limitations. No stage/commit/push or deployment is authorised.

The separately authorised dynamic live acceptance is complete: real workweek and cross-border Malaysia water-export runs each generated four roles and eight accepted actions, with graph/report inspection. See `docs/DYNAMIC_SCENARIO_LIVE_ACCEPTANCE.md`. No further paid check is needed for this acceptance; later tests require their own authorisation. Keep the reliability/rebuild/pitch track and all geographic, scientific and local-review building restrictions. This is not a universal predictive engine or a population-grounded swarm.


## Phase 7H ? Question-first simulation UX (Terminal 1)

Implemented locally against `2900d0b77e54c5236da9a811181eec7117d14ea8`, unstaged/uncommitted for Terminal 3 review. One question and Start automatically prepare validated scope/evidence/immutable inputs and run the existing narrow Singapore-ASEAN fictional script. Simulation / Map / Knowledge Graph / Report navigation retains existing map, calculators, demographics, graph and diagnostic tools. MRT/AAC still require explicit valid geographic confirmations. Unsupported questions show Not simulated; local questions omit unrelated international sections. Scope is heuristic, candidate types are not extracted world entities, and no live inference or swarm engine is activated.

Validation: 548 Node tests and 19 GIS tests pass; all six CLIs, TypeScript, build and whitespace checks pass. Browser verified 18 ASEAN events, cross-border unsupported import-tax reporting, local polyclinic preparation, real confirmed MRT 62.77?13.50 minutes, real AAC comparable/unlocated metrics, cancellation, graph/report navigation and four viewport widths without horizontal overflow. Exact Tampines facility wording is classified local after a browser-discovered correction. See `docs/PHASE7H_QUESTION_FIRST_UX_IMPLEMENTATION.md` for limits and `docs/PHASE7H_TERMINAL3_INTEGRATION_GUIDE.md` for paths/contracts.

The paragraph above records standalone 7H results. Its original reference to a Phase 7I handoff is superseded by the actual **7H + 7J** integration below; Phase 7I is not implemented. Preserve all historical Phase 4 geographic-trajectory, AAC proxy/unlocated/capacity, Census/demand and internal-only building-licence restrictions. No staging, commit, branch synchronisation, push or public deployment is authorised.

## Phase 7H + 7J — Original integrated checkpoint (live follow-up below)

- [x] One question and Start select a narrow supported live pathway; no mandatory research/configuration/save/mode forms. Explicitly labelled ASEAN scripted demonstration remains separate; live failure never silently substitutes scripted output.
- [x] Explicit intent-to-domain mapping for Singapore ASEAN withdrawal, clear hypothetical import-goods tax and confirmed MRT proposals. Scope alone selects no preset. AAC retains its native calculator; unsupported polyclinic/housing/unrelated-tax questions remain Not simulated.
- [x] Existing V1 contract and strict browser-safe V2 input/response/attempt/run/serving-metadata validation; immutable experiment linkage, bounded partial/failure accounting, cancellation, retries with new attempt IDs and current/archive separation.
- [x] Server-only DeepSeek V4 Flash 0731 via OpenRouter, DigitalOcean-only provider routing, fallback disabled. Read-only status distinguishes configured/enabled from verified serving identity. Actual usage and nullable cost remain separate from synthetic societal content; the soft cost threshold is not a prepaid guarantee.
- [x] Existing graph/report views consume actual accepted fictional roles/events and historical replay references. Recorded LLM interactions and deterministic scripts have distinct labels. Native MRT/AAC outputs remain authoritative and separate from dialogue; illustrative pedestrians/buildings retain their own ownership and limitations.
- [x] **607 Node tests passed, zero failures/skips; 19 GIS tests; six CLIs; application/strict TypeScript; production build; credential and whitespace checks.** Actual production Playwright used network-blocked individual OpenRouter completion mocks: ASEAN 8 events / 40 nodes / 132 edges, import-tax 8 events / 27 nodes / 80 edges, native MRT 62.77→13.50 minutes, AAC 44,520 targeted / 6,230 comparable / 38,290 unlocated, weighted demographics/profiles, pedestrian movement, partial/failure/cancel/race cases and four viewport sizes. No unexpected errors in the final fresh context.
- [x] Separately authorised bounded paid DigitalOcean verification completed on 29 October 2026; see the live follow-up below. The original checkpoint above used mocks and remains a historical record, not live-provider evidence.
- [ ] Phase 7I source-verified world entities, demographic-grounded swarm, live retrieval, GraphRAG and full AI reporting remain future work. No public-opinion, economic, healthcare or diplomatic forecast is validated.

Full results, original 14/12-path inventories, verified external recovery snapshots and the final **40-path unstaged** allowlist are in `docs/PHASE7H_7J_INTEGRATION_CHECKPOINT.md`. Both source worktrees remain unchanged. Internal local-review building licensing and all previous source/model limitations are preserved. The original reliability/rebuild/pitch track remains pending; full Phase 7 is not complete.


## DeepSeek structured-action diagnostics ? 29 October 2026

Traced the generic UI rejection through transport, live service, engine and validators. Confirmed diagnostic category collapse, not a recoverable cause for the historical live incident: no failed execution envelope was available in connected tabs/inspected artifacts. Added finite safe categories for action JSON, schema, references, semantics, incomplete output and gateway envelope; retained fail-closed DigitalOcean/model verification, strict validation, partial accepted history, bounds and no retries. No paid call or speculative action repair. Focused 32 tests and full 611 Node tests pass, with TypeScript/build verification recorded in `docs/DEEPSEEK_ACTION_DIAGNOSTICS.md` and the completion response. Existing trajectory, source/licence and live-behaviour verification limitations remain. No stage/commit/push; a separately authorised live verification or safe existing reproduction is needed to identify the original provider-specific failure.

## DeepSeek / DigitalOcean ? authorised live repair and acceptance, 29 October 2026

- [x] Reproduced HTTP 200 `length` / native `length`: all 800 output tokens were reasoning and no action content existed. Explicit `reasoning.effort: none` fixes this without raising the 800-token application output cap.
- [x] Context-specific strict schema constrains actual role/event/finding/assumption references. Strict local schema, reference, qualitative-content and serving-identity validation remains authoritative; invalid actions stay rejected.
- [x] Fixed independently observed local reservation and prompt-growth stops: bounded 214,400 cumulative reservation, compact transmission with complete original snapshots/history retained. Default per-call deadline 15?30 seconds after a real timeout; whole-run 120-second bound, four agents/two rounds/eight calls and soft USD 0.05 run limit remain. No fallback or automatic retry.
- [x] Real import-tax and ASEAN question-first browser runs each complete eight LLM-generated actions with four roles, accepted earlier-event references and bounded memory. Final import graph: 27 nodes/84 edges/12 event references; ASEAN: 40/150/16, with two historical source replays. Report and three-level graph inspectors work. Explicit scripted ASEAN remains separate (18 real V1 scripted events in controlled browser regression).
- [x] Safe optional termination diagnostics, strict legacy-record compatibility, timeout/rate/partial handling and no private provider-body logging. Desktop/mobile report/navigation at four sizes has no horizontal overflow; one map and one registered citizen layer remain. Controlled mocked cancellation and A?B?A reject stale events; final console/page errors absent.
- [x] **618 Node tests; 61 focused; 19 GIS; six model CLIs; application/strict TypeScript; production build; whitespace check pass.** No credentials/raw inputs/formulas/secondary-worktree changes or Git mutations. Prior `next-env.d.ts` changes are preserved.
- Paid ledger: **60 attempts**, known reported USD **0.0178270806**; two unreported charges conservatively reserved at USD 0.05 each; cumulative accounted USD **0.1178270806** of the authorised USD 2. One semantic rejection, a transient HTTP 429 and a timeout were retained honestly; final complete runs do not imply every future stochastic output will validate. No further paid test is needed for this repair.
- [ ] Future world entities, live evidence retrieval, demographic-grounded swarm behaviour and valid economic/diplomatic prediction remain unimplemented/unvalidated. Historical Phase 4 trajectory, AAC unlocated/proxy/capacity and local-review-only building restrictions remain. Full Phase 7 is not complete.

Details: `docs/DEEPSEEK_ACTION_DIAGNOSTICS.md` and `docs/DEEPSEEK_LIVE_PROVIDER_ACCEPTANCE.md`. Leave the entire correction unstaged/uncommitted for user review.

## Dynamic AI scenario generation ? implemented and mock-validated, 29 October 2026

- [x] Primary Start uses one server-only generated plan for arbitrary reasonable questions, without preset-topic matching, mandatory forms or manual experiment saving. Old registered/scripted paths remain explicit compatibility mechanisms.
- [x] Strict versioned generated-plan manifest; exact user-question/geometry identities, four fictional profiles, connected proposed opportunities, model-proposed assumptions, unknowns and unverified entity suggestions. Stakeholder input v2 binds profiles to this plan; legacy v1 still requires unchanged catalogue roles. Public legacy execution endpoints cannot bypass server planning with client-generated manifests.
- [x] Existing DeepSeek/OpenRouter/DigitalOcean-only route, no reasoning, serving-identity verification and action validators shared intact. One planner call plus at most eight action completions; original action caps/memory, combined deadline and planning-aware soft cost check. No automatic script or provider fallback.
- [x] Generic profiles, actual accepted-event lineage, proposed-versus-recorded relationships, source gaps and scoped reports are visible in existing Simulation/Map/Knowledge Graph/Report views. Native MRT/AAC confirmation/formulas stay separate. User-authored polyclinic coordinates remain hypothetical and never invoke an AAC health-access substitute.
- [x] Mock HTTP and actual production-browser acceptance for workweek, Malaysia water exports and basic income: four different relevant roles, eight accepted events, graph/report. All five requested scenario categories have mocked transport-to-engine/projection tests. Desktop/mobile and three-level graph inspectors work; one map remains. Delayed-response cancellation and A?B?A are guarded.
- [x] **644 Node tests pass**, including the 618 baseline and 26 new cases; application/strict TypeScript, production build, all six existing model CLIs and whitespace check pass. Optional GIS loader cannot import missing Shapely in main's Python; no GIS algorithm/data changed or dependency installed. The unused secondary worktree was not accessed.
- [x] Separately authorised real dynamic acceptance: exact DeepSeek/DigitalOcean, one validated plan plus eight genuine actions for both workweek and cross-border Malaysia water exports; UBI planning-only also passed. Full graph/report and four-width browser checks passed. See the live acceptance report for initial semantic/scope failures, corrections and remaining unverified model content.
- [ ] Verified entity resolution/evidence retrieval and cached numerical-output ingestion into planning remain future adapters. Current new plans use an empty verified evidence registry; actual native numerical results remain separately presented. No population-scale swarm, real individual journeys, economic/health/public-opinion forecast or full Phase 7 completion is claimed. Existing Phase 4 trajectory and building/AAC licensing/proxy/unlocated/capacity limits remain.

Implementation note: `docs/DYNAMIC_SCENARIO_GENERATION.md`. Leave all changes unstaged and uncommitted for review; preserve credentials and raw source bytes.

## Dynamic scenario live follow-up ? 29 October 2026

- [x] Confirmed actual planner structured-output compatibility at the unchanged 3,000-token / 24 KB JSON cap; actions remain 800 tokens, reasoning none, DigitalOcean-only and serving identity verified.
- [x] Question-first workweek and corrected cross-border Malaysia water-export browser runs each completed four generated roles, two rounds and eight accepted actions. Actual earlier-event references and bounded memories were retained; graphs had 12 and 16 event-reference edges respectively. Source registry remains empty; model entities and dialogue remain unverified/synthetic. UBI passed planning-only after one timeout.
- [x] Focused generation fixes for affected roles, ID namespaces, unsupported quantities, finite role-reference slots and local-scope contradictions. Later actions receive explicit other-participant IDs. Archived contract interpretation remains compatible; current completed runs survive history inspection while pending work still cancels safely.
- [x] Final **653 Node tests + two no-network guard tests**, application/strict TypeScript, production build, six model CLIs and whitespace check pass. Four report viewport widths have no horizontal overflow; mobile three-level graph inspectors work. Final archive recovery used explicit mocks and no additional paid request. Optional GIS fails to load missing Shapely in main Python; no GIS pass or dependency installation is claimed.
- [x] New-task **49 paid attempts**; known reported USD **0.0171181024**, unknown charge reserved USD **0.02**, cumulative conservative accounting **USD 0.0371181024 / 0.50**. Historical ledger/private environment unchanged. No Git staging/commit/push, secondary-directory access or deployment.
- [ ] Verified entity/evidence resolution, factual/legal validation, population-grounded behaviour, scenario-responsive trajectories and quantitative policy forecasting remain future work. Preserve Phase 4 trajectory, AAC proxy/unlocated/capacity and internal-local-review building restrictions.

Evidence, exact files, safe ledger/screenshot references, reproduced failures and rebuild commands: `docs/DYNAMIC_SCENARIO_LIVE_ACCEPTANCE.md`.

## Map-first UI simplification ? 29 October 2026

- [x] Root opens directly on Map. Primary navigation is Map / Knowledge Graph / Report; landing and Simulation surfaces, redundant setup/demo controls and top-level Experiment Lab buttons are removed from the normal journey. Existing engines, records and contracts remain.
- [x] One question plus Plot Tools / Explore. Plotting controls start hidden, preserve exact geometry on dismissal and resume pending strokes. Ordinary coordinate values/manual entry are removed; map dragging, station anchors and model confirmations remain.
- [x] Explore runs the unchanged dynamic pipeline while staying on Map. Current-result links require matching question, geometry and revision; partial runs are labelled separately. Graph/report/history navigation preserves the single map and makes no inference request.
- [x] Compact visible source credits plus one Sources & licences dialog replace duplicate attribution; OSM/SODL/source links and local-review restrictions remain. Native zoom/compass and illustrative pedestrian controls are hidden; gestures, Fit Singapore, 2D/3D and data remain.
- [x] **669 Node tests**, application/strict TypeScript, production build, six model CLIs and whitespace checks pass. Mocked production-browser flow, delay/cancel/A?B?A recovery, real MRT/AAC calculations, fresh touch placement and four viewport sizes pass. GIS could not load missing Shapely; no GIS pass claimed. No paid inference.
- [x] Browser/review fixes include CSS cascade isolation, non-overlapping native editors/results, advanced MRT provenance rebinding and plotting-toolbar clearance above attribution.
- [ ] Existing geographic, source/licence, proxy/unlocated, synthetic dialogue and forecasting limits remain. No new entity verification, population-grounded trajectories or predictive policy model is claimed.

See `docs/MAP_FIRST_UI_UX_REFACTOR.md` for exact paths, attribution review, browser evidence and reproduction. Changes remain unstaged/uncommitted on main at baseline `c8148c5`; the unused secondary directory is untouched.
