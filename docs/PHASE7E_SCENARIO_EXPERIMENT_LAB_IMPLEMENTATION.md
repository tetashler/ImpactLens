# Phase 7E — Evidence-grounded Scenario Experiment Lab

Implemented on Terminal 1's main `master` worktree, starting at `6c6fb831f72b79e47776417096997c5862fefee9`. Changes remain unstaged and uncommitted. This is an internal pre-hackathon learning prototype, not an economic forecasting system.

## Working product journey

Ask **“What if Singapore left ASEAN?”** in the existing composer. The real planner remains planning-only and opens the lab in General. Configure immediate withdrawal, unresolved trade arrangements and a five-year horizon. Inspect the checked-source replay, save Experiment A, change timing and trade assumptions, prepare another replay and save B. Compare actual changed/unchanged fields, source support, gaps and verification dates. No stakeholder outcomes are generated.

The lab has Configure, Evidence, Snapshots and Compare sections. The existing map stays mounted. A wider research inspector replaces only the General inspector while open; mobile stacks the existing map and lab. Back to map setup restores the plotting/calculation controls. Changing questions returns the lab to Configure. General/Knowledge Graph navigation preserves the active draft and saved records.

ASEAN controls cover immediate/negotiated/custom withdrawal (custom 1–120 months), unresolved/hypothetical-continuity/hypothetical-replacement arrangements, 1/5/10 years, three stakeholder research categories and bounded notes. These choices assert no legal feasibility or treaty continuity. Other configurations support a user-selected polyclinic location and service scope, MRT/AAC actual plan/drawing references, or generic research focus, hypotheses and named assumptions. All visible controls affect the validated snapshot or a labelled future input. They are not forecasting sliders.

## Architecture and contracts

- `components/use-experiment-lab.ts` owns one external-store controller for the mounted workspace. `components/experiment-lab.tsx` presents its state; it does not calculate effects.
- `lib/experiments/configuration.ts`, `identity.ts`, `contract.ts` and `geometry-references.ts` validate the typed union, full identities, immutable record and actual plot references.
- `client.ts` owns research attempts, configuration changes, session archives and ordered browser-storage writes. `comparison.ts` compares meaningful fields and source/finding/gap content. `persistence.ts` validates the JSON registry.
- `lib/evidence/` contains browser-safe schemas, exact verified replay metadata, support checks and the deterministic replay factory. The Node route delegates to `lib/server/evidence/service.ts`.
- `lib/experiments/graph.ts` projects into the existing Knowledge Graph. No second graph or map is created.

See [the contract reference](PHASE7E_EXPERIMENT_INPUT_CONTRACT.md) for the complete fields, bounds and API. All asynchronous import/storage/handoff boundaries recompute SHA-256 identities; synchronous parsers alone are not hash verification. Snapshots are detached and recursively frozen. Unsupported versions, unknown fields, accessors/prototypes, invalid coordinates/dates, duplicate IDs and excessive payloads are rejected.

Identity scopes are separate: question + actual geographic content define the scenario; assumptions define the configuration fingerprint; a UUID identifies each immutable record; each replay has a new research attempt; evidence content has its own snapshot identity; the future input has a separate complete execution-input identity. Timestamps, display labels and record IDs are not execution authority. Hashes detect content changes; they are not signatures or source attestations.

## Evidence acquisition and honesty

`POST /api/evidence/research` is a **working offline replay path**, not a live search service. Each request validates a bounded question/topic and returns a freshly correlated envelope around previously checked excerpts. No paid provider, AI call, arbitrary URL fetch or new dependency is involved. Existing Gemini/OpenRouter configuration and endpoints remain unchanged. No credentials are read by this subsystem.

The initial reference set contains two narrow official-source excerpts checked on **28 October 2026**: [ASEAN Summit](https://asean.org/about-asean/asean-summit/) and Singapore's [official FTA page](https://www.meti.gov.sg/trade-international-economic-relations/agreements/free-trade-agreements-fta/). ASEAN direct automated access returned HTTP 403; the excerpt was checked against indexed content of the official page, not a successful full-page fetch. The trade page opened successfully at METI after the historical MTI redirect; its displayed 21 August 2026 date is an update date, not claimed first publication. These caveats travel with every replay. See [source verification notes](../lib/evidence/SOURCES.md).

Each source retains its exact HTTPS URL, publisher, title, document type, publication/update date or null, verification date, actual acquisition status and a short excerpt. Each finding references a real source and matching support. Direct factual statements are restricted to the checked registry. Finite classifications also distinguish reported estimates, inferences, assumptions and unresolved questions; this replay emits only the two checked direct statements. The UI renders text and links, never source HTML.

ASEAN bundles are **partial**. They do not establish a withdrawal mechanism, automatic FTA termination, future agreements, economic magnitudes or public opinion. Other topics return **empty** with an explicit research gap. Saving without evidence stores `evidence: null`; it does not turn missing evidence into zero impact. A new replay attempt does not make a source fresher. Queries are recorded research scope, not a claim that a new search occurred.

## Security and resource boundaries

There is no runtime external-fetch surface: URLs must match the exact checked public registry. Unknown URLs, private/loopback/IP destinations, user information, alternate schemes and unexpected fields are rejected. No runtime redirects are followed. This narrower boundary avoids claiming a general SSRF-safe crawler. A future live retrieval adapter needs its own host, DNS/redirect, content-type, extraction, source-rights, timeout and byte-limit review.

The API bounds streamed requests to 8,192 UTF-8 bytes, validates JSON content types and returns safe errors with `private, no-store` and `nosniff`. Responses/contract contents are bounded. The client has a 15-second timeout, response-byte cap, cancellation and monotonic attempt/revision checks. Source text is untrusted data; no instructions from it are executed or sent to agents here. No secrets, raw Census/GTFS data, full documents or uploaded private files are embedded in experiments.

## Saved versus active lifecycle

Storage is `localStorage`, key `impactlens.experiments.v1`: at most 24 records, 220,000 UTF-8 bytes per record and 2,000,000 bytes per registry; actual plot content has a separate 150,000-character bound. It is local to this browser/origin, plaintext and not cross-device or transactional cross-tab storage. Export/import uses `{version:1, experiments:[...]}`. The low-level merge accepts an identical record idempotently and rejects conflicting IDs; the UI refuses any already-present ID to avoid silent overwrite. Corrupt storage is reported rather than cleared. Missing/full storage produces a session-only/export warning.

Changing a question, geometry, assumptions or research attempt rejects obsolete replies. Both AbortController and exact monotonic identity checks are used, including A → B → A. Context preparation has its own generation so an assumption edit cannot strand the draft. Hydration merges with newer archives; writes are serialised; disposed lifecycle operations cannot publish or persist late. Editing geometry clears site/route selections requiring review. Old snapshots remain frozen.

Selecting an archive only inspects it. Explicit restore copies its question, drawing and assumptions into a new active draft, clears calculation bindings and requires fresh research/reconfirmation. It does not restore calculated MRT/AAC or stakeholder outcomes. Null-geography imported archives restore into an empty drawing. Start new scenario clears active state but retains archives. Returning to landing cancels pending research.

## Comparison and graph

Comparisons show labelled changed/unchanged assumptions, shared/different source references, findings, gaps and source verification dates. Both absent evidence snapshots are labelled **missing**, not shared. Different question/geography contexts are explicitly identified. There are no GDP, approval, service-uptake, health or synthetic-dialogue deltas.

The existing Cytoscape renderer receives source, assumption, planning-finding and limitation nodes through `appendExperimentGraph`. `uses`, `supported-by` and `limited-by` describe recorded lineage, not causality. Current engine graphs are preserved. Archived experiments use a standalone graph with prominent archive labels and no current calculated-result nodes; projection failure cannot fall back to unrelated current results. Existing compact, expanded and full-window inspectors work. No graph schema/renderer extension was necessary; only context wording changed in `knowledge-workspace.tsx`.

## Phase 7D handoff

`createScenarioExperimentInput(record)` and `validateScenarioExperimentInput(value)` expose deeply readonly, serialisable version-1 question/configuration/geometry/evidence, limitations, horizon/focus, lineage and complete input identity. No functions, UI state, provider keys or fabricated run IDs are present. Execution remains `not-executed`. The [complete checked-source JSON fixture](../lib/experiments/fixtures/asean-phase7d-input.json), [contract reference](PHASE7E_EXPERIMENT_INPUT_CONTRACT.md) and [Terminal 3 guide](PHASE7E_TERMINAL3_INTEGRATION_GUIDE.md) specify the independent wire surface.

MRT/AAC notebook records intentionally retain plan/drawing references only. They do **not** export complete confirmed timings/anchors, AAC calculation parameters, accepted runs or replayable engine inputs. Those engines and result bindings remain authoritative in the existing workflow. Phase 7D execution and its output contract are not implemented here.

## Actual validation

| Check | Result |
| --- | --- |
| Existing six MRT/population/eldercare CLI commands | All passed sequentially |
| `npm.cmd test` | **457 passed, 0 failed, 0 skipped**; 396 retained + 61 added |
| Application TypeScript | Passed |
| Explicit strict NodeNext evidence/experiment/server/test TypeScript | Passed |
| Existing Python GIS suite | **19 passed**; no Overture acquisition/preparation |
| `npm.cmd run build` | Passed; existing routes retained + `/api/evidence/research` |
| `git diff --check` | Passed |
| Original source bytes | All **14** tracked raw input blobs match HEAD |

The first sandboxed `eldercare:prepare` was denied access to the existing ignored derived catalogue. An authorised permission-correct rerun passed; original raw data was unchanged. Hooks ran sequentially. Logs are ignored under `tmp/phase7e/`. No new packages, environment edits, paid AI calls, Git mutations or deployment occurred.

Focused tests cover strict schemas, immutable records, complete identities, support/provenance checks, malformed bodies, UTF-8 limits, missing evidence, meaningful comparisons, safe React rendering, graph preservation/correlation, question/geometry/assumption races, hydration/write ordering and unmount/disposal. Independent review found storage ordering/hydration, context preparation, archive labels/fallback, null-geometry restore and no-storage warning issues; all confirmed issues were fixed and regression-checked.

## Real Playwright acceptance

Reused main's verified loopback port-3000 Next development process (PID 5264); no server was terminated. The public AI status reported unavailable, so real planning used deterministic fallback and no paid call occurred.

- ASEAN defaults → actual planner → actual replay endpoint → two immutable snapshots → changed withdrawal/trade assumptions, unchanged five-year horizon, two shared sources/findings. Source date, exact URL, publisher and excerpt were inspected.
- JSON export and future-input download worked. Reload restored two archives; duplicate import refused overwrite. A separate clean context imported two archives and compared them. Explicit archived-settings restore worked.
- Archived graph: **22 nodes / 24 edges / 2 source nodes / 0 result nodes**. Actual popup, expanded and full-window inspection and Escape focus return worked; General/Graph retained one map.
- Delayed actual responses were rejected after horizon changes, cancellation, retries, A → B → A question edits, geometry edits and reset. Controlled 503, malformed JSON and wrong correlation showed safe errors; real replay then recovered.
- Polyclinic retained a plotted Sengkang site and hypothetical scope with empty evidence, no AAC execution. Generic focus/hypothesis/named-assumption/one-year input saved correctly. MRT/AAC snapshots retained real selected plan/drawing references.
- Real plot-first MRT with confirmed NS4/NE16 anchors returned **62.77 → 13.50 modelled minutes**; demographic impact/profile payload and dashboard loaded. Real AAC returned **44,520 targeted / 6,230 comparable / 38,290 unlocated / 3,890 closer**, mean **410.44 → 347.46 m**, with four existing markers. These are existing engine outputs, not lab forecasts.
- Existing pedestrian helper observed **4.936 m** actual rendered-root displacement after a five-second wait; Pause/Reset retained exact matrices and one map. Motion stays illustrative.
- **1920×1080, 1440×900, 1024×900 and 390×844**: populated comparison, controls and source views had no horizontal overflow. Screenshots were opened and inspected. A fresh isolated context had **zero page/console errors, one map, one citizen layer and 371 rendered building features**; local-review attribution remained visible. Rendered features are a viewport count, not the national inventory.

Local ignored evidence includes `test-results/phase7e-{fresh-landing,fresh-comparison,mobile-map,source-mobile}.png`, `phase7e-populated-compare-{1920,1440,1024,390}.png` and export JSON. `scripts/testing/phase7e-browser-check.mjs` contains opt-in reproducible API/UI/race helpers; it is never imported by the app. No new sustained performance/FPS claim is made for this phase.

## Limits and next step

This completes the scoped experiment lab, not comprehensive research, stakeholder execution or economic/legal forecasting. The replay is deliberately small and historical. There is no live search, PDF ingestion, signed source attestation, cross-device sync or transactional multi-tab registry. New curated sources require a reviewed registry update. Saved engine references are not full executable MRT/AAC snapshots.

Keep the Phase 4 calculated-population trajectory gap, limited AAC historical catalogue/proxies/unlocated residents, and illustrative pedestrian disclosure. Building distribution remains internal `local-review-only` with loopback/source/licence restrictions intact. No public demonstration clearance is implied.

Next: Terminal 3 reviews this unstaged stream with Terminal 2's separately developed Phase 7D. Reconcile the versioned input contract and execute only after validating the consumer and its output provenance. Skills actually applied: frontend-design, writing-plans, TDD, systematic debugging, parallel-agent coordination, independent review and verification. Tools: local PowerShell/Node/TypeScript, Playwright MCP, web research for official source verification and local screenshot inspection.

## Hackathon rebuild

1. Recreate typed configurations and separate full identities; test immutable save/import and comparisons first.
2. Add the two reviewed-source replay records and strict support/URL validators; keep replay dates and missing evidence visible.
3. Expose one bounded replay POST route and one revision/attempt-aware browser controller.
4. Compose the lab over General without remounting the map; reuse actual MRT/AAC controls.
5. Project the selected current/archive context into the existing graph, preserving provenance and result bindings.
6. Validate the Phase 7D input with complete JSON fixtures before adding an agent executor. Run sequential regressions and real browser cases above. Follow competition rules on permitted prebuilt code/data.

The exact maintained changed/new path inventory is included in [the Terminal 3 guide](PHASE7E_TERMINAL3_INTEGRATION_GUIDE.md#maintained-path-inventory). Existing tracked modifications are limited to workspace composition, graph scope wording and the central roadmap. The unified manifest SHA-256 remains `5ab917ca747b51527868499c58ac6ecc21c82dd8897d3243ed9ff52ef0bfc32b`.
