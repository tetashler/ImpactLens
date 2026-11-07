# Controlled MRT option comparisons

## Architecture and scope

Implement the user's requested workflow in the existing map calculator, preserving Claude's light chart-room interface and existing components/tokens. The legacy experiment notebook keeps describing saved configuration/evidence inputs; deterministic executed calculations receive a separate controlled MRT workflow rather than mislabeling old records as outcomes.

Option A is the current explicitly reviewed MRT intervention. Duplicate it to B; change only `waitingTimeSeconds` (0–3600 integer seconds). Both copies retain exactly the same line identity, geometry, running/dwell/transfer assumptions, service date, private synthetic population and transport source context. Add low/base/high proposed waits for B while A stays fixed. Require low <= B base <= high. Defaults are conveniences and explicitly hypothetical, not empirically calibrated ranges.

Prepare dataset, private baseline graph clone, OD reference and access index once per bounded comparison request. Calculate at most four unique waits with the existing complete citizen commute engine; never aggregate its 32-row public sample or rely on its two-entry global cache. No AI calls, research refresh, simulation recovery, new private storage or new dependencies.

Use the same cohort with finite baseline and intervention journeys across A and all three B variants. Rank lower weighted mean travel time on that common cohort; expose cohort agents/expansion weight and excluded agents/weight. Preserve each run's full coverage table (unknown, unreachable, newly reachable and not applicable remain distinct). Null coverage yields unknown, not zero or a winner. Positive B-minus-A minutes means B is slower. Ties use 1e-6 seconds. `preferenceChanges` compares declared preferences across low/base/high, including transitions to/from ties; unknown yields null. This objective is not a recommendation based on costs, construction or resident preferences.

Waiting applies only to initial boarding and transfers onto the proposed service. Existing-line waits stay fixed. The additive graph model retains existing alternatives; a shorter proposed wait cannot worsen its best route. Sensitivity ranges are scenario assumptions, not confidence intervals. Existing fictional discussion comparison must explicitly distinguish model variability from confidence intervals for Singapore residents; no automatic repeat AI runs are added.

## Interfaces

Browser-safe module `lib/experiments/controlled-mrt.ts`:

- `ControlledMrtRequest`: `{version:1, serviceDate, intervention, optionB:{waitingTimeSeconds}, sensitivity:{lowWaitingTimeSeconds,highWaitingTimeSeconds}}`.
- `ControlledMrtResponse`: `{version:1, policy:'controlled-mrt-wait-v1', requestFingerprint, snapshot, commonCohort, options, comparisons, preferenceChanges, assumptions, limitations}`.
- `snapshot`: `{id,populationId,datasetId,baselineGraphHash,sourceSnapshotHash,serviceDate,sources,demandSourceHash,accessSourceHash}`; sources use existing public source metadata.
- `commonCohort`: `{agents,weight,excludedAgents,excludedWeight}`.
- Four `options`: `{key:'A'|'B-low'|'B-base'|'B-high',waitingTimeSeconds,runId,scenarioFingerprint,summary,common:{meanBaselineMinutes,meanTravelMinutes,meanMinutesSaved}}`. Summary is the existing citizen commute summary. All common means nullable together.
- Three `comparisons`: `{level:'low'|'base'|'high',differenceMinutesBMinusA,preferred:'A'|'B'|'tie'|'unknown'}`.
- Exports: `parseControlledMrtRequest`, `controlledMrtRequestFingerprint`, `parseControlledMrtResponse`, `assertControlledMrtBinding`.

Server `lib/server/controlled-mrt.ts`: `calculateControlledMrtComparison(input, dependencies?)`, `controlledMrtResponse(request, dependencies?)`. Dependencies reuse trusted citizen impact dataset/baseline/demand/access functions, never request-selected paths. New POST route `/api/experiments/mrt-comparison`, body bounded to 20 KB, no-store, same-origin checks, safe errors, process concurrency guard. One atomic response; cancellation/stale input cannot display mixed batches.

UI `components/controlled-mrt-panel.tsx`: props `{intervention,serviceDate,revision,canRun}`. Present duplicate action, B-only base/low/high number inputs, explicit calculate/cancel, side-by-side A/B results, sensitivity preferences, coverage and inspectable shared hashes/assumptions. On input/context change immediately hide/abort old results and ignore late completions. Scoped CSS uses current design tokens, field-label/run-button/table patterns. Mount inside existing MRT results inspector through a new Controlled options tab using the current execution binding and result invalidation revision. No mobile work.

## Work and verification

1. Backend/contract: red tests for strict inputs and response binding, frozen shared context and one source read, common-cohort arithmetic, zero coverage/ties/reversal, private data exclusion and safe endpoint bounds. Implement against full citizen facts, leaving normal impact cache untouched.
2. UI: red component/controller tests for duplicate isolation, supported input constraints, request identity, stale/cancelled results and existing styling; build accessible tables and disclosures.
3. Integrate reachable inspector tab without changing live AI planning, existing journeys, reports or old experiment comparisons. Clarify fictional discussion variability language.
4. Independent review, focused existing/new regressions with `--test-concurrency=2`, TypeScript, documented Webpack production build and desktop browser checks with offline fixtures. Do not use the unbounded full suite or paid inference. Document the model boundary and user workflow. No commit/push until requested.

## Execution and completion — 2026-11-07

- [x] Backend and browser contract: strict shape/arithmetic/snapshot/request validation, four-wait batch with identical-wait reuse, one private input context, full-roster weighting and public aggregate-only response. New endpoint has no-store, origin/body bounds and one process-level active batch.
- [x] UI/controller: explicit duplicate, immutable A, B-only waits, one atomic result, stale/cancel/binding revocation guards, coverage tables, shared hashes/assumptions and low/base/high preferences.
- [x] Reachable Controlled options inspector tab, reviewed MRT execution binding and current invalidation revision. Wider comparison uses the existing expand state with a scoped width override because the current map-first drawer is otherwise capped at 320 px.
- [x] Existing synthetic-discussion comparison now states that controlled repeated AI discussion describes model variability, not confidence intervals for Singapore residents; changed inputs confound that interpretation. No automatic repeated AI runs added.
- [x] Independent read-only review found no confirmed critical or important defects in cohort arithmetic, source pinning, privacy, controlled changes, API guards, stale handling or integration.
- [x] 133 selected new/existing regressions passed: `tmp/controlled-mrt-regressions.log`. Selection covers controlled tests, citizen impact/commutes/transport/workspace binding, experiment contracts/clients/persistence/UI, stakeholder engine/UI and MRT scenario calculations. The 19 focused new tests also passed after integration: `tmp/controlled-mrt-final-focused.log`.
- [x] TypeScript `--noEmit` passed. Final `npm run build -- --webpack` passed including TypeScript, 27-page generation and private build trace filtering: `tmp/controlled-mrt-build-final.log`.
- [x] Actual interactive component + real endpoint handler tested in an isolated offline desktop fixture with injected tiny population/network data: duplicate, edit, one atomic calculation, preference reversal, correct units/denominators, provenance disclosure, immediate invalidation with no auto-request and disabled review permission. Checked existing light chart-room styling and no desktop horizontal overflow. Browser inspection caught inherited dark-theme metric colors; scoped semantic text colors fixed and visually reverified. No mobile work.
- [x] Production HTTP smoke: app 200, malformed comparison POST 400/no-store, cross-origin POST 403. No default private calculation, paid provider call, fresh research or simulation recovery was used in verification.

Guide: `docs/CONTROLLED_MRT_COMPARISONS.md`. Comparison results remain in memory and are not saved as experiment records. Implementation and documentation remain uncommitted.
