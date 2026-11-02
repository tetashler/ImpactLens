# Human-in-the-Loop Assumption Approval Specification

Status: implemented following subsequent user authorisation; verification record below.

Prepared: 2 November 2026. Source inspection checkpoint: `dd8df8a`, with concurrent uncommitted UI work. Recheck source before implementation. This document specifies the feature; it does not claim that the feature or its tests exist.

## Goal

When a user clicks **Explore**, AI prepares the scenario and proposes its assumptions. Before stakeholder or social simulation starts, the user must explicitly choose **Allow** or **Do not allow** for every AI-proposed scenario assumption. Simulation uses allowed assumptions; rejected assumptions remain unknown.

The user wants implementation and testing completed within a maximum target of two hours, preferably faster. This is a scope and timebox constraint, not a guaranteed estimate or permission to omit the approval gate or meaningful tests. The interview initially paused implementation. The user subsequently authorised it with **Implement it** and authorised parallel subagents. The user later excluded further mobile-compatibility work; remaining verification focuses on desktop.

## Decisions confirmed during the interview

| Topic | Agreed behaviour |
| --- | --- |
| Rejection | The proposition becomes unknown; rejecting it does not establish its opposite |
| Scope | AI-proposed scenario assumptions only; numerical settings remain in existing editors |
| Initial choices | Nothing preselected; every reviewable assumption needs an explicit decision |
| Location | Inline review temporarily replaces the question panel; the map remains visible |
| Reject all | Permitted; simulation continues from the original question without accepting those assumptions |
| Conditional discussion | Permitted if explicitly hypothetical; rejected assumptions must not become accepted facts |
| Empty assumption list | Show “No additional assumptions proposed” and a **Continue** button; never start automatically |
| Editing | Changing the question or drawing requires a fresh review |
| Report | Retain and display both allowed and rejected assumptions |
| Delivery | Keep the first implementation as small as practical within the two-hour target |

The editing/report behaviours were stated during the interview and retained in this final specification. Technical details below are recommended implementation choices, not additional user-selected product features.

## Product flow

1. **Question:** User writes a question and optionally draws an intervention, then clicks the existing **Explore** button.
2. **Preparation:** Show “Preparing assumptions for your review…”. Existing bounded planning produces a validated scenario and assumption list. Retrieval/planning can incur provider usage; no new model call is required solely to generate the review UI.
3. **Review:** Replace the question panel contents with the original question, a short draft interpretation and the assumption list. Keep the map visible.
4. **Decisions:** Each item has an accessible two-choice radio group, **Allow** / **Do not allow**, with neither selected initially. Users can change their choices before starting.
5. **Start:** **Start simulation** is enabled only when every reviewable item has a choice. The server validates the complete decision set and creates the effective reviewed scenario before any stakeholder action.
6. **Result:** Existing Graph/Report views show the resulting run. Report includes an **Assumption review** section with the decisions for that run.

Review actions also include **Back to editing** and **Cancel**. Back preserves the original question and geometry but discards the draft and choices. Cancel clears the pending review and starts no simulation. Neither action triggers another AI request automatically.

For zero reviewable assumptions, keep the review screen, show “No additional assumptions proposed”, and replace Start simulation with **Continue**. Continue is still an explicit server-side approval of an empty decision set.

## Meaning of Allow and Do not allow

Example question: “What if Singapore introduced a four-day workweek?”

AI assumption: “Monthly pay remains unchanged.”

- **Allow:** The simulation may use unchanged pay as an explicitly human-allowed hypothetical condition. It remains an assumption, not a measured fact.
- **Do not allow:** Pay is unresolved. The simulation cannot infer a pay cut or unchanged pay. It may say, “If pay remains unchanged…” or explain that the answer depends on pay arrangements.

Review helper text:

> Allow assumptions you want this hypothetical simulation to use. “Do not allow” leaves the matter unknown; it does not mean the opposite is true. AI responses remain fictional and may make mistakes.

Do not implement rejection as a negative factual condition, delete it only from the UI, or silently replace it with another assumption. No automatic replanning or replacement-assumption request belongs in v1.

## Scope and boundaries

### Included

- Review additional scenario assumptions already generated in `DynamicDraft.assumptions` (currently bounded to six items, each at most 300 characters).
- Support the ordinary public Explore workflow, including its supported plotted MRT path. Existing map-clarification results remain clarification screens, not runnable assumption drafts.
- Bind review choices to the exact prepared plan, question, drawing revision and relevant hybrid settings.
- Enforce the complete decision set on the server and carry it through stakeholder generation, social-agent context and reports.
- Retain existing cancellation, stage deadlines, provider routing, spend admission and historical replay behaviour.

### Excluded

- Editing assumption wording, providing replacement assumptions, bulk Allow all, saved preferences or automatic choices.
- Reviewing/replacing numerical settings, source evidence, demographic weights, synthetic citizen attributes or personalities.
- Modifying the original user-authored conditions. Show those as read-only **Given in your question**, not selectable AI additions. At minimum exclude exact known verbatim user-condition duplicates from the additional-assumption review list; do not claim reliable semantic duplicate detection.
- A new account/reviewer identity system, separate review page, durable pending-draft recovery, cross-device review or a new audit subsystem.
- Approval of each agent response, model training, semantic guarantees of factual correctness or a paid live-provider evaluation.

Existing deterministic/hybrid preparation may calculate its current preview inputs before review if necessary to preserve the small scope. Such calculations remain subject to their existing explicit numerical confirmations. They do not count as permission to start stakeholder actions, personality generation or the social world. The feature controls AI scenario assumptions, not a new approval layer over numerical engines.

## User interface states

| State | Visible behaviour |
| --- | --- |
| Editing | Existing question and plotting controls |
| Preparing | Progress and Cancel; no enabled execution action |
| Reviewing | Interpretation, assumptions, decisions, answered count and action buttons |
| Starting | Disable duplicate submission; show “Starting simulation…” |
| Running/result | Existing execution, graph and report flow |
| Expired/stale | “This review is no longer current. Prepare a new review.”; return to editing explicitly |
| Failed preparation | Safe existing diagnostics; no executable partial draft |

Use existing map-panel styles and native inputs. Put each radio group in a labelled fieldset; use distinct names per assumption ID. Keyboard users can select both options, reach actions and return to editing. Move focus to the review heading after preparation. Do not allow Enter on the original form or navigation to start a reviewed run implicitly. Escape must not approve.

Display progress such as “2 of 4 assumptions reviewed”. No additional checkbox or typed confirmation is required. Rendering must escape generated text; do not render model HTML.

Question, geometry, geometry revision, station selection/order, anchor, service-date or timing changes invalidate the draft and choices. Returning from question A to B and back to A still requires fresh preparation. Normal review has no active request timer or AI concurrency slot.

## Architecture: minimal implementation recommendation

### Existing integration points

| File | Why it matters |
| --- | --- |
| `app/api/scenario-simulate/route.ts` | Public entry point currently delegates to all-in-one execution |
| `lib/server/society/public-service.ts` | Performs hybrid preparation, dynamic execution and accepted-run registration |
| `lib/server/inference/dynamic-service.ts` | Planning currently proceeds directly into initial stakeholder actions |
| `lib/dynamic-scenarios/plan.ts` | Validates/freezes/hashes plans and maps assumptions through `assumptionsForPlan()` |
| `lib/dynamic-scenarios/execution.ts` | Converts the plan into authoritative stakeholder input |
| `lib/server/inference/deepseek.ts` | Encodes initial stakeholder context; its scenario-plan projection currently selects explicit fields |
| `lib/server/society/service.ts` | Copies draft assumptions into society briefing; currently takes only the first four |
| `lib/society/hybrid.ts` | Builds per-agent decision context from the saved world and briefing |
| `lib/society/decision-menu.ts` | Encodes menu contexts; policy-specific encoders may take separate branches |
| `lib/server/inference/social.ts` | Selects multiple social-policy prompts/encoders, including v7 |
| `lib/question-simulation/client.ts`, `public-session.ts` | Request identity, cancellation, stale-result protection and strict public parsing |
| `components/map-scenario-panel.tsx`, `workspace.tsx` | Review UI and execution dispatch |
| `components/communication-report.tsx`, `lib/society/public-contract.ts` | Display and preserve the run's decisions |
| `lib/report-summary/evidence.ts`, `lib/graph-summary/evidence.ts` | Allowlist data passed to AI report/graph writers; must explicitly include review constraints |
| `lib/server/report-summary.ts`, `report-detailed.ts`, `graph-summary-evidence.ts` | Quick/detailed report and graph-summary generation, including snapshot/cache identity |

These are source inspection findings, not instructions to rewrite every listed file. Prefer small shared helpers and controlled optional fields; preserve old paths when review metadata is absent.

### Two-stage server flow

**Prepare:** Validate the request and configuration; claim its attempt before paid planning; run existing planning; retain the validated original plan and necessary hybrid preparation on the server; return a safe review projection and opaque draft capability. Do not call `executeLiveRun`, initialise personalities, register a social world or start its coordinator.

**Start:** Accept only the draft identity/capability, matching current context and decision IDs/values. Retrieve server-owned assumption text, require exactly one decision per reviewable ID, derive the effective reviewed plan, then execute it once through the existing pipeline.

Keep public version-1/2 all-in-one calls from bypassing this stage in the ordinary Explore route. Return an explicit review-required error for old public execution envelopes. Historical read/replay and explicit internal fixture handlers retain their existing semantics.

Use a bounded process-memory store: at most 16 preparing/pending/executing entries, 15-minute pending TTL, random opaque capability, and original trusted hybrid object references where required. Server restart invalidates pending reviews. Duplicate starts must return existing progress/result or a controlled already-used response, never dispatch again. Retain small consumed-attempt tombstones for the existing 24-hour/2,048-identity bound; do not hold thousands of full plans/results. No new database or persistent pending-draft store.

Preparation must not consume an immutable execution-storage claim merely to display assumptions. Reuse read-only capacity checks; reserve the existing execution claim when starting. If capacity disappears while reviewing, stop before execution with the existing safe error. If retaining existing hybrid callbacks, ensure they receive the fresh execution abort signal; they must not capture an expired preparation request's signal.

Treat a lost start response as uncertain; inspect existing status if available or show a controlled failure. Do not auto-start another run or regenerate a plan. Existing spending/task authority remains separate from clicking Start.

### Decision record and canonical effective plan

Recommended small shared record:

```ts
type AssumptionDecision = {
  assumptionId: string;
  decision: 'allow' | 'do-not-allow';
};

type AssumptionReview = {
  version: 1;
  policy: 'assumption-approval-v1';
  sourcePlanId: string;
  contextKey: string;
  reviewedAt: string;
  items: {
    assumptionId: string;
    text: string;
    decision: 'allow' | 'do-not-allow';
  }[];
};
```

The browser sends IDs and decisions, never authoritative text, timestamps, source plans, policies or population data. The server supplies the rest from its stored original draft and current clock. Reject extra, missing, duplicate, unknown or malformed decisions before dispatch; order the saved items by original draft order.

Create a derived immutable plan whose explicit additional assumptions contain only allowed items, while preserving original user conditions. Retain all choices in a versioned optional `assumptionReview` record included in canonical plan identity. The derived plan gets its own plan ID; it points to the source plan ID. Do not mutate a frozen draft or reuse its old hash after filtering.

Extend plan parsing/creation/validation consistently and preserve byte-identical identities for old records without the new field. At validation time, ensure the derived assumptions agree exactly with the allowed review items plus any read-only verbatim original conditions. The server creation path also compares all items against its stored source draft. Use existing `createDynamicPlan`/`validateDynamicPlan` facilities, not manual unchecked hash substitution.

Copy a bounded, validated review projection into accepted public metadata for report/history rendering. Store the canonical review inside the effective plan so normal private execution persistence retains its provenance; no separate audit-file system is needed for v1. Historical records without review metadata show no invented approval.

## Rejected assumptions must reach every relevant AI path

Filtering `draft.assumptions` is necessary but insufficient. Rejected premises may still occur in role goals, draft descriptions, graph relationships or subsequent messages. Existing society briefing also truncates assumptions to four, and policy-specific encoders can omit newly added context fields.

Required behaviour:

1. Initial stakeholder input and its selectable assumption IDs contain only allowed additional assumptions and original user conditions. Rejected IDs cannot be selected as accepted assumption references.
2. Every initial stakeholder request receives the complete review constraints: allowed hypothetical assumptions and rejected propositions explicitly marked **unknown, not false**.
3. Society genesis/briefing retains the complete review record. Do not place six reviewed items into an existing four-item slice and silently lose decisions.
4. Every supported social-policy encoder, including the v7 path, carries that complete bounded review policy. Verify actual outbound context, not only TypeScript types or intermediate objects.
5. Apply a shared system-prompt instruction across supported generation paths: review decisions override model-proposed descriptions/goals or fictional source claims for scenario premises. Rejected propositions remain unresolved; conditional discussion is allowed; do not infer the opposite or introduce an unreviewed settled premise to replace one.
6. Earlier model-proposed roles/relationships stay labelled proposals, never independent proof of a rejected premise. Existing source facts and numerical facts keep their provenance; human rejection does not modify official datasets or synthetic citizen records.
7. Carry the review through saved-world restoration so continuing a reviewed run uses the same decisions. Old worlds without a review follow their original path.
8. Pass the same complete review policy into quick report, detailed report and graph-summary generation. `projectReportEvidence()` currently allows the ordinary assumptions list but not a review record, and `projectGraphSummaryContext()` selects a smaller subset that omits that list. Extend these evidence projections and corresponding writer prompts deliberately. Include review decisions in each relevant snapshot/cache identity so a previously generated unreviewed summary cannot be reused for a reviewed scenario. Keep these summaries available in v1; they must not silently re-establish a rejected premise when narrating the results.

One practical implementation is an optional review field in the existing saved briefing plus a shared context/prompt projection, applied after selecting each current policy encoder. Preserve the old encoded payload exactly when the field is absent. Keep the existing 24,000-byte context bound; if complete review constraints cannot fit, fail safely rather than silently dropping rejected items or increasing the bound.

No extra AI replan or automatic evaluator is required. Structural enforcement and prompt-policy propagation are testable; they do not guarantee that a language model will never state a rejected premise incorrectly. Do not describe the feature as semantic proof or complete bias prevention. A finite phrase blacklist is not a sufficient enforcement mechanism.

## Report and history

Add an **Assumption review** section:

- Original assumption text with **Allowed** or **Not allowed — treated as unknown**.
- Review timestamp.
- Notice: “These choices define the hypothetical scenario. They do not verify the assumptions or AI responses.”

Show the empty-review case as “No additional assumptions were proposed; user continued.” Keep report sections readable when all assumptions are rejected. Graph inspection must not label rejected assumptions as accepted premises; if it exposes review information, use the same explicit status. A new interactive graph-review UI is out of scope.

Bind metadata to the actual effective plan/run, not the current editing panel or another archive. Retain it when saving/loading accepted runs and refreshing society summaries. Do not put a live draft capability into browser persistent storage, report exports, logs or graph metadata.

## Safeguards and verification

Use existing JSON limits, exact-key parsers, origin checks, safe error messages and Node runtime. Do not accept executable plans or browser-selected storage paths. Preserve current phased inference admission, its local-versus-provider timers, native-dispatch checks and conservative unknown-cost accounting. An approval click does not reset an external task deadline or grant paid calls.

Essential automated checks:

- Preparation returns the proposed assumption list with zero initial stakeholder, personality and social completions.
- Every decision is initially unanswered; Start is disabled until complete; all-rejected and zero-item Continue both work.
- Server rejects missing/duplicate/unknown decisions, tampered context and old public bypass requests with zero execution calls.
- Allow/reject choices produce a new valid canonical plan; allowed assumption references are correct; source plan remains unchanged; old plan identities still validate.
- Rejected items appear as unknown in actual stakeholder and social request bodies, including v7, without being truncated or promoted to accepted references. Test a rejected premise repeated in a role description/previous message to verify the review instruction is still present and has stated precedence.
- Question A → B → A, geometry/options edits, cancellation, late responses, expiry and duplicate Start cannot execute stale or multiple runs.
- Review state has no running provider timeout; callbacks use the execution signal; absolute spending deadlines and phased admission survive refactoring.
- Report and restored-run context preserve both categories and the right run identity. Historical runs without metadata still load.
- Quick/detailed report and graph-summary provider contexts include rejected-as-unknown constraints; changing a decision changes their evidence snapshot identity. The shared review projection is complete even where the ordinary summary evidence omits assumptions.

Use mocked providers for feature acceptance. A mock proves application behaviour and prompt propagation, not actual model compliance. No paid evaluation is authorised by this specification.

Browser checks: one question with mixed choices, reject-all, zero assumptions, Back, Cancel, duplicate click, a plotted supported scenario and a changed drawing. Check keyboard navigation and 1440×900 / 390×844 layouts. Verify no result links or society activity appear while review is pending.

Run focused tests first, then the project's required type/build/regression checks as time permits. Record exactly which checks ran and which remain. Do not call incomplete verification complete to meet the time target.

## Proposed two-hour implementation sequence

| Timebox | Deliverable |
| --- | --- |
| First 15 minutes | Inspect current diff and local Next guides; verify plan/execution split and source compatibility; identify actual test commands |
| Next 40 minutes | Extract prepare/start, add bounded server draft handling and canonical decision filtering/metadata |
| Next 30 minutes | Wire inline decision UI, invalidation, agent-context propagation and report display |
| Final 35 minutes | Focused regression tests, browser checks, type/build checks and fixes |

This is a target sequence, not evidence that the work fits. Agent-context propagation, canonical identity and saved-world compatibility are essential parts of this particular feature; they are more substantial than approving an entire unchanged plan. If the first checkpoint shows the two-hour target is not realistic, report that early and propose a smaller scope for the user to choose. Do not silently drop the social path, all-rejected support, server validation or individual choices.

Keep implementation files focused: a browser-safe assumption-review contract/projection helper, a server-only draft helper, a small review component, and narrow adapters in existing services. Avoid new approval frameworks, a broad refactor or unrelated visual changes. Do not stage or modify concurrent work.

## Acceptance checklist

- [x] Explore prepares assumptions and pauses before stakeholder/social execution.
- [x] User explicitly answers every additional assumption; nothing is preselected.
- [x] Allowed assumptions are usable hypothetical premises; rejected ones remain unknown.
- [x] Reject-all and explicit zero-item Continue work.
- [x] Review is inline with the map visible; editing/cancel/expiry behave honestly.
- [x] Choices reach initial stakeholder and subsequent social contexts and survive restoration.
- [x] Server identity/validation prevent stale, forged or duplicate execution.
- [x] Report shows the run's exact choices without implying factual verification.
- [x] Required mocked tests and actual checks have recorded results and limitations.
- [x] No implementation begins until the user separately authorises it.

## Spec handoff

The interview and authorised implementation are complete. The feature follows this scoped specification. The earlier whole-scenario interpretation-approval proposal is background only; it does not override the per-assumption behaviour agreed here. No older research document needs to be restored or recreated to implement this spec.


## Implementation and verification record ? 3 November 2026 (Singapore)

- Explore returns a server-held assumption draft; complete per-item choices are required before Start. An empty draft still requires Continue.
- Rejected assumptions are excluded from accepted assumption references and carried as unknown constraints through stakeholder, social, report and graph-summary prompts. The effective immutable plan hashes the decisions; historical records without review metadata retain their original interpretation.
- A bounded process-owned draft store prevents duplicate execution and invalidates discarded/expired drafts. Pending reviews do not consume permanent session storage.
- Independent review found and resolved a swallowed preparation timeout and final social-context byte undercount. Both have RED/GREEN regressions.
- Clean full suite: 2,379 passed, zero failures, skips or cancellations, using Node test concurrency 2. Two added packaging tests passed separately alongside the existing tracing policy regression.
- TypeScript and whitespace checks passed. Production build passed with `npm run build -- --webpack`; default Turbopack compilation was stopped after prolonged compilation, so its success is not claimed.
- Built-app HTTP check: two planner completions before approval, eight stakeholder actions after mixed decisions, and old public execution envelopes rejected. All provider responses were mocked; no paid call was made.
- Actual desktop headless Chrome at 1440?900: no preselected decisions, Start disabled until complete, Back/Cancel without inference, exactly eight actions after Start, correct saved Report statuses, no overflow and no runtime exceptions. Desktop screenshot visually inspected. Geographic rendering was not certified because external requests were blocked in this focused UI check. No further mobile work followed the scope correction.
- Windows Webpack tracing did not honour existing absolute-path exclusion matching. A postbuild filter removes only exact private runtime roots; public employment inputs are explicitly traced. Final check: 28 manifests, zero private runtime references, eight required public CSV/metadata assets retained. Containment, public-asset retention and idempotence are tested. Future standalone output needs separate copied-file verification; current config does not use it.
- Local evidence: ignored `tmp/assumption-approval/` contains `full-final.log`, `types-postbuild.log`, `build-final.log`, `built-http-result.json`, `headless-browser-results.json`, desktop screenshots, `tracing-final.log` and `trace-verification.json`.
- No dependency installation, deployment, paid evaluation, dataset mutation, history deletion, commit or push. Concurrent UI/theme changes were preserved.
