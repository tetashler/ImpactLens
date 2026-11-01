# Hybrid Citizen MRT Implementation Plan

> **For agentic workers:** Use executing-plans for the shared integration and dispatching-parallel-agents for the isolated domain, personality transport and task guard modules. Track evidence under `tmp/citizen-hybrid-20261101/`.

**Goal:** Connect validated map intent, deterministic citizen commute facts and one-time provider personalities to ordinary Explore, then conduct one capped live MRT evaluation after offline acceptance.

**Architecture:** Preserve historical request and simulation branches. Add a versioned, server-validated Explore extension whose immutable binding covers the exact question, plotting revision, geometry, validated intervention and citizen scenario. The model selects application IDs; geometry, routes and quantitative facts remain deterministic. Personality generation uses the existing fixed DeepSeek transport with one anonymous bounded roster batch.

**Tech stack:** TypeScript, Next.js route handlers, Node test runner, existing MRT graph and local coordinator.

**Spec:** User's Hybrid Map Interpretation, DeepSeek Personality Activation and Real-Provider Acceptance instruction in this conversation.

## Global constraints

- Main worktree only; no Git mutations, deployment, credential edits or historical record changes.
- No paid dispatch before every mandatory offline gate passes.
- One new paid Explore; total 365 completions; social 350; entity 1; relationship 1; initial 8; personality at most 3; interpretation at most 1.
- USD 1 reported plus outstanding reservations; one Tavily search/two credits; serial inference; zero retries.
- The user clarified that the 90-minute deadline starts when the paid evaluation is armed after offline PASS.
- ST12/EP32, six references, eight bodies, 24KB context and current 50/35 and 100/70 execution capacities remain unchanged.

## Review focus

- Editing geometry or question invalidates an accepted interpretation and commute binding.
- Nearby tracks are context rather than proof of an authorised network connection.
- Facilities without a supported quantitative model remain location/context analyses.
- Malformed personality output fails without a fabricated fallback or second call.
- Restoring, polling or replaying accepted worlds never regenerates personalities or dispatches inference.

## Tasks

### 1. Pure intent domain

Files: `lib/interventions/hybrid.ts`, `lib/contracts/tests/hybrid-intent.test.ts`.

- [ ] RED/GREEN strict ID selection, exact binding, ordered attached dots, supported anchors, stale input, independent markers, station ambiguity and facility context.
- [ ] Export `buildHybridContext`, `deterministicHybridIntent`, `acceptHybridIntent`, `encodeHybridContext` and `buildHybridMrt`; bounded provider projection contains no arbitrary model coordinates.

### 2. Personality provider and transport inspection

Files: `lib/citizen-grounding/personality.ts`, `lib/server/inference/personality.ts`, `lib/server/inference/deepseek.ts`, personality tests.

- [ ] RED/GREEN one 35/70 anonymous roster batch within current input/output limits.
- [ ] Add awaited predispatch inspection and postparse record validation to the shared gateway; preserve old callers and mock hashes.
- [ ] Reject missing/duplicate/unknown slots, malformed traits, identity/usage failures, cancellation and timeout without retry.

### 3. Trusted ordinary Explore integration

Files: server inference/society adapters, versioned immutable citizen binding, browser Explore controller and map workspace.

- [ ] RED/GREEN new bounded request extension; old requests and old worlds retain their original semantics.
- [ ] Validate original geometry and confirmations before paid work, interpret only where necessary, calculate actual citizen impacts, initialize personalities before genesis.
- [ ] Bind original question/plot/intent/commute and roster into accepted input identity; preserve actor-only context.
- [ ] Expose safe status and quantitative limitations through existing Map/Graph/Report surfaces.

### 4. Independent paid guard

Files: `scripts/testing/citizen-hybrid-live-guard.mjs` and focused tests.

- [ ] RED/GREEN exact task identity, source/dataset/protected hashes and offline gate proof.
- [ ] Enforce stage-specific and cumulative ceilings, append-before-dispatch, unknown costs, exclusive serial ownership and no retry.
- [ ] Bind exactly one actual Explore input before any provider request. Do not arm during development.

### 5. Complete offline acceptance

- [ ] Verify relocated CSV pins, manifests, citizen identity/calibration and production assets.
- [ ] Run focused integration, privacy, geometry and roster tests, then full network-blocked suite, both TypeScript gates, production build and whitespace checks.
- [ ] Run all 14 benchmark rows, both desktop cohorts and viewports, 20 qualifying historical replays and the preserved unresolved experimental inventory.
- [ ] Verify full genesis and positive checkpoint-tail reconstruction plus protected-file preservation.
- [ ] Independently review changed boundaries and repair reproducible defects before refreshing affected final gates.

### 6. One paid evaluation and final evidence

- [ ] Only after offline PASS, draw a coherent MRT alignment and station dots through the actual UI and pin its actual validated inputs.
- [ ] Create a fresh ledger and source/build readiness proof, arm the 90-minute deadline, submit Explore once.
- [ ] Stop honestly on validation failure, limit or natural completion; never retry or replace the Explore.
- [ ] Audit actual personalities, citizen impacts, accepted activity, replay, privacy, provider identity and ledger settlement.
- [ ] Run post-run offline checks, write `docs/CITIZEN_GROUNDED_MRT_V1_REAL_PROVIDER_ACCEPTANCE.md`, append roadmap, stop owned processes, leave changes unstaged/uncommitted.
