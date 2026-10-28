# ScenarioPlan v1 handoff

Phase 7B browser-safe interface, integrated from feature checkpoint `263ef96`. Terminal 1 can consume these modules from the final shared checkpoint recorded in `PHASE7B_INTEGRATION_CHECKPOINT.md`. Git synchronisation is coordinated explicitly; no runtime action advances branches or executes a simulation.

Import from `lib/scenarios/contract.ts`: `ScenarioRequest`, `ScenarioSelection`, `ScenarioPlan`, `ScenarioResponse`, `UserMapPoint`, `ScenarioCategory`, `ScenarioIntent`, `ProviderStatus`, `SCENARIO_PLAN_VERSION`, `SCENARIO_LIMITS`, `SCENARIO_PROVIDER_NOTICES`, `parseScenarioRequest`, `parseScenarioSelection`, `parseScenarioPlan`, async `parseScenarioResponse`, async `createScenarioPlan`, `SCENARIO_SELECTION_SCHEMA`.

`lib/scenarios/registry.ts` exports `getCapabilities`, `getCapability`, `CAPABILITY_IDS` and capability/input/geography types. Returned registry values are detached. `lib/scenarios/fixtures.ts` exports async `createScenarioFixtures()` with validated `mrt`, `aac`, `polyclinic`, `asean` examples. No module in this browser-safe import tree reads files, environment or provider configuration.

## State and routing

| Discriminator `execution` | Capability ID | Availability | Readiness |
| --- | --- | --- | --- |
| `calculated` | `mrt-accessibility-v1` | `available` | `needs-input` |
| `calculated` | `aac-accessibility-v1` | `available-limited` | `needs-input` |
| `exploratory-agents` | `stakeholder-exploration-v1` | `planned` | `planned-capability` |
| `evidence-analysis` | `evidence-exploration-v1` | `planning-only` | `needs-evidence`, `needs-input` or `unsupported` |

V1 intentionally cannot issue `ready`. This endpoint accepts questions and optional user points, not complete engine configurations. A later configuration handoff must validate all engine inputs against actual sources and obtain explicit user confirmation. Every plan has `executionState:'not-executed'` and `confirmationRequired:true`. There is no execution ID, result, metric or executable code field. Unknown fields and illegal combinations are rejected.

Every plan includes `schemaVersion:1`, content-derived `planId`, the original bounded `request`, finite `interpretation`, trusted `title`, `interpretedIntent`, `domain`, `missingInputs`, supported/unsupported outcomes, geographic requirements, assumptions, empty `evidenceReferences`, evidence requirements, stakeholder categories, research questions, limitations, route reason and next action. No evidence has been retrieved. The semantic validator checks the complete plan against registry-backed templates, preventing model-authored source claims or invented numbers. Question/map data remain untrusted user input; render text normally, never as HTML.

Geographic requirements use `ordered-points`, `existing-station-selection`, `proposed-facility-location`, `none`. Supplied point IDs identify user inputs only; `validatedForExecution:false` remains mandatory. A point is not a surveyed station, resident home, service catchment or complete intervention configuration.

## Request and frontend use

```ts
const request = parseScenarioRequest({
  version: 1,
  clientRequestId: crypto.randomUUID(),
  question: 'What if a new Active Ageing Centre opened in Bukit Merah?',
  selectedCategory: 'aac', // optional: mrt | aac | exploratory-agents | evidence-analysis
  mapPoints: [{ id: 'centre', lat: 1.287, lon: 103.824, provenance: 'user-provided' }],
});
const response = await fetch('/api/scenarios/plan', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request), signal: controller.signal,
});
if (!response.ok) { /* show controlled error; do not use an unvalidated plan */ }
const result = await parseScenarioResponse(await response.json(), request);
// Check the current clientRequestId/revision again before showing result.plan.
```

The response is `{version:1,requestId,clientRequestId,method,providerStatus,plan}`. Method is `ai-assisted` or `deterministic-fallback`; status is `used`, `not-configured`, `unavailable`, `invalid-response` or `not-needed`. Only `ai-assisted` pairs with `used`. Safe fallback states indicate interpretation was not supplied by a validated provider response. Display `SCENARIO_PROVIDER_NOTICES[result.providerStatus]` for a safe explanation. Category hints never authorise an engine or replace a clear supported scenario description.

A fixture's essential fields look like:

```json
{
  "schemaVersion": 1,
  "execution": "calculated",
  "capabilityId": "aac-accessibility-v1",
  "availability": "available-limited",
  "readiness": "needs-input",
  "executionState": "not-executed",
  "confirmationRequired": true
}
```

This is a field excerpt, not a complete parseable plan; use `(await createScenarioFixtures()).aac` for complete JSON. MRT needs exact ordered stations, interchanges, service assumptions and demand settings. AAC needs confirmed location, limited Bukit Merah preset and access/eligibility assumptions. A supplied coordinate does not clear the remaining requirements. Polyclinic uses evidence planning, never AAC. ASEAN uses evidence planning by default or explicitly planned stakeholder exploration; neither produces polling forecasts.

## Identity, errors and bounds

`planId` is a Web Crypto SHA-256 of canonical plan content and configuration inputs, including question, map coordinates, selected category and interpretation, excluding only the client correlation token. It changes when relevant inputs or registry templates change. The server request ID identifies an attempt; identical inputs can have the same plan ID and different request IDs. `parseScenarioResponse` recomputes the identity and can check the exact submitted request. `parseScenarioPlan` is synchronous semantic validation; use the envelope parser for identity/correlation verification.

Maximum body 16 KiB, question 2,000 characters, IDs 64 characters, 12 uniquely identified user points. Bounds are latitude 1.15–1.5, longitude 103.6–104.1. Arbitrary factual evidence, files, URLs, executor names and simulation authorisation are not accepted. Responses are no-store. Expect controlled 400/403/409/413/415/429 errors; provider configuration/generation failures can return conservative fallback plans with explicit status instead of failing the whole planning workflow.

Configuration edits invalidate previous planning assessment; discard stale response tokens and replan. Opening `/api/impact` or `/api/eldercare/simulate` is a future explicit editor action with its existing validated contract, never an automatic effect of the plan. Planned/evidence routes have no calculation adapter. Do not hide limited catalogue/proxy coverage or label agent reactions representative public opinion.
