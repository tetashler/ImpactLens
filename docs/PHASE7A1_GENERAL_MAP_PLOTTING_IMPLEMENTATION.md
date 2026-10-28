# Phase 7A.1 — General workspace and map plotting

Implemented 28 October 2026 in the main `master` worktree, starting at `4400f47268663a848ca59d55c6f140dda80c97cc`. All existing uncommitted Phase 7A work is retained. No staging, commit, push, merge, rebase, reset, other-worktree change or dependency installation was performed.

## Experience

The product feedback was that the first technical MRT editor required too much transport-engine knowledge. The ordinary workflow is now **question and drawing → confirm meaning/connections → review assumptions → calculate → inspect results**. Drawing first and asking first both work. No illustrative rail proposal is loaded as the user's scenario by default.

The map-first landing retains the live Tiong Bahru HDB view, desktop map/composer split and non-interactive gradient. Explore enters **General immediately**, retaining the question while the actual planner request runs. A shared camera coordinator animates to the same bounds as Fit Singapore; it queues the newest command until the owned map loads, stops an earlier animation and uses zero-duration transitions for reduced motion. Tool edits and graph navigation do not repeatedly fit the camera. Return to landing restores the existing neighbourhood camera.

**General / Knowledge Graph** are the primary tabs. General keeps a compact composer, user drawings, model-specific confirmations and existing results. The Knowledge Graph destination preserves this context and honestly states that no source-backed graph exists. Its future renderer boundary is Phase 7G; no entities, relationships or stakeholder statistics were invented.

Street detail starts enabled. The preference belongs to the persistent map, survives landing/General/graph navigation and can be toggled in Map layers. Offline street tiles do not remove local subzone/HDB geometry or disable plotting. Existing OpenStreetMap attribution, internet requirements and tile-use caveats remain in the map documentation. HDB footprints and illustrative 12 m heights are unchanged; this is not the Phase 7C building audit.

## Geometry and editing

`lib/plots/geometry.ts` owns a separate, browser-safe `ScenarioGeometry` version 1:

```ts
type ScenarioGeometry = {
  version: 1;
  scenarioId: string; // user draft identity, not a planner or calculation ID
  features: Array<
    | {kind: 'point'; id: string; label: string;
       coordinate: {lat: number; lon: number};
       role: 'unassigned' | 'station' | 'site'; provenance: 'user-drawn'}
    | {kind: 'line'; id: string; label: string;
       coordinates: Array<{lat: number; lon: number}>; provenance: 'user-drawn'}
  >;
};
```

Strict parsing rejects unknown fields, invalid versions/roles/provenance, duplicate feature IDs, sparse arrays, non-finite coordinates and out-of-bounds positions. Bounds match supported Singapore authoring inputs: latitude 1.15–1.5, longitude 103.6–104.1. Limits are 100 features, 200 vertices per line, 1,000 total line vertices, 120-character labels and 128-character IDs. Parsed values are detached; store geometry is frozen. GeoJSON is always `[longitude, latitude]`.

`createPlotStore` provides stable IDs, selection, point/vertex movement, label/role edits, point/vertex ordering, removal, undo/redo and reset. A line stroke is one undo operation; Finish commits it and Cancel/Escape restores the pre-stroke geometry. Other edits are disabled during an unfinished stroke. A one-vertex in-progress line can be stored but is not emitted as an invalid GeoJSON LineString. Station dots are independent point features, never implicit route vertices.

Every geometry edit, undo and redo increments a monotonic revision. The canonical full-geometry key supports exact local equality; it is not a cryptographic server identity. A→B→A retains a newer revision. Selection and tool changes alone preserve the geometry identity and valid results. The history is capped at 50 entries. State is session memory, with no persistence/import/export UI in this phase; the strict parser and safe serialization are available to future adapters.

The floating toolbar offers Explore map, Add point, Draw route, Station dot, Connect station, Edit drawing, Undo, Redo and Clear plot. Selected feature controls offer numeric latitude/longitude, labels, point roles, ordering and deletion. Vertex handles and numeric editing support route adjustment. Escape cancels an unfinished drawing or pending anchor. Native controls and coordinate alternatives support keyboard access; the toolbar scrolls horizontally on small screens without overflowing the document.

## One map and pointer ownership

`PlotMapLayer` adds one lightweight GeoJSON source, two line layers and stable DOM point/vertex markers to the existing MapLibre instance. Numbered station dots differ from square route handles; confirmed anchors have a distinct state. Dragging is enabled in Edit only. An imperative preview updates the line during a drag; React/store state commits only at drag end. Invalid/stale drags restore the current valid position.

The controller registers no map click handler or animation loop. The existing parent click handler prioritises controls/popups, universal point/line tools, explicit MRT anchor selection, plot selection, native advanced AAC, citizens and advanced MRT editing. DOM markers stop propagation. Sources/layers recover on style load and dispose with their markers/listeners. Inactive plotting removes markers. Knowledge Graph hides the map without unmounting it; returning resizes it without fitting again. Existing HDB, subzones, rail layers and the Three.js layer remain owned by that single map.

The existing geographic SVG fallback also accepts point/line clicks and station selection; numeric controls remain usable without WebGL. A delayed successful map load clears the temporary initialization fallback.

## MRT adapter and assumptions

`buildPlottedMrt` accepts the validated geometry, selected route, explicit ordered point IDs, confirmed catalogue anchors and acknowledged assumptions. It produces the existing `EditorDraft`, then uses unchanged `draftToIntervention` and `POST /api/simulate`. No routing or demographic formula was changed.

- Choose a line with at least two vertices and 2–40 distinct station dots in explicit order.
- Connect at least one dot to a served existing station. Clicking an existing station in Connect station mode or using the searchable fallback proposes a connection; **Confirm interchange** explicitly snaps that dot to the actual catalogue coordinates. It can also add an anchor point when none is selected.
- Nearby suggestions use great-circle distance from actual coordinates, defaulting to 1 km / four suggestions. Proximity and line crossings never create an interchange.
- Duplicate/unknown/unserved anchors and coordinates differing from their confirmed station are rejected. Moving a dot away removes its effective anchor and requires review.
- Route bends remain visual annotations. They are not stations, engineering alignments or a source of measured train time. Dots need not be geometrically snapped onto the decorative line; the explicit reviewed station order defines engine links.

Defaults are **300 seconds running + 30 seconds dwell per consecutive link, 150 seconds proposed waiting and 180 seconds interchange walking**. These are illustrative inputs, not observed operating speeds/headways or an estimate from drawn distance. Users acknowledge the assumptions and can edit them under the timing disclosure. Source plot/route/point references are preserved in proposal rationale and new-station location notes; arbitrary plot IDs become deterministic safe engine IDs with collision checks.

The complete technical editor remains optional under Advanced MRT settings. Installing a plotted proposal clears obsolete technical undo history. Advanced entry does not silently reuse a draft from another plan. All MRT execution paths, including legacy results/profile paths, require a current explicit execution binding. Plot bindings include current plan ID, full geometry key and revision; advanced bindings require explicit entry for that current MRT plan. Unsupported questions cannot rerun an old MRT proposal.

## AAC and unsupported questions

`buildPlottedAac` requires one explicitly selected point and evidence acknowledgement. Confirm centre location maps its coordinate into the existing `useAacScenario` draft. The universal marker is the single primary hypothetical marker; the native advanced marker is disabled there. The existing geographic radius/facility layers remain available. The full validated adapter request, including plot provenance, reaches the existing hook/session and `POST /api/eldercare/simulate`.

The primary control exposes the straight-line radius. Existing advanced controls/demo remain available. Point movement invalidates the binding, radius/result and pending response; confirmation is required again. Threshold edits retain the reviewed location but invalidate calculations. Unbound Advanced AAC entry resets an unrelated old site.

The four corroborated records are a subset of 133 historical points, with 129 unclassified. Current opening/capacity is unconfirmed. Census 2020 age-targeting, two public landmark origin proxies, large unlocated population and straight-line versus walking-network distinctions remain visible. Proxy markers are not resident homes. No enrolment, individual eldercare trip, health or service-allocation outcome is calculated.

Polyclinic drawings remain user-authored annotations with evidence-planning requirements; they cannot invoke AAC. ASEAN/policy questions require no point and provide research/planned-capability boundaries without public-opinion forecasts. The planner contract and its 12-point limit are unchanged: arbitrary line geometry is never stuffed into ScenarioPlan v1 or used to invoke unregistered engines.

## State and request lifecycle

Composer text/category/context, planner response, geometry, MRT draft/result, AAC draft/result, optional AI and map state remain separate. The real planner uses `parseScenarioRequest` and awaited `parseScenarioResponse(json, submittedRequest)`, including token/content identity validation. Provider notices use the shared contract; no-key interpretation is not called AI.

Geometry/meaning/assumption changes clear the associated calculation and derived execution binding while retaining question/plan/drawing where appropriate. MRT acceptance checks local request revision, controller ownership, current geometry revision/key, service date, routing model and requested OD. AAC reuses its session's revision gate, expected request parser, echoed client token, canonical fingerprint and scenario identity. Cancellation is supplemented by these guards. Reset and question changes invalidate old attempts; tool/selection/graph changes preserve a still-valid calculation.

Start new scenario clears question, plots, bindings, calculation state and unrelated advanced history. Clear plot affects drawings and related results; Reset simulation keeps drawings. Return to landing retains authored inputs but clears calculation/execution state. New questions keep drawings as unconfirmed context rather than claiming they already mean MRT/AAC infrastructure.

## Validation

**313 tests passed, zero failed**: all 266 Phase 7A tests retained, plus 20 geometry/store/hook, 14 adapter, four map-controller, three camera, five execution-binding and one accessible-composer SSR regression. Tests cover actual engine validation, immutable baseline inputs, explicit anchoring, assumed timing, invalid geometry, history/revisions, safe serialization, marker cleanup, paused drag disposal, reduced-motion commands, stale identities and distinct input IDs for the simultaneously mounted composers. No paid provider requests occur.

All six CLI checks passed: `mrt:validate`, `mrt:simulate`, `agents:generate`, `agents:impact`, `eldercare:prepare`, `eldercare:simulate`. Application `tsc --noEmit`, explicit strict NodeNext module/test checks, Next production build and `git diff --check` passed. Test/build preparation hooks ran sequentially. The first eldercare preparation attempt hit sandbox EPERM on the ignored derived catalogue; its authorised permission-correct retry passed. All 14 original input SHA-256 values match the pre-phase manifest. Environment files and package dependencies are unchanged.

### Real Playwright MCP checks

The existing main-worktree port-3000 Next dev process was identified before testing; no other worktree/process was stopped. Live local planner/calculation APIs were used with public AI status unconfigured. Interception forwarded real responses for inspection/delay, or deliberately supplied bounded failures. No live paid AI call was made.

| Flow | Observed result |
|---|---|
| Landing / Explore | Buildings visible, question retained; General appears while planner response is held; camera transitions to shared Singapore bounds; same canvas retained |
| Plot-first and question-first MRT | Route vertices plus three distinct dots; explicit NS4/NE16 anchor confirmation; actual POST contained two 300 s / 30 s links. **62.77 → 13.50 modelled minutes**, not a real-world prediction |
| Direct map connection | Connect station click on actual NS16 produced the Ang Mo Kio confirmation; search fallback also exercised |
| MRT demographics/profile | Existing calculated weighted dashboard and synthetic profile loaded from real API; impact run ID survived a graph round-trip |
| Tool and plot lifecycle | Edit tool/Escape alone retained the valid MRT result; coordinate edits cleared journey/demographic output. Drag moved a point; Undo/Redo restored exact prior/following coordinates |
| AAC calculation | At 1.287, 103.824: **44,520** represented older residents, **6,230** comparable, **38,290** unlocated, **3,890** closer; approximately **410.44 → 347.46 m**. Zero newly within 500/1,000 m remains a valid result |
| AAC editing | Numeric move changed response fingerprint/site; actual drag cleared old results; one universal marker and no duplicate native hypothetical marker. Existing AAC popup showed historical/source/unknown-status caveats |
| Races | Held real MRT/AAC replies after geometry Undo could not restore reports; delayed planner edit, A→B→A and Start new rejected old replies; wrong token/hash rejected |
| Unsupported | Polyclinic and the tested ASEAN wording returned evidence planning, no calculation buttons or fabricated findings. Drawn context retained; graph remained honest/empty |
| Navigation/preferences | Manual street off stayed off through graph, landing and General; on remained enabled. Graph return retained camera to floating-point tolerance and one canvas |
| Responsive | 1920×1080, 1440×900, 1024×900, 390×844: no horizontal document overflow. Full plotted MRT and AAC calculations worked at 390 px; controls/coordinate alternatives remained accessible |
| Failure/recovery | Controlled planner 503 hid untrusted upstream detail and real retry recovered. Controlled MRT 503 showed an error without an old report, followed by a successful real **13.50 min** retry. Forced WebGL failure allowed SVG plotting and actual advanced illustrative MRT calculation (**20.00 min**). Blocked street tiles left local geometry/plotting usable and preference enabled; reduced-motion test used the shared camera |
| Existing animation | 180 illustrative citizens / 13 draw calls; Play advanced to 00:00:02, Pause/Reset exercised. One brief foreground cadence sample displayed 103.8 FPS; not a sustained benchmark or full-population behaviour |
| Final fresh unmocked page | **Zero console/page errors**, one MapLibre canvas, 317 rendered building features, real pan/zoom through gradient seam, no horizontal overflow |

Some Playwright clicks needed fresh navigation after hot-reload listener changes or waiting for the initial geographic loading overlay; browser helpers now wait for map readiness. These are local development/automation observations, not a long-duration performance certification. Independent read-only review found stale legacy execution, cross-plan advanced-history and AAC camera-refit issues; they were fixed and re-reviewed with no remaining blocking findings.

Ignored screenshot evidence was captured and visually inspected: `test-results/phase7a1-landing-final.png`, `phase7a1-landing-{1920,1440,1024,390}.png`, `phase7a1-general-{1920,1440,1024,390}.png`, `phase7a1-mobile-config.png`, `phase7a1-mrt-results-final.png`, `phase7a1-mrt-mobile.png`, `phase7a1-aac-mobile.png`, `phase7a1-knowledge.png`, `phase7a1-polyclinic.png`, `phase7a1-citizens.png`. Images/logs are not staged. `scripts/testing/phase7a1-browser-check.mjs` exports an opt-in real-page plotted-MRT acceptance helper; other checks above were executed through Playwright MCP.

## Files and tools

New implementation: `lib/map-camera.ts`; `lib/plots/{geometry,store,map-layer,adapters,execution}.ts`; `components/use-scenario-plot.ts`; `components/{general-plot-panel,plot-toolbar,knowledge-workspace}.tsx`; two General CSS files; six focused test files, browser helper and architecture checklist.

Modified integration: `components/{workspace,singapore-map,scenario-composer,eldercare-panel}.tsx`, `components/use-aac-scenario.ts`, `lib/eldercare/map-layer.ts`, README and central roadmap. Prior Phase 7A files remain present and uncommitted. No new API route, database, rendering framework or service was required.

Actually used: Playwright MCP, local execution/filesystem tools, official MapLibre API documentation, installed Next.js guides/types, TypeScript/Node tests; frontend-design and UI/UX accessibility guidance, architecture planning, TDD, scoped parallel development, systematic debugging, independent code review and verification-before-completion skills. No GitHub mutation was needed.

## Limits and hackathon rebuild

No polygons, saved project persistence, freehand route snapping, surveyed alignments, walking-network modelling, complete GraphRAG or stakeholder executor were built. Lines/dots can be drawn independently; their explicit interpretation/order controls execution. Illustrative uniform timings can yield large savings and need sensitivity/calibration before decision use. Source-byte identity, Census rounding/national discrepancy, unassigned MRT demand and unlocated AAC residents remain important. Calculated citizens still lack justified geographic trajectories; fixture animation remains separate. Phase 7C building fidelity, Phase 7D agent execution and Phase 7G graph rendering remain pending.

Rebuild sequence: (1) establish permitted baseline engines/contracts and local map assets; (2) add strict independent geometry/store tests; (3) one MapLibre source/controller plus coordinate controls; (4) General/graph shell and shared queued camera; (5) explicit station meaning/anchor confirmation and reviewed illustrative seconds; (6) adapt to existing MRT/AAC requests and bind results to revisions; (7) preserve advanced controls and unsupported evidence states; (8) run the six CLIs, tests, app/strict types and build sequentially; (9) repeat real plot-first/question-first/mobile/race/fallback checks. Follow competition rules on permitted reuse.
