# Controlled MRT option comparisons

Use this workflow to test how a reviewed MRT proposal behaves under different proposed-service waiting assumptions. It executes the existing citizen commute calculator; the historical experiment notebook still compares saved configuration and evidence inputs only.

## Workflow

1. Draw and review an MRT line using the existing Plot Tools and MRT calculator controls. Keep the explicit timing and geometry confirmations.
2. In the MRT results inspector, choose **Controlled options**. **Expand comparison** uses the existing wider dashboard layout.
3. Duplicate the current proposal, Option A, to create Option B. A remains fixed. Only B's proposed waiting time is editable in this workflow; line identity, stations, segments, running time, dwell, interchange walking and other assumptions stay identical.
4. Enter B's base waiting time and a low/high range. These are hypothetical user inputs, not measured headways. Low must be no greater than base, and high no smaller; all waits are whole seconds from 0 to 3,600.
5. Calculate the batch. Compare A with B at base, then inspect low/base/high B against the same fixed A. Changing the proposal, service date, execution permission or any comparison input invalidates old displayed results.

The action calculates locally on the server. It does not ask an AI model, start a stakeholder discussion, fetch fresh web evidence or recover a saved simulation. Results are a single in-memory batch rather than new saved experiment records.

## What stays controlled

Each request prepares one citizen dataset, one baseline rail graph, one OD demand reference and one station-access snapshot. All variants reuse that private context. Shared identities and hashes are inspectable with the assumptions; they identify the inputs used, not a claim that those inputs were newly verified against live operations.

The wait applies to initial boarding and transfers **onto the proposed line**. Existing-network waits remain fixed. Route geometry does not infer running times. Existing routes remain available, so lowering the proposed wait cannot make a shortest path slower under this model.

## Interpreting the result

- **Common cohort:** the same synthetic representatives with comparable finite baseline and option travel times across every tested variant. Means and preference differences use this one expansion-weight denominator.
- **Travel-time difference B minus A:** positive means B is slower; negative means B is faster. Savings compare with the same existing-network baseline. Values are static model estimates, not observed journeys.
- **Preferred option:** the one with the lower weighted mean travel time for the common cohort. It is a travel-time ranking only; costs, construction, capacity, crowding, reliability, feasibility and resident preferences are outside this objective.
- **Unknown and unassessed population:** retain their coverage categories rather than receiving invented zero savings. Newly reachable journeys cannot establish a finite saving from an unreachable baseline. Non-rail and no-work-trip cases remain separately not applicable. Excluded common-cohort weight is shown explicitly.
- **No comparable cohort:** means and preferences remain unknown, even if some coverage counts are available.
- **Low/base/high sensitivity:** three declared assumptions, not statistical confidence bounds. Preference changes include a change to or from a tie. If the tested ordering never crosses, the correct result is no change within that range; no reversal is invented.

Expansion weights describe the synthetic population representation. The calculator uses hypothetical work locations, schedules and access proxies; these are not observed individual Singapore residents or a population opinion survey. Individual profiles and commute records remain server-side; only aggregate outcomes, public source metadata and shared snapshot identities are returned by the comparison endpoint.

Repeated AI discussions are a separate kind of comparison. When population, scenario, source snapshots, roles and model settings are controlled, their spread may describe **model variability**. Those ranges are **not confidence intervals for Singapore residents**. Changing those inputs confounds the comparison. This deterministic MRT workflow does not automatically launch repeated AI discussions.

## Implementation

- Browser contract: `lib/experiments/controlled-mrt.ts`.
- Batch calculation and bounded POST boundary: `lib/server/controlled-mrt.ts`, exposed by `/api/experiments/mrt-comparison`.
- UI and stale-response handling: `components/controlled-mrt-panel.tsx` and `lib/experiments/controlled-mrt-client.ts`.
- Existing MRT workspace integration: `components/workspace.tsx`.
- Existing fictional-run interpretation: `lib/stakeholder-simulation/comparison.ts`.

No changes to the existing experiment V1 execution status are implied. Saving a configuration still does not mean it was calculated.

## Verification

Verified on 2026-11-07: **133 selected regression tests passed**, including **19 new focused tests**. TypeScript and the documented `npm run build -- --webpack` production build passed. Desktop browser checks used the actual interactive panel and endpoint handler with a tiny offline fixture; they covered duplication, edits, one-request calculation, preference changes, provenance inspection and invalidation. The existing light chart-room colors were checked, including readable metric text. Production smoke returned app 200, malformed POST 400 / `no-store` and cross-origin POST 403. No live AI calls or automatic saved-simulation recovery were used.

Focused feature checks:

```powershell
node --test --test-concurrency=2 lib/contracts/tests/controlled-mrt-*.test.ts
node node_modules/typescript/bin/tsc --noEmit
npm run build -- --webpack
```

These tests verify implementation and arithmetic, not calibration against observed commute behaviour. A full default-data comparison was not executed during verification.
