# Phase 4D - Social Intelligence Implementation

**Verdict: PASS - offline capability and desktop acceptance only.** 30 October 2026, Asia/Singapore (UTC+8). No real-provider Phase 4D acceptance was performed.

## Baseline and scope

Started on `master`, clean, HEAD `1badf76992aa324c3018d4a4c86a8a95ae6c39d1`. The prior Phase 4C reports describe two accepted real runs and 976 tests; those are historical evidence. Current work extends the existing TypeScript engine, reducer, journal, gateway and summary boundary. Required implementation reports and actual contracts were reviewed. No separate Phase 4D research file was invented.

Map-first desktop navigation remains **Map | Knowledge Graph | Report**. Default active population remains 24; four selected model agents and eight additional social opportunities remain independent of population size. Original staged planning, four stakeholder roles/eight actions, provider restrictions, Census inputs and numerical model contracts are unchanged. There are no new packages, hosted services, frameworks or transcript endpoints.

## Immutable policy and scheduling

New communication sessions freeze this `intelligence` bundle in genesis/session identity:

```json
{"version":1,"scheduling":"conversation-windows-v1","context":"conversation-menu-v2","memory":"episodic-v1","rules":"attention-v1","episodicEntries":32,"readCooldown":4,"responseCooldown":8,"postCooldown":12}
```

Absence selects historical behaviour. Historical journals are never upgraded or rewritten. New scheduling uses deterministic time windows, actual accessible conversation priority, selected-agent fairness, and channel diversity. The standard 80-step schedule is **2, 12, 22, 32, 42, 52, 62, 72**; four opportunities remain beyond halfway. Rejected, interrupted or skipped slots do not collapse later slots or trigger automatic retries. No opportunity is scheduled at/after the final tick. An agent can choose inactivity; useful replies are offered, never fabricated or forced.

The same actor/channel can otherwise dominate all opportunities through its earlier high-priority replies. A bounded channel penalty and actor fairness preserve later legitimate public/private alternatives. These are synthetic scheduling assumptions, not calibrated communication habits.

## Reply menus and conversation capability

`conversation.ts` ranks direct replies, ongoing discussions, accessible model contributions, explicit questions and other feed candidates. Descendants are traversed only through an actually visible root, with current access/ancestry checks. The existing exposure path records a genuine read before replying. No target is made accessible by inventing a read.

New menus retain at most 24 choices. When an eligible peer reply exists in bounded context, one reply choice is reserved before routine reactions; posting, sharing, group actions and inactivity remain alternatives. Context still has at most eight items, six retrieved memories and 24 KB, with the existing 600-output-token bound. Item metadata includes simulated time, counterparty role, model/rule origin, direct-address and active-thread status. No hidden model reasoning is requested.

Safe diagnostics count eligible/included/omitted peer replies, context omissions, selected action types and ancestry depth; raw text is not logged. The crowded-menu regression preserves a peer reply beyond low-priority choices. A deterministic **A -> B -> A** fixture legitimately exposes each authored item, validates replies and ancestry, and exactly replays the final state. It establishes capability, not voluntary real-model conversation quality.

## Episodic memory and explicit issues

Short-term memory remains 12 entries. Selected agents additionally index up to **32 actual authored/exposure experiences**; other residents do not become model sessions. Entries contain event/item references, time, counterparty, topic IDs, deterministic importance and an access-recheck marker. Raw wording stays in private server item records.

Direct replies, original seeds, model contributions, authored experience, recency and open-issue sources determine bounded retention. Retrieval combines lexical relevance, importance, topic/counterparty context, unresolved sources and recency, retaining recent/cross-platform context without favouring long messages. Dedicated tests evict an older experience from short-term memory, retrieve it episodically later and use it through the authoritative reducer.

Up to eight explicit issues per selected agent represent questions, conditions, disagreements and commitments. An accepted authored decision may self-classify one; only an actual recalled open issue owned by that agent can be resolved/withdrawn. Source/change event IDs remain internal. Conditions are not automatically commitments; concerns do not become promises. The new wire remaps item/memory references consistently and tests a positive resolution after earlier recall. Fixed goals and fictional numeric position remain separate.

Leaving a private group retains experienced references internally, but retrieval requires current membership and the current joining point. Leaving blocks content retrieval; rejoining does not restore forbidden earlier history. No new hidden exposure is created through memory. This conservative policy is tested alongside normal group permissions and replay.

## Deterministic attention and influence

`attention-v1` bounds one routine social action per activation (a recorded geographic activity may also occur), with configurable read/response/post cooldowns, explicit inactivity and per-actor/channel novelty checks. Near-duplicates use normalized token overlap (Jaccard threshold 0.85). Repeated exposures are permitted after cooldown; they no longer automatically imply repeated persuasion.

Position consideration requires actual encountered content and applies at most once per actor/unchanged item under the new policy. A later new interaction can be considered separately. A regression fixes starvation where an already-considered high-priority item prevented consideration of a newer genuinely encountered item. All transitions retain source-event references; no Census demographic attribute determines psychological responses.

Matched 24-agent, rule-only fixture (80 steps): legacy **790 events, 181 authored items, 43 near-duplicate rule actions, 47 repeated reads, 23 repeated influences**; balanced **612 events, 122 authored items, 0 near-duplicate rule actions, 6 repeated reads, 0 repeated influences, 76 inactivity events**. This measures this fixture and these synthetic assumptions, not realistic human behaviour.

## Decision-grounded summaries and fact packs

Internal `AggregateFactPack` contains a versioned aggregate view, transfer records and claim-to-source-event references. The public view contains counts/categories only:

- Authored items and distinct fictional authors.
- Unique authored model decisions and classified/unclassified coverage.
- Explicit topic/argument categories, broad role categories (withheld for private scopes).
- Early/middle/late authored activity, classified decisions, follow-ups and actual nonzero state changes.
- Recorded peer replies, ancestry depth and explicit issue status totals.

A comment and its resulting stance event count as **one authored argument**. Reads/reactions are not counted as expressed arguments. Repeated items do not become independent people or votes. `recorded-transfers` claims reference actual permitted cross-environment events. Internal IDs and item wording do not enter the public view.

Platform, group and new-policy agent summaries use the same aggregate function. Graph inspectors render readable summary/coverage/chronology paragraphs; Report consumes the same DTOs and exposes selected-agent development in a collapsed details section. Transfers derive from the same fact pack. Existing authored-item position buckets are explicitly labelled as uncalibrated scores, not semantic opinion measurements. Missing tags stay uninterpreted. An author's resolution tag does not establish consensus or causal policy impact.

No LLM summariser, reflection call, vector store or empirical forecast was added.

## Capacity, persistence and performance

Active capacity is 100 only for the new policy; legacy worlds retain the 64-agent input bound. Default remains 24. Existing limits remain: 144 steps, 8,192 events, 2,048 items/ties, 16 routine activations per step, 64 map markers, 8 MB saved snapshot, 64 MB journal and 2 MB checkpoint bounds. Four selected model agents/eight opportunities are unchanged at all sample sizes.

The actual production population seed exposed only 94 eligible adults in its initial 128-profile view. The service now grows the deterministic Census-constrained view in 32-profile increments, bounded at 256, when needed. A service regression starts 100 active profiles without inference. The Census population remains 10,000 representative records, not national-scale LLM agents.

Above 48 agents, graph presentation keeps all scenario roles then the most active profiles, with deterministic tie-breaking and disclosure. All agents remain in server records and summary statistics; no individual message nodes are added. This avoids forcing 100 visible nodes; the pre-existing 300-node performance limitation remains outside scope.

### Fixed-seed fixture results

Each row: 80 steps, four selected agents, exactly eight injected mock completions, zero real requests; source fixture and dynamic browser fixture differ and are not interchangeable runs.

| Active | Events | Rule events | Accepted | Peer eligible/offered | Selected peer replies | Model-chain depth | Graph nodes/edges |
|---|---:|---:|---:|---:|---:|---:|---:|
| 24 | 526 | 510 | 8/8 | 4/4 | 3 | 4 | 30/189 |
| 50 | 578 | 562 | 8/8 | 4/4 | 3 | 4 | 54/323 |
| 100 | 607 | 591 | 8/8 | 8/8 | 6 | 4 | 54/216 |

All three worlds replay exactly; no eligible peer reply was omitted. Fixture decisions deliberately choose replies, so these counts do not predict DeepSeek's choices. Indexed experience persisted, but **natural benchmark episodic-only retrieval count was zero**: two opportunities per agent did not evict the relevant short-term memories. Older-memory retrieval is demonstrated by the dedicated eviction test, not inferred from these runs. Near-duplicate fixture model prose remains possible; the rule-only duplicate count is zero.

### Local timings and storage

Single observations, including ordinary local load/GC; not a controlled hardware benchmark, real inference latency or billed usage. Heap is observed Node heap usage, not peak process RSS.

| Active | Rules seconds | Pure mocked scheduling seconds | Service/journal seconds | Replay seconds | Summary ms | Observed peak heap MiB |
|---|---:|---:|---:|---:|---:|---:|
| 24 | 0.54 | 0.45 | 1.28 | 0.90 | 34.8 | 93.7 |
| 50 | 2.71 | 3.15 | 5.18 | 4.92 | 100.4 | 147.7 |
| 100 | 2.21 | 2.80 | 4.61 | 3.86 | 79.7 | 153.7 |

| Active | Saved snapshot KiB | Journal MiB | Final checkpoint KiB | Society summary KiB |
|---|---:|---:|---:|---:|
| 24 | 690.0 | 16.43 | 238.7 | 67.6 |
| 50 | 796.4 | 16.31 | 236.6 | 121.9 |
| 100 | 897.9 | 17.42 | 250.2 | 206.3 |

Journals remain bounded but full checkpoints amplify disk use (~17-18 MiB for these 80-step runs); this is acceptable locally and not a reason to remove limits. The 100-agent workload does not imply 100 LLM-controlled agents. Full graph plus scenario payload sizes differ from the society-only bytes above.

## Historical compatibility

Read-only audits replayed the actual Phase 4C qualifying journals: eldercare attempt 14 (**773 events**) and workweek attempt 15 (**691 events**), eight original decisions each at ticks 2,4,6,8,10,12,14,16. Final agent states, counts and links match their archived accepted projections. SHA-256 before/after matches; immutable inputs, journal bytes and plan/run identities are unchanged.

The saved Phase 4B accepted world and earlier behavioural-audit world also restore exactly with unchanged file hashes. New public summary fields are additive and optional; strict browser parsing rejects arbitrary nested records. Historical raw records remain server-side, without regenerated decisions or retroactive episodic entries.

## Privacy, desktop and regression evidence

Focused sentinels cover public posts, group messages, episodic/issue material, model follow-ups, aggregate fact payloads, SSR/inspector/Report projections and malformed nested fields. The engine can still access private raw content for inference and replay. The public boundary serializes only allowlisted aggregates; no transcript mode exists.

Final actual browser fixture: **24 agents, 532 events = 8 stakeholder seeds + 8 social-model events + 516 rule events; eight initial actions/eight mocked social decisions; four platforms, two fictional private groups; 33 nodes/200 edges.**

Desktop 1440x900 and 1920x1080 passed Map -> Explore -> background completion -> Graph -> platform/group/agent inspectors -> Report. Search/type filters, relationship inspection, mouse dragging, connected-neighbour motion (three neighbours), settling and position retention passed. One Explore per isolated test context; saved history restores the same run. Navigation leaves the fixture adapter ledger unchanged. Zero page/console errors and no horizontal overflow were observed.

Eighteen observed ordinary scenario/social responses contained no `RAW_` fixture markers; HTML and browser storage were also clean. This complements strict DTO/sentinel tests; it is not a claim about future untested endpoints. Raw content is never logged by the browser observer. No mobile checks were run.

Safe evidence under ignored `tmp/phase4d/`:

- `desktop.json`, `desktop-extra.json`, `acceptance.json` (numeric/structural evidence).
- `map-1440.png`, `graph-1440.png`, `graph-1920.png`.
- `platform-1440.png`, `platform-1920.png`, `group-1440.png`, `group-1920.png`.
- `agent-1440.png`, `agent-1920.png`, `relationship-1920.png`.
- `drag-1920.png`, `settled-1920.png`, `report-1440.png`, `report-1920.png`, `restored-report-1920.png`.
- `full-tests-final.log`, `build-final.log`, focused RED/GREEN evidence and server guard logs.

Final automated results: **995 Node tests, 995 passed, zero failed/skipped** (976 baseline plus 19). Application TypeScript, strict affected-module TypeScript, production build and `git diff --check` pass. Independent review and a scoped follow-up found no remaining material issues after repairs. Numerical contracts were untouched; their existing Node regressions passed. Standalone six model CLIs and GIS were not separately rerun; no Shapely/GIS pass is claimed.

### Storage/environment correction

The ordinary default `data/derived/agents/accepted-private` directory rejected owned-file writes (`EPERM`) in this restricted environment; an independent write probe confirmed it. No permissions or historical records were changed. A trusted process-only `SOCIAL_STORAGE_ROOT` override now relocates both authoritative stores for isolated testing; the default remains unchanged and the API cannot set this path. A deterministic route regression verifies start/registration in the isolated root. Safe failure diagnostics contain only fixed-vocabulary reasons and bounded program locations, never messages or provider bodies.

Desktop acceptance used `tmp/phase4d/private-server`. Before any later real-provider test, verify default archive writability or explicitly configure a trusted writable private root with appropriate local access. A writable isolated root is verified; default archive permissions are not repaired by this task.

## Reproduction (offline)

Run from the repository using Node 24+ and the existing installed dependencies. These commands create only local test/build artifacts:

```powershell
$guard = ([Uri](Join-Path (Get-Location) 'scripts/testing/offline-network.mjs')).AbsoluteUri
$previousNodeOptions = $env:NODE_OPTIONS
try {
  $env:NODE_OPTIONS = "--import=$guard"
  npm.cmd test
  npx.cmd --no-install tsc --noEmit
  npx.cmd --no-install tsc -p scripts/testing/tsconfig.phase4d.json --noEmit
  npm.cmd run build
} finally {
  $env:NODE_OPTIONS = $previousNodeOptions
}
node scripts/testing/phase4d-acceptance.ts
git diff --check
```

The benchmark explicitly imports the egress guard and injects mock responses through the real gateway/service contract. Historical audits require the existing ignored local Phase 4B/4C evidence files; a fresh checkout must supply those unchanged fixtures to repeat that particular audit. Unit tests do not require historical private archives.

For desktop acceptance, start `scripts/testing/phase4d-mock-server.ps1` in a dedicated PowerShell process. It sets dummy process-only keys, explicit fixture switches, a private task storage root, and blocks native external fetch. Confirm `PHASE4D_OFFLINE_GUARD_READY` before using Explore. Execute the async function in `scripts/testing/phase4d-desktop.mjs` through the existing Playwright runner and save its returned safe result as `tmp/phase4d/desktop.json`. The script deliberately returns data rather than importing filesystem code inside Playwright's VM. Stop only the PID recorded in `tmp/phase4d/server.json` after checking it still belongs to the owned node server. The task-owned port 3196 was closed and owned browser contexts were closed after acceptance.

## Limitations and later live gate

- Fixture text establishes structural/semantic capability only. It cannot demonstrate real DeepSeek reply relevance, memory causality or voluntary reciprocal conversations.
- Eight calls and four agents cannot cover every conversation; scheduling is bounded and may legitimately choose inactivity. Model quality/latency/cost and the new optional issue schema require separate paid authorisation.
- Explicit tags are fictional self-reports, not independent semantic analysis. Older untagged arguments and actual policy impact remain unavailable.
- Importance/attention/influence rules are synthetic assumptions; no calibrated public-opinion or causal-economic claims follow.
- Future live verification should preserve the same eight-call budget, record offered versus selected replies, examine protected context relevance, test private access, reconcile summaries, and recheck browser non-disclosure. First confirm the private store is writable.

**Paid ledger for this task: zero Tavily requests, zero OpenRouter/DeepSeek requests, zero provider charges incurred.** Injected mock token/cost fields are fixture values, not billing. No credential-file access, Git integration operation, deployment, mobile work or secondary-directory access occurred. Changes remain unstaged/uncommitted.

## Exact changed-file inventory

- `components/communication-report.tsx`
- `components/discussion-summary.tsx`
- `components/knowledge-workspace.tsx`
- `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`
- `docs/PHASE4D_SOCIAL_INTELLIGENCE_IMPLEMENTATION.md`
- `docs/superpowers/plans/2026-10-30-phase4d.md`
- `lib/contracts/tests/phase4d-attention.test.ts`
- `lib/contracts/tests/phase4d-capacity.test.ts`
- `lib/contracts/tests/phase4d-conversations.test.ts`
- `lib/contracts/tests/phase4d-fixture.ts`
- `lib/contracts/tests/phase4d-memory.test.ts`
- `lib/contracts/tests/phase4d-storage.test.ts`
- `lib/contracts/tests/phase4d-summary.test.ts`
- `lib/contracts/tests/summary-privacy.test.ts`
- `lib/question-simulation/public-session.ts`
- `lib/server/inference/social.ts`
- `lib/server/society/facts.ts`
- `lib/server/society/population.ts`
- `lib/server/society/public-service.ts`
- `lib/server/society/service.ts`
- `lib/server/society/storage.ts`
- `lib/server/society/summary.ts`
- `lib/society/attention.ts`
- `lib/society/contract.ts`
- `lib/society/conversation.ts`
- `lib/society/decision-contract.ts`
- `lib/society/decision-menu.ts`
- `lib/society/discussion-contract.ts`
- `lib/society/engine.ts`
- `lib/society/episodic.ts`
- `lib/society/evaluation.ts`
- `lib/society/group-engine.ts`
- `lib/society/hybrid.ts`
- `lib/society/intelligence.ts`
- `lib/society/public-contract.ts`
- `scripts/testing/dynamic-provider-preload.mjs`
- `scripts/testing/offline-network.mjs`
- `scripts/testing/phase4d-acceptance.ts`
- `scripts/testing/phase4d-browser-preflight.ts`
- `scripts/testing/phase4d-desktop.mjs`
- `scripts/testing/phase4d-mock-server.ps1`
- `scripts/testing/social-decision-fixture.ts`
- `scripts/testing/tsconfig.phase4d.json`


## Subsequent storage reliability verification (30 October 2026)

The earlier isolated-root limitation above has now been investigated directly. Identical durable probes fail under the restricted Codex account but pass at the original default paths under the normal Windows user. Default-path lifecycle/restart/replay/history and mocked desktop acceptance passed without ACL changes or migration; the restricted context remains blocked. Explore now checks both stores before provider dispatch, pending write/fsync failures clean up correctly, and continuation failure checkpoints are awaited. All 55 enumerated historical top-level records retain their hashes. See `docs/PHASE4D_STORAGE_RELIABILITY_REPAIR.md` for exact context-dependent readiness, evidence and reproduction; this is not paid Phase 4D behavioural acceptance.
