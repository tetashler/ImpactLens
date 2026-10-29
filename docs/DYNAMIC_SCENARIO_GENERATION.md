# Dynamic scenario generation

Original mocked implementation record on main `master`, starting at `e466f16cfdbd630a6ff3037d39ff67b13f5e2fba`. That original implementation made no paid inference calls, dependency installation, environment-file edit, secondary-worktree access or Git mutation. Separately authorised live acceptance is now complete; see [DYNAMIC_SCENARIO_LIVE_ACCEPTANCE.md](DYNAMIC_SCENARIO_LIVE_ACCEPTANCE.md) and the dated follow-up below.

## Pathway

The primary Start Simulation action now selects `dynamic`, rather than one of the old three live presets. A single `POST /api/scenario-simulate` interprets the question once, constructs four generated fictional profiles, and invokes the existing sequential action engine for two rounds. Planning does not contain an action transcript: eight separate completion requests produce the accepted actions. All topic selection, roles, affiliations and interaction opportunities come from the planner, not a production keyword table. Five named fixtures exist only for deterministic tests.

The old `live` compatibility path, V1 catalogued profiles, V2 legacy API envelopes, saved runs, graph/report inspectors and explicit scripted ASEAN demonstration remain. New UI starts do not use that preset selection. The optional Map interpreter still restricts native numerical calculator eligibility, independently of qualitative agent simulation. Confirmed MRT/AAC calculations run through their original paths; unconfirmed plots and polyclinics never become AAC calculations.

## Contracts and provenance

- **DynamicRequest v1:** exact question, original validated Singapore plot, monotonic geometry revision. Full SHA-256 request identity includes all three. No client-supplied agent manifest, citations or numerical results is accepted by the new endpoint.
- **DynamicScenarioPlan v1:** explicit `model-generated-scenario-plan` kind; content-derived plan ID, request identity, retained request and strict generated draft. Separate from the unchanged Phase 7B `ScenarioPlan` v1.
- **Draft:** description, hypothetical trigger, proposed scope/jurisdictions/domains, exact user-question quotations, unverified entity suggestions, exactly four fictional agents, connected interaction opportunities, model-proposed assumptions, unknowns, spatial requirements, unsupported quantities and narrative progression/horizon.
- **Agents:** stable IDs within the plan, category, contextual affiliations/entity references, goals, incentives, concerns, proposed initial position and knowledge limits. Runtime role profiles are deterministically derived from this manifest. Actual committed positions begin with accepted actions; the plan's initial position is a proposal.
- **Stakeholder input v2:** includes the full validated plan and exact derived profiles/assumptions. V1 still requires unchanged registered profiles. The existing `StakeholderSimulationInputV1` TypeScript compatibility name now aliases the explicit versioned union; new consumers can use `StakeholderSimulationInput`. Run envelope v1 and event/memory semantics remain unchanged.
- **Dynamic response v1:** plan, planning call record, actual action run/diagnostics and recomputed combined accounting. Failure responses preserve available planning usage. Client validation rebuilds the input, verifies full plan/run fingerprints, attempt/question/geometry correlation and accounting. Both legacy public execution envelopes reject client-supplied V2 manifests; generated profiles enter execution through the server-owned planning route.

User quotes must be substrings of the original question and remain hypothetical. Model assumptions are `model-proposed`, not `user-authored`. Suggested entities always carry `unverified-model-suggestion`; no generated field can declare itself verified. All generated prose is checked for unsupported quantitative claims and URL citations, including relationship text and names. Unknown fields, bad/duplicate IDs, broken references, disconnected opportunities, malformed versions and oversized content fail closed. Runtime checks remain authoritative after provider JSON Schema generation.

This first implementation supplies an empty verified evidence registry. It does not match model-suggested entities to existing government records, retrieve sources, or ingest cached calculator metrics into planning. Original geometry is supplied as user context; long plots are explicitly shortened in the prompt while the full original remains in the manifest. Existing numerical results remain separately visible under their native provenance. This is a deliberate boundary, not a claim that source verification or quantitative grounding is complete.

## Inference and limits

Shared transport: exact `deepseek/deepseek-v4-flash-0731`, DigitalOcean only, `allow_fallbacks:false`, `require_parameters:true`, `reasoning:{effort:'none',exclude:true}`. The previously verified identity/HTTP/finish/JSON checks are shared, not replaced. Actions retain their strict reference/position/qualitative validation and 800 output-token cap. Planner output is capped at 3,000 tokens and 24 KB JSON, with separate schema/runtime parsing. At the original mocked checkpoint, the new planner request had **not** been paid-live-verified. The separate acceptance record below now confirms real compatibility.

At most one planning completion plus eight action completions; four agents, two rounds, memory limit six. Thirty seconds per model call, 120 seconds for the entire request including body reading/planning/actions; the caller can cancel. Shared inference concurrency protection and bounded attempt retention prevent duplicate work. The original per-action token reservations remain. Planning's reported charge participates in the USD 0.05 soft run threshold; missing charges remain unknown in combined accounting. This threshold is not a prepaid guarantee, and an unknown charge cannot enforce a monetary cap. No automatic regeneration, paid retry or scripted substitution.

The framework body reader accepts an explicit deadline signal and reads the incoming Request structurally. Reconstructing it with a different global Request constructor caused a browser-discovered 400 before inference; a regression now covers framework adapters. Native AAC work starts alongside MRT before yielding to exploration, so cancelling a pending exploration cannot start an AAC calculation afterwards.

## Interface, graph and report

One question and Start remain the main workflow. A combined planning/simulation waiting message does not pretend to measure streamed substage progress. The result shows the generated interpretation, fictional profiles, unverified entities, proposed opportunities, assumptions, unknowns, planning/combined usage and the existing accepted-event timeline/action diagnostics. No manual experiment save or role selection is needed. Planning errors display safe recoverable messages and available usage; later action failures preserve accepted events.

Graph projection reuses the existing renderer and inspectors. Proposed relationships use separately described, synthetic provenance; actual earlier-event references retain the engine's `uses` lineage. User geometry remains user-authored. No proposed edge is a verified causal relationship. Reports read only accepted events and supplied plan/context; local plans get no unrelated global section, while cross-border plans retain relevant affiliations. Generation does not establish any sourced fact, empirical public opinion, healthcare metric or economic forecast. Text guards cannot prove truth or catch every hallucination; model prose remains unverified. The original geographic map/pedestrians and native result panels remain separate systems.

New response snapshots are serialisable, credential-free versioned JSON. Reproduction must retain the **full dynamic response**, including planning accounting; exporting only the embedded legacy-format run does not retain its separate planning usage. Existing lab/import/export formats are not silently rewritten as generated plans.

## Verification

Mocked HTTP end-to-end cases cover workweek, Malaysia water exports, basic income, MRT drawings and a polyclinic site. Each uses one planner response followed by eight separately generated mock action responses through the actual fixed-provider transport, engine, validators and graph/report projection. Other cases cover altered profiles, invented verification/citations/figures, graph-safe IDs, currency validation, plan/input/accounting tampering, provider mismatch, unknown planning cost, the combined soft cap, legacy endpoint isolation, cancellation, geometry edits, timeout, A→B→A and browser/server import boundaries.

Production Playwright on owned port 3151 used fake credentials and an opt-in preload that returns fixtures for inference and rejects other outbound server requests. **These are mocked integration results, not live-provider compatibility evidence.** Workweek, water exports and basic income each displayed eight accepted events, a graph and report. Workweek/basic income: 20 nodes/62 edges; water: 21/62. Categories differ and the water plan includes Singapore/Malaysia. Polyclinic placement through the actual map controls retained a user-authored site at `{lat:1.391,lon:103.895}`, completed eight qualitative events and attached no numerical health/AAC output. Its graph had eight accepted events, seven recorded prior-event references and three proposed role relationships; all three inspector levels opened.

Desktop 1440×900 and mobile 390×844 report/graph checks had no horizontal overflow and one map canvas. Screenshots and safe test summaries are ignored under `tmp/dynamic-scenarios/`. No unexpected page/console errors were observed. Final automated totals and any last acceptance observations are appended below after verification.

The optional GIS loader was attempted with main's Python and failed before loading the suite because `shapely` is absent (`ModuleNotFoundError`). No GIS implementation/data changed. The unused secondary environment was not accessed and no dependency was installed. This is not reported as 19 passing GIS tests.

## Maintained paths

New: `app/api/scenario-simulate/route.ts`; `components/dynamic-scenario-view.tsx`; `lib/dynamic-scenarios/{plan,schema,execution,response,client,projection,fixtures}.ts`; `lib/server/inference/{planner,dynamic-service}.ts`; four `lib/contracts/tests/dynamic-*.test.ts` files and `helpers/dynamic-provider.ts`; `scripts/testing/dynamic-provider-preload.mjs`; this note and `docs/superpowers/plans/2026-10-29-dynamic-scenario-generation.md`.

Modified: `components/{question-console.tsx,question-console.css,use-question-simulation.ts,workspace.tsx}`; `lib/question-simulation/client.ts`; `lib/server/inference/{deepseek,service}.ts`; `lib/server/stakeholder-simulation/service.ts`; `lib/stakeholder-simulation/{contract,identities,inference-contract}.ts`; central roadmap. No MRT/AAC formulas, original ScenarioPlan/citizen/plot contracts, weights, building preparation/licences or raw datasets were modified.

## Rebuild and remaining acceptance

Rebuild the bounded manifest/role adapter first, then reuse the fixed-provider completion transport and action engine. Wire the combined response through the question ownership gate and existing graph/report surfaces. Run `npm.cmd test`, `npx.cmd --no-install tsc --noEmit`, `npm.cmd run build`, `git diff --check` sequentially. For offline browser QA only, start the built app with fake process-local credentials and `--import ./scripts/testing/dynamic-provider-preload.mjs` on a free loopback port. Never load that preload for real inference or interpret its mock usage as actual billing.

At that original checkpoint, separately authorised paid acceptance was still required for planner schema support, response quality, token fit, latency and a complete dynamically generated live-agent run. Historical action-transport acceptance alone did not establish this new route. The separately authorised acceptance below has now completed those live checks. No population-scale swarm, verified entity extraction, web research, scenario-responsive pedestrian movement or validated policy forecasting is implemented here.

## Final verification record

- **644 Node tests passed, zero failed/skipped**, including all 618 baseline tests and 26 new tests. Application TypeScript and explicit strict checks of the new contracts/services/tests passed. Production build and whitespace checks passed.
- All six original CLIs passed sequentially: `mrt:validate`, `mrt:simulate`, `agents:generate`, `agents:impact`, `eldercare:prepare`, `eldercare:simulate`. No building extraction/acquisition ran. GIS remains unavailable in main's Python because Shapely is missing; no GIS pass is claimed.
- Fresh final-build browser checks repeated workweek, water exports and basic income: each HTTP 200, input v2, one planning call plus eight action calls, eight visible events, graph and report. Four viewport widths (1920/1440/1024/390) showed no document overflow and one map canvas. Delayed valid response cancellation and A?B?A browser tests left zero visible stale events. No unexpected console/page errors were observed.
- Safe summaries and inspected screenshots: `tmp/dynamic-scenarios/dynamicFinalBrowser.json`, `dynamicPolyBrowser.json`, `dynamicGraphBrowser.json`, `dynamicRaceBrowser.json`, `final-case-*.png`, `final-mobile.png`, `mobile-graph.png`, `graph-inspector.png`. All are ignored, local QA artifacts.
- Read-only independent review found and verified corrections for deferred AAC launch after cancellation, generated-prose validation gaps, whitespace-prefixed questions, and currency encoding. No secondary worktree or real provider was accessed by the review.
- **Zero paid calls for this phase.** Mock token/cost fields are fixture values, not actual charges. A separately authorised real planner-plus-agents acceptance run is the next verification step.

## Exact path inventory

Modified maintained files:

```text
components/question-console.css
components/question-console.tsx
components/use-question-simulation.ts
components/workspace.tsx
docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md
lib/question-simulation/client.ts
lib/server/inference/deepseek.ts
lib/server/inference/service.ts
lib/server/stakeholder-simulation/service.ts
lib/stakeholder-simulation/contract.ts
lib/stakeholder-simulation/identities.ts
lib/stakeholder-simulation/inference-contract.ts
```

Created maintained files:

```text
app/api/scenario-simulate/route.ts
components/dynamic-scenario-view.tsx
docs/DYNAMIC_SCENARIO_GENERATION.md
docs/superpowers/plans/2026-10-29-dynamic-scenario-generation.md
lib/contracts/tests/dynamic-browser-boundary.test.ts
lib/contracts/tests/dynamic-provider.test.ts
lib/contracts/tests/dynamic-scenarios.test.ts
lib/contracts/tests/dynamic-session.test.ts
lib/contracts/tests/helpers/dynamic-provider.ts
lib/dynamic-scenarios/client.ts
lib/dynamic-scenarios/execution.ts
lib/dynamic-scenarios/fixtures.ts
lib/dynamic-scenarios/plan.ts
lib/dynamic-scenarios/projection.ts
lib/dynamic-scenarios/response.ts
lib/dynamic-scenarios/schema.ts
lib/server/inference/dynamic-service.ts
lib/server/inference/planner.ts
scripts/testing/dynamic-provider-preload.mjs
```

## Separately authorised live acceptance ? 29 October 2026

The historical 644-test/mock-only record above is preserved. New real inference verified the planner and two complete question-first browser runs: four-day workweek (local Singapore) and Malaysia water-export restrictions (cross-border Singapore/Malaysia). Each used one authentic generated plan and eight separate DeepSeek action completions, four generated roles, valid accepted-event references and bounded memory. Gateway metadata verified the exact DeepSeek model and DigitalOcean; reasoning remained disabled. The optional UBI planner also passed after one timed-out attempt.

Live findings led to focused corrections: explicit affected-role/ID/quantitative-gap instructions; a common four-slot agent-reference schema; explicit other-participant event IDs for later actions; a new-generation-only local-scope consistency check; and completed-current-run preservation when browsing archives. Existing saved contracts, validators, deadlines, provider restrictions and 3,000/800 planning/action output caps remain. The scope rule does not rewrite historical plans.

Real graphs contained eight event nodes and 12/16 recorded prior-event uses edges respectively, separate from model-proposed role opportunities. Report and mobile graph inspectors retain fictional/unverified/source-gap labels. All four viewport checks retained one map and no horizontal overflow. The final archive fix was separately browser-tested with explicitly mocked inference on owned port 3153; it restored the exact current event identities after inspecting an older record. That recovery test is not additional paid evidence.

Final verification: **653 Node tests passed, zero failed/skipped**, plus **two isolated no-network spending-guard tests**; application and explicit strict TypeScript, production build, six model CLIs and whitespace checks passed. GIS remains unavailable because main Python cannot import Shapely. No installation or secondary-directory access occurred.

New-task accounting: **49 paid attempts**, reported USD **0.0171181024**, plus USD **0.02** reserved for one unknown interrupted charge; **USD 0.0371181024 / 0.50** conservatively accounted. Historical action-debug ledger and private environment hashes are unchanged. No further paid verification is required for this acceptance. Model content is still unverified and may contain factual/taxonomy mistakes; successful structured execution does not establish policy, legal or economic correctness.

Additional modified paths in this acceptance: `lib/server/inference/planner.ts`, `lib/dynamic-scenarios/schema.ts`, `lib/server/inference/deepseek.ts`, `lib/question-simulation/client.ts`, this note and central roadmap. Added: `lib/contracts/tests/dynamic-live-regressions.test.ts`, `scripts/testing/dynamic-live-debug.mjs`, `scripts/testing/dynamic-live-debug.test.mjs`, `docs/DYNAMIC_SCENARIO_LIVE_ACCEPTANCE.md`. All original 31 pending maintained paths were retained. All changes remain unstaged/uncommitted.
