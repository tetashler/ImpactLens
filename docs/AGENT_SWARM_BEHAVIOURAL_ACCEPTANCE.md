# Agent swarm behavioural acceptance

**Verdict: PARTIAL.** The application has persistent, exposure-sensitive rule simulation (Levels 1 and 2). **Ongoing LLM-directed social autonomy (Level 3) is absent.** Conversation quality is weak. This task did not obtain a complete eight-action live run: the second attempt retained five genuine accepted actions, and the social audit used those five without substitution. Paid testing stopped after sufficient behavioural evidence, rather than spending the remaining allowance for a more favourable result.

## Environment and scope

30 October 2026, Asia/Singapore (UTC+08:00). Main `master`, HEAD `f85fa3feaadf54190cd412753cf8485395f3ae48`; the existing 30-file Phases 3-6 uncommitted implementation was preserved. Baseline 895 Node tests. No secondary-directory access, private environment-file editing/display, staging, commits, deployment or real social-media posting. Keys were checked only for presence through the normal server environment loader.

Exact paid question:

> What if Singapore introduces a nationwide four-day workweek instead of the traditional five-day workweek? How would this affect employees, businesses, productivity, wages, and the wider Singapore economy?

The task-owned production server used loopback port 3165, with the real-request pass-through guard, no mock preload/interceptor, and no automatic retries. Mocked browser servers on 3164/3166 were separate and never used for live evidence. All task servers are stopped at completion.

## 1. Actual architecture and control inventory

| Stage / decision | Actual mechanism |
|---|---|
| Question and research | Ordinary Map -> Explore -> `/api/scenario-simulate`; one optional bounded Tavily search, no action-by-action research |
| Entity and relationship planning | Two real DeepSeek structured completions, canonical application IDs, strict v2 source/reference validation |
| Original stakeholder exchange | Four generated roles, two logical rounds, maximum eight separately inferred actions. The gateway sends role goals, accepted earlier events and bounded role memory/position. These are genuine model decisions within that bounded exchange. |
| Population and active profiles | Seeded historical Census sample; 24 active adults by default from a bounded view, maximum 64. Four roles bind to fictional resident IDs; twenty background profiles use one generic goal. No statistically representative opinion sample. |
| Model statement seeding | Accepted statements become posts at social tick zero, alternating platform by action index. Original event IDs remain attached. Platform placement is an application assumption, not a model-selected platform decision. Latest accepted role positions map to an arbitrary numeric scale. |
| Social scheduling | Seeded hash activation, probability 0.55, maximum six agents/step. Action phase uses `turns % 7`; all agents alternate platforms with an ID-dependent phase offset. No social-stage model calls. |
| Reddit feed | Same assumed discussion community or outgoing social tie; vote/recency ranking; at most sixteen root items |
| Instagram feed | Assumed follow ties and recency/likes; no image-content analysis or personalised visual interests |
| Memory | Twelve shared authored/exposure entries and at most 64 encountered IDs. Reads expose the root and latest six direct comments. Remembered exposure gates reactions/replies/shares; quoted parent text and numeric position feed later templates/updates. No memory summary is sent to an LLM during social playback. |
| Social language | Fixed goal + priority + question templates; replies copy up to 140 parent characters then append a goal and one of two conditional phrases; shares copy up to 180 source characters |
| Influence | Bounded numeric assimilation after exposure: `old + influence * (1-resistance) * (target-old)`. Resistance is an assumed ID-derived constant, unrelated to evidence strength. Vote sign and response wording depend on numeric position. The displayed observe/discuss label does not independently choose actions. |
| Follow changes / activity | Seeded scheduled transitions; no semantic affinity or travel model. Map context toggles only after recorded activity events. |
| Persistence and projection | Frozen genesis/events, deterministic replay, local browser saves. Canonical people and aggregated social edges project into the existing graph; Map and Report read the same world. No posts/likes become ordinary graph nodes. |

Persistent state is real implementation functionality. It is not evidence of ongoing language-model reasoning. Level 3 exists in the original bounded stakeholder exchange, not in the later Reddit/Instagram scheduler.

## 2. Deterministic offline baseline

`node scripts/testing/swarm-behaviour-audit.ts` creates a zero-network fixture and writes inspectable records under ignored `tmp/swarm-behaviour/offline/`.

Baseline: 24 agents, 80 steps, 769 events, 201 items: **8 mocked seed statements + 761 rule events**. 129 rule-authored posts/comments/replies contained 24 unique texts. Twenty background agents shared one goal. Memory stayed at twelve or fewer entries; replay was exact. None of the eight fixture seed posts received a recorded read in this run.

A separately labelled counterfactual probe supplied opposing captions with the same numeric position. Both produced exactly the same update; removing the remembered exposure rejected a later reply. Thus memory affects permission and numeric state, while the rule does not interpret the argument's meaning. These constructed probes are not recorded live dialogue and were never injected into the application run.

## 3. Real-provider attempts and grounding

| Attempt | Result | Calls / safe diagnostic | Timing and charge |
|---|---|---|---|
| 1 | Planning failed; zero actions | One Tavily search, three accepted candidates; one planning completion. `plan.user_condition_not_verbatim` at `draft.userConditions[1]` | Tavily 4.587 s transport / 4.641 s adapter; planning 10.706 s application record. USD 0.000743393, one Tavily credit. |
| 2 | Both plans accepted; **5/8 actions retained**, sixth rejected | One search, two sources; two plans, six action requests. `AI_ACTION_REFERENCE`, `reference.event_unknown`; normal stop and valid JSON. No substitute/retry action. | Tavily 2.942 s transport; entity stage 20.631 s, relationships 2.590 s; approximately 48.560 s browser request total. USD 0.0030682246, one Tavily credit. |

Requested and verified serving identity: `deepseek/deepseek-v4-flash-0731`, OpenRouter, DigitalOcean only, fallback false, required parameters, reasoning disabled/excluded. All nine observed completions returned HTTP 200/normal `stop`; local validation correctly rejected the first plan and sixth action. The rejected field values were not retained, so no specific paraphrase or invented event ID is asserted. Both failures need reliability follow-up; neither was hidden by a schema/prompt change during this audit.

Attempt 2 retained these actual candidates:

- [Does a 4-day work week help or hinder? - Business School - University of Queensland](https://business.uq.edu.au/momentum/4-day-work-week); published 2022-11-17T00:00:00.000Z, retrieved 2026-10-30T06:39:17.468Z.
- [The Tokyo government is set to introduce a four-day work ...](https://www.facebook.com/scmp/videos/is-it-possible-for-people-in-asia-to-adopt-a-4-day-working-week/1159656592523792); published unknown, retrieved 2026-10-30T06:39:17.468Z.

The passages concern four-day workweeks generally and Tokyo/Australian context; neither retained excerpt mentions Singapore. Retrieval transport passed, but Singapore-specific grounding was **PARTIAL**. Three entity support candidates were withheld by the existing attribution policy; every inspected entity/relationship had zero source-reported supporting passages. No independently verified institutional identity or causal policy relation was established. The graph still includes model-proposed Singapore institutions and hypothetical businesses. A model statement asserting absence of local data is not proven by these two excerpts.

Actual roles: SME Precision Engineering Owner, Production Technician, Logistics Operations Coordinator and Government Policy Officer, all fictional Singapore-affiliated roles. Their goals concern delivery contracts, monthly income, client service hours and transition feasibility. All began at the model's conditional position. The accepted original exchange meaningfully discusses wage protection, staffing constraints and pilot arrangements: the technician addresses the owner's contract concern, and the owner's fifth accepted turn responds to the policy officer's pilot proposal. These are the strongest observed context-relevant language-model contributions; their personal/workplace details are synthetic assumptions, not Census observations.

## 4. Live-seeded society: contribution and content

The accepted partial run `run-05123f208958423ced83b1ff-attempt-6-ac9edb70-6442-46a5-9529-43c45b64ec1d` / plan `dynamic-plan-37459123c00325509f5bc7a73ec4ef1a801f6dfff9f0cd18f624895557c18fc6` generated 24 active profiles, 80 steps / 1200 simulated minutes, **760 events = 5 real accepted seed statements + 755 rule events**, and 210 items. The social clock completed; the parent model execution remained partial. These statuses must not be conflated.

**None of the five real seed posts was read by another agent in this run.** First activation forces posting; newer generic posts outrank tick-zero seeds when later read phases occur. Rich model arguments therefore did not drive subsequent social conversations here. Planning-derived goals and numeric initial positions remained inputs. 140 rule-authored messages contained only 29 unique texts. Twenty background agents again had one generic goal. This is evidence from this particular run, not a claim that every future seed is always ignored.

The following excerpts are actual recorded synthetic content, truncated explicitly; full text, actors, timestamps, exposure records and causal references are in `live/behaviour-evidence.json`. Event suffixes below share the saved world prefix `society-<runId>:`. Actor suffixes refer to canonical IDs `syn-936f282cc7c8044a-<suffix>`, not real people.

### Three Reddit threads

- **e60**, actor `syn-936f282cc7c8044a-6542`, 105 min: 6 recorded comments/replies, votes 4. Opening: "Understand the proposed change and discuss unresolved practical trade-offs. My current simulated priority is seeking clearer conditions. This is a fictional perspective on: What if..."
  - `e337`, actor `syn-936f282cc7c8044a-6803`, 525 min; causal references e60, e87: "de-offs. My current simulated priority is seeking clearer conditions. Thi” — Understand the proposed change and discuss unresolved practical trade-offs. I would consider a conditional trial."
  - `e656`, actor `syn-936f282cc7c8044a-9504`, 1035 min; causal references e337, e374: "ost: “Understand the proposed change and discuss unresolved practical trade-offs. My current simulated priori” — Maintain contractual delivery deadlines I would consider a conditional trial."
- **e22**, actor `syn-936f282cc7c8044a-6915`, 45 min: 4 recorded comments/replies, votes 2. Opening: "Understand the proposed change and discuss unresolved practical trade-offs. My current simulated priority is seeking clearer conditions. This is a fictional perspective on: What if..."
  - `e389`, actor `syn-936f282cc7c8044a-3249`, 600 min; causal references e22, e139: "de-offs. My current simulated priority is seeking clearer conditions. Thi” — Understand the proposed change and discuss unresolved practical trade-offs. I would consider a conditional trial."
  - `e402`, actor `syn-936f282cc7c8044a-9410`, 630 min; causal references e22, e45: "current simulated priority is seeking clearer conditions. Thi” — Understand the proposed change and discuss unresolved practical trade-offs. I would request safeguards before changing plans."
- **e98**, actor `syn-936f282cc7c8044a-9504`, 150 min: 3 recorded comments/replies, votes 0. Opening: "Sharing an encountered perspective: Understand the proposed change and discuss unresolved practical trade-offs. My current simulated priority is examining practical concerns. This ..."
  - `e437`, actor `syn-936f282cc7c8044a-8131`, 675 min; causal references e98, e106: "pective: Understand the proposed change and discuss unresolved practical trade-offs. My current simulated priorit” — Keep client service hours unchanged I would consider a conditional trial."
  - `e596`, actor `syn-936f282cc7c8044a-7166`, 930 min; causal references e437, e476: "tive: Understand the proposed change and discuss unresolved practical tra” — Understand the proposed change and discuss unresolved practical trade-offs. I would consider a conditional trial."

References and nesting are valid. The replies carry actual parent text and a persistent goal, but repeatedly end in fixed trial/safeguard phrases. They do not evaluate contract terms, wage mechanisms or competing evidence. Nested replies are not subsequently exposed by the current root-plus-direct-comments read rule, limiting deeper conversation.

### Three Instagram posts

- **e213**, actor `syn-936f282cc7c8044a-7965`, 330 min: 2 likes, 2 comments. Caption: "Understand the proposed change and discuss unresolved practical trade-offs. My current simulated priority is examining practical concerns. This is a fictional perspective on: What ..."
  - `e615`, actor `syn-936f282cc7c8044a-8679`, 960 min, causal references e213, e446: "priority is examining practical concerns. T” — Understand the proposed change and discuss unresolved practical trade-offs. I would consider a conditional trial."
  - `e618`, actor `syn-936f282cc7c8044a-4264`, 975 min, causal references e213, e270: "examining practical concerns. T” — Understand the proposed change and discuss unresolved practical trade-offs. I would request safeguards before changing plans."
- **e314**, actor `syn-936f282cc7c8044a-9476`, 480 min: 2 likes, 2 comments. Caption: "Sharing an encountered perspective: Sharing an encountered perspective: Understand the proposed change and discuss unresolved practical trade-offs. My current simulated priority is..."
  - `e609`, actor `syn-936f282cc7c8044a-3249`, 960 min, causal references e314, e355: "hange and discuss unresolved practical trad” — Understand the proposed change and discuss unresolved practical trade-offs. I would consider a conditional trial."
  - `e630`, actor `syn-936f282cc7c8044a-7965`, 990 min, causal references e314, e353: "scuss unresolved practical trad” — Understand the proposed change and discuss unresolved practical trade-offs. I would request safeguards before changing plans."
- **e278**, actor `syn-936f282cc7c8044a-6542`, 435 min: 1 likes, 2 comments. Caption: "Understand the proposed change and discuss unresolved practical trade-offs. My current simulated priority is seeking clearer conditions. This is a fictional perspective on: What if..."
  - `e693`, actor `syn-936f282cc7c8044a-5366`, 1095 min, causal references e278, e306: "seeking clearer conditions. Thi” — Understand the proposed change and discuss unresolved practical trade-offs. I would request safeguards before changing plans."
  - `e750`, actor `syn-936f282cc7c8044a-9410`, 1200 min, causal references e278, e291: "seeking clearer conditions. Thi” — Understand the proposed change and discuss unresolved practical trade-offs. I would request safeguards before changing plans."

Follow visibility and remembered exposures constrain engagement. The platform uses the same reply templates as Reddit and question-based media placeholders; it has no content-based visual interests. Repeated shares are new referenced events, not duplicate event IDs, but repeatedly copying the sharing prefix produces low-quality text. Reactions depend on scheduled phase/numeric position, not a semantic assessment of the caption.

## 5. Three individual journeys, memory and influence

| Canonical actor | Persistent goal | Initial -> final position | Resistance / own events |
|---|---|---|---|
| `syn-936f282cc7c8044a-9504` (Fictional SME Precision Engineering Owner) | Maintain contractual delivery deadlines | 0.200000 -> 0.278963 | 0.737 / 33 |
| `syn-936f282cc7c8044a-7673` (Fictional Production Technician) | Protect monthly income | 0.200000 -> 0.209121 | 0.837 / 35 |
| `syn-936f282cc7c8044a-4237` (Fictional resident 4237) | Understand the proposed change and discuss unresolved practical trade-offs. | 0.960133 -> 0.500925 | 0.731 / 49 |

- **Fictional SME Precision Engineering Owner**: memory checkpoints at steps 0/8/20/40/60/80 and full own history are retained in the evidence file. `e66` at 105 min: 0.200000 -> 0.146927, after e24, e65. `e86` at 135 min: 0.146927 -> 0.190130, after e50, e85, e65. Final memory has 12 entries; goals do not evolve.

- **Fictional Production Technician**: memory checkpoints at steps 0/8/20/40/60/80 and full own history are retained in the evidence file. `e64` at 105 min: 0.200000 -> 0.200000, after e59, e63. `e78` at 120 min: 0.200000 -> 0.216023, after e56, e77, e63. Final memory has 12 entries; goals do not evolve.

- **Fictional resident 4237**: memory checkpoints at steps 0/8/20/40/60/80 and full own history are retained in the evidence file. `e114` at 180 min: 0.960133 -> 0.897905, after e22, e113. `e154` at 240 min: 0.897905 -> 0.856933, after e60, e153. Final memory has 12 entries; goals do not evolve.

For the owner, event e66 follows recorded Instagram read e65 of e24 and moves 0.200000 -> 0.146927 with resistance 0.737. The calculation is reproducible. The later wording/vote can change when numeric thresholds change; the action-class cycle remains fixed. There is resistance and stochastic inactivity, not evidence of real human persuasion. One of 157 opinion-update events in this run made no numerical change; an update-event count is not a count of people persuaded.

A controlled memory-removal probe rejected a response that otherwise had a remembered target. A caption-negation probe left the calculated opinion unchanged when numeric position stayed fixed. Memory is a working exposure/permission/state mechanism, not semantic understanding or long-term model recall. Browser navigation and a full saved-world SHA-256 replay preserved the actual memories exactly; eviction after twelve entries is intentional.

## 6. Cross-platform pathway and targeted repair

Actual pre-fix pathway: Instagram e9 (15 min) -> actor 9476 reads e25 (45 min) -> shares on Reddit e47 (75 min) -> actor 4264 reads e54 (90 min) -> numerical update e55. The share's causal references include e9/e25. Canonical identity is unchanged across platforms, and the recipient only updates after its own exposure. Full records are in the evidence JSON.

**Confirmed defect:** e9's position was -0.779772, but e47's copied excerpt carried the sharer's +0.366654. All 65 pre-fix shares in this run differed from their source position. Subsequent influence could follow a numeric stance inconsistent with the copied caption. This is record inconsistency, separate from missing language understanding.

The narrow repair adds explicit `sharePolicy: source-position-v1` and social genesis version 3 for new UI worlds. Shared event/item position now retains the encountered source position; the sharer's own opinion is unchanged. Conflicting explicit share-position overrides reject. Versions 1/2 replay with their legacy semantics and display a warning; reset explicitly starts a new policy world. The frozen input/policy marker participates in genesis comparison and snapshot hashing. Existing plan/run hashes and historical records are not rewritten.

Failing-first tests reproduced the mismatch. Focused tests cover source preservation, unchanged actor state, legacy semantics, exact replay, old UI restoration and rejection of unrelated genesis/policy. Replaying the same five real accepted inputs offline produced version 3, 762 events and **zero** source-position mismatches. This is a corrected rule replay, not another paid/live acceptance. The old saved world still hashes to `fc0c49b32f8fbe379a3a3a8ebf6bd6702afdaf68b1b562d3c09b2cbbea10efcb`.

A separate mocked production-browser regression completed eight fixture actions / 80 social steps with version 3: 61 shares, zero mismatches, correct policy disclosure, no page errors or mobile overflow. The real partial run was not replaced with these fixture results. No planner, provider, deadline or source-integrity rule was changed.

Additional observed limitations were documented rather than expanded into another engine rewrite: comment footers count direct target reads, so zero there does not imply no exposure through a parent thread read; reply community labels use the author's community even inside another root's thread. Parent/event references remain valid. The clock-complete social view relies on the original Report/Map to disclose partial model execution. These UI/context details need refinement alongside the larger social decision work.

## 7. Behavioural assessment

| Dimension | Result | Direct evidence | Limitation |
|---|---|---|---|
| Reddit conversation coherence | PARTIAL | Three nested real-seeded threads, valid parent/exposure references | Fixed generic phrases; no substantive argument evaluation; deeper replies not exposed |
| Instagram content relevance | PARTIAL | Three posts with remembered comments/likes and follow-constrained feeds | Same dialogue templates; no distinct visual interests or caption understanding |
| Persistent memory | PASS | Twelve-entry bound, checkpoints, navigation and exact SHA-256 replay | Bounded event memory, not ongoing LLM cognition |
| Memory affecting later actions | PARTIAL | No-exposure/forgotten-target rejection; remembered parents and state affect text/actions | No semantic recall or memory-to-LLM pathway |
| Social influence after exposure | PARTIAL | Explicit reads, resistance and reproducible updates; zero-delta update identified | Uncalibrated numeric assimilation; pre-fix share inconsistency corrected offline |
| Cross-platform propagation | PARTIAL | e9 -> e25 -> e47 -> e54 -> e55 | Transfer and arithmetic work; meaning is not interpreted |
| Distinct agent behaviour | PARTIAL | Four distinct role goals, varied activation/resistance/ties/opinions | Twenty identical background goals; common action cycle and alternating platform rule |
| Ongoing LLM-directed autonomy | FAIL | Zero completions during 80-step social playback | Original five accepted model actions occurred before social playback |
| Knowledge Graph consistency | PASS | 32 nodes, 199 relationships, all 24 canonical social agents, no event/audit nodes | Derived relationships are synthetic, not evidence of intelligence; some ontology types are abstract/coarse |
| Report consistency | PASS | 760 = 5 accepted model seeds + 755 rule events; source run stays partial | Social clock completion must not be mistaken for eight-action model completion |

Overall behavioural acceptance is PARTIAL. Full real-provider eight-action end-to-end acceptance was not achieved in this task. Source retrieval is real but weakly Singapore-grounded. The primary architectural limitation is absent ongoing context-conditioned LLM social decisions, not an insufficient event count.

## 8. Browser, performance and verification

Actual live-seeded views at 1440x900 and 390x844: Map, both social feeds, memory/profile inspector, Knowledge Graph and Report. No unexpected page/console errors or document horizontal overflow. An immediate mobile map capture preceded its repaint; the final capture waited two seconds and showed the map, buildings and selected synthetic marker correctly. Original request count remained two through navigation; no additional paid calls. Graph dragging reheated alphaTarget to 0.3, displaced connected nodes and settled at alpha 0.000992 with the loop stopped. All 24 located synthetic subzone contexts matched canonical social IDs. Personal locations/journeys and empirical demographic opinions are not inferred.

The live pre-fix world saved to 940,369 UTF-8 bytes; the audit's full replay/projection took about 142 ms in one local measurement. Playback used bounded 24-agent, six-activation steps; no sustained FPS guarantee is inferred. Memory stayed at twelve entries and event history at 760, below existing caps. The numerical model interfaces were unchanged; their six CLIs were not rerun for this audit. GIS was not run (Shapely unavailable).

Final automated verification: **899 Node tests**, application TypeScript, affected-module strict TypeScript, production build and `git diff --check` pass. Tests include the new task guard's finite request/unknown-cost behaviour and three sharing/archive regressions. Mocked post-fix browser checks remain distinct from the pre-fix real seeded evidence.

## 9. Request, credit and spending ledger

The ignored durable journal `tmp/swarm-behaviour/live/ledger.jsonl` records requests before dispatch and flushes append-only snapshots; `ledger.json` is a readable summary. Historical ledgers were untouched. An attempt reserves ten completions, USD 0.20 and two Tavily credits. Each completion reserves USD 0.02 with at most 98,304 request bytes and 6,000 planning/800 action output tokens. Public [exact-model endpoint metadata](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-flash-0731/endpoints) confirmed DigitalOcean input/output rates of USD 0.000000119 / 0.000000238 per token; treating every request byte as an input token leaves reservation headroom. This is a conservative local guard, not an external account hard cap or protection against unannounced pricing changes. Missing/interrupted billing retains reservations; unknown Tavily dollar amounts are not zero.

| Resource | Used | Ceiling | Remaining at paid stop |
|---|---:|---:|---:|
| Live Explore attempts | 2 | 6 | 4 |
| Tavily searches | 2 | 8 | 6 |
| Tavily reported credits | 2 | 16 | 14 |
| OpenRouter completions | 9 (3 planning, 6 actions) | 100 | 91 |
| OpenRouter reported USD | 0.0038116176 | 1.00 | 0.9961883824 |

Known usage: **20,260 input + 7,626 output = 27,886 tokens**. Three planning calls include one local validation failure; six action calls include one rejected response, with five accepted. No separately paid behavioural probes/evaluations, no automatic action retry, no pending or uncertain completion charge. Tavily dollar billing is **unknown**; two credits were reported. Do not describe the OpenRouter amount as combined-service cost. Paid testing stopped because further identical runs would not resolve missing social LLM autonomy.

## 10. Reproduction, evidence and changed files

- `node scripts/testing/swarm-behaviour-audit.ts`: zero-network fixture audit, full thread/journey/probe records.
- `node scripts/testing/swarm-behaviour-audit.ts --world=tmp/swarm-behaviour/live/world.json`: exact replay of the saved real-seeded world; no inference. Do not point the live-labelled mode at fixture worlds.
- `npm.cmd test`, `npx.cmd --no-install tsc --noEmit`, `npm.cmd run build`, `git diff --check`.

Safe ignored artifacts under `tmp/swarm-behaviour/live/`: `attempt1-failure.json`, `attempt2-application.json` (validated application records, not raw provider responses), `browser-recipe.json`, `world.json`, `behaviour-evidence.json`, `graph.json`, `corrected-rule-replay.json`, pricing and durable ledger. No secrets, prompts or private reasoning are retained. The original UI world and its offline replay matched the same SHA-256 before repair and still do after repair.

Live screenshots: `attempt1-failure.png`, `reddit-desktop.png`, `reddit-like-e60.png`, `reddit-like-e22.png`, `reddit-like-e98.png`, `instagram-like-e213.png`, `instagram-like-e314.png`, `instagram-like-e278.png`, `agent-memory-desktop.png`, `agent-memory-mobile.png`, `graph-desktop.png`, `map-mobile-final.png`, `report-desktop.png`, `report-mobile.png`. Offline screenshots are separate under `offline/`, including post-fix `fixed-policy-desktop.png` and `fixed-policy-mobile.png`. They were visually inspected; synthetic threads remain highly repetitive despite readable nesting.

Task-specific maintained changes:

- `scripts/testing/swarm-live-guard.mjs`, `lib/contracts/tests/swarm-live-guard.test.ts` (new task-only guard, no old-ledger mutation).
- `scripts/testing/swarm-behaviour-audit.ts` (offline evidence extractor and labelled counterfactual probes).
- `lib/society/contract.ts`, `lib/society/engine.ts`, `lib/society/report.ts` (versioned sharing policy, legacy restoration, disclosure).
- `components/use-society.ts`, `components/society-report.tsx` (new-world policy, old-save warning, report metadata).
- `lib/contracts/tests/society-engine.test.ts` (three targeted regressions).
- This report and an appended roadmap checkpoint. All earlier uncommitted work is retained.

## 11. Recommended next development step

Implement a separately scoped, bounded social decision adapter for selected agents: pass the individual goal, current state, visible feed IDs and relevant remembered exposures to the existing model gateway, validate one allowed action, then record the transition. Keep routine cohorts deterministic and keep strict per-run call/token budgets. Fix initial scenario-information exposure and nested-thread/context reporting explicitly; otherwise richer seed text will continue being buried. Test semantic responses to conflicting arguments rather than event volume. Calibrated human behaviour and representative population forecasts remain separate research problems. No OASIS integration or broader engine rewrite was begun in this audit.
