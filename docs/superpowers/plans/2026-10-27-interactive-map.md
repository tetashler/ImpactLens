# Phase 3 interactive map implementation plan

**Spec:** User's Phase 3 request and existing revised roadmap. Preserve baseline engine and all 37 tests; no raw-data writes, citizens, Gemini, deployment, commits or pushes.

**Architecture:** Next App Router/TypeScript/Tailwind local app. Three-pane laptop workspace: ordered infrastructure editor, MapLibre geographic canvas, journey comparison. Node API caches dated baseline graphs and calls existing simulation. Client receives only catalogue/compact results; pure editor adapter converts the actual v1 schema and GeoJSON lon/lat. No routing calculation in the browser.

**Visual direction:** Deep marine canvas #0b171e, slate surfaces #14232c, pale text #e5eef0, muted blue #91a7b4, cyan existing/interaction #71d6d0, coral hypothetical #ffac79. Humanist system Segoe UI for offline typography, tabular numerals for durations. Quiet controls around a geographically distinctive Singapore map; no marketing sections or invented impact statistics. Responsive stacked panels, keyboard-labelled form controls and reduced motion.

**Map data:** Actual 332 local subzone polygons and all 13,436 HDB footprint geometries, stripped properties/rounded6decimals, hashes recorded. No source building heights: fixed12m is decorative extrusion, explicitly labelled. No source rail alignments: baseline logical connections and proposed links are labelled schematic. Default local geographic style works without tile internet; optional low-volume OSM raster street detail preserves attribution/browser referrer/cache and avoids prefetch. No CARTO key assumption (current terms require issued keys).

## Tasks

1. Read engine/docs/data and verify baseline. Install necessary Next/React/MapLibre/Tailwind/TypeScript dependencies, preserving scripts/tests; add dev/build/start and map-data regeneration scripts.
2. Backend/editor worker: strict runtime payload checks and compact DTO, bounded dated graph cache, GET network and POST simulate; test conversions, real/fixture calculations, limits and no mutable cache leaks before completion.
3. Geodata worker: reproducible derive-only script, local public geometry/manifest, coordinate and raw-hash integrity tests.
4. Frontend: map controls/station hover/selection, new point placement/drag/numeric coordinate edits; ordered station add/move/remove and segment disable/restore; undo/reset/example; explicit run/dwell/walk/wait/date settings; origin/destination selects, stale-result invalidation, errors/loading and modelled comparison.
5. Verify actual browser create/configure/run/change/rerun flow; responsive screenshot and no-WebGL/tile-failure fallback. Run original validation/demo, full tests and Next build. Document actual outcomes and limits; update existing roadmap preserving Phases4–6 and README. Do not mark missing validation complete.

**Runtime assumptions:** Static service-date model only, no departure clock or time-from-distance. New link defaults are visible explicit assumptions. Removing a segment blocks simulation until restored (v1 requires contiguous line). Editing/resetting invalidates prior results; stale requests cannot replace newer draft state. All new map points are hypothetical.

**Execution:** Inline frontend with two scoped independent workers for API/conversion and geodata. No worktree or source-control mutations requested. Test/build and browser evidence determine completion.

## Completion evidence

- API/editor worker completed test-first adapters/routes and five focused tests; geodata worker preserved all polygons/vertices, recorded input/output hashes and added a full coordinate integrity test.
- Next 16.4.3/React 19.3.1/MapLibre 6.16.0/Tailwind 4.3.3 installed with lockfile. MapLibre-v6 namespace export and explicit local worker requirements corrected based on actual build/browser errors. A grid min-size issue was diagnosed using DOM dimensions and corrected with bounded grid rows, zero child min-height and ResizeObserver.
- Browser reset/add/place/configure/run/edit/drag/rerun verified; 20.50 and 22.50-minute custom results matched explicit segment inputs. Undo/removal/disconnected blocking, negative-value errors and unavailable baseline outcomes verified. Actual HDB extrusions rendered. 390px layout had no horizontal overflow. Fault-injected tile and worker failures retained local editing/calculation.
- All 43 automated tests pass, including original 37. Existing validation/demo commands pass. Production build and TypeScript checks pass. Independent read-only integration review found no important defects; partial SVG fallback overlay/3D limitations are documented.
- Wrote implementation/geodata docs and updated README and the existing roadmap. All eight phases retained; Phase4–6 text preserved unchanged. No raw data or core engine calculations changed; no staging, commits or pushes.
