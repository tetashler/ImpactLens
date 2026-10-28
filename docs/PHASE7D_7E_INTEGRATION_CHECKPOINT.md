# Phase 7D + 7E integration checkpoint

28 October 2026. Local integration target: `ImpactLens` (`master`). Source: `ImpactLens-agents` (`feature/synthetic-population`). Both HEADs remain `6c6fb831f72b79e47776417096997c5862fefee9`. **No staging, commit, stash, merge, reset, synchronisation, push or deployment was performed.**

## 1. Starting state and recovery

Read-only Git inspection confirmed the reported baseline, empty indexes, no unfinished operations, 45 main maintained paths (3 tracked modifications / 42 new), and 28 source maintained paths (5 tracked modifications / 23 new). Source paths remained read-only throughout integration.

Verified external recovery snapshot: `C:\Users\tetas\AppData\Local\Temp\impactlens-7d7e-main-backup-7j4BxA`. `manifest.json` and `manifest.sha256` record relative paths, sizes, tracked status and SHA-256. All 45 original main files were copied and verified before integration. Original baseline copies of the two additionally reconciled tracked files are in `additional-originals/`. Private configuration and bulk datasets were excluded. The temporary `impactlens-7d7e-state.json` records both initial inventories and source hashes.

## 2. Original Phase 7E inventory

```text
app/api/evidence/research/route.ts
components/experiment-lab.css
components/experiment-lab.tsx
components/knowledge-workspace.tsx
components/use-experiment-lab.ts
components/workspace.tsx
docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md
docs/PHASE7E_EXPERIMENT_INPUT_CONTRACT.md
docs/PHASE7E_SCENARIO_EXPERIMENT_LAB_IMPLEMENTATION.md
docs/PHASE7E_TERMINAL3_INTEGRATION_GUIDE.md
docs/superpowers/plans/2026-10-28-scenario-experiment-lab.md
lib/contracts/tests/evidence-contract.test.ts
lib/contracts/tests/evidence-route.test.ts
lib/contracts/tests/experiment-client.test.ts
lib/contracts/tests/experiment-comparison.test.ts
lib/contracts/tests/experiment-configuration.test.ts
lib/contracts/tests/experiment-fixtures.ts
lib/contracts/tests/experiment-graph.test.ts
lib/contracts/tests/experiment-handoff.test.ts
lib/contracts/tests/experiment-identity.test.ts
lib/contracts/tests/experiment-persistence-races.test.ts
lib/contracts/tests/experiment-persistence.test.ts
lib/contracts/tests/experiment-record.test.ts
lib/contracts/tests/experiment-ui.test.ts
lib/evidence/SOURCES.md
lib/evidence/contract.ts
lib/evidence/index.ts
lib/evidence/replay.ts
lib/evidence/snapshots.ts
lib/evidence/types.ts
lib/experiments/client.ts
lib/experiments/comparison.ts
lib/experiments/configuration.ts
lib/experiments/contract.ts
lib/experiments/fixtures/asean-phase7d-input.json
lib/experiments/geometry-references.ts
lib/experiments/graph.ts
lib/experiments/handoff.ts
lib/experiments/identity.ts
lib/experiments/index.ts
lib/experiments/persistence.ts
lib/experiments/validation.ts
lib/server/evidence/replay.ts
lib/server/evidence/service.ts
scripts/testing/phase7e-browser-check.mjs
```

## 3. Original Phase 7D inventory

```text
app/api/stakeholder-simulate/route.ts
components/knowledge-workspace.tsx
components/stakeholder-workspace.css
components/stakeholder-workspace.tsx
components/workspace.tsx
docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md
docs/PHASE7D_MULTI_AGENT_STAKEHOLDER_SIMULATION_IMPLEMENTATION.md
docs/PHASE7D_PHASE7E_COMPATIBILITY.md
docs/PHASE7D_TERMINAL3_INTEGRATION_GUIDE.md
lib/contracts/tests/knowledge-ui.test.ts
lib/contracts/tests/stakeholder-api.test.ts
lib/contracts/tests/stakeholder-client.test.ts
lib/contracts/tests/stakeholder-engine.test.ts
lib/contracts/tests/stakeholder-graph.test.ts
lib/contracts/tests/stakeholder-ui.test.ts
lib/scenarios/registry.ts
lib/server/stakeholder-simulation/llm.ts
lib/server/stakeholder-simulation/service.ts
lib/stakeholder-simulation/client.ts
lib/stakeholder-simulation/comparison.ts
lib/stakeholder-simulation/compatibility.ts
lib/stakeholder-simulation/contract.ts
lib/stakeholder-simulation/engine.ts
lib/stakeholder-simulation/evidence.ts
lib/stakeholder-simulation/graph-adapter.ts
lib/stakeholder-simulation/identities.ts
lib/stakeholder-simulation/roles.ts
scripts/testing/phase7d-browser-check.mjs
```

## 4. Transfer and shared files

The 23 original new Phase 7D files listed above were copied only into absent main paths and checked against their source hashes. Source files were not edited. `lib/scenarios/registry.ts` and `lib/contracts/tests/knowledge-ui.test.ts` were separately inspected, backed up and transferred; their changes concern accurate capability/source-note wording. `components/workspace.tsx`, `components/knowledge-workspace.tsx` and the roadmap were reconciled manually over Phase 7E, preserving the experiment lab, citizens, plotting and existing accepted calculator results. Neither package manifest nor lockfile changed; no dependency was added.

## 5. Exact conversion boundary

`lib/stakeholder-simulation/experiment-bridge.ts` exports `convertScenarioExperimentInput`, `linkStakeholderRun`, `verifyLinkedStakeholderRun`, `stakeholderRoleIdsForFocus`, `assertLinkedHistoryCompatible` and their input/link types. The UI first calls the real `createScenarioExperimentInput(record)` from `lib/experiments/index.ts`; the bridge validates that full version-1 input again before projecting the narrow Phase 7D contract.

Supported execution is deliberately ASEAN-only: immediate or negotiated withdrawal, unresolved or hypothetical replacement trade arrangements, configured horizon and registered focus roles. Custom withdrawal, hypothetical continuity and values exceeding the consumer's bounds are rejected rather than approximated. Notes above 500 characters and overly large evidence projections are rejected explicitly. Partial MRT/AAC notebook references are never reconstructed into calculator inputs.

## 6. Identity and evidence preservation

The linked envelope retains the complete frozen Phase 7E input, actual saved experiment and separate verified Phase 7D run. Full scenario/configuration/evidence/execution-input identities are preserved; Phase 7D's own input/evidence fingerprints and attempt/run identity remain distinct. No display hash substitutes for an authoritative digest. The saved `execution.status` remains `not-executed` and its original reason is unchanged, even after a separate run completes.

Source/finding IDs, URLs, truthful publication/replay dates and finding classifications survive projection. Evidence limitations and unknowns remain explicit gaps. Complete excerpts and provenance remain in the retained Phase 7E source and saved record. No-evidence input produces no fabricated citations. Linked imports reject inconsistent lineage, conflicting run IDs and conflicting saved metadata under the same experiment ID, including conflicts with the lab's saved registry.

## 7. Actual API execution

General → Experiment lab → save a snapshot → **Run stakeholder exploration** opens the existing stakeholder timeline using that exact saved record. This is the sole scenario editor; the execution panel shows read-only saved inputs and exposes only bounded role/round/seed/mode options. It calls `POST /api/stakeholder-simulate` with `{version:1,attemptId,input}` and validates `{version:1,attemptId,run}`. Server bounds, strict input validation, sequential engine, concurrency limits and controlled errors are preserved.

Default execution is **deterministic scripted stakeholder exploration**, not independently generated AI discussion. Public `llm-assisted` requests remain explicitly unavailable (503); optional adapter tests use mocks. No live or paid provider call was made. Timeline Play/Pause/Replay operate on a completed batch; Cancel attempt cancels acceptance of an execution request.

## 8. Immutable lifecycle and comparisons

Saved experiment → validated handoff → converted execution input → separate run. None of these steps mutates evidence or the saved record. Up to four session run snapshots are retained; export preserves linked source/record/run together. Import validates rather than authenticates a run, and does not silently add or restore its experiment into the lab. Legacy raw runs remain explicitly unlinked archives. Experiments retain existing bounded local persistence; runs require export to survive reload.

The existing lab compares configurations and evidence. The run panel separately presents **Scenario differences** from the two actual saved records and **Synthetic-run differences** from actual completed runs, including assumptions, roles, event types, stance changes and evidence references. Counts are not population percentages or economic effects.

## 9. One composed Knowledge Graph

`projectLinkedExperimentGraph` in `lib/stakeholder-simulation/experiment-graph.ts` validates the link and requires its actual saved record. It composes `appendExperimentGraph(null, archivedContext)` with the verified stakeholder projection, connects snapshot/run lineage, and folds duplicate projected evidence entities onto the original source/finding nodes. Synthetic interpretations use honest `uses` relationships; source citations do not validate fictional forecasts.

Root graph scope is explicit: current scenario, a captured saved experiment ID, or a standalone linked run graph. Archived graphs never borrow unrelated current MRT/AAC/demographic results. Full source identities are inspectable. The existing Cytoscape renderer, search, category filters, relationships and three inspector levels are reused. Saved-input graph labels now describe a historical unexecuted input without falsely claiming that no executor exists. The underlying saved execution field is not rewritten.

## 10. Request and graph races

The execution key includes the immutable record, execution options and current draft/context token. Monotonic attempts plus exact keys gate every asynchronous conversion, HTTP, verification and graph stage. Cancellation is additional protection, not the sole guard. A 15-second default deadline bounds even a fetch implementation that ignores abort; timeout, cancellation and supersession remain distinct and retries work. Bounded imports reject late/corrupt data and immutable ID collisions before history updates.

Parent graph projection rechecks the child's captured acceptance predicate after its own awaited work. Close, archive selection, new execution and draft changes therefore cannot reopen an obsolete graph. Current edits invalidate active results; archived completed runs remain inspectable under their original identities. Graph-only selection/playback does not change calculator or experiment data.

## 11. Automated verification

Final results are recorded below after the final verification run. Logs are ignored under `tmp/phase7d7e/`.

| Check | Actual result |
|---|---|
| Full Node suite | **521 passed, 0 failed/cancelled/skipped** |
| Six MRT/population/eldercare CLIs | All passed |
| Application TypeScript | Passed |
| Explicit strict modules/routes/tests | Passed |
| Python GIS | **19 passed** using existing isolated environment |
| Next.js production build | Passed; both new routes coexist with existing APIs |
| Whitespace / index | Passed; both indexes empty |
| Source worktree / recovery | Original 28 source files and all 45 main recovery copies hash-verified |
| Security / data | Environment files unchanged; all 14 raw inputs per worktree and captured ignored building assets unchanged; maintained/browser credential scan passed |

Integration tests cover the actual complete Phase 7E fixture, no evidence, full identity preservation, unsupported conversion rejection, run linkage, immutable snapshots, composed archived graphs, genuine evidence relationships, bounds, linked-import collisions, saved-input UI, and deadlines/cancellation. Existing sequential engine, API, experiment races and MRT/AAC graph tests remain included. Preparation/test/build hooks ran sequentially on Windows.

## 12. Browser: primary ASEAN journey

Actual Playwright MCP, real local production server on owned port 3127, provider-disabled preload. Existing Terminal 1 dev server on port 3000 (PID 5264) was not stopped or replaced.

- Immediate / unresolved / five years → two historical source replays → saved A → real 18-turn completed run, with genuine preceding-event references.
- Negotiated / hypothetical replacement / five years → saved B → another real 18-turn run with different input fingerprint and actual statement content. A's stored assumptions remained immediate/unresolved.
- Original inputs, fictional participants, actual source/assumption references, playback and A/B scenario/run comparisons were inspected. No-evidence execution produced 18 events and zero finding references.
- Combined A graph: **52 nodes / 250 edges / 2 sources / 6 fictional roles**; B: **52 / 246**. Archived A remained inspectable after B; no unrelated calculated-result nodes appeared. Popup → expanded → full-window source/role inspection and Escape focus restoration passed.
- Linked JSON export/import passed; a downloaded B envelope was independently validated through the bridge. Corrupt imports, HTTP 500 and unavailable LLM 503 showed controlled failures, followed by real successful recovery.

## 13. Browser: races and API failures

Held actual execution responses were rejected after Cancel, close plus assumption A→B→A, close plus question A→B→A and new scenario. Existing research replay races passed cancellation, retry, question A→B→A, geometry edit and reset. Delayed planner question A-B-A/reset responses were rejected. A held MRT rerun removed all old result nodes while pending and kept them absent after a controlled failure. Timeout and ignored-abort cases additionally have focused client tests.

Actual stakeholder HTTP checks returned 400 malformed JSON, 415 wrong content type, 413 oversized body, 403 bad origin, 400 direct incompatible Phase 7E envelope and 503 disabled LLM mode, all with no-store responses. Valid execution uses the tested explicit converter, not a cast or test-only format.

## 14. Existing application regression

Real plotted MRT with confirmed NS4/NE16 anchors returned **62.77 → 13.50 modelled minutes**. Real weighted demographic impact, calculated profile and no-key AI fallback worked; its current graph contained **255 nodes / 693 edges / 3 result nodes**, including the added notebook context. Geometry edits removed obsolete result nodes.

Real plotted AAC at 1.282/103.817 legitimately produced zero distance benefit. Moving to the existing demo coordinate 1.287/103.824, reconfirming and rerunning produced **44,520 targeted / 6,230 comparable / 38,290 unlocated / 3,890 closer**, mean **410.4 → 347.5 m**, zero newly within 500 m. Previous AAC calculated graph nodes cleared on movement. The supported four-facility catalogue loaded; limited inventory/proxy/unknown-capacity caveats remained.

Actual rendered pedestrian-root displacement was **4.781 m during a five-second observation**, with exact paused matrices and exact Reset. General/Graph navigation retained one map. Mobile Play/Pause worked. These authored visual loops remain unrelated to ASEAN dialogue or calculated resident movement.

## 15. Responsive screenshots and fresh session

1920×1080, 1440×900, 1024×900 and 390×844 stakeholder views had no document/dialog horizontal overflow and one MapLibre canvas. Screenshots were opened and inspected: `test-results/phase7d7e/stakeholder-{1920,1440,1024,390}.png`, `graph-desktop.png`, `graph-mobile-source.png`, `citizens-mobile.png`. Source dates, full IDs, synthetic/replay labels and touch controls remained available. These files are ignored, not proposed commit content.

A fresh isolated context against the final production build repeated both actual saved experiments, both 18-turn runs and 52-node combined graphs with **zero page or console errors**. It rejected a validly structured conflicting-createdAt linked import without changing the original record, and safely rejected unsupported hypothetical-continuity execution before opening the panel. Delayed planner A-B-A/reset replies were rejected. Final landing loaded **2,560 rendered viewport building features**, one active extrusion system and one MapLibre canvas; this viewport sample is not a physical building inventory. Extra inspected screenshots: `fresh-production-desktop.png`, `fresh-mobile-event.png`, `fresh-landing.png`. The only console failures during deliberate failure tests were the injected 500 and intentional unavailable-mode 503; normal fresh acceptance had none. A test transport ECONNRESET and a cold-renderer timing race required an infrastructure retry/wait, not a product-code repair.

## 16. Independent review and corrections

Separate contract and lifecycle reviewers implemented focused modules/tests; a separate read-only reviewer examined the integration. Confirmed corrections: explicit contract conversion instead of incompatible independent handoff; graph provenance and original-source folding; current/archive graph scope; post-await parent/child graph acceptance; bounded request timeout; next-execution versus inspected-run labels; no duplicate scenario editor; unsupported configuration rejection; saved metadata/run identity collision rejection. A browser helper was corrected to read route responses reliably when the rendered plan is hidden by the lab. No model formulas were changed.

## 17. Security, source and licence integrity

Both private environment files remain unchanged, ignored, untracked and unstaged. Intended maintained files and browser JavaScript are scanned without logging values. All captured original raw inputs and ignored building sources/receipts/derived assets remain unchanged, including known LF/CRLF Census differences between worktrees. No weights were renormalised.

Unified manifest SHA-256 remains `5ab917ca747b51527868499c58ac6ecc21c82dd8897d3243ed9ff52ef0bfc32b`: 234,739 retained footprints / 1,119 chunks. `local-review-only`, loopback restrictions, attribution and unresolved public-demo licensing remain. No expensive source extraction, new package or infrastructure was introduced.

## 18. Remaining limitations and performance

Two historical replay sources are not live retrieval or comprehensive legal/economic research. Deterministic fictional turns are not representative views, public-opinion forecasts or diplomatic/economic predictions. Live stakeholder LLM execution remains disabled. No GraphRAG retrieval, individual calculated-population paths, real healthcare attendance/capacity or verified pedestrian networks are supplied. MRT timings/demand, historical AAC points/proxies/unlocated residents and building height/coverage/overlap/licensing limitations persist.

Execution remains a bounded local batch, not server streaming or durable job infrastructure. Run history is session-only, capped at four; linked export is the retention mechanism. Current graph layout is synchronous and bounded; no new sustained FPS, memory or scalability guarantee is claimed. This integration prioritises correctness and reproducibility over a larger ontology or wider scenario support.

## 19. Reproduction

Run sequentially from main: `npm.cmd run mrt:validate`, `npm.cmd run mrt:simulate`, `npm.cmd run agents:generate`, `npm.cmd run agents:impact`, `npm.cmd run eldercare:prepare`, `npm.cmd run eldercare:simulate`, `npm.cmd test`, `npx.cmd --no-install tsc --noEmit`, `npm.cmd run build`, `git diff --check`.

GIS: `../ImpactLens-agents/tmp/phase7c1/venv/Scripts/python.exe -B -m unittest discover -s scripts/tests -p test_building_conflation.py`. Strict validation uses `tsc --ignoreConfig --noEmit --strict --target ES2023 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --skipLibCheck --types node --lib ES2023,DOM` over experiment/evidence/stakeholder modules, server modules, both new route groups and their test files.

For no-provider acceptance set process-local `PHASE56_TEST_PROVIDER=none`, then run `node --import=./scripts/testing/phase56-provider-preload.mjs node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3127` after a successful build. Confirm port ownership first; do not start a second dev server in this worktree. The preload blocks upstream paid calls and never edits `.env.local`. Opt-in helpers: `scripts/testing/phase7d7e-browser-check.mjs`, retained Phase 7E research and Phase 7F movement helpers. Normal development remains `npm run dev`.

## 20. Hackathon rebuild sequence

1. Recreate strict frozen experiment/evidence contracts and full identity tests.
2. Add reviewed historical replay records and explicit source/gap presentation.
3. Recreate bounded deterministic sequential engine, registered fictional roles and strict event references.
4. Implement and test the one conversion boundary and separate linked run envelope.
5. Connect saved snapshots to execution, cancellation, linked exports and actual A/B comparisons.
6. Compose source/assumption/run/event projections into the existing graph; preserve old engines and one map.
7. Run sequential regressions and the actual browser journey. Observe competition rules on permitted prebuilt code/data; resolve public-use licensing separately.

## 21. Exact proposed checkpoint scope

**80 maintained paths: 5 tracked modifications and 75 new files.**

Tracked modifications:

```text
components/knowledge-workspace.tsx
components/workspace.tsx
docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md
lib/contracts/tests/knowledge-ui.test.ts
lib/scenarios/registry.ts
```

New maintained files:

```text
app/api/evidence/research/route.ts
app/api/stakeholder-simulate/route.ts
components/experiment-lab.css
components/experiment-lab.tsx
components/stakeholder-workspace.css
components/stakeholder-workspace.tsx
components/use-experiment-lab.ts
docs/PHASE7D_7E_INTEGRATION_CHECKPOINT.md
docs/PHASE7D_MULTI_AGENT_STAKEHOLDER_SIMULATION_IMPLEMENTATION.md
docs/PHASE7D_PHASE7E_COMPATIBILITY.md
docs/PHASE7D_TERMINAL3_INTEGRATION_GUIDE.md
docs/PHASE7E_EXPERIMENT_INPUT_CONTRACT.md
docs/PHASE7E_SCENARIO_EXPERIMENT_LAB_IMPLEMENTATION.md
docs/PHASE7E_TERMINAL3_INTEGRATION_GUIDE.md
docs/superpowers/plans/2026-10-28-experiment-stakeholder-integration.md
docs/superpowers/plans/2026-10-28-scenario-experiment-lab.md
lib/contracts/tests/evidence-contract.test.ts
lib/contracts/tests/evidence-route.test.ts
lib/contracts/tests/experiment-client.test.ts
lib/contracts/tests/experiment-comparison.test.ts
lib/contracts/tests/experiment-configuration.test.ts
lib/contracts/tests/experiment-execution-boundary.test.ts
lib/contracts/tests/experiment-fixtures.ts
lib/contracts/tests/experiment-graph.test.ts
lib/contracts/tests/experiment-handoff.test.ts
lib/contracts/tests/experiment-identity.test.ts
lib/contracts/tests/experiment-persistence-races.test.ts
lib/contracts/tests/experiment-persistence.test.ts
lib/contracts/tests/experiment-record.test.ts
lib/contracts/tests/experiment-ui.test.ts
lib/contracts/tests/stakeholder-api.test.ts
lib/contracts/tests/stakeholder-client.test.ts
lib/contracts/tests/stakeholder-engine.test.ts
lib/contracts/tests/stakeholder-experiment-graph.test.ts
lib/contracts/tests/stakeholder-experiment-integration.test.ts
lib/contracts/tests/stakeholder-graph.test.ts
lib/contracts/tests/stakeholder-integrated-ui.test.ts
lib/contracts/tests/stakeholder-timeout.test.ts
lib/contracts/tests/stakeholder-ui.test.ts
lib/evidence/SOURCES.md
lib/evidence/contract.ts
lib/evidence/index.ts
lib/evidence/replay.ts
lib/evidence/snapshots.ts
lib/evidence/types.ts
lib/experiments/client.ts
lib/experiments/comparison.ts
lib/experiments/configuration.ts
lib/experiments/contract.ts
lib/experiments/fixtures/asean-phase7d-input.json
lib/experiments/geometry-references.ts
lib/experiments/graph.ts
lib/experiments/handoff.ts
lib/experiments/identity.ts
lib/experiments/index.ts
lib/experiments/persistence.ts
lib/experiments/validation.ts
lib/server/evidence/replay.ts
lib/server/evidence/service.ts
lib/server/stakeholder-simulation/llm.ts
lib/server/stakeholder-simulation/service.ts
lib/stakeholder-simulation/client.ts
lib/stakeholder-simulation/comparison.ts
lib/stakeholder-simulation/compatibility.ts
lib/stakeholder-simulation/contract.ts
lib/stakeholder-simulation/engine.ts
lib/stakeholder-simulation/evidence.ts
lib/stakeholder-simulation/experiment-bridge.ts
lib/stakeholder-simulation/experiment-graph.ts
lib/stakeholder-simulation/graph-adapter.ts
lib/stakeholder-simulation/identities.ts
lib/stakeholder-simulation/roles.ts
scripts/testing/phase7d-browser-check.mjs
scripts/testing/phase7d7e-browser-check.mjs
scripts/testing/phase7e-browser-check.mjs
```

Exclude all `.env*` private values, `.next`, `node_modules`, `tmp`, `test-results`, screenshots/logs, Python environments/caches, raw downloads and generated geography. No dependency change is proposed. Suggested future message: `feat: integrate scenario experiments and stakeholder simulations`.

## 22. Later Git preservation and synchronisation — not executed

After separate user approval, re-audit both exact inventories and hashes, rerun changed checks, explicitly stage only the allowlist, inspect staged paths/content/secrets/whitespace and create one local main checkpoint. Before changing the dirty source worktree, externally back up and verify all its original 28 maintained files, compare every path with the approved integrated commit and explain intentional differences. Restore/move only those reviewed preserved paths, verify an empty index/clean tree and valid ancestry, then fast-forward only. Never hard reset, clean ignored assets, force-update, overwrite unrelated edits or assume dirty changes disappear after a commit. This assignment performs none of those operations.

## 23. Tools actually used and final ownership

Applied superpowers planning/TDD, parallel-agent coordination, independent review, receiving-review, systematic debugging and verification skills. Tools: read-only local Git, PowerShell/Node/TypeScript, the existing isolated Python GIS environment, Playwright MCP real HTTP/browser automation and local screenshot inspection. No GitHub mutation, provider call or external data acquisition was needed. Both histories/indexes and all source-worktree maintained files remain preserved for the separately approved checkpoint.
