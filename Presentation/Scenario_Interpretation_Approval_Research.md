# Scenario Interpretation Approval — Research and Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Steps use checkboxes. This document authorises research and planning only; product implementation is a later task.

**Goal:** After AI generates a scenario plan, require the user to inspect and approve its interpretation before any stakeholder action, personality generation or social simulation begins.

**Architecture:** Split existing planning from execution. Retain the validated plan in a bounded server-owned pending-review store, return a safe review projection, and execute that exact plan only after an explicit approval request. Keep existing simulation engines, provider routing, accepted-history formats and numerical assumptions intact.

**Tech stack:** Existing Next.js App Router, React, TypeScript, Node.js 24+, native Node tests and local private storage. No new dependency or model is required.

**Spec:** The “Product specification” and “Contracts and lifecycle” sections in this file define the proposed first version. These are researched recommendations, not implemented behaviour.

**Research baseline:** 2 November 2026; checkout HEAD `58bd4ea`. The working tree also contains unrelated changes and untracked geographic-selection work. Recheck current source before implementation; do not overwrite or absorb unrelated work. Research used source inspection, local Next.js documentation and primary web sources. Application tests/build and paid provider calls were not run for this document.

**Research refresh:** Rechecked on 2 November 2026 after the implementation-research follow-up. The approval feature is still absent from application code: the route still invokes `handlePublicExplore`, which still proceeds from hybrid preparation through `handleDynamicRequest` into execution. Newly present transport-admission changes in the working tree are accounted for below. Their acceptance report was still in progress when inspected; this document does not certify their tests or live outcome.

## Implementation starting point

The implementation process has been researched against the actual source, not only the UI idea. Start with Task 1's contracts and fixtures, then Task 2's service extraction. Build the approval UI after the server can demonstrably prepare a plan without executing it. Task 4 closes the old public execution path before the feature is considered complete.

The first observable milestone is a mocked Prepare request returning the AI's interpretation with **two planner completions and zero stakeholder-action, personality or social completions**. For hybrid questions, the existing additional semantic call remains optional and bounded. The next milestone is one approval executing that identical plan without a new planner call. These counters are the evidence that the checkpoint is real.

Before starting product changes, inspect the current working-tree diff, read installed Next.js guides, use an isolated checkout if needed, and rerun the narrow baseline tests in task-owned temporary storage. The source is being developed concurrently; do not transplant stale transport code from the research baseline or overwrite untracked admission/selection work. No installation, source-data regeneration or paid inference is necessary to begin implementation.

## Global constraints

- Require explicit approval in the ordinary Map → Explore workflow for both plotted and unplotted questions.
- Reuse the exact approved plan; approval must not generate a replacement interpretation.
- Before approval: zero stakeholder-action calls, zero personality calls, zero social decisions, zero background simulation jobs and zero Explore-triggered numerical impact runs.
- Preparation may make the existing optional retrieval request, at most one hybrid semantic interpretation call and the two existing planning calls. Disclose that these can incur usage before approval.
- Preserve existing provider identity checks, stage limits, task guards, privacy boundaries, cancellation and no-automatic-retry behaviour. Human approval confers no new paid-call authority.
- Do not modify accepted historical runs, frozen policy semantics, source datasets, population weights, numerical formulas or existing immutable storage claims.
- First version supports Approve, Revise question/drawing and Cancel. Direct editing of model-generated plan fields is deferred.
- Review approval means “this matches my intended hypothetical scenario”; it does not mean verified evidence, representative public opinion or approval of future AI statements.
- Pending reviews expire after 15 minutes and do not survive a server restart. Accepted-run histories retain their existing persistence.
- This first version runs in one local Node process. Multiple web workers/replicas and cross-process draft sharing are unsupported; add durable shared approval storage before changing that deployment model.
- No new package, database, account system, deployment or paid live evaluation is part of this feature.

## Review focus

1. Changed question, timing, anchor or drawing must never execute an older plan; test question A → B → A as well as ordinary edits.
2. A duplicate approval, double-click, lost response or second browser tab must not spend twice; uncertain execution must stop without a replacement run.
3. Pending review must release request timers/AI slots; a slow reviewer must not cause the existing 130/240-second attempt timer to execute or discard work silently.
4. Hybrid interpretation uses trusted object identity; cloning/rebuilding the wrong object can fail its WeakSet checks or silently regenerate a different interpretation.
5. New public metadata must survive report/history parsing without leaking capability tokens, private population records, paths or internal hybrid snapshots.

## Research findings: the actual integration points

| Existing file | Observed behaviour | Implementation consequence |
| --- | --- | --- |
| [Scenario API](../app/api/scenario-simulate/route.ts) | POST delegates to `handlePublicExplore` | Enforce the new protocol here; a UI-only gate is insufficient |
| [Main hook](../components/use-question-simulation.ts) | Creates `createQuestionSimulation({execution:'dynamic', publicOnly:true})` | The normal app uses the public workflow, not just the older `DynamicSession` |
| [Question controller](../lib/question-simulation/client.ts) | `prepare()` invokes `PublicScenarioSession.execute()`, which currently returns a run | Add a real awaiting-approval phase and a separate approval action |
| [Browser public session](../lib/question-simulation/public-session.ts) | Sends version 1/2 requests to `/api/scenario-simulate`; strictly parses `PublicExplore` | Introduce prepare/approve/discard transport; update strict result parsers deliberately |
| [Public server orchestration](../lib/server/society/public-service.ts) | Validates storage, prepares hybrid inputs, calls dynamic execution, then registers the result | Separate preparation from execution while keeping storage and registration checks |
| [Dynamic service](../lib/server/inference/dynamic-service.ts) | Retrieval → entity planning → registration → relationship planning → `createDynamicPlan` → `executeLiveRun` | The approval boundary is immediately after validated plan creation, before `createDynamicInput`/live execution |
| [Structured transport](../lib/server/inference/deepseek.ts), [local inference admission](../lib/server/inference/admission.ts) | The working-tree transport recognises a server-only admission capability for `social_decision_v1`; local verification/reservation has a separate deadline from provider response handling | Preserve the phased transport and its capability through the approval refactor; human review is a separate earlier stage, not a provider-admission hook |
| [Hybrid preparation](../lib/server/interventions/explore.ts) | Interpretation and station-selection validation precede deterministic impact calculation; personality generation is deferred through callbacks | Split semantic interpretation from impact/callback initialisation so approval can precede both |
| [Hybrid context](../lib/interventions/hybrid.ts), [handoff](../lib/interventions/handoff.ts) | Trusted context objects are tracked with WeakSets | Keep original server objects in memory; serialisable copies alone are not executable trusted contexts |
| [Plan contract](../lib/dynamic-scenarios/plan.ts) | Plan includes description, trigger, scope, roles, assumptions, uncertainties, spatial requirement and provenance | Build the review card from existing fields; no extra AI summary request |
| [Execution adapter](../lib/dynamic-scenarios/execution.ts) | `createDynamicInput(plan)` validates and maps the plan to stakeholder input | Reuse unchanged after approval |
| [Workspace](../components/workspace.tsx), [dynamic client helper](../lib/dynamic-scenarios/client.ts) | `startQuestion()` uses `startQuestionWork()`, which can start native MRT/AAC calculations concurrently with exploration | Remove concurrent Explore-triggered calculations; explicit standalone calculator actions can remain separate |
| [Map panel](../components/map-scenario-panel.tsx) | Displays busy, error, hybrid clarification and result states | Add a dedicated interpretation-review panel, distinct from existing map-connection clarification |
| [Storage admission](../lib/server/society/storage-admission.ts) | Sixteen additional slots; claims are immutable and consumed forever | Do not reserve an execution slot merely to prepare a review; cancelled drafts must not consume permanent session slots |
| [Result visibility](../lib/question-simulation/map-view.ts) | Requires matching request/geometry and a recorded run | Pending interpretation is not a completed run and must not expose result links |
| [Public contract](../lib/society/public-contract.ts), [public parser](../lib/question-simulation/public-session.ts) | Explicit public fields and strict validation | Add a small optional human-review receipt and preserve compatibility with unreviewed historical records |

Existing `needs-map-review` means missing/unsupported spatial inputs. It is not approval of an AI-generated scenario. Do not overload it or permit an approval button to bypass station/connection validation.

### Relevant framework and design guidance

- Installed Next.js reference: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`. It describes native Request/Response Route Handlers. Read the installed guide again when implementing; use Node runtime for private filesystem operations. This research did not substitute remembered framework conventions for local documentation.
- Microsoft recommends making AI errors easy to correct, explaining system behaviour and providing user controls. Here, revision and explicit approval are the concrete application of that guidance. The guidance does not establish that this particular interface is usable without testing. [Microsoft Research: Guidelines for human–AI interaction](https://www.microsoft.com/en-us/research/blog/guidelines-for-human-ai-interaction-design/)
- Multiple workflow steps alone are not a CSRF defence. Keep origin/content-type checks and use unpredictable review capabilities in POST bodies rather than URLs. This local feature is not an account-based authorisation system. [OWASP: Cross-Site Request Forgery](https://community.owasp.org/attacks/csrf)

### Latest local execution evidence and its implementation implications

The [geographic-selection integrated evaluation](../docs/GEOGRAPHIC_SELECTION_V7_REAL_PROVIDER_INTEGRATED_ACCEPTANCE.md) records successful planning, eight initial actions and personality initialisation, followed by a timeout at the first social opportunity with zero returned social responses. That report recommends separating local proof/admission work from the provider-response timer. This is execution evidence and a regression risk, not evidence that interpretation approval already exists.

The newer [admission-timeout repair report](../docs/ADMISSION_TIMEOUT_REPAIR_AND_REAL_PROVIDER_SMOKE_TEST.md) and working-tree transport introduce that separation. Its final verification/live sections were pending at the research refresh. Treat the code as concurrent work to preserve and revalidate; do not claim its eventual acceptance from this snapshot.

Specific constraints for the approval implementation:

- Human review waits occur before any execution reservation or local social-admission permit. Do not hold a provider reservation, open network request or response timer while the user reads the card.
- Preserve `INFERENCE_ADMISSION_V1` and `INFERENCE_NO_DISPATCH_V1` semantics in `lib/server/inference/admission.ts`. These are server-process capabilities, never fields supplied by the browser or stored in a public review envelope.
- `inferenceAdmissionFor()` currently recognises only the `social_decision_v1` schema. Do not attach its hook to planning, stakeholder or personality schemas as a shortcut for human approval. Those keep their own existing admission/limits.
- An explicit injected fetch wrapper must preserve the intended capability or delegate to the original guarded adapter. Default Next.js-wrapped fetch has a process-registration fallback; explicit injected fetchers intentionally remain isolated. Test this when moving dependencies across service boundaries.
- The admission receipt binds exact serialised provider-request bytes. The older `beforeDispatch` callback hashes canonical JSON. These are distinct identities: do not replace one with the other or reuse `reviewDigest` as a provider-body hash.
- A pre-native cancellation may be recorded as zero usage only after the guard's authoritative durable no-dispatch proof. A request that may have reached the provider retains unknown usage/reservations. Human cancellation or a discarded draft is not billing proof.
- Existing admission prewarming is local verification only. A warm proof never bypasses current actor, plan, selection, source, request-body or deadline checks.

## Product specification

### User journey

1. User writes the question and optionally draws an intervention.
2. Explore becomes **Prepare interpretation**. The app performs bounded planning and shows “Preparing a draft interpretation…”.
3. A review card appears in the existing Map panel. No stakeholder dialogue, social world or numerical impact run has started.
4. User chooses **Approve and simulate**, **Revise question or drawing**, or **Cancel**.
5. Approval executes the stored plan, then uses existing run registration, society initialisation and graph/report behaviour.
6. Report displays “Scenario interpretation reviewed by user” with approval time. Keep AI-generated/synthetic disclosures.

Do not add a checkbox, typed confirmation, login or named reviewer requirement. One deliberate approval action is enough for this local prototype.

### Review card

Heading: **Review the AI’s interpretation**.

Introductory copy: “Check that this matches what you want to explore. Approving confirms the scenario’s meaning, not the accuracy of its assumptions or future AI responses.”

| Section | Source | Presentation |
| --- | --- | --- |
| Original question | `plan.request.question` | Exact submitted text |
| Interpretation | `plan.draft.description`, `trigger` | Render bounded plain text with an AI-generated label |
| Scope | `scope`, `jurisdictions`, `domains` | Explain local/cross-border scope; affiliations remain proposed |
| Stakeholders | `agents` | Four proposed roles with goals and concerns; mark fictional |
| User conditions | `userConditions` and provenance | Separate the user's hypothetical conditions from model assumptions |
| Assumptions | `assumptions` | Full bounded list, labelled model-proposed |
| Unknowns | `uncertainties`, `unsupportedQuantities` | Visible list; never silently hide uncertainty |
| Drawing interpretation, when present | Trusted hybrid intent and selected plot/catalogue IDs | Friendly route/station labels and selected order, classification source, explicit timing assumptions; no private citizen profiles |
| Calculation scope | `spatialRequirement` plus hybrid eligibility | State which calculation is supported and what remains qualitative; a polyclinic must never become an AAC calculation |

Sources and diagnostics may be expandable. Default view must expose assumptions and material limitations. No new AI-authored numerical benefits appear in the card. Use existing valid text; do not introduce extra inferred facts or model confidence percentages.

Use an inline panel, with keyboard focus moved to its heading after preparation. Render text safely through React, without raw HTML. On narrow screens let the panel scroll with the page. Approval must be a separate `type='button'`; Enter in the question form cannot approve it implicitly.

### Revision and rejection

“Revise question or drawing” invalidates the pending review, retains question and geometry, returns focus to editing and explains that another Prepare action is needed. It makes no automatic model call. The user revises the original source question instead of modifying generated fields independently of their registered plan/provenance.

Question, geometry, geometry revision, service date, station selection/order, anchors or timing/confirmation changes invalidate the draft. A → B → A still requires a new preparation because the controller review epoch changes. Best-effort discard revokes the old server capability. A failed discard cannot authorise the browser to reuse it.

Server guarantees concern the approved, bound request it receives. It cannot detect edits that were never transmitted from another tab; do not claim otherwise. The capability, TTL and server-owned plan prevent arbitrary replacement, while browser revision checks prevent normal stale approval.

### Scope boundaries

- No direct editing of generated role manifests, ontology identifiers or assumptions in v1. A future editable-plan design needs separate validation and human-edit provenance.
- No approval on every agent turn, report editing, real citizen feedback, model training or source-verification workflow.
- No silent replan, automatic retry or automatic approval on navigation, refresh, Enter, timeout or archive restoration.
- Numerical engines and explicit standalone calculator buttons keep their semantics. The Explore path must stop automatically dispatching those calculators before review.
- Existing clarification/unsupported cases remain non-executable and show their existing correction guidance.
- This introduces a real stage boundary across client, API and orchestration. It is a modest feature, but not just a button or a CSS change; do not promise a completion time before the extraction tests pass.

## Contracts and lifecycle

### Recommended transport

Keep one HTTP route: `POST /api/scenario-simulate`, with a new version-3 discriminated request union. Versions here describe this request protocol, not `PublicExplore.version`.

```ts
type ApprovalContext = {
  request: DynamicRequest;
  hybrid?: HybridExploreOptions;
  reviewEpoch: string; // browser UUID renewed on any relevant invalidation
};

type ScenarioApprovalWire =
  | { version: 3; operation: 'prepare'; attemptId: string; context: ApprovalContext }
  | { version: 3; operation: 'approve'; draftId: string; token: string;
      context: ApprovalContext; planId: string; reviewDigest: string }
  | { version: 3; operation: 'discard'; draftId: string; token: string }
  | { version: 3; operation: 'status'; draftId: string; token: string };
```

All names in this section are proposed interfaces. `attemptId` uses the existing bounded identifier rules and remains the same from planning through execution; planning and live execution have separate duplicate maps. Do not call the old all-in-one dynamic handler on approval. The status operation is a passive POST read so the capability need not appear in a URL.

New response `kind` values: `scenario-interpretation-review`, `scenario-approval-progress`, `scenario-review-discarded`, `scenario-review-error`. Successful approval/status may return the existing `summary-execution`. Existing `hybrid-map-review` and `planning-failed` remain explicit outcomes during preparation and never become approvable drafts.

`ScenarioInterpretationReview` contains: version 1, kind, draftId, token, attemptId, contextKey, planId, reviewDigest, createdAt, expiresAt, display, and planning accounting. `display` has exactly the card sections above, projected from validated server fields. Do not return the complete executable plan, private context, closures, citizen dataset or full retrieval bodies.

`contextKey = digest('scenario-review-context-', context)` binds the exact request, hybrid settings and review epoch. `reviewDigest = digest('scenario-review-display-', display)` binds the card the user saw. Store both alongside the original plan ID and immutable validated hybrid context; neither hash is an external authenticity signature.

### Parsing and bounds

- Use exact-key object validation; reject unknown operations, extra executable fields, invalid IDs, malformed digests/tokens, non-finite numbers and invalid nested requests.
- Prepare/approve request limit: 128 KiB of streamed UTF-8 JSON. Enforce it before buffering; do not rely on the existing approximately 16 MB public-body limit.
- Discard/status limit: 4 KiB. Review response limit: 192 KiB. Completed public responses retain the existing 3,000,000-byte browser bound.
- Pending store: at most 16 entries, each at most 512 KiB when canonical JSON-measured across its private plan/context/records. No population dataset or private impact result is retained here. Maximum measured pending content is 8 MiB; object overhead is additional.
- Count preparing, pending and consuming drafts together against the 16-entry preparation limit. On completion, clear their plan/context bodies and retain only bounded tombstones and accepted-run references. Do not cache up to 2,048 complete public results in memory; status reads an accepted stored projection through a new passive server-only reader that cannot initialise sessions or start jobs.
- Cap draft/tombstone identities at 2,048 per process per 24 hours. At capacity reject new preparation before retrieval; never evict a pending entry to admit another silently.
- Draft ID is a UUID; token is 32 random bytes encoded as 64 lowercase hex characters. Compare token hashes or fixed-length token bytes using `timingSafeEqual`. Never log it or place it in local storage, a query string, report, graph or exported record.
- Expiration uses server time, 15 minutes from successful preparation. Check expiry before consumption; remove expired pending bodies only, not accepted histories or immutable execution claims.
- All responses: `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`. Maintain JSON content type, matching origin and no-query checks. Do not add permissive CORS or trust forwarded-host headers.

### Server stages and exact approval semantics

**Prepare**

1. Validate configuration and request. Atomically claim a `preparing` entry keyed by attemptId, with its canonical context hash, before any hybrid semantic call, retrieval or planning. This consumes one of the 16 volatile draft positions and one identity in the 2,048-per-day attempt inventory, not a permanent execution slot. Every duplicate prepare returns 409 `SCENARIO_REVIEW_USED` without dispatch; it must not disclose an existing review token to a caller who only knows the attemptId. Only the owning in-process request can complete the claim. On failure/cancellation retain a small terminal tombstone; never reset its attemptId to retryable. If the initial preparation response is lost before its token arrives, there is no automatic retry/recovery; a new explicit Prepare uses a new attempt. This closes the existing pre-planner hybrid duplicate-call gap.
2. Probe private storage and inspect execution capacity without consuming a permanent claim. Add a read-only `availableStorageAdmissionSlots(base): number` helper using existing bounded inventory validation; full capacity prevents paid planning. A later race can still exhaust capacity before approval.
3. For hybrid input, perform the existing trusted semantic interpretation and connection/selection checks only. If clarification/location-context is currently terminal, return that outcome without an approvable plan and close the attempt claim. Retain original trusted context objects for ready interpretations.
4. Run existing retrieval and the two registered planning stages. Validate the resulting `DynamicScenarioPlan` and bind it to the exact request/hybrid context.
5. Project the review display, hash it, generate a capability, transition the owned entry preparing → pending and respond. Release AI slots, abort listeners and preparation timers. No long-lived HTTP request spans human review.

**Approve**

1. Authorise capability; check plan ID, review digest, full current context, TTL, process/runtime identity and current configuration/source identities against the stored preparation.
2. Under a per-draft exclusive owner, transition pending → consuming exactly once. Recheck private storage/admission. Reserve an immutable execution claim only now, using the stored attempt ID and canonical approved execution-context hash.
3. Persist a compact review audit intent before provider execution. It binds the approval to the plan and context. If persistence fails, do not dispatch. Retain uncertain/consumed states; do not automatically retry on another slot.
4. Complete hybrid numerical preparation from the retained trusted semantic objects, without repeating semantic inference. Create its existing deferred personality/selection callbacks using the approval execution signal, not the completed preparation signal.
5. Execute `createDynamicInput(storedPlan)` and `executeLiveRun` through an extracted helper. Include original planning records/cost in the combined result. Then call existing accepted-run registration once. Existing callbacks ensure personalities follow the initial accepted turns.
6. Persist the resulting run association, attach the public review receipt and return the normal public result. If a stage returns a partial run, preserve it with the same receipt and existing diagnostics.

If a dependency/source fingerprint changed, return `SCENARIO_REVIEW_STALE`; do not silently rebuild a supposedly approved plan. A process nonce must change on process restart/module-runtime replacement; pending entries cannot cross it. Pin interpretation-critical source/catalogue and provider configuration identifiers without persisting raw secrets.

For v1, add `lib/server/scenario-review/identity.ts` with `captureReviewIdentity(context, prepared, hybrid, deps): Promise<ReviewDependencyIdentity>`. Capture the following exact fields, with null for inapplicable hybrid fields; compare the complete canonical object at approval:

| Identity field | Exact input / source |
| --- | --- |
| `runtimeId` | UUID created at review-store module evaluation; global entries must match it |
| `contextKey`, `planHash`, `hybridHash` | Digests of full ApprovalContext, validated complete plan and retained hybrid semantic snapshot, respectively |
| `catalogueHash` | Digest of `getNetworkCatalog(context.hybrid.serviceDate)` from `lib/server/mrt-service.ts`, including its dated station/connection catalogue |
| `baselineHash` | For hybrid only, digest of dated `getBaseline()` projection `{date, stations, states, edges, audit}`; Map entries become key-sorted arrays before canonical hashing so route weights, not just catalogue names, are bound |
| `citizenIdentity` | For hybrid only, `{id, populationId, manifestHash}` from `getCitizenDataset()` in `lib/server/citizen-grounding/data.ts`; hash its complete manifest with recipe, seed and source pins. Retain only this identity, not the dataset |
| `transportIdentity` | For hybrid only, `{sourceHash, exitSourceHash}` from `loadTransportDemandReference(baseline)` in `lib/server/citizen-grounding/transport-data.ts` |
| `executionConfigurationHash` | Hash of resolved `{model, provider, allowFallbacks, stakeholderEnabled, socialEnabled, socialSwarmSize, socialMaxDecisions, socialControlledAgents, profileId, citizenMenuPolicy, storageBase, providerAdmission, dynamicLimits, liveLimits}` using current server dependencies/environment and existing defaults. `providerAdmission` contains maxCalls, reservedTokens, costUsd and absolute deadlineMs. Hash the resolved values rather than environment strings; never return storageBase or this private configuration object |
| `credentialIdentity` | Private HMAC using a process-random salt over the actual inference key. Compare only in memory so credential changes invalidate the draft; never export/log the key, salt or fingerprint |

`dynamicLimits`/`liveLimits` come from `DYNAMIC_LIMITS`/`LIVE_LIMITS`; model/provider from the fixed inference transport constants; social defaults and admission are resolved through `lib/server/society/service.ts` rather than reimplemented with different defaults. Refactor a pure resolver export there if needed, covered by parity tests. No optional dashboard Gemini configuration affects this route.

Retrieve/demographic snapshots remain frozen inside `planHash`; do not fetch them again. Cached data identity means the exact data the server would actually serve, not a promise to detect every on-disk edit to unused cached files. Dataset/source changes outside this process require restarting/reloading their owning runtime, which also invalidates reviews. Recompute mutable execution configuration, authority and served identities at approval; changed identity requires explicit new preparation. Expired task admission remains authoritative even if all content hashes match.

**Discard/status**

Discard authorises the token and changes pending → discarded without provider calls. Discard cannot roll back an already consuming/accepted run; return its actual status and use the existing active-run cancellation workflow where available. Status performs no planning, execution, social step or job start. Passive status may read a previously accepted run projection without invoking any recovery path that starts inference.

Keep post-approval status in the store until its bounded retention ends. While an approve request is active, a duplicate receives HTTP 202 with `kind:'scenario-approval-progress'`. After a result is safely recorded, status/duplicate approval returns that same result. A failed/unknown attempt never becomes pending again. If execution outcome cannot be established, return an explicit uncertain state and block new dispatch for that draft.

### State machines and timeouts

Client:

```text
idle -> interpreting/preparing -> awaiting-approval
awaiting-approval -> executing -> completed | partial | failed
awaiting-approval -> idle                  (revise)
awaiting-approval -> cancelled             (cancel)
awaiting-approval -> review-expired        (TTL or lost server draft)
any active request -> cancelled | error    (existing cancellation/errors)
```

Server pending record:

```text
preparing -> pending -> consuming -> accepted | failed | uncertain
preparing -> failed | cancelled | clarification
pending -> discarded | expired
```

Preparation and execution each receive separate bounded request timers. Proposed exact defaults/maxima:

| Operation | Server total deadline | Browser transport/controller deadline |
| --- | --- | --- |
| Prepare, plotted or unplotted | 120,000 ms | 130,000 ms |
| Approve, unplotted | 120,000 ms | 130,000 ms |
| Approve, hybrid | 230,000 ms | 240,000 ms |
| Passive status | 15,000 ms | 20,000 ms |
| Discard | 5,000 ms | 8,000 ms |

Injected test/server overrides may shorten, never increase, these maxima. For all provider work, effective deadline is the minimum of the operation deadline, the existing absolute task/admission deadline if present, and the existing stage deadline. Preserve retrieval 10,000 ms, each planner 45,000 ms, and existing live transport/personality per-call limits. Clamp the live-run timer to the remaining approval operation duration; do not grant a fresh 120 seconds after spending most of a hybrid approval on other work. The hybrid total includes impact preparation, initial eight actions, personality initialisation and registration; any subsequent authorised background society retains its existing independent job/admission deadline. No extra social budget is granted.

For social calls using the newly present phased transport, do not collapse local admission and provider response into one model-response allowance. Its local admission configuration permits up to 60,000 ms, independently clamped by the task/operation absolute deadline. The social provider response allowance remains the existing 30,000 ms and starts only after successful local admission. The enclosing operation/job deadline can still shorten either stage. These values describe the inspected working-tree code; retain newer accepted bounds if that concurrent repair changes before implementation.

Pending human review consumes neither request timer nor an AI concurrency slot. Approval does not reset a paid task's authority, budget, token ceiling or reservations. If the task expired during review, stop before dispatch. Synchronous numerical work uses cooperative checks before and after calculation; AbortController cannot preempt a blocked Node event loop. Expired calculation results cannot unlock later provider calls or be reported as timely completion.

Approval cancellation propagates to in-flight work. Disconnection/timeout may leave billed or accepted work; show “Checking execution status” and perform one explicit passive status request. Do not automatically send another approve request. Server restart loses pending capabilities; return HTTP 410 and ask for a fresh preparation. This first version does not promise pending-review recovery or exactly-once completion after a process crash; its guarantee is no automatic redispatch of an uncertain attempt.

### Persistence and public provenance

Pending plan/capability: process memory only, with the existing global-state pattern, bounded size and original WeakSet-trusted objects. Hot reload must invalidate old runtime entries. Browser reload loses the pending review; do not restore it as approved.

Approval audit: new private directory `join(storageBase(), 'scenario-reviews-v1')`, outside the strictly inventoried `session-store-v2` directory. It remains inside already ignored/unpackaged `data/derived/agents` for the default root. Use a hash of the draft ID for filenames, exclusive intent creation, bounded JSON and existing atomic replacement/ownership patterns. No client-selected directory. Audit ceiling: 2,048 files, 4 KiB per file; when full reject before provider dispatch. Do not auto-delete accepted audit evidence.

Audit fields: version, policy, draftId, attemptId, contextKey, planId, reviewDigest, preparedAt, approvedAt, actor `'local-user'`, outcome and nullable runId. Do not store raw token, source question, private profiles, IP address or a fabricated reviewer identity. A process crash after intent means an uncertain approval, not permission to replay it.

This receipt records an approval request from the local interface. It cannot prove that a person read the card, identify who clicked it or prevent a script with the capability from approving. Named reviewers and authenticated approval are outside v1.

Add optional `humanReview` to `PublicExplore` and the private accepted archive wrapper:

```ts
type HumanReviewReceipt = {
  version: 1;
  policy: 'scenario-interpretation-approval-v1';
  status: 'approved';
  planId: string;
  contextKey: string;
  reviewDigest: string;
  preparedAt: string;
  approvedAt: string;
  actor: 'local-user';
};
```

Pass receipt server-side into registration; do not mutate the frozen legacy plan/run/journal schemas or incorporate review approval into numerical/social calculations. Validate the receipt's plan ID against the retained plan and its context/digest against the approval audit when reading the new private wrapper. Persist it before initial public registration write; retain it through refresh/projection. Historical archives without the field render “No interpretation approval recorded”, never retroactively approved. New run reports show approval only for interpretation, with date/time in the user's locale.

Do not add a graph node in v1; a report-level receipt is sufficient. New hash-linked execution provenance can be considered later, rather than rewriting existing replay formats for a presentation feature.

### Errors

| HTTP | Code | Expected UI / dispatch behaviour |
| --- | --- | --- |
| 400 / 413 / 415 | `SCENARIO_REVIEW_INVALID` / `SCENARIO_REVIEW_TOO_LARGE` / `SCENARIO_REVIEW_CONTENT_TYPE` | Correct bounded input; no provider dispatch |
| 403 | `SCENARIO_REVIEW_ACCESS` | Invalid origin/capability; no plan or private existence detail |
| 409 | `SCENARIO_REVIEW_REQUIRED` | Old ordinary execution request requires preparation/approval |
| 409 | `SCENARIO_REVIEW_USED` | Preparation attempt already claimed; no redispatch or token disclosure |
| 409 | `SCENARIO_REVIEW_STALE` | Context, display, plan or source mismatch; prepare again explicitly |
| 410 | `SCENARIO_REVIEW_GONE` | Expired, discarded or lost draft; no automatic paid retry |
| 429 | `SCENARIO_REVIEW_CAPACITY` | Pending/audit capacity reached; preserve existing records |
| 503 | `PRIVATE_STORAGE_CAPACITY` / `PRIVATE_STORAGE_UNAVAILABLE` | Existing storage errors; do not dispatch execution |
| 202 | No error; `scenario-approval-progress` | Execution already consumed; inspect status without redispatch |

Use safe fixed messages. Never copy arbitrary upstream text, tokens, local paths or stack traces into errors. Original planning failures retain their existing typed accounting and safe diagnostics.

## File map and proposed interfaces

New files are recommendations; the implementation should not create parallel frameworks for existing functions.

| File | Responsibility |
| --- | --- |
| `lib/scenario-review/contract.ts` | Browser-safe request/response/display/receipt types, exact parsers and bounds |
| `lib/scenario-review/projection.ts` | Pure projection of validated plan + safe hybrid fields; context/display hashes |
| `lib/scenario-review/client.ts` | Bounded prepare/approve/discard/status transport using existing request gate patterns |
| `lib/server/scenario-review/store.ts` | Atomic preparing reservations, bounded process store, capability checks, transitions, timers/expiry and private audit writes |
| `lib/server/scenario-review/identity.ts` | Exact runtime, plan, source, configuration and private credential identity capture/comparison |
| `lib/server/scenario-review/service.ts` | New HTTP operation orchestration and server-only approval gate |
| `components/scenario-interpretation-review.tsx` | Accessible card, review actions and scope disclosures |
| `components/scenario-interpretation-review.css` | Styling consistent with the current map panel |
| `lib/contracts/tests/scenario-review-*.test.ts` | Contract, projection, store, server, controller and UI tests described below |

Modify the existing dynamic service to export:

```ts
type PreparedDynamicPlan = {
  plan: DynamicScenarioPlan;
  planningRecords: InferenceCallRecord[];
};
prepareDynamicPlan(wire: DynamicWire, dependencies: DynamicDependencies,
  signal?: AbortSignal): Promise<PreparedDynamicPlan>;
executePreparedDynamicPlan(prepared: PreparedDynamicPlan, attemptId: string,
  dependencies: DynamicDependencies, signal?: AbortSignal): Promise<DynamicResponse>;
```

Preserve failure diagnostics via typed internal errors/adapters; do not have extracted helpers repeatedly parse HTTP Response bodies. The old handler may compose the helpers for internal compatibility tests, but the ordinary HTTP route must not expose it as an approval bypass.

Split existing hybrid orchestration into:

```ts
type PendingHybridInterpretation = {
  kind: 'ready';
  context: HybridContext;
  handoff: HandoffContext | null;
  interpreted: HandoffResult | null;
  intent: HybridIntent;
  wire: HybridExploreWire;
  requestCanonicalHash?: string;
  interpretationRecords: InferenceCallRecord[];
};
interpretHybridExplore(value: unknown, deps: HybridExploreDependencies,
  signal?: AbortSignal): Promise<PendingHybridInterpretation | HybridReview>;
initializeInterpretedHybrid(value: PendingHybridInterpretation,
  deps: HybridExploreDependencies, signal?: AbortSignal): Promise<PreparedHybridExplore>;
```

The pending type is private and original object references remain trusted. Hash canonical representations for integrity; do not replace those originals with `structuredClone`/JSON round trips. `prepareHybridExplore` can remain a server-only wrapper composing the two functions to preserve existing focused tests. `initializeInterpretedHybrid` must not invoke retrieval or semantic interpretation.

Controller methods: retain `start('dynamic')` as preparation in public mode; add `approveInterpretation(): Promise<void>` and `reviseInterpretation(): void`. Snapshot adds `interpretationReview: ScenarioInterpretationReview | null` and phases `awaiting-approval` / `review-expired`. Discard is best effort on invalidation, cancel and dispose. Never dispatch approval from an effect. Preserve scripted/legacy internal paths without advertising them as reviewed.

Route dispatch: `handleScenarioReviewRequest(request, dynamicDeps?, publicDeps?)`. Public version-1/2 all-in-one requests receive 409 `SCENARIO_REVIEW_REQUIRED`; update normal UI fixtures accordingly. Internal old handlers and explicit developer/testing interfaces remain separate and must not be described as reviewed. Existing social continue/resume endpoints require an already accepted run and cannot initialise a new unapproved one.

## Implementation tasks

### Task 1: Contracts, review projection and strict fixtures

**Files:** Create `lib/scenario-review/contract.ts`, `projection.ts`; tests `scenario-review-contract.test.ts`, `scenario-review-projection.test.ts`. Reuse `lib/contracts/tests/helpers/planner-fixture.ts`.

**Interfaces:** Produce the wire union, review/display/receipt parsers, `approvalContextKey(context): Promise<string>` and `projectInterpretationReview(plan, hybrid?): ReviewDisplay`. No server imports in browser modules.

- [ ] Write failing tests: reject extra executable plan fields, invalid nested geometry/hybrid settings and oversized UTF-8 input; changed timings/epoch change contextKey; identical projection hashes identically.
- [ ] Assert the projection contains four roles, all assumptions/unknowns and correct capability limits; contains no fabricated numerical benefit, raw token, internal catalogue object or private profile.
- [ ] Run `node --test lib/contracts/tests/scenario-review-contract.test.ts lib/contracts/tests/scenario-review-projection.test.ts`; confirm intended failures.
- [ ] Implement exact parsers/projection and make those tests pass. Retain valid original text without creating extra generated summaries.
- [ ] Inspect the diff; checkpoint only these files if committing is part of the implementation session.

### Task 2: Extract planning and hybrid interpretation without changing execution

**Files:** Modify `lib/server/inference/dynamic-service.ts`, `lib/server/interventions/explore.ts`; tests `scenario-review-extraction.test.ts`. Reuse `lib/contracts/tests/helpers/dynamic-provider.ts`.

**Interfaces:** Produce `prepareDynamicPlan`, `executePreparedDynamicPlan`, `interpretHybridExplore`, `initializeInterpretedHybrid` as specified above. Existing wrappers compose the extracted functions until the route switches.

- [ ] Write failing counter-based tests: preparation makes exactly two planner completions and zero stakeholder completions; hybrid interpretation makes zero impact/personality calls and at most its existing one semantic call.
- [ ] Test that execution of the stored plan makes no new planner/interpretation calls, preserves plan ID/input fingerprint and uses original planning accounting.
- [ ] Test original WeakSet-trusted contexts through the split; untrusted cloned contexts fail rather than being repaired or reinterpreted. Clarification stays non-executable.
- [ ] Run `node --test lib/contracts/tests/scenario-review-extraction.test.ts`; confirm failures, extract minimally, then rerun successfully.
- [ ] Preserve error classifications, abort propagation, provider identity checks and existing wrapper tests. Checkpoint the scoped extraction.
- [ ] Preserve the current phased-admission transport by reference rather than replacing it with an older helper. Add an extraction regression that passes an explicit capability-bearing fetcher through the new service boundary without losing its hook or enabling a hook on an unrelated schema.

### Task 3: Pending store, audit and approval admission

**Files:** Create `lib/server/scenario-review/store.ts`, `identity.ts`; modify `lib/server/society/storage-admission.ts` to add the bounded read-only availability helper and `lib/server/society/service.ts` only if exposing its existing resolved defaults is necessary; tests `scenario-review-store.test.ts`, `scenario-review-identity.test.ts`.

**Interfaces:** `reservePreparingReview(attemptId, context, deps): PreparingClaim`; `createPendingReview(claim, prepared, context, hybrid, display, deps): ReviewEnvelope`; `consumeReview(approval, work, deps): Promise<ApprovalOutcome>`; `discardReview(draftId, token, deps)`; `inspectReview(draftId, token, deps)`; `captureReviewIdentity(context, prepared, hybrid, deps): Promise<ReviewDependencyIdentity>`; `availableStorageAdmissionSlots(base): number`. Inject clock, runtime identity and temporary audit directory for tests.

- [ ] Write failing fake-clock tests for 15-minute TTL, 16 pending entries, per-entry size, 2,048-identity/audit ceilings, discarded states and server-runtime replacement.
- [ ] Test racing prepare requests and distinct attempt IDs against full capacity before any fetch; one attempt dispatches at most once, failures retain a tombstone, and the 16-position bound includes preparing/consuming work. Test every dependency-identity field independently and parity with existing configuration resolution.
- [ ] Test concurrent approvals invoke work once; altered plan/display/context/token is rejected; expiry and discard never dispatch work.
- [ ] Test audit-write failure stops execution, intent survives uncertain execution, and accepted/failed attempts cannot return to pending. Lost response inspection does not invoke work.
- [ ] Test cancelled pending reviews never consume immutable session slots; full execution storage prevents preparation and no remaining slot at approval stops execution honestly.
- [ ] Run `node --test lib/contracts/tests/scenario-review-store.test.ts`; implement minimally and make all cases pass using task-owned temporary storage.

### Task 4: Public API gate, receipts and accepted-history compatibility

**Files:** Create `lib/server/scenario-review/service.ts`; modify `app/api/scenario-simulate/route.ts`, `lib/server/society/public-service.ts`, `lib/society/public-contract.ts`, `lib/question-simulation/public-session.ts`; tests `scenario-review-api.test.ts`, `scenario-review-history.test.ts`.

**Interfaces:** Produce `handleScenarioReviewRequest`; add optional `humanReview` to registration dependencies, public contract and private archive wrapper. Consume Task 2 helpers and Task 3 single-consumption store.

- [ ] Write failing API tests: prepare returns a review with zero execution; approve consumes exactly that plan; v1/v2 bypass requests return 409; forged plans/unknown fields and cross-origin requests cannot dispatch.
- [ ] Assert zero impact/personality/social/coordinator calls before approval; after approval verify correct numerical binding and existing initialisation order. Track calls, not just UI labels.
- [ ] Test duplicate approve/status return recorded progress/result without calls, expired task authority blocks approval, cancellation preserves partial/uncertain outcomes, and all stages share existing spending admission.
- [ ] Pin exact prepare/approve/status/discard deadlines with injected clock/abort fixtures; verify stage timers clamp to remaining operation/task time and waiting for human review starts no timer-driven inference.
- [ ] Test cancellation while preparing a draft, while waiting for approval, during execution admission and after possible native dispatch. Confirm zero-versus-unknown usage follows the authoritative transport proof, and approval/discard do not recycle provider permits or task grants.
- [ ] Test approved receipt survives write/read/refresh/history restoration; legacy no-receipt archives load unchanged and are never labelled approved. Tokens/private hybrid data do not enter public output or logs.
- [ ] Run `node --test lib/contracts/tests/scenario-review-api.test.ts lib/contracts/tests/scenario-review-history.test.ts`; implement and pass. Keep historical fixtures intact; add explicit new ones.

### Task 5: Browser lifecycle and Workspace orchestration

**Files:** Create `lib/scenario-review/client.ts`; modify `lib/question-simulation/client.ts`, `components/use-question-simulation.ts`, `components/workspace.tsx`; tests `scenario-review-client.test.ts`, `scenario-review-controller.test.ts`. Update existing controller/integration tests affected by the intentional new stage.

**Interfaces:** Browser transport exposes prepare/approve/discard/status with an injected fetcher and existing request-ticket validation. Controller exposes `approveInterpretation` and `reviseInterpretation` and new review snapshot fields.

- [ ] Write failing tests: start resolves at awaiting-approval without execution; approval uses the same ticket/attempt/context; no timer or AI slot remains active while reviewing.
- [ ] Exercise question A → B → A, every hybrid option change, cancel, dispose, archive selection and late responses. Old drafts must never replace or approve the current review.
- [ ] Test Enter/double-click/navigation/status restore do not start execution; lost approve response checks status without repeating approval; reload does not resurrect approval.
- [ ] Replace Workspace's concurrent Explore calculator dispatch. Verify independent native calculator actions remain explicit and current-result provenance stays correct.
- [ ] Run `node --test lib/contracts/tests/scenario-review-client.test.ts lib/contracts/tests/scenario-review-controller.test.ts`; implement and pass.

### Task 6: Review interface, report disclosure and complete verification

**Files:** Create `components/scenario-interpretation-review.tsx` and CSS; modify `components/map-scenario-panel.tsx`, `components/communication-report.tsx`, `components/question-console.tsx` where it renders new phases; tests `scenario-review-ui.test.ts`; update README and this document's implementation status only after checks.

**Interfaces:** Review component receives the safe display envelope plus approve/revise/cancel callbacks. Report consumes only the public review receipt, never a live capability.

- [ ] Write failing render tests for exact button labels, fictional-role and uncertainty disclosures, escaped text, pending/expired states, explicit approval and unreviewed legacy reports.
- [ ] Implement using current styles. Ensure preparing/executing disable duplicate primary actions; awaiting-approval permits only the three deliberate review choices. Prevent form submission from approving.
- [ ] Run the focused UI test and all new `scenario-review-*.test.ts` tests; inspect results before broad verification.
- [ ] If the concurrent admission repair is present, run `node --test lib/contracts/tests/admission-timeout.test.ts lib/contracts/tests/admission-cold-process.test.ts lib/contracts/tests/admission-timeout-smoke-live-guard.test.ts` as offline regressions before the full suite. These test files do not authorise launching the paid smoke-test script. Re-read their current imports and use only task-owned fixtures/storage.
- [ ] Run `npm.cmd test`, `npx.cmd --no-install tsc --noEmit`, `npm.cmd run build`, `git diff --check` sequentially. Run required deterministic CLI checks if existing integration expectations are affected. Record actual results; do not reuse historical counts as fresh evidence.
- [ ] Inspect build traces for the new audit namespace and private snapshots; use a task-isolated ignored fixture directory. No private runtime state should be packaged.
- [ ] Perform the browser checks below with mocked providers and counters, then inspect the complete diff against the acceptance checklist. No paid provider call is needed for feature acceptance.

## Browser acceptance and demonstration

Use the repository's network-blocked dynamic provider fixture/preload and a dedicated local test storage root. After extracting stages, adapt fixtures for prepare/approve; do not reuse paid task guards whose pinned source fingerprint no longer matches. Existing closed spending authorities remain closed.

Check 1440×900 and 390×844:

1. Prepare an unplotted workplace-policy question. Observe two planner calls, review card, zero stakeholder/social calls and no result links.
2. Wait beyond the old request timeout using controlled test time; review remains available until its own TTL. No background calls occur.
3. Revise the question. No paid regeneration occurs until another Prepare click; stale review disappears.
4. Approve a newly prepared plan. Verify exactly eight initial action completions at most, no repeated planning, matching plan ID and report approval receipt.
5. Prepare a properly confirmed plotted MRT route. Confirm no citizen impact calculation or personality call before approval; after approval check the same route, dots, anchors and timings are used.
6. Change one timing/anchor while reviewing; the approval becomes unavailable. Return to the original value; a fresh preparation is still required.
7. Double-click approval and open a second status request. One execution only; the second request returns progress or the existing result.
8. Cancel pending review, cancel execution, simulate a lost response, expire a draft and restart the server. Check honest status and zero automatic retries.
9. Inspect an old archive. It remains readable with no fabricated review receipt. Navigate Map/Graph/Report without triggering planning or approval.
10. Verify keyboard flow, visible focus, long assumptions, malicious text rendered literally and no horizontal overflow. Do not send fixture credentials or real capability tokens into screenshots or reports.

Suggested demonstration: ask a question that omits whether pay changes under a shorter workweek. Show the AI interpretation/assumptions, choose Revise, add the desired pay condition explicitly, prepare again and approve the new interpretation. Do not depend on the live model making a particular mistake; use a labelled fixture if demonstrating a specific draft. The human approves intent, not a prediction that productivity or wellbeing will improve.

## Definition of done

- [ ] The normal public exploration path requires an explicit approval after actual planning and before execution; old request envelopes cannot bypass it.
- [ ] Users can read material assumptions/unknowns, revise the source question/drawing and cancel without starting simulation.
- [ ] Exactly the approved plan and hybrid interpretation execute; no hidden replan or regenerated personality roster on retry.
- [ ] No Explore-triggered impact calculation, stakeholder action, personality generation, social step or job start occurs before approval.
- [ ] Changes invalidate review, duplicate approval cannot spend twice, and lost/expired/uncertain states stop honestly.
- [ ] Pending reviews are bounded and do not exhaust permanent session claims; private audit failure prevents execution.
- [ ] Reports/history preserve a narrow receipt and synthetic disclosures; legacy archives stay unchanged.
- [ ] Focused tests, full relevant checks, privacy/build-trace review and actual mocked browser checks have recorded results.
- [ ] No application implementation, deployment, dependency installation or paid evaluation is implied by this research document.

## Later enhancements

Only after this gate works: editable assumptions with explicit human-edit provenance, stakeholder inclusion/exclusion, durable pending-draft recovery, signed multi-user reviewer identities and feedback studies. Each changes validation or persistence requirements and deserves its own design. For this version, a readable AI draft plus explicit approve/revise/cancel is the complete feature.
