# Citizen-Grounded MRT Simulation v1 Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development with test-first tasks and bounded independent ownership. User authority requires the main worktree, no Git mutations and no paid calls.

**Goal:** Connect the existing national population IDs to reproducible employment circumstances, deterministic MRT comparisons and privately grounded societal agents.

**Architecture:** Preserve all old schemas/policies when the new selector is absent. A `citizen-circumstances-v1` sidecar retains existing IDs/weights; `citizen-commute-v1` computes door-to-door estimates under declared assumptions; `citizen-grounded-v1` freezes selected facts and validated personality records before genesis. New issue/memory behavior is isolated behind `conversation-menu-v4`.

**Tech stack:** Existing TypeScript/Node/Next.js, current Census/GTFS and public official CSV snapshots. No new database, provider or parallel inference.

**Spec:** User's Citizen-Grounded MRT Simulation v1 implementation instruction and preceding read-only research in this conversation.

## Global constraints

- Existing main worktree only; no stage/commit/push/reset/stash/worktree creation.
- No OpenRouter/Tavily/provider requests or paid ledger arming. Official public aggregate downloads only.
- Preserve existing raw files, all accepted histories/checkpoints/paid evidence, prior reports and historical scope.
- ST12 / EP32 / six references / eight bodies / 24KB contexts; unchanged 320 ticks and 350/700 social capacity.
- Personalities are immutable, not stereotyped from demographic categories; offline mock provenance must be explicit.
- Existing v2/v3 contexts, planners, numerical transport contracts and historical inputs remain unchanged by selector absence.
- Generated citizen records are private/reproducible ignored artifacts under `data/synthetic/`; original public snapshots and metadata under `data/employment/` (relocated after original implementation; recorded v1 provenance is unchanged).

## Interfaces and ownership

- Shared type-only schema: `lib/citizen-grounding/contract.ts`, owned by coordinator.
- Data worker: `lib/citizen-grounding/{official,generator,validation}.ts`, `lib/server/citizen-grounding/data.ts`, official snapshots, generation CLI and data tests.
- Transport worker: `lib/citizen-grounding/commute.ts`, `lib/server/citizen-grounding/transport-data.ts`, OD/exit validation and commute tests. Consumes `CitizenDataset`; produces immutable `CitizenCommuteRun`.
- Personality worker: `lib/citizen-grounding/personality.ts` and tests only. Produces bounded personality roster interface, mocks and explicit live-dispatch refusal until separate authority.
- Coordinator owns society/inference integration, v4 issue/memory changes, API/UI adapters, acceptance scripts, reporting and review.

## Review focus

- Official suppression/denominator mismatches must remain visible, not fabricated zeroes or hidden correlations.
- No cross-agent facts, inaccessible private sources or omitted-history exposure through new context metadata.
- New station access must be re-evaluated while preserving the same geographic endpoints and baseline alternatives.
- Restore/replay must use frozen facts/personality and never invoke data acquisition or providers.
- A model classification or source reference cannot be treated as verified semantic resolution or causal memory use.

## Tasks

### 1. Baseline, preservation and official data

- [ ] Snapshot existing raw/derived/accepted/paid files and prior reports; record actual HEAD and clean state.
- [ ] Verify four priority official publication pages, licence and CSV acquisition endpoints; download only absent useful sources, preserving bytes.
- [ ] Test parsing, grain, suppression and source hash failures before implementing adapters.
- [ ] Document original snapshots, exact schemas/counts, denominator exclusions and provenance; unavailable downloads remain explicit blockers.

### 2. Citizen sidecar

- [ ] Test stable base IDs/weights, age bands, missing values and internal employment/schedule consistency.
- [ ] Implement seeded generation with transparent conditionals and fictional schedule/title/proxy assumptions.
- [ ] Implement validation/calibration diagnostics and immutable snapshot/manifest persistence without replacing base population.
- [ ] Generate 10,000 records and prove identical recipe hashes on repeat; record actual residuals and unknowns.

### 3. Deterministic commuting and demand reference

- [ ] Test candidate stations, new-station access, non-MRT/unknown/unreachable/same-station outcomes and expansion-weight denominators.
- [ ] Validate actual OD/exit inputs and reviewed canonical code mappings, preserving unmapped trip mass.
- [ ] Implement per-origin cached trees using existing routing/overlay functions; keep source-period and walking assumptions explicit.
- [ ] Expose bounded summary/profile API and integrate the normal MRT surface without changing legacy APIs.

### 4. Personalities and immutable social grounding

- [ ] Test 35/70 roster coverage, IDs, trait bounds, identity provenance, mutation rejection and finite output bounds.
- [ ] Evaluate combined-stage feasibility at current worst-case bounds. If not guaranteed, retain separate bounded initialization interface with live batches disabled.
- [ ] Freeze active citizen facts, own commute packs and style provenance into new-policy genesis input.
- [ ] Test real context serialization, missing/mismatched inputs, privacy and exact replay; old selector absence must be byte-identical.

### 5. Issue precision and memory relevance

- [ ] Reproduce generic-question/closure permissiveness with new-policy positive, negative and ambiguous fixtures.
- [ ] Add source-bound trackable subjects, duplicate handling, explicit progress, owner-reported closure and deterministic satisfaction distinctions.
- [ ] Keep lifetime/active/context caps and permissions; do not mutate historical issue records.
- [ ] Add bounded fact/issue anchors to relevant retrieval, stable facts outside episodes and conservative evidence evaluation.

### 6. Integrated acceptance and reporting

- [ ] Exercise both 50/35 and 100/70 mocked service/coordinator runs plus adverse/quiet cases, genesis/checkpoint-tail replay and safe public projections.
- [ ] Run focused tests, then serial full network-blocked Node, both TS gates, build and whitespace.
- [ ] Run twenty qualifying historical worlds, preserve the approved unresolved artifact, fourteen benchmarks and both desktop cohorts/viewports.
- [ ] Review independently, fix genuine defects with regressions, re-run affected/full gates after repairs.
- [ ] Write implementation report and append roadmap; verify protected hashes and cleanup task-owned processes. Leave changes uncommitted.

## Rulings

- The user's explicit autonomous instruction is the implementation approval; no routine plan-review stop.
- Main-worktree and no-Git instructions override skill worktree/commit defaults.
- Old acceptance tooling is preserved; task-specific copies/logs isolate new runs and output paths.
- Personality batching cannot consume the closed 360-call allowance. Runtime initialization defaults fail closed unless a trusted admitted initializer supplies accepted records.
