# Citizen-menu reliability and non-destructive storage admission

Final offline acceptance: **PASS**. Genuine DeepSeek compliance: **NOT TESTED**.

Implemented a versioned finite citizen evidence menu and a fixed, bounded additional session namespace. Existing simulation capacity, citizen selection, data, historical semantics and paid authority remain unchanged.

## Baseline and evidence boundary

The main worktree started on `master`, HEAD `5399e12c065e46806785146c79b7131e0668ab99`, with existing modified and untracked work. The original private inventory was 62 accepted archives, 64 session indexes, 64 journals and 24 materialized checkpoints. No original record was removed to make capacity.

The preceding `hybrid-map-v2` live report records tick 17/320, 24 social dispatches, 15 accepted decisions, eight returned rejections and one interrupted request. Two returned rejections concerned `decision.factualClaims`; six concerned `decision.issueEvidence`. Rejected response bodies were not retained. Their exact wording and individual causal errors remain unknown. The closed authority's USD 0.02 unknown reservation remains outstanding; this offline task cannot reconcile it to zero or authorize another request.

Task evidence is in the ignored `tmp/citizen-menu-storage-20261101/` directory. Its baseline records 1,426 protected files totaling 2,387,587,016 bytes. The snapshot includes official/synthetic data, accepted historical/private records, earlier task evidence, reports and paid records. The initial dirty source files were separately copied before implementation.

## Investigation findings

| Finding | Classification | Narrow response |
|---|---|---|
| The v4 schema permits an issue basis from a global list, while the decoder requires a basis belonging to the particular selected issue choice. | Confirmed model-interface weakness | Bind action, subject, basis, criterion and required memories into a finite evidence option. |
| Null/unrenderable facts and unusable closure choices can be presented even when strict downstream checks cannot accept them. | Confirmed model-interface weakness | Filter before dispatch; offer closure only with an eligible newer accessible answer or a satisfied explicit criterion. |
| Exact-quote copying, minimum word count and action-specific lexical requirements are not fully disclosed in the prior model context. | Confirmed model-interface weakness | Publish bounded rules; extract only an actually eligible literal span from independently authored output. |
| A schedule keyword such as “hours” conflicts with the existing conservative numerical/text guard. | Confirmed model-interface weakness | Disclose legal subject vocabulary and the full forbidden numerical/unit terms; omit wholly unusable subject options. |
| Trusted fact suffixes can push otherwise schema-valid prose past the final 1,000-character bound. | Confirmed interface boundary defect | Reserve suffix headroom consistently in context, schema and decoding. |
| The old citizen system message begins with a v3-only instruction and then adds v4 requirements. | Confirmed model-interface weakness | Give the new policy one coherent system instruction; retain all old messages unchanged. |
| The two factual and six evidence rejections resulted from any particular wording above. | Unresolved | Do not reconstruct rejected provider responses or infer a live failure rate from synthetic fixtures. |
| The old capacity count is an admission-policy ceiling, with a race between checking distinct starts and creating indexes. | Confirmed admission limitation | Use immutable exclusive-create slot claims before provider work. |
| A journal may exist after interruption before its index is created. | Confirmed recovery boundary | Preallocate and bind the session UUID; recover the same verified journal without initialization. |
| Ordinary checkpoint replacement temporarily creates a `.pending` file during rename retries. | Confirmed concurrent-write behavior | Count it within finite bounds; do not mistake its presence alone for corruption. |

## Versioned decision contract

New ordinary citizen-grounded hybrid Explore initialization selects `conversation-menu-v5` with `citizen-menu-v2`. The existing `citizen-grounded-v1`, personality contract, population selection, clock, pacing, ST12/EP32, six selected memories, eight bodies and 24 KB context remain unchanged. Frozen v4 worlds retain `conversation-menu-v4` and their original system/schema/decoder interpretation. Trusted direct service fixtures continue to default to v4 unless they explicitly select v5; the browser cannot supply this policy selector.

The new wire output selects `choiceId`, `stanceId`, `factIds` and optional `issueEvidenceId`, plus ordinary authored text, motivation, optional recalls and discussion tags. It does not regenerate an issue choice, source basis, criterion or evidence quotation independently. At most 24 finite evidence options are included. Their deterministic keys bind the current actor/context and source/issue/fact state. They are menu keys, not authorization tokens: the server rebuilds and revalidates them.

For a deliberate issue, the server finds an eligible exact substring of the agent's own authored output under the existing evidence assessor. It never manufactures a quotation, repairs invalid prose into a message, changes the selected issue kind or silently converts a rejected issue into an ordinary reply. Missing eligible prose remains a rejection. Ordinary discussion, reading, inactivity and naturally unresolved issues remain legal.

The final decoder still applies the frozen v4 factual/evidence gate and current authoritative reducer permissions. Numerical and personal identity assertions still require trusted fact references. Even ambiguous uses of forbidden number/time words remain rejected; these conservative restrictions are now explicit. The application renders exact selected facts with synthetic/modelled attribution. Schema text headroom covers the final suffix; unavailable facts cannot be selected.

Resolution remains an owner action, supported by an eligible recorded answer or an explicitly satisfied supplied predicate. It is labelled owner-reported unless the deterministic criterion establishes satisfaction. Lexical eligibility is not semantic proof, real-world closure, consensus or causal impact.

Primary implementation locations: `lib/citizen-grounding/decision-v5.ts`, `lib/society/{intelligence,decision-menu,decision-contract,hybrid,context-capacity,engine}.ts`, `lib/server/inference/social.ts` and `lib/server/society/{service,public-service}.ts`. Memory accounting includes the new contract without counting fixed issue bindings as additional voluntary recall.

## Privacy-safe rejection observations

Only v5 opts into a separate `<session UUID>.rejections-v1` sidecar. It records a hashed context identity and closed diagnostic enums: rejection family, stage, field, finite subreason, offered-action/evidence booleans and bounded action/issue-kind classifications. It does not retain submitted identifiers, raw rejected output, profiles, memories, private messages, hidden prompts or credentials.

The parser rejects unknown fields and values. Rows are at most 1 KB and a sidecar at most 1 MiB. Exclusive ownership, fsync, regular-file checks and torn-tail rejection bound concurrent writes. Contention or observation failure drops the optional observation; it cannot change the accepted decision, journal, usage, provider settlement, retry behavior or replay. Synchronous and asynchronous observer failures are contained.

An unrecognized evidence key is reported as unoffered; the observer does not claim it can distinguish an invented key from a previously offered stale key without retained proof. Existing historical journals are unchanged. These observations improve structural diagnosis, not recovery of unavailable historical response bodies.

Implementation: `lib/society/social-diagnostics.ts`, `lib/server/society/rejection-observations.ts` and the v5-only transport/service adapter.

## Non-destructive storage policy

`storage-admission-v1` adds exactly one fixed `session-store-v2` child beneath the trusted private storage base. It has 16 non-reusable slots. There is no automatic rollover, eviction, slot recycling or capacity enlargement. A claim does not grant inference authority.

```text
<trusted private storage base>/
  accepted-private/             original retained archive store
  social-sessions/              original retained journals/indexes/checkpoints
  session-store-v2/
    admission/                 fixed slot claims, run bindings and initialization intents
    accepted-private/          newly admitted accepted archives
      jobs/                    existing local coordinator metadata
    social-sessions/           new journals/indexes/checkpoints and bounded observations
```

Before retrieval or inference, exclusive `wx` creation and fsync reserve an immutable attempt/request binding and session UUID. Contenders inspect fixed slots in the same order; a loser rereads the occupied slot before advancing. Same-attempt reuse, malformed/partial claims, duplicate run/session bindings and crossed identities fail closed. The legacy scan is bounded to 64 archive envelopes of at most 3 MiB and checks retained attempt identities and existing hybrid attempt claims. Missing pre-archive history is not invented, and separate paid authority remains stricter.

Claims stay consumed after clarification, failure, cancellation or interruption. A run binding precedes personality initialization, and an immutable initialization intent prevents regenerating it after an ambiguous failure. If a verified journal exists without its index, restart reconstructs only the index for the original UUID. If initialization intent exists without a valid journal, initialization cannot silently run again.

Original archive/session roots become read-only application fallback. Token-authorized saved-world summaries remain available, with a bounded `historical-read-only` disposition and disabled advancement controls. Passive historical reads do not recover or append journals. Duplicate old/new locations fail closed. This also means the old paused paid society is retained for inspection, not resumed under this task or automatically migrated.

New storage permits at most 256 files, eight directories, depth three and a 3 GiB apparent-byte inspection threshold. It rejects symlinks/special files and retained `.incomplete-` forensic journal evidence. Ordinary pending replacements remain preserved and consume the same limits. Checks run before provider stages and further progression/checkpoint writes. Growth/forensic blocks still permit passive safe summaries when archive and binding identities verify. Corrupt/partial immutable claims or ambiguous bindings fail closed for the affected namespace; they are not automatically repaired or reclaimed. Original legacy summaries use their separate read-only lookup.

The threshold is not an OS disk quota or preallocated space reservation. Sixteen maximum steady core records allow 2,608 MiB for journals, materialized checkpoints and archives, plus bounded metadata/observations. In-flight bounded journal completion and pending checkpoint/archive replacements can temporarily overlap before the next inspection. Existing per-file limits remain binding. Exhaustion stops further work without deleting evidence. A future retention decision is still required once these 16 claims or ancillary limits are consumed.

Implementation: `lib/server/society/storage-admission.ts`, service/public-service routing, public parser and observer/control guards. No actual original records were moved or edited to demonstrate admission; allocation/concurrency/fault tests use isolated synthetic storage.

The historical inventory also needed a narrow compatibility repair: its old basename-only path extraction could misroute a protected archive from the new namespace, and its discovery loop scanned only the original root. `scripts/testing/historical-namespace-inventory.ts` now keeps exact namespace-qualified locations, validates fixed claims and bindings, reports orphan/consumed claims honestly, and performs pure full/checkpoint-tail replay for new-namespace worlds. Missing/crossed/duplicate identities, hash mismatches and forensic artifacts fail closed. The existing mandatory legacy selection and pinned experimental classification stay unchanged. Nonmandatory legacy preservation coverage is explicitly `NOT_RUN` for fresh replay, rather than inheriting an unsupported “verified separately” label.

## Verification

| Executed gate | Result | Evidence |
|---|---|---|
| Full network-blocked Node suite | 1,792 passed; zero failed, cancelled or skipped | `gates/full-tests.log` |
| Application TypeScript | PASS | `gates/typescript.log` |
| Strict affected-module TypeScript | PASS | `gates/typescript-strict.log` |
| Additional strict new fixture/worker TypeScript | PASS | `gates/strict-new-fixtures.log` |
| Production build | PASS, 84.6 seconds | `gates/build.log` |
| Production asset traces | PASS; no private state or retired dataset paths | `build-assets.json` |
| Whitespace | PASS after final documentation | `gates/whitespace.log` |
| Source fingerprint before/after gates | Identical: `05401d9b0e4baec8160cc48fd49df8e4c098ae3712b0f9aedebf2adb73750429` | `gates/source-before.json`, `gates/source-after.json` |
| Build identity | `h4d--tG5AH-dqbLWyvNtQ` | `gates/source-after.json` |
| Official/synthetic/transport identity and calibration | PASS; 10,000 stable citizens; 1,369 assessed calibrations within tolerance, 34 unassessed, zero failed | `dataset-verification.json` |
| Standard desktop 50/35/320/350 and 100/70/320/700 | PASS at both 1440×900 and 1920×1080; all lifecycle/Graph/Report/privacy checks, zero page/console errors | `desktop/cohort-50-result.json`, `desktop/cohort-100-result.json` |
| Plotted MRT ordinary Explore, 35/70 mocked personalities | PASS for both cohorts/viewports; v5 prefixes, deterministic v2 interpretation, Graph/Report binding and restoration | `desktop/hybrid-50-result.json`, `desktop/hybrid-100-result.json` |
| Nonzero v5 materialized checkpoint tails | PASS, 8 accepted copied fixture records, checkpoint at 4 plus 4 tail records, both cohorts | `checkpoint-tail/results.json` |
| Original real v4 retained prefix | PASS; tick 17, 15 accepted/9 failed records; exact genesis/materialized restoration, unchanged files and safe projection | `original-prefix-audit.json` |

The browser 100-agent workflow completed its simulation in 481.1 seconds, within its unchanged 600-second test bound; the 50-agent workflow took 175.8 seconds. A separate 300-second MCP communication timeout occurred during the larger browser test. The original browser function continued; its final successful result was retrieved from the same page. No replacement Explore or relaxed assertion/timeout was used. UI v5 runs were intentionally cancelled short prefixes: they each replayed from genesis and restored their saved public summaries, but had no materialized checkpoints. Their checkpoint-tail result is **NOT APPLICABLE**, distinct from the positive materialization/tail fixtures and full-capacity CLI checks.

The original prefix replay did not settle provider accounting. Its journal has no pending reservation, while the independent closed paid authority's unknown USD 0.02 remains protected and unreleased.

Focused RED/GREEN evidence includes finite evidence selection, exact span binding, invalid facts/numbers/identity prose, null/stale/private sources, ordinary/inactive alternatives, text headroom, vocabulary conflicts, Unicode identity, corrected optional recall and observer failure isolation. Production-context tests exercise actual dataset/profile builders, context packing, issue saturation, private permission removal and exact decision replay.

Storage evidence includes a full original 64-slot fixture, a new reserved session, true child-process races, duplicate identities, partial/corrupt claims, fsync faults, journal-before-index restart without regeneration, bounded exhaustion before provider work, historical read-only restoration and checkpoint replacement racing an observer/new admission.

The completed final acceptance evidence follows. No unexecuted gate is claimed as passed.

Focused and full-capacity fixture results: the combined focused set passed 76/76; namespace inventory tests passed 8/8. The 50/35 v5 fixture completed tick 320 with 350/350 accepted mocked decisions and all 35 capable agents participating. Its full genesis and checkpoint-tail replays were exact, its maximum encoded context was 24,000 bytes, and its journal/checkpoint were 21,721,563 / 11,561,154 bytes. Total observed execution/verification time was 479.5 seconds, including 136.5 seconds of full replay. These scripted choices demonstrate capability, not real-model behaviour.

The first bounded-concurrency full run reported 1,783 passes and one failure: a process-local-root test still looked for newly created files under the former default directory. The assertion was updated to require the current namespace, its active policy DTO, actual archive/journal files and absence of writes to legacy directories. Its focused rerun and the expanded trace-exclusion test passed 2/2. The earlier default-concurrency attempt was stopped for resource contention; no completion verdict is assigned to that aborted run. No assertion or timeout was relaxed.

## Evidence boundary and next action

No OpenRouter, Tavily, paid evaluator, live society resume, paid retry or new paid authority is authorized or used in this task. Mocked fixture acceptance establishes interface/storage capability, not genuine DeepSeek compliance, substantive memory use or behavioural improvement. Any real-provider comparison requires separate explicit authorization and a new independent authority after completed offline verification.

## Final acceptance

The final source passed **1,792 network-blocked tests**, both TypeScript gates, additional strict new-fixture typing, production build, production trace inspection and whitespace checks. Source/build identities appear in the table above and `final-acceptance.json`.

### Focused RED/GREEN evidence

The first executions below captured missing guarantees before their fixes. Suites expanded during implementation, so RED and GREEN totals are not always identical; all cases were retained in the final full suite. Logs contain synthetic fixtures, not recovered rejected live outputs.

| Area | Initial RED | Subsequent GREEN | Evidence under task directory |
|---|---:|---:|---|
| Finite citizen menu | 11 failed / 12 tests | 18 / 18 passed | `menu/red.log`, `menu/green-second.log` |
| Production structured transport | 4 failed / 4 tests | 20 / 20 passed | `menu/transport-red.log`, `menu/transport-green.log` |
| Required-binding recall accounting | 1 failed / 16 tests | 22 / 22 passed | `menu/recall-red.log`, `menu/recall-green.log` |
| Atomic allocation | 6 failed / 6 tests | 6 / 6 passed | `storage/red-allocation.log`, `storage/green-allocation.log` |
| Storage integration and recovery | 6 failed / 7 tests | 47 / 47 passed | `storage/red-integration.log`, `storage/green-final-regressions.log` |
| Concurrent pending replacement | 1 failed / 14 tests | 26 / 26 passed | `storage/red-active-pending.log`, `storage/green-final-focused.log` |
| Namespace historical inventory | 6 failed / 6 tests | 8 / 8 passed | `storage/red-historical-helper.log`, `storage/green-historical-helper.log` |
| Closed diagnostic contract | 1 failed / 1 test | 4 / 4 passed | `diagnostics/01-contract-red.log`, `diagnostics/02-contract-green.log` |
| Private observation sidecar | 1 failed / 1 test | 11 / 11 passed | `diagnostics/03-observation-red.log`, `diagnostics/05-observation-green.log` |

### Fourteen-row benchmark matrix

All fourteen established configurations were executed afresh and serially. Each passed exact genesis replay, cold restoration and privacy checks. Times include service, mocked inference, durable writes and verification; they do not measure real-provider latency. MiB uses 1,048,576 bytes. Legacy profiles without materialized checkpoints use full-journal cold restoration, not an unexecuted materialized-tail check.

| Profile | Active / capable | Horizon / reached | Accepted / grant | Seconds | Journal MiB | Materialized MiB |
|---|---:|---:|---:|---:|---:|---:|
| historical | 24 / 4 | 80 / 80 | 8 / 8 | 2.1 | 16.25 | — |
| quick-50 | 50 / 35 | 80 / 80 | 64 / 64 | 10.9 | 2.28 | — |
| quick-100 | 100 / 70 | 80 / 80 | 128 / 128 | 42.9 | 4.56 | — |
| deep-50-80 | 50 / 35 | 80 / 80 | 350 / 350 | 76.3 | 17.14 | 8.70 |
| deep-100-80 | 100 / 70 | 80 / 80 | 700 / 700 | 324.7 | 34.34 | 18.31 |
| multi-50-160 | 50 / 35 | 160 / 160 | 347 / 350 | 98.5 | 17.74 | 9.25 |
| multi-100-160 | 100 / 70 | 160 / 160 | 695 / 700 | 341.8 | 35.20 | 18.81 |
| multi-50-320 | 50 / 35 | 320 / 320 | 350 / 350 | 109.0 | 18.02 | 9.60 |
| multi-100-320 | 100 / 70 | 320 / 320 | 700 / 700 | 383.8 | 35.96 | 19.59 |
| stress-50-672 | 50 / 35 | 672 / 672 | 350 / 350 | 167.8 | 18.52 | 10.32 |
| stress-100-672 | 100 / 70 | 672 / 672 | 700 / 700 | 450.5 | 36.98 | 20.59 |
| grant-70-320 | 50 / 35 | 320 / 320 | 70 / 70 | 31.0 | 3.14 | 2.20 |
| grant-128-320 | 100 / 70 | 320 / 320 | 128 / 128 | 52.4 | 6.25 | 3.89 |
| quiet-50-320 | 50 / 35 | 320 / 320 | 180 / 350 | 61.2 | 6.65 | 3.26 |

Evidence: `benchmark/benchmarks.json` and `benchmark-run.log`. The existing benchmark implementation was copied into ignored task evidence with only output/import-path changes; previous benchmark evidence was not overwritten. Reduced-grant prefixes are reported at their actual tick. Quiet/unused-budget outcomes remain valid; these scripted fixtures do not establish real-model engagement.

### New-policy and recovery coverage

| Cohort | Accepted / capacity | Final tick | Participants | Full replay seconds | Cold restore seconds | World MiB |
|---|---:|---:|---:|---:|---:|---:|
| 50 / 35 | 350 / 350 | 320 | 35 | 136.5 | 5.4 | 11.03 |
| 100 / 70 | 700 / 700 | 320 | 70 | 303.7 | 7.9 | 22.54 |

Both fixtures used actual local citizen/transport data, mocked stable personalities, v5 serialization, the real serial coordinator, durable journals and bounded public projections. The additional checkpoint fixture copies eight already accepted mock records into fresh protocol-only stores, materializes after four and replays four later records. Source records are unchanged. This tests recovery, not additional model generation.

### Historical inventory and preservation

Mandatory qualifying strict replay: **20/20 PASS**. Complete inventory: **COMPLETE_WITH_CLASSIFIED_UNRESOLVED**. The approved experimental `f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json` remains `pre-final-mocked-development-artifact`, nonqualifying and **unresolved-SOCIAL_STALE** at record zero/tick one. Its pinned content SHA-256 remains `f509b72702238ce52d3feb6653b28ca68f7151796f5e39d88834160902f503ca`. It was not replayed successfully, skipped internally, rewritten or given guessed scheduler semantics.

The original 148 historical snapshot files remained unchanged. The broader preservation check verified **1,426 files / 2,387,587,016 bytes**, with no mismatches, missing or unexpected original-store files. Original inventory remains **62 archives / 64 indexes / 64 journals / 24 materialized checkpoints**. No default `session-store-v2` directory or production admission claim was created merely to demonstrate capacity. The new policy provides sixteen future claims after its normal storage preflight; the original full sixty-four-slot store remains retained/read-only.

All original archives remain in the namespace-qualified inventory. Nonmandatory newer legacy artifacts are labelled preservation-only / fresh replay NOT_RUN; the separately checked latest v4 prefix is identified above. No successful fresh replay is inferred for artifacts outside executed coverage. Evidence: `historical/historical-replay.json`, `original-prefix-audit.json` and `preservation-final.json`.

### Independent verdicts and limitations

| Area | Verdict |
|---|---|
| Citizen-menu alignment | IMPLEMENTED + OFFLINE PASS |
| Safe structural rejection diagnostics | PASS within tested surfaces |
| Bounded storage admission | IMPLEMENTED + OFFLINE PASS |
| Concurrent claims / tested restart recovery | PASS |
| Mandatory qualifying historical replay | PASS; pinned experimental failure preserved |
| Privacy, dataset and paid-evidence preservation | PASS within tested boundaries |
| Overall offline architecture | PASS |
| Genuine DeepSeek compliance or behavioural improvement | NOT TESTED |

Remaining limits:

- Numerical/personal-prose guards remain deliberately conservative. Lexical issue eligibility is not semantic truth verification; owner-reported closure is not real-world resolution.
- Unknown evidence keys cannot be classified as stale versus invented without retained proof. Optional sidecar observations can be dropped on contention/fault and are never authoritative.
- Sixteen claims are permanent, including failed/clarification submissions. No automatic rollover, deletion, recycling or long-term retention policy was introduced.
- Missing-index recovery is proven; corrupt claims, ambiguous bindings, torn existing pointers or initialization intent without a valid journal stop safely for review.
- Original accepted archives restore read-only. Automatic import of raw historical browser worlds into the frozen store is disabled; those local records are not deleted or silently migrated.
- The 3 GiB threshold is metadata admission control, not preallocated disk space. Bounded in-flight writes can overlap before the next inspection.
- Real-model performance, faithfulness, issue quality and meaningful memory use require a separately authorized evaluation. A fresh compatible task authority and current storage/source preflight are required; old closed authorities cannot be reused.

New paid usage: **zero OpenRouter calls, zero Tavily requests and zero paid evaluators**. Original closed ledgers were neither reset nor reopened; the interrupted prior request retains its conservative USD 0.02 unknown reservation. Task servers were stopped with ownership checks and task browser contexts closed; pre-existing user processes/pages were preserved.

### Exact task file inventory (40)

- `components/communication-report.tsx`
- `components/use-society.ts`
- `docs/CITIZEN_MENU_RELIABILITY_AND_STORAGE_ADMISSION.md`
- `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`
- `docs/superpowers/plans/2026-11-01-citizen-menu-storage-admission.md`
- `lib/citizen-grounding/decision-v5.ts`
- `lib/contracts/tests/citizen-menu-v5.test.ts`
- `lib/contracts/tests/citizen-v5-production-context.test.ts`
- `lib/contracts/tests/citizen-v5-transport.test.ts`
- `lib/contracts/tests/helpers/citizen-v5.ts`
- `lib/contracts/tests/historical-namespace-inventory.test.ts`
- `lib/contracts/tests/hybrid-asset-tracing.test.ts`
- `lib/contracts/tests/hybrid-public-explore.test.ts`
- `lib/contracts/tests/phase4d-storage.test.ts`
- `lib/contracts/tests/rejection-observations.test.ts`
- `lib/contracts/tests/social-diagnostics.test.ts`
- `lib/contracts/tests/storage-admission-client.test.ts`
- `lib/contracts/tests/storage-admission-integration.test.ts`
- `lib/contracts/tests/storage-admission-v1.test.ts`
- `lib/question-simulation/continuation.ts`
- `lib/question-simulation/job.ts`
- `lib/question-simulation/public-session.ts`
- `lib/server/inference/social.ts`
- `lib/server/society/public-service.ts`
- `lib/server/society/rejection-observations.ts`
- `lib/server/society/service.ts`
- `lib/server/society/storage-admission.ts`
- `lib/society/context-capacity.ts`
- `lib/society/decision-contract.ts`
- `lib/society/decision-menu.ts`
- `lib/society/engine.ts`
- `lib/society/hybrid.ts`
- `lib/society/intelligence.ts`
- `lib/society/public-contract.ts`
- `lib/society/social-diagnostics.ts`
- `scripts/testing/citizen-menu-acceptance.ts`
- `scripts/testing/historical-namespace-inventory.ts`
- `scripts/testing/phase4e2-historical.ts`
- `scripts/testing/phase4e2-memory-evidence.ts`
- `scripts/testing/storage-admission-worker.ts`

This inventory describes the task delta from the initial dirty worktree, not all earlier unstaged work. Ignored task logs, screenshots, private synthetic fixtures and evidence scripts remain in `tmp/citizen-menu-storage-20261101/`. Previous acceptance reports remain unchanged. Changes are unstaged and uncommitted.

Recommended next action: separately authorize a capped real DeepSeek v5 comparison with a new authority and fresh storage preflight. Do not resume or retry the closed interrupted attempt.
