# Assumption-review scenario alignment repair (2026-11-03)

## Reported problem

The question was “What if a new polyclinic was built at the marked point?”, but the review showed a professional-services employer considering a four-day workweek, with employer, leadership-support and unchanged-pay assumptions.

The question/attempt/context checks associated the response with the correct request. Those checks established identity, not whether the generated interpretation answered that question. An offline reproduction confirmed that an unrelated provider-authored plan could pass the old generation boundary and reach human approval.

The current local server had no test preload or mock flags enabled, and no matching stored review was found. Pending reviews are memory-only. A particular provider-side cause could not be established from the available records. Unconditional workweek/pay examples in the shared planner prompt were a plausible source of bias, not proof of the original response's cause.

## Repair

- Removed the unconditional workweek/pay examples. Assumptions are optional and must be material to the actual requested intervention; unresolved optional choices belong in uncertainties.
- Reused the existing second planning call to compare the original question with the complete candidate description, trigger and assumptions before proposing relationships. This remains **two planning calls**, with the existing model, timeouts, output limits and accounting.
- The new internal response schema is `dynamic_relationships_v3`, requiring `scenarioAlignment` (`aligned`, `mismatch` or `uncertain`) and `relationships`. Only `aligned` proceeds. Missing, malformed, negative or uncertain verdicts stop before approval or stakeholder execution; they do not trigger an automatic retry.
- A finite public `AI_PLAN_SCENARIO_MISMATCH` error tells the user that the plan could not be matched to the question and no simulation started. Rejected interpretation/assumption prose is excluded from the failure response.
- Legacy relationship parsing and immutable saved plans remain supported. Test/admission adapters recognize both relationship schema names under the same one-call relationship allowance; changing schema names cannot obtain another reservation.

The correspondence check uses the same model in a fresh request; it is not independent factual verification and can still make semantic mistakes. Human review remains necessary. An explicit question about both clinic staffing and a workweek remains allowed; no keyword ban was added.

Candidate text and the full original question are never truncated to fit this check. The existing 24,000-byte input limit remains enforced before dispatch.

## Validation

- Confirmed failing regressions before implementation: the old flow offered the unrelated workweek draft for approval, and the old planner had no alignment verdict.
- **267 related regression tests passed**, covering planning, assumption approval, browser error handling, map bindings, archived identities, API accounting, sixteen-source ASCII/CJK input bounds and shared admission limits.
- Negative, uncertain and missing verdicts stop after two planning calls, without approval capabilities, stakeholder calls, accepted-run files or retries. A matching clinic candidate still reaches human review.
- Independent source review found no important or critical issues in the reviewed paths.
- Provider behavior was mocked in these tests. No new paid inference or full-suite run was used for this repair.
- **Production build passed**, including TypeScript and page generation: `npm.cmd run build -- --webpack`. Log: `tmp/assumption-approval/alignment-build.log`. Postbuild filtering processed 29 trace manifests and removed 2,390 private references.

To replace a review that was already on screen, choose **Back to editing**, then **Explore** to prepare a new draft. Existing displayed drafts are not silently regenerated.
