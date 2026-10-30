# Phase 2B staged planner and live acceptance

## Architecture decision (before implementation)

The three historical failures are preserved in their original reports. Attempt 3 established an undeclared relationship endpoint; its value was not retained. Structured JSON alone cannot enforce references to declarations generated in the same completion.

| Approach | Reliability / constraints | Cost and compatibility |
|---|---|---|
| Single shot | Still asks one response to invent and reproduce multiple registries; endpoint enums cannot depend on earlier output in the same JSON document | One planning completion; lowest latency; repeated observed semantic failures |
| Register then relate (selected) | Validate entity declarations first, assign canonical IDs, then enumerate accepted endpoints and relationship types in a second schema | Two bounded planning completions; existing immutable v2 plan and renderer retained; explicit registration metadata and two call records |

Stage 1 produces scenario interpretation, four fixed identity slots, required connected agent opportunities and entity/type declarations. Optional ontology relationships must be empty. The application validates declarations before remapping namespaces deterministically. Stage 2 receives this frozen registry and proposes only world relationships with enumerated endpoints/types. Invalid references remain rejected; no fuzzy resolution or invented endpoints. Optional enrichment is not required to be nonempty. Source identifiers and literal quotations are never remapped. Both stages use the existing transport, identity checks and 45-second ceiling, under the existing 120-second overall deadline. No retries.

## MiroFish research

Inspected official source at revision `7657031ac01184afe2cb220f5ee3545573b5e843`:

- [ontology_generator.py](https://github.com/666ghj/MiroFish/blob/7657031ac01184afe2cb220f5ee3545573b5e843/backend/app/services/ontology_generator.py): an LLM generates type definitions, not persistent entity instance IDs. It normalises type names and supplies fallback types; its fixed type-count policy is not adopted here. Its JSON helper permits two attempts.
- [graph_builder.py](https://github.com/666ghj/MiroFish/blob/7657031ac01184afe2cb220f5ee3545573b5e843/backend/app/services/graph_builder.py): registers ontology with Zep, ingests document chunks as graph episodes, waits for extraction, retrieves Zep node/edge UUIDs. MiroFish assigns the graph ID; Zep supplies persistent extracted node/edge identities. Lost mutation replies are reconciled, not blindly replayed.
- [zep_entity_reader.py](https://github.com/666ghj/MiroFish/blob/7657031ac01184afe2cb220f5ee3545573b5e843/backend/app/services/zep_entity_reader.py): reads extracted UUIDs, names, labels, summaries and edges for downstream profiles; graph entities are distinct from generated simulation-agent profiles.
- [zep.py](https://github.com/666ghj/MiroFish/blob/7657031ac01184afe2cb220f5ee3545573b5e843/backend/app/utils/zep.py): bounded retry of safe reads for transport/408/429/5xx failures. Extraction and entity resolution are delegated to Zep, not implemented by the ontology prompt.

Upstream is AGPL-3.0. No implementation blocks are copied. ImpactLens independently adopts stage separation and registry ownership using its existing TypeScript stack; it does not adopt Zep, upstream retry policies or fixed types. This is an architectural adaptation, not a claim of equivalent extraction capabilities.

## Verification and live ledger

Implementation, offline verification and real-provider observations will be recorded below. No paid calls have occurred at this decision checkpoint.

## Implemented contract (final)

- Production uses `dynamic_entities_v2`, followed by `dynamic_relationships_v2`, then at most eight `stakeholder_turn_v1` completions. The old single-shot factory remains for historical contract tests; the production route has no competing fallback or regeneration path.
- Stage 1 retains strict role-slot and connected-opportunity validation. Its optional ontology relationship list must be empty. Declared type/jurisdiction references are still validated before registration; malformed declarations are not repaired.
- Registration assigns ordered `jurisdiction-001`, `context-001`, `entity-type-001`, `relationship-type-001`, `entity-001` namespaces. Active agent slots remain `agent-1`–`agent-4`. Exact original-to-canonical declaration maps are frozen in `plan.registration` (`version:1`, `registered-stages`) and hashed with effective plan content. No fuzzy matching. Source/passage IDs and literal support are unchanged.
- Stage 2 schema enumerates the actual world-instance plus agent IDs as endpoints, and registered relationship-type IDs separately. Up to 24 optional enrichment relationships, including an empty list when genuinely appropriate. Unknown endpoints, types, malformed records and false source quotations still reject. No per-candidate silent dropping was introduced: endpoint-constrained generation is the selected correction.
- Version-2 response envelopes contain both `planning.records` and a checked `record` alias to the final stage. Version-1 envelopes retain single-shot interpretation. Both planning costs count toward the existing soft run control; reaching it after entity planning prevents stage 2. Report diagnostics expose each stage separately. All previous valid plan hash fixtures remain unchanged.
- Existing 10-second research, 45-second per-planning-stage, 30-second action and 120-second overall deadlines remain. Maximum completions per new run is explicitly ten, not nine. No automatic retries or provider fallback.
- Flexible attribution remains unchanged: nonmatching genuine quotations are candidates withheld from evidence; unknown source/passage IDs or fabricated quotations reject. Model proposals are never independently verified by registration.

## Task budget guard

Ignored durable ledger: `tmp/staged-planner/live/ledger.json`. `scripts/testing/staged-live-guard.mjs` is an opt-in real-request pass-through, not a mocked provider. Each attempt must be armed explicitly; requests are written before dispatch, with sequential execution and finite per-attempt/global limits. It forwards configured server credentials without reading or persisting their values. No private environment file was edited or copied.

Public DigitalOcean endpoint pricing checked for the exact model: input USD 0.000000119/token; output USD 0.000000238/token. Metadata snapshot is local. Each completion reserves USD 0.02 with a 98,304-byte whole-request ceiling and at most 6,000 planning/800 action output tokens. Treating every request byte as an input token gives less than USD 0.014 at the observed rates; the reservation includes headroom. Each attempt requires USD 0.20 and ten completion slots available. Missing/interrupted charges retain reservations. A basic Tavily request reserves two credits until reported usage arrives. This is a conservative local guard, not an external account hard cap or guarantee against provider price changes. Tavily dollar charges are not inferred from credit counts.

Historical ledgers and all three original FAIL reports are retained. New-task usage starts independently.

## Iterations before qualifying acceptance

1. First new-task live attempt: both planning stages accepted; ten registered world entities, four roles, but no optional enrichment edges. Three actions accepted. The next action failed immediately with no HTTP status and no guard-observed dispatch. Exact original cause was not retained; an offline replay constructed its request successfully. The task guard was made compatible with framework `Request` bodies and given bounded rejection telemetry, with an isolated regression test. The unobserved action retains a USD 0.02 conservative reservation rather than being assumed free. Its original cause is **not claimed confirmed**. Recorded OpenRouter charge: USD 0.0023266166; one Tavily credit.
2. Second attempt: both stages accepted; eight world entities and eight proposed relationships; seven actions accepted, eighth rejected by existing `AI_ACTION_SEMANTICS`. Provider identity/JSON/normal termination all passed. The precise action sub-rule was not retained by the previous diagnostic. Recorded OpenRouter charge: USD 0.0041577172; one Tavily credit. No action was replayed or fabricated to fill the missing turn.

The first entity plan contained abstract outcome concepts and ID-like labels. Instructions now explicitly ask for concrete world actors/places/groups and human-readable names, without prescribing an entity taxonomy. Stage 2 now distinguishes unverified relational hypotheses (`support:null`) from source-supported claims, so lack of a citation is not a reason to return an empty graph.

Following the second attempt, action diagnostics gained a fixed-vocabulary `actionValidationRule`; no offending text is retained. Offline tests reproduce changed-position and reference failures. Per-turn JSON Schema now expresses the runtime's existing conditional rules: later turns must contain an available other-agent event; non-revision turns retain the previous position; revisions must contain an own prior event. This does not remove valid revisions or relax semantic validation. The exact original eighth-turn sub-rule remains unknown; the change addresses a confirmed schema/runtime discrepancy, not a claimed reconstruction of that response.

3. Third attempt: both plans accepted, two actions accepted, then another immediate local failure before a guard-observed dispatch. Offline stress of the original ledger implementation reproduced **`EPERM`, syscall `rename` after 18 calls** in this OneDrive-backed workspace. The ledger's authoritative storage now appends and flushes snapshots to `ledger.jsonl`, with bounded tail reading; `ledger.json` is a best-effort readable summary. Incomplete writes fail closed. The revised offline stress passed **144 calls**. The live failures' original OS exception was not retained, so the exact original exception is not retroactively asserted; the independently reproduced guard defect is fixed. Another USD 0.02 unknown-charge reservation is retained. Actual third-attempt OpenRouter charge: USD 0.0015122996; one Tavily credit.
4. Fourth attempt: Tavily succeeded; Stage 1 rejected `agent.cross_reference_invalid` at `draft.agents[2].entityIds[0]`. The actual offending ID was not retained. Planning completed normally (14.543 seconds locally), but no actions ran. Actual charge USD 0.0007974904; one Tavily credit. This exposed the remaining duplicate registry ambiguity. New generation now constrains legacy top-level `entities` and agent `entityIds` to empty arrays in schema and runtime. Only `ontology.entities` declares world instances; Stage 2 connects those canonical instances and agent slots. Historical plans retain their original legacy references. A focused regression reproduces this reference class without claiming the original rejected value.
5. Fifth attempt: strict `ontology.source_quote_not_found` at `draft.ontology.entities[0].support.quote`; one planning completion, no actions. Local planning 18.892 seconds; normal JSON/stop/identity. Recorded OpenRouter charge USD 0.0010047884; one Tavily credit. No false quotation was accepted.

The quotation failure motivated a second registry improvement: new provider schemas are `dynamic_entities_v2` / `dynamic_relationships_v2`. Generated support is either null or a pair selected from supplied source/passage IDs, constrained with paired schema alternatives. **There is no model-authored quote field.** The application resolves an accepted selection to the exact existing retrieved passage text; the original bundle and literal-text validators remain authoritative. Extra quote properties—including apparently correct quotes—reject under this generation contract; archived literal supports remain unchanged. Unknown/mismatched source-passage pairs reject. There is no invented excerpt, fuzzy source resolution or rewrite of a fabricated quotation. `plan.registration.supportPolicy = retrieved-passage-selection-v1` records this deterministic process and is hash-bound. Full retrieved text is only presented where the existing conservative attribution assessor permits; selecting a passage cannot establish identity verification or relationship entailment.

6. Sixth attempt: both new reference-selection planning contracts passed; nine world entities and thirteen proposed relationships. Four actions accepted; first second-round completion rejected `AI_ACTION_SCHEMA` / `shape.invalid`, despite normal stop/JSON/identity. It used only twelve output tokens. The exact object was not retained, so its fields are not asserted. The newly added partial conditional schema branches had no independent complete-field requirements; these are now complete action alternatives, each carrying all required properties and `additionalProperties:false`. Runtime validation is unchanged. New finite `shape.missing_<field>` diagnostics identify future incomplete objects. Actual OpenRouter charge USD 0.0024626098; one Tavily credit. This is a provider-schema compatibility adaptation based on observed output size and an audited schema discrepancy, not proof of the discarded object's exact shape.

## Final verdict: PASS

**The seventh new-task attempt completed the real Tavily + DeepSeek application workflow, including all eight accepted actions, World Knowledge Graph, inspectors and Report. Paid testing stopped at that first qualifying success.** The guard now refuses to arm any further attempt after a recorded PASS. This is one completed live observation, not a statistical reliability guarantee.

Environment: main `master`, HEAD `b80f9c6dc91f2235a52a90a56226c6d28aea7085`, existing unstaged/uncommitted Phase 2B work preserved. Tests occurred on **30 October 2026, Asia/Singapore (UTC+08:00)**. New-task attempt reservations began at 02:06:14; successful source snapshot at **02:39:16.976**, with final browser checks around 02:47. A task-owned production server used `127.0.0.1:3162`; isolated browser contexts preserved existing user storage. No mock provider was loaded for real tests. The optional real-request guard stored finite telemetry only. No private environment file was edited, displayed or copied. All task-owned live/mock servers were stopped.

Exact question:

> What if Singapore introduces a nationwide four-day workweek instead of the traditional five-day workweek? How would this affect employees, businesses, productivity, wages, and the wider Singapore economy?

Accepted identities:

- Plan: `dynamic-plan-f3c2b9ad93c62404726479b1fd9db8a2a72a609728861d9b0066b5753746b651`
- Run: `run-9a0226198dc73e2c94788874-attempt-4-30558034-f5a0-4c1e-9552-4e3d6700c7a1`
- The frontend attempt prefix is independent of the task ledger's attempt number seven.

| Checkpoint | Result | Real evidence |
|---|---|---|
| A — Tavily | PASS | One HTTP 200 search, five retained candidates, one reported credit; request/body telemetry 4.174 s. Relevant Singapore workweek paper and reporting retained with public URLs, dates and passages. Retrieval remains uncorroborated. |
| B — Planning | PASS | Entity stage **18.010 s**, 2,332 input / 3,332 output tokens, USD 0.0009730392. Relationship stage **2.929 s**, 1,660 input / 707 output, USD 0.000365806. Both exact model / DigitalOcean, `stop`, no reasoning, valid JSON/runtime contracts. Registered passage-selection policy is hash-bound. |
| C — Actions | PASS | Four fictional roles, two rounds, **eight separate accepted completions**. Seven events reference earlier accepted events. All references validated; no substituted transcript, retries or scripted fallback. |
| D — World graph | PASS | **12 proposed world/context entities + 4 fictional agents = 16 nodes; 31 edges**. Node record types only `world-entity` and `fictional-agent`; no source, event, scenario, horizon or audit nodes. Straight and Bézier edges confirmed. |
| E — Inspectors | PASS | Randstad Singapore exposes an attributed source passage/URL/date while identity stays unverified. Singapore government's mismatched association is withheld with zero source passages. Fictional worker shows historical Census aggregates and explicit limitations. Proposed edge and accepted interaction inspect separately with direction and recorded event references. No independently verified factual relationship was generated. |
| F — Report | PASS | Exact question and identities, four roles, eight accepted events, matching chronology, source inventory, six withheld entity associations, historical aggregate context, both planning-stage records and combined usage. No Research Horizon heading or invented empirical forecast. |

### Actual graph inventory and limits

Participating roles (actual generated order): `agent-3` Singapore F&B operator; `agent-4` Singapore professional-services HR leader; `agent-2` Singapore logistics shift worker; `agent-1` Singapore union representative. All fictional; no authorised real representatives or statistical population weights.

Visible types: `retail_operator`, `hr_leader`, `shift_worker`, `union_rep`, `Referenced organisations`. Generated world relationship types: `affects`, `responds`, `negotiates`. The projection also distinguishes `PROPOSED_INTERACTION` and actual `RECORDED_ARGUMENT` edges. All eight actions used the allowed argument type, with actual cross-agent references/replies; event type alone is not an interaction count.

World labels: Singapore government; Randstad Singapore; F&B sector; Logistics operations; Talent market; Employee retention; Employee engagement; Workplace stress; Work-life boundaries; Milieu survey; Labour unions; Iceland's four-day workweek pilot. **Semantic quality remains limited:** the model chose a coarse organisation type and included abstract concepts and comparative international context. Registration proves structural identity/reference integrity, not correct entity classification, source truth or a complete world model. These limitations were not hidden or rewritten into a more impressive graph. The simulation scope remains local and all active roles Singapore-affiliated.

Three entity associations qualify only as literal source-reported mentions; six are withheld candidates; three have no support. No independently verified entity identity/factual causal relation is claimed. All seventeen world relationships are unverified proposals. The original passage inventory remains available separately. Census context uses the existing 2020 national aggregate adapter (4,047,260 summed rounded leaf counts versus separately published 4,044,210; difference 3,050), not invented individual characteristics or current population estimates.

### Retained source candidates

- [Reimagining Singapore's work culture: the four-day workweek proposition](https://pmc.ncbi.nlm.nih.gov/articles/PMC11774796) — reported publication 2025-01-10.
- [Is a four-day work week possible for Singapore?](https://govinsider.asia/intl-en/article/is-a-four-day-work-week-possible-for-singapore) — 2022-10-16.
- [Is a four-day work week catching on in Asia?](https://www.cnbc.com/make-it/2022/03/02/is-a-four-day-work-week-catching-on-in-asia-it-depends-on-the-country.html) — 2022-03-02.
- [These are the surprising benefits of a four-day working week](https://www.weforum.org/stories/jobs-and-the-future-of-work/surprising-benefits-four-day-week) — 2023-10-25.
- [The four-day workweek paradox](https://www.sap.com/blogs/the-four-day-workweek-paradox) — 2024-02-06.

Dates and metadata are retrieval records, not independently checked publication/authenticity findings. Source vintage and foreign pilot observations cannot establish the proposed Singapore policy's effects. No extra searches were made to corroborate them.

## Request and cost accounting

Historical attempts 1–3 from earlier tasks are excluded. Every attempt below used the exact authorised question through the ordinary Map → Explore API. No automatic paid retries, extra scoring or additional providers.

| Task attempt | Tavily / credits | Planning calls | Observed action calls | Accepted actions | Outcome | Reported OpenRouter USD |
|---|---:|---:|---:|---:|---|---:|
| 1 | 1 / 1 | 2 | 3 (+1 uncertain local failure) | 3 | Partial | 0.0023266166 |
| 2 | 1 / 1 | 2 | 8 | 7 | Partial / action semantics | 0.0041577172 |
| 3 | 1 / 1 | 2 | 2 (+1 uncertain local failure) | 2 | Partial | 0.0015122996 |
| 4 | 1 / 1 | 1 | 0 | 0 | Invalid legacy entity reference | 0.0007974904 |
| 5 | 1 / 1 | 1 | 0 | 0 | Invalid literal quote | 0.0010047884 |
| 6 | 1 / 1 | 2 | 5 | 4 | Partial / action schema | 0.0024626098 |
| **7** | **1 / 1** | **2** | **8** | **8** | **PASS** | **0.0047476002** |

Totals: **7 Explore attempts; 7 Tavily searches / 7 reported credits; 38 observed OpenRouter completions (12 planning + 26 actions), plus 2 conservatively counted unknown calls = 40 against the 180 ceiling.** Known billed usage: **96,953 input + 34,664 output = 131,617 tokens**. Unknown calls have unknown tokens/charges, not zero.

**OpenRouter reported charges: USD 0.0170091222. Conservative total including USD 0.04 unknown-call reservations: USD 0.0570091222.** Tavily USD charges are unknown; seven credits are reported separately. No pending request remains. Final successful run alone: 31,131 input + 7,864 output = 38,995 tokens; USD 0.0047476002; browser-observed 70.902 s. Every observed completion used the required model and verified DigitalOcean identity, with reasoning disabled; no requested identity was presented as serving confirmation for an unobserved failure.

Unused allowance at stop: **13 attempts; 18 Tavily searches; 43 credits; 140 conservatively counted completions; USD 1.9429908778 after reservations.** This unused allowance is not permission to continue after success. Public endpoint-pricing metadata and GitHub source reads were free metadata/research operations, not additional paid completions or Tavily searches.

## Browser and regression evidence

Actual production application, **1440×900 / DPR 2** and the same completed run resized to **390×844**. Exactly one Explore POST in the successful context; graph/report/map navigation generated no paid requests. No unexpected browser console/page errors. Mobile graph and Report had no horizontal document overflow. Fit-to-graph labels on the narrow screen require ordinary zoom/search; inspector text remains readable. Both straight and Bézier edge styles rendered. No live self-loop was generated; existing deterministic loop tests remain.

Mouse drag heated physics to alpha target 0.3. Three connected neighbours moved **63.73 / 30.30 / 71.62 layout units**; after release alpha target returned to zero and motion settled at alpha 0.0009934. Settled positions and renderer identity were unchanged across Report → Graph. Search, type filtering (16 → 4 → 16 visible nodes), Fit Graph, Reset View and return to Map worked. No data or question reset. Existing 300-node performance limitations remain; this acceptance is not a new large-graph benchmark.

Real screenshots, all under ignored `tmp/staged-planner/live/`:

- `graph-desktop.png`, `graph-mid-drag.png`, `graph-settled.png`, `graph-mobile.png`.
- `real-entity-source-inspector.png`, `withheld-candidate-inspector.png`, `synthetic-agent-inspector.png`.
- `accepted-interaction-inspector.png`, `proposed-relationship-inspector.png`, `source-inspector-mobile.png`.
- `report-desktop.png`, `report-desktop-top.png`, `report-mobile.png`, `report-mobile-top.png`, `map-mobile.png`.

Safe application snapshots, audited projections, browser measurements and cost summaries are stored in the same ignored directory. They contain accepted application records/public source excerpts, **not raw provider response bodies, private prompts, credentials or reasoning**. The durable journal is authoritative; the JSON ledger is a readable summary. Existing historical ledgers/reports were preserved.

Offline verification:

- **872 Node tests passed**, including canonical registration, wrong namespaces/endpoints, strict source selection, rejected quote fields, candidate withholding, immutable-policy hashes, archive identities, two-stage accounting/failure propagation, cancellation and full mocked four-agent/eight-action execution.
- Application TypeScript and affected-module strict TypeScript passed. Production build passed (`tmp/staged-planner/build7.log`); whitespace check passed with existing line-ending warnings only.
- All six numerical CLIs passed: MRT validation/simulation, eldercare preparation/simulation, agent generation/impact. The derived eldercare catalogue initially needed approved access after a sandbox write denial; no source/formula/dataset change.
- **GIS not run: Shapely remains unavailable** in the main Python environment. No dependency installation or secondary-directory access.
- Final network-blocked mocked browser verified current v2 passage selection, withheld mismatched attribution, eight accepted independent mock turns, Graph/Report, and a forbidden model-quote property failing with `plan.unexpected_property` at `draft.ontology.entities[0].support`. Mock evidence is separate from the live PASS; the paid ledger did not change.

## Changed-file inventory for this task

Created:

- `lib/dynamic-scenarios/registration.ts`, `lib/dynamic-scenarios/passage-selection.ts`.
- `lib/contracts/tests/staged-planner.test.ts`, `staged-live-guard.test.ts`, `action-conditional-schema.test.ts`, `passage-selection.test.ts`.
- `scripts/testing/staged-live-guard.mjs`.
- This report.

Modified within existing/pending work:

- `lib/server/inference/planner.ts`, `dynamic-service.ts`, `deepseek.ts`.
- `lib/dynamic-scenarios/plan.ts`, `response.ts`, `schema.ts`, `diagnostics.ts`.
- `lib/stakeholder-simulation/inference-contract.ts`, `inference-errors.ts`.
- `components/dynamic-scenario-view.tsx` (separate stage records/ten-call accounting).
- `lib/contracts/tests/helpers/dynamic-provider.ts`, `dynamic-provider.test.ts`, `dynamic-live-regressions.test.ts`, `planning-timeout.test.ts`, `planner-validation-diagnostics.test.ts`, `flexible-entity-grounding.test.ts` (fixtures/assertions aligned to the new generation boundary; legacy validator checks retained).
- `scripts/testing/dynamic-provider-preload.mjs` (isolated mocked generation adapter).
- `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`, `docs/WORLD_KNOWLEDGE_GRAPH_PHASE2.md` (follow-up references).

Other pending Phase 2B UI/provenance/demographic/graph files are preserved and are not new changes from this task. No Git staging, commits, merges, resets, stashes, pushes or deployment. No secondary worktree access.

## Remaining limits and next action

Review the uncommitted diff and saved live artifacts. No further live retry is needed to establish this observed end-to-end PASS. Broader reliability, better semantic typing/entity resolution, factual corroboration and population-scale/quantitative modelling remain separate work. The fixed source registry removes quotation copying errors; it cannot establish entailment. Models may still produce invalid declarations or unsupported text, which remain rejected. No unbounded retries or silent repairs were added.
