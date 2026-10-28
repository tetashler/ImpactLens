# Phase 7B — scenario planning foundation

Terminal 2, `feature/synthetic-population`, starting at `95ab200`. Phase 7B adds interpretation and configuration planning only. Phase 7A UI and Phase 7D agent execution are separate work. No engine, frontend, citizen contract, roadmap, raw data or environment-file change.

## Architecture and implementation

1. Browser-safe `lib/scenarios/registry.ts` is the finite authority for capability identity, availability, required inputs, outcomes, geographic requirements, assumptions and adapter paths. Consumers receive detached copies.
2. `contract.ts` defines the discriminated `ScenarioPlan` v1, bounded request, finite provider selection and HTTP envelope. Parsers reject unknown fields and compare entire plans against registry-backed templates. `parseScenarioResponse` also verifies SHA-256 identity and exact request correlation. See [the contract handoff](SCENARIO_PLAN_CONTRACT.md) for exports and states.
3. `fallback.ts` recognises explicit MRT/AAC construction questions, handles declared examples conservatively, and asks for clarification when classification is uncertain. Category hints cannot alone authorise a calculated route. Unsupported healthcare services, policy questions, individual predictions and explicit result-injection attempts are guarded before provider calls. These are conservative scope rules, not a general language-understanding or political forecasting model.
4. `lib/server/scenarios/planner.ts` reuses `readAiConfig` and `createAiProvider`. Providers select only `{version,intent,capabilityId}` using strict JSON schema. They cannot author factual prose, sources, metrics, map positions, code or readiness. The server checks intent/capability combinations and requires calculated selections to match conservative recognised scope, then constructs trusted plan text. Ambiguous transport/eldercare wording may need rephrasing even with AI enabled.
5. `lib/server/scenarios/service.ts` and `app/api/scenarios/plan/route.ts` expose Node-runtime `POST /api/scenarios/plan`. Body reading reuses the existing streamed 16 KiB reader. The route enforces JSON media type, origin, schema, bounded response, no query parameters and `Cache-Control: no-store` on success/error.
6. `lib/server/ai/gate.ts` extracts the existing two-request process-wide gate with its original global key. The narrow Phase 5 service change delegates acquisition/release to it, preserving duplicate 409/busy 429 protection across chat, dashboard, explanation and planner bundles. Tokens and property ordering cannot bypass planner duplicate detection. No retries, queues, provider switching or new configuration stack.

No planning request invokes a calculation engine. V1 cannot return `ready`; all calculated plans require full editor configuration, source-aware validation and explicit confirmation. A plan is never a completed result, even when the provider returned valid JSON.

## Registry and examples

| Example | Route and reason |
| --- | --- |
| Three new MRT stations, Choa Chu Kang–Sengkang | `mrt-accessibility-v1`, calculated/available, needs ordered locations, existing-station connections, explicit timing and demand assumptions |
| New Bukit Merah AAC | `aac-accessibility-v1`, calculated/available-limited, needs confirmed location and limited-preset access/eligibility assumptions; capacity remains unknown or explicitly assumed |
| Sengkang polyclinic | `evidence-exploration-v1`, planning-only; AAC cannot substitute for a polyclinic model |
| Singapore leaving ASEAN/public opinion | Evidence planning by default; explicitly selected future stakeholder exploration is planned, never polling or prediction |
| Exact residents losing jobs | Unsupported; no real individual prediction or invented identities |
| Ignore registry and claim 83% approval | Conservative unsupported plan; no numerical result field exists |

`createScenarioFixtures()` supplies complete validated MRT/AAC/polyclinic/ASEAN plans. ASEAN fixture explicitly selects the future-agent category; it remains `planned-capability`. Stakeholder categories are generic framing suggestions, not sampled people, observed opinions or verified findings.

Available calculations retain their prior limitations: MRT travel demand and service operation are assumption-dependent; AAC uses four corroborated historical MOH point locations and two landmark proxies for a limited Census 2020 Bukit Merah population. Existing opening status, capacity, other eligibility and many population origins remain unknown. Census leaf-cell discrepancy **4,047,260 versus 4,044,210 (3,050 difference)** is unchanged. No new data retrieval, reconciliation or nationwide/2026 population claim is made. Existing Phase 4/6 source reports remain authoritative.

## Providers, fallback and security

Use existing explicit `AI_PROVIDER=gemini|openrouter`, the corresponding explicit model/key and existing timeout/output limits. Configuration is server-only. This phase does not inspect/edit private environment files. Missing/invalid config returns deterministic fallback with `not-configured`; provider failures return `unavailable`; invalid provider output returns `invalid-response`. `SCENARIO_PROVIDER_NOTICES` supplies safe browser messages. No raw provider error, key, prompt, filesystem path or usage body is returned. Safe fallback is a planning success, not a simulation success.

Existing Gemini model/method/output-limit and OpenRouter structured-output parameter checks, fixed provider hosts, deadline, input/output byte ceilings and no-provider-fallback policy are reused unchanged. Routine tests use dummy process-local configuration and mock HTTP, never live paid calls. Guarded unsupported requests skip AI. Bounded provider concurrency does not constitute rate limiting/authentication for public hosting; this remains a local prototype.

The question, client category and point provenance are untrusted. IDs do not select functions, paths or URLs. No arbitrary evidence/file inputs, SQL, tools or generated code are accepted. Empty evidence references mean no documents were retrieved or analysed. Render original question as user text, never HTML or verified fact. Broad/incompatible requests remain research/clarification plans rather than being squeezed into an available engine.

## API and handoff

```powershell
$body = @{
  version = 1
  clientRequestId = [guid]::NewGuid().ToString()
  question = 'What if a new Active Ageing Centre opened in Bukit Merah?'
  selectedCategory = 'aac'
  mapPoints = @(@{ id='site'; lat=1.287; lon=103.824; provenance='user-provided' })
} | ConvertTo-Json -Depth 5
Invoke-RestMethod http://127.0.0.1:3117/api/scenarios/plan -Method Post -ContentType application/json -Body $body
```

Response: `{version:1,requestId,clientRequestId,method,providerStatus,plan}`. Read `plan.execution`, `capabilityId`, `availability`, `readiness`, `missingInputs`, `geographicRequirements`, `nextAction` and limitations. Request maximum 16 KiB, question 2,000 characters, 12 points, IDs 64 characters, Singapore bounds lat 1.15–1.5/lon 103.6–104.1; maximum response 32 KiB. Invalid request/JSON 400; wrong origin 403; duplicate AI request 409; oversized body 413; wrong media type 415; two active AI calls 429; cancellation 499; unexpected local failure 500. Provider failures use explicit conservative fallback status. No prompts or upstream bodies in errors.

Terminal 1 should import the browser-safe contract and fixtures after Terminal 3 coordinates their transfer. Parse the envelope with the exact submitted request and discard responses after a question/category/point edit using client token plus local revision. The content-derived plan ID excludes only the client token; request ID distinguishes attempts. This is planning identity, not the later MRT/AAC calculation identity. Registry/template changes also change plan identity. No plan/result cache is introduced.

Future configuration handoff: MRT → existing editor → full `MrtIntervention` and supported `ImpactRequest` → explicit `/api/impact` action; AAC → existing AAC editor → full `EldercareApiRequest` → explicit `/api/eldercare/simulate` action. User points are suggestions pending confirmation, never auto-mutated map state. Existing validators/engine source checks own readiness and calculation identity. Evidence/agent plans have no executor and must not display a Run button implying availability. No existing calculation route was modified.

## Validation and reproducibility

All six existing MRT/population/eldercare CLI commands passed. Eldercare preparation initially hit a sandbox write denial on its existing ignored derived catalogue; the same command passed with approved escalation. Raw source files were unchanged.

**245 tests passed, 0 failed** (227 baseline plus 18 planner/contract regressions). Coverage includes independent schema/registry assertions, invalid versions/combinations, no invented results/evidence, planned availability enforcement, unsupported healthcare including plurals/full AAC (Care) names, category misuse, injection, finite coordinates, unknown fields, deterministic identity, point-edit invalidation, token-independent duplicate protection, shared gate saturation/release, JSON-safe serialization, browser import graph and actual provider-adapter schemas/failures. Failed red runs were observed before implementation; review-discovered scope cases received regressions.

Application TypeScript and explicit strict NodeNext module/test checks passed. Production build passed with all existing routes plus `/api/scenarios/plan`. Independent review reported no remaining Critical/Important findings after the scope fixes. Git whitespace check passed; no stage/commit/merge/rebase/reset/push occurred.

Real production HTTP verification ran on separately owned loopback port **3117** for no-provider, Gemini-mock and OpenRouter-mock modes. All three passed MRT, AAC, polyclinic and ASEAN envelope/identity parsing, no-store checks, malformed JSON 400, unsupported media type 415, oversized body 413 and cross-origin 403. Both actual provider adapters were exercised through HTTP; invalid schema, invalid JSON and rate-limit fixtures returned validated conservative fallback plans. Unit tests also cover actual adapter timeout, unsupported model and overlong output. No live paid/provider-authentication claim is made. Each owned server was stopped; port release was verified. Terminal 1's server was untouched.

Measured client-observed round-trip time includes JSON reading, validation and identity verification; one cold request followed by warm requests per fresh production process:

| Mode | MRT | AAC | Polyclinic | ASEAN |
| --- | ---: | ---: | ---: | ---: |
| No provider | 52.00 ms | 28.15 ms | 46.63 ms | 22.44 ms |
| Local Gemini HTTP mock | 65.89 ms | 10.89 ms | 13.99 ms | 14.98 ms |
| Local OpenRouter HTTP mock | 61.56 ms | 11.92 ms | 12.78 ms | 14.87 ms |

Requests were **113–147 bytes**; responses **2,532–3,124 bytes** in these examples. Policy/healthcare scope guards skip the provider even when configured. These single-pass local fixture timings are not external-provider latency benchmarks or sustained-load measurements. Logs remain ignored under `tmp/phase7b/`.

Rebuild: start from the shared checkpoint; add registry/contract/fixtures and their failing tests first, add conservative fallback, reuse provider schema/configuration and shared gate, add thin handler, then run sequentially:

```powershell
npm.cmd run mrt:validate
npm.cmd run mrt:simulate
npm.cmd run agents:generate
npm.cmd run agents:impact
npm.cmd run eldercare:prepare
npm.cmd run eldercare:simulate
npm.cmd test
npx.cmd --no-install tsc --noEmit
npm.cmd run build
git diff --check
```

Explicit module/test compiler flags: `--ignoreConfig --noEmit --strict --skipLibCheck --types node --target ES2022 --module nodenext --moduleResolution nodenext --allowImportingTsExtensions`, entries `lib/scenarios/contract.ts`, `lib/server/scenarios/service.ts`, both `scenario-*.test.ts`, `scripts/testing/phase7b-http-check.ts`. Do not overlap test/build preparation hooks on Windows.

The opt-in `scripts/testing/phase56-provider-preload.mjs` now recognises the planner schema plus malformed-output/rate-limit modes; existing Phase 5 selections remain intact. Start a separately owned production server with `node --import=./scripts/testing/phase56-provider-preload.mjs node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3117`. Set process-local `PHASE56_TEST_PROVIDER=none|gemini|openrouter` and `PHASE56_TEST_CONTROL_FILE` to an ignored temporary JSON file; run `node scripts/testing/phase7b-http-check.ts` from a separate client process with the same fixture/control variables (without preloading its fetch). Stop only the owned server between provider modes. This fixture installs dummy keys and blocks external network fetches; never use it in normal operation. No private environment-file edits are needed.

## Files, tools and remaining work

New files: `lib/scenarios/{contract,registry,fixtures,fallback}.ts`, `lib/server/scenarios/{planner,service}.ts`, `lib/server/ai/gate.ts`, `app/api/scenarios/plan/route.ts`, `lib/contracts/tests/scenario-{contract,planner}.test.ts`, `scripts/testing/phase7b-http-check.ts`, and the two Phase 7B documents. Modified: the existing AI service only for gate extraction and opt-in provider preload only for planner fixtures. No dependencies/package scripts changed.

Tools: local PowerShell/Git, Node test runner, TypeScript, Next production build and actual loopback HTTP. Discovered GitHub, web research and Playwright MCP capabilities; none was necessary for external repository/source lookup because local code and validated source reports supplied the required facts. No live provider or research request was made. Skills used: using-superpowers, brainstorming, writing-plans, test-driven-development, systematic-debugging, requesting-code-review and verification-before-completion; installed Next Route Handler documentation was read. No dedicated TypeScript/security/modelling skill was installed. Independent read-only reviewer found plural/full-name AAC (Care) scope gaps; these were fixed with regressions. Final review reported no Critical/Important blocker.

Remaining: Phase 7A UI integration, richer validated configuration handoff, evidence retrieval/research execution and Phase 7D synthetic agents. Conservative lexical scope rules may request clarification for otherwise supportable wording. No open-ended forecasting, polling, resident prediction, real service uptake, health outcome or automatic simulation claim is supported. Work remains uncommitted for Terminal 3 review and coordinated integration.
