# Shared citizen simulation contract — version 1

This is an exchange boundary for Phase 4B rendering and Phase 4C calculations. It does not assign trips, calculate impacts, animate citizens, add an endpoint or implement Gemini. The simulation supplies outcomes; the frontend displays them. No synthetic profile represents an identifiable person.

## Public exports and structure

Import from `lib/contracts/citizen-simulation.ts` in both client and server code. All imports of population/MRT implementation types are type-only; the boundary and validator have no Node runtime dependencies and add no packages.

| Export | Purpose |
| --- | --- |
| `CITIZEN_SIMULATION_SCHEMA_VERSION` | Literal `1`; reject other versions |
| `CitizenSimulationPayload` | Metadata/catalogues plus citizen samples, outcomes, visual state and full-population group metrics |
| `SimulationMetadata`, `GeographicCoverage` | Scenario/intervention IDs, service date, separate demographic year, area/subzone selection, result basis, seed/method and full population count/weight |
| `PopulationSource`, `ModellingAssumption` | Deduplicated aggregate provenance and explicit population/assignment/routing/aggregation/visualisation assumptions |
| `CitizenReference`, `AgeGroup` | Existing synthetic ID, source-derived categories, expansion weight, source reference and physical CSV row |
| `CitizenJourneyOutcome`, `CitizenJourneyComparison` | Explicit unassigned or hypothetical assignment; existing compact MRT status and numeric semantics |
| `CitizenAnimation`, `Wgs84Position` | Visual-only position, schematic waypoints, state and optional journey reference |
| `DemographicImpactMetric`, `WeightedCount`, `CitizenCalculationStatus` | Group denominator, exclusive outcome buckets, finite-comparison benefits and mean savings |
| `CitizenProfileResponse`, `CitizenActivity` | Selected synthetic profile, optional outcome/visual state and separately labelled assumed activity |
| `CitizenSimulationContext` | Shared version, metadata, source and assumption catalogues |
| `parseCitizenSimulation(value: unknown)` | Validate unknown decoded JSON and return `CitizenSimulationPayload` |
| `assertCitizenSimulation(value: unknown)` | Throw unless input is a valid payload; TypeScript assertion narrowing |
| `parseCitizenProfile(value: unknown)` / `assertCitizenProfile(value: unknown)` | Equivalent profile-response boundary validation |

Validation lives in `citizen-simulation-validation.ts` and is re-exported from the public module. Parsers validate objects, not JSON strings: call `response.json()` or `JSON.parse()` first. They return the same validated object without coercing, repairing, rounding or calculating fields. Treat it as immutable after validation. Errors identify the failed contract field, without embedding input values.

## Four data boundaries

1. **Aggregate observations:** Source catalogue reuses `Provenance` (`government-statistics` or `synthetic-fixture`, dataset/agency/year/update/URLs/hash/assumptions). A source row describes an aggregate category, never a real citizen's recorded attributes or commute. The validator checks shape, not source authenticity.
2. **Synthetic representatives:** `CitizenReference.demographic` reuses `SyntheticCitizen['observed']`, with `synthetic: true`, unchanged `weight`, `sourceId` and `sourceRow`. It is a generated assignment of published aggregate categories. Do not add income, exact age, home address or inferred mobility.
3. **Assumptions/calculations:** Journeys are `unassigned` or `hypothetical`, never observed. Assigned outcomes reference declared `journey-assignment` and `routing` assumptions. Metrics reference assignment and aggregation assumptions. `metadata.resultKind` is `modelled` or `illustrative`; sources may be observed, but synthetic results cannot claim `observed`. Any fixture source requires illustrative results. Metric basis must match metadata.
4. **Visual-only state:** `CitizenAnimation.visualisation.kind` is always `visual-only`. Position/path data references a declared visualisation assumption. It cannot carry travel-time results. `geometry: 'schematic'` means two or more illustrative waypoints; `geometry: 'none'` requires no waypoints. V1 supports no claim to verified pedestrian/road/rail alignment.

All assumption IDs must resolve in the catalogue and be included in metadata's scenario assumption list. Explain assumptions substantively: an arbitrary ID is not evidence. Both original intervention commitments are retained: metadata supports `mrt-line`, `eldercare-centre` and `active-ageing-centre`; V1 journey metrics are specifically MRT comparisons. Facility-access calculations need a subsequent explicit contract extension, not invented MRT journey fields.

## Identifiers, dates and coordinates

- Preserve generator IDs: `syn-<16 lowercase hexadecimal characters>-<positive integer>`. They identify seeded representatives; they are not real resident identifiers. The hexadecimal prefix already fingerprints the generator's population inputs; metadata retains seed, method, source hash, coverage and full sample size instead of duplicating a separate run identifier. Scenario IDs are separately assigned by the producer, ideally from stable scenario inputs. Do not replace citizen IDs with scenario IDs or regenerate IDs in the renderer.
- Reuse normalized planning-area/subzone labels and display names. A geographic key is the pair `(planningArea, subzone)`, not a bare subzone label or an authoritative GIS code. A subzone metric filter requires its planning area. Declared coverage must contain sample/group geography; optional subzone pairs narrow the selected areas.
- `simulationDate` is a real `YYYY-MM-DD` service/reference date; `demographicReferenceYear` is separately validated against source years. Census 2020 is not live 2026 population.
- Every new coordinate is named WGS84 degrees **`{lat, lon}`**. Existing MapLibre/GeoJSON/`CompactRoute` arrays use **`[lon, lat]`**. Convert explicitly. Bounds are global WGS84 bounds, not proof a point lies in Singapore or in a particular subzone.
- Positive finite expansion weights may be below 1; generated agent count may exceed represented population. Do not round stored weights. Zero detailed source cells generate no representatives.

## Journey and aggregate semantics

`CitizenJourneyComparison` picks existing `CompactComparison` fields, excluding route arrays. It retains `compared`, `newly-reachable`, `unreachable`, `invalid`, plus each side's `reachable`, `unreachable`, `station-unavailable` or `invalid` status. Unreachable outcomes may still have a reachable baseline. Each reachable side has a finite nonnegative duration and nonnegative integer transfers; unavailable sides use nulls. An unassigned journey has no comparison and an empty assumption list. A missing sample outcome is not proof of an unassigned trip.

Units/signs match the engine: minutes saved = baseline − scenario; percentage duration change = (scenario − baseline) / baseline × 100; transfer change = scenario − baseline. Savings may be negative. Percentage is null for zero baseline; both-side deltas are null unless both sides are reachable. A reachable zero-minute trip is valid. Proposed-line use is null if the scenario is unavailable.

Each metric represents the **full declared demographic group**, not the visual sample. `denominator.agentCount` counts synthetic representatives; `denominator.representedPopulation` sums their expansion weights. An empty group filter `{}` explicitly means full coverage, so its denominator must equal population metadata. Likewise, if the returned citizen count equals the full population agent count, its weights must sum to the full represented population. Groups are independent filters and may overlap: do not add group denominators unless you have separately established a disjoint partition.

`outcomes` partitions every group agent/weight into `unassigned`, `compared`, `newly-reachable`, `unreachable`, or `invalid`. Scenario-accessible counts/weights are `compared + newly-reachable`; scenario-unavailable/unreachable counts are the `unreachable` bucket. Per-side unavailability detail remains in individual outcomes. `validJourneyAgents` means both durations finite (`compared.agents`), not all assigned agents. Invalid/unassigned/newly-reachable outcomes must not be replaced with zero-minute savings.

`weightedBenefitingPopulation` sums weights of **compared** agents with strictly positive savings. Newly reachable agents remain a separate category; they have no finite before/after saving. `weightedMeanMinutesSaved` uses the compared population weight only, includes negative/zero savings, and is null if that denominator is zero. Zero benefiting weight cannot accompany a positive mean; exactly universal benefiting weight requires a positive mean. Empty filtered demographic groups are valid with all counts/weights zero and null mean. Optional sensitivity metadata describes assumption variation, not an invented statistical confidence interval.

Count partitions reconcile exactly; floating-point weights and arithmetic are checked within `1e-6 + 1e-9 × max(abs(a), abs(b))`. This is a numerical tolerance, not uncertainty or a licence to normalise Census counts. Validation rejects negative/nonfinite weights, malformed IDs/statuses, missing provenance, bad coordinates, unknown fields, dangling/duplicate references, invalid null/status pairs and inconsistent denominators. It cannot establish correctness of a full aggregate calculation from a partial render sample; Terminal 2 must independently test the full calculation.

## Illustrative examples

Complete valid fixtures are exported from `lib/contracts/citizen-simulation.fixtures.ts` as `illustrativeCitizenSimulation` and `illustrativeCitizenProfile`. Their `synthetic-fixture` source and assumptions explicitly label **all numbers as invented**, even when familiar Singapore area/station names appear.

- Improved: 100 represented residents, assumed NS4→NE16, invented 30→20 minutes, 10 saved, transfer change −2.
- Unchanged: weight 50, invented 10→10 minutes, 0 saved.
- Unassigned: weight 20, `assignment: 'unassigned'`, `comparison: null`.
- Unreachable: weight 30, both side durations/transfers null.
- Aggregate: 4 agents representing 200; 2 comparable agents representing 150; benefiting weight 100; mean saving `1000 / 150` minutes. Other outcome weights are 20 unassigned and 30 unreachable.
- Animation: one synthetic representative with named WGS84 position and two schematic waypoints, linked to the illustrative improved journey.

```ts
import { parseCitizenSimulation, parseCitizenProfile } from '../lib/contracts/citizen-simulation';
import { illustrativeCitizenSimulation, illustrativeCitizenProfile } from '../lib/contracts/citizen-simulation.fixtures';

const example = parseCitizenSimulation(JSON.parse(JSON.stringify(illustrativeCitizenSimulation)));
const selected = parseCitizenProfile(JSON.parse(JSON.stringify(illustrativeCitizenProfile)));
// Example field, not a full exchange envelope:
const visualPosition = { lat: 1.38, lon: 103.8 };
const geoJsonPosition = [visualPosition.lon, visualPosition.lat];
```

## Exact handoff

**Terminal 1 — Phase 4B:** Consume `CitizenSimulationPayload`, `CitizenAnimation`, `CitizenProfileResponse`, `Wgs84Position`, `parseCitizenSimulation` and `parseCitizenProfile` from the public contract. Validate decoded data before using it. Key characters by `agentId`, use the explicit visual position/waypoints, select the matching citizen/profile and show synthetic/provenance/assumption labels. Never calculate impacts from animation distance, elapsed frames or the returned sample. Do not manufacture positions when they are absent. A citizen may be shown idle/unassigned with no journey. No frontend consumer is wired up in this checkpoint.

**Terminal 2 — Phase 4C:** Produce `CitizenSimulationPayload`, `CitizenReference`, `CitizenJourneyOutcome`, `CitizenJourneyComparison`, `DemographicImpactMetric` and `CitizenProfileResponse`; call both parsers/assertions before serialization. Map `citizen.id → agentId`, `citizen.observed → demographic`, preserve `weight`/source row, and deduplicate `population.source` in `sources`. Supply source, assignment, routing and aggregation assumptions explicitly. Preserve full-population seed/method/count/weight independently of the subset returned for display. Use existing `JourneyComparison` or compact results; do not change routing algorithms.

For a `CompactComparison`, use `const { baselineRoute, scenarioRoute, ...comparison } = compact` and put `comparison` in the assigned outcome. If starting with `JourneyComparison`, also flatten `baseline.status`/`scenario.status` into `baselineStatus`/`scenarioStatus`, retaining the identical existing scalar fields. Routes can separately provide **schematic** visual waypoints with an assumption reference and `[lon, lat] → {lat, lon}` conversion. Do not expose raw graph/route internals. Calculate metrics over all weighted assigned/unassigned representatives and test subgroup conservation. Build profile responses with the same context, one citizen, optional matching journey/animation and separate assumed activity. Future Gemini may consume this profile; it must not invent missing quantitative effects.

## Validation, limitations and tools

Run `npm.cmd test` (includes `lib/contracts/tests/*.test.ts`), `node_modules\.bin\tsc.cmd --noEmit --incremental false`, and `npm.cmd run build`. The contract tests include fixtures, rejected payloads, real generated identities/weights, actual compact MRT output and import execution with Node built-ins blocked. Use `--ignoreConfig` for explicit-file TypeScript 7 checks; no framework configuration is bypassed for the application build.

The source leaf total **4,047,260** remains distinct from published **4,044,210**; no raw data, weights, simulation algorithms or environment files change here. Geographic assignment, daily behaviour, weighted accessibility calculations, animation, facility data/access/capacity models and Gemini are pending. Runtime validation does not authenticate source documents, verify physical paths or prove demographic causal effects. Stricter fields/new semantics require a deliberate schema version change and fixtures/tests in both consumers.

Tools used: local Git/PowerShell/Node/Python, patch tooling and MCP tool discovery; GitHub MCP `list_commits` confirmed published `master` remains at Phase 2 while local integration is ahead. Existing local code/docs are the contract authority. No browser MCP was needed for this nonvisual boundary change. Skills applied: using-superpowers, brainstorming, writing-plans, executing-plans, using-git-worktrees (existing user-selected worktrees), test-driven-development/good-test guidance, systematic-debugging, requesting-code-review and verification-before-completion. A read-only builder check and final code review cover interface/statistical boundaries. Validation totals and final checkpoint status are recorded in the roadmap.
