# Phase 4C autonomous live debugging — PASS

Two independent real-provider runs qualify: **Sengkang eldercare, attempt 14**, and **four-day workweek, attempt 15**. Both accepted two planning stages, eight stakeholder actions and eight social decisions, exercised private messaging, passed summary/privacy and desktop checks, and replayed without inference. Paid testing stopped. This is observed integration acceptance, not proof of universal planner reliability or realistic population behaviour.

## Baseline, preservation and time

- Task window: 2026-10-30 19:09:35 SGT to 2026-10-30 20:54:27 SGT. Times in the attempt table are SGT, UTC+08:00.
- Branch `master`; HEAD `12ba846f00ec104ead0e7761fa2d5c4175383ffb`, unchanged. Existing uncommitted Phase 4C implementation and previous live repairs were preserved. Prior baseline was reported as 938 tests; final verification actually ran **976**.
- No staging, commits, reset, stash, merge, push, deployment, credential-file edits, secondary-directory access or mobile work. No new dependency, paid provider or graph service.
- Previous FAIL reports are preserved. Attempt 13 below completed the transport flow but was deliberately not counted as qualifying after its profile inconsistency was found.

## Architecture and confirmed repairs

The existing route remains Map -> one Tavily bundle -> entity planning -> canonical registration -> relationship planning -> four fictional stakeholders/two rounds -> one authoritative social session -> bounded continuation batches -> summary Graph and Report. Private journals retain actual encounters, messages, memories, decisions and state transitions. Public APIs return allowlisted DTOs. Opening Graph/Report does not execute inference.

1. **Local scope and references.** Explicit nationwide Singapore questions and recognised Singapore planning areas constrain generation to one Singapore jurisdiction. Sengkang is location context, not another jurisdiction. Local affiliations enumerate the declared slot or null. Ambiguous and legitimate cross-border questions retain broader choices; the authoritative semantic validator was not weakened.
2. **Schema aliasing bug introduced during this task.** The schema builder reused ID objects. Mutating the local jurisdiction enum also constrained entity/type IDs, explaining attempt 4. Replacing property objects fixed the contamination. A namespace-isolation regression reproduces the mistake. This was an application defect, not provider unreliability.
3. **Nested entity declarations.** New stage-one instances are nested inside their type definition; the model cannot generate an undeclared `typeId`. The application deterministically assigns type/instance IDs, then the original authoritative validators and canonical registry run. Generation is compact: at most four types with four instances each, six relationship types, concise roles, and bounded opportunity/uncertainty lists. Runtime/archive limits remain unchanged. Stage two still enumerates actual registered endpoints/types. No fuzzy matching, missing-entity invention, edge redirection or dropped invalid core structure.
4. **Application-owned bookkeeping.** New wire declarations omit unreferenced opportunity, assumption and optional world-edge record IDs. Assembly assigns declaration-order IDs before validation. The effective accepted representation and explicit registry mappings enter the existing immutable identity. Source associations travel with the same declaration. Historical plans are not renumbered or rehashed.
5. **Qualitative prose.** The application supplies a fixed numerical-model limitation instead of asking the model to generate `unsupportedQuantities` examples. Scenario-specific uncertainties remain generated and validated. Prompted quantitative guarantees, including rhetorical percentages, remain prohibited. Provider-side prose regex constraints were tried and then removed after consecutive truncations; their exact causal role is unconfirmed because bodies were not retained. [XGrammar documents regex-subset limitations](https://xgrammar.mlc.ai/docs/latest/defining_structures/lark_grammar.html); this is a portability caution, not identification of DigitalOcean's backend. Strict local numerical rejection remains. Currency matching is shared with the existing runtime policy.
6. **Bounded stakeholder turns.** Generation-only bounds are statement 600 characters, rationale 180, two uncertainties of 160, two references per registry and two topic labels. Non-empty values and interaction prerequisites agree with runtime validation. The run still requests at most 800 output tokens per initial action.
7. **Dynamic stakeholder interaction choices.** `turn-menu-v1` binds a selected action type, addressed role, position and actual available prior-event IDs. Every later-round choice includes another participant; revisions also include the actor's own prior event. The model selects a choice and writes its own response. Unknown choices and invalid prose are rejected. There is no substitute dialogue. The legacy v1 gateway wire remains for compatibility. Effective actions retain the original validated/hash-bound event contract; saved execution never regenerates model text.
8. **Social decision choices.** `action-menu-v1` supplies bounded frozen choices with actual targets, groups, members, exposures and memory bindings. The model supplies a choice, authored text where required, optional legitimate recalls, a listed stance proposal and bounded discussion tags. Unknown choices/recalls, hidden targets, invalid membership and unsafe text remain rejected. Historical decision policies remain replayable. New stance references require an actual other-author primary exposure.
9. **Communication capability intent.** New entities explicitly select null or public-discussion/public-feed/private-group capability separately from their dynamic type and verification. Legacy recognition handles type spelling variants. No named platform is mandatory; no claim of native support for generic venues. Fictional groups are created through actual reducer events during session initialisation, with assumed members. They are not invented after the run or claimed to be spontaneous LLM creations. Precise capability diagnostic paths now include `communication.style`.
10. **Demographic separation.** Attempt 13 paired a fictional elder with an unrelated national sample stratum. New sessions record `roleContext: aggregate-only-v1`: unmatched individual age/sex/home attributes are absent from role-model contexts and summaries. Census national/planning-area context remains available. Twenty background residents retain their supported synthetic strata. Role map markers remain generic sample context, explicitly not role-matched homes/workplaces. This does not claim demographic profile matching. Historical raw worlds/contexts remain unchanged and replay exactly.
11. **Failure and persistence.** Partial/failed initial runs cannot spend social-model completions. Safe background diagnostics identify bounded filesystem codes. An observed Windows `EPERM` is handled by at most five atomic-replacement attempts over 300 ms; no reducer or inference repeats. The previous checkpoint survives failure. Persistent archive capacity is 64, aligned with the accepted-run store; the cache remains four.
12. **Post-run restoration.** Browser key enumeration was unordered before an arbitrary four-entry slice. A separate recency index now orders valid summaries before applying the display bound; legacy records use server retrieval timestamps as a fallback. Existing records are neither deleted nor rehashed. The task ledger's eight-MiB read cap was also too small for append-only snapshots; all snapshots were intact. Its bounded cap is now 128 MiB, with provider/request budgets unchanged. Both defects were repaired offline after provider activity stopped.

The routing configuration remains OpenRouter `deepseek/deepseek-v4-flash-0731`, DigitalOcean only, `allow_fallbacks:false`, `require_parameters:true`, reasoning disabled/excluded, strict serving-identity checks. Retrieval/planning/action deadlines remain 10/45/30 seconds; the initial execution deadline remains 120 seconds. No automatic provider retry or paid evaluation/summary call was added.

## All live attempts in this task

A = exact nationwide four-day-workweek question. B = exact Sengkang eldercare question, reproduced below. Each attempt made one Tavily search and reported one credit. P/I/S are actual planning/initial-action/social completion requests, including rejected/possibly billed calls. Fingerprints identify the complete pending source state at arm time; fixture/audit-only edits also affect them.

| Attempt | Scenario | Armed SGT | Source fingerprint | P/I/S | Reported OpenRouter USD | Acceptance |
|---|---|---|---|---|---|---|
| 1 | A | 19:09:35 | `733f2db24720` | 1/0/0 | 0.001057315 | FAILED |
| 2 | A | 19:13:22 | `7f98aa8f37a4` | 2/2/1 | 0.002186982 | FAILED |
| 3 | B | 19:40:10 | `7bf8cc17d091` | 1/0/0 | 0.001333157 | FAILED |
| 4 | B | 19:46:02 | `293872178965` | 1/0/0 | 0.001124193 | FAILED |
| 5 | B | 19:48:21 | `d392a1652961` | 2/1/0 | 0.001247715 + unknown reserved | FAILED |
| 6 | A | 19:50:06 | `2fc6a77c3db5` | 1/0/0 | 0.000949739 | FAILED |
| 7 | A | 19:56:23 | `61d89b678da2` | 1/0/0 | 0.00081158 | FAILED |
| 8 | A | 20:01:04 | `b5f1eedc41c1` | 2/1/0 | 0.001462391 | FAILED |
| 9 | A | 20:05:15 | `900ccf932619` | 1/0/0 | 0.0008158878 | FAILED |
| 10 | B | 20:09:12 | `0838565b6477` | 1/0/0 | 0.001793568 | FAILED |
| 11 | B | 20:13:44 | `c8537c89b385` | 1/0/0 | 0.0016489354 | FAILED |
| 12 | B | 20:16:51 | `fc9c9af0e83b` | 2/7/0 | 0.0031767764 | FAILED |
| 13 | B | 20:24:00 | `01e2d2fb73f8` | 2/8/8 | 0.0085680952 | PARTIAL: flow complete, profile mismatch |
| 14 | B | 20:34:56 | `2d24be527c09` | 2/8/8 | 0.0078767290 | PASSED |
| 15 | A | 20:42:30 | `e2850c6379db` | 2/8/8 | 0.0079723336 | PASSED |

Failure/fix sequence:

- 1: `agent.cross_reference_invalid`, `draft.agents[0].jurisdictionId` -> explicit local registry.
- 2: both plans, one initial action; next rejected `content.quantitative_claim_forbidden`; first social request rejected `SOCIAL_MEMORY` -> qualitative alignment, social choices, no social spend for partial parents, explicit venue intent.
- 3: `plan.duplicate_value`, `draft.relationships[1].id` -> application-owned unreferenced IDs.
- 4: `ontology.entity_type_duplicate`, `draft.ontology.entityTypes[1].id` -> fix shared schema-node mutation.
- 5: both plans accepted, correct local scope/venues; first initial request returned `AI_UPSTREAM`; zero accepted actions. The charge/usage are unknown. Free generation metadata lookup returned 404. No exact upstream cause is claimed.
- 6: `ontology.entity_type_unknown`, `draft.ontology.entities[0].typeId` -> nested type ownership.
- 7: `plan.unsupported_numeric_claim`, `draft.unsupportedQuantities[1]` -> application-owned general numerical limitation.
- 8: both plans accepted; first initial response terminated `length` at 800 tokens -> concise generation bounds.
- 9: `plan.unsupported_numeric_claim`, `draft.agents[1].context` -> broader qualitative generation audit.
- 10–11: entity response terminated `length` at 6,000 tokens -> compact declarations, then remove suspected provider prose-regex constraints after recurrence. Do not infer the exact truncated contents.
- 12: both plans and six actions; seventh rejected `interaction.other_reference_required` -> dynamic stakeholder choices. Its subsequent society was rule-only, not eight social-model decisions.
- 13: eight initial/eight social decisions, 679 events, one group, 33 nodes/218 edges; exact replay/privacy passed. Desktop inspection found the unrelated role stratum; the run remains partial acceptance, not a qualifying success.
- 14: qualifying B. 15: qualifying A. The final history-list and ledger-size failures were repaired without another provider request. The iteration ledger contains an explicit amendment correcting a prematurely written restore note; the successful restore was then actually verified.

Testing-process correction: attempt 14 was started before two full-suite fixture failures had been fully reviewed. They omitted the explicit communication capability now required by the new wire. The fixtures were corrected offline without changing that running production contract; the full suite subsequently passed. No known privacy or production validation defect was bypassed.

The original rejected ID values, numerical examples and truncated bodies were not retained. Offline fixtures reproduce failure classes, not the exact original responses.

## Qualifying real-provider results

**A — Workweek:** "What if Singapore introduces a nationwide four-day workweek instead of the traditional five-day workweek? How would this affect employees, businesses, productivity, wages, and the wider Singapore economy?"

**B — Eldercare:** "What if Singapore introduces a new government-supported eldercare centre in Sengkang? How might nearby residents, caregivers, community organisations and service providers respond over time?"

| Check | B: attempt 14 | A: attempt 15 |
|---|---|---|
| Plan/run identity | `dynamic-plan` and run identities retained in private safe audit | Same |
| Scope | Local; one Singapore jurisdiction | Local; one Singapore jurisdiction |
| Tavily | HTTP 200; 1.646 s; five usable candidates; one credit | HTTP 200; 3.174 s; two usable candidates; one credit |
| Planning stages | Accepted; 11.614 s / 2.135 s | Accepted; 11.524 s / 3.830 s |
| Initial roles/actions | Four / eight accepted; two rounds | Four / eight accepted; two rounds |
| Initial call-duration sum | 19.911 s | 19.536 s |
| Ongoing social inference | Eight accepted, zero rejected/skipped; 16.056 s call sum | Eight accepted, zero rejected/skipped; 16.774 s call sum |
| Active population / clock | 24 / 80 steps / 1,200 synthetic minutes | Same |
| Event reconciliation | 773 = 8 seeds + 13 social-model events + 752 rule events | 691 = 8 seeds + 12 social-model events + 671 rule events |
| Private group | One; eight members; one message + 30 replies; 46 reads | One; eight members; 28 messages + 28 replies; 51 reads |
| Graph | 29 nodes / 242 edges | 34 nodes / 228 edges |
| Graph composition | Four world candidates + 24 fictional agents + one group | Nine world candidates + 24 fictional agents + one group |
| Inference input/output tokens | 61,357 / 4,465 | 61,530 / 5,497 |
| OpenRouter reported USD | 0.0078767290 | 0.0079723336 |
| Replay | Exact; about 351 ms locally | Exact; about 392 ms locally |
| Overall checkpoint verdict | PASS | PASS |

Durations above are measured request/stage sums, not independent browser wall-clock benchmarks. Extra model events are bounded opinion transitions, not extra completions. Remaining simulated steps use rules after the eight-decision budget. No missing action was fabricated.

Run IDs:

- B: `run-4eb6ce080f244b1990c07983-attempt-33-0f05847c-8a1b-4f55-8963-b62603e92567`
- A: `run-1ffa5210e1b148be40931acd-attempt-5-380442eb-e4b6-42f0-93ba-42a4f662592b`

Accepted immutable plan IDs: B `dynamic-plan-4bbb9575ddd658d53cd24d3355ec2cb74ab75541a06276f66bd6353e5f51b4a2`; A `dynamic-plan-dd2f5e77ad67b3d7a9fcf3b33d31685de4a7162e7591bd4c92ccf2778488e5d9`.

### Sources, entities and provenance

B retrieved relevant community-care/caregiver material, including [CSC's community-care discussion](https://knowledge.csc.gov.sg/ethos-issue-20/transforming-community-care-in-2030), alongside social/news candidates. A retrieved [Indeed Singapore's four-day-workweek article](https://sg.indeed.com/career-advice/finding-a-job/companies-with-4-day-work-week-singapore) and a Facebook discussion. These establish topical retrieval, not verified policy effects, a representative evidence review or a confirmed new Sengkang facility. Other public URLs/titles, retrieval/publication metadata where supplied, and credit records are retained in the safe audit JSONs and Report. No extra citation search was made. Tavily dollar billing remains unknown.

A's candidates include MOM, IRAS, NTUC, SBF and fictional contextual employers. Dynamic types include regulators, enterprises, communication venues and associations. B uses a proposed liaison hub, community club, neighbourhood forum and caregiver chat; types include eldercare centre, community venue, discussion forum and messaging application. These are model proposals, not independently verified identities or employment relationships. MOM's inspected node correctly had no supporting passage instead of manufacturing one.

B's active environments were the declared liaison-hub feed, Sengkang Neighbourhood Forum and Caregiver Chat Group. A used National productivity forum and Employers' workplace messaging group. These use simplified internal capabilities, not native external platform integrations. Neither run required all four named Reddit/Instagram/WhatsApp/Telegram services. No real service account or posting occurred. Group nodes have canonical IDs, recorded creators and creation events; group summaries disclose counts/permissions, not individual messages or member lists.

### Behaviour and memory: observed scope

- All eight B decisions and five A decisions referenced memory sets containing original stakeholder seeds. Four B targets and one A target directly addressed an original seed. Encounters were actual events, not fake reads.
- B included three decisions with explicit cross-platform memory recalls; A included one. Later contexts contained earlier social-model items. Recorded decisions were accepted only against accessible content and membership.
- Real replies reflected bounded topic/goal concepts such as caregiver support/access and workplace staffing/income. Topic matching and lexical overlap are coarse diagnostics, not proof of comprehension or a causal memory ablation.
- Newly model-authored private replies were subsequently read by other agents. A contained two direct model-item -> other-agent read -> bounded opinion-transition paths. One example is `e80 -> e285 -> e286` in its society ledger: an uncalibrated score changed from approximately -0.3222 to -0.3076 after the recorded exposure/rule. This is a simulator transition, not evidence about real persuasion. B had downstream reads but no direct same-item read/opinion chain in that diagnostic.
- **Zero social-model decisions directly targeted another social-model-authored item in these two qualifying runs.** Most targeted initial seeds or rule content. Eight early social opportunities per run are not sustained model conversation throughout all 80 steps.

| Behaviour dimension | Finding |
|---|---|
| Actual context, goals, valid exposure and bounded memory | PASS, protected context/reducer audit |
| Model/rule separation and new decisions during playback | PASS, eight genuine additional calls per run |
| Context-topic relevance and distinct priorities | Observed, but semantic depth PARTIAL |
| Persistent memory/replay and legitimate cross-platform recall | PASS mechanism; causal contribution of memory not isolated |
| Private messages/replies and permissions | PASS |
| Direct ongoing model-to-model dialogue | NOT OBSERVED; next development priority |
| Numerical social influence | PASS recorded simulator mechanism; uncalibrated assumptions |
| Human-like society or representative Singapore opinion | Not established |

## Privacy, Graph, Report and desktop evidence

The protected audit compared **229 B strings and 190 A strings** from initial statements, internal items and accepted social text against every public projection string. Minimum text lengths were 114/112 characters; **none were excluded**. No literal message matched. Actual browser-received DTO canonical SHA-256 hashes exactly matched the audited server projections:

- B: `d0e61d202d5ab4c09b3f0e528d63d879f574006c41d9e847d00e54eb7cc50dc8`
- A: `b8287bd23338032ea4d07975f11b34bb0e464ac5954132e686e5a731ae78981a`

Ordinary API responses, graph/inspector and Report data were summary-only. `raw=true` and a raw operation both returned safe HTTP 409 envelopes. Offline sentinels cover Reddit posts, Instagram comments, private messages, memories and model content across API JSON, SSR/HTML/hydration-facing projections and downloadable summary serialization. Browser storage retained only summary records and recency metadata. Initial page rendering does not hydrate a private simulation world. No ordinary transcript route/switch was exposed.

Recorded group reads obeyed membership chronology. Read-only forks of each real world rejected non-member reads, post-join access to older messages and unexposed forwarding. Those permission probes were not added to the accepted runs. Exact saved replay preserved messages, memories, IDs, state and accepted decisions without inference. Old pre-policy worlds also replayed unchanged.

Desktop 1440×900 and 1920×1080: Map-first, only visible Map/Knowledge Graph/Report navigation; platform/group/agent/world/relationship inspectors; search, type filters, crisp labels and source limitations; dense labels can still overlap/truncate, with full names available in the index/inspectors; no unexpected page errors or horizontal overflow. No technical scenario/source/event/message nodes appeared in the primary graphs. Mouse drags moved a node and 25 neighbours in each qualifying graph. A had 127 straight/101 curved edges; B 130/112. Settled A positions survived ordinary navigation with zero measured displacement; B's drag/settling and navigation also passed. Reports reconciled accepted roles/actions, model/rule counts, groups, sources and costs. No economic or eldercare benefit calculation was invented.

Browser reload and ordinary history selection restored the completed worlds without additional provider calls. The final A restore used the repaired recency loader on an inference-disabled server; expanded Report identity and all eight round entries matched. All seven saved browser summary records remained.

Screenshots are ignored local evidence under `tmp/phase4c-autonomous/`:

- Final A: `A15-graph-{1440,1920}.png`, `A15-platform-{1440,1920}.png`, `A15-group-{1440,1920}.png`, `A15-agent-1440.png`, `A15-relationship-1440.png`, `A15-world-1920.png`, `A15-dragged-1440.png`, `A15-settled-1440.png`, `A15-map-{1440,1920}.png`, `A15-report-{1440,1920}.png`, `A15-restored-1920.png`.
- Final B: corresponding `B14-*` graph/platform/group/agent/relationship/world/dragged/settled/map/report files.
- Earlier `B-*` screenshots show partial-acceptance attempt 13 and are **not** final qualifying evidence.

## Durable accounting and remaining allowance

`tmp/phase4c-autonomous/ledger.jsonl` is append/fsync authoritative. `ledger.json` is its readable snapshot; `iterations.jsonl` records diagnoses, repairs and explicit amendments. Requests are reserved before dispatch. Safe metadata includes call purpose, code fingerprint, status, identity, tokens, cost, duration and bounded diagnostics, never provider bodies/prompts/messages. The final journal has no pending or blocked requests and both scenarios are closed as passed.

| Resource | Used | Ceiling | Remaining at stop |
|---|---:|---:|---:|
| Fresh Explore attempts | 15 | 20 | 5 |
| Tavily searches | 15 | 25 | 10 |
| Reported Tavily credits | 15 | 50 | 35 |
| OpenRouter planning | 22 | Included in total | — |
| Initial stakeholder calls | 35 | Included in total | — |
| Social decision calls | 25 | Included in total | — |
| OpenRouter total | 82 | 250 | 168 |
| OpenRouter reported USD | 0.0420253974 | 2.00 task ceiling | See conservative balance |
| Outstanding unknown-charge reservation | 0.0135 | Included conservatively | One attempt-5 request |
| Conservative USD consumed/reserved | 0.0555253974 | 2.00 | 1.9444746026 |

Known token subtotal: **250,577 input / 63,884 output**, plus one request with unknown usage. Do not interpret that subtotal as complete billed usage. Tavily USD charges are unknown, not zero; OpenRouter charges are not combined service cost.

Per-completion reservation is US$0.0135, conservatively above the checked DigitalOcean rates at the bounded request/output sizes; a full 18-completion run reserves US$0.243. Tavily reserves two credits until reported usage arrives. This is local enforcement, **not a provider prepaid hard cap**. Unknown usage stays reserved. No new attempt is permitted after a scenario passes, and paid activity stopped once both qualified. Remaining allowance is not a reason to continue testing.

## Final offline verification and reproduction

- `npm.cmd test`: **976 passed, zero failed/skipped**. Includes existing numerical CLI regressions. Full test results were inspected, including two obsolete capability fixtures corrected before final verification.
- `npx.cmd --no-install tsc --noEmit`: PASS.
- Strict affected-module TypeScript: PASS for planner, social/stakeholder adapters, society service/storage and history helper.
- `npm.cmd run build`: PASS. Existing dynamic-filesystem tracing warnings remain; no build/type failure remains.
- Full JSON Schema validation of an offline nested fixture: PASS using the already available local validator.
- `git diff --check`: final whitespace check recorded with the preserved tree.
- Numerical model interfaces did not change; six standalone CLIs were not rerun. GIS/Shapely was not run and is not claimed to pass. The existing 300-node graph performance limitation was not expanded into an unrelated optimisation project. Dense label overlap remains a visual limitation.

For inference-free replay: `node scripts/testing/phase4c-autonomous-audit.ts <run-id> attempt-14` (or `attempt-15`) reads protected local stores and emits only safe metrics. It never makes provider calls. Run focused tests `stakeholder-menu.test.ts`, `social-menu.test.ts`, `planner-declarations.test.ts`, `phase4c-reliability.test.ts`, `summary-history.test.ts`, `social-storage.test.ts`, `public-social.test.ts` and `summary-privacy.test.ts`. The opt-in browser fixture preload remains isolated and network-blocked; it is not the real-provider evidence.

Task-owned mock/live/read-only servers were stopped. All changes remain unstaged and uncommitted. Final pending source fingerprint: `a4290d1bfc4e517a5ae79dd41026e8aa7c11de0905d6f5b2a0dbe9aa782ed3f3`. The post-run changes affect saved-history loading and task-ledger storage, not the accepted inference records.

## Limitations and next step

Two qualifying observations do not guarantee future arbitrary prompts will pass. Unsupported numerical/identity/structural output still fails strictly. Source coverage is limited and uncorroborated. Fictional organisation and venue names may be merely proposals. New roles do not have statistically matched individual profiles; map markers are generic context. Older raw worlds may retain the earlier unmatched assignments; their original inference and identities are not rewritten. Pre-existing external/browser raw copies outside the isolated test context cannot be retroactively erased; legacy migration still requires its existing acknowledgement path.

Discussion summaries are counts and explicit model tags, not validated narrative extraction. Some bounded topic/purpose labels are clipped. Only four selected agents receive eight early model opportunities; the majority of activity is deterministic. Direct model-to-model social reply targeting was not observed. Memory correlation is not causal proof, opinions are uncalibrated, and no economic/health outcome or public-opinion estimate is established. The next smallest development step is **offline evaluation and improvement of reply-target selection and topic summaries using these saved real worlds**, before authorising any more inference.

## Changed-file inventory

Targeted work principally affects planner declaration/identity generation, dynamic stakeholder and social choices, capability/role context, safe diagnostics, partial-parent suppression, private checkpoint writes, archive capacity, browser summary history, their fixtures/tests, and the task guard/audit. Existing Phase 4C UI/routes/projections were preserved rather than replaced. This complete pending-tree inventory includes pre-existing uncommitted Phase 4C files, so it is not a claim that every line/file was created in this task:

- `app/api/ai/citizen-chat/route.ts`
- `app/api/scenario-simulate/route.ts`
- `app/api/social-simulate/route.ts`
- `app/api/stakeholder-simulate/route.ts`
- `components/citizens-panel.tsx`
- `components/communication-report.tsx`
- `components/impact-panel.tsx`
- `components/knowledge-workspace.tsx`
- `components/map-scenario-panel.tsx`
- `components/use-question-simulation.ts`
- `components/use-society.ts`
- `components/workspace.tsx`
- `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`
- `docs/PHASE4C_AUTONOMOUS_LIVE_DEBUGGING.md`
- `docs/PHASE4C_IMPLEMENTATION_PLAN.md`
- `docs/PHASE4C_PRIVATE_MESSAGING_SUMMARY_GRAPH.md`
- `docs/PHASE4C_TWO_RUN_LIVE_ACCEPTANCE.md`
- `lib/contracts/tests/communication.test.ts`
- `lib/contracts/tests/deepseek-transport.test.ts`
- `lib/contracts/tests/helpers/dynamic-provider.ts`
- `lib/contracts/tests/phase4c-autonomous-guard.test.ts`
- `lib/contracts/tests/phase4c-live-guard.test.ts`
- `lib/contracts/tests/phase4c-reliability.test.ts`
- `lib/contracts/tests/planner-declarations.test.ts`
- `lib/contracts/tests/planner-owned-records.test.ts`
- `lib/contracts/tests/planner-validation-diagnostics.test.ts`
- `lib/contracts/tests/public-social.test.ts`
- `lib/contracts/tests/social-menu.test.ts`
- `lib/contracts/tests/social-schema-targets.test.ts`
- `lib/contracts/tests/social-service.test.ts`
- `lib/contracts/tests/social-storage.test.ts`
- `lib/contracts/tests/staged-planner.test.ts`
- `lib/contracts/tests/stakeholder-menu.test.ts`
- `lib/contracts/tests/summary-history.test.ts`
- `lib/contracts/tests/summary-privacy.test.ts`
- `lib/contracts/tests/world-inspector.test.ts`
- `lib/dynamic-scenarios/diagnostics.ts`
- `lib/question-simulation/client.ts`
- `lib/question-simulation/map-view.ts`
- `lib/question-simulation/public-session.ts`
- `lib/question-simulation/summary-history.ts`
- `lib/server/inference/deepseek.ts`
- `lib/server/inference/planner-declarations.ts`
- `lib/server/inference/planner-records.ts`
- `lib/server/inference/planner.ts`
- `lib/server/inference/scope-constraint.ts`
- `lib/server/inference/social.ts`
- `lib/server/inference/stakeholder-menu.ts`
- `lib/server/society/public-service.ts`
- `lib/server/society/service.ts`
- `lib/server/society/storage.ts`
- `lib/server/society/summary.ts`
- `lib/society/communication.ts`
- `lib/society/contract.ts`
- `lib/society/decision-contract.ts`
- `lib/society/decision-menu.ts`
- `lib/society/decision-schema.ts`
- `lib/society/engine.ts`
- `lib/society/group-engine.ts`
- `lib/society/hybrid.ts`
- `lib/society/map-layer.ts`
- `lib/society/public-contract.ts`
- `lib/stakeholder-simulation/contract.ts`
- `lib/stakeholder-simulation/qualitative.ts`
- `lib/world-graph/ontology.ts`
- `scripts/testing/dynamic-provider-preload.mjs`
- `scripts/testing/entity-declaration-fixture.ts`
- `scripts/testing/phase4b-acceptance.ts`
- `scripts/testing/phase4c-autonomous-audit.ts`
- `scripts/testing/phase4c-autonomous-guard.mjs`
- `scripts/testing/phase4c-live-guard.mjs`
- `scripts/testing/phase4c-private-audit.ts`
- `scripts/testing/phase4c-replay-check.ts`
- `scripts/testing/social-decision-fixture.ts`
- `scripts/testing/stakeholder-decision-fixture.ts`
