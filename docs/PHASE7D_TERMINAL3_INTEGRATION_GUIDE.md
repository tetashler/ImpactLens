# Phase 7D — Terminal 3 integration guide

## Scope and coordination

Terminal 2 implements the stakeholder simulation slice from `6c6fb831f72b79e47776417096997c5862fefee9` on `feature/synthetic-population`. The local slice is implemented and verified, ready for Terminal 3's manual reconciliation. Terminal 1 owns Phase 7E; its uncommitted files are neither imported nor inspected here. Combined Phase 7E acceptance and public live LLM execution remain separate work. No Git integration or deployment is authorised by this handoff.

Use the [implementation report](PHASE7D_MULTI_AGENT_STAKEHOLDER_SIMULATION_IMPLEMENTATION.md) for execution/evidence boundaries and the [Phase 7E compatibility document](PHASE7D_PHASE7E_COMPATIBILITY.md) for the one converter boundary. Preserve the existing MRT/AAC routes, Census weighting, citizen layer, single MapLibre map and Knowledge Graph renderer.

## Runtime handoff

The simulation consumes `StakeholderSimulationInputV1` from `lib/stakeholder-simulation/contract.ts`: `{version:1,scenarioIdentity,experimentId,configurationIdentity,question,assumptions,horizonYears,stakeholderRoles,evidence,simulationOptions}`. Call `parseStakeholderInput` at untrusted boundaries. Its exact role/evidence/options types are exported there; do not duplicate this into a competing application-wide scenario schema. `roles.ts` exports detached `getStakeholderRoles()` definitions and `createDemoInput()` for the labelled ASEAN example.

`runStakeholderSimulation(input, {attemptId, signal?, generateTurn?, provider?, model?})` in `engine.ts` performs the sequential batch and returns a validated `StakeholderSimulationRunV1`. `parseStakeholderRun` checks structural, event/reference, status and memory consistency; `verifyStakeholderRun` from `identities.ts` additionally recomputes full input/evidence SHA-256 values and run identity. Use the latter for imported or received records. `compareStakeholderRuns` in `comparison.ts` requires completed runs; it compares recorded synthetic experiments, not the likelihood or desirability of real outcomes.

`StakeholderRequestSession` in `client.ts` combines exact content context, a monotonic attempt gate, request cancellation, bounded response parsing and fingerprint/attempt checks. `addStakeholderHistory` keeps at most four recent records in session memory. Verify imported JSON before adding it. Archives do not become the current run automatically.

The General hook opens a simulation-specific panel. Configure withdrawal/trade assumptions, select roles and start a bounded batch. Playback controls step through stored accepted events; they do not claim to pause backend execution. Preserve the active run through General/Graph navigation. Changing scenario content invalidates active-result acceptance, while archived immutable runs remain inspectable as archives.

Use content fingerprints and monotonic attempt gates together. A → B → A must not restore a late response from the first A. Capture identities at dispatch/acceptance; never attach the newest scenario identity to an old run at render time.

## Graph and Phase 7E boundary

`projectStakeholderRun(run)` from `lib/stakeholder-simulation/graph-adapter.ts` is async because it verifies fingerprints before projecting. It returns existing `KnowledgeGraph` v1 data bound to the run's exact `scenarioIdentity` and `runId`. Nodes cover the run, fictional roles, assumptions, supplied sources/findings and accepted events. Edges use existing finite relationship types such as `contains`, `produces`, `ordered-before`, `uses`, `describes` and `supported-by`; descriptions specify participation, addressing, replies, challenges and revisions without inventing causation.

Statements/roles use `synthetic-exploratory` provenance; assumptions are user-authored. Supplied source metadata is explicitly labelled unverified by this engine, and finding nodes are planning-only context rather than established facts. The renderer, search/filter and three-level inspector need no contract or implementation replacement.

`mergeStakeholderGraph(base, run)` optionally appends the projection while preserving existing calculated nodes. It rejects unequal scenario identities, ID collisions or graph-limit violations through existing validation. Existing graph identities may be long exact-content keys; use the actual matching snapshot, not just a matching question or an arbitrarily copied label. Do not splice an archived run into a newly edited scenario. The independent run-graph view can be used before shared workspace projection wiring is reconciled.

No renderer rewrite, separate map, autonomous retrieval, source scraping or Phase 7D output pretending to be public polling is part of this integration. The Phase 7E converter accepts only the documented versioned compatibility shape; incompatible evidence or identities must fail rather than be silently relabelled.

## HTTP and live-call policy

`app/api/stakeholder-simulate/route.ts` is a Node runtime wrapper around `handleStakeholderRequest` in `lib/server/stakeholder-simulation/service.ts`. Request: `{version:1,attemptId,input}`. Response: `{version:1,attemptId,run}`. Use JSON, the application origin and no query parameters. Limits are 96 KiB request, 512 KiB response and two pending runs. All responses are no-store. Errors are controlled 400/403/409/413/415/429/503 JSON; no stack, path, key or upstream body is exposed.

HTTP 200 is not a completion flag. The validated run can be `completed`, `partial`, `failed` or `cancelled`; preserve that status in the UI and allow comparison only for completed records. Registered role definitions are validated exactly; choosing a role does not permit replacing its title/profile with an actual official.

The public route intentionally rejects `llm-assisted` with `STAKEHOLDER_LLM_UNAVAILABLE` and HTTP 503. It does not inspect a key and then infer permission. A browser mode choice cannot authorise paid calls. The optional `createStakeholderTurnGenerator` in the server-only `llm.ts` reuses existing Gemini/OpenRouter configuration, structured-output adapters, deadlines and shared AI concurrency protection; tests can inject explicit permission and mocks. Real enablement requires a separate authorised integration decision. No automatic provider switching or deterministic substitution is allowed.

## Shared files and acceptance

Reconcile focused hooks manually with Terminal 1's current workspace; never copy the whole older workspace over its Phase 7E work. No dependency, package/lockfile change, database or agent framework is added.

Current implemented touchpoints are deliberately small:

- `components/workspace.tsx` imports `StakeholderWorkspace`, owns its open/graph state, derives a stakeholder context from the existing exact workspace identity plus monotonic revision, and uses a stable `showStakeholderGraph` callback to reject a projection for another snapshot. The General summary opens the panel. The projection can be viewed explicitly in the existing graph tab with a return-to-scenario-graph action; deterministic calculation graphs are retained separately.
- `components/knowledge-workspace.tsx` accepts an optional `resultLabel`, defaulting to the existing calculated-result label. Stakeholder projection uses a clearly synthetic label instead. The heading recognises a run-root record, and the neutral source note says this view does not itself retrieve documents or execute turns. These are presentation hooks, not a graph contract or renderer rewrite.
- `components/stakeholder-workspace.tsx` and its CSS own all simulation configuration, timeline, role/event inspection, archives and comparison. Props are `{open,question,scenarioIdentity,onClose,onUseExample,onGraph}`. Keep `onGraph` stable and identity-checked. Async projection acceptance must use a current monotonic attempt as well as content identity; an old closure must not restore an earlier run during a same-input retry.

`lib/scenarios/registry.ts` has two wording-only changes: its planned stakeholder route now points to the independent Stakeholder simulation action instead of falsely saying no engine exists. The automatic route remains planned/unregistered. ScenarioPlan v1 format, enums and execution/readiness combinations do not change. This is another small shared-file conflict to reconcile with Phase 7E; do not mark general autonomous or live LLM agent execution available.

### Exact maintained inventory

The current Phase 7D implementation adds these 23 files:

```text
app/api/stakeholder-simulate/route.ts
components/stakeholder-workspace.css
components/stakeholder-workspace.tsx
docs/PHASE7D_MULTI_AGENT_STAKEHOLDER_SIMULATION_IMPLEMENTATION.md
docs/PHASE7D_PHASE7E_COMPATIBILITY.md
docs/PHASE7D_TERMINAL3_INTEGRATION_GUIDE.md
lib/contracts/tests/stakeholder-api.test.ts
lib/contracts/tests/stakeholder-client.test.ts
lib/contracts/tests/stakeholder-engine.test.ts
lib/contracts/tests/stakeholder-graph.test.ts
lib/contracts/tests/stakeholder-ui.test.ts
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

The five maintained tracked edits are `components/workspace.tsx`, `components/knowledge-workspace.tsx`, `lib/scenarios/registry.ts`, `lib/contracts/tests/knowledge-ui.test.ts` and the Phase 7D section/status in `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`. The existing Knowledge Graph test changes only its obsolete no-stakeholder-execution copy expectation to the neutral view-specific wording, matching the new presentation note. The dev server's automatic `next-env.d.ts` path adjustment was restored by the production build and is not a handoff edit. Final audit retained the baseline branch/HEAD and unchanged Git index, with exactly five intended tracked edits and 23 new maintained files. Nothing was staged, committed, merged or pushed; `.env.local` remains ignored and untracked without reading its contents.

`scripts/testing/phase7d-browser-check.mjs` exports opt-in Playwright helpers `openStakeholderExample` and `recordStakeholderRun`. They use an owned localhost test port, refuse port 3000, and capture a real completed deterministic API response. They are not imported into the application and are not a mock transcript endpoint.

Ignored screenshots, exported JSON and browser observations are under `test-results/phase7d/` and `tmp/phase7d/`. They do not arrive through a code-only Git transfer. No new raw government source or building asset needs transferring for this feature.

### Verified Terminal 2 acceptance

Final sequential checks passed **435 Node tests / zero failures**, **19 GIS tests / zero failures**, all six existing MRT/population/eldercare CLIs, application TypeScript, explicit strict NodeNext core/server/API and five-test-file TypeScript, and the production build. Build elapsed time was 43.439 seconds including prebuild, with 27 seconds compilation. Independent review reported no remaining blockers after corrections.

The owned production server on port 3134 repeated actual 18-turn immediate/unresolved and negotiated/replacement runs with distinct input fingerprints, comparison, replay, all three Knowledge Graph inspector levels, Escape, and General/Graph/reopen preservation. The synthetic run graph had 27 nodes and 123 edges. Four viewports (1920×1080, 1440×900, 1024×900, 390×844) had no body/dialog horizontal overflow. A fresh production session had no page/console errors and one MapLibre map; the owned server was then stopped. Actual single-request observation: HTTP 200, 352 ms, 5,079 request bytes, 37,060 response bytes, 18 completed events. This is local deterministic execution, not an LLM or scalability benchmark.

Production screenshots are `test-results/phase7d/production-{1920,1440,1024,390}.png` and `production-mobile-inspector.png`; observations are in `tmp/phase7d/dProduction.json`. Development acceptance additionally checked corrupt archive rejection, unavailable LLM mode, held-response cancellation, delayed A → B → A responses, role-filter changes and rewind inspection. See the implementation report for exact limitations and review fixes. The unified building manifest hash was unchanged; existing source licences and local-review protections remain intact.

After integration, run the six existing model CLIs, full Node suite, application and strict stakeholder TypeScript, production build, `git diff --check` and existing GIS tests sequentially. Real browser acceptance must cover run A/run B comparison, replay, event/role inspection, no-evidence disclosure, imported corrupt JSON, cancellation/delayed responses/A→B→A, General/Graph navigation, four requested viewports and preserved MRT/AAC/citizen/map functionality. Record actual counts and screenshots; Terminal 2's isolated acceptance cannot establish the combined Phase 7E result.
