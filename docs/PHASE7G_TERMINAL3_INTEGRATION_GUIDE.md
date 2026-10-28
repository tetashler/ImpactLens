# Phase 7G — Terminal 3 integration guide

## Current scope

Terminal 2 implements Phase 7G on `feature/synthetic-population` from `3b6e8c0f0c7457197aa26d87021b94704f3409d0`. The feature is **validated in the actual application tab and ready for coordinated integration**. Node/GIS tests, CLI/type/build checks, development/production browser flows and final Git audit passed. This guide records the exact adapter/UI boundary and maintained-file handoff. No staging, commit, branch integration or publication is authorised by this handoff.

The graph belongs to the existing **General | Knowledge Graph** navigation. It must display actual current application state, preserve the single MapLibre instance and avoid rerunning MRT/AAC calculations on navigation. It is a structured relationship explorer, not GraphRAG or Phase 7D execution.

## Data handoff

Import `buildKnowledgeGraph`, `knowledgeIdentity`, `GraphContext` and `BoundGraphResult<T>` from `lib/knowledge-graph/adapters.ts`; import `KnowledgeGraph` and `parseKnowledgeGraph` from `lib/knowledge-graph/contract.ts`. These are browser-safe modules. The adapter is synchronous and read-only; it does not request a provider, calculation or source download.

Supply the graph adapter only current validated data:

- Current question and validated `ScenarioPlan` from the existing planner client.
- Current `ScenarioGeometry`, its monotonic revision/key and explicit confirmed station connections.
- Current MRT `EditorDraft`, catalogue and execution permission from `acceptsMrtBinding`; actual current `SimulationResponse` when calculated.
- Current validated `FacilitiesResponse` and `EldercareApiResponse`, already matched to the current AAC draft/plot binding.
- An actual current population-impact payload only when already available and bound. Do not use the independent illustrative citizen fixture as current scenario results.

Question edits, geometry edits, unconfirmed/changed anchors, assumption changes, reset and delayed responses must retain the existing invalidation semantics. No graph-only selection or inspector action may edit those inputs.

The adapter input is:

```ts
interface GraphContext {
  question: string;
  plan: ScenarioPlan | null;
  geometry: ScenarioGeometry;
  catalog: NetworkCatalog | null;
  scenarioIdentity: string;
  anchors?: Record<string, string>;
  draft?: EditorDraft | null;
  mrt?: BoundGraphResult<SimulationResponse> | null;
  aac?: BoundGraphResult<EldercareApiResponse> | null;
  facilities?: FacilitiesResponse | null;
  demographic?: BoundGraphResult<CitizenSimulationPayload> | null;
}
interface BoundGraphResult<T> {
  scenarioIdentity: string;
  executionIdentity: string;
  result: T;
}
```

This is an interface excerpt; use the exported types rather than copying a parallel contract. Bind result identity when the existing request gate accepts a current response. Do not attach the latest scenario identity to arbitrary retained results at render time. `knowledgeIdentity` preserves canonical full content for exact local equality; shortened node keys are display identifiers, not execution authority. The adapter excludes a plan with a different question and ignores result wrappers with a mismatched scenario identity or capability.

Before execution, the current General integration supplies drawn features, explicit anchors and the registered plan assumptions/requirements. `GeneralPlotPanel` does not export its unsubmitted local timing/order acknowledgement state. Full confirmed engine-draft order/timing nodes become available at plotted submission or a current advanced binding. Preserve that honest preview boundary; a richer unsent-configuration preview would need a new explicit read-only validated handoff, not guessed assumptions.

## Minimal workspace integration

Keep `components/knowledge-workspace.tsx` focused on graph presentation. Its props are `{graph: KnowledgeGraph | null, visible: boolean, onReturn: () => void}`. Pass a memoized current graph from `components/workspace.tsx`. Keep this component mounted but hidden between tabs to preserve layout, camera, search/filter and reasonable selection. Visibility is separate so the renderer can resize on reveal and avoid hidden work. A changed graph is a content replacement; opening a popup alone must leave its object/renderer stable.

`components/impact-panel.tsx` has one narrow optional `onResult(result: ImpactResponse | null)` prop. It exposes the existing current validated report or clears it on invalidation. The workspace callback wraps the existing payload for graph projection; it must not recalculate metrics or replace the panel's request/revision gate. This is a potential shared-file conflict alongside `workspace.tsx`; preserve Terminal 1's citizen changes and reconcile only this callback/graph wiring.

Preserve the existing map mount and `visible` behaviour. Do not copy an entire older `workspace.tsx` over Terminal 1's Phase 7F version. Reconcile the small graph import/context/prop/render block manually. Terminal 1 owns Three.js citizens and movement; no graph patch should modify that code or establish a second map/animation loop.

Cytoscape.js **3.33.1** is the selected focused MIT renderer dependency. Merge only the actual dependency and lockfile changes after review. `lib/knowledge-graph/renderer.ts` owns the disposable renderer and exports `GraphRenderer`, `createGraphCore`, `graphElements`, category colours and selection/snapshot types. Its API covers selection, focus, filters, fit, zoom, resize, a diagnostic snapshot and disposal. React owns inspector/search/filter state; the graph library owns Canvas interaction and positions. No server loader, private provider or raw-data import belongs in their browser dependency tree.

## Maintained file inventory

The final maintained implementation has **12 new files and six modified tracked files**:

| New files | Purpose |
| --- | --- |
| `lib/knowledge-graph/contract.ts` | Versioned bounded graph validation and types |
| `lib/knowledge-graph/adapters.ts` | Deterministic MRT/AAC/planning projection and exact local identity |
| `lib/knowledge-graph/selectors.ts` | Search, category filtering, relationship/neighbour queries |
| `lib/knowledge-graph/palette.ts` | Shared category colours for renderer and UI legend |
| `lib/knowledge-graph/renderer.ts` | Cytoscape layout, selection/filter/camera and disposal |
| `components/knowledge-workspace.css` | Graph-specific desktop/mobile layout and inspectors |
| `lib/contracts/tests/knowledge-graph.test.ts` | Contract, adapters, provenance, unsupported/stale inputs |
| `lib/contracts/tests/knowledge-renderer.test.ts` | Headless real renderer/layout/filter/cleanup checks |
| `lib/contracts/tests/knowledge-ui.test.ts` | React markup, text escaping and UI integration checks |
| `scripts/testing/phase7g-browser-check.mjs` | Opt-in real-application browser diagnostics |
| `docs/PHASE7G_INTERACTIVE_KNOWLEDGE_GRAPH_IMPLEMENTATION.md`, this guide | Evidence, interfaces and rebuild handoff |

| Modified files | Focused change / conflict to reconcile |
| --- | --- |
| `components/knowledge-workspace.tsx` | Replace placeholder with graph Canvas, controls and three inspector levels |
| `components/workspace.tsx` | Capture accepted graph response bindings, memoized adapter context, mounted graph/visibility props and demographic callback |
| `components/impact-panel.tsx` | Optional current-result callback; existing calculations/gates stay in place |
| `package.json`, `package-lock.json` | Pin/install the single `cytoscape` dependency |
| `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md` | Narrow local Phase 7G status and documentation links |

No `singapore-map.tsx`, citizen renderer, shared stylesheet, API route, model formula or raw input is a maintained change in this scope. The build restored the automatic dev-server `next-env.d.ts` types-path change; that generated file has no final diff. Browser screenshots, source responses and performance diagnostics stay in ignored `test-results/phase7g/` or `tmp/phase7g/`; they will not arrive through Git transfer.

## Acceptance after integration

1. Build a real MRT proposal in General with explicit catalogue anchors/order and acknowledged times. Open Graph before calculation; inspect inputs and confirm no result nodes. Calculate normally, then inspect the actual result and linked assumptions.
2. Build a real AAC proposal and calculate. Inspect the proposed facility, corroborated historical subset, landmark proxies, comparable population and unknown/unlocated population. Preserve catalogue/date/eligibility/capacity limits.
3. Test polyclinic and ASEAN questions. They must remain planning-only without invented forecasts, evidence or stakeholder interactions.
4. Select a graph node, expand the popup, open full-window details, close/back/Escape, follow a relationship and confirm graph camera/layout/selection remain stable. Verify keyboard access and focus restoration.
5. Pan/zoom/fit/reset/search/filter; inspect relationship provenance. Edit question/geometry, undo/redo/reset, rerun and delay old responses. Obsolete calculated content must not return.
6. Check 1920×1080, 1440×900, 1024×900 and 390×844 for overflow, legend/tool collision, popup bounds and independently scrolling details. Test reduced motion and visible focus.
7. Run all six model CLIs, Node tests, application and explicit strict TypeScript, production build and `git diff --check` sequentially. Do not claim Terminal 1's concurrent Phase 7F is tested by Terminal 2's checkout.

Renderer cleanup must stop pending layout work, release listeners/Canvas resources and destroy only its own graph instance. Do not destroy the map on graph navigation. Normal node inspectors must not reconstruct graph layout; fullscreen close must restore the previous inspector and focus.

## Provenance and publication

Every displayed node/edge must distinguish user-authored inputs, source-backed entities, model assumptions, calculated values and planning-only concepts. Source URLs are validated links, not automatically fetched evidence. Rich strings are React text, not HTML. The future synthetic exploratory category is reserved for a validated Phase 7D adapter.

Buildings remain internal local review only. Do not publish ignored building assets, remove loopback protections, infer homes from buildings or transfer source geometry into tracked graph fixtures. Environment files, government inputs, Census weights and transport/eldercare formulas remain outside this phase's changes.

The [implementation report](PHASE7G_INTERACTIVE_KNOWLEDGE_GRAPH_IMPLEMENTATION.md) records the measured browser/performance evidence and rebuild sequence. Final current-code regression results are **371 Node tests / 19 GIS tests passed**, all six existing model CLIs, application/strict TypeScript and a successful production build. Development/production browser checks and final Git audit passed. The staged diff remains empty and `.env.local` is ignored/untracked, unopened and unchanged.

## Recorded browser acceptance

Terminal 2's real General flow produced a source-aware MRT graph before calculation (211 nodes / 642 edges, zero result nodes), then a bound journey graph (219 / 657) and an actual weighted-demographic graph (250 / 688, 2,000 representatives / 192,150 represented / 29 groups). AAC produced 64 / 66 after the final assumption/calculation provenance split. Polyclinic and ASEAN plans had zero result-category nodes. These examples are calculated/projected from actual current local inputs, not hardcoded graph fixtures.

Canvas picking, all three inspector sizes, native dialog Escape/focus restoration, relationship inspection, pan/zoom, filtering/reset and mobile details were exercised. Ten General/Graph switches preserved the exact renderer snapshot. Delayed real planner/MRT replies after edits could not restore results; AAC point edits invalidated outputs; undo/redo and reset were checked. Reset left zero graph canvases and one MapLibre instance. The final fresh flow had no page/console errors and no horizontal overflow at 1920×1080, 1440×900, 1024×900 or 390×844.

The explicit synthetic 500-node / 499-edge performance-only fixture took 4,020.2 ms to arrange in one browser trial and was disposed. Cytoscape's three Canvas layers belong to one instance; do not treat layer counts alone as renderer leaks. No sustained memory/FPS or thousands-of-nodes claim is made. All exact observations and ignored screenshot/JSON paths are in the implementation report. Terminal 1's Phase 7F still requires combined acceptance after integration.

The production build's real MRT planning context returned HTTP 200 and displayed 207 nodes / 636 edges. Actual wheel zoom, identifier search, full source-coordinate display, safe hostile text and a scrolling bounded popup passed. All-category filtering reached zero; Reset restored/fitted the graph; following a hidden related source restored its category and focused it. See `tmp/phase7g/production-{browser,filter}.json`. Both owned server processes were stopped and port 3127 was checked free. No paid AI call, Git mutation or Phase 7F validation occurred.
