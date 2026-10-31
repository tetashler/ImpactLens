# Phase 4E.2 Multi-Day Swarm Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans. Preserve the main worktree and leave all changes uncommitted.

**Goal:** Support versioned 320-tick societal simulations with grant-aware pacing and fictional availability, then conduct one separately gated live acceptance within the user's cumulative limits.

**Architecture:** Extend the existing immutable swarm policy with `multiDay` profile identity and a trusted frozen pacing target. Share allowlisted bounds across engine, storage and public parsers while leaving historical paths exact. Retain serial provider inference, managed coordinator, format-2 journals and private checkpoints.

**Tech stack:** Existing Node 24, TypeScript, Next.js, React and Playwright infrastructure; no new dependencies.

**Spec:** User's approved Phase 4E.2 implementation instruction and `docs/PHASE4E2_EXTENDED_SIMULATION_RESEARCH.md`.

## Global constraints

- Main repository only; preserve the pre-existing untracked research document.
- No Git mutation, deployment, credential-file changes, secondary directory or mobile work.
- Default 50/35/320/350; trusted larger 100/70/320/700; quick and prior deep policies stay unchanged.
- ST12 / EP32 / references6 / items8 / context24KB / ancestry64 / serial1.
- No paid activity before complete offline PASS and storage/provider/task-ledger preflight.
- One fresh live Explore, social350, totalOR360, Tavily1/credits2, USD1 reported+unknown, task90min, no automatic retry/evaluator/summariser.

## Review focus

- Small provider grants must change pacing before genesis without mutating historical inputs.
- Sleeping agents cannot receive inference or fabricated encounters; waking must preserve deferred legitimate demand.
- Quiet clock advancement is valid progress; exhausted event/item capacity is terminal, not a revision loop.
- Restoring checkpoints/closed browsers/restarts must never repeat accepted or uncertain requests.
- New daily/issue/pacing metadata must remain allowlisted aggregate data with no raw transcript leakage.

## Task 1 — Frozen profiles, time and pacing

Owner: core agent. Files: `execution-profile.ts`, `temporal-policy.ts`, `swarm.ts`, `deep-policy.ts`, `deep-scheduler.ts`, `swarm-scheduler.ts`, `engine.ts`, `contract.ts`, `swarm-routine.ts`.

Interfaces: `multiDaySwarmPolicy(active,pacingTarget,steps=320)`; `executionProfile(id)`, `getExecutionProfile(inputOrWorld)`, `executionLimits(inputOrWorld)`; deterministic temporal helpers. Optional immutable selector `swarm.multiDay={version:1,policy:'multi-day-swarm-v1',profileId,pacingTarget}`. Explicit allowlisted 160/320/672 profiles; no higher decision capacities enabled.

- [ ] Write/run failing profile, grant70-v-cap350, availability and late-trigger tests.
- [ ] Implement bounded burst/release/urgent borrowing with later reserve, seeded rest and once-per-tick routines.
- [ ] Run focused tests with external traffic blocked; preserve legacy fingerprints/replay.

## Task 2 — Service ownership, admission, terminals and parsers

Owner: service agent. Files: `service.ts`, `coordinator.ts`, `public-service.ts`, `public-contract.ts`, `public-session.ts`, `job.ts`.

- [ ] Reproduce event-limit no-progress and duplicate checkpoint behaviour with focused tests.
- [ ] Default new sessions to the new profile, deriving pacing from the initial trusted grant before progression; restore old indexes first.
- [ ] Add safe capacity-limited terminals and no-progress detection, retaining truthful budget-limited prefixes.
- [ ] Make checkpoint ownership unambiguous and compact status independent of full-envelope reads where safely cached/validated.
- [ ] Validate new profiles/clock/day summaries using shared bounds; retain strict allowlists and old DTO compatibility.
- [ ] Run focused coordinator, recovery, admission and parser tests.

## Task 3 — Memory, private inbox and aggregate chronology

Owner: memory/summary agent. Files: `episodic.ts`, `retrieval.ts`, `deep-context.ts`, `decision-menu.ts`, `group-engine.ts`, `hybrid.ts`, `discussion-contract.ts`, `facts.ts`, `summary.ts`, existing Report summary components.

- [ ] Reproduce private-inbox saturation and impossible issue creation with authoritative fixtures.
- [ ] Filter only legitimate candidates before bounded selection; preserve join/leave/ancestry/exposure boundaries.
- [ ] Make issue capacity truthful without dropping unresolved records.
- [ ] Verify day-gap/ST-eviction episodic retrieval and memory isolation.
- [ ] Add shared safe day/availability/decision chronology, preserving historical projections and context bounds.
- [ ] Run focused memory, permission, summary and privacy tests.

## Task 4 — Integration, performance and desktop acceptance

Owner: root. Reuse actual service/gateway/coordinator fixtures in new `phase4e2-*` scripts.

- [ ] Snapshot existing historical file hashes without printing private contents.
- [ ] Verify historical, quick, prior deep, 160/320 primary/larger, bounded672 and small-grant configurations.
- [ ] Exercise quiet/early-burst/late-reply/private-heavy/repetitive/resource/fault/restart cases.
- [ ] Measure journal/checkpoint/world/public bytes, performance, memory and full/tail replay.
- [ ] Run full network-blocked tests, app/strict types, production build and diff check.
- [ ] Run both mocked desktop cohorts at1440x900/1920x1080, browser closure, controls, history, graph and privacy.
- [ ] Resolve defects with focused red/green tests and repeat affected/full gates.

## Task 5 — One gated live attempt

Owner: root only. No agent independently dispatches paid requests.

- [ ] Create a new durable task-only guard/ledger with append-before-dispatch requests, conservative tokens/USD, one attempt and90min deadline.
- [ ] Verify public provider metadata for conservative reservation, exact route/identity, normal-user default storage, historical hashes and absence of fixtures.
- [ ] Run only the approved Sengkang pilot question through ordinary Map -> Explore.
- [ ] Stop on natural completion or any binding limit; preserve truthful partials, never start another fresh run.
- [ ] Audit protected evidence into safe aggregates: day participation, voluntary peers, memory stages, private provenance, repetition, cost, privacy and exact replay.
- [ ] Resume the same run only when safe after a reproduced implementation repair and full offline revalidation; never redispatch uncertain work.

## Task 6 — Final verification and reporting

- [ ] Run post-live full network-blocked tests/types; rebuild if application code changed.
- [ ] Recheck full/tail replay, private hashes, final ledger and desktop no-dispatch restoration.
- [ ] Create `docs/PHASE4E2_MULTIDAY_SWARM_IMPLEMENTATION_AND_LIVE_ACCEPTANCE.md` with separate verdicts and exact inventory; update roadmap only to actual verified status.
- [ ] Stop owned processes/browser contexts; preserve accepted evidence; leave changes unstaged/uncommitted.

## Execution rulings

- User's autonomous implementation instruction supplies approval to execute this plan without another routine checkpoint.
- Skill defaults suggesting worktrees/commits do not apply: user expressly requires this main worktree and no Git mutations.
- Existing research document is preserved as user work; no historical acceptance report is overwritten.
