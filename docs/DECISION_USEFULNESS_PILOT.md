# Does synthetic discussion improve a planning brief?

This is a runnable **pilot kit**, not a completed human evaluation. There are no recruited participants, interviews, reviewer ratings or validated demand claims in the repository. The next human step is to find three to five people who prepare service-location or consultation briefs and ask them to try it independently.

The six hypothetical Singapore cases cover a polyclinic investigation in Whampoa, AAC outreach in Eunos, sheltered access in Bukit Batok, a claimed polyclinic waiting-time reduction in Toa Payoh, universal shift-worker punctuality in Choa Chu Kang, and an AAC demand claim in Bedok. The last three deliberately require **insufficient evidence** for the stated claim. The first three ask whether the brief supports defining a next research step, not approving a proposal.

## What the comparison tests

Condition 1 is a frozen brief with authored paraphrases and links to inspected official sources. Condition 2 is **the identical brief and sources**, supplemented by bounded public discussion excerpts from an ImpactLens V2 report. Source notes are not verbatim source passages. Site-specific conditions, demand and outcomes remain unknown where not supplied.

Each person sees all six cases but only one version of each: three brief-only and three augmented, with deterministic seeded order and assignment. Across three to five reviewers, each case receives both conditions, differing by at most one allocation. This avoids same-case repetition; related cases can still cause learning. Give each person only their own packet, never the facilitator study or another packet. Ask them not to discuss cases until every reviewer finishes.

The presence of dialogue reveals the condition. This is counterbalanced allocation, **not fully blinded**. Recruit people independent of the developer where practical and record prior familiarity. The small convenience sample measures possible workflow usefulness and feasibility; it cannot establish causal benefit, realistic Singapore resident concerns, population uncertainty or product demand.

## Prepare the materials

```powershell
npm run pilot:decision -- questions --out tmp/pilot-author
```

This exports six unprepared cases and exact generation questions. First have a practitioner check the source fit, decision questions and provisional stakeholder keys; then freeze the case bundle. The supplied sources were inspected on 7 November 2026. They are contextual evidence, not a fresh official inventory or proof about a proposed site.

For each case, run its **exact** generation question in ImpactLens. Review the resulting report, then select **Download evidence JSON**. The export contains the strict public report, not its underlying private simulation or access token. Attach it:

```powershell
npm run pilot:decision -- attach --cases tmp/pilot-author/cases.json --case polyclinic-whampoa --report path/to/public-report.json --out tmp/pilot-author/cases-1.json
```

Repeat for the other five cases, passing the preceding updated cases file each time and a new output filename. Attachment requires the report question to equal the brief-bearing generation question and at least one retained fictional-discussion evidence item. It imports at most twelve 900-character excerpts. This checks artifact shape and prompt-text identity; it does **not** authenticate authorship, prove that the model used the sources, or establish faithful interpretation. The facilitator must check the actual run and privacy before freezing it. Never substitute a handcrafted supplement or a test fixture. Bounded selected excerpts can omit issues from a full discussion; results therefore concern this supplement format, not every possible output of ImpactLens.

Once all six have supplements:

```powershell
npm run pilot:decision -- build --cases tmp/pilot-author/cases-6.json --reviewers R01,R02,R03 --seed pilot-v1 --out tmp/pilot-study
```

Add `R04` and `R05` if recruited. Output paths must be new; the tool does not overwrite prior packets. Keep `study.json` with the facilitator. Distribute only `R01.packet.json` to R01, and similarly for the others. Hashes identify frozen content and detect accidental edits; they are not signatures, authentication or access control. If materials change, create a new study and rerun the pilot rather than merging results.

## Recruit and interview three to five practitioners

Possible contacts include a community organisation's programme lead, an AAC or other service operator, a consultation researcher, or a planning consultancy. These are candidate roles, not confirmed collaborators. No outreach has been sent. A willing tester is not proof of customer demand.

Use a 15–20 minute interview before showing synthetic discussion. Ask about a **recent actual brief**, not whether they like an AI idea:

1. What decision did that brief need to support, and who used it?
2. What sources, maps and consultation material did you use?
3. Which concerns or stakeholders were easy to miss?
4. What did you do when evidence was incomplete or contradictory?
5. How did you check an unsupported claim, and what did that cost in time?
6. What makes a research question usable in your workflow?
7. What could a tool get wrong that would make you stop using it?
8. After the exercise, would a concrete trial on your next non-confidential brief be useful? Record an actual agreed next action separately from polite interest.

Use [the interview template](decision-pilot/interview-notes.md). Explain purpose, voluntary participation, withdrawal and intended use of notes before starting; follow the collaborator's own consent requirements. Use pseudonyms, avoid resident or client details, and do not record audio without separate agreement. Keep contact details and any identity key outside the repository and packets. Agree a local retention/deletion date. No interview material is used to impersonate a participant or ground an agent without a separate explicit agreement.

## Run independent reviews

Open ImpactLens → **Decision pilot**, or `/evaluation`. Import the assigned packet. Read the confidentiality and fictional-content notice, confirm voluntary participation and independent completion, then start each case.

The page shows a **specific decision question**. Select whether the evidence is sufficient for that exact question. Rejecting an unsupported effect claim does not prevent writing useful follow-up research questions.

Ask for a small prioritised response: up to three important concerns, stakeholder groups that need consideration, packet claims that need verification, and actionable research questions. The software permits more entries but the same instruction applies to both conditions. References must point to source or discussion IDs actually in that packet. Hypothetical premises and questions are not automatically unsupported factual assertions. Do not reward longer output merely for containing more words.

Start/Pause/Resume controls record **active visible time** and **elapsed time from first Start to submission**. Hidden tabs and source-link clicks pause active time. Elapsed time includes source checking, pauses and breaks. Neither is silently treated as total productive review time; ask about interruptions at debrief. A case has a two-hour software bound, not a recommended task duration. Expired cases cannot save a capped time as though it were an exact observation; leave them missing and report the interruption to the organiser. Set the same practical time budget for both conditions before testing.

Responses stay in memory until downloaded. No response is automatically uploaded, put in browser storage or added to Git. Export before closing or refreshing. Partial exports are allowed; missing cases remain explicitly missing. Importing a different packet clears the current in-memory session. Use one final export per reviewer; duplicate exports are rejected during analysis.

## Code and analyse results

Place final reviewer exports in a dedicated directory with no other JSON files:

```powershell
npm run pilot:decision -- analyse --study tmp/pilot-study/study.json --reviews path/to/reviewer-exports --out tmp/pilot-analysis-uncoded
```

This produces descriptive rows and an intentionally incomplete `coding-template.json`. Quality judgments stay null until humans code them. Do not replace nulls with empty arrays merely to make the file pass validation.

Ask two practitioners to code independently, preferably without knowing allocation. They can be among the original participants **after** all reviews finish, but should not code their own responses. Record conflicts and prior familiarity. Keep both initial worksheets; reconcile differences into one final adjudicated coding row per review, recording adjudicator identity and reasoning in notes. The analysis accepts the final coding only and does not claim to calculate inter-rater reliability from it. `reviewHash` binds each coding to the exact response; changed text, decision or timing requires a fresh judgment.

| Measure | Human coding rule | Interpretation |
| --- | --- | --- |
| Useful concerns discovered | Select concern IDs that add a relevant, decision-bearing issue beyond what the brief explicitly says; merge semantic duplicates before counting | New useful scoping material, not merely fluent or plausible dialogue |
| Missed stakeholders | Record material groups omitted from the response, using the provisional key and allowing justified additions | A practitioner judgment, not an exhaustive resident ground truth |
| Unsupported packet claims | Confirm listed claim IDs only when they identify unsupported **assertions present in the packet**; independently audit the full packet and add missed assertions in `additionalUnsupportedClaims` | A detected/audited content burden, not a reviewer endorsement error; more detections can mean better checking, so inspect detected versus additional counts and context |
| Review time | Active and elapsed minutes plus interruption notes | Added attention/source checking must be considered alongside concern quality |
| Actionable research questions | Select question IDs that specify missing evidence and how it would resolve the stated decision; merge duplicates | A question someone could investigate, not a generic request for more data |
| Correct evidence decision | Judge the response against the **stated decision question**, not whether the proposal sounds attractive | Especially check unsupported numerical/universal claims |

Do not count a clearly labelled fictional concern, conditional hypothesis or challenge to a claim as an unsupported real-world assertion. Record material unsupported packet claims even if the reviewer did not detect them; inspect whether they entered the final decision reasoning. Novel concerns outside the provisional key need documented justification, not automatic rejection.

Run the analysis again with the completed final array:

```powershell
npm run pilot:decision -- analyse --study tmp/pilot-study/study.json --reviews path/to/reviewer-exports --coding path/to/final-coding.json --out tmp/pilot-analysis-coded
```

Read individual rows, missing observations, per-case allocation and condition summaries together. Means exclude absent coding; different coded subsets must not be treated as comparable effects. No p-values, confidence intervals, population percentages or automatic "AI improves decisions" verdict is generated. Before testing, agree what extra review burden is acceptable and what claim errors are unacceptable. Afterward decide whether to revise, stop or test a larger sample, documenting negative and inconclusive results too.

## Research rationale and next grounding experiment

[Park et al., arXiv:2411.10109v3](https://arxiv.org/abs/2411.10109v3), revised June 2026, compares agents grounded in interviews, surveys or both with demographic-only agents in an American sample. It motivates testing richer input but supplies no validation for Singapore residents or ImpactLens. The original paper circulated under the title *Generative Agent Simulations of 1,000 People*; use the pinned version when describing its results.

A later study could compare demographics-only with consented, de-identified practitioner/interview or survey grounding while holding cases, models, prompts, source snapshots and evaluation conditions fixed. Practitioner interviews about briefing workflows are not resident interviews and cannot validate resident fidelity. Interview-derived material requires permission for that distinct reuse; do not automatically import these pilot notes into synthetic profiles.

[NIST AI RMF measurement guidance](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) supports evaluation tied to the use context and domain/end-user input. This pilot applies that principle; it is not NIST certification or a validation claim.

## Source notes

The case catalog links to the [MOH capacity programme](https://www.moh.gov.sg/newsroom/enhancing-quality-and-coordination-of-care/), [AIC AAC service description](https://www.aic.sg/care-services/active-ageing-centres), [LTA walking context](https://www.lta.gov.sg/content/ltagov/en/getting_around/active_mobility/walking_cycling_infrastructure/walking.html), [LTA rail service context](https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/rail_network.html) and [LTA inclusive transport guidance](https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/a_better_public_transport_experience/an_inclusive_public_transport_system.html). These establish contextual service or infrastructure descriptions. The proposed local changes and outcomes in the cases are hypothetical.

## Software verification

On 8 November 2026, **85 selected tests passed**, including 25 pilot-specific tests covering preparation/readiness, balanced assignment, withheld material, hashes, references, null quality metrics, human coding, stale coding rejection, timer expiry and completion messaging. TypeScript and the documented Webpack production build passed. Desktop browser checks used explicitly test-only packets; the production app and `/evaluation` returned HTTP 200. No test fixture counts as a participant, real generated discussion or empirical evaluation result.

```powershell
node --test --test-concurrency=2 lib/contracts/tests/decision-pilot-*.test.ts
node node_modules/typescript/bin/tsc --noEmit
npm run build -- --webpack
```
