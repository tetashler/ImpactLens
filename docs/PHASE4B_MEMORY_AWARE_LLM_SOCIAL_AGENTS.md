# Phase 4B — Memory-aware social agents

30 October 2026, Asia/Singapore. **PASS for offline, desktop prototype acceptance. Real-provider behavioural acceptance remains unverified.**

Starting HEAD: `fa0df45367d660cdba2dc291eab4131d1ab3c866`, master, initially clean and equal to the local `origin/master` ref. Previous implementation was committed. This task leaves its changes unstaged and uncommitted. No paid requests, credential-file changes, deployment or secondary-directory access occurred.

## Working architecture

The existing staged planner, eight initial stakeholder actions, population and deterministic reducer remain intact. A separate server-only social adapter uses the existing identity-checked DeepSeek transport. It offers four selected role-bound fictional agents at most eight new decisions. Other agents remain rule-controlled. Once the social budget is exhausted, rules can also activate the selected agents.

`Map → Explore → accepted run → authoritative social session → Play/Step → recorded encounter → bounded context → one structured completion → validated reducer transition → shared Map/Graph/Report`.

There is no provider call when a session starts. Playback dispatches at most one social completion at an eligible even-numbered step; selected agents rotate, and their platforms alternate. This is sparse ongoing model control, not 24 independent LLM sessions. The original eight stakeholder completions are separately counted.

### Context and output

The frozen context contains canonical actor/run IDs, current simulated time, persistent goal, priorities, position, resistance, supported fictional demographic stratum, known connections, exact previously encountered content, complete comment ancestry, selected memories, recent public decisions, allowed actions and reaction restrictions. It includes a bounded shared scenario briefing: four assumptions and up to two existing retrieved source excerpts. It performs no additional retrieval. Retrieved text and social content remain untrusted data.

Bounds: 24 KB encoded context; eight content items; six selected memories; two recent decisions; 600 output tokens; 30-second deadline. Memory retrieval retains the latest exposure and available recent cross-platform exposure, then selects deterministic lexical relevance plus recency. Full memory remains bounded at twelve entries. Context never exposes hidden/future social content or invents missing ancestors.

The strict decision object requires `action`, `platform`, nullable `targetId`/`text`/`stance`, `memoryIds` and bounded public `motivation`. Target/memory schemas enumerate application IDs. Runtime validation also checks platform semantics, actual exposure, ancestry, prior reactions, content bounds and markup. Actor identity comes from the application. Motivation is a fictional public explanation, not private reasoning.

Actions include read, post, comment, nested reply, reaction, follow/unfollow, cross-platform share and inactivity. Failed responses become explicit failed opportunities/inactivity, with no substitute conversation. Safe `SOCIAL_SHAPE`, `SOCIAL_TARGET`, `SOCIAL_MEMORY`, `SOCIAL_PLATFORM`, `SOCIAL_TEXT`, `SOCIAL_STANCE`, `SOCIAL_STALE` and `SOCIAL_BUDGET` rules accompany existing gateway classifications.

### State and influence

Writing a comment does not change position. An optional exposure-linked stance proposal goes through the declared resistance/influence blend, capped to an absolute change of 0.15 and bounded to [-1, 1]. Events preserve prior/applied/proposed positions, decision and memory references. Disagreement or no change is allowed. These are uncalibrated fictional states, not measurements of persuasion or public opinion.

Accepted decisions and their exact contexts are immutable records. Resulting events are tagged separately as `social-model`, `deterministic-rule`, `accepted-model-action` or `social-decision-failed`. Source-position sharing, real source integrity and unverified-attribution policies remain unchanged.

## Exposure, goals and conversations

New genesis-v4 worlds use `socialPolicy: memory-aware-v1`. Up to two unread stakeholder seeds receive feed slots through step sixteen, subject to existing community/follow access. Actual read events precede decisions; no reads are fabricated and no agreement is forced. The small selected cohort has explicit assumed follow ties, not omniscient access.

Bounded thread exposure includes complete ancestors and recent branches, up to twelve IDs. Previously seen threads remain inspectable when displaced by ranking, provided their access scope remains valid. Hidden ancestors block new reactions. Comments inherit their thread community. The UI displays deeper reply chains and offers “Model conversations only”, so later routine posts cannot bury all model conversations.

Background goals combine scenario-generated role concerns with stable assumed priorities. The tested twenty background agents have twenty distinct persistent goals. Demographics do not determine opinions, goals, activity or resistance; these remain explicit fictional assumptions. This is goal differentiation, not a validated personality model.

## Sessions, budgets and replay

`GET/POST /api/social-simulate` uses same-origin checks and authoritative server worlds. A start accepts a validated historical stakeholder run; clients cannot submit executable social worlds, cost records or custom budgets. Next.js origin normalization is handled using the application Host, consistently with existing APIs; foreign origins are rejected.

Social inference is opt-in through process configuration `SOCIAL_LLM_ENABLED=true` and existing `STAKEHOLDER_LIVE_ENABLED=true`. Default-off servers retain usable rule-only playback. No private environment file was changed. Optional trusted process settings are `SOCIAL_MAX_DECISIONS` (cap sixteen), `SOCIAL_CONTROLLED_AGENTS` (cap four), and `SOCIAL_ACTIVE_AGENTS` (bounded by existing population limits).

Defaults: four selected agents, eight social calls, 200,000 conservatively reserved tokens, USD 0.20 local cost threshold. Context/schema bytes plus prompt/output headroom conservatively reserve tokens before dispatch. Unknown charges reserve USD 0.02 per call; reported charges replace that estimate. This is local admission control, not a provider prepaid hard cap. Real billing/pricing has not been verified in this task.

One operation per session and revision guards prevent duplicate requests. There are no automatic retries. A durable, fsynced reservation precedes inference. Interrupted/uncertain requests consume a failed opportunity on recovery without redispatch. Cancellation and provider-identity/timeout failures consume records too. Pause stops new scheduling and lets the one in-flight operation finish; switching runs/unmounting cancels it.

Ignored local journals: `data/derived/agents/social-sessions/`. Four cached sessions, sixteen persisted run indices, 64 MB journal cap and 2 MB snapshot-line cap bound local resources. The supported prototype deployment is one local application server, not a distributed multi-worker inference service. Durable records contain accepted public contexts/actions and safe usage, never credentials, raw provider bodies or private reasoning.

Saved worlds replay accepted decisions through the same validator/reducer with no inference. Recomputed contexts, events, content and final state must match. “Replay / recover saved session” retains session identity and spent quota. Genesis v1–v3 archives replay their original policy; reading does not rewrite old identities. Model decisions cannot be safely reused in counterfactual contexts, so hybrid participation-sensitivity comparisons are disabled; rule-only comparisons remain.

## Shared views

The existing canonical resident/role identities join Map, social profiles, Graph and Report. New graph projections register Reddit/Instagram **internal simulated platform** nodes, assumed communities, recorded participation and aggregated interactions. No ordinary post/event nodes are added. Platform inspectors compute participants, posts/comments/reactions/shares and frequent recorded text terms from the world, with links into actual threads. These terms are not inferred topic verification.

Feeds show Stakeholder seed / Model decision / Simulation rule labels. Inspectors expose supplied memory and public motivation. Report totals distinguish initial seeds, social opportunities/outcomes, rule events, failed opportunities, memory/cross-platform references, usage and unknown-charge reservations. Source records stay in the existing evidence/report pathway. A citation does not verify an invented relationship.

## Offline behavioural evidence

All dialogue below is **explicit fixture output**, not evidence of real DeepSeek semantic quality. The actual session service, transport identity checks, schemas, reducer, persistence and projections execute around those fixtures.

| Criterion | Observed offline evidence |
|---|---|
| Initial exposure | First selected employee receives the exact original fixture post: “Monthly wages and overtime protection must be agreed before changing the workweek.” A recorded Instagram read precedes the decision. |
| Contextual response | Accepted fixture comment: “Protecting monthly pay should be separate from overtime: a shorter week should not quietly become longer unpaid shifts.” It targets the encountered post. |
| Distinct goals | Employee: protect monthly income. Employer: maintain service coverage. Employer fixture proposes a staggered roster and discusses staffing costs alongside wage protection. |
| Persistent memory/use | Later employee Reddit context retains Instagram exposure `…:e18` and new Reddit exposure `…:e90`; the accepted reply cites both and explicitly refers to the earlier Instagram wage discussion. |
| Multi-turn discussion | Fixture decisions include replies to encountered comments, with bounded complete ancestry. Other rule agents subsequently encounter/respond to model-authored content. |
| Strict validation | Unseen targets, invented memories/actor properties, markup and Instagram downvotes reject. Hidden-thread access, provider mismatch, timeout, cancellation and interrupted reservations have regression coverage. |
| Replay | Saved accepted choices reproduce the exact context/event/state snapshot without additional inference; changed archived state is rejected. |
| Budgets | Eight social calls maximum in acceptance; exhaustion resumes rules. Token exhaustion prevents opportunities. Recovery/revision guards do not repeat consumed requests. |

`node scripts/testing/phase4b-acceptance.ts` runs a reproducible fixture vertical slice: eight initial seed statements, eight accepted social decisions, 735 events (719 rule events), eighty steps, 41 nodes/284 edges and 24 located agents. The CLI fixture has twelve world entities; the browser fixture has three. Their inventories are deliberately different and must not be conflated.

### Desktop browser acceptance

Production build, Playwright, 1440×900, task-owned port 3171. Explicit dummy credentials and an opt-in preload intercepted both providers and blocked other external server traffic. **Zero paid calls.** Ordinary Map → Explore returned two accepted fixture planning stages/eight initial actions; social playback then made eight separate fixture social completions, all accepted.

Final browser run: `run-a38ac5f4bd13529a51469c34-attempt-4-c0b13065-989d-41e4-aaea-bba01194df3d`; 24 profiles, eighty steps/1,200 simulated minutes, 751 events = 8 seeds + 8 social-model events + 735 rule events. Graph: 32 nodes/291 edges. Report: 35 recorded seed encounters, eight decisions citing memory, three citing the other platform. Memory caps remained twelve. These reference counts prove supplied context, not model understanding.

Pause/resume succeeded without an error. Search/type navigation, social profiles, platform-to-thread navigation, Map/Graph/Report identities, recovery and event totals were checked. Actual mouse drag moved ten connected neighbours by approximately 17–80 graph units during the drag. Motion settled to zero change over a final 1.2-second observation; settled positions were retained exactly across navigation. No page errors were recorded.

Local screenshots (ignored artifacts, relative to repository):

- `tmp/phase4b/social-desktop.png` — seed and nested model/rule conversation.
- `tmp/phase4b/instagram-desktop.png` — corresponding fictional Instagram feed.
- `tmp/phase4b/agent-memory-desktop.png` — persistent goal and decision memories.
- `tmp/phase4b/graph-before-drag.png`, `graph-mid-drag.png`, `graph-settled.png`.
- `tmp/phase4b/platform-inspector-desktop.png` — actual event-derived platform summary.
- `tmp/phase4b/report-desktop.png`, `map-desktop.png`.

The user subsequently specified desktop-only scope. No further mobile development or mobile acceptance gate is part of completion; earlier exploratory responsive screenshots remain optional local artifacts.

### Performance and verification

Single local observations, not provider latency benchmarks. Ten-thousand-profile source sample, eighty steps, six routine activations per step:

| Active agents | Rules only | Fixture decision scheduling | Social decisions |
|---|---:|---:|---:|
| 24 | 86 ms | 94 ms | 8 |
| 64 | 133 ms | 146 ms | 8 |

Authoritative session plus journal replay/write exercise: approximately 729 ms. Fixtures supply immediate completions; these timings establish no real-provider speed/cost claim. Evidence and full contexts are in `tmp/phase4b/acceptance-summary.json`, `accepted-world.json`, `contexts-and-decisions.json` and command logs.

Verification: **916 Node tests passed**, application TypeScript, affected-module strict TypeScript, production build and whitespace check. Tests use offline fetch adapters only. Numerical-model contracts were unchanged; model CLI regression tests run in the full suite, while the six standalone numerical CLI commands were not rerun. GIS was not executed; no Shapely/GIS pass is claimed. Existing 300-node graph performance limits remain outside this phase.

## Reproduction and remaining verification

Run `npm.cmd test`, `npx.cmd --no-install tsc --noEmit`, `npm.cmd run build`, `git diff --check`, then `node scripts/testing/phase4b-acceptance.ts`. The CLI creates a temporary session directory and injects fixture fetch responses without reading private credentials.

For isolated browser acceptance, use process-only **dummy** `OPENROUTER_API_KEY`/`TAVILY_API_KEY`, both feature flags, `IMPACTLENS_PHASE2B_MOCK=true`, `IMPACTLENS_SOCIAL_MOCK=true`, and `NODE_OPTIONS=--import ./scripts/testing/dynamic-provider-preload.mjs`. Start a dedicated local port and use the exact fixture question “What if Singapore introduces a four-day workweek?”. Never enable that preload in a live acceptance server. Stop the owned server afterward.

Still required: separately authorized real-provider acceptance of evolving, memory-aware dialogue, actual structured-schema compatibility, latency and cost. Fixture content cannot establish autonomy quality, persuasion realism or general conversation coherence. Goal/attention/influence rules are assumptions. Most population actions remain templated rules, and this does not claim MiroFish/OASIS equivalence or a representative Singapore poll.

## Changed files

- `app/api/social-simulate/route.ts`
- `components/{knowledge-workspace.tsx,social-simulation.css,social-simulation.tsx,society-report.tsx,use-society.ts,workspace.tsx}`
- `lib/contracts/tests/{social-decisions.test.ts,social-exposure.test.ts,social-service.test.ts}`
- `lib/server/inference/{deepseek.ts,social.ts}`, `lib/server/society/service.ts`
- `lib/society/{contract.ts,decision-contract.ts,engine.ts,exposure.ts,graph.ts,hybrid.ts,platforms.ts,report.ts}`
- `scripts/testing/{dynamic-provider-preload.mjs,phase4b-acceptance.ts,social-decision-fixture.ts}`
- `docs/PHASE4B_IMPLEMENTATION_PLAN.md`, this report and `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`
