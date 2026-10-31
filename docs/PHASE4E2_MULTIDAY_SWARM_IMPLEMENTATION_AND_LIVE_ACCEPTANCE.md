# Phase 4E.2 — Multi-day swarm implementation and live acceptance

**Phase 4E.2 acceptance, 31 October 2026 (Singapore): approved-scope offline PASS; real-provider integration FAIL at planning acceptance; behaviour NOT OBSERVED.** The single authorised Map -> Explore attempt consumed one Tavily search and one verified DeepSeek/DigitalOcean entity-planning completion, then strict `plan.user_condition_not_verbatim` validation rejected `draft.userConditions[0]`. No society started, and this is not a budget-limited run. Reported OpenRouter cost is USD **0.000836689** with zero unknown or outstanding reservations; Tavily reported one credit, with USD cost unknown. The attempt is closed failed and no retry is authorised. Offline evidence passes 20/20 qualifying worlds, all 14 matrix rows and both mocked desktop cohorts. Final post-live verification passes all 1,294 tests, both TypeScript checks, build and whitespace, with all 148 original / 186 task-start hashes unchanged. The pinned inventory artifact remains unresolved `SOCIAL_STALE`. **The bounded task and final verification are complete; no overall PASS is claimed.** Raw conversation text, private membership histories, credentials and provider bodies do not belong in this report.

## 1. Separate verdicts and evidence status

| Gate | Result | Evidence boundary |
|---|---|---|
| Implementation | IMPLEMENTED | New-policy profile, pacing, time, capacity, memory/privacy and observation changes are present |
| Offline architecture | **PASS within approved Option B scope** | Fresh qualifying replay, preservation, automated gates, all 14 matrix rows and both mocked desktop cohorts pass; bound offline proof records `offlinePass:true` |
| Historical compatibility | **MANDATORY QUALIFYING PASS 20/20; INVENTORY HAS ONE UNRESOLVED ARTIFACT** | Fresh four Phase 4C/4D plus 16 earlier swarm worlds pass strict replay/restoration; all 148 original hashes match. The pinned nonqualifying artifact retains its strict failure |
| Mocked desktop acceptance | **FRESH PASS** | 50/35 and 100/70 complete at tick 320 with 350/700 accepted decisions; both desktop sizes, lifecycle, Graph/Report and restoration checks pass |
| Privacy / immutability | **PASS within tested offline and live-error boundaries** | Offline matrix/desktop and live failure API/HTML/storage checks find no inspected leaks; final post-live checks preserve all 148 original / 186 task-start hashes. Live conversations were never created |
| Real-provider integration | **FAIL: PLANNING ACCEPTANCE** | Preflight passed; one actual Explore reached retrieval and verified entity planning, then strict condition validation rejected the plan. No society started; attempt 1 is closed failed |
| Real-model multi-day behavioural quality | **NOT OBSERVED** | The real attempt failed planning before any stakeholder/social completion or society clock; scripted fixture activity is not voluntary model behaviour |
| Automated regression/types/build | **FINAL POST-LIVE PASS** | 1,294/1,294 tests with zero failures/cancellations/skips/TODOs; application/strict TypeScript, build and actual whitespace check all exit zero |

Under the previous acceptance scope, archive `f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json` blocked the historical gate. It failed `SOCIAL_STALE` at record 0/tick 1 under unchanged HEAD as well as the implementation checkpoint. The approved Option B scope below changes its qualification only; the fresh audit retains that strict failure in complete inventory and passes all 20 qualifying worlds. No archive was rewritten, no validator weakened, and no second policy was inferred from accepted answers.

The earlier [Phase 4E.1 report](PHASE4E1_DEEP_SWARM_IMPLEMENTATION_AND_LIVE_ACCEPTANCE.md) remains unchanged. Its offline PASS and partial 70-decision live result are historical findings, not Phase 4E.2 acceptance.

### Option B: one pinned nonqualifying artifact; qualifying audit PASS

The user approved this scope decision on **2026-10-31**, approval ID `Phase4E.2OptionBuserapproval2026-10-31`. The version-1 manifest is [phase4e2-historical-scope.v1.json](../scripts/testing/phase4e2-historical-scope.v1.json), scope ID `phase4e2-historical-scope-option-b-v1`. Its metadata, identities, file hashes and evidence references are independently pinned in the read-only validator. The JSON cannot grant an exception to another artifact by adding an entry or changing a hash.

| Pinned field | Exact value |
|---|---|
| Archive | `f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json` |
| Run | `run-865f5ae0d398512523eac82e-attempt-4-92873b81-e7e3-4208-acec-221f673b1579` |
| Session | `f8bcfcb0-0291-4238-b6b6-dcf5f9f78bc2` |
| Classification | `pre-final-mocked-development-artifact` |
| Qualification | `nonqualifying-for-mandatory-historical-replay` |
| Replay status | `unresolved-SOCIAL_STALE` |
| Original generation-policy/source recoverable | `false` |
| First mismatch | Record `0`, tick `1`, code `SOCIAL_STALE` |
| Independently reproduced baseline | `ff46ab24ad93bb9260cc4a94ee0111f2e83cf21d` |

The following five files remain part of preservation and complete inventory reporting. Paths are relative to `data/derived/agents/`; each SHA-256 is an exact byte binding, not a replay success claim.

| File | Required SHA-256 |
|---|---|
| `accepted-private/f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json` | `f509b72702238ce52d3feb6653b28ca68f7151796f5e39d88834160902f503ca` |
| `social-sessions/f8bcfcb0-0291-4238-b6b6-dcf5f9f78bc2.jsonl` | `066ef47d20ec06a953024d0929f0e199d37c16aff147dc4d6d099a3874d5f395` |
| `social-sessions/f8bcfcb0-0291-4238-b6b6-dcf5f9f78bc2.checkpoint.json` | `0c0003dcd4dfe13f6b0c058501b93c6a779da0201b01cb7b956f9ba966c13773` |
| `social-sessions/f8bcfcb0-0291-4238-b6b6-dcf5f9f78bc2.materialized.json` | `1b24f45c2607c8d095f38b326d322a622d5ca0bfc5bc5b1bd0fcb1df016fcfe0` |
| `accepted-private/jobs/f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.job.json` | `6204ddd88ce1967ce4fa5c6aad61e29f8e9c9d5ab320719023546fe6b61d2455` |

Required safe provenance evidence is also byte-bound. `tmp/phase4e1/progress.md` must hash to `0bb06d8718a5d47d988dce4ec8b81d7c3220b79a70b46ad57ad0108d19b9330e`; `tmp/phase4e2/historical-baseline-failure.json` must hash to `81b88b0cd08f4d57dea9a43b194d5a000b1266166021cc52bed5166594691e96`. This mutable report is an additional manifest reference and has no pinned content hash. A missing required file, changed bytes, mismatched identity, malformed/expanded manifest or different classification fails closed and cannot permit live admission.

Mandatory qualifying replay and complete inventory have separate verdicts. Every qualifying historical world still requires unchanged strict genesis replay and checkpoint-tail restoration, with matching canonical results where a material checkpoint exists. Complete inventory must also retain this one classified artifact, its verified preservation and its unresolved strict failure; it must never report that failure as a successful replay. Any unapproved artifact or qualifying failure remains subject to the mandatory gate. Missing preparation witnesses do not authorise a guessed generation policy, answer-based reconstruction or a different restoration algorithm. Scheduler, reducer, privacy and application validators retain their existing semantics.

**Option B offline status: PASS within the approved qualifying scope.** Final post-live `tmp/phase4e2/historical-replay.json` records mandatory 20/20 PASS, all 148 original hashes unchanged, zero audit provider calls/network attempts, and exactly one unresolved classified artifact at record 0/tick 1. The separate `tmp/phase4e2-optionb/final-verification.json` also verifies all 186 task-start private-file hashes. Manifest SHA-256 remains `0b0a6a7428b1563ffcee936973211089aca5348d79682f6000c73b60cd340b10`; source fingerprint remains `e8c3b03dbb254e27c21d87c48872d74c8e38593a53b05720503f793d5fa5e35b`. Final automated verification passes 1,294 tests and associated gates with build `Yz_4HmbGbG4qbjTDGvsPr`. All 14 matrix rows and both mocked desktop cohorts pass. The single live attempt failed planning acceptance, as recorded in sections 12-14; post-live verification is complete and does not change that verdict.

The version-2 proof `tmp/phase4e2-optionb/offline-gate.json`, created at `2026-10-31T05:30:24.418Z`, records `offlinePass:true`, 14 benchmark rows, both desktop gates, 20 qualifying worlds, one classified unresolved artifact, **148 original / 186 task-start files unchanged**, and zero paid attempts **at proof creation**. Its historical report is preserved at `tmp/phase4e2-optionb/prelive-historical-replay.json`, SHA-256 `014d5e980c63299fde797d3ec92d67096bbe24437149afcf78f58a010248cd79`; its build is the pre-live `5R5wbg5zNYcXGp0tQ_Ifu`, with unchanged manifest/source bindings. The canonical historical-report path now contains the separate final post-live result. Original live preflight consumed the one authorised attempt; this retained offline snapshot cannot reset it or permit later arming.

## 2. Repository baseline and adopted research

- Worktree: the existing main `ImpactLens` repository, branch `master`.
- Starting/current baseline HEAD inspected for this report: `ff46ab24ad93bb9260cc4a94ee0111f2e83cf21d`.
- The pre-existing untracked [extended simulation research](PHASE4E2_EXTENDED_SIMULATION_RESEARCH.md) is user work and is preserved. It is not a newly authored implementation artifact.
- Adopted architecture: Approach B from that research, extending the existing engine with an immutable longer-clock profile, grant-aware pacing and labelled fictional availability.
- Retained architecture: one evolving world, serial inference, the existing provider gateway, managed local coordinator, bounded memory, format-2 hash-chained journals, materialised checkpoints and entity-first Graph.
- No vector database, embeddings, external queue, distributed worker, framework migration or new dependency is required by this implementation.

The original problem was a mismatch between engine capacity and the trusted provider grant. The prior scheduler released opportunities using engine capacity, so the historical 350-capable/70-admitted live prefix exhausted its grant at tick 14/80. A longer clock alone would retain that mismatch. Research also identified the event-limit revision loop, private inbox truncation before eligibility filtering, misleading issue-creation menus and repeated checkpoint/status work.

## 3. Immutable profiles, compatibility and shared capacity

New inputs carry `swarm.multiDay` with `version: 1`, `policy: multi-day-swarm-v1`, an allowlisted `profileId`, a frozen `pacingTarget` and the current factory marker `pacingRevision: loan-repayment-v1`. `execution-profile.ts` owns immutable profiles and shared limits. `executionProfile`, `getExecutionProfile` and `executionLimits` are used by execution, replay, persistence and public parsing.

| Profile IDs | Active / capable / rule-driven | Horizon | Simulated duration | Reasoning capacity | Tick burst / urgent borrow |
|---|---:|---:|---:|---:|---:|
| `multi-day-50-160-v1` | 50 / 35 / 15 | 160 | 40 hours | 350 | 6 / 2 |
| `multi-day-50-320-v1` | 50 / 35 / 15 | 320 | 80 hours | 350 | 6 / 2 |
| `multi-day-50-672-v1` | 50 / 35 / 15 | 672 | 168 hours | 350 | 6 / 2 |
| `multi-day-100-160-v1` | 100 / 70 / 30 | 160 | 40 hours | 700 | 12 / 4 |
| `multi-day-100-320-v1` | 100 / 70 / 30 | 320 | 80 hours | 700 | 12 / 4 |
| `multi-day-100-672-v1` | 100 / 70 / 30 | 672 | 168 hours | 700 | 12 / 4 |

The ordinary new-session default is 50/35, 320 ticks and 350 capacity. The trusted larger configuration is 100/70, 320 ticks and 700 capacity. Capability, offered opportunities, accepted decisions and actual model-authored items remain separate counts. The allowlist does not authorise provider spending.

| Shared bound | New multi-day policy |
|---|---:|
| Tick duration | 15 simulated minutes |
| Opportunities per actor / soft allowance | 16 / 10 |
| Ordinary cooldown / direct-reply cooldown | 4 ticks / 1 tick |
| Turns per thread root per tick / proactive limit per actor and channel | 4 / 2 |
| Events / items | 8,192 / 2,048 |
| Groups / current members per group | 8 / 8 |
| Complete ancestry | 64 items |
| Short-term entries / indexed episodes | 12 / 32 |
| Selected memories / item bodies / canonical context bytes | 6 / 8 / 24,000 |
| Journal / row | 128 MiB / 4 MiB |
| Material checkpoint / saved private world | 32 MiB / 32 MiB |
| Replay iteration bound | Horizon + reasoning capacity + 32 |
| Concurrent provider completions | 1 |

Historical inputs without `multiDay` retain their exact old branches. The historical 24/4 profile, quick 64/128 profiles and previous 80-tick deep 350/700 profiles are not silently upgraded. The current `loan-repayment-v1` marker also preserves replay of already recorded inputs without that marker. No accepted event, identity, context or historical journal is regenerated or migrated.

Public envelopes keep independent size and allowlist boundaries: the stored public envelope is bounded at 3 MiB, initial browser parsing at 3,000,000 bytes, and Graph has its own limits. Public profile IDs cannot select arbitrary capacities, horizons or payment grants.

## 4. Exact current pacing and replay semantics

The server freezes scheduling intent before genesis from the initial trusted grant. Restoring an existing indexed run happens before new selection. A later dependency cannot enlarge the recorded admission authority. The scheduling target is distinct from mutable token/cost usage and wall-clock provider latency.

For capacity `C`, frozen target `P = min(C, pacingTarget)`, horizon `T`, tick-burst ceiling `S`, ordinary release is:

```text
B = min(P, S)
R = ceil(0.30 * P)
H = ceil(2 * T / 3)
F(t) = min(1, P) when t < T, otherwise 0
ceiling(t) = min(P - F(t), t < H ? P - R : P)
U(t) = 0 when t < 1
U(t) = max(0, min(ceiling(t),
         B + floor((P - B) * min(T - 1, t - 1) / (T - 1)))) otherwise
ordinaryAvailable = max(0, U(t) - usedOpportunities)
debt = max(0, usedOpportunities - U(t))
```

Unused release carries forward. The ceiling protects `ceil(30% × P)` until the final third and reserves one opportunity until tick `T` when `P > 0`. New-policy model opportunities are allowed at ticks **1 through T**, including the final clock tick. No eligible demand means no call; a natural completion can use fewer calls than the capacity or target.

Urgent borrowing is restricted to actual direct replies. Without an active loan, its cumulative ceiling is `min(ceiling(t), U(t) + borrowLimit)`. Under `loan-repayment-v1`, an accepted opportunity history retains the original loan ceiling: partial repayment cannot roll the debt forward indefinitely. Until an ordinary released opportunity settles after repayment, the urgent ceiling is bounded by `min(ceiling(t), max(U(t), recordedLoanCeiling))`. All opportunity records, including accepted inactivity, participate in deterministic scheduling accounting; provider admission independently counts actual dispatched/non-skipped requests.

When ordinary capacity is available, actual incoming targets precede proactive windows and lower offered counts up to the soft allowance precede urgency among real targets. Urgency, bounded waiting credit, channel use and deterministic identity tie-breaks still rank candidates. This is a preference under eligible demand, not a promise of equal participation or a proven starvation bound. Trigger age is not continuously eligible queue waiting time.

The earlier grant-70 fairness diagnostic and partial restricted rows are **superseded for final benchmark claims**. Only the final matrix after the fixed-loan/fairness review may populate the final results below. The target, policy marker and accepted records make full and checkpoint-tail reconstruction deterministic; no mutable live admission field is consulted during historical replay.

## 5. Calendar, seeded availability and routine progression

The fictional clock starts at **Day 1 08:00, Asia/Singapore**. For tick `t`, elapsed minutes are `15t`; local day/time is calculated from `480 + 15t`. The endpoints are Day 3 00:00 at 160 ticks, Day 4 16:00 at 320 ticks, and Day 8 08:00 at 672 ticks. These are scenario-day labels, not an execution date, a real forecast, a validated work rota or a weekday/weekend model.

`simulationCalendar` returns the labelled time only for the new selector. `actorAvailability` derives a fixed daily rest start from the run seed and actor identity: a 15-minute increment between 22:00 and 00:00, with a duration between seven and nine hours. No occupation, sleep preference or caring responsibility is inferred from Census demographics.

Unavailable actors receive neither model opportunities nor new routine encounters. Existing legitimate notifications remain deferred. Rest does not produce an inactive event on every sleeping tick. Geographic/routine progression still occurs once per coarse tick; sequential model substeps do not rerun it. Available routine actions remain exposure, activity, reaction, bounded state adjustment or inactivity. They do not generate discretionary authored conversations to keep demand alive.

## 6. Conversation continuity, private inboxes, memory and issues

Complete access-checked ancestry remains outside the eight-body model window. Omitted wording is labelled as omitted and is not implicit context. A reply that would create a 65th ancestor is unavailable; the model can choose a legitimate new contribution, available memory or inactivity. Invalid replies are not converted automatically into posts.

For new multi-day inputs, the private inbox removes already handled, self-authored and repeated sources **before** applying the 16-candidate bound. Every remaining item still requires current membership, valid ancestry, current-join chronology and an actual reducer read before replying. Outsider, pre-join, post-leave and pre-rejoin history is unavailable. Knowledge of a group or matching topic grants no exposure. Group/member/event/item bounds resolve through the shared profile for new inputs.

ST12, EP32, six references, eight bodies and 24 KB remain unchanged. Episodes have no day-based TTL. Topic-aware retrieval and existing source-diverse retention needed no algorithm rewrite for this extension. Focused authoritative fixtures show an older condition surviving short-term eviction, entering actual episodic-only context after a 32-hour gap, and being retrieved when a different counterparty revisits its topic. Separate multibyte fixtures retain the exact source text and calendar while fitting both canonical and provider contexts within 24 KB. These fixtures establish capability, not voluntary real-model recollection.

Sixteen lifetime issue-history records, including resolved/withdrawn entries, remain bounded without eviction. The active view is eight records and the actual context exposes at most four legitimate retained-source issues. New contexts truthfully expose whether creation capacity remains; at the lifetime bound, creation kinds are absent and rejected while valid author resolution/withdrawal remains possible. Omission is not resolution and a concern is not an inferred commitment.

## 7. Capacity terminals, durable storage and progress ownership

New worlds stop explicitly at `event-limit` or `item-limit`; both ordinary and private reducers retain the last legal state. Before offering inference, hybrid preparation reserves room for the preparation read, possible stance effect and chosen action, then checks remaining action headroom again after the read. It does not dispatch work whose permitted effects cannot fit.

The public job distinguishes `capacity-limited` with `EVENT_CAPACITY`, `ITEM_CAPACITY`, `STORAGE_CAPACITY` or `JOURNAL_CAPACITY`. These are accepted partials, not completed simulations. Provider exhaustion before legitimate clock/opportunity completion remains `budget-limited`; a legitimately completed final tick with no remaining eligible slot takes completion precedence. Cancellation, pause, failure and completion retain their own meanings. At the final tick, `multiDayComplete` checks remaining eligible model slots rather than using raw coarse-world status alone.

The coordinator detects real progress through a later tick or another recorded opportunity for new profiles. Increasing a revision alone cannot keep an unchanged job alive. Quiet clock advancement is valid progress. Accepted inactivity, failed decisions and disabled/skipped opportunities are recorded progress without being relabelled accepted authored content. Terminal precedence and typed capacity reasons prevent an event-limit revision/persistence loop.

Hash-chained format-2 journals retain append-before-dispatch reservations, fsync, ordered settlement and strict serving identity. Material checkpoints retain accepted revision, input/run identity, journal head/offset and state digest. Full-chain verification remains mandatory before checkpoint-tail replay. Service owns periodic checkpoint scheduling; the coordinator forces pause/completion checkpoints, and the same committed revision is not materialised repeatedly. Corrupt complete history is not skipped; uncertain requests are not redispatched.

Existing fault coverage and new tests cover capacity boundaries, revision-only nonprogress, typed journal/checkpoint exhaustion, duplicate ownership, stale state, uncertain reservation and recovery paths. The fresh 1,294-test gate, qualifying historical audit, matrix and mocked desktop acceptance pass; the independently reproduced nonqualifying failure remains separately recorded.

## 8. Coordinator, passive observation, Graph and Report

The managed local Node owner retains durable intent, exclusive lease, abort/deadline and explicit pause/resume/cancel. Closing the browser stops observation without granting extra work. Application exit leaves accepted work durable and a later process projects unfinished ownership as paused until explicit resume. This is a local desktop application model, not a serverless or distributed worker guarantee.

Compact status authorisation caches the validated run/token capability against the public file's device/inode/size/nanosecond modification/change stamp. A changed file invalidates that cache; token comparison remains constant-time. Status does not build a model context or invoke inference. Full summary inspection refreshes the safe projection when the accepted revision changes. Passive navigation/restoration cannot become an executable client world or enlarge a grant.

Map | Knowledge Graph | Report remains the desktop interface. Entity-first presentation, institutions, platforms, groups, stakeholder roles, significant people, the background complement, filters/search and hidden-agent discovery remain. No message/event node or technical clock bookkeeping node was added. Cumulative significance remains labelled as a presentation score, not calibrated influence.

`SocietySummary.clock` is an explicit allowlisted aggregate object. It supplies day/time, elapsed minutes, profile identity, fictional availability assumptions and at most eight daily bins. Each day counts authored public/private items, social-model/rule provenance, classified decisions, follow-ups, nonzero state changes, opportunities, accepted decisions and distinct agents with accepted decisions. Accepted inactivity counts toward accepted participation; initial stakeholder seeds have separate provenance and remain in authored totals.

The Report and existing platform/group/background-aggregate Graph inspectors derive chronology from that same fact pack. Graph chronology is labelled whole-simulation scope. It contains no source IDs, conversation bodies, private member lists, memory text or membership epochs. The old early/middle/late discussion totals remain available. New temporal fields are optional so legacy safe summaries retain their shape.

## 9. Regression evidence, actual-process restart and harness observations

The fresh serial Option B automated chain passes **1,294/1,294 network-blocked Node tests**, with **zero failures, cancellations, skips or TODOs**, in **168,018.1035 ms**. Application TypeScript, strict affected-module TypeScript, production build and the actual `git diff --check` process also pass. Evidence is `tmp/phase4e2-optionb/automated-gate.json`, with `npm-test.log`, `ts-app.log`, `ts-strict.log`, `build.log` and `diff-check.log` in the same directory. The fresh build ID is `5R5wbg5zNYcXGp0tQ_Ifu`. Git printed LF/CRLF conversion warnings on stderr; the diff check's actual exit code was zero. No application repair was made for those warnings. The completed matrix and desktop results are bound with this automated result in the fresh offline proof.

Final **post-live** verification also passes: **1,294/1,294 tests in 163,379.1147 ms**, with zero failures, cancellations, skips or TODOs; application TypeScript, strict TypeScript, production build and actual whitespace check all exit zero. Final build is `Yz_4HmbGbG4qbjTDGvsPr`; pre-live build `5R5wbg5zNYcXGp0tQ_Ifu` remains the original ledger/admission identity. Evidence is `tmp/phase4e2-optionb/final-verification.json` and adjacent `postlive-tests.log`, `postlive-ts-app.log`, `postlive-ts-strict.log`, `postlive-build.log`, `postlive-diff.log` and `postlive-historical.log`. Source fingerprint is unchanged. The separate four-case offline planning diagnostic is not added to the project suite count.

Before the Option B follow-up, the isolated final chain passed: the two previously affected UI files **16/16** in **6,954.4606 ms**, followed by the exact project Node command **1,256/1,256 tests** in **151,507.4482 ms**, with **zero failures, cancellations, skips or TODOs**. Application TypeScript, strict affected-module TypeScript, production build and `git diff --check` all exited zero in that serial chain. Its log is `tmp/phase4e2/tests-final.log`; its production build ID is `ykCfRghpIkg82LpsVUHt3`. The preserved prior `tmp/phase4e2-optionb/prior/offline-gate.json` recorded those successful automated, 14-row matrix and two-cohort desktop flags but deliberately set `offlinePass: false`, reason `HISTORICAL_REPLAY_PREEXISTING`. That proof cannot arm paid dispatch. An earlier 1,252-test run also passed before four additional focused regressions. These earlier automated findings remain historical evidence.

A concurrent 1,256-test attempt returned **1,254 pass / two failures / zero skips**, 233,834.0509 ms, while heavy benchmark, historical and desktop work shared the host. The failures were:

- `question-inference-report-ui.test.ts`: "accepted native MRT and AAC reports recover local heuristic scope after geometry clears preparation"; its render child returned a null process status.
- `question-ui.test.ts`: "unsupported tax questions report preparation without recording synthetic interactions"; its render child reported `spawnSync ... ETIMEDOUT`.

These failures are retained in `tmp/phase4e2/tests-concurrent-timeouts.log`. No assertion or timeout was relaxed. Heavy jobs and the mock server were stopped before the isolated rerun, which passed all 1,256 tests. The concurrent attempt remains a disclosed failed attempt rather than being relabelled a pass. Earlier focused 45-test memory/privacy/replay/SSR coverage and the first 1/1 process restart run supplement the complete gate but are not added together as a project test count.

The actual three-process multi-day fixture uses isolated temporary storage and blocks outbound network in all children. Process one commits two mocked decisions, writes a durable checkpoint and exits without a pause/shutdown handler while its durable job remains running. Process two restores the identical accepted world, reports `APPLICATION_RESTART`/paused, makes zero calls and leaves the journal hash unchanged. Process three requires explicit resume, dispatches only the remaining two calls at ticks 214 and 320, preserves unique request IDs and concurrency one, and completes at tick 320 with four accepted decisions. Genesis and checkpoint-tail replay hashes match. Its coordinator progress wrapper includes opportunity counts, so same-tick recorded progress is distinguished from revision-only changes.

Initial safe evidence is `tmp/phase4e2-process-restart-iTfpcC/evidence.json`; the final suite reruns the same regression. The old 80-tick restart fixture was preserved. Fatal provider/transport/schema/identity paths and partial token-accounting repairs have focused coverage; paid acceptance helpers also have offline fixtures. No failed or uncertain provider outcome is retried to make a fixture complete.

## 10. Fresh offline matrix and grant comparison - PASS (14 rows)

Fresh source: `tmp/phase4e2/benchmarks.json`; follow-up log: `tmp/phase4e2-optionb/benchmarks.log`. All 14 rows completed their applicable clock/demand outcome, exact full replay and cold restoration (checkpoint-assisted where available), with zero sentinel leaks, zero paid calls and serial provider concurrency. Counts and episodic-reference totals reproduce the earlier fixture results; timings and byte sizes below come from this fresh serial run. These use the actual service/gateway/reducer/journal/coordinator with mocked choices; they demonstrate capability, not voluntary model intelligence.

| Configuration | Capacity / grant | Final tick | Accepted / capable agents offered | Per-agent range | Early / middle / late | Peer replies / depth | Events |
|---|---:|---:|---:|---:|---:|---:|---:|
| historical | 8 / 8 | 80 / 80 | 8 / 4 of 4 | 2-2 | 3 / 3 / 2 | 3 / 5 | 526 |
| quick-50 | 64 / 64 | 80 / 80 | 64 / 35 of 35 | 1-2 | 24 / 22 / 18 | 57 / 9 | 620 |
| quick-100 | 128 / 128 | 80 / 80 | 128 / 70 of 70 | 1-2 | 48 / 44 / 36 | 120 / 9 | 748 |
| deep-50-80 | 350 / 350 | 80 / 80 | 350 / 35 of 35 | 7-16 | 123 / 118 / 109 | 331 / 16 | 1,192 |
| deep-100-80 | 700 / 700 | 80 / 80 | 700 / 70 of 70 | 7-16 | 245 / 237 / 218 | 686 / 22 | 1,892 |
| multi-50-160 | 350 / 350 | 160 / 160 | 347 / 35 of 35 | 9-11 | 118 / 115 / 114 | 331 / 15 | 1,511 |
| multi-100-160 | 700 / 700 | 160 / 160 | 695 / 70 of 70 | 7-16 | 241 / 225 / 229 | 672 / 22 | 2,220 |
| multi-50-320 | 350 / 350 | 320 / 320 | 350 / 35 of 35 | 7-16 | 119 / 117 / 114 | 332 / 17 | 2,198 |
| multi-100-320 | 700 / 700 | 320 / 320 | 700 / 70 of 70 | 6-16 | 240 / 231 / 229 | 688 / 20 | 2,921 |
| stress-50-672 | 350 / 350 | 672 / 672 | 350 / 35 of 35 | 6-16 | 120 / 116 / 114 | 334 / 17 | 3,726 |
| stress-100-672 | 700 / 700 | 672 / 672 | 700 / 70 of 70 | 5-16 | 239 / 232 / 229 | 686 / 22 | 4,484 |
| grant-70-320 | 350 / 70 | 320 / 320 | 70 / 26 of 35 | 0-9 | 28 / 21 / 21 | 61 / 9 | 1,638 |
| grant-128-320 | 700 / 128 | 320 / 320 | 128 / 34 of 70 | 0-13 | 52 / 37 / 39 | 118 / 13 | 1,777 |
| quiet-50-320 | 350 / 350 | 320 / 320 | 180 / 35 of 35 | 4-8 | 117 / 57 / 6 | 0 / 1 | 1,788 |

Both 320-tick profiles and both 672-tick stress profiles demonstrate full 350/700 mocked capacity with all 35/70 capable agents offered and accepted. The 160-tick rows naturally finish at 347/350 and 695/700; the remaining three/five opportunities are not fabricated. The quiet row accepts 180 deliberate inactive choices, authors zero model items and leaves **170 of its 350-call grant unused**. Accepted inactivity consumes an opportunity and is not dialogue.

| Grant-70 comparison | Prior observed live prefix | Final new multi-day fixture |
|---|---|---|
| Capacity / grant | 350 / 70 | 350 / 70 |
| Policy / horizon | Prior deep capacity-paced / 80 | Frozen grant-paced / 320 |
| Accepted / final tick | 70 / 14 | 70 / 320 |
| Early / middle / late | 70 / 0 / 0 | 28 / 21 / 21 |
| Distinct offered/accepted agents | 35 / 35 | 26 / 26 of 35 capable |
| Evidence | Historical real-provider public prefix | Current mocked fixture; full/tail replay exact |

The final grant-128 fixture accepts 128 decisions across 34 of 70 capable agents, distributed 52/37/39 over the three periods. Smaller grants now preserve later elapsed coverage; they do not guarantee every capable identity receives an opportunity. The previous grant-70 fairness diagnostic is superseded by this final fixed-loan/fairness run. An old 80-tick live observation and a new 320-tick mock are different evidence classes; no unsupported old 320-tick configuration is presented as a measured baseline.

The matched longitudinal regression records an early conversation, accepted inactivity and a real reducer-validated counterparty update at **Day 3 09:00**. Its update fork offers a legitimate direct reply while the quiet fork advances without inventing one. The explicit later scenario input is checkpointed; its model tail replays from that committed input, while the quiet history replays from genesis. Day-gap episodic retrieval and private leave/rejoin/read-permission cases remain focused regression coverage.

| Main/stress memory bound | 50/35, 320 | 100/70, 320 | 100/70, 672 |
|---|---:|---:|---:|
| Maximum indexed episodes | 32 | 32 | 32 |
| Episodic-origin references actually supplied in decision contexts | 167 | 485 | 568 |
| Maximum item bodies | 8 | 8 | 8 |
| Maximum memory references | 6 | 6 | 6 |
| Maximum canonical context bytes | 20,361 | 20,399 | 20,341 |
| Maximum wire context bytes | 13,977 | 13,956 | 14,057 |

The episodic counts sum references actually supplied in the mocked provider's decision contexts, identified there by `origin: episodic`. The same episode supplied in several contexts contributes several references. These totals do not count unique recollections, voluntary recall selections or substantive use of an older detail; substantive memory use requires separate accepted-content evidence and remains unobserved in an actual Phase 4E.2 live run. Rule-event totals include routine continuity and exposure; each demand-rich private fixture also has separately attributed bootstrap activity and initial stakeholder seeds. Neither is an extra independent model argument.

## 11. Historical gate, performance/storage and desktop acceptance

### Fresh mandatory qualifying audit - PASS 20/20; complete inventory retains one unresolved artifact

The final post-live version-3 audit in `tmp/phase4e2/historical-replay.json` passes **20 of 20 mandatory qualifying worlds**: four Phase 4C/4D eldercare/workweek worlds plus 16 earlier swarm archives. Strict genesis replay and saved-world round trips match; every applicable material checkpoint also passes checkpoint-tail comparison. **All 148 original and 186 task-start file hashes are unchanged.** Audit provider calls and network attempts are both zero. The source fingerprint and approved manifest hash remain unchanged; final historical report SHA-256 is `2ee236b52b4523bb65646f830f2144fee2f70daf98d54773ee8f0f333d24c720`. The **11 current-policy inventory entries** are reported separately from mandatory qualifying historical replay. There is no accepted archive for the actual live question. Safe final evidence is `tmp/phase4e2-optionb/final-verification.json`; full audit logs are adjacent.

Complete inventory has exactly one unresolved classified artifact: the pinned `f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json`, still `unresolved-SOCIAL_STALE` at record 0/tick 1. Its five bound files and required provenance evidence match the approved hashes. This result is separate from mandatory 20/20 PASS; it is neither repaired nor counted as a successful replay. Other inventory coverage labels remain explicit, including pre-existing preservation-only coverage and separately exercised current-policy acceptance. Fresh matrix and desktop gates also pass, completing offline acceptance within the approved scope.

### Prior historical finding retained

The prior completed audit passed the four mandatory Phase 4C/4D eldercare/workweek worlds and **16 of 17** earlier swarm archives, including quick and prior deep partial/full histories. **All 148 pre-task file hashes matched**, with zero mismatches, provider calls or network attempts. Its safe evidence was `tmp/phase4e2/historical-replay-progress.json`, `tmp/phase4e2/historical-baseline-failure.json` and `tmp/phase4e2/final-preservation.json`. That checkpoint's preservation check recorded all 148 hashes with zero mismatches, unchanged HEAD/branch and no live ledger. These prior findings remain retained alongside the fresh audit above.

One artifact remains unresolved: `f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json`, an old `deep-events-v1` world without the preparation-read witness, 350 records at tick 78. Its first context platform/source/menu differed at record 0/tick 1. Reconstruction failed `SOCIAL_STALE`. An independent in-memory loader using unchanged baseline HEAD `ff46ab24ad93bb9260cc4a94ee0111f2e83cf21d` reproduced that exact failure; the root repeated this proof independently. The prior audit exited nonzero and its mandatory gate failed. Under the approved Option B decision in section 1, the fresh audit retains this exact hash-bound artifact as nonqualifying and unresolved while passing mandatory qualifying replay. No archive writes, inferred answer-based policy, validator relaxation or silent exclusion is authorised.

### Actual resource observations

All byte values below are exact artifact sizes. `None` means no material checkpoint for that historical/quick row.

| Configuration | Journal bytes | Checkpoint bytes | Saved-world bytes | Public bytes | Graph nodes / edges |
|---|---:|---:|---:|---:|---:|
| historical | 17,042,917 | None | 710,712 | 222,170 | 30 / 187 |
| quick-50 | 2,392,096 | None | 1,577,065 | 490,046 | 57 / 442 |
| quick-100 | 4,786,415 | None | 2,989,690 | 934,647 | 107 / 882 |
| deep-50-80 | 17,968,205 | 9,126,671 | 9,126,208 | 517,428 | 57 / 487 |
| deep-100-80 | 36,003,005 | 19,199,527 | 19,199,064 | 1,042,076 | 107 / 1065 |
| multi-50-160 | 18,527,957 | 9,675,051 | 9,674,587 | 534,403 | 57 / 502 |
| multi-100-160 | 36,773,132 | 19,667,021 | 19,666,557 | 1,032,794 | 107 / 1034 |
| multi-50-320 | 18,824,956 | 10,039,993 | 10,039,529 | 517,872 | 57 / 470 |
| multi-100-320 | 37,577,444 | 20,492,128 | 20,491,664 | 1,039,388 | 107 / 1041 |
| stress-50-672 | 19,348,483 | 10,790,755 | 10,790,291 | 522,969 | 57 / 469 |
| stress-100-672 | 38,653,836 | 21,544,420 | 21,543,955 | 1,024,203 | 107 / 1002 |
| grant-70-320 | 3,275,764 | 2,301,397 | 2,300,935 | 489,979 | 57 / 426 |
| grant-128-320 | 6,527,442 | 4,064,113 | 4,063,650 | 918,000 | 107 / 839 |
| quiet-50-320 | 6,857,358 | 3,373,818 | 3,373,355 | 468,797 | 57 / 395 |

| Configuration | Service work ms | Benchmark elapsed ms, including replay/recovery | Full replay ms | Cold restore ms | Projection ms | Heap / RSS MiB |
|---|---:|---:|---:|---:|---:|---:|
| historical | 773.7 | 2,128.9 | 437.1 | 501.0 | 11.6 | 82.4 / 183.8 |
| quick-50 | 3,925.0 | 11,015.7 | 3,239.8 | 3,279.1 | 81.7 | 130.3 / 280.4 |
| quick-100 | 7,333.4 | 34,065.3 | 13,143.0 | 12,352.8 | 179.0 | 137.6 / 282.0 |
| deep-50-80 | 44,115.7 | 84,828.2 | 27,718.3 | 3,481.8 | 219.3 | 182.7 / 318.5 |
| deep-100-80 | 187,518.9 | 331,226.8 | 122,513.6 | 3,366.5 | 228.4 | 335.5 / 524.5 |
| multi-50-160 | 44,414.2 | 88,399.2 | 30,397.9 | 3,163.8 | 248.7 | 280.3 / 521.9 |
| multi-100-160 | 198,110.6 | 355,700.9 | 129,630.5 | 5,974.9 | 587.5 | 379.9 / 653.3 |
| multi-50-320 | 49,959.0 | 98,513.6 | 32,131.3 | 3,164.5 | 271.9 | 605.6 / 857.9 |
| multi-100-320 | 178,041.0 | 327,367.0 | 117,349.9 | 6,064.3 | 873.9 | 469.4 / 770.1 |
| stress-50-672 | 69,023.5 | 136,263.8 | 43,811.2 | 3,284.9 | 378.1 | 282.1 / 535.5 |
| stress-100-672 | 214,124.8 | 415,427.6 | 162,759.8 | 7,051.0 | 1,284.9 | 274.1 / 594.6 |
| grant-70-320 | 15,600.0 | 30,520.0 | 6,503.6 | 593.3 | 156.4 | 259.5 / 538.6 |
| grant-128-320 | 26,799.2 | 52,053.8 | 14,712.6 | 1,142.3 | 278.3 | 296.1 / 559.5 |
| quiet-50-320 | 24,303.4 | 48,075.0 | 13,022.4 | 1,325.9 | 198.9 | 166.6 / 486.6 |

These fresh rows were run serially as normal-user local observations on a **shared, unisolated host**. Benchmark elapsed time includes full replay and recovery/restore verification; it is not the time a user waits for Explore. Service work sums measured operation intervals, including mocked gateway handling, CPU/reducer work and durable filesystem writes; it is neither browser Explore duration nor real provider latency. The actual mocked browser Explore timings are reported separately below. Heap/RSS are samples after operations in the shared benchmark process, not continuous isolated per-run peaks. Earlier overlapping-host observations remain historical and are not used to claim a speedup or regression. No isolated filesystem/Windows-security cause is inferred, and no security policy, ACL or assertion/timeout was weakened.

The fresh 672/700 checkpoint is 21,544,420 bytes against the 32 MiB bound, its journal 38,653,836 bytes against 128 MiB, and its event count 4,484 against 8,192. This is measured headroom for that fixture distribution, not a guarantee for arbitrary prose or future 1,400/2,000-decision histories.

### Fresh mocked desktop cohorts - PASS

Fresh safe records: `tmp/phase4e2-optionb/desktop/50/result.json` and `tmp/phase4e2-optionb/desktop/100/result.json`, both `success:true`. Both 1440x900 and 1920x1080 pass Map -> Explore -> Graph -> Report, institution/platform/group/agent/aggregate inspectors, hidden search/filter restoration, keyboard selection, neighbour focus, dragging with two connected neighbours moving, settling, retained positions and saved-history restoration.

| Desktop result | 50/35 | 100/70 |
|---|---:|---:|
| Accepted social decisions / capable agents offered and accepted | 350 / 35 | 700 / 70 |
| Tick / calendar | 320 / Day 4 16:00 | 320 / Day 4 16:00 |
| Day 1/2/3/4 accepted decisions | 73 / 103 / 103 / 71 | 147 / 209 / 203 / 141 |
| Day 1/2/3/4 distinct accepted participants | 30 / 34 / 35 / 35 | 55 / 70 / 69 / 67 |
| Full graph nodes / edges | 64 / 527 | 114 / 1,062 |
| Initially visible nodes / edges | 30 / 151 | 30 / 125 |
| Hidden discoverable agents | 34 | 84 |
| API payloads checked | 106 | 259 |
| Page / console errors | 0 / 0 | 0 / 0 |
| Actual mocked browser Explore-to-completion ms | 83,115 | 234,339 |
| Model calls before / after saved restoration | 350 / 350 | 700 / 700 |

Pause, resume, browser closure while owned work continued, reconnection and cancellation controls pass for both cohorts. Each desktop harness includes a separate cancellation-control Explore; the saved main run retains its accepted calls and makes **zero POST continue** requests. Client/restored storage shows zero sentinel leaks and private shapes. Each intentional browser close leaves one explicitly labelled interrupted status-body observation, not an application page/console error. Offline tile fixtures dispatch zero external basemap requests (298/301 fixture tile responses for 50/100). The reported synthetic institutions/groups remain fixture context, not actual live selection.

The 83,115/234,339 ms figures measure local mocked browser Explore to completion. They exclude the benchmark's separate genesis replay/recovery work and do not measure real provider latency. Earlier desktop records under `tmp/phase4e2/desktop/` remain historical: their 82,850/538,772 ms observations and the earlier 100-agent MCP 300-second observation timeout are not fresh results or evidence of an application repair. The fresh cohort results both complete inside the unchanged 600-second allowance.

Fresh screenshots are retained beside each `result.json`. Visual inspection covered the [50-agent graph at 1440x900](../tmp/phase4e2-optionb/desktop/50/cohort-50-graph-1440.png), [100-agent graph at 1920x1080](../tmp/phase4e2-optionb/desktop/100/cohort-100-graph-1920.png) and [100-agent Report at 1920x1080](../tmp/phase4e2-optionb/desktop/100/cohort-100-report-1920.png). The same directories contain Map, all inspector kinds, hidden-agent search, drag/settled and restored-Report PNGs at the recorded desktop sizes. Report density and overlapping labels near the graph centre remain acceptable existing presentation limitations; inspectors, search/filtering and retained positions remain usable. Earlier screenshot sets and acceptance reports remain historical.

**Offline acceptance PASS is bound in the pre-live proof and confirmed by final post-live verification: 1,294 tests, application/strict TypeScript, build/whitespace and qualifying replay 20/20, with all 14 matrix rows and both mocked desktop cohorts already passed.** Final preservation matches all 148 original / 186 task-start hashes. The classified artifact remains unresolved. The one real attempt failed planning acceptance; completed post-live checks do not convert that outcome into live acceptance.

## 12. One real Map -> Explore attempt - FAIL at planning acceptance

The original storage, approved routing/identity, credentials-presence and unused-ledger preflight passed after the bound offline gates. Attempt 1 was armed at `2026-10-31T05:31:07.023Z`; the ordinary Map -> Explore control was clicked **exactly once**. Retrieval succeeded, and the first entity-planning completion returned HTTP 200 with the exact model/provider identity verified. The application then rejected the draft at `draft.userConditions[0]`, rule `plan.user_condition_not_verbatim`, surfaced safely as `AI_PLAN_INVALID` / HTTP 502. The attempt was closed **failed** at `2026-10-31T05:32:19.071Z`. This is a planning-acceptance failure: no society started, and no budget-limited social run exists.

The actual single-attempt question was:

> What if a new government-supported eldercare centre in Sengkang begins a three-day pilot of neighbourhood volunteer visits and caregiver-support sessions? How might nearby residents, caregivers, volunteers and service providers coordinate schedules, raise concerns, exchange updates and revisit unresolved practical issues over the following days?

| Whole-task resource | Authorised hard ceiling | Actual |
|---|---:|---:|
| Fresh live Explore attempts | 1 | **1; closed failed** |
| Planning / initial / social completions | 2 / 8 / 350 | **1 / 0 / 0** |
| OpenRouter completions | 360 | **1** |
| Tavily requests / reported or reserved credits | 1 / 2 | **1 / 1** |
| Reported plus unknown-reserved OR USD | 1.00 | **0.000836689** |
| Task reported-plus-reserved tokens | 40,000,000 | **4,999; zero remaining reservation** |
| Primary engine representational token bound | 16,000,000; stricter bound wins | No social dispatch |
| Deadline / concurrent completions | 90 minutes / 1 | Closed before deadline; one completion |
| Paid evaluator / summariser / automatic retry | 0 / 0 / 0 | **0 / 0 / 0** |

The served route was OpenRouter -> `deepseek/deepseek-v4-flash-0731` -> **DigitalOcean**, verified from the returned completion with no identity mismatch. The approved guard retained fallback disabled, required parameters, reasoning disabled/excluded, serial dispatch and the exact source/build/historical/manifest bindings. Transport and serving identity success do not make the rejected plan acceptable. The second planning stage, all eight initial actions and all social opportunities remained undispatched.

Tavily returned five candidates and reported one credit. Their safe titles/locations indicate **weak Sengkang-local coverage**, mostly overseas or general caregiving material; this is not strong local grounding for the hypothetical pilot.

| Retrieved candidate | Evidence boundary |
|---|---|
| Xinhua/Facebook: Hong Kong care teams | Overseas example |
| The Center for Volunteer Caregiving: What We Do | General volunteer-caregiving programme |
| JurongHealth Campus/Facebook: caregiving stress | Singapore caregiving context; not Sengkang-specific pilot evidence |
| LeadingAge: International Day of Care and Support | General/international care context |
| World Bank: intergenerational self-help clubs in Viet Nam | Overseas example |

These are retrieved candidates recorded in `tmp/phase4e2-live/final-accounting.json`, not accepted plan facts. No accepted plan, run, society session, job, checkpoint, institution/environment selection, initial action or private group was created. Mocked desktop venues cannot fill those missing live fields.

The planner prompt already explicitly required verbatim user-condition quotations, and validation checks literal inclusion in the submitted question (`question.includes`). The rejected value was **not retained**, so the exact wording difference cannot be reconstructed from safe evidence. There is no confirmed application defect, application repair or rewritten provider output. An ephemeral offline diagnostic in `tmp/phase4e2-optionb/planning-diagnostic.log` passes **4/4** cases: an exact quotation is accepted, a non-verbatim condition stays rejected, an optional empty condition list is allowed, and safe failure diagnostics omit the rejected quotation. These cases verify the existing boundary; they do not recover the live output or establish why its wording differed.

Safe failure evidence is `tmp/phase4e2-live/attempt-1-planning-failure.json`. The original one-attempt allowance is consumed. There is no accepted run that can safely resume, and no second Explore, planning retry, paid evaluator or extra credits are authorised. Any future real attempt needs new explicit authorisation after offline review of planner quotation-generation reliability.

## 13. Behaviour NOT OBSERVED; tested live failure/privacy boundary PASS

The real attempt stopped before plan acceptance. Actual initial stakeholder and social completions, social accepted/failed/skipped/inactive counts, model authors and live conversations are all **zero**. No social clock started, so final live tick, simulated duration, daily participation, voluntary peer/reciprocal chains, late revisits, productive disagreement, older-memory use, private continuity, cross-platform transfer, repetition and issue developments are **NOT OBSERVED**, not a completed quiet simulation. Live society replay, checkpoint restoration and a protected conversation-string comparison are **NOT RUN** because there is no accepted society.

The offline and desktop fixtures establish actual bounded reducer/context/service capability, including day-gap episodic-only content, private leave/rejoin rules, a Day 3 trigger, full-capacity temporal distribution and exact reconstruction. Their explicit choices are not spontaneous DeepSeek conversations. Actual future evidence must separate memory availability, ranking, primary-content inclusion, optional recall and substantive use. Automatic target bindings alone do not prove memory causation or semantic comprehension.

Overlapping reciprocal triples would not be independent conversations; repeated reads would not be independent voters; tags would remain model self-classifications. The failed planning attempt supplies no behavioural evidence for those questions, and another attempt cannot be started to chase a preferred result.

The tested failure boundary passes within its scope. `tmp/phase4e2-live/desktop/failure-privacy.json` records `privacyFailed:false`, no forbidden private-field paths or raw sentinels in the three inspected API payloads (`/api/ai/status`, `/api/network`, and the rejected `/api/scenario-simulate` response), no HTML/storage sentinel, and no overflow in the captured failure layouts. The failure views were captured at [1440x900](../tmp/phase4e2-live/desktop/planning-failed-1440.png) and [1920x1080](../tmp/phase4e2-live/desktop/planning-failed-1920.png). **One console error is the expected HTTP 502 failure response**; no zero-console-error claim is made for this live attempt. These error-state checks are not live social Graph/Report/browser acceptance, and live private conversations remain unexercised.

Final post-live preservation matches all 148 original and 186 task-start hashes, with qualifying replay PASS 20/20 and no accepted live archive. Privacy/immutability PASS is limited to the tested offline and error boundaries, not an unrun conversation audit.

## 14. Live calls, tokens, cost and Tavily accounting - ONE CLOSED FAILED ATTEMPT

| Stage | Requests | Input / output tokens | Reported OR USD | Unknown-reserved USD |
|---|---:|---:|---:|---:|
| Entity planning | 1 | 2,967 / 2,032 | 0.000836689 | 0 |
| Relationship planning | 0 | 0 / 0 | 0 | 0 |
| Initial stakeholder actions | 0 | 0 / 0 | 0 | 0 |
| Social | 0 | 0 / 0 | 0 | 0 |
| OpenRouter total | **1** | **2,967 / 2,032** | **0.000836689** | **0** |

Total reported tokens are **4,999**. Final ledger accounting has **zero pending or interrupted requests, zero unknown charges, zero outstanding USD and zero reserved tokens**. Reported and conservative OpenRouter USD both equal **0.000836689**. Tavily made **one successful request**, returned five candidates and reported **one credit**; its dollar cost remains **unknown**. No historical Phase 4E.1 spend, mocked fixture call or external account-wide billing amount is included.

Before arming, the free [OpenRouter endpoint metadata](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-flash-0731/endpoints) reported DigitalOcean prompt/completion rates of USD 0.119/0.238 per million tokens. At the enforced request-body bound plus conservative token overhead and maximum planning output, the calculated upper estimate was USD 0.013364176, below the unchanged USD 0.02 unknown-cost reservation. The safe calculation is `tmp/phase4e2-optionb/provider-public-metadata.json`. This was a public metadata lookup, not a paid connectivity test, price guarantee or externally enforced billing cap.

`tmp/phase4e2-live/final-accounting.json` records attempt 1 as `failed`, `acceptedPlan:false`, `acceptedSocialSession:false` and `retry:false`. Its ledger SHA-256 is `11a8c79b99dd3cc7898af002e2012134d268941311a3e0902896fce47c082887`, with the same source/build/historical/manifest bindings used for admission. The local ledger is settled; unused numeric budget does not restore the consumed attempt. No further paid work is authorised in this task.

## 15. Repairs, limitations and future thresholds

Implemented repairs with focused test-first evidence include truthful issue creation at the lifetime bound, private inbox filtering before truncation, exact calendar inclusion in the provider encoding, event headroom before dispatch, private reducer capacity settlement, final-tick completion checks, revision-only nonprogress detection, checkpoint ownership and stamp-validated compact status. Integration review additionally introduced fixed urgent-loan repayment, ordinary-demand fairness, fatal-outcome stopping, final-tick capacity-terminal classification and conservative accounting when token usage is only partially reported. Fresh Option B offline acceptance passes 1,294 tests and associated gates, strict qualifying replay 20/20, the full 14-row matrix and both mocked desktop cohorts. Prior findings remain historical, and the independently reproduced nonqualifying failure stays visible in inventory.

The live failure produced **no application repair**. Existing prompts already require verbatim condition quotations, and existing validation correctly rejects a non-included string in controlled offline cases. The actual rejected wording is unavailable, so its precise discrepancy and any deeper generation cause remain unresolved. The practical follow-up is offline review of planner quotation-generation reliability and weak Sengkang-specific retrieval before a newly authorised real attempt; output rewriting, relaxed validation or another call under the consumed grant is not a remedy.

Remaining limits include lexical/topic metadata retrieval rather than general semantic understanding, bounded distinctive-memory retention, 64 ancestry, sixteen lifetime issues, cumulative Graph prominence, fictional availability, no detailed work/weekend model, local process ownership and serial provider latency. More elapsed days do not create new evidence or prove sustained social intelligence. Protected semantic relevance, productive disagreement, realistic repetition and substantive older-memory use require actual observation.

| Future configuration or change | Current status / evidence threshold |
|---|---|
| 700 decisions with 70 capable agents | Allowlisted 100-active profile; 320/672 and prior 80-tick fixtures reach 700, while 160 naturally finishes at 695 |
| 700 decisions with 35 capable agents | NOT enabled; needs a new capacity/actor policy rather than relabelling the current 350 profile |
| 1,400 with 70 capable / 2,000 with 100 capable | NOT enabled; needs new cohort/actor/slot/resource bounds and complete offline acceptance |
| Larger actor opportunity allowance | Current hard sixteen gives at most 560/1,120 opportunities over 35/70 capable agents before other limits |
| Larger storage | Research-only old-fixture extrapolation approached 32 MiB around 1,225 decisions; it is not a measured new threshold and longer clocks may change it |
| Larger event/item histories | Research's illustrative 672-tick model put 1,400 decisions near 6,844–8,244 events and 2,000 near 8,044–10,044; 2,000 authored items also approach 2,048. These are estimates, not enabled capacities |
| Incremental indexes/projections | Justified when repeated scans measurably dominate local time/latency |
| Streaming/segmented journals or compact checkpoints | Justified by measured verification memory, latency or private-byte headroom |
| Local database or separate process | Justified by simpler indexed/partial operations, isolation or measured responsiveness/ownership needs |
| Parallel inference / external queue | Requires a causal snapshot/ordered-commit design or actual multiple durable workers, plus new authority and replay tests |
| Larger/tiered or vector memory | Requires measured distinctive-memory loss or material untagged semantic failures after simpler metadata/retention fixes |

No future capacity, provider/model, infrastructure migration, paid retry or next phase starts automatically. The bounded task is complete, including final post-live historical/regression/type/build and preservation checks. The approved scope retains the unresolved historical artifact without guessed reconstruction, and the one real attempt is consumed by its planning failure. The next action is **offline review of planner quotation selection/generation reliability and Sengkang-specific retrieval** before any separately authorised new live attempt. No further credits, second Explore, resumed nonexistent society, subsequent phase or extra retry is authorised now. Existing later roadmap items remain preserved.

## 16. Exact changed-file inventory and cleanup

The current task inventory contains **63 files**, reconciled against read-only `git status --short --untracked-files=all`. It includes the Option B scope manifest/parser, historical result aggregation and regressions, scope plan, and changed historical audit/live guard/admission helpers alongside the multi-day implementation. Ignored evidence, journals, ledgers, screenshots and logs are not source inventory. The user-owned pre-existing `docs/PHASE4E2_EXTENDED_SIMULATION_RESEARCH.md` is deliberately excluded and preserved unchanged; prior acceptance reports are not rewritten.

The Option B follow-up itself adds six classification/aggregation/regression/plan files and changes four testing-side audit/admission files (`phase4e2-historical.ts`, `phase4e2-live-guard.mjs`, its test, and `phase4e2-live-server.mjs`), plus this report and the roadmap. The existing multi-day runtime implementation is carried forward without redesign. No application code changed after the live planning rejection.

```text
components/communication-report.tsx
components/discussion-summary.tsx
docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md
docs/PHASE4E2_MULTIDAY_SWARM_IMPLEMENTATION_AND_LIVE_ACCEPTANCE.md
docs/superpowers/plans/2026-10-31-phase4e2-historical-scope.md
docs/superpowers/plans/2026-10-31-phase4e2-multiday-swarm.md
lib/contracts/tests/phase4e2-availability.test.ts
lib/contracts/tests/phase4e2-coordinator.test.ts
lib/contracts/tests/phase4e2-fatal-service.test.ts
lib/contracts/tests/phase4e2-historical-results.test.ts
lib/contracts/tests/phase4e2-historical-scope.test.ts
lib/contracts/tests/phase4e2-live-guard.test.ts
lib/contracts/tests/phase4e2-live-harness.test.ts
lib/contracts/tests/phase4e2-longitudinal.test.ts
lib/contracts/tests/phase4e2-memory.test.ts
lib/contracts/tests/phase4e2-pacing.test.ts
lib/contracts/tests/phase4e2-private.test.ts
lib/contracts/tests/phase4e2-process-restart.test.ts
lib/contracts/tests/phase4e2-profile.test.ts
lib/contracts/tests/phase4e2-public-contract.test.ts
lib/contracts/tests/phase4e2-public-status.test.ts
lib/contracts/tests/phase4e2-service.test.ts
lib/contracts/tests/phase4e2-summary.test.ts
lib/contracts/tests/phase4e2-token-accounting.test.ts
lib/question-simulation/job.ts
lib/question-simulation/public-session.ts
lib/server/society/coordinator.ts
lib/server/society/facts.ts
lib/server/society/public-service.ts
lib/server/society/service.ts
lib/server/society/summary.ts
lib/server/society/swarm-journal.ts
lib/society/contract.ts
lib/society/decision-contract.ts
lib/society/decision-menu.ts
lib/society/deep-context.ts
lib/society/deep-policy.ts
lib/society/deep-scheduler.ts
lib/society/engine.ts
lib/society/execution-profile.ts
lib/society/group-engine.ts
lib/society/hybrid.ts
lib/society/public-contract.ts
lib/society/swarm-routine.ts
lib/society/swarm.ts
lib/society/temporal-policy.ts
scripts/testing/phase4e2-benchmark.ts
scripts/testing/phase4e2-desktop.mjs
scripts/testing/phase4e2-historical-results.ts
scripts/testing/phase4e2-historical-scope.ts
scripts/testing/phase4e2-historical-scope.v1.json
scripts/testing/phase4e2-historical.ts
scripts/testing/phase4e2-live-audit.ts
scripts/testing/phase4e2-live-browser.mjs
scripts/testing/phase4e2-live-contract.mjs
scripts/testing/phase4e2-live-guard.mjs
scripts/testing/phase4e2-live-server.mjs
scripts/testing/phase4e2-live-server.ps1
scripts/testing/phase4e2-mock-server.mjs
scripts/testing/phase4e2-mock-server.ps1
scripts/testing/phase4e2-provider-preload.mjs
scripts/testing/phase4e2-restart-fixture.ts
scripts/testing/tsconfig.phase4d.json
```

At the prior checkpoint, task-owned server processes 12660 and 11508 were stopped. Its normal-user CIM/port check recorded **zero task processes and zero task ports** (3200/3201); owned browser contexts were closed and observer state cleared. Prior cleanup evidence remains `tmp/phase4e2/cleanup.json`. Those earlier no-ledger findings remain historical. No package install, Git mutation, deployment, credential/security/ACL edit, secondary-directory access or mobile testing was performed; evidence and accepted artifacts remain retained.

After the real planning failure, live server PID **22684** and owned live browser contexts were stopped. Final normal-account cleanup at **13:47:57 Singapore time on 31 October 2026** records **zero task servers, zero task ports and zero owned task browser pages**, with the root observer blank. `tmp/phase4e2-optionb/cleanup.json` records ordinary account `win-6g6cb27kctg\tetas` and retained evidence. Attempt 1 remains closed failed with zero pending/unknown reservations; ledger SHA-256 remains `11a8c79b99dd3cc7898af002e2012134d268941311a3e0902896fce47c082887`. Final post-live preservation matches all 148 original / 186 task-start hashes. Changes remain unstaged and uncommitted; the staged file list is empty.

**The bounded task is complete. Verdicts: approved-scope historical PASS; offline PASS; real-provider integration FAIL at planning acceptance; behaviour NOT OBSERVED; privacy/immutability PASS within tested offline/error boundaries; final post-live verification PASS. No overall PASS is claimed.** Complete inventory retains the unresolved artifact, and no further paid work is authorised.


## 17. Required evidence coverage index

This index makes all 49 requested report areas explicit; grouped sections above contain their evidence and limits.

| Area | Requirement | Section and result |
|---:|---|---|
| 1 | Repository baseline and HEAD | Section 2: main worktree, `ff46ab24ad93bb9260cc4a94ee0111f2e83cf21d` |
| 2 | Research adopted | Section 2: Approach B, existing engine retained |
| 3 | New 320-tick profiles | Section 3: 50/35/350 and 100/70/700 |
| 4 | Historical compatibility | Sections 1/3/11: qualifying PASS 20/20 under approved scope; one nonqualifying unresolved inventory artifact retained |
| 5 | Unified capacity | Section 3: immutable profile and shared limits |
| 6 | Pacing formula | Section 4: exact release, reserve and loan equations |
| 7 | Frozen pacing and replay | Section 4: trusted initial target and immutable marker |
| 8 | Calendar | Section 5: Day 1 08:00 Asia/Singapore |
| 9 | Seeded availability | Section 5: fictional rest; no demographic inference |
| 10 | Routine progression | Section 5: once per tick; no discretionary rule dialogue |
| 11 | Conversation continuity | Section 6: complete ancestry and bounded actual bodies |
| 12 | Private inbox | Section 6: eligibility before 16-candidate cap |
| 13 | Episodic memory and issues | Section 6: ST12/EP32 and truthful lifetime issue capacity |
| 14 | Event/item/nonprogress terminals | Section 7: typed partials and real-progress checks |
| 15 | Journal and checkpoint | Section 7: durability, full-chain verification and checkpoint ownership |
| 16 | Coordinator and observer | Section 8: managed owner and passive authenticated observation |
| 17 | Entity Graph preservation | Section 8: existing entity-first nodes and inspectors |
| 18 | Multi-day Report | Section 8: shared bounded daily fact pack |
| 19 | Offline 80/160/320/672 results | Section 10: all 14 matrix rows PASS |
| 20 | Mocked 350/700 capacity | Section 10: full capacity at 320 and 672 for both cohorts |
| 21 | Grant70/capacity350 comparison | Section 10: 28/21/21 periods at tick320; 26 participants |
| 22 | Quiet and late triggers | Section 10: 180 inactive choices, 170 unused calls; matched Day 3 trigger |
| 23 | Memory tests | Sections 6/9/10: day-gap, eviction, novel counterparties and context bounds |
| 24 | Private access | Section 6: outsider/current-join/leave/rejoin/read rules |
| 25 | Recovery faults | Sections 7/9: covered by final passing regressions |
| 26 | Historical replay and hashes | Sections 1/11: fresh mandatory PASS 20/20 (4 + 16), all 148 original hashes unchanged; one pinned nonqualifying unresolved artifact retained |
| 27 | Performance and storage | Section 11: all artifact sizes and shared-host timing limits |
| 28 | Desktop | Section 11: both cohorts and both desktop sizes PASS |
| 29 | Final test count | Section 9: final post-live 1,294/1,294 in 163,379.1147 ms, zero failures/skips/cancellations/TODOs; types/build/whitespace PASS |
| 30 | Live preflight | Sections 1/12: original preflight PASS; one real Explore failed strict planning acceptance |
| 31 | Scenario and actual environments | Section 12: actual Sengkang question; five weakly local candidates; no accepted plan/environment/society |
| 32 | Accepted live count | Sections 12/13: zero |
| 33 | Final live tick and duration | Section 13: no society started; tick/simulated duration not applicable |
| 34 | Participation by day | Sections 11/13: mocked counts reported; no live participation |
| 35 | Voluntary conversations | Section 13: NOT OBSERVED |
| 36 | Actual older-memory use | Section 13: NOT OBSERVED live; fixture capability kept separate |
| 37 | Private and cross-platform activity | Section 13: NOT OBSERVED live |
| 38 | Repetition and issue development | Section 13: NOT OBSERVED live |
| 39 | Live replay and privacy | Section 13: society replay unrun; tested offline/live-error boundary PASS; no conversation privacy claim |
| 40 | OpenRouter calls and tokens | Section 14: one completion; 2,967 input / 2,032 output / 4,999 total |
| 41 | Reported cost and unknown reserves | Section 14: USD 0.000836689; unknown/outstanding reservations zero |
| 42 | Tavily requests, credits and dollar uncertainty | Sections 12/14: one successful request / one reported credit / five candidates; USD unknown |
| 43 | Paid attempt count | Section 12: one; ledger closed failed, no retry or accepted-run resume |
| 44 | Repairs | Sections 12/15: offline implementation repairs retained; no confirmed live application defect/repair; quotation diagnostic 4/4 |
| 45 | Limitations | Section 15: bounded, fictional, local and uncalibrated |
| 46 | Future 700/1400/2000 | Section 15: supported 700 profile; 1400/2000 not enabled |
| 47 | Next phase | Section 15: bounded task complete; review planner quotation selection/retrieval offline; future paid acceptance needs new explicit authorisation |
| 48 | Exact inventory | Section 16: current task files, excluding pre-existing user research |
| 49 | Separate verdicts | Sections 1/16: scoped historical/offline PASS, real-provider planning acceptance FAIL, behaviour NOT OBSERVED, tested offline/error privacy PASS, final post-verification PASS; no overall PASS |
