# Phase 2B — World graph refinement

Current offline grounding follow-up: [PHASE2B_FLEXIBLE_ENTITY_GROUNDING.md](PHASE2B_FLEXIBLE_ENTITY_GROUNDING.md) separates valid entity acceptance from source attribution. Valid but unmatched quotation associations remain explicit unverified candidates, withheld from evidence displays; strict literal-source integrity remains. New candidate plans bind a fixed policy marker into their identity without rewriting prior hashes. 847 tests/build/TypeScript and mocked end-to-end acceptance pass. Historical live FAIL results remain unchanged; real acceptance is still outstanding. The implementation history below describes the earlier stricter policy.

Main worktree, branch `master`, actual starting HEAD `b80f9c6dc91f2235a52a90a56226c6d28aea7085`. The earlier Phase 2 changes had been committed and pushed before this assignment; the tree was clean. This refinement remains unstaged/uncommitted. No paid inference/retrieval, private environment edit, secondary-directory access or deployment occurred.

## Corrected graph semantics

Reproduced the misleading fallback in the production browser before editing: entering the workweek question and opening Graph without an accepted plan displayed five bookkeeping nodes, including Research horizon. `workspace.tsx` appended experiment-lab context to the current input graph even when live planning had not produced entities. The dynamic projector also mixed world entities with run, assumption, event and source nodes.

`projectPrimaryWorldGraph()` now creates a separate **PrimaryWorldGraphV1** from an identity-verified immutable run. It includes declared ontology entities and fictional participating roles only. Eligibility uses contract fields and registered record types, never English label matching. The original `projectDynamicGraph()` / `projectStakeholderRun()` audit graphs remain unchanged and available internally. Original questions, assumptions, evidence, calculated outputs, event chronology, IDs, source quotations and usage remain in Report and execution records.

Actual accepted interactions become directed agent-to-agent edges, derived from addressed roles and earlier event references. Each edge inspector retains the accepted statements and IDs. Proposed relationships remain separate. Source passages are attached to entity/relationship inspections rather than painted as ordinary nodes. A literal source-reported relationship requires an exact statement quotation naming both world-entity endpoints; fictional-agent relationships never become factual merely through a quote. None of this independently verifies claim truth or causality.

For historical plans without ontology, existing stored model-suggested entities and declared fictional roles can be projected without rewriting the archive. Records with no safely recognised world entities receive an explicit empty state. The primary view no longer falls back to the engineering audit diagram. Native numerical models and their detailed calculation provenance remain in their existing Map/Report paths.

Failed planning now says that world entities are unavailable because planning did not complete. Current question/geometry revisions and projection attempt guards still reject stale results. Valid partially executed plans retain their entities and accepted interactions, labelled Partial or Prepared rather than Completed. Archived runs remain explicitly archived. No entity is fabricated to fill an empty graph.

## Demographic context

The read-only server adapter uses the existing validated Census preparation reader and the local `ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv`. It does not generate a national population or write new demographic data.

- Source: Singapore Department of Statistics, Census **2020**, dataset `d_d95ae740c0f8961a0b10435836660ce0`, recorded update 2021-06-18; source URL, licence and raw SHA-256 are retained.
- Actual grain: subzone × age band × sex leaf cells. Only `Males_<age>` and `Females_<age>` counts are summed into the 19 supported age bands, nationally and optionally by planning area.
- Detailed leaf total **4,047,260**; separately published national total **4,044,210**; discrepancy **3,050** remains visible, without renormalisation. Tests independently check source age bands and planning-area totals (for example Bukit Merah **151,540**).
- A planning area is included only for a unique whole-token area-name match in the question. Geometry is not used to infer residences. Multiple/no matches remain unresolved.
- Context is historical aggregate information, not individual age, income, occupation, ethnicity, household composition, address, behaviour or opinion. Nil/negligible source cells retain their existing zero approximation and limitation.

`ScenarioDemographicContext` is strictly parsed and optionally included in the existing version-2 plan. The full plan SHA binds this snapshot; old version-1/version-2 plans without it retain their original identities. A compact prompt projection is about 1.36 KB with one planning area. The planner can use it cautiously to inform fictional motivations without copying unsupported figures into free prose or assigning personal traits.

Action prompts and inspectors apply `contextForAgent()` only to explicitly Singapore-affiliated roles. Malaysia, other foreign and unresolved affiliations receive no Singapore counts. Four roles do not statistically represent Singapore residents. The Report retains the full aggregate context behind a disclosure; demographic data never creates a graph entity type.

## Visual correction

Confirmed renderer cause: `pixelRatio:1` forced high-DPI canvases to use a single backing pixel per CSS pixel. The renderer now follows the container screen DPR, clamped to **1–2**, with headless ratio 1. Browser measurements showed backing/CSS ratios of **1** at normal DPI and **2** at DPR 2 across all three Cytoscape canvases. This addresses backing resolution, rather than merely enlarging text. No CSS canvas transform was introduced; viewport texture and motion blur are explicitly disabled.

Nodes are consistently **12 units** (14 for legacy scenario hubs), with subtle borders and selection capped at two units. The world view has no scenario hub. Font sizes are 12/13 with moderate weight, captions truncate at 28 Unicode code points, and full names remain in search/inspectors. Dense low-zoom suppression, focused/hovered labels, mixed edge geometry, D3 springs, cooling, caching, reset and fit controls remain intact.

Normal and high-DPI images were opened for inspection. Mock world graphs show seven meaningful entities/roles, rather than 35–36 audit/world records. Node size still scales naturally with deliberate graph zoom.

## Timeout diagnosis and bounded correction

At the starting commit, the exact message “Scenario planning timed out. Retry with a new attempt.” corresponded to `AI_TIMEOUT` from the planner's local **30-second** deadline. That deadline covers fetch, response-body reading, serving-identity checks and local parsing. Tavily's ten-second timeout normally produces a usable failed-retrieval snapshot, not that planning error. HTTP 408/504 previously mapped to `AI_UPSTREAM`; JSON/schema/reference failures are invalid-output categories. The overall 120-second timer incorrectly used the same cancellation path as the user Cancel action.

The original reported failure envelope was not available. Historical safe metadata includes an older 3,000-token planner interrupted around 30.04 seconds and successful old plans close to that limit. It does not establish the provider-specific cause of the expanded ontology failure. No private prompts, provider bodies or credentials were printed, and no paid reproduction was attempted.

Corrections:

1. Planner instructions reduced from **4,834 to 3,737 characters**; prompt retrieval context omits redundant dates, URLs, accounting and repeated question metadata while preserving source/passage IDs and excerpts.
2. Generation targets eight to twelve useful context entities and twelve to eighteen relationships when justified, with fewer allowed rather than padding. Strict maximum bounds and validation are unchanged.
3. The expanded planner alone receives **45 seconds**. Action calls remain capped at **30 seconds**, retrieval at **10 seconds**, and the whole request at **120 seconds**. This gives the richer 6,000-token structured plan a bounded allowance without extending every timeout or the total run. There are no automatic retries.
4. Overall deadline versus explicit cancellation are tracked separately before execution. Failed envelopes may expose bounded `{stage, reason, elapsedMs}` diagnostics. HTTP upstream timeouts, malformed output and local deadlines are distinguishable without response text. Existing responses without diagnostics remain valid.
5. During action execution, deadline cancellation still preserves accepted turns through the existing cancelled-run envelope. No execution-history semantics were weakened.

The browser's mocked never-completing planner produced the real error path after **45,014 ms**, classified `planning / deadline`. No technical graph or old result appeared under that question. Two earlier completed histories remained selectable; a fresh Explore retry subsequently completed. This proves bounded recovery and diagnostics, **not** that live DeepSeek latency is resolved. DigitalOcean-only routing, model identity, no reasoning, no fallback, four agents/two rounds/eight actions, cost accounting and strict output validation remain.

## Source support and provenance

Tavily remains one bounded optional search per scenario, with existing HTTPS URL rules, deduplication, deadlines, body limits and untrusted-text boundaries. Inspectors expose source title, original URL, publisher/domain, publication date or Unknown, retrieval timestamp, literal quote and limitations. Model-suggested identities remain unverified; endpoint existence never verifies a relationship. Independent corroboration and entity resolution remain future work.

The development preload has an opt-in `IMPACTLENS_PHASE2B_MOCK=true` fixture mode. It supplies named institutional suggestions for workweek/water examples and explicitly labelled mock passages. These are test inputs, not a production preset router or evidence that those institutions published the fixture wording. Production entity types and choices still come from DeepSeek. No live Tavily/expanded-planner compatibility is claimed.

## Verification

- **760 Node tests passed**, zero failures/skips, versus 732 baseline; application TypeScript, strict affected-module checks, production build and whitespace checks pass.
- All six model CLIs pass. The eldercare preparation write initially hit the sandbox restriction; rerunning the same existing commands with approved access to the derived catalogue passed. No simulation formula or raw input changed.
- GIS was not run: main Python still lacks Shapely. No dependency installation or GIS pass is claimed.
- Real production frontend with network-blocked upstream mocks: workweek and Malaysia scenarios each produced four roles/eight accepted actions; primary graph had **7 nodes / 15 edges**, including three suggested context entities. The full audit graph remains separately available.
- Inspectors checked Singapore Census counts/source vintage, foreign absence of those counts, exact source passages, relationship direction, chronological events and all three inspector sizes. Reports retained eight actual accepted events and no artificial Research horizon presentation. An explicit user date (2040) survives contract tests.
- Screenshots at **1920×1080, 1440×900, 1024×900, 390×844** show no horizontal overflow. Normal/high-DPI backing ratios were measured. Mouse drag, connected-neighbour reaction and settling were exercised in renderer benchmarks. A fresh touch-enabled mobile context on the final build used native Chromium touch events: the connected neighbour moved **87.59 graph units**, the held simulation reheated to alpha target **0.3**, and release settled below **0.001** with target zero and no running loop. The mobile full-window inspector displayed Census context without horizontal overflow. That fresh session recorded zero page/console errors and one MapLibre canvas.
- One longer automated browser pass stalled after completing both scenario screenshots. Its task-owned context was closed; fresh isolated checks completed reports, repeated question changes, Graph navigation, timeout/history/retry and all four viewports. No application root cause was established for that harness stall; it is not silently counted as a passing script run.

Single local DPR-1 Chromium stress samples (not sustained FPS claims):

| Nodes / edges | Construction | Settle | Median / p95 frame interval | Long tasks / maximum | Dragged neighbour displacement |
|---|---:|---:|---:|---:|---:|
| 20 / 19 | 47 ms | 3.62 s | 7.1 / 20.9 ms | 1 / 68 ms | 48.93 graph units |
| 100 / 99 | 59 ms | 2.59 s | 14.2 / 26.5 ms | 0 | 109.87 graph units |
| 300 / 299 | 139 ms | 6.99 s | 41.8 / 55.6 ms | 29 / 103 ms | 149.42 graph units |

These artificial fixtures are not extra simulated agents. Large graphs remain less smooth; bounded cooling stops idle work. Inspect `tmp/world-kg/phase2b-performance.json` and `phase2b-benchmark-{20,100,300}.png`.

Other local screenshot evidence: `phase2b-before-fallback.png`, `phase2b-workweek.png`, `phase2b-water.png`, `phase2b-singapore-inspector.png`, `phase2b-foreign-inspector.png`, `phase2b-dpr{1,2}.png`, `phase2b-{1920,1440,1024,390}.png`, `phase2b-timeout-empty.png`, `phase2b-touch.png` and `phase2b-mobile-inspector.png`, under `tmp/world-kg/`. These ignored artifacts are not published licensed datasets.

## Files and reproduction

Modified: `components/{dynamic-scenario-view.tsx,knowledge-workspace.tsx,knowledge-workspace.css,map-scenario-panel.tsx,workspace.tsx}`; `lib/contracts/tests/{knowledge-ui.test.ts,world-graph-ui.test.ts}`; `lib/dynamic-scenarios/{plan.ts,projection.ts,response.ts}`; `lib/knowledge-graph/renderer.ts`; `lib/server/inference/{deepseek.ts,dynamic-service.ts,planner.ts}`; `scripts/testing/dynamic-provider-preload.mjs`; this phase's documentation, Phase 2 implementation note and roadmap.

New: `lib/world-graph/projection.ts`; `lib/demographics/scenario-context.ts`; `lib/server/demographics/scenario-context.ts`; `lib/contracts/tests/{newworld-visual.test.ts,planning-timeout.test.ts,scenario-demographics.test.ts,world-inspector.test.ts,world-primary.test.ts}`; `scripts/testing/world-graph-phase2b-{check,performance}.mjs`; this report.

Run `npm.cmd test`, `npx.cmd --no-install tsc --noEmit`, `npm.cmd run build`, `git diff --check` sequentially. For mocked browser checks, use the Phase 2 reproduction commands with process-local dummy keys, the network-blocked preload, and additionally `$env:IMPACTLENS_PHASE2B_MOCK='true'`. Start a separately owned loopback port3155; never use an unmocked server for these checks. The timeout fixture question is `What if planning takes too long?` and intentionally consumes the bounded planner deadline without a network call.

Known limits: real joint Tavily/expanded-DeepSeek acceptance remains outstanding and needs separate paid authorisation; four fictional roles are not a demographic sample; aggregate age context is not personal grounding; retrieved excerpts are not independent verification; population-scale simulation belongs to Phase 3. Building/map data, licensing controls, MRT/AAC formulas, plotted geometry, dependencies, credentials and the secondary directory were preserved. Delegation stopped at the user's instruction; remaining integration, review and acceptance were performed directly.
