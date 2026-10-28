# Phase 7J ? DeepSeek agent inference

## Status and architecture

Implemented in isolated `ImpactLens-inference`, branch `feature/deepseek-simulation`, from `2900d0b77e54c5236da9a811181eec7117d14ea8`. No other worktree is edited. This adds real model-call transport and sequential live execution; no transcript is authored in one call, no deterministic replacement is used on live failure. Actual paid provider compatibility remains **unverified**: no live call or spending budget was authorised, and no private environment file was copied.

The existing engine activates one participant at a time, freezes context, validates each proposed turn, records it and updates bounded memory. Later participants receive actual earlier accepted events. Existing deterministic mode remains intact. `engine.ts` has one narrowly scoped cancellation correction (rejected in-flight calls now preserve cancelled status) and a safe provider-identity error label. No MRT/AAC/population formulas change.

## Provider evidence and restrictions

Verified 28 October 2026 from official [model endpoint metadata](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-flash-0731/endpoints): DigitalOcean endpoint tag **digitalocean**, with `response_format` and `structured_outputs` listed. Availability metadata is not a paid execution test.

Each completion goes only to `https://openrouter.ai/api/v1/chat/completions` with model `deepseek/deepseek-v4-flash-0731`, `provider: {only: ['digitalocean'], allow_fallbacks: false, require_parameters: true}`, `stream:false` and strict JSON Schema. No backup provider/model exists. See [provider routing](https://openrouter.ai/docs/guides/routing/provider-selection).

A canonical model and DigitalOcean serving label must be reported in completion metadata, or verified by the authenticated [generation details endpoint](https://openrouter.ai/docs/api/api-reference/generations/get-request-&-usage-metadata-for-a-generation). Unknown or mismatched identities fail closed. Metadata verification means gateway-reported identity, not independent provider attestation. Unexpected model aliases also fail closed pending deliberate review. An optional generation-details lookup is not another inference call.

## Structured actions and provenance

Reuse `StakeholderTurnOutput`: type, addressedRoleId, statement, previousEventIds, evidenceFindingIds, assumptionIds, reasoningSummary, uncertainties, position and topics. Types are argument, response, challenge-assumption, evidence-question, acknowledgement and revision. References must resolve in bounded context; changed positions require recorded revision references. No tools, shell, URLs or retrieval can be invoked by generated actions. Short explanatory summaries are not private chain-of-thought.

`createLiveInput(domain, question, identities?)` provides finite `asean`, `import-tax` and `mrt` role presets. Import-tax includes a fictional foreign supplier; local MRT does not introduce foreign actors. Rates/product coverage and unsupplied route calculations stay unknown. Existing six ASEAN profiles remain unchanged; eight additional fixed profiles are accepted only for LLM mode, never arbitrary model-authored identities. No role is representative or population weighted.

No evidence is invented. Existing source/finding references remain supplied context, not independently verified facts. A citation does not validate a synthetic interpretation. Optional map or deterministic model information must be deliberately converted to supported assumptions/evidence with existing provenance caveats; the transport does not calculate route benefits or infer homes.

## Budgets, errors and configuration

Server variables: `OPENROUTER_API_KEY` and `STAKEHOLDER_LIVE_ENABLED=true`. Without both, live execution returns a safe configuration failure; browser parameters cannot override them. No existing `.env.local` is copied or overwritten. Set configuration only in the inference worktree's ignored local environment, never in chat or exported JSON. No new provider selection setting is exposed.

Limits: four agents, two rounds, eight completions, 800 output tokens/call, 15-second per-call deadline, 120-second run deadline, shared process-wide two-AI-run gate, 96 KiB request and 512 KiB response. Context uses existing 24,000-byte provider-input limit. Zero automatic retries or repairs; invalid output stops honestly. A conservative reservation uses UTF-8 context bytes plus output allowance and prompt overhead against 120,000 reserved tokens/run. This is an estimate, not billed token usage. Cancel propagates to transport and stale-client guards remain separate.

Prompt/completion/total tokens and USD cost use gateway-returned values, including available failed billed-looking responses. Unknown stays null, not zero. The $0.05 returned-cost threshold stops the next call; it is **not a prepaid hard dollar ceiling** and can overshoot by one bounded call. Unknown cost cannot establish free execution. Hard call/output/context reservations still apply. There is no unbounded retry or parallel participant fan-out.

Partial, failed and cancelled runs preserve accepted records, never claim completion. Error bodies exclude keys, paths, stack traces and raw upstream messages. Provider/model diagnostic strings are allowlisted rather than copied from arbitrary upstream text. Incomplete runs cannot enter completed-run comparison. Live output is not reproducible merely because a seed is retained; immutable recorded events provide replay.

## API and diagnostics

Existing version-1 endpoint behaviour is preserved, including its explicit unauthorised LLM response. New live requests to `POST /api/stakeholder-simulate` use `{version:2, attemptId, input}`. Response is `{version:2, attemptId, run, inference}`. `run` remains validated stakeholder run v1. Identity is still exact input/evidence fingerprints plus separate attempt/run IDs. Do not pass the v2 envelope to the old v1 client parser.

`inference` contains requested model/provider, disabled fallback, successful/failed completion counts, zero retries, nullable input/output/total tokens and costUsd, conservative reservation, elapsed milliseconds, completed rounds, active agent count, bounded limits and per-call serving identity/generation/usage/status records. Records are diagnostics, not synthetic stakeholder opinions or verified institutional actions.

`GET /api/inference/status` returns safe model/gateway/provider/fallback/connection/enablement/limits. `configured` means a nonempty server key exists; `servingIdentityVerified:false` prevents treating configuration as an authenticated provider test. No secret or cached misleading verification success is returned.

## Verification

Twenty-one focused mocked tests cover transport routing, authentication construction, serving metadata mismatch/lookup, malformed output, future/missing references, timeout/cancellation, rate/unavailable failures, failed billed usage, budget stopping, different role domains, exact API identity and graph projection. The three-domain integration test runs all participant turns through the actual DeepSeek transport with explicitly mocked HTTP completion bodies. These are tests, not live-generated opinions.

Final Node suite: **542 tests: 541 passed, zero failed, one skipped**. The existing geographic pedestrian clearance test skips because the isolated checkout does not contain ignored local-review building assets. It is not changed or weakened. All six model CLIs pass; application TypeScript, strict inference TypeScript and 19 GIS tests pass. The first premature baseline attempt ran while dependencies were installing and is not counted as regression evidence; final checks use the completed pinned installation. Production build passed. Actual built Next HTTP checks on owned port 3147 returned status 200 (not configured, disabled, unverified), live request 503 AI_CONFIG, malformed JSON 400 and media type 415. Playwright loaded the application with one MapLibre map and no page errors. No new competing UI was built, and the concurrent Phase 7H workflow was not tested. The owned server was stopped after inspection.

Review found and corrected rejected-call cancellation classification, failed-call diagnostic preservation, attempt validation and double-counted injected transport snapshots. A failing regression reproduced cancellation and the HTTP transport integration exposed double counting before correction. Independent transport review also prevented arbitrary upstream identity strings entering exports.

## Skills, tools and boundaries

Applied worktree-isolation, writing-plans, TDD, debugging and verification practices; used local Git/PowerShell/Node/TypeScript/Python, a scoped independent implementation/review agent and official web sources. Installed Next Route Handler documentation was read. No new dependency, frontend system, database, deployment, entity extractor or graph renderer is introduced. Existing graph projection accepts the validated live run, retaining synthetic provenance. Building distribution restrictions remain unchanged.

See the companion integration guide for exact files, Phase 7H/7I adapters and the authorised smoke-test procedure. This is a synthetic exploration engine, not polling, economic forecasting or a deterministic accessibility model.

Live attempts are retained process-locally for 24 hours (2,048 IDs maximum, then controlled busy rather than eviction). Sequential reuse returns 409 before another model call. A fresh unique attempt ID is mandatory for every retry; process restart/expiry removes retention, so this is not durable global deduplication. Client-generated UUID attempts and immutable archive conflict checks remain required.
