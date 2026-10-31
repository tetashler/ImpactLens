# Phase 4E.2 — Extended Simulation Time and Decision Pacing Research

Date: 31 October 2026. Repository inspected: `master`, HEAD `ff46ab24ad93bb9260cc4a94ee0111f2e83cf21d`.

**Status: research and recommendations only. Phase 4E.2 is not implemented or acceptance-tested.**

This document records the read-only architectural investigation. It was subsequently saved at the user's explicit request. No proposed implementation or future paid test is authorised by this document.

## 1. Executive recommendation

Adopt **Approach B: a longer clock plus grant-aware decision pacing**, initially using **320 ticks at 15 minutes per tick**, representing **80 simulated hours: three days and eight hours**.

Preserve the existing engine, serial provider gateway, local coordinator, bounded memory, hash-chained journals, materialised checkpoints and entity-first Knowledge Graph. The smallest effective extension consists of:

- A new immutable execution profile, preserving historical policies.
- Pacing against the initial trusted social-call grant, separately from engine capacity.
- Small conversation bursts with capacity reserved for later periods.
- Explicit fictional day/night availability.
- Shared capacity validation across server, replay, storage and browser.
- Explicit termination on event/item/storage exhaustion and fail-closed no-progress handling.
- Bounded daily Report chronology using the same authoritative facts as the Graph.

Keep 160 ticks as an intermediate regression configuration and 672 ticks as an offline stress configuration. Do not introduce a vector database, distributed queue, new simulation framework or concurrent inference for the first proposed 350-decision live test.

## 2. Confirmed repository baseline

| Item | Observed state |
|---|---|
| Branch | `master` |
| HEAD | `ff46ab24ad93bb9260cc4a94ee0111f2e83cf21d` |
| Working tree during research | Clean at initial and final inspection |
| Primary deep profile | 50 active / 35 LLM-capable / 350-decision capacity |
| Larger deep profile | 100 active / 70 LLM-capable / 700-decision capacity |
| Default clock | 80 ticks |
| Historical verification | 1,170 passing tests; not rerun during research |
| Last live result | 70 accepted social decisions, all 35 capable agents, tick 14/80 |

The [Phase 4E.1 report](PHASE4E1_DEEP_SWARM_IMPLEMENTATION_AND_LIVE_ACCEPTANCE.md) records offline PASS, live integration PARTIAL and behavioural PARTIAL. No private groups, long-term episodic-only recall or completed 350-decision live simulation were demonstrated.

Also reviewed:

- [Phase 4E scalable swarm implementation](PHASE4E_SCALABLE_LLM_SWARM_IMPLEMENTATION.md).
- [Phase 4D.2 topic-aware memory retrieval](PHASE4D2_TOPIC_AWARE_MEMORY_RETRIEVAL.md).
- [Development roadmap](IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md).

Source line references below describe the inspected HEAD and may move after implementation.

## 3. Current simulation-clock architecture

The existing architecture separates:

1. A coarse tick that advances routine/geographic simulation once.
2. Sequential reasoning substeps inside that tick.
3. Authoritative event order, target references and membership sequence.

Events use `minute = tick * 15`. There is no simulated calendar date, weekday, time zone or human availability schedule. Model opportunities occur at ticks `1..steps-1`; the final tick is reserved for routine progression. Later committed decisions within a tick can observe earlier authorised events from that tick.

Evidence: `engine.ts:89,104-108,123`, `hybrid.ts:58-60`, `deep-scheduler.ts:7-12`.

Relevant sources: [engine](../lib/society/engine.ts), [hybrid](../lib/society/hybrid.ts), [deep scheduler](../lib/society/deep-scheduler.ts).

Keep one evolving world. Resetting tick, memories or groups each day would break continuity and access chronology.

## 4. Why the 70-decision live run reached tick 14

The confirmed scheduler formula is:

```text
allowed = min(engineCapacity, ceil((tick + 2) * engineCapacity / totalTicks))
```

For capacity 350, provider grant 70 and 80 ticks:

```text
tick 13: ceil(15 * 350 / 80) = 66
tick 14: ceil(16 * 350 / 80) = 70
```

The scheduler sees the 350-capacity input, not the separate 70-call service grant. Sustained eligible demand consumed the released opportunities, and provider admission correctly stopped further dispatch at 70.

This is a **capacity-pacing versus provider-grant mismatch**. It is not evidence that provider admission failed.

Evidence: `deep-scheduler.ts:10-12`, `service.ts:47-68`, `public-service.ts:25`, `coordinator.ts:33-36`.

Simply extending the clock retains the same early-fraction problem. Under sustained demand, the earliest permitted exhaustion of the same grant would be approximately ticks 14/30/62/131 for horizons 80/160/320/672. Only tick 14 is an observed result; the other values are static calculations, and those horizons currently fail validation.

## 5. Comparison of 80, 160, 320 and 672 ticks

The following values are static calculations, not new benchmark measurements.

| Ticks | Simulated duration | Raw slots, primary/larger | Average decisions per eligible tick for 350 | Default routine slots | Main value |
|---:|---|---:|---:|---:|---|
| 80 | 20 hours | 474 / 948 | 4.43 | 480 | Regression baseline |
| 160 | 40 hours | 954 / 1,908 | 2.20 | 960 | One overnight return |
| 320 | 80 hours | 1,914 / 3,828 | 1.10 | 1,920 | Several daily cycles |
| 672 | 168 hours / seven days | 4,026 / 8,052 | 0.52 | 4,032 | Weekday/weekend and longer-gap research |

Raw slots are `6 * (T-1)` or `12 * (T-1)`, before global, actor, availability and demand limits. Default routine slots are `6 * T`; they exclude preparation reads, seeds and model effects.

Current `SOCIETY_LIMITS.steps` is **144**, enforced during creation, advancement and restoration. Browser parsing also repeats that ceiling. Thus 160/320/672 are research candidates, not supported configurations today.

Evidence: [contracts](../lib/society/contract.ts), `contract.ts:11`; `engine.ts:29,125,127`; [public parser](../lib/question-simulation/public-session.ts), `public-session.ts:16,31`.

More ticks alone create more elapsed time and routine work, not necessarily new information or social development.

## 6. Recommended tick count and horizon

**320 ticks is the best initial target**, subject to implementation and offline acceptance.

It provides several overnight returns, approximately ten potential decisions per capable agent, enough room for bursts and a manageable increase over the current retained world. A week adds substantially more routine activity before it provides evidence of better behaviour.

Retain 15-minute ticks initially as an ordering and availability resolution. Do not claim that all human responses naturally occur at that interval.

Add an immutable fictional calendar anchor, for example Day 1 at 08:00 in Asia/Singapore. Any weekday is a labelled scenario assumption, not the actual execution date or a real forecast. Keep wall-clock execution time separate from simulated elapsed time.

## 7. Recommended decision pacing policy

Pacing should use a frozen scheduling target:

```text
P = min(engine reasoning capacity, initial trusted social-call grant)
```

Payment admission remains independent and continues enforcing calls, tokens, cost, concurrency and deadlines. Do not drive deterministic scheduling directly from mutable reported costs, provider latency or browser parameters.

| Approach | Strength | Main weakness | Recommendation |
|---|---|---|---|
| Fixed per-tick cap | Simple burst ceiling | Does not reserve future calls | Keep as a ceiling only |
| Proportional release | Predictable temporal coverage | Can defer urgent replies | Good baseline |
| Reserved period budgets | Explicit early/middle/late protection | Abrupt boundaries and unused allocations | Use as a guard, not a quota |
| Event-driven pacing with temporal reserves | Preserves bursts and later capacity | Needs clear credit/debt rules | Preferred |
| Fully adaptive pacing | Responds to changing demand | Harder to audit; noisy demand can dominate | Defer complex adaptation |

Suggested first policy:

- Initial burst credit of at most six primary or twelve larger-profile calls.
- Gradual release of the remaining grant over simulated time.
- Unused allowance carries forward.
- Small bounded urgent-reply borrowing against the next release.
- Roughly 30% of the grant protected until the final third.
- No dispatch without actual eligible demand; no requirement to use all allowance.

An illustrative baseline is:

```text
U(t) = B + floor((P - B) * (t - 1) / (T - 2))
B = min(P, slotsPerTick)
eligible ticks = 1..T-1
```

Tiny horizons and grants need explicit boundary tests. Urgency should mainly change candidate ordering, with only limited borrowing; it must not create more payment authority.

The pacing target must be replay-visible in the new immutable input. Current replay uses input and accepted records, whereas provider admission is separate journal metadata. Reading mutable service admission inside the old scheduler would break determinism. Evidence: `hybrid.ts:107-117`, `swarm-journal.ts:17-20`.

## 8. Per-tick opportunity policy and fairness

Retain six/twelve sequential slots and one concurrent provider call. These are burst ceilings, not target rates.

Keep the existing safeguards initially:

- One opportunity per actor per tick.
- Four-tick ordinary cooldown; one tick for direct replies.
- Four selected turns per thread root per tick.
- Suppression of handled and repeated sources.
- Accepted inactivity consumes its opportunity.
- Soft ten/hard sixteen opportunities for the 350/35 profile.

Current fairness combines urgency, bounded waiting credit, `(10 - prior decisions) * 24` fair-share preference and a channel-use penalty. It gives preference, not guaranteed equal activity or a strict starvation bound. Waiting is not continuous eligible-queue wait.

Quiet actors must not accumulate unlimited credit without demand. Highly active actors can legitimately participate more while remaining bounded. Measure configured capability, offered opportunities, accepted decisions, distinct authors and repeated conversation participation separately.

Evidence: `deep-scheduler.ts:19-45`, [swarm policy](../lib/society/swarm.ts), `swarm.ts:3-11`.

## 9. Day/night and multi-day routines

Current routine activation is a seeded lottery, independent of model scheduling. No sleep, work, weekend or human availability state is implemented. Geographic context alternates periodically; it is not a validated commute or work schedule.

The smallest credible temporal model should provide:

- Explicit fictional rest/availability windows with seeded variation.
- Deferred notifications while unavailable.
- Cooldowns expressed through consistent elapsed-time units.
- Scenario-supported shift variants where appropriate.
- Availability transitions rather than one inactive event for every sleeping tick.

Do not infer occupation, care responsibilities or sleep from Census demographics. A simple labelled weekday/weekend distinction is useful for seven-day stress testing, but a detailed weekend model is not essential to the first 320-tick profile.

Evidence: `contract.ts:12,15`, `engine.ts:106-108`, [routine](../lib/society/swarm-routine.ts), `swarm-routine.ts:3-12`.

## 10. Sustained conversation design

Retain complete ancestry verification up to 64 items and a context of at most eight actual item bodies. Omitted ancestors must remain explicitly labelled as omitted, never implied to have been read.

Longer simulations should support several useful threads rather than one indefinitely agreeable reply chain. Balance direct replies with relevant issues, legitimate new discussion and disengagement. Reopen issues because of new authorised information, actual stated review conditions or explicit bounded review assumptions—not fabricated incoming messages.

At the depth boundary, let the model choose a permitted new root/message, refer to legitimate earlier memories, or remain inactive. Never convert an invalid reply into a post automatically. Increasing ancestry beyond 64 is not the first remedy.

The private inbox selects sixteen accessible items. A static saturation risk exists because this truncation precedes some handled/self/repeated filtering: already-handled direct replies could crowd out other candidates. Test and, if reproduced, filter ineligible candidates before applying the bound under the new policy.

Evidence: [exposure](../lib/society/exposure.ts), `exposure.ts:7`; [deep context](../lib/society/deep-context.ts), `deep-context.ts:8-22`; `deep-scheduler.ts:25-36`.

## 11. Episodic memory and issue continuity

Keep ST12, EP32, six selected memories, eight context items and the 24 KB bound initially. EP32 is a count bound, not a TTL. Older episodes survive if retained; repeated encounters with one unchanged primary source are coalesced.

Retrieval recency is:

```text
0.6 / (1 + elapsedTicks / 20)
```

This component halves after five simulated hours with fifteen-minute ticks. It does not expire memories, and topic relevance can outweigh it. Longer horizons increase pressure through new encounters, not simply elapsed ticks. Measure distinctive-memory displacement before expanding capacity.

Important issue limits:

- Sixteen lifetime issue-history records, including resolved/withdrawn records.
- Eight entries in the active actor view.
- At most four issues in the actual model context, contingent on retained source content.
- New issue creation at history capacity is rejected; it is not silently evicted.

The current menu may still advertise creation at that lifetime limit. This matters especially for future profiles exceeding sixteen decisions per actor. Expose truthful issue-creation capacity in the new context/schema while keeping updates to existing open issues available. Preserve unresolved status; omission is not resolution.

Evidence: [episodic memory](../lib/society/episodic.ts), `episodic.ts:14-35,43-53`; [retrieval](../lib/society/retrieval.ts), `retrieval.ts:25-60`; `hybrid.ts:47`; `decision-menu.ts:48`.

Day changes must not reset event sequence, memory identity or membership epochs. Current private retrieval requires current membership and ancestry at or after the current join point. Leaving blocks retrieval; rejoining does not reveal prejoin history.

## 12. Private-group planning and activation

The last live plan selected public REACH and no private environment. This explains zero private activity; it does not demonstrate a private scheduler, memory or permission failure.

Planner guidance already asks for appropriate public/private coordination venues without making them compulsory. Communication selection consumes declared capabilities; it does not add a mandatory private fallback.

Current private initialisation needs careful attribution:

1. Planning selects a private-capable platform.
2. The engine deterministically creates a first-eight-agent bootstrap group and message.
3. Subsequent model creation, invitation, message and reply events retain their own provenance.

Bootstrap is not voluntary LLM group formation. Private scheduling requires legitimate membership/invitation; removing bootstrap without a separate initiation path could make private contexts unreachable.

Future acceptance should distinguish selected venue, rule-created bootstrap, voluntary additional groups and voluntary subsequent participation. If no private venue is generated, report NOT OBSERVED. Do not add one or repeat paid runs merely to chase that checkpoint.

Evidence: `planner.ts:36`, [communication](../lib/society/communication.ts), `communication.ts:9-19`; `engine.ts:43`; `hybrid.ts:46`.

## 13. Future capacity beyond 350/700

| Current constraint | Effect |
|---|---|
| Deep profiles allow 50/35 at 175/350, 100/70 at 350/700 | Other capacities reject |
| At most seventy capable agents | A hundred capable agents need a new cohort policy |
| Sixteen opportunities per actor | Aggregate ceilings are 560/1,120 |
| One hundred total agents | Larger populations require separately tested bounds |
| 144 ticks | All extended candidates reject today |
| Job/public capacity at most 700 | Larger persisted jobs/DTOs reject |
| 8,192 events / 2,048 items | Material under longer, heavily authored histories |
| 32 MiB private checkpoint/world | Likely first storage bottleneck |

Illustrative future allowances, not approved implementation profiles:

| Capable agents | Capacity | Mean | Example soft/hard actor allowance |
|---:|---:|---:|---:|
| 35 | 350 | 10 | 10 / 16 |
| 35 | 700 | 20 | 20 / 32 |
| 70 | 700 | 10 | 10 / 16 |
| 70 | 1,400 | 20 | 20 / 32 |
| 100 | 2,000 | 20 | 20 / 32 |

A 100-capable profile must explicitly choose total population and cohort ratio. Do not reinterpret today's 100-active/70-capable profile. Private groups also remain bounded at eight groups/eight members each; greater population does not imply universal private access.

Evidence: `swarm.ts:8-10`, `engine.ts:25`, `contract.ts:11`, `coordinator.ts:20`, `public-session.ts:16,25,31`, `group-engine.ts:13,17`.

## 14. Unified capacity and validation architecture

Use one immutable, allowlisted execution-profile registry containing:

- Clock version, tick duration, horizon and calendar anchor.
- Total/capable population and reasoning capacity.
- Actor allowances, cooldowns and tick/thread bursts.
- Routine policy and routine ceiling.
- Event, item, group and ancestry bounds.
- Memory/context limits.
- Journal/checkpoint/private-world limits.
- Derived replay-iteration bounds.
- Public projection schema and limits.

Server creation, replay, readers, coordinator and browser parsers should resolve the same profile ID rather than repeat `144`, `700`, `70`, `16` and `8192`.

Validate aggregate actor/slot feasibility and tested resource headroom. Keep trusted provider authority separate, freezing only its scheduling-relevant pacing target into replay-visible input. Browser profile IDs cannot grant arbitrary execution or payment authority.

Historical worlds without the new selector retain their exact original policy paths. No migration or regeneration of accepted decisions is required.

## 15. Storage and checkpoint estimates

Measured Phase 4E.1 fixtures:

| Configuration | Journal | Material checkpoint |
|---|---:|---:|
| 50/35, 80 ticks, 350 decisions | 17.97 MB | 9.13 MB |
| 100/70, 80 ticks, 700 decisions | 36.00 MB | 19.20 MB |

These are existing observations, not new measurements or guarantees.

Format-2 rows contain new decisions, pending/reservation context and hash metadata—not every routine event or the complete world. Extra routine events mainly enlarge materialised worlds/checkpoints.

For planning only, assume six routine slots/tick, 0.5–2 KiB retained bytes per additional routine event, and roughly 0.5 KiB per extra empty tick journal row. The event-byte distribution was not measured during research.

| Configuration | Journal basis with unchanged decision records | Checkpoint basis |
|---|---:|---:|
| 160 ticks / 350 | About 18.0 MB | 9.4–10.1 MB |
| 320 ticks / 350 | About 18.1 MB | 9.9–12.1 MB |
| 672 ticks / 350 | About 18.3 MB | 11.0–16.4 MB |
| 320 ticks / 700 | About 36.1 MB | 19.9–22.2 MB |

Changed context sizes/conversations can materially alter these estimates.

Extending the measured 100/70 350-to-700 slope gives approximately:

| Decisions at 80 ticks | Journal estimate | Saved-world estimate |
|---:|---:|---:|
| 1,400 | 74.7 MB | 38.3 MB |
| 2,000 | 107.8 MB | 54.7 MB |

Under this fixture-specific linear model, the **32 MiB checkpoint/world bound is reached around 1,225 decisions**, before the journal ceiling. Longer clocks can lower that threshold.

A fixture-shaped event model is `12 + 6*T + 2*D`; optional stance effects add more. At 672 ticks, 1,400 decisions imply approximately 6,844–8,244 events and 2,000 imply 8,044–10,044. The 8,192-event ceiling therefore matters. Two thousand authored decisions also approach 2,048 items.

Current bounds are 128 MiB journal, 4 MiB row and 32 MiB material checkpoint/private world. Public stored envelopes are independently capped at 3 MiB and browser initial responses at 3,000,000 bytes. Preserve those separate privacy/resource boundaries.

Cold restoration verifies the full hash chain before using materialisation. Checkpoints reduce replay CPU, not full-chain verification. Retain that integrity guarantee.

Evidence: [deep limits](../lib/society/deep-policy.ts), `deep-policy.ts:4`; [journal](../lib/server/society/swarm-journal.ts), `swarm-journal.ts:17-42`; [checkpoint](../lib/server/society/checkpoint.ts), `checkpoint.ts:13-36`; `public-service.ts:19-20`.

## 16. Runtime and memory estimates

| Existing mocked fixture | Service | Full replay | Checkpoint-assisted cold restore |
|---|---:|---:|---:|
| 50/35, 350 decisions | 11.3 s | 4.9 s | 0.64 s |
| 100/70, 700 decisions | 35.9 s | 20.5 s | 1.23 s |

These are local fixture observations, not provider latency. Existing sampled RSS was approximately 401/701 MiB, measured in a shared process rather than isolated continuous peaks.

Longer horizons increase routine selection, event reduction, memory indexing and persistence. Current candidate selection rebuilds item/event/path views and repeatedly scans actor histories. Do not assume linear CPU or memory growth.

The last live sample averaged about 2.337 seconds per social call. Simple serial extrapolation, excluding local work:

| Calls | Sample-scaled social provider time |
|---:|---:|
| 350 | 13.6 minutes |
| 700 | 27.3 minutes |
| 1,400 | 54.5 minutes |
| 2,000 | 77.9 minutes |

These are sensitivity estimates, not forecasts. At five seconds/call, 350 calls take about 29 minutes before local work. Current coordinator default is thirty minutes, with a configurable maximum of six hours; provider admission has a separate epoch deadline.

Retain serial inference initially. Future parallelism requires deterministic snapshot/batch admission, stale-context rules, ordered commits and handling of partially completed batches—not simply concurrent requests.

Evidence: [coordinator](../lib/server/society/coordinator.ts), `coordinator.ts:61-66`; acceptance report benchmark/cost tables.

## 17. Real-provider cost and resource analysis

Historical reported usage, not current pricing, yields:

```text
Planning + initial actions = USD0.0045322578
Social cost per call      = USD0.035427133 / 70
```

| Social calls | Maximum total completions including planning/initial actions | Sample-scaled OR cost |
|---:|---:|---:|
| 350 | 360 | USD0.1817 |
| 700 | 710 | USD0.3588 |
| 1,400 | 1,410 | USD0.7131 |
| 2,000 | 2,010 | USD1.0167 |

For 350 social calls, sample-scaled total usage is approximately 1,431,244 input and 62,127 output tokens. Different contexts, output lengths, pricing and failures can change this substantially. No current provider prices were assumed or asserted.

Main risks are increased timeout/rejection exposure, unknown billing, default quick-profile token/cost grants, deadlines, local ownership loss and persistence failure after provider work. Raising only `SOCIAL_PROVIDER_MAX_CALLS` is insufficient; all other grants must be explicit.

## 18. Recommended single 350-decision live scenario

Proposed question:

> What if a new government-supported eldercare centre in Sengkang begins a three-day pilot of neighbourhood volunteer visits and caregiver-support sessions? How might nearby residents, caregivers, volunteers and service providers coordinate schedules, raise concerns, exchange updates and revisit unresolved practical issues over the following days?

Recommended future configuration: 50 active / 35 capable, 320 ticks, capacity/grant at most 350, six slots/tick, serial inference and the new pacing/availability policy.

This plausibly supports public questions and private coordination without requiring a particular platform/group. Assess overnight returns, distinct counterparties, relevant older memories, voluntary replies and actual issue developments. Separate rule bootstrap from voluntary group behaviour.

Do not inject developments merely to maintain demand. If demand disappears, issue no model calls and advance only legitimate scheduled/routine time. A valid natural completion may use fewer than 350 calls. A budget-limited prefix is not full temporal completion.

## 19. Suggested future admission limits

**Proposal only. A separate instruction must authorise the paid test after implementation/offline acceptance.**

| Resource | Suggested ceiling |
|---|---:|
| Fresh Explore attempts | 1 |
| Tavily requests / credits | 1 / 2 |
| Planning completions | 2 |
| Initial stakeholder completions | 8 |
| Social completions | 350 |
| Total OpenRouter completions | 360 |
| Concurrent completions/session | 1 |
| Reported + unknown-reserved OR cost | USD1.00 |
| Paid evaluator/summariser | 0 |
| Task deadline | 90 minutes |
| Social output bound | Existing 600 tokens |
| Automatic uncertain/rejected retries | 0 |

Retain exact per-context reservations and the primary engine's 16M representational token ceiling. Independently bound whole request bodies. A task ceiling around 40M reported-plus-reserved tokens covers approximately 36.34M under the prior guard's conservative wire-byte reservation calculation for maximum-sized requests. This is a safety envelope, not expected usage; the stricter application/token/USD/deadline limit always wins.

Revalidate whether the prior USD0.02 unknown reservation remains conservative for the permitted route/request size. Under a USD1 ceiling, enough unknown charges will legitimately stop the run early. Never treat them as zero or guarantee 350 completions.

Require one durable task ledger, append-before-dispatch reservations, exact provider identity/routing, writable private stores, one coordinator owner, cancellation and explicit resume after restart. Do not reset the old ledger or automatically repeat uncertain work.

## 20. Knowledge Graph and Report implications

Preserve the entity-first graph, existing filters, hidden-agent discovery and privacy-safe inspectors. Do not create individual message/event nodes or promote every resident equally.

Current significance is cumulative:

```text
4*public interactions + 4*groups created +
3*state changes + 2*followups + authored items
```

It may keep early prolific participants prominent. Label it cumulative first. If measured domination appears, consider capped per-thread contributions, distinct public counterparties, sustained participation and actual issue developments. Never label these calibrated influence.

Add bounded daily aggregates to the shared fact pack:

- Day/time labels and total simulated duration.
- Accepted decisions and distinct authors by day.
- Quiet/availability periods.
- Threads revisited after gaps.
- Actual issue changes.
- Memory available/retrieved/included/selected/substantively used as distinct stages.
- Natural versus budget/time/capacity termination.

Keep whole-run totals authoritative. Current chronology has only early/middle/late thirds, not daily development. No raw conversation or private membership histories should enter new DTOs.

Evidence: [entity graph](../lib/server/society/entity-graph.ts), `entity-graph.ts:30-36,82`; [facts](../lib/server/society/facts.ts), `facts.ts:22-23`.

## 21. Architectural options and external comparisons

| Approach | Effort | Social/pacing effect | Resource effect | Replay risk | Assessment |
|---|---|---|---|---|---|
| A: Extend clock only | Low | Elapsed time grows; grant mismatch remains | More routine work | Low–medium | Insufficient |
| B: Longer clock plus grant-aware pacing | Medium | Better temporal coverage, existing engine | Manageable at 320/350 if verified | Medium, controlled by versioning | Recommended |
| C: Hybrid event-time jumps | Medium–high | Efficient quiet periods | Can skip empty work | Higher; must preserve routines/deadlines exactly | Later optimisation |
| D: Broader societal architecture | High | Potentially richer calendars/networks | More operational/state complexity | High | Defer until measured need |

Useful public technical lessons:

- [SimPy scheduling](https://simpy.readthedocs.io/en/stable/topical_guides/time_and_scheduling.html) processes same-time events sequentially and uses an increasing event ID for ordering. This supports retaining deterministic substeps; it does not require adopting SimPy.
- [OASIS simulation documentation](https://github.com/camel-ai/oasis/blob/main/docs/simulation/simulation.mdx) documents separate clock configuration, explicit activation and concurrency limits. Borrow the separation of time and activation, not assumptions that its concurrency model is safe for ImpactLens.
- [Generative Agents](https://arxiv.org/abs/2304.03442) combines observation, planning and memory for multi-day continuity. The applicable lesson is to evaluate continuity mechanisms rather than elapsed duration alone. Paid reflection stages are unnecessary here.

No framework migration is recommended.

## 22. Recommended implementation sequence

1. Add the immutable execution-profile registry and preserve historical branches.
2. Add grant-aware pacing, bounded bursts/reservations and replay-visible diagnostics.
3. Add terminal event/item/storage exhaustion and fail-closed no-progress detection.
4. Implement the 320-tick calendar and explicit fictional availability.
5. Test longitudinal issues, memory and private inboxes; repair only reproduced limits.
6. Deduplicate material checkpoints and make status/authentication/summary observation efficient.
7. Run the complete offline matrix and desktop acceptance.
8. Only then seek the separately approved single real-provider test.

Do not start by replacing storage or enlarging every resource ceiling.

## 23. Detailed offline acceptance matrix

| Family | Configurations |
|---|---|
| Historical | 24/4/8 and accepted Phase 4C/4D policies |
| Quick compatibility | Existing 50/35/64 and 100/70/128 |
| Deep baseline | 80 ticks: 35/350 and 70/700 |
| Intermediate | 160 ticks: both deep cohorts |
| Primary candidate | 320 ticks: both deep cohorts |
| Week stress | 672 ticks: both cohorts where tested resource bounds permit |
| Grant mismatch | Capacity350/grant70 and capacity700/grant128 |
| Future envelope research | 35/700, 70/1,400 and 100-capable/2,000; not automatic feature approval |

Include quiet, demand-rich, early-burst, private-heavy, repetitive and adversarial histories.

Required gates:

- Pacing never exceeds cumulative release, bounded debt or provider authority.
- Early bursts preserve the specified later reserve.
- Legitimate late interactions remain eligible; quiet counterparts do not invent calls.
- Continuously eligible actors do not disappear behind repeated high-degree traffic; measure eligibility-to-offer delay separately from source age.
- Ticks/substeps/events remain ordered; routines execute once per coarse tick.
- An older legitimate experience can survive ST eviction and enter authorised context after a day gap.
- Outsider, pre-join, leave/rejoin and forwarding permissions remain exact.
- Genesis/checkpoint-tail replay matches; corrupt history is never skipped.
- Event/item exhaustion terminates explicitly rather than generating empty deltas.
- Sentinels are absent from API/status/Graph/Report/errors/browser storage.
- Browser closure preserves one owner; restart pauses; explicit resume never repeats accepted or uncertain requests.

The key late-time benchmark is a matched early-burst history with a genuinely recorded day-three reply, versus an otherwise equivalent quiet history without that reply. The former must permit late reasoning; the latter must not force it.

Use repeated isolated-process measurements for runtime, memory, journals, checkpoints, replay, projection bytes and latency. Define tested headroom rather than presenting these estimates as observations. Scripted choices demonstrate capability, not spontaneous model intelligence.

## 24. Anticipated source-file changes

Proposed files only; none was changed during research.

| Files | Purpose |
|---|---|
| `lib/society/swarm.ts`, `deep-policy.ts`, `contract.ts` | New version/profile and shared limits |
| Proposed `lib/society/execution-profile.ts` | Allowlisted capacity registry |
| Proposed `lib/society/temporal-policy.ts` | Calendar/availability helpers |
| `lib/society/deep-scheduler.ts`, `swarm-scheduler.ts` | Grant-aware pacing, fairness and diagnostics |
| `lib/society/swarm-routine.ts`, `engine.ts` | Temporal routines and terminal limits |
| `lib/society/hybrid.ts` | Frozen pacing/context and replay |
| `lib/society/episodic.ts`, `retrieval.ts` | Only demonstrated retention/time-unit fixes |
| `lib/society/deep-context.ts`, `decision-menu.ts` | Inbox filtering and truthful issue/depth capacity |
| `lib/society/group-engine.ts` | Shared bounds, unchanged permissions |
| `lib/server/society/service.ts` | Trusted profile/horizon and checkpoint scheduling |
| `lib/server/society/swarm-journal.ts`, `checkpoint.ts` | Profile-aware limits and recovery |
| `lib/server/society/coordinator.ts` | Terminal/no-progress/deadline consistency |
| `lib/server/society/public-service.ts` | Efficient status authentication/projections |
| `lib/society/public-contract.ts`, `discussion-contract.ts` | Safe temporal aggregates/status |
| `lib/question-simulation/public-session.ts`, `job.ts` | Shared parsing and observation |
| `lib/server/society/facts.ts`, `summary.ts` | Shared daily chronology |
| `components/communication-report.tsx`, `use-society.ts` | Compact time/progress display |
| `lib/server/society/entity-graph.ts` | Only measured significance refinements |
| New `lib/contracts/tests/phase4e2-*.test.ts` | Pacing, continuity, access, resources and replay |
| New `scripts/testing/phase4e2-benchmark.ts` | Network-blocked extended-clock matrix |
| Separate future task guard | One-run/350-call authority; preserve old ledger |

## 25. Risks, uncertainties and deferred features

### Confirmed static nonprogress risk

`engine.ts:104` returns unchanged state after event-limit. `hybrid.ts:60` returns that limited state, but `service.ts:190` increments revision and persists. `public-service.ts:25` considers final tick/pending state and provider budget, not event-limit. `coordinator.ts:33-38` can therefore reschedule unchanged simulation work every five milliseconds until deadline/storage failure.

This is a source-derived path, **not an observed acceptance failure**. Add an explicit capacity-limited terminal state or fail-closed progress assertion before expanding workloads.

### Other current concerns

- Service and coordinator both materialise near every fifty accepted decisions, potentially duplicating full-world writes.
- Compact status currently authenticates by reading the full stored public envelope.
- More days do not automatically introduce new evidence or developments.
- Broad topic metadata and untagged paraphrases remain retrieval limitations.
- Frequent agreeable replies can be lexically novel but socially unproductive.

### Evidence thresholds for larger infrastructure

| Change | Justification threshold |
|---|---|
| Incremental indexes/projections | Repeated scans measurably dominate local time or projection latency |
| Streaming verification | Whole-file journal decoding causes unacceptable memory/latency |
| Journal segments | Tested workload approaches journal headroom or verification becomes operationally slow |
| Compact checkpoints | Full-world/context snapshots approach the private size ceiling |
| Local database | Indexed queries/partial writes become demonstrably simpler and safer |
| Parallel inference | Serial latency exceeds an approved deadline after a causal batch design exists |
| Separate process | UI responsiveness, isolation or ownership demonstrably requires it |
| External queue | Multiple durable workers/machines are actually needed |
| Tiered/larger memory | Distinctive-memory loss persists despite coalescing and relevance retention |
| Vector retrieval | Material untagged semantic failures survive simpler metadata improvements |

None is a default requirement for the initial 320-tick/350-decision profile.

## 26. Decisions requiring approval

Material decisions for a later implementation instruction:

1. Make 320 ticks the multi-day default, with 160/672 offline configurations.
2. Adopt labelled fictional availability and a calendar anchor.
3. Keep exhaustion paused/budget-limited, or explicitly authorise inference-capped deterministic continuation with a distinct status.
4. Approve the eventual one-run scenario, 360-total-completion and monetary/token/deadline ceilings.
5. Decide whether fully voluntary initial private-group formation is a separate requirement; current bootstrap cannot be labelled voluntary.

Existing provider restrictions, privacy, historical compatibility and serial inference should remain.

## 27. Evidence versus inference

**Confirmed source behaviour:** capacity-based pacing, the 144-tick ceiling, serial six/twelve slots, absence of availability schedules, EP32 without age expiry, sixteen lifetime issues, private bootstrap/gating, resource limits, owner/restart behaviour and the static event-limit nonprogress path.

**Historical measured evidence:** published Phase 4E.1 offline configurations, storage/performance samples and one accepted seventy-decision real public prefix with its reported costs, conversations, privacy and replay findings.

**Recommendations/estimates:** 320 ticks, grant-aware temporal release, availability assumptions, future storage/runtime/cost projections and infrastructure thresholds.

These findings do not establish calibrated persuasion, Singapore public opinion, economic outcomes or generally reliable spontaneous multi-day intelligence.

## 28. Read-only research compliance and document creation

During the research:

- No repository files were created, edited, renamed or deleted.
- No tests, benchmarks, fixtures, simulations, servers or browsers were run.
- No packages were installed and no Git state was modified.
- No credentials, `.env.local`, private accepted records or journals were accessed.
- No Tavily, OpenRouter, DeepSeek or other paid requests occurred.
- No secondary directory, deployment or Windows security setting was accessed or changed.

Public documentation, source code and safe reports were read; static arithmetic was performed. The repository remained clean at `ff46ab2`.

**This Markdown file was created afterwards under the user's separate instruction to save the research.** It is the only requested documentation addition. No application implementation, roadmap status change, test execution, paid activity or Git mutation accompanies its creation.

The next action is human review of the proposed implementation scope. Phase 4E.2 implementation and its eventual paid acceptance require separate authorisation.
