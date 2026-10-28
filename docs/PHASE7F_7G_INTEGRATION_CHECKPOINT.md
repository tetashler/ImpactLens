# Phase 7F / 7G integration checkpoint

**Subsequent checkpoint authorisation:** The user approved one local commit of the exact 41-path scope and backup-verified reconciliation of Terminal 2's 18 original paths before a fast-forward-only update. Earlier no-Git/unstaged statements below describe the original integration review. The release check repeats the regression commands and records external recovery hashes; its final commit, backup location and branch status are reported in the completion response. Release review also corrected an obsolete roadmap graph-placeholder sentence and restored graph report links, without changing product code or expanding the path scope. Public deployment, push and new Phase 7D/7E features remain outside this checkpoint. Retrieve the checkpoint hash with `git log -1 --format=%H -- docs/PHASE7F_7G_INTEGRATION_CHECKPOINT.md`.

Terminal 3, 28 October 2026 (Singapore). **Phase 7F and 7G are integrated and validated for internal local review.** Combined tests, types, build, GIS, actual browser acceptance, fresh-page inspection and final preservation/security audits passed within the boundaries below. Filesystem integration only was authorised; no Git mutation, publication or deployment occurred. Historical results in the [7F report](PHASE7F_CITIZEN_VISUALS_MOVEMENT_IMPLEMENTATION.md), [7G report](PHASE7G_INTERACTIVE_KNOWLEDGE_GRAPH_IMPLEMENTATION.md) and [7G handoff](PHASE7G_TERMINAL3_INTEGRATION_GUIDE.md) remain isolated-worktree evidence unless explicitly rechecked below.

## 1. Initial Git and worktree state

| Worktree | Branch | Initial HEAD | Initial pending maintained paths |
| --- | --- | --- | ---: |
| `ImpactLens` (main / Terminal 1) | `master` | `3b6e8c0f0c7457197aa26d87021b94704f3409d0` | 23 |
| `ImpactLens-agents` (source / Terminal 2) | `feature/synthetic-population` | same | 18: 12 new, 6 tracked modifications |

Both implementations were uncommitted. Matching HEADs do not contain their pending work. The external `%TEMP%/impactlens-7f7g-state.json` records the initial path inventories, file digests and private environment-file digest without environment values. Main's 23 original pending files and four additional original tracked files were backup-verified under `%TEMP%/impactlens-7f7g-main-backup-wGteTp` before integration. Final audit confirms both HEADs still equal `3b6e8c0f0c7457197aa26d87021b94704f3409d0`, both indexes are empty and neither worktree has an unfinished Git operation. Main has 41 maintained pending paths. Terminal 2 retains all 18 original pending paths with unchanged hashes and remains unsynchronised.

## 2. Exact initial Phase 7F inventory retained

These 23 original main paths are preserved as the base of integration. Final comparison confirms **21 retain their original bytes**; only workspace and roadmap are intentionally reconciled. Citizen changes were not replaced with older source-worktree files.

```text
components/citizens-panel.tsx
components/citizens.css
components/singapore-map.tsx
components/workspace.tsx
docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md
docs/PHASE7F_CITIZEN_VISUALS_MOVEMENT_IMPLEMENTATION.md
docs/superpowers/plans/2026-10-28-living-pedestrians.md
lib/citizens/fixtures.ts
lib/citizens/layer.ts
lib/citizens/path-overlay.ts
lib/citizens/pedestrians.ts
lib/citizens/playback.ts
lib/citizens/scene.ts
lib/contracts/tests/citizen-clock.test.ts
lib/contracts/tests/citizen-controls.test.ts
lib/contracts/tests/citizen-layer.test.ts
lib/contracts/tests/citizen-path-overlay.test.ts
lib/contracts/tests/citizen-pedestrian-geography.test.ts
lib/contracts/tests/citizen-pedestrians.test.ts
lib/contracts/tests/citizen-pose.test.ts
lib/contracts/tests/citizen-scene.test.ts
lib/contracts/tests/citizen-visualisation.test.ts
scripts/testing/phase7f-browser-check.mjs
```

## 3. Exact initial Phase 7G inventory

Terminal 2's complete 18-path source inventory is:

```text
components/impact-panel.tsx
components/knowledge-workspace.css
components/knowledge-workspace.tsx
components/workspace.tsx
docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md
docs/PHASE7G_INTERACTIVE_KNOWLEDGE_GRAPH_IMPLEMENTATION.md
docs/PHASE7G_TERMINAL3_INTEGRATION_GUIDE.md
lib/contracts/tests/knowledge-graph.test.ts
lib/contracts/tests/knowledge-renderer.test.ts
lib/contracts/tests/knowledge-ui.test.ts
lib/knowledge-graph/adapters.ts
lib/knowledge-graph/contract.ts
lib/knowledge-graph/palette.ts
lib/knowledge-graph/renderer.ts
lib/knowledge-graph/selectors.ts
package-lock.json
package.json
scripts/testing/phase7g-browser-check.mjs
```

The six tracked modifications are `components/impact-panel.tsx`, `components/knowledge-workspace.tsx`, `components/workspace.tsx`, the central roadmap, `package.json` and `package-lock.json`. All remaining paths in this list are new maintained files. Source screenshots, derived assets, caches and environment files are outside this transfer.

## 4. Exact filesystem transfer

The following 12 new maintained files were copied from source into main and checked against their source digests before subsequent integration edits:

```text
components/knowledge-workspace.css
docs/PHASE7G_INTERACTIVE_KNOWLEDGE_GRAPH_IMPLEMENTATION.md
docs/PHASE7G_TERMINAL3_INTEGRATION_GUIDE.md
lib/contracts/tests/knowledge-graph.test.ts
lib/contracts/tests/knowledge-renderer.test.ts
lib/contracts/tests/knowledge-ui.test.ts
lib/knowledge-graph/adapters.ts
lib/knowledge-graph/contract.ts
lib/knowledge-graph/palette.ts
lib/knowledge-graph/renderer.ts
lib/knowledge-graph/selectors.ts
scripts/testing/phase7g-browser-check.mjs
```

Four tracked files with no initial main overlap were also copied and their hashes reviewed: `components/impact-panel.tsx`, `components/knowledge-workspace.tsx`, `package.json` and `package-lock.json`. Workspace graph changes were applied as focused hunks. No source-worktree file was edited. No building geometry, raw dataset, private environment file, Python environment, browser evidence tree or generated asset was transferred. The integration-only maintained additions are this report and `scripts/testing/phase7f7g-browser-check.mjs`.

## 5. Reconciled shared files

`components/workspace.tsx` receives the small graph import, current-state context, accepted-result wiring and persistent graph-view props on top of main's Phase 7F version. It is not replaced wholesale. `components/knowledge-workspace.tsx` and `components/impact-panel.tsx` receive the source graph UI/current-result callback changes because they did not overlap the initial main inventory. Main-only identity/lifecycle corrections are recorded in section 18; Phase 7F citizen/map changes are preserved.

The central roadmap retains main's Phase 7F version and incorporates only the source's Phase 7G section, with the introduction, current status and handoff updated for this checkpoint. Phase 7D/7E remain pending. `components/singapore-map.tsx` and the citizen modules retain main's implementation; graph navigation introduces no second map or pedestrian renderer.

## 6. Dependency and lockfile

The sole dependency addition is the exact `cytoscape` **3.33.1** pin and its lockfile entry. Existing dependencies/scripts are preserved. `npm.cmd install --ignore-scripts --no-audit --no-fund` installed only Cytoscape 3.33.1 in main, with lifecycle scripts disabled. The copied package/lock hashes were reviewed. No graph database, embedding service, hosted graph service, new AI provider or Python dependency is introduced.

## 7. Citizen, map and graph ownership

Phase 7F retains one MapLibre map and one shared Three.js custom-layer owner with a single pause-aware `PlaybackClock`. Graph navigation must hide/pause citizen rendering and preserve the map, current camera and citizen selection; return must reconcile existing options without adding actors, RAF loops or listeners. Style/resource replacement remains owned by the citizen layer. Illustrative actor loops do not depend on MRT/AAC outputs and infrastructure edits do not reroute them.

The Knowledge Graph remains mounted between General/Graph tabs. React owns search, filters, selection and inspector size; one disposable Cytoscape instance owns graph positions, Canvas interaction and camera. Four General/Graph round trips retained an identical graph snapshot. While Graph hid citizens their rendered matrices froze; return resumed movement with one scene and one map canvas. Reset removed graph canvases and retained one map.

Buildings off reached hidden and on reached ready. Manual street-off preference survived a Graph round trip. Scoped removal of the owned Singapore building source/extrusion and miniature-citizen layer, followed by `style.load`, restored all three with one map. This is scoped resource recovery, not an arbitrary whole-map-style replacement claim. The latest category ref now applies filter choices made while the renderer module is loading.

## 8. Scenario identity and result binding

`buildKnowledgeGraph` is a browser-safe, synchronous, read-only projection of validated current application state. `knowledgeIdentity` uses canonical full content for local equality; shortened node identifiers grant no execution authority. Each calculated payload needs a `BoundGraphResult<T>` containing the scenario identity and execution identity captured when its current request is accepted. MRT catalogue, confirmed geometry/anchors, accepted draft and actual calculation results remain distinct inputs.

The demographic panel captures optional `resultContext` before sending the request and retains it in accepted loaded state. Its callback supplies that original context as the second argument, including re-emission after navigation; it never attaches the latest identity to an old response. MRT reruns clear `graphMrt` immediately. The browser regression initially reproduced two obsolete result nodes during a pending rerun; after correction the pending state and a controlled HTTP 500 failure both retained zero result nodes.

Delayed planner replies after a question edit restored neither old plan nor results. Delayed MRT and demographic replies after an edit left zero result nodes and no calculated-population output. AAC point movement cleared results; a delayed old AAC response after another edit could not restore them. Undo/Redo worked, and a fresh latitude-1.289 rerun produced the new identity `eldercare-a4d7784dc0599bcdf1aab4e8` with five result nodes. Polyclinic and ASEAN stayed planning-only; fixture citizens never entered calculated population outcomes.

## 9. Fresh Node, CLI, TypeScript and build validation

All preparation hooks run sequentially on Windows. Prior 7F's 368 tests and source 7G's 371 tests are historical, overlapping suites; they must not be added together or substituted for the combined run.

| Current main check | Result |
| --- | --- |
| Six model CLIs | All six exited 0 |
| `npm.cmd test` | **396 passed, 0 failed, 0 skipped; 32.129 s** |
| Application `npx.cmd --no-install tsc --noEmit` | Passed, exit 0 |
| Explicit strict citizen/graph module and test TypeScript | Passed, exit 0 |
| `npm.cmd run build` | Passed; 3.5 s compile, 14 static pages / 11 API routes |
| `git diff --check` and new-file whitespace/encoding | Passed, exit 0; LF/CRLF notices were informational |

The root integrator ran these checks sequentially against the integrated main checkout after the corrections in section 18. Reproduce the model/application checks from main:

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

The explicit strict check covers citizen/graph modules and their tests:

```powershell
$entries = @(Get-ChildItem lib/citizens,lib/knowledge-graph -File -Filter '*.ts' | ForEach-Object FullName) +
  @(Get-ChildItem lib/contracts/tests -File | Where-Object { $_.Name -match '^(citizen-|knowledge-)' } | ForEach-Object FullName)
npx.cmd --no-install tsc --ignoreConfig --noEmit --strict --skipLibCheck --types node --target ES2022 --module nodenext --moduleResolution nodenext --allowImportingTsExtensions @entries
```

No product code changed after the final 396-test suite/build; later work was documentation, the browser helper and ignored acceptance artifacts.

## 10. GIS and preserved inputs

The existing offline GIS suite passed **19 tests, zero failures** in this integration. No Overture extraction, source acquisition or whole-building preparation was repeated. The integrated Node run also passed without skipped tests using the existing local-review assets. All 14 captured raw-input hashes per worktree remain unchanged. The earlier approved checkpoint's preservation verifier also passed for every captured ignored asset: **2,248 main files / 3,583 source files**, covering its raw, derived, preview and receipt sets. The unified manifest retains SHA-256 `5ab917ca747b51527868499c58ac6ecc21c82dd8897d3243ed9ff52ef0bfc32b`. Both private environment files retain their initial digest and remain ignored, untracked and unstaged.

The existing source-worktree Python environment was reused without installing or copying it. Run from main, sequentially with the other checks:

```powershell
& '../ImpactLens-agents/tmp/phase7c1/venv/Scripts/python.exe' -B -m unittest discover -s scripts/tests -p test_building_conflation.py
```

## 11. Actual combined browser acceptance

The root integrator exercised the actual integrated application with real local planning/calculation responses. Confirmed MRT produced **62.77 → 13.50 modelled minutes**; preview, journey and demographic graph counts appear below. Actual Canvas node picking opened the compact inspector; expand/full-window/Escape restored focus. Relationship inspection worked; actual mouse background dragging changed pan and wheel input changed zoom. AAC infrastructure filtering left 59 of 64 nodes visible; Reset restored 64. Four tab round trips preserved the exact graph snapshot. Invalidation, delayed replies, rerun failure, Undo/Redo and new-scenario reset are recorded in sections 7–8.

The real AAC point at **1.287, 103.824** returned **44,520 targeted / 6,230 comparable / 38,290 unlocated / 3,890 closer**, with displayed mean distance **410.4 → 347.5 m**. Its unlocated-population inspector showed calculated provenance and 38,290 / 44,520, preserving the unknown-origin boundary.

Reduced-motion Play retained clock zero and static actors. An isolated forced-null-WebGL page offered the SVG fallback and successfully added one point with zero WebGL canvases. Aborted street-tile requests left local buildings ready; a warning was not retained at capture, so no warning-state acceptance is claimed.

Fresh isolated normal production pages at 1440 px and 390 px had **zero console/page errors**, one map and positive rendered building features. The source dialog had eight readable links. Explore retained the same fresh map owner, fitted Singapore to zoom 10.7089 and kept streets visible. A fresh input-only graph had **207 nodes / 636 edges**; all four tested widths had no horizontal overflow. The owned acceptance server used loopback port 3127; the pre-existing port-3000 server, PID 5264, was untouched. No paid AI request occurred.

## 12. Actual pedestrian displacement

Actual rendered pedestrian-root translation advanced **4.76585 m over five seconds** of Play in the integrated application. Pause preserved all 18 part matrices exactly and Reset restored every part exactly, with one map canvas. All five visual-area focus controls reached rendered actors; the selected schematic path contained one feature. Paused map pan/zoom kept the root geographically anchored. In an actual 390 px touch context, an actor moved **2.2339 m over 2.2 seconds**, with 36 local actors, 19 draw calls, one map canvas and no horizontal overflow. Actual mouse picking of the projected head in instance slot 1 selected actor ID 10 with the building layer enabled. Actor-profile content remained distinct from calculated population results. Raw acceptance tool results are retained in the ignored artifact listed in section 14.

The preserved 7F implementation defines 180 illustrative actors, 36 in each of five authored visual areas, with 0.95–1.55 m/s visual speeds and ten closed loops. Its nominal 1.75 m rig uses a 1.6 display multiplier with stable ID variation. These are visual assumptions, not measured resident travel, national demographic density or verified pavement routes. Imported version-1 payloads retain their supplied path semantics and null positions remain unknown.

## 13. Graph nodes, relationships and provenance

| Actual current graph | Nodes / edges | Result-category nodes | Observed layout |
| --- | ---: | ---: | ---: |
| MRT before calculation | 211 / 642 | 0 | 488.4 ms |
| MRT calculated journey | 219 / 657 | 2 | 524.5 ms |
| MRT calculated demographic | 250 / 688 | Current bound population | 597.6 ms |
| AAC calculated | 64 / 66 | Current bound AAC | 66 ms |
| Polyclinic planning | 13 / 12 | 0 | Not measured |
| ASEAN planning | 16 / 15 | 0 | Not measured |

The demographic inspector exposed the actual **192,150 represented population / 2,000 agents**, Census 2020 reference and run `impact-0dd0fb00ba6e20c9070ab6d3`, with 31 relationships. This population calculation is separate from the illustrative actors. After invalidation, delayed replies and controlled failed rerun, obsolete calculated content stayed absent as recorded in section 8.

The graph distinguishes user-authored input, source-backed entities, model assumptions, calculated output and planning-only concepts. Nodes and relationships carry provenance and limitations; source links do not imply newly retrieved evidence. Relationship connectivity does not establish causation. The adapter provides bounded structured projections rather than a complete building inventory or raw Census dump. The reserved synthetic exploratory category has no current stakeholder executor.

## 14. Desktop/mobile screenshots and local evidence

Integrated screenshots were captured under ignored `test-results/phase7f7g/`:

```text
mrt-graph.png
demographic-graph.png
aac-graph.png
graph-1920.png
graph-1440.png
graph-1024.png
graph-390.png
graph-mobile-full.png
citizens-desktop.png
citizens-mobile.png
fresh-landing-desktop.png
fresh-landing-mobile.png
fresh-graph-desktop.png
fresh-graph-mobile.png
```

The graph captures cover 1920×1080, 1440×900, 1024×900 and 390×844. Mobile full-window details measured **374.775×793.35 px**, fitting the 390×844 viewport, and Escape restored focus. The root integrator visually inspected all four fresh landing/graph captures, both citizen captures, `graph-1440.png` and `graph-mobile-full.png`. These were visual checks of the images, alongside the measured overflow/focus checks. `test-results/phase7f7g/acceptance-results.json` retains raw acceptance tool results; `scripts/testing/phase7f7g-browser-check.mjs` is the maintained opt-in browser helper. Historical 7F screenshots remain under `test-results/phase7f-*`; source 7G screenshots remain in its own worktree. No screenshot/JSON artifact is part of the proposed commit scope.

## 15. Source, licence and privacy boundaries

Unified buildings remain **internal local review only**. This integration does not approve a public demo, publish geometry, change source attribution or relax loopback protections. Existing source dates, illustrative/derived building heights, coverage gaps and unresolved provenance/licensing remain visible. No building locations are inferred as resident homes. Census/GTFS/MOH/government inputs, expansion weights and engine formulas are outside scope.

Graph strings render as React text; validated source URLs are links rather than arbitrary fetch targets. No paid provider call occurred. Private environment values were not exposed; both environment-file preservation/ignore/index checks passed. Credential-value scans passed across the pending maintained scope and all **14 production client JavaScript assets**. No raw inputs, source geometry or private environment files enter the proposed checkpoint.

## 16. Performance and cleanup limits

The measured current graphs arranged in **66–597.6 ms** in these individual browser trials. Four tab round trips retained the same graph snapshot; hidden citizens froze and resumed with one scene/map, and mobile showed 36 actors / 19 draw calls. Reset left zero graph canvases and one map. These are bounded observations, not sustained performance guarantees. Cytoscape uses multiple Canvas layers for one instance; layer count alone does not prove a leak. No sustained FPS, long-duration heap/GPU, full GPU-loss recovery, thousands-of-nodes or arbitrary-device capacity claim follows. The historical source 500-node trial was not rerun against the combined checkout. Arbitrary whole-map-style replacement remains unverified; section 7 records only scoped owned-resource recovery.

## 17. Remaining limits

This is a structured relationship explorer, not GraphRAG retrieval, a causal inference engine or Phase 7D execution. Planning-only healthcare/policy questions do not produce forecasts or stakeholder opinion. MRT timing/demand assumptions, Census 2020 rounding/national discrepancy, unassigned demand, historical AAC eligibility/opening/capacity uncertainty, landmark proxies and unlocated older population remain material. Straight-line proximity is not verified walking access or health impact.

Pedestrian loops are independent visual storytelling; no calculated individual trajectories, real resident locations, real sidewalk data or scenario rerouting is implied. Building coverage/height/licensing limitations persist. Public-release approval, live provider authentication, wider reliability work and competition reuse/rebuild checks remain separate prerequisites. Any browser/lifecycle case not actually completed in this checkpoint must stay explicitly unverified.

## 18. Independent review and integration corrections

The root integrator corrected all three read-only review findings: clear `graphMrt` at rerun; capture optional ImpactPanel `resultContext` before request submission, retain it in accepted loaded state and emit it as the callback's second argument; use the latest categories ref after asynchronous renderer import. The rerun browser regression reproduced two stale result nodes before the correction, then zero while pending and after a controlled HTTP 500. Delayed MRT/demographic edits also left stale output absent. The final 396-test suite, application/strict TypeScript and production build passed after these corrections.

The documentation subagent edits only this report. The root integrator owns code/roadmap reconciliation, sequential validation, browser work and final preservation audit. Source worktree evidence is inspected read-only.

## 19. Practical hackathon reconstruction

Confirm competition reuse rules and permitted data first. Rebuild validated engine/planner/plot contracts and explicit execution confirmation; retain one persistent map. Reconstruct the visual loops and time/metre sampling before adding the instanced rig, then verify actual root displacement and pause/reset. Build the bounded graph contract/adapters against current validated state, attach identities at accepted request boundaries, then add a disposable renderer and three-level inspector. Prove a small real MRT graph and limited AAC projection before polishing responsive layouts.

For the existing reviewed checkout, Node 24+ and `npm.cmd ci` install the pinned dependency set; `npm.cmd run prepare:web` prepares existing frontend inputs. Ignored building assets still require the existing reviewed reconstruction/licence process and are not supplied by Git. Run the six commands in section 9, full tests, application/strict TypeScript and production build sequentially, then repeat real desktop/mobile/race/cleanup acceptance. Do not acquire new geometry or build GraphRAG infrastructure for this checkpoint.

After building and verifying that port 3127 is free, reproduce the owned no-provider production server with process-local test configuration:

```powershell
$env:PHASE56_TEST_PROVIDER = 'none'
node --import=./scripts/testing/phase56-provider-preload.mjs node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3127
```

Use the actual General/Knowledge Graph tab and the opt-in helper from section 14. Stop only this owned server afterward; do not interrupt the existing port-3000 server. No private environment file needs editing.

## 20. Future Git checkpoint and source synchronisation — not executed

No staging, commit, merge, reset, rebase, cherry-pick, stash, clean, branch forcing, push or synchronisation was executed. Proposed future message: `feat: integrate living pedestrians and interactive knowledge graph`. The concrete proposed scope is the union of section 2's 23 paths and section 3's 18 paths, with workspace/roadmap counted once (**39 paths**), plus `docs/PHASE7F_7G_INTEGRATION_CHECKPOINT.md` and `scripts/testing/phase7f7g-browser-check.mjs`: **41 maintained paths**, confirmed by the final read-only inventory (15 tracked modifications / 26 new files). Both indexes remain empty; all source/backup/input preservation checks passed. Exclude environment files, raw/derived assets, `node_modules`, `.next`, caches, `tmp` and browser screenshots/logs.

A future approved main commit alone cannot safely clear or synchronise Terminal 2's 18 original dirty paths. First obtain separate explicit approval for a concrete preservation/reconciliation plan, verify the external snapshot/backups and compare every intentional main correction with the untouched source files. Do not reset or overwrite dirty source work. Only after approved reconciliation leaves Terminal 2 safely clean, and its branch is verified to be an ancestor of the proposed main checkpoint, may separately approved `--ff-only` advancement be considered. Stop on divergence. No push, public release, worktree deletion or branch deletion is part of this proposal.

### Exact proposed pathspec allowlist

Tracked modifications (15):

```text
components/citizens-panel.tsx
components/citizens.css
components/impact-panel.tsx
components/knowledge-workspace.tsx
components/singapore-map.tsx
components/workspace.tsx
docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md
lib/citizens/fixtures.ts
lib/citizens/layer.ts
lib/citizens/playback.ts
lib/citizens/scene.ts
lib/contracts/tests/citizen-scene.test.ts
lib/contracts/tests/citizen-visualisation.test.ts
package-lock.json
package.json
```

New maintained files (26):

```text
components/knowledge-workspace.css
docs/PHASE7F_7G_INTEGRATION_CHECKPOINT.md
docs/PHASE7F_CITIZEN_VISUALS_MOVEMENT_IMPLEMENTATION.md
docs/PHASE7G_INTERACTIVE_KNOWLEDGE_GRAPH_IMPLEMENTATION.md
docs/PHASE7G_TERMINAL3_INTEGRATION_GUIDE.md
docs/superpowers/plans/2026-10-28-living-pedestrians.md
lib/citizens/path-overlay.ts
lib/citizens/pedestrians.ts
lib/contracts/tests/citizen-clock.test.ts
lib/contracts/tests/citizen-controls.test.ts
lib/contracts/tests/citizen-layer.test.ts
lib/contracts/tests/citizen-path-overlay.test.ts
lib/contracts/tests/citizen-pedestrian-geography.test.ts
lib/contracts/tests/citizen-pedestrians.test.ts
lib/contracts/tests/citizen-pose.test.ts
lib/contracts/tests/knowledge-graph.test.ts
lib/contracts/tests/knowledge-renderer.test.ts
lib/contracts/tests/knowledge-ui.test.ts
lib/knowledge-graph/adapters.ts
lib/knowledge-graph/contract.ts
lib/knowledge-graph/palette.ts
lib/knowledge-graph/renderer.ts
lib/knowledge-graph/selectors.ts
scripts/testing/phase7f-browser-check.mjs
scripts/testing/phase7f7g-browser-check.mjs
scripts/testing/phase7g-browser-check.mjs
```
