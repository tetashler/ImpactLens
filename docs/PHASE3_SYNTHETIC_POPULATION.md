# Phase 3 — Synthetic Singapore population

## Implementation and gate

Reuses the validated `prototype/agents/prepare.ts` and `generate.ts` without formula changes. New `lib/population/contract.ts`, `lib/server/population/store.ts` and `/api/population` add bounded national generation, canonical source/recipe identity, exact weighted fidelity summaries, immutable snapshots and local reload verification. Defaults: 10,000 residents, seed `impactlens-society-v1`; maximum 30,000, two cached snapshots, browser view capped at 256 (default 128). All 8,395 positive joint cells must be covered; too-small national samples reject instead of dropping strata.

## Actual source inventory

| Existing source | Supported grain/universe | Limits |
|---|---|---|
| `data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv` | SingStat Census 2020 residents, planning area/subzone × 19 age bands × male/female; updated 2021-06-18 | Historical rounded counts, nil/negligible treated as explicit zero; no household/income/employment joint data |
| URA Master Plan 2019 subzone polygons, existing prepared geography | Geographic boundaries; SODL/source notices retained | Display geography, not addresses, homes, actual workplaces or individual travel |
| Existing MRT GTFS/network and AAC datasets/models | Validated model-specific accessibility inputs | Not observed employment, demand or personal movement; no model outputs inferred from mere population allocation |
| Existing building footprints | Geographic footprints/heights under existing local-review licensing controls | Not dwelling occupancy, household composition or workplace assignments |

[Source dataset and licence](https://data.gov.sg/datasets/d_d95ae740c0f8961a0b10435836660ce0/view), [Singapore Open Data Licence](https://data.gov.sg/open-data-licence). Raw source is unchanged. The population reproduces **4,047,260 summed rounded leaf counts**, retaining the separately published **4,044,210** and **3,050** discrepancy. Weight fidelity is arithmetic agreement with these targets, not validation of behavioural representativeness.

## Persistence and inspection

Population ID is SHA-256 of versioned options and source provenance. `GET /api/population?size=10000&seed=example` generates/persists a snapshot and returns source/audit/marginals plus a bounded resident view; `?id=population-<sha256>` reloads it. Files are ignored under `data/derived/agents/society/`. Reload regenerates and compares the complete snapshot against its source recipe; altered weights/IDs and source changes reject rather than silently reinterpret. No API keys or external calls.

Profiles use stable fictional IDs/labels, age bands/sex/geographic strata, weights, source rows and a shared social identity. They do not claim observed individuals. Household IDs, organisations and occupations are explicitly null/unassigned. Household synthesis is optional and deferred because validated joint constraints are unavailable; this does not block the demographic foundation.

## Checks

`lib/contracts/tests/population-foundation.test.ts`: national cell/marginal fidelity at 10k/20k, seeds, stable IDs, persistence/reload, corrupted snapshots, source discrepancy, bounds, unsafe archive paths and unsupported attributes. Existing population regressions remain. Phase gate verification and measured performance are recorded below before Phase 4 begins.

**Gate PASS (30 October 2026):** 876 Node tests, application TypeScript and production build pass. Actual production-browser API generated/persisted 10,000 residents and reloaded the same immutable snapshot: both HTTP 200, exact view equality, 128 inspectable profiles, maximum weighted joint-cell error zero. Cold generation plus disk reload took 3.25 seconds in this test. The first sandboxed server could not mkdir under derived agents; the task-owned mocked server was restarted with approved local filesystem access, and persistence passed. No paid request occurred. Phase 4 may now begin. Joint-margin correctness and reproducibility are verified; household/employment inference remains unsupported as documented.

Final scale observation: 30,000 profiles retained about 37.1 MB additional Node heap (128.0 MB RSS delta including allocator/runtime overhead), with a 22.22 MB archive below the 40 MB read bound. Two population snapshots are cached at most. These single-process measurements are not whole-browser memory guarantees. See ignored `tmp/phases36/population-memory.log`.
