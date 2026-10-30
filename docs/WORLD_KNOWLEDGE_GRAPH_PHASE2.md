# World Knowledge Graph — Phase 2

Phase 2B follow-up: the ordinary graph now projects world entities and fictional agents only; audit/source/event records remain internal and in inspectors/Report. It adds sourced Census aggregate context, bounded high-DPI rendering and clearer planning diagnostics. The expanded planner deadline is now 45 seconds (action/overall limits remain 30/120 seconds). See [WORLD_KNOWLEDGE_GRAPH_PHASE2B_REFINEMENT.md](WORLD_KNOWLEDGE_GRAPH_PHASE2B_REFINEMENT.md) for the current implementation, 760-test validation and outstanding live-provider acceptance. The original Phase 2 findings below remain a historical record.

Implemented on main `master`, starting from `0b91d5aed2018184d60e686b97ab66decaad6cfb`. Changes are unstaged and uncommitted. The secondary directory was not accessed. No paid OpenRouter or Tavily request was made.

## Research and implementation choice

Inspected the complete relevant script in official MiroFish [`frontend/src/components/GraphPanel.vue`](https://github.com/666ghj/MiroFish/blob/7657031ac01184afe2cb220f5ee3545573b5e843/frontend/src/components/GraphPanel.vue), pinned to revision `7657031ac01184afe2cb220f5ee3545573b5e843`, together with its package manifest, lockfile and [AGPL-3.0 licence](https://github.com/666ghj/MiroFish/blob/7657031ac01184afe2cb220f5ee3545573b5e843/LICENSE). The lockfile resolves D3 7.9.0 and d3-force/d3-drag/d3-zoom 3.0.0; those D3 modules use ISC licences. Research downloads are ignored local files in `tmp/world-kg/research/`, not application assets.

Confirmed upstream: D3 force simulation combines link springs, charge −400, collision radius 50, centre attraction and X/Y attraction strength 0.04. Link distance is 150 plus 50 per additional parallel relationship. Dragging fixes coordinates; movement beyond threshold 3 reheats to alpha target 0.3. Release clears fixation and sets target zero. Tick updates move nodes, paths and labels. Zoom extent is 0.1–4. Single edges are straight, parallel edges quadratic curves, and self-relations loops. Upstream groups multiple self-relations and rebuilds positions when redrawing. These are source observations, not screenshot guesses.

ImpactLens previously ran a finite CoSE layout once. Native dragging moved a node, but no active spring simulation moved its neighbours. Repeated CoSE restarts would interfere with pointer ownership. Replacing Cytoscape would discard working inspectors, search and provenance. The chosen approach retains Cytoscape 3.33.1 for rendering/input and adds **only d3-force 3.0.0**, plus its TypeScript declarations, for physics. It does not import Vue, D3 SVG rendering, or copied MiroFish implementation blocks.

The integration is independently implemented using [D3-force APIs](https://d3js.org/d3-force/simulation) and [Cytoscape APIs](https://js.cytoscape.org/). Existing Cytoscape MIT and D3 ISC package notices remain with the installed dependencies; no AGPL application code is incorporated.

## Interaction and lifecycle

- Initial positions use stable display-coordinate seeds. Springs arrange connected neighbourhoods; repulsion, collision and centre forces contain disconnected nodes. Display coordinates never become map geography.
- Force values match the upstream reference above. Centre is `(0,0)` because Cytoscape supplies the camera transform. Its existing minimum zoom 0.08 is retained, with maximum 4.
- Cytoscape mouse/touch thresholds are three CSS pixels. Grab pins the selected node but does not reheat a settled simulation. Real drag updates the pin and reheats; neighbouring nodes continue receiving force updates. Release removes the pin and cools. A short post-drag tap guard prevents accidental inspector activation without blocking a later click.
- One D3 timer owns motion. It stops at alpha below 0.001, suspends when the graph/document is hidden, releases interrupted drag pins, and is disposed with the core. Headless tests use deterministic synchronous ticks and leave no running timer.
- Reduced-motion mode disables autonomous animation. Native dragging remains available; an explicit Reset Layout computes one static arrangement. Connected-neighbour animation is intentionally suppressed under this preference.
- Large graphs (at least 100 nodes) integrate two force steps per timer callback and publish positions once. Cached Cytoscape node collections avoid repeated ID lookups. This changes settling cadence, not force constants or graph data.
- An eight-entry session cache preserves positions and camera by scenario, execution, node identities and edge topology. Equivalent immutable graph objects retain the active renderer. Changed identities/topology do not borrow another graph's layout.
- Fit Graph frames visible data. Reset View restores zoom 1 and recentres without moving nodes. Reset Layout recomputes positions. Search, type filtering, keyboard entity buttons, neighbour focus and popup → expanded → full-window inspectors remain available.

## Edges and dynamic presentation

Single relationships use straight edges. Unordered endpoint groups with multiple or reverse-direction relationships use Cytoscape Bézier curves; self-relations use loops. Each relationship retains its identity and inspector, including multiple self-relations. This differs deliberately from upstream's grouped self-loop display.

Relationship labels come from records. Users can show/hide them. Dense graphs suppress edge labels below zoom 0.8; graphs with at least 100 visible nodes also suppress ordinary node labels there. Focused/hovered names remain readable. Smaller graphs retain labels down to an eight-pixel font threshold.

The visible legend is generated only from node types actually present, with counts and deterministic type colours. Empty graphs have no invented type list. The old nine technical categories remain internal compatibility fields, not a fixed visible taxonomy. Historical graphs fall back to the types present in their own records.

`KnowledgeNode.entityType` and `KnowledgeEdge.relationshipLabel` are optional bounded presentation fields on the existing graph contract. Provenance remains independent. A type called Ministry does not establish that a node is a verified ministry; a relationship called REGULATES does not establish a verified regulatory relationship.

## Planner contract and compatibility

New generation requests `dynamic_scenario_v2`. Its authoritative runtime contract requires a `WorldOntologyV1` containing:

- Up to 16 entity types and 16 relationship types, each with stable ID, name and description.
- Up to 24 world entities with type/jurisdiction references and optional quoted source support.
- Up to 48 proposed relationships with existing entity/agent endpoints, type references, statement and optional quoted support.

Names are open-ended, plain bounded data. Duplicate identities/types, undeclared endpoints, unsafe markup/URLs, invented verification fields, unsupported numerical claims and invalid support references are rejected. Agent/world identity namespaces cannot collide. Four active roles must use the declared generation slots and form the existing connected interaction structure. Extra world entities do not create additional paid agents.

New immutable plans use explicit **plan version 2**. Archived version-1 plans retain their original schema interpretation and content hashes. Ontology and retrieval snapshots are bound into the new full SHA-256 plan identity. The existing execution input, event/run validators, memories, saved sessions and graph/report projections remain in use.

The richer planner has a bounded **6,000-token / 48,000-byte** output allowance instead of 3,000 tokens / 24,000 bytes. Response validation pairs each plan version with its correct planning cap. Actions remain 800 tokens, four agents, two rounds, eight calls; total model calls remain nine. DigitalOcean-only routing, fallback disabled, explicit no-reasoning configuration, serving-identity verification, per-call deadlines and the overall run limit remain intact. Planning and action charges remain combined; retrieval credits are displayed separately and unknown usage stays unknown. The expanded planner schema/cap has **not** received paid live acceptance in this phase.

## Optional Tavily grounding

The server reads `TAVILY_API_KEY`; no environment file was edited. When configured, one bounded basic search precedes the planner. This is the smallest adaptation of the suggested workflow: the question itself supplies the research query, so no extra model-planning call is needed. There is no search per agent action and no automatic retry loop.

The adapter follows the official [Tavily Search endpoint](https://docs.tavily.com/documentation/api-reference/endpoint/search): fixed HTTPS POST, basic depth, at most five results, no generated answer/raw document/image download, and usage requested. It uses a ten-second deadline, 128 KiB streaming response limit and JSON content-type validation. Query context is capped at 500 characters; the complete question remains in the plan. Candidate URLs are never fetched by the server. Redirects are rejected. Among accepted candidates, institutional domain suffixes (`.gov`, `.gov.xx`, `.edu`, `.edu.xx`, `.ac.xx`, `.int`) receive a stable presentation priority. This is explicitly a heuristic, not verification; other publishers and international sources are retained rather than excluded by a domain allowlist.

Missing credentials produce `not-configured`; retrieval failure produces `failed` with safe limitations; neither fabricates evidence or prevents an otherwise valid unverified scenario. Explicit cancellation returns cancellation before inference starts. Sources are canonicalised/deduplicated, with public HTTPS citation rules rejecting credentials, IP literals and local/metadata host forms. This is not a DNS-resolution or independent website-safety audit.

`GroundingBundle` stores version, content ID, query, status, retrieval date, at most five source records and one 800-character passage each, publication date where available, limitations and nullable credit usage. Source IDs/content IDs are provenance identifiers, not cryptographic execution authority; the complete snapshot is bound by the plan's SHA-256 identity. No full source documents, credentials or private reasoning are exported.

Retrieved text is untrusted JSON data. It is separated from the verified-finding registry and carries explicit prompt-instruction boundaries. Support must reference a supplied source and passage and quote an exact nonempty substring; entity quotations must actually mention that name. A matching quote does **not** establish truth, applicability, semantic entailment, institutional authority or identity resolution. Instruction resistance is tested at the data/prompt boundary; this is not a guarantee that an LLM can never be influenced by hostile text.

## Provenance and reports

The graph distinguishes:

| Record | Meaning |
|---|---|
| User trigger/drawing | Hypothetical user-authored input |
| Ontology/entity/proposed relationship | Unverified model proposal |
| Agent | Fictional role, not an authorised representative |
| Accepted action and event reference | Recorded synthetic execution, not empirical behaviour |
| Retrieved source metadata | Uncorroborated retrieval candidate |
| Literal source excerpt | Source-reported text with an attributed URL; not independently corroborated |
| Quotation edge | Exact provenance linkage; no implied verification or causation |

Model-suggested entity/relationship provenance is never promoted by a model-provided verification flag or a citation alone. Literal passages receive source-backed provenance only as **reported text**. Proposed relationships retain synthetic provenance even when a quote is linked. The inspector exposes the origin, direction, statement, limitations and original URL.

Reports consume the same immutable ontology, grounding snapshot and accepted events. `verifiedFindings` remains empty because this phase supplies no independently verified finding registry. Existing action evidence semantics remain unchanged; retrieved snippets are not silently converted into verified action citations. No healthcare, economic, public-opinion or infrastructure forecast is added. Similarly named organisations are not blindly merged; semantic corroboration and richer entity resolution remain future work.

## Verification and browser evidence

Actual production frontend on task-owned loopback port 3155 used `scripts/testing/dynamic-provider-preload.mjs`. That preload intercepts **all** OpenRouter/Tavily calls and blocks other external server fetches. The browser source explicitly says “Mocked retrieval fixture only”; no screenshot or test represents live retrieval verification.

Three fresh-context Explore flows completed through the actual endpoint, four generated fixture roles and eight separately mocked validated actions:

| Scenario | Graph nodes / edges | Distinct world types |
|---|---|---|
| Four-day workweek | 35 / 105 | Workplace, Employee group, Customer group |
| Malaysia water-export restriction | 36 / 105 | Water operator, Household group, Supply business |
| Proposed polyclinic | 35 / 105 | Proposed clinic, Patient group, Healthcare organisation |

Each graph contains twelve proposed world entities in addition to four active agents. Exact source links, proposed interactions and accepted event references are distinct. The polyclinic report explicitly retains the missing quantitative-health-model limitation. The active run is no longer incorrectly labelled an archived experiment.

Native mouse dragging was sampled over twelve pointer movements. A connected neighbour moved up to **106.61 display units** while the node was held; alpha target remained 0.3. After release the neighbour retained an 81.92-unit displacement and the simulation stopped below alpha 0.001. A separate mobile context with real CDP touch events likewise moved the selected node and its neighbour, then settled with no accidental popup. These are graph display units, not geographic distances. See `tmp/world-kg/drag-trace.json`, `before-drag.png`, `mid-drag.png`, `after-release.png`, and `touch-after.png`.

Verified straight/curved/loop geometry through actual Cytoscape control points and screenshots (88 single, 16 parallel and one self-loop edge in the mock graph). Search, type filters, source popup/expanded/dialog, edge inspector, Escape, Fit Graph, Reset View and Reset Layout were exercised. Map → Report → Graph retained the exact renderer and positions. One MapLibre canvas remained mounted. Screenshots at **1920×1080, 1440×900, 1024×900 and 390×844** show no horizontal overflow; mobile uses normal vertical page scrolling. Final fresh-context flows recorded no page or console errors; their summary is `tmp/world-kg/browser-final.json`. Client chunk inspection found neither server credential variable name.

Final image references: `tmp/world-kg/final-graph-{1920,1440,1024,390}.png`, `final-mixed-edges.png`, `final-settled.png`, `source-inspector.png`, `mobile-inspector.png`. Images were opened for visual inspection. Earlier `before-graph.png` shows the original empty nine-category legend. Artifacts stay ignored/local; no licensed building assets are published.

## Performance measurements and limits

Single local Chromium/automation samples, 1440×900. Synthetic renderer fixtures are **not** simulated citizens or additional LLM agents. Frame intervals cover initial motion and a short native drag; they are not sustained-FPS guarantees.

| Nodes / edges | Construction | Settle | Median / p95 frame interval | Long tasks / max | Neighbour moved during drag |
|---|---:|---:|---:|---:|---:|
| 20 / 19 | 47 ms | 2.86 s | 7.0 / 14.3 ms | 1 / 112 ms | 48.57 units |
| 100 / 99 | 78 ms | 3.47 s | 20.8 / 34.7 ms | 1 / 60 ms | 108.98 units |
| 300 / 299 | 201 ms | 8.49 s | 48.7 / 83.2 ms | 96 / 166 ms | 149.42 units |

Before large-graph batching/cadence changes, the 300-node sample took 15.97 s to settle. The later sample settles sooner but still has substantial rendering work and visibly lower smoothness than small graphs. This is a remaining prototype limitation, not a claimed high-FPS result. Motion stops rather than consuming CPU indefinitely. All nodes/edges remain searchable and inspectable; label suppression does not discard data. See `tmp/world-kg/performance-final.json` and benchmark screenshots.

## Automated checks

- Full `npm.cmd test`: **732 passed, zero failed/skipped**, versus baseline 685. Tests cover ontology/schema/reference rejection, legacy identities, actual mocked planner/action boundary, provenance, quote linkage, URL/body/time limits, cancellation/races, graph markup and real D3 force/lifecycle behaviour.
- Application TypeScript and focused **strict** TypeScript for new graph, ontology, grounding and planner/service modules: passed.
- Production build and `git diff --check`: passed.
- All six existing model CLIs passed. Eldercare preparation initially encountered a sandbox write denial; rerunning the same existing preparation/simulation commands with approved filesystem access passed. No algorithms were changed.
- GIS tests were **not executed**: main Python cannot import Shapely. No dependency was installed and no GIS pass is claimed.
- Independent review reproduced cancellation classification, generated-agent-slot gaps and a collision between dynamic type names and legacy category filtering; all were fixed with failing-first regression tests. The UI now explicitly filters by entity type, while legacy callers retain category filtering. Review also caught an existing graph projection overwriting accepted event-reference provenance; the projection now preserves those records.

Automatic browser review rejected clearing local/session storage because saved user scenarios could be deleted. Acceptance instead used isolated browser contexts without clearing existing user data.

## Changed-file inventory

Modified maintained paths:

```text
components/dynamic-scenario-view.tsx
components/knowledge-workspace.css
components/knowledge-workspace.tsx
components/workspace.tsx
lib/contracts/tests/dynamic-live-regressions.test.ts
lib/contracts/tests/dynamic-provider.test.ts
lib/contracts/tests/dynamic-session.test.ts
lib/contracts/tests/helpers/dynamic-provider.ts
lib/contracts/tests/knowledge-ui.test.ts
lib/contracts/tests/map-first-ui.test.ts
lib/dynamic-scenarios/plan.ts
lib/dynamic-scenarios/projection.ts
lib/dynamic-scenarios/response.ts
lib/dynamic-scenarios/schema.ts
lib/knowledge-graph/contract.ts
lib/knowledge-graph/renderer.ts
lib/knowledge-graph/selectors.ts
lib/server/inference/deepseek.ts
lib/server/inference/dynamic-service.ts
lib/server/inference/planner.ts
lib/stakeholder-simulation/inference-contract.ts
package.json
package-lock.json
scripts/testing/dynamic-provider-preload.mjs
docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md
```

New maintained paths:

```text
lib/contracts/tests/tavily-grounding.test.ts
lib/contracts/tests/world-display.test.ts
lib/contracts/tests/world-graph-ui.test.ts
lib/contracts/tests/world-ontology.test.ts
lib/contracts/tests/world-orchestration.test.ts
lib/contracts/tests/world-physics.test.ts
lib/contracts/tests/world-projection.test.ts
lib/grounding/contract.ts
lib/knowledge-graph/display.ts
lib/knowledge-graph/physics.ts
lib/server/evidence/tavily.ts
lib/world-graph/fixtures.ts
lib/world-graph/ontology.ts
scripts/testing/world-graph-browser-check.mjs
scripts/testing/world-graph-performance.mjs
docs/WORLD_KNOWLEDGE_GRAPH_PHASE2.md
```

Map rendering/building policy, Render Distance, MRT/AAC algorithms, plotting contracts, demographic inputs, source/licence restrictions and private environment files were not edited. Existing preparation hooks refresh ignored web/derived assets; no Overture acquisition or raw-data regeneration was performed.

## Reproduce without paid requests

```powershell
npm.cmd ci
npm.cmd test
npx.cmd --no-install tsc --noEmit
npm.cmd run build
git diff --check
```

After checking that port 3155 is free, start the opt-in mocked production server in a separate terminal. These values are process-local dummy credentials; do not edit `.env.local`:

```powershell
$env:OPENROUTER_API_KEY='mock-browser-only'
$env:TAVILY_API_KEY='mock-browser-only'
$env:STAKEHOLDER_LIVE_ENABLED='true'
$env:NODE_OPTIONS='--import ./scripts/testing/dynamic-provider-preload.mjs'
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3155
```

Run Playwright MCP `browser_run_code_unsafe` with the absolute filename `scripts/testing/world-graph-browser-check.mjs`, then `world-graph-performance.mjs`. The first creates its own fresh browser context and leaves it available for inspection. Do not run the acceptance against a server lacking the mocked preload. Browser scripts are opt-in and are not imported by ordinary tests or the application.

Skills/tools actually used: systematic debugging, brainstorming/implementation planning, frontend/UI guidance, test-driven development, parallel-agent delegation, independent code review and verification-before-completion; PowerShell/Node/TypeScript, official-source web research, Playwright MCP, and local screenshot inspection. No new rendering framework, database, research crawler, paid run or deployment was introduced.
# Subsequent live acceptance

The registered two-stage planner and source-passage selection pathway now has one completed real Tavily + DeepSeek/DigitalOcean acceptance (30 October 2026): four fictional agents, eight accepted actions, world-only graph, provenance inspectors and Report. See [the staged planner acceptance report](PHASE2B_STAGED_PLANNER_LIVE_ACCEPTANCE.md) for precise scope, seven diagnostic iterations, costs, screenshots and semantic limitations. The mocked measurements and earlier live failures documented elsewhere remain historical and are not reclassified.
