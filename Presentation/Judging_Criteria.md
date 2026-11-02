# ImpactLens SG — Judging Criteria and Presentation Notes

Prepared: 2 November 2026. Based on repository code, implementation reports and the official sources linked below.

This document distinguishes implemented capabilities, previously recorded verification and proposed validation. No application tests, build or paid AI evaluation were run to prepare it. Historical test results do not certify the current working tree.

## Project positioning

**ImpactLens SG is a Singapore social-impact sandbox that helps people explore “What if?” questions through a map, explicit numerical models and fictional AI stakeholder interactions.**

Users can draw an intervention, ask a question, inspect a knowledge graph and review a report. Supported MRT and limited Active Ageing Centre (AAC) calculations provide conditional accessibility comparisons. AI explores possible concerns and interactions around a scenario. Calculations, assumptions, retrieved context and fictional responses have different evidence status.

**Suggested opening:**

> A proposed MRT connection can look useful on a map, but who might benefit, who remains unassessed, and what practical concerns should we investigate? ImpactLens connects a drawn proposal to transparent calculations and fictional stakeholder discussions, helping users ask better questions before making real decisions.

## 1. Problem Definition & User Impact

### The real-world problem

Infrastructure and community-service decisions affect people differently. A route map alone does not explain the distribution of accessibility changes; an aggregate improvement can also hide unchanged or unassessed groups. Early discussions need a way to connect a proposed intervention to its assumptions, possible beneficiaries and unanswered questions.

ImpactLens addresses the **early exploration and communication** of these trade-offs. The hypothesis is that combining spatial interaction, conditional calculations and inspectable stakeholder scenarios can make those discussions easier to understand. That product need still requires direct user validation.

### Target users

These are intended users, not established customers or confirmed partners:

| User | Task and need | Relevant project capability |
| --- | --- | --- |
| Community organisations and service planners | Explore where a proposed community service could improve access and identify missing evidence | Limited AAC placement and accessibility comparisons |
| Transport and urban-planning teams | Examine an illustrative network change and compare modelled journeys | MRT drawing, confirmed connections and baseline/scenario routing |
| Students and civic educators | Understand how assumptions and competing priorities affect a proposal | Map, synthetic stakeholder discussion, knowledge graph and report |
| Residents participating in consultations | Understand a proposal and formulate questions for decision-makers | Plain-language questions and visible scenario context; usability with residents remains unvalidated |

### Evidence of need

- **Transport accessibility is an established national priority.** LTA's Land Transport Master Plan 2040 includes 20-minute towns, a 45-minute city and inclusive infrastructure. LTA also reports that over 7,400 Singaporeans contributed views during its development. This supports the relevance of accessibility and consultation; it does not establish demand for ImpactLens. [LTA: Land Transport Master Plan 2040](https://www.lta.gov.sg/content/ltagov/en/who_we_are/our_work/land_transport_master_plan_2040.html)
- **Ageing makes community access consequential.** MOH's Action Plan for Successful Ageing states that around one in four Singaporeans will be aged 65 or above by 2030 and addresses needs across health, social welfare and infrastructure. This supports the relevance of an eldercare use case, rather than proving that an additional centre improves health. [MOH: Action Plan for Successful Ageing 2023](https://www.moh.gov.sg/others/resources-and-statistics/action-plan-for-successful-ageing/)
- **The project has a substantive data foundation.** Census 2020 aggregates support a 10,000-record weighted synthetic population. Additional official aggregate snapshots inform employment and commuting circumstances, with fictional assignments and missing data explicitly documented. These are synthetic representatives, not 10,000 real users. [Employment data and limitations](../data/employment/README.md)

### Meaningful potential impact

The intended benefit is better-informed exploration: identify conditional accessibility changes, reveal gaps in coverage and surface questions for genuine consultation. AI-generated discussion is a source of hypotheses, not evidence of what residents believe.

An important honest example comes from the recorded v7 MRT evaluation: the full 10,000-record population had four improved proxy journeys, while the selected 50-person simulation cohort had **zero beneficiaries**. The project retained that result. This demonstrates why a persuasive fictional discussion must not be mistaken for measured travel benefits. Counts refer to synthetic records, not observed people. [Recorded v7 evaluation](../docs/CONVERSATION_MENU_V7_SMALL_REAL_PROVIDER_VERIFICATION.md)

**Evidence to add:** interview intended users, record their current workflow and test whether they can identify the assumptions, beneficiaries and unknowns using ImpactLens. Measure task completion time and comprehension before/after; report participant count and method. No adoption, time saving or real-world outcome is established by the reviewed evidence.

**Presentation line:** “We help users see who may benefit under a scenario, who cannot yet be assessed, and what needs to be checked with real people.”

## 2. Innovation & Originality

### The distinctive approach

The strongest originality claim is the **integration of spatial proposals, deterministic impact calculations and persistent fictional stakeholder interactions in one inspectable workflow**.

| Design choice | Why it adds value |
| --- | --- |
| Draw an intervention and ask a question in the same workspace | Keeps spatial context connected to the user's intent |
| Separate numerical models from AI discussion | Makes conditional metrics inspectable without allowing generated prose to rewrite them |
| Give agents bounded memory and access to earlier accepted interactions | Enables subsequent responses to address recorded exchanges rather than producing one static transcript |
| Project accepted events into a knowledge graph and report | Helps users inspect relationships and the provenance of the simulated discussion |
| Preserve uncertainty, unchanged outcomes and failed/partial runs | Exposes limits that a polished narrative could otherwise conceal |

Compared with using a map, spreadsheet and general chatbot separately, ImpactLens offers a connected workflow with explicit input binding and recorded events. This is a workflow comparison, not a verified claim that competing products lack similar features. No competitor study or “world first” claim is supported.

**Evidence:** [Map-first workflow](../docs/MAP_FIRST_UI_UX_REFACTOR.md), [knowledge graph implementation](../docs/PHASE7G_INTERACTIVE_KNOWLEDGE_GRAPH_IMPLEMENTATION.md), [citizen-grounded integration](../docs/CITIZEN_GROUNDED_MRT_V1_REAL_PROVIDER_ACCEPTANCE.md).

**Evidence to add:** compare the same task using ImpactLens and the current map/spreadsheet/chat workflow. Show whether users understand more, complete the task faster or make fewer unsupported assumptions.

**Presentation line:** “The innovation is connecting a proposed place or route to calculations and an inspectable social scenario, while preserving the boundary between evidence and imagination.”

## 3. AI Implementation & Appropriateness

### Where AI is useful

AI handles language interpretation, scenario framing and fictional interactions. Conventional code owns routing, distance calculations, weights, identifiers and validation. This assigns each technique a task suited to its strengths.

The current implementation includes a fixed live simulation route through **OpenRouter to `deepseek/deepseek-v4-flash-0731`, served by DigitalOcean**, with fallback disabled and structured JSON responses. This describes repository configuration and recorded serving metadata, not independently verified current provider availability. The older optional dashboard explanation layer separately supports explicitly configured Gemini or OpenRouter models. [Live transport](../lib/server/inference/deepseek.ts), [dashboard AI service](../lib/server/ai/service.ts)

### Workflow to explain to judges

1. **Capture intent and geometry.** Bind the question to its drawing, revision and supported intervention. Supported MRT interpretation can be deterministic; ambiguity can require clarification.
2. **Ground the scenario.** Use available aggregate demographic context and optional Tavily retrieval. Retrieved excerpts are untrusted context; search results are not automatically verified evidence. The separate evidence-replay endpoint serves a small historical reference set and must not be presented as live research.
3. **Plan the actors and relationships.** Structured planning selects directly affected fictional stakeholders, goals, tensions and uncertainty. Entity and relationship stages use application-validated references.
4. **Generate interactions sequentially.** Later actions receive earlier accepted events and bounded memories. The citizen-grounded path can initialise model-generated personalities separately from fixed synthetic circumstances and deterministic commute facts.
5. **Validate before accepting.** Enforce schemas, supplied IDs, permitted targets, memory access and context limits. Retain accepted records; invalid or interrupted responses remain failures or partial outcomes.
6. **Show inspectable results.** Graph and report projections expose accepted history and aggregate grounding. Supported numerical calculations retain their own explicit assumptions and provenance.

**Prompt quality:** planner instructions prohibit invented numerical impacts, citations and coordinates; social prompts treat questions, memories and retrieved text as untrusted data and forbid real-world posting or tool use. Validation provides a second boundary beyond instructions. [Planner prompt](../lib/server/inference/planner.ts), [social prompt](../lib/server/inference/social.ts), [grounding retrieval](../lib/server/evidence/tavily.ts), [historical evidence replay](../lib/evidence/SOURCES.md)

### AI evidence and current limits

The recorded 1 November v7 small live evaluation successfully performed planning, eight initial stakeholder actions and a 35-slot personality batch. Of 20 subsequent social responses, **14 were accepted and six rejected: 70% acceptance**. The report classifies the overall result as partial and below its provisional 80% screen. Reaching simulated tick 320 did not constitute a full 350-completion evaluation or proof of realistic behaviour. [Recorded live evaluation](../docs/CONVERSATION_MENU_V7_SMALL_REAL_PROVIDER_VERIFICATION.md)

The appropriate next AI evidence is a controlled evaluation of response validity, grounded statements, relevant peer replies, memory use, cost and latency. Repeated runs and expert/user review are needed to assess realism. Schema compliance alone cannot establish social accuracy.

**Multimodal scope:** maps and 3D rendering are visual interfaces; submitted coordinates are structured geometry. The reviewed implementation does not establish image, audio, speech or video model inference. Fictional media descriptions remain text. Present the meaningful text-based AI workflow clearly.

**Presentation line:** “AI explores possible human concerns; deterministic models calculate supported quantities; validators control what enters the recorded scenario.”

## 4. Technical Execution & Functionality

### Architecture and implemented functionality

```text
Next.js / React / TypeScript interface
  MapLibre map, plotting, knowledge graph and report
                       |
                Node.js API routes
                       |
       +---------------+----------------+
       |               |                |
 Deterministic     AI orchestration    Local records
 MRT / AAC /       and optional        journals, checkpoints,
 population        retrieval          validated replay
       |               |
 Local source      External APIs:
 snapshots         OpenRouter / Tavily;
                   optional Gemini layer
```

- **MRT:** baseline/scenario routing with static segment estimates, explicit waiting and transfer assumptions, and confirmed network connections. It does not assess construction feasibility or live train operations.
- **AAC:** compare geographic access to a proposed point using a limited corroborated historical catalogue and origin proxies. It does not model attendance, capacity, actual walking routes or health outcomes.
- **Map and results:** a persistent Singapore map, drawing tools and Map / Knowledge Graph / Report navigation. Revisions and run identities prevent unrelated or stale results from appearing as current.
- **Recovery:** journals, checkpoints and replay support inspection and restoration of recorded accepted history without regenerating it. This is replay of stored model output, not reproducible fresh inference.
- **Operational controls:** bounded requests, deadlines, cancellation, inference admission and storage-capacity checks. Provider failures do not become fabricated successful runs.

**Evidence:** [Package and commands](../package.json), [MRT engine](../prototype/mrt/simulation.ts), [AAC engine and limitations](../docs/ELDERCARE_ACCESSIBILITY_ENGINE.md), [map workflow checks](../docs/MAP_FIRST_UI_UX_REFACTOR.md), [storage reliability](../docs/CITIZEN_MENU_RELIABILITY_AND_STORAGE_ADMISSION.md).

### Verification and deployment readiness

The reviewed v7 acceptance report records **2,019 network-blocked tests**, TypeScript checks and a production build passing at its pinned source. Those are historical results. Mocked cohort and recovery checks establish software capability; genuine provider testing establishes narrower live behaviour. Neither establishes accuracy against actual social outcomes. [Verification record](../docs/CONVERSATION_MENU_V7_SMALL_REAL_PROVIDER_VERIFICATION.md)

The application is a **local research prototype**, with scripts bound to `127.0.0.1`. A successful production build does not establish readiness for public hosting. Building-data documentation retains local-review-only distribution limits and unresolved acquisition/licensing questions. Resolve those before promising a public demo, deployment or downloadable dataset. [Map source restrictions](../docs/MAP_FIRST_UI_UX_REFACTOR.md), [building source audit](../docs/PHASE7C_BUILDING_SOURCE_AUDIT.md)

**Demo evidence to prepare:** a confirmed local scenario, visible assumptions, its numerical result and the matching graph/report. Rehearse cancellation and recovery. If using recorded output, label it as replay and disclose the date and completion status. Follow existing data restrictions when choosing what to show or distribute.

**Presentation line:** “We have an implemented local workflow with recorded tests and recovery controls; live AI reliability and public distribution still need further work.”

## 5. Responsible AI, Ethics, Privacy & Security

| Area | Existing approach and evidence | Remaining limitation or action |
| --- | --- | --- |
| Transparency | Synthetic agents, assumptions, provenance and partial outcomes are explicit; qualitative dialogue is distinct from numerical output | State clearly that simulated opinions are not public consultation, polling or forecasts |
| Fairness and bias | Preserve Census weights, missing values and unassessed outcomes; anonymous personality slots avoid supplying demographics/jobs to personality generation | Census 2020 is historical; invented circumstances and model priors can still stereotype. Audit behaviour and coverage across groups |
| Statistical representation | Full-population impact and a small social cohort have different roles; cohort selection cannot establish representativeness | Do not treat an enriched or small cohort's issue rate as a population statistic |
| Privacy | Use public aggregate sources and fictional individual circumstances; bounded public projections omit private internal profile/memory bodies | Local storage is only part of the data flow. Questions, excerpts and selected synthetic context can leave the machine for AI/search APIs |
| Consent and human oversight | Users explicitly confirm MRT connections and timing assumptions; AI proposes fictional actions rather than executing real decisions | Before involving real participants, explain external processing, obtain appropriate consent and define retention/deletion practices |
| Security | Server-side keys, structured validation, bounded payloads, stale-result protection and untrusted-input prompt rules | No independent penetration test or complete public-service security assessment is established. Local origin checks are not a substitute for authentication |
| Cost and reliability | Call/context limits, deadlines, conservative reservations and honest unknown-cost handling | Local spending admission is not a guaranteed external billing cap; real-provider rejection remains material |
| Copyright and IP | Source attribution, licence metadata and a Sources & licences interface; privacy-related build tracing exclusions are documented | Combined building-database/licensing and acquisition-receipt gaps remain unresolved; attribution alone does not grant distribution rights |
| Generated content disclosure | Stakeholder statements and fictional platform interactions are synthetic; generated actions do not post to real social platforms | Label exported reports, screenshots and demo recordings with their synthetic/replay status; do not imply endorsement by actual institutions |

**Evidence:** [Aggregate data boundaries](../data/employment/README.md), [personality and private-asset handling](../docs/CITIZEN_GROUNDED_MRT_V1_REAL_PROVIDER_ACCEPTANCE.md), [bounded AI service](../lib/server/ai/service.ts), [social action constraints](../lib/server/inference/social.ts), [source restrictions](../docs/MAP_FIRST_UI_UX_REFACTOR.md).

**Presentation line:** “We make uncertainty and fictional content visible, keep humans responsible for decisions, and disclose where data leaves the local system. Our safeguards reduce risk; they do not establish unbiased or production-secure AI.”

## Priority gaps before judging

1. **Validate the user problem.** Obtain direct feedback from intended users and show a concrete task they struggle with today. Policy relevance supports the context; user research supports the product.
2. **Choose one defensible demonstration.** Show the actual assumptions and outcome, including zero benefit or missing coverage where applicable. Resolve source-use restrictions for the intended audience and materials.
3. **Describe AI evidence precisely.** Separate offline fixtures, real-provider observations and replay. Address the recorded 70% social-response acceptance rather than implying the live system is fully reliable.
4. **Measure potential value.** Test comprehension and task time before claiming savings or better decisions. Keep these as proposed measures until results exist.
5. **State the deployment boundary.** Present a local prototype today; name licensing clearance, appropriate access controls and deployment checks as work still required for public use.

## Short closing pitch

> ImpactLens makes social-impact questions inspectable. Users draw a proposal, compare supported accessibility calculations and explore fictional stakeholder interactions through a graph and report. The potential value is a clearer starting point for planning and consultation, with assumptions and unknowns visible. Our next evidence must come from real users and stronger live AI reliability, while preserving those boundaries.
