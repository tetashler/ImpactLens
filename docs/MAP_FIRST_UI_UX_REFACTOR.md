# Map-first UI/UX refactor

Implemented on main `master` from actual HEAD `c8148c5a8a2b512ffa9a638789882b4226016cbf`. The earlier dynamic implementation/live acceptance was already committed at this checkpoint; it was retained. This refactor is unstaged and uncommitted.

Fresh-session building detail threshold: **zoom 14.5**. Render Distance now adjusts it between 16 (Near) and 12.5 (Far); the scale bar has been removed. The historical 300 m reference below is not a clipping radius. See the latest slider section for current behaviour.

## User flow

The root URL opens the persistent Singapore map immediately, with a compact question panel on the right. Primary navigation is **Map / Knowledge Graph / Report**. There is no separate landing or Simulation destination.

Enter a question, optionally open **Plot Tools**, then choose **Explore**. Explore starts the unchanged dynamic pipeline: one planning completion, four fictional agents, up to eight separate action completions, validated history and existing projections. It stays on Map, with compact pending/cancel/error status. A completed current run reveals **View Knowledge Graph** and **View Report**. Partial accepted history receives explicitly partial inspection labels.

The new `mapResultFor()` presentation gate checks the exact question, original geometry, geometry revision and associated run before exposing result links. The existing controller remains responsible for authoritative validation, cancellation, immutable records and A→B→A protection. Navigation performs no inference. Returning to Map clears archive selection, so an archived graph cannot masquerade as the current question's result.

Full accepted-event playback, provider/accounting diagnostics, historical records and synthetic/provenance disclosures remain in Report. Recorded explorations can also be selected from the Map panel. Experiment storage, import/export contracts and the explicit scripted ASEAN implementation remain; their former top-level form surfaces are not part of the normal Map journey.

## Plotting and preserved models

Plot Tools is immediately left of Explore. Its toolbar and drawing inspector are absent from the initial view and do not reserve empty overlay space. Opening it exposes the existing point, station, route, anchor, edit, undo/redo and clear operations. Escape or a second toggle dismisses the tools; there is no separate close button.

Closing tools overrides the map's *presented* interaction mode to exploration without modifying the stored geometry. An unfinished stroke can be reopened and finished or cancelled. Hidden tools cannot add points on an ordinary map click. Geometry edits invalidate current results; selecting or dismissing controls does not discard geometry.

Ordinary point, vertex, MRT and AAC text no longer displays raw coordinates or manual coordinate-entry forms. Friendly labels, role controls, dragging, ordering/removal, exact internal positions, validators and saved/programmatic geometry remain. Technical spatial JSON remains available only through explicit diagnostics/provenance surfaces.

Native numerical models remain separate from qualitative stakeholder dialogue. Optional **Quantitative model controls** interpret a drawing for the existing MRT/AAC confirmation interfaces. MRT still requires explicit station anchors/order and timing assumptions. AAC retains its limited historical catalogue, Census 2020 age targeting, two geographic proxies and comparable/unlocated distinction. Polyclinics never become AAC calculations.

Advanced MRT editing and journey results are shown one at a time, with Review journey / Edit MRT settings navigation. Moving from a plotted result into the advanced editor explicitly replaces its plot binding with an advanced binding; later edits cannot retain obsolete “User-confirmed plot” provenance. No routing, accessibility, demographic or provider semantics changed.

## Removed surfaces and map ownership

Removed normal UI surfaces: Simulation tab; landing/home-return controls; Start new scenario; Edit scenario & drawing; top-level Experiment lab; Try another question; Category hint; the “A question and a place to explore” card; coordinate-entry forms; permanent drawing-status banner; pedestrian focus/play controls; MapLibre zoom/compass stack; duplicate native attribution pill.

The pedestrian implementation/data remain, disabled and paused by default. There is no normal playback UI or scenario-responsive movement claim. The same MapLibre instance, building layers, 2D/3D view, Fit Singapore, map layers, attribution metadata and geographic fallback remain. Wheel/touch navigation is preserved. The map is resized/restored on navigation rather than remounted.

Desktop layout uses a map-dominant grid and a bounded 340–400 px panel. At 1440 px the map measured about 1066 px and the panel 374 px. Mobile stacks a visible map above the question panel. Drawing controls float above the actual measured credit height; they do not cover source links.

## Source and licence presentation

A single dark compact credit row replaces duplicated custom/native attribution. It keeps the linked **© OpenStreetMap contributors** credit visible, plus URA boundary/SODL links, selected building sources and the internal-review label. **Sources & licences** opens a keyboard-accessible native dialog with source-specific attribution, publishers, dates, source/licence links, height assumptions, acquisition gaps and Overture upstream credits.

Terms reviewed:

- [OSM interactive-map attribution guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines)
- [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
- [Singapore Open Data Licence](https://data.gov.sg/open-data-licence)
- [Overture attribution, including Buildings](https://docs.overturemaps.org/attribution/#buildings)

The current source catalogues are reference links, not proof of historical acquisition. The HDB/boundary receipt gaps, unresolved combined-database/ODbL compatibility and potential alteration/database-offer obligations remain explicit. The catalogue is still **local review only**, not cleared for public demonstration, hosting or redistribution. Loopback guards, source metadata, raw files and licence declarations were not changed. This is an attribution presentation review, not new legal clearance.

## Verification

**669 Node tests passed, zero failed/skipped** (653 baseline plus 16 new tests). Application TypeScript, explicit strict checks for the new helper/UI tests, production build and `git diff --check` passed. Existing knowledge/plot/AAC rendering tests were updated to the requested labels and removed coordinate surfaces.

All six deterministic CLIs passed sequentially: `mrt:validate`, `mrt:simulate`, `agents:generate`, `agents:impact`, `eldercare:prepare`, `eldercare:simulate`. GIS was attempted and failed at import because main Python lacks Shapely. No GIS pass is claimed; no dependency or building extraction was installed/run.

Actual production-browser verification used owned loopback port 3154 with fake process-local credentials and the existing network-blocked mock provider preload. **No paid OpenRouter call was made.** The historical live-testing ledger remained at 49 entries.

| Browser check | Observed result |
|---|---|
| Root and primary navigation | Map selected directly; exactly three navigation destinations; no toolbar/result links before a run |
| Optional drawing | Point placement, drag, two-vertex line, Escape, reopening unfinished stroke and finishing worked; hidden tools added no extra point |
| Ordinary coordinate display | Point/drawing/AAC displays and forms omitted raw lat/lon; internal geometry remained intact |
| Explore | Map remained selected; compact status and Cancel; four fixture roles/eight validated actions produced two result links |
| Graph / Report / Map | Graph had four agent/eight event nodes; Report showed eight accepted turns; question, geometry and the same map canvas survived navigation |
| No navigation inference | Mock completion ledger stayed at nine across graph/report navigation |
| Delayed responses | Cancel, question A→B→A and geometry edits each left zero stale result links after delayed completion |
| Failure recovery | Controlled HTTP 503 showed safe error/no completed links; next Explore recovered |
| Archive inspection | Archived events stayed inspectable; returning to current AAC question exposed no unrelated old stakeholder result links |
| Native MRT | Real `/api/simulate` returned HTTP 200; illustrative two-stop proposal gave 62.77→62.77 min, a valid zero-gain result |
| Advanced MRT transition | Plotted request carried confirmed-plot provenance; edit/reorder/rerun returned HTTP 200 without obsolete plot provenance; editor/results did not overlap |
| Native AAC | Real `/api/eldercare/simulate` returned about 44,520 age-targeted / 6,230 comparable / 38,290 unlocated represented residents; no raw site coordinates shown |
| Map gestures | Wheel zoom changed 15.65→16.24 without navigation buttons |
| Responsive | 1920×1080, 1440×900, 1024×900 and 390×844: no horizontal overflow, one canvas, drawer clear of credits |
| Fresh touch session | Map selected, touch placement produced one point, closing tools retained it; zero automatic starts and unexpected console/page errors |
| Sources | Visible credits plus a centred, scrollable mobile dialog with 13 source/licence links; restrictions retained |

The controlled HTTP 503 intentionally generated a browser network error; it was not treated as an unexpected application failure. New clean-context checks had no unexpected errors. Tests use fixtures only in the test preload, not production routing. No new live compatibility claim is made for this UI-only refactor.

Screenshots were captured and visually inspected under ignored `tmp/`: `map-first-final-initial.png`, `map-first-complete-1440.png`, `map-first-{1920,1440,1024,390}.png`, `map-first-tools-*.png`, `map-first-mobile-report.png`, `map-first-mobile-graph.png`, `map-first-fresh-touch-sources.png`, `map-first-mobile-credits-recheck.png`. Earlier captures exposed CSS specificity, panel overlap and footer-clearance issues; these were corrected and rechecked.

## Exact maintained file inventory

New:

- `components/map-scenario-panel.tsx`
- `components/map-first.css`
- `lib/question-simulation/map-view.ts`
- `lib/contracts/tests/map-first-ui.test.ts`
- `lib/contracts/tests/map-surface-ui.test.ts`
- `docs/MAP_FIRST_UI_UX_REFACTOR.md`

Modified:

- `components/workspace.tsx`
- `components/singapore-map.tsx`
- `components/general-plot-panel.tsx`
- `components/general-plot-panel.css`
- `components/plot-toolbar.tsx`
- `components/scenario-composer.tsx`
- `components/eldercare-panel.tsx`
- `components/use-aac-scenario.ts` (error wording only)
- `components/knowledge-workspace.tsx` (Map-return wording)
- `components/building-credits.tsx`
- `components/building-controls.css`
- `lib/plots/map-layer.ts` (accessible hint wording only)
- `lib/contracts/tests/plot-ui.test.ts`
- `lib/contracts/tests/eldercare-ui.test.ts`
- `lib/contracts/tests/knowledge-ui.test.ts`
- `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`

## Reproduction and remaining limits

Run `npm.cmd test`, `npx.cmd --no-install tsc --noEmit`, `npm.cmd run build`, `git diff --check` sequentially. For unpaid browser QA after build:

```powershell
$env:OPENROUTER_API_KEY='mock-browser-only'
$env:STAKEHOLDER_LIVE_ENABLED='true'
node --import ./scripts/testing/dynamic-provider-preload.mjs node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3154
```

Use the existing workweek fixture question for mocked inference. The real configured application retains arbitrary-question dynamic planning; the test preload's finite fixtures do not restrict production questions. Do not use the preload as live-provider evidence.

Street tiles remain an external best-effort service. Existing building/data/licensing and native model limitations remain. Free point placement uses the map; numeric entry was intentionally removed, while keyboard controls and existing-station search remain. Current dynamic runs/history retain their prior bounded session lifetime; this refactor adds no persistence or cross-device sync. Existing experiment persistence/contracts are untouched.

Frontend-design, TDD, systematic debugging, parallel scoped implementation and independent review were used. Playwright MCP supplied browser interaction/screenshots; official source terms and local Next.js guides were consulted. Independent review caught the CSS cascade, overlapping advanced panels and stale plot provenance; final review found no remaining confirmed important regression.

No credentials, raw datasets, simulation formulas, provider contracts or secondary directory were changed. Nothing was staged, committed, pushed or deployed.

## Follow-up: map controls and wider 3D range (29 October 2026)

### Controls and footer

`observeMapControlLayout()` measures the actual map frame, scale control, footer inset, upper camera controls and mounted plotting toolbar. ResizeObserver handles wrapping and viewport changes; MutationObserver detects toolbar mounting/removal. One scheduled animation-frame measurement updates CSS custom properties. Both observers and any pending frame are disposed on unmount. There are no toolbar-height constants or polling loops.

Map Layers sits 10 px above the toolbar when open, and 10 px above the scale when closed. Expanded layers use the available height below the top camera controls and scroll internally. At 1024 px the toolbar wrapped from about 90 to 135 px; the layers control followed it without overlap. Mobile horizontal toolbar scrolling remains available. The separate **Close Plot Tools** button is removed. Toggle and Escape retain points and unfinished lines; hidden tools present exploration mode.

The footer no longer displays **Internal local review only**. Visible OSM attribution, URA/SODL and HDB/URA/Overture credits remain, with the same accessible Sources & licences dialog. The dialog still contains source-specific licence links and the public-demonstration/redistribution restriction. `distribution: 'local-review-only'`, loopback enforcement, source receipts and all acquisition/licence caveats remain unchanged. This presentation change provides no new distribution clearance.

### Actual building limitation and correction

The existing unified manifest contains 234,739 footprints in 1,119 chunks (176,643,869 JSON bytes). Two independent restrictions caused the old cutoff:

- The loader cleared its source below manifest zoom 14, and the extrusion layer also started at 14.
- Above that zoom, any viewport intersecting more than 32 chunks **or** exceeding 12 MB cleared every building. Rotation could therefore blank an otherwise usable neighbourhood view. At zoom 15.65, bearing 0 intersected 33 chunks / 7.14 MB and showed none; bearing -18 showed 3,596 source features.

The application now explicitly uses display zoom **12.5**. Manifest validation and the original manifest's preparation metadata remain unchanged. Instead of clearing oversized views, `selectBuildingChunks()` prioritises existing intersecting chunks near the camera target, with deterministic ID tie-breaking, a maximum of 64 chunks and the **unchanged 12 MB active-byte limit**. Three concurrent fetches, the 12 MB LRU, checksums, provenance validation, cancellation/revision guards and one source/extrusion layer remain. Geographic ranking is only a display priority, not a distance/accessibility calculation. Height values and polygons are not rewritten.

When capped, the collapsed control says **limited detail**; expanded status gives selected/candidate chunk counts and explicitly states incomplete coverage. Broader views retain central detail rather than claiming a complete island inventory. Panning selects detail around the new camera target. Below 12.5, the overview still omits unified extrusions. The source's existing `maxzoom: 16` is GeoJSON tiling detail, not the original zoom-out cutoff. No new datasets or fake buildings were introduced.

### Actual browser evidence

Comparisons used the real persistent application map, centre `[103.829, 1.285]`, pitch 52°, bearing 0°, 1440×900. Counts are sampled source features and distinct rendered `properties.id` values, not demographic coverage or inventory totals.

| Zoom | Before: source features | After: source features | After: distinct rendered footprints |
|---|---:|---:|---:|
| 15.65 | 0 | 3,257 | 2,358 |
| 14 | 0 | 12,404 | 11,268 |
| 13.5 | 0 | 12,610 | 12,554 |
| 12.5 | 0 | 12,610 | 12,610 |

The wider source extent was `[103.7997323, 1.2597508, 103.8606443, 1.3101918]`, approximately 6.8 × 5.6 km, versus the roughly 2.9 × 3.1 km source extent in the old successful bearing -18 neighbourhood sample. This is bounded local detail at a broader camera view, not whole-island extrusion coverage. Source geography remains aligned with street geometry; exact retained geometry/height is additionally covered by regression tests.

Warm ready/source-load samples were 449 ms at 15.65, 1,547 ms at 14, 1,187 ms at 13.5 and 1,070 ms at 12.5. A separate 2.53-second transition to 12.5 recorded 41 timer samples, a maximum 279.5 ms interval, four long tasks and a longest task of 248 ms. Brief parsing/loading stutter remains; these are short observations, **not sustained FPS claims or low-end-device guarantees**. An initial long-lived automation browser became unresponsive and was restarted; fresh-session checks were used to distinguish that incident from the measured loading behaviour. Screenshot/automation turnaround is excluded from the load timings.

Playwright checked 1920×1080, 1440×900, 1024×900 and 390×844. All four had a 10 px toolbar/layers gap, about 10 px closed layers/scale gap, no horizontal document overflow, no redundant close button and no footer phrase. Actual toolbar resizing and in-progress route controls were exercised. A point and unfinished two-vertex line survived toggle/Escape; a map click with tools closed added no point. The mobile licence dialog stayed within the viewport, exposed 13 links and retained the distribution warning. One MapLibre canvas remained mounted.

Local screenshots were visually inspected: `tmp/map-polish/before-z*.png`, `after-z{15.65,14,13.5,13,12.5,11.5}.png`, `tools-{1920,1440,1024,390}.png`, `closed-{1920,1440,1024,390}.png`, `mobile-sources.png`, `final-desktop.png` and `final-mobile.png`. They are ignored local review artifacts, not published or staged building assets. A fresh-context desktop/mobile check against the final production build recorded no console/page errors, one canvas and no horizontal overflow. The final desktop capture additionally waited for actual rendered footprints, not only the loader's ready state; worker tiling can finish after source submission. Browser testing used the network-blocked mock preload above on port 3155; no paid inference occurred.

### Follow-up validation and exact changed paths

- **679 Node tests passed**, zero failures (669 prior baseline plus ten focused layout/selection/layer tests). Focused building/session/layout/source checks: 32 passed. Existing source-row assertions now require the ordinary footer phrase to be absent and the disclosure restrictions to remain.
- Application TypeScript, explicit strict TypeScript for the new helper/loader/selector and their tests, production build and `git diff --check` passed.
- All six model CLIs passed sequentially. Eldercare preparation initially hit a sandbox EPERM on its existing derived output and passed on the authorised access retry; raw inputs/formulas were not changed.
- GIS runner attempted: **unavailable**, `ModuleNotFoundError: No module named 'shapely'`. No GIS pass is claimed and no dependency was installed.
- Independent read-only review found no confirmed important issue in budgets, lifecycle, layout or provenance.

New paths in this follow-up: `components/map-control-layout.ts`, `lib/buildings/display-policy.ts`, `lib/contracts/tests/map-control-layout.test.ts`, `lib/contracts/tests/building-display-policy.test.ts`.

Updated paths in this follow-up: `components/workspace.tsx`, `components/map-first.css`, `components/building-credits.tsx`, `components/singapore-map.tsx`, `lib/buildings/layer.ts`, `lib/contracts/tests/building-layer.test.ts`, `lib/contracts/tests/map-surface-ui.test.ts`, and this document. The earlier refactor's other pending files are preserved.

Rebuild with the same sequential commands and mocked server procedure above. No Overture acquisition/preparation, licence change, raw-asset publication or model/provider change is required. Git remains unstaged and uncommitted on the same main HEAD; private environment and unified manifest checksums were retained.

## Subsequent adjustment: closer-range building detail

The minimum display zoom is now **14.5**, increased from 12.5. At the inspected 1440×900 Tiong Bahru view (centre `[103.829,1.285]`, pitch 52°, bearing 0°), both zoom 14 and 14.5 showed a 300 m scale bar. The closer 14.5 view was selected; zoom 13.5 showed 500 m and zoom 15 showed 200 m. Scale labels vary with camera/view configuration and do not define building coverage.

Only the camera visibility gate changed. No circle, 300-metre radius, centroid-distance filter, polygon clipping or geographic data rewrite was added. Existing viewport intersection, deterministic bounded chunk prioritisation, 64-chunk / 12 MB selection cap, three fetch workers, checksums, cache and lifecycle guards remain. The old budget-triggered clear-everything behaviour was not restored. Building heights, polygons, attribution and licensing restrictions are unchanged.

The unified application's loader and extrusion minzoom both use 14.5. The optional HDB extrusion view uses the same threshold. Below it, unified active geometry is cleared and overview status requests a closer zoom; retained cache permits reuse on returning. Library override validation now permits a stricter display zoom than the manifest's preparation minimum, up to the application's existing maximum camera zoom 20; historical explicit 12.5 overrides and default manifest behaviour remain compatible. The production UI explicitly requests 14.5.

Actual Playwright results after the change:

| Zoom | Scale label | Unified source features | Distinct rendered footprints |
|---|---|---:|---:|
| 13.5 | 500 m | 0 | 0 |
| 14 | 300 m | 0 | 0 |
| 14.49 | 300 m | 0 | 0 |
| 14.5 | 300 m | 13,814 | 9,674 |
| 15.65 | 100 m | 3,257 | 2,358 |

At supported zoom 14.5, a pan retained 15,055 source features / 11,863 distinct rendered footprints rather than blanking the viewport. A subsequent mouse-drag pan also retained rendered buildings. Plan/3D switching reached pitch 0° and 48° correctly, with one map canvas. HDB fallback separately rendered zero rows at 14.4 and 540 at 14.5. No horizontal overflow was observed in the desktop interaction check. No simulation, graph or report behaviour changed.

A 2.51-second in-page zoom/pan sample recorded 38 timer samples, a maximum interval of 550 ms and two long tasks (longest 454 ms), reaching ready status. Brief loading hitches remain; this is not a sustained FPS claim. End-to-end automation/readback waits varied roughly 10–37 seconds during the comparison, so they are not presented as CPU rendering times or proof of consistently fast loading. No claim is made that this threshold alone fixes all existing map performance limitations.

Before/after screenshots were visually inspected under ignored `tmp/building-close-range/`: `before-z{13.5,14,14.5,15}.png` and `after-z{14,14.5}.png`. The zoom-14 screenshots demonstrate removal of distant detail; the zoom-14.5 screenshots confirm that supported close-up detail remains geographically unchanged. All browser checks used the owned loopback production server with network-blocked inference mocks; no paid inference occurred.

Regression: **680 Node tests passed**, zero failures; 25 focused building/selection/session tests passed. The new test first failed against the old cutoff, then passed after the change, checking hide/show boundaries, original geometry, cache reuse and one source/layer. Application TypeScript, strict affected-module/test TypeScript, production build and diff checks passed. GIS and model CLIs were not rerun for this display-only adjustment; their preceding results and GIS dependency limitation remain recorded above.

Exact files changed in this adjustment: `lib/buildings/display-policy.ts`, `lib/buildings/layer.ts`, `components/singapore-map.tsx`, `lib/contracts/tests/building-layer.test.ts`, and this document. All earlier uncommitted work was preserved. No source data, private environment, inference path, secondary directory or Git index was modified.

## Render Distance slider and scale-free control layout

This change starts from clean main HEAD `af2da92`, which already committed the preceding refactor and closer-range adjustment. Its own changes remain unstaged and uncommitted.

### Control layout

Removed the actual `ScaleControl` registration, rather than hiding its element. There is no scale-control lifecycle or scale measurement left in the map UI. Map Layers sits 10 px above the frame/footer boundary when tools are closed. With Plot Tools open, the toolbar sits 10 px above the measured footer, and Map Layers sits 10 px above the actual toolbar. ResizeObserver still measures frame/footer and toolbar wrapping; the expanded layers panel's available height accounts for the top controls. Deleted scale clearance is no longer reserved. Source/licence credits and their dialog remain unchanged.

**Render Distance** is immediately after Fit Singapore in the same dark control bar. The native range has a visible label, keyboard input, Near/Far endpoints, qualitative current-value text, visible focus and screen-reader help. Controls can wrap within the map width. No metre distances or clipping radii are implied.

### Mapping and live updates

The browser-safe display policy defines eight rightward positions:

| Slider position | Minimum building zoom |
|---:|---:|
| 0 — Near | 16 |
| 1 | 15.5 |
| 2 | 15 |
| 3 — Default | 14.5 |
| 4 | 14 |
| 5 | 13.5 |
| 6 | 13 |
| 7 — Far | 12.5 |

Mapping: `16 - position / 2`. Invalid, fractional or out-of-range positions are rejected. The displayed value updates immediately; effective layer changes are debounced by 180 ms. Five rapid test inputs ending at Default produced one applied update, about 183 ms after the final input. One Far update was observed at 232 ms under load.

`BuildingLayer.setMinZoom()` changes the existing extrusion's zoom range and refreshes the existing viewport source. It uses [MapLibre's layer zoom-range API](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#setlayerzoomrange), **not the map camera's minimum zoom**. Cache, checksums, three fetch workers, 64-chunk / 12 MB unified active-selection budget, revision guards and abort behaviour remain. No footprints, heights or geographic clipping rules changed. Existing limited-detail disclosure remains at Far.

`BuildingCatalogueSession.setMinZoom()` retains the latest value during pending manifest requests and hide/show transitions. Its layer factory receives the current threshold as a third argument. Existing handles expose the setter without replacing the layer. HDB creation and existing HDB extrusions use the same effective threshold.

The slider and applied threshold live in the persistent SingaporeMap component, separate from question, plotting and execution state. A fresh application load defaults to 14.5. Plot Tools, Map Layers, question edits, completed runs and Map/Graph/Report navigation do not reset it. No local storage or new persistence infrastructure was introduced. The debounce timer is cleared on cleanup, and disposed layer/session setters cannot revive rendering.

### Actual browser acceptance

Real local map assets and the existing network-blocked inference preload were used on owned loopback port 3155. No paid requests occurred.

- At fixed zoom 13.5: Default loaded zero unified features; Far loaded 12,610 source footprints and rendered 9,082 distinct IDs in the sampled frame; Near cleared them to zero. The camera stayed at 13.5 throughout. Near rendered buildings again at zoom 16.1 (1,274 rendered rows in the sample).
- The same MapLibre object, canvas and unified source survived threshold changes. The camera's minimum zoom remained 9. Threshold edits changed neither geometry nor height properties; focused tests compare original data and paint settings.
- HDB at fixed zoom 13.5 rendered zero rows at Default, 1,825 at Far, and zero at Near. Its effective threshold matched the hidden unified layer in all three cases.
- A point survived slider changes and a full mocked exploration: one mock planning call plus eight mock action calls completed. Question, point, completed result and Far value survived Map → Knowledge Graph → Report → Map. Navigation and later render-distance changes left the mock ledger at nine calls; this is not live-provider acceptance evidence.
- Mouse panning and Plan/3D switching remained functional (pitch 0° / 48°).
- 1920×1080, 1440×900, 1024×900 and 390×844 all had zero scale elements and no horizontal document overflow. Closed layers/footer gap and open toolbar/footer + layers/toolbar gaps were approximately 10 px. Toolbar heights changed from about 90 px to 135 px when wrapped at 1024; mobile used the existing horizontally scrollable plotting row. Controls did not overlap. Fresh final-build checks recorded no console/page errors and one canvas.

A 3.06-second in-page Far-loading sample reached ready state, recording 49 timer samples, a maximum interval of 348 ms, three long tasks and a longest task of 327 ms. Brief loading hitches remain; this short observation establishes neither sustained FPS nor a guarantee for low-end hardware. No extra background rendering loop or unbounded Far loading was added.

Visually inspected ignored local screenshots: `tmp/render-distance/far-z13.5.png`, `near-z13.5.png`, `tools-{1920,1440,1024,390}.png`, and final-build `final-{1920,1440,1024,390}.png`. They remain local review artifacts and are not staged or published.

### Validation and file inventory

**685 Node tests passed**, zero failures, including 38 focused building/session/layout/source/slider checks. New tests first failed before implementation and now cover mapping/default, invalid positions, in-place source/layer updates, unchanged camera/data/paint, cached restoration, delayed-load rejection and pending-manifest threshold retention. Updated layout tests remove all scale assumptions; SSR checks the accessible default slider. Application TypeScript, strict affected-module/test TypeScript, production build and `git diff --check` passed.

Numerical model code was not changed; six model CLIs and GIS were not rerun for this display-only adjustment. The previously documented missing-Shapely limitation is unchanged; no GIS pass is claimed.

New files: `components/render-distance-control.tsx`, `lib/contracts/tests/render-distance.test.ts`.

Modified files: `components/singapore-map.tsx`, `components/map-control-layout.ts`, `components/map-first.css`, `lib/buildings/display-policy.ts`, `lib/buildings/layer.ts`, `lib/buildings/session.ts`, `lib/contracts/tests/building-layer.test.ts`, `lib/contracts/tests/building-session.test.ts`, `lib/contracts/tests/map-control-layout.test.ts`, `lib/contracts/tests/map-surface-ui.test.ts`, and this document.

Rebuild and use the same sequential commands/mock server procedure above. Environment and unified-manifest checksums remain unchanged. No inference semantics, simulation formulas, Graph/Report implementation, raw datasets, licences, dependencies or secondary directory were modified. No Git staging, commit, push or deployment occurred.
