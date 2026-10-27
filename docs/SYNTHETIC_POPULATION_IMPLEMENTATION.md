# Phase 4A — Synthetic population engine

## Implementation plan

Scope: the user's Phase 4A brief; standalone native TypeScript on Node 24, no dependencies. Existing Phase 2 interfaces are present. Work only in this worktree; no commits, MRT/frontend/roadmap changes or environment edits.

- [x] Validate the existing Census 2020 wide CSV into typed subzone × age × sex cells, retaining source rows, hash and provenance. Detect malformed/missing fields, duplicate geography, missing categories and aggregate discrepancies. Keep raw input unchanged.
- [x] Test then implement seeded stratified allocation: one agent per positive cell, distribute remaining slots proportionally by largest remainder; equal weights within cells. Reject insufficient sample size rather than lose categories. Test determinism, weighted marginals, malformed/empty input and serialization.
- [x] Add optional model-assumption, rendering and MRT accessibility contracts using the actual JourneyComparison type, without allocating locations or travel demand.
- [x] Add preprocessing/generation CLI commands and tests, run the full MRT and agent suite, independently audit counts with Python, document findings and integration steps.

Design choices: use published joint age/sex cells, not independent draws. Treat the source's nil/negligible marker as modelled zero with an explicit assumption. Preserve discrepancies from rounding in a validation report; never force leaf counts to match separately rounded totals. No exact ages, income, employment, household relationships or mobility behaviour are inferred.

Review focus: aggregate double counting; dash versus missing values; row-order-dependent geography; small samples omitting groups; JSON-safe provenance and optional routing statuses.

## Source and retrieval

Implemented and verified 27 October 2026. **Historical 2020 residents, not live 2026 population or passenger demand.**

Agency: Singapore Department of Statistics (SingStat). Dataset: [Resident Population by Planning Area/Subzone of Residence, Age Group and Sex, Census 2020](https://data.gov.sg/datasets/d_d95ae740c0f8961a0b10435836660ce0/view), ID `d_d95ae740c0f8961a0b10435836660ce0`. Updated **18 June 2021**; geographic definitions follow URA Master Plan 2019. [Original table CT/17560](https://tablebuilder.singstat.gov.sg/table/CT/17560) confirms rounding limitations and the nil/negligible/significance notation.

Public API: `GET https://api-open.data.gov.sg/v1/public/api/datasets/d_d95ae740c0f8961a0b10435836660ce0/poll-download`. This returned `DOWNLOAD_SUCCESS`; the CSV was retrieved using the returned temporary URL, without project credentials. Web opening of the API failed; direct PowerShell retrieval succeeded after sandbox network approval. All 388 parsed records and 61 columns match the existing local CSV. Raw hashes differ; parsed strings and column order are identical. Original files were not overwritten.

- Local raw SHA-256: `6ac3e693eb7d36b9fc066df6accd290ce7341984d9e40ce80080819d75091e5a`.
- Retrieved raw SHA-256: `9d1183c4335a8189272e244ae86bd9770d61854bc30527055df50697bf730c84`.
- Original input: `data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv`.
- Reproducible typed output: `data/derived/agents/census2020.json` (ignored by Git). It contains provenance, leaf cells and the full discrepancy audit. Temporary downloaded copy is under ignored `tmp/agents/`.

The [Singapore Open Data Licence](https://data.gov.sg/open-data-licence) permits adaptation and reuse with attribution, subject to its conditions. Retain a conspicuous source/licence notice in the eventual frontend; do not imply government endorsement. Attribution: Contains information from the Census 2020 resident population dataset, accessed 27 October 2026 from data.gov.sg, made available under the Singapore Open Data Licence version 1.0.

Newer planning-region data was found, but is coarser than subzones. No newer subzone series was validated in this phase. Other socioeconomic tables were discovered but not joined: their marginal distributions do not establish joint income/employment/age/sex relationships.

## Validation findings

Schema: `Number` is the geography label. The remaining columns are `{Total,Males,Females}_{Total,0_4,5_9,10_14,15_19,20_24,25_29,30_34,35_39,40_44,45_49,50_54,55_59,60_64,65_69,70_74,75_79,80_84,85_89,90andOver}` (60 columns). The output audit lists every exact column name.

| Check | Result |
| --- | ---: |
| Raw records / columns | 388 / 61 |
| National / planning-area aggregate records | 1 / 55 |
| Subzones / joint leaf cells | 332 / 12,616 |
| Positive / modelled-zero joint cells | 8,359 / 4,257 |
| Empty fields / duplicate geographic records | 0 / 0 |
| Nil/negligible markers across numeric fields | 7,374 |
| Reported total discrepancies | 3,370 |
| Discrepancies beyond diagnostic rounding check | 14 |
| Published national total | 4,044,210 |
| Sum of published subzone totals | 4,044,340 |
| Sum of represented subzone × age × sex cells | 4,047,260 |

Python standard-library CSV calculations independently confirmed geography counts, positive cells, leaf totals and the default area total. Required columns, widths, numeric nonnegative safe integers, missing categories, duplicates and hierarchy are checked. Identifiers are lower-case hyphenated labels; display names and physical source rows remain available. Geography keys are area + subzone. The irregular `Changi- Total` aggregate label is handled.

**Ruling after source inspection:** total discrepancies are reported, not repaired or rejected. The source itself contains legitimate incomplete detail: Boon Lay has published total 40, but its sex and age cells are all `-`. A simple rounding bound incorrectly rejected this official record. The diagnostic bound is `10 × (number of component cells + 1)`; it is a heuristic alert, not a statistical confidence bound. All 14 exceedances involve positive overall totals with modelled-zero sex totals. The full report retains row, column, published/calculated values, difference and bound. Malformed fields and counts still fail validation.

`nil-negligible-as-zero` explicitly approximates `-` as zero. This does **not** establish that no residents exist in those categories. Blank/`na`/negative/fractional values fail; they are not silently converted. Entire selections whose leaf counts become zero fail generation (e.g. Boon Lay). All-zero subzones remain in the distribution but produce no agents. No original marker or reported total is altered in the raw file.

## Generation and weighting

1. Filter by normalised planning areas and/or subzones; reject unknown/empty selections. Preserve the observed joint cells rather than independently drawing age and sex.
2. Let positive cell counts be `P[j]`, their sum `P`, number of positive cells `K`, and sample size `N`. Require `N >= K`. Give each cell one representative.
3. Allocate remaining `N-K` slots with quotas `(N-K) × P[j]/P`. Take floors, then assign leftover slots by largest fractional remainder. Seeded random values break ties.
4. Give each of a cell's `n[j]` agents weight `P[j]/n[j]`. Thus each cell's summed weights equal its input count; all weights sum to `P`, within floating-point precision. Never round stored weights. CLI summaries round only displayed totals to six decimals.
5. Canonically sort cells, derive a 32-bit PRNG seed from SHA-256, and shuffle agent order deterministically. Synthetic IDs include a hash of source, seed, selected counts and sample size. No ambient randomness, timestamps or real identities are used.

This is a stratified representative population, not a simple random sample. Small cells are intentionally overrepresented in agent counts; **use weights for all demographic/accessibility percentages**. Different seeds vary order/IDs and tied allocations; weighted demographic totals deliberately remain fixed. Do not infer variation in behaviour or demographics from changing the seed.

The conserved population is **4,047,260 represented rounded leaf counts**, not the separately published national 4,044,210. The default Ang Mo Kio selection represents **162,520** leaf counts versus its separately published area total of 162,280. No rescaling reconciles these numbers. National generation needs at least 8,359 agents; choose a smaller geographic area to use fewer agents. This explicit rejection avoids quietly dropping demographic groups.

## Modules and schema

| File | Responsibility |
| --- | --- |
| `prototype/agents/prepare.ts` | Census adapter, identifier normalisation, source metadata and audit |
| `prototype/agents/generate.ts` | Seeded allocation, weighted profiles, `toRenderAgent` projection |
| `prototype/agents/types.ts` | Distribution, citizen, behavioural assumption, MRT and rendering contracts |
| `prototype/agents/cli.ts` | Offline validation/preprocessing and concise generation summary |
| `prototype/agents/tests/population.test.ts` | Fixture, source, national conservation and CLI regressions |

`SyntheticCitizen` contains `id`, `synthetic: true`, `weight`, `observed` geography/age group/sex, `assumed`, and `provenance` (agency, source URL/ID, year, update date, licence, raw SHA-256, physical source row and assumption IDs). All profiles are JSON-safe. Exact ages, names, private addresses, real identifiers and unsupported socioeconomic attributes are absent.

`assumed` starts as `{status:'unassigned', assumptionIds:[]}`. Optional future mobility, destination categories, preferences and approximate starting location are separate from source-derived categories. Adding these later requires documented assumptions; an age category alone does not establish mobility or travel behaviour. Source marker approximation is recorded under provenance assumptions.

## Commands and library use

Node **24+**; zero dependencies or installation required. PowerShell examples:

```powershell
npm.cmd run agents:prepare
npm.cmd run agents:generate
npm.cmd run agents:generate -- --size 500 --seed demo --area "Ang Mo Kio"
npm.cmd run agents:generate -- --size 100 --seed demo --area "Ang Mo Kio" --subzone "Cheng San"
npm.cmd run agents:generate -- --all --size 10000 --seed national
npm.cmd test
```

`agents:prepare` writes the reusable typed JSON and full audit under `data/derived/agents/`. Generation revalidates the raw CSV on each call and prints summary distributions, not thousands of records. Default: 2,000 agents, seed `impactlens-phase4a`, Ang Mo Kio. `--area` / `--subzone` intersect; `--all` cannot accompany them. Paths resolve relative to the module, independent of terminal working directory. The command uses official data and never silently falls back to a fixture. Synthetic fixtures exist only inside tests.

Library: call `prepareCensus(csv)` then `generatePopulation(distribution, {size, seed, planningAreas?, subzones?})`; access `.citizens`. Multiple selections are supported by library arrays. Serialize with `JSON.stringify(population)`. Loading saved derived JSON requires the typed `DemographicDistribution` contract; the generator also checks runtime counts, category validity, duplicate cells and population consistency.

## Tests and review

Final `npm.cmd test`: **53 passed, 0 failed** (37 existing MRT + 16 agent tests), Node 24.18.0. Agent-only command: `node --test prototype/agents/tests/*.test.ts`. Initial failing tests were run before implementation. A source-driven failure revealed the Boon Lay limitation and changed the documented total-check policy.

Coverage: identical/different seeds, unique IDs, per-cell and marginal weights, valid categories, missing/invalid fields, duplicates, empty groups, minimum samples, stable canonical ordering, profile/render serialization, observation/assumption separation, raw-source totals and hierarchy, repeated CLI executions, national coverage, unknown/conflicting flags and insufficient sample errors. A 10,000-agent national regression checks every generated joint-cell weight against the corresponding raw CSV columns; total error must be below `1e-6`. Floating-point fixture checks use `1e-10` tolerance.

Default CLI, national 10,000-agent CLI and preprocessing were exercised successfully. Boon Lay and insufficient national samples fail explicitly as expected. A read-only reviewer found no blocking defects; its national-cell test suggestion was implemented. `git diff --check` passes. No TypeScript compiler check was run: like the existing MRT prototype, execution uses Node's native type stripping. No compiler or dependencies were installed.

## Security, tools and scope

`.env.local` exists; presence checks only: OneMap populated, LTA populated, Gemini present but empty. `git check-ignore .env.local` returns `.env.local`; `git ls-files -- .env.local` returns no files. Existing `.env`/`.env.*` ignore rules retain the `.env.example` exception. Credentials were never used for demographic retrieval, and their API validity remains **untested**. No environment edits or credential changes are required. The pre-existing untracked `.env.example` was left alone. Git emitted a permission warning reading the user's global ignore file; the repository ignore checks still returned the expected results.

Tools actually used: local PowerShell/Git/Node/Python and patch tooling; MCP resource/tool discovery; GitHub MCP `get_file_contents` for the remote package/Phase 2 baseline; Search MCP `search_service_web_run` for CT/17560 metadata/notation; built-in web search/open for official dataset/licence research. No dedicated SingStat/data.gov.sg MCP was available, so the public download API was retrieved directly. Browser/Figma and unrelated services were not used. GitHub content was read only.

Skills read/applied: `using-superpowers`, `brainstorming` (user explicitly authorised proceeding without routine questions), `writing-plans`, `executing-plans` (inline implementation), `using-git-worktrees` (verified existing feature worktree), `test-driven-development` including good-test guidance, `systematic-debugging` (source discrepancy), `requesting-code-review` (one read-only reviewer), and `verification-before-completion`. No installed dedicated demographic/statistical-modelling or TypeScript skill was identified. The plan/checklist in this report is the progress record; no commits or integration operations were performed.

Changed tracked files: `package.json` (agent commands and expanded tests), `.gitignore` (derived agent output). Created the five agent module/test files listed above and this report. Existing datasets, MRT modules/tests, frontend, central roadmap and Terminal 1 working files were not edited. The existing CSV parser is imported without modification.

## Integration handoff and hackathon rebuild

**Ready to integrate as a standalone Phase 4A population foundation.** Phase 3 does not need to change its MRT engine: the optional `AgentAccessibility.journey` uses its actual `JourneyComparison` type, preserving baseline/scenario outcomes, null metrics, minutes saved, transfers and unreachable/newly-reachable/invalid statuses. Future code must justify geographic catchments, walking/access/egress and destination assignments, supply canonical station IDs, and attach explicit assumptions. No passenger OD demand is inferred from these residents. Do not average minutes saved for unavailable journeys as though they were zero.

`toRenderAgent` returns agent ID, area/subzone, age/sex categories and weight. Optional display coordinates, movement state and destination references are contracts only. Future map code must obtain validated geographic allocation and may render a subset; calculate demographic metrics over the complete weighted simulation population. No geometry, movement, React or animations are implemented here. Subzone identifiers are labels, not an authoritative GIS code crosswalk.

For the 24-hour competition: rebuild the modules rather than treating this disposable prototype as the submission; obtain the public dataset via the endpoint above, keep the original CSV in the raw path, retain year/licence/hash, recreate preprocessing and allocation, then run the commands/tests above. Review discrepancy findings before any policy interpretation. Add geographic/station assignment and weighted group comparisons in a later phase. The committed second intervention, **eldercare / active-ageing centre access**, remains in scope and can reuse these age groups and weights once facilities and access assumptions are validated. Terminal 1 or 3 should coordinate roadmap and integration updates; no branch operations have been performed here.
