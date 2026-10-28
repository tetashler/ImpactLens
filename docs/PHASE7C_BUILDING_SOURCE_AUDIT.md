# Phase 7C — building source audit

> Historical Phase 7C findings are preserved below. The [Phase 7C.1 report](PHASE7C1_ISLANDWIDE_BUILDING_COVERAGE.md) and the labelled addendum at the end describe the subsequent Overture-based internal preview.

Audited 28 October 2026 in Terminal 2 at `4400f47`. These are footprint inventories, not counts of occupied structures, residents or buildings visible on every map viewport.

## Existing HDB pipeline and renderer

`data/buildings/HDBExistingBuilding.geojson`: **57,012,074 bytes, 13,436 features** (13,426 Polygon, 10 MultiPolygon). Raw SHA-256: `7c987511548de3a82da403cabca02702031e02ade8703a9e401417883dfeb702`. Properties: OBJECTID, BLK_NO, ST_COD, ENTITYID, POSTAL_COD, INC_CRC, FMEL_UPD_D, SHAPE.AREA, SHAPE.LEN. No height/floor attribute. Coordinates are WGS84 `[longitude,latitude]`; raw numeric positions, rings, IDs and original file are unchanged.

The supplied file's original acquisition URL/date/licence receipt was not provided. Its name/schema are consistent with the [official HDB Existing Building catalogue](https://data.gov.sg/datasets/d_16b157c52ed637edd6ba1232e026258d/view), which lists the Singapore Open Data Licence. This does not independently establish the supplied file's exact downloaded version. Its FMEL attribute range is April 2013–June 2026, not an acquisition date or a guarantee of current operation.

`scripts/prepare-map-data.ts` strips attributes to sourceId, keeps all rings/vertices, rounds to six decimals, and writes ignored `/public/geography/buildings.geojson` (**23,533,371 bytes**) plus a manifest. Its checks cover finite WGS84 positions and closed rings, not complete topology or deduplication. The new independent audit finds no empty/null geometries or exact duplicate HDB footprints. Adaptive precision passes all 13,436; strict six-decimal rounding alone can introduce proper crossings in 33. Our pipeline avoids that issue by retaining more precision when necessary; the existing pipeline is not changed.

Validated HDB bounds: `[103.684764,1.270005,103.988972,1.457245]`. Approximate footprint areas: min 8.03 m², median 1,094.50 m², p95 2,791.46 m², max 67,886.66 m². Area calculations use local spherical metre conversion and subtract hole areas; they are audit estimates, not cadastral measurements.

`components/singapore-map.tsx` adds the whole HDB source on demand at neighbourhood zoom **11.5**, retains it when hidden, uses opacity **0.72** and uniform **12 m** extrusion, and inserts it before `network-lines`. There is no building spatial selection, deduplication or height join. Main map opens at an island fit (~10.1) in this checkpoint. Terminal 1's newer 7A/7A.1 camera and reported viewport counts are absent here and were not assumed. Raster streets sit beneath land/buildings; existing street toggle adjusts land opacity. Buildings become very small at the low visibility threshold, but missing private/commercial inventory is a separate cause of sparse views.

## Sources researched and decision

| Candidate | Access, coverage, heights and licence decision |
| --- | --- |
| [URA Amendment to Master Plan 2019 Building layer](https://data.gov.sg/datasets/d_ee3bd86e1334fbc58b520cd987090e54/view) | Selected independent alternative. Reference **September 2025**, catalogue updated **26 December 2025**. Publisher explicitly warns it omits buildings islandwide. WGS84 Polygon/MultiPolygon GeoJSON, OBJECTID and BLDG_TYPE, no measured height/floors. Public poll-download API; no key required. |
| [HDB official catalogue](https://data.gov.sg/datasets/d_16b157c52ed637edd6ba1232e026258d/view) | HDB footprints only; metadata currently references Nov 2025 / update June 2026. Not a source for all private, commercial or industrial buildings. Existing supplied bytes retained, no fresh replacement or assumed height join. |
| [SLA digitised land information](https://www.sla.gov.sg/geospatial/digitised-land-information/) / [OneMap](https://www.onemap.gov.sg/home/) | Comprehensive viewing is not a bulk redistribution licence. SLA describes licensed building-outline products. No restricted/paid data or map scraping attempted; no OneMap credentials used. |
| [OpenStreetMap](https://www.openstreetmap.org/copyright), [Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API) | ODbL permits reuse subject to attribution and share-alike database obligations. A separate, bounded seven-district building-way query was attempted using documented POST and GET interfaces; both returned **HTTP 406**, no dataset obtained. No bypass/repeated scraping/mirror chase. Query is retained ignored for diagnosis. No OSM footprint entered the catalogue. Existing OSM street tiles remain a separate source. |
| [Geofabrik regional OSM extract](https://download.geofabrik.de/asia/malaysia-singapore-brunei.html) | Available regional PBF ~240 MB, multi-country; shapefile/GeoPackage larger. Requires additional extraction/geometry work and the same ODbL obligations. Not downloaded for this minimal prototype. |
| [Overture licensing](https://docs.overturemaps.org/attribution/) | Multi-source attribution and licence requirements need source-aware extraction. Not acquired or conflated; do not assume blanket licence compatibility with government data. |

The [Singapore Open Data Licence](https://data.gov.sg/open-data-licence) permits download, modification, distribution and commercial/non-commercial use, including a hackathon presentation, with conspicuous source/licence attribution. It disclaims accuracy/completeness, excludes third-party/personal rights and prohibits implying agency endorsement. The new layer includes dataset, access date, source link, licence link and limitations. No logos, private data or proprietary map geometry were copied. OSM derivative-database questions are avoided by not importing or merging OSM geometry; a future OSM implementation should remain a separately attributed/redistributable database pending licence review.

## Selected source receipt and validation

Public retrieval: `https://api-open.data.gov.sg/v1/public/api/datasets/d_ee3bd86e1334fbc58b520cd987090e54/poll-download`, then HTTPS download URL returned by that API. Downloaded **2026-10-28** into ignored `tmp/phase7c/raw/ura-buildings.geojson`, **52,624,128 bytes**. SHA-256 **`ab97c16df4a76456c8551cc34b28f8ff0ec0285b6b5bb8487bb001e2434c691c`**. The script records a stable acquisition receipt, not expiring signed URLs. The snapshot is pinned; changed bytes are preserved by checksum and rejected until metadata/licence review. No live feed is needed after preparation.

Raw counts: **14,333** records: HDB 12,872; HIGHER EDUCATIONAL INSTITUTION 612; LANDMARK 802; H&MC 47. These are source codes, not inferred occupancy/service classifications; H&MC is not expanded speculatively.

New preparation produces **14,212 retained features** (14,160 Polygon, 52 MultiPolygon) after **8 degenerate-ring exclusions** and **113 exact-original-geometry duplicates**. Duplicate records and retained IDs/categories remain in the audit; three exact pairs have differing category labels. Five additional distinct-original records round to identical display geometry and are preserved/reported as unresolved rounding collisions, not silently merged. This is not a claim of 14,212 distinct physical buildings. Near-overlaps and multipart structure semantics remain uncertain. Validated bounds: `[103.634705,1.248474,103.994539,1.463483]`; approximate footprint area min/median/p95/max: **0.10 / 1,052.73 / 2,941.12 / 155,183.33 m²**. FMEL record attributes span May 2020–April 2025; they are not the catalogue publication date.

No forced HDB/URA conflation: use one building catalogue at a time. The URA alternative has broader categories but fewer footprints in several housing regions. Geometry is assigned whole to one spatial chunk, never clipped or copied into neighbouring chunks; manifest bounds cover the complete features, so crossing boundaries remain selectable. No distance-based building merge or invented geometry occurs.

Geometry checks: finite Singapore-region lon/lat bounds, Polygon/MultiPolygon/ring structure, closure, nonzero area, proper within-ring crossings and positive shell-minus-hole area. These do **not** certify complete OGC validity: self-touching/collinear overlaps, hole containment, overlapping multipart components and real-world correctness require further GIS inspection. No speculative topology repair is made. Winding is normalised; vertices/rings are retained. Six decimals (~0.11 m) are preferred; 181 features use higher precision to preserve checked topology/keep relative area change ≤1%. Maximum retained relative area change: **0.982%**, concentrated in very small shapes.

All heights are **12 m illustrative fallbacks**, not surveyed or inferred from footprint area. The typed policy supports documented direct heights and floor-derived estimates for future sources; neither is assigned to this source. Category styling does not invent building types. Bounds/area distribution and full exclusion/duplicate IDs are reproducibly written to ignored `tmp/phase7c/audit.json`.

## Comparable geographic evidence

Each inventory count uses a fixed box ±0.01° around the centre below, counting whole footprints whose bounding boxes intersect it. These are independent source inventory comparisons, **not net additions**, clipped-area coverage fractions or completeness estimates. Render counts use the actual 1440×900 application layout, zoom 15.65, pitch 52°, bearing −9°. Rendered tile features are not unique inventory counts.

| Region / centre lon,lat | HDB box inventory | URA box inventory | HDB rendered | URA rendered |
| --- | ---: | ---: | ---: | ---: |
| Tiong Bahru 103.827,1.286 | 331 | 320 | 213 | 215 |
| Sengkang 103.895,1.391 | 623 | 619 | 425 | 417 |
| Tampines 103.945,1.354 | 595 | 576 | 321 | 308 |
| Orchard 103.834,1.304 | 0 | 20 | 0 | 14 |
| Downtown 103.851,1.283 | 39 | 66 | 10 | 59 |
| Jurong 103.742,1.333 | 141 | 147 | 194 | 200 |
| Industrial 103.705,1.322 | 0 | 0 | 0 | 0 |

The industrial camera's pitched geographic bounds select 28 URA candidates outside the central box, but none lie in the rendered viewport. This is not evidence that buildings disappeared: a bounds rectangle includes offscreen corners. Orchard/Downtown gain actual source-backed landmarks; Sengkang/Tampines show why URA cannot be advertised as a universal superset. The selected industrial built-up gap is visible against optional OSM streets but has no supported building footprint source here. Exact expected real-world building counts remain unknown. Source-present/render-absent cases outside the visible polygon or below zoom 14 are explicit selection/LOD behaviour, not evidence of missing inventory.

## Phase 7C.1 addendum — 28 October 2026

The later extension acquired Overture release `2026-10-21.0`, whole `building` features only, using official CLI 1.0.2 and bbox `103.60,1.15,104.10,1.50`. The preserved raw extract contains **401,414 rows / 251,956,060 bytes**, SHA-256 `f578855d9484ed6b35419dff24b4fb837a725cd2951056266d007c2b6b1ad88e`, accessed 2026-10-28. This rectangle includes non-Singapore geography; **235,209 Overture records** pass the final parser/geographic scope before cross-source selection. The earlier failed Overpass request and decision not to acquire Overture were accurate at the original Phase 7C checkpoint; they do not describe this extension.

The new pipeline filters against the dissolved 332-subzone historical land scope and selects unchanged whole roofs with HDB → URA → Overture precedence. It reports equivalent, minor, contained, partial and multiple-overlap relations. Equivalent roofs are suppressed; other non-minor conflicts suppress a candidate only when the union of earlier retained blockers covers at least 50% of the candidate's own area. Below that threshold, retain the whole roof and report its residual overlap. This prevents a small preferred footprint from eliminating a much larger roof. Visual review motivated the correction; an actual four-block HDB shared-roof fixture now retains all four blocks. Selection is not proof of identity, and both suppressed unique area and retained overlap remain limitations.

Source properties and excluded/suppressed IDs remain auditable. `candidateCoverage`, `retainedCoverage` and `candidateUnionCoverage` distinguish pair and aggregate measurements. `retainedOverlaps` contains surviving non-minor conflicts; `minorOverlaps` includes only final retained pairs. Source heights are used when valid, sourced floors use an assumed 3 m, and missing heights remain illustrative 12 m. Direct-source height is not independent survey verification; elevated/underground records and building parts remain unsupported. See the [7C.1 geometry, height and audit rules](PHASE7C1_ISLANDWIDE_BUILDING_COVERAGE.md).

The combined result is **internal local review only**, with public demonstration and redistribution unresolved. Source-separated files do not establish licence compatibility. The [7C.1 licensing decision](PHASE7C1_ISLANDWIDE_BUILDING_COVERAGE.md#licensing-decision) records the SODL/ODbL issue and the public-release prerequisites. The original supplied HDB acquisition gap remains unresolved.

Final selection contains **234,739 footprints: 13,209 HDB, 1,912 URA and 219,618 Overture**. Across 429,183 raw rows, the audit reconciles 166,238 exclusions, 28,206 suppressions and the selected records. Heights are 2,392 direct-source, 20,610 floor-derived and 211,737 illustrative. There remain 6,280 minor and 3,574 non-minor retained overlap pair records. All emitted geometries/source IDs/chunk hashes passed validation. Final local regressions passed: 266 Node tests, 19 Python tests, all six model CLIs, application/strict-module TypeScript and the production build.

The final-data desktop sweep reached ready in all 14 fixed cameras. Rendered counts include Tiong Bahru 1,512, Orchard 1,729, Downtown 1,667, Tuas 1,976, industrial 1,273 and Serangoon Gardens 2,280. Current same-camera URA counts for those views are 215, 14, 59, 0, 0 and 151. These are viewport/tile observations, not inventory or completeness counts. The report retains their separate method and first-pass compatibility-test scope.

Three final-data mobile views at 390×844 also reached ready, rendering 492 Tiong Bahru, 428 industrial and 978 private-housing features. The inspected mobile Tiong Bahru screenshot exposes inherited HDB labels and an attribution/legend collision; Terminal 3 must update labels and make the credits responsive/collapsible without dropping attribution. Independent review found no new correctness blocker for internal handoff, with the decision audit/manifest hash reconciled. These findings do not clear public release or complete mobile production UI integration.

The [7C.1 report](PHASE7C1_ISLANDWIDE_BUILDING_COVERAGE.md) provides the final 14-district inventory and area table, 1,119-chunk output measurements and independent sample gallery. That audit uses polygon intersections and separately reports selected union area; the old table uses bbox intersection. Do not subtract those tables as net additions without recomputing a comparable baseline. The summed uncovered area at suppression decisions is a non-unique diagnostic, not final unique lost coverage. All 332 subzones have selected records, which establishes geographic presence rather than completeness.

Selected subzone counts reconcile to all 234,739 records with no unassigned features. Their summed footprint area is about 105.010 km²; it includes retained overlaps and is not a national union or a coverage fraction. The local 7C.1 data/renderer handoff is validated, while production integration and public-release licensing remain unresolved. No Phase 7A.1 validation is claimed.

Independent sample review retained 8,537 of 9,646 candidates with exact original geometry. A remaining courtyard conflict is explicit: `ura:418148` fills the hole preserved within `hdb:941523`; the data alone does not establish whether it is a real roof or erroneous infill. The final view is not claimed to be factually resolved or overlap-free.
