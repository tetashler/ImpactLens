# Citizen-grounded MRT v1: hybrid interpretation and provider-personality acceptance

**Final status: implementation and offline acceptance PASS; real-provider end-to-end acceptance PARTIAL. The one authorised attempt ended at a valid model clarification, before personalities or society simulation. Post-run verification and cleanup are complete. No further paid attempt is authorised.**

## Baseline and authority

Work began on clean `master`, HEAD `5399e12c065e46806785146c79b7131e0668ab99`, in the main ImpactLens worktree. Earlier citizen-grounding, relocation and real-provider reports remain historical evidence.

The user authorised one new MRT Explore only after complete offline acceptance. The user clarified that the 90-minute clock starts when that paid evaluation is armed. Authority is independent of every closed earlier ledger: one attempt; entity planning 1; relationship planning 1; initial stakeholder actions 8; personality initialization at most 3; separate interpretation at most 1; social completions at most 350; total completions at most 365; reported plus outstanding reserved OpenRouter USD at most 1; Tavily one request/two credits; serial inference; zero automatic retries or paid evaluators. The task guard also bounds accounted/reserved tokens at 40,000,000, request bodies at 98,304 bytes and model user context at 24,000 bytes. Existing stricter stage limits also apply.

All new safe evidence is task-scoped under ignored `tmp/citizen-hybrid-20261101/`. The independent real ledger is `tmp/citizen-hybrid-live-20261101-01/ledger.json`, backed by its hash-chained journal and head. That attempt is closed `partial` with no pending or unknown charges.

## Dataset and runtime verification

The existing official snapshots remain under `data/employment/`:

| Snapshot | Original CSV SHA-256 |
|---|---|
| CT17565 | `3608447d9af126ac805edf9f23a371d7e5fb47057bfa64534e203c5fe38d3128` |
| CT17582 | `28af77107c5294c53de7cb9ea7f2d4c447329bc55101a762a40eaf23eee97da4` |
| CT17586 | `5a2fa157e0dc8d7df17813f0a1baab2be68f9985ed2e0c9badef761aaba33735` |
| CT17594 | `1b96701295e296913c98cbe0a6828e0395ab27fb3e18e4e1f7b526ace872a204` |

`dataset-verification.json` verifies the four pins, metadata/attribution presence and current source loading. The original 10,000-citizen snapshot remains `citizens-127577cd81ceb3342fd1103b9acb0b182683d795039737e548f15067f793f62c`, SHA `6931c331515133f14511e20b2821ef1eac3983e63c4fee1564ecd5242675e65b`; its manifest SHA remains `890f1197561912daef6a8a8bf033d0e6530a105553278102cbd1907da6fadbd8`. Its calibration has no failed assessed targets. Generation recipes and original source strata/weights are preserved.

The September 2026 station OD CSV and station-exit GeoJSON remain deterministic transport references. Monthly station trips are not individual commuters or residence/workplace observations. Historical manifest paths remain provenance identifiers; current allowlisted loaders read relocated files.

An additional packaging check found existing private runtime files in server tracing manifests: 164–290 history references and four synthetic files in affected routes. Narrow `outputFileTracingExcludes` now omit `data/derived/agents/`, `data/synthetic/` and `tmp/` from packaged server assets. The final pre-live build's 25 server traces contain no such private references or retired dataset paths; both citizen-impact and scenario-simulate traces retain all eight required official CSV/metadata assets. Local runtime files remain available and unchanged. All 26 dataset pins passed the pre-live gate.

## Hybrid map interpretation

`hybrid-map-v1` binds the exact question, original geometry, revision, explicit anchor IDs and dated network catalogue. Obvious supported descriptions use deterministic classification. Other descriptions use one fixed-route structured DeepSeek interpretation with application-owned IDs and intervention types. The model supplies no coordinates, distances, edge costs or connectivity.

Station dots are ordered by their attachment to the submitted polyline. Vertices do not become stations. Quantitative MRT admission requires the exact route and ordered station selection confirmed in the UI, explicit catalogue-verified anchors and acknowledged timing assumptions. Selection, date, anchor, timing, geometry or question changes invalidate current browser results.

Standalone station markers expose nearby station suggestions and schematic service-connection proxies. They do not establish physical track connectivity or a supported insertion into an existing railway. Polyclinics and other facilities receive bounded official boundary/location context; unsupported numerical facility outcomes are not produced. Ambiguity returns an editable review result.

An actual UI regression exposed a dot/line mismatch: explicit interchange confirmation moved a coincident dot roughly thirty-five metres to a catalogue station while its line vertex stayed behind. The UI now moves only an unambiguous vertex already exactly coincident with that dot, and the confirmation text discloses both movements. Nearby or multiply matched vertices are not selected automatically. The server's attachment threshold and network validators remain strict. Actual UI geometry subsequently retained all three selected dots at zero attachment distance, preserving vertex order and exact confirmed anchors.

## Personalities and ordinary Explore

The existing `citizen-personality-v1` contract now has a real fixed-route provider adapter. Anonymous slots prevent demographic/job facts from being supplied to personality generation. A complete bounded roster is validated once before society genesis; missing, duplicate, extra or malformed entries fail without replacement profiles. Historical mock request/roster hashes remain exact.

| Capable agents | Request bytes | Maximum compact response bytes | Minimum bounded batches |
|---|---:|---:|---:|
| 35 | 3,349 | 2,665 | 1 |
| 70 | 4,784 | 5,325 | 1 |

These are offline bounds, not a guarantee that a live model will comply. Limits remain 24KB input, 6KB personality response and 6,000 output tokens. Traits and generation provenance are frozen; rule-driven styles retain a distinct deterministic origin.

The new ordinary Explore envelope contains only validated plotting options. The server owns dataset access, citizen selection, deterministic commute calculations and personality dispatch. `CitizenGroundedInput` version 2 adds the explicit `hybrid-citizen-explore-v1` execution bundle and immutable question/geometry/intent/intervention/catalogue/citizen-scenario binding. Version 1 retains its original strict interpretation. Legacy requests and historical worlds keep their frozen policies.

The implementation can activate the existing `citizen-grounded-v1` / `conversation-menu-v4` issue and memory policies through this ordinary path after successful initialization. This capability passed offline fixtures; the paid attempt did not reach initialization. Stable synthetic facts, calculated commute inputs, model personality, recorded experiences and formal issues remain separate. ST12, EP32, six references, eight source bodies and 24KB context bounds are unchanged. The Map/Graph/Report surfaces receive only bounded aggregate grounding metadata and commute output.

## Admission, storage and failure handling

The new task guard binds the entire confirmed hybrid input, code/HEAD and root configuration/package bytes, build identity, source pins, protected records and offline proof. Reservations precede dispatch. Stage-specific and cumulative ceilings are independently enforced. Caller cancellation, stage timeouts and the absolute task deadline cover dispatch and bounded response-body reads. Uncertain outcomes retain conservative reservations and halt additional requests; late results cannot unlock a retry.

Original storage initially contained 61 accepted archives and 63 social-session indexes against the existing 64-session ceiling. Offline desktop runs therefore use normal-user task-isolated storage. The one remaining original session slot is reserved for the authorised live attempt. A new regression ensures a full namespace rejects Explore before any provider expenditure; no capacity was increased and no accepted records were deleted.

Provider routing remains OpenRouter → `deepseek/deepseek-v4-flash-0731` → DigitalOcean only, fallback disabled, required parameters enabled and reasoning excluded. The USD ceiling is local admission control rather than an external prepaid billing guarantee.

## Mandatory pre-live offline acceptance

The final read-only review identified a presentation binding defect before paid admission: an independent native calculator result could be appended to an accepted world's Graph when only its question matched, or shown beside its accepted Report. Three regressions exercise the actual Workspace selection callback, standalone Report condition and communication-Report call site using distinct deterministic calculations A and B. All three first failed at the intended boundary and pass after a narrow Workspace repair. Accepted runs now use only their server-owned Graph/Report facts; standalone calculators retain independent draft calculations. No accepted world, policy, source data or journal was changed. The full gate cycle and desktop evidence were refreshed after this repair and passed before arming.

The initial broad run passed 1,651/1,653 tests. Two report-rendering tests used a data-URL loader that could not resolve the newly reused citizen-report component. The loader now renders the actual TSX dependency tree; privacy assertions remain unchanged. After the accepted-run binding repair and explicit types in its regression harness, final-source verification passed **1,669 tests**, application and strict TypeScript, production build and whitespace checks. Source fingerprint before and after these gates is `6a075fe936777e0f1d516d6382ad35bbd15d921f603969cafcf6207a71296871`; build ID is `73lF3xylcA46T674OqBo5`.

Actual mouse-driven line/dot/interchange, station-marker and polyclinic tests passed at both desktop viewports for both cohorts. The observer now reads the production plot store snapshot rather than potentially stale memoized React props. A browser transport body-read failure is handled by observing the already validated matching controller result; no response, geometry or accepted interpretation is injected. Final corrected drawings retained their three ordered dots and explicit anchors. Mocked fixtures establish capability, not genuine model behaviour.

| Required final gate | Status |
|---|---|
| Final full Node suite, both TypeScript checks, build, whitespace | PASS: 1,669 tests; identical before/after source fingerprint |
| Fourteen established benchmark configurations | PASS: all 14 rows; both 320-tick capacities, both seven-day stress cohorts, reduced grants and quiet world |
| New-bundle full 350/700 fixtures and positive checkpoint tails | PASS: 350/700 accepted decisions; exact 346/696-record tails; zero regenerated social/personality requests |
| Both standard desktop cohorts and viewports | PASS on final build: 350/700 mocked decisions through tick 320; pause/resume/cancel, browser closure/reconnection and both viewports |
| New citizen-grounded ordinary UI initialization/restoration | PASS on final build: 35/70 mocked personality rosters, Graph/Report agreement, cancellation and restoration at both viewports |
| Twenty strict qualifying historical replays and classified inventory | PASS: 20/20 strict qualifying replays; 148 original hashes preserved; pinned experimental failure remains unresolved |
| Protected-file preservation and final privacy checks | PASS offline: all 814 protected files unchanged; tested projections contain no detected private leaks |

The pinned pre-final mocked artifact remains nonqualifying and unresolved `SOCIAL_STALE`; a historical gate PASS will not claim that artifact replayed successfully.

## Established offline benchmarks

The established offline matrix completed all fourteen configurations in 2,069.54 seconds. Per-row elapsed time includes fixture initialization, mocked gateway work, durable storage and replay verification; it is not a live-provider latency estimate. Storage uses decimal MB. A dash means that historical policy has no materialised checkpoint.

| Configuration | Ticks | Accepted fixture decisions | Elapsed seconds | Genesis replay seconds | Journal MB | Checkpoint MB |
|---|---:|---:|---:|---:|---:|---:|
| Historical 24/4 | 80 | 8 | 2.06 | 0.43 | 17.04 | — |
| Quick 50/35 | 80 | 64 | 11.07 | 3.32 | 2.39 | — |
| Quick 100/70 | 80 | 128 | 33.97 | 10.73 | 4.79 | — |
| Deep 50/35 | 80 | 350 | 65.46 | 26.14 | 17.97 | 9.13 |
| Deep 100/70 | 80 | 700 | 332.80 | 137.47 | 36.00 | 19.20 |
| Multi-day 50/35 | 160 | 347 | 106.72 | 36.75 | 18.60 | 9.70 |
| Multi-day 100/70 | 160 | 695 | 383.41 | 149.00 | 36.91 | 19.72 |
| Multi-day 50/35 | 320 | 350 | 109.70 | 40.58 | 18.90 | 10.07 |
| Multi-day 100/70 | 320 | 700 | 343.46 | 137.20 | 37.71 | 20.55 |
| Seven-day 50/35 | 672 | 350 | 165.35 | 47.74 | 19.42 | 10.82 |
| Seven-day 100/70 | 672 | 700 | 375.91 | 152.62 | 38.78 | 21.59 |
| Grant 70 / capacity 350 | 320 | 70 | 29.89 | 7.08 | 3.29 | 2.31 |
| Grant 128 / capacity 700 | 320 | 128 | 54.14 | 16.57 | 6.55 | 4.08 |
| Quiet 50/35 | 320 | 180 | 52.66 | 15.22 | 6.98 | 3.42 |

Every row passed its existing serial-inference, replay, capacity and privacy assertions. The primary 320-tick row distributed decisions 119/117/114 across early/middle/late periods; the larger row used 240/231/229. The grant-70 row used 28/21/21 and reached tick 320. Quiet choices consumed fewer than the available 350 opportunities without generating forced model-authored dialogue. These are scripted capability fixtures, not evidence of spontaneous model behaviour.

## Grounded-bundle capacity and recovery

Both new version-2 fixtures bind the original technical MRT question and selected geometry to the actual deterministic citizen commute calculation, accepted anonymous personality roster, and `hybrid-citizen-explore-v1` genesis. They use real local sources and mocked external fetch through the production structured transport. The scripted stakeholder/social choices establish capability only.

| Cohort | Accepted / tick | Mock personality batches | Max context bytes | Journal / checkpoint MB | Genesis replay seconds | Positive-tail replay seconds |
|---|---|---:|---:|---|---:|---:|
| 50 / 35 capable | 350 / 320 | 1 | 23,999 | 23.20 / 11.80 | 53.81 | 58.29 |
| 100 / 70 capable | 700 / 320 | 1 | 23,997 | 46.45 / 23.98 | 177.19 | 186.97 |

The complete fixture times were 259.70 and 811.01 seconds. Both passed exact genesis, saved-world and final-checkpoint reconstruction. The earlier checkpoint contained four records; exact positive tails contained 346 and 696 records. Journal hashes remained unchanged, and restoration generated zero social or personality calls. Public payloads were 527,304 and 832,915 bytes with zero detected leaks. Scripted issue changes, private messages and episodic references are not genuine DeepSeek behavioural findings.

## Single real evaluation: closed partial

The authorised attempt was armed only after the mandatory offline gates above passed. It was submitted once through the ordinary UI, then stopped on an accepted model clarification before retrieval or downstream execution. It is **not** an end-to-end real-provider acceptance pass.

The pinned scenario concerns a hypothetical cross-town MRT connection along the user's drawn alignment between Choa Chu Kang and Sengkang, with only the station dots used as stops. It asks how modelled commutes and fictional practical discussion might change for the same synthetic citizens. This paraphrases the user scenario; no raw provider prompt or private request/response body is reproduced here.

### Actual submitted geometry and settings

`desktop/live-prepare/held-ready.json` records the actual UI plot-store snapshot. It contains one three-vertex line and three independently drawn station dots at geometry revision **12**. The UI-confirmed point order is NS4 → intermediate dot → NE16; the two end dots are explicitly anchored to their exact catalogue coordinates. Their coincidence with line vertices does not turn vertices into stations.

| Ordered station dot | Latitude | Longitude | Connection status |
|---|---:|---:|---|
| Choa Chu Kang, NS4 | 1.38517205 | 103.744369 | Explicit existing-station anchor |
| New intermediate plotted stop | 1.39916 | 103.819839 | Hypothetical new station; no proximity-based connection |
| Sengkang, NE16 | 1.39152768 | 103.895416 | Explicit existing-station anchor |

The selected service date was **2026-10-27**. Declared illustrative assumptions were **600 seconds running per segment, 30 seconds dwell, 150 seconds waiting, and 180 seconds interchange walking**. Both geometry and assumption confirmations were true. These are submitted inputs, not inferred timetable or engineering facts. No physical feasibility assessment was performed.

`live-ui-submission.json` records one request, one completed click, a consumed submission marker and a transmission matching the pinned input. The task authority identity SHA-256 is `9f37fbe9e9f7e96940b3336c22df201528a91b173576517bcf8b7543817691f7`. The paid source fingerprint was `6a075fe936777e0f1d516d6382ad35bbd15d921f603969cafcf6207a71296871`, with production build `73lF3xylcA46T674OqBo5`.

### Provider result and stopped execution

The only paid request used `hybrid_intervention_intent_v1`. The ledger records HTTP **200**, the exact requested `deepseek/deepseek-v4-flash-0731` model, DigitalOcean serving provenance verified from the completion, normal `stop` termination and **zero reasoning tokens**. The application accepted a schema-valid **`clarify`** result. The resulting public state was `needs-map-review` / `clarification`.

The saved public review says that no route choice was provided and no quantitative model was available. This is a **model-authored clarification claim**, not a finding about application capability: the UI had a confirmed route/point selection, and the server has a limited static MRT/citizen commute model. The broader question's future schedules, concerns and coordination are not supported quantitative forecasts. The application correctly honoured the valid clarification instead of forcing a different intent or inventing a calculation.

No Tavily retrieval, entity or relationship planning, initial stakeholder action, personality generation, proposal-impact calculation or social decision followed. No stakeholder run or society world was accepted. There is therefore no live roster, citizen-impact report, terminal social tick, social journal, checkpoint or new-policy world to replay from this attempt. The durable attempt claim and provider ledger are retained.

`live-map-review.json` contains two identical snapshots of the same public review. They do not establish two provider requests: the UI transmission evidence and authoritative ledger both show one. `live-map-review-1920.png` preserves the displayed stopped state. The original raw provider JSON was not retained and has not been reconstructed or presented as evidence.

### Actual accounting and admission closure

| Stage | Authorised ceiling | Actual requests / completions |
|---|---:|---:|
| Separate hybrid interpretation | 1 | 1 |
| Entity planning | 1 | 0 |
| Relationship planning | 1 | 0 |
| Initial stakeholder actions | 8 | 0 |
| Personality initialization | At most 3 | 0 |
| Social inference | 350 | 0 |
| Total completions | 365 | 1 |
| Tavily search | 1 request / 2 credits | 0 requests / 0 credits |

The per-stage completion ceilings sum to 364, so the outer 365 ceiling does not create an additional available stage. This implementation's complete anonymous roster uses one bounded batch when initialization is reached; no such batch was reached live.

| Ledger measure | Final actual value |
|---|---:|
| Input tokens | 1,012 |
| Output tokens | 113 |
| Total accounted tokens | 1,125 |
| Reported OpenRouter USD | 0.000147322 |
| Reported plus outstanding reserved USD | 0.000147322 |
| Unknown charges / outstanding USD reservation | 0 / 0 |
| Pending / interrupted requests | 0 / 0 |
| Retries / replacement paid attempts | 0 / 0 |

The attempt was armed at `2026-10-31T19:51:08.608Z` (1 November, 03:51 Singapore time) and closed `partial` at `2026-10-31T19:53:37.163Z`. The 90-minute deadline began at arming, not at task start. Closing the attempt removes dispatch authority even though no budget limit or transport failure was hit. The independent ledger remains closed; no second attempt, paid retry, alternate prompt or paid evaluator is permitted under this authority.

## Comparison with preceding real runs

Earlier accepted Phase 4E.2 reports document completed 320-tick societies with 350 real social completions. This attempt intended the same 50-active/35-capable cohort and horizon but used a different plotted MRT question, citizen grounding and personality initialization. It stopped before reaching those social execution stages. Conversation, participation by day, issue precision, private coordination, older-memory use and personality expression are therefore **NOT OBSERVED**, rather than comparable zero scores. Its one-call cost is not a cost-efficiency comparison against a complete earlier run. No behavioural or causal improvement is inferred, and earlier reports remain unchanged.

## Independent outcome verdicts

| Topic | Verdict and evidence boundary |
|---|---|
| Official sources, population identity and calibration | **PASS offline.** Relocated loaders, source attribution, original CSV pins, 26 dataset pins and the unchanged 10,000-citizen snapshot were verified. This does not establish observed individual jobs or journeys. |
| Actual UI geometry and transmission | **PASS for input preparation.** Revision 12, three ordered dots, exact NS4/NE16 anchors, declared seconds and one matching UI request are recorded. |
| Standalone MRT station-marker interpretation | **PARTIAL.** Bounded location and nearby-station/service-context fixtures passed; unsupported standalone railway insertion is left unresolved. No physical track connection or live station-only outcome is claimed. |
| Non-MRT facility interpretation | **PASS for bounded offline context.** Polyclinic/location and conflicting-plot fixtures passed at both desktop sizes. No numerical healthcare outcome or live facility acceptance is claimed. |
| Fixed-route real interpretation | **PASS for transport/schema/provenance; PARTIAL for workflow acceptance.** One genuine completion returned valid `clarify`; it did not accept an MRT intervention for execution. |
| Deterministic MRT and citizen commute calculation | **PASS offline capability; NOT RUN for the submitted live intervention.** No live commute saving, access change or population benefit is claimed. |
| Ordinary Explore initialization and V2 binding | **PASS offline fixtures; NOT REACHED live.** The attempt ended before initial actions and citizen genesis. No accepted live V2 world exists. |
| Genuine DeepSeek personality activation | **NOT RUN.** Zero personality requests, zero live generated profiles and no live evidence of trait diversity or influence on behaviour. Offline mocked roster and transport checks remain separate. |
| Social scheduling, discussion and coordination | **NOT RUN.** No accepted initial turns, social decisions, peer replies, platform activity, formal issues, resolutions or recorded social changes exist for this attempt. |
| ST12 / EP32 / references / source-body / context capacity | **PASS offline bounds; NOT EXERCISED by live social activity.** The 350/700 fixtures and their measured context limits do not demonstrate actual model behaviour. |
| Memory use and personality-related causal claims | **UNASSESSED live.** No memories or decisions were generated. No causal personality, memory, commute or schedule effect is inferred. |
| Issue-classification improvement | **INCONCLUSIVE.** The finite grounded menu and owned-source safeguards passed offline, but this attempt generated no real social issue selections, closures or ordinary conversation. |
| Episodic-memory improvement | **INCONCLUSIVE.** Offline source/permission and retention fixtures passed; no live memory was created, retrieved or substantively used in this attempt. |
| Privacy and provenance | **PASS for tested offline projections and retained live review/ledger.** Raw provider prompts, private bodies, citizen profiles, jobs, schedules and conversations are not copied into this report. There was no live society corpus on which to claim a behavioural privacy audit. |
| Replay and recovery | **PASS offline**, including full V2 reconstruction and exact positive tails of 346/696 records with zero regenerated calls. **NOT APPLICABLE to a live accepted world**, because none was created. The closed provider ledger retains the one actual request. |
| Spending, serial admission and no retry | **PASS for the recorded attempt.** One completion, known settled cost, no pending reservation, no downstream dispatch and no retry. This remains local admission evidence, not a prepaid billing guarantee. |
| Overall real-provider mission | **PARTIAL / end-to-end NOT ACCEPTED.** Input submission and safe clarification handling were demonstrated; personality activation and new-policy real social behaviour were not. |

## Diagnosis and minimal future work

There is a confirmed omission in the current semantic interface. The browser submitted `hybrid.selection` and confirmed timings, but `modelContext` projects feature IDs, deterministic attachments and anchors without the confirmed selection or timing-confirmation status. Its system instructions warn against unsupported quantitative models without providing an explicit manifest of the available static MRT/citizen-commute capability. The submitted wording used “MRT connection”; the conservative deterministic classifier recognises MRT line/route descriptions, so the semantic stage was expected to run.

These omissions plausibly contributed to the clarification. They are **not a proven unique cause**: this was one stochastic model response, no paid ablation was authorised, and the raw provider JSON was not retained. The saved public review does not establish why the model chose clarification. A schema-valid cautious clarification remains an allowed result. No runtime validator defect was established, and no production validator or application policy was changed to turn the clarification into an accepted MRT proposal.

The immediate follow-up is a clearly labelled **synthetic contract regression**, `lib/contracts/tests/hybrid-live-clarification.test.ts`. It supplies a valid clarification fixture through the ordinary server path and checks one interpretation request, zero downstream work and duplicate-attempt rejection with HTTP 409. It is not a recovered model response or a second real-provider evaluation.

A future interface repair should be separately versioned and bind the validated confirmed route/point selection and a small capability manifest: illustrative static MRT/citizen commute calculations are available under explicit assumptions; schedules remain synthetic inputs; social discussion is qualitative; construction, feasibility and causal future outcomes are not forecast. Such a repair must preserve existing frozen inputs and this closed result. Any future paid evaluation requires separate authorisation. It is not implemented or retried as part of this acceptance.

## Final post-run verification

The only post-paid source addition is the labelled synthetic clarification regression. `post-run/source-preservation.json` records current source fingerprint `2e470921ee2748c968a7a816ac531ea82409be52b065ee0baf5ae82a198a0ac2`; excluding only `lib/contracts/tests/hybrid-live-clarification.test.ts` reproduces the exact paid fingerprint `6a075fe936777e0f1d516d6382ad35bbd15d921f603969cafcf6207a71296871`. Production application code and its policy semantics are unchanged. Original paid preflight evidence was preserved; post-run reports are separate.

| Post-run item | Final evidence |
|---|---|
| Full network-blocked Node suite | **PASS: 1,670/1,670**, zero failures, cancellations, skips or TODOs. |
| Application and strict TypeScript | **PASS**, both exit 0. |
| Production build, asset tracing and whitespace | **PASS**, build `tGrqOYKxolm2-iU5bSSVk`, source `2e470921ee2748c968a7a816ac531ea82409be52b065ee0baf5ae82a198a0ac2`; 25 clean traces, both required official-asset routes, whitespace exit 0. This post-run build is distinct from the recorded paid build. |
| Twenty qualifying historical replays and classified inventory | **PASS: 20/20**, zero failures/network attempts, 148 historical files unchanged. The exact classified experimental artifact remains preserved and unresolved. Post-run audit took 611.06 seconds. |
| Protected files, dataset pins and post-run privacy | **PASS within tested boundaries:** all 814 original protected files, 26 pinned dataset/source files and six closed authority/ledger files unchanged; official/synthetic/transport identities and calibration rechecked. The actual public review exposes no private society corpus; no live society existed. |
| Source preservation across the paid attempt | **PASS for the recorded source-preservation comparison.** Only the labelled new safety test is excluded to reproduce the paid fingerprint. |
| Owned process cleanup and final roadmap outcome | **PASS:** task ports 3236/3237 have no listeners, task execution processes stopped, task-owned browser page/contexts closed and pre-existing blank page preserved. Roadmap records offline PASS and live partial/not-reached stages. |

## Changed-file inventory

Read-only Git inventory at report drafting shows 20 modified tracked files and 25 new untracked files against HEAD `5399e12c065e46806785146c79b7131e0668ab99`. There is no new commit, staging, deployment or historical-report replacement. Task-scoped ignored evidence is excluded from the following source/document inventory. Bare test filenames in the table are under `lib/contracts/tests/`.

| Area | Modified or new files |
|---|---|
| Workspace and safe presentation | `components/communication-report.tsx`; `components/general-plot-panel.tsx`; `components/map-scenario-panel.tsx`; `components/workspace.tsx`; `lib/citizen-grounding/graph.ts`; `lib/question-simulation/client.ts`; `lib/question-simulation/public-session.ts`; `lib/society/public-contract.ts` |
| Pure hybrid domain and anchor helper | New `lib/interventions/hybrid.ts`; `lib/interventions/binding.ts`; `lib/interventions/explore-contract.ts`; `lib/plots/anchor.ts` |
| Personality and trusted execution | `lib/citizen-grounding/personality.ts`; `lib/citizen-grounding/social.ts`; `lib/server/inference/deepseek.ts`; `lib/server/society/public-service.ts`; `lib/server/society/service.ts`; `lib/society/engine.ts`; new `lib/server/inference/personality.ts`; `lib/server/interventions/explore.ts`; `lib/server/interventions/location.ts` |
| Independent paid guard and build configuration | New `scripts/testing/citizen-hybrid-live-guard.mjs`; `next.config.ts`; `scripts/testing/tsconfig.phase4d.json` |
| Existing regression updates | `lib/contracts/tests/citizen-presentation.test.ts`; `lib/contracts/tests/phase4e2-summary.test.ts`; `lib/contracts/tests/summary-privacy.test.ts` |
| New domain, execution and privacy regressions | `lib/contracts/tests/citizen-hybrid-binding.test.ts`; `citizen-hybrid-live-guard.test.ts`; `citizen-personality-live.test.ts`; `citizen-workspace-binding.test.ts`; `hybrid-anchor-snap.test.ts`; `hybrid-asset-tracing.test.ts`; `hybrid-explore-client.test.ts`; `hybrid-explore-service.test.ts`; `hybrid-explore.test.ts`; `hybrid-intent-binding.test.ts`; `hybrid-intent.test.ts`; `hybrid-public-explore.test.ts`; `hybrid-storage-admission.test.ts`; new helper `lib/contracts/tests/helpers/report-ssr.ts` |
| Post-paid safety regression only | New `lib/contracts/tests/hybrid-live-clarification.test.ts`; synthetic input/output fixture, not a claimed live response |
| Documentation | This new acceptance report; new `docs/superpowers/plans/2026-11-01-hybrid-citizen-mrt.md`; append-only outcome work in `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md` |

## Evidence boundary and closure

The one authorised paid attempt is closed partial with **one real interpretation completion**, **USD 0.000147322** and **1,125 tokens**. All other paid stages and live proposal-impact execution were **NOT RUN**. Offline calculation, persona, social-capacity and recovery fixtures passed before live admission, but they do not establish genuine personality activation or successful new-policy real behaviour.

All required post-run checks and task-owned process cleanup are complete. Changes remain unstaged and uncommitted; no deployment or dataset regeneration occurred. The accepted clarification, immutable closed ledger, paid source/build identity and prior reports remain preserved. Real personality and social acceptance remain incomplete, and no additional paid request is authorised.
