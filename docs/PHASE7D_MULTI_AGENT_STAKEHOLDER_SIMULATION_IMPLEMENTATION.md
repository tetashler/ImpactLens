# Phase 7D — Interactive stakeholder simulation

## Implementation plan and ownership

Terminal 2 starts from clean `feature/synthetic-population` at `6c6fb831f72b79e47776417096997c5862fefee9`. The user's Phase 7D brief is the implementation specification. This implementation stays isolated from Terminal 1's concurrent Phase 7E evidence/configuration work. No staging, commit, merge, push, deployment or private environment change is authorised.

1. Define strict browser-safe input, role, evidence, event and run records. Freeze a detached validated input before execution. Write failing contract/orchestration tests before implementation.
2. Execute selected fictional roles sequentially. Every accepted turn sees bounded preceding context and updates that participant's bounded memory. Keep event order logical rather than wall-clock dependent; preserve prior-event references and explain any position revision.
3. Provide a deterministic, explicitly scripted mode whose turn decisions depend on assumptions, role interests, seed and preceding events. Use the ASEAN withdrawal question as an illustrative counterfactual, without inventing economic quantities or real stakeholder sentiment.
4. Expose a bounded same-origin server API. Reuse existing provider/gate infrastructure only for the optional mocked LLM pathway; live LLM execution remains unavailable without separate explicit authorisation. Never substitute scripts while reporting LLM mode.
5. Build a timeline with batch execution clearly distinguished from playback, stakeholder/event inspection, replay, bounded recent history, validated JSON import/export and completed-run comparison.
6. Project genuine run records into the existing graph contract without replacing the MRT/AAC graph or renderer. Define one independent, versioned Phase 7E compatibility boundary; import no nonexistent Phase 7E module.
7. Verify real browser flows, lifecycle/cancellation, responsive layouts, regressions, types/build and independent review. Record measured results rather than assumed success.

File ownership during parallel implementation:

- Core worker: `lib/stakeholder-simulation/{contract,roles,engine,identities,evidence,comparison,compatibility}.ts` and focused core tests.
- Server/projection worker: `lib/server/stakeholder-simulation/`, `app/api/stakeholder-simulate/route.ts`, `lib/stakeholder-simulation/graph-adapter.ts` and focused API/graph tests.
- Main implementer: simulation UI, client lifecycle/history, small General/workspace integration hooks and browser acceptance.
- Documentation worker: this report, the Terminal 3 guide, the Phase 7E compatibility document and a narrow Phase 7D roadmap update.

Review focuses on cross-scenario stale responses, corrupt imported histories, fabricated evidence references, position revisions without prior events, confused execution/playback controls and accidental paid calls.

## Product and scientific boundary

> These are fictional stakeholder simulations. Their statements and interactions are exploratory and are not representative surveys, forecasts or measured public opinion.

The primary example asks, "What if Singapore left ASEAN?" Immediate withdrawal, unresolved post-withdrawal trade arrangements and a five-year horizon are user-authored hypothetical assumptions. They are not observed events or legal conclusions. A year label is a narrative exploration checkpoint, not a forecast. No GDP, employment, approval, election or actual diplomatic outcome is calculated.

Source-backed background, user assumptions, synthetic statements, model-generated interpretations, deterministic MRT/AAC results and unknown outcomes remain different concepts. A citation can support background; it cannot convert an agent's opinion or future claim into fact. No-evidence runs explicitly identify the missing evidence and invent no sources.

## Architecture and current implementation status

**Phase 7D is implemented and locally verified, ready for Terminal 3's manual reconciliation with Phase 7E.** The system uses a small TypeScript turn orchestrator, not an agent framework or a single call that writes an entire transcript. The existing demographic `prototype/agents` modules retain their population/MRT responsibilities; they are not reused as fictional stakeholder actors. Combined Phase 7E acceptance and public live LLM execution are not claimed.

The intended flow is immutable input snapshot → sequential validated turns → bounded memory updates → final structured run → timeline inspection/replay → optional completed-run comparison and graph projection. React, MapLibre and Cytoscape are consumers rather than orchestration dependencies.

### Implemented core exports and records

`lib/stakeholder-simulation/contract.ts` exports `StakeholderSimulationInputV1`, `StakeholderRoleDefinition`, `ScenarioAssumption`, `EvidenceBundleSnapshotV1`, `SimulationOptionsV1`, `StakeholderTurnOutput`, `StakeholderEvent`, `StakeholderMemory`, `StakeholderSimulationRunV1`, `TurnContext`, `parseStakeholderInput`, `parseEvidenceBundle`, `parseStakeholderTurnOutput` and `parseStakeholderRun`. Version is 1; engine version is `stakeholder-turns-v1`. Parsers reject unknown fields, invalid versions/types, duplicate IDs, invalid references, ordering/memory inconsistencies, non-finite or out-of-range inputs, unsafe URLs and oversized records, then detach accepted values.

The input stores opaque scenario/configuration identities, an experiment ID, a question, 1–12 user-authored assumptions, a 1–10-year exploration horizon, 2–6 fictional profiles, optional evidence and explicit options. Options allow 1–4 rounds, a bounded seed and 1–8 memory-event slots. Six roles × four rounds means at most 24 turns. The core accepts at most 256 KiB of input and 1 MiB of run JSON; the HTTP boundary is deliberately narrower at 96 KiB request / 512 KiB response.

An event stores its event/run IDs, zero-based `turnIndex`, one-based `round`, hypothetical `checkpointYear`, `roleId`, addressed role, interaction type, statement, prior-event IDs, finding/source IDs, assumption IDs, concise `reasoningSummary`, uncertainties, categorical position/topics, position-change label and explicit synthetic provenance. Supported types are `argument`, `response`, `challenge-assumption`, `evidence-question`, `acknowledgement` and `revision`. No timestamp determines event order. A revision must reference a prior event belonging to that role; a changed position requires a revision event. Referenced history must be in the bounded context, and finding/source lineage must resolve exactly in the input bundle.

The run stores `inputSnapshot`, `inputFingerprint`, `evidenceFingerprint`, `attemptId`, `runId`, execution mode/engine/provider/model, accepted ordered events, final memories, status, safe error information and limitations. Status is `completed`, `cancelled`, `failed` or `partial`. Completed runs must contain every configured turn and no error. A failed first turn has no events; a partial run preserves accepted earlier turns without fabricating replacements.

### Roles, turns and memory

`getStakeholderRoles()` in `roles.ts` returns detached definitions for `small-business`, `export-worker`, `supply-chain`, `policy-analyst`, `regional-cooperation` and `household`. Their titles are analytical roles, not named people, officials, organisations or population samples. Interests, constraints, expertise and uncertainty are explicit fictional setup. `createDemoInput()` provides the labelled ASEAN defaults and six roles.

The current parser requires selected profiles to match the registered catalogue definitions. Selection/order is configurable; arbitrary replacement biographies, official titles or altered role interests are not accepted as registered participants. Extending the role catalogue is a separate reviewed change.

`runStakeholderSimulation(input, options)` in `engine.ts` validates/freezes a detached snapshot and then visits participants in the declared array order for each round. Before every turn it yields and checks cancellation, builds a frozen context from the role's memory plus recent events, obtains exactly one proposed turn, validates it, checks cancellation again, appends the accepted record and updates that role's memory. A late generated turn is not accepted after cancellation. There is no whole-transcript generation call or parallel participant fan-out.

Deterministic choices use the seed, role and turn. Roles apply their own declared interests, react to an earlier other-participant event, and can challenge assumed consequences or make a recorded position more conditional. This is scripted state transition, not independent AI reasoning or measured persuasion. `checkpointYear` distributes the configured rounds across the horizon; a one-round run starts at Year 0.

Each `StakeholderMemory` retains bounded own-event IDs, current categorical position, at most eight cited finding IDs, six concern topics and six uncertainties. Available context combines bounded own memory with recent global events and caps the result at 16 records. Full accepted events remain in the run for replay, independent of the smaller next-turn context.

### Identity and comparison

`identities.ts` exports canonical serialization, SHA-256 fingerprinting, `inputFingerprints`, `verifyStakeholderRun` and recursive snapshot freezing. Object keys are canonicalised; array order remains meaningful. `runId` is `run-<first 24 input-hash characters>-<attemptId>`; verification checks the full stored SHA-256 values and run identity. Different attempts have different correlation/event IDs. Reproducibility means equivalent semantic turn content for the same input/seed/engine version after excluding those correlation IDs, not byte-identical attempt exports.

Input fingerprints are integrity/binding checks, not a signature authenticating the origin of imported event text. A structurally valid imported archive remains a supplied synthetic record; it is not proof of an original server execution or factual source truth.

`compareStakeholderRuns()` accepts actual completed run records. It reports comparability, changed assumptions, roles/evidence/mode equality, seed/round/horizon/provider/model settings, event/type/topic counts, evidence references, position changes and unknowns. Differences describe recorded synthetic events only. Incomplete runs are rejected; the UI/import boundary must verify fingerprints before treating an archive as a current validated run.

## HTTP and optional LLM pathway

`POST /api/stakeholder-simulate` uses Node runtime and accepts `{version: 1, attemptId, input}`. It returns `{version: 1, attemptId, run}` with `Cache-Control: no-store`. Attempt IDs are bounded to 64 safe characters. The handler checks application origin, rejects query parameters, enforces declared and actual body bytes, allows at most two pending runs and validates the returned run/fingerprints.

Errors are controlled JSON: invalid input/JSON 400, cross-origin 403, duplicate pending attempt 409, request/response size 413, unsupported media 415, busy 429 and unavailable live LLM mode 503. Payloads contain no stack trace, local path, raw upstream body or key. Deterministic execution reads no provider credentials.

The public route does not authorise live LLM execution. A test-only dependency override can exercise the optional adapter through the existing `readAiConfig`, `createAiProvider` and shared `acquireAiSlot`; the slot is held for the batch. Per-turn limits are at most 15 seconds, 1,200 output tokens and 24 calls. Structured output is parsed against the current turn context before acceptance. Missing configuration, timeout or malformed output fails explicitly; no scripted replacement is reported as LLM output. Provider variability is not given a deterministic-replay guarantee.

Existing adapters' structured-output handling was checked against the official [Gemini structured-output guide](https://ai.google.dev/gemini-api/docs/structured-output) and [OpenRouter structured-output guide](https://openrouter.ai/docs/guides/features/structured-outputs). A schema-conforming reply still needs application checks for allowed IDs, event history, role identity and uncertainty. No live provider call was used for this work.

An HTTP 200 may contain a correctly labelled `partial`, `failed` or `cancelled` run. Inspect `run.status` rather than assuming transport success means a completed simulation. Such accepted records retain safe error metadata and earlier validated turns where available; incomplete runs cannot enter completed-run comparison.

## Execution modes and cost boundary

`deterministic-demo` is explicitly scripted and stateful. It remains useful without provider credentials. `llm-assisted` identifies actual independently generated participant turns when enabled; it must fail explicitly when unavailable. This task authorises no paid provider call. Any provider path is server-only, bounded, sequential and mock-tested through the existing Gemini/OpenRouter interface and shared concurrency gate. It requests a concise explanatory rationale, never private chain-of-thought.

## Evidence and Phase 7E integration

The independent boundary is documented in [Phase 7D / 7E compatibility](PHASE7D_PHASE7E_COMPATIBILITY.md). Evidence source/finding IDs must resolve inside the immutable bundle. URLs are references, never automatic fetch instructions. Supplied evidence is not represented as independently verified retrieval. Confidential material must not be sent externally through an unsupported workflow.

The deterministic rules reference available findings and carry their IDs into inspectable lineage, with uncertainty about their applicability. They do not perform semantic document analysis or establish whether a finding genuinely supports an argument. That remains a separate evidence-review/authorised model task.

## Timeline, inspection and history

`components/stakeholder-workspace.tsx` provides a simulation-specific dialog rather than duplicating Phase 7E's experiment UI. Its props are `open`, `question`, `scenarioIdentity`, `onClose`, `onUseExample` and `onGraph`. The initial UI supports the ASEAN vertical slice; a different question offers the explicit ASEAN example action instead of pretending that the roles form a validated general-purpose model.

The left panel chooses immediate/negotiated withdrawal, unresolved/hypothetical replacement arrangements, horizon, rounds, role selection, mode, seed and optional evidence JSON. The centre displays accepted events in logical order. The right panel inspects a selected role or event, recent archives and comparison. The existing graph renderer remains independent and is opened through the explicit run-graph action.

Execution is a bounded HTTP batch. `Cancel attempt` cancels client acceptance/execution request; `Play timeline`, `Pause playback`, previous/next, jump, replay and reset-view operate on already recorded events. The default display reveals the first accepted event, then playback advances through the stored batch. It does not claim live streaming, execution pause/resume or regeneration during replay. A role's final memory is explicitly labelled as final batch state, not its state at the playback cursor.

Event inspection shows full statement, addressed role, earlier-event links, user assumptions, supplied evidence/source links, concise explanatory rationale, position change and uncertainty. Role inspection shows fictional setup, visible event history and bounded final memory. Every statement remains synthetic; no evidence produces a clear missing-evidence message rather than invented citations.

`StakeholderRequestSession` in `client.ts` validates/detaches submission, captures content plus a monotonic attempt ticket, limits response bytes, verifies returned attempt/fingerprints and discards obsolete responses even if cancellation arrives late. The UI also guards its asynchronous preparation. Exact current-configuration binding is distinct from archive selection.

History is at most four session-memory snapshots, with no database or automatic persistence across reload. JSON export retains a selected current/archive run; import checks the version, bounded size, structural/reference consistency and input/evidence hashes before inspection. Imported evidence is separately bounded and parsed. Archives remain labelled and do not silently become active results. Comparison selectors include only completed runs; event-count differences are synthetic output differences, never business confidence or public opinion percentages.

Known IDs cannot be silently reused for different record contents: session history rejects a changed record under an existing `runId`. This protects an already known immutable archive from replacement; it does not authenticate an unknown imported record's origin. Rewinding before a selected event clears that future-record inspector, and changing to a run without the filtered role resets the filter to all participants.

## Knowledge Graph projection

The async `projectStakeholderRun()` verifies the run then emits existing KnowledgeGraph v1 nodes for the run, roles, assumptions, sources/findings and accepted events. It uses finite existing relationships with precise descriptions for participation, generation, ordering, addressing, prior-event response, evidence references and assumptions. Source finding text is supplied untrusted context; it is not promoted to independently verified fact. Role/event provenance is `synthetic-exploratory`.

`mergeStakeholderGraph(base, run)` is an optional exact-scenario append operation. It preserves existing MRT/AAC calculated nodes and rejects mismatched scenario identity or graph-limit/ID failures. An archive is not relabelled to match a current question. The run's explicit graph view can reuse existing search, filters and three-level inspection before Terminal 3 reconciles the central workspace projection. No Cytoscape renderer change is needed.

## Validation ledger

The starting integrated checkpoint had 396 Node tests and 19 GIS tests. Final isolated-worktree verification passed **435 Node tests, zero failures**, and **19 GIS tests, zero failures**. The 39 new Node tests cover contracts/turns, API/provider mocks, graph projection, client lifecycle/history and UI rendering. Checks ran sequentially without overlapping Windows preparation hooks.

| Verification | Actual result |
| --- | --- |
| `mrt:validate`, `mrt:simulate` | Both exited 0 |
| `agents:generate`, `agents:impact` | Both exited 0 |
| `eldercare:prepare`, `eldercare:simulate` | Both exited 0 |
| `npm.cmd test` | 435 passed, 0 failed |
| Existing GIS suite | 19 passed, 0 failed |
| `npx.cmd --no-install tsc --noEmit` | Passed |
| Explicit strict NodeNext TypeScript | Core, server, API and all five new test files passed |
| `npm.cmd run build` | Exited 0; 43.439 seconds including prebuild, 27 seconds compilation |
| Independent review | Reported findings corrected and verified; no remaining blockers |

The following development and fresh production-browser observations used the actual local application and API. They do not establish combined-branch Phase 7E acceptance or a paid-provider test.

### Actual ASEAN experiment A / B

Terminal 2's real application on its owned port **3134** opened Stakeholder simulation from General. Run A used immediate withdrawal, unresolved arrangements, six roles, three rounds and a five-year exploration horizon. Run B changed to negotiated withdrawal and hypothetical replacement arrangements. Both API requests returned HTTP 200 with 18 completed accepted turns; their full input fingerprints differed. Each no-evidence run had zero finding/source citations and explicit unknowns. All six role-interest inspectors were checked; a later event (turn 8) referenced the recorded preceding turn rather than an invented transcript history.

| Recorded synthetic event type | Run A | Run B |
| --- | ---: | ---: |
| Argument | 4 | 4 |
| Response | 4 | 10 |
| Challenge assumption | 2 | 0 |
| Evidence question | 2 | 2 |
| Acknowledgement | 0 | 0 |
| Revision | 6 | 2 |

These counts describe these two scripted experiment records only. They do not measure business confidence, public approval, real disagreement or the likelihood of any policy outcome. The full actual responses and checked role/graph details are `tmp/phase7d/dCompleteData.json`.

The inspected Run B projection produced **27 nodes / 123 documented edges**, with the heading "Fictional stakeholder run", a synthetic execution label, exact run ID and synthetic role provenance. Graph → General → reopen retained the run. The existing deterministic scenario graph remained available through Return to scenario graph. Screenshots include `test-results/phase7d/run-a-event.png`, `run-b-comparison.png` and `run-graph-inspector.png`.

### Replay, import and lifecycle

Actual Run A export was **46,259 bytes** of JSON. Import reopened it as an archive and disabled attaching it as the current graph. A version-999 corrupt file was rejected. Selecting LLM mode returned explicit HTTP 503, created no successful run and made no provider call.

A held real HTTP response was released after cancellation; current run count stayed zero and the UI reported that late responses would be ignored. Changing assumptions A → B → A and starting a newer attempt prevented an older same-content response from replacing it. Question A → B → A removed the active run; new-scenario reset also left zero current events. Replay advanced through stored records; it did not execute again. Raw observations are `tmp/phase7d/dLifecycle.json` and `dResponsive.json`.

A role filter that became invalid after editing the selected roles reset to all; the five-role/three-round rerun contained 15 events. Rewinding past a selected event cleared its inspector rather than displaying a future playback record. These checks are in `tmp/phase7d/dFilters.json`. History remained capped at four stored snapshots; the archive selector additionally contains its current-configuration option.

### Responsive and performance observations

The development dialog was checked at **1920×1080, 1440×900, 1024×900 and 390×844**, with no body or dialog horizontal overflow. The 390 px dialog measured approximately **382.59×810.24 px**, within the 390×844 viewport. The three desktop sizes use the timeline/side-panel layout; mobile uses scrollable panels with an explicit move to the inspector after selection. Development evidence is `test-results/phase7d/simulation-{1920,1440,1024,390}.png`; the actual bounds are in `dResponsive.json`.

Fresh production acceptance on Terminal 2's owned port **3134**, with AI disabled, repeated both actual 18-turn runs, comparison, stored-event replay, General/Graph/reopen preservation and the 27-node/123-edge run graph. The existing compact → expanded → full-window graph inspector and Escape passed. All four requested production viewports had no body/dialog horizontal overflow; mobile Inspect turn 1 scrolled its real inspector into view at approximately 176.875 px from the top. The fresh session had **zero console errors, zero page errors and one MapLibre map**. Screenshots are `test-results/phase7d/production-{1920,1440,1024,390}.png` and `production-mobile-inspector.png`; the 1440 px and mobile captures were visually inspected. Recorded observations are in `tmp/phase7d/dProduction.json`. The owned production server was stopped after acceptance; port 3134 was free at handoff.

One actual production browser POST returned HTTP 200 and 18 completed events in **352 ms**, with **5,079 request bytes** and **37,060 response bytes**. This is a single local observation, not external LLM latency or a device-independent performance guarantee.

One local Node run of the 18-turn default example measured **298.0715 ms**, **35,520 serialised run bytes**, and a **2,418,088-byte heap delta** between snapshots. This is not peak process memory, a leak test, an LLM latency estimate or a cross-device benchmark. The browser export above is a different, pretty-printed workspace-bound record with longer identities, so its byte size is not a transfer-size comparison.

Review and focused red/green checks corrected identity/cancellation and provenance boundaries: the Next origin/Host convention, cancellation of a pending response reader, valid LLM attribution metadata, long graph provenance display references, asynchronous graph/import acceptance after edits/retries, and conflicting imported records reusing a known run ID. Final full-suite verification includes those fixes; independent review reported no remaining blockers.

The initial full regression identified one obsolete baseline Knowledge Graph UI copy assertion. It expected that no stakeholder simulation had run, which is false when displaying a real Phase 7D run. That assertion now checks the neutral statement, "This view does not retrieve documents or execute stakeholder turns." Its four focused UI tests and the final 435-test suite pass. This is a presentation expectation update, not a relaxation of simulation or provenance checks.

## Skills and tools actually applied

The implementation applied `writing-plans` to architecture and file ownership; `test-driven-development` to contract/orchestration and failing lifecycle/cancellation cases; `frontend-design` to the dark responsive timeline and inspectors; `systematic-debugging` to origin/Host behaviour and the obsolete copy assertion; `verification-before-completion` to the final command/browser ledger; and `requesting-code-review` / `receiving-code-review` to independent review and verified corrections. Installed Next.js guidance and existing provider conventions were inspected before integration.

Actual capabilities used were local PowerShell/Git/Node/TypeScript/Python, Playwright MCP for real application/API interaction and screenshots, and collaboration agents with separate file ownership. Official provider structured-output references are linked above. No additional research/retrieval engine, new dependency, live paid call or private provider-key inspection was required.

## Integrity and rebuild boundary

The existing MRT/AAC calculations, Census weights, citizen movement, building pipeline and Knowledge Graph renderer retain their owners. The unified building manifest SHA-256 stayed `5ab917ca747b51527868499c58ac6ecc21c82dd8897d3243ed9ff52ef0bfc32b`. Building assets remain internal local review only. Generated screenshots and diagnostics belong in ignored test-result paths. The small shared-file handoff is listed in the [Terminal 3 guide](PHASE7D_TERMINAL3_INTEGRATION_GUIDE.md); ignored artifacts and private environment files do not transfer through Git.

Final source-control audit retained branch `feature/synthetic-population` and HEAD `6c6fb831f72b79e47776417096997c5862fefee9`: five intended tracked edits and 23 new maintained files, with the Git index unchanged. `next-env.d.ts` was restored automatically by the production build. `.env.local` remains ignored and untracked; its contents were not read. No staging, commit, merge, rebase, reset, push or deployment occurred.

### Hackathon reconstruction sequence

1. Confirm competition rules for previously prepared data/documentation. Rebuild the input/evidence/role validators before UI, with at least one no-evidence and one invalid-reference test.
2. Recreate the six explicitly fictional role definitions and a sequential turn loop. Start with two roles/two rounds; validate each turn before appending it and bound memory independently of full replay history.
3. Add exact snapshot fingerprints and monotonic attempt acceptance before asynchronous HTTP or provider work. Test A → B → A and a late response after cancellation.
4. Add deterministic seed/assumption-sensitive rules and clear disclosure. Then build stored-event playback, inspection, two completed-run comparison and bounded JSON archives.
5. Add the one Phase 7E converter and graph projection. Reuse existing graph rendering; never imply a synthetic relationship is a measured causal effect.
6. Reuse provider adapters only after the deterministic vertical slice works. Keep public live calls disabled unless separately authorised; exercise the adapter with mocks first.
7. Repeat the final test/type/build/browser ledger after integration, including the preserved deterministic MRT/AAC calculations and citizens. No external building extraction or new database is needed for this phase.

With the application's existing Node 24 dependencies available, the focused core/API/graph tests follow the repository runner:

```powershell
node --test lib/contracts/tests/stakeholder-*.test.ts
```

For repeatable actual-page checks, `scripts/testing/phase7d-browser-check.mjs` exports `openStakeholderExample(page, origin)` and `recordStakeholderRun(page)`. Use a separately owned local port; the helper rejects port 3000 and captures the real endpoint result. It is test-only and makes no planner/provider call to prepare the deterministic example.

For a local HTTP demonstration, first start the application from this worktree on an owned free port. With port 3134 used only as an example:

```powershell
npm.cmd run dev -- -p 3134
```

In another Terminal 2 shell, create a valid request from the actual registered factory and send it without any provider key:

```powershell
New-Item -ItemType Directory -Force tmp | Out-Null
node --input-type=module -e "import fs from 'node:fs';import {createDemoInput} from './lib/stakeholder-simulation/roles.ts';fs.writeFileSync('tmp/stakeholder-request.json',JSON.stringify({version:1,attemptId:'cli-demo-1',input:createDemoInput()}));"
$response = Invoke-RestMethod -Uri http://127.0.0.1:3134/api/stakeholder-simulate -Method Post -ContentType application/json -InFile tmp/stakeholder-request.json
$response.run | Select-Object runId,status,@{Name='events';Expression={$_.events.Count}}
```

The response is actual bounded deterministic execution, not a canned transcript endpoint. Use a new attempt ID for another execution. Changing assumptions, selected roles or seed also changes the input fingerprint; a comparison must use the returned completed records rather than freshly invented summaries.

For an entirely no-provider UI demonstration, open General → Stakeholder simulation → Use ASEAN example (if needed), then start deterministic mode. The simulation entry does not require pressing the separate planner's Interpret action. Existing planner/AI features keep their independent configuration and cost policy; they are not needed for this deterministic slice.
