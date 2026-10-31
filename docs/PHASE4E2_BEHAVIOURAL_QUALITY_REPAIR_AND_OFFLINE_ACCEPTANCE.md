# Phase 4E.2 behavioural quality repair and offline acceptance

Completed 31 October 2026. **Overall offline architecture: PASS. Real-provider behavioural improvement: NOT TESTED.** Zero paid calls; no paid ledger armed.

| Area | Verdict |
|---|---|
| Issue-update reliability | IMPLEMENTED + OFFLINE PASS |
| Episodic memory presentation and measurement | IMPLEMENTED + OFFLINE PASS |
| Private coordination capability | IMPLEMENTED + OFFLINE PASS |
| Local grounding provenance | IMPLEMENTED + OFFLINE PASS |
| Historical compatibility / privacy | PASS within the qualifying scope and tested surfaces |
| Real-provider behavioural improvement | NOT TESTED |

Baseline: `master`, `3f5bc764d5c1b71e42ffc9e877694e81fa309ea6`; working tree clean before this task. The preceding live acceptance remains immutable. Its five rejected provider bodies were not retained, so their exact generation errors are unknown.

## Investigation matrix and implementation design

| Symptom | Source finding | Classification | Reproduction and minimal response | Risk / expected observation |
|---|---|---|---|---|
| Five issue-path rejections | Independent schema enums permit combinations rejected by decoder; malformed discussion is dereferenced before validation | Confirmed model-interface weakness and diagnostic robustness defect; historical failures' precise causes remain unproven | Synthetic schema/parser cross-products; new finite issue-choice contract with trusted bindings, safe diagnostics | New frozen selector required; offered choices become constructible without relaxing reducer |
| Older open issues omitted | Latest-four projection can prefer newer closed issues | Confirmed model-interface weakness | Old open issue plus newer closed records; bounded open-first projection | Retain four-entry bound and actual source access; no automatic resolution |
| Older memory not substantively demonstrated | Authored and encountered ticks lack distinct labels | Confirmed model-interface weakness | Old source encountered later and revisited across days; explicit temporal/source labels | Preserve source bodies and ST12/EP32/6/8/24KB bounds; use remains optional |
| Recall metrics can overcount optionality | Live helper subtracts target but not stance-required references | Confirmed measurement-definition defect | Stance-bound recall control; distinguish all required bindings | Do not rewrite historical reported counts or infer causal use |
| Keyword-based substantive score | Number plus independent keywords can match negation/unrelated claims | Confirmed measurement limitation | Source-grounded positive and adversarial controls; conservative unassessed outcome | Fixture discrimination is not real-model intelligence or causal proof |
| Empty model-created group | Silence alone is a valid outcome; menu lacks some authorised creation/destination choices | Valid agent choice; confirmed interface weakness | Nonmember public opportunity and saturated eight-group menu; expose legal choices only | No authored content or extra group is injected |
| Private eligible message suppressed | Duplicate filtering precedes recipient access; inbox limit precedes thread eligibility | Confirmed implementation defect | Identical inaccessible and accessible copies, rejoin and saturated thread fixtures; new-policy permission-scoped novelty and filtering | Legacy scheduling retained; no permission expansion |
| Weak local passages | Query/passage head truncation can omit later locality; no explicit passage-level coverage labels | Confirmed interface/measurement weakness, not proof of false live claims | Bounded offline local/national/foreign/absent/conflicting examples; exact locality window and mention-only provenance | Same one-search/five-candidate bounds; no claim of semantic verification or local pilot existence |

Implementation sequence: capture protected-file hashes; reproduce each finding; add immutable `behaviour-quality-v1` / `conversation-menu-v3` selector; implement narrow issue, presentation, private selection and grounding improvements; focused tests; serial complete offline verification; historical and paid preservation; benchmarks and desktop; final report. Existing selector absence preserves historical context/schema/reservation reconstruction. No scheduler capacity, memory capacity, graph or provider authority increase is planned.

## Baseline and evidence boundary

The preceding real-provider run completed 320 ticks (80 fictional hours) with 350 social completions, 345 accepted decisions and five rejected decisions. All 35 capable agents participated. It published 294 model items including seven shares, recorded 228 peer replies including share targets, reached an authored chain of 15 and nine cross-day continuing roots. It supplied 210 episodic-only references, including 183 cross-day occurrences, but did not demonstrate substantive older-memory use. Five optional episodic selections were reported under the then-current measurement definition. One additional model-created group remained empty; the bootstrap group had 36 items. Two issues remained open and none were resolved or withdrawn.

The five rejected opportunities, at indices 86/204/307/314/324 and ticks 89/188/284/288/296, all diagnosed `decision.issueUpdate`; two were `SOCIAL_SHAPE` and three `SOCIAL_MEMORY`. This establishes the failing boundary, not the offending values or a common cause. The original bodies were deliberately not retained. This task neither reconstructs them nor changes accepted outputs. An empty group, legitimate unresolved issue, inactivity or unused available memory is not itself a software defect.

The baseline is documented in [the real-provider report](PHASE4E2_REAL_PROVIDER_V3_LIVE_ACCEPTANCE.md) and [planner repair report](PHASE4E2_PLANNER_RELIABILITY_REPAIR_AND_OFFLINE_ACCEPTANCE.md). Their reports and closed ledgers are preserved. The most recent live ledger remains closed at 360 OpenRouter completions, USD 0.21122024, one Tavily credit and zero outstanding reservations. The earlier failed planning attempt remains closed separately.

## Frozen compatibility and narrow implementation

New ordinary multi-day sessions freeze `behaviour: behaviour-quality-v1` paired with `context: conversation-menu-v3` in `IntelligencePolicy`. The engine profile remains `multi-day-swarm-v1`: 50/35/320/350 or trusted 100/70/320/700; original pacing, availability, serial inference and per-agent ceilings remain. Unknown or mismatched selector pairs fail validation. Stored input without the new selector keeps the original context, scheduler ordering, schema and reservation calculation. Quick and historical profile constructors are unchanged. This is not a migration of existing worlds.

`lib/society/intelligence.ts`, `hybrid.ts` and `lib/server/society/service.ts` own selection and reconstruction. The new transport uses a scoped prompt while the legacy system prompt remains byte-identical. New wire metadata is counted against the existing 24 KB bound: `context-capacity.ts` measures the greater of canonical internal and encoded wire bytes. Overflow drops optional references/bodies/menu choices, never truncates mandatory source wording or grants exposure. Reservation accounting uses that same versioned byte measure. ST12, EP32, six selected memories, eight bodies, 24 actions and output-token limits are retained.

### Issue contract and lifecycle

`issue-menu.ts` constructs a finite list from supplied topics and legitimately supplied own issue/source records. V3 selects `issueChoiceId`, rather than independently generating kind/topic/issue IDs. Creation is unavailable at the sixteen-lifetime-issue bound. Resolution/withdrawal choices require an open own issue, matching topic, supplied own authored source, a real source-memory binding, and current private membership when applicable. Their required source reference is mandatory accounting, not optional recall.

A selected issue choice is permitted only with an authored action and `discussion:null`; its application-owned classification is explicit in the menu. A null issue choice uses ordinary validated discussion tags. Unknown IDs, stale choices, unsupported fields, conflicting tags, non-authored classifications and absent permissions fail safely. The semantic reducer still receives and validates the original `IssueUpdate`; no invalid output is repaired, no closure inferred from agreement, and no other actor's concern resolved. The model's explicit self-classification remains an unverified fictional state change.

The bounded four-issue context projection now prioritises retained open issues over newer closed issues. It does not make all sixteen issues simultaneously visible, or promise retrieval of every old issue source. The eight-entry issue index remains an index rather than an eight-open-issue ceiling. Historical projection ordering remains unchanged. Canonical selected-decision reconstruction protects against altered bindings and stale contexts.

### Memory presentation and measurement

`memory-presentation.ts` derives metadata only from already supplied primary bodies and references. It distinguishes source author, source-authored fictional time, encounter time, current time, age and short-term versus episodic origin. It labels source statements as reported claims, and explicitly warns that omitted sources/history are unavailable. No text is duplicated, new exposure created or memory rank/capacity enlarged. Historical topic-v2 retrieval remains the same bounded lexical/topic-aware algorithm; broad-topic collisions and missed untagged paraphrases remain limitations.

The reusable audit now separates raw explicit recalls, target-required, stance-required and issue-required bindings from references additional to all of them. The prior five-selection result is not retroactively rewritten or assumed incorrect. Preserved task-specific audit helpers remain untouched.

`scripts/testing/phase4e2-memory-evidence.ts` is a conservative synthetic evaluation instrument, not a general semantic judge. It recognises a declared source-claim grammar and checks the relation, polarity, condition, attribution, time and supplied exact body. Positive controls do not need a stock continuity phrase. Negation, unrelated same-number claims, wrong authors/days, invented details, irrelevant sources and missing access cannot earn a grounded-reference result. Unrecognised paraphrases or trailing unknown prose are `UNASSESSED`. Retention, retrieval, context inclusion, explicit selection and accurate reference are separate stages; causal influence is always `NOT_VERIFIED` by this instrument. It does not establish that a real model will recall or use a memory.

### Private coordination

Under the new selector, duplicate filtering considers recipient-accessible history in the correct private group. An inaccessible cross-group, pre-join or pre-rejoin copy cannot suppress a newly accessible identical source. Permission checks, chronological ancestry, actual reducer reads and repeated-source suppression remain binding. Scheduler burst/cooldown/pacing eligibility applies before the final sixteen-target private inbox cap, so exhausted threads cannot occupy every discovery slot.

An ordinary public opportunity can now offer already-authorised private group creation. This grants no private message history. The 24-action menu reserves current-member message destinations before ordinary action saturation, and supplies the authorised stored group purpose. General byte overflow may still drop optional destinations; the reservation guarantee concerns action-count saturation, not every oversized context.

Creation still immediately enrols the creator and supplied valid members; it does not create an introductory message. Later membership requires existing invitations and capacity, and leave/rejoin retains its fresh history boundary. Eight groups total and eight current members per group remain. No creation-triggered synthetic notification/message or compulsory follow-up is introduced. The observed empty real group cannot be attributed to a specific code weakness from available evidence; silence remains valid.

### Local grounding

`balanced-question-v1` retains bounded head and tail query wording when a long question would otherwise lose its final intervention terms. The original question and planner v3 `question-1` / `complete-question-v1` provenance remain exact. Existing two-argument query construction retains its original behaviour for compatibility. Country/locality anchors remain conservative; the ordinary server selects the new wording policy.

New retrieval selects `locality-window-v1`: at most an 800-character exact contiguous substring around a supplied unique locality mention in the already returned content, without fetching source URLs. It can retain a later local passage that head-only clipping lost, but does not determine relevance or factual truth. Prohibited interior controls cause that source to be rejected instead of deleted from a purported exact quotation. Ambiguous/invalid publication dates become unknown in this new path; valid ISO dates/timestamps are retained, with date-only values normalised to midnight as a date representation, not evidence of a publication time. The legacy sanitation/date path remains unchanged.

`geographic-coverage.ts` annotates literal requested-locality and Singapore mentions in passage bodies only. Titles and government domains cannot establish these labels, and negated, conflicting or irrelevant mentions remain unverified. Absence is explicitly disclosed. Planner context now receives publication/retrieval dates, limitations and mention-only coverage. National background cannot establish the hypothetical local pilot. Exact-citation validation still proves textual linkage, not semantic entailment; no hardcoded source, extra search, new fact or locality statistic is added. The one basic search, five-candidate, response-size and timeout ceilings remain.

## Rejected speculative changes

No model-capacity increase, embeddings, larger memory store, parallel inference, group injection, forced recall, automatic issue closure, semantic persuasion claim or graph redesign is justified. Private notification-counter symmetry alone is not a defect because the scheduler already discovers private replies independently. No attempt is made to guess the unretained five responses. No semantic-evaluator PASS is inferred from keyword counts or fixture-authored text.

## Focused RED/GREEN evidence

Ignored evidence is under `tmp/phase4e2-behaviour-quality/`. Genuine pre-fix regressions cover independent issue-field combinations, malformed discussions, owner/private source restrictions, open-issue visibility, old/new timestamp ambiguity, optional-binding accounting, evaluator false positives, inaccessible duplicate suppression, burst saturation, destination menu saturation, missing local coverage, head-only clipping, control-character quotation changes and invalid date normalisation. `issue-*`, `memory-*`, `private-*`, `grounding-*`, `context-*` and `policy-*` logs retain focused results.

The initial in-progress full run reported 1,373/1,374: a newly added private-source closure test exposed a missing menu membership check while implementation was still being consolidated. The check was added without relaxing the assertion. Subsequent focused tests and the stable full run pass. Initial TypeScript findings were fixture-only nullable-return inference and a widened platform literal; explicit types corrected both without weakening runtime guards.

Negative and quiet fixtures preserve no closure, no recall, an empty group, voluntary inactivity, cap exhaustion and rejection as valid outcomes. The evaluator tests validate discrimination of synthetic evidence, not spontaneous intelligence. Actual structured-transport tests inspect the serialized prompt/schema/context, provider routing, output bound, safe rejection and single dispatch without retry.

## Acceptance evidence

Stable application suite: **1,386/1,386 PASS**, no failures/skips/cancellations, **166,877.0699 ms**. Both main and affected strict TypeScript checks pass. Production build passes under the absolute-URI offline guard. Heavy acceptance jobs run serially. Final historical, benchmark, desktop and preservation results are recorded below. No application/test/script source changed after the stable full-suite and build checks; its fingerprint remains identical.

### Full mocked behavioural integration

`phase4e2-behaviour-integration.ts` drives the actual service, gateway serializer/validator, coordinator, reducer, format-2 journal, materialised checkpoints and public projections. Its selector chooses only offered legal options; it never inserts an incoming message. It deliberately exercises capabilities and does not demonstrate voluntary real-model intelligence or independently verified issue resolution. Grounding is tested separately through the ordinary Sengkang entity/relationship/stakeholder planning pipeline and accepted society initialisation; the full-capacity social fixtures use validated workweek fixture plans.

| Observed fixture measure | 50 active / 35 capable | 100 active / 70 capable |
|---|---:|---:|
| Final tick / capacity | 320 / 350 | 320 / 700 |
| Accepted mocked decisions / rejections | 350 / 0 | 700 / 0 |
| Explicit fixture issue creations / resolutions | 35 / 35 | 70 / 70 |
| Additional model-choice groups / groups with messages | 1 / 1 | 1 / 1 |
| Private model items / model peer replies | 49 / 46 | 51 / 48 |
| Script-selected cross-day episodic references | 22 | 58 |
| Journal bytes | 21,361,030 | 41,809,080 |
| Final checkpoint bytes | 11,691,168 | 23,646,598 |
| Public projection bytes | 576,087 | 1,129,127 |
| Complete harness elapsed, including replay audits | 166,907.4001 ms | 550,356.1138 ms |
| Full genesis replay | 42,874.7835 ms | 159,968.9695 ms |
| Early-checkpoint recovery with nonempty tail | 45,169.6777 ms | 169,287.2962 ms |

Both full replays and checkpoint-tail recoveries match exactly, with zero restore dispatches, unchanged journal hashes and zero tested public raw-string matches. The early checkpoint is at four decisions, so these tail timings apply 346/696 remaining records; they are not final-checkpoint load timings. No capacity/storage ceiling was raised. Slow large-world recovery remains an observed operational limitation. Graph and Report item/decision/day totals reconcile, including source-event-backed claims. This fixture selects no inactivity; separate negative/quiet tests and the required quiet benchmark retain that legal outcome. No real-model behavioural improvement is established by these numbers.

### Historical integrity

The unchanged strict historical audit passes **20/20 qualifying worlds**: four Phase 4C/4D references and sixteen earlier swarm worlds, with exact replay/round trips and checkpoint-tail comparisons where available. All **148 original snapshot hashes** remain unchanged. Network/provider attempts are zero. The complete inventory remains `COMPLETE_WITH_CLASSIFIED_UNRESOLVED`.

The approved Option B artifact `f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json`, content SHA-256 `f509b72702238ce52d3feb6653b28ca68f7151796f5e39d88834160902f503ca`, still fails strict reconstruction at record zero/tick one with `SOCIAL_STALE`. Its pinned evidence passes the existing classification checks. It remains a nonqualifying pre-final mocked development artifact with unrecoverable generation-policy provenance, not a replay PASS. No manifest entry, validator, accepted answer or historical scheduler was changed.

The audit used a task-local output-isolated adapter of `scripts/testing/phase4e2-historical.ts`; only output destination and import resolution changed, with original assertions retained. `verification-adapters.json` records the original hashes and adaptation. Earlier benchmark/audit evidence is not overwritten. Verified source fingerprint: `db7a912f2429a872bade6ad606b09a4d586b3dc0ee027e7566bb71f6ab813ef9`.

A relative-import error in the additional task-local protected-live-world audit adapter initially stopped that queued step before it read any archive; the path was corrected and the error log preserved. This was a harness path repair, not an application or historical-policy repair.

### Recall accounting clarification

The integration harness's `optionalRecalls` fields count raw explicit `selection.recallIds`, not necessarily references additional to required bindings. The read-only `integration-recall-audit.ts` applies the corrected `beyond-target-stance-issue-bindings-v1` definition to the same unchanged journals. Primary: **22 raw / 22 additional** cross-day episodic references. Larger: **58 raw / 54 additional**, with **four required-binding duplicates excluded**. No raw provider body or accepted record is rewritten. All are scripted fixture selections; neither accurate source reference nor causal use by a real model follows from them. The old real run's five reported selections remain a separate historical metric and were not retroactively reclassified.

### Fourteen-row benchmark matrix

Every row passes its unchanged acceptance assertions: admitted counts, per-policy clock completion, exact full replay and restoration, source-backed aggregate checks and zero tested public leaks. Limited grants are not claims of full-capacity participation. A capacity is a ceiling, not a quota. Timings include mocked service and audit work, not paid network latency.

| Profile | Ticks | Accepted / capacity (grant) | Accepted agents / capable | Early / middle / late | Full row s | Replay s | Journal MiB | Checkpoint MiB |
|---|---:|---:|---:|---|---:|---:|---:|---:|
| historical | 80 | 8 / 8 (8) | 4 / 4 | 3 / 3 / 2 | 2.05 | 0.43 | 16.25 | ? |
| quick-50 | 80 | 64 / 64 (64) | 35 / 35 | 24 / 22 / 18 | 8.15 | 2.95 | 2.28 | ? |
| quick-100 | 80 | 128 / 128 (128) | 70 / 70 | 48 / 44 / 36 | 43.10 | 11.88 | 4.56 | ? |
| deep-50-80 | 80 | 350 / 350 (350) | 35 / 35 | 123 / 118 / 109 | 86.62 | 27.24 | 17.14 | 8.70 |
| deep-100-80 | 80 | 700 / 700 (700) | 70 / 70 | 245 / 237 / 218 | 345.32 | 139.83 | 34.34 | 18.31 |
| multi-50-160 | 160 | 347 / 350 (350) | 35 / 35 | 118 / 115 / 114 | 108.46 | 37.14 | 17.74 | 9.25 |
| multi-100-160 | 160 | 695 / 700 (700) | 70 / 70 | 241 / 225 / 229 | 348.96 | 136.75 | 35.20 | 18.81 |
| multi-50-320 | 320 | 350 / 350 (350) | 35 / 35 | 119 / 117 / 114 | 118.26 | 38.14 | 18.02 | 9.60 |
| multi-100-320 | 320 | 700 / 700 (700) | 70 / 70 | 240 / 231 / 229 | 382.21 | 148.12 | 35.96 | 19.59 |
| stress-50-672 | 672 | 350 / 350 (350) | 35 / 35 | 120 / 116 / 114 | 164.35 | 55.66 | 18.52 | 10.32 |
| stress-100-672 | 672 | 700 / 700 (700) | 70 / 70 | 239 / 232 / 229 | 441.42 | 170.22 | 36.98 | 20.59 |
| grant-70-320 | 320 | 70 / 350 (70) | 26 / 35 | 28 / 21 / 21 | 33.49 | 7.67 | 3.14 | 2.20 |
| grant-128-320 | 320 | 128 / 700 (128) | 34 / 70 | 52 / 37 / 39 | 57.68 | 19.28 | 6.25 | 3.89 |
| quiet-50-320 | 320 | 180 / 350 (350) | 35 / 35 | 117 / 57 / 6 | 59.91 | 16.94 | 6.65 | 3.26 |

All fourteen rows use serial mocked inference. Largest observed wire: **19,021 bytes**; no ST12/EP32/six-reference/eight-body bound was raised. Maximum sampled heap/RSS across the shared process: **611.9 / 887.8 MiB**. These are samples after operations, not isolated per-run or continuous peaks. Detailed event counts, per-agent distribution/waiting definitions, memory counts, source privacy checks, payload/graph sizes and timings are in `tmp/phase4e2-behaviour-quality/benchmarks/benchmarks.json`.

The primary 320-tick row accepts 350 decisions across all 35 capable agents; the larger accepts 700 across all 70. The 160-tick rows legitimately leave three/five calls unused. The quiet world reaches tick 320 with **180 accepted inactive choices, zero model-authored content and 170 unused slots**. Grant-70 versus capacity-350 distributes calls **28/21/21** across timeline thirds and reaches tick 320; grant-128 versus capacity-700 distributes **52/37/39**. These lower grants involve 26/34 accepted agents respectively, not every configured agent. No coverage guarantee or artificial late message is asserted.

### Desktop and summary-only privacy

The production build `Z_GHbtA91PnAfSirO28u0` runs under the existing offline mock preload, dummy keys and native external-network block. Server preflights confirm fixture adapters, writable normal-user storage and `paidDispatch:false`. Both cohorts pass **1440?900 and 1920?1080**, using the ordinary Map ? Explore and Map | Knowledge Graph | Report workflow. Both main runs reach tick 320 with 350/700 accepted mocked decisions. Pause/resume/cancel, browser closure/background progression/reconnection, saved restoration, no duplicate navigation dispatch, filters/search/hidden-agent discovery, inspectors, drag/neighbour movement/settling, position retention and Report reconciliation pass. Page/console errors and tested horizontal overflow are zero.

Primary graph: **64 nodes / 515 edges**, initially **30 / 148 visible**, 34 background individuals retained for discovery. Larger graph: **114 / 1,062**, initially **30 / 133 visible**, 84 background individuals retained. These are actual ontology-inclusive UI graphs; benchmark graphs use an empty base ontology and are not interchangeable counts. Institutions/platforms/groups/aggregate cohorts remain prominent. No graph redesign was needed. Visual inspection of primary 1440 and larger 1920 graphs confirms the entity-first presentation; some label overlap remains an existing limitation. The larger Report screenshot retains aligned chronology/tables, but the full-page image is long and not a claim of compact report pagination.

The helper checks **109/281 response payloads**, plus client/restored storage and strict allowlisted schemas, with zero sentinels or private transcript-shaped structures detected. Each cohort saves **19 screenshots**. Relevant artifacts: `desktop/50/cohort-50-graph-1440.png`, `desktop/100/cohort-100-graph-1920.png`, both cohort Report screenshots and `desktop/{50,100}/result.json`, all under the ignored task directory. Local map tiles are mocked; no mobile or live browser provider test is performed.

### Protected real run, preservation and cleanup

The previous real 320-tick run independently passes exact full and checkpoint-tail replay with **350 records / 345 accepted / five retained failures**, keeping its original `conversation-menu-v2`. Full replay: **36,809.1551 ms**; checkpoint-tail: **727.8629 ms**. Archive SHA-256 `dde96a7f153c1a91464d3506ad310f9814e6ccc6f52fa6889782e406fcd554e7`; journal SHA-256 `df73abb9ea1c590a63d3ea7c3877297150520ab5965fe651615367f47dc01562`. Public-summary raw-string matches and network/provider calls are zero. This is restoration evidence, not a new live acceptance.

The initial task snapshot protects **404 files**, including accepted archives/journals/checkpoints and closed paid-evidence directories. Final comparison verifies **404 unchanged, zero missing/changed**. The original 148 historical snapshot hashes also pass. Previous reports, the scope manifest and earlier paid ledgers are unchanged; prior mocked desktop evidence was copied before its reusable harness outputs were refreshed. Source fingerprint remains `db7a912f2429a872bade6ad606b09a4d586b3dc0ee027e7566bb71f6ab813ef9`; HEAD remains `3f5bc764d5c1b71e42ffc9e877694e81fa309ea6`. No Git staging/commit/push, deployment, ACL/security change, secondary worktree access, package installation or credential inspection occurred.

| Final gate | Observed result |
|---|---|
| Full network-blocked Node suite | 1,386/1,386 PASS; zero failures/skips/cancellations |
| Main / strict affected TypeScript | PASS initially and in final post-desktop checks |
| Production build | PASS under offline guard; source/build unchanged afterwards |
| Whitespace | `git diff --check` exit zero |
| Qualifying historical replay | 20/20 PASS; pinned experimental failure remains unresolved |
| Benchmarks / behavioural integrations | 14/14 rows and both full-capacity integrations PASS |
| Desktop | Both cohorts at 1440×900 and 1920×1080 PASS |
| Protected records | 404/404 unchanged; original 148 hash gate PASS |
| Paid activity | Zero new Explore attempts, OpenRouter/Tavily requests, evaluator calls or armed paid ledgers |

The original development-roadmap byte prefix is preserved exactly; only the new phase entry is appended. Screenshot links: [primary graph at 1440](../tmp/phase4e2-behaviour-quality/desktop/50/cohort-50-graph-1440.png), [larger graph at 1920](../tmp/phase4e2-behaviour-quality/desktop/100/cohort-100-graph-1920.png). Full private synthetic fixture bodies remain in ignored server-side evidence, not this report.

Both verified task server PIDs (22884/34128) are stopped, with zero listeners on task port 3200. Helper-created browser contexts and the task-owned observer tab are closed; the pre-existing blank observer tab is left alone. Test/benchmark coordinator processes have exited. Accepted evidence is retained.

### Limits and recommended next action

- The exact five real rejected issue values remain unknown. Finite choices remove reproduced contract ambiguity, not all stochastic noncompliance or semantic misunderstanding. A fictional self-classified resolution does not prove the underlying problem was solved.
- EP32 lexical/topic retrieval can miss paraphrases or suffer broad-topic collisions. Context omission and byte packing remain finite; not every issue or group destination is always supplied. No semantic retrieval capability is claimed.
- A newly created group can legitimately remain empty, and this repair does not guarantee a follow-up opportunity for every group or manufacture a new-group notification. The observed real empty group's cause remains unproven.
- Mention-only geographic metadata and bounded windows cannot create absent local evidence or validate relevance/entailment. Date-only normalisation is not a known publication time. One search may still provide weak neighbourhood coverage.
- Large-world full/prefix-tail replay remains CPU-expensive. No claim is made about untested populations, larger capacities, standalone GIS/numerical CLI validation or realistic Singapore societal prediction.

Recommended next action: review this new contract and evidence, then separately authorise any bounded real-provider behavioural comparison. No live task is armed, and previous numerical budget remnants grant no authority. **Real-provider behavioural improvement remains NOT TESTED.**

### Exact changed-file inventory

- [docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md](../docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md)
- [docs/PHASE4E2_BEHAVIOURAL_QUALITY_REPAIR_AND_OFFLINE_ACCEPTANCE.md](../docs/PHASE4E2_BEHAVIOURAL_QUALITY_REPAIR_AND_OFFLINE_ACCEPTANCE.md)
- [lib/contracts/tests/behaviour-quality-context.test.ts](../lib/contracts/tests/behaviour-quality-context.test.ts)
- [lib/contracts/tests/behaviour-quality-fixture-selector.test.ts](../lib/contracts/tests/behaviour-quality-fixture-selector.test.ts)
- [lib/contracts/tests/behaviour-quality-grounding.test.ts](../lib/contracts/tests/behaviour-quality-grounding.test.ts)
- [lib/contracts/tests/behaviour-quality-policy.test.ts](../lib/contracts/tests/behaviour-quality-policy.test.ts)
- [lib/contracts/tests/behaviour-quality-private.test.ts](../lib/contracts/tests/behaviour-quality-private.test.ts)
- [lib/contracts/tests/behaviour-quality-transport.test.ts](../lib/contracts/tests/behaviour-quality-transport.test.ts)
- [lib/contracts/tests/phase4d-fixture.ts](../lib/contracts/tests/phase4d-fixture.ts)
- [lib/contracts/tests/phase4e2-issue-menu.test.ts](../lib/contracts/tests/phase4e2-issue-menu.test.ts)
- [lib/contracts/tests/phase4e2-memory-evidence.test.ts](../lib/contracts/tests/phase4e2-memory-evidence.test.ts)
- [lib/contracts/tests/planner-sengkang-integration.test.ts](../lib/contracts/tests/planner-sengkang-integration.test.ts)
- [lib/grounding/geographic-coverage.ts](../lib/grounding/geographic-coverage.ts)
- [lib/server/evidence/retrieval-query.ts](../lib/server/evidence/retrieval-query.ts)
- [lib/server/evidence/tavily.ts](../lib/server/evidence/tavily.ts)
- [lib/server/inference/dynamic-service.ts](../lib/server/inference/dynamic-service.ts)
- [lib/server/inference/planner.ts](../lib/server/inference/planner.ts)
- [lib/server/inference/social.ts](../lib/server/inference/social.ts)
- [lib/server/society/service.ts](../lib/server/society/service.ts)
- [lib/society/context-capacity.ts](../lib/society/context-capacity.ts)
- [lib/society/decision-contract.ts](../lib/society/decision-contract.ts)
- [lib/society/decision-menu.ts](../lib/society/decision-menu.ts)
- [lib/society/deep-context.ts](../lib/society/deep-context.ts)
- [lib/society/deep-scheduler.ts](../lib/society/deep-scheduler.ts)
- [lib/society/evaluation.ts](../lib/society/evaluation.ts)
- [lib/society/hybrid.ts](../lib/society/hybrid.ts)
- [lib/society/intelligence.ts](../lib/society/intelligence.ts)
- [lib/society/issue-menu.ts](../lib/society/issue-menu.ts)
- [lib/society/memory-presentation.ts](../lib/society/memory-presentation.ts)
- [scripts/testing/phase4e-fixture.ts](../scripts/testing/phase4e-fixture.ts)
- [scripts/testing/phase4e2-behaviour-integration.ts](../scripts/testing/phase4e2-behaviour-integration.ts)
- [scripts/testing/phase4e2-live-audit.ts](../scripts/testing/phase4e2-live-audit.ts)
- [scripts/testing/phase4e2-memory-evidence.ts](../scripts/testing/phase4e2-memory-evidence.ts)
- [scripts/testing/phase4e2-provider-preload.mjs](../scripts/testing/phase4e2-provider-preload.mjs)
- [scripts/testing/tsconfig.phase4d.json](../scripts/testing/tsconfig.phase4d.json)

These 35 repository paths comprise the two requested documents, production helpers/strict selector integration, tests and offline instrumentation. Ignored task evidence/adapters are separate and contain no new paid ledger; preservation/adapter/changed-file manifests are retained in `tmp/phase4e2-behaviour-quality/`. No earlier acceptance report is rewritten.

Final independent verdicts: **issue reliability IMPLEMENTED + OFFLINE PASS; episodic presentation/measurement IMPLEMENTED + OFFLINE PASS; private coordination IMPLEMENTED + OFFLINE PASS; local grounding IMPLEMENTED + OFFLINE PASS; overall offline architecture PASS; real-provider behavioural improvement NOT TESTED.**
