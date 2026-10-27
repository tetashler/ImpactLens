# Shared Citizen Simulation Contract Implementation Plan

> Implement inline using executing-plans; the user's Phase 4 shared-contract brief authorises implementation and local checkpoint/synchronisation.

**Goal:** Exchange reproducible demographic results and synthetic citizen samples without implementing journey assignment, metrics or animation engines.

**Architecture:** Browser-safe TypeScript DTOs in `lib/contracts/citizen-simulation.ts`, with dependency-free JSON boundary validation in a companion module re-exported from the contract. Reuse population category/provenance types and compact MRT comparison fields through type-only imports. Source aggregates, synthetic attributes, assumptions/calculations and visual state remain separate.

**Tech stack:** Existing Node 24 native TypeScript tests, TypeScript 7, Next.js; no new packages.

**Spec:** User's ImpactLens SG Phase 4 shared citizen simulation contract brief; existing Phase 2/3/4A implementation documents.

## Global constraints

- Work in main `master`, then fast-forward the existing feature branch; no push, reset, rebase or worktree deletion.
- Preserve `.env.local`, algorithms, source datasets and population weights.
- Contract version 1; source reference year is separate from simulation date.
- Preserve `syn-<16 lowercase hex>-<positive integer>` IDs, normalized area/subzone pairs, existing age/sex values and MRT status/null semantics.
- All citizen behaviour is hypothetical/unassigned; all positional/path data is visual-only and schematic, never observed movement.
- Metadata records scenario/intervention IDs, coverage, source year, seed/run/method/count/weight and assumption references. Source catalogue deduplicates provenance.
- Aggregate bins partition all group agents/weights across unassigned, compared, newly-reachable, unreachable and invalid. Beneficiaries/mean savings use comparable finite journeys only; newly reachable remains separate. Sample citizens need not exhaust metric denominators.
- Profile responses share metadata/catalogues, citizen and optional outcome/visual state, plus labelled assumed activities.
- Reject unknown fields, invalid references, unsupported versions, nonfinite numbers, contradictory statuses/denominators and missing provenance; do not repair input.

## Review focus

- Null/status contradictions: reject fabricated durations or transfer counts for unreachable/unassigned outcomes.
- Denominator corruption: reconcile count/weight buckets, valid-agent counts and finite-comparison beneficiary/mean denominators.
- Provenance confusion: fixtures cannot claim observed government data; visual/behaviour references require declared assumptions.
- Sample confusion: validate ID uniqueness/references and population bounds without treating render samples as full populations.
- Browser safety: no runtime imports from Node-based population/transport code; real generated citizens and compact MRT results remain interoperable.

## Task 1 — Contract, validation and examples

Files: create `lib/contracts/citizen-simulation.ts`, `lib/contracts/citizen-simulation-validation.ts`, `lib/contracts/citizen-simulation.fixtures.ts`, `lib/contracts/tests/citizen-simulation.test.ts`; extend only the existing npm test glob.

Exports: `CitizenSimulationPayload`, `SimulationMetadata`, `CitizenReference`, `CitizenJourneyOutcome`, `CitizenAnimation`, `DemographicImpactMetric`, `CitizenProfileResponse`, `Wgs84Position`, source/assumption/activity support types; `parseCitizenSimulation`, `assertCitizenSimulation`, `parseCitizenProfile`, `assertCitizenProfile`; illustrative simulation/profile fixtures.

- [x] Write boundary tests first and observe failure before implementation.
- [x] Implement DTOs and strict runtime checks; fixtures show improved, unchanged, unassigned and unavailable journeys, aggregates and schematic paths.
- [x] Exercise malformed versions/IDs, all age/sex values, weights, coordinates, provenance, assumptions, reference integrity, nullable statuses, inconsistent bucket denominators and JSON round trips.
- [x] Test interoperability with a real generated population and compact MRT result; assert importability in a browser-like environment without Node runtime imports.
- [x] Run focused and full tests, compiler checks and production build.

## Task 2 — Handoff and Git checkpoint

Files: create `docs/CITIZEN_SIMULATION_CONTRACT.md`; update the existing roadmap without marking full Phase 4 complete.

- [x] Document exact exports, strict versioning, units/sign conventions, denominator/sampling semantics, provenance, example use and terminal ownership.
- [x] Record actual tests/build/type checks; keep 4B animation, 4C calculations, Gemini and eldercare pending.
- [x] Obtain a read-only review; resolve blocking findings with regression tests.
- [ ] Verify protected-file integrity, secret exclusions, staged contents and clean agents worktree; commit validated files on master.
- [ ] From agents run `git merge master --ff-only`; verify equal branch hashes, clean worktrees and unchanged ignored/untracked environments.

## Decisions and validation ledger

- Initial state: both clean at `e90d741`; GitHub master remains at published Phase 2 `5e0fdde` (read-only MCP check).
- No transport/citizen behaviour, weighted demographic calculation, endpoint, frontend animation or Gemini implementation belongs to this checkpoint.
- Builder check accepted fractional weights and overlapping independent groups; population identity remains encoded in existing synthetic IDs instead of adding a second run fingerprint.
- Initial red run failed because the parser/fixtures did not exist. Final read-only review found three genuine consistency gaps; each regression failed before the validator was corrected.
- Final validation: 25 focused tests; 84 full-suite tests (0 failures); application and explicit population/contract/test compiler checks; production build all pass. Review approved.
- Final Git operations occur after this plan is committed; branch equality, cleanliness and environment integrity are verified and reported in the terminal handoff, with exact commit evidence in Git history.
