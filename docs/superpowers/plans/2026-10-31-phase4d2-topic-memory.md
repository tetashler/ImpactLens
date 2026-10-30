# Phase 4D.2 topic-aware memory implementation plan

**Goal:** Improve deterministic memory relevance/diversity without new inference stages or capacity increases.

**Architecture:** Preserve the existing episodic-v1 branch exactly. Register episodic-topic-v2 in IntelligencePolicy validation; use a separate TOPIC_POLICY only when creating new sessions. Frozen input already carries this selector, so old journals are never upgraded. A small retrieval module consumes only actual accessible experienced items, canonical topic tags and authorised ancestry. It scores topic, lexical, counterparty, issue, importance and recency signals, coalesces repeat reads of unchanged items, and greedily applies modest redundancy penalties. Primary-item/ancestry fit is checked before v2 selection; no references without content count as successful retrieval. No invented topic edges or synonym dictionary.

**Constraints:** Existing main worktree, no Git mutations, credentials/secondary directory untouched; desktop-only. Ordinary 24/4/8/80, ST12/EP32, six memories/eight items/24KB, existing provider/router/time/output limits. No Tavily/full Explore, vector service, embeddings, evaluator or summary calls. Only after offline PASS: isolated matched old/new DeepSeek comparison, new durable ledger, max eight calls/USD .15, initially two and no retries.

## Tasks

- [x] Audit and reproduce the Phase4D1 failure; capture baseline full suite and matched fixture metrics before production edits.
- [x] Write failing policy/version/retrieval tests. Add the new selector without changing BALANCED_POLICY or historical defaults; new service sessions use TOPIC_POLICY.
- [x] Implement bounded topic/counterparty scoring and diversity selection with accurate item/ancestry diagnostics. Test no-metadata negatives, adversarial tags, duplicates, unresolved issues, cross-platform permissions and ties.
- [x] Extend detached diagnostics; assert observation cannot change context/world. No public DTO or route changes.
- [x] Compare old/new on identical histories with predeclared relevance labels, runtime/memory measurements, fixture restart/replay and ordinary v2 save/restore. Replay four accepted historical worlds and preserve hashes.
- [x] Full network-blocked tests, application/strict types, build and privacy checks. Repair failures before spending.
- [x] Reuse controlled gateway evaluation under a new ledger/private root: strict identity/config, preflight, exclusive lock, reserve before dispatch, duplicate protection, no hidden retries. Record actual semantic use separately from references.
- [x] Documentation/roadmap, final regressions, private/hash checks, stop paid activity and leave work unstaged/uncommitted.

## Review focus

- V1 validation/default changes must not invalidate or change historical contexts.
- Shared broad tags are evidence of metadata continuity, not proof of semantic relevance or truth.
- Hidden group ancestry cannot enter query tags, ranking, content or model context.
- Duplicate suppression applies only to unchanged same-source experience; distinct useful arguments remain eligible.
- Item/byte exclusions are reported separately from ranking and optional recall; an ID alone is not memory use.

User supplied the implementation scope and autonomous execution method; no routine approval gate is added. Independent fixture/audit work is delegated, production integration is inline. Existing source reports and immutable records remain unchanged.


## Completion evidence

1,059 full network-blocked tests; app/strict types; build/whitespace PASS. V1 context hashes and four historical worlds unchanged. Canonical-topic recall improves without increasing capacities; untagged and broad-tag limitations remain explicit. Exactly two real accepted comparisons, USD 0.000726852, demonstrate voluntary substantive recall under v2; both replay exactly. No further paid activity, Tavily/full Explore, Git mutations, deployment or server/browser work. See docs/PHASE4D2_TOPIC_AWARE_MEMORY_RETRIEVAL.md.
