# Phase 7H + 7J integration checkpoint

Local verification: 29 October 2026. This is an **unstaged, uncommitted filesystem integration**, not a release. No paid inference, Git staging/history operation, branch synchronisation, push or deployment was performed.

## 1. Starting state and recovery

All three worktrees started and remain at `2900d0b77e54c5236da9a811181eec7117d14ea8` (`feat: integrate scenario experiments and stakeholder simulations`).

| Worktree | Branch | Initial maintained changes | Ownership |
|---|---|---:|---|
| `ImpactLens` | `master` | 14: 2 tracked / 12 new | Phase 7H; integration target |
| `ImpactLens-inference` | `feature/deepseek-simulation` | 12: 3 tracked / 9 new | Terminal 2's Phase 7J; read-only source |
| `ImpactLens-agents` | `feature/synthetic-population` | 0 | Read-only; no Phase 7I implementation found |

Initial expanded Git path sets matched the handoff reports; indexes were empty, with no unfinished operations or divergent history. Ordinary Git status abbreviates untracked directories; inventory checks use expanded paths, not directory counts. The H report's reference to integration with Phase 7I is historical handoff wording: this assignment integrates **7H and 7J only**.

External recovery snapshots, each containing `files/<relative path>`, `manifest.json` and `manifest.sha256`:

- Main H originals: `C:\Users\tetas\AppData\Local\Temp\impactlens-7h7j-main-recovery-pR8GO2` — all **14** copies verified.
- Inference J originals: `C:\Users\tetas\AppData\Local\Temp\impactlens-7h7j-inference-recovery-MsPWdL` — all **12** copies verified.

Manifests record branch, HEAD, initial status, tracked/untracked classification, byte size and SHA-256. Main's recovery directory also retains `additional-originals/` for the three baseline tracked files before J reconciliation and `transfer.json` for the reviewed transfer. `%TEMP%/impactlens-7h7j-state.json` records initial preservation hashes; `%TEMP%/impactlens-7h7j-final-inventory.json` records the current maintained scope. These are external recovery records, not commit content. No private environment file, raw source or ignored building chunk was copied into either narrow recovery snapshot.

## 2. Transfer and reconciliation

The exact initial inventories and final allowlist appear below. Nine J new files were transferred individually; all three J tracked modifications were inspected against their common baseline before copying. They did not overlap H's initial two tracked changes. **All 12 transferred J files remain byte-identical to the untouched source worktree.** No project directory, private environment file, dependency tree, cache or bulk dataset was copied.

H's workspace, question controller, hook, console, report projection and styles were extended in place. Original H reports/tests/context remain present. `package.json` and lockfile are unchanged; no dependency was added or installed. The roadmap preserves earlier phases and now distinguishes verified local integration from unverified paid provider compatibility.

## 3. Question-to-execution boundary

`lib/question-simulation/live.ts` exports `selectQuestionLiveDomain`, `prepareQuestionLiveInput`, `createQuestionLiveExecution`, `verifyQuestionLiveExecution` and `projectQuestionLiveGraph`. Scope is never treated as an execution domain.

| Question intent | Execution |
|---|---|
| Clear hypothetical Singapore ASEAN withdrawal | `asean` preset; actual frozen ASEAN assumptions and historical evidence converted by the existing experiment bridge |
| Clear hypothetical change to tax on imported goods | `import-tax`; rates, product coverage, exemptions, timing and foreign jurisdiction remain unknown |
| Singapore MRT proposal | `mrt` dialogue only after the existing geographic confirmation gate; native MRT calculation remains separate |
| Supported AAC proposal | Existing confirmed AAC calculator; no invented AAC live role preset |
| Polyclinic, housing grants, unrelated tax, ambiguous/mixed proposals or foreign-policy actor | Not simulated by these live presets; context/plot remains available |

Negation, descriptive questions and mixed policy actions reject conservatively. Lists such as imported goods **and products**, MRT endpoints and commuters **and residents** do not incorrectly reject solely because they contain “and”. This remains a finite heuristic, not general world-entity extraction.

The app explicitly selects live execution for standard **Start Simulation**. Unavailable live configuration or a provider failure never causes scripted substitution. A separate **Run scripted ASEAN demonstration** action deliberately invokes the retained version-1 engine. Internal legacy controller callers retain their explicit/default scripted compatibility. No mandatory experiment save, research form, editable assumptions, stakeholder selection or execution-mode form is introduced. Actual supplied preset assumptions are available as read-only disclosure after execution.

## 4. Contracts, identities and lifecycle

- Version 1 remains `{version:1, attemptId, input}` / `{version:1, attemptId, run}` and uses its existing parser.
- Live version 2 is `{version:2, attemptId, input}` / `{version:2, attemptId, run, inference}`. `inference-contract.ts` is browser-safe and separate from Node-only transport. `validateInferenceResponse` verifies exact keys, full input/run fingerprints, attempt identity, fixed requested/serving metadata, bounded diagnostics, nullable usage and aggregate consistency. V2 never enters the V1 parser.
- The server retains existing JSON/body streaming limits, origin checks, controlled HTTP errors and no-store responses before dispatch. The client caps inference bodies at 512 KiB and status bodies at 16 KiB; deadlines remain bounded even if a fetch implementation ignores abort.
- `LiveInferenceSession` in `inference-client.ts` preserves monotonic attempts and exact input acceptance. The controller rechecks revision, question, geometry, archive and cancellation after asynchronous work. Status refresh shares an in-flight status request; a failed refresh clears stale configured status.
- Frozen `QuestionLiveExecutionV1` keeps the original validated experiment and full Phase 7E handoff separately from the accepted V2 response. Saved execution stays `not-executed`. ASEAN uses the real experiment bridge. Generic/MRT preset configuration gets its own genuine digest while retaining full source input linkage; source identities are not relabelled as executed configuration identities.
- Generic/MRT participants receive question, declared unknowns, horizon, retained notes and schematic geometry identity/revision/summary. They do **not** receive invented journey metrics or inferred ridership. The full source snapshot stays attached to the client record. Rich non-ASEAN evidence requires a future explicit adapter and rejects safely today.
- Complete, partial, failed and cancelled returned records retain accepted events and diagnostics honestly. User cancellation rejects late responses rather than displaying a successful result. Four automatic session snapshots remain bounded; archive selection cannot relabel old output as current. Existing advanced validated export/import workflows remain available; the new question history itself is session-only.
- Native MRT and AAC retain their original response gates. Unified Cancel/archive selection also invalidates pending native requests. No routing, population weighting, accessibility formula, profile contract or provider implementation was recalibrated.

## 5. Provider status and cost

Server-only transport remains OpenRouter model `deepseek/deepseek-v4-flash-0731`, provider `digitalocean`, `only:['digitalocean']`, `allow_fallbacks:false`, `require_parameters:true`. No alternate provider or model is introduced.

`GET /api/inference/status` supplies a read-only connection disclosure. Configuration, enablement and serving verification are separate: **configured is not connected-and-verified**. No key is returned. The UI shows four configured fictional roles, two rounds, eight maximum completions, 800 output tokens/call, 15-second call and 120-second run deadlines, no retries and the soft USD 0.05 stopping threshold. The shared process gate allows two AI runs; permit cleanup remains intact. Attempt IDs are retained for 24 hours in a bounded process-local table, not durable/global idempotency.

Accepted diagnostics retain successful/failed calls, requested and gateway-reported serving identity, input/output/total tokens, nullable returned cost, configured role count, completed rounds and duration. Unknown cost is **Unknown**, never zero. The returned-cost threshold may overshoot by one call and cannot enforce a monetary cap when usage is absent; it is not a prepaid spending guarantee. Gateway serving metadata is not independent hardware attestation.

**No authenticated paid DigitalOcean/DeepSeek call was made.** Actual structured-output compatibility and real serving metadata remain unverified. No private configuration was modified or copied between worktrees.

## 6. Graph, report and renderer ownership

Accepted live execution projects through the existing experiment/stakeholder graph adapters and the one Cytoscape renderer. Sources, fictional roles, recorded events and previous-event references retain exact source/run lineage. Archived/live question graphs are standalone projections and do not attach unrelated current MRT/AAC results. Existing native result graphs remain available in their own validated context.

The console/report renders the selected immutable run, real accepted events, source replay dates, unknowns and diagnostics. `projectQuestionReport` also accepts validated inference metadata as a separate field; it does not turn usage into a societal metric. The UI currently renders the accepted snapshot directly rather than calling that DTO projector. LLM-mode records are labelled model-generated fictional interactions; V1 records retain deterministic-demo labels. Partial output is never described as completed analysis. Playback is recorded output, not fabricated streamed messages during the batch request.

Local reports omit unrelated foreign sections. Native MRT/AAC reports can recover a wording-only local scope after a geometry edit clears preparation, but only when the matching question has an accepted native result. No fake preparation/run is manufactured. International/cross-border reports retain domestic and foreign **questions to examine**, not asserted economic or diplomatic effects.

One persistent MapLibre map, one existing Three.js citizen owner, one active building extrusion system and the existing graph renderer remain. No second map, animation loop or entity extractor was added.

## 7. Automated verification

Commands ran sequentially in main on Windows. Final results after the last reviewed error-lookup fix:

| Check | Actual result |
|---|---|
| Full Node suite | **607 passed, 0 failed, 0 skipped** |
| Application `tsc --noEmit` | Passed |
| Explicit strict question/inference/stakeholder/server/route/test TypeScript | Passed |
| Production Next build | Passed |
| Existing Python GIS suite | **19 passed** using the existing isolated environment |
| Six model CLI regressions | All passed |
| Tracked and new-file whitespace | Passed; new files checked without staging |
| Secret / browser-bundle checks | Passed; no credential values printed |

The actual integrated count is authoritative; standalone H/J totals were not added. The final new regression first failed with an inherited function returned for an error code such as `constructor`, then passed after an own-property lookup guard. Expected deliberate red tests are not unresolved final failures.

Reproduction from main:

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
../ImpactLens-agents/tmp/phase7c1/venv/Scripts/python.exe -B -m unittest discover -s scripts/tests -p test_building_conflation.py
```

Explicit strict check (PowerShell):

```powershell
$checkFiles = @(Get-ChildItem lib/question-simulation,lib/stakeholder-simulation,lib/server/inference,lib/server/stakeholder-simulation -Filter *.ts -File | ForEach-Object FullName)
$checkFiles += @(Get-ChildItem lib/contracts/tests -File | Where-Object {$_.Name -match '^(question-|deepseek-transport|inference-live)'} | ForEach-Object FullName)
$checkFiles += @('app/api/inference/status/route.ts','app/api/stakeholder-simulate/route.ts')
npx.cmd --no-install tsc --ignoreConfig --noEmit --strict --target ES2023 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --skipLibCheck --types node --lib ES2023,DOM @checkFiles
```

Logs are external in `%TEMP%/impactlens-7h7j-validation/`: six named CLI logs, `gis-tests.log`, `accepted-tests.log`, `accepted-app-types.log`, `accepted-strict-types.log`, `accepted-build.log`, and the focused red/green error-lookup logs. PowerShell rendered Python's progress on stderr as a NativeCommandError-style record; Python exited successfully with `Ran 19 tests ... OK`. Git reports the existing LF→CRLF advisory for `workspace.tsx`; no raw file was normalised.

## 8. Real HTTP and production-browser acceptance

Owned loopback production ports 3159/3160 were used; existing servers on 3000/3148 were not stopped. `phase7hj-inference-preload.mjs` is opt-in test infrastructure only. It sets a process-local dummy key/enablement, blocks other external upstream fetches and supplies **one mocked completion per real transport call**. The real bounded engine, HTTP contracts, request guards, validators and graph/report path execute. Mock responses are not actual DeepSeek-generated content or provider verification.

| Scenario / failure | Observed result |
|---|---|
| Disabled live; missing key | Honest configuration error; no fabricated events. Actual missing-key API returned 503. Explicit ASEAN V1 demonstration remained available and recorded 18 scripted events. |
| ASEAN V2 | 8 accepted sequential calls/events, previous-event references; graph **40 nodes / 132 edges / 2 sources / 4 roles**. Sources retain historical replay labels and immutable lineage. |
| Import-goods-tax V2 | 8 calls/events including fictional foreign supplier; cross-border scope; graph **27 nodes / 80 edges / 0 sources / 4 roles**. Unknown rates/products/exemptions remain explicit. |
| Partial / soft-cost exhaustion | Two accepted turns plus one failed call retained as partial; separate cost fixture stopped after one accepted turn at returned USD 0.06. No completed claim or scripted replacement. |
| Unknown usage cost | Completed recorded output retained with cost Unknown. |
| Wrong serving provider, malformed structured JSON/reference, upstream failure | Controlled failed records/errors; no invented events. |
| Call timeout / retry | Actual delayed mock transport hit its call deadline after about **15,013 ms** with zero accepted turns; fresh attempt then completed. |
| Malformed V2 envelope / wrong attempt / wrong requested provider | Client rejected the result; no current run. Duplicate server attempt returned 409. Raw injected API-500 text was not displayed. |
| Cancel / question A→B→A / geometry edit / archive selection during held HTTP | Obsolete responses did not become current. Joint held MRT and live requests both remained invalid after Cancel. |
| Real plotted MRT | Explicit NS4/NE16 anchors and two segments gave **62.7667→13.50 modelled minutes**. Confirmed primary Start retained the native result and separately accepted MRT dialogue; graph **29 nodes / 90 edges**. No foreign-supplier preset was selected. |
| Real AAC at 1.287, 103.824 | **44,520 targeted / 6,230 comparable / 38,290 unlocated / 3,890 closer**; mean 410.44→347.46 m, zero newly covered at 500/1,000 m. Fresh final report showed local scope and native values without unrelated international sections. |
| Weighted MRT impact / calculated profile / no-key citizen chat | Actual payload retained **192,150 represented / 153,096.27 assigned and comparable / 39,053.73 unassigned**, 150 sampled profiles from 2,000 representatives; no-key fallback remained usable. |
| Plotted polyclinic | Not simulated; retained point, local context, zero stakeholder POSTs/events, no AAC substitution or healthcare forecast. |
| Pedestrian regression | About **4.787 m** rendered-root displacement over a five-second sample; exact sampled Pause/Reset; graph navigation retained one map. Visual loops remain independent of stakeholders. |
| Renderer / buildings | Fresh Tiong Bahru view showed one `sg-buildings-extrusion` layer and 1,868 rendered tile features at the sampled camera, not an inventory total; one MapLibre canvas. |
| Graph inspection / archives | Popup, expanded and full-window inspection, Escape/focus restoration, actual event/source relationships and original archived run context remained usable. |
| Responsive / fresh context | 1920×1080, 1440×900, 1024×900, 390×844 reports had no horizontal overflow. Final mobile graph inspector, source dialog and map controls inspected; fresh session had zero unexpected console/page errors. |

Deliberate API-500 testing produced its expected browser resource error in the failure session; it is not counted as a clean-session error. Temporary locator errors during acceptance were test-helper issues (hidden duplicate panels/implicit label matching), corrected without altering product behaviour. No production failure was hidden by changing the test expectation.

A separate fresh context also opened the **normal production server without the test preload**. Its actual safe status was `not-configured`, live disabled, serving verification false. Landing/General/map/source loading passed with one map, one extrusion system and zero page/console errors; zero stakeholder requests were posted. No paid execution was attempted in that normal session. Owned test servers were stopped after verification; the pre-existing 3000/3148 servers were left running.

Screenshots are ignored local artifacts in `test-results/phase7hj/`: `report-1920.png`, `report-1440.png`, `report-1024.png`, `report-390.png`, `final-desktop.png`, `final-status.png`, `final-graph-desktop.png`, `final-graph-mobile.png`, `final-map-desktop.png`, `final-map-mobile.png`, `final-sources-mobile.png`, `final-normal-production.png`. Desktop map, mobile map, report, source dialog and graph details were opened and inspected. Viewport counts are not full performance benchmarks.

To reproduce mocked browser acceptance, build first; start one owned server with:

```powershell
$env:PHASE7HJ_TEST_MODE = 'enabled' # alternatively disabled or missing-key
$env:PHASE7HJ_TEST_CONTROL_FILE = Join-Path $env:TEMP 'impactlens-7h7j-control.json'
Set-Content -LiteralPath $env:PHASE7HJ_TEST_CONTROL_FILE -Value '{"mode":"valid"}' -Encoding ascii
node --import=./scripts/testing/phase7hj-inference-preload.mjs node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3159
```

Use the actual Playwright browser with `phase7hj-browser-check.mjs` exports and the existing graph helper. The source header documents controlled transport failures/delay. Clear deliberate browser routes and restore valid control mode before the fresh-context test. Never use this opt-in preload as a real provider connection.

## 9. Independent review and corrections

Focused independent agents reviewed browser contracts/transport, domain/source linkage and report/control integration; root reviewed shared workspace and lifecycle changes. Confirmed corrections, with retained regression assertions:

1. Avoid scope→domain guessing; accept conjunction lists/endpoints while rejecting separate policies.
2. Preserve actual E source identities separately from generic/MRT preset configuration.
3. Strict V2 metadata/input checks, bounded response reads and deadline races; no cast-based acceptance or silent fallback.
4. Do not cancel a valid preparation through an overlapping manual status refresh; do clear stale status after refresh failure.
5. Cancel/invalidate native MRT/AAC alongside the question attempt, and guard asynchronous graph projection after archive/revision changes.
6. Render only finite local error messages, including unknown inherited-object property names; raw provider error strings stay out of report UI.
7. Restore native local report wording only for a matching accepted calculator result; distinguish configured fictional roles from actually completed calls, nullable cost and soft-cost overshoot.
8. Disclose actual automatic preset assumptions without reintroducing mandatory editable forms.

No confirmed blocking integration defect remains after these checks. Not every combination of browser, timeout and malformed run was repeated through a screenshot flow; the focused contract/session/controller tests cover the larger finite failure matrix. Actual paid provider compatibility is a separate unresolved verification requirement.

## 10. Preservation and scientific limits

All three private environment/example hashes and all **14 captured raw-input hashes per worktree** match their initial states. Main/agents' captured ignored building assets and source receipts also match the prior preservation inventory. J's missing ignored preview remains absent; nothing was silently copied there. Both external recovery manifests and every backed-up file verify. Inference's original 12 maintained hashes and exact dirty status are unchanged; agents remains clean. All indexes are empty, all three HEADs unchanged, no unfinished Git operation.

Unified manifest remains `5ab917ca747b51527868499c58ac6ecc21c82dd8897d3243ed9ff52ef0bfc32b`: **234,739 footprints / 1,119 chunks**, `local-review-only`, loopback-restricted. Public demonstration/redistribution remains uncleared; source attribution, unknown HDB acquisition provenance, incomplete coverage, residual overlaps and mixed/mostly illustrative heights remain. No Overture acquisition or extraction was repeated.

Evidence is a narrow historical replay, not live retrieval. Stakeholders are fictional roles with no population weights; scripted output is not live AI. LLM output is not a poll, causal finding, economic/diplomatic forecast or verified institutional action. No Phase 7I extraction, GraphRAG retrieval, demographic swarm or full AI research/report engine was implemented. Existing Census 2020 totals/byte sensitivity, assumed demand/MRT timing, limited AAC historical/proxy/unlocated/capacity caveats and missing calculated-population trajectories remain. Pedestrians/buildings are not evidence of individual homes or scenario reactions.

## 11. Separately authorised paid smoke test — not executed

Only after explicit provider-call and spending authorisation, use the owner's existing local key and explicit `STAKEHOLDER_LIVE_ENABLED=true` without copying secrets or overwriting `.env.local`. Prepare two fictional roles, one round, maximum two completions, fresh attempt ID, fixed model/provider routing and no retries using the existing factory/parser. Inspect accepted structured actions, gateway model/provider, deadlines, tokens and returned cost. The existing soft USD stopping threshold is **not** a hard financial ceiling; obtain a separately approved spending ceiling and appropriate gateway/account control before starting. A second round requires remaining authorised budget. Never equate gateway metadata with independent hardware attestation. No code or credential change to enable paid access was made here.

## 12. Proposed future Git checkpoint — approval required

Main final scope is **40 maintained paths: 5 tracked modifications and 35 new files**. Exact allowlist follows. Suggested future message: `feat: integrate question-first DeepSeek stakeholder execution`.

Do not execute this proposal without separate approval. Recheck exact current hashes/scope and rerun verification if code changes. Stage only the reviewed allowlist, inspect index/credentials/whitespace, then make an ordinary checkpoint commit. Before later synchronising inference, make a fresh verified external backup of its original 12 dirty paths; classify any intentional differences, reconcile only those reviewed 3 tracked / 9 untracked paths, verify ancestry/cleanliness and fast-forward only. The clean agents branch can be considered separately after its own recheck. Never force/reset/clean ignored assets. No push or deployment is proposed.

Excluded: private env/credentials, `.next`, dependencies, logs, `tmp`, test screenshots/recordings, Python environments/caches, raw downloads, generated population/catalogues and bulk public geography. The Git checkpoint alone would not transfer ignored building assets or grant public-use rights.

Skills/tools actually applied: worktree preservation, architecture/planning, TDD red→green, systematic debugging, parallel independent review and verification-before-completion; local Git read-only inspection, PowerShell/Node/TypeScript/Python, actual Playwright MCP browser/HTTP interaction and image inspection. No remote Git operation, database, service dependency or public hosting was introduced.

## 13. Exact inventories

The path lists below are generated from the recorded initial expanded inventories and the final filesystem/Git inventory; they are not staging commands.

### Original Phase 7H - 14 paths

```text
components/question-console.css
components/question-console.tsx
components/use-question-simulation.ts
components/workspace.tsx
docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md
docs/PHASE7H_QUESTION_FIRST_UX_IMPLEMENTATION.md
docs/PHASE7H_TERMINAL3_INTEGRATION_GUIDE.md
lib/contracts/tests/question-context.test.ts
lib/contracts/tests/question-report.test.ts
lib/contracts/tests/question-simulation-client.test.ts
lib/contracts/tests/question-ui.test.ts
lib/question-simulation/client.ts
lib/question-simulation/context.ts
lib/question-simulation/report.ts
```

### Original Phase 7J - 12 paths

```text
app/api/inference/status/route.ts
docs/PHASE7J_DEEPSEEK_LIVE_INFERENCE_IMPLEMENTATION.md
docs/PHASE7J_TERMINAL3_INTEGRATION_GUIDE.md
lib/contracts/tests/deepseek-transport.test.ts
lib/contracts/tests/inference-live.test.ts
lib/server/inference/deepseek.ts
lib/server/inference/service.ts
lib/server/stakeholder-simulation/service.ts
lib/stakeholder-simulation/contract.ts
lib/stakeholder-simulation/engine.ts
lib/stakeholder-simulation/inference-input.ts
lib/stakeholder-simulation/inference-roles.ts
```

### Final proposed tracked modifications - 5 paths

```text
components/workspace.tsx
docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md
lib/server/stakeholder-simulation/service.ts
lib/stakeholder-simulation/contract.ts
lib/stakeholder-simulation/engine.ts
```

### Final proposed new maintained files - 35 paths

```text
app/api/inference/status/route.ts
components/question-console.css
components/question-console.tsx
components/use-question-simulation.ts
docs/PHASE7H_7J_INTEGRATION_CHECKPOINT.md
docs/PHASE7H_QUESTION_FIRST_UX_IMPLEMENTATION.md
docs/PHASE7H_TERMINAL3_INTEGRATION_GUIDE.md
docs/PHASE7J_DEEPSEEK_LIVE_INFERENCE_IMPLEMENTATION.md
docs/PHASE7J_TERMINAL3_INTEGRATION_GUIDE.md
docs/superpowers/plans/2026-10-28-question-live-inference-integration.md
lib/contracts/tests/deepseek-transport.test.ts
lib/contracts/tests/inference-live.test.ts
lib/contracts/tests/question-context.test.ts
lib/contracts/tests/question-inference-report-ui.test.ts
lib/contracts/tests/question-live-contract.test.ts
lib/contracts/tests/question-live-controller.test.ts
lib/contracts/tests/question-live-graph.test.ts
lib/contracts/tests/question-live-mapping.test.ts
lib/contracts/tests/question-live-session.test.ts
lib/contracts/tests/question-report.test.ts
lib/contracts/tests/question-simulation-client.test.ts
lib/contracts/tests/question-ui.test.ts
lib/question-simulation/client.ts
lib/question-simulation/context.ts
lib/question-simulation/errors.ts
lib/question-simulation/live.ts
lib/question-simulation/report.ts
lib/server/inference/deepseek.ts
lib/server/inference/service.ts
lib/stakeholder-simulation/inference-client.ts
lib/stakeholder-simulation/inference-contract.ts
lib/stakeholder-simulation/inference-input.ts
lib/stakeholder-simulation/inference-roles.ts
scripts/testing/phase7hj-browser-check.mjs
scripts/testing/phase7hj-inference-preload.mjs
```

### Integration-only additions - 14 paths (subset of the allowlist above)

```text
docs/PHASE7H_7J_INTEGRATION_CHECKPOINT.md
docs/superpowers/plans/2026-10-28-question-live-inference-integration.md
lib/contracts/tests/question-inference-report-ui.test.ts
lib/contracts/tests/question-live-contract.test.ts
lib/contracts/tests/question-live-controller.test.ts
lib/contracts/tests/question-live-graph.test.ts
lib/contracts/tests/question-live-mapping.test.ts
lib/contracts/tests/question-live-session.test.ts
lib/question-simulation/errors.ts
lib/question-simulation/live.ts
lib/stakeholder-simulation/inference-client.ts
lib/stakeholder-simulation/inference-contract.ts
scripts/testing/phase7hj-browser-check.mjs
scripts/testing/phase7hj-inference-preload.mjs
```
