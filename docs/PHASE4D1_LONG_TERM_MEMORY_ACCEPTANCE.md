# Phase 4D.1 ? Long-term episodic memory acceptance

**Overall PASS. Memory implementation PASS. Real-model memory-use assessment PASS for the observed isolated fixture.** This is one exploratory matched pair, not evidence of statistically reliable improvement or general semantic recall.

Date: 31 October 2026, Asia/Singapore. Branch `master`; HEAD `d1710eb9d79a3f85ade27a6cfad730b06e51fbdb`. Existing uncommitted storage repair and Phase 4D live-acceptance work was preserved. Earlier reports were reviewed and retained. No separate Phase 4D research file was assumed.

## Architecture audit and diagnosis

The ordinary configuration remains 24 active agents, four selected model agents, eight social opportunities, 80 steps, 12 short-term memories and 32 episodic entries. This task made no population, scheduler, inference-routing or retrieval-policy change.

The actual lifecycle is `act` ? bounded short-term experience ? `rememberExperiences` ? `experiencedMemories` ? `buildDecisionContext` ? indexed decision menu ? existing social transport ? strict decoder/parser ? `finishDecision` ? private accepted record/replay.

- Successful read/authored reducer experiences enter short-term memory. Selected agents index actual event/item references, time, counterparty, topics, importance and membership-recheck metadata; the index does not duplicate message bodies.
- Retention prioritises open issues (+20), direct replies (importance 9), initial accepted-action seeds (8), social-model contributions (7), own authored items (4), then other encounters (2), with deterministic recency/ties. These are synthetic engineering rules, not calibrated human psychology. An initial seed's connection to an accepted action does **not** independently verify its assertion.
- Retrieval combines legitimate short-term and indexed experiences, rechecks access, then ranks lexical overlap with the goal/latest encounter, importance, open issues and deterministic recency. Topic IDs and counterparty metadata are stored but unused in retrieval ranking; this is not semantic search. The lexical token rule uses ASCII words of four or more letters.
- Latest and cross-platform exposures receive reserved consideration. Final context remains at most six memories, eight ancestry-complete items and 24 KB. Oversized contexts fail; menu trimming does not silently truncate message text into a different remembered statement. Item/ancestry bounds can prevent a ranked memory's primary content from being supplied.
- `recallIds` are optional model choices. Effective `memoryIds` also include required target and stance bindings. The audit distinguishes optional recall beyond **both** bindings from automatic exposure references.
- Private originals require current membership and the current join point. Leaving retains stored references but denies retrieval; rejoining does not restore forbidden earlier history. Authorised forwarding exposes the actual public copy, not access to its hidden original. No-forwarding groups deny sharing.

**Confirmed finding:** the previously unobserved long-term path works. The earlier live runs had insufficient short-term eviction pressure; their lack of episodic-only recall was not a demonstrated defect.

**Confirmed limitation:** five high-importance direct replies can displace an older relevant experience when later wording shares little vocabulary. The paraphrase fixture retains the older episode but does not retrieve it. That is a documented `episodic-v1` ranking limitation, not a passed semantic-retrieval test. No corrective ranking change was necessary to verify the working long-term path; future topic/diversity changes need their own version and matched tests. Embeddings are not yet justified.

## Authoritative offline stress tests

The main fixture uses the real society reducer, context builder, menu decoder, validator and accepted-action application. It records one earlier fictional payroll-related encounter once, then 14 unrelated encounters, five distinct direct replies and a later relevant question. The old item is never re-read to restore it artificially. Here ?long-term? means beyond the rolling short-term window; no claim about months or years of human memory is made.

| Observation | Result |
|---|---|
| Explicit reducer commands / final tick / total events before decision | 43 / 43 / 49, including six genesis events |
| Short-term entries / experiences evicted from short-term | 12 / 12 |
| Episodic entries before ablation | 24, within 32 |
| Accessible episodic-only candidates in memory-present arm | 12 |
| Episodic-only selected / referenced / primary content supplied | 1 / 1 / 1 |
| Final memory-present context | Six memories, eight items, 12,052 bytes |
| Final control context | Six memories, seven items, 11,649 bytes |
| Lexical fixture | Old experience retrieved after genuine short-term eviction |
| Wording-different fixture | Old experience retained but omitted by ranking; limitation recorded |
| Competing memories | Actual different-age/importance encounters; bounded deterministic selection |
| Private access | Outsider, pre-join, post-leave and pre-rejoin history denied; permitted new history readable |
| Forwarding | Recorded public copy readable; original inaccessible and invalid as a target |
| Persistence | Explicit command journal survives a separate Node process and reproduces exact world/context hashes |

Existing Phase 4D tests additionally exercise more than 32 experiences, bounded retention, explicit issue lifecycle and ordinary scheduler replay. Concerns are not silently promoted to commitments.

### Ablation and its limits

Both conditions start with the same legitimate recorded history, agent, goals, state and current question. Only the old episodic entry is removed from a **server-side control clone after short-term eviction**. Original events/items/genesis and short-term memory remain unchanged.

Rebuilding each valid context changes `items`, `memories` and `menu`: the old memory and item disappear, one competing memory enters, and indexed choice/reference IDs can change. Context equality is therefore not claimed. The distinctive old detail is absent from the control's encoded input and is absent from the shared goal/current question. This is a memory-wiring ablation with a stochastic action-choice confound, not a clean estimate of causal effect.

### Replay distinction

The stress fixture deliberately records explicit `act` commands rather than pretending they were generated by the ordinary scheduler. Its versioned **fixture-only command journal** replays those commands through the authoritative reducer, checking chronology, event IDs and digest. Accepted model decisions then replay through ordinary `finishDecision`. Production `restoreSociety(saveSociety(...))` is deliberately tested to reject these manually injected trajectories; it is not misrepresented as supporting arbitrary external commands.

Separately, the four accepted historical production worlds replay through their actual journal/policies and production save/restore:

| World | Events | Social decisions | Exact replay / unchanged archive+journal |
|---|---:|---:|---|
| Phase 4C eldercare | 773 | 8 | PASS |
| Phase 4C workweek | 691 | 8 | PASS |
| Phase 4D workweek | 536 | 8 | PASS |
| Phase 4D eldercare | 536 | 8 | PASS |

All 55 previously enumerated historical top-level record hashes also remain unchanged. No journal migration, accepted-plan hash change or decision regeneration occurred.

## Safe retrieval diagnostics

An optional observer on `buildDecisionContext` emits a detached DTO: actor/event/item IDs, policy/tick, counts, scores, lexical-match counts and bounded rejection labels. No bodies, goals or remembered excerpts are emitted. With or without observation, canonical contexts and world state are identical. Nothing is added to persisted contexts, public summaries or replay identities.

Stages are reported separately: stored ? candidate ? ranking-selected ? reference included ? primary content included. Rejections distinguish permission, missing item, unsupported kind, rank bound and neutral `item-filtered` (ancestry/access or item limits; not proof of capacity alone). A regression covers a withdrawn ancestor. The evaluation separately records explicit optional recall and substantive-use cues. None of these metrics alone proves cognition.

## Real DeepSeek matched evaluation

Storage admission passed under normal Windows user `tetas` with the **original accepted-private and social-sessions roots**, no trusted-root override. Durable probes ran before any paid request. The fixture's own raw checkpoint is under ignored `tmp/phase4d1/private`, separate from ordinary production history. No security settings or credentials changed.

The existing `createSocialTransport` was used directly by a server-side CLI, not a new endpoint. Exact model `deepseek/deepseek-v4-flash-0731`, DigitalOcean-only routing, fallback disabled, required parameters, reasoning disabled/excluded, strict schema, serving identity, 600 output-token/30-second/24-KB limits remained in force.

| Condition | Accepted action | Earlier episode supplied | Optional older recall beyond target/stance | Protected semantic finding |
|---|---|---|---|---|
| A ? memory present | Comment on current question | Yes; episodic-only | Yes | Accurately incorporated the distinctive prior pay-protection detail and used it as a condition relevant to the present approval question |
| B ? memory absent | Reply to another legitimate visible item | No | No | Did not invent the distinctive prior detail; chose another accessible discussion target |

The A decision voluntarily selected the older memory; it was not required by its current target or stance. It connected the accurate earlier detail to the current question, rather than merely returning a memory ID. B's different target is valid and is a confound, not evidence that memory alone caused a particular behavioural change. No action or model output was rewritten, substituted or forced.

Assessment uses protected records and safe predicates for correct specific detail, pay meaning, approval condition, current target, authored action and optional older reference. These predicates are an interpretable local check, not a blinded semantic evaluator. No dialogue or private detail is quoted here. One successful targeted recall supports **observed substantive use**, not universal reliability or proof of human-like memory.

Both accepted contexts, outputs and resulting states replay exactly in a separate invocation with external networking blocked; no additional inference occurs. Paid work stopped after the pair because further calls were unnecessary.

### Durable accounting

| Request | Input tokens | Output tokens | Reported USD | Duration | Status |
|---|---:|---:|---:|---:|---|
| A | 3,303 | 170 | 0.000433517 | 2,908 ms | Accepted, serving identity verified |
| B | 3,198 | 154 | 0.000417214 | 2,990 ms | Accepted, serving identity verified |
| **Total** | **6,501** | **324** | **0.000850731** | **5,898 ms provider-stage total** | **2 completions, 0 rejected/interrupted** |

Task limits remain eight completions/USD 0.15; zero outstanding unknown charges, Tavily requests, full Explore attempts, evaluator calls, summary calls or automatic paid retries. Offline fixture operations are not paid calls.

The task ledger is ignored `tmp/phase4d1/ledger.jsonl`, append/fsync before dispatch. USD 0.0135 is conservatively reserved per request; unknown charges retain that amount. The harness bounds the whole request body to 98,304 bytes and output to 600 tokens, using the previously checked DigitalOcean USD 0.119/million input and USD 0.238/million output rates plus margin. This is local admission, not a guaranteed provider prepaid cap. Actual reported usage releases the reservation. Requests to Tavily/other completion hosts or different provider/model settings are denied.

An exclusive `wx` lock prevents concurrent ledger use. Duplicate context/checkpoint admission happens before replacing pending evidence. Tests first reproduced both missing safeguards, then verified that repeated invocation preserves accepted records and adds no reservation. Pre-admission errors are no longer masked as a missing usage record. An abandoned lock/reservation requires human inspection; there is no automatic stale-lock removal or uncertain-call retry.

## Privacy and verification

No public DTO, route, component or browser contract changed. New diagnostics stay separate from the world and public projection. New sentinel tests cover episodic/issue/context extensions, private histories, shares, fact packs, graph summaries and safe CLI errors. Existing ordinary API privacy, report SSR/download, storage and replay tests remain in the full suite.

The protected live replay compared every complete internal message/decision string of at least 24 characters against summary, graph and fact-pack projections: zero exact-literal leaks in both conditions. This check does not establish absence of every possible paraphrase; the allowlist/deterministic summary boundary supplies the stronger architectural control. Raw accepted contexts and decisions stay only in the ignored private checkpoint; no provider response body, prompt, credentials or dialogue enters the safe ledger/report.

No user-facing contract changed, so no new desktop browser session or screenshots were required by this task's conditional browser gate. Prior desktop results remain historical, not a new browser claim. No servers or browser contexts were started. No mobile work, standalone numerical CLI or GIS execution is claimed.

Final verification: **1,023/1,023 Node tests PASS**, zero skipped/TODO; application TypeScript PASS; strict affected-module TypeScript PASS; production build PASS; `git diff --check` PASS. Twenty focused Phase 4D.1 tests cover retrieval, permissions, diagnostics, ablation, evaluation admission, privacy and separate-process replay. A complete-suite run with external fetch blocked also passed **1,023/1,023**, recorded separately in `tmp/phase4d1/tests-network-blocked-absolute.log`. An initial extra guarded run passed 1,021/1,023: two existing MRT CLI children changed working directory and could not resolve the relative preload path. The harness was corrected to an absolute file URL, without changing application code or weakening network blocking.

Safe evidence: `offline-audit.json`, `real-evaluation.json`, `storage-preflight.json`, `real-replay.log` and `ledger.jsonl` under ignored `tmp/phase4d1`. Raw fixture/accepted records are confined to its `private` subdirectory; they are not ordinary exports.

## Reproduction

Offline commands, with no credentials required:

```powershell
node --test lib/contracts/tests/phase4d1*.test.ts
node scripts/testing/phase4d1-offline-audit.ts
npm.cmd test
npx.cmd --no-install tsc --noEmit
npx.cmd --no-install tsc -p scripts/testing/tsconfig.phase4d.json --noEmit
npm.cmd run build
git diff --check
```

Saved real evaluation replay only, no inference:

```powershell
node scripts/testing/phase4d1-memory-evaluate.ts replay
```

The first audit command expects the four existing local acceptance archives; their absence elsewhere is a missing historical fixture, not evidence of a regression. Ordinary stress tests are self-contained. The evaluation CLI defaults to offline; use a fresh task directory via trusted `IMPACTLENS_PHASE4D1_DIRECTORY` when repeating mocks, because accepted evidence is deliberately never overwritten.

Real mode additionally requires explicit process-local `IMPACTLENS_PHASE4D1_LIVE=true`, an existing trusted key, no mocked switches/preload and writable private stores. **Do not rerun paid mode as a reproduction step for this completed task.** Its original contexts are duplicate-blocked. Future paid evaluation requires its own authorised ledger/budget; do not delete this ledger to bypass admission.

## Changed-file inventory for Phase 4D.1

- `docs/PHASE4D1_LONG_TERM_MEMORY_ACCEPTANCE.md`
- `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md` (new checkpoint; prior pending edits preserved)
- `docs/superpowers/plans/2026-10-30-phase4d1-memory.md`
- `lib/society/hybrid.ts` (optional observer only)
- `lib/society/memory-diagnostics.ts`
- `lib/contracts/tests/phase4d1-memory.test.ts`
- `lib/contracts/tests/phase4d1-diagnostics.test.ts`
- `lib/contracts/tests/phase4d1-evaluation.test.ts`
- `lib/contracts/tests/phase4d1-privacy.test.ts`
- `scripts/testing/phase4d1-memory-fixture.ts`
- `scripts/testing/phase4d1-memory-evaluate.ts`
- `scripts/testing/phase4d1-offline-audit.ts`
- `scripts/testing/tsconfig.phase4d.json` (include focused CLI/audit modules)

All other pre-existing uncommitted storage/Phase 4D live changes remain preserved; they are not attributed to this task. Ignored task artifacts contain safe audit JSON/logs and separately private fixture/accepted records. Nothing was staged, committed, pushed, deployed, installed or migrated; `.env.local` was not modified or displayed; the secondary directory was not accessed. The existing server environment loader supplies configured credentials without exposing values.

## Limits and next step

Keep `episodic-v1` and current capacities. The long-term retrieval path needs no repair to pass this focused verification. Lexical paraphrase recall, conversation diversity, repeated encounters competing as separate entries, and the crude recency/importance assumptions remain limitations. The isolated fixture is deliberately engineered pressure; it does not show natural long-term recall frequency in arbitrary Explore runs.

**Recommendation:** before a vector service, evaluate a separately versioned topic/diversity-aware retrieval adjustment against the wording-different and competing-memory fixtures, then a small new authorised live sample. No evidence here justifies a new database or larger LLM cohort. Implementation stops at verification.
