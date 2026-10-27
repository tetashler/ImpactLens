# Phase 5 — Dashboard and provider-independent AI

Validated locally on 27 October 2026, starting on clean `master` at `a3b7d21`. No commits, pushes, merges or worktree changes. Phase 4C calculations, population weights, raw datasets and the version-1 citizen contract remain unchanged. `.env.local` was not modified. This remains a pre-hackathon learning prototype.

## What works

The **Calculated impact** inspector now has a responsive, expandable dashboard: coverage ledger, weighted KPI cards, fixed-scale group bars, sorting, group inspection, exact comparison tables, threshold accessibility and weighted transfer change. It uses the existing report, profile lookup and scenario lifecycle. The separate illustrative city, MRT editor and journey comparison remain functional.

Optional **Explain this scenario**, **Arrange dashboard with AI**, and calculated-profile **Talk to citizen** work through one Gemini/OpenRouter interface. No provider is required for calculations or deterministic presentation. AI calls occur only after explicit actions, never during map movement or animation.

**Deliberate grounding choice:** The model selects evidence references, layout options and conversational topics. Trusted application templates render every number and profile fact. This is bounded generative presentation, **not unrestricted prose generation or executable UI**. Even schema-valid output cannot introduce a new salary, count, travel-time saving or causal forecast. Questions outside the supported facts receive an honest unavailable answer.

## Architecture and changed files

| Files | Responsibility |
| --- | --- |
| `lib/dashboard/metrics.ts` | Stored metric formatting, denominator labels, dimension grouping and stable sorting; no impact calculations |
| `components/impact-dashboard.tsx`, `dashboard.css` | Predefined cards, accessible SVG bars/tables, coverage and group inspection |
| `lib/ai/contracts.ts` | Versioned finite layout/evidence/topic schemas, strict validators, request/envelope identity checks and bounded chat history |
| `lib/ai/grounding.ts` | Compact authoritative context and trusted explanation/citizen templates |
| `lib/server/ai/{config,provider,gemini,openrouter,http,errors}.ts` | Environment selection, shared native-fetch interface, protocol differences, capability checks, deadlines and controlled errors |
| `lib/server/ai/service.ts` | Resolve cached run/profile, validate requests/outputs, duplicate/concurrency gate and post-generation expiration check |
| `app/api/ai/{status,dashboard,explain,citizen-chat}/route.ts` | Node-only local API routes; no-store responses |
| `components/ai-insights.tsx`, `ai.css` | On-demand actions, provider/usage status, grounded explanations, bounded conversations and request cancellation |
| `components/impact-panel.tsx`, `impact.css`, `workspace.tsx`, `citizens-panel.tsx` | Integration, expanded dashboard and calculated-profile conversation slot; invented fixture chat remains disabled |
| `lib/server/impact-api-service.ts` | Only adds read-only `getImpactRun`; existing cache, execution and profile logic are reused |
| `lib/contracts/tests/{ai-provider,ai-grounding,ai-service,dashboard}.test.ts` | 35 new focused tests |
| `.env.example`, `README.md`, central roadmap, this report and `docs/superpowers/plans/2026-10-27-phase5-dashboard-ai.md` | Safe configuration and reproducible handoff |

No dependencies, SDKs, services, database, authentication system or deployment infrastructure were added. Native server `fetch` avoids SDK version coupling. Browser modules import no server provider implementation or credentials.

## Configure either provider

Keep existing private environment entries. Add the selected provider and its model/key privately, then restart `npm run dev` and reload. `.env.example` has empty credential/model placeholders and server-only comments; no `NEXT_PUBLIC_` AI variables.

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=<private server key>
GEMINI_MODEL=<explicit current Gemini model ID>

OPENROUTER_API_KEY=<private server key>
OPENROUTER_MODEL=<explicit provider/model ID>

AI_TIMEOUT_MS=30000
AI_MAX_OUTPUT_TOKENS=1024
```

Switch only `AI_PROVIDER` to `openrouter` to use that provider's independently configured model/key. There is no client provider URL, browser credential or automatic fallback. Provider and model are required explicitly; configuration is not guessed from a key's presence. `GET /api/ai/status` reads local configuration only, without making a provider request or claiming account/model availability.

Configuration allows 1–120,000 ms deadlines and 1–16,384 output tokens. If optional output configuration is omitted, the code default is 4,096; the example recommends 1,024 for these compact selections. A 24,000-byte serialized input ceiling bounds input without installing a tokenizer; it is **not an exact token counter**. Provider JSON bodies are capped at 1 MiB, discovery catalogues at 8 MiB. Typical selection outputs are much smaller. A deadline covers discovery, generation and streamed body reading. There are no automatic retries or model upgrades.

### Gemini

Fixed official host: `generativelanguage.googleapis.com`, `v1beta/models/{model}` and `:generateContent`. Authentication uses `x-goog-api-key`, never the URL. Authenticated model metadata must advertise `generateContent` and a sufficient output limit when supplied. The current REST JSON mechanism is `generationConfig.responseFormat.text` with `mimeType: 'APPLICATION_JSON'` and `schema`. This shape was checked against the current discovery document and a real request; older examples using deprecated schema parameters were not copied.

`gemini-3.5-flash-lite` is a verified current stable, low-cost candidate supporting structured output as of this report, **not an application default or permanent availability promise**. Unsupported model/schema/account responses return controlled configuration messages. References: [current model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), [v1beta REST discovery](https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta).

### OpenRouter

Fixed official host: `openrouter.ai/api/v1/models` for discovery and `/chat/completions` for generation, with Bearer authentication. The exact configured ID must advertise both `structured_outputs` and `response_format`. Requests use strict `json_schema` plus `provider.require_parameters: true` and `allow_fallbacks: false`. Endpoint support can differ for the same model; discovery is a necessary check, not a guarantee of account access. Rejections remain actionable errors rather than silent downgrade to arbitrary JSON.

The public catalogue listed `google/gemini-3.5-flash-lite` with both capabilities during research. Any other valid `provider/model` with the required capabilities may be configured. No OpenRouter key was available, so authenticated/live generation was **not** verified. References: [structured outputs and endpoint support](https://openrouter.ai/docs/guides/features/structured-outputs), [model catalogue API](https://openrouter.ai/docs/api-reference/models/get-models).

## Data, schema and quantitative integrity

All dashboard values are stored Phase 4C aggregates, never totals of sampled profiles or visible characters. Benefits/mean savings/mean transfer changes use **comparable represented population**. Accessibility shares use **assigned non-invalid represented population**. Count cards are explicitly weighted populations. Unknown/unassigned, invalid and unreachable outcomes remain visible; null shares are shown as Unknown rather than zero. Benefiting bars use a fixed 0–100% axis; coverage bars use one clearly labelled absolute resident scale.

The schema is version 1 with finite `title`, 3–6 distinct approved KPI IDs, a chart `{dimension,type,sort}` and 1–5 distinct approved notes. Dimensions are age, sex, planning area or subzone; chart types are benefiting-share or comparable-coverage bars. There is no React/HTML/JavaScript, arbitrary component, new metric value, free heading or source URL in generated configuration. Unknown keys, unsupported references/combinations, duplicates and incomplete objects are rejected on server and client. A fresh deterministic fallback layout is always available.

Explanation output contains only a focus, up to four `{groupId,metricId}` references and approved caveats. References must exist in the current report. The application supplies units, exact stored values, group names and denominator labels. The compact context carries run identity, source/service dates, provenance, explicit assignment/routing assumptions, denominator definitions and group aggregates (up to 40 groups); it excludes the raw Census/GTFS, full population, graph and geometry. National leaf-count discrepancy **4,047,260 versus 4,044,210 = 3,050** and source-byte identity sensitivity remain documented and unchanged.

## API, lifecycle and conversations

`POST /api/ai/dashboard` and `/explain` accept only `{runId,requestId}`. `/citizen-chat` additionally requires `agentId` and bounded alternating user/assistant `messages`. Browser metrics, profile bodies, model overrides and arbitrary URLs are rejected. Requests use the existing 16 KiB streamed JSON reader and reject cross-origin browser origins. The server resolves `getImpactRun` and existing `getImpactProfile`, then rechecks availability after generation. Unknown citizens return 404; mismatched and expired runs retain 409/410 semantics. AI does not renew the existing two-run/ten-minute cache.

Two provider calls may run concurrently process-wide; identical in-flight requests return 409. These are local prototype cost controls, not a production billing/session system. Missing configuration, 401/403, insufficient credits (402), 429, unsupported model/schema, timeout, invalid JSON, refusal/incomplete response and unexpected failures have safe errors. Headers, keys and raw upstream messages are never returned or logged.

The existing proposal/date/settings revision mechanism immediately removes outdated reports. AI children are keyed by request/run and selected citizen, abort on invalidation and validate echoed identities. Reset cancels pending presentation changes, so a late result cannot overwrite the deterministic layout. Late/expired responses cannot appear under a new run. Changing view alone retains the same comparison; changing calculation inputs clears conversations and requires a fresh profile.

Citizen chat uses the engine's actual full-population `getProfile`, with the unchanged shared validator. Cache identity and government-statistics provenance distinguish calculated profiles from invented fixtures: Phase 4C intentionally uses `resultKind: illustrative` for assumed demand, so that flag alone cannot identify a fake fixture. The provider selects up to three supported topics; first-person templates quote supplied journeys/categories/weights and acknowledge unsupported homes, jobs, income and health. No inferred personal facts or observed routines are added.

Questions/history/domain labels are untrusted data, never trusted instructions. The finite output schema prevents an injection from adding a new factual field, even if topic selection is imperfect. A conservative personal-fact/instruction guard also forces an unsupported response for certain requests. This is not a claim of universal semantic prompt-injection resistance. Answers are bounded below 2,000 characters; user questions are capped at 600. At most three exchanges are retained, pruning oldest **complete pairs** further to keep the next request within 6,000 characters. Histories remain in component memory only.

## Actual verification

| Check | Result |
| --- | --- |
| `npm.cmd test` | **166 passed, 0 failed**: all previous 131 plus 35 focused tests |
| `npx.cmd tsc --noEmit` | Pass |
| `npm.cmd run build` | Pass; four new AI routes compile with existing impact/profile/MRT routes |
| `npm.cmd run mrt:validate` | Pass; existing 184-station connected baseline and quarantine retained |
| `npm.cmd run mrt:simulate` | Pass; original NS4→NE16 62.77→20.00-minute example retained |
| `npm.cmd run agents:impact` | Pass; original weighted outcomes and discrepancy audit retained |
| `git diff --check` | Pass, apart from normal informational LF→CRLF notices |

New tests cover both configuration/protocol adapters, model/capability rejection, cancellation/deadlines, safe/rate-limit errors, body/output budgets, missing keys, malformed output, finite layout references, null/zero denominators, stable sorting, grounded facts/units, chat history bounds, cached run/profile authority, invalid/missing/expired identities, duplicate requests, post-generation expiration and the **real provider adapters with mocked HTTP carrying a complete actual report context**. Ordinary automated tests make no paid requests.

Independent read-only review found explanation units, pending-reset and long-history defects. Final integration checking additionally found a chat envelope accidentally echoing request-only fields and Next production hostname normalisation rejecting valid local origins. Each was reproduced, fixed and checked through regression tests or delayed/production browser requests. Server outputs now round-trip through the actual client parser for all three operations and both adapters. No unresolved blocking findings remain.

### Playwright MCP browser checks

Actual local development browser at `127.0.0.1:3000`, desktop 1600×1000 and narrow 390×844:

- MRT example returned 20.00 minutes; editing the first segment to 360 seconds returned 21.00. Demographic means changed from 21.75 to 21.24 minutes while retained weights/denominators remained correct.
- Actual default report displayed 192,150 represented, 153,096.27 comparable, 39,053.73 unassigned, 77,864.94 benefiting and 50.86% among comparables. Age/sex/area/subzone views showed 19/2/1/6 groups; sorting and selected-group detail worked.
- Gemini and OpenRouter **mocked HTTP/UI envelopes** both generated accepted layouts/explanations and profile-grounded conversations through the same client schema. The OpenRouter example displayed the actual changed 21-minute citizen journey; unsupported salary/employer questions acknowledged missing information.
- A subsequent **production-server end-to-end** check exercised the actual browser → Node routes → real provider adapters → client parser, mocking only upstream provider HTTP through a disposable Node preload. Configuration switched between Gemini on port 3106 and OpenRouter on 3107 without code changes. Both layout/explanation/chat flows returned 200 and strict two-field identities; OpenRouter's actual calculated profile showed 62.77→21.00 minutes and refused unsupported employer/salary details. Dummy test keys were process-local; no paid calls or private-file edits occurred. Temporary fixture servers were removed afterward. This is stronger than the earlier UI-envelope mocks and caught the two integration defects above.
- Invalid chart/metric output was rejected and restored the deterministic layout. Malformed JSON and a simulated 504 displayed failures while retaining calculations. A delayed layout could not undo Reset; a delayed explanation could not survive proposal editing. Previous chat context disappeared on scenario/settings changes.
- At 0% participation, all 192,150 weight was unassigned; mean/share stayed Unknown, and chat stated no journey was assigned. No zero-benefit claim was attached to that unknown population.
- No configuration: AI actions/chat were disabled with an actionable reason; the full calculated dashboard and profiles still worked. This machine has a Gemini key but no selected provider/model in its private file; those entries were left untouched. Missing-key cases are additionally covered by unit tests.
- Narrow layout had no horizontal document overflow. Illustrative animation retained play/pause/reset; 100 drawn citizens were observed at narrow width. Zero AI generation requests occurred during that animation check.
- Final fresh, unmocked page had no console errors. A deliberately injected 504 produced the expected failed-resource console entry during the failure test. Screenshots are under ignored `test-results/`; this phase does not add a committed Playwright regression suite.

### One live smoke test

One tightly bounded Gemini adapter request used `gemini-3.5-flash-lite`, a 512-output-token ceiling and a 20-second deadline with synthetic smoke context only. It passed local layout validation: **48 input / 108 output / 156 total tokens** as returned by the provider. This validates the live Gemini protocol/schema path, **not every live dashboard/explanation/chat workflow**. The initial sandbox-network attempt could not reach the provider; the authorised network-enabled run succeeded. No repeated paid tests or cross-provider fallback were performed. No exact monetary charge is asserted.

OpenRouter was verified with current official documentation/public capability catalogue, adapter/service HTTP mocks and browser UI mocks. It was **not live-authenticated or live-generated**.

## Remaining limits and rebuild

Ready for review/Git integration of the implemented core. OpenRouter live credentials/access testing and live end-to-end conversation checks remain. Answers are intentionally bounded templates, not a general conversational assistant. No calibrated uncertainty intervals, amenity-specific access, causal social/economic forecast or automatic sensitivity-range calculation was added. Manual input changes support scenario comparison; they are not confidence intervals.

The full Phase 4 geographic-trajectory limitation remains: calculated citizens are profile-only; the invented miniature animation is separate. No locations/routines were fabricated to close that gap. Census rounding/source-byte sensitivity, assumed demand, uncalibrated GTFS, no access/egress/crowding/departure-clock model and process-local cache expiry remain. Phase 6 eldercare/active-ageing data/calculation work belongs to Terminal 2 and was not begun or edited here.

Competition reconstruction: rebuild the deterministic MRT/population contracts and run cache first; implement stored metric helpers/charts; define finite presentation schemas/templates; add native-fetch provider adapters with current capability checks; resolve AI context server-side by run IDs; add cancellation/history/usage UI; run the commands above and no-key/mock/browser tests before any tightly capped live request. Preserve the permitted rebuild-from-scratch rules rather than carrying a finished submission into the event.

Tools/skills used: local PowerShell/Node/TypeScript/Git read-only inspection, official web documentation/model discovery, Playwright MCP, frontend-design and Superpowers planning/testing/delegation/review/verification instructions. Available GitHub/Context7 MCP capabilities were discovered; local history and primary provider documentation were sufficient, so no GitHub mutations or extra framework research were needed.
