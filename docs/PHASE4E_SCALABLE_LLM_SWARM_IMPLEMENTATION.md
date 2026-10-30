# Phase 4E — scalable societal swarm and entity-first graph

Date: 31 October 2026. **PASS — offline implementation and desktop acceptance.** Scalable cohort, entity-first graph, privacy and compatibility gates pass. No Phase 4E paid inference was performed. All generated behaviour below is from deterministic provider fixtures, not an assessment of DeepSeek behaviour.

## Baseline and diagnosis

Started on `master`, HEAD `b42d5544a034489ca8d98b341586d4849539d1e5`, with a clean working tree. The network-blocked baseline passed 1,059 tests. Reviewed the roadmap and Phase 4D implementation, live acceptance, storage repair and Phase 4D.1/4D.2 memory reports. No separate Phase 4D research file was invented.

The existing engine supported 100 active profiles but only selected four role bindings for model control. Its context/replay loop assumed at most one pending opportunity per clock step. The bounded conversation menu, topic-aware memory and strict gateway were reusable. Full-context journal snapshots repeated the entire growing decision history: the generated historical 24/4/8 fixture consumed 17,029,097 journal bytes. Repeating that format for 128 decisions would threaten the existing 64 MiB journal ceiling. Graph projection/rendering also treated many residents as equally important; role entities and their participant identities could share indistinguishable labels. Desktop testing additionally exposed a hardcoded 100-batch client continuation loop: the 100/70 run stopped at tick58 after100 model decisions while the authoritative session correctly remained incomplete. This required a bounded client orchestration repair, not higher inference limits.

## Frozen cohort and execution policies

New communication sessions default to **50 active / 35 LLM-capable / 15 rule-driven**, 80 steps. `SOCIAL_SWARM_SIZE=100` selects 100/70/30. Trusted server configuration selects sizes; browser bodies cannot select a cohort, budget or executable world. `SOCIAL_ACTIVE_AGENTS=24` or dependency `swarm:false` retains the historical path. An existing accepted run's index is restored before constructing new defaults.

`SocietyInput.swarm` freezes:

- Cohort: `seeded-majority-v1`.
- Scheduler: `event-triggers-v3` for final new sessions.
- Routine rules: `routine-only-v1`.
- 35 or 70 distinct model-capable identities; maximum four opportunities per agent, four-tick cooldown, at most two sequential opportunities per tick, one concurrent request.
- Topic-aware `episodic-topic-v2` intelligence. Existing conversation-menu/attention policy versions remain explicit.

Roles retain canonical stakeholder bindings. The remaining cohort members are a seeded, deterministic selection of existing synthetic residents. Capability creates neither a new demographic identity nor an empirical opinion. All active agents keep their existing goals/state; unmatched stakeholder roles keep the existing aggregate-only demographic policy. Sparse, explicitly assumed social connections replace a potential complete 35/70-person follow graph. Selection does not copy one agent's memories into another.

Old inputs without `swarm` preserve their original scheduler, rule engine, menus, memory and journal format. Intermediate accepted offline worlds using `event-triggers-v1` or `v2` retain those branches exactly; they are not upgraded. V2 added accessible private-discussion priority after the first desktop audit showed public-feed concentration. V3 added paced admission after that audit also showed the global budget could be exhausted early.

## Event-triggered reasoning and budgets

The scheduler considers actual accessible content, ancestors, incoming replies, questions, existing conversations, explicit unresolved issues and group discussions. Source-event IDs, tick and fixed trigger categories enter the internal context. Normal reducers record any required read before a target is offered. A source cannot repeatedly trigger the same agent after an earlier opportunity handled it. Missing/inaccessible group history cannot activate a private reply.

Ranking first favours agents with fewer prior opportunities, then conversation priority, channel history and deterministic ID/seed order. Periodic initiation is allowed at eight-tick windows, at most once per agent, when no content candidate exists. A trigger offers reasoning; the model still chooses a permitted action, including inactivity. It is not instructed to produce a prescribed conversation chain.

V3 admits up to `ceil((tick + 4) * maxCalls / steps)` opportunities, capped globally. Four ticks of burst credit allow early actual events while retaining later reasoning capacity. Same-tick decisions do not advance the clock twice. Rejections, skips and uncertain dispatches consume opportunities; they are not retried automatically.

Client continuation now permits remaining clock steps plus remaining reasoning opportunities, capped at272 batches (144maximum steps +128maximum opportunities); the legacy cap remains100. A response must advance the accepted revision without changing session/run identity. Exhausting the client allowance honestly publishes the last accepted checkpoint as partial and stops. Passive GET inspection, navigation ownership and explicit resume remain unchanged. A130-response fixture reproduces the boundary that the previous100-batch loop could not complete. No server/model budget was raised for this repair.

| New configuration | Social calls | Reserved token ceiling | Reported + unknown-reserve USD ceiling | Per-agent cap | Concurrent calls |
|---|---:|---:|---:|---:|---:|
| 50/35 | 64 | 2,400,000 | 1.50 | 4 | 1 |
| 100/70 | 128 | 4,800,000 | 3.00 | 4 | 1 |

These are application admission limits, not authorisation to spend or provider-enforced prepaid caps. Existing 600-output-token, 30-second timeout, 24,000-byte context, conservative reservation and cancellation rules remain. Known token usage releases reservations under the existing accounting contract; unknown costs retain USD 0.02 per dispatched decision. Two planning calls and eight initial stakeholder completions remain separate from social calls. Concurrency one is per session in the existing single-process local app; independent sessions share the existing global two-slot gate. Cross-process distributed locking is not implemented.

No new inference transport or provider was introduced. The existing OpenRouter `deepseek/deepseek-v4-flash-0731`, DigitalOcean-only, no-fallback, required-parameter, reasoning-disabled and verified-identity gateway is unchanged. Model inference still requires the existing explicit server opt-in. Rule-only continuation performs no provider dispatch.

## Independent memory and discretionary behaviour

Every capable identity can receive an independently assembled context and indexes only legitimate personal encounters. Bounds remain ST12, EP32, at most six memory references, eight ancestry-complete items and 24 KB. Private group access is checked by the existing membership/exposure/history policy at both exposure and context construction. Conservative post-leave retrieval is unchanged. The new 35/70-member cohorts exercise indexing beyond the original four role bindings.

Runtime deterministic support now performs bounded activity, reading, exposure-backed consideration, simple reactions and inactivity. It authors **no new discretionary dialogue** in Phase 4E. The fixture's two declared tick-zero private-group initialization messages remain rule-generated and separately counted. Initial accepted stakeholder statements also retain their own provenance. An LLM-capable actor's routine read or state effect remains a rule event.

No unchanged actor/item pair receives repeated opinion influence. Synthetic attention/influence assumptions are not calibrated psychological or Singapore public-opinion models. The eight accepted stakeholder seeds plus actual model decisions supply authored discussions; model opt-out consequently produces much sparser authored activity.

## Persistence and resource safety

New swarm sessions use hash-chained **format-2 delta journals**: genesis once, newly accepted decision records once, durable pending/reservation data before dispatch, revision/tick and record count. A small atomic checkpoint points to the authoritative journal. The existing checkpoint replacement helper retries filesystem replacement only; it does not retry inference. If a pointer replacement remains unavailable, recovery reads the fsynced journal and records a fixed safe diagnostic.

The 2 MiB journal-row, 64 MiB journal, 8 MB saved-world, 8,192-event, 2,048-item and 100-profile bounds remain. New hybrid validation explicitly permits at most 128 social records/70 capable agents; legacy bounds remain. Recovery turns a durable interrupted reservation into `SOCIAL_UNCERTAIN`, retains its conservative charge and never redispatches it. In-process session/revision locking rejects concurrent duplicate steps. Checkpoint pointers contain no conversation content.

Default private `accepted-private` and `social-sessions` locations passed normal-user storage admission in desktop lifecycle tests. No ACL/security-policy changes, archive migration or trusted-root redirection was performed. Existing raw records remained server-side and untouched.

## Entity-first graph, inspectors and Report

The server keeps complete safe agent candidates while marking primary nodes using deterministic presentation metadata. Institutions, scenario entities, platforms, groups and original stakeholder roles remain prominent. Up to 12 significant non-role people join role participants in the primary view. Recorded authored activity, follow-ups, information pathways, state changes and relationships can contribute to significance; capability alone contributes zero. A significant rule-driven person is eligible.

Hidden residents remain searchable and can be revealed through connected-neighbour exploration without regenerating the simulation or resetting positions. Search expansion is bounded. Original scenario role nodes retain their IDs/provenance; participant graph labels append `(participant)` to distinguish the bound person without changing identity. Full safe graph data stays available for discovery; the ordinary view does not show all people equally.

One explicitly fictional **background participant aggregate** represents the exact complement of non-role people omitted from the primary view. Its member/activity counts reconcile with those IDs. It does not assert employment, geographical segmentation, an actual organisation or hidden group membership. Existing scenario entities supply substantive stakeholder groups; no unsupported demographic cohorts are invented.

Source-linked, unverified candidate, synthetic person, aggregate and fictional communication relationships retain their classifications. No message/event nodes are added. Aggregated membership/participation and interaction edges use recorded IDs; reads are not expanded into one edge per exposure. Institutions/groups/aggregates/persons have distinct shapes, readable priority labels and bounded size variation. Existing graph physics, mouse dragging, connected-neighbour motion, settling, filter/search state and navigation position retention remain.

The shared public summary adds distinct capable/offered/accepted agent counts, per-agent opportunity counts, unique model decisions, model/rule authored items, reads/reactions and state updates. The browser parser allowlists the new fields and retains historical limits when no swarm schema is present. Graph inspectors and Report use the same decision-grain aggregate fact packs, topic coverage, chronology, explicit issues and actual transfers. They do not expose raw conversation or memory, or infer semantic conclusions from counts.

## Fixed offline service benchmark

`phase4e-benchmark.ts` uses actual `handleSocialRequest`, structured social gateway generation/validation, reducers, journal, reopen, snapshots and public projections. Injected fetch responses are fixtures; native external dispatch is blocked. Fixed fixture choices deliberately prefer offered peer replies. Conversation depth measures capability, not spontaneous intelligence. The historical arm explicitly disables swarm and does not change archived records.

| Metric | Historical 24/4/8 | Primary 50/35/64 | Larger 100/70/128 |
|---|---:|---:|---:|
| Offered / accepted distinct agents | 4 / 4 | 35 / 35 | 70 / 70 |
| Accepted / failed model decisions | 8 / 0 | 64 / 0 | 128 / 0 |
| Opportunities after tick 40 / final tick | 4 / 72 | 28 / 75 | 57 / 76 |
| Minimum–maximum opportunities per capable agent | 2–2 | 1–2 | 1–2 |
| Events / rule events | 526 / 510 | 620 / 548 | 748 / 612 |
| Runtime rule-authored items | 87 | 0 | 0 |
| Private model decisions / authored items | 2 / 2 | 8 / 8 | 13 / 13 |
| Offered peer replies / eligible candidates | 4 / 4 | 207 / 249 | 513 / 680 |
| Selected peer replies / maximum model chain depth | 3 / 4 | 57 / 9 | 120 / 9 |
| Repeated reads / repeated unchanged influence | 5 / 0 | 3 / 0 | 1 / 0 |
| Episodic indexed entries / episodic-only selections | 35 / 0 | 219 / 0 | 414 / 0 |
| Maximum internal context bytes | 14,129 | 14,285 | 14,286 |
| Service + journal elapsed seconds | 1.24 | 1.77 | 4.73 |
| Pure scheduling / execution seconds | .405 / .017 | .389 / .136 | 1.643 / .379 |
| Durable reopen seconds | .49 | .65 | 2.11 |
| Snapshot / journal bytes | 707,225 / 17,029,097 | 1,570,250 / 2,385,808 | 2,974,706 / 4,773,091 |
| Pointer checkpoint bytes | Legacy format | 194 | 196 |
| Public society / graph bytes | 69,241 / 152,877 | 141,863 / 348,114 | 257,668 / 676,922 |
| Full safe graph nodes / edges | 30 / 187 | 57 / 442 | 107 / 882 |

Single local timing observations include Node/GC/filesystem costs; they are not provider latency or scaling guarantees. The new arms preserve all 80 clock advances, max two opportunities/tick, concurrency one and exact replay. They do not change the deterministic active-per-step budget to one action for every resident on every tick. Minimum same-agent gaps were 10/4 ticks. Current-loop heap samples peaked around 95/162/118 MiB; later measured heap after projections/replay was 136/115/175 MiB. These are sampled heap observations, not whole-process peak RSS or retained-memory bounds.

Fixture platform decision distributions were Reddit/Instagram/WhatsApp/Telegram =2/4/1/1,45/11/0/8 and115/0/2/11. No channel quota forces every platform to receive model dialogue. Both larger arms exercised private model activity; creation/membership/history restrictions still applied. Fixture near-duplicate authored counts were3/25/55, showing that repeated mock response templates remain a limitation even though rule-authored duplicates are zero. No claim of improved semantic dialogue follows from those counts. Episodic-only recall was not naturally selected in this benchmark; dedicated Phase4D.2 eviction/topic tests remain the evidence for long-term retrieval.

## Tests, privacy and historical compatibility

Focused tests cover cohort identity, memory isolation, late capacity, per-agent/cost/token exhaustion, private opportunities, independent contexts, three distinct model agents in an exposed A→B→C chain, inactive actions, invalid target rejection, concurrent duplicate dispatch, durable interruption, hash tampering, truncated lines, graph significance/search/aggregation, public parser allowlists and Report reconciliation. Actual gateway fixture requests preserve model/provider/schema checks. Rule-only and disabled admission perform zero dispatches. Invalid responses consume their opportunities without retry.

Four qualifying historical Phase4C/4D worlds replayed with exact state and safe summaries. Phase4D.1 and4D.2 real evaluation pairs retained exact contexts/decisions/worlds without inference. All61 production files snapshotted before this task kept their hashes; new accepted offline worlds are additive. All eight newly accepted offline worlds also replayed unchanged, including intermediate scheduler policies, the preserved100-decision client-bound partials and the final128-decision world. No historical journal/identity/context was migrated or regenerated.

Privacy sentinels and forbidden raw shapes were checked across service/API, browser parser, graph/Report/aggregate facts, SSR/hydration, inspector DOM, browser storage, errors and restoration. Internal raw decisions/context remain necessary for authorised replay and are never a public projection. API query/body injection cannot enable transcripts or select a different cohort. Diagnostics contain only bounded IDs, codes and counts.

Final commands after the client continuation repair: **1,102/1,102 network-blocked Node tests**, application TypeScript, strict `scripts/testing/tsconfig.phase4d.json`, production build and `git diff --check` passed. Eight continuation regressions cover the previously untested browser loop boundary, cancellation, stalled/backward state, bounded partial completion, identity and raw-field rejection. The journal tamper test was corrected after a policy-name change made its old replacement a no-op; it now asserts the file is actually changed before validating hash rejection. No standalone GIS/numerical CLI pass is claimed; numerical contracts were unchanged.

## Desktop acceptance and evidence

Final **50/35 and100/70** desktop acceptance passed1440×900 and1920×1080 through actual Map→Explore→background completion→Graph→Report and saved restoration. Each used one Explore, two planning/eight initial mock completions, then64/128 accepted social decisions covering all35/70 capable agents. The100-agent client continued through129 requests after the hardcoded100-batch defect was repaired; the50-agent client used65. No rejected/failed decisions were replaced.

| Desktop result | 50/35 | 100/70 |
|---|---:|---:|
| Full safe graph nodes / edges | 64 / 461 | 114 / 899 |
| Initially visible nodes / edges | 30 / 123 | 30 / 106 |
| Searchable hidden people / aggregate members | 34 / 34 | 84 / 84 |
| API response bodies checked | 67 | 131 |
| Inspector checks / Report viewport checks | 10 / 2 | 10 / 2 |
| Browser/console errors / raw sentinel or private-shape leaks | 0 / 0 | 0 / 0 |
| Mocked Explore-to-completion seconds | 36.4 | 60.0 |
| Warm Graph click-to-canvas ms (1440 / 1920) | 483 / 377 | 599 / 372 |

Browser graphs include additional accepted ontology entities, unlike the benchmark's empty base graph. Checks covered institutions, platforms, the private group with the most recorded authored activity, agents, the background aggregate, relationship selection, search/type filters, hidden-neighbour discovery, dragging, connected-neighbour motion, settling and retained positions. Both drags moved two connected neighbours and settled. Graph and Report cohort/activity counts matched. Navigation and saved restoration added zero dispatches, verified against both public request observations and the independent guarded-server ledgers.

Times include HTTP, storage, rendering and client pacing, not provider latency. Observed settled frame samples completed without timeout but occasional gaps reached174ms/167ms; this is not a sustained60fps guarantee. The100-agent run remains a practical local prototype, not a claim of unbounded rendering or concurrent-network scalability.

The driver inspects actual response JSON and browser state, not CSS visibility. A fetch-clone capture supplements a missing first-response CDP body; HTTP/schema/sentinel checks still apply. An inspector count test's ancestor-scoped locator was independently reproduced as matching zero rows and corrected to relative scope; no UI data was changed to satisfy it.

Evidence stays in ignored `tmp/phase4e/` and `tmp/phase4e/desktop/`: benchmark JSON/logs, final test/type/build logs, immutable hash comparison, replay results, safe mock dispatch ledgers, storage admission, screenshots and desktop JSON. No raw dialogue is included in this report. Screenshot examples:

- `tmp/phase4e/desktop/cohort-50-graph-1440.png`
- `tmp/phase4e/desktop/cohort-50-platform-1920.png`
- `tmp/phase4e/desktop/cohort-50-group-1440.png`
- `tmp/phase4e/desktop/cohort-50-restored-report-1920.png`
- `tmp/phase4e/desktop/cohort-100-graph-1440.png`
- `tmp/phase4e/desktop/cohort-100-group-1920.png`
- `tmp/phase4e/desktop/cohort-100-restored-report-1920.png`

![100-agent entity-first graph at1440×900](../tmp/phase4e/desktop/cohort-100-graph-1440.png)

![Summary-only private-group inspector](../tmp/phase4e/desktop/cohort-100-group-1920.png)

All controlled final browser contexts route external traffic before navigation. Exact OSM tile requests receive a local PNG fixture; map canvas/local geometry were checked, not live basemap availability. An initial exploratory browser page attempted ordinary free OSM tiles before this guard was installed; no paid provider dispatch occurred. Final contexts dispatched zero external requests. No mobile work was performed.

## Reproduction and next live gate

Run from the repository in PowerShell, with no live server/provider test preload:

```powershell
$phase4eGuard = ([Uri](Resolve-Path scripts/testing/offline-network.mjs).Path).AbsoluteUri
$env:NODE_OPTIONS = "--import=$phase4eGuard"
npm.cmd test
npx.cmd --no-install tsc --noEmit
npx.cmd --no-install tsc -p scripts/testing/tsconfig.phase4d.json --noEmit
node scripts/testing/phase4e-benchmark.ts
npm.cmd run build
git diff --check
Remove-Item Env:NODE_OPTIONS
```

The benchmark creates only uniquely scoped ignored fixtures. `node scripts/testing/phase4e-historical.ts` additionally requires this machine's existing historical evidence paths and snapshot manifest; it reads archives without modifying them. Desktop: run `scripts/testing/phase4e-mock-server.ps1 -Agents50` or `-Agents100`, then the Playwright driver `scripts/testing/phase4e-desktop.mjs`. It asserts the guarded server's configuration, uses dummy keys and rejects external network requests. Stop the verified task server before switching sizes. Do not run this fixture against a real-provider server. These helpers do not edit `.env.local`.

Future paid acceptance requires separate authorisation. Recommend one initial50/35,80-tick attempt, at most64social +2planning +8stakeholder =**74 OpenRouter completions**, one Tavily search and at most two reported retrieval credits. A proposed **USD2.00 task admission ceiling** must include reported charges plus all outstanding conservative reservations; refuse dispatch whenever those reservations do not fit. Keep concurrency one per run, no retries, storage preflight, durable task ledger and strict provider identity/privacy gates. The existing social admission reserves up toUSD1.28 for64 unknown-charge calls within itsUSD1.50 cap; planning/stakeholder reservations need task headroom. These are proposed controls and reservations, not a current-price estimate or provider-enforced billing cap. Tavily dollar cost must remain unknown unless reported. Stop on identity/storage/privacy/replay failure, exhausted budgets or completion. Do not begin100-agent live testing first.

Measure actual distinct offered/accepted agents, voluntary multi-agent follow-ups, later-time participation, memory use, private access, summary fidelity and exact replay. Fixture choices cannot establish these live behavioural qualities. No vector database, embeddings, summariser, evaluator, new model or framework is warranted for this offline extension.

## Changed-file inventory

New: `lib/society/{swarm,swarm-scheduler,swarm-routine}.ts`; `lib/server/society/{swarm-journal,entity-graph}.ts`; `lib/knowledge-graph/societal-presentation.ts`; `lib/question-simulation/continuation.ts`; `lib/contracts/tests/phase4e-{continuation,core,desktop-graph,desktop-ui,graph,journal,service,summary}.test.ts`; `scripts/testing/phase4e-{benchmark,fixture,historical}.ts`; `scripts/testing/phase4e-{desktop,provider-preload,mock-server}.mjs`; `scripts/testing/phase4e-mock-server.ps1`; this report; `docs/superpowers/plans/2026-10-31-phase4e-swarm.md`.

Modified: `lib/society/{contract,decision-contract,engine,episodic,hybrid,public-contract}.ts`; `lib/server/society/{service,public-service,summary}.ts`; `lib/question-simulation/public-session.ts`; `lib/knowledge-graph/renderer.ts`; `components/{communication-report,knowledge-workspace}.tsx`; `components/{knowledge-workspace.css,use-society.ts}`; `lib/contracts/tests/{public-social,social-service,storage-reliability}.test.ts` (explicit legacy fixture selection); `scripts/testing/tsconfig.phase4d.json`; development roadmap.

No new dependencies, credential changes, paid calls, deployments, secondary-directory access or Git staging/commit/push operations. Source changes remain unstaged and uncommitted. Task-owned mock servers were stopped after checking PID/root/command identity; port3200 had no listener. All driver contexts closed in `finally`, and the remaining task browser page was closed.
