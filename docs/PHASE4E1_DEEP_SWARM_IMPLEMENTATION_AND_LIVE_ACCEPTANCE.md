# Phase 4E.1 — Deep swarm implementation and acceptance

Final acceptance record, 31 October 2026 (Singapore). This report distinguishes implemented capacity, mocked capability, real provider activity and behavioural interpretation. No raw conversations, memories, provider bodies or credentials are included.

## Current verdicts

| Gate | Current result |
|---|---|
| Offline architecture | **PASS - 1,170 tests, both desktop profiles and complete offline gates** |
| Live integration | **PARTIAL - public budget-limited accepted run; private activity not observed** |
| Real-model behavioural quality | **PARTIAL - voluntary reciprocal/multi-agent conversations; longer-term/private evidence incomplete** |
| Privacy and historical compatibility | **PASS**, within the inspected offline/live surfaces and preserved archives |

The complete offline gate passed before paid dispatch. One real workweek attempt accepted two planning completions, eight initial stakeholder actions and 70 social decisions across all 35 capable agents. It stopped honestly at tick 14/80 under the 70-call provider grant. The public budget-limited integration path passed; the overall live verdict remains PARTIAL because no private messaging environment/group was generated. No additional attempt was justified merely to force a group or more interesting behaviour. This was not a completed 350-decision live simulation.

## Baseline and adopted research

- Repository: the existing main `ImpactLens` worktree, branch `master`.
- Starting HEAD: `87ded4d07ead6576a7ebd83c613daacb9ca60ad8`; initial worktree clean.
- Baseline: **1,102 network-blocked Node tests passed**.
- Adopted approach: balanced extensions to the existing hybrid engine, gateway and private archive. No framework migration, vector database, embeddings, new paid model or infrastructure.
- Existing constraints included quick 64/128 decision limits, four opportunities per agent, two slots per tick, a 500-iteration replay loop, journal/public-reader limits and complete-ancestry prompt packing.
- Deeper public/private threads previously exceeded the eight-item prompt window. Private scheduling also depended on a thread root remaining in the latest feed. Repeated encounters occupied separate episodic entries, while the eight-entry issue view could discard still-open issues.

## Frozen execution profiles

`deep-swarm-v1` is an optional immutable selector inside the existing swarm policy. Absence retains historical semantics. New ordinary sessions select the 50/35 deep profile; old journals are not upgraded.

| Profile | Active | LLM-capable | Rule-driven | Reasoning capacity |
|---|---:|---:|---:|---:|
| Historical | 24 | 4 | 20 | 8 |
| Quick primary | 50 | 35 | 15 | 64 |
| Quick larger | 100 | 70 | 30 | 128 |
| Intermediate primary | 50 | 35 | 15 | 175 |
| Deep primary | 50 | 35 | 15 | 350 |
| Intermediate larger | 100 | 70 | 30 | 350 |
| Deep larger | 100 | 70 | 30 | 700 |

`deep-policy.ts` supplies policy-scoped replay, journal, checkpoint, ancestry and private-world bounds. `swarm.ts` validates cohort identity, profile selection and the frozen deep fields. The optional frozen `triggerWitness: preparation-read-v1` distinguishes new preparation-read attribution from earlier deep inputs. LLM-capable identity is independent of actual model-authored provenance.

## Time, scheduling and fairness

The coarse clock remains 80 ticks at 15 simulated minutes per tick: approximately 20 hours, not months or years. Routine/geographic progression runs once per coarse tick. Committed model decisions can create subsequent eligible opportunities during the same tick without repeatedly advancing that clock.

- Primary/larger profiles permit at most six/twelve sequential reasoning slots per tick.
- Recorded opportunity metadata includes tick, substep, global ordinal and a legitimate source event where applicable.
- One agent cannot monopolise a tick. Dispatch remains serial.
- Candidate ranking combines actual direct replies, questions, unresolved issues, conversation continuity, legal private discussions and bounded waiting/fair-share credit.
- Soft allowance: ten opportunities per capable agent; hard ceiling: sixteen. These are controls, not activity quotas.
- Thread bursts, actor cooldowns and unchanged-source handling bound repeated activation. Proactive initiation is limited and does not require fabricated incoming content.
- Capacity pacing leaves later opportunities available. Quiet and voluntary-inactivity fixtures do not have to exhaust their capacity.

The scheduler chooses an eligible actor and encounter. The model independently chooses a validated menu action; capability fixtures deliberately choosing replies are not evidence of voluntary intelligence.

## Conversation windows and private inbox

`conversation-window-v1` retains complete server-side access and ancestry verification while supplying at most eight actual item bodies. Context metadata identifies the target/root, authorised ancestry depth, included IDs and omitted ancestor count. The provider projection explicitly states that omitted wording is not context.

- Deep ancestry is bounded at 64; a reply creating an unusable 65th item is rejected and omitted from the menu.
- Hidden, missing, future, cross-platform or invalidly ordered ancestors are rejected.
- Contexts retain six memory references, a 24 KB bound and the existing 24-choice menu.
- Private reads record legitimate full-path exposure. A bounded private discussion inbox no longer requires the root to remain among the latest feed entries.
- Current membership, current join point, leave/rejoin restrictions and sharing permissions remain binding. Knowing a group or topic does not grant message access.
- Focused accepted-menu fixtures construct public/private chains of 64 items with multiple independent participants. These are deterministic capability tests.

Per-immutable-world item/sequence/path indexes avoid repeatedly rebuilding identical ancestry for every actor. Cached paths, including invalid results, are immutable; changed worlds receive fresh indexes. Historical path behaviour remains unchanged.

A genuine offline desktop/public-service failure exposed `SOCIAL_SHAPE` at the final 24 KB assertion: long canonical IDs, repeated conversation metadata and optional items could overflow after menu trimming. The repaired `deep-byte-pack-v1` helper runs only on an oversized deep context. It coalesces redundant thread metadata, then removes optional memory/item context with rebuilt menu indices and omission diagnostics. The current source and its genuine primary exposure binding are preserved; root/recent-parent bodies remain where they fit. Text is never truncated and mandatory overflow fails closed. Existing accepted contexts already within 24 KB remain byte-for-byte unchanged. The complete 350-decision public regression and both desktop profiles now pass.

## Episodic retention and issues

New deep sessions retain `episodic-topic-v2` retrieval with twelve short-term entries, 32 indexed episodes, six selected memories and eight context items.

Deep retention coalesces repeated encounters with one unchanged primary source. Under overflow, a modest metadata-only penalty for the same thread, counterparty and topic protects distinctive experiences without imposing arbitrary old/private/channel quotas. Importance and legitimate open-issue priority remain relevant. Full encounters remain in the private event journal.

An explicit per-agent issue history preserves up to sixteen accepted own issue records and their open/resolved/withdrawn status. The bounded active view remains eight entries. Context selection and summaries can consult the retained history; an omitted issue is not silently considered resolved. Changes require an actual own authored event and validated references. Concerns are not automatically commitments.

Memory availability, ranking, context inclusion, optional recall and substantive use remain separate measurements. Automatic target bindings do not establish voluntary recollection.

## Capacity, provider admission and failures

A 350/700-capable world does not authorise that many paid requests. A trusted server grant is frozen separately in the deep journal. Browser input cannot enlarge it, and restored grants can be tightened but not enlarged. Without an explicit higher trusted grant, the existing quick-profile provider allowance remains the admission baseline.

Admission enforces completion, token, cost and deadline bounds before dispatch, alongside the existing gateway/concurrency controls. Live acceptance explicitly grants at most **70 social completions** to a 350-capable 50/35 session. Budget exhaustion preserves a truthful accepted partial/budget-limited state and any offered pending context; it does not manufacture skipped or successful decisions.

Accepted authorship, accepted inactivity, validation failures, skips, cancellation and uncertain provider outcomes remain distinct. Failed/uncertain calls are not automatically retried. Identity mismatch, unrecoverable transitions, storage or journal integrity failure stop owned progression. A voluntary inactive decision consumes its opportunity.

Provider restrictions remain OpenRouter → `deepseek/deepseek-v4-flash-0731` → DigitalOcean only, fallback disabled, required parameters enabled, reasoning disabled/excluded, strict serving identity and output validation, existing context/output/time limits.

## Journals, checkpoints and recovery

The existing hash-chained format-2 journal is retained. New deep policies permit 128 MiB journals, 4 MiB rows and 32 MiB private materialised checkpoints/saved worlds; historical bounds remain policy-scoped. Public payload limits are independent.

- Projected-byte admission precedes inference. Reservations are appended and fsynced before dispatch; settlement is durable.
- Session ownership serialises cold load, recovery, append and stale-cache detection. A second owner cannot append using an old head.
- An incomplete final append can be recovered only after a verified prefix; its private evidence is preserved. Complete bad-hash records and earlier corruption are never skipped.
- Materialised checkpoints bind run/input identity, accepted revision, journal offset/head and state digest. They are written near every 50 accepted decisions and at pause/completion.
- Recovery verifies the full journal hash chain before using a checkpoint, then applies the legitimate tail. Missing/corrupt checkpoints fall back to genesis replay.
- Durable uncertain reservations become explicitly uncertain failures without redispatch. Persistence failure evicts uncommitted cached state.

Fault fixtures cover truncated tails, bad hashes, checkpoint corruption/missing/write failure, concurrent cold loads, duplicate ownership, uncertain reservations, stale revisions, oversized writes and provider-budget exhaustion. Existing records are not migrated.

## Managed local coordinator and user experience

The coordinator is a tracked owner in the long-lived local Node application: durable job intent, exclusive lease, managed timer/work promise, abort/deadline and explicit pause/resume/cancel. It is not an untracked route promise or a cloud/distributed job service.

Closing the browser stops its observer while an already-authorised local job may continue. Application exit preserves accepted work; a later process projects an unfinished job as paused and requires explicit resume. Unknown paid requests are never automatically redispatched. A live foreign owner or ambiguous ownership fails closed.

The browser polls compact, authenticated status and fetches summary projections at a bounded interval. Polling and navigation cannot invoke inference. Compact history references contain a run identity and capability token rather than repeated large projections; historical safe summaries remain readable. No fourth tab or mandatory configuration flow was added.

Status distinguishes configured capacity, admitted calls, accepted decisions, participating agents, tick progress and budget-limited state. Terminal controls and wrong-token requests remain validated. Typed internal service calls avoid serialising/parsing raw worlds through internal HTTP responses.

## Knowledge Graph and Report

The entity-first graph remains intact: institutions, organisations, services, stakeholder roles, communication platforms, fictional groups, significant agents and grounded aggregates. Search can reveal additional agents without displaying every resident equally. No message/event nodes or transcript inspectors were introduced.

Graph and Report share deterministic aggregate fact packs. They reconcile unique authored model decisions, resulting events, authors, classification coverage, chronology, actual follow-ups, transfers, issue statuses and state changes. Repeated messages are not independent voters; synthetic scores are not Singapore public opinion.

## Measured offline benchmarks

Source: ignored `tmp/phase4e1/benchmarks.json`. All seven demand-rich fixtures used the actual service, mocked gateway, reducer, journal, coordinator and projection contracts with outbound network blocked. Every row completed its configured mocked decision capacity, exact full replay and restored-state comparison, with zero sentinel leaks and zero paid calls. The fixtures deliberately select valid authored actions and do not prove real model behaviour.

| Profile | Offered/accepted agents | Accepted/authored | Per-agent range | Early/middle/late | Events/rule events | Peer replies | Max depth |
|---|---:|---:|---:|---:|---:|---:|---:|
| 24/4/8 | 4/4 | 8/8 | 2–2 | 3/3/2 | 526/510 | 3 | 5 |
| 50/35/64 | 35/35 | 64/64 | 1–2 | 24/22/18 | 620/548 | 57 | 9 |
| 100/70/128 | 70/70 | 128/128 | 1–2 | 48/44/36 | 748/612 | 120 | 9 |
| 50/35/175 | 35/35 | 175/175 | 3–9 | 62/59/54 | 842/659 | 149 | 12 |
| 50/35/350 | 35/35 | 350/350 | 7–16 | 123/118/109 | 1,192/834 | 331 | 16 |
| 100/70/350 | 70/70 | 350/350 | 3–9 | 123/118/109 | 1,192/834 | 327 | 12 |
| 100/70/700 | 70/70 | 700/700 | 7–16 | 245/237/218 | 1,892/1,184 | 686 | 22 |

| Profile | Journal bytes | Material checkpoint bytes | Saved-world bytes | Public projection bytes | Full graph nodes/edges |
|---|---:|---:|---:|---:|---:|
| 24/4/8 | 17,042,917 | None | 710,712 | 222,170 | 30/187 |
| 50/35/64 | 2,392,021 | None | 1,577,065 | 490,046 | 57/442 |
| 100/70/128 | 4,786,341 | None | 2,989,690 | 934,647 | 107/882 |
| 50/35/175 | 8,028,331 | 4,251,087 | 4,250,625 | 508,534 | 57/473 |
| 50/35/350 | 17,968,203 | 9,126,669 | 9,126,206 | 517,428 | 57/487 |
| 100/70/350 | 16,662,668 | 9,631,101 | 9,630,638 | 990,858 | 107/978 |
| 100/70/700 | 36,003,005 | 19,199,527 | 19,199,064 | 1,042,076 | 107/1,065 |

| Profile | Service ms | Total fixture ms | Genesis replay ms | Cold restore ms | Projection ms | Heap/RSS MiB | Internal operations |
|---|---:|---:|---:|---:|---:|---:|---:|
| 24/4/8 | 767.6 | 2,580.5 | 434.6 | 470.9 | 11.2 | 74.0/185.1 | 80 |
| 50/35/64 | 1,070.1 | 2,815.4 | 525.7 | 540.9 | 19.7 | 121.5/274.1 | 83 |
| 100/70/128 | 3,217.1 | 9,345.5 | 1,960.8 | 1,994.3 | 27.5 | 135.2/277.4 | 132 |
| 50/35/175 | 5,017.4 | 11,791.6 | 1,877.2 | 301.7 | 21.6 | 149.9/329.8 | 177 |
| 50/35/350 | 11,275.0 | 27,998.8 | 4,907.5 | 635.5 | 39.8 | 250.7/401.0 | 352 |
| 100/70/350 | 13,625.3 | 33,528.9 | 6,438.1 | 582.0 | 47.2 | 353.2/598.7 | 352 |
| 100/70/700 | 35,934.0 | 92,176.8 | 20,479.3 | 1,230.9 | 93.5 | 499.5/701.3 | 702 |

| Profile | Jain participation index | Source age mean/p95 ticks | Inter-decision gap mean/p95 ticks | Pure preparation ms | Pure finish ms |
|---|---:|---:|---:|---:|---:|
| 24/4/8 | 1.0000 | Not recorded | 40.0/40 | 480.4 | 18.2 |
| 50/35/64 | 0.9593 | 16.2/62 | 39.8/67 | 359.4 | 128.8 |
| 100/70/128 | 0.9593 | 9.8/54 | 41.1/64 | 1,512.2 | 344.7 |
| 50/35/175 | 0.8537 | 16.1/48 | 12.6/25 | 1,006.8 | 450.0 |
| 50/35/350 | 0.9323 | 13.3/51 | 7.0/16 | 2,897.8 | 1,258.0 |
| 100/70/350 | 0.9182 | 22.0/62 | 14.1/23 | 5,171.5 | 1,231.5 |
| 100/70/700 | 0.9444 | 11.9/38 | 7.3/14 | 17,098.2 | 3,399.1 |

Times and memory samples are rounded observations, not provider latency estimates. Cold restore includes full journal verification and uses a materialised checkpoint where available; historical/quick rows have none. Heap/RSS were sampled after service operations in one shared benchmark process, not continuously measured isolated peaks. Internal operations are coordinator/service work, not browser continuation requests. Full graph counts are not the simultaneously visible canvas count.

Source age is decision tick minus the recorded triggering event tick; it is **not** a measurement of continuously eligible queue wait or proof of starvation. Inter-decision gaps also include periods without eligible demand. Jain indices describe observed participation, not a requirement for equal activity. Pure preparation includes coarse routines, scheduling, exposure and context assembly; pure finish includes stale-context reconstruction, validation and reduction. Neither number isolates the scheduler alone.

Deep 350/700 runs reached the 32-entry episodic bound and recorded 107/294 episodic-origin context references respectively. Every context stayed within eight items and six memories. Maximum internal canonical contexts were 19,776/19,427 bytes and maximum wire contexts were 13,444/13,338 bytes; concurrency remained one. These counts establish inclusion, not substantive recall. Every benchmark row had zero rejected/skipped opportunities and zero accepted inactivity because this demand-rich fixture deliberately authored its permitted responses. Dedicated quiet, inactivity, repetitive, private and adversarial tests supplement it.

Model-authored public/private contributions were 279/71 in deep-50 and 632/68 in deep-100. Each had two rule-authored private bootstrap items and eight separate initial stakeholder actions. The 834/1,184 rule events mostly represent routine continuity and exposures, not that many independently authored arguments.

## Privacy, storage and historical compatibility

Automated sentinel tests cover public/private content, memory, issues, summaries, status and errors. Raw conversation data stays server-side. The privileged audit helper reads accepted journals directly, reconstructs authorised prefix state, checks model targets/memories and compares internal strings against the ordinary public projection without copying those strings into evidence.

`tmp/phase4e1/historical-replay.json` records exact replay of four qualifying Phase 4C/4D live worlds and eight prior Phase 4E worlds, including preserved partial runs. **All 93 original files matched their pre-task hashes**. Original accepted identities, journals and contexts remain unchanged; restoration made zero provider calls. Prior Phase 4D.1/4D.2 evidence remains preserved. The optional trigger-witness selector also preserves full/checkpoint-tail reconstruction of the earlier pre-marker 72- and 291-decision partial mocked worlds; their journals are not rewritten.

The live preflight ran as normal Windows account `tetas`: default accepted-run storage, social journals and atomic checkpoint replacement were writable, and credential-presence checks were true without displaying values. The trusted task ledger and single managed owner were verified; no mock/fixture preload remained. No ACL, ownership, security-policy or automatic archive migration change was made. Restricted Codex execution can still encounter `EPERM`; it is not the verified normal-user execution context.

## Automated, recovery and desktop verification

The final pre-live network-blocked gate passed: **1,170 tests, zero failures/skips**, approximately 54.30 seconds. Main TypeScript, affected strict TypeScript, production build and `git diff --check` passed. Evidence is `tmp/phase4e1/offline-gate.json`, `tests-navigation.log`, type/build logs and desktop artifacts. The absolute-URI `offline-network.mjs` guard covered test/type/build subprocesses. Standalone GIS/numerical CLI verification is not claimed.

A real three-process restart fixture adds evidence beyond simulated PID tests: process one committed two mocked decisions and exited abruptly with its durable job still running; process two restored the identical accepted state, projected `APPLICATION_RESTART`/paused and made zero calls; process three required explicit resume, made only the two remaining admitted calls and stopped budget-limited at four. Run/job identity stayed stable, request IDs were distinct, concurrency remained one, and full/checkpoint-tail replay matched. Passive restoration left the accepted journal hash unchanged.

Both actual mocked desktop acceptances passed at **1440x900 and 1920x1080**. The 50/35 profile completed 350 decisions across all 35 capable agents; the 100/70 profile completed 700 across all 70, both at tick 80 with eight initial actions and no failed social decisions. Main completion and separate cancellation-control jobs were explicitly exercised; navigation/restoration did not create another inference run.

| Desktop profile | Full graph nodes/edges | Visible primary nodes/edges | Hidden agents discoverable | Mocked completion ms | Browser payloads checked |
|---|---:|---:|---:|---:|---:|
| 50/35/350 | 64/554 | 30/152 | 34 | 20,003 | 47 |
| 100/70/700 | 114/1,138 | 30/135 | 84 | 53,942 | 98 |

Map-first Explore, the three tabs, institution/platform/group/agent/aggregate inspectors, search/filter and hidden-agent discovery, keyboard selection, neighbour focus, dragging, two-neighbour movement, settling and position retention passed. The graph was meaningful rather than resident-dominated. Report agent/capability/offered/accepted counts reconciled at both viewports. There were zero page/console errors, zero horizontal-overflow failures and zero sentinel/private-shape leaks before and after restoration.

Pause/resume/cancel, browser closure while the owned job continued, reconnection and saved-history restoration passed for both cohorts. The browser made **zero `POST continue` requests**; model counts before and after restoration stayed 350/700. A discovered navigation bug that cleared the restored selection when returning to Map was repaired and reverified.

Safe screenshot inventory is in `tmp/phase4e1/desktop/acceptance-50.json` and `acceptance-100.json`. Representative files: `cohort-50-map-1440.png`, `cohort-50-graph-1440.png`, `cohort-50-group-1920.png`, `cohort-50-report-1920.png`, `cohort-100-graph-1440.png`, `cohort-100-group-1920.png`, `cohort-100-drag-1920.png`, `cohort-100-settled-1920.png` and restored-report images. Basemap requests used owned local tile fixtures; no external tile requests were dispatched.

## Controlled real-provider acceptance

**Exactly one fresh attempt**, through ordinary Map -> Explore, after offline PASS and the normal-user storage preflight. The question was:

> What if Singapore introduces a nationwide four-day workweek instead of the traditional five-day workweek? How would this affect employees, businesses, productivity, wages, and the wider Singapore economy?

- Run: `run-19d6b46a483e6072d8f8868b-attempt-4-4e8dd4bd-7df0-40b0-9c34-6f3f8a752f51`.
- Plan: `dynamic-plan-786470a4da80b10e4e365472ead62b08df9d2ef8362113b94da8eaef694964c9`.
- Coordinator job: `568c6e76-3062-4d30-ad6f-9a6494435343`.
- The run-ID's embedded attempt suffix belongs to existing application allocation, not four paid attempts in this task. The independent task ledger records **attempt 1 only**.
- Final state: job `budget-limited`, public society `partial`, accepted revision 70, tick 14/80, 210 simulated minutes. Capacity remained 350; the separate admitted provider budget remained 70.
- No deterministic continuation to tick 80 was performed to disguise exhaustion. No failed decision was replaced.

### Retrieval, planning and initial stakeholders

One real Tavily search returned two usable candidates with source metadata and one reported credit. They were the PMC article “Reimagining Singapore's work culture: the four-day workweek proposition” (`https://pmc.ncbi.nlm.nih.gov/articles/PMC11774796`, 10 January 2025) and University of Queensland Business School's “Does a 4-day work week help or hinder?” (`https://business.uq.edu.au/momentum/4-day-work-week`, 17 November 2022). Candidate relevance is not independent verification of every generated claim or evidence of Singapore-wide policy outcomes.

Both real entity/relationship planning stages and all eight initial actions were accepted. Four fictional roles represented an engineering-consultancy project manager, senior engineer, retail owner and retail assistant. They remained fictional role contexts rather than invented Census-matched individuals. Canonical references, geographic/source validation and exact model/serving-provider checks passed.

The dynamic plan proposed MOM, SNEF, MyCareersFuture and a **REACH discussion forum**. The communication registry created one public discussion environment (`channel:entity-004`). Model-proposed real-world identities remain labelled unverified. There were **zero private channels, zero groups and zero transfers**. The implementation did not insert WhatsApp/Telegram or fabricate a group after acceptance.

### Participation and causal timing

| Observation | Actual result |
|---|---:|
| Active / capable / rule-driven agents | 50 / 35 / 15 |
| Distinct agents offered / accepted | 35 / 35 |
| Distinct model authors | 34 |
| Accepted social decisions / failures / skips / model inactivity | 70 / 0 / 0 / 0 |
| Decisions per participating agent | 1-5 |
| Authored social contributions / reactions | 69 / 1 |
| Early / middle / late accepted decisions | 70 / 0 / 0 |
| Eligible / offered peer-reply choices | 142 / 140 |
| Actual replies to another social-model author | 58 |
| Longest contiguous model-authored chain | 8 |
| Maximum ancestry including its seed | 9 |
| Maximum distinct participants in one chain | 3 |
| Overlapping A -> B -> A triples | 26 |

The 26 triples overlap and are not 26 independent conversations. Two further model-targeted replies addressed the actor's own earlier item and are excluded from peer replies. The safe audit initially counted those two as peers; only its metric was corrected, with an explicit reconciliation assertion. Application Graph/Report counts were already 58. This required no model-output change, application repair or additional paid calls.

Ticks 1-5 each used six distinct-agent slots; later ticks used four or five. All decisions occurred at ticks 1-14 because demand consumed the explicit 70-call live cap. The full-capacity offline fixtures demonstrate later participation; this real run does **not** establish middle/late-timeline behaviour. Decisions observed earlier committed authorised state, preparation reads were legitimate, and no handled trigger source was reused. Dedicated offline tests, rather than a live suppression counter, verify unchanged-trigger suppression.

### Memory, repetition and meaning

Short-term memory reached 12 entries and episodic memory reached 14/32. There were 22 optional short-term recalls, **zero episodic-origin context inclusions and zero optional episodic recalls**. Two fixed-vocabulary continuity cues were observed. These are coarse diagnostics, not proof that memory caused a decision. Long-term episodic-only use is **NOT OBSERVED** in this run; the Phase 4D.1/4D.2 real evidence remains historical and the new stress fixtures provide structural evidence.

Protected diagnostics found topic overlap around staffing, implementation, productivity, pay and quality without copying dialogue into the report. All actual targets and memory references were checked against the reconstructed authorised prefix. That establishes relevant accessible inputs, not comprehensive semantic comprehension. Private conversation quality, cross-environment propagation and explicit issue developments were not observed. There were zero explicit open/resolved/withdrawn issue updates; no commitments or resolutions were invented.

The bounded near-duplicate detector found zero near-duplicate model or rule-authored items. Repeated reads and repeated influence from an unchanged item were zero. Rule activity included 14 inactive events, with no rule-authored discretionary contributions in this live prefix. Lexical novelty does not establish useful disagreement or progress: 49 classified decisions were tagged support and none disagreement. Repeated generic support remains a behavioural risk despite no near-identical wording.

| Behavioural dimension | Assessment | Basis and limit |
|---|---|---|
| Independent participation | PASS | All 35 capable agents received accepted real decisions; 34 authored content |
| Voluntary peer/reciprocal conversation | PASS, observed capability | 58 peer replies, depth-eight model chain, three participants; not universal reliability |
| Semantic relevance and continuity | PARTIAL | Authorised context and coarse topic/continuity evidence; no paid evaluator or comprehensive human semantic review |
| Long-term episodic-only use | NOT OBSERVED | Insufficient retained-history pressure in this prefix |
| Private discussion continuity | NOT OBSERVED live | No private environment/group generated; extensive offline fixtures passed |
| Low-repetition behaviour | PARTIAL | Detector/cooldown checks passed, but no empirical realism or semantic progress claim |
| Information propagation | PARTIAL | Valid public exposure/replies and state references; no cross-environment transfers |
| Explicit issue development | NOT OBSERVED | No issue updates |
| Overall real-model behaviour | PARTIAL | Meaningful structural advances with the above limitations |

### Fact-pack, Graph and Report reconciliation

The authoritative prefix contains **278 events = 8 initial seeds + 116 social-model effects + 154 rule effects**. There are 77 authored items (8 seeds plus 69 social contributions), 134 reads, one reaction, no shares/private messages, and 46 nonzero fictional position changes. Multiple effects of one model decision are not extra decisions.

The fact pack has 34 unique authors, 66 uniquely classified authored decisions and 11 unclassified items. Argument categories reconcile: concern 12, condition 4, support 49, question 1, disagreement 0. Topic coverage, follow-ups (67), peer replies (58), depth, early-only chronology and all claim-to-fact references reconcile. Topic categories can overlap; these are self-classifications, not independent voters, consensus or measured public opinion.

The full public graph has **59 nodes / 391 relationships**, with 25 primary nodes / 114 edges initially shown and 34 additional people discoverable. Institution/platform prominence, provenance labels and aggregate basis remain visible. Platform, institution and agent inspectors and Report use the same safe facts. The private-group inspector checkpoint is NOT OBSERVED live.

### Live privacy, replay and desktop evidence

The privileged read-only audit compared 224 distinct internal strings against the stored ordinary projection: **zero literal leaks**, no transcript fields, every model context authorised. It made zero network/provider requests and verified the accepted archive, journal and checkpoint hashes before/after. Full genesis replay and materialised-checkpoint restoration matched exactly.

- Journal: **3,960,530 bytes**.
- Private checkpoint: **2,283,768 bytes**, bound to accepted record 70.
- Observed full replay: **737.6 ms**; checkpoint restoration: **34.7 ms**. These are local samples, not provider timings.
- Public projection: approximately **505 KB**.
- Both live desktop viewports, **1440x900 and 1920x1080**, passed platform/institution/agent inspectors, readable summaries, Report agreement, graph dragging and connected-neighbour movement, settling and retained positions.
- Reload/history restored the same run and identical public hash/usage. Exactly one Explore remained recorded; status, resizing, navigation and restoration issued no additional inference.
- **223 browser API payloads** passed structural/sentinel checks; HTML, hydration-visible content and browser storage checks passed. No page/console errors or horizontal overflow were observed.
- Live group inspectors/private chronology remain untested because no group existed, not because raw history was exposed for inspection.

Safe artifacts are `tmp/phase4e1-live/attempt-1-audit.json` and `tmp/phase4e1-live/desktop/acceptance.json`. Screenshots include `map-1440.png`, `graph-1440.png`, `platform-1920.png`, `agent-1440.png`, `report-1920.png`, `drag-1920.png`, `settled-1920.png` and `restored-report-1920.png`. Browser basemap tiles used the owned local fixture; all planning/retrieval/social provider requests were real, not intercepted fixture responses.

### Durable cumulative paid ledger

The independent task guard uses an append-before-dispatch, fsynced, hash-chained ledger in ignored `tmp/phase4e1-live/ledger.jsonl`; `ledger.json` is its safe projection. It reserved USD0.02 per OpenRouter request before dispatch, retained unknown charges, prevented duplicate/concurrent identities and enforced route/model/schema constraints. A generation-details lookup was allowed only for a recorded unverified completion, not an extra inference. No automatic retries were configured.

| Resource | Used | Authorised whole-task ceiling |
|---|---:|---:|
| Fresh Explore attempts | 1 | 3 |
| Tavily requests / reported credits | 1 / 1 | 3 / 6 |
| Planning completions | 2 | Included in 240 |
| Initial stakeholder completions | 8 | Included in 240 |
| Social completions | 70 | 70 per attempt; included in 240 |
| Total OpenRouter completions | 80 | 240 |
| Reported OR charges | USD0.0399593908 | USD1.00 including outstanding reserves |
| Unknown OR reservations / uncertain calls / pending calls | USD0 / 0 / 0 | Must remain reserved if unknown |
| Concurrency | 1 | 1 per run |
| Paid evaluator / summariser / other provider calls | 0 / 0 / 0 | 0 |

| Stage | Requests | Input tokens | Output tokens | Reported USD | Summed request duration ms |
|---|---:|---:|---:|---:|---:|
| Tavily | 1 | Not reported | Not reported | **Unknown** | 3,724 |
| Planning | 2 | 3,452 | 2,068 | 0.0009029720 | 11,837 |
| Initial actions | 8 | 30,997 | 1,389 | 0.0036292858 | 19,942 |
| Social | 70 | 279,359 | 11,734 | 0.0354271330 | 163,577 |
| OpenRouter total | 80 | 313,808 | 15,191 | **0.0399593908** | 195,356 |

First retrieval dispatch to final provider response took **206,416 ms** (approximately 3m26s); it includes local orchestration between the stage requests. No stage failed or call remained interrupted/rejected/uncertain. The per-attempt social ceiling stopped further dispatch. Task attempt 1 is closed as `partial`, not armed for more spending. No second/third attempt, Tavily connectivity probe, evaluator, summariser or automatic paid retry was performed.

The USD threshold is **local admission control**, not a guaranteed external prepaid cap. Tavily dollar charges remain **unknown**, not zero. Reported OR charges and final zero reservations are reconciled to the independent task ledger and accepted usage.

## Targeted repairs and final verification

The implementation/review cycle fixed causal preparation-read attribution through an optional frozen marker, scheduler demand/cooldown/fairness edge cases, cold-load/stale-cache ownership, checkpoint recovery limits, fatal progress refresh, compact observer races and saved-history retention. Each has focused regression coverage. The two acceptance-discovered application defects were the deep 24 KB overflow and Map navigation clearing restored history; both were reproduced and repaired offline before paid activity. Harness tile creation and hidden-select waiting were corrected without changing product semantics.

After live inspection, the complete network-blocked suite passed again: **1,170 tests, zero failures/skips, 56.42 seconds**, followed by application TypeScript, strict Phase 4D affected-module TypeScript and whitespace checks. The production build had passed with the identical application code before live dispatch (build ID `he2zEGAuZGN3yU4YHog3S`); no application code was changed by live testing. The verification-only peer counter correction also passes the final suite/types. Logs: `tests-final-after-live.log`, `diff-final.log`, `build-navigation.log`.

Final historical audit again replayed four qualifying Phase 4C/4D worlds and eight prior Phase 4E worlds, with **all 93 pre-task file hashes unchanged** and zero provider calls. The accepted new live journal/checkpoint/archive remain exact and retained. No standalone numerical/GIS CLI result is claimed.

Task-owned mock/live servers were stopped and the owned live browser context closed after inspection. No stage/commit/push/reset/stash/merge/rebase, deployment, credential edits, security-policy/ACL changes, new packages, secondary-worktree access or mobile testing occurred. Raw private records and safe ignored evidence are preserved.

## Remaining limitations and recommended next step

1. **Private live checkpoint incomplete.** Dynamic selection legitimately generated only public REACH. Overall live acceptance is PARTIAL; offline private fixtures are not substituted for real private activity.
2. **Capped early prefix.** Real capacity was 350, admitted calls 70 and observed tick 14; middle/late simulation, 350 real decisions and 700 real decisions were not tested.
3. **Limited semantic evidence.** Genuine voluntary reciprocal chains were recorded, but comprehensive reply relevance, distinct priorities and productive disagreement need protected review. No paid evaluator was used.
4. **Long-term/private memory not observed.** ST12/EP32/refs6/items8 stayed bounded; no episodic-only content entered this live prefix. Do not infer a retrieval defect or substantive recall from bindings.
5. **Local operational model.** Coordinator requires the authorised long-lived local Node application, not serverless execution; ambiguous foreign ownership is refused. Serial latency accumulates over larger real budgets.
6. **Measured performance limits.** Preparation/finish timings include several stages. Scheduler-only wall time and continuous eligible-queue waiting were not isolated. RSS samples are not isolated continuous peak measurements.
7. **Metadata and depth limits.** Topic retrieval is deterministic metadata/lexical selection, not semantic embeddings. Deep ancestry is bounded at 64. The issue history is bounded at 16 and its active context at eight.
8. **Fictional outcomes.** Sources do not validate synthetic opinion/position changes or economic predictions. Broad role contexts remain honestly distinct from profile-matched demographics.

Recommended next step: review this accepted public run and protected reply-quality evidence, then separately authorise a scenario where private coordination is plausible if live private verification is still required. Do not repeat paid attempts unchanged merely to chase a platform, larger event count or desired conversation. No further phase or spending is started automatically.

## Exact changed-file inventory

The following tracked modifications and new source/test/document files comprise this task. Ignored screenshots, ledgers, journals, local logs and fixture artifacts are evidence, not Git-staged changes.

```text
components/communication-report.tsx
components/use-question-simulation.ts
components/use-society.ts
components/workspace.tsx
docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md
docs/PHASE4E1_DEEP_SWARM_IMPLEMENTATION_AND_LIVE_ACCEPTANCE.md
docs/superpowers/plans/2026-10-31-phase4e1-deep-swarm.md
lib/contracts/tests/deep-coordinator.test.ts
lib/contracts/tests/deep-observer.test.ts
lib/contracts/tests/deep-public-job.test.ts
lib/contracts/tests/phase4e1-context-capacity.test.ts
lib/contracts/tests/phase4e1-conversation.test.ts
lib/contracts/tests/phase4e1-journal.test.ts
lib/contracts/tests/phase4e1-live-guard.test.ts
lib/contracts/tests/phase4e1-navigation.test.ts
lib/contracts/tests/phase4e1-notifications.test.ts
lib/contracts/tests/phase4e1-policy.test.ts
lib/contracts/tests/phase4e1-process-restart.test.ts
lib/contracts/tests/phase4e1-scheduler-review.test.ts
lib/contracts/tests/phase4e1-scheduler.test.ts
lib/contracts/tests/phase4e1-storage-service.test.ts
lib/contracts/tests/summary-history.test.ts
lib/question-simulation/job.ts
lib/question-simulation/public-session.ts
lib/question-simulation/summary-history.ts
lib/server/society/checkpoint.ts
lib/server/society/coordinator.ts
lib/server/society/facts.ts
lib/server/society/public-service.ts
lib/server/society/service.ts
lib/server/society/session-lock.ts
lib/server/society/summary.ts
lib/server/society/swarm-journal.ts
lib/society/communication.ts
lib/society/context-capacity.ts
lib/society/contract.ts
lib/society/decision-contract.ts
lib/society/decision-menu.ts
lib/society/deep-context.ts
lib/society/deep-policy.ts
lib/society/deep-scheduler.ts
lib/society/engine.ts
lib/society/episodic.ts
lib/society/exposure.ts
lib/society/group-engine.ts
lib/society/hybrid.ts
lib/society/memory-diagnostics.ts
lib/society/public-contract.ts
lib/society/retrieval.ts
lib/society/swarm-scheduler.ts
lib/society/swarm.ts
scripts/testing/phase4e1-benchmark.ts
scripts/testing/phase4e1-desktop.mjs
scripts/testing/phase4e1-historical.ts
scripts/testing/phase4e1-live-audit.ts
scripts/testing/phase4e1-live-browser.mjs
scripts/testing/phase4e1-live-guard.mjs
scripts/testing/phase4e1-live-server.mjs
scripts/testing/phase4e1-live-server.ps1
scripts/testing/phase4e1-mock-server.mjs
scripts/testing/phase4e1-mock-server.ps1
scripts/testing/phase4e1-provider-preload.mjs
scripts/testing/phase4e1-restart-fixture.ts
scripts/testing/tsconfig.phase4d.json
```
