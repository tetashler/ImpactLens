# Phase 7J ? integration handoff

## Worktree and files

Source: `ImpactLens-inference`, branch `feature/deepseek-simulation`, base `2900d0b77e54c5236da9a811181eec7117d14ea8`. No staging, commit, merge, synchronisation, push or deployment. Terminal 1/2 files and servers are untouched.

New files:
- `lib/server/inference/deepseek.ts`: fixed provider transport and call records.
- `lib/server/inference/service.ts`: budgets, live activation, status and v2 response.
- `lib/stakeholder-simulation/inference-roles.ts`: fixed fictional local/international profiles.
- `lib/stakeholder-simulation/inference-input.ts`: browser-safe domain preset factory.
- `app/api/inference/status/route.ts`: safe settings metadata.
- `lib/contracts/tests/deepseek-transport.test.ts`: 13 transport tests.
- `lib/contracts/tests/inference-live.test.ts`: eight orchestration/API/integration tests.
- This guide and `docs/PHASE7J_DEEPSEEK_LIVE_INFERENCE_IMPLEMENTATION.md`.

Modified files: `lib/stakeholder-simulation/contract.ts` (additional fixed profiles only in LLM mode), `engine.ts` (cancel/error classification), `lib/server/stakeholder-simulation/service.ts` (v2 dispatch after existing HTTP security). No package/lockfile or UI changes. Review these three shared paths against concurrent work; do not copy entire worktrees or overwrite newer interfaces.

## Public exports and UI boundary

Browser-safe `createLiveInput(domain,question,identities?)` returns a strictly validated existing `StakeholderSimulationInputV1`. `LiveDomain` is `asean | import-tax | mrt`; unknown domains fail. Defaults are internal: four roles, two rounds, memory six, LLM mode. Do not choose a preset merely because a question contains a keyword; Phase 7H should deliberately classify/select the supported domain or request clarification.

Node-only exports: `MODEL`, `PROVIDER`, `InferenceCallRecord`, `DeepseekTransportOptions`, `createDeepseekTransport`, `LIVE_LIMITS`, `LiveDependencies`, `executeLiveRun`, `handleLiveBody`, `inferenceStatus`. Dependency injection is server/test code only and cannot be selected by HTTP request. Do not bundle these modules or keys into clients.

UI sends `{version:2,attemptId,input}` to the existing route. Reject obsolete responses using existing monotonic attempts AND exact snapshot fingerprints; parse/verify `run` with existing `verifyStakeholderRun`. Validate the version-2 envelope and expected attempt, retain diagnostics separately, and do not use the strict version-1 response parser. Real calls happen during the bounded batch. Playback starts only from returned accepted events and must say playback, not active inference. Show partial/failed/cancelled status and safe errors; never substitute scripted output under an LLM label. Archive the envelope to retain usage alongside the immutable run.

Settings uses `GET /api/inference/status`: DeepSeek V4 Flash 0731 / OpenRouter / DigitalOcean / fallback disabled. Connection configured is not live verification. Show actual call-level identity verification and nullable usage/cost after runs. Do not add browser-editable provider/model overrides.

## Phase 7H and Phase 7I reconciliation

No unavailable files are imported. Phase 7H scope (`local`, `cross-border`, `international`, `undetermined`) is separate from execution domain. Scope alone cannot choose a valid engine. Local MRT maps to the MRT role preset; cross-border import-tax maps to its preset; ASEAN can use the ASEAN preset. Undetermined/unsupported topics need clarification or another future role adapter. Domain profiles are fictional perspectives, not extracted real institutions.

Preserve Phase 7E `experiment-bridge.ts` immutable conversion for existing experiments; do not silently replace its selected roles or mutate an existing configuration identity. For new role presets create a new, explicitly identified execution input through the narrow factory and retain the originating experiment reference. Phase 7H/7I must reconcile this choice once at the application handoff.

Phase 7I may provide verified entity IDs and relationships, but the current live input has no arbitrary world-graph field. Translate bounded verified source/finding references into the existing evidence snapshot, preserving IDs and limitations. Retain world-entity linkage as a separate run-bound annotation until an explicitly versioned world-context extension is agreed. A model name-drop is not verification. Do not claim this phase implements world extraction or named-entity mention resolution.

`projectStakeholderRun(run)` already projects live records into existing KnowledgeGraph v1 with synthetic roles/events and source references. `mergeStakeholderGraph` requires identical scenario identity and preserves baseline calculations. No graph UI changes are necessary. Do not attach archived records to edited scenarios. Phase 7I should compose its verified entities with this synthetic projection, not reclassify synthetic replies as institutional actions.

## Configuration and authorised smoke test

Create an ignored `.env.local` in the inference worktree only, without copying another worktree's private file:

```dotenv
OPENROUTER_API_KEY=<set locally, never in chat>
STAKEHOLDER_LIVE_ENABLED=true
```

The server ignores browser model/provider settings and sends only `digitalocean` with fallback disabled. No backup is configured. Do not turn this flag on for paid testing until a small explicit budget is authorised. Existing general AI configuration is not rewritten.

Before paid testing: verify public endpoint metadata, authorise a dollar/call cap, confirm key presence without printing it, and use two roles/one round (two completions) initially. Inspect actual provider/model confirmation, validated action, token counts and returned cost; then a second round only within the approved cap to demonstrate references to earlier events. A failed identity check is a failure, never proof of correct routing. Exercise provider-unavailable failure with mocks rather than spending extra credits. Stop at the cap; no retries. The code's returned-cost threshold is soft, not a prepaid guarantee.

Live paid testing was **not executed**. Transport mocks prove request restrictions and failure handling, not real DigitalOcean structured-output compatibility or current account access. Unknown identity/model aliases fail closed. Default deadlines may need deliberate adjustment after a bounded authorised measurement.

## Rebuild and acceptance

Install pinned dependencies in this worktree, do not share mutable `.next` output with other terminals. No new npm packages are required. Run six model CLIs, `npm.cmd test`, application TypeScript, explicit strict inference TypeScript, the existing GIS suite, `npm.cmd run build`, then `git diff --check` sequentially. Do not rerun Overture extraction. Bulk ignored building assets are absent here; that explains one existing geographic clearance test skip and does not grant public-demo permission.

Test MRT/AAC/demographic regression, actual v2 missing-configuration errors, configured mocked transport for ASEAN/import-tax/MRT, model/provider identity rejection, budget exhaustion, cancellation and client stale-response acceptance. Reconcile Phase 7H's UI separately; this phase does not claim its concurrent interface has been browser-tested.

Live attempts are retained process-locally for 24 hours (2,048 IDs maximum, then controlled busy rather than eviction). Sequential reuse returns 409 before another model call. A fresh unique attempt ID is mandatory for every retry; process restart/expiry removes retention, so this is not durable global deduplication. Client-generated UUID attempts and immutable archive conflict checks remain required.

Final isolated verification: 542 Node tests, 541 passed, zero failures, one existing missing-building-asset skip; 19 GIS tests; six CLI commands; application and strict TypeScript; production build. The owned port-3147 Next server returned 200/503/400/415 for status/unconfigured-live/invalid-JSON/media checks. Playwright observed one map and no page errors. No authorised live provider test occurred. The test server is stopped.
