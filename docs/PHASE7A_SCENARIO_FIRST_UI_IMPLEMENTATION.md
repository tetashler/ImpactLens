# Phase 7A — Map-first scenario experience

Validated locally on 28 October 2026, starting from clean main `master` at `4400f47268663a848ca59d55c6f140dda80c97cc`. This is a pre-hackathon learning prototype. No Git staging/history operation, private environment edit, new dependency or simulation-formula change was made. All 14 raw-input SHA-256 values match the pre-task snapshot.

## Experience and visual composition

The homepage now opens on live miniature Singapore with **What if...?** on the right, instead of the technical three-column editor. The local HDB geometry is the visual centrepiece. A 120 px decorative gradient blends the map into a navy composer; it has `pointer-events:none`. Only actual controls capture interaction. Branding and a few map controls float over the geography. Existing source attribution, schematic rail and illustrative-height labels remain visible or available in Map layers.

At 1440×900 the measured canvas/composer widths were approximately **1066/374 px**; at 1920×1080 they were **1440/480 px**. The composer has a 360 px minimum where space permits, rather than an unusably narrow fixed percentage. The 1024 px check retained a 664 px map and 360 px composer. At 390×844, a 300+ px upper map area and readable lower composer replace the desktop split. Examples become compact two-column buttons; the page scrolls normally. No custom gesture sheet or horizontal document overflow was introduced. Mobile planning keeps a bounded, scrollable interpretation with its configuration action reachable; keyboard labels, focus indicators, cancel controls and numeric location inputs remain available.

The four examples populate input only: MRT stations between Choa Chu Kang and Sengkang, an AAC in Bukit Merah, a Sengkang polyclinic, and Singapore leaving ASEAN. Submit is a separate action. The conversation shows the submitted user question, an actual pending state and a validated interpretation. It does not invent an assistant conversation. Enter allows multiple lines; Ctrl/Cmd+Enter submits. Category hints are optional, do not enable capabilities and invalidate previous assessment when edited. User and model text is rendered as React text, never executable HTML.

## Map ownership, opening camera and buildings

`Workspace` retains one `SingaporeMap` at the same React tree position across composer, configuration, calculation, results and legacy workspaces. Responsive CSS changes its container; the existing ResizeObserver updates MapLibre. No second map engine, Three.js renderer or animation loop is added. The map starts independently of the MRT catalogue: empty display-only network inputs are replaced by the actual API catalogue without remounting. Calculation remains disabled until the real catalogue exists. A held-network browser regression proved the map appears before that request is released and retains its canvas afterward.

The opening camera is `[103.829,1.285]`, zoom 15.65, pitch 52°, bearing −22°, over supplied Tiong Bahru HDB geometry. A spatial reconnaissance of the existing file found about 151 footprint bounding-box centres within 500 m and 269 within 1 km of `[103.829,1.285]`; these are rough geometry-density checks, not buildings occupied or residents. The previous load-time country fit was below the 11.5 building visibility threshold and prevented the layer from loading initially. Removing that override makes the existing source load at startup. Fit Singapore remains available, with a lower-pitch country view; Reset view returns to the neighbourhood. Opening MRT configuration frames the network, while AAC uses its existing focus behaviour.

The unchanged source contains **13,436 HDB footprints**, approximately **23.53 MB**, with uniform **illustrative 12 m** extrusions. It is incomplete building coverage with no surveyed heights. Geometry/coordinates are not fabricated or replaced. Loading is asynchronous, so the city can briefly appear before footprints; a visible loading indicator explains this, and failure clears that indicator while retaining geographic navigation. Browser diagnostic samples reported 317 rendered building features at 1440 px, 417 at 1920 px and 102 at 390 px. These are viewport rendering features, potentially split by tiles, not an inventory or performance benchmark. Screenshots confirm visible extrusions. No FPS/GPU or cold-load benchmark was claimed.

Map effects are guarded by the identity of the map that actually finished loading. This fixes an observed development hot-reload/StrictMode error where a retained `ready` flag applied layout properties to a newly created, unloaded style. Cleanup still removes the owned map, observers, AAC resources, popups and citizen layer. Landing clicks explore only. MRT Calculate/Results are read-only for station editing; explicit Configure restores editing. Citizen controls open their inspector rather than hiding the proposal behind an editor. The WebGL fallback applies the same editing guard; a forced no-WebGL browser check retained an actual result after clicking a station in read-only mode.

Phase 7C remains pending: building source/licence audit, comprehensive coverage, verified heights and possible spatial tiling require separate work. This phase only improves the camera, loading and presentation of existing assets.

## Planner contract and lifecycle

`lib/scenarios/client.ts` is a browser-safe external store, wrapped by `useScenarioPlanner`. It calls the real local **POST `/api/scenarios/plan`** on explicit submit. Requests use exactly version, unique `clientRequestId`, question and optional category/user map points. `parseScenarioRequest` validates before HTTP; the response passes `await parseScenarioResponse(json, submittedRequest)` before entering state. The client enforces the contract's request-byte/question and response-byte limits, including bounded streamed JSON reading. It returns controlled errors for malformed JSON, correlation/hash failures, transport failures, 400/403/409/413/415/429 and other failures, without echoing upstream messages.

The contract's token, server request ID and content-derived plan ID retain their distinct meanings. Complete question/category/ordered-point identity, a monotonic revision, attempt number and active controller are checked after asynchronous validation. Editing, selecting another example, superseding, reset and opening workspaces invalidate old work even if cancellation is ignored. A→B→A cannot restore the first A response. No automatic retry or cross-provider switch occurs.

The plan panel uses the actual registry and `SCENARIO_PROVIDER_NOTICES`. It labels a plan as **Plan only / not executed**, shows current capability/availability, supported and unsupported outcomes, inputs to confirm and optional assumptions/identity disclosures. The provider notice is visible immediately. Deterministic fallback is not labelled AI-generated. No client credentials or server AI/facility/population loaders are imported.

| Capability | Frontend handoff |
|---|---|
| `mrt-accessibility-v1` | Configure MRT scenario; complete exact stations, interchange and service/demand assumptions |
| `aac-accessibility-v1` | Place your proposed centre; limited-area AAC editor and explicit access assumptions |
| `stakeholder-exploration-v1` | Planned capability, synthetic exploration requirements only; no Run action |
| `evidence-exploration-v1` | Research questions, evidence needs and uncertainty; no retrieval or quantitative executor |

The v1 plan always requires confirmation, remains `not-executed` and cannot be `ready`. Plan identity is not a calculation ID. Polyclinic questions never use the AAC engine; ASEAN questions produce no opinion percentages. No evidence is claimed to have been gathered. Optional user map points remain unconfirmed suggestions, shown in context rather than silently applied to an editor. The composer does not yet offer its own map-point capture UI; actual geographic input is gathered in the existing configuration editors.

## Guided configuration and result navigation

The visible flow is **Question & plan → Configure → Calculate → Results**. Clicking a supported handoff explicitly starts a fresh relevant intervention and clears its old outputs. It never executes an engine or derives coordinates/timings from prose. MRT starts with zero stations, prompts for anchors/ordered stations and puts segment/service controls behind **Advanced MRT settings**. Defaults are explicitly labelled assumed. The illustrative line is available only through **Load illustrative example**. Review journey & calculate opens the existing origin/destination/service-date controls and Run simulation action. A successful comparison scrolls into view; **Explore demographic impact** opens the preserved weighted calculation/dashboard/profile interface.

AAC configuration reuses `useAacScenario`, `createDefaultEldercareRequest`, catalogue parsing and the actual eldercare simulation response validator. Calculate AAC Impact opens loading/errors/results without duplicating accessibility calculations. Edit location & assumptions returns to settings; moving a marker clears obsolete results. Four corroborated historical AAC markers, the geographic radius, two source-provided proxies and weighted unknown-origin handling remain unchanged.

Question & plan retains the in-progress draft and offers **Resume MRT/AAC configuration** while composer inputs remain untouched. Returning to the composer clears calculated outputs; the UI explicitly asks for recalculation after review. Any question/category/point edit or new submit removes resume, including an edit followed by a reversion. Start new scenario clears planning/result context. The **Open workspaces** entry preserves the complete existing MRT/AAC tools and independent mode state; it is not the landing screen. Configure resets citizen/baseline inspection to the editable journey network and stops playback. The current calculated result, its demographic/AI context, and an independent illustrative city are not conflated.

## Files

New: `components/scenario-composer.tsx`, `scenario-plan-view.tsx`, `scenario-plan-view.css`, `scenario-experience.css`, `use-scenario-planner.ts`; `lib/scenarios/client.ts`, `presentation.ts`; `lib/contracts/tests/scenario-client.test.ts`, `scenario-presentation.test.ts`; `scripts/testing/phase7a-browser-check.mjs`; this report and the implementation plan in `docs/superpowers/plans/`.

Modified: `components/workspace.tsx`, `components/singapore-map.tsx`, `components/eldercare-panel.tsx` (optional calculation-navigation callback), `app/layout.tsx` (metadata), README and the existing central roadmap. No package/lockfile, API route, provider adapter, raw file, routing/accessibility formula, expansion weight or v1 citizen contract was changed.

## Verification

**266 automated tests passed, zero failed**: all 245 retained plus 16 planner-client/lifecycle and 5 presentation/React SSR tests. Tests exercise exact real-contract envelopes and hashes, all provider notices, byte/shape/stream bounds, invalid inputs, no-key behaviour, stale success/error/reset/A→B→A cases, example request construction, browser import boundaries, finite navigation actions, no false readiness, research/planned limits and escaping hostile strings. No paid AI call occurs in tests.

Sequential regression commands passed:

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

Strict NodeNext checks also passed for the new client/presentation helpers and test files using the installed compiler with `--ignoreConfig --noEmit --strict --skipLibCheck --types node --target ES2022 --module nodenext --moduleResolution nodenext --allowImportingTsExtensions`. App TypeScript covers TSX and the map. The production build preserves all eleven existing API routes, including the real planner. Test/build preparation hooks were run sequentially. Eldercare preparation hit the known sandbox EPERM on its ignored derived catalogue; rerunning that authorized command with the required execution permission passed. Raw input hashes were unchanged.

### Actual Playwright acceptance

The main-worktree port-3000 Next dev process was initially identified by its command line. It disappeared across the daemon restart; port absence was checked before starting an owned `npm.cmd run dev` there. No other process/worktree was stopped. Its public AI status reports no selected provider. Real local planning and calculation APIs were used. Route interception forwarded real requests for inspection/delay, or deliberately supplied bounded failures/corruptions; it did not replace ordinary execution with fixtures.

| Flow | Result |
|---|---|
| Landing, 1440×900 / 1920×1080 | Live HDB buildings and right composer; approximate 75/25 layout, no initial technical editors, one canvas |
| Tablet, 1024×900 | Readable 360 px composer; real panning through the gradient seam and wheel zoom changed recorded camera; zero horizontal overflow |
| MRT | Real planner accepted correlation/hash; fresh empty editor → actual anchor selection/map station placement → timing edit → journey → demographic dashboard/profile. Separate illustrative example regression retained 360 s / **21.00 min** |
| AAC | Real planner → location/demo → actual API output: **44,520** age-targeted, **6,230** comparable, **38,290** unlocated, **3,890** closer, approximately **410.44→347.46 m**; zero new-within gain remains valid |
| AAC edits | Drag immediately removed report; rerun changed fingerprint. Mobile map click placement, source-labelled popup, demo calculation and unknown-origin result verified |
| Unsupported | Polyclinic: evidence-planning only. ASEAN: planned stakeholder route. Neither offered a calculation action or fabricated findings |
| Planner races | Delayed response after edit, different example, A→B→A, reset, workspace entry and category change was rejected. Wrong token/hash was rejected |
| Navigation | Back/resume retained four-station draft and same canvas; input edit removed resume; Configure restored proposal pins after both citizen-tab and map-control navigation |
| Existing tools | Weighted dashboard and calculated profile loaded; honest no-key AI state; **180** illustrative citizens, play clock advanced to 00:00:01, Pause/Reset returned 00:00:00; independent MRT draft retained across AAC switch |
| Security/failures | Hostile image/script-like input remained text with no image or executed flag; controlled 503 did not expose injected upstream detail; a validated AI-assisted envelope fixture used the same UI parser/notice |
| Fallback | Forced WebGL unavailable in an isolated test tab: actual MRT calculation worked; read-only fallback station click retained four stations and result |
| Narrow, 390×844 | Visible upper map, examples/plan/configuration usable, map placement and AAC results worked, popup fit, no horizontal overflow |

The opt-in browser module exports `landing`, `plannerRaces`, `guidedNavigation` and `mapBeforeNetwork`. Invoke on a real local Playwright Page; for MCP runtimes without dynamic import, read the trusted file and evaluate its function definitions without ESM `export`. Other actual acceptance interactions are described in the table. Screenshots were captured and visually inspected, including the gradient, building geometry, narrow composer and source popup.

Ignored local evidence: `test-results/phase7a-landing-final.png`, `phase7a-landing-first.png`, `phase7a-landing-1920.png`, `phase7a-tablet.png`, `phase7a-mrt-results.png`, `phase7a-aac-results.png`, `phase7a-polyclinic.png`, `phase7a-asean.png`, `phase7a-mobile-landing.png`, `phase7a-mobile-plan.png`, `phase7a-mobile-placement.png`, `phase7a-mobile-results.png`, plus CLI/test/build logs. Screenshots/logs are not staged. Some screenshots show intermediate iterations; the final landing screenshot records the final source. Deliberate 503 and forced-WebGL tests produced expected resource/renderer errors. The final fresh unmocked 1440×900 page recorded **zero console/page errors**, one canvas, 317 rendered building features and zero horizontal overflow.

Independent review found and resolved fallback read-only editing, returning from citizen/baseline view, draft resume and the Configure-stage Citizens control. Real browser regression cases cover those paths. The observed hot-reload map readiness failure was also fixed and rechecked. No live Gemini/OpenRouter call was made; AI-assisted status was checked with a validated envelope fixture and existing adapter tests remain passing. This is not renewed live-provider compatibility verification.

## Limits and reconstruction

This is a question-to-plan interface for two existing engines, not a universal predictive platform. Preserve Census 2020 and its national rounded-leaf discrepancy, assumed MRT demand/times and schematic rail links. Preserve the four historical AAC subset, unknown current opening/capacity, two public landmark proxies, age-only eligibility and large unlocated population. Straight-line proximity does not establish walking access, attendance, allocation, health or causal effects. Calculated citizens still lack justified individual geographic trajectories; illustrative movement stays separate. Phase 7C building fidelity, Phase 7D stakeholder execution, Phase 7E broader unified results and live OpenRouter authentication remain pending.

Rebuild during the hackathon: (1) establish permitted data and existing validated engines/APIs; (2) add the browser-safe planner contract/client race tests; (3) keep one map mounted and choose a camera supported by the supplied footprints; (4) add a responsive composer and non-interactive gradient; (5) render finite plan semantics/availability; (6) hand off explicitly to the existing editor and keep calculation separate; (7) add Back/resume/new-scenario ownership and clear stale output; (8) run the sequential commands and desktop/mobile/unsupported/race checks. Follow actual competition rules on reuse. Relevant tools/skills: Playwright MCP, official MapLibre API documentation, installed Next.js docs/types, local TypeScript/Node tests, frontend-design, architecture planning, TDD, parallel scoped implementation, systematic debugging, independent review and verification. No new service, database, hosted deployment or external data download was needed.
