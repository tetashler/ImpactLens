# Phase 4C — Population-weighted MRT impacts

## Implementation plan and scope

User brief is the specification. Worktree verified clean on `feature/synthetic-population` at `98c91d6`. No frontend, contract definitions, MRT algorithms, raw datasets, roadmap, environment or branch operations will be changed.

Architecture: pure assignment/aggregation modules under `prototype/agents/impact/`; orchestrator calls the existing MRT simulation once with deduplicated pairs and validates the unchanged citizen payload. Richer denominator/accessibility metrics live in a companion report because schema v1 rejects additional fields. Profiles resolve from full population, not render sample. No API route is needed for this reusable server-side foundation.

- [x] Write failing fixtures for weighted means/coverage, assignment determinism and real engine/contract/profile integration.
- [x] Implement typed assumptions with explicit agent OD overrides or geography station rules, plus optional distance-limited nearest station from declared subzone reference points. Missing geography/eligibility stays unassigned. No centroid is treated as a home.
- [x] Implement one-call deduplicated routing, full-population grouped metrics and validated render subset/profile payloads. Additional metrics retain denominator weights and nulls for unknowns.
- [x] Add CLI/benchmark, run all tests and TypeScript checks, independent review and document actual results.

Rulings: use existing Census 2020 and MRT sources without new demographic requests. Inspect available geography/OD locally; OD totals have no age/sex linkage, so default demand remains illustrative. Do not renormalise 4,047,260 leaf counts to published 4,044,210. Empty engine populations return an explicit error because v1 requires a positive population; empty metric cohorts remain valid. Nonpositive citizen weights are rejected to honour v1.

## Data and geographic investigation

- **Demographics used:** SingStat [Census 2020, table CT/17560](https://tablebuilder.singstat.gov.sg/table/CT/17560), [data.gov.sg dataset d_d95ae740c0f8961a0b10435836660ce0](https://data.gov.sg/datasets/d_d95ae740c0f8961a0b10435836660ce0/view), updated 18 June 2021. Local input is revalidated using Phase 4A; original SHA-256 remains `6ac3e693eb7d36b9fc066df6accd290ce7341984d9e40ce80080819d75091e5a`. Joint subzone × age × sex cells are preserved. Retain the source and [Singapore Open Data Licence](https://data.gov.sg/open-data-licence) attribution already documented in Phase 4A.
- **Transport used:** existing eight-file MRT/LRT GTFS and unchanged validated engine, selected service date **2026-10-27**. This date selects service, not the publication date of an independently authenticated live timetable. Preserve existing quarantine, median hop times and explicit initial/transfer waits; provenance/calibration limitations remain in the MRT reports.
- **Geography investigated:** local `MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson`, 332 URA Master Plan 2019 features. Python verified all 332 normalised `(PLN_AREA_N, SUBZONE_N)` pairs match Census area/subzone pairs, with no unmatched pairs. Coordinates are longitude/latitude; map preprocessing retains geometry and reports source update attributes spanning 2019–2021. Download/licence provenance remains unresolved as documented in `MAP_GEODATA_NOTES.md`. No population density or residential occupancy follows from polygon area or HDB footprints.
- **OD investigated, not used:** local `origin_destination_train_202609.csv`, **887,478 records**, period **2026-09**, day labels `WEEKDAY` and `WEEKENDS/HOLIDAY`, no empty fields. Columns: `YEAR_MONTH,DAY_TYPE,TIME_PER_HOUR,PT_TYPE,ORIGIN_PT_CODE,DESTINATION_PT_CODE,TOTAL_TRIPS`. Combined labels such as `EW12/DT14` require a reviewed station-code crosswalk. [LTA DataMall](https://datamall.lta.gov.sg/content/datamall/en/dynamic-data.html) describes monthly station-pair trip volumes, and its [API guide](https://datamall.lta.gov.sg/content/dam/datamall/datasets/LTA_DataMall_API_User_Guide.pdf) lists `/ltaodataservice/PV/ODTrain`. Local schema has no age, sex or residential geography. This phase does not authenticate that file's download, calibrate its temporal totals, or use it to assign trips. No LTA credential/API request was needed.

**Geographic allocation:** explicit station rules can select an area-wide illustrative origin, with subzone-specific rules taking precedence. Alternatively, `reference-point-nearest` accepts declared `{planningArea,subzone,lat,lon,basis}` reference points. It selects the nearest served baseline station by Haversine distance (Earth radius 6,371,008.8 m), subject to configurable `maxDistanceMetres`; equal-distance ties resolve by station ID. Missing unit data and points outside the cap stay unassigned. Selection is cached per geographic unit within a run. This is straight-line proximity, not a walking network or verified catchment. Access/egress minutes are not added to the station journey.

Automatic polygon centroids are deliberately not generated. An area centroid may lie outside a polygon or represent nonresidential land; the name crosswalk alone cannot justify placing residents there. If callers derive reference points later, retain their method and source in `basis`; none should be represented as an individual's home or animated pedestrian route.

## Assignment configuration

`ImpactAssumptions` records ID/version, substantive description, service date, seed, optional eligible age groups/sexes/planning areas, and the fixed `retain-unknown` policy. Dates must match the graph. Unknown fields, contradictory methods, duplicate rules/agents/destinations, invalid coordinates, nonfinite shares/rates, invalid demographic categories and unavailable explicit origin-rule stations fail validation.

Two travel methods:

1. `explicit-od`: one optional pair per synthetic `agentId`. Omitted or ineligible agents remain unassigned. Endpoint strings are passed through the existing simulator, retaining invalid/new-station/unavailable statuses rather than silently repairing destinations.
2. `destination-distribution`: eligible representatives participate according to a declared probability, obtain an origin using the chosen geographic rule, and draw a destination from positive relative shares. SHA-256 draws keyed by seed, agent ID and purpose make assignment repeatable and independent of input order. Shares are normalised as probabilities, **not population weights**. Each selected representative assigns its entire weight to one assumed trip; realised weighted shares can differ from configured probabilities. Changing population sample size also changes IDs and assignment realisation.

Aliases are canonicalised before deduplicating station pairs. Each distinct pair is simulated once on each network by **one `simulateIntervention` invocation per run**, including scenario construction when there are no assigned trips. No alternative router or global route cache is introduced. `diagnostics.routingCalls` counts simulator invocations; `uniqueOdPairs` reports its pair count.

Default illustrative demand (`impact/example.ts`): 2,000 Choa Chu Kang representatives, seed `phase4c-demo`; 80% participation; assumed NS4 origin for the area; destination shares NE16 50%, NS4 25%, NS5 25%. Eligibility is unrestricted. These are invented sensitivity inputs, not a measured commuting distribution. Same-station journeys intentionally exercise valid zero-duration outcomes.

## Metrics and denominators

Let `w[i]` be unchanged Phase 4A expansion weights. Every agent belongs to exactly one outcome bucket: unassigned, compared, newly reachable, unreachable, invalid. Coverage exposes their weighted populations plus represented, assigned and comparable totals. Groups include overall, all 19 age bands (including empty cohorts), both source sexes, represented planning areas and `(planningArea,subzone)` pairs. Groups overlap; do not sum age groups and geographic groups together.

Let `C` be both-side reachable comparisons and `A` assigned non-invalid outcomes (compared + newly reachable + unreachable). For `i ∈ C`, `s[i] = baselineMinutes − scenarioMinutes` and `t[i] = scenarioTransfers − baselineTransfers`.

| Output | Calculation / denominator |
| --- | --- |
| Benefiting population | `Σ w[i]` where `i ∈ C` and `s[i] > 0` |
| Benefiting share | benefiting population / `Σ(C) w[i]` |
| Unchanged share | `Σ(C, s=0) w[i] / Σ(C) w[i]` |
| Mean minutes saved | `Σ(C) w[i] × s[i] / Σ(C) w[i]` |
| Total modelled minutes saved | `Σ(C) w[i] × s[i]`, across one assumed trip per comparable represented resident |
| Mean transfer change | `Σ(C) w[i] × t[i] / Σ(C) w[i]` |
| Baseline/scenario threshold share | `Σ(A) w[i] × I(side reachable and duration ≤ threshold) / Σ(A) w[i]` |
| Threshold change | `100 × (scenario share − baseline share)`, percentage points |

Every share includes numeric numerator, denominator weight and a named denominator. Invalid endpoints are excluded from accessibility's denominator; their population remains visible in coverage. Valid but unreachable/unavailable journeys are not accessible under that threshold. Newly reachable residents can improve threshold coverage but have **null finite time savings**; never assign them infinite savings. This differs intentionally from the mean-saving denominator. Zero-minute same-station journeys are accessible at threshold zero.

No denominator => null share/mean/change/total saving. Unassigned residents are unknown, not zero-benefit residents. Zero-weight citizens and empty whole populations are rejected by the positive-population contract; empty subgroup metrics have zero coverage and null estimates. Nonfinite arithmetic, contradictory comparison deltas/statuses, duplicate identities and inconsistent population totals fail. Fractional weights use floating-point tolerances, never integer rounding or silent reweighting.

`distributionalDifferences` compares each group's mean savings and benefiting share with the overall comparable population (minutes and percentage-point differences). It labels groups `unknown`, `no-comparable-benefit`, `some-comparable-benefit` or `all-comparable-benefit`. These are descriptive outcomes under the demand scenario, not demographic causal effects. No arbitrary cutoff defines “limited benefit”; the shares and gaps expose its magnitude.

## Shared contract and Terminal 1 handoff

The engine imports the existing public types and validators: `CitizenSimulationPayload`, `CitizenReference`, `CitizenJourneyOutcome`, `CitizenJourneyComparison`, `DemographicImpactMetric`, `CitizenProfileResponse`, `parseCitizenSimulation`, `parseCitizenProfile`. No shared definitions changed. Complete full-population identities/provenance are checked before routing; all final journeys and core metrics are validated before selecting the display subset. The returned payload is validated again. Existing IDs, age bands, geography, weights and source rows are preserved.

Schema v1 carries the core weighted counts, benefits and mean saving; its strict validator forbids new fields. Extended metrics and distributional differences therefore accompany `payload`, not fields inside it. They use shared group/outcome types. The render subset defaults to 150 and is selected by deterministic hash; it never changes metric denominators. `animations` is empty and profile animation is null: no justified home, walking path or railway alignment is generated here.

Server entry points:

```ts
import { runImpactFromLocalData } from './lib/server/population-impact-service.ts';
import { illustrativeLine } from './prototype/mrt/examples/illustrative-line.ts';
import { illustrativeDemand } from './prototype/agents/impact/example.ts';

const result = runImpactFromLocalData(
  { size: 2000, seed: 'phase4c-demo', planningAreas: ['Choa Chu Kang'] },
  illustrativeLine,
  { assumptions: illustrativeDemand, thresholdMinutes: 30, renderLimit: 150 },
);
// Send only these JSON-safe results to the browser:
const response = {
  payload: result.payload, metrics: result.metrics,
  distributionalDifferences: result.distributionalDifferences,
  diagnostics: result.diagnostics,
};
const profile = result.getProfile(agentId); // validated profile, or null if unknown
```

`getProfile` resolves **any** full-population agent, including those outside the returned display sample. Unassigned profiles explicitly contain an unassigned journey/activity, null comparison/description and no invented preferences. Assigned profiles retain the exact compact routing values and assignment/routing provenance. Return errors/unknown IDs through the future HTTP adapter as appropriate. This phase adds no HTTP route, cache, frontend component or Gemini layer. Keep `ImpactResult`/its lookup closure on the server; do not serialize raw citizens/graph or load Node modules in a client component.

For callers with existing loaded population and graph, `runPopulationImpact(population, baseline, intervention, options)` avoids local feed reloads. `runImpactFromLocalData` intentionally reloads and validates inputs on each call; caching/bounded lifecycle belongs to the later server integration. Existing map request limits and adapters remain unchanged.

## CLI, results and performance

```powershell
npm.cmd run agents:impact
npm.cmd run agents:impact -- --size 5000 --seed phase4c-demo --threshold 30 --render-limit 150 --benchmark
node prototype/agents/impact-cli.ts --size 2000 --json
```

The default prints only overall coverage, benefit/saving/threshold metrics, declared assumptions and diagnostics. `--json` adds the validated display payload, all grouped metrics and differences; benchmarks are optional and otherwise no timestamps/timings affect reproducibility. Use the direct Node command for pure JSON stdout (npm itself prints command banners). The CLI resolves data paths relative to its module. Unsupported flags, insufficient population samples and invalid numbers fail rather than fallback to fabricated data.

Representative default result (rounded here for reading; stored weights stay fractional): 2,000 agents represent **192,150** rounded CCK leaf counts. Assigned/comparable population **153,384.36**; unassigned **38,765.64**. Benefiting population **75,599.63**, or **49.2877% of comparable population**; unchanged **50.7123%**. Mean saving **21.0787 minutes**; total **3,233,144.30 modelled person-minutes for the single assumed trip**. Threshold coverage ≤30 minutes changes **50.7123% → 100% of assigned non-invalid population**, a **49.2877 percentage-point** change. Three unique OD pairs are calculated. No negative effects are invented.

Example group comparison under those exact assumptions: male comparable weight 75,771.23, benefiting share 48.8169%, mean saving 20.8773 minutes; female comparable weight 77,613.13, share 49.7474%, mean 21.2753 minutes. Age 65–69 comparable weight 6,630.63, share 42.4717%, mean 18.1637 minutes. These differences arise from the declared seeded representative assignments and weights, **not evidence about actual sex/age commuting behaviour**. Most zero-benefit comparable trips are the deliberately unchanged NS4/NS5 destinations; residents without assigned trips remain unknown.

Measured on this Windows workspace, Node **24.18.0**, one run per size; not a throughput guarantee:

| Agents | Full local load + generation + calculation (ms) | End heap (MiB) | End RSS (MiB) | Process max RSS (KiB) | Calculation with graph/population already loaded (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 1,877.33 | 370.65 | 580.78 | 598,856 | 218.57 |
| 2,000 | 2,331.62 | 387.30 | 606.20 | 620,748 | 256.53 |
| 5,000 | 2,551.14 | 392.38 | 625.69 | 640,712 | 850.17 |

Full-run measurements use separate CLI processes and include the existing large GTFS load/graph construction. Loaded-input measurements share one baseline and exclude population generation; runs are sequential and include allocation, routing, aggregation, full/subset validation and profile lookup construction. End heap/RSS are process snapshots, not incremental allocations; max RSS comes directly from `process.resourceUsage().maxRSS`. GC and system load cause variation. No claim that all memory is new engine overhead. The 150-reference, 29-group JSON responses measured **183,951 / 183,841 / 185,970 bytes** respectively; full raw datasets/graph are not included. Route work stays at three unique pairs in this demo; a scenario with thousands of unique pairs will cost more.

## Verification, tools and rebuild

`npm.cmd test`: **104 passed, 0 failed** (all 84 checkpoint tests + 20 impact tests). Focused impact suite: 20/20. App TypeScript and explicit new CLI/test TypeScript checks passed:

```powershell
node_modules/.bin/tsc.cmd --noEmit --incremental false
node_modules/.bin/tsc.cmd --ignoreConfig --noEmit --strict --skipLibCheck --types node --target ES2022 --module nodenext --moduleResolution nodenext --allowImportingTsExtensions prototype/agents/impact-cli.ts prototype/agents/tests/impact.test.ts prototype/agents/tests/impact-cli.test.ts
```

Tests cover independent hand-calculated weighted totals/means and subgroup denominators, fractional/invalid weights, empty cohorts, seed/order determinism, eligibility/participation, changed demand, distance-limited/missing geography, canonical OD reuse, improved/unchanged/unreachable/new/invalid/same-station results, nonfinite/contradictory values, full versus displayed populations, valid serialized payloads and profile lookup. Initial failing tests were executed before implementation. A read-only code review found a standalone aggregation consistency gap and a threshold identity gap; both were reproduced in failing tests and fixed. Report IDs now include threshold; display limits do not alter report identity. No failing tests remain. `git diff --check` and `npm.cmd run build` pass; the production build compiled and generated all six pages. Browser integration and animation are outside this verification.

Tools actually used: local Git/PowerShell/Node/Python/patch tooling; MCP tool and resource-template discovery; Search MCP for the official LTA dataset description/API guide; one read-only code-review agent. GitHub MCP was discovered but not called: the clean local checkpoint and actual contract code were authoritative, and a remote request added no evidence. No dedicated statistical/demographic MCP or installed modelling/TypeScript skill was identified. Skills used/read: using-superpowers, brainstorming (user authorised autonomous implementation), writing-plans, test-driven-development/good-test guidance, systematic-debugging, requesting-code-review and verification-before-completion. Installed Next.js server/client-boundary and Route Handler guides informed the server-only handoff. Existing lockfile dependencies were installed with `npm ci --ignore-scripts`; no dependency/lockfile changes were introduced.

Created: `prototype/agents/impact/{types,assignment,metrics,simulation,example}.ts`, `prototype/agents/impact-cli.ts`, `prototype/agents/tests/{impact,impact-cli}.test.ts`, `lib/server/population-impact-service.ts`, this report. Modified: `package.json` adds `agents:impact`; existing test globs already include the new tests. The roadmap, shared contract, MRT algorithms/tests, frontend, raw inputs and environment are unchanged. `.env.local` remains ignored and untracked; credential values were not inspected or transmitted, and no authenticated data requests were made. Next.js loaded its environment through the normal build mechanism. Git's global-ignore permission warning did not prevent repository ignore checks. No branch operations, commits or pushes were performed.

Rebuild at the hackathon: install the existing toolchain using `npm ci`, retrieve/validate the permitted Census/GTFS inputs using their existing reports, recreate these small assignment/aggregation/orchestration modules around the validated engine and shared schema, run the tests/type checks/CLI above, then connect a Node handler and profile lookup to Terminal 1. Retain demographic reference year, assumption catalogues, fractions and denominator labels. Review whether competition rules permit pre-downloaded artifacts; this implementation is a disposable learning prototype.

**Phase 4C is ready for Terminal 1 integration as a quantitative foundation. Full Phase 4 is not complete:** the animation layer and these outputs have not been integrated or browser-tested together. The additive shortest-path model cannot represent crowding, reduced service, induced demand, construction disruption, realistic trip frequency or downstream economic effects. A hypothetical traveller is not an observed commuter and a deterministic calculation is not a validated behavioural forecast. Preserve the eldercare / active-ageing-centre second intervention; facility capacity/uptake/access models still need their own later implementation.
