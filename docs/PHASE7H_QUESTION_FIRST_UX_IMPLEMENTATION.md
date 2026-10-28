# Phase 7H — Question-first simulation UX

Terminal 1, starting clean on `master` at `2900d0b77e54c5236da9a811181eec7117d14ea8`. All changes are unstaged and uncommitted. No Phase 7I extraction or Phase 7J provider activation is implemented.

## Product flow and architecture

The landing keeps the live miniature map and presents one question, optional example prompts/drawing and **Start Simulation**. Simulation, Map, Knowledge Graph and Report navigation replace primary intervention-category navigation. Simulation uses a readable recorded-event list; Report uses recorded inputs, native calculator results, evidence references and explicit unknowns. Raw IDs and full scope JSON are secondary disclosures.

`QuestionConsole` is a bounded text/React presentation. `useQuestionSimulation` owns one browser controller. `lib/question-simulation/client.ts` automates deterministic planning, replay evidence, actual geometry snapshot, immutable experiment creation, existing Phase 7E→7D conversion, existing bounded stakeholder request session and verified linked-run creation. No manual research focus, roles, seeds, rounds, evidence choice or Save step is needed. Existing experiment lab, scripted workspace, export/import, comparisons and advanced controls remain available through the secondary map/developer workflow.

The controller has idle/interpreting/preparing/executing/completed, unsupported, map-review, cancellation and failure states. Duplicate starts share the active attempt; every asynchronous stage checks revision/attempt ownership. A whole-pipeline deadline also covers stalled preparation. Editing questions/geometry clears current outputs, including A→B→A. Four frozen terminal snapshots remain session-local; archive inspection cancels pending work and is labelled separately. No archive becomes a current simulation automatically.

The persistent MapLibre instance and Three.js layer are retained. Map content is hidden/paused outside its relevant view, rather than replaced. The existing MRT/AAC editors, confirmed anchor/order/site checks, timing assumptions, result guards, demographics and illustrative pedestrian loops are reused. A retained *non-executed* interpretation survives plot edits; execution/results do not. This distinction fixes the browser-discovered loss of MRT anchor controls after drawing.

## Scope and capability gates

`classifyQuestionContext`/`parseQuestionContext` expose a strict, bounded version-1 contract with full canonical identity, scope, finite intent, provenance, explicit jurisdiction mentions, candidate entity *types*, assumptions and missing questions. This is deterministic heuristic classification, not entity extraction. ASEAN never expands into invented member-country lists. A country mention does not establish an affected country. Unclear cases remain provisional.

MRT, polyclinic and local neighbourhood facilities prioritise local analysis. Imported-goods taxes, shipping, foreign-worker rules and headquarters questions can indicate cross-border pathways. Ambiguous import tax is explicitly provisional: GST, excise, specific duties and tariffs are different possibilities; no universal tariff, rate or effect is inferred. Foreign actors are supported as contextual mentions, not forced Singapore-only entities.

Only narrow proposed **Singapore ASEAN withdrawal** questions execute the existing immediate/unresolved/five-year, three-round deterministic demonstration. Foreign-country withdrawal, negation/staying in ASEAN, definitions and mixed unrelated policies do not run that script. The engine produces fictional recorded turns, not DeepSeek inference, public opinion or economic forecasts. ASEAN evidence remains the small historical checked-source replay.

MRT/AAC require their existing confirmed geographic inputs; unconfirmed drawings stop at map review. Valid existing confirmations can use the original calculation pathway. Polyclinic never substitutes AAC. Unsupported tax, healthcare and local-amenity questions prepare immutable context and show **Not simulated**, with no invented turns or benefits.

## Report and graph boundary

The visible report distinguishes recorded synthetic statements, actual native MRT/AAC values, hypothetical inputs, heuristic scope, historical sources and unknown outcomes. Domestic/international sections are conditional: local scenarios omit generic global effects, cross-border/international scenarios expose research questions rather than claimed effects. Undetermined scope does not automatically require an international section. Failed/unexecuted preparations are not completed analyses.

The independent `projectQuestionReport` validates recorded stakeholder run fingerprints and caller-bound native MRT/AAC payloads. It introduces no numerical impact calculation. Its typed sections/classifications are available for Phase 7I integration; current UI renders the same underlying accepted records directly. See the integration guide for exact interfaces and caller-binding responsibilities.

Existing Cytoscape rendering and three inspector levels are reused. Both primary graph navigation and the simulation graph action project the accepted linked run. Archived graph projection uses its own saved record and identity. The interface explicitly says world-entity extraction is not enabled and missing extracted entities are not zero relevant entities. No fabricated world graph or second renderer was added. Phase 7I should supply validated identity-bound entities; Phase 7J should independently activate real inference later.

## Verification and observed fixes

- Full Node suite: **548 passed, zero failed/skipped**, retaining the previous tests. Focused scope/report/controller/React UI suite: 27 passing.
- All six MRT/population/eldercare commands passed sequentially. The sandbox denied the existing ignored eldercare catalogue during preparation; the authorised normal-permission retry passed.
- Application TypeScript and production build passed. Existing GIS suite: **19 passed**, using the existing environment read-only with `-B`. No Overture acquisition or extraction occurred.
- `git diff --check` passed. Raw tracked data have no diff; unified manifest retains SHA-256 `5ab917ca747b51527868499c58ac6ecc21c82dd8897d3243ed9ff52ef0bfc32b`. No environment, dependency, engine, demographic-weight or building-asset edit occurred.
- Independent review caught cleared confirmation bindings on Start, inconsistent graph entry points, stale-question presentation, and overly broad foreign/negated ASEAN gating. Those were corrected. A new UI assertion initially counted scope-list items as events; it now counts actual `data-event-id` rows.

Actual Playwright used the main-owned development server on port 3000 and an independently owned loopback production acceptance server on 3148. The pre-existing server was never terminated. No paid provider call was used: planning is local deterministic selection and execution mode is explicitly scripted.

Observed browser outcomes:

- One question + Start produced **18 actual recorded ASEAN events**, without mandatory forms or manual snapshots. Report preserved fiction/replay labels; Knowledge Graph showed the linked run and provenance.
- Import-tax preparation showed cross-border scope, unknown tax mechanics, no invented affected company/country, **Not simulated** and zero agent turns. Polyclinic preparation was local, with no international padding or healthcare outcomes. The exact Tampines facility wording was corrected after browser inspection and regression-tested as local.
- Real MRT plotting, explicit NS4/NE16 anchors and service confirmations returned **62.77→13.50 modelled minutes**, shown in Report. Real AAC returned **6,230 comparable / 38,290 unlocated**, also shown in Report. Calculators and formulas were unchanged.
- Controlled delayed ASEAN execution followed by Cancel left zero current events. Automated tests additionally cover timeout, retry, malformed response, A→B→A, geometry revisions, archive selection and StrictMode disposal. Not every automated race variant was separately repeated in the browser.
- Report layouts at **1920×1080, 1440×900, 1024×900, 390×844** had no horizontal overflow and retained one map canvas. Screenshots `test-results/phase7h-report-*.png` were captured; mobile was opened and inspected. No FPS claim is made.

## Limits, preservation and reconstruction

World extraction, live inference, demographic-grounded swarm behaviour and full AI reporting remain future work. Scope is a finite heuristic, not exhaustive geopolitical understanding. Automatic run history is session-only; the existing validated experiment/run export/import tools remain the durable path. Geographic calculations still need scientifically necessary confirmation; a natural-language question cannot establish rail connectivity or care capacity.

The Phase 4 true-trajectory gap remains: pedestrians are independent authored illustrative movement, not scenario-responsive synthetic population travel. AAC retains four corroborated historical points, proxy origins and explicit unlocated residents. Building data remain internal `local-review-only`, loopback-restricted and subject to existing source/licence limitations.

Rebuild: implement the bounded context contract and narrow gates first; reuse the experiment bridge and existing execution session; add the one-question controller; compose navigation around the persistent map and graph; project only accepted records into reports; test stale responses and actual geography confirmations. Skills/tools used: frontend-design, TDD, systematic debugging, independent parallel review, TypeScript/Node, Playwright MCP and local screenshot inspection. No new framework or service dependency was introduced.

Exact maintained path inventory and future integration instructions are in `docs/PHASE7H_TERMINAL3_INTEGRATION_GUIDE.md`. Terminal 3 should reconcile these unstaged files with Terminal 2's separate Phase 7I work; this phase grants no Git mutation or deployment permission.

Final clean-context production check after the local-scope correction: exact Tampines question local, no international section, no events, one map canvas, zero page/console errors. Final landing screenshot was inspected (`test-results/phase7h-final-landing.png`); source/copyright controls remain visible. Local source layers remain asynchronous; no new building-readiness/performance claim is made. Archived reports suppress unrelated current calculator props.
