# Phase 4C — Background communication and summary-only world graph

30 October 2026, Asia/Singapore. **PASS for offline desktop acceptance.** Real-provider compatibility and behavioural quality remain unverified in this phase.

Baseline: master, `12ba846f00ec104ead0e7761fa2d5c4175383ffb`, initially clean. The previous Phase 4B work was committed. This phase leaves changes unstaged/uncommitted. No paid requests, credential-file changes, deployment, new dependencies, mobile work or secondary-directory access occurred.

## Architecture and privacy boundary

Ordinary navigation is **Map | Knowledge Graph | Report**. Feed tabs, post/comment viewers, transcript links, social search and clock playback controls are removed from the production import/navigation path. Historical feed components remain source-level legacy tooling, with no public route or ordinary entry point. Production chunks were checked for the former feed/playback entry-point strings.

The audit identified raw worlds in the old social API/hook/local storage, stakeholder statements in Explore, event descriptions in graph edges, interaction arrays in inspectors and chronology/memory in the old social Report. The correction establishes an explicit boundary rather than hiding text in React:

- `PublicExplore` version three contains accepted identities, initial action **metadata**, source attribution, safe graph/inspectors and summary status. It contains no executable plan/run snapshot or stakeholder statements.
- `SocietySummary` version two explicitly constructs counts, topic/argument tags, fictional identity/context, group policies, coarse positions, approved relationships and map features. It never serializes events, items, model context, memory excerpts, decisions or motivation.
- The raw dynamic execution remains in the server accepted-run store. Recorded-interaction descriptions are replaced using the trusted inspection record kind; inspector dialogue arrays are empty. Source-reported web passages remain permitted evidence, distinct from conversations.
- `/api/scenario-simulate` invokes the existing validated planner/action engine internally, then returns only the public projection. `/api/social-simulate` returns summaries only. The legacy transcript-oriented `/api/stakeholder-simulate` and `/api/ai/citizen-chat` routes return 410; its validated engine remains available internally for historical replay and tests. The older numerical citizen-profile chat entry is also removed; its profile metadata, dashboard summaries and numerical outputs remain available.
- Graph selection, GET parameters and request-body options cannot enable transcript mode. Unknown fields/operations are rejected. Error envelopes use fixed messages. Continuation requires the accepted run's scoped capability, same-origin checks and revision; clients cannot submit executable social worlds or inference budgets.

Raw server files are excluded from Git: `data/derived/agents/accepted-private/` and the existing `data/derived/agents/social-sessions/` journals. Stored records are parsed application records, not complete raw provider responses, credentials or private reasoning. No remote store/service was introduced.

## Bounded background execution

Explore registers one accepted run and creates/restores its authoritative session. Session creation spends no social inference. The browser immediately continues the new run through explicit bounded POST batches. Each batch advances at most eight steps and admits at most one social completion. Requests have the existing cancellation/deadline semantics; no detached promise or endless background worker is assumed.

Graph/Report navigation observes the existing result. GET/status and stale-revision requests do not advance simulation or infer. A passive incomplete checkpoint is labelled partial. Interrupted jobs can be explicitly resumed through a recovery action, without rerunning planning or original stakeholder actions. This recovery action is not a playback workspace or a mandatory setup step. Failed model opportunities remain failed; no replacement dialogue or automatic paid retry is invented.

Server-side reservations still precede model dispatch; incomplete reservations consume uncertain opportunities on recovery. A saved hybrid session also respects **current** model opt-in: when disabled, remaining opportunities are recorded as skipped, never dispatched and never counted as billed/model calls. Rules continue. Skipped opportunities retain replay records and are not resurrected by changing flags later.

Defaults remain 24 active profiles, four selected model agents, eight social opportunities, eighty steps and a ten-thousand-profile population sample. Existing ceilings include 64 active profiles, 144 steps, 8,192 events, 2,048 items, twelve memories and 64 seen IDs. There are at most four registered communication environments, eight groups and eight current members per group.

The existing model route, identity checks, DigitalOcean-only/no-fallback configuration and reasoning exclusion remain. Social decisions use 24 KB context, 600 output tokens and a 30-second deadline. Existing conservative token/cost reservations remain local admission control, not a provider prepaid hard cap. No summary-model calls were added. Social opt-in remains off unless explicitly configured, independently of the initial stakeholder engine.

This is a single-local-server prototype. Disk/cache limits remain bounded; multi-process/distributed locking is not claimed. Closing the browser stops future batches. Accepted events stay persisted, and passive recovery does not spend again.

## Communication capabilities and private groups

The registry selects communication entities from the **accepted dynamic ontology**, not scenario presets. Known Reddit/Instagram environments use discussion/feed capabilities. WhatsApp/Telegram use private-group capabilities. Other declared messaging services can use an explicitly generic private-group adapter; other declared platforms can use a disclosed simplified feed adapter. Unrecognized non-platform entities remain context only. With no declared platform, one explicitly fictional generic discussion environment is used. Every real service is not automatically added.

The planner receives a concise optional instruction to declare relevant channels/group types when justified. Entity types remain open-ended. Group types use an appropriate generated type where available, otherwise a descriptive fictional fallback. Technical capabilities do not replace the entity taxonomy.

Actual `group-create` transitions assign `group:<runId>:<ordinal>` identities, creator, platform, purpose, initial members, creation event/time and permissions. Initialization is an explicit fictional coordination assumption, with a recorded opening message; it is not evidence of an actual workplace group. Models can also create groups through validated decisions. Names derive from role metadata, never private-message quotations.

Group operations support creator-administered invitations, joining, leaving, member messages, replies, reactions, exposure and sharing. Membership uses event sequence as well as simulated time, so a same-tick join does not reveal earlier messages. Only current members see messages from their current joining point. Missing/hidden ancestry, unknown targets and unauthorized reads/replies are rejected.

Forwarding is an explicit group policy. The normal fictional adapter allows members to forward only after recorded exposure; a no-forwarding configuration is supported and tested. Destination membership is independently required. Other agents receive only the new content exposed through that actual share pathway. No global group-history context is supplied to models.

New sessions record `scheduling: eligible-channels-v1` in their immutable input. This fixes non-members getting stuck repeatedly selecting inaccessible private channels: rules/model scheduling use public environments and private environments with current membership. Existing worlds without the marker retain their original scheduling and exact replay. This is a participation/access correction, not a claim of increased agent intelligence.

The separate `invitationScheduling: metadata-only-v1` marker allows an invited agent to receive a join decision opportunity without receiving old messages or a fabricated read. Rules can also record an authorised join. Since-join history still applies. Existing inputs without this marker retain their prior scheduling. A focused model-decision regression verifies the full leave/invite/join pathway.

Phase 4B memory retrieval, goals, bounded state proposals and selected-agent scheduling remain. New action schemas enumerate accessible group, message, actor and purpose IDs. Context contains only current authorized content. Original source-position sharing, source integrity, canonical plan IDs and Census provenance are preserved.

## Honest summaries, graph and Report

Counts come directly from immutable event types. Selected model decisions can supply up to three validated topic IDs and one bounded argument category: concern, condition, support, question, disagreement or unspecified. Topic labels come from accepted scenario domains/goals, not copied private phrases. These tags are agents' classifications of their own responses, not independently verified semantic extraction. No paid summarizer is involved. Untagged arguments and unavailable causal effects are explicitly unknown.

Platform and group inspectors show aggregate activity, tagged themes/categories, uncalibrated position buckets, policy metadata and state-update counts. Long discussion summaries render as readable paragraphs rather than cramped property-table cells. Agent inspectors show persistent goals, aggregate activity, demographic context and positions; no raw memories or replies. Private membership lists remain withheld; approved fictional platform participation and group creator metadata are visible.

Graph platform identities reuse canonical ontology entities where declared. Fictional groups appear only after creation events. Edges include recorded platform participation, group creation/use, explicitly assumed social ties, aggregated public actor interactions and recorded information transfers. Messages are never ordinary graph nodes. The Report uses these same summaries, plus initial action metadata, sources, assumptions, demographic context and unchanged validated MRT/AAC outputs. Initial stakeholder completion and background completion are separate.

## Historical compatibility

Genesis v1–v4 replay remains unchanged. New communication worlds use genesis v5. Stored model decisions reproduce their original contexts/actions without inference; rejected permission changes fail validation rather than changing accepted records.

Pre-Phase-4C browser worlds already contained raw content. Their one-time migration uploads the existing snapshot, verifies exact replay, saves it unchanged under the private server archive and only then removes the browser raw copy. The replacement is a read-only summary with original run identity; missing ontology, geometry, initial-action details and billing remain unknown. Migration is idempotent. It is legacy ingress, not a raw-response mode. Previously exported/external copies cannot be retroactively erased; new ordinary responses never deliver transcripts.

## Tests and desktop evidence

All providers were mocked. Task-owned loopback port 3180 used explicit dummy credentials and the network-blocking preload. **Zero paid Tavily/OpenRouter requests.** The final mock provider ledger contained one retrieval, two planning completions, eight original actions and eight social completions. These are fixture operations, not real billing or live-provider acceptance.

Primary measured run: `run-5af21bfc88e7813966e0672b-attempt-4-0f0e5a12-b55f-47de-abcb-7a54c6a2c020`.

- 24 fictional profiles, eighty steps, 1,200 simulated minutes.
- **748 events = 8 initial seeds + 8 social-model events + 732 rule events; zero failed model decisions.**
- Four environments and two groups, each with eight fictional current members.
- WhatsApp group: eleven messages, fifteen replies, twenty-nine reads, fourteen state updates. Telegram group: thirteen messages, twelve replies, twenty-five reads, thirteen state updates.
- 33 graph nodes / 235 edges, forty-four recorded public actor pairs. Twenty-five recorded Reddit-to-Instagram transfers and twenty-one reverse transfers. No private-to-public transfer was observed in this particular browser run; that permission/pathway is exercised offline.
- Platform/group/agent inspectors, source context, Report totals, keyboard search/navigation and Map identity were checked at **1440×900 and 1920×1080**. No mobile tests/development occurred.
- Actual mouse drag moved fifteen neighbours approximately 21–170 graph units. A later cooling observation measured zero movement, with zero position drift after navigation. No horizontal overflow or unexpected page/console errors was observed. The one intentional request abort produced the expected ERR_FAILED console entry.
- Reload/history selection retained 748 events/eight social calls without further provider operations. A separate legacy browser fixture migrated without transcript data remaining in storage, rendered HTML or responses. The second continuation request was intentionally aborted before dispatch. The visible recovery action resumed the same run to completion with only eight total social completions; planning/original actions were not repeated. Disabled-opt-in regression tests also pass.

Sentinels inside stakeholder seeds, Reddit content, Instagram comments, WhatsApp messages, Telegram replies, memory/decision records remained present in the internal journal. **None appeared in captured ordinary API/HTML responses, graph/inspector payloads, browser storage, rendered Report or error tests.** The populated Report SSR test also rejects accidental private-field dumping. Summary JSON intended for ordinary export contains no raw records; no new transcript download route exists.

The final browser pass inspected 22 API/document responses across desktop navigation/recovery; the largest measured response was 222,612 characters (about 223 KB for the mostly ASCII fixture). Earlier developmental passes inspected more than forty additional responses. A read-only replay of the final internal world took approximately 122 ms in one local observation: 1,050,260 bytes internally versus 49,462 bytes for its summary without graph/initial context. The bounded snapshot journal occupied about 17.5 MB. The earlier 300-event development world also replayed exactly after the scheduling repair. These are local fixture/replay measurements, not provider latency, realistic-social-quality or sustained-FPS benchmarks.

Final verification: **933 Node tests**, application and affected-module strict TypeScript, production build and `git diff --check`. Numerical model interfaces did not change; their existing CLI regression tests run in the full suite. The six standalone numerical CLI commands and GIS were not rerun; no GIS/Shapely pass is claimed. Existing 300-node graph performance limits remain outside this phase.

### Screenshots

Local ignored artifacts under `tmp/phase4c/`: `map-1440.png`, `platform-1440.png`, `group-1440.png`, `report-1440.png`, `platform-1920.png`, `group-1920.png`, `agent-1920.png`, `report-1920.png`, `graph-before-1920.png`, `graph-drag-1920.png`, `graph-settled-1920.png`, `recovered-1920.png`. Final captures were visually inspected; summaries are prominent and policy details scroll within the inspector. Additional captures: `partial-1440.png` and `source-1920.png`. No screenshot contains raw conversations.

## Reproduction and limits

Run `npm.cmd test`, `npx.cmd --no-install tsc --noEmit`, `npm.cmd run build` and `git diff --check`. Focused tests are `communication.test.ts`, `summary-privacy.test.ts`, `public-social.test.ts` and the existing service/replay/inspector suites. `node scripts/testing/phase4c-replay-check.ts <repository-private-journal.jsonl>` verifies replay without inference and emits only safe metrics.

For isolated desktop browser testing, set process-local dummy OpenRouter/Tavily keys, both existing feature flags, `IMPACTLENS_PHASE2B_MOCK=true`, `IMPACTLENS_SOCIAL_MOCK=true`, `IMPACTLENS_PHASE4C_MOCK=true`, and `NODE_OPTIONS=--import ./scripts/testing/dynamic-provider-preload.mjs`. Start a task-owned loopback port and ask the exact fixture question “What if Singapore introduces a four-day workweek?”. Never use this preload in live acceptance. Stop the owned server afterward.

Remaining limits: generic adapters are not platform clones; no attachments, direct one-to-one messaging, real accounts, native service APIs or semantic summarization of every rule message are claimed. Group/network membership and influence rules are fictional assumptions. Narrative conclusions, economic effects and public-opinion claims are not inferred from engagement counts. Real DeepSeek handling of the extended group/tag schema and real dialogue quality need separate authorization and acceptance. Initialisation/storage-capacity failures retain accepted records and disclose incomplete background activity.


## Exact changed-file inventory

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
- `docs/PHASE4C_IMPLEMENTATION_PLAN.md`
- `docs/PHASE4C_PRIVATE_MESSAGING_SUMMARY_GRAPH.md`
- `lib/contracts/tests/communication.test.ts`
- `lib/contracts/tests/public-social.test.ts`
- `lib/contracts/tests/social-service.test.ts`
- `lib/contracts/tests/summary-privacy.test.ts`
- `lib/contracts/tests/world-inspector.test.ts`
- `lib/question-simulation/client.ts`
- `lib/question-simulation/map-view.ts`
- `lib/question-simulation/public-session.ts`
- `lib/server/inference/planner.ts`
- `lib/server/inference/social.ts`
- `lib/server/society/public-service.ts`
- `lib/server/society/service.ts`
- `lib/server/society/summary.ts`
- `lib/society/communication.ts`
- `lib/society/contract.ts`
- `lib/society/decision-contract.ts`
- `lib/society/engine.ts`
- `lib/society/group-engine.ts`
- `lib/society/hybrid.ts`
- `lib/society/map-layer.ts`
- `lib/society/public-contract.ts`
- `scripts/testing/dynamic-provider-preload.mjs`
- `scripts/testing/phase4c-replay-check.ts`
- `scripts/testing/social-decision-fixture.ts`
