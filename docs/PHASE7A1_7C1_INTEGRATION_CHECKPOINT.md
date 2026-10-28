# Phase 7A.1 / 7C.1 integration checkpoint

**Approved checkpoint follow-up:** The user subsequently authorised one local 71-path checkpoint commit and backup-verified, targeted reconciliation of Terminal 2's 25 original pending files before a fast-forward-only synchronisation. Earlier unstaged/no-Git statements below record the original integration review. Fresh checkpoint verification passed 343 tests (zero failures), application TypeScript and the production build. The external preservation manifest records every original file hash and intentional difference; the completion response records the backup location, resulting commit and final branch state. No push, public release, raw-data modification or new feature work is authorised. Retrieve this checkpoint's hash with `git log -1 --format=%H -- docs/PHASE7A1_7C1_INTEGRATION_CHECKPOINT.md`.

Terminal 3, 28 October 2026 (Singapore). **Phase 7A/7A.1 and 7C/7C.1 are integrated and validated for the scoped internal local review.** Final post-fix tests/build, actual production-browser checks and preservation/security checks passed as recorded below. Filesystem integration is authorised; all Git mutations, staging, commits, branch updates and synchronisation are explicitly prohibited in this task. All changes remain unstaged and uncommitted. No public deployment or public demonstration is approved.

Evidence: the eight requested sources are [Phase 7A](PHASE7A_SCENARIO_FIRST_UI_IMPLEMENTATION.md), [Phase 7A.1](PHASE7A1_GENERAL_MAP_PLOTTING_IMPLEMENTATION.md), [ScenarioPlan contract](SCENARIO_PLAN_CONTRACT.md), [central roadmap](IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md), [7C source audit](PHASE7C_BUILDING_SOURCE_AUDIT.md), [7C implementation](PHASE7C_BUILDING_FIDELITY_IMPLEMENTATION.md), [7C.1 report](PHASE7C1_ISLANDWIDE_BUILDING_COVERAGE.md) and [Terminal 3 guide including its 7C.1 addendum](PHASE7C_TERMINAL3_INTEGRATION_GUIDE.md). Source/code inspection and read-only Git checks supplement their historical evidence. Earlier isolated-worktree measurements are not relabelled as integrated results.

## 1. Initial Git and worktree state

| Worktree | Branch | Initial HEAD | Initial pending maintained paths |
| --- | --- | --- | ---: |
| `ImpactLens` (Terminal 1/main) | `master` | `4400f47268663a848ca59d55c6f140dda80c97cc` | 41 |
| `ImpactLens-agents` (Terminal 2) | `feature/synthetic-population` | same | 25: 22 new, 3 tracked modifications |

Both worktrees were dirty. Their matching HEADs do not include either uncommitted implementation. The original per-worktree file/raw hashes and private environment-file digest are recorded in `%TEMP%/impactlens-7a1-7c1-snapshot.json`; environment values are not included here. All 14 original raw hashes per worktree matched that snapshot initially and in the final audit. Known byte differences between worktrees remain intentional and must not be normalised by copying raw data. Final read-only checks confirm both HEADs still equal `4400f47268663a848ca59d55c6f140dda80c97cc`, zero staged paths and no unfinished Git operation. Main has exactly the 71 maintained paths inventoried below. Terminal 2 retains all 25 original pending paths with unchanged file hashes and remains unsynchronised.

## 2. Terminal 1 maintained inventory retained

These are the 41 initial main-worktree pending paths, including its pre-existing roadmap changes. The main backup preserves their original bytes before integration. Final comparison confirmed unrelated original bytes unchanged; intended subsequent edits are confined to the map, workspace and roadmap within this initial inventory.

```text
README.md
app/layout.tsx
components/eldercare-panel.tsx
components/general-plot-panel.css
components/general-plot-panel.tsx
components/general-workspace.css
components/knowledge-workspace.tsx
components/plot-toolbar.tsx
components/scenario-composer.tsx
components/scenario-experience.css
components/scenario-plan-view.css
components/scenario-plan-view.tsx
components/singapore-map.tsx
components/use-aac-scenario.ts
components/use-scenario-planner.ts
components/use-scenario-plot.ts
components/workspace.tsx
docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md
docs/PHASE7A1_GENERAL_MAP_PLOTTING_IMPLEMENTATION.md
docs/PHASE7A_SCENARIO_FIRST_UI_IMPLEMENTATION.md
docs/superpowers/plans/2026-10-28-general-map-plotting.md
docs/superpowers/plans/2026-10-28-scenario-first-ui.md
lib/contracts/tests/map-camera.test.ts
lib/contracts/tests/plot-adapters.test.ts
lib/contracts/tests/plot-execution.test.ts
lib/contracts/tests/plot-geometry.test.ts
lib/contracts/tests/plot-map-layer.test.ts
lib/contracts/tests/plot-ui.test.ts
lib/contracts/tests/scenario-client.test.ts
lib/contracts/tests/scenario-presentation.test.ts
lib/eldercare/map-layer.ts
lib/map-camera.ts
lib/plots/adapters.ts
lib/plots/execution.ts
lib/plots/geometry.ts
lib/plots/map-layer.ts
lib/plots/store.ts
lib/scenarios/client.ts
lib/scenarios/presentation.ts
scripts/testing/phase7a-browser-check.mjs
scripts/testing/phase7a1-browser-check.mjs
```

## 3. Terminal 2 maintained inventory

Exactly 22 new maintained files were transferred from Terminal 2:

```text
docs/PHASE7C1_ISLANDWIDE_BUILDING_COVERAGE.md
docs/PHASE7C_BUILDING_FIDELITY_IMPLEMENTATION.md
docs/PHASE7C_BUILDING_SOURCE_AUDIT.md
docs/PHASE7C_TERMINAL3_INTEGRATION_GUIDE.md
lib/buildings/contract.ts
lib/buildings/layer.ts
lib/buildings/prepare.ts
lib/contracts/tests/building-layer.test.ts
lib/contracts/tests/building-unified.test.ts
lib/contracts/tests/buildings.test.ts
lib/contracts/tests/fixtures/hdb-shared-roofs.json
lib/contracts/tests/fixtures/ura-buildings.json
scripts/buildings/acquire.py
scripts/buildings/conflation.py
scripts/buildings/prepare_unified.py
scripts/buildings/requirements.txt
scripts/prepare-buildings.ts
scripts/prepare-unified-buildings.ts
scripts/testing/phase7c-browser-check.mjs
scripts/testing/phase7c1-browser-check.mjs
scripts/testing/prepare-building-harness.ts
scripts/tests/test_building_conflation.py
```

Terminal 2's three tracked modifications are `.gitignore`, `package.json` and `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`. They are reconciled as separate edits, not whole-file replacements. The transfer does not modify Terminal 2.

## 4. Exact filesystem transfer operations

The original main pending files were backed up under `%TEMP%/impactlens-7a1-7c1-backup-9d2b643ad2d440a5912922d3c2998282`. `%TEMP%/impactlens-7a1-7c1-transfer.json` records that backup and the exact 22 transferred paths. Each transferred file was hash-checked against its source before local integration fixes. Those fixes intentionally make the main adapter/tests differ from the original Terminal 2 copies; the source worktree remains untouched.

Only the current manifest's 1,119 content-hashed chunks, the unified manifest, five audit/licence sidecars and two safe acquisition receipts were copied into ignored main-worktree locations. No raw geometry extract, Python environment, source signed-URL response, partial download, screenshot, cache or unrelated temporary tree was copied. `tmp/phase7c/raw/poll.json` was excluded because it contains a temporary signed AWS URL; its contents were not read for this report. No expensive re-extraction or full preparation was repeated.

New integration-maintained paths are:

```text
components/building-controls.css
components/building-credits.tsx
lib/buildings/session.ts
lib/contracts/tests/building-session.test.ts
scripts/testing/phase7a1-7c1-browser-check.mjs
docs/PHASE7A1_7C1_INTEGRATION_CHECKPOINT.md
```

## 5. Reconciled tracked files

`package.json` adds only `buildings:download`, `buildings:prepare` and `buildings:unified`, preserving existing scripts. No npm dependency or lockfile change is required. `.gitignore` adds `__pycache__/` and `*.pyc` while preserving existing exclusions. `components/singapore-map.tsx` is extended from Terminal 1's version rather than replaced with the older Terminal 2 map. Its companion `components/workspace.tsx` removes the obsolete HDB-only map note in favour of current-source credits owned by the integrated map.

The root integrator reconciled the central roadmap, retaining Terminal 1's 7A/7A.1/7G and reliability work while incorporating the 7C/7C.1 internal-review checkpoint and this integration report. Public-release licensing and full Phase 7 remain unresolved. Its original copy was read and backed up before editing.

## 6. MapLibre integration and resource ownership

One existing `SingaporeMap` remains mounted across landing, General, calculation/results and Knowledge Graph navigation. A `BuildingCatalogueSession` owns the bounded manifest request and one `BuildingLayer`; the adapter owns chunk requests, cache, its source/layer and map listeners. It is inserted before `network-lines`, preserving rail annotations, universal plot layers, AAC DOM markers and the existing citizen layer. No second map, camera command, global lighting/terrain change or render loop is introduced by buildings.

The session guards the exact loaded map identity, visibility, monotonic request revision, abort state and disposal after asynchronous boundaries. It rejects a manifest above 1 MB, requires all three source registry entries and `local-review-only`, and refuses non-loopback hosts before fetching. Cleanup aborts requests and disposes the adapter before `map.remove()`. Rapid hide/show and an abort-ignoring old manifest cannot install an obsolete layer.

A focused adapter regression first reproduced missing-extrusion recovery as a failing test. Registration now recreates a removed owned layer without duplicating an existing source. In the integrated browser, removing the owned `sg-buildings-extrusion` layer and `sg-buildings` source, then firing `style.load`, recovered exactly one source/layer. This proves scoped owned-resource recovery; it does not establish support for arbitrary whole-map style replacement or every browser/GPU context-loss behaviour. Hiding, retry, stale requests and owned-resource disposal retain their bounded adapter rules.

## 7. Explicit HDB fallback

Map layers offers **Unified Singapore — internal review only** and **Existing HDB — limited footprint coverage**. Switching first hides the current extrusion; the old HDB effect only loads/shows while explicitly selected. The unified adapter and legacy HDB layer are never displayed together. The fallback still uses supplied local footprints and illustrative 12 m heights. Its missing acquisition receipt remains visible; it is not automatically cleared for public release.

Failure of unified assets keeps geography, plotting and other engines usable, exposes Retry and permits explicit HDB selection. It does not silently substitute HDB while claiming unified coverage. Below unified zoom 14, the viewport shows an overview explanation instead of pretending buildings are absent from the source.

## 8. Catalogue identity and checksum

| Quantity | Reviewed value |
| --- | ---: |
| Selected footprints | 234,739 |
| HDB / URA / Overture | 13,209 / 1,912 / 219,618 |
| Direct-source / floor-derived / illustrative heights | 2,392 / 20,610 / 211,737 |
| Referenced chunks | 1,119 |
| Referenced chunk bytes | 176,643,869 |
| Manifest bytes | 339,308 |
| Largest chunk bytes | 1,495,366 |

Unified manifest SHA-256: `5ab917ca747b51527868499c58ac6ecc21c82dd8897d3243ed9ff52ef0bfc32b`. Full TypeScript emitted-data validation in main checked all 234,739 feature geometries, allowed source IDs, unique IDs and every referenced chunk size/hash. A separate aggregation over all 176,643,869 referenced chunk bytes reproduced the source and height-basis totals above. The explicit local preview copy passed and its manifest has the same hash. These are source-footprint counts, not occupied structures, residents, completeness percentages or viewport render counts.

## 9. Ignored assets, raw inputs and regeneration

Main now has the validated manifest and its 1,119 referenced chunks under `tmp/phase7c1/derived/`, alongside `audit.json`, `conflation.json`, `exclusions.ndjson`, `provenance.ndjson` and `LICENSING.txt`. Safe receipts are `tmp/phase7c/raw/retrieval.json` and `tmp/phase7c1/raw/overture-2026-10-21.0.receipt.json`. Local review assets are explicitly copied to `public/geography/buildings-v1/`: referenced chunks, `unified-manifest.json` and `UNIFIED-LICENSING.txt`. The historical URA `manifest.json` is not overwritten by that command. Normal predev/prebuild does not regenerate this unified preview.

The original HDB and geographic boundary remain in their own existing data paths. The reviewed URA raw file and 251,956,060-byte Overture raw extract remain only in Terminal 2's ignored raw directories; main has their safe receipts, not their geometry. Their pinned SHA-256 values are respectively `ab97c16df4a76456c8551cc34b28f8ff0ec0285b6b5bb8487bb001e2434c691c` and `f578855d9484ed6b35419dff24b4fb837a725cd2951056266d007c2b6b1ad88e`. They require separately coordinated safe transfer or pinned reacquisition for a full main-worktree rebuild. Git alone will not carry ignored artifacts.

The repeated final security audit confirmed all 14 original raw-input hashes in each worktree unchanged, both private environment files unchanged/ignored/untracked/unstaged, and no credential-value match in intended maintained files or the 12 inspected production client JavaScript assets. `git diff --check` passed; only LF/CRLF informational warnings remained. Private values are not printed here. Terminal 2's final maintained-file comparison confirmed all 25 original pending paths and their hashes unchanged. Main's manifest remained exactly 339,308 bytes at the recorded SHA-256. A separate final check hashed all 1,119 public preview chunks and verified their 176,643,869 bytes against the manifest. No implementation or generated asset changed after these checks.

## 10. Loading, error and status behaviour

The UI distinguishes waiting, loading, ready, hidden, overview and error. Ready status identifies selected viewport footprints/chunks and incomplete coverage. Controls and source details explain mixed height evidence. Legacy HDB loading/error status is separate. An integrated browser failure check exposed an error state whose footer still said catalogue loading while the Map layers panel was closed. The always-visible error/retry footer fixed that issue: a missing manifest displayed the error and Retry recovered the actual catalogue. Persistent missing or corrupt Overture chunks displayed a truthful partial/incomplete footer while retaining valid geometry, then recovered after view refresh. The observed chunk recovery was by refresh, not a claimed manual-Retry path.

The adapter fetches at most three chunks concurrently; a view is capped at 32 chunks / 12 MB serialized input, the LRU at 12 MB serialized input, and each chunk at 8 MB. These are not heap, GPU or total browser-memory limits. Wide/high-pitch budget overflow clears geometry and asks the user to zoom in. Revision/abort guards prevent an old camera result from replacing the latest view.

## 11. Attribution and mobile fixes

The persistent footer retains OpenStreetMap plus current building-source links and opens a native **Sources & licences** dialog with all source/licence links, dates, height notes, uncertainty and the unresolved public-demo warning. Native MapLibre attribution is placed top-right and initially collapsed. Credits are not removed to solve the inherited mobile overlap.

ResizeObservers report actual credit height and geographic-canvas height to responsive CSS. The plot toolbar is placed above the footer; layer controls are bounded/scrollable within the map. The current 390 px General measurement is a 438.7 px map frame plus 61.3 px credits = 500 px; toolbar bottom 667.95 is above credits starting 675.95. Native attribution has 24 px clearance. These are one observed layout's measurements, not a universal device guarantee.

Actual 1024×900, 1920×1080 and 390×844 checks had no document overflow, with the toolbar eight pixels above the credits. The mobile source dialog measured 351.2×717.4 px with eight links and no internal horizontal overflow. Visual inspection of fresh mobile landing found the composer gradient dimming the licensing footer; footer z-index 6 fixed it. Fresh desktop/mobile production pages and screenshots were rechecked after this CSS change: credits were clearly readable, the dialog retained eight links and neither page overflowed. This is the verified bounded layout, not a claim for every viewport or future CSS composition.

A browser check reproduced Escape in the source dialog accidentally cancelling a two-vertex route. The dialog now stops Escape propagation while retaining native dialog dismissal; rerun retained both vertices. Actual modal focus/keyboard behaviour and source links remain reviewable.

## 12. Licence and publication boundary

**The combined catalogue is not cleared for public demonstration, hosting or redistribution, including a public presentation served from localhost.** Preserve `distribution: 'local-review-only'`, the session/adapter loopback guards, source notices and the explicit preview step. Source-separated files and visible attribution do not resolve the SODL/ODbL combination or potential derivative-database obligations.

The [7C.1 licensing decision](PHASE7C1_ISLANDWIDE_BUILDING_COVERAGE.md#licensing-decision) requires compatibility/provenance review and any required machine-readable database/alteration offer before public use. The supplied HDB acquisition gap is separate. A release may require a reviewed alternative dataset strategy and regenerated outputs. This integration makes no new legal determination and publishes nothing. Exclude the unified preview static files from any public deployment: the client-side loopback guard does not prevent direct download of static assets if they are mistakenly hosted publicly.

## 13. Tests, CLIs, TypeScript and build

Historical baselines: Phase 7A.1 main reported 313 Node tests; isolated Terminal 2 reported 266 Node tests plus 19 Python tests. Those numbers overlap and must not be added together. The final main repeat after the footer z-index CSS fix completed **343 Node tests, zero failures**, exit 0, in 39,576.804 ms. Application TypeScript exited 0; the final production build succeeded with a 4.1 s compile, completed static generation (14/14) and all eleven API routes retained. All six model CLIs, explicit strict module/script/test TypeScript and the 19-test Python GIS suite passed again after that build. Individual final CLI logs remain ignored under `test-results/phase7a1-7c1/*-final.txt`. Full unified-data validation again confirmed 234,739 features, 1,119 chunks and 176,643,869 bytes with local-review-only distribution.

Run sequentially because Windows preparation hooks share derived files:

```powershell
npm.cmd run mrt:validate
npm.cmd run mrt:simulate
npm.cmd run agents:generate
npm.cmd run agents:impact
npm.cmd run eldercare:prepare
npm.cmd run eldercare:simulate
npm.cmd test
npx.cmd --no-install tsc --noEmit
npm.cmd run build
git diff --check
```

Strict helper/script/test checking used the installed compiler with `--ignoreConfig --noEmit --strict --skipLibCheck --types node --target ES2022 --module nodenext --moduleResolution nodenext --allowImportingTsExtensions`, covering browser-safe scenario/plot/camera/building modules, preparation entries and their tests, and passed. Eight new session lifecycle tests cover manifest retry, visibility/races, disposal, host/manifest boundaries and stale installation. The final production build/test process exited 0 after the footer z-index correction. Whitespace/security assertions passed; no live paid AI/provider call was required.

## 14. Offline GIS verification

The independent Python geometry/selection suite passed **19 tests**, including the final repeat, from main's working directory using Terminal 2's existing `tmp/phase7c1/venv/Scripts/python.exe -B`. No environment was installed/copied and no full extraction/preparation ran. Pinned tools are Overture 1.0.2, Shapely 2.2.0, PyArrow 26.0.0 and NumPy 2.5.4; they are optional offline tools, not frontend dependencies. No dedicated GIS skill was installed.

The pipeline preserves original whole Polygon/MultiPolygon coordinates and holes, filters against the historical dissolved 332-subzone land scope, validates topology and uses indexed polygon intersections. HDB → URA → Overture is deterministic display precedence, not survey authority. Equivalent footprints suppress a candidate; other conflicts suppress only when retained blocker union covers at least 50% of the candidate. Four shared-roof HDB blocks remain distinct. The audit retains 6,280 minor and 3,574 non-minor retained overlap pair records; opaque shading does not fix them. The courtyard disagreement `ura:418148` / `hdb:941523` remains unresolved.

## 15. Integrated Playwright checks

All 14 fixed desktop district views reached ready at zoom 15.65 / pitch 52° / bearing −9° in the integrated map: Tiong Bahru, Sengkang, Punggol, Tampines, Orchard, Downtown, Jurong, Woodlands, Yishun, Changi, Tuas, industrial, Serangoon Gardens private housing and Lim Chu Kang low density. Checks confirmed source-backed features, three source identities across the sweep, one active unified extrusion and one canvas. All 14 screenshots were independently inspected with no gross spikes, seams or alpha-stacking artifacts found. This does not exclude hidden geometric overlaps. Per-view results are saved in `test-results/phase7a1-7c1/district-results.json`; rendered tile counts and adapter-selected counts remain separate from catalogue inventory.

Real plotted MRT passed NS4 → new station → NE16 with two explicitly reviewed 300 s run / 30 s dwell links: **62.77 → 13.50 modelled minutes**, with the same canvas. The real demographic dashboard/profile represented **192,150** weighted residents: **153,096.27 comparable / 39,053.73 unassigned**. Its run ID survived a Knowledge Graph round-trip; the destination honestly stated that no source-backed graph exists. Editing geometry cleared journey and demographic outputs. Undo/Redo restored the exact latitude transition **1.339252 ↔ 1.340252**; explicit reconfirmation and rerun restored the actual **13.50-minute** result.

The plotted AAC made an actual HTTP 200 request at **1.287, 103.824**: **44,520 targeted / 6,230 comparable / 38,290 unlocated / 3,890 closer**, with displayed mean distance **410.4 → 347.5 m**. Moving the point to latitude **1.288** cleared the old report; a fresh HTTP 200 returned a different fingerprint. There was one universal hypothetical point and zero duplicate native hypothetical markers. These remain limited-preset, proxy-based straight-line results. The source-dialog Escape regression and current mobile footer/toolbar positioning passed after fixes.

Final asset-failure checks passed: missing manifest visibly failed and recovered through Retry; persistent missing/corrupt Overture chunks visibly retained partial/incomplete coverage and recovered after view refresh. Switching to HDB left exactly one active HDB extrusion; switching back left exactly one unified extrusion. Buildings off reached hidden and on reached ready. Scoped removal of the owned source/layer followed by `style.load` recovered one pair; arbitrary whole-map style replacement is not claimed.

Additional checks ran against the actual production server on loopback port 3127:

| Flow | Observed integrated result |
| --- | --- |
| Explore and persistent camera | Question → General changed zoom 15.65 → 10.7089 through the shared fit, retaining the same canvas. A later user pan/zoom to 15.7 stayed in place without repeated refitting. |
| Street preference and graph | Streets initially visible; manual off survived Knowledge Graph → General with one canvas. The graph remained an honest unimplemented source-graph destination. |
| Held manifest and navigation | First manifest held through General → Graph → General, then Buildings off. Releasing the old response left hidden state; Buildings on made a fresh request and reached ready. |
| Rapid camera movement | Four jumps settled at final Tiong Bahru ready with one unified source/extrusion. |
| Plot dragging | Actual pointer drags moved both a point marker and a route vertex with buildings enabled; Undo remained available and the same single canvas stayed mounted. |
| Illustrative citizens | 180 visible citizens / 13 draw calls; Play advanced to one second, Pause held, Reset returned zero. Fixture profile inspection and baseline/scenario switching worked. No sustained FPS claim. |
| Forced no-WebGL | An isolated page with null WebGL had zero WebGL canvases, geographic SVG fallback, a usable Add point action producing one point and numeric lat/lon, and a truthful 3D-unavailable footer. |
| Street-tile failure | 167 deliberately aborted OSM tile requests left local buildings ready, one canvas, a warning and usable plot controls. |
| Reduced motion | Instrumented `fitBounds` received duration 0; the map was not moving afterward. |
| Unsupported questions | Polyclinic stayed planning-only with zero calculation buttons; ASEAN stayed evidence planning / not executed. |
| Responsive and source dialog | 1024×900, 1920×1080 and 390×844 had no document overflow and eight-pixel toolbar/credit clearance. Views reached ready at zoom 16.3; a wide zoom-15.65 view can legitimately reach the documented input-budget overview state. Mobile source dialog had eight links and no internal horizontal overflow. |
| Fresh normal pages | The final no-key production pages at 1440 px desktop and 390 px mobile had zero console/page errors, one canvas, one unified extrusion, streets visible and no horizontal overflow. Desktop was awaited until the unified source loaded and rendered count was positive: 2,560 rendered tile features, not a unique-building inventory. Footer z-index was 6 and desktop/mobile credits were visually readable. Mobile source dialog retained eight links. |

The district sweep, controlled failures and responsive checks are bounded observations, not a hardware/performance guarantee. Browser unmount and arbitrary whole-map style replacement were not exercised; disposal is covered by unit tests, while the browser tested only scoped owned-source/layer recovery. Earlier 7A.1 planner/engine race tests remain separately documented; they are not claimed as newly rerun browser cases here. The latest footer CSS check passed, and the early desktop landing capture was replaced after source/render readiness.

## 16. Screenshot and local evidence inventory

Integrated district screenshots and `district-results.json` are ignored under `test-results/phase7a1-7c1/`:

```text
tiong-bahru.png
sengkang.png
punggol.png
tampines.png
orchard.png
downtown.png
jurong.png
woodlands.png
yishun.png
changi.png
tuas.png
industrial.png
private-serangoon-gardens.png
low-density-lim-chu-kang.png
general-1024.png
general-1920.png
general-390.png
mobile-sources.png
citizens.png
fresh-landing-desktop.png
fresh-landing-mobile.png
```

The root integrator visually inspected the new General, mobile source-dialog, citizen and final fresh landing captures. `fresh-landing-desktop.png` was replaced after awaiting unified-source loading and positive rendered features; both final landing screenshots show clearly readable credits after the footer-gradient correction. Earlier Terminal 1 screenshots remain under its documented `test-results/phase7a*` / `phase7a1*` names. Earlier Terminal 2 screenshots, sample gallery, final-browser-counts and timing JSON remain in its ignored worktree locations and were not copied wholesale. No screenshot/log is part of the proposed maintained commit scope.

## 17. Remaining model, data and runtime limits

Geographic presence across 332 subzones / 55 planning areas is not complete-city coverage. Buildings can be missing, stale, false detections, wrongly suppressed or overlapping; original HDB provenance remains incomplete. Most heights are illustrative; direct source values are not independently surveyed, floor heights assume 3 m, and whole-roof prisms omit roof detail. Parts, elevated bases and underground records are excluded. Historical scope can miss newer reclamation. No sustained FPS, GPU-capacity, heap or national-coverage benchmark is established. Wide views can exceed the input budget and intentionally show overview guidance. Browser unmount and arbitrary whole-map style replacement are unverified; scoped building-resource recreation and unit disposal are the tested boundaries.

General drawings remain in-memory; no polygon/saved-project interface or engineered route snapping. MRT times/demand are assumptions and require calibration/sensitivity work. Census 2020 rounding/national discrepancy, unassigned demand, four historical AACs, unknown opening/capacity, two landmark origin proxies and 38,290 unlocated older residents remain material. Straight-line proximity is not walking access, attendance, service allocation or health impact. Illustrative citizens are separate from calculated population trajectories. No graph construction, evidence retrieval, stakeholder executor or public-opinion forecast is implemented. Phase 7D/7E/7F/7G, full Phase 4 trajectories, live OpenRouter authentication and reliability/rebuild/pitch work remain pending.

## 18. Independent review and resolved findings

Two read-only reviewers covered source/data/transfer and lifecycle integration; a documentation subagent maintained only this report. Their scope included preservation of Terminal 1 work, exact selected assets, source/licence boundaries, single-layer ownership and final claims. Review identified missing-layer recovery; its regression failed before the focused adapter fix. Browser inspection exposed the dialog Escape collision and mobile attribution/toolbar layout, both corrected and rechecked as above. The missing-manifest error-footer issue was reproduced, corrected and rechecked with successful Retry recovery. Partial missing/corrupt-chunk recovery and scoped owned-resource recreation also passed as described above.

The source/transfer reviewer inspected all 14 integrated district screenshots without gross spikes, seams or alpha artifacts, while preserving residual-overlap and height limitations. The root integrator inspected responsive/dialog/citizen screenshots and performed the failure, preference, reduced-motion and fallback checks recorded above. Final footer z-index 6 review passed on fresh desktop/mobile production pages with readable credits, zero console/page errors and no overflow; the repeated suite/build and Terminal 2 preservation comparison also passed. This closes the observed footer finding within those tested layouts. Untested browser unmount/whole-style replacement remain explicit limits; earlier isolated-worktree review is not substituted for current integration evidence.

## 19. Practical reconstruction

For this existing local preview, the copied validated derived bundle is sufficient; run the `--validate-only --preview` wrapper and start the existing app on loopback. It neither downloads source data nor repeats geometry preparation. A clean checkout lacks ignored assets: obtain the exact reviewed raw files/receipts or reacquire and verify their pins, then create an isolated optional Python environment and follow the [7C.1 rebuild sequence](PHASE7C1_ISLANDWIDE_BUILDING_COVERAGE.md#rebuild-and-local-handoff). Changed source bytes must stop for provenance/schema review, not silently update a checksum.

```powershell
# Existing reviewed derived bundle; internal local review only.
npm.cmd run buildings:unified -- --validate-only --preview
npm.cmd run dev
```

For a full reconstruction: establish permitted datasets/engine contracts; reconstruct strict geometry/store and explicit MRT/AAC confirmation; keep one map; reproduce source receipts, topology/selection audits and bounded loader; install current source/licence UI; run sequential regressions and actual desktop/mobile/failure checks. Check hackathon reuse rules. Public-demo licensing is a separate unresolved prerequisite, even for a laptop-hosted presentation.

## 20. Recommended Git checkpoint plan — not executed

No Git mutation is authorised now. Proposed message: **`feat: integrate general plotting and internal unified building review`**. Proposed maintained scope is exactly the union of the 41 paths in section 2, the 22 in section 3, the six integration paths in section 4, plus `.gitignore` and `package.json`: **71 paths**, confirmed by the final read-only inventory. This includes both prior uncommitted feature sets and their reports, not generated assets. Exclude private environment files, raw data, `tmp`, `.next`, `test-results`, public generated geography, caches and Python environment.

After separate explicit Git approval, review the concrete diff, stage only that named maintained scope and inspect the staged diff/security/whitespace before creating a checkpoint. A main commit would not itself preserve or clear Terminal 2's 25 dirty paths. Do not attempt fast-forward, reset, checkout, stash, clean or branch forcing over them. First coordinate a separately approved preservation/reconciliation of that work, comparing the original snapshot and main integration edits. Only once Terminal 2 is safely clean and its branch is a verified ancestor may a separately approved `--ff-only` advance be considered. If that condition fails, stop and review the divergence. No push/deployment/branch deletion is part of this plan.

## 21. Actual skills and tools

This integration used local PowerShell/filesystem and read-only Git, Node/npm/TypeScript/Next build tools, existing pinned Python/Shapely tools, Playwright MCP and independent scoped review agents. Official MapLibre `Map.setStyle` / `AttributionControl` documentation was opened, and installed control source/types were inspected. No dedicated GIS plugin/skill, new dependency or live paid provider request was introduced.

Applied current-session skills: using-superpowers, systematic-debugging, test-driven-development, frontend-design and brainstorming's clear-requirements path; previously read worktree-safety, code-review and verification guidance was reused. The user's no-Git-mutation instruction overrides any skill's branch-finishing workflow. The documentation subagent edited only this report; the root integrator ran the validation and browser checks recorded here. Historical phase reports identify their own broader tooling/skills separately.

**Scoped integration checkpoint validated, unstaged and uncommitted:** the final 343-test suite, application/strict TypeScript, production build, repeated 19 GIS tests and actual integrated browser matrix passed within the stated scope. Final landing captures were inspected after readiness; the footer correction passed. The roadmap, whitespace and recorded raw/environment/credential audit are reconciled. Both HEADs remain `4400f47268663a848ca59d55c6f140dda80c97cc`, both indexes have zero staged paths and neither worktree has an unfinished Git operation. Main has the exact 71-path maintained scope; Terminal 2 retains its 25 unchanged pending paths and remains unsynchronised. No Git mutation or public publication occurred. Public licensing, future phases and the explicitly untested runtime boundaries remain unresolved.
