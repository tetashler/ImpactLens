# Citizen-grounding official aggregate snapshots

These four new, unmodified CSV snapshots supplement the existing Census residential population, MP2019 geography and transport files. Existing datasets remain at their original paths. The snapshots are Singapore Department of Statistics Census of Population 2020 aggregates, published through data.gov.sg and acquired on 31 October 2026.

| Table | Original snapshot | Grain | Rows / columns |
|---|---|---|---:|
| CT/17565 | [Labour-force status](singstat-census2020-ct17565/original.csv) | Residence planning area × sex × labour-force status, aged 15+ | 32 / 16 |
| CT/17586 | [Workplace / residence region / mode](singstat-census2020-ct17586/original.csv) | Workplace planning area × residence **region** × broad commuting mode | 48 / 31 |
| CT/17594 | [Usual transport mode](singstat-census2020-ct17594/original.csv) | Residence planning area × detailed usual commuting mode | 32 / 13 |
| CT/17582 | [Broad occupation](singstat-census2020-ct17582/original.csv) | Workplace planning area × broad occupation | 48 / 11 |

Each source folder contains its publication URL, original download object path, reference period, schema, source hash, licence, attribution and exclusions in `source-metadata.json`, with a human-readable `README.md`. Expiring signed URL query parameters were not retained. Acquisition used the [documented public download API](https://guide.data.gov.sg/developer-guide/dataset-apis/download-dataset). The [Singapore Open Data Licence](https://data.gov.sg/open-data-licence) applies; inclusion does not imply government endorsement.

The first direct API request was unavailable, and the free API temporarily rate-limited a later request. The documented poll-download endpoint supplied the original files after its quota window. There were no paid API calls or additional source-page fetches by the application.

## Evidence boundaries

- CT/17586 is not a residence-planning-area to workplace-planning-area matrix. Recipe 1.0.1 first assigns detailed mode using CT/17594, then uses the available residence-region × broad-mode × workplace joint for unambiguous rail/bus and car/taxi categories. Disaggregation within each region/mode cell remains synthetic. Other/mixed modes use an explicitly independent regional-total fallback; unknown modes retain unknown worksites.
- The Works-from-Home row is structurally inapplicable to the public/car work-trip conditionals and is excluded without interpreting its dash as a measured zero. Any other applicable missing cell leaves that entire conditional unassigned and unassessed; it is never silently dropped to renormalise a supposedly complete distribution. Unmapped outside-Singapore/no-fixed-location categories remain unknown rather than fictional Singapore worksites.
- Labour/occupation and transport denominators differ. Transport excludes employed full-time students and people overseas for at least six months. Published totals are not silently reconciled.
- Missing/dash/nil-negligible markers remain `null` with reasons. A category lacking usable coverage is not substituted with an observed zero or another residential area's distribution.
- Detailed employment relationship, full-/part-time nature, job titles and schedules are fictional declared templates. No individual employer, qualification, home address, real worksite, personality or political preference is inferred.
- CT/17593 was not acquired because this prototype uses the already obtained workplace-conditioned broad occupation table. MOM schedule and employment-nature calibration are deferred; the current 90/10 relationship and 80/20 nature templates are explicitly synthetic rather than claimed official estimates.
- Source sex terminology is retained. Exact age is seeded within closed source age bands; the open 90+ band remains unknown.

## Synthetic sidecar and validation

`scripts/generate-citizen-circumstances.ts` extends the existing 10,000 weighted population using its original citizen IDs, source strata and weights. It writes an immutable content-addressed snapshot and manifest into ignored `data/synthetic/`, without editing the population source.

The manifest freezes source hashes, generation seed/version, geography hash, region mapping hash, station catalogue hash, assumptions and calibration residuals. Whole representatives retain their original weights. Calibration tolerances equal the largest representative weight times the number of categories for that conditional group; they are engineering allocation bounds, not confidence intervals or proof of real-world accuracy. Targets are source proportions scaled to the synthetic eligible group. Workplace targets are stratified by residence region and broad mode, with separately named fallback groups. Unmapped workplace categories retain unknown assignments and are reported as unassessed rather than a calibration PASS.

Workplace calibration applies after no-work-trip assignment, so discarded provisional worksites cannot inflate realised coverage. Household, income, real establishment and qualification data remain unavailable. Residential and workplace coordinates are existing polygon-interior fictional proxies; nearest station distance is straight-line access, not a measured walking route. No vector database or additional population generator is introduced.
