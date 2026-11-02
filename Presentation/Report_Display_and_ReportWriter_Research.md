# ImpactLens Report Display and ReportWriter Research

**Date:** 2 November 2026  
**Scope:** Report research, the approved hackathon implementation plan, and its completed prototype verification. Broader research recommendations remain future scope.  
**Starting point:** [Knowledge Graph and Report Improvement Research](Knowledge_Graph_and_Report_Improvement_Research.md), especially its six-chapter proposal and bounded ReportWriter recommendation.

## Readability repair after user testing

The user found that the first prototype still read like an activity log. The retained polyclinic run also had **zero social AI calls**, because `SOCIAL_LLM_ENABLED` was absent; it contained eight initial AI statements followed by rule activity. The switch is now enabled for future manually started runs. Existing runs remain unchanged.

The repair supplies the writer with bounded accepted **public** fictional statements on the server, excluding private messages, memories and profiles. One explicit writer call produces the five short narrative sections and saved summaries for known graph nodes. Graph clicks reuse that artifact without new inference. Initial views are distinguished from AI follow-up discussion; technical report data is collapsed. The prompt/cache version changes so the previous aggregate-only output is not reused.

This repair supersedes the aggregate-only input and metric-first inspector choices in the original prototype below. See [implementation and verification](../docs/READABLE_DISCUSSION_SUMMARIES_PLAN.md). No new paid simulation or report request is started automatically; a fresh social run is needed to test actual AI follow-up, while the retained run can be summarised from its initial public statements.

## Current hackathon implementation plan

**Status: IMPLEMENTED; prototype smoke verification complete (2 November 2026).** Two visible Codex CLI workers completed their disjoint tasks in the same checkout, using `gpt-6.1-sol`, high reasoning effort and the configured fast service tier. The retained 50-agent run produced 30 accepted real social decisions; one fresh, separately approved report-only attempt succeeded after the first report request was interrupted. Browser checks and saved-summary reuse passed. Initialization used offline fixtures; full V7/citizen-grounded acceptance remains unverified. See [execution results and limitations](../docs/GRAPH_REPORT_PROTOTYPE_ACCEPTANCE.md).

**Goal:** Make the graph easier to understand and add one informative AI-written summary above the existing report, using the shortest practical implementation path.

**Architecture:** Keep the existing graph engine, node data, report, inference transport and storage patterns. Graph descriptions come from existing permitted fields and deterministic templates. A separate server-side report call summarises a bounded snapshot of existing permitted report data; save its result for reuse. The two features do not depend on each other.

**Stack:** Existing Next.js, React, TypeScript, Cytoscape/D3 and configured inference provider. No new graph library, model/provider migration or dependency installation is planned.

**Scope precedence:** This section is the current implementation plan and supersedes the broader delivery phases and validation proposals below for the hackathon prototype. Sections 1–10 remain research and possible later improvements. A complete six-chapter rebuild, content-preserving discussion projection and claim-by-claim evidence validation are not prerequisites for this prototype.

### What will be built

| Area | Prototype deliverable | Deliberately deferred |
|---|---|---|
| Graph labels | Clearer, concise display labels; prioritise selected/search-matched labels and reduce competing overview labels. Keep full names available in the inspector and search. | New layouts, comprehensive collision solver, relationship filtering, topology changes and new graph libraries. |
| Node click summary | A short plain-language explanation of what the selected node represents and the useful facts already available. Put technical identity/provenance below it. | AI calls per node, new research, inferred relationships, broad inspector redesign and additional private data. |
| Generated report | One AI-written summary above the existing technical report, with **Findings**, **Agreements**, **Disagreements**, **Concerns** and **Unknowns**. Use short paragraphs and everyday language. | Rebuilding the entire report into six chapters, new charts, exports, report-to-graph links and elaborate generation progress. |
| Evidence handling | Reuse existing permitted report data and privacy rules. Prompt the writer to acknowledge missing information, preserve conditions and distinguish fictional discussion from calculated effects. | A dedicated evidence-checking service, citations, claim entailment validation, a new consensus scoring system and a general evidence framework. |
| Persistence | Save a generated summary for its exact input snapshot; reuse it when unchanged. | Automatic regeneration on polling, multi-version report management and a new storage subsystem. |

Skipping dedicated evidence checks does not mean removing authentication, existing privacy controls, ordinary response-shape/error handling, or source data integrity. Existing numerical results remain unchanged. The AI narrative is best-effort and gets a quick manual review during the smoke test; it is not claimed to be independently verified.

### Two Codex CLI workers in one checkout

Use **two Codex CLI processes**, not two worktrees. Preserve the user's configured model and existing sandbox/approval settings. Pass each task prompt through stdin. Do not use bypass flags, create branches/worktrees, commit, reset, clean, stage or revert unrelated changes.

| Role | Exclusive write ownership | Deliverable |
|---|---|---|
| **CLI worker A: graph** | Existing `lib/knowledge-graph/display.ts`, `lib/knowledge-graph/renderer.ts`, `components/knowledge-workspace.tsx`, `components/knowledge-workspace.css`; new `lib/knowledge-graph/node-summary.ts`; graph-specific focused tests only. | Clear labels and a useful node summary, with no extra inference. |
| **CLI worker B: report** | Existing `components/communication-report.tsx`; new `components/report-ai-summary.tsx`, `components/report-ai-summary.css`, `lib/report-summary/contract.ts`, `lib/server/report-summary.ts`, `app/api/reports/summary/route.ts`; report-specific focused tests only. | One server-side summary call, simple generation/error UI and saved snapshot-bound output. |
| **Main coordinator** | These two planning documents and task notes. Shared integration/configuration files only if a worker identifies a necessary change and ownership is explicitly transferred. | Coordinate ownership, inspect the combined diff, run shared checks and own the single real-inference test. |

These ownership boundaries were used during execution. Worker B used a dedicated CSS file. The coordinator added the authenticated read-only snapshot helper and the separately requested named-service planner fix; see the execution note for final paths and qualifications.

**Subagents are permitted after execution starts.** Each CLI worker may spawn one narrowly scoped helper when it saves time, for example read-only investigation or focused test review. Any helper that edits files must receive exclusive ownership of a subset of its parent worker's files; the parent must not edit those files concurrently. Helpers must not touch the other worker's files, create worktrees, launch paid inference or recursively expand the work. More helpers are optional, not a prerequisite for starting.

Before work starts, the coordinator records `git status --short` and preserves all existing dirty/untracked work. In particular, ongoing admission/timeout repair, live guards and acceptance evidence are outside this prototype's scope. Each worker reads `AGENTS.md` and the relevant guides in `node_modules/next/dist/docs/` before writing code. Shared-checkout coordination uses file ownership, not concurrent edits followed by a merge.

### Minimal interfaces and behaviour

- **Graph:** `nodeSummary(node: KnowledgeNode): string` in the new graph helper consumes the existing registered node and returns a concise explanation. Use the existing graph contract's actual exported type name when implementing. It must not mutate the node, add facts or disclose fields that the current public projection withholds. The renderer may use a separate display label; canonical IDs, full labels, searchability and graph physics stay intact.
- **Report component:** `ReportAiSummary({ result }: { result: PublicExplore })` receives the existing public run. It shows **Generate summary**, a simple loading state, five readable sections, and an error/fallback state. Generation is explicit; report viewing or polling alone does not trigger paid calls. Reopening should load saved output for the same snapshot.
- **Writer output:** a small versioned result containing `runId`, `snapshotKey`, `generatedAt`, and string sections named `findings`, `agreements`, `disagreements`, `concerns`, `unknowns`. Check only the ordinary response shape and size needed to render it safely; no per-claim evidence/citation validator is planned.
- **Server:** resolve the requested run through the existing access rules, assemble a bounded allowlist of existing permitted report fields, call the current configured inference transport once, and save the summary using existing storage conventions. Never accept a browser-supplied private world or blindly summarise arbitrary client text. If an existing helper needed for authenticated reads/storage is not reusable, worker B requests a narrowly scoped coordinator-owned integration change.
- **Saved output identity:** use the run ID and a deterministic fingerprint of the actual permitted summary inputs. Exclude session tokens from the input pack and fingerprint. A changed snapshot must not silently reuse an earlier summary. Do not regenerate automatically or retry failed paid calls in the background.
- **Data limits:** existing aggregate counts do not establish what people agreed about. Use substantive permitted summaries only where already available. Otherwise, the relevant section must explain that agreement, disagreement or the content of concerns could not be assessed. No new private-dialogue extraction or semantic discussion projection is included in this fast prototype.

### Parallel task sequence

- [x] **Coordinator preparation:** record the current baseline and launch two visible CLI workers with disjoint file ownership in the same checkout.
- [x] **Worker A:** implement concise display labels and deterministic node descriptions; return focused graph checks and handoff notes.
- [x] **Worker B:** implement the authenticated summary endpoint, saved output and simple report component; return mocked report checks and handoff notes.
- [x] **Coordinator integration:** combined diff reviewed; TypeScript, focused checks and production build passed. One existing full-suite timeout passed in isolation; see the execution note.
- [x] **Coordinator smoke test:** one retained 50-agent run, 30 accepted real social decisions, one successful report after a separately approved fresh report-only attempt. Both features inspected in the local browser.
- [x] **Finish:** actual calls, costs, screenshots, interrupted-attempt uncertainty and remaining limits recorded in the execution note.

### One combined test: 50 agents, 30 decision cap

**Original test budget:** one fresh 50-agent run, with **at most 30 admitted social AI decision attempts**, plus one separate ReportWriter call. Planning, initial stakeholder/personality generation and any retrieval are separate startup work. Execution used offline initialization and genuine social/report inference. The user separately approved one fresh report-only attempt after the first request was interrupted. Thirty attempts do not guarantee participation by all 50 agents.

The cap used task-local admission configuration, leaving production population, scheduler and normal profile capacities unchanged. Both live authorities are closed. The interrupted request retains US$0.02 of uncertain reserved cost; known reported cost across social inference and the successful report is US$0.010910753. No further paid calls are planned.

1. Run the required focused checks with mocked inference first. Reuse existing fixtures rather than building a new test harness.
2. Submit one scenario through the ordinary UI when execution is authorised. Let the capped run reach its terminal state; preserve its partial/budget-limited status if applicable.
3. Generate the summary once using real inference. Read the five sections for clarity, obvious numerical contradictions, invented agreement and accurate explanation of missing discussion. This is a short manual smoke review, not a new automated evidence-validation feature.
4. Open the same run's graph and inspect representative scenario, participant, communication and calculation nodes where present. Check concise labels, full-name access, useful descriptions, selection, search and normal drag/settling.
5. Return to the report and reopen its saved summary. Confirm that it does not make another report-generation call. Also check the loading/error path with mocked failure; do not create a second paid failure test.
6. Record actual time, accepted/rejected attempts, report call count and any observed defects. If a provider timeout prevents completion, report that limitation and preserve the result; do not automatically retry or raise the cap.

### Reuse the retained run after fixes

Run the 50-agent, 30-decision-cap simulation **once**, retain its exact result, and use that same snapshot for subsequent checks. Do not click Explore again, resume the simulation or append new decisions merely to retest presentation changes.

| What changed? | Follow-up check |
|---|---|
| Graph labels or deterministic node summaries | Reopen the retained graph and inspect the affected nodes. No inference. |
| Report layout, formatting or display states | Reopen the saved summary from the same run. No inference; use mocked failures for error states. |
| Report prompt, summary input assembly or generation logic | Test with mocked output first. When a real check is needed, generate only a new summary from the same retained simulation, within the separately authorised report-call budget. Do not rerun the social simulation. |
| Population, scenario inputs or simulation logic | Assess whether a new capped simulation is necessary; retained output cannot validate changed simulation behaviour. These changes are outside this prototype's scope. |

A changed prompt or generation version must not silently serve an old cached summary and claim to validate the new writer. Include that version in saved-output identity or explicitly invalidate only the derived summary. Preserve the simulation snapshot and earlier test evidence. Reusing retained data does not reopen a closed paid-run authority or authorise another model call.

The first combined smoke test remains budgeted at **15–25 minutes**. Follow-up presentation checks are estimated at **5–10 minutes**, excluding fixes or a new writer call. Reuse saves repeated simulation/setup time; it does not shorten the initial run or implementation itself.

**Planning estimate:** approximately **90–120 minutes elapsed for a smooth parallel prototype and combined smoke test; reserve up to three hours for fixes**. This was a conservative planning allowance, not measured coding time: the two workers returned their initial implementations in about seven minutes. Integration, full-suite execution and production builds are separate stages. The smoke test alone is budgeted at **15–25 minutes**, excluding defect repair. Runtime estimates remain unverified until measured.

**Additional requested fix:** new entity-generation declarations select concrete supported communication services (WhatsApp, Telegram, Instagram or Reddit) with matching channel types, and reject vague service placeholders. Historical records retain their original names. This is scenario setup, not evidence of real platform activity. New module: `lib/server/inference/named-communication.ts`; latest entity-planner schema/prompt integration in `lib/server/inference/planner.ts`. Historical declaration schemas and replay parsing remain unchanged. Offline checks cover named services through channel selection and graph labels; real provider acceptance of this expanded planner schema is not yet claimed.

## Recommendation

Make the Report an informative, plain-language account of what the simulation found. Answer the user's question, explain where fictional participants agreed or disagreed, describe their main concerns and conditions, and say what changed or remained unresolved. Calculations and recorded activity should support that account. Keep the proposed six chapters, but use everyday wording in their displayed headings.

Reorganising existing summaries is a useful foundation, but it will not deliver this narrative on its own. The first complete narrative release needs a server-side evidence projection that preserves the meaning of permitted statements, followed by a bounded ReportWriter or equivalent evidence-backed synthesis. The writer is part of the recommended product scope; a full MiroFish-style retrieval and interview loop remains separate work. Make the findings, execution status and major limitations visible, with technical audit material available on demand.

Three refinements to the earlier research matter:

1. **Chapter navigation does not require collapsing every chapter.** Hiding the answer or interruption warning would undermine the redesign.
2. **The existing public data cannot support every proposed narrative.** It contains classified discussion counts, not the actual concerns, replies or issue histories. Specific discussion summaries require a new server-side projection.
3. **Cache against an immutable evidence snapshot, not just a run ID.** The current application can advance a social world under the same run. A narrative must identify the exact retained prefix it describes.

These are recommendations based on source inspection and existing screenshots, not findings from a usability study.

## 1. Research baseline

### Local material inspected

The checkout was at `58bd4ea836b6a0d7bdbfada33a2c39562431e619`, with additional uncommitted work. This review uses the files as read on 2 November 2026; the commit alone does not identify that working tree.

| Material | What it establishes |
|---|---|
| [Earlier research](Knowledge_Graph_and_Report_Improvement_Research.md) | Existing proposal, graph integration context and initial ReportWriter constraints. |
| [Report screenshot, 1440-pixel viewport](../docs/evidence/geographic-selection-v7-20261102/report-1440x900.png) | The current report is long, places the question below setup and commute details, and repeats classification explanations across venues. |
| [Integrated acceptance record](../docs/GEOGRAPHIC_SELECTION_V7_REAL_PROVIDER_INTEGRATED_ACCEPTANCE.md) | Exact numerical results and the interrupted execution represented in that screenshot. |
| [Workspace integration](../components/workspace.tsx) and [CommunicationReport](../components/communication-report.tsx) | The main public-run Report path and its current content order. |
| [Commute report](../components/citizen-commute-panel.tsx) and [commute public contract](../lib/citizen-grounding/public-contract.ts) | Available population metrics, coverage categories and binding validation. |
| [Discussion rendering](../components/discussion-summary.tsx), [public contract](../lib/society/public-contract.ts) and [discussion contract](../lib/society/discussion-contract.ts) | Browser-safe aggregate fields and information deliberately withheld. |
| [Server fact aggregation](../lib/server/society/facts.ts), [summary projection](../lib/server/society/summary.ts) and [public service](../lib/server/society/public-service.ts) | Existing internal claim-to-event references, aggregate production, retained revisions and access controls. |

`CommunicationReport` is the main target. The separate [SocietyReport](../components/society-report.tsx) and [QuestionReportV1 projector](../lib/question-simulation/report.ts) are related paths, but changing either alone would not reorganise the public-run report shown in the evidence.

The inspected screenshot represents an interrupted run, not a completed multi-day discussion. No new live provider test, browser walkthrough, accessibility audit or reader study was performed for this document.

### External evidence

Primary sources were used for MiroFish behaviour, disclosure patterns, chart communication and accessibility. Upstream MiroFish `main` files were consulted on 2 November 2026; their URLs are mutable and this review does not claim a pinned release audit. Recommendations for ImpactLens are interpretations of these sources and the local implementation.

## 2. What makes the current report difficult to use

### It starts with the machinery

`CommunicationReport` begins with “Recorded fictional communication,” map-grounding metadata, limitations and the whole-population commute table. The original question appears afterwards. Initial accounting, daily chronology and cohort capability metrics precede most discussion content. This is useful audit information, but it makes the reader assemble the answer themselves. [Current component](../components/communication-report.tsx).

**Change:** show the question, a short supported answer and the state of execution first. Move detailed accounting and chronology to chapter 6.

### It repeats explanation more than it explains the result

Each environment and private group repeats aggregate prose, classification counts, issue counts and an early/middle/late table. The same methodological qualifications recur. Large authored-item position buckets can also distract from the distinction between initial seeds and accepted social decisions. [Discussion renderer](../components/discussion-summary.tsx), [server summary](../lib/server/society/summary.ts).

**Change:** define shared terms once, show a compact environment comparison, and retain venue-specific limitations beside the relevant detail. Do not simply remove the qualifications.

### Several kinds of success appear together

Accepted planning, accepted initial stakeholder actions, generated personalities, rule activity and accepted social decisions have different meanings. A reader can see successful initialisation and still miss that social execution stopped almost immediately.

**Change:** use a stage summary with separate outcomes. A completed report document is not evidence of a completed simulation. For the retained example, eight accepted initial actions coexist with zero accepted social decisions. [Acceptance record](../docs/GEOGRAPHIC_SELECTION_V7_REAL_PROVIDER_INTEGRATED_ACCEPTANCE.md).

### The denominator is easy to lose

The population calculation uses 10,000 synthetic representatives with expansion weights. The discussion cohort deliberately selects 50 agents. A mean saving is computed only over comparable rail journeys, rather than all represented residents. These scopes must remain visible beside the numbers. [Commute contract and validation](../lib/citizen-grounding/public-contract.ts).

**Change:** use separate population and selected-cohort blocks, with persistent labels for units, weighting and coverage. Avoid a generic “people benefited” headline.

### It reports internal activity instead of explaining the discussion

The supplied [report screenshot](../docs/evidence/geographic-selection-v7-20261102/report-commute-1440x900.png) confronts the reader with “inference accounting,” “LLM-capable agents,” “classified decisions,” “authored-item position buckets” and repeated tables. A reader must understand the implementation before they can understand the outcome. Larger text and collapsible chapters cannot resolve that content problem.

**Product requirement:** a reader unfamiliar with the implementation should learn what happened, why it matters, where participants agreed, what they disputed, and what remains unknown. A chapter is incomplete if it merely lists activity counts without explaining what those counts can and cannot establish.

Use a short headline followed by two to four sentences of explanation for each main finding. Put supporting numbers and a “View evidence” action beneath it. Keep qualifications near the claim, expressed in everyday language. Define an unavoidable technical term at first use rather than requiring a glossary.

| Current wording | Reader-facing treatment |
|---|---|
| Recorded fictional communication | What the simulation found |
| Citizen-grounded map intervention | The MRT proposal we tested |
| Fictional agent cohort | Who took part in the simulation |
| LLM-capable agents | AI-controlled participants, if this distinction is useful; otherwise move it to technical details |
| Expansion weight | Population represented by the fictional profiles; explain the weighting under “How we calculated this” |
| Original inference accounting | AI usage and cost, under technical details |
| Classified decisions | Recorded choices with topic or viewpoint labels; retain the distinction between a choice and a participant |
| Formal issue choices | Explicitly recorded concerns and conditions; preserve their actual issue type and status |
| Nonzero state changes | Recorded changes in simulated views; do not imply that a score change proves meaningful agreement |

### Make agreement, disagreement and unresolved concerns central

The desired MiroFish-like quality is a connected explanation of findings. Do not copy prediction claims or introduce unsupported agreement to make the report sound complete.

Chapter 4 should contain these readable subsections when evidence is available:

- **Where participants agreed:** the specific proposal or point they agreed on, their reasons, and any conditions attached.
- **Where views differed:** the actual point of disagreement and the reasoning on each side.
- **Main concerns and conditions:** the practical obstacle, who raised it at an allowed level of identification, and what they said would address it.
- **How the discussion developed:** whether someone replied, clarified a position, changed their stated view or proposed a next step.
- **What remains unresolved:** unanswered concerns, conflicting positions and outcomes that could not be checked.

An agreement summary must identify what the agreement concerns. Positive sentiment, repeated posts, issue closure, or several supportive tags alone do not establish consensus. Several comments from one participant are not several independent supporters. Silence, inactivity and missing classifications do not establish agreement.

Prefer “participants who discussed this point agreed on…” or “some participants supported the proposal if…” when that is the supported scope. Report disagreements and conditional support alongside agreement. If using “consensus,” define the assessed participant set and the agreement rule, check counterevidence and participation coverage, and identify that this is agreement among fictional participants. Do not invent a percentage threshold from the current aggregate counts.

For this particular screenshot, the honest answer is **“Agreement could not be assessed because the discussion simulation stopped before any follow-up AI choices were recorded.”** The eight initial stakeholder records are setup material and may be summarised separately if their permitted content is available. They do not demonstrate discussion consensus, evolving views or resolved concerns.

## 3. What to borrow from MiroFish

MiroFish's `ReportAgent` plans an outline, then produces sections using iterative retrieval/tool calls. Its defined tools include graph retrieval and simulated-agent interviews; the inspected source sets a maximum of five tool calls per section. Its generation method saves section files and progress. These are workflow capabilities, not just formatting. [ReportAgent source](https://github.com/666ghj/MiroFish/blob/main/backend/app/services/report_agent.py), [raw source](https://raw.githubusercontent.com/666ghj/MiroFish/main/backend/app/services/report_agent.py).

`Step4Report.vue` renders numbered sections, completed-section collapse controls, active/pending/completed states and a workflow panel with section counts, elapsed time and tool activity. Its clickable heading rows should not be copied directly as an accessibility implementation. [Report interface](https://github.com/666ghj/MiroFish/blob/main/frontend/src/components/Step4Report.vue).

| Pattern | ImpactLens decision | Reason |
|---|---|---|
| Numbered chapters and outline | Adopt | Makes a long report navigable independently of generation strategy. |
| Expandable completed content | Adapt | Useful for optional details; essential findings should remain visible. |
| Generation progress | Use only for a real writer job | A deterministic report is already available and should display immediately. |
| Tool and reasoning log panel | Keep technical job/accounting detail in methodology | It would compete with the answer in the reading view. |
| Autonomous retrieval and agent interviews | Defer | Introduces new evidence, additional calls and more failure states. |
| Prediction-oriented framing | Retain ImpactLens's fictional/modelled labels | The local records do not establish measured behaviour or policy forecasts. |

This comparison supports borrowing presentation patterns. It does not establish that MiroFish's pipeline is more accurate or more usable for ImpactLens.

## 4. Recommended six-chapter report

Use one continuous document with a chapter index. Each chapter should start with a plain-language explanation, not a metrics grid. The chapter names below describe the research structure; use the everyday headings in the following mapping in the application. Optional detail can expand beneath the explanation.

| Chapter | Reader's question | Visible content | Optional detail |
|---|---|---|---|
| **1. Executive findings** | What does this run tell me? | Original question, concise answer, principal calculated result, social execution status, material caveat and evidence links. | Additional supported findings. |
| **2. Scenario and assumptions** | What was actually modelled? | Intervention, service assumptions, synthetic population/workplace context and simulated time reached. | Full timing assumptions, source versions and technical identities. |
| **3. Calculated commuting impacts** | Who has a modelled journey change? | Scoped headline, comparable denominator, coverage table and distinct selected-cohort context. | Metric definitions, detailed calculation provenance and permitted examples. |
| **4. Fictional stakeholder discussions** | What did participants agree on, dispute or leave unresolved? | Evidence-backed summaries of agreement, disagreement, concerns, conditions and developments; explain when discussion evidence is insufficient. | Participation coverage, classification counts, environment/group detail and chronology. |
| **5. Unresolved questions and limitations** | What can I not conclude? | Question-specific gaps, interruption, unsupported outcomes and modelling limitations. | Full limitation register. |
| **6. Evidence and methodology** | Can I trace and reproduce the claims? | Evidence index, definitions, source provenance and stage accounting summaries. | Daily tables, selection method, technical hashes and detailed usage. |

Keep chapter numbers stable. For non-commuting scenarios, rename chapter 3 to the relevant calculated impact. If no supported calculation exists, explicitly state that and describe the missing capability. A fixed report template must not invent an MRT result for another scenario.

| Research chapter | Displayed heading |
|---|---|
| Executive findings | What we found |
| Scenario and assumptions | What we tested |
| Calculated commuting impacts | How journeys could change |
| Fictional stakeholder discussions | What participants agreed on and questioned |
| Unresolved questions and limitations | What we still do not know |
| Evidence and methodology | How we reached these findings |

### First-screen content

Recommended order, using the retained scenario:

1. **Scenario report:** Choa Chu Kang–Sengkang hypothetical MRT connection.
2. The original question, or a concise question summary with the exact wording available immediately below.
3. **Run stopped early:** journey calculations are available, but the discussion stopped after 15 minutes of simulated time.
4. Two short explanations: what the calculated journey changes show, and why agreement or later developments cannot be assessed.
5. A visible limitation: residents and workplaces are simulated; the report cannot establish actual changes to work schedules or coordination.
6. The six chapter links and “View supporting evidence” actions.

On desktop, a slim sticky chapter index can accompany the reading column. On mobile, use an in-page list of links above the chapters. Keep the answer ahead of the index when space is tight. These layout choices are proposals to test, not measured optimal breakpoints.

### Example executive findings grounded in the retained run

> **What we found:** The proposed MRT connection produced faster calculated journeys for 4 of the 10,000 fictional resident profiles. Many profiles did not have a journey that could be compared, so this does not tell us how all Singapore commuters would be affected. The calculation uses assumed workplaces and train timings, rather than observed journeys.
>
> **What did participants agree on?** We cannot assess agreement from this run. The initial setup produced eight fictional stakeholder actions, but the discussion stopped when an AI request took too long. No follow-up AI choices were recorded.
>
> **What remains unknown?** This run does not show whether participants would agree on the proposal, resolve practical concerns, adjust work schedules or coordinate over the following days.

All example values come from the [integrated acceptance record](../docs/GEOGRAPHIC_SELECTION_V7_REAL_PROVIDER_INTEGRATED_ACCEPTANCE.md). This is a demonstration of supported wording, not newly generated simulation evidence. In the application, values should come from retained fields and validated formatting. Keep the mean saving, expansion weights and exact execution counters in the calculation/evidence details, with explanations. Omitting them from the opening paragraph does not mean removing them from the report.

## 5. Interaction and visual presentation

### Use disclosure selectively

GOV.UK advises against hiding content everyone needs and recommends trying clear headings and anchor links before accordions. Apply this by keeping chapter summaries, status and material limitations visible. Collapse the repeated venue detail and audit tables, rather than the entire report. Avoid nested accordions. [GOV.UK accordion guidance](https://design-system.service.gov.uk/components/accordion/).

Allow several details to remain open for comparison. “Expand details” should reveal optional content without changing the evidence snapshot. Opening an evidence link should reveal its target automatically; browser Back should restore the reader's place. A print view should include all approved report content, irrespective of the screen's disclosure state.

For custom accordion controls, use heading buttons with accurate expanded state and panel associations. Support Enter, Space and normal Tab navigation. Do not rely on a clickable `div` or colour alone. [W3C accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).

### Make the document comfortable to read

Retain the application's existing visual language. The main change should be hierarchy: question, findings, explanatory text, then audit detail. Proposed starting values are a roughly 60–75-character prose measure, 16-pixel body text and line height around 1.6. Give tables a wider container when needed. These are implementation defaults to evaluate, not compliance thresholds.

Use sentence-case headings and restrained evidence labels: **Calculated**, **Fictional recorded activity**, **Assumption**, **Source context** and **Unknown**. Keep caveats beside the result they qualify. Do not make every warning visually identical; an interrupted run needs greater prominence than a routine methodology note.

### Prefer a few purposeful visuals

| Information | Recommended display | Interpretation rule |
|---|---|---|
| Journey outcome coverage | Seven-category table, optionally a horizontal bar chart | Keep improved, unchanged, worse, newly reachable, unreachable, unknown and not applicable distinct. Label representative counts versus expansion weights. |
| Main commuting result | One scoped metric with denominator and unit | Mean saving applies to the comparable subset; a negative value must be described as increased time. |
| Selected discussion cohort | Separate compact table | Unweighted selection context; not a national sample or population benefit rate. |
| Discussion findings | Short narrative summaries of agreement, disagreement, conditions and unresolved concerns | Lead with what was said and what it means; place environment counts and classification coverage in supporting detail. |
| Development over time | Daily activity table; chart only when enough observed periods exist | Stop at the retained simulated time. Unexecuted periods are unavailable, not zero. |
| Stage execution | Short status list or table | Separate completed initialisation from interrupted social execution. |

For the retained run, improved records are rare beside unchanged and non-applicable records. A broad coverage chart alone could make them difficult to see; retain exact labelled values. Do not invent confidence intervals or a time-saving distribution when only aggregate metrics are available.

Use chart headings that state the supported message, with a subtitle specifying scope and units, and place the source near the chart. Consolidate shared methodological footnotes. [ONS chart text guidance](https://service-manual.ons.gov.uk/data-visualisation/guidance/chart-text).

Provide an accessible data table and a text explanation for any chart. Tables need captions and correctly associated row/column headers. Narrow screens may scroll a wide table within its container without forcing the entire page sideways. [W3C complex images guidance](https://www.w3.org/WAI/tutorials/images/complex/), [W3C tables tutorial](https://www.w3.org/WAI/tutorials/tables/).

## 6. Evidence semantics and missing data

### Keep population results separate from cohort selection

For the retained example:

| Scope | Supported facts | What the report must preserve |
|---|---|---|
| Full synthetic population | 10,000 representatives; expansion weight totals 4,047,260 | Synthetic records and weights are different quantities. |
| Comparable rail subset | 4 improved, 371 unchanged and 0 worse representatives; comparable expansion weight approximately 205,908.33 | Only this subset defines the mean saving and benefiting share. |
| Selected discussion cohort | 50 agents: 4 impact priority, 12 proximity priority and 34 broader comparison | Deliberately enriched selection; do not extrapolate its activity or outcomes to Singapore. |
| Selected cohort journey status | 4 improved, 2 unchanged, 17 unknown and 27 not applicable | Different scope from the full population calculation. |

Source: [acceptance record](../docs/GEOGRAPHIC_SELECTION_V7_REAL_PROVIDER_INTEGRATED_ACCEPTANCE.md). The [public commute validator](../lib/citizen-grounding/public-contract.ts) already reconciles coverage totals, comparable weight, mean and benefiting share. Reuse that authority.

The structured cohort-selection buckets are not exposed as dedicated fields in `HybridPublicGrounding`; selection is currently included through a limitation string. Add a versioned, aggregate-only selection summary before building reusable cohort cards. Do not parse prose to recover numbers or expose individual selection distances. [Grounding contract](../lib/interventions/explore-contract.ts), [grounding projection](../lib/server/interventions/explore.ts), [selection logic](../lib/citizen-grounding/selection.ts).

### Use explicit absence states

| Situation | Suggested wording |
|---|---|
| Complete retained scope contains no matching events | “No matching activity was recorded in this scope.” |
| Historical summary lacks a field | “Unavailable for this historical run.” |
| Calculation has no comparable journeys | “No comparable journeys; mean saving is undefined.” |
| Social execution stopped before accepted discussion | “No accepted social decisions before interruption.” |
| No issue tags were supplied | “No explicit issue declarations; substantive issue outcomes are unknown.” |
| A simulated day was never reached | “Not simulated in this retained snapshot.” |
| Usage or charge did not return | “Unknown”; show any conservative reservation separately. |

Zero, missing, unsupported and not yet simulated must not share the same display value. Null numerical results must not become zero through formatting. Detailed constraints and uncertainty belong alongside the relevant result; this follows the communication principle in [Government Analysis Function guidance](https://gss.civilservice.gov.uk/policy-store/communicating-quality-uncertainty-and-change/). That guidance is marked under review and is used here for communication principles, not current accessibility requirements.

### Present discussion claims at their actual level of support

`DiscussionSummary` includes counts of self-classified concerns, conditions, support, questions and disagreements; topic coverage; follow-ups; thread depth; state changes; and explicit issue status counts. It deliberately excludes source-event IDs, message text, memories and issue records. Initial stakeholder actions in `PublicExplore` also omit their statement text. [Discussion contract](../lib/society/discussion-contract.ts), [public contract](../lib/society/public-contract.ts).

Consequently, existing fields can separately support statements such as “three decisions were tagged as concerns” or “this topic appeared in recorded classifications,” when those fields exist. They cannot support an invented account of what the concern was, who answered it or how the answer resolved it. Topic and argument counts do not establish the cross-tabulation between a particular topic and a particular argument, nor do they establish consensus.

To deliver the requested narrative, build a server-side projection that emits permitted content summaries and opaque public references. It must preserve the actual point discussed, stated position and reasons, conditions, relevant replies, changes over time and contradictory evidence. Retain actor identity internally to avoid counting repeated comments as independent agreement. Preserve whether an issue was author-reported closed or met an explicit calculated criterion. Neither means independent verification, consensus or real-world resolution. Missing tags and unclassified items must remain visible as coverage gaps.

The internal `AggregateFactPack` already maps several aggregate claims to source event IDs. Use it as a starting point for aggregate traceability, without serialising the pack or its event IDs into ordinary browser responses. Content-specific narrative references would require additional mapping and disclosure review. [Fact aggregation](../lib/server/society/facts.ts).

## 7. A bounded ReportWriter

### Compare the options

| Approach | Added inference | Benefits | Main limitation |
|---|---|---|---|
| Reorganised deterministic report | None | Fast, reproducible, directly grounded in existing fields | A foundation/fallback; current counts cannot explain actual agreement, concerns or reasoning. |
| Bounded writer over an approved evidence pack | One bounded generation attempt per requested snapshot, as an initial policy | Recommended narrative layer: synthesises permitted positions, agreement, disagreement, concerns and developments | Requires content-preserving evidence, claim validation and evaluation; citations alone do not prove support. |
| Full retrieval/interview report agent | Multiple calls and tool executions | Can investigate additional questions | New evidence acquisition, privacy, accounting, timeouts and consistency responsibilities. |

Recommended order: establish the readable report foundation, build the content-preserving evidence projection, then evaluate and ship the bounded narrative writer with evidence navigation. A reorganised metrics page alone does not satisfy the requested outcome. No dollar or latency estimate is claimed without a representative benchmark.

### Proposed responsibility boundary

1. **Snapshot assembly:** the server captures the accepted evidence prefix, scenario identities, source versions and disclosure policy.
2. **Evidence selection:** deterministic code selects a bounded set of permitted content summaries, positions, conditions, replies, contrary evidence, aggregates and approved source context. Selection must not include only the most supportive material; flag omitted evidence and incomplete participation.
3. **Writing:** the model returns short narrative findings covering agreement, disagreement, concerns, developments and unknowns, with evidence reference IDs and metric tokens. Chapter structure remains application-owned.
4. **Validation:** the server checks schema, size, snapshot identity, reference eligibility, metric eligibility and required status/limitation handling.
5. **Rendering:** the application supplies numbers, units, denominator labels, citations and destinations from validated records.
6. **Retention:** save the accepted writer artifact separately, with its provenance and accounting. Keep the deterministic report available throughout.

“Approved” means admitted by the application's evidence and disclosure rules. It does not imply another manual approval screen.

### Evidence pack contents

| Field group | Include |
|---|---|
| Identity | Run, exact evidence revision/hash, scenario binding, question and report schema version. |
| Execution | Initialisation status, social status, reached simulated time and retained coverage. |
| Metrics | Allowlisted metric IDs, values, units, scopes, denominators and interpretation constraints. |
| Fictional discussion | Permitted summaries of the actual points discussed, distinct-participant positions, reasons, conditions, reply/development links, contrary evidence and coverage; aggregate counts as supporting context. |
| Sources | Validated source IDs and only passages already permitted for this use; retrieval is not independent verification. |
| Limitations | Material assumptions, unknowns and question-specific unsupported outcomes. |
| Reference index | Opaque public evidence anchors and eligible graph targets belonging to this snapshot. |

Exclude raw private conversations, memory, hidden membership histories, session tokens and unrestricted internal world objects from the writer pack and browser response. Counts alone are insufficient for the desired synthesis: add an explicitly allowlisted server-side content projection, with privacy rules governing which derived summaries may reach the writer and browser. If a point cannot be summarised under those rules, mark it unavailable rather than inventing it or exposing the underlying private text.

Keep trusted task instructions separate from quoted evidence. Evidence text must never grant tool authority. The bounded writer has no autonomous search, graph mutation, calculator mutation or interview tools.

### Own numbers and claim wording separately

The writer may refer to a registered metric token; it must not replace the value or supply an arbitrary denominator. Prefer typed content segments for text, metric references and evidence references. The renderer resolves metric segments using server-owned records.

This prevents invented displayed values but does not by itself prevent a misleading sentence around a correct value. Keep status sentences, scope labels and consequential numerical comparisons deterministic. Validate and evaluate narrative entailment separately. A valid evidence ID proves that a reference exists; it does not prove that it supports the prose.

If the writer invents an ID, cites another run, claims completed social execution after interruption, or supplies unsupported outcomes, reject its output and retain the deterministic report. Do not repair invalid references by silently dropping them while displaying the claim.

### Snapshot cache and lifecycle

The current public service maintains revisions and updates accepted public projections. Therefore, a run ID alone is insufficient to identify report evidence. [Public service](../lib/server/society/public-service.ts).

Use a cache identity covering at least the run ID, retained evidence snapshot hash, report schema, evidence policy, prompt/writer version and model configuration. Exclude authentication tokens from the evidence pack and artifact. Retain access checks for cached reports.

For a running simulation, show the deterministic current report. An explicit “Generate narrative for this snapshot” can capture a prefix once. If the simulation later advances, label the narrative's earlier snapshot and offer a deliberate refresh; do not generate on every poll or merely on opening the Report. Reopening an unchanged cached artifact should make zero inference calls. Deduplicate concurrent generation requests.

Store writer usage separately from planning, stakeholder initialisation, personality initialisation and social execution. A failed writer should not alter or retry the simulation. If a provider call times out, preserve uncertain accounting rather than automatically retrying it.

### Progress presentation

Keep simulation progress and narrative-job status distinct. Suggested writer states are queued, preparing evidence, writing, validating, ready and failed. Show real phase transitions and elapsed time; avoid a fabricated percentage or an ETA without measurement. Display only validated narrative blocks. A small first writer does not need section-by-section streaming.

Announce meaningful asynchronous status changes without moving keyboard focus, and avoid reading the entire changing report through a live region. [W3C status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

## 8. Evidence navigation and accounting

Every finding should have a stable report anchor and an evidence action. Open a report evidence block first; offer graph navigation only when an eligible node or relationship exists. Keep the target bound to the retained run and snapshot, and support a return to the originating finding. Do not create an apparently meaningful graph edge merely to make a citation clickable.

An evidence block should state the claim type, permitted supporting facts, calculation scope or source attribution, relevant assumptions and technical identity under disclosure. A source link supports only the claim it actually contains. Retrieved text is not proof of a proposed relationship. The earlier [graph/report research](Knowledge_Graph_and_Report_Improvement_Research.md) provides the wider navigation proposal.

In chapter 6, consolidate stage accounting into one table:

| Stage | Show separately |
|---|---|
| Interpretation/planning | Calls and known usage; deterministic admission when no model interpretation was used. |
| Initial stakeholder actions | Accepted initial records and their usage. |
| Personality initialisation | Profile-generation calls and known usage. |
| Social execution | Opportunities, returned/accepted decisions where known, failures, tokens and uncertain reservations. |
| ReportWriter | Narrative-specific generation and validation outcome, usage and snapshot; absent on older/fallback reports. |

Some current fields do not expose returned-response counts independently, so do not infer those from “failed.” Extend the stage DTO if that distinction is needed. For the retained example, the acceptance record establishes zero returned social responses: a returned-response acceptance percentage is undefined. Avoid a combined total until the stages are demonstrably disjoint and all unknown charges are represented.

## 9. Delivery sequence and validation

**Later/full-scope roadmap:** the following phases describe the broader research proposal. The current hackathon prototype follows **Current hackathon implementation plan** above and does not implement all of these phases or acceptance gates.

### Phase 1: Build the plain-language report foundation

Target [CommunicationReport](../components/communication-report.tsx), [DiscussionDetails](../components/discussion-summary.tsx), [CitizenCommuteReport](../components/citizen-commute-panel.tsx) and [report styles](../components/social-simulation.css).

- Add the question-led header, deterministic executive findings and prominent execution status.
- Render the six chapters, chapter links and visible summaries.
- Move accounting and detailed chronology into methodology.
- Replace repeated venue prose with a compact comparison and optional details.
- Use everyday displayed headings and explain each result's meaning before showing its supporting counts.
- Preserve coverage, source attribution and material caveats.

This foundation should need no model calls, new chart library or change to calculation semantics. Use only existing typed fields; unavailable narrative detail stays explicitly unavailable. This is an intermediate delivery, not completion of the requested informative discussion report.

### Phase 2: Preserve discussion meaning and supporting evidence

Target the public contracts, server fact projection and report/workspace integration. Introduce versioned, permitted discussion summaries preserving positions, reasons, conditions, replies, development and contrary evidence. Add distinct-participant and participation coverage needed to assess agreement, public evidence references and typed aggregate cohort-selection fields, with historical fallbacks. Add report-to-evidence navigation, then eligible graph targets. Keep ledger mappings private.

### Phase 3: Deliver the informative narrative report

Add a server-only evidence assembler, bounded writer, validator and separately retained artifact. Produce plain-language findings about agreement, disagreement, concerns, conditions, developments and unresolved questions, alongside calculated effects. Build on existing inference, storage, privacy and accounting rules. Use mocked/offline evaluation first; any provider benchmark should be separately budgeted and deliberately initiated. Do not trigger new generation when viewing historical evidence. Keep the readable deterministic report as a fallback.

### Acceptance checks

| Area | Required evidence before release |
|---|---|
| Comprehension | Unfamiliar readers can identify the original question, calculation scope, social completion status and one unsupported outcome. A proposed formative target is within one minute; no result is claimed yet. |
| Informative narrative | Readers can explain the main agreement, disagreement, concern and unresolved question, or understand why the available run cannot establish them, without reading usage counters or a glossary. |
| Agreement validity | Repeated comments from one actor, conditional support, silence, contradictory replies, sparse participation and missing classifications cannot become blanket consensus. Test these cases explicitly. |
| Known interrupted run | Header says interrupted; eight initial actions are distinct from zero accepted social decisions; the report does not narrate later days. |
| Metric integrity | All visible numbers reconcile to the accepted calculation; representative counts, weights and selected-cohort counts are labelled separately. |
| Missing data | Nulls, no comparable journeys, absent historical fields and unexecuted days use the explicit absence states. |
| Discussion coverage | Tagged, unclassified, model-authored and rule-authored material remain distinguishable. Empty tags do not become “no concerns.” |
| Evidence navigation | References resolve within the same snapshot, expand their target, and return to the finding without exposing private records. |
| Accessibility/layout | Keyboard use, headings, focus visibility, status announcements, chart/table alternatives and print content are checked. Verify desktop evidence sizes, a narrow viewport and zoom. |
| Writer reliability | Invalid/cross-run citations, unsupported conclusions, invented metrics, malformed output and timeouts preserve the deterministic fallback. A cache hit makes zero model calls. |
| Lifecycle | Advancing a run cannot silently pair an old narrative with new metrics; duplicate writer requests cannot dispatch duplicate generation. |

The implementation scope is **a plain-language narrative report supported by a content-preserving evidence projection and bounded writer**. Build the deterministic six-chapter foundation first, but assess completion against whether a reader understands the findings, agreement, disagreement and unknowns, not just whether the technical sections have been rearranged.

## 10. Source notes

- **Local evidence:** source and screenshots linked throughout establish the current implementation and retained example. The earlier research is context; its claims were checked against the relevant current files rather than treated as independent evidence.
- **MiroFish:** [ReportAgent](https://github.com/666ghj/MiroFish/blob/main/backend/app/services/report_agent.py) and [Step4Report](https://github.com/666ghj/MiroFish/blob/main/frontend/src/components/Step4Report.vue), consulted 2 November 2026. Source comparison only; no upstream runtime or cost benchmark.
- **Disclosure:** [GOV.UK accordion guidance](https://design-system.service.gov.uk/components/accordion/) supports selective hiding and testing the simpler document first.
- **Chart communication:** [ONS chart text guidance](https://service-manual.ons.gov.uk/data-visualisation/guidance/chart-text) supports concise messages, scoped labels and nearby source information.
- **Limitations:** [Government Analysis Function communication guidance](https://gss.civilservice.gov.uk/policy-store/communicating-quality-uncertainty-and-change/) supports explaining uncertainty and limitations beside results; the page is under review.
- **Accessibility:** [W3C accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/), [tables](https://www.w3.org/WAI/tutorials/tables/), [complex images](https://www.w3.org/WAI/tutorials/images/complex/) and [status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) inform the proposed interaction requirements. This document does not certify WCAG conformance.
