# Geographic and impact-aware citizen selection

1 November 2026. Offline-only extension; no real provider authority armed or paid request.

**Verdict: GO for subsequent integrated selection + V7 testing.** Selection, numerical integrity, complete mocked execution, replay and browser checks pass offline. Real-model behavioural benefit is **NOT TESTED**. Any paid integrated evaluation needs separate explicit authorisation; the known V7 prose limitation is unchanged and its optional repair remains deferred.

## Scope and implementation

Baseline: main worktree, `master`, HEAD `ade950f9a7fb3e53ffbb18c4c1d1c90e35c8c482`, initially clean. Existing v7 compliance remains 70% in its separate historical small screen. The optional factual-prose repair is **deferred and unchanged**, including `personal-fact-requires-reference` and `ambiguous-quantity-phrase`. It is not a prerequisite imposed by this task for subsequent integrated testing.

`citizen-selection-v2` enriches the active **discussion cohort**, not the population estimator. `prepareHybridExplore` already calculates the complete population's deterministic commute run. Its new server-only `citizenSelection` callback consumes that same frozen dataset, run and validated MRT binding. `socialOperation(start)` applies the selected bounded population view before preview/genesis and personality initialization. Existing `controlledIds` allocation, 35/15 and 70/30 compositions, v7 social policy, personality generation and execution algorithms remain unchanged.

The selector in `lib/citizen-grounding/selection.ts`:

1. Uses the same eligible adults as legacy selection: source age-band lower bound at least 20. Checks complete source/fact identities and unique citizens.
2. Reserves up to one quarter of capacity for calculated `improved`, `worse` or `newly-reachable` outcomes. Rotates these distinct classes; within each, ranks absolute calculated change then stable seeded identity. Unfilled places return to the remaining cohort.
3. Reserves up to one quarter for remaining home/work proxies within 2,500 metres of confirmed station dots. Uses the existing great-circle utility; this is neither measured walking access nor evidence of a benefit. Original drawing roles need not say “station”: the validated interpretation's ordered station IDs are authoritative. Arbitrary line vertices and independent markers do not become stations.
4. Fills from the broader pool excluding calculated changes and known-near proxies. Rotates planning areas and then age/sex/employment/travel-mode strata with stable seeded ordering. Missing proxies remain unknown and may enter this comparison pool. If insufficient, fills from explicitly labelled remaining fallback candidates.
5. Deduplicates across pools; returns exactly 50 or 100 ordered IDs. Source-record reordering does not affect the result. Buckets explain the **primary selection reason**, not disjoint outcome classes: a geographically selected citizen can also have a calculated change.

No alignment corridor model, new spatial dependency, inferred coordinates, new transport calculations or LLM selection is introduced. Home and workplace are approximate synthetic proxies. Proximity and cohort differences are not causal effects.

## Identity, numerical integrity and privacy

The optional private immutable `SocietyInput.citizenSelection` records the explicit policy, source/scenario/binding identities, seed, bounded availability counts and ordered member IDs/statuses/reasons/distances. Existing canonical input identity and journal genesis bind it. Validation checks the frozen population order and final citizen/commute/binding consistency; replay never reranks against external data. No new checkpoint or journal format is needed. Absent metadata follows the unchanged legacy path.

The population ID remains `population-c40270178251901b2dc094bc7198d0f15997032f1334e08b6d036ef44aaf7739`; the citizen dataset remains `citizens-127577cd81ceb3342fd1103b9acb0b182683d795039737e548f15067f793f62c`. The existing snapshot still has 10,000 records and weight sum 4,047,260.000000003. The official source calibration remains 1,369 passed, 34 unassessed, zero failed.

Selection changes only the bounded private population view, preserving every selected citizen's original weight and the complete source validation. The full 10,000-citizen impact summary and dataset are compared before/after selection for exact equality. Graph/Report continue using that full summary, never a raw selected-cohort average or issue rate. No enriched cohort is claimed representative of Singapore residents.

The existing public grounding `limitations` carries a short policy/count disclosure, rendered by the existing Report and preserved on restoration. Public output contains no selected citizen IDs, proxy distances, coordinates, employment profiles or personality bodies. Private selection metadata remains bounded to 100 members/32 KB. Browser input cannot provide the selector or authoritative profiles.

## Verification

Final source fingerprint: `b1ed25b6a12b59232f1923044d90195f281ced622d76beb2863296342cd33a35`; production build ID: `-0DN36LVeVee5oY50sTt_`. Before/after source proofs match. Documentation changes do not change this runtime fingerprint.

For the actual local Choa Chu Kang → intermediate stop → Sengkang calculation:

| Measure | 50 active / 35 capable | 100 active / 70 capable |
|---|---:|---:|
| Impact-priority / proximity-priority | 4 / 12 | 4 / 25 |
| Broader comparison / fallback | 34 / 0 | 71 / 0 |
| Comparison planning areas | 34 | 39 |
| Improved / unchanged | 4 / 2 | 4 / 6 |
| Unknown / not applicable | 13 / 31 | 29 / 61 |
| Four available improved representatives selected | 4, all capable | 4, all capable |
| Final tick / accepted scripted decisions | 320 / 350 | 320 / 700 |
| Capable participants / rejected decisions | 35 / 0 | 70 / 0 |

These complete fixtures establish technical capability, not real-model behaviour. They use legitimate reads/inactivity and bounded authored history; previous chatty stress fixtures remain unchanged as historical evidence. Full genesis replay and final materialized-checkpoint restoration pass without additional mock dispatch. Separate nonempty checkpoint-base tests replay two later accepted synthetic decisions from a one-decision snapshot, preserving both rosters and original journals exactly. Actor contexts retain the 4 KB ceiling; encoded decision contexts reach but do not exceed 24 KB.

| Executed gate | Result |
|---|---|
| Focused selection/context/memory RED/GREEN | 27 passed |
| Final full network-blocked Node suite, concurrency 2 | 2,030 passed; zero failed/skipped |
| Application and strict affected-module TypeScript | PASS |
| Final production build / production tracing | PASS / 25 traces passed |
| Full 350/700 mocked cohorts, Graph/Report aggregates and privacy sentinels | PASS |
| Exact full genesis / final-checkpoint / nonempty two-decision checkpoint-base replay | PASS for both cohorts |
| Actual UI plotting, ordinary Explore, Graph/Report and saved restoration | PASS for both cohorts at 1440×900 and 1920×1080 |
| Visible restored enrichment disclosure; no extra Explore on restoration | PASS in all four desktop checks |
| Mandatory strict historical replay | 20/20 PASS; 148 pinned archive/journal files unchanged |
| Historical namespace inspection | 62 legacy archives and 3 current journal worlds verified; original current claims remain 3/16 |
| Official datasets, source hashes and stored synthetic identity | PASS; no regeneration |
| Protected original evidence / data / paid authorities | 11,281/11,281 files unchanged; 3,976,486,955 bytes; zero mismatches |
| Task servers / browser pages | Stopped/closed; pre-existing blank browser page retained |
| Whitespace | PASS; final documentation checked again at completion |
| New paid provider calls / Tavily requests | 0 / 0 |

The pinned nonqualifying experimental artifact remains unchanged with unresolved `SOCIAL_STALE`; no other failure inherits its exclusion. Historical source fingerprint matches the final tested source. `preservation-final.json` confirms all 11,281 protected originals remain unchanged, including previous closed authorities and the older US$0.02 uncertain reservation. Both task-owned mock servers and their browser contexts were closed; no accepted evidence was deleted. The roadmap's original byte prefix is preserved, with only this task's outcome appended.

Focused RED/GREEN covers deterministic 50/100 capacities, source order independence, status separation, rare impacts, near unaffected citizens, broad comparison, pool overlap, missing coordinates, changed geometry, zero beneficiaries, malformed metadata and unsupported markers. Production-path tests calculate the actual NS4 → intermediate stop → NE16 proposal with the existing local MRT graph, service date 2026-10-27 and illustrative 600/30/150/180-second assumptions. Both sizes select all four eligible calculated improved representatives without production hardcoded IDs.

The initial full suite exposed four ordinary Explore initialization failures: the new selector incorrectly required original plotting roles to be “station,” whereas confirmed server station membership legitimately includes “unassigned” drawing roles. A new regression failed, the selector was corrected to use validated station IDs, and all 18 selector/ordinary Explore regressions passed without changing existing assertions or geometric validators. Failed evidence is retained.

The complete integration reproduced `CITIZEN_GROUNDING_CONTEXT_BOUND` for a newly selected employed profile: 4,107 bytes against the unchanged 4,096-byte actor limit. This was a real context boundary, not model noncompliance. RED production-profile tests confirmed both direct and memory-retrieval callers. Only under the explicit new selection policy, two concise warnings replace four repeated warnings. Both callers pass that frozen policy; all ten facts, source IDs, values, subjects and permissions remain intact. The 24 KB total context limit stays unchanged. Both selected rosters pass the focused bound checks and the retrieval bonus remains exactly 1 in the source-bound positive control. With no selection policy, old projections remain exact. All 27 focused selection/context/memory tests pass; review found no important issue. The synthetic integration's earlier overlong planner trigger was corrected in the task fixture, without changing planner validation.

The fourteen-row execution benchmark matrix is **not rerun**. The scheduler, temporal policy, journal, checkpoint, admission, coordinator, episodic and v7 prose/declaration sources are byte-identical to HEAD. Engine differences are conditional selection validation before genesis; `hybrid.ts` and `citizen-grounding/memory.ts` change only their optional projection-policy argument, with replay loops and memory scoring unchanged. Source comparison verifies those exact differences. Prior matrix results remain historical evidence. Fresh selection-aware complete 350/700 mocked cohorts, replay, browser initialization and full regression are verified separately. Synthetic decisions establish technical capability, not genuine DeepSeek behaviour.

Task-local evidence: `tmp/citizen-selection-v2-20261101/`, including initial failures, focused regressions, source/data proofs, full gates, complete mocked integration, browser checks, historical audit and protected-file verification. No protected historical report is rewritten.

## Changed-file inventory

- `lib/citizen-grounding/selection.ts`: pure policy, immutable validation and safe disclosure.
- `lib/plots/adapters.ts`: exports the unchanged existing distance calculation.
- `lib/server/population/store.ts`: optional ordered-ID bounded view of the same source population.
- `lib/server/society/population.ts`: verified selected-population adapter.
- `lib/server/interventions/explore.ts`: binds selection to the already calculated scenario before personalities; public disclosure.
- `lib/server/society/public-service.ts`: trusted callback wiring.
- `lib/server/society/service.ts`: applies selection before preview.
- `lib/society/contract.ts`: optional versioned private input.
- `lib/society/engine.ts`: conditional frozen-selection validation.
- `lib/citizen-grounding/social.ts`: compact repeated warnings only for the new selection policy, preserving all facts and byte limits.
- `lib/society/hybrid.ts`: supplies that optional policy to actor projection; historical/replay algorithms unchanged.
- `lib/citizen-grounding/memory.ts`: passes the same optional policy; scoring/permission logic unchanged.
- `lib/contracts/tests/citizen-selection-v2.test.ts`: synthetic ranking/negative regressions.
- `lib/contracts/tests/citizen-selection-integration.test.ts`: actual local-data initialization, identity, weighting, privacy and restoration tests.
- `docs/superpowers/plans/2026-11-01-citizen-selection-v2.md`: task plan.
- `docs/GEOGRAPHIC_IMPACT_AWARE_CITIZEN_SELECTION.md`: this report.
- `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`: current outcome and next action.

## Remaining boundaries

Selection enriches potential relevance; it cannot make independent agents discuss their circumstances or prove realistic future social behaviour. The approximate 2.5 km station heuristic is a prototype choice; no pedestrian access, capacity, crowding or mode-switch model is inferred. Rare changes can exceed the first priority quota and are not guaranteed all selected in larger-impact scenarios. Comparison spread is deterministic stratification, not demographic calibration or a randomised control group.

Real-model grounding and the existing v7 prose rejection rate require separately authorised integrated testing. No paid test is included here; old authorities, accepted worlds and the older US$0.02 uncertain reservation remain protected. No source changes are staged or committed.
