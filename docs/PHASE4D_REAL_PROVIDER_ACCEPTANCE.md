# Phase 4D Real-Provider Acceptance

**Technical verdict: PASS. Behavioural assessment: PARTIAL overall.** Both independent scenarios completed on their first new attempt. Paid activity stopped after those two successes; no third attempt or replacement completion occurred.

Date: 30 October 2026, Asia/Singapore (UTC+8). First provider request 23:30:25; final provider return 23:35:25. Subsequent work was read-only/offline verification and documentation.

## 1. Baseline and storage preflight

Branch `master`, HEAD `d1710eb9d79a3f85ade27a6cfad730b06e51fbdb`. The preceding storage reliability repair was already uncommitted; it was preserved. Phase 4D's historical 1,001-test baseline and two Phase 4C real successes were reviewed, not assumed to be new results.

The task-owned production server ran under the normal Windows user with **original default stores**, no SOCIAL_STORAGE_ROOT override. A network-blocked fixture lifecycle verified archive creation, durable journal/index/checkpoint writes, process restart, exact replay and history restoration before paid dispatch. Both store admission probes then passed inside the actual server execution context. Credential presence was checked as booleans only. The restricted Codex account's default-path EPERM remains a known execution-context limitation; no ACL/security setting was changed.

All 55 previously enumerated top-level historical record hashes remain unchanged. The two new live accepted archives and journals are retained under the same authoritative defaults; no raw-record migration or split production root was introduced. Existing legacy storage was untouched.

## 2. Real-provider controls

OpenRouter; exact model `deepseek/deepseek-v4-flash-0731`; DigitalOcean only; `allow_fallbacks:false`, `require_parameters:true`; reasoning disabled/excluded; structured schema and serving identity validation retained. All 36 returned completions report the requested model/DigitalOcean, normal termination and zero reasoning tokens.

Real server preflight recorded no fixtures/preloads, existing credential presence, writable original stores, 24 active agents, four selected model agents, eight social opportunities and 80 steps. App build ID for both runs: `yHc0tNitX9yfI5ruYu0PP`. Existing generation, context, output, timeout and per-run cost bounds were preserved: task admission additionally bounds request bytes and 6,000/800/600 maximum output tokens for planning/initial/social calls. No paid summary/evaluator or provider connectivity test occurred.

The real pass-through guard persists/fsyncs each reservation **before dispatch**, denies repeated request identities, bounds each stage to 2/8/8, and forbids re-running passed scenarios. It uses a fresh durable ledger in ignored `tmp/phase4d-live/ledger.jsonl`; no prompts, bodies, dialogue, keys or headers are saved there. Unknown costs retain USD 0.0135 per completion; an entire next run must fit USD 0.243 plus one search/two reserved credits before arming. Current DigitalOcean rates support that conservative bound: [OpenRouter endpoint metadata](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-flash-0731/endpoints), checked 30 October 2026, lists USD 0.119/million input and USD 0.238/million output tokens. This is local admission, not an externally enforced prepaid cap.

Focused preflight: 38 guard/scheduler/menu/memory/attention/summary/privacy/storage tests passed. No mocked output entered either live run. Historical mock runs are not counted as real-provider evidence.

## 3. Exact scenarios and attempts

**Attempt 1 / Scenario A**

> What if Singapore introduces a nationwide four-day workweek instead of the traditional five-day workweek? How would this affect employees, businesses, productivity, wages, and the wider Singapore economy?

**Attempt 2 / Scenario B**

> What if Singapore introduces a new government-supported eldercare centre in Sengkang? How might nearby residents, caregivers, community organisations and service providers respond over time?

Both used the ordinary **Map -> Explore** workflow in independent browser contexts and authoritative sessions. Both accepted local scope with a single Singapore jurisdiction; Sengkang is scenario location context, not a separate sovereign jurisdiction. Canonical registration, dynamic ontology/relationships and four roles passed both planning stages. Workweek accepted 14 world relationships; eldercare 12.

| Attempt | Initial actions | Social decisions | Events | Rule events | Graph nodes/edges | Environments/groups | Technical |
|---|---:|---:|---:|---:|---:|---:|---|
| 1 | 8/8 | 8/8 | 536 | 515 | 37/168 | 2/1 | PASS |
| 2 | 8/8 | 8/8 | 536 | 515 | 34/234 | 4/1 | PASS |

Run and plan identities:

- Attempt 1: `run-9e7372e072b8483a89829bc9-attempt-4-61620fae-ca84-4b70-830f-5d2918f895b8`; plan `dynamic-plan-45af2ce80667e1da4174f27e803f968457cdfdb8084c1a72342e41bba04945bc`.
- Attempt 2: `run-c9d9221ec1a81c7bfa644769-attempt-4-308f4a1b-7f17-4a17-bced-0da269d84c6b`; plan `dynamic-plan-31aeb4b09663a3d4470d31b0bf7e307370804631baff96280b424c0340f9263e`.

The workweek roles were fictional nurse, SME repair owner, childcare director and delivery rider. Eldercare roles were nearby resident, caregiver, community volunteer coordinator and service-provider manager. Initial execution completed two rounds/eight genuine actions each, without substitute statements. Shared population sample IDs do not reuse model outputs or memories: run/session/plan identities and accepted records are independent.

### Retrieval and planning

| Attempt | Tavily HTTP | Retrieval duration | Usable candidates | Entity / relationship planning |
|---|---:|---:|---:|---:|
| 1 | 200 | 5.457 s | 3 | 32.429 / 5.642 s |
| 2 | 200 | 9.109 s | 2 | 15.252 / 2.634 s |

Workweek sources: [Singapore work-culture article](https://pmc.ncbi.nlm.nih.gov/articles/PMC11774796), [r/singapore discussion](https://www.reddit.com/r/singapore/comments/1foskte/is_a_4day_work_week_feasible_here_nearly_7_in_10), and [WEF four-day-week article](https://www.weforum.org/stories/jobs-and-the-future-of-work/surprising-benefits-four-day-week). These are relevant candidate context, with different evidential strength; a Reddit discussion is not a survey or independent verification.

Eldercare sources: [2019 caregiver-support commentary](https://ifonlysingaporeans.blogspot.com/2019/02/caregiver-support-action-plan-raft-of.html) and [Facebook caregiving-grant post](https://www.facebook.com/theonlinecitizen/posts/the-home-caregiving-grant-hcg-will-remain-targeted-at-individuals-who-require-pe/1499672318862451). They relate to Singapore caregiving but are weak, indirect and not evidence about a new Sengkang centre. Grounding specificity is **PARTIAL**, and no benefit estimate is justified. No extra search was made to improve the results.

Tavily supplied passages internally and the planners received them. **Neither run generated a source-supported entity/relationship association for display.** Displayed source passages and source-reported graph relationships both count zero. Eldercare had three unverified attribution candidates, whose proposed citations were correctly withheld; all others remained unverified/no-support. Retrieved URLs remain in the inventory. Nothing was promoted to independently verified fact.

Provider request windows (first search dispatch through final social return): **100.291 s** workweek and **75.207 s** eldercare. These include real inference/network/continuation delays; they are not pure simulation CPU benchmarks. Both entity stages and relationship stages accepted normal structured output. No validation failure or paid retry occurred.

## 4. Distributed scheduling and actual conversations

Both immutable sessions use `conversation-windows-v1`, `conversation-menu-v2`, `episodic-v1` and `attention-v1`. Actual model opportunities were exactly **2, 12, 22, 32, 42, 52, 62, 72**. Each selected agent received two opportunities; four opportunities occurred after tick 40. All eight were accepted, with no skipped, rejected or interrupted social slot. The historical Phase 4C schedule exhausted calls by tick 16.

| Observation | Workweek | Eldercare |
|---|---:|---:|
| Contexts containing another social-model author's item | 5 | 1 |
| Eligible peer reply options / offered | 7 / 7 | 1 / 1 |
| Eligible peer replies omitted from menu | 0 | 0 |
| Other items omitted by bounded context | 22 | 4 |
| Voluntary selected model-to-model replies | 2 | 1 |
| Maximum full thread depth | 5 | 4 |
| Consecutive model-authored chain depth | 3 | 2 |
| Reciprocal A -> B -> A chain | Yes | Not observed |

Workweek private-group chain: childcare role at tick **22**, nurse role at **42**, childcare role again at **62**. Event suffixes `e146 -> e280 -> e410` belong to the attempt-1 run's `society-<runId>:` namespace. Replies targeted actual earlier model contributions; exposures, ancestry and permissions replayed correctly. The latter two decisions voluntarily chose peer-reply menu entries. No fixture, forced reply or relabelled rule event created this chain.

Eldercare selected a direct private peer reply at tick **72**, responding to the earlier model contribution at tick **42**. No reciprocal third turn occurred; no extra call was made to obtain one.

Both sets of eight decisions contain **seven authored contributions plus one reaction** (workweek upvote; eldercare like). Each also produced five recorded stance effects: **13 social-model events are not 13 independent model decisions**. Total event composition for each coincidentally was 8 initial seeds + 13 social effects/actions + 515 rules = 536. Volume was not used as intelligence evidence.

## 5. Memory and semantic findings

Protected audits reconstructed every decision's actual pending state. Context items and recalled experiences were authorised and belonged to the actor's real recorded history; private history/chronology checks passed. Maximum indexed episodic entries was **9 per agent**, below the 32-entry bound. Persistent goals remained available and agent identities were consistent.

All 16 decisions have memory bindings, but most are required target-exposure references. Only the workweek tick-52 decision voluntarily selected **two additional memory references** beyond its mandatory exposure. Eldercare selected none beyond mandatory exposure. Automatic references do not prove comprehension or memory causality.

**Long-term episodic-only retrieval: NOT OBSERVED in either run.** No context used an episodic-only retrieved entry after short-term eviction. These runs did not create natural eviction pressure; the offline eviction/access/replay fixture remains the capability evidence. No explicit issue/commitment/update was generated; open/resolved/withdrawn counts are zero, so live issue-resolution behaviour is also NOT OBSERVED.

Safe semantic diagnostics compare fixed broad concepts, not copied message text. Workweek replies commonly concerned staffing/rosters, with income and implementation appearing later; the reciprocal group chain stayed within the staffing discussion. Eldercare responses covered caregiver support, access, community coordination and quality. The fixed concept dictionary found target/response theme overlap in 5/7 workweek authored decisions and 3/7 eldercare authored decisions; these are coarse indicators, not semantic grades. Several plausible concerns are outside that dictionary.

There was no explicit cross-platform memory selection by a model in either run. Recorded transfers exist (below), but they do not establish model-level cross-platform understanding. No private dialogue or complete generated response is reproduced here.

### Behavioural assessment

| Dimension | Workweek | Eldercare | Evidence and limit |
|---|---|---|---|
| Real peer opportunity coverage | PASS | PASS | Every eligible bounded-context peer reply was offered; not every world item entered context. |
| Voluntary direct model replies | PASS | PASS | Two and one accepted direct peer replies. |
| Reciprocal model conversation | PASS | NOT OBSERVED | Genuine 22 -> 42 -> 62 chain only in workweek. |
| Semantic reply relevance | PARTIAL | PARTIAL | Broad topics and parent continuity observed; no blinded semantic assessment or empirical realism claim. |
| Persistent memory/context access | PASS | PASS | Actual authorised histories supplied and replayed. |
| Meaningful memory use | PARTIAL | PARTIAL | Required bindings dominate; two optional recalls in one workweek decision, no demonstrated causal memory effect. |
| Long-term episodic recall | NOT OBSERVED | NOT OBSERVED | Zero episodic-only retrievals; offline eviction test remains evidence. |
| Explicit issues/commitments | NOT OBSERVED | NOT OBSERVED | All new issue proposals were null; no resolution claimed. |
| Distinct roles/priorities | PARTIAL | PARTIAL | Scenario-specific goals/actions differ, but only two model turns per selected role and many shared themes. |
| Repetitive rule/influence controls | PASS | PASS | Zero measured near-duplicate rule actions and repeated unchanged-item influence. |
| Cross-environment event propagation | PASS | PASS | Two / seven valid recorded transfers. |
| Model semantic cross-platform recall | NOT OBSERVED | NOT OBSERVED | No explicitly selected cross-platform memories. |
| Summary factual reconciliation | PASS | PASS | Counts, classifications, chronology and source-event references reconcile. |
| Rich discussion interpretation | PARTIAL | PARTIAL | Deterministic summaries explain mechanics/categories; nuanced argument development remains limited. |

This demonstrates bounded ongoing model-directed interaction for four agents, alongside a deterministic majority. It does not establish a fully autonomous population, realistic human persuasion, Singapore public opinion or universal reliability.

## 6. Attention and influence

| Metric | Workweek | Eldercare |
|---|---:|---:|
| Authored post/message/comment/reply items (excluding shares) | 72 | 119 |
| Near-duplicate authored actions / rule-only subset | 0 / 0 | 0 / 0 |
| Repeated reads | 2 | 5 |
| Repeated influence from unchanged actor/item | 0 | 0 |
| Explicit inactivity events | 117 | 35 |
| Actual nonzero position changes, all sources | 81 | 68 |
| Rule events per active agent, mean | 21.46 | 21.46 |

Position changes have genuine source-event/exposure references, and not every comment changes position. These are synthetic rules and scores. Current live runs have different scenarios/roles/seeds from the matched offline comparison (legacy duplicate/influence counts 43/23 versus 0/0); they are not a controlled causal experiment proving population realism or a statistical improvement rate.

## 7. Communication environments and private access

Workweek dynamically selected `r/singapore subreddit` (public discussion) and `National Delivery Champions Association WhatsApp group` (private capability). The latter is a model-proposed group-labelled parent environment, not a verified real WhatsApp channel. Its nurse-named fictional coordination group had eight membership records, **7 messages, 9 replies and 15 private reads**.

Eldercare selected proposed-centre and residents' committee public discussion environments, a neighbourhood public feed, and `Caregivers WhatsApp Group`. Its fictional resident-named coordination group had eight membership records, **5 messages, 4 replies and 11 private reads**. A facility/committee being used as a simplified discussion environment does not make it a native social platform; entity/capability naming remains a quality limitation. No named platform was forced and Instagram/Telegram were not required.

Both groups were created through recorded deterministic initialisation (`group-create` at tick 0), not a voluntary model creation decision. The model cohort actually used private replies; it did not choose invitations, joining, leaving or creating a second group. Those live management actions remain unobserved.

Every observed private read passed membership/history checks. Non-mutating forks rejected non-member reads, forbidden pre-join history and unexposed forwarding. Forks were not written back to accepted worlds. Workweek recorded **two private-group -> public-discussion transfers**; eldercare recorded **seven public-environment transfers**. No hidden message was globally injected into model context.

## 8. Fact-pack, Graph and Report reconciliation

Unique authored social decisions classified: **7 per run**, rather than 13 resulting model events. Workweek tags: one concern/six support; eldercare four concerns/three support. No question/disagreement/condition or issue-resolution tag was invented. Whole-world authored totals including shares: **74 / 126**; unclassified coverage: **67 / 119**. Repeated contributions were not treated as votes from distinct people.

The fact-pack's claim IDs all resolve to actual source events. Three-period chronology totals reconcile; transfers reconcile with Report links; issue counts stay zero; nonzero state updates match events. Platform, group and agent inspectors consume the same projections as Report. Public categories in workweek collapse largely to generic `stakeholder` plus fictional residents, limiting role-specific interpretation; eldercare categories are more differentiated. Topic labels can be long/truncated. These presentation limits do not justify inventing consensus, outcomes or persuasive arguments.

Primary graphs contain meaningful world candidates, fictional agents, communication environments and a fictional group, with valid canonical endpoints and no ordinary message/event/bookkeeping nodes. Reports show the exact question, plan/run, eight initial actions, eight social decisions, aggregate population context, usage, source limitations and correct complete status. No unsupported economic, health or public-opinion forecast was generated by the report projection.

## 9. Privacy, replay and desktop checks

All **89 workweek / 141 eldercare** internal authored/seed/decision strings were compared against public strings; none was excluded for short length (minimum lengths 105/117). No exact raw conversation leaked. Browser-safe summary JSON from both restored browser stores has the same canonical hash as the protected server projection audited for literal leaks. Hashes are recorded in `browser-projection-proof.json`.

Thirty-six observed Explore/continuation/restoration responses contained no transcript-shaped fields or fixture markers. HTML and browser storage checks passed. No raw-mode endpoint or ordinary transcript export was introduced. Existing SSR/downloadable-summary sentinel regressions also passed; an ordinary Report transcript export is not exposed. Counts and aggregate labels are disclosed; private member lists, conversations and memory wording stay server-side. This is an observed boundary audit, not a universal proof about future endpoints.

Both worlds replay exactly from saved input/accepted decisions without inference. Desktop 1440x900 and 1920x1080 passed Map-first navigation, Graph search/type filters, platform/group/agent/relationship inspectors, Report, dragging and settling, position retention and saved-run restoration. Connected neighbours moved (three workweek, two eldercare); no page/console errors or horizontal overflow were observed.

Returning to Map after selecting an archive intentionally returns to the current draft and deselects history. An empty draft consequently has no graph until its saved exploration is selected again. Reselection restored both archived graphs without inference; this existing navigation behaviour is documented rather than changed. An initial inspection helper wrongly assumed archival selection survived Map navigation. Another helper hash used locale-aware key ordering; recomputation with application canonical ordering matched both hashes. These were test-harness corrections, not provider/application repairs, and caused no new Explore.

The durable paid ledger's hash was unchanged across navigation/restoration/filter/relationship checks. No extra inference occurred. Both live archives remain saved; the task-owned real server and isolated browser contexts were stopped after inspection. No mobile work was performed.

## 10. Actual paid ledger

| Attempt | Tavily searches / credits | Planning | Initial | Social | OR input tokens | OR output tokens | OR reported USD | Unknown USD reserve |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1 / 1 | 2 | 8 | 8 | 65,374 | 5,385 | 0.0084274848 | 0 |
| 2 | 1 / 1 | 2 | 8 | 8 | 65,390 | 5,184 | 0.0086983764 | 0 |
| Total | 2 / 2 | 4 | 16 | 16 | 130,764 | 10,569 | 0.0171258612 | 0 |

Every provider request returned. All reported model/provider identities are DigitalOcean and the exact required model; ledger blocked-request count is zero. Temporary pending reservations were visible while requests ran; final billing is now reported for all 36 completions. **Tavily USD charges are unknown**, not zero. No purchase fees or external prepaid enforcement is inferred from usage records.

Remaining authorised ceilings at stop: **4 attempts, 4 Tavily requests, 10 credits, 74 OpenRouter completions and USD 0.7328741388**. No budget remains reserved for unknown calls. This remaining allowance was not used: both scenarios had passed. Automatic retries, replacement completions, paid summaries/evaluators and other paid providers: **zero**.

## 11. Repairs, automated checks and evidence

No application defect required a live-generation repair. No provider output was rewritten, no validator relaxed and no action invented. New task-only guard/audit/browser/server utilities and two guard regressions were added; existing storage repairs remain preserved. Strict typing and canonical-hash helpers were corrected offline, without paid retesting.

Final verification: **1,003 passing Node tests, zero failed/skipped**, application TypeScript, affected-module strict TypeScript, production build and `git diff --check`. The two new guard tests cover stage/request bounds, durable safe accounting, passed-scenario replay denial and unknown-charge reservation/next-run admission. Numerical contracts were untouched; standalone model CLIs/GIS were not separately executed and no Shapely/GIS success is claimed.

Ignored safe evidence: `tmp/phase4d-live/ledger.jsonl`, `ledger.json`, `server-preflight.json`, `attempt-1-audit.json`, `attempt-2-audit.json`, both `attempt-*-desktop.json`, `browser-projection-proof.json`, test/build logs. Protected raw journals remain only in the existing private store; audit artifacts contain counts, IDs, categories and hashes, not dialogue.

Each `tmp/phase4d-live/attempt-1/` and `attempt-2/` contains: `map-1440.png`, `graph-1440.png`, `graph-1920.png`, platform/group/agent inspectors at both sizes, `relationship-1920.png`, `drag-1920.png`, `settled-1920.png`, `report-1440.png`, `report-1920.png`, and `restored-report-1920.png`.

## 12. Limitations and next step

Technical integration passed twice; this is not a guarantee of future model reliability. Conversation depth is small, behaviour is not empirically calibrated, and most events remain rules. Long-term recall, explicit commitments/resolutions and model semantic cross-platform propagation remain live-unobserved. The eldercare retrieval is indirect and weak; neither run established source-backed entity/relationship evidence. Dynamic environment labels and deterministic summaries can be semantically coarse.

**Recommended next step:** use these saved worlds offline to improve discussion/issue coverage and role-specific summary explanation, with claim-to-event validation, before increasing population or inference. Do not spend additional calls merely to force reciprocal replies or episodic recall.

No credentials were exposed or edited, no Git integration operations/deployment/package installation occurred, and the unused secondary directory was not accessed. Changes remain unstaged and uncommitted. Paid Phase 4D acceptance is stopped.

### This task's code/evidence utilities

- `scripts/testing/phase4d-live-guard.mjs`
- `scripts/testing/phase4d-live-audit.ts`
- `scripts/testing/phase4d-live-browser.mjs`
- `scripts/testing/phase4d-live-inspect.mjs`
- `scripts/testing/phase4d-live-server.mjs`
- `scripts/testing/phase4d-live-server.ps1`
- `lib/contracts/tests/phase4d-live-guard.test.ts`
- `scripts/testing/tsconfig.phase4d.json` (audit strict-check scope)
- This report and the roadmap checkpoint. Prior uncommitted storage-repair files were preserved.
