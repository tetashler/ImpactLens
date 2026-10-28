# Phase 7H question scope and report integration

This guide describes the browser-safe scope contract and report projector in the main `ImpactLens` workspace. It contains no source-code copy. The existing stakeholder execution, evidence replay and MRT/AAC calculators retain their own owners and validation boundaries. Final workspace inventory and integrated acceptance results belong in the main Phase 7H implementation report.

## Scope API

`lib/question-simulation/context.ts` exports `classifyQuestionContext(question)`, `parseQuestionContext(value)`, `QuestionContextV1` and the finite scope, intent, domain, entity and jurisdiction types. Classification is synchronous and performs no network, provider or simulation call.

The version-1 context includes the original question; `scope` (`local`, `cross-border`, `international`, `undetermined`); a finite `intent`; method, confidence and rationale; primary jurisdiction and its provenance; explicitly mentioned relevant jurisdictions; affected-domain hints; candidate entity types; unresolved questions; explicit working assumptions; and `contextIdentity`.

`contextIdentity` is the complete canonical version-1 content key prefixed with `question-context-v1:`. It is not a short hash. It deliberately differs from experiment scenario/configuration hashes, current calculator bindings and stakeholder execution fingerprints. `parseQuestionContext` recomputes the classification and full key, rejecting relabelled scope, unknown fields, unsupported versions, custom prototypes and non-data accessors. Outputs are detached and deeply frozen. Questions are bounded at 2,000 characters and contexts at 65,536 UTF-8 bytes.

The finite jurisdiction catalogue recognises explicitly named countries and regional organisations. It never expands ASEAN into a list of member states. Lowercase “us” does not become the United States. Singapore is either explicitly named or labelled as provisional application context. An explicitly foreign-country question without Singapore does not silently acquire Singapore as its primary jurisdiction. Unrecognised jurisdictions remain an unresolved scope question.

Local MRT, polyclinic and park questions retain local research context. Imported-goods taxes, shipping, foreign-worker rules and headquarters questions have possible cross-border channels, labelled provisional. “Tax” alone does not establish cross-border scope. A tax on imported goods raises an explicit question about GST, excise, specific duties or a proposed tariff; it never assumes a universal tariff or its effects.

## Narrow existing stakeholder demonstration

Only `intent: asean-withdrawal` is a candidate for the existing Singapore withdrawal demonstration. It requires a positive proposed/counterfactual withdrawal interpretation and the supported Singapore context. Withdrawal inflections include “left”, “withdrew” and “withdrawn”. Implied Singapore wording such as “what if we left ASEAN” remains provisional application context.

An ASEAN mention alone is insufficient. Definitions, clear negation, staying/remaining in ASEAN, explicitly foreign-country withdrawal and mixed unrelated policy changes remain research scenarios. For example, “What if Singapore raised GST and left ASEAN?” must not silently execute an immediate-withdrawal script for the tax proposal. This classifier does not authorise execution; the orchestrator must also respect the existing handoff converter, supported assumptions, mode, bounds and run validation.

## Report API

`lib/question-simulation/report.ts` exports asynchronous `projectQuestionReport(options)` plus `ProjectQuestionReportOptions`, `QuestionReportV1`, `QuestionReportSectionV1`, `QuestionReportItemV1` and `QuestionCalculatedResultV1`.

Options contain a validated `context`, an optional actual stakeholder `run`, and optional accepted `calculatedResults` with a required `calculationIdentity` when calculations are supplied. Explicit `undefined` optional arguments are treated as absence after top-level descriptor checks.

The report contains its version, full context identity, question and scope; actual run ID, status and execution mode or `not-run`; bounded sections; retained calculator DTOs; and limitations. Section items are classified as context, synthetic statement, research question, supplied evidence, calculator reference or limitation. Actual event and source IDs remain inspectable. Reports are detached, deeply frozen and bounded at 2,000,000 UTF-8 bytes.

The projector verifies stakeholder input/evidence fingerprints, run identity and exact question correlation. It copies recorded event statements and IDs; it does not create participant turns. Failed, partial and cancelled runs retain their actual status. Supplied stakeholder evidence is labelled supplied context, not independently verified by the report. Missing run evidence remains explicit. Scripted execution remains labelled `deterministic-demo` and retains the original run disclosures.

Cross-border and international sections are research questions. They do not claim firms relocated, workers reacted, treaty rights changed, trade fell or a numerical economic effect occurred. Local reports contain their local research section and applicable limitations without a generic international appendix. Candidate entity types do not establish that any entity exists or was simulated.

## Existing MRT/AAC caller data

Each `QuestionCalculatedResultV1` contains `kind: mrt | aac`, the caller's exact `scenarioIdentity`, `executionIdentity` and the original native `result` DTO. Its scenario binding must match the explicit current `calculationIdentity`, and the question must have the matching local MRT/AAC intent. Missing, stale, duplicate-kind and mismatched bindings are rejected.

MRT DTOs are structurally bounded without rerunning the transport engine. AAC DTOs pass the existing asynchronous eldercare response validator. Both are preserved in their original units, denominators and model scope. The projector does not infer wider social outcomes or recompute engine formulas. The caller remains responsible for supplying an already accepted current calculator result; a binding is not cryptographic proof of an execution. The existing calculator UIs remain the place to configure and run accessibility comparisons.

## Phase 7I boundary

The scope contract exposes candidate entity types and explicitly mentioned jurisdictions for future preparation only. It does not create an agent world, distribute population weights, instantiate firms or citizens, schedule events, activate an agent swarm or call an LLM. A Phase 7I empty-world inspection must remain empty until a separate validated world-building/execution contract exists. Broad international scope must not instantiate every ASEAN country or promote research questions into actors or interactions.

## Focused verification

The owned tests are `lib/contracts/tests/question-context.test.ts` and `lib/contracts/tests/question-report.test.ts`. They exercise local/cross-border/ASEAN scope, jurisdiction provenance, tax ambiguity, narrow intent rejection, immutable semantic validation, real stakeholder run projection, failed execution preservation, MRT/AAC result retention, stale-binding rejection and browser import boundaries.

```powershell
node --test lib/contracts/tests/question-context.test.ts lib/contracts/tests/question-report.test.ts
npx.cmd tsc --noEmit --incremental false
```

No environment, Git history, dependency, external worktree or simulation algorithm change is required by these modules. No live provider or paid model call is part of their checks.

## Final maintained path inventory

```text
components/workspace.tsx
docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md
components/question-console.css
components/question-console.tsx
components/use-question-simulation.ts
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

Main remains master at 2900d0b77e54c5236da9a811181eec7117d14ea8. No index/commit/branch mutations. Workspace composition is the principal likely Phase 7I conflict; new question-simulation files are independent. Existing map, graph renderer, calculators, environment and raw/ignored geographic assets are unchanged.
