# Phase 7G — Interactive Knowledge Graph

## Architecture and implementation plan

Terminal 2 began from clean `feature/synthetic-population` at `3b6e8c0f0c7457197aa26d87021b94704f3409d0`. The user's Phase 7G brief is the implementation specification. Work remains local and uncommitted; Terminal 1's Phase 7F citizen work and its worktree are outside this verification.

**Status:** Implemented and validated in this checkout's actual Knowledge Graph tab, ready for Terminal 3's coordinated integration. All finishing tests/types/build, development/production browser checks and final Git audit passed. This is a relationship explorer; GraphRAG retrieval and Phase 7D stakeholder execution remain unimplemented.

The owner's MiroFish reference establishes the visual direction: an immersive dark network, category colours, organic clusters and progressive inspection. Density must come from actual entities and documented relationships. It does not authorise invented stakeholders, causal links or numerical outcomes.

The feature is a deterministic relationship and calculation-lineage explorer. It consumes the current validated planner, user-authored geometry, explicitly confirmed intervention configuration and available calculation responses. It neither invokes a simulation nor sends graph construction to an LLM. It is not a document retrieval, GraphRAG or synthetic stakeholder executor.

Implementation sequence:

1. Write failing contract and adapter tests, then implement bounded browser-safe validation and a small MRT graph from real application contracts.
2. Integrate Cytoscape.js into the existing Knowledge Graph tab. Use stable initial positions and one bounded force-directed layout, with no continuing idle physics.
3. Implement node selection, compact popup, expanded inspector and full-window detail. Add inspectable relationship provenance, search, category filters, neighbours, pan/zoom and fit/reset controls.
4. Add AAC and planning-only adapters. Preserve unknown origins and unavailable outcomes; do not substitute AAC for polyclinics.
5. Bind graph content to the current scenario/geometry/execution identities. Preserve graph UI state across tab switches, and remove obsolete calculated nodes when source state changes.
6. Verify real MRT/AAC flows, unsupported questions, delayed responses, four viewport sizes and keyboard interactions through the actual local application. Run sequential regression commands, independent review and final documentation.

Review focus: stale result attachment; user-authored versus observed station connectivity; unlocated AAC residents; unsafe source URLs and rich text; renderer/focus cleanup; filter/selection consistency; hidden-tab layout work; mobile inspector overflow.

## Renderer decision

The implementing agent evaluated [Cytoscape.js](https://js.cytoscape.org/), [Sigma.js](https://www.sigmajs.org/docs/) and [D3 force](https://github.com/d3/d3-force) using their official documentation. Cytoscape supplies network picking, pan/zoom, styles, graph querying and layouts in one MIT-licensed dependency. Sigma favours WebGL-scale rendering but adds graph/layout integration; D3 force supplies layout rather than the complete picking/rendering/inspection layer. The chosen dependency is pinned to **`cytoscape@3.33.1`**, providing the smallest implementation surface for this prototype. Browser layout measurements are recorded below; an isolated production-bundle increment was not measured.

The renderer is a view over graph DTOs. It does not mutate planner, plot, population, engine inputs or result payloads. Opening an inspector changes UI state only. Category colour is reinforced by labels and provenance text. The shared palette prevents a legend/node mismatch. Low-zoom labels are reduced rather than displaying a wall of text; selected, hovered and hub labels remain prominent.

Initial display positions are deterministic golden-angle seeds, not geographic coordinates. Built-in CoSE runs **250 bounded iterations** with `randomize:false` and `animate:false`, then stops. No idle physics loop is kept alive. Popup/expanded/full-window state does not rerun layout. Fit resizes the existing core before adjusting its viewport; normal inspection leaves positions and camera unchanged. The Canvas renderer is dynamically imported on first visible use, and hidden graph tabs do not construct a new instance. `ResizeObserver` and graph event listeners are released during cleanup.

## Contract and provenance

`lib/knowledge-graph/contract.ts` exports `KNOWLEDGE_GRAPH_VERSION`, `NODE_CATEGORIES`, `PROVENANCE_KINDS`, `RELATIONSHIPS`, `GRAPH_LIMITS`, `parseKnowledgeGraph` and types `NodeCategory`, `ProvenanceKind`, `KnowledgeProvenance`, `KnowledgeNode`, `KnowledgeRelationship`, `KnowledgeEdge`, `KnowledgeGraph`. It imports no Node, filesystem, provider or raw-data module.

The version-1 graph contains `scenarioIdentity`, optional `executionIdentity`, `nodes`, `edges` and `limitations`. Node categories are `scenario`, `infrastructure`, `geography`, `assumption`, `population`, `result`, `source`, `planning`, `limitation`. Every node and edge has `{kind,reference,url?}` provenance. Nodes carry bounded label/description/optional details, scalar `properties` and limitations. Edges carry source/target node IDs, a finite relationship discriminator, description, provenance and direction.

Current limits are **1,500 nodes, 6,000 edges, 3,000,000 UTF-8 JSON bytes**, 180-character labels, 2,000-character descriptions, 8,000-character details and at most 40 scalar properties per node. Identity strings allow up to 160,000 characters to retain exact local equality keys. Runtime parsing rejects duplicate IDs, orphaned endpoints, unknown fields/categories/provenance/relationships, nonfinite numbers and malformed structures. Source links must be credential-free HTTPS URLs; they are never fetched automatically. Parsed values are detached with `structuredClone`; text is rendered by React, never inserted as HTML.

| Provenance | Meaning |
| --- | --- |
| User-authored | The question, drawn geometry or explicitly confirmed scenario input |
| Source-backed | An entity/relationship traceable to the existing documented catalogue or data source |
| Model assumption | A declared service time, access threshold, geographic proxy or other modelling input |
| Calculated | A value or relationship produced by an existing validated calculation |
| Planning-only | A research requirement or unavailable future pathway, without a completed calculation |
| Synthetic exploratory | Reserved for a future validated Phase 7D adapter; no stakeholder execution is added here |

Connectivity describes the displayed relationship, not statistical correlation or causation. Values absent from an input are omitted or labelled unavailable; missing outcomes are never filled with zero.

## Source-adapter boundaries

`lib/knowledge-graph/adapters.ts` exports `GraphContext`, `BoundGraphResult<T>`, `knowledgeIdentity(input)` and `buildKnowledgeGraph(context)`. The context supplies the current `question`, validated `plan` or null, `geometry`, `catalog` or null and exact `scenarioIdentity`; optional inputs are confirmed `anchors`, `draft`, `facilities`, and bound `mrt`, `aac`, `demographic` responses. A bound response is `{scenarioIdentity,executionIdentity,result}`. Callers establish that binding at dispatch/acceptance, never by relabelling an old response during render.

`knowledgeIdentity` serializes canonical full content for exact local equality; it is deliberately not a short hash or server calculation identity. Display-node keys may shorten arbitrary source IDs, but duplicate/collision validation rejects conflicting keys and these keys never authorise execution. A retained plan whose `request.question` differs from the current question is excluded. Bound result input is ignored if its scenario identity differs or the capability does not match.

`lib/knowledge-graph/selectors.ts` exports `searchKnowledgeNodes`, `filterKnowledgeGraph`, `knowledgeRelationships` and `knowledgeNeighbours`. They query existing graph text/IDs, keep only edges whose filtered endpoints remain visible and return real adjacency; they do not synthesize additional entities, sources or causal paths. `lib/knowledge-graph/palette.ts` supplies shared `CATEGORY_COLOURS` so node, inspector and legend colours agree.

MRT uses actual current planner/plot data, explicit station ordering, catalogue-confirmed anchors, reviewed running/dwell/wait/walk inputs and real journey comparisons. Existing station/service nodes and accepted connections are labelled baseline catalogue context, including selected service date and quarantine information; they are separate from hypothetical proposal nodes. A plotted anchor relationship requires an explicit point-to-station mapping, exact current point/catalogue coordinates and a served existing station. Moving the point makes the old anchor inapplicable. Spatial proximity and polyline crossings never establish an interchange. Demographic nodes require an available, current bound population-impact response, not an animation fixture. Full weighted metrics determine group nodes; the rendered citizen subset does not determine aggregate outcomes.

Before execution, General exposes actual drawn features, explicit anchors, registered plan assumptions and missing-input requirements. Its unsubmitted local timing/order acknowledgement state is not exported from `GeneralPlotPanel`. Full confirmed engine-draft station-order/timing nodes appear when the plotted adapter confirms/submits the proposal, or for a current explicit advanced binding. The pre-execution graph therefore does not claim to mirror every unsubmitted editor field. Extending that preview later requires an explicit read-only validated configuration handoff rather than inferred values.

AAC uses the existing limited corroborated subset and validated calculation envelope. The four AAC classifications retain historical coordinate/current-operation uncertainty. Its two public landmark proxies are model origins, not residents' homes. Proxy-coordinate nodes have model-assumption provenance; separate calculated comparison nodes carry distance/status/reduction values and link back to the proxy. Proposed location is user-authored, while capacity/availability/eligibility have a separate assumption node. Threshold assumptions and their calculated coverage values are separate entities. Comparable population and unlocated population retain distinct nodes/denominators. Straight-line proximity does not establish walking routes, participation, capacity, placements, loneliness or health outcomes.

Planning-only cases use structured plan requirements and user drawings. Polyclinics have no registered executable healthcare model. ASEAN scenarios have no representative opinion prediction. Empty evidence references remain empty; the graph does not fetch user-provided URLs or fabricate citations, statements or agent interactions.

## Scenario lifecycle and UI

The existing planner client rejects obsolete question responses; geometry uses monotonic revision plus the full local geometry key. Existing MRT execution bindings distinguish plotted and explicitly opened advanced configurations; AAC already binds the envelope to the current draft key. The graph must consume these current states and invalidate obsolete calculation-dependent content rather than creating a weaker parallel execution identity.

The map stays mounted while General is hidden. The graph likewise retains its renderer across General/Knowledge Graph switches, resizes when visible and avoids background layout loops. Selection, inspector size, search and filters do not invalidate simulations or rebuild layout. A genuinely changed graph replaces obsolete result content and establishes the appropriate new selection state.

`components/workspace.tsx` adds graph-bound response state and a memoized adapter projection. MRT response identity is captured for the submitted proposal and stored only after the existing acceptance gate succeeds. AAC uses its current request/plot binding. `components/impact-panel.tsx` adds an optional `onResult` callback exposing its already-current validated report or null; no calculation moves into the graph. The workspace callback projects the payload's full weighted metrics, without making another API call. `KnowledgeWorkspace` remains mounted and receives separate `graph`, `visible` and `onReturn` props.

Three inspection levels are required: a compact contextual popup with summary/provenance/properties; a larger independently scrolling inspector with full properties and relationships; and a full-window dialog with focus containment, Escape and restoration to the previous inspector. Related-node actions focus the graph without resetting its camera/layout. An accessible node/result list complements Canvas picking; relationship lists provide a keyboard path to edge provenance.

## Verification ledger

The final current-code `npm.cmd test` passed **371 Node tests, zero failures and zero skipped**, retaining all 343 baseline tests and adding 28 graph checks: 18 data/contract/adapter, six renderer and four UI tests. Duration was **69.442 s**. All six MRT/population/eldercare CLI commands exited zero. Application TypeScript and explicit strict graph-module/test checks passed. The independent existing GIS suite passed **19 tests, zero failures**; expensive Overture acquisition/preparation was not rerun. The production build passed with Next.js **16.4.3**, a **33.0 s compile** and **2.2 s TypeScript step**, preserving all 14 existing pages/routes. The actual production-server smoke also passed as recorded below.

Required checks: MRT before/after calculation; AAC catalogue/proxy/comparable/unlocated details; polyclinic/ASEAN planning-only states; all three inspector levels; node/edge relationship navigation; pan/zoom/fit/search/filter; question/geometry/edit/undo/redo/reset/delayed-response invalidation; General/Graph state retention; 1920×1080, 1440×900, 1024×900 and 390×844; no unexpected console errors, horizontal overflow, extra MapLibre instance or leaked graph renderer.

### Browser evidence recorded so far

The baseline placeholder was captured at `test-results/phase7g/before-placeholder.png`. The real Terminal 2 application uses its own server at `127.0.0.1:3127`. Provider use was disabled through that process's environment; `.env.local` was not opened or modified and no paid call was made.

An actual General MRT flow used a user-drawn line, three station dots and explicitly confirmed NS4/NE16 anchors. Before calculation the graph contained **211 nodes / 642 edges**, with **zero calculated-result category nodes**. The real `/api/simulate` returned HTTP 200: **62.7667 → 13.5 modelled minutes**, **49.2667 minutes saved**, **2 → 0 transfers** under the reviewed illustrative configuration. Its bound post-calculation graph contained **219 nodes / 657 edges**; one browser trial recorded **1,504.6 ms** initial layout. These are example-specific observed values, not hardcoded outcomes or a general scalability claim.

Clicking the actual Choa Chu Kang Canvas node opened the popup. Expand/full-window/native-dialog/Escape returned to the inspector with focus restored and identical renderer positions, zoom and pan. General/Knowledge Graph switching preserved the same snapshot and one MapLibre map. Evidence includes `mrt-node-popup.png`, `full-window.png` and `mrt-calculated-inspector.png` in the same ignored screenshot directory.

An actual confirmed General AAC point at latitude 1.287, longitude 103.824 produced HTTP 200. The inspected calculation contained **44,520 age-targeted represented residents**, **6,230 located/comparable**, **38,290 unlocated**, and approximately **410.44479 → 347.46051 m** weighted nearest distance. The final graph contained **64 nodes / 66 edges**, with **239.7 ms** initial layout in one observed browser trial. The final renderer IDs were checked after the provenance split: distinct service-assumption, origin-comparison and threshold-assumption nodes are present. The unlocated node showed calculated provenance and explained the unknown origin status. Its screenshot is `aac-unlocated-inspector.png`.

All four requested viewports—**1920×1080, 1440×900, 1024×900 and 390×844**—showed no document horizontal overflow. The final mobile full-window dialog measured approximately **374.775×793.35 px**, fitting inside 390×844; Escape closed it. Screenshots are `aac-1920.png`, `aac-1440.png`, `aac-1024.png`, `aac-390.png` and `mobile-full-window.png`. Graph-specific CSS hides the preserved General grid/summary while Graph is active rather than leaving a blank reserved map region. The map remains mounted. Responsive fitting resizes the graph before fit; a cleaned-up `ResizeObserver` handles container changes.

Actual mouse pan and zoom controls changed recorded pan/zoom. Filtering infrastructure hid its five AAC nodes, leaving **59 of 64** visible; reset restored the view. The relationship list opened an actual edge with user-authored provenance. Moving the AAC point from 1.287 to 1.288 latitude removed attached calculated content and restored inputs/planning context; undo and redo were exercised. Polyclinic and ASEAN requests produced **14 nodes / 13 edges** and **17 nodes / 16 edges**, respectively, each including one current user point and **zero calculated-result nodes**. These are planning topics, not healthcare predictions or stakeholder opinions. Screenshots are `planning-polyclinic.png` and `planning-asean.png`.

The actual population-impact API returned HTTP 200 for **2,000 representatives**, representing **192,150 residents** under the existing illustrative demand. Its **29 metric groups** produced a graph of **250 nodes / 688 edges**, with **1,913.8 ms** observed layout. The weighted-calculation inspector showed the source year, full represented total and run identity, independent of the animation subset. Screenshot: `mrt-weighted-population.png`. The sampled result does not establish measured commuting behaviour or national accessibility.

Ten General/Knowledge Graph switches preserved the **exact same 250-node / 688-edge renderer snapshot**. Delayed real planner and MRT HTTP responses, followed by a question edit, were discarded: calculated-result count stayed zero. Start new scenario removed all graph canvases, showed the empty state and retained **one MapLibre instance**. The final fresh browser flow reran a real plotted MRT calculation and checked all four viewport widths with **no page errors or console errors**; the final mobile three-level flow restored focus after Escape. Its screenshots are `final-mrt-1920.png`, `final-mrt-1440.png`, `final-mrt-1024.png`, `final-mrt-390.png` and `full-window.png`.

Independent review identified three issues that were corrected and covered in targeted tests: dispose the old renderer when a new graph becomes null; reject node/edge IDs colliding across their shared renderer namespace; and split mixed AAC proxy/capacity/threshold assumptions from calculated outcomes. A related-node action now applies any re-enabled category before focusing a previously filtered node. Scoped re-review found no remaining blocker. Null-graph reset cleanup and invalid-input parser rejection have their separately recorded browser/unit coverage.

### Measured performance and cleanup

| Observed graph | Nodes / edges | One browser layout observation |
| --- | ---: | ---: |
| Real MRT journey result | 219 / 657 | 1,504.6 ms |
| Real AAC result | 64 / 66 | 239.7 ms |
| Real MRT plus weighted demographic groups | 250 / 688 | 1,913.8 ms |
| Explicit synthetic performance-only fixture | 500 / 499 | 4,020.2 ms |
| Production-build MRT planning context | 207 / 636 | 2,779.1 ms |

The 500-node fixture is diagnostic data, never shown as actual scenario knowledge or an executed simulation. Its renderer reported destroyed after disposal. The real graph retained three Canvas layers afterward, which is Cytoscape's layered rendering for **one** graph instance, not three graph instances. Reset reduced graph canvases to zero. This is lifecycle/canvas stability evidence; no exact sustained heap-growth, FPS, GPU or thousands-of-node capacity claim is made. Layout currently runs synchronously, so the observed four-second 500-node case is a real responsiveness limitation and a reason to consider a worker or different layout for larger future graphs.

Raw development observations are in ignored `tmp/phase7g/g7{three,mrt,mrtinspect,aac,explore,mobile,planning,performance,demographic,lifecycle}.json` and `final-browser.json`. These are local observations, not cross-device hardware benchmarks or production network latency. The task's owned development server at port 3127 was stopped before the successful production build. The separate production trial uses a different planning context and is not a direct timing comparison with the development graphs.

### Production-server smoke and final audit

The built application served a real no-provider MRT planning request with HTTP 200, showing **207 nodes / 636 edges**. Actual mouse-wheel input changed zoom. Searching the supported source identifier `station:NS4` found the station, and its full longitude **103.744369** remained visible. A hostile approximately 1,700-character question stayed text, creating **zero image/script elements**; its long compact popup remained inside the graph Canvas with scrolling. No page errors were recorded.

Turning every category off left zero visible nodes. Reset view restored **207 visible nodes** and fitted the graph (observed zoom about **0.6493**). Following a related source while its category was hidden restored the category and focused the related node. Production observations are `tmp/phase7g/production-browser.json` and `production-filter.json`. The owned production process was stopped afterward; port 3127 was verified free. Terminal 1's server was untouched.

The final branch/HEAD remain `feature/synthetic-population` / `3b6e8c0f0c7457197aa26d87021b94704f3409d0`. There are **12 new maintained files and six modified tracked files**, with an empty staged diff; no staging, commit, merge, rebase, reset, cherry-pick or push occurred. `next-env.d.ts` was restored by the build and has no final diff. `git diff --check` passed; all 12 new files passed encoding/whitespace checks. `.env.local` remains ignored/untracked and was neither opened nor modified. The unified-building manifest retains SHA-256 `5ab917ca747b51527868499c58ac6ecc21c82dd8897d3243ed9ff52ef0bfc32b`. No Phase 7F validation is claimed.

The final regression-tested UI reuses `searchKnowledgeNodes`, including supported identifiers in search. Latitude, longitude and reference-year values display as exact strings, while general numeric metrics retain restrained decimal formatting. Compact popups have bounded height and scroll for long descriptions rather than clipping content.

## Integrity and remaining boundaries

No model formulas, Census expansion weights, raw government data, AI provider logic or citizen movement are changed. The unified building catalogue remains internal local review only; this feature does not publish geometry or relax its protections. Graph payloads contain selected structured entities, not raw Census data or the complete building inventory. No new paid provider call, graph database or hosted service is required.

The exact maintained file inventory and shared-file conflicts are in the companion [Terminal 3 guide](PHASE7G_TERMINAL3_INTEGRATION_GUIDE.md). Remaining work is coordinated integration with Terminal 1's concurrent Phase 7F and any future retrieval/agent capabilities. Source data and model limitations are not removed by a graph view.

## Future Phase 7D boundary

The provenance union reserves `synthetic-exploratory`; current adapters never create stakeholder statements or agent interactions. A future adapter must consume validated execution records, bind their run/scenario identity, retain explicit synthetic labels, attach actual evidence references where available and preserve assumptions/uncertainty. Adding a category to a picture is not authorisation to execute a new capability or present hypothetical statements as public opinion. Temporal interaction records need their own validated producer contract before a graph adapter is written.

## Hackathon rebuild sequence

Confirm competition reuse rules first. From permitted source inputs, rebuild the existing validated engines/planner/plot contracts, then the graph contract and failing adapter fixtures, followed by the disposable renderer, three inspector levels and the current-result handoff. Build/inspect a small real MRT graph before expanding to the complete accepted network. Add the limited AAC projection and planning-only cases before visual polish. Do not rebuild GraphRAG infrastructure or acquire building data for this feature.

From this checkout, the ordinary setup is:

```powershell
npm.cmd ci
npm.cmd run prepare:web
# Verify this port is unused; use Terminal 2's own process only.
npm.cmd run dev -- -p 3127
```

Node 24+ is required by the project. The Python GIS environment and Overture preparation are not graph runtime dependencies. Existing source inputs and ignored local assets still follow their prior-phase reconstruction/licensing rules.

Focused tests use the existing Node runner:

```powershell
node --test lib/contracts/tests/knowledge-graph.test.ts lib/contracts/tests/knowledge-renderer.test.ts lib/contracts/tests/knowledge-ui.test.ts
```

Use the actual General/Knowledge Graph tab for browser acceptance. `scripts/testing/phase7g-browser-check.mjs` exports opt-in Playwright helpers (`attachGraph`, `inspectThreeLevels`); it is not a standalone user page or a production import. It inspects the owned renderer for acceptance and checks three-level focus/camera preservation. Source responses, screenshots and test-only renderer references remain diagnostic artifacts.

The full finishing sequence is the six model commands in the user brief, `npm.cmd test`, `npx.cmd --no-install tsc --noEmit`, explicit strict graph checks, `npm.cmd run build` and `git diff --check`, run without overlapping Windows preparation hooks. Re-run the actual browser flows after Terminal 3 combines the current workspace with Phase 7F.

## Tools and skills actually applied

- Web research consulted the official Cytoscape, Sigma and D3 force documentation for rendering/layout choice; the installed Next.js `use-client` guide informed the browser boundary.
- Playwright MCP exercised the actual owned local application, Canvas picking, APIs, delayed replies, responsive viewports, inspectors, keyboard behaviour and screenshots. Test-only diagnostics inspect the current renderer; they are not a production API or substitute page.
- Local PowerShell, Node/TypeScript, React server rendering and the existing Node test runner verified code and browser-safe contracts. The existing isolated Python GIS suite was retained; no new GIS acquisition was required. Git tooling was read-only.
- Applied skills were using-superpowers, brainstorming/writing-plans, frontend-design, test-driven-development, systematic-debugging and verification-before-completion. Independent code review supplied the corrected provenance, identity and lifecycle cases described above.

No graph database, embedding service, agent framework, new AI provider or paid model call was introduced. Terminal 1's worktree/server and Phase 7F code were not accessed or modified.
