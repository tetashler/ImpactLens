# Phase 4C — two-run real-provider acceptance

30 October 2026, Asia/Singapore (UTC+08:00). **FAIL — neither independent run met the complete acceptance criteria.** Exactly two live Explore attempts occurred. No third attempt, provider retry, replacement dialogue or paid evaluation was performed.

## Environment and preflight

Main repository only, `master`, HEAD `12ba846f00ec104ead0e7761fa2d5c4175383ffb`. The 39 pending Phase 4C implementation files were preserved. Changes remain unstaged/uncommitted. No private environment-file changes/display, secondary-directory access, deployment or new dependency installation occurred.

The normal server loader confirmed both credentials were present and had valid formats without exposing values. A task-owned production server used loopback port 3190; process-local settings explicitly enabled the initial engine and social model, four selected agents, eight social decisions and 24 active profiles. The initial production build and 934 tests passed before live dispatch. No fixture preload or provider substitute was present in either live server process.

The real route remained Map → `/api/scenario-simulate` → two-stage planning → initial actions → server-owned social session → bounded `/api/social-simulate` continuations. Graph/Report navigation performs no inference. Legacy conversation endpoints return 410, and the summary API rejects a raw-mode query. Raw application records remain in the existing Git-ignored server store/journals.

Only OpenRouter `deepseek/deepseek-v4-flash-0731`, DigitalOcean-only routing, `allow_fallbacks:false`, `require_parameters:true`, reasoning disabled/excluded and strict validation were used. Every returned completion reported the required model/provider, normal `stop`, valid JSON and zero reasoning tokens. Local semantic rejection remained authoritative. Existing 10-second retrieval, 45-second planning, 30-second action/social and 120-second parent-run bounds were unchanged.

## Questions

1. “What if Singapore introduces a nationwide four-day workweek instead of the traditional five-day workweek? How would this affect employees, businesses, productivity, wages, and the wider Singapore economy?”
2. “What if Singapore introduces a new government-supported eldercare centre in Sengkang? How might nearby residents, caregivers, community organisations and service providers respond over time?”

Both were submitted once through the ordinary Map UI, without drawn geometry or fixture injection. Live request dispatch began at 18:20:08 and 18:36:09 SGT respectively. A separate dummy-key, network-blocked mock browser run between them was an offline regression, not live evidence.

## Checkpoints

| Checkpoint | Test 1: workweek | Test 2: eldercare | Evidence and limitation |
|---|---|---|---|
| A — Tavily | PASS | PARTIAL | HTTP 200 in both; two and three accepted candidates respectively; one credit each. Test 1 retained relevant source metadata/passages. Test 2's failure envelope retained counts/status, not titles/passages, so its relevance cannot be independently established from retained artifacts. |
| B — Staged planning | PASS | FAIL | Test 1 accepted both stages and canonical registration. Test 2 rejected its entity stage with `plan.local_scope_invalid`; no second stage. |
| C — Initial stakeholders | PASS | NOT REACHED | Test 1: four roles, two rounds, eight separately inferred/accepted actions, valid references. Test 2: zero actions. |
| D — Background society | FAIL | NOT REACHED | Test 1's first social completion failed `SOCIAL_TARGET`; zero accepted out of eight configured opportunities. Session stopped honestly at step 2/80. |
| E — Platforms/groups | FAIL | NOT REACHED | Test 1 declared no supported communication platform; one generic fictional discussion environment was used. No public-feed environment or private messaging group was generated. No live group-permission acceptance is claimed. |
| F — Memory-aware behaviour | PARTIAL | NOT REACHED | A selected agent actually read seed content; three visible items and three memories entered the real social request. With no accepted social decision, response coherence, later memory use and cross-platform interpretation were not demonstrated. |
| G — Graph/inspectors | PARTIAL | NOT REACHED | Test 1's partial world had 35 nodes/120 edges and safe environment/agent/relationship inspectors. Some model entities were abstract concepts. Test 2 correctly displayed an empty graph for failed planning. |
| H — Browser/API privacy | PASS, within tested scope | PASS, within tested scope | No transcript-shaped fields or raw conversation literals were observed. Test 2 returned safe failure metadata only. Actual private-group content was not generated live; that boundary passed offline sentinel tests only. |
| I — Report consistency | PASS for partial records | PASS for failure records | Counts, identities and costs matched accepted records. Test 1 showed initial completion separately from partial background status. Test 2 showed its own question/error and did not substitute Test 1's graph. |

## Test 1: retained real evidence

Run: `run-6fd8f6a0c8a78a12c06e5777-attempt-4-556c021b-1b21-4ef2-92f0-4deeb16746b4`.

Plan: `dynamic-plan-df0012fee97637d7407501cee515a62ca1c0092dab56196eed38d95d2503a9bd`. Social session: `75931116-0369-45d4-872e-e553b2d4a315`.

Tavily transport took 2.750 seconds. It retained two sources, retrieved at `2026-10-30T10:20:08.311Z`:

- [Reimagining Singapore's work culture: the four-day workweek proposition](https://pmc.ncbi.nlm.nih.gov/articles/PMC11774796), published 10 January 2025: directly relevant Singapore/workweek context.
- [The four-day workweek paradox](https://www.sap.com/blogs/the-four-day-workweek-paradox), published 6 February 2024: broader business context, not Singapore-specific confirmation.

These remain uncorroborated source candidates. Literal passages were retained in the grounding snapshot; source linkage does not verify proposed entities, causal relationships or predictions. No extra searches or citation-fetch calls were made.

Planning application durations were **16.352 s** and **3.802 s**, with 2,890 and 707 output tokens. Ten entity types, eight relationship types, ten world-context candidates and twelve proposed relationships were accepted. Relationship labels were Informs, Regulates, Part of, References, Employs, Improves, Boosts and Represents. Their names are model proposals, not validated causal findings.

The four fictional roles were Precision Engineering SME Owner, Senior Machinist and Shift Lead, Ministry of Manpower Policy Officer and Labour Economist. Eight initial actions completed in **29.950 s**. Their exact statements remain internal. Reference and run-identity verification passed; no initial action was rejected or substituted.

World candidates included Ministry of Manpower, Singapore Manufacturing Sector, Local Workforce and Precision Engineering Firm. Abstract nodes such as Employer Branding, Business Competitiveness in Region and Employee Retention show that semantic world-entity quality remains imperfect despite structural validity. No communication-platform declaration was accepted, so the registry used the explicitly fictional generic discussion fallback; no named platforms/groups were invented afterward to satisfy this test.

The first real social request returned in **3.318 s** at the application boundary, with 358/600 output tokens, valid JSON and normal termination. It failed `SOCIAL_TARGET` under public transport classification `AI_ACTION_SCHEMA`. The rejected social decision body was not retained. Consequently, **the exact original failing target/field cannot be reconstructed**. It is not established whether the error involved reply ancestry, a null target, group fields or another target constraint.

Final social state: **24 profiles, 2 steps, 30 simulated minutes, 20 events = 8 initial seeds + 0 accepted social-model events + 11 rule events + 1 explicit failure**. There were nine authored public items, ten reads, zero replies/reactions/shares/state changes and zero groups. Fourteen actors had recorded environment activity. No meaningful ongoing model-driven discussion or influence claim is supported by this run.

The public graph had 24 fictional agents, ten model world candidates and one generic environment. Its sixteen displayed types were private-sector-employer, workforce-group, policy-maker, economic-expert, Policy Example, Industry Sector, Government Ministry, Labor Market, Organizational Concept, Union Organization, Affected Group, Business Entity, Economic Condition, Workforce Metric, Resident and Discussion environment. There were no ordinary source, assumption, limitation, execution-event or bookkeeping nodes. The generic environment is an explicit simulation assumption, not a real platform identity.

## Targeted repairs between attempts

Offline fixtures reproduced a confirmed generation/validation mismatch: the old flat schema permitted `comment` with an agent target, `reply` when only root posts were available, and nonempty group fields on unrelated actions. These are rejected correctly by the existing parser. This establishes a schema weakness, **not the exact cause of the discarded Test 1 output**.

New communication sessions record `decisionPolicy: action-targets-v1`. Their generation schema uses complete action-specific alternatives and shared JSON Schema definitions. Targets are limited by action, platform, ancestry, current membership, exposure availability and duplicate-reaction restrictions; irrelevant group fields are null/empty. Impossible alternatives and empty-enum arrays are omitted. The authoritative parser, endpoint/member validation and reducer remain strict; no model output is redirected, repaired or replaced.

The larger schema initially exhausted the conservative offline reservation before eight decisions. The versioned policy now releases unused token reservations **only after both actual input/output usage values are known**, matching the existing known-cost accounting approach. Unknown usage retains its full reservation. The full pending context/schema/output reservation is checked before dispatch; an insufficient token budget falls back to rules with an explicit limitation. The existing 200,000-token admission bound, eight social opportunities and cost limits remain. Old inputs retain the old schema/reservation policy and exact replay.

Social parser failures also stop receiving the unrelated stakeholder diagnostic `shape.missing_type`. `socialValidationRule` remains the authoritative social classification. Historical failure records were not rewritten.

Red/green fixtures, the full suite and an isolated mocked desktop flow passed. The mock accepted eight social decisions with two private groups and no sentinel leakage. **The revised action-specific schema was not exercised by a real social completion in Test 2**, because planning failed earlier. DigitalOcean compatibility and behavioural quality for that new schema therefore remain unverified.

## Test 2: precise planning failure

Tavily HTTP 200: **3.828 s** transport, **3.903 s** adapter, three accepted candidates, one reported credit; bundle `g1_45d93da4ba9ac136`. Source titles/URLs/passages were not retained in the failed public envelope or task telemetry, so source relevance is unknown. HTTP 200 alone is not sufficient for a grounding-quality PASS.

DeepSeek's entity stage returned in **26.144 s**, with 2,141 input and 3,386 output tokens, normal `stop`, valid JSON, zero reasoning tokens and verified DigitalOcean identity. Local validation rejected:

```json
{"stage":"draft","category":"semantic","rule":"plan.local_scope_invalid","path":"draft.jurisdictions","expected":"semantic-constraint","actualKind":"array"}
```

The audited check is `scope !== 'local' || jurisdictions.length <= 1`. Thus the rejected local draft had more than one jurisdiction; the exact count, names and intended geographic levels were not retained. The prompt already states the one-jurisdiction rule, while the generation schema allows up to eight jurisdictions without a scope-dependent constraint. No validator relaxation, speculative name correction or live retry was made.

No plan/run/social session was accepted. No initial or social actions executed. Its current graph was empty and explained that planning did not complete. The failure Report retained the exact eldercare question, safe rule/path, retrieval diagnostic and actual planning usage. No eldercare benefit, facility-access calculation or measured health outcome was produced.

## Privacy, replay and desktop findings

Both target viewports, **1440×900 and 1920×1080**, were inspected. Map-first navigation remained Map | Knowledge Graph | Report, with no Social Simulation entry or conversation viewer. Test 1 environment, fictional-agent and relationship inspectors contained summary metadata only. Its private-group inspector was **not reached**, because no group existed; mock screenshots are separately named and never used as live evidence.

Actual network inspection covered the Explore/continuation bodies (six captured initial API/document responses for Test 1 and one failed Explore response for Test 2, plus subsequent safe navigation/status checks). No `world`, `hybrid`, `items`, `memories`, statement arrays or conversation bodies were returned. Numeric fields called `messages` were legitimate counts, not message payloads. Browser storage contained safe saved summaries, not raw worlds. Sentinel tests covered public/private messages, model output, memory, graph/inspector data, Report SSR/export JSON and errors.

A privileged read-only audit compared seventeen retained internal conversation strings against all strings in Test 1's public projection: **zero literal leaks**. It verified genuine seed exposure and exact replay without copying raw content into diagnostics. No live private messages existed; non-member reads, since-join history and permitted sharing remain validated by offline fixtures rather than these live observations. Raw mode returned 409; legacy conversation routes returned 410 without echoing a probe. No ordinary route returned internal contexts or transcripts.

Test 1's recorded world replayed exactly under the repaired implementation in approximately 29–34 ms in local observations. Explicit history selection restored the same partial run/counts without inference. Report and public summary counts reconciled with that authoritative world. A saved entry's original completion label refers to stakeholder completion; its Report explicitly states background `partial`.

Mouse dragging moved eight connected neighbours; cooled motion measured zero. Graph search and type checkboxes worked. No horizontal overflow or unexpected JavaScript page errors occurred. The failed Test 2 request produced the expected HTTP 502 console entry. Its empty graph did not silently show Test 1. No mobile work or testing occurred.

## Durable accounting

The task-only native-fetch pass-through wrote and flushed each reservation **before dispatch** to `tmp/phase4c-live/ledger.jsonl`; `ledger.json` is the readable summary. It forwarded real responses unchanged and stored finite telemetry only, never prompts, headers, credentials or response content. It enforced two attempts, one search/two plans/eight initial/eight social calls per attempt, cumulative stage caps, duplicate-operation protection and no concurrent provider dispatch. It survived the server restart between attempts. No guard rejection or unresolved pending request remained.

One free unauthenticated [exact-model pricing metadata lookup](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-flash-0731/endpoints) confirmed DigitalOcean rates of US$0.000000119/input token and US$0.000000238/output token. Each completion reserved US$0.0135, covering the enforced 98,304-byte request and 6,000-token maximum output; each full attempt reserved US$0.243. Basic retrieval reserved four credits pending reported usage. These are conservative local accounting safeguards, not an external prepaid cap or a guarantee against unannounced pricing changes.

| Recorded usage | Test 1 | Test 2 | Cumulative / ceiling |
|---|---:|---:|---:|
| Fresh live Explore attempts | 1 | 1 | 2 / 2 |
| Tavily searches | 1 | 1 | 2 / 2 |
| Tavily reported credits | 1 | 1 | 2 / 8 |
| OpenRouter planning completions | 2 | 1 | 3 / 4 |
| Initial stakeholder completions | 8 | 0 | 8 / 16 |
| Social-decision completions | 1 | 0 | 1 / 16 |
| Total OpenRouter completions | 11 | 1 | 12 / 36 |
| Accepted initial / configured | 8 / 8 | 0 / 8 | 8 / 16 |
| Accepted social / configured | 0 / 8 | 0 / 8 | 0 / 16 |
| Input tokens | 27,871 | 2,141 | 30,012 |
| Output tokens | 7,318 | 3,386 | 10,704 |
| OpenRouter reported USD | 0.0046196514 | 0.0010606470 | **0.0056802984 / 0.50** |
| First-to-last provider-operation span | 58.143 s | 29.938 s | Single observations, not latency benchmarks |

All twelve OpenRouter charges were reported; unresolved/unknown OpenRouter reservations are zero. Rejected local outputs are included in charges. Tavily dollar billing is **unknown**, not zero; its two credits are separate. Unused monetary allowance is US$0.4943197016, but **zero fresh attempts/searches remain**, and no further live activity is authorised under this task.

## Verification and artifacts

Post-repair: **938 Node tests**, application TypeScript, strict affected-module TypeScript, production build and `git diff --check` passed. Numerical-model interfaces were unchanged; standalone six CLI commands and GIS were not rerun. No GIS/Shapely pass is claimed.

Ignored, task-specific artifacts are under `tmp/phase4c-live/`. Safe diagnostics: `preflight.json`, `pricing.json`, `ledger.jsonl`, `ledger.json`, `run1-audit.json`, `run2-failure.json`, red/green logs, regression/build logs and worktree inventory. The accepted raw world remains exclusively in its existing protected server journal/store.

Visually inspected live screenshots:

- [Test 1 environment inspector](../tmp/phase4c-live/run1-platform-1440.png), [partial Report](../tmp/phase4c-live/run1-report-1920.png).
- [Graph](../tmp/phase4c-live/run1-graph-1920.png), [drag](../tmp/phase4c-live/run1-drag-1920.png), [settled](../tmp/phase4c-live/run1-settled-1920.png).
- [Agent](../tmp/phase4c-live/run1-agent-1920.png), [relationship](../tmp/phase4c-live/run1-relationship-1920.png), [restored Report](../tmp/phase4c-live/run1-restored-report-1920.png).
- [Test 2 failed Map](../tmp/phase4c-live/run2-failed-map-1440.png), [empty graph](../tmp/phase4c-live/run2-empty-graph-1920.png), [failure Report](../tmp/phase4c-live/run2-failed-report-1920.png).

Additional corresponding desktop-size captures and separately labelled `mock-after-repair-*` screenshots are in that directory. No private-message screenshot exists or is claimed.

## Remaining blockers and smallest next action

**FAIL remains the real-provider acceptance result.** Neither run completed eight accepted social decisions or demonstrated live private-group behaviour. The offline repair is not proof that Test 1's exact rejection is resolved. The revised social schema still needs real-provider validation.

Next, constrain the planner's scope/jurisdiction relationship during generation to match its existing validator, with offline local/cross-border fixtures and preserved historical identities. Also make scenario-relevant communication intent explicit and validated without forcing named platforms or fictional groups into every question. The current optional ontology selection does not guarantee that private messaging is exercised. After those offline repairs, a separately authorised acceptance can test both the social schema and actual group behaviour. No third attempt was made here.

## Files changed by this task

- `scripts/testing/phase4c-live-guard.mjs`
- `scripts/testing/phase4c-private-audit.ts`
- `lib/contracts/tests/phase4c-live-guard.test.ts`
- `lib/contracts/tests/social-schema-targets.test.ts`
- `lib/society/decision-schema.ts`
- `lib/society/communication.ts`
- `lib/society/decision-contract.ts`
- `lib/society/hybrid.ts`
- `lib/server/inference/deepseek.ts`
- `lib/server/society/summary.ts`
- `docs/PHASE4C_TWO_RUN_LIVE_ACCEPTANCE.md`
- `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`

The earlier Phase 4C files remain pending and preserved; their original inventory is in the implementation report. Temporary numeric schema-size logging in the public integration test was removed. Historical acceptance reports and accepted hashes were not rewritten. Task-owned real and mock servers were stopped after inspection.
