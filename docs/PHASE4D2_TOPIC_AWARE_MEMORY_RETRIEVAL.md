# Phase 4D.2 - Topic-aware episodic memory retrieval

**Offline technical PASS. Real-model behavioural PASS for one observed controlled pair. Overall PASS.** This establishes capability in engineered histories, not general semantic understanding, reliable public opinion or statistically measured behavioural improvement.

Date: 31 October 2026, Asia/Singapore. Main worktree, `master`, initial HEAD `21ae97b45e75224c08abea812d1982be4be726f3`, initially clean. Baseline verified: **1,023 network-blocked Node tests**. Required Phase 4D/4D.1, storage and roadmap reports were reviewed; earlier reports and accepted records remain intact.

## Diagnosis and compatibility

The Phase 4D.1 paraphrase failure was reproduced before changing retrieval: older experience retained among 24 episodes, absent from ST12, omitted from the six selected memories. V1 uses ASCII words of four or more letters, importance and pool-order recency; it ignores topic/counterparty metadata, reserves latest/cross-platform slots and may select repeated encounters with the same source. Pool merge order is not necessarily chronological. Five high-importance replies in one unrelated thread crowded out the older experience.

That original fixture has **no topic tags**, and all sources share a counterparty. A topic-only improvement cannot honestly establish semantic relevance there. This phase adds separate histories with tags entering through real accepted fixture decisions; it does not inject metadata retrospectively into old records. Original v1 lexical/paraphrase context hashes remain exactly `d3e91155a7bf4ea7161cf6ea18536ac14d8b726a415bdce0bbcffecb661cf5ec` and `a828019479413648c15981c6958646fa4e6f0235f353d134720c1af2f0e30c2e`.

`IntelligencePolicy.memory` now explicitly accepts `episodic-v1` or **`episodic-topic-v2`**. `BALANCED_POLICY` remains unchanged. A separate `TOPIC_POLICY` is selected only when creating a new communication session; an existing accepted-run index restores its original session/input before defaults are constructed. Both are validated, and unknown policy values fail closed. The existing frozen genesis input carries the selector; no new context identity field or journal migration was introduced.

Retention remains unchanged. Ordinary defaults remain **24 active / four model agents / eight social decisions / 80 steps / ST12 / EP32 / six memories / eight items / 24 KB**. Scheduling, initial stakeholder budgets, provider routing and numerical contracts are unchanged.

## V2 ranking and selection

New `lib/society/retrieval.ts` is used only for the v2 branch. V1 and pre-intelligence paths retain their exact selection/context semantics.

1. Start only with genuine stored experiences, rechecking current access and complete authorised ancestry. Build bounded item/event lookups. Determine the latest exposure by actual encounter tick/order, rather than merged-pool position.
2. Derive query/candidate topics from accepted primary and experienced accessible ancestor event tags, filtering to the world's canonical topic IDs. Indexed topic metadata has the same accepted source provenance. No topic relationship graph exists in the current communication contract, so no inferred related-topic edge or synonym mapping is added. A shared broad topic is a classification, not verification or proof of semantic relevance.
3. Score each eligible candidate using the following explicit synthetic assumptions:

| Contribution | Definition |
|---|---|
| Topic | `6 * shared canonical topics / sqrt(candidate topic count)` |
| Lexical | Query overlap plus 0.2 * goal overlap, divided by sqrt(candidate unique token count), capped at 4 |
| Counterparty | +0.6 for the query source's actual non-self author |
| Importance | Existing indexed importance divided by 5 |
| Recency | `0.6 / (1 + elapsed ticks / 20)` |
| Own open issue | +4 when matching the active topic, otherwise +1 |

Lexical matching uses Unicode letter/number tokens of length three or more and a small generic English function-word filter. It is neither semantic inference nor language-specific segmentation. Psychological effects are not inferred from demographics.

4. Coalesce repeated encounters with the same unchanged primary item, selecting its most recent legitimate encounter. Stored events/index entries remain intact. Distinct item IDs remain separate candidates.
5. A valid current encounter anchors the context. Another subject is admitted only by actual topic overlap, query lexical score >=0.35, an actual open issue, or membership in the current conversation thread. Importance, goal wording or counterparty alone cannot establish topical relevance. Unused slots stay unused; no old/private/channel quota exists.
6. Greedily choose by relevance minus a modest redundancy penalty. Per selected comparison: +1.5 penalty for token-Jaccard >=0.85, +0.75 same thread, +0.25 same author, +0.1 same platform; use the maximum combined comparison penalty. Tie-break by score, encounter tick and canonical event ID. This cannot manufacture unseen context or a model-selected recall.
7. Secure each selected primary item's authorised ancestry within eight items **before** optional surrounding exposures. Stop at six memories. A capacity-rejected source is not counted as supplied content. The existing 24-KB/output/timeout safeguards remain; oversized contexts fail before dispatch.

The candidate pool is bounded by EP32+ST12. Local event/item indexes and bounded six-round selection avoid an unrestricted graph search. The policy does not retrieve an episode already evicted from the index.

## Matched offline evaluation

Twelve predeclared **agent-authored fixture label sets**, fixed independently of retrieval output, cover positive, negative and adversarial histories. They share engineered content and are not independent empirical trials or human-validated ground truth. Every source tag comes from actual `decodeMenuDecision`/`finishDecision` acceptance; exposures use `act`. Earlier experiences genuinely leave ST12.

Both policies see the same frozen raw histories. The selector-only benchmark intervention changes only the policy input and rebuilds context. Separately, fresh-genesis command replay rebuilds accepted fixture contexts/menu bindings under each policy and checks identical raw events, items, agents and groups. Neither is a mutation of a historical production world.

Recall below requires the relevant primary item's **actual content** in `context.items`, not merely a reference. Current query memories are excluded from evidence precision. Timings are medians of 12 in-process retrieval samples in milliseconds, v1/v2.

| Fixture | Relevant sources supplied v1 -> v2 | Irrelevant unique sources | Duplicate slots | Memory count | Median ms v1 / v2 |
|---|---|---:|---:|---:|---:|
| same-wording | 1/1 -> 1/1 | 4 -> 0 | 0 -> 0 | 6 -> 2 | 0.692 / 0.677 |
| canonical-topic | 0/1 -> 1/1 | 5 -> 0 | 0 -> 0 | 6 -> 2 | 0.674 / 0.685 |
| unshared-paraphrase | 0/1 -> 0/1 | 5 -> 0 | 0 -> 0 | 6 -> 1 | 0.739 / 0.720 |
| irrelevant-recent-replies | 0/1 -> 1/1 | 5 -> 0 | 0 -> 0 | 6 -> 2 | 0.749 / 0.551 |
| duplicate-source-reads | 1/1 -> 1/1 | 0 -> 0 | 4 -> 0 | 6 -> 2 | 0.513 / 0.528 |
| cross-platform-accessible | 1/1 -> 1/1 | 4 -> 0 | 0 -> 0 | 6 -> 2 | 0.620 / 0.489 |
| private-left-membership | No accessible labelled source | 5 -> 0 | 0 -> 0 | 6 -> 1 | 0.794 / 0.497 |
| private-since-rejoin | No accessible labelled source | 5 -> 0 | 0 -> 0 | 6 -> 1 | 0.751 / 0.525 |
| unresolved-explicit-issue | 1/1 -> 1/1 | 4 -> 0 | 0 -> 0 | 6 -> 2 | 0.865 / 0.618 |
| equal-signal-ties | 2/2 -> 2/2 | 3 -> 0 | 0 -> 0 | 6 -> 3 | 0.726 / 0.708 |
| nonshared-topic-negative | 0/1 -> 1/1 | 5 -> 0 | 0 -> 0 | 6 -> 2 | 0.694 / 0.559 |
| broad-tag-adversarial | 0/1 -> 1/1 | 5 -> 4 | 0 -> 0 | 6 -> 6 | 0.668 / 0.928 |

Descriptive totals: **6/11 -> 10/11 relevant sources**, **50 -> 4 irrelevant unique selections**, **4 -> 0 duplicate slots**. No same-wording or accessible cross-platform recall regression occurred. These totals are not a single success score and should not obscure:

- The **untagged paraphrase remains missed**: no supplied metadata connects its wording, and the policy does not invent synonyms.
- The nonshared-topic negative admits the legitimately matching second-topic source and excludes the unrelated first-topic source.
- The broad-tag adversarial case still includes four unrelated sources; v2 evidence precision is only **0.2** there. Shared tags cannot establish semantic equivalence. No conclusion of general semantic understanding follows.
- Both private-history cases expose zero forbidden items; neither has an accessible labelled old source, so their recall is not a positive success count.

Accessible candidate counts were 21-27. In the paid-comparison fixture, both policies had ST12/EP23 and 23 accessible candidates; v1 supplied zero episodic-only primaries, v2 supplied one. Its context shrank from **11,572 to 7,721 bytes** and six to two memories.

### Bounds, permissions and persistence

Focused tests cover hidden/missing ancestry, more-than-eight-item chains, repeated reads, matching public topics with a genuine nonmember, leave/rejoin history, no-forwarding, explicit issue provenance, deterministic ties and an authorised private-to-public episodic retrieval after eviction. Topic overlap never overrides membership, current join point, exposure or ancestry. The existing conservative policy retains references after leaving but blocks their content; rejoining does not restore forbidden older history.

A separate multibyte deep-thread test demonstrates a legitimately assembled >24-KB candidate context: it fails closed with a safe byte-limit diagnostic and no inference. Item and ancestry exclusions are labelled accurately rather than misreported as rank failures. Every v2 selected primary in successful tests is supplied within the item cap.

All **24 fixture/policy contexts** reconstruct exactly after private checkpoint persistence and a separate network-blocked Node process (~917 ms in the recorded run). Explicit command journals are fixture-only; they are not misrepresented as arbitrary action support in production scheduler restore. An ordinary v2 80-step scheduler fixture preserves ticks 2/12/22/32/42/52/62/72, eight opportunities and exact production save/restore. New-session and indexed-v1 restoration tests verify no upgrade or inference on reopening.

Four existing production worlds replay exactly through their original inputs and accepted decisions: Phase 4C eldercare/workweek (773/691 events), Phase 4D workweek/eldercare (536/536). Their archives/journals are unchanged; 55 earlier recorded hashes remain intact. All **61 production files** snapshotted before live evaluation remained unchanged afterward. Phase 4D.1's two accepted memory evaluations also replay exactly without inference.

### Performance limits

Recorded per-case median retrieval ranges: v1 **0.513-0.865 ms**, v2 **0.489-0.928 ms**. Some v2 cases are slower; no universal speed-up is claimed. Maximum positive observed heap deltas range 0.60-0.97 MB for v1 and 0.45-1.45 MB for v2. These are noisy transient allocation observations affected by GC, not retained memory, per-agent requirements or provider latency.

Fixture command journals are 81,323-83,039 bytes; complete private snapshots are 252,543-318,479 bytes. Summary projections are 49,792-50,063 bytes with 28 nodes/86-88 edges on the empty-base graph fixture. No event/message nodes or raw records are projected. This benchmarks the requested 24-agent configuration, not 100 concurrent model sessions or national scale.

## Safe diagnostics and privacy

The existing detached observer now reports policy, numeric topic/counterparty/importance/recency/lexical/issue contributions, redundancy penalty, selected event IDs and fixed-vocabulary exclusions. Availability, ranking selection, reference inclusion, primary-content inclusion, optional model recall and substantive use remain distinct. V2 exclusions include permission, ancestry, item limit, duplicate source and insufficient relevance; byte-limit failures are explicit. Observation leaves canonical contexts/worlds unchanged.

No public contract, API route or component changed. Summary-only allowlists still govern Explore, continuation, graph/inspectors, Report and exports. New sentinels test episode/context extensions, private histories, safe diagnostics and error envelopes. Existing API/SSR/download privacy regressions remain in the full suite. Protected live audit checks complete internal strings against summary/graph/fact projections: zero exact-literal leaks in either arm. This is backed by the allowlist boundary; exact-string scans alone do not prove absence of every paraphrase.

Raw fixtures, contexts and accepted text stay in ignored `tmp/phase4d2/private`. Safe ledgers contain IDs/counts/costs, not prompts, responses, memories or conversation wording. No transcript endpoint was added. Since public contracts/components are unchanged, the conditional desktop browser gate did not require a new browser session; no new screenshots/browser result is claimed. No servers, browser contexts or mobile work were started.

## Real DeepSeek evaluation

Only after the offline full-suite/type/build/privacy/replay gates passed, the isolated CLI ran under normal Windows user `tetas`. Durable storage probes passed for original accepted-private/social-sessions roots, without override or ACL/security changes. The fixture private root was separately checked. No full Explore, Tavily, connectivity completion, paid evaluator or summary stage occurred.

Routing remains OpenRouter / `deepseek/deepseek-v4-flash-0731` / DigitalOcean only, fallback disabled, required parameters, reasoning disabled/excluded, exact serving identity, strict schema and existing 600-output-token/30-second/context bounds. Both identities verified on completion.

The pair uses **the same later query and recorded history**, under fresh v1/v2 genesis. Its two earlier accepted fixture decisions are clearly offline authored fixtures, not earlier paid calls. There are 44 explicit commands to tick 44. The old episode is absent from ST12 in both arms; only v2 supplies it episodically. Canonical contexts differ in items, memories, menu, readable IDs and menu diagnostics. No output choice, target or recall is forced; earlier fixture intents are rebound to their legitimate policy-specific menus during reconstruction.

| Arm | Accepted action | Old primary supplied | Voluntary older recall beyond target/stance | Protected observation |
|---|---|---|---|---|
| A - episodic-v1 | Comment on current question | No | No | Addressed the current safeguard question without inventing the absent specific earlier detail |
| B - episodic-topic-v2 | Comment on the same current question | Yes | Yes | Accurately used the distinctive prior protection detail as a condition relevant to the present decision |

This is substantive older-context use in an observed response, not a memory-ID-only claim. Both retained the present topic; optional recall was additional to required target/stance binding. The assessment uses protected exact-detail, topic/condition, target and explicit-recall facets; it is not a blinded evaluator. No dialogue or private numerical detail is quoted here. One stochastic pair, changed menu/context composition and fixed A-then-B order do not establish a causal or statistically reliable general benefit.

Both final contexts, accepted decisions and worlds replay exactly from protected checkpoints with external fetch blocked. No regenerated inference is needed. Paid activity stopped immediately after sufficient evidence.

### Request/cost ledger

| Arm | Input tokens | Output tokens | Reported USD | Duration |
|---|---:|---:|---:|---:|
| A/v1 | 3,249 | 126 | 0.000416619 | 2,450 ms |
| B/v2 | 2,311 | 148 | 0.000310233 | 2,187 ms |
| **Total: two accepted completions** | **5,560** | **274** | **0.000726852** | **4,637 ms provider-stage total** |

Zero rejected/interrupted calls, unknown reservations, retries, Tavily searches, full Explore attempts or additional paid stages. Mock billing belongs to a separate offline ledger and is not included in these totals.

Ignored `tmp/phase4d2/ledger.jsonl` is fsynced before dispatch. It admits at most eight completions/USD 0.15, reserves USD 0.0135 per request, retains unknown charges, uses an exclusive lock and checks both contexts before touching checkpoints. Existing evidence cannot be overwritten by a repeated invocation. Abandoned locks/reservations require inspection rather than automatic retry. Provider mismatch/overspend halts the ledger.

A free public [OpenRouter endpoint metadata lookup](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-flash-0731/endpoints) on 31 October confirmed DigitalOcean structured-output support and USD 0.119/million input, 0.238/million output rates. Combined with a 98,304-byte whole-request bound and 600-output-token bound, the reservation includes margin. This is local admission, not a guaranteed external prepaid cap. No credentials are used for that metadata read.

## Verification and reproduction

Final complete-suite count: **1,059/1,059 network-blocked Node tests PASS**, zero skipped/TODO; application TypeScript PASS; strict affected-module TypeScript PASS; production build PASS; `git diff --check` PASS. Before paid dispatch: **1,057/1,057 network-blocked tests**, app/strict TypeScript, build and whitespace checks passed. Later additions only strengthen nonmember/private-to-public test coverage; no production code changed after the real pair.

Offline reproduction:

```powershell
node --import ./scripts/testing/offline-network.mjs --test lib/contracts/tests/phase4d2*.test.ts
node scripts/testing/phase4d2-benchmark.ts
node scripts/testing/phase4d2-memory-evaluate.ts replay offline
node scripts/testing/phase4d2-memory-evaluate.ts replay
npx.cmd --no-install tsc --noEmit
npx.cmd --no-install tsc -p scripts/testing/tsconfig.phase4d.json --noEmit
npm.cmd run build
git diff --check
```

The full suite was run as `npm.cmd test` with `NODE_OPTIONS` importing the absolute file URL for `scripts/testing/offline-network.mjs`; absolute URL matters because existing MRT CLI children change working directory. Benchmark historical checks require the four pre-existing local archives/audit indexes; their absence elsewhere is a missing optional historical fixture, not a self-contained test failure. Use a fresh trusted `IMPACTLENS_PHASE4D2_DIRECTORY` for repeated offline evaluation, then run the CLI's default `offline` mode. Repeated accepted contexts intentionally fail duplicate admission.

Live mode requires explicit trusted `IMPACTLENS_PHASE4D2_LIVE=true`, matching successful offline context gates, original writable roots and existing credentials. **Do not repeat live mode for this completed task.** Never remove a ledger to bypass admission; future paid testing requires separate authorisation. Raw records are not ordinary downloadable evidence.

## Changed-file inventory

- `docs/PHASE4D2_TOPIC_AWARE_MEMORY_RETRIEVAL.md`
- `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`
- `docs/superpowers/plans/2026-10-31-phase4d2-topic-memory.md`
- `lib/society/intelligence.ts`
- `lib/society/retrieval.ts`
- `lib/society/hybrid.ts`
- `lib/society/memory-diagnostics.ts`
- `lib/server/society/service.ts`
- `lib/contracts/tests/social-service.test.ts`
- `lib/contracts/tests/phase4d2-retrieval.test.ts`
- `lib/contracts/tests/phase4d2-fixtures.test.ts`
- `lib/contracts/tests/phase4d2-privacy.test.ts`
- `lib/contracts/tests/phase4d2-evaluation.test.ts`
- `scripts/testing/phase4d2-memory-fixture.ts`
- `scripts/testing/phase4d2-benchmark.ts`
- `scripts/testing/phase4d2-memory-evaluate.ts`
- `scripts/testing/tsconfig.phase4d.json`

No new dependencies/services, vector store, embeddings, reflection, summariser, numerical-interface change, credential-file modification/display, Git mutation, deployment or secondary-directory access. No standalone numerical CLI or GIS verification is claimed. Changes remain unstaged/uncommitted; no task-owned servers or browser contexts need cleanup.

## Limits, vector search and Phase 4E readiness

Topic quality and coverage remain decisive. Broad tags admit false positives; untagged paraphrases remain missed; index eviction cannot be reversed; coalescing is by primary ID rather than inferred cross-platform source identity. Unicode token matching is not multilingual semantic understanding. Importance/diversity thresholds are explicit uncalibrated assumptions. An agent can still choose inactivity or ignore supplied memory.

**Vector search is not warranted by this evidence yet.** First evaluate topic granularity/coverage and these relevance gates on more naturally generated saved histories, with human-reviewed labels and separately authorised live samples. V2 is ready for review as the default for new sessions, with historical replay preserved. Phase 4E has not begun, and this isolated result does not replace future end-to-end behavioural evaluation.
