# Phase 3 — Interactive Singapore map

Validated 27 October 2026. This is a local pre-hackathon prototype, not a competition submission or an authoritative transport forecast.

## What works

A local Next.js App Router application displays Singapore geography, the validated 184-station MRT/LRT catalogue, schematic network connections, editable hypothetical stations and before/after journey results. The browser submits version-1 interventions to the existing simulation engine through a Node API. No raw GTFS or full graph is sent to the browser, and none of the existing routing calculations or quarantine rules were changed.

The complete browser workflow was exercised: reset the example, add NS4, place two hypothetical points on the map, add NE16, configure segment times and waiting, run, edit the proposal, and rerun. Users can complete this without editing source files.

## Application architecture

| File / module | Responsibility |
| --- | --- |
| `app/page.tsx`, `app/layout.tsx` | App Router entry, global layout/styles and metadata |
| `components/workspace.tsx` | Ordered line editor, assumptions, service date, journey selection, request lifecycle and results |
| `components/singapore-map.tsx` | Client-only MapLibre map, station selection, draggable proposed markers, layers and geographic fallback |
| `lib/editor.ts` | Pure conversion from editor draft to the actual `MrtIntervention` v1 schema; longitude/latitude helpers |
| `lib/map-contract.ts` | Browser-safe catalogue and compact comparison types |
| `lib/server/mrt-service.ts` | Server-only-by-import-boundary GTFS loading, bounded baseline cache and engine adapter |
| `app/api/network/route.ts` | `GET /api/network?date=YYYY-MM-DD` |
| `app/api/simulate/route.ts` | `POST /api/simulate` |
| `scripts/prepare-map-data.ts` | Reproducible, derive-only local geography preparation |
| `scripts/prepare-map-worker.ts` | Copy the installed MapLibre v6 worker, sibling module and licence to same-origin public assets |

Installed versions are locked in `package-lock.json`: Next 16.4.3, React 19.3.1, MapLibre GL JS 6.16.0, Tailwind 4.3.3 and TypeScript 7.0.2 at implementation time. No hosted database, Vercel, authentication service, LLM, new routing library or citizen engine is introduced. System fonts avoid external font downloads.

The desktop uses a three-pane editor/map/results layout. At narrower widths, panels stack and retain scrollable editing and result controls. Inputs have visible labels, keyboard focus indicators and numeric alternatives to dragging. `ResizeObserver` keeps the geographic canvas aligned with its container. Reduced-motion CSS is respected; map transitions remain short and user-triggered.

## Geography, appearance and attribution

**Default map: local geography, no tile internet requirement.** A custom dark MapLibre style uses all 332 supplied URA Master Plan 2019 subzone polygons, with true longitude/latitude coordinates. These are dated planning boundaries, not a current shoreline, terrain model or a complete street map. The local HDB layer contains all 13,436 supplied footprints. Original geometry types, vertices, rings and holes are retained; positions are rounded to six decimals, approximately 0.11 m at this latitude. No geographic coordinates are invented for existing infrastructure.

Subzone output is about 1.33 MB. Building output is about 23.53 MB; it is requested separately only when buildings are enabled and the map reaches neighbourhood zoom (11.5+), so initial country-view loading does not wait for it. The controls show loading/ready feedback. A performance refinement for a larger deployment would be spatial tiling rather than loading this complete footprint collection.

The HDB source has **no building height/storey field**. Extrusions use a uniform **illustrative 12 m**, visibly labelled in the map. This is decorative miniature styling, not measured building elevation or a population/occupancy estimate. HDB footprints do not cover every Singapore building. Original files, hashes, property fields, date strings and preparation limitations are documented in [map geodata notes](MAP_GEODATA_NOTES.md). Exact government download provenance/licensing for those supplied files remains to be independently verified before redistribution or public use.

**Optional street detail:** the checkbox enables `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, darkened/desaturated through MapLibre raster styling. Browser requests retain normal referrer and HTTP caching; there is no proxy, tile prefetch, bulk download or offline tile archive. Attribution links to **© OpenStreetMap contributors** are visible. OSM data is under [ODbL](https://www.openstreetmap.org/copyright); the public tile service has a separate [usage policy](https://operations.osmfoundation.org/policies/tiles/), limited shared capacity and no availability guarantee. This is an optional low-volume local demo layer, not a production tile-service commitment. Internet is required for those tiles; the core local map/editor/simulation works without them. The tile-failure test deliberately blocked tile requests and did not establish live provider uptime.

MapLibre GL JS is BSD-3-Clause licensed. Version 6 is ESM-only and requires a deliberate worker URL under bundlers; the app serves the installed worker locally and calls `setWorkerUrl` before creating the map, following the [official migration guide](https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/). Copying its sibling module and licence avoids a CDN or mismatched-worker dependency.

## Existing connections and proposed geometry

Station positions/names/IDs and line colours come from the accepted baseline and GTFS route metadata. Existing logical connections are deduplicated for rendering from accepted travel edges, after quarantine. The data contains no verified `shapes.txt` or track alignment. **All displayed network, proposed-line and calculated-route links are station-to-station schematic segments**, never asserted actual rails or engineering alignments. This is stated on the map.

GeoJSON and MapLibre use `[longitude, latitude]`; simulation new-station inputs use `{ lat, lon }`. The pure adapter preserves the order explicitly, and tests verify it. Existing anchor coordinates are resolved from the baseline catalogue; the user cannot replace them. Proposed coordinates are map-selected illustrative locations, not surveyed sites, approved construction or demographic evidence.

## Editor workflow

1. Use the loaded illustrative example or **Reset proposal**.
2. In **Interchange** mode click an existing station on the map, or choose it from the existing-station selector. Adding an existing station explicitly attaches the proposed service to its served line states.
3. In **New station** mode click an empty map location. New points receive clearly hypothetical IDs; drag their numbered markers or edit latitude/longitude and name under the station's details.
4. Add further stations and use up/down buttons to order them. Remove stations as needed. An undo stack retains the last 20 edits, including removed links.
5. Edit each consecutive segment's explicit running and origin-dwell seconds, each existing anchor's walking seconds and the proposed service's boarding wait. New segments start at visible 300 s running + 30 s dwell assumptions. Reordering/removing stations resets affected segment definitions to these defaults and shows a review notice. Changing a position **does not** derive a new journey time from distance.
6. Removing a segment leaves a visible gap and disables simulation; restore it before running because version 1 requires a contiguous line. At least two stations and one existing served anchor are required.
7. Choose a service date and origin/destination, then **Run simulation**. Editing the proposal, date or journey clears the old result. In-flight requests are aborted and revision-checked so an outdated response cannot replace a newer draft.

The original line's schema and calculation assumptions remain [as documented in Phase 2](MRT_HYPOTHETICAL_LINE_SIMULATION.md). There is no automatic snapping by name/proximity, distance-derived running time, opening-date simulation or engineering-feasibility check. Server validation remains authoritative; invalid coordinates, identifiers, references and costs are rejected rather than corrected.

## API and engine integration

`GET /api/network?date=2026-10-27` returns the dated station catalogue, line metadata, logical connections and quarantined-trip count. It excludes raw stop times, trips, source-reference arrays and the graph itself. The server reads the supplied GTFS once per process and caches at most eight dated baseline graphs; returned catalogues are detached from cache internals.

`POST /api/simulate` accepts:

```json
{
  "serviceDate": "2026-10-27",
  "intervention": { "schemaVersion": 1, "...": "actual v1 fields" },
  "journeys": [{ "origin": "NS4", "destination": "NE16" }]
}
```

The abbreviated `intervention` above is explanatory, not a runnable proposal. The editor constructs the full valid shape using `draftToIntervention`; the actual schema lives in `prototype/mrt/scenario.ts`.

The adapter validates dates, JSON, payload shapes, a 40-station proposal limit and up to 20 journey pairs, then calls **the existing `simulateIntervention`**. It never implements another shortest-path algorithm or changes costs. Baseline/scenario use the same service date and retained existing-line assumptions. Invalid request/configuration errors return HTTP 400 with a message; unexpected server errors return safe HTTP 500 messages without stack traces.

Results contain durations, signed saved minutes, signed percentage duration change, transfer counts/change, proposed-line use, outcome statuses and compact route station IDs/coordinates. No raw GTFS, source arrays, whole graph, demographic attributes or demand weights are exposed. Per-journey invalid/unreachable outcomes stay distinct from invalid proposal requests. New hypothetical endpoints produce `station-unavailable` for the baseline, not a made-up zero or infinite saving. A zero baseline produces an undefined/null percentage.

## Verified results

All required commands passed:

| Check | Result |
| --- | --- |
| `npm.cmd run dev` | Ready at `http://127.0.0.1:3000`; actual browser interaction tested |
| `npm.cmd run mrt:validate` | 184 stations, 217 line states, 426 travel + 72 transfer edges; one strong component, zero unreachable existing pairs |
| `npm.cmd run mrt:simulate` | Original illustrative comparisons preserved, including NS4→NE16 at 62.77→20.00 modelled minutes |
| `npm.cmd test` | **43/43 pass**, including all original 37, five adapter/API tests and one complete geodata integrity test |
| `npm.cmd run build` | Production build and TypeScript checking pass; root page, two Node API routes and icon built |
| Independent read-only review | 43 tests and direct TypeScript check pass; no important integration defects identified |

Actual browser verification used Chromium through the Playwright MCP, not a simulated screenshot or assumed interaction:

- At 1440×1000, reset, select NS4, place two map points, select NE16, set first segment to 360 s running and proposed wait to 180 s: **62.77→20.50 min**, with a displayed reduction in transfers.
- Edit a new station's numeric latitude and second segment to 420 s: the previous result clears and rerun yields **22.50 min**. Drag a proposed marker: coordinate changes, prior result clears, and the time stays 22.50 when explicit segment costs are unchanged.
- Remove/restore a segment: run is blocked while disconnected. Enter -5 s running: HTTP validation error is shown; restore 360 s and rerun successfully.
- Reorder and undo; remove a station and undo: order/counts recover and the comparison still runs.
- New-station origin: baseline is visibly unavailable, scenario returns 14.50 min for the example, and savings/percentage remain undefined. Restoring NS4 returns 20.00 min.
- Neighbourhood camera: local HDB footprints load and actual extrusions render. Map canvas resizes with the panel; at 390×844 there is no horizontal document overflow.
- Deliberately aborted optional street tiles: local geography remains interactive and simulation still returns 22.50 min.
- Deliberately blocked MapLibre worker: after the initialisation timeout, a local SVG geography fallback appears; the example still simulates to 20.00 min. The fallback supports map-point placement and existing-station selection plus form edits; it does not provide full 3D/pan/zoom, numbered hypothetical markers or calculated-route overlays. The normal MapLibre view provides those controls/overlays.

Screenshots and MCP logs from verification are local ignored artifacts under `.playwright-mcp/`. Browser verification is not yet a committed CI browser-test suite. Initial MapLibre-v6 default-import/worker failures and a grid-size issue were found during verification and corrected; the final normal map loaded with no browser console errors before deliberate fault injection.

## Rebuild and run locally

Node 24+, the supplied raw GTFS, subzone and HDB files, and an initial npm-registry connection are required. No API key or cloud account is needed for the implemented workflow.

```powershell
npm.cmd ci
npm.cmd run dev
# Open http://127.0.0.1:3000
npm.cmd run mrt:validate
npm.cmd run mrt:simulate
npm.cmd test
npm.cmd run build
```

`predev`, `pretest` and `prebuild` prepare local geography and copy the installed worker automatically; `npm.cmd run prepare:web` does this explicitly. Derived geography/vendor assets, browser logs and `.next` are ignored. Original data is never rewritten. For a local production-mode check, run `npm.cmd start` after a successful build and stop any dev server using the same port first. No deployment was performed.

For the hackathon rebuild, follow the rules on permitted materials: scaffold App Router/TypeScript/Tailwind, reinstall the locked library versions or verify replacements, reconstruct the small contracts/Node adapters around the rebuilt transport engine, derive geography from permitted dated inputs, configure MapLibre v6's worker, then recreate the editor and compact results. Recheck coordinate order and one hand-calculated before/after example before adding animation. The root `AGENTS.md` was generated by Next's development tooling; it is not transport model logic.

## Limitations and Phase 4 handoff

The app is ready to **begin Phase 4 integration** with map positions and calculated route sequences. It does not yet justify demographic-impact claims: population reference years/units, synthetic weighting and home/destination assumptions still need validation first. Citizens should initially move on clearly schematic paths unless reliable track/walking geometry is acquired. No citizens, Gemini, demographic statistics, demand forecasts or eldercare simulation were implemented in this phase.

Remaining limitations include unverified GTFS provenance/timing calibration, empty holiday exceptions, no departure-clock routing, uncalibrated wait/transfer assumptions, no true rail geometry, uniform decorative building heights, dated/partial building coverage, sizeable footprint assets, and incomplete geodata licensing provenance. The revised roadmap retains the committed Phase 4 synthetic citizens, Phase 5 dashboard/Gemini and Phase 6 eldercare / active-ageing centre scenario.
