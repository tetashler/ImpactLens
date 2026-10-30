# Planner validation diagnostics — offline follow-up

## Baseline trace recorded before editing

The original live planning rejection cannot be attributed to a specific rule because the necessary diagnostic was not retained. Safe local artifacts (`tmp/phase2b-live/result.json` and `network.json`) contain normal termination, valid JSON, verified provider identity and `AI_ACTION_SCHEMA`, but no rejected field or model body. No paid reproduction is authorised for this task.

Current control flow: `deepseek.ts` verifies completion/generation identity, parses JSON, then calls the planner's `parseGeneratedDraft()`. That invokes `parseDynamicDraft()`, which invokes `parseWorldOntology()` and `parseGroundingSupport()`, then checks agent slots/local scope. Most checks throw plain `Error` through shared validation primitives. The generic transport catches these errors and passes their messages to **action-specific** `turnRejectionCode()`. Planner messages are unrecognised and default to `AI_ACTION_SCHEMA`; the original exception is discarded. `dynamic-service.ts` maps the resulting code to `AI_PLAN_INVALID`. Final `createDynamicPlan()` errors also collapse into that public code. The failure envelope omits the completed retrieval bundle entirely.

## Working plan

1. Add failing offline fixtures for precise safe diagnostics and retrieval preservation.
2. Add a browser-safe typed validation error and annotate actual draft/ontology/support/plan rules without relaxing validation.
3. Preserve diagnostics through the gateway, call record and failure envelope; retain bounded retrieval metadata separately from source content.
4. Audit generation schema/prompt consistency, fix only reproduced discrepancies, and retain archive compatibility.
5. Run focused/full regressions, TypeScript/build and mocked browser acceptance; record evidence and remaining live uncertainty below.

## Audited and corrected pipeline

1. The fixed OpenRouter transport verifies returned model/provider metadata (or bounded generation lookup) before accepting content. Provider mismatch remains `AI_PROVIDER_IDENTITY`, not a plan-field failure.
2. Completion envelope, termination and JSON parsing remain distinct: `plan.response_envelope`, `plan.incomplete_output`, and `plan.invalid_json`. Normal finish does not bypass validation.
3. `parseGeneratedDraft()` invokes the authoritative draft parser in **new-generation slot mode**. It validates required/unknown fields, primitive types, text, byte limits and collection limits.
4. Jurisdiction and top-level entity registries are validated. Four agent profiles, exact unique generation slots, top-level entity references and a connected agent-opportunity network are validated **before** ontology resolution.
5. `parseWorldOntology()` validates version, dynamic type registries, IDs, case-insensitively unique type names, entity types/jurisdictions, entity-agent namespace separation, relationship types/endpoints, text and count/byte limits. Duplicate entity composite keys are computed only after their primitives pass validation.
6. Each support object requires existing source/passage IDs and a literal case-sensitive substring. An entity's support must mention its full name ignoring case. Quotation is attribution, not verification. Ontology self-loops remain permitted; agent-opportunity self-links remain invalid.
7. Assumptions, explicit user-question quotations, unknown quantities, prohibited generated numerical claims/URLs and new local-scope consistency remain validated. No candidate content is renumbered, repaired or normalised into acceptance.
8. `createDynamicPlan()` freezes the original accepted data and binds the source/demographic snapshots into its identity. Stored plan versions, ontology presence, identities and legacy research boundaries have typed failures. Version-1/older version-2 interpretation and hashes remain unchanged for valid archives.
9. `PlannerValidationError` carries finite metadata. The planner gateway preserves it in both the server error and failed `InferenceCallRecordV1.plannerValidation`, using `AI_PLAN_INVALID` instead of the action fallback. Unexpected parser software exceptions receive the honest `plan.internal_validation` category without exception text.
10. The dynamic API retains the existing public code/message and adds optional `error.validation` plus `retrieval`. Browser validation parses these bounded objects and checks agreement with the call record. Older failures without the optional fields remain valid. The Map's closed-by-default Diagnostics section can reveal rule/path and retrieval counts; ordinary error text stays concise.

Actions continue to use their existing action-specific errors and validators. An action call cannot carry planner validation metadata. Cancellation, 45-second planner/30-second action/10-second retrieval/120-second total limits, DigitalOcean-only/no-fallback routing, no reasoning, four agents/two rounds/eight actions, and cost accounting were preserved.

## Prompt / validator consistency matrix

| Requirement | Authoritative rule | Previously in prompt/schema? | Confirmed mismatch? | Correction |
|---|---|---|---|---|
| Draft shape and versions | Required exact fields; stored plan v1/v2; ontology v1 | Schema yes; wrapper semantics less explicit | Ambiguity, no original-payload proof | Clarify return draft, not stored-plan wrapper; ontology alone has version 1 |
| Fields, lengths, nulls, collection/byte limits | Exact object fields; individual schema maxima; draft 48 KB / ontology 24 KB | Field/count limits encoded; byte limits and explicit null less clear | Documentation gap | State byte ceilings and `support:null` rather than omission; bounds unchanged |
| Unique string-array entries | Duplicate domains/conditions/agent phrases/uncertainties rejected | Schema lacked `uniqueItems`; prompt silent | **Reproduced offline** with duplicate domains | Add standard `uniqueItems:true` to generated string arrays; state uniqueness; runtime still rejects |
| IDs and type names | Unique registry IDs; case-folded unique names per type list | IDs broadly implied; name uniqueness absent | **Reproduced offline** with differently cased duplicate type names | Explicit registry/name uniqueness; separate duplicate-ID/name paths |
| Agent slots | Exactly four unique `agent-1`…`agent-4` in new generation | Slots already instructed/encoded; schema alone permits repeated slots | Rejection needs precise diagnostics | Distinct missing/duplicate/invalid slot rules; archive parser still accepts previously valid role IDs |
| Agent references | Agent `entityIds` use top-level entity registry | Prompt said `entities[].id` despite two entity arrays | Namespace ambiguity | Explicitly distinguish top-level entities from ontology entities; never silently repair IDs |
| Interaction connectivity | One weakly connected graph involving all four roles, no opportunity self-links | Every role needs an opportunity; single component unstated | **Reproduced offline** with two disconnected pairs | State one connected network when directions are ignored; rejection unchanged |
| Ontology relationships | Types declared; endpoints ontology entities or active agents | Mostly explicit | No contradictory representation found | Clarify endpoint namespaces and legitimate ontology loops |
| Primitive shape before references | Context arrays checked before `.map()`; entity strings before composite keys | Runtime order was unsafe | **Two reproduced TypeErrors**: null agent array and non-coercible object-valued entity name | Validate shapes first; errors now identify exact field paths |
| Source support | Valid source/passage pair; literal substring; full entity-name mention | Core rule present | No source-verification shortcut found | Clarify case sensitivity and same-passage pairing; separate unknown-source/passage/quote/name rules |
| Provenance | Model proposals remain unverified; no invented verified flags or finding IDs | Schema/runtime/prompt aligned | No relaxation needed | Preserve exact-property rejection and source limitations |
| Generated claims | No unsupported numerical effects, free-form URLs or ontology markup | Numerical/URL rules mostly present | Some semantic restrictions were implicit | Clarify generated prose versus literal support quotations; runtime guards unchanged |

The audit also tested a suspected duplicate between a goal and incentive; the execution input already permits that combination. It was **not** a defect and no adapter deduplication was introduced.

## Safe diagnostic contract

`PlannerDiagnostic` contains **only** `stage`, `category`, `rule`, `path`, `expected`, `actualKind`. Rule IDs, stages, categories and expectations are closed vocabularies. Paths contain known contract fields and bounded numeric indices, never unknown property names, entity names/IDs, questions, quotes or other submitted values. `actualKind` reports a type/missing marker, not the value. Diagnostic imports reject invented rules, keys, expectations and unsafe paths.

Representative records:

```json
{
  "stage": "ontology",
  "category": "reference",
  "rule": "ontology.entity_type_unknown",
  "path": "draft.ontology.entities[0].typeId",
  "expected": "declared-reference",
  "actualKind": "string"
}
```

The complete finite list is exported as `PLANNER_RULES` from `lib/dynamic-scenarios/diagnostics.ts`. It covers:

- Shape/limits: required or unexpected fields, wrong type/value/text/identifier, unsafe data/text, collection/byte bounds, missing ontology.
- Ontology: duplicate type ID/name/entity ID/entity key/relationship ID, unknown type/jurisdiction/endpoint, entity-agent identity collision, type/entity/relationship count bounds, unsupported ontology version.
- Support: invalid registry, unknown source or passage, quote absent from passage, entity not mentioned by quote.
- Agents: invalid/missing/duplicate slots, legacy duplicate role IDs, invalid cross-reference, disconnected or self-linked opportunities.
- Plan semantics/identity: duplicate phrases, unsupported numeric claims, non-verbatim user conditions, contradictory local scope, legacy research attachment, unsupported stored version or altered identity.
- Transport: malformed JSON, incomplete output, malformed completion envelope; unexpected parser exceptions have a separate internal rule rather than pretending a known schema failed.

Known planner semantic/reference failures no longer inherit `turnRejectionCode()`'s default classification in call records or API responses. Malformed JSON and provider identity/deadlines remain distinguishable from plan validation. Early failures such as empty choices or malformed outer provider JSON also retain a safe completion diagnostic. No raw provider object or caught exception message is attached.

## Retrieval diagnostics on failure

After completed optional retrieval, the route retains a tiny `RetrievalDiagnostic`: version, status, sourceCount, durationMs, credits, searches, bundleId, and finite limitation category (`unverified-excerpts`, `no-usable-sources`, `not-configured`, `timeout`, `unavailable`). It contains no source titles, URLs, passages, questions or private provider content. Unknown credits remain `null`. HTTP 200 is not treated as source quality or truth.

Metadata is optional for old records and for retrieval interrupted before a bundle exists. No new storage system, HTTP fetch, retry, research loop or per-agent search was added. Successful plans retain their original complete bounded source snapshots; failed plans now retain useful counts/status without publishing source content.

## Offline evidence and review

- Added a minimal valid grounded version-2 fixture with four fictional roles, dynamic types, an entity, a relationship and literal source support. It passes the real generated-draft, immutable-plan and identity validators. It uses explicitly offline content, not a verified source claim.
- **62 new Node tests** cover direct validation and full route propagation of malformed fields, unknown/duplicate references, missing/invalid/duplicate slots, source/passage/quote failures, count limits, invented verification flags, versions, numeric claims, disconnected interactions, malformed JSON, unsafe objects, completion-envelope failures, provider mismatch, deadlines, unknown retrieval usage, failed optional retrieval and historic compatibility.
- Tests were first observed failing because diagnostics did not exist; review-found coercion, envelope and stage cases were also reproduced before repair. Existing tests that asserted old generic English exception text now assert stronger rule/path identities while retaining rejection assertions.
- **822 Node tests passed**, zero failures/skips (760 baseline + 62). Application TypeScript and explicit strict affected-module checks passed. Production build and `git diff --check` passed.
- All six model CLIs passed sequentially. The eldercare preparation write first hit a sandbox EPERM; repeating the same preparation/simulation commands with approved access to the derived catalogue passed. No formula or raw dataset changed.
- GIS was not executed; the prior Shapely limitation was not remedied or described as a pass.
- Independent read-only review verified the confirmed mismatches and the diagnostic propagation. It caught the non-coercible entity-name path, early envelope failures and ontology-stage labelling; all received regression tests and fixes. No further blocking issue was found.

## Mocked browser acceptance (not live provider evidence)

Used the production build on task-owned loopback port 3157 with process-local **dummy** keys and the existing network-blocked provider preload. The preload returns explicit DeepSeek/Tavily fixtures and rejects external fetches; no paid call occurred. No private environment file was edited or displayed.

The ordinary Map → Explore workweek flow completed with **four agents, eight separately mocked accepted actions, seven primary entities and fifteen edges**. Source inspection retained exact mock wording, original citation URL, retrieval date, unverified classification and limitations. Report chronology contained eight events, and Research horizon stayed absent. One MapLibre canvas remained mounted.

The opt-in invalid-plan fixture (`What if the planner returns an invalid entity type?`) returned `AI_PLAN_INVALID` with `ontology.entity_type_unknown` at `draft.ontology.entities[0].typeId`, stage ontology/category reference. The failed response retained **one mocked source candidate**, retrieval duration, bundle identity and reported mocked credit usage. No action call ran for the invalid plan. Graph showed the planning-failure empty state, not the earlier workweek graph. The earlier completed run remained in history. Mobile 390×844 diagnostics had no horizontal overflow; no page errors occurred.

Screenshots were captured and opened for visual inspection under ignored `tmp/phase2b-live/`: `diagnostics-valid-graph.png`, `diagnostics-source-inspector.png`, `diagnostics-valid-report.png`, `diagnostics-invalid-map.png`, `diagnostics-invalid-graph.png`, `diagnostics-mobile.png`. These are fixture evidence, not new real Tavily/DeepSeek acceptance. No new graph design or physics change was made.

Reproduce offline: run `npm.cmd test`, `npx.cmd --no-install tsc --noEmit`, `npm.cmd run build`, and `git diff --check` sequentially. Use the previous Phase 2B mocked-server instructions with `IMPACTLENS_PHASE2B_MOCK=true` and a free task-owned port. Never use the invalid-plan fixture against an unmocked server.

## Exact file inventory for this follow-up

New:

```text
lib/dynamic-scenarios/diagnostics.ts
lib/grounding/diagnostics.ts
lib/contracts/tests/helpers/planner-fixture.ts
lib/contracts/tests/planner-validation-diagnostics.test.ts
docs/PHASE2B_PLANNER_VALIDATION_DIAGNOSTICS.md
```

Modified (on top of preserved Phase 2B work):

```text
lib/dynamic-scenarios/plan.ts
lib/dynamic-scenarios/schema.ts
lib/dynamic-scenarios/response.ts
lib/world-graph/ontology.ts
lib/grounding/contract.ts
lib/server/ai/errors.ts
lib/server/inference/planner.ts
lib/server/inference/deepseek.ts
lib/server/inference/dynamic-service.ts
lib/stakeholder-simulation/inference-contract.ts
components/map-scenario-panel.tsx
lib/contracts/tests/dynamic-live-regressions.test.ts
lib/contracts/tests/world-orchestration.test.ts
scripts/testing/dynamic-provider-preload.mjs
docs/PHASE2B_LIVE_ACCEPTANCE.md
```

## Remaining live uncertainty

The original live planning rejection cannot be attributed to a specific rule because the necessary diagnostic was not retained. These fixes establish reproducible diagnostic correctness and resolve confirmed instruction/schema/runtime inconsistencies; they do **not** establish that the original live failure is resolved or that the endpoint accepts the updated schema's `uniqueItems` parameter.

The historical live result remains **FAIL**. A separately authorised **single** real Explore attempt is still needed to verify real Tavily metadata, revised DeepSeek version-2 planning and source support, eight real accepted actions, and the corresponding graph/inspectors/Report. If it fails, the new safe rule/path and retrieval metadata should make that particular rejection actionable without preserving raw provider responses. This task did not perform or authorise that retry.

Skills/tools used: systematic debugging, test-driven development, implementation planning, independent read-only audit/review, verification-before-completion; local Next.js route documentation, Node/TypeScript, PowerShell and Playwright MCP. No Git mutation, new dependency, paid call, private environment edit, secondary-directory access, Phase 3 work or deployment occurred. Work remains unstaged/uncommitted on `master` at `b80f9c6`.
