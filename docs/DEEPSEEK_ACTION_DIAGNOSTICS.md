# DeepSeek structured-action failure investigation

29 October 2026, main `master` at `e1bcf793df9153bccf343456b849493e6278f510`. The initial investigation below made no paid calls. The separately authorised live follow-up is recorded at the end and in `DEEPSEEK_LIVE_PROVIDER_ACCEPTANCE.md`. `next-env.d.ts` was already modified on entry; its pre-task contents are preserved separately from this change.

## What is confirmed

The exact displayed sentence is composed from `lib/question-simulation/errors.ts` (`AI_INVALID_RESPONSE` → “The provider returned an invalid structured action.”) and the fixed partial-history suffix in `components/question-console.tsx`. It is **not** a unique exception from DeepSeek and does not prove invalid JSON, a particular reference violation or an exhausted output allowance.

The transport previously wrapped both `JSON.parse(message.content)` and `parseStakeholderTurnOutput(...)` in one catch returning `invalidResponse()`. Other envelope/finish/byte checks and gateway JSON errors used the same code. The engine retained accepted earlier turns, marked a run partial/failed, and copied only whitelisted error codes. The UI translated the resulting generic code. A mocked regression reproduces this loss of specificity, including a rejected second-turn evidence reference after a valid first turn.

## Actual execution path

1. `lib/server/inference/service.ts` validates bounded LLM-mode input and explicit activation, acquires the shared slot, applies the four-agent/two-round/eight-call/token/cost/deadline limits, and creates the fixed transport. It does not manufacture replacement actions.
2. `lib/server/inference/deepseek.ts` sends one completion request with the exact configured model and `provider.only=['digitalocean']`, `allow_fallbacks:false`, `require_parameters:true`, strict schema, no streaming or retry. It validates serving identity from completion metadata or a bounded generation-details lookup. Mismatches/missing verifiable identity fail closed.
3. The completion must contain exactly one choice, stop normally, have bounded string content and no supplied tool-call field. JSON is then parsed and passed to the existing authoritative action validator.
4. `parseStakeholderTurnOutput` checks exact fields/types/enums/lengths, safe qualitative content, unique valid identifiers, available event IDs, finding/assumption IDs and addressed role. Later rounds require another participant's recorded event; revisions require an own prior event; position changes require a revision; interaction types require prior context.
5. `lib/stakeholder-simulation/engine.ts` validates again before appending an event or updating memory. Failure preserves existing history and returns a failed/partial run. `verifyStakeholderRun` revalidates fingerprints/history; `parseInferenceDiagnostics` checks serving identity, finite codes, call counts/order and accounting. The browser accepts only the matching validated envelope.

## Safe diagnostics now returned

| Code | Category |
| --- | --- |
| `AI_RESPONSE_ENVELOPE` | Invalid gateway/envelope, malformed gateway JSON/UTF-8, response-byte limit, wrong choice count, missing/non-string/oversized action content or supplied tool calls |
| `AI_RESPONSE_INCOMPLETE` | Non-stop or missing finish reason; includes length-limited output, without claiming that all such failures are truncation |
| `AI_RESPONSE_JSON` | Action content cannot be parsed as JSON |
| `AI_ACTION_SCHEMA` | Action field/type/enum/length/identifier-shape constraints; unknown local validator errors remain opaque |
| `AI_ACTION_REFERENCE` | Invalid addressed role or unavailable event/finding/assumption ID |
| `AI_ACTION_SEMANTICS` | Unsupported URLs/quantitative claims, missing interaction/revision lineage or invalid position-change semantics |
| `AI_PROVIDER_IDENTITY` | Serving model/provider cannot be verified; includes invalid generation-details JSON/size or mismatched details |

Existing timeout, HTTP/rate/credit/config/budget codes remain distinct. Network/HTTP failures during metadata lookup retain their existing safe transport code rather than being mislabelled action JSON failures. Old `AI_INVALID_RESPONSE` records still validate and retain their old generic display. Gateway JSON and gateway byte errors share the envelope category because the shared HTTP boundary deliberately does not disclose raw errors.

The new shared finite message registry is used by transport, engine, browser record validation and UI. It stores no action body, prompt, arbitrary validator/provider error message, offending ID, key or personal information. Existing safe usage, duration and identity-verification metadata remain intact. A category explains rejection, not that an untrusted action was safe or correct. No acceptance condition, model/provider route, token limit, schema, fallback rule or retry count was relaxed.

## Incident evidence limitations

Both connected browser inventories contained only `about:blank`; neither retained a failed execution. Inspection of available local artifact names found prior automated logs/screenshots but no saved live execution envelope in the inspected diagnostic locations. No private browser profile, key or prompt store was read. No complete provider response body was requested or printed. The server retains attempt IDs/timestamps, not a recoverable transcript of rejected actions.

Consequently the **specific cause of the reported live incident remains unconfirmed**. Missing metadata, bad references, schema violation or incomplete generation must not be guessed from the generic message. The confirmed defect corrected here is loss of rejection category, not a confirmed DeepSeek content-generation defect. No speculative repair (including accepting null tool calls, increasing tokens, rewriting IDs or coercing malformed actions) was applied.

An existing exported failed run can provide safe call count/status/usage/provider-verification metadata, but old generic records cannot recover an action-validation reason that was discarded. Provider-specific verification would require separately authorised live execution with these diagnostics, or a safely reduced existing response reproduction. None was made in this task.

## Regression checks

Focused mocked tests cover JSON/schema/reference/semantic/incomplete categories, fail-closed identity, malformed gateway/details metadata, no body leakage or retries, and preservation of the first accepted turn through live service → browser envelope validation → UI messaging. The existing usage-preservation test now expects the more precise JSON category. No ordinary test makes a paid provider call.

Final results: focused suite **32 passed**; full Node suite **611 passed, 0 failed/skipped**; application TypeScript passed. Production build passed. Independent read-only review found no blocking issues. Logs are ignored under `tmp/inference-diagnostics/`.

## Exact task paths

- `lib/server/inference/deepseek.ts` — classify rejected responses without changing transport/acceptance rules.
- `lib/stakeholder-simulation/inference-errors.ts` — new finite diagnostic messages and local-validator category mapping.
- `lib/stakeholder-simulation/engine.ts` — preserve new safe codes through failed/partial runs.
- `lib/stakeholder-simulation/inference-contract.ts` — allow only the new finite codes alongside legacy ones.
- `lib/question-simulation/errors.ts` — display the corresponding safe category.
- `lib/contracts/tests/inference-error-diagnostics.test.ts` — new mocked regression/integration tests.
- `lib/contracts/tests/deepseek-transport.test.ts` — refine the expected JSON error category; keep all tests.
- This report and the central roadmap — findings, verified checks and unresolved live-cause limitation.

`service.ts`, the authoritative action validator, provider settings, application components and environment files are unchanged. `next-env.d.ts` is pre-existing pending work, not part of this fix. Changes remain unstaged and uncommitted.

## Authorised live follow-up, 29 October 2026

The historical generic incident has no recoverable rejected body. A new controlled baseline **did** establish the actual non-normal termination: HTTP 200, DigitalOcean, `finish_reason=length`, `native_finish_reason=length`, 800 completion tokens, all 800 reasoning tokens, absent content. No JSON action existed. Cost was USD 0.00027965. This is distinct from JSON syntax, schema, reference or serving-identity rejection.

Endpoint/model metadata advertised structured outputs and reasoning controls, with reasoning enabled at high effort by default. The transport now explicitly requests `reasoning: {effort:'none', exclude:true}`. The application output allowance stays **800**, not increased. Every subsequent observed completion reported zero reasoning tokens and `stop`.

A later valid JSON completion failed an addressed-role reference: the supplied event/evidence/assumption array references were valid. The exact offending role value was not retained. The strict outbound schema now enumerates only other registered role IDs, available event/finding/assumption IDs and first-turn-compatible action types. Local runtime reference/semantic validation remains authoritative.

Actual full browser runs exposed two local bounds independently of the provider: the cumulative 120,000-byte-based reservation could stop an eight-call run after seven accepted actions; a later ASEAN context exceeded the unchanged 24,000-byte prompt limit. The reservation is now 214,400 (8 × (24,000 + 800 + 2,000)), with all other call/time/cost bounds retained. A compact prompt projection removes repeated run metadata, prior explanatory summaries and duplicated other-role descriptions. It preserves the current full role, all available event identities/statements/positions/uncertainties, evidence references, assumptions and memory. The original execution snapshot and accepted event history remain unchanged. Reservation uses the actual compact prompt. Old 120,000-limit records remain inspectable under their original ceiling.

Safe optional per-call `termination` metadata now exposes HTTP status, finite finish/native-finish labels, reasoning count, requested output cap and JSON/action validation flags. Unknown finish values become `other`; private reasoning/provider prose is never retained. Existing records without this field still validate. Oversized context errors now remain `AI_REQUEST_TOO_LARGE` through engine and UI rather than collapsing to `TURN_FAILED`.

One later import-tax completion was intentionally rejected by strict semantic validation despite normal termination and valid JSON. Its precise local subrule was not retained, so it is not attributed to token exhaustion or silently repaired. A subsequent isolated diagnostic used three explicitly scripted context turns and one real foreign-supplier action; it passed, and is **not** counted as a full live multi-agent acceptance. The opt-in ledger now captures finite local semantic-rule indexes for future diagnosis. See the acceptance report for successful full live browser runs, every paid completion's accounting, regression results and remaining stochastic rejection limitations.
