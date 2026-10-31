# Citizen-Grounded MRT Simulation v1: Implementation and Offline Acceptance

Date: 31 October 2026. Implementation baseline: `master`, HEAD `039a9d5a45cfcf89f1e722b4f5f30df2ff075cdd`, initially clean. Work uses the existing main worktree. No paid inference, staging/commit/push, deployment, credential edit or security-policy change was performed.

**Offline acceptance completed.** No real DeepSeek personality generation or behavioural improvement is claimed.

| Independent verdict | Result |
|---|---|
| Official data acquisition | **PASS** - all four priority snapshots, documented/pinned/licensed |
| Synthetic citizen generation | **PASS** - existing IDs/weights preserved; reproducible sidecar and declared calibration bounds |
| MRT commute integration | **PASS** - deterministic actual-network/proposed-line adapter, bounded calculator and consistent UI |
| Personality initialization interface | **PASS** - strict 35/70 mock rosters, identity/provenance/replay; live dispatch disabled |
| Actual DeepSeek personality generation | **NOT TESTED** |
| Issue classification | **OFFLINE PASS** - new finite owned subject/basis/status contract and negative controls |
| Memory relevance | **OFFLINE PASS** - legitimate source anchors, permissions, distractor/non-use controls; unrestricted semantic use UNASSESSED |
| Historical replay and privacy | **PASS within tested boundaries** - twenty qualifying worlds; approved experimental failure remains unresolved |
| Overall new-policy offline integration | **PASS** for the trusted offline initialization/calculation scope; ordinary live citizen-grounded Explore is not enabled |

All source changes remain unstaged and uncommitted. Zero new paid calls; task-owned servers and browser contexts are stopped.

> Dataset location update (1 November 2026): the four Census folders and index now live under `data/employment/`. CSV bytes, acquisition provenance, synthetic snapshots and the acceptance results below are unchanged. Version-one manifests retain recorded acquisition-path strings, not live filesystem dependencies. See [relocation verification](OFFICIAL_CENSUS_DATASET_RELOCATION.md).

## 1. Scope and policy

The extension preserves the existing Census-weighted national society population, MRT routing and all historical selectors. `citizen-grounded-v1` / `conversation-menu-v4` selects new immutable own-citizen facts, `citizen-personality-v1`, `citizen-availability-v1`, finite issue subjects and recorded-fact memory anchors. New worlds use genesis version 6; marker absence retains earlier semantics. Both approved cohorts retain 320 ticks, 350/700 capacity, ST12, EP32, six selected memories, eight item bodies and the 24,000-byte context limit.

Ordinary earlier society execution remains available. Citizen grounding is a trusted server initializer, not a browser-selectable allowance. Live personality initialization deliberately fails closed. The current offline application can calculate citizen journeys without any model call; a separately reviewed personality/provider authorization is needed before a live citizen-grounded Explore.

## 2. Existing evidence reused

- Original Census 2020 residence planning-area/subzone by age-band by source-sex CSV at `data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv` (SHA256 `9d1183c4335a8189272e244ae86bd9770d61854bc30527055df50697bf730c84`).
- Existing `population-c40270178251901b2dc094bc7198d0f15997032f1334e08b6d036ef44aaf7739` recipe/snapshot, seed `impactlens-society-v1`, 10,000 original citizen IDs. Neither generator nor historical base snapshot is replaced.
- Existing planning geography, GTFS static graph, station aliases, shortest-path trees and hypothetical-line overlay.
- `data/transport/origin_destination_train_202609.csv` and `data/transport/LTAMRTStationExitGEOJSON.geojson`. Original files stay at their existing paths.

The inherited weights represent 4,047,260 historical rounded leaf-cell residents versus the published national total 4,044,210: the existing 3,050 discrepancy is preserved and disclosed.

## 3. Official acquisition

All four priority tables were obtained as original public CSV bytes from Singapore Department of Statistics/data.gov.sg, with reference year 2020 and original publication/definition links, Open Data Licence attribution, acquisition timestamp, schema, source hashes and denominator/exclusion notes. Each source lives under `data/employment/singstat-census2020-ctNNNNN/` with `original.csv`, `README.md` and `source-metadata.json`. Expiring download signatures are not stored as credentials or purported durable provenance.

| Table | Original records / columns | Original SHA256 |
|---|---:|---|
| CT17565 | 32 / 16 | `3608447d9af126ac805edf9f23a371d7e5fb47057bfa64534e203c5fe38d3128` |
| CT17582 | 48 / 11 | `28af77107c5294c53de7cb9ea7f2d4c447329bc55101a762a40eaf23eee97da4` |
| CT17586 | 48 / 31 | `5a2fa157e0dc8d7df17813f0a1baab2be68f9985ed2e0c9badef761aaba33735` |
| CT17594 | 32 / 13 | `1b96701295e296913c98cbe0a6828e0395ab27fb3e18e4e1f7b526ace872a204` |

CT17565 constrains labour-force status by residence PA and sex, ages 15+. CT17586 supplies workplace PA / residence region / broad transport mode. CT17594 supplies detailed mode by residence PA. CT17582 supplies broad occupation by workplace PA. These are separate aggregate populations; none identifies actual individual employers, homes or work trips. Missing/dash/nil-negligible values remain explicit unknowns, without manufactured measured zeroes.

No MOM schedule or detailed SSOC source was acquired: these were unnecessary for this bounded prototype. Detailed job titles, employment relationship/nature and schedules remain declared synthetic assumptions rather than measured joint data.

## 4. Synthetic generation and provenance

`lib/citizen-grounding/generator.ts`, `official.ts`, `validation.ts` and the server data module extend the existing population deterministically. Recipe `citizen-circumstances-v1.0.1` freezes source hashes, seed, geography/region/station-catalogue fingerprints, field-level basis/unknown reasons, assumptions, calibration targets/residuals and population identity.

Final dataset: `citizens-127577cd81ceb3342fd1103b9acb0b182683d795039737e548f15067f793f62c`.

- Snapshot: `data/synthetic/citizens-127577cd81ceb3342fd1103b9acb0b182683d795039737e548f15067f793f62c.json`, 25473006 bytes, SHA256 `6931c331515133f14511e20b2821ef1eac3983e63c4fee1564ecd5242675e65b`.
- Companion manifest is 1,030,612 bytes, SHA256 `890f1197561912daef6a8a8bf033d0e6530a105553278102cbd1907da6fadbd8`; it is immutable and must agree exactly with embedded provenance on restoration.
- Identical source versions and seed rebuild identical output bytes/hash.
- Records preserve IDs, strata and expansion weights; closed age bands receive seeded exact ages, while 90+ stays unknown.
- Source sex terminology is retained. Personality or views are not inferred from it.

Recipe 1.0.1 assigns mode before workplace and uses the available residence-region / public-transport/car-taxi workplace conditional where the derived mode mapping is unambiguous. Other/mixed mode uses an expressly labelled regional-total fallback. Unknown mode does not acquire an inferred worksite. Applicable missing conditional cells block assignment and are reported unassessed; work-from-home rows structurally inapplicable to public/car work trips are not converted to measured zero.

Occupation is conditional on assigned workplace PA. Codes identify CT17582 broad categories; detailed SSOC/credential claims are not made. Human-readable job aliases and office/part-time/day/night templates are fictional and currently on-site; remote/hybrid assignments are not calibrated. Employee/own-account and full-/part-time 90/10 and 80/20 templates are explicitly uncalibrated assumptions. No-transport-required is not automatically remote work. Missing worksite, occupation, schedule, arrangement and age retain null/reason as applicable. Employment, unemployment and outside-labour-force categories remain distinct.

The final snapshot contains 4,095 employed, 267 unemployed, 4,938 outside the labour force and 700 labour-force-unknown representatives. Workplace coverage is 3,280; occupation/schedule coverage is 3,111; 852 have unknown travel mode. These are counts of weighted synthetic representatives, not measured individuals. All 10,000 have residence proxies; 9,931 have eligible access-station candidates; 9,616 have exact synthetic ages within closed source bands.

The seeded `age-affinity-v1` allocation within planning-area/source-sex workforce quotas is an explicit synthetic assumption. `under15-eligibility-v1` labour-force model eligibility is treated separately from the official ages-15+ denominator. This does not establish an official age-by-employment joint distribution.

Final calibration: 1,403 rows, 1,369 assessed and 34 unassessed; no assessed residual exceeds its declared allocation tolerance. Maximum assessed absolute weighted residual is approximately 1,318.65. Tolerance equals the conditional category count times the largest indivisible representative weight; it is neither a confidence interval nor proof of realistic correlations. Targets are published proportions scaled to the synthetic eligible denominator, not a fabricated full individual joint distribution. The 34 unassessed calibration rows are unmapped workplace categories: 14 other-planning-area/outside-Singapore, 15 no-fixed-work-location and five work-from-home fallback rows. Their mass remains unknown/unassigned; they are not counted as successful calibration.

The earlier draft `citizens-ade9177380dacf2724e7cf4f46a26ea8f17240f7f99af62d2d5d50ec3db17e28` and its first 50-agent fixture remain preserved as pre-joint-correction development evidence. They are not the final recipe acceptance result.

## 5. Actual transport references

Pinned source/GTFS hashes and reviewed canonical mappings are verified by the server transport loader. September 2026 OD contains 887,478 hourly rows and 85,880,422 trips, with all 185 source codes mapped to served canonical stations and zero unmapped trip mass. The exit reference matches 609 of 613 features across 184 stations; four unmatched exits remain reported.

The integration combines Census 2020 circumstances with the existing GTFS graph and September 2026 OD reference; it is not a calibrated 2026 employment forecast. OD trips remain a separate aggregate reference. They are not unique commuters, worker counts or a residence-to-workplace matrix. Citizen assignments are not forced to reproduce monthly trips. Unsupported/stale station mappings and changed source hashes fail closed.

## 6. Shared deterministic commute adapter

`commute.ts` reuses existing graph costs, shortest-path trees and the hypothetical-line overlay. Trees are cached per origin/network and candidate endpoint assignments are reused. The same citizen ID spans population, employment, commute fact and active social identity.

Home/workplace polygon-interior proxies produce bounded eligible stations. Actual exit locations are declared access proxies where available, with station-point fallback. Intervention access candidates are reconsidered, including newly proposed stations, while baseline alternatives remain available. Straight-line walking with declared speed/detour assumptions is not pedestrian-network measurement.

Outputs distinguish improved, unchanged, worse, newly reachable, unreachable, unknown and not applicable. Coincident geographic endpoints do not invent an initial boarding wait. Non-rail/no-work-trip circumstances receive no automatic rail savings; unsupported rail-plus-bus feeder journeys remain unknown. Service-date workday/arrangement assumptions affect trip applicability; static routing does not establish departure-time feasibility, crowding or punctuality.

Weighted totals conserve original expansion weights. Comparable-subset means and benefit shares exclude unknown/unreachable/non-applicable and separately report their mass. They are not nationwide benefit claims.

## 7. Immutable fact packs and bounded API

Each private fact pack binds citizen, dataset, population, scenario fingerprint, residence/workplace, mode/schedule summary, route status/components, transfers, time difference, assumptions, sources and unknown reason. Original calculated values are immutable in accepted society input. Fact-level assumptions use compact versioned IDs; full descriptions remain on the private run and safe report.

`POST /api/citizen-impact` accepts only a bounded service date and intervention. The canonical request SHA256 is echoed and checked by the browser along with date/revision; no paths, profiles, provider grants or source selection are accepted. Public JSON is capped at 256KB and 32 journey-only samples; employment, schedules, proxies, personality and conversation bodies remain private. The full 10,000-record result stays server-side in a bounded two-run cache. No unrestricted citizen-data or inference endpoint is added.

The Map's existing MRT impact surface provides an explicit calculation button, progress/error feedback and stale-result invalidation. The earlier illustrative Choa Chu Kang calculator remains an independent legacy tool; it does not supply the new citizen facts or manufacture a second sample. The new adapter uses all 10,000 existing national citizen IDs. A single aggregate graph entity and Report table use the same public quantities. No per-message graph expansion or fourth simulation tab is introduced. Calculation observations/navigation have no inference path. Reloaded unaccepted calculation results may be recomputed; accepted selected-citizen facts are durable in the society journal.

## 8. Personality initialization

`personality.ts` defines a strict anonymous-slot 35/70 roster contract. Traits cover communication style, caution, initiative, detail, cooperation and uncertainty tolerance; they exclude demographics, biography, employers and opinion labels. Complete trait vectors are distinct and stable. Full roster identity, source request/output digests and provider/generation provenance are validated and frozen before society genesis.

Worst-case existing relationship planning cannot guarantee room for every personality within its existing input/output limits. Its accepted contract is unchanged. A separate bounded initialization interface and mock gateway exist; live initialization throws before dispatch and creates no paid endpoint. Seventy compact mock outputs fit the conservative 6,000-byte/tokens envelope. Mock origin is labelled `offline-mock`; background styles are labelled `deterministic-rule`, never DeepSeek-generated. Historical personality-free input remains untouched.

## 9. Trusted society integration and daily assumptions

The server service accepts an initializer dependency rather than browser profiles. It verifies the roster/run/capable/background identity before committing new genesis. `session.ts` can bind an existing private commute run to such a trusted initializer. Replay uses accepted facts/personality records, not current downloads or provider calls.

Each model context contains only its actor's compact demographic/employment/workplace/schedule, personality, calculated commute references and legitimate memories. The private sidecar remains capped at 500KB; actor facts at 4KB; whole context at 24KB. Longer otherwise-valid selections fail closed instead of silently dropping agents or raising bounds.

Fictional Day 1 starts Monday 08:00, independently of real execution date. Seeded rest shifts away from declared synthetic work templates; on-shift reasoning has a bounded fictional break, off-shift waking availability remains possible, and overnight work belongs to its starting day. This is an explicit availability assumption, not calibrated Singapore employment behaviour or evidence of actual journey events.

Earlier initial stakeholder statements are retained verbatim in immutable accepted source input. New-policy social placement labels them as analytical scenario-role quotations rather than the grounded citizen's biography; long displayed quotations explicitly disclose omissions. Historical placement is unchanged. This prevents an earlier role's first-person job claim being silently adopted as the citizen's frozen employment.

## 10. Issue precision

The preceding real behavioural comparison recorded 176 creations, 48 resolutions, four withdrawals and 124 terminal open issues. Those selections established contract compliance, not 176 independently verified practical problems. This repair changes only the explicitly selected new bundle; it does not reinterpret those historical issue records.

New finite choices use own grounded commute/schedule/workplace subjects and explicit basis references. Ordinary discussion remains available without issue creation. Controlled-language guards distinguish specific practical questions, explicit participation conditions, own commitments and disagreement from generic/rhetorical/preference statements. Exact authored evidence and permitted IDs are validated; unsupported language is ambiguous rather than rewritten.

An open issue on the same subject offers progress instead of duplicate creation. Lifetime sixteen, active eight and context four limits remain. Owner/source access is revalidated for progress, withdrawal and closure, including private chronology. Updates retain source/status evidence and bounded recent update history; complete events/journals remain authoritative.

Resolution is owner-reported and semantically unverified unless the issue explicitly selected the single complete supported commute-improvement condition and its exact immutable calculated predicate is satisfied. Compound, negated or unrelated questions cannot use that predicate. Agreement never automatically resolves an issue. Closure counts do not establish real-world problem solving.

## 11. Memory relevance and measurement

Stable profile facts stay outside episodic storage. Only actual recorded social-model events may carry own fact/issue links. Topic-v2 retrieval adds a small bounded exact-anchor bonus: 1.0 for a shared own citizen/scenario/fact reference and 0.5 for an accessible own open-issue continuation. A peer reply may reactivate an own anchor only through its complete authorised ancestry; peer metadata cannot forge another citizen's facts. Permissions and actual encounter/body bounds remain first.

Profile keywords alone, another author/citizen/scenario, hidden/future/private-prejoin sources or missing body yield no bonus. ST12/EP32, source coalescing, source diversity and all context bounds remain unchanged. New issue/basis-required memory bindings are excluded from additional optional recall accounting.

Retention, retrieval, body inclusion, optional selection and accurate reference remain separate measures. The conservative declared-grammar evaluator retains wrong-author/date/polarity/condition/distractor controls; unrestricted natural-language meaning remains UNASSESSED, and no result claims causal memory influence. Exact-anchor relevance is not semantic intelligence.

## 12. Regression diagnosis and targeted repairs

Focused RED/GREEN evidence covers missing modules/contracts, broad issue classification, factual output guard gaps, compound predicate closure, missing persona/identity provenance, source-hash changes, large private-array limits, stale response binding, manifest mismatch and joint-mode calibration. New-policy initial analytical-role attribution and stale-render guarding were added after independent review.

The first 100-agent new-policy fixture accepted 700 decisions through tick 320 and passed its replay comparisons, then its new 256KB public-summary engineering budget failed at 304,954 bytes. The payload was dominated by agent summaries and relationship pairs, not leaked raw conversations. `citizen-public-view-v1` now bounds the displayed relationship subset to 256 pairs, favours recorded interactions, preserves source coverage where the byte budget permits, and reports exact per-kind omissions. All actors, authoritative events and whole-run counts remain. Legacy public-contract limits are unchanged. A detached mutable public DTO preserves existing error/status projection behaviour.

The accepted journal was not regenerated or changed to repair this display. A read-only recovery audit verified the same 50/100 worlds, including genuine checkpoints at the first 50 accepted records with positive 300/650-record tails, current public parsers and reconciled projections.

The official loader also replaced dynamic filesystem paths with eight literal allowlisted source/metadata paths after the production build exposed unnecessarily broad asset tracing. Pins and validation remain authoritative; the final build has no tracing warning.

The current English factual-claim guard is deliberately conservative: numerical/personal quantitative assertions use finite fact IDs and application-rendered exact values. Standard numeric/unit/identity forms are rejected in model-authored text. This is not a universal semantic proof against arbitrary-language inventions; it may reject otherwise useful numeric discussion. No rejected output is automatically repaired.

## 13. Final acceptance evidence

Final source/build freeze: 644 application/test/configuration files; fingerprint `8278edc0f6de07a3900922d168c9f522ed99f17c7d5360b6f263d10b09eff2d8`; production build ID `im8Ur-kDXRsDA_wW_Vym3`. It excludes documentation and ignored acceptance artifacts and was rechecked after browser acceptance. The earlier benchmark/historical/standard-desktop freeze was `87ef80ea2f3f4216e7b5b3d756052b0ef94f2d044287481cf08f84e3c68b0870` / build `gfOy7GqNjtuCVMNc8DgjR`. The manifest proves that only the new-table rules in `components/impact.css` changed: the other 643 files are byte-identical. Full Node/TypeScript/build gates and both calculator viewports were refreshed on the final version; replay/benchmark logic did not change.

| Fresh gate | Actual result |
|---|---|
| Network-blocked Node suite | **1,540 / 1,540 PASS**, zero failed/skipped/cancelled; 168.75 s final post-CSS test duration |
| Main application TypeScript | PASS |
| Strict affected-module TypeScript | PASS |
| Production build | PASS, 26.23 s final build; no asset-tracing warning |
| Whitespace | PASS; checked again after final documentation |
| Qualifying historical replay | **20 / 20 strict PASS**, 148 original file hashes unchanged, zero provider/network requests |
| Existing benchmark matrix | **14 / 14 PASS**, 2,330.06 s wall time, serial execution |
| New citizen-grounded cohorts | Both 320 ticks; 350 / 700 accepted, zero rejected; exact genesis/positive checkpoint-tail recovery |
| Desktop and new calculator UI | PASS: both standard cohorts/viewports; real local calculator/binding/privacy checks passed (final style refresh recorded below) |

The approved nonqualifying experimental archive remains in the complete inventory with `unresolved-SOCIAL_STALE`, record 0/tick 1: `f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json`, content SHA256 `f509b72702238ce52d3feb6653b28ca68f7151796f5e39d88834160902f503ca`. Its classification and required hashes remain verified; its missing generation policy remains unrecovered. It is not reported as successful replay. Scope-manifest hash remains `0b0a6a7428b1563ffcee936973211089aca5348d79682f6000c73b60cd340b10`.

### Existing compatibility/stress matrix

Elapsed time includes mocked service, persistence, replay and projections, not real inference latency. Capacity/grant are ceilings. All full replays were exact and checkpoint-based paths were exact where checkpoints existed. Rows marked `none` used genesis fallback and do not count as positive checkpoint-tail tests. Privacy-leak and paid-call counts were zero in every row.

| Fixture | Active / capable | Ticks | Capacity / grant | Accepted | Total seconds | Journal MB | Checkpoint MB |
|---|---:|---:|---:|---:|---:|---:|---:|
| historical | 24 / 4 | 80 | 8 / 8 | 8 | 2.05 | 17.04 | none |
| quick-50 | 50 / 35 | 80 | 64 / 64 | 64 | 11.98 | 2.39 | none |
| quick-100 | 100 / 70 | 80 | 128 / 128 | 128 | 47.77 | 4.79 | none |
| deep-50-80 | 50 / 35 | 80 | 350 / 350 | 350 | 87.46 | 17.97 | 9.13 |
| deep-100-80 | 100 / 70 | 80 | 700 / 700 | 700 | 367.66 | 36.00 | 19.20 |
| multi-50-160 | 50 / 35 | 160 | 350 / 350 | 347 | 108.62 | 18.60 | 9.70 |
| multi-100-160 | 100 / 70 | 160 | 700 / 700 | 695 | 380.28 | 36.91 | 19.72 |
| multi-50-320 | 50 / 35 | 320 | 350 / 350 | 350 | 125.18 | 18.90 | 10.07 |
| multi-100-320 | 100 / 70 | 320 | 700 / 700 | 700 | 362.65 | 37.71 | 20.55 |
| stress-50-672 | 50 / 35 | 672 | 350 / 350 | 350 | 174.66 | 19.42 | 10.82 |
| stress-100-672 | 100 / 70 | 672 | 700 / 700 | 700 | 490.40 | 38.78 | 21.59 |
| grant-70-320 | 50 / 35 | 320 | 350 / 70 | 70 | 35.67 | 3.29 | 2.31 |
| grant-128-320 | 100 / 70 | 320 | 700 / 128 | 128 | 67.82 | 6.55 | 4.08 |
| quiet-50-320 | 50 / 35 | 320 | 350 / 350 | 180 | 64.80 | 6.98 | 3.42 |

MB means decimal megabytes. The existing quiet-model row accepted 180 inactive choices, published zero model content and left 170 of 350 opportunities unused. It is not described as a zero-call empty-world fixture. Intermediate fixtures that use fewer than their capacity are not filled artificially.

### Citizen-grounded 320-tick fixtures

These are scripted capability fixtures using the real data/commute adapter, trusted mock personality initialization and ordinary reducer/coordinator/journal. They establish system capability and negative-case discrimination, not spontaneous intelligence.

| Measure | 50 active / 35 capable | 100 active / 70 capable |
|---|---:|---:|
| Accepted / rejected | 350 / 0 | 700 / 0 |
| Distinct participating capable agents | 35 | 70 |
| Created / owner-reported resolved / open issues | 35 / 29 / 6 | 70 / 56 / 14 |
| Legitimate issue progress updates | 138 | 292 |
| Final private world bytes | 11,971,223 | 24,490,044 |
| Materialised checkpoint bytes | 11,971,688 | 24,490,510 |
| Delta journal bytes | 23,355,515 | 46,637,155 |
| Current public summary / graph bytes | 142,652 / 384,491 | 221,502 / 612,349 |
| Selected / complete public relationship pairs | 256 / 428 | 256 / 980 |
| Recorded pairs displayed / complete | 162 / 162 | 226 / 417 |
| Grounding input bytes | 222,059 | 439,968 |
| Largest actor grounding bytes | 4,067 | 4,063 |
| Largest whole context bytes | 24,000 | 24,000 |
| Episodic-only primary-context references | 208 | 452 |
| Raw / additional optional recalls | 0 / 0 | 0 / 0 |
| Semantic/causal memory use | UNASSESSED | UNASSESSED |
| Positive checkpoint tail records | 300 | 650 |

Both fixtures retained ST12/EP32, at most six selected memories/eight source bodies, same-tick ordering, private access and original journal/checkpoint hashes. The 4KB actor-context headroom is small in these selections; arbitrary longer profile selections are not claimed to fit. Existing per-context packing remains binding.

The first 50-agent complete fixture took 210.99 s including its audits; its full replay took 55.14 s. The repaired-projection recovery audit took 57.15 s (50) / 196.14 s (100), with replay components 55.15 / 182.22 s. The original 100-agent audit terminated at the display-bound assertion after accepting its complete state; no successful original end-to-end timing is invented.

Both fixtures recorded two rule-bootstrapped private groups (one empty; one with 23 mock-authored messages by six actors) and one mock-selected additional group with four members and no messages. The empty group remains a valid outcome. Focused tests cover legitimate first/later private messages and permission failures; no content was inserted to fill the empty group.

| Fictional day | 50: accepted / distinct actors | 100: accepted / distinct actors |
|---|---:|---:|
| 1 | 70 / 30 | 142 / 66 |
| 2 | 105 / 33 | 206 / 68 |
| 3 | 102 / 34 | 207 / 63 |
| 4 | 73 / 34 | 145 / 62 |

Safe evidence: `tmp/citizen-grounded-v1-20261031/` contains `gates.jsonl`, `node-full-final.log`, TypeScript/build logs, `historical-final/historical-replay.json`, `benchmark/benchmarks.json`, `retained-verification/citizen-{50,100}.json`, `citizen-metrics.json`, source/build fingerprint and focused RED/GREEN logs. Private fixture bodies stay in ignored storage, not this report.


All fixtures are synthetic capability checks. Quiet/non-use/empty-group outcomes remain valid, and no scripted mock is real DeepSeek evidence. New-policy real personality generation and behavioural improvement are NOT TESTED.


### Desktop and calculator acceptance

Both existing 320-tick desktop cohorts passed at 1440x900 and 1920x1080. The 50-agent mocked Explore completed in 86.404 seconds; the 100-agent mocked Explore completed in 276.403 seconds. These are local browser observations with fixture inference, not DeepSeek latency or the separate citizen-fixture replay timings. Both reached tick 320 with 350/700 accepted decisions and 35/70 participating capable agents.

Checks covered Map-first Explore, one coordinator job per Explore, browser closure/background continuation/reconnection, safe polling, pause/resume/cancel, saved restoration without inference, entity-first graph/inspectors, hidden-agent search and filters, dragging, connected-neighbour movement, settling, Graph/Report counts, both viewports, and summary-only privacy. Page/console error arrays were empty and global horizontal overflow was absent. Existing 600,000ms fixture timeouts and assertions were not weakened.

The additional MRT fixture exercised ordinary Map/Plot Tools/calculator interpretation/advanced editor and four actual local 10,000-citizen calculations across both viewports. The optional generic classifier was disabled only in the task process (`AI_PROVIDER=disabled-offline`), so the application's real deterministic planner fallback ran; no plan was injected. Both widths verified exact canonical request SHA/date binding, one aggregate graph entity, Report equality, line/date stale-result invalidation, malformed-response rejection, no inference routes, and no raw private fields in payload/HTML/storage. Public responses were 11,768 bytes with 153 baseline and 154 intervention shortest-path trees and three candidate stations per endpoint. This demonstrates reuse across citizens, not 10,000 independent traversals.

For the labelled illustrative line on 2026-10-27, 3 representatives improved, 372 were unchanged, 15 were unreachable, 1,740 were unknown and 7,870 were not applicable; none was worse/newly reachable in that example. The comparable weighted rail subset was 205,908.33 and its mean modelled saving about 0.186 minutes. This is a proxy-scenario result, not a nationwide benefit or real passenger forecast.

Instrumentation repairs preserved failures and successful accepted work: the initial new MRT harness queried a role-hidden button before opening its native disclosure; the corrected harness opens the visible summary first. The Playwright transport also returned a 300-second RPC timeout after the 100-agent fixture had stored its complete success result. That result was recovered read-only from the owned parent page; the accepted simulation was not rerun. A VM-incompatible dynamic-import artifact writer was replaced with parent-side safe-JSON persistence. No application validation or timeout was relaxed.

Visual review then identified cramped spacing in the new commute table. The final source delta is confined to `components/impact.css` and unique new-report selectors; simulation/provider/replay TypeScript is unchanged. Final Node/TypeScript/build gates and both calculator viewports passed again after the adjustment. Historical, matrix and standard desktop evidence remains applicable to the unchanged logic; the final source manifest explicitly records the CSS-only delta.

Final-build calculator checks passed at both sizes with two actual local calculations per viewport, correct request binding and Graph/Report totals, successful stale/invalid-response rejection, empty page/console error arrays, no raw private fields and exact 1440/1920 scroll-width bounds. Final screenshots are `desktop/mrt-style/citizen-mrt-{1440,1920}-{map-impact,report,graph}.png`; numeric proof is `desktop/citizen-mrt-ui-style-final.json`. Visual inspection confirmed table spacing and centred Report alignment.

Standard browser numeric proof is in `desktop/cohort-{50,100}-result.json`. Basemap tiles were intercepted as transparent local fixtures; local geometry was rendered, and no external tile request was dispatched.

Safe screenshots and numeric results are under `desktop/cohort-{50,100}/`, `desktop/mrt/` and `desktop/mrt-style/` in the task directory. The first MRT failure screenshot/diagnosis and original table appearance remain preserved.

## 14. Preservation, privacy and zero paid use

The initial preservation snapshot covers 1,714 pre-existing files (1,973,244,175 bytes), including historical data, prior reports and paid evidence. The original 167,549-byte roadmap prefix retained SHA256 `7664c1914d05f09e3784c8ef2e830469c20577f80018607d9d6010b6ca37e0f4`; an authorised 2,767-byte section was appended. All other 1,713 protected originals retained exact size/hash, with no mismatches. Both final synthetic artifacts and the earlier draft snapshot/manifest also retained their pinned hashes. `preservation-final.json` records the complete result. Historical Option B remains pinned and unresolved for the one approved experimental artifact, without changing its replay result to PASS. Final cleanup verified zero task-tagged Node processes and no listener on port 3236; all owned browser contexts and the owned blank tab were closed, preserving the pre-existing tab. No accepted evidence was deleted.

No Tavily/OpenRouter completion, paid evaluator, new paid ledger, connectivity probe, automatic paid retry or inherited live authorization is used. Official public dataset acquisition is distinct from paid inference. Acceptance logs, screenshots and long-run private fixture journals live under ignored `tmp/citizen-grounded-v1-20261031/`; synthetic snapshots are ignored and reproducible under `data/synthetic/`. Unit tests also use isolated temporary directories following existing test conventions.

## 15. Remaining limitations and next action

This is historical aggregate-constrained synthetic modelling, not observed individual mobility, employment, personality or public opinion. Unknown source categories, feeder journeys and unsupported employment details remain explicit. No household/employer database, pedestrian routing, dynamic timetable, mode-switch calibration, crowding model, vector store, queue, parallel inference or new model allowance is introduced.

The live citizen-grounding initializer is not automatically enabled in ordinary Explore. A future separately authorised acceptance should first review the compact personality budget and the frozen current-policy bundle, then observe actual model choices without forced issues, recall or coordination. No next paid phase starts automatically.

## 16. Exact task file inventory

78 repository source/documentation files: 21 modified, 57 new. No staged files. The following list includes this report and the authorised roadmap append. Generated snapshots/manifests are separately listed in Section 4; task-specific evidence stays ignored under the task directory.

Modified:

- `.gitignore`
- `components/impact-panel.tsx`
- `components/impact.css`
- `components/workspace.tsx`
- `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`
- `lib/server/inference/social.ts`
- `lib/server/society/service.ts`
- `lib/server/society/summary.ts`
- `lib/society/context-capacity.ts`
- `lib/society/contract.ts`
- `lib/society/decision-contract.ts`
- `lib/society/decision-menu.ts`
- `lib/society/engine.ts`
- `lib/society/episodic.ts`
- `lib/society/hybrid.ts`
- `lib/society/intelligence.ts`
- `lib/society/issue-menu.ts`
- `lib/society/retrieval.ts`
- `lib/society/temporal-policy.ts`
- `scripts/testing/phase4e2-memory-evidence.ts`
- `scripts/testing/tsconfig.phase4d.json`

New:

- `app/api/citizen-impact/route.ts`
- `components/citizen-commute-panel.tsx`
- `docs/CITIZEN_GROUNDED_MRT_SIMULATION_V1_IMPLEMENTATION_AND_OFFLINE_ACCEPTANCE.md`
- `data/employment/README.md`
- `data/employment/singstat-census2020-ct17565/README.md`
- `data/employment/singstat-census2020-ct17565/original.csv`
- `data/employment/singstat-census2020-ct17565/source-metadata.json`
- `data/employment/singstat-census2020-ct17582/README.md`
- `data/employment/singstat-census2020-ct17582/original.csv`
- `data/employment/singstat-census2020-ct17582/source-metadata.json`
- `data/employment/singstat-census2020-ct17586/README.md`
- `data/employment/singstat-census2020-ct17586/original.csv`
- `data/employment/singstat-census2020-ct17586/source-metadata.json`
- `data/employment/singstat-census2020-ct17594/README.md`
- `data/employment/singstat-census2020-ct17594/original.csv`
- `data/employment/singstat-census2020-ct17594/source-metadata.json`
- `docs/superpowers/plans/2026-10-31-citizen-grounded-mrt-v1.md`
- `lib/citizen-grounding/availability.ts`
- `lib/citizen-grounding/commute-contract.ts`
- `lib/citizen-grounding/commute.ts`
- `lib/citizen-grounding/contract.ts`
- `lib/citizen-grounding/decision.ts`
- `lib/citizen-grounding/generator.ts`
- `lib/citizen-grounding/graph.ts`
- `lib/citizen-grounding/initial-actions.ts`
- `lib/citizen-grounding/issue-choices.ts`
- `lib/citizen-grounding/issues.ts`
- `lib/citizen-grounding/memory.ts`
- `lib/citizen-grounding/official.ts`
- `lib/citizen-grounding/personality.ts`
- `lib/citizen-grounding/public-contract.ts`
- `lib/citizen-grounding/public-view.ts`
- `lib/citizen-grounding/social.ts`
- `lib/citizen-grounding/validation.ts`
- `lib/contracts/tests/citizen-availability.test.ts`
- `lib/contracts/tests/citizen-commute.test.ts`
- `lib/contracts/tests/citizen-data-server.test.ts`
- `lib/contracts/tests/citizen-data.test.ts`
- `lib/contracts/tests/citizen-grounded-memory.test.ts`
- `lib/contracts/tests/citizen-impact-api.test.ts`
- `lib/contracts/tests/citizen-initial-role.test.ts`
- `lib/contracts/tests/citizen-integration.test.ts`
- `lib/contracts/tests/citizen-issue-precision.test.ts`
- `lib/contracts/tests/citizen-menu.test.ts`
- `lib/contracts/tests/citizen-personality.test.ts`
- `lib/contracts/tests/citizen-policy.test.ts`
- `lib/contracts/tests/citizen-presentation.test.ts`
- `lib/contracts/tests/citizen-public-view.test.ts`
- `lib/contracts/tests/citizen-social-grounding.test.ts`
- `lib/contracts/tests/citizen-transport-data.test.ts`
- `lib/contracts/tests/citizen-transport-fixture.ts`
- `lib/server/citizen-grounding/api.ts`
- `lib/server/citizen-grounding/data.ts`
- `lib/server/citizen-grounding/session.ts`
- `lib/server/citizen-grounding/transport-data.ts`
- `scripts/generate-citizen-circumstances.ts`
- `scripts/testing/citizen-grounded-acceptance.ts`
