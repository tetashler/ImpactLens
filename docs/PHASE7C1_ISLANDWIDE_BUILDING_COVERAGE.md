# Phase 7C.1 — island-wide building coverage

## Implementation plan (28 October 2026)

User-authorised extension of Phase 7C; preserve its original results and files. Work only in Terminal 2 at `4400f47`, with no Git mutations. The specification explicitly requests implementation, so routine design choices are resolved here without another approval gate.

1. Acquire only `building` from pinned Overture release `2026-10-21.0`; retain immutable raw output, retrieval metadata and SHA-256. Verify documented release selection. Use an isolated ignored offline Python environment, never a frontend dependency.
2. Measure geometries, source/height fields and geographic coverage against the existing 332 Singapore subzone polygons. Exclude outside geography explicitly; retain whole footprints rather than clipping roofs at administrative borders.
3. Prototype an indexed, deterministic conflation with HDB/URA. Exact/near-equivalent overlaps may select a footprint; partial/contained conflicts need separate reported rules, never centroid-only matching. Preserve suppressed references and all exclusions in an audit. Keep source-specific licensing and build a distributable attribution/data bundle where legally supported.
4. Reuse the TypeScript contracts, partitions and MapLibre adapter, extending manifest provenance for multiple sources. One visible building view, no simultaneous legacy HDB overlay. Test height handling, source identities, geometry boundaries, conflation decisions and runtime lifecycle before implementation.
5. Inspect housing, terrace/private, commercial, institutional and industrial subsets in the real existing map before full extraction/preparation. Capture fixed-camera district/mobile screenshots and failure recovery; measure input bytes and observed timings without invented FPS.
6. Independent review, sequential regression CLIs/tests/TypeScript/build, update this report and the three Phase 7C handoff documents. Update only the local roadmap as expressly requested in Phase 7C.1; Terminal 3 must reconcile its concurrent main-worktree counterpart.

Review focus: neighbouring terrace houses; contained courtyards/parts; stale chunk fetches; unverified heights; database licensing/public distribution. Tests and audit samples must exercise these boundaries.

## Current state and release boundary

The offline pipeline is **validated for internal handoff**, preparing **234,739 selected HDB/URA/Overture footprints** with every emitted geometry, source ID and chunk hash validated by the TypeScript wrapper. It reuses the existing MapLibre adapter, retains complete source footprints, and records exclusions and overlap decisions. The final catalogue reached ready in 14 desktop and three mobile views. All six model CLIs, 266 Node tests, 19 Python tests, application/strict-module TypeScript and the production build passed. Independent review found no new correctness blocker for internal handoff. Mobile labels/attribution, production integration and public-release licensing remain unresolved. This report does not transfer the earlier Phase 7C measurements to the new catalogue.

The combined data is **not cleared for public demonstration, hosting or redistribution**. Outputs are generated under ignored `tmp/phase7c1/`; a separate explicit `--preview` option copies them to local public assets. The manifest declares `distribution: 'local-review-only'`, and the browser adapter accepts that manifest only on loopback hosts. These are safeguards for internal review, not a legal exemption for a public presentation served from localhost. No public release is approved by this work.

Phase 7A.1's newer UI, opening camera and annotation behaviour are absent from this Terminal 2 checkpoint. Terminal 3 must integrate and test them separately. The existing Phase 7C reports remain historical records; their labelled 7C.1 addenda point here.

## Source receipt and scope

The [official Overture Python client](https://docs.overturemaps.org/getting-data/overturemaps-py/) reads cloud-hosted GeoParquet and streams a geographic extract. The reviewed CLI version is pinned to **overturemaps 1.0.2**. Acquisition explicitly selects release **`2026-10-21.0`**, feature type **`building`**, output **`geojsonseq`** and bounding box **`103.60,1.15,104.10,1.50`**; it does not rely on the client's latest-release default.

| Receipt field | Recorded value |
| --- | --- |
| Access date | 2026-10-28 |
| Public source | `s3://overturemaps-us-west-2/release/2026-10-21.0/theme=buildings/type=building/` |
| Raw local file | `tmp/phase7c1/raw/overture-2026-10-21.0.geojsonseq` |
| Extracted rows | 401,414 |
| Raw bytes | 251,956,060 |
| SHA-256 | `f578855d9484ed6b35419dff24b4fb837a725cd2951056266d007c2b6b1ad88e` |
| Receipt | Adjacent `overture-2026-10-21.0.receipt.json`; release, bbox, type, row count, access date, checksum and extractor |

`scripts/buildings/acquire.py` writes to a partial file, exhaustively parses the stream, checks the expected digest, then publishes the completed filename and receipt. Existing raw bytes are checked rather than overwritten. An incomplete download or different digest stops acquisition and remains available for inspection. The digest includes serialization and row order; a different digest requires review even if the remote release name matches.

The extract rectangle includes neighbouring geography and water. It is not a Singapore building count. The preparation scope is the dissolved union of the **332 supplied Master Plan 2019 subzones**, with source SHA-256 `77e30aa02b1784b649d9b6f23e3b2ebb825af787de554f3a3fb76bbee3013c42`. The union must be topologically valid. Each footprint must have an interior representative point covered by that union and at least half its area inside it. Accepted footprints remain whole, including portions crossing the boundary. Individual invalid boundary codes are reported; the boundary's historical extent can omit later reclamation or structures outside those polygons. It is a reproducible scope filter, not a current coastline or proof of national completeness.

HDB and URA use the exact pins in the [original source audit](PHASE7C_BUILDING_SOURCE_AUDIT.md). The supplied HDB file still lacks its original acquisition receipt. The earlier URA snapshot retains its September 2025 reference and 2026-10-28 acquisition date. Neither raw file is replaced or modified.

The final audited source/height totals appear below. Intermediate land-filter and preparation passes are not catalogue results: validation, elevated/underground exclusions and revised overlap selection changed the outcome. The reviewed raw extract remains unchanged.

Overture distinguishes whole `building` roofprints from associated `building_part` records. This phase downloads only whole buildings and defers parts, avoiding a parent roof plus its parts being extruded together. ML-derived roofprints can contain omissions or false detections; the release is not a surveyed inventory. See the [building guide](https://docs.overturemaps.org/guides/buildings/) and [schema](https://docs.overturemaps.org/schema/reference/buildings/building/).

## Licensing decision

Overture publishes its buildings theme under ODbL. Its attribution page identifies OpenStreetMap contributors, Microsoft ML Building Footprints and Google Open Buildings among the sources; Google's source licence is CC BY 4.0. The original per-feature `sources` records are retained in the provenance sidecar, while the runtime source registry carries source and licence links. Source attribution must follow the actual retained data. See [Overture attribution and licensing](https://docs.overturemaps.org/attribution/).

HDB/URA and the geographic boundary have Singapore Open Data Licence considerations. SODL allows adaptation and distribution with conspicuous acknowledgement, but its sublicensing provisions and lack of rights for downstream sub-licensees require compatibility review before combining these records into an ODbL derivative database. The supplied HDB snapshot's acquisition provenance is a separate unresolved issue. This report does not establish compatibility. See the [Singapore Open Data Licence](https://data.gov.sg/open-data-licence).

Cross-source selection changes which records survive; separate source files do not automatically make this an independent collective database. Treat the combined result as a potential derivative database. ODbL 4.4 requires compatible additional contents and share-alike terms for public use, including public output from a derivative database. Section 4.6 requires a machine-readable database or complete alteration offer, including additional contents; attribution alone is insufficient. Internal use is distinguished in 4.5(c). See [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

Accordingly, this phase prepares an internal review bundle and `LICENSING.txt`, not a cleared public distribution bundle. Before a public demo, resolve the compatibility/provenance questions and prepare the required notices and reproducible machine-readable offer. If that cannot be resolved, choose a separately reviewed source strategy and rerun selection without the incompatible inputs. Removing attribution, hiding source IDs, or keeping source-specific storage is not a solution.

## Deterministic geometry and overlap rules

The Python pipeline uses Shapely/GEOS topology validation and an `STRtree` spatial index. It rejects empty, invalid, non-polygon, non-finite, zero-area, out-of-range or 3D geometries; no automatic geometry repair occurs. Raw coordinates are retained in selected roofs. This strengthens offline topology checking relative to the earlier TypeScript structural validator, while neither check proves that a footprint exists today.

Selection order is HDB, then URA, then Overture. Within each source, larger footprints precede smaller ones, followed by source ID for deterministic ties. This is display precedence: it does not establish identity, survey accuracy or source freshness. Overlap candidates come from the spatial index, followed by actual polygon intersection. Nearby centroids and shared terrace walls alone do not merge buildings.

| Pair relation | Rule and action |
| --- | --- |
| Disjoint or touching only | Zero intersection area; keep both. |
| Equivalent | Intersection-over-union at least 0.90 and smaller/larger area ratio at least 0.90; retain the higher-precedence footprint. |
| Minor overlap | Otherwise, intersection at most 1 m² **or** at most 2% of the smaller footprint; no suppression from this pair alone. Report only pairs whose two roofs survive final selection. |
| Contained conflict | Otherwise, at least 95% of the smaller footprint is covered; classify the relation, then apply the candidate-union rule below. |
| Partial conflict | Any remaining positive overlap; classify the relation, then apply the candidate-union rule below. |
| Multiple conflicts | Record each retained blocker and its relation; use their geometric union, not the sum of overlapping pair areas, for the candidate decision. |

For a candidate with a non-minor conflict, compute the union of already-retained blockers and the fraction of the **candidate's own area** it covers. Suppress the whole candidate only when that union covers **at least 50%** (with a `1e-10` numerical tolerance), or a pair is equivalent. Otherwise retain its original footprint and report the unresolved overlap in `retainedOverlaps`. A small preferred footprint therefore cannot erase a much larger containing roof solely because the smaller footprint is almost fully covered. The candidate is compared against earlier retained roofs only; later roofs cannot retroactively change its decision.

Visual review exposed why this distinction matters: the earlier suppress-any-non-minor-overlap rule removed distinct HDB blocks 119A/119B/119C/119D with shared roof areas and a larger hospital roof. The revised regression fixture retains all four HDB blocks and records their three residual overlap pairs. The Python suite passed **19 tests**, and the full pipeline and final local regression checks passed with the revised policy.

No selected roof is clipped, unioned, stretched or replaced with fabricated geometry. The union is used only for the decision and coverage measurement. Suppression can still sacrifice unique area when the majority threshold is met; retained conflicts can include duplicate or misaligned structures. Contained outlines may represent different structures or modelling conventions, and thresholds do not prove real identity. Both minor and larger retained overlaps remain explicit, so the output is not advertised as overlap-free or fully conflated.

`conflation.json` records each suppressed source ID, retained match IDs, overlap classifications and measurements. Pair records distinguish `candidateCoverage` from `retainedCoverage`; `candidateUnionCoverage` records aggregate coverage of the candidate without double-counting blockers. `retainedOverlaps` records non-minor conflicts whose candidate survives, while `minorOverlaps` is filtered to final retained pairs. The summary's `retainedOverlapConflicts` counts these reported pair records, not unique affected buildings. `exclusions.ndjson` records rejected IDs and reasons; `provenance.ndjson` retains complete original source properties for accepted candidates. Input accounting reconciles raw rows with exclusions, prototype-only omissions, retained records and suppressed records.

The audit's **`sumUncoveredAreaAtDecisionM2` is a non-unique upper-bound diagnostic**, summing suppressed-footprint area left uncovered at each precedence decision. Suppressed footprints can overlap, and later accepted roofs can cover that area. It is not unique final lost geographic coverage. District `clippedAreaM2` sums per-feature intersections and can also double-count overlaps; `selectedUnionAreaM2` instead unions selected geometries before clipping to the district box. Neither measure establishes all real buildings or a completeness percentage. Areas use a local degree-to-metre approximation, not cadastral measurements.

## Heights, attribution and one visible map layer

The [Overture schema](https://docs.overturemaps.org/schema/reference/buildings/building/) defines `height` in metres and `num_floors` as above-ground floors. A valid direct height takes precedence. Otherwise, sourced floors are multiplied by an explicit **3 m per floor assumption**. Records lacking either use **12 m illustrative height**. Invalid supplied heights/floors are excluded rather than silently converted into fallback evidence. HDB and URA still use the illustrative fallback.

The existing internal `heightBasis: 'verified'` value means that a valid direct source attribute was supplied; it does **not** mean independently measured or surveyed by this project. `derived` means the floor assumption was applied. The runtime note keeps those limitations visible. Whole-roof prisms cannot reproduce different roof levels. Building parts, wholly underground records and records with nonzero `min_height`/`min_floor` remain explicitly unsupported and are excluded; elevated bases are not silently rendered from ground level. The pipeline does not transfer an Overture height onto an HDB footprint selected in its place.

Each runtime feature retains stable source-prefixed identity, original source object ID, attribution ID, category when present, height value, basis and note. Full upstream property records stay in the ignored sidecar instead of inflating each browser feature. The manifest adds a source registry and the local-review distribution flag to the existing version-1 contract.

Whole geometries are assigned once to source-specific 0.01-degree cells; chunk bounds cover the full features rather than the nominal cell. Source-specific partitioning preserves provenance and auditability, not licence separation. Content-hashed chunks have an 8 MB hard ceiling. The adapter still owns one MapLibre source/layer, uses manifest zoom 14, loads three chunks concurrently, caps a view at 32 chunks/12 MB serialized input, and holds a 12 MB serialized-input LRU cache. These are input budgets, not browser heap or GPU limits. Checksums, schema/source validation, stale request rejection and disposal remain required.

The offline writer groups references to selected GEOS geometries, then converts coordinates to JSON one chunk at a time. It avoids retaining a second complete Python coordinate-array copy of the catalogue; the selected geometry collection and spatial indexes still consume memory. The final Python preparation recorded **625.473 s**. At the last process observation, Windows `PeakWorkingSet` read **490,352,640 bytes (467.6 MiB)**; this sample is not guaranteed to cover the complete run. An earlier pass read 950,562,816 bytes (906.5 MiB). Those separate observations are not a controlled performance comparison, and neither is browser/GPU memory.

The adapter now uses opaque extrusions (`fill-extrusion-opacity: 1`) to remove alpha-stacking darkness where roof footprints overlap. The final desktop sweep rendered with this style. Opaque rendering does not remove geometric overlap, prove successful deduplication, or resolve different source heights at the same place. Residual conflicts need inspection and remain a quality limitation in the audit and handoff.

The existing HDB extrusion must be hidden and disabled before installing this preview. One active view avoids drawing a legacy HDB overlay on top of selected HDB/URA/Overture roofs. Production controls and manifest fetching remain integration work; the opt-in browser harness modifies the already existing test map and creates no second map or citizen render loop.

## Evidence and validation ledger

The final evidence comes from `tmp/phase7c1/derived/audit.json`, the emitted-data validator, actual browser observations and the final sequential regressions. Earlier Phase 7C's 14,212-feature URA catalogue, 258 tests and load timings apply only to that earlier checkpoint.

| Evidence | Phase 7C.1 result |
| --- | --- |
| Final raw/in-scope/excluded counts by source | 429,183 raw → 262,945 eligible candidates; 166,238 exclusions, detailed below |
| Retained HDB/URA/Overture and height-basis counts | 234,739 selected; 13,209 HDB / 1,912 URA / 219,618 Overture; 2,392 direct / 20,610 derived / 211,737 illustrative heights |
| Suppression kinds, final retained minor/non-minor overlaps and decision-area diagnostic | 28,206 suppressed; 6,280 minor and 3,574 non-minor retained pair records; decision-area sum 3,031,281.873 m² (non-unique diagnostic) |
| Chunks, manifest bytes, referenced bytes, largest chunk | 1,119 chunks; 339,308-byte manifest; 176,643,869 referenced bytes; largest 1,495,366 bytes |
| Emitted-data integrity | All 234,739 feature geometries/source IDs and manifest-referenced chunk sizes/hashes validated by the TypeScript wrapper; validation and preview copy passed again after metadata-text correction |
| Final source/artifact checks | All four raw-input SHA-256 pins unchanged; derived/public manifests identical at the recorded final SHA-256; `git diff --check` passed |
| Preparation elapsed time / observed process memory | 625.473 s; last sampled process `PeakWorkingSet` 490,352,640 bytes (467.6 MiB), not a guaranteed whole-run peak |
| District inventories, summed areas and selected union areas | Final 14-box audit below; all 332 subzones / 55 planning areas receive selected representative-point assignments |
| Desktop/mobile render counts and inspected screenshots | Final 14-district desktop and three-view mobile sweeps ready; selected desktop and mobile Tiong Bahru screenshots inspected. Mobile inherited HDB labels and attribution/legend overlap require integration fixes. |
| Cold/warm load measurements and fetched input bytes | One local Tiong Bahru cold trial: first visible 1,239.9 ms / completed 1,377.6 ms; warm refresh 24.6 ms; scope and byte accounting below; no FPS claim |
| Missing/corrupt assets, rapid camera changes, toggle and cleanup | Exercised with first full-pass data and current adapter; explicit partial-error states, recovery, latest-view settling and scoped cleanup; not relabelled as final-data tests |
| MRT/AAC/citizen compatibility | First full-pass/current-adapter checks: MRT/AAC HTTP 200, markers visible, 180 illustrative citizens and Play/Pause; Phase 7A.1 remains untested here |
| Python tests, Node tests, TypeScript, six model CLIs and production build | **19 Python tests passed; 266 Node tests passed, 0 failed/skipped; all six CLIs, application/strict-module TypeScript and Next.js production build passed** |
| Independent review and resolved findings | Revised sample gallery: 9,646 candidates → 8,537 retained, exact source geometry. Final review found no new correctness blocker for internal handoff and reconciled decision audit/manifest hash; public release remains unresolved. |

Final manifest SHA-256: **`5ab917ca747b51527868499c58ac6ecc21c82dd8897d3243ed9ff52ef0bfc32b`**. Display-text encoding was corrected in source metadata and the manifest's aggregate source hash was recomputed; the full emitted-data validation and explicit preview copy passed again. Raw source bytes and footprint chunk bytes were unchanged by that metadata repair.

### Final source accounting

| Source | Raw rows | Eligible in-scope candidates | Suppressed by selection | Selected |
| --- | ---: | ---: | ---: | ---: |
| HDB | 13,436 | 13,432 | 223 | 13,209 |
| URA | 14,333 | 14,304 | 12,392 | 1,912 |
| Overture | 401,414 | 235,209 | 15,591 | 219,618 |
| Total | 429,183 | 262,945 | 28,206 | 234,739 |

Exclusions are **4 HDB and 29 URA invalid/empty topologies**, plus **165,224 Overture records outside the historical land scope, 485 outside the accepted coordinate bounds, 494 unsupported elevated-base records and 2 underground records**. Thus 429,183 raw rows reconcile to 166,238 exclusions + 28,206 suppressions + 234,739 selected footprints. These are source records, not verified counts of physical structures.

Suppression classifications are 13,223 equivalent, 4,140 contained-conflict, 9,418 partial-conflict and 1,425 multiple-conflict. The index evaluated 276,280 candidate pairs. The resulting view still has 6,280 minor and 3,574 non-minor retained overlap pair records; these counts are not unique buildings. The 3,031,281.873 m² suppression diagnostic retains the non-unique, at-decision meaning described above.

Before cross-source selection, the 235,209 eligible Overture records contained 125,623 OpenStreetMap, 81,744 Google Open Buildings and 27,842 Microsoft ML Buildings source references; their height bases were 2,725 direct, 31,317 floor-derived and 201,167 illustrative. These are pre-selection provenance/height counts, not the source breakdown of the final Overture subset. Final selected heights across all sources are 2,392 direct (1.02%), 20,610 derived (8.78%) and 211,737 illustrative (90.20%).

Selected whole-footprint bounds are `[103.6058172,1.1591615,104.0862429,1.4705938]`. Every selected record has one subzone assignment; all 332 subzones and 55 planning areas have at least one assigned footprint. Nonzero presence in each administrative unit is not evidence of complete building coverage. Individual boundary codes `SISZ02`, `SISZ01`, `BMSZ01`, `BDSZ07`, `JESZ10` and `NESZ01` fail standalone topology validation; the dissolved filtering union passed. Their original boundary bytes were preserved.

The subzone selected counts sum to 234,739, with no unassigned selected features. Their **summed selected footprint area is approximately 105,010,485.186 m² (105.010 km²)**. This adds per-feature geometry areas, including retained overlaps; it is not a national geometric union, a land-coverage fraction, or proof that conflation removed duplicate area.

### Fixed-box inventory and area

These counts use the same ±0.01° boxes and polygon-intersection rule for every source. Source columns are eligible records before selection; unified is the retained view. Area columns are rounded to the nearest m² from the local approximation. The summed area can double-count overlapping roofs; the union area removes that overlap before clipping to the box.

| District | HDB | URA | Overture | Unified | Unified summed area m² | Unified union area m² |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Tiong Bahru | 331 | 345 | 2,081 | 2,086 | 1,164,207 | 1,153,899 |
| Sengkang | 623 | 616 | 1,778 | 1,729 | 1,319,925 | 1,308,871 |
| Punggol | 520 | 512 | 1,389 | 1,352 | 1,079,709 | 1,072,673 |
| Tampines | 593 | 574 | 1,701 | 1,670 | 1,208,921 | 1,202,471 |
| Orchard | 0 | 20 | 2,894 | 2,896 | 1,202,349 | 1,199,364 |
| Downtown | 39 | 66 | 2,709 | 2,649 | 1,516,646 | 1,512,790 |
| Jurong | 141 | 147 | 1,137 | 1,133 | 916,332 | 914,307 |
| Woodlands | 477 | 426 | 1,947 | 1,933 | 1,200,654 | 1,199,691 |
| Yishun | 443 | 422 | 1,929 | 1,934 | 1,186,925 | 1,178,977 |
| Changi | 0 | 18 | 301 | 296 | 483,928 | 482,239 |
| Tuas | 0 | 0 | 2,635 | 2,635 | 1,367,914 | 1,367,733 |
| Industrial sample | 0 | 0 | 1,927 | 1,925 | 1,565,441 | 1,565,341 |
| Serangoon Gardens private housing | 215 | 214 | 4,533 | 4,525 | 1,482,422 | 1,480,583 |
| Lim Chu Kang low-density sample | 0 | 4 | 1,195 | 1,190 | 416,025 | 415,987 |

This establishes source-backed inventory gains in previously empty industrial/private/commercial views, with broad geographic presence. It does not establish the expected real-world total in any box. The lower Changi summed area after selection, for example, reflects source precedence and whole-roof suppression rather than a completeness measure. No false density is added to meet an expected appearance.

### Independent geometry samples and remaining conflicts

The ignored review gallery is `tmp/phase7c1/review/index.html`, with eight GeoJSON/SVG/PNG sample sets, `manual-review.json` and `recheck-summary.json`. Re-evaluating the original prototype candidate set through the revised code yielded **9,646 candidates → 8,537 retained and 1,109 suppressed**, with **117 retained non-minor pairs and 198 minor pairs**. Every retained sample geometry exactly matches its source. This is sample evidence, separate from the full catalogue counts.

The gallery covers four shared-roof HDB blocks, a larger hospital footprint, industrial neighbours with intersecting bounding boxes, separate terrace outlines, a school with two courtyard holes, a cross-source courtyard disagreement, a two-part landmark with a hole and asymmetric containment. The four distinct HDB blocks survive; a hospital candidate with about 43.76% covered survives; disjoint industrial and terrace outlines remain separate. Multipart components and interior rings are preserved.

One conflict remains explicit: **`ura:418148` lies inside the retained courtyard of `hdb:941523`**. The HDB hole stays in its own coordinates, but the separate URA feature fills that space in the combined view. Geometry alone cannot establish whether that is a real roof or erroneous infill, so the pipeline does not silently erase it. Other majority-covered candidates still lose uncovered fringes when suppressed. These examples bound the claim: source geometry preservation and a tested selection policy do not mean the combined city model is factually resolved.

The local area approximation differs from supplied `SHAPE.AREA` by about 0.44836–0.44838% in the reviewed government samples. This is a method comparison, not a geometry mutation or cadastral accuracy claim. Final independent review found no new correctness blocker for this internal handoff, with the decision audit and manifest hash reconciled. It does not clear public release or remove the documented geometry and integration limitations.

The fixed district cameras are Tiong Bahru, Sengkang, Punggol, Tampines, Orchard, Downtown, Jurong, Woodlands, Yishun, Changi, Tuas, the industrial sample, Serangoon Gardens private housing and low-density Lim Chu Kang. Their centres are recorded in `scripts/buildings/prepare_unified.py` and `scripts/testing/phase7c1-browser-check.mjs`. Each audit box is ±0.01° and uses real polygon intersection; this differs from the old Phase 7C bbox-intersection inventory method. Recompute comparable source counts rather than treating the old table as a direct baseline.

### Final desktop browser evidence

The final 14-district sweep used the real existing map at **1440×900**, with an approximately **790×652 map canvas**, zoom **15.65**, pitch **52°** and bearing **−9°**. Every final unified view reported `ready`. The same-camera URA sweep is a current comparison; original HDB checks observed Tiong Bahru 213, Orchard 0, Downtown 10 and industrial 0 rendered features. Other HDB district counts in the older Phase 7C report remain historical.

| District | URA rendered | Final unified rendered | Final adapter selected | Selected chunks |
| --- | ---: | ---: | ---: | ---: |
| Tiong Bahru | 215 | 1,512 | 2,109 | 22 |
| Sengkang | 417 | 983 | 1,369 | 20 |
| Punggol | 248 | 791 | 1,138 | 13 |
| Tampines | 308 | 869 | 1,385 | 20 |
| Orchard | 14 | 1,729 | 2,876 | 16 |
| Downtown | 59 | 1,667 | 2,949 | 19 |
| Jurong | 200 | 833 | 1,006 | 13 |
| Woodlands | 173 | 933 | 1,458 | 13 |
| Yishun | 238 | 1,372 | 2,121 | 18 |
| Changi | 24 | 295 | 471 | 11 |
| Tuas | 0 | 1,976 | 2,570 | 8 |
| Industrial sample | 0 | 1,273 | 1,758 | 11 |
| Serangoon Gardens private housing | 151 | 2,280 | 3,020 | 17 |
| Lim Chu Kang low-density sample | 0 | 904 | 1,275 | 9 |

The result file is `tmp/phase7c1/final-browser-counts.json`; captured screenshots are `test-results/phase7c1/unified-<district>.png`. Tuas, industrial, Serangoon Gardens and Orchard screenshots were inspected and show source-backed density where the old inventory was sparse or empty. This establishes rendering improvement, not complete real-world coverage. All screenshots are internal review artifacts under the same unresolved public-release boundary as the dataset.

`queryRenderedFeatures` counts are viewport/tile observations, not unique inventory counts. Adapter-selected features intersect the pitched camera's bounding rectangle, which includes offscreen areas; this is a different scope from the fixed offline boxes. Do not subtract rendered, selected or offline counts as if they described the same population.

### Mobile evidence and integration issue

At **390×844**, with an approximately **354×490 map canvas**, the final dataset reached ready in all three inspected camera runs:

| District | Final unified rendered | Final adapter selected | Selected chunks |
| --- | ---: | ---: | ---: |
| Tiong Bahru | 492 | 703 | 6 |
| Industrial sample | 428 | 620 | 6 |
| Serangoon Gardens private housing | 978 | 1,195 | 9 |

The result file is `tmp/phase7c1/final-mobile-browser.json`; screenshots are `test-results/phase7c1/mobile-unified-<district>.png`. The Tiong Bahru screenshot was inspected: buildings are present, but the inherited **HDB labels are inaccurate for the unified preview**, and the long source attribution overlaps the bottom legend. Production UI was not changed in this phase; the harness installs the adapter into the existing map.

Terminal 3 must correct the building labels and implement responsive or collapsible attribution that keeps **all source credits and licence links available and legible**, then recheck the bottom legend at narrow widths. Hiding credits is not a layout fix. The successful data/rendering checks therefore do not constitute completed mobile UI acceptance.

### Loading observations

One local Tiong Bahru trial used a fresh adapter with HTTP cache disabled through Playwright route interception. The unified source first became visible at **1,239.9 ms** and completed at **1,377.6 ms**, selecting **2,109 features from 22 chunks**. Resource entries for building assets reported **959,730 transfer bytes, 952,530 encoded body bytes and 4,812,859 decoded bytes**. The decoded total consists of **4,465,288 chunk bytes + 339,308 manifest bytes + 8,263 harness-module bytes**, excluding the already-loaded application.

At the same camera, a fresh original HDB source first became visible at **10,601.6 ms** and completed at **10,672.9 ms**, rendering 213 features. Its worker fetch produced no page resource entries, so no comparable measured transfer-byte figure is claimed. The HDB prepared asset size remains the earlier audited **23,533,371 bytes**, which is a file-size observation rather than a measured network transfer.

A warm refresh of the same unified adapter took **24.6 ms** with **zero building-asset requests**, reusing its in-memory cache. That is not a fresh first-paint measurement. These are single local development-server observations, with different source coverage and input sizes; they do not establish production/CDN latency, sustained frame rate or GPU capacity.

A separate fresh mobile Tiong Bahru trial with HTTP cache disabled recorded **612.6 ms first visible / 943.7 ms completed**, selecting 703 features from six chunks. Its eight resource entries total **394,656 transfer bytes, 392,256 encoded body bytes and 1,596,737 decoded bytes**: 1,249,166 chunk bytes + 339,308 manifest bytes + 8,263 harness-module bytes. The raw observations are `tmp/phase7c1/final-mobile-performance.json`. The smaller viewport selects less data; this is not evidence of faster mobile hardware or a general device benchmark.

### Failure handling and existing-feature compatibility

These checks used the **first full-pass dataset with the current adapter**, before the final data sweep above. They establish observed adapter behaviour at that checkpoint and are not presented as a repeat against final chunks. Returning a 404 for one chunk or a schema-invalid `{}` chunk produced an explicit error/incomplete state while retaining valid partial features. Removing the interception and installing a fresh adapter recovered. Rapid Tuas → Punggol → Orchard camera changes settled on Orchard. Failing optional OSM street tiles left local buildings ready. Visibility entered the hidden state; overview zoom 10 cleared building data; disposal removed only the owned building source/layer, leaving network data and one map canvas.

At that same compatibility checkpoint, MRT and AAC simulation API requests returned HTTP 200. Four AAC markers, the hypothetical marker and two `P` markers remained visible. The existing citizen layer drew 180 illustrative citizens, and Play/Pause worked. These focused coexistence checks complement the final local CLI/test/build regressions below; they do not establish Terminal 3's Phase 7A.1 integration acceptance. Evidence includes `test-results/phase7c1/compatibility-aac-streets.png` and `compatibility-citizens.png`.

### Final sequential verification

All six existing model commands exited successfully: `mrt:validate`, `mrt:simulate`, `agents:generate`, `agents:impact`, `eldercare:prepare` and `eldercare:simulate`. `npm.cmd test` completed with **266 passed, zero failed and zero skipped** in 39.777 s. The independent offline Python suite passed **19 tests**. Application `tsc --noEmit` and explicit strict checks for the building modules/scripts/tests passed. `npm.cmd run build` succeeded with Next.js **16.4.3**, a 4.8 s compile and all 14 listed pages/routes retained. These are this Terminal 2 checkout's results; the matching numerical test count does not imply Terminal 1's absent Phase 7A.1 tests were run.

The first `eldercare:prepare` attempt encountered sandbox `EPERM` on its existing ignored derived catalogue. An approved execution outside the sandbox passed; no eldercare or other simulation algorithm changed. No live AI-provider requests were made. The development server owned by this task at `127.0.0.1:3121` was stopped and the port verified free; Terminal 1 was untouched.

The finishing branch remains `feature/synthetic-population` at `4400f47268663a848ca59d55c6f140dda80c97cc`, with no staging, commit, push or other Git mutation. Final checks confirm all four raw-input checksum pins are unchanged, the derived/public manifests are identical at the recorded SHA-256, and `git diff --check` passes. Environment files remain unchanged, ignored and untracked; raw extracts, derived assets and screenshots remain ignored. Build-restored `next-env.d.ts` has no final diff. Production labels/attribution, Phase 7A.1 integration and public-release clearance are the remaining handoff work, rather than missing local tests.

## Rebuild and local handoff

Run from the Terminal 2 repository root with Node 24+ and a compatible Python installation. Python dependencies are optional offline tools; they do not enter `package.json`, the Next.js runtime or the frontend lockfile. The exact requirements are pinned in `scripts/buildings/requirements.txt` (Overture client, Shapely, PyArrow and NumPy).

```powershell
py -3 -m venv tmp/phase7c1/venv
.\tmp\phase7c1\venv\Scripts\python.exe -m pip install -r scripts/buildings/requirements.txt
.\tmp\phase7c1\venv\Scripts\python.exe -m unittest discover -s scripts/tests -p test_building_conflation.py

# Reuse the reviewed URA raw snapshot and receipt when already available.
npm.cmd run buildings:download
npm.cmd run buildings:unified -- --download

# Inspect representative source/geometry outcomes before the full run.
npm.cmd run buildings:unified -- --prototype
npm.cmd run buildings:unified
npm.cmd run buildings:unified -- --validate-only

# Explicit INTERNAL local preview only; this is not a public release step.
npm.cmd run buildings:unified -- --validate-only --preview
node scripts/testing/prepare-building-harness.ts
```

The full output is `tmp/phase7c1/derived/`; `--prototype` uses `tmp/phase7c1/prototype/`. The prototype filters to Tiong Bahru, industrial and Serangoon Gardens boxes after source/scope checks. `--download` only acquires Overture and exits; it does not implicitly run preparation. The TypeScript wrapper validates every emitted chunk's size/hash, geometry, feature/source IDs, uniqueness and total before a preview copy. The public preview uses `/geography/buildings-v1/unified-manifest.json`, preserving the old URA `/manifest.json`. Normal `predev`/`prebuild` hooks do not create the combined preview.

Run regression commands sequentially after preparing the exact inputs; the existing Windows preparation hooks share generated assets:

```powershell
npm.cmd run mrt:validate
npm.cmd run mrt:simulate
npm.cmd run agents:generate
npm.cmd run agents:impact
npm.cmd run eldercare:prepare
npm.cmd run eldercare:simulate
npm.cmd test
.\tmp\phase7c1\venv\Scripts\python.exe -m unittest discover -s scripts/tests -p test_building_conflation.py
npx.cmd tsc --noEmit
npm.cmd run build
```

Also repeat the explicit strict building-module/script/test TypeScript check and the final-data browser acceptance after integration. Review the map labels, attribution layout and source lifecycle against the current Phase 7A.1 component rather than assuming this checkout's harness is the production integration.

Pinned HDB, URA, boundary and Overture bytes are required for an exact rebuild. Ignored raw inputs, receipts, Python environment and audit outputs do not arrive through a normal code transfer. Coordinate those explicitly; if a source changes, preserve it and review the pin/schema/licence instead of silently substituting current data. Content-hashed outputs from previous runs may remain unreferenced; only the current manifest's chunks belong to a reviewed bundle. Exclude all unified preview assets and testing harness files from any public deployment until the release decision is resolved.

Maintained code for this extension: `scripts/buildings/{acquire.py,conflation.py,prepare_unified.py,requirements.txt}`, `scripts/prepare-unified-buildings.ts`, `scripts/tests/test_building_conflation.py`, `lib/contracts/tests/building-unified.test.ts`, the attributed `lib/contracts/tests/fixtures/hdb-shared-roofs.json`, `scripts/testing/phase7c1-browser-check.mjs`, plus the source-registry/distribution extensions in `lib/buildings/contract.ts` and `layer.ts`, and the `buildings:unified` npm script. `.gitignore` adds Python cache exclusions for `__pycache__/` and `*.pyc`. Existing Phase 7C modules/reports remain part of the handoff.

Final maintained inventory across Phase 7C/7C.1 is **22 new files**: four reports, three `lib/buildings` modules, three building tests and two attributed fixtures, four offline Python/tooling files, two preparation entry scripts, three browser/harness helpers and one Python test file. The only tracked-file changes are `.gitignore`, `package.json` and the local roadmap. No public-facing component or route was changed. All work remains uncommitted and unpushed.

Terminal 3 must reconcile the small `.gitignore`, `package.json` and roadmap edits with its current branch; transfer reviewed files without replacing the whole map component. Install only one adapter within the current map lifetime, abort manifest fetch on unmount, dispose before `map.remove()`, expose loading/error/overview/height messages and replace outdated HDB-only labels. Fix the observed narrow-screen attribution/legend collision with responsive or collapsible attribution retaining every credit/link. Retest the new Phase 7A.1 opening camera, annotations, mode changes, MRT/AAC markers and citizen controls. This extension does not establish that those absent changes passed.

Tools actually used for 7C.1 are web research and Playwright MCP, local PowerShell/Node/TypeScript, and the isolated Python/Shapely/GEOS preparation environment. Official Overture/licence/schema/client and Shapely documentation informed the source and geometry work. No dedicated GIS skill was available or installed. The implementing agent applied using-superpowers, brainstorming, writing-plans/executing-plans, test-driven-development, systematic-debugging, requesting/receiving-code-review and verification-before-completion. Browser checks ran against its own local server; desktop/mobile observations, independent review and final regression results are recorded above. Environment files remain unchanged, and no Git mutations or public publication were performed.

For the hackathon, first confirm which datasets and reconstruction materials competition rules permit. Reconstruct acquisition receipts, topology/selection policy, source identity, height notes and bounded map lifecycle before visual polish. The combined public-demo licensing decision is a separate unresolved prerequisite; increased footprint count does not resolve it or prove completeness.
