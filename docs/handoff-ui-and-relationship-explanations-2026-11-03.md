# Handoff: UI redesign and relationship explanations (2026-11-03)

## Repair follow-up (Codex, 2026-11-03)

This section supersedes the original unresolved findings below; the original observations remain for traceability.

- **Run B's cause is confirmed:** the second social-model request returned HTTP 429 / `AI_RATE_LIMIT`. The service persisted that failure and stopped as designed, but replaced its cause with `SOCIAL_FATAL`; the coordinator consequently reported generic `OPERATION`. The first accepted decision remains intact. This is evidence of a rate-limited gateway/provider request, not proof that an upstream model executed it.
- All five saved journal frames were hash-audited, replayed and projected through the current graph successfully (64 nodes, 299–308 edges). No graph validation error caused that particular stop. The original run, job, journal and checkpoint were not rewritten, and no paid requests were repeated. Its historical job therefore still says `OPERATION`.
- Future failures retain a finite typed cause through the service, managed job, public parser and UI. Rate limiting, timeout, credits, unavailable service, cancellation and uncertain requests have separate public reasons. Accepted work and uncertain usage reservations remain preserved; no automatic retry was added. Existing provider-identity failures also retain their classification.
- Private diagnostics now retain only an allowlisted stage, code and error type; raw exception text, stacks, provider payloads, prompts and paths are excluded. The public job projection does not expose these diagnostics. A secondary settlement failure is recorded separately.
- **A separate graph crash was reproduced and repaired:** otherwise-valid actor names, topics and platform names containing angle brackets could violate the stricter derived edge-detail contract. Display strings now normalize forbidden controls and brackets, omit empty optional fields and use bounded required fallbacks. Source labels, relationship IDs and summary-cache labels remain unchanged. Lookup tables also reject inherited object keys.
- **Nested metadata validation is repaired:** both citizen projection and the browser DTO parser validate the aggregate relationship allowlist recursively. Unknown nested fields, raw content fields, invalid counts, oversized metadata and inconsistent stance totals are rejected. Legacy links without detail and the existing 256 KiB citizen summary cap remain supported.
- Recorded social interactions are now exercised through accepted decisions in the production reducer, public summary and entity graph, including a `Where` explanation and saved-world restoration. This is deterministic offline integration coverage, not a claim of another paid live run.
- **Reload recovery is repaired:** the app already had durable browser references and passive server restoration, so the original in-memory-only description was inaccurate. The initial accepted run is now remembered before subscribers can start background refresh. Restore failures retain references, show an error and offer an explicit passive GET retry. Delayed restoration preserves the current/selected report, avoids revision downgrades and puts newly restored ranked results ahead of older browser DTOs. Browser storage failure leaves the accepted report available with a visible persistence error.
- The installed Next.js font guide was checked against `app/layout.tsx`; its two `next/font/google` variables follow that guide.
- Desktop report rendering with the actual components and styles exposed pale inherited totals/caption text. Two light-theme desktop overrides repair it: measured contrast is 16.56:1 for cohort totals and 6.88:1 for the chronology caption. Both closed and expanded reports fit a 1440×900 viewport without horizontal overflow. Screenshots are `report-desktop-1440x900.png` and `report-details-desktop-1440x900.png` in the evidence directory below. This static fixture check uses fallback fonts and does not claim hydrated paid report generation.

Verification evidence and safe forensic receipts are under `tmp/handoff-repair-20261103/` (temporary local artifacts, not public app output). Desktop scope only; mobile compatibility is excluded at the user's request.

### Final repair verification

- The bounded full suite executed **2,461 tests: 2,460 passed, one failed, no skips/cancellations**. Its only failure was the legacy upstream-error assertion in `phase4e2-public-status.test.ts`, which expected `OPERATION` instead of the intentionally repaired `PROVIDER_UNAVAILABLE` classification. Log: `full-tests.log`.
- Updated that one expected reason, preserving all accepted-prefix, privacy, accounting and no-retry assertions. **28/28 tests passed on the subsequent repair-focused run**, including the complete public-status test file, real HTTP 429 flow and rendered status message, all seven history-recovery regressions, graph robustness and nested metadata validation. Log: `final-repair-tests.log`.
- No production code changed after the full-suite run. The full suite was not repeated after that single test-expectation correction; the changed test file and all repair-specific regressions were rerun instead.
- **Final production build passed:** `npm.cmd run build -- --webpack`, including TypeScript and page generation. Log: `build-complete.log`. This build includes the final delayed-history race repair and desktop contrast overrides.
- Postbuild audit: **29 trace manifests, zero references to project-private roots, all eight official aggregate employment/provenance files retained**. Receipt: `final-build-trace-audit.json`.
- `git diff --check` passed. Independent final source review found no remaining important or critical issues in the reviewed repair paths.

Repair-focused verification command:

```powershell
node --test --test-concurrency=2 lib/contracts/tests/phase4e2-public-status.test.ts lib/contracts/tests/job-failure-repair.test.ts lib/contracts/tests/public-rate-limit-repair.test.ts lib/contracts/tests/summary-history-recovery.test.ts lib/contracts/tests/link-explanation-robustness.test.ts lib/contracts/tests/link-detail-validation.test.ts
```

---

For a reviewer (Codex) to check the work, and to investigate one unresolved failure. Written by Claude (Sonnet 5.5) at the end of a long session. Everything below is stated as observed unless marked **hypothesis** or **not verified**.

Companion doc (design-level summary): `docs/ui-redesign-2026-11-03.md`.

## 1. TL;DR

- A CSS-only "chart-room" redesign was applied (navy header, cool paper surfaces, sea-blue action colour). The user then asked for specific Knowledge Graph UI fixes, then for richer relationship explanations, which required a **backend exception** (the user's original instruction was "do not change the backend").
- Final state: `npx tsc --noEmit -p .` clean. The last full-suite run (`node --test lib/contracts/tests/*.test.ts`) gave **2317 pass, 0 fail**; after that run one more fix (clipping, section 5) and one more test were added, and only the targeted `link-explanation.test.ts` (10/10) was re-run, so the full suite should be re-run.
- **One unresolved failure:** a real background society simulation failed at step 1 with `reason: "OPERATION"`. The very next identical run (same code) completed 320/320. Root cause was **not found**. See section 5.
- **Not verified live:** person-to-person social links (the `buildLinks` detail) never appeared in a live graph. They are only unit-tested. See section 6.

## 2. Working-tree caveat

The repository had **many uncommitted changes from other work before this session began** (see `git status`: dozens of modified files in `lib/`, `components/`, `app/api/`, plus deleted/added docs and screenshots). Nothing was committed by Claude. Use `git diff` per file, not a whole-tree diff, to isolate this session's changes. The file lists below are the files this session touched.

`AGENTS.md` says this is a modified Next.js with breaking changes; Claude did not read `node_modules/next/dist/docs/` because only CSS, a font import and plain React edits were made. A reviewer should confirm `next/font/google` usage in `app/layout.tsx` is valid for this Next version.

## 3. What was implemented

### 3.1 Visual redesign (front end only)
| File | Change |
| --- | --- |
| `components/workspace-redesign.css` (new) | Loaded last. Re-tokens the light theme: header, panels, map controls, knowledge graph, report. Desktop only (`min-width:701px`). Nested under the existing `.workspace-shell...impactlens-light` selector so it wins by order. |
| `components/workspace.tsx` | `import './workspace-redesign.css'` after `workspace-light.css`. |
| `app/layout.tsx` | `next/font/google` Bricolage Grotesque (`--font-display`) and Instrument Sans (`--font-text`). |
| `lib/knowledge-graph/display.ts` | New 16-colour light palette (`lightGraphColours`). All 16 keep >= 3:1 contrast on `#DDE3D9` because `light-knowledge-graph.test.ts` asserts that. |
| `lib/knowledge-graph/renderer.ts` | Light-theme graph styles recoloured; dashed style for assumed/proposed edges (`edge.basis-assumed`). |
| `lib/plots/map-layer.ts` | Label chip colours only. |
| `lib/contracts/tests/knowledge-ui.test.ts`, `light-knowledge-graph.test.ts` | Updated expectations (removed hint text; focused edge colour now `rgb(10,95,134)`). |

### 3.2 Knowledge Graph sidebar (front end)
`components/knowledge-workspace.tsx`:
- Removed the hint "Colour: entity type; shape: record kind." and the "Archived immutable context..." note (the latter only renders when `!archived`).
- Removed nested scrollbars: explorer is a flex column, one scroller per list.
- Entity types and Entity index are now tabs (**Entities | Types**) driven by `explorerPanel` state and `data-panel` on the `<aside>`. Search forces the Entities tab. The two panels stay in the DOM (hidden by CSS) because existing tests regex-match `<details class="kg-filters"` and `<div class="kg-entity-index">`.
- Canvas inset (`.kg-canvas{inset:64px 0 52px 0}`) so the status strip no longer covers nodes.

### 3.3 Relationship explanations (backend exception)
Problem: edges said things like "1 explicitly assumed fictional social ties", which told the user nothing about how entities interacted. User-approved scope: interaction mix, platform ("where" but **no time**), themes, stance changes, direction, plain wording, collapsed caveat, dashed assumed links. Constraint: **aggregate counts, topics and stance changes only; no message text, quotes, ids or timestamps.**

**Data (server):**
- `lib/society/public-contract.ts`: new `LinkDetail`, `LinkArgument`, `SocietyLink`; `SocietySummary.links` is now `SocietyLink[]`.
- `lib/server/society/link-detail.ts` (new): `buildLinks(world)` replaces the inline link code that was on `summary.ts` line ~21. Same keys, same counts, same ordering (ties, then public interactions, then transfers), plus `detail`:
  - `mix`: event-type counts (`reply`, `comment`, ...).
  - `platforms`: channel ids (public interactions only).
  - `themes`: top 2 topic labels from `event.discussion.topicIds` via `communication.topics`.
  - `arguments`: counts of `concern|condition|support|question|disagreement`.
  - `stance`: `{changes,towardSupport,towardConcern}` from `opinion` events by the source actor whose `targetId` item was authored by the target actor and where `position !== previousPosition`. This is an **association heuristic** (the actor considered the other's post), not a causal claim. Wording says so.
  - `tie`: for assumed ties, the `SocialTie.kind`.
- `lib/server/society/summary.ts`: now `const links=buildLinks(w);` and `links,map:` (was `[...links.values()]`).
- `lib/citizen-grounding/public-view.ts` line 13: link validation previously rejected any key beyond `source,target,kind,count`. It now allows an optional `detail` object (shallow key check only). **This was a regression Claude introduced and fixed**: 5 `hybrid-public-explore` tests failed until this change.

**Graph contract:**
- `lib/knowledge-graph/contract.ts`: `KnowledgeEdge.detail?: EdgeDetail` with `{label, basis:'assumed'|'recorded'|'proposed'|'reported', headline, interaction?, where?, about?, outcome?, note?}`. Validated in `parseKnowledgeGraph` (strings <= 400 chars, no `<` or `>`, `label` via `displayType` <= 80).
- `lib/knowledge-graph/display.ts`: `knowledgeRelationshipLabel` returns `edge.detail?.label ?? edge.relationshipLabel ?? edge.relationship`.

**Wording (pure, unit-tested):** `lib/knowledge-graph/edge-explain.ts`
- `explainLink` (social links: public interaction, transfer, assumed tie).
- `explainKnown` (fixed society kinds: `REPRESENTS_FICTIONAL_SCENARIO_ROLE`, `SIMULATED_PARTICIPATION`, `AGGREGATED_SIMULATED_PARTICIPATION`, `CREATED_FICTIONAL_GROUP`, `USES_SIMULATED_ENVIRONMENT`).
- `explainStakeholderEvent` (stakeholder turns; uses `type`, `position`, `positionChange`, `topics`; **never the statement**).
- `explainProposed` (model-proposed / source-reported ontology relationships, `PROPOSED_INTERACTION`).
- The "no stance change was recorded" sentence is emitted **only when `link.detail` exists**, so runs saved before this change never claim it.

**Wiring:**
- `lib/server/society/entity-graph.ts`: `link()` takes `extra?:{detail}` and falls back to `explainKnown`; the main links loop uses `explainLink`. **`relationshipLabel` is left as the raw kind on purpose** (see 3.4). Edge ids are unchanged.
- `lib/world-graph/projection.ts`: adds `detail` to ontology relationship edges, `PROPOSED_INTERACTION` edges and stakeholder event edges.
- `lib/knowledge-graph/renderer.ts`: edges with `basis` `assumed` or `proposed` get class `basis-assumed` (dashed).
- `components/knowledge-workspace.tsx`: edge inspector renders headline, basis badge, What happened / Where / About / Outcome, and a collapsed "About this link" note; legend adds Recorded (solid) / Assumed (dashed); connected-relationship list uses `detail.headline` in full mode.
- Not covered: the pre-run planning graph in `lib/dynamic-scenarios/projection.ts` and the older `summaryGraph` in `summary.ts` (line ~44) still use original wording.

**Tests:** `lib/contracts/tests/link-explanation.test.ts` (new, 10 tests): wording, aggregate-only detail (asserts no `SECRET` text, event ids, `"minute"`, `"tick"`), `buildLinks` on the `phase4dWorld` fixture with synthetic events, entity-graph integration, stakeholder/proposed/known wording.

### 3.4 Important design decision: do not change `relationshipLabel`
`lib/graph-summary/evidence.ts` feeds `edge.relationshipLabel` into the AI node-summary evidence, and `graphSummarySnapshotPayload` (`lib/graph-summary/contract.ts`) hashes it into the summary cache key. Changing the label would invalidate every saved run's paid AI summaries. Plain labels therefore live in `detail.label`.

## 4. Verification performed

- `npx tsc --noEmit -p .`: clean at the end.
- Full suite last run: **2317 pass / 0 fail**.
- Earlier full runs showed failures; all explained below.

| Earlier failure | Cause | Status |
| --- | --- | --- |
| `light-knowledge-graph.test.ts` x2 | Claude's palette/colour change (contrast < 3:1; hard-coded focus colour) | Fixed |
| 5x in `hybrid-public-explore.test.ts` etc. | `public-view.ts` rejected `detail` on links | Fixed |
| "fresh cold process prewarms the real immutable 10k proof..." (~155 s) | Not investigated. Failed in the very first full run, before any link work. Passed in the final run. | **Unexplained, likely load/time related** |
| "aborting before admission or during delayed verification..." | Timing flake under full-suite load; passed alone | Unexplained flake |

- Live browser (Playwright MCP): two real end-to-end runs of "What if a new community centre opened in Sengkang?" (3 assumptions all allowed). Run A completed 320/320, run C completed 320/320. In the live graph, edge labels read "made an argument", "acknowledged", "revised view", "represents role", "proposed interaction"; the edge inspector showed headline, "Recorded in the simulation" badge, What happened, About (topics), Outcome (stance). Legend and headline size were fixed after real screenshots.

## 5. THE UNRESOLVED FAILURE (please investigate)

### Symptom
Run B (started ~19:33 local) of the same question: exploration completed ("8 accepted turns"), then the **background society job failed at tick 1/320**:

- UI: `Background communication: failed` ... `1 accepted model decisions across 1 agents ... 28 remaining. 1/320 coarse ticks ... 20 recorded events`.
- Status endpoint (fetched from the page):
  `GET /api/social-simulate?operation=status&runId=run-7711e25541596d2cd96e6461-review-76c78eae-ebdf-48bf-88a1-04d225d8028a&token=...`
  returned `job: {profileId:"multi-day-50-320-v1", status:"failed", tick:1, totalSteps:320, acceptedDecisions:1, participatingAgents:1, capacity:350, admittedCalls:30, remainingCalls:28, reason:"OPERATION", revision:2}`.
- `reason:"OPERATION"` is the **catch-all** in `lib/server/society/coordinator.ts` (~lines 41-47): any exception whose message does not match `IDENTITY|PROVIDER_MISMATCH`, `STORAGE|JOURNAL|CHECKPOINT|ENOSPC|EACCES|EPERM`, `PRIVATE|ACCESS|PERMISSION`, or the capacity codes. The handler logs only `DEEP_JOB_SAFE {code, tick, revision, acceptedDecisions}` and **discards the exception message and stack**.

### What is known
1. The identical question completed 320/320 **before** (run A, with `buildLinks` but without the later `explainKnown`/world-graph changes) and **after** (run C, with all changes), with no code change to server logic between B and C. Between B and C, Claude only added a temporary debug logger (later removed) and a `plain()` wording tweak in `edge-explain.ts` (a pure string helper applied to labels). This points to a **non-deterministic cause** (provider, timing, load), not a deterministic bug in the new code.
2. The failure happened at the first checkpoint after tick 1, with 1 accepted model decision and 20 events.
3. Test-suite runs did not reproduce it. `hybrid-public-explore`, `phase4e-*`, `society*`, `phase4d-*` all pass (99/99 in one targeted run).
4. A heavy load was present around run B: the full contract suite and a Playwright browser were both running on the same machine shortly before. Run C started after those finished.

### What was tried
- Re-ran the targeted society tests after each change: pass.
- Added a **temporary** logger in `coordinator.ts` that appended `error.stack` to `tmp/deepjob-error.log` and re-ran the scenario. Run C completed without failing, so no log was ever written. The logger was **removed** and the file restored (`git status --short lib/server/society/coordinator.ts` shows it clean). The first attempt at inserting it via `sed` produced a syntax error; it was reverted immediately with `cp` from a backup before any run.

### Hypotheses (none verified)
- **H1 transient provider error** (OpenRouter/DigitalOcean schema or timeout failure during an action call) surfacing as a generic `OPERATION`. In earlier test output the repo logs `HYBRID_INITIALIZATION_SAFE ... AI_ACTION_SCHEMA` for malformed model output, so this class of failure exists.
- **H2 machine load / timeouts** from the concurrent test suite (the dev server compiles on demand and the machine was saturated; Playwright navigations were timing out at the same time).
- **H3 a rare exception in the new code** at the first checkpoint, for example a graph/link validation edge case that depends on model output (e.g. an unusual theme label or node name hitting the `[<>]` check or a length limit in `parseKnowledgeGraph`/`EdgeDetail` validation). Unit tests use a fixed fixture, so a model-dependent input could still break it. This is **the one the reviewer should rule in or out first**, because it is the only one that would be Claude's bug.

### Suggested way to resolve
1. Re-add temporary error capture in `coordinator.ts` before the `console.warn('DEEP_JOB_SAFE', ...)` line (write `error.stack` to a file; do not rely on the log, which drops the message). Run the same question several times, ideally while generating load.
2. If it reproduces, check the stack for `edge-explain.ts`, `link-detail.ts`, `entity-graph.ts`, `public-view.ts` or `parseKnowledgeGraph`.
3. Independently, fuzz `entityFirstGraph(base, summary)` with summaries whose theme labels, node labels and platform names contain `<`, `>`, very long strings, empty arrays and unicode, and confirm `parseKnowledgeGraph` never throws.
   - **Found and fixed during this handoff:** `headline`, `outcome` etc. embed node labels (up to 180 chars each) and were not clipped, so a long source plus target label could exceed the 400-char limit in the `detail` validation and make `parseKnowledgeGraph` throw. A regression test (`very long entity names cannot make an edge detail exceed the graph contract`) fails without the fix and passes with it (confirmed by temporarily setting `FIELD_MAX` to 99999). The fix is the `fit()` wrapper at the bottom of `lib/knowledge-graph/edge-explain.ts` (every detail string clipped to 399 chars, label to 80).
   - This was a latent crash path, but it is **unlikely to explain the observed step-1 failure**: labels in the live runs were about 70 chars, giving headlines of about 150 chars, well under the limit. Keep fuzzing for other inputs.
4. Consider making the coordinator's catch-all preserve a bounded, redacted message code so future `OPERATION` failures are diagnosable. That is a backend change outside this task's scope, so it was not done.

## 6. Not verified / known gaps

- **Social-link detail never seen live.** Both completed live runs produced only stakeholder-turn edges and role/participation edges in the Knowledge Graph. `RECORDED_PUBLIC_INTERACTION` links (mix, platform, themes, arguments, stance) were exercised only by `link-explanation.test.ts` with synthetic events. The "Where" row has never been displayed in a live graph.
- **Last CSS tweak not re-screenshotted:** `.kg-edge-explain { margin-top:4px; padding-top:0 }` (to remove a blank gap at the top of the inspector popup).
- **Reload loses run history.** The "Recorded preparations & runs" selector is in-memory React state; after a page reload it is empty, so verifying a graph requires running a new (paid) simulation.
- **Pre-run planning graph and the older `summaryGraph`** were not given plain wording (see 3.3).
- **Mobile layouts** (< 701 px) were never reviewed; the redesign CSS is desktop only.
- **Report tab with real content** (AI summary, detailed report) was not reviewed after the redesign.
- **Stance heuristic:** `link-detail.ts` counts an `opinion` event as "after considering the other's posts" if its `targetId` item was authored by the other actor. It does not check ordering relative to the interaction, and it only covers the source -> target direction. Review whether that is acceptable wording ("association, not proof of influence").
- **Payload size:** `detail` adds roughly several hundred bytes per recorded link. `public-view.ts` trims links to fit `262144` bytes, and the summary has other limits; large runs with many recorded links were not tested.
- **Edge `detail` for old stored runs:** graphs are rebuilt from stored summaries, so old runs get headline/label wording but no where/about/outcome (data was never recorded). The no-stance sentence is suppressed for them by design.

## 7. How to run things

```bash
cd ImpactLens
npx tsc --noEmit -p .
node --test lib/contracts/tests/link-explanation.test.ts              # new tests (fast)
node --test lib/contracts/tests/knowledge-ui.test.ts lib/contracts/tests/light-knowledge-graph.test.ts
node --test --test-concurrency=2 prototype/mrt/tests/*.test.ts prototype/agents/tests/*.test.ts lib/contracts/tests/*.test.ts prototype/eldercare/tests/*.test.ts # full suite; bounded concurrency
npm run dev                                                            # app at http://127.0.0.1:3000 (predev prepares web assets)
```

Live check: Map tab -> type a scenario -> Explore -> allow the three assumptions -> Start simulation (about 8 minutes, uses paid inference; the user authorised paid testing for this task) -> Knowledge Graph tab (or Report tab -> "Recorded preparations & runs"). Select a node -> "Inspect relationship".

Tooling notes: the Playwright MCP screenshot call often times out on the heavy graph page; `browser_run_code_unsafe` with `page.screenshot({timeout:90000, animations:'disabled'})` worked. `evaluate` calls can wait up to ~115 s. Python is not installed on this machine; use `node` for scripted edits. `tmp/` contains many `admission-cold-process-test-*` directories created by the test suite (not by this work).

## 8. Files touched this session (for `git diff -- <file>`)

New: `components/workspace-redesign.css`, `lib/server/society/link-detail.ts`, `lib/knowledge-graph/edge-explain.ts`, `lib/contracts/tests/link-explanation.test.ts`, `docs/ui-redesign-2026-11-03.md`, `docs/handoff-ui-and-relationship-explanations-2026-11-03.md`.

Modified: `app/layout.tsx`, `components/workspace.tsx`, `components/knowledge-workspace.tsx`, `lib/knowledge-graph/{contract,display,renderer}.ts`, `lib/plots/map-layer.ts`, `lib/society/public-contract.ts`, `lib/server/society/{summary,entity-graph}.ts`, `lib/citizen-grounding/public-view.ts`, `lib/world-graph/projection.ts`, `lib/contracts/tests/{knowledge-ui,light-knowledge-graph}.test.ts`.

Temporarily modified and restored (should show no diff): `lib/server/society/coordinator.ts`.
