# Flexible entity grounding with strict provenance

Main worktree `master`, HEAD `b80f9c6dc91f2235a52a90a56226c6d28aea7085`; existing uncommitted work preserved. This is an offline correction. Both historical live acceptance **FAIL** results remain unchanged.

## Confirmed former failure

The second real test reached `ontology.source_quote_entity_mismatch` at `draft.ontology.entities[0].support.quote`. Source ID, passage ID and exact quoted-substring integrity had already passed. The last check required the complete proposed entity name to occur in the quote, ignoring case, and rejected the entire draft when absent. That mixed entity acceptance with source attribution.

The actual rejected name and quote were not retained. An acronym/alias/formatting difference is plausible, **not established** by the live record. Offline acronym, shortened-name, punctuation and unrelated-quote fixtures below are deliberate test cases, not reconstructions of that provider output.

## Policy implemented

**Retain the proposed association as an explicitly unverified candidate; withhold it from evidence presentation.** No model output is silently renamed, repaired, detached from the immutable input or promoted to a verified fact.

| Case | Entity acceptance | Evidence treatment |
|---|---|---|
| `support:null` | Allowed if structurally valid | No invented citation |
| Valid literal quote containing full name, ignoring case | Allowed | Literal source-reported mention, still not independent verification |
| Valid literal quote without full-name mention | Allowed | `unverified-candidate`; quote/link withheld from entity evidence presentation |
| Unknown source/passage ID, invented quote, empty/oversized quote | Rejected | Precise source-integrity diagnostic preserved; no downgrade into acceptance |
| Missing `support` field | Rejected by existing required-field contract | Provider must use explicit `null` |
| Fictional agents | No identity citation required | Remain fictional; Census context is aggregate context, not existence evidence |

`lib/world-graph/attribution.ts` defines the derived **SourceAttributionV1** policy and shared assessment functions. The metadata has only version, fixed status and fixed reason. Status is `none`, `source-reported` or `unverified-candidate`. An assessment exposes an `evidence` reference only when its relevant literal-attribution conditions hold. No alias expansion, punctuation normalisation, fuzzy matching, external lookup or invented entity identity is performed. The remaining full-name check determines **evidence presentation**, never entity acceptance.

The structural validator still validates every non-null quote's source snapshot, URL, source/passage IDs, exact case-sensitive substring and quote length before the entity can be accepted. Entity/type uniqueness, primitive shapes, ontology versions, dynamic references, agent namespaces/slots/connectivity, byte/count limits, markup/URL/quantified-claim rules and provider safeguards are unchanged. The historical mismatch diagnostic code remains recognised for old failure records, but current generation no longer throws it merely because the name is absent.

## Immutable identity and historical compatibility

New plans that contain an unmatched entity association receive the server-computed marker:

```json
"attributionPolicy": {
  "version": 1,
  "mode": "retain-unverified-candidates"
}
```

This optional plan-envelope field is frozen and included in the full plan content hash, alongside the original entity name, proposed association and exact grounding snapshot. It is not requested from DeepSeek and is not a new provider/draft field. Import validation requires the marker when unmatched entity candidates are present and rejects invented modes or removed markers. It cannot grant evidence status; the shared assessment still checks the actual immutable source/name inputs.

Previously valid archived v1/v2 plans have no newly accepted unmatched entity associations, so their original content and hashes remain unchanged. Tests pin pre-change v1 and grounded-v2 SHA identities, verify candidate-plan export/import, reject edits without a new identity, and confirm reads do not mutate records. No archive migration or hash rewriting occurs.

Relationship candidates were already permitted by the old contract; their acceptance/hash semantics are preserved. The new presentation policy applies more conservative source displays without rewriting historical input data.

## Graph, inspector and Report consumers

Audited and updated all production entity/relationship support consumers:

- The primary world projection retains every eligible entity as a **model suggestion, unverified**, including unmatched candidates. Its inspector metadata contains a fixed candidate status/reason and **zero evidence passages** for an unmatched association. Source and accepted-event nodes remain absent from the ordinary graph.
- Popup, expanded and full inspectors show a concise candidate/withheld explanation. They suppress candidate quote/link displays even if a stale caller mistakenly supplies source entries alongside candidate status.
- The internal audit graph retains the retrieval bundle and proposal records, but adds no `QUOTES_EXCERPT` evidence link for a withheld entity/relationship association. Candidate status is recorded separately. Retrieved passages remain independently labelled untrusted source-reported text.
- `projectDynamicReport()` provides an effective ontology with candidate `support` fields set to null **only in the Report projection**, plus bounded withheld entity/relationship counts and the policy marker. The actual original candidate remains in the immutable run. The projected ontology is not a replacement executable plan.
- The real Report UI uses the same assessment functions, not raw `support` presence. It shows a withheld count and explicit candidate explanation rather than an entity evidence quote. The separate retrieval inventory remains inspectable as uncorroborated source text, without implying it confirms the entity.
- Verified findings remain empty unless supplied by a separate authoritative process. Fictional actions retain their existing synthetic provenance; no candidate quotation becomes an agent evidence-finding ID.

## Relationship grounding

Structural endpoints/types remain strict. A relationship with no support is valid and unverified. An asserted non-null source reference must still pass exact-source integrity validation.

Source-reported relationship presentation requires the **exact statement quotation** and literal mention of both world-entity endpoints. A valid quote that does not establish that association is retained as an unverified candidate, with no source-backed edge or evidence quote. Links involving fictional participants do not become factual relationships through a source quote. Literal statements still do not establish causal truth, entity resolution or independently verified relationship-type interpretation.

## Prompt and schema

The planner now explicitly says evidence is optional, `support:null` is preferred without a suitable direct quotation, names/source wording can differ, irrelevant quotations must not be forced onto entities, and fictional agents need no existence citation. Nonmatching associations remain unverified candidates withheld from evidence. Contradictory mandatory full-name language was removed and regression-tested.

The provider JSON Schema is unchanged: bounded `support` remains an explicit null or a strict sourceId/passageId/quote object. No alias registry or verification field was added. The existing 6,000-token/48-KB planner, fixed model/provider, no-reasoning setting, deadlines, four-agent/two-round/eight-action bounds and cost controls are unchanged.

## Verification

Offline tests first reproduced failure of the mismatched-literal plan and missing inspector/projection safeguards, then passed after the correction. Coverage includes full-name/case-only mentions, acronym-only/shortened/punctuation/unrelated candidates, null/missing support, source/passage integrity, fabricated/empty/oversized quotes, snapshot and safe-URL integrity, no invented aliases, independent relationship attribution, synthetic agents, hash-bound policy and historical SHA compatibility, real component rendering, and a real API-route flow with mocked planning plus eight separately mocked action completions.

**847 Node tests pass**, zero failures/skips, versus 822 baseline. Two obsolete mandatory-name rejection variants were replaced by positive candidate-acceptance coverage; all source-integrity rejection variants remain. Real-world graph and Report assertions verify no unsupported attribution reaches evidence or verified findings. Application TypeScript, explicit strict affected-module checks, production build and whitespace checks pass.

All six model CLIs passed sequentially. Eldercare preparation initially hit the existing sandbox EPERM on its derived catalogue; rerunning the same preparation/simulation commands with approved access passed. GIS was not run; the prior Shapely limitation was not remedied and no GIS pass is claimed.

## Mocked browser acceptance

The production build ran on task-owned loopback port 3159 with dummy process-local keys, `IMPACTLENS_PHASE2B_MOCK=true`, `IMPACTLENS_FLEXIBLE_GROUNDING_MOCK=true` and the existing network-blocked provider preload. Browser requests outside loopback were also blocked. As expected, unavailable street tiles produced the existing local-geography fallback warning. No external API request, private environment edit or paid inference/retrieval occurred.

The fixture deliberately names an entity `Ministry of Manpower (MOM)` while its literal source passage mentions only `Ministry of Manpower`. This is a **constructed offline name-form example**, not a claim about the real rejected name/quote.

- Ordinary Map → Explore completed **four fictional agents, eight separately mocked accepted actions**, one plan and seven primary world nodes/fifteen edges. The immutable plan contained the fixed attribution-policy marker.
- Entity and proposed-relationship inspectors showed **unverified candidate**, zero evidence passages and no candidate quotation. Appropriate Singapore fictional roles retained Census 2020 aggregate context. A recorded-response edge remained explicitly a fictional interaction with real accepted event references.
- Report contained eight accepted events, the unverified entity, withheld entity/relationship counts, separate retrieved-source inventory, original identities and limitations. No Research horizon appeared.
- Native mouse dragging moved a connected neighbour **83.85 graph units**, reheated alpha target to **0.3**, then cooled below **0.001** with target zero/no running loop. Positions survived Graph → Report → Graph.
- Separate mocked unknown-source and fabricated-quote questions stopped at `ontology.source_reference_unknown` and `ontology.source_quote_not_found` respectively, each before action execution. The current graph remained empty for the failed question. The successful run remained in history and was explicitly inspectable as archived.
- Desktop 1440×900 and mobile 390×844 screenshots were opened for inspection. The mobile full inspector displayed candidate status, zero evidence passages and no candidate quote; no horizontal overflow or browser page errors occurred.
- Browser tooling hit two selector mistakes and one response-observer body-read race. Checks resumed against the already recorded run/state without changing the application or rerunning the successful scenario. These harness errors are not counted as application failures or silently described as one clean script pass.

Local ignored screenshots under `tmp/flexible-grounding/`: `graph.png`, `entity-candidate.png`, `relationship-candidate.png`, `recorded-interaction.png`, `report.png`, `before-drag.png`, `during-drag.png`, `after-drag.png`, `mobile-graph.png`, `mobile-candidate.png`, `invalid-quote.png`, `invalid-empty-graph.png`. All are **mocked** evidence. The existing `tmp/dynamic-scenarios/mock-ledger.json` records three mocked retrievals/three planning completions/eight actions: one success and two strict failure cases.

Reproduce offline by running the standard checks sequentially, then starting the existing mocked production server with the extra flexible-grounding switch above and a free loopback port. The valid fixture question is `What if Singapore introduces a four-day workweek?`; strict failure fixtures are `What if the planner invents a source reference?` and `What if the planner invents a quotation?`. Never use these fixture checks against an unmocked server.

## Exact file inventory for this correction

New maintained files:

```text
lib/world-graph/attribution.ts
lib/contracts/tests/flexible-entity-grounding.test.ts
docs/PHASE2B_FLEXIBLE_ENTITY_GROUNDING.md
```

Modified on top of the existing uncommitted work:

```text
lib/world-graph/ontology.ts
lib/world-graph/projection.ts
lib/dynamic-scenarios/plan.ts
lib/dynamic-scenarios/diagnostics.ts
lib/dynamic-scenarios/projection.ts
lib/server/inference/planner.ts
components/dynamic-scenario-view.tsx
components/knowledge-workspace.tsx
lib/contracts/tests/planner-validation-diagnostics.test.ts
lib/contracts/tests/world-projection.test.ts
lib/contracts/tests/world-inspector.test.ts
scripts/testing/dynamic-provider-preload.mjs
docs/WORLD_KNOWLEDGE_GRAPH_PHASE2B_REFINEMENT.md
docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md
```

The provider Schema, inference transport/actions, map/building rendering, physics implementation, MRT/AAC formulas, raw demographic/geographic data and licensing restrictions were not changed. No dependency was added. Work remains unstaged/uncommitted and the unused secondary directory was untouched.

## Remaining uncertainty

This change deliberately resolves the specific **policy** that blocked the second live attempt. It cannot establish which entity wording was returned then or guarantee that a future model output passes every other rule. No real Tavily/OpenRouter call was made. A separately authorised single live acceptance attempt is still required to establish real end-to-end planner/action/graph/Report success. Neither historical live FAIL report is rewritten or relabelled.
