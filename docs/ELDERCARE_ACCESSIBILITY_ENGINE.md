# Phase 6A — AAC geographic accessibility

## Plan and implementation decisions

Worktree clean at `a3b7d21` on `feature/synthetic-population`. User brief is the specification. No frontend, shared citizen contract, Phase 4C, MRT, roadmap, credentials or branch operations will change.

- [x] Audit MOH GeoJSON and annual AAC statistics; curate a small operator-corroborated, address-matched AAC subset, preserving unknown classifications and historical coordinates.
- [x] Write failing independent geometry, data-quality and weighted-outcome fixtures; implement versioned facility/intervention/origin/result types and input validation.
- [x] Implement deterministic nearest compatible facility comparisons with explicit-origin proxies, unknown-location/no-baseline statuses, grouped denominators and separate unknown capacity.
- [x] Add offline preparation/simulation CLIs, performance measurements, all regression/type/build checks, independent review and integration documentation.

Architecture: standard TypeScript/Node modules under `prototype/eldercare/`, existing Phase 4A generator only. No paid routing, GIS dependency, database, UI or HTTP endpoint. Engine accepts explicit provenance-labelled coordinates; demonstration assigns only a documented, limited subzone proxy and leaves the rest unlocated. Only AAC geographic access is calculated; nursing/day care/rehabilitation are not interchangeable. Result schema is independent of MRT and citizen v1.

Initial data finding: 133 MOH locations, record update string `20160728192327` throughout, no service-type/capacity field and no AAC-labelled records. Catalogue page updated 2024-06-06 does not establish facility currency. Corroboration uses current operator service/address listings, not name-based inference; opening dates and service boundaries remain unknown.

## Source selection, retrieval and dates

**This is a limited, dated AAC subset—not a complete Bukit Merah or Singapore accessibility assessment.** Sources investigated on 27 October 2026:

| Source | Findings and use |
| --- | --- |
| MOH [Eldercare Services](https://data.gov.sg/datasets/d_f0fd1b3643ed8bd34bd403dedd7c1533/view), `d_f0fd1b3643ed8bd34bd403dedd7c1533` | Catalogue updated **6 June 2024**; all 133 feature update attributes are **28 July 2016**, timezone unspecified. Selected source of unchanged historical coordinates. Contains mixed legacy services, not an AAC inventory. |
| AIC [AAC service guidance](https://www.aic.sg/care-services/active-ageing-centres) | Describes AAC activities and broad age 60+/Citizen/PR criteria. AAC (Care) also provides day care/rehabilitation. Confirms that types differ; does not establish individual eligibility, catchments, capacity or current opening status. The directory needs interactive search; its initial empty page is not evidence of zero centres. |
| SingStat [Annual SAC/AAC statistics](https://data.gov.sg/datasets/d_0f70d7095a527be4ea443a7e30597896/view), `d_0f70d7095a527be4ea443a7e30597896`, table M890851 | Updated **10 June 2025**, 4 series × 14 annual columns, 2011–2024. Financial-year basis (April–March). FY2024 reports **223 AACs** and **500,435 seniors having access**. Aggregate reference only; not geocoded, not a target for reconciling our subset or threshold estimates. |
| NTUC Health facility pages | Four current service-name/address listings corroborate specific MOH points; facts and links are recorded in `corroborations.ts`. No large directory scraping, operator HTML/programmes or logos are stored. Site listing does not prove on-the-day opening. |
| SingStat Census 2020 | Existing validated subzone × age × sex input, updated 18 June 2021, reused through Phase 4A. No population generator changes. No projection of 2020 age bands/population to 2026. |

Public retrieval succeeded without project credentials using:

```powershell
$datasetId = 'd_f0fd1b3643ed8bd34bd403dedd7c1533'
$download = Invoke-RestMethod "https://api-open.data.gov.sg/v1/public/api/datasets/$datasetId/poll-download"
Invoke-WebRequest -Uri $download.data.url -OutFile tmp/eldercare/moh-retrieved.geojson
# Repeat with d_0f70d7095a527be4ea443a7e30597896 for annual-aac.csv.
```

The downloaded MOH file is semantically identical to the supplied input (all features/attributes/coordinates/CRS). Byte hashes differ; the existing original was not overwritten. Raw downloads remain in ignored `tmp/eldercare/`.

| Artifact | SHA-256 |
| --- | --- |
| Original `data/facilities/EldercareServices.geojson` | `40ba0385565252b9c06f345abf9e590ce830f3f68190ea19f8616000741f83a9` |
| Retrieved MOH GeoJSON | `0db8209b8672f99d1c22c2f73964564b379a5c3b65f011cc9bffec85c5372b36` |
| Retrieved annual CSV | `f42634413d3120890b378d83b56319ec8b401185096fc52402c207db84168019` |
| Original Census CSV | `6ac3e693eb7d36b9fc066df6accd290ce7341984d9e40ce80080819d75091e5a` |
| Original GTFS `stops.txt` | `577caf2542dc4ea6ba2a90c3333138c82a8580e6c280c9dfe8ff253faa3453e2` |
| Original MP2019 subzone GeoJSON | `77e30aa02b1784b649d9b6f23e3b2ebb825af787de554f3a3fb76bbee3013c42` |

MOH and annual-statistics dataset pages explicitly offer the [Singapore Open Data Licence](https://data.gov.sg/open-data-licence). Retain source/access-date/licence attribution and do not imply endorsement. The factual operator crosswalk is narrowly curated; operator pages remain copyrighted and are not redistributed. Supplied local geography/GTFS acquisition provenance remains limited as described in existing reports; their coordinate hashes identify artifacts, not independently surveyed residential positions. No restricted directory or paid routing data is used.

## Catalogue preparation and classification

`prepareFacilityCatalogue(raw, corroborations?, metadata?)` parses the KML-derived `Description` table rather than treating `properties.Name` (`kml_…`) as the centre name. It decodes text entities and retains historical name, source record/index, address, postal code, update field and provenance. Data fields present are `NAME`, address components, `DESCRIPTION`, `HYPERLINK`, `LANDXADDRESSPOINT`, `LANDYADDRESSPOINT`, `PHOTOURL`, `INC_CRC`, `FMEL_UPD_D`; none establishes service class or capacity. Zero land-address X/Y fields are not used as coordinates.

GeoJSON declares **CRS84**, longitude then latitude in degrees. Point positions include a third zero altitude; preparation validates it, then retains named `{lat,lon}` without inventing elevation. Absent CRS uses GeoJSON's WGS84 convention; explicit incompatible CRS such as SVY21/EPSG:3414 is rejected, requiring a separate verified conversion. Coordinates must be finite and inside declared Singapore-region bounds (latitude 1.15–1.50, longitude 103.60–104.10). These bounds are not a land, entrance or cadastral check. Missing/malformed/out-of-region points are excluded and recorded; there is no geocoding or silent repair.

| Check | Result |
| --- | ---: |
| Raw records / structurally usable points | 133 / 133 |
| Excluded malformed/duplicate records | 0 |
| Missing names / addresses / postal codes | 0 / 0 / 0 |
| Co-located groups | 12 (retained; different services can share a building) |
| Address/type-corroborated AACs | 4 |
| Unclassified historical services, excluded from AAC baseline | 129 |
| AAC (Care) with an address-matched source point | 0 |
| Known opening dates / capacities | 0 / 0 |

Four selected records:

| MOH ID | Corroborated AAC listing | Matching postal/unit |
| --- | --- | --- |
| `kml_6` | [NTUC Health Bukit Merah](https://ntuchealth.sg/active-ageing/locations/active-ageing-centre-bukit-merah) | 160117, 117 Jalan Bukit Merah #01-1683 |
| `kml_92` | [NTUC Health Bukit Merah View](https://ntuchealth.sg/active-ageing/locations/active-ageing-centre-bukit-merah-view) | 151117, 117 Bukit Merah View #01-205 |
| `kml_113` | [NTUC Health Redhill](https://ntuchealth.sg/active-ageing/locations/active-ageing-centre-redhill) | 150071, 71 Redhill Road #01-29 |
| `kml_114` | [NTUC Health Telok Blangah](https://ntuchealth.sg/active-ageing/locations/active-ageing-centre-telok-blangah) | 090041, 41 Telok Blangah Rise #01-373 |

Classification requires a curated exact source-name match, postal match and normalised full street/unit address match. A conflict remains `unknown` and is audited; no classification is guessed from a legacy name. Duplicate IDs or same-name/same-point records are excluded; differently named co-locations remain flagged. Source capacity-like attributes, if encountered, are audited as unsupported and never become official capacity values.

The [AAC (Care) Bukit Merah Silat listing](https://ntuchealth.sg/active-ageing/locations/active-ageing-centre-care-bukit-merah-silat) is publicly identifiable, but has no matching MOH point in this input; no location was fabricated. The [operator directory](https://ntuchealth.sg/active-ageing/locations) also contains temporary/changed addresses for some legacy sites, illustrating why historical name matching alone is unsafe. This is not an exhaustive verification of the remaining 129 records.

## Engine, intervention and population assumptions

`parseEldercareIntervention` validates schema 1: ID, name, `serviceType:'aac'`, `status:'hypothetical'`, named WGS84 position, assumed availability, optional illustrative capacity, age-only eligibility interpretation, rationale and assumption IDs/descriptions. Unsupported AAC (Care)/nursing/day-care/rehabilitation proposals are rejected. Catalogue types retain those discriminators for future extension, but the initial calculation compares **AAC to AAC only**. AIC describes overlapping basic services at AAC (Care); deliberately including them later needs a reviewed compatibility rule, not an automatic merge of service types.

Existing opening dates/capacities remain null. Selected sites carry `listed-unconfirmed`, not verified-open status. Options explicitly choose `assume-listed-available` or `exclude-unconfirmed`; closed and unclassified sites are not silently included. The scenario adds the proposed centre only when `assumed-available`. An unavailable proposal leaves the baseline unchanged. Capacity remains an independent assumption: changing proposed capacity does not limit geographic coverage or calculate enrolment, occupancy, utilisation, waiting lists or placements.

`OriginReference` identifies one geographic unit and a provenance-labelled coordinate: method, description, source URL, date and assumption ID. Engine inputs reuse Phase 4A `SyntheticPopulation`, including IDs, geography, sex, age bands, weights and source rows; duplicate IDs, nonpositive/nonfinite weights, inconsistent provenance/totals and malformed categories fail. Missing unit references stay unlocated. No individual `home` or observed origin field is created.

Age targeting defaults to **60+ in Census 2020 bands**. Cutoffs must align to complete bands (60,65,…,90); a cutoff such as 62 is rejected rather than inventing exact ages. No ageing-forward or demographic projection is performed. Age targeting does not confirm service-boundary eligibility, opening availability, personal needs, interest or registration. The national rounded leaf total **4,047,260** remains distinct from published **4,044,210** (difference **3,050**); no weights are renormalised.

## Geometry and weighted formulas

Distance uses `2R × asin(sqrt(sin²(Δlat/2) + cos(lat1)cos(lat2)sin²(Δlon/2)))`, degrees converted to radians, **R=6,371,008.8 m**. Every origin is compared with all available compatible facilities and the proposed point. Nearest ties retain the existing facility; baseline ties resolve by sorted ID. Scenario distance cannot worsen in this additive model. Origin calculations are cached per geographic unit within a run; no global cache or spatial index is needed.

Optional `straightLineWalkingMetresPerSecond` converts distance to assumed minutes as `metres / speed / 60`. The result is named `assumedStraightLineWalkingMinutes`: it is not a measured pedestrian route. Roads, barriers, slope, crossings, sheltered access, accessibility needs and network detours are absent.

For an age-targeted group, let `P` be its full population weight, `L` located weight, `B` weight with finite baseline distance, `S` finite scenario weight and `C` finite before/after comparable weight. All outputs state these separately. Under the additive model `C=B`; unavailable baseline distances remain null.

| Metric | Definition / denominator |
| --- | --- |
| Targeted / located / unlocated | `P`, `L`, `P−L`; unlocated is unknown, not unaffected |
| Compatible existing facility population | `B` |
| Mean baseline / scenario distance | weighted finite distances divided by `B` / `S` respectively |
| Mean reduction | `Σ(C) weight × (baseline−scenario) / C` |
| Closer / no improvement | comparable weights with strictly lower / equal scenario distance; sum to `C` |
| Baseline / scenario threshold counts | finite distances `≤ threshold`; their shares use `B` / `S` |
| Newly within threshold | comparable weight with baseline above and scenario within threshold |
| Percentage-point change | `100 × (paired scenario count − paired baseline count) / C` |

Each share includes numerator weight, denominator weight and a denominator label. Paired shares are supplied separately, preventing a change between percentages with different denominators. A zero denominator produces null, never NaN/Infinity. When no compatible baseline exists, `baseline-unavailable` comparisons have null reduction, no asserted newly covered gain, and a separate `scenarioAccessWithoutBaselinePopulation`. If neither side has a facility, status is `no-facilities`. Empty age cohorts and empty whole populations are valid with zero weights and null estimates; nonpositive actual citizen weights are rejected. No unknown location or missing baseline is assigned a fabricated distance.

Breakdowns cover overall, older age bands, sex, represented areas and area/subzone pairs. Groups overlap: do not add age and geography totals together. Unlocated geographic groups are listed with agent counts and weights so missing data cannot disappear into an apparent no-impact result. Counts are expansion-weighted geographic scenarios, not forecast enrolment.

## Demonstration and calculated results

The reproducible example uses **2,000 Bukit Merah agents**, seed `eldercare-demo`, and two public landmarks drawn from repository GTFS: Redhill EW18 `{lat:1.28961954,lon:103.81679}` and Tiong Bahru EW17 `{lat:1.28613223,lon:103.827454}`. At runtime, `demo.ts` checks their membership in the expected MP2019 subzones, including polygon holes; origin provenance contains raw source hashes. They are illustrative unit reference points, not residential centroids or homes. Assigning each supported subzone's entire weight there is a strong spatial sensitivity assumption; other subzones remain unlocated. No point was selected by optimising facility benefits.

Proposed AAC: `{lat:1.287,lon:103.824}`, assumed available, unknown capacity. This is an unsurveyed illustrative location, not a buildable/approved site. Default thresholds **500 m and 1,000 m** are scenario assumptions, not asserted official AAC service standards.

| Default result | Represented age-targeted population / distance |
| --- | ---: |
| All 60+ Census 2020 population in the generated area | 44,520 |
| Located / comparable at the two proxies | 6,230 |
| Unlocated, retained as unknown | 38,290 |
| Closer nearest facility | 3,890 |
| Comparable with no improvement | 2,340 |
| Mean baseline → scenario, denominator 6,230 | 410.44 → 347.46 m |
| Mean reduction, denominator 6,230 | 62.98 m |
| Baseline → scenario population within 500 m | 6,230 → 6,230 |
| Newly within 500 m / 1,000 m | 0 / 0 |
| Paired coverage change at either default threshold | 0 percentage points |

Redhill proxy (weight **2,340**) remains **266.92 m** from the Redhill AAC. Tiong Bahru Station proxy (weight **3,890**) changes **496.78 → 395.91 m**, a **100.87 m** reduction. At an explicitly different **400 m** threshold, located coverage changes **2,340 → 6,230**, or **37.5602% → 100% of comparable weight**, a **62.4398-point** change. This sensitivity is not an official access claim. Python CSV calculations independently confirmed 44,520 targeted and 2,340/3,890 mapped leaf counts. Do not extrapolate either threshold result to unmapped residents or omitted facilities; a fuller facility inventory could change the baseline substantially.

## CLI and performance

```powershell
npm.cmd run eldercare:prepare
npm.cmd run eldercare:simulate
npm.cmd run eldercare:simulate -- --thresholds 400,500,1000 --capacity 100
npm.cmd run eldercare:simulate -- --size 5000 --benchmark
node prototype/eldercare/cli.ts --json
```

Preparation writes **ignored** `data/derived/eldercare/catalogue.json` with the catalogue and full exclusion/co-location/classification audit. Simulation always revalidates the raw local input, so it needs no live API or pre-existing derived file. Defaults print only overall metrics, assumptions and diagnostics. JSON exports the validated compact response (not all citizens or raw HTML/GeoJSON). With `--json --benchmark`, timings go to stderr, leaving stdout valid schema-1 JSON. CLI paths resolve relative to the module. Supported flags: `--size`, `--seed`, `--thresholds`, `--lat`, `--lon`, `--capacity`, `--walking-speed`, `--json`, `--benchmark`.

Measured on this Windows workspace, Node 24.18.0, one fresh CLI process per size:

| Agents | Facility preparation ms | Population + proxy preparation ms | Accessibility + validation ms | Total ms | End heap MiB | End RSS MiB |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 9.281 | 105.461 | 23.986 | 138.728 | 31.19 | 99.59 |
| 2,000 | 9.338 | 100.863 | 47.323 | 157.524 | 29.65 | 108.35 |
| 5,000 | 17.122 | 106.843 | 108.212 | 232.178 | 51.91 | 128.75 |

Timings begin before catalogue file loading and exclude process startup/imports/output serialization. Memory figures are end-process snapshots, not peak or incremental allocations; GC/system load vary. Each run uses **10 distance evaluations**: two located units × (four baseline AACs + proposed centre). No heavyweight spatial framework or index was justified. The 400 m, 2,000-agent JSON example was **70,398 bytes**, including grouped metrics, provenance and four facilities, without the complete population. Performance is not a throughput guarantee for much larger numbers of distinct origins/facilities.

## Integration contract and exports

- `prototype/eldercare/prepare.ts`: `prepareFacilityCatalogue`, `parseKmlAttributes`.
- `prototype/eldercare/scenario.ts`: `parseEldercareIntervention`, `validateOptions`, `validateOrigin`.
- `prototype/eldercare/accessibility.ts`: `haversineMetres`, `simulateEldercareIntervention`.
- `prototype/eldercare/contract.ts`: `ELDERCARE_SCHEMA_VERSION`, `parseEldercareResponse`, `assertEldercareResponse`, public types. This boundary imports successfully with Node modules blocked.
- `types.ts`: facility/catalogue/intervention/origin/options/comparison/grouped-metric/response types. `corroborations.ts` holds the small factual crosswalk; `demo.ts` is a Node-only demonstration adapter.

```ts
const catalogue = prepareFacilityCatalogue(rawMohJson);
const result = simulateEldercareIntervention(
  catalogue, proposedAac, existingSyntheticPopulation, explicitOriginReferences,
  {
    referenceDate: '2026-10-27', minimumAge: 60,
    thresholdsMetres: [500, 1000],
    existingAvailability: 'assume-listed-available',
    eligibility: 'age-only-other-criteria-unknown',
  },
);
// In the future frontend, validate decoded JSON with parseEldercareResponse.
```

Response schema 1 contains engine/result basis, deterministic `scenarioId`, full intervention/options, facility/Census/origin provenance, compatible baseline facility points, individual-origin comparisons, demographic metrics, unlocated geography, separate capacity assumptions and diagnostics. Identity hashes actual catalogue/population/origin/intervention/options inputs, including threshold, location, capacity, availability, source and seed. Functions clone inputs and retain no mutable calculation state. Schema validation checks nested evidence, service/status compatibility, nearest-facility existence, arithmetic/coverage partitions, denominator labels, empty cohorts and impossible means.

Terminal 1/3 can add a Node handler that loads validated inputs, parses the proposed AAC, calls this function, and returns the response. Keep raw population preparation and hashing on the server. The browser needs only the eldercare-specific response contract; no MRT comparison fields are reused. Existing `/api/impact`, profile routes and citizen schema v1 are unchanged. Show the limited-catalogue, proxy, reference-year, unknown-origin and capacity labels in the future UI. A future explanation model must consume these calculations and must not invent health, loneliness, uptake or placement effects.

## Verification, review and worktree handoff

**155 tests passed, 0 failed**: all **131 checkpoint tests** plus **24 eldercare tests**. Focused suite covers parsing/malformed CRS/coordinates, classifications/evidence/conflicts, duplicates/co-location, capacity fields, spherical distance/symmetry, exact thresholds, weighted heterogeneous fixtures, age boundaries, unknown origins/baseline/statuses, empty cohorts, nulls, walking conversion, identity, immutability, invalid weights, serialized contract rejection and repeatable offline CLI. One-degree equatorial distance and a heterogeneous fractional-weight mean were independently calculated; routine tests make no network requests.

Passed: `eldercare:prepare`, `eldercare:simulate`, `agents:generate`, `agents:impact`, `mrt:validate`, `mrt:simulate`, `npm.cmd test`, application TypeScript, explicit new-module/test TypeScript and `npm.cmd run build` (all eight pages generated). `git diff --check` passes. Explicit check:

```powershell
node_modules/.bin/tsc.cmd --ignoreConfig --noEmit --strict --skipLibCheck --types node --target ES2022 --module nodenext --moduleResolution nodenext --allowImportingTsExtensions prototype/eldercare/cli.ts prototype/eldercare/contract.ts prototype/eldercare/tests/eldercare.test.ts prototype/eldercare/tests/cli.test.ts
```

Independent read-only review found no distance/weighting defects. It identified response-boundary gaps around nested evidence, geographic group types, impossible means and missing/closed-facility semantics, plus an unnecessary quadratic membership check. Regression cases and validation fixes address those findings; membership now uses a Set. Initial failing tests were observed before implementation. No known failing checks remain. A compiler invocation using shell globs initially failed on Windows; the explicit entry-point command above checks all transitive modules and tests successfully.

Actual tools: local PowerShell/Git/Node/Python/patch tooling; MCP tool/resource discovery; Search MCP for operator listings; built-in web research for MOH/AIC/SingStat/licence pages; public data.gov.sg download API; one independent read-only review agent. GitHub MCP was discovered but not called because the clean local checkpoint and source files provided the needed context. No dedicated geospatial/modelling/TypeScript skill was available. Applied skills: using-superpowers, brainstorming (autonomous brief), writing-plans, test-driven-development/good-test guidance, systematic-debugging, requesting-code-review and verification-before-completion.

Created `prototype/eldercare/{types,validation,corroborations,prepare,scenario,accessibility,contract,demo,cli}.ts`, two test files, and this report. Modified only `.gitignore` (derived eldercare output) and `package.json` (two CLI scripts and appended test glob). No dependencies/lockfile changes. Branch: `feature/synthetic-population`. Initial implementation ended uncommitted; the user subsequently authorised a local Phase 6A commit only. Frontend, Phase 4C calculations, MRT algorithms, raw datasets, shared citizen contract, roadmap and Terminal 1 worktree were not edited. No merge, rebase, reset or push occurred. `.env.local` remains ignored/untracked and unchanged; no project credentials were inspected, exposed or used for data retrieval. The normal Next.js build loaded its environment without printing values.

Rebuild during the hackathon: obtain the permitted dated raw MOH/Census inputs, verify hashes/licences, recreate the small audited corroboration list, types/validators and Haversine/weighted calculations, run the preparation/simulation/tests/type/build commands, then integrate a Node endpoint and map placement in Phase 6B. Recheck operator addresses and catalogue coverage before extending the geographical scope. Retain both the existing MRT flagship and AAC second intervention.

**Phase 6A is ready as a limited-area quantitative foundation for Phase 6B. Phase 6 is not complete.** Current facility opening/service boundaries/capacity, comprehensive AAC (Care) geocoding, population-residential distribution, pedestrian networks, personalised needs/eligibility and attendance are unresolved. These are geography-and-assumption calculations, not an authoritative forecast of service use or downstream health/social outcomes.
