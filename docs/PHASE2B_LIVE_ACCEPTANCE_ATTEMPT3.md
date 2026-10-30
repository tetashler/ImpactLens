# Phase 2B live acceptance — attempt 3

**FAIL — The single live attempt failed ontology relationship-reference validation before agent execution.** No additional Explore attempt or paid retry occurred, and no application change was made to force acceptance.

## Environment and preflight

- Date/time: **30 October 2026, 01:28:54.959–01:29:19.884 Asia/Singapore (UTC+08:00)**. UTC: 2026-10-29 17:28:54.959–17:29:19.884. Total browser-observed attempt duration **24.925 s**.
- Main `master`, actual HEAD `b80f9c6dc91f2235a52a90a56226c6d28aea7085`. Existing unstaged/uncommitted Phase 2B work was preserved. Hashes of all 46 existing changed/new maintained files were snapshotted before testing for the final preservation check.
- Production build on task-owned loopback port **3160**; fresh isolated browser context, **1440×900**, DPR 2. Same failed attempt inspected at **390×844** afterward. Existing browser storage/scenarios were not cleared.
- Offline preflight confirmed `lib/world-graph/attribution.ts`, the retained-unverified-candidate policy and plan marker in source **and compiled server chunks**. Existing typed rule/path and bounded retrieval failure diagnostics were active.
- Both server credentials were present, live inference enabled, and no mock switches, flexible-grounding fixture switch, inherited mock preload or substituted provider fetcher was active. No credential value, private prompt or raw provider body was printed. `.env.local` was not edited or displayed.
- Reviewed the actual application route, Tavily adapter, planner/action transport, engine and browser client. Bounds remained one Tavily search, one plan and at most eight actions; no retry, hidden second planner, evaluation or fallback. Fresh server/context had zero provider calls before Explore.
- Exact model **`deepseek/deepseek-v4-flash-0731`**, OpenRouter gateway, **DigitalOcean only**, fallbacks disabled, `require_parameters:true`, reasoning disabled/excluded. Strict model/provider identity and JSON/runtime validation remained enabled.
- Existing deadlines unchanged: Tavily **10 s**, planner **45 s**, each action **30 s**, overall **120 s**. Existing four-agent/two-round/eight-action and soft-cost controls unchanged.
- Ordinary Map → enter question → **Explore** submitted exactly one `/api/scenario-simulate` POST. No preliminary provider connectivity test was made. A passive Undici subscriber recorded genuine request counts, HTTP status and timing without modifying requests/responses or reading headers/prompts/bodies. It was not a mocked provider preload or response interceptor.

## Exact question

> What if Singapore introduces a nationwide four-day workweek instead of the traditional five-day workweek? How would this affect employees, businesses, productivity, wages, and the wider Singapore economy?

No geometry was supplied.

## Checkpoints

| Checkpoint | Result | Evidence / limitation |
|---|---|---|
| A — Real Tavily | **PARTIAL** | One request, HTTP **200**, status **retrieved**, **5 usable source candidates**, **3,499 ms**, **1 reported credit**. The safe failed-plan envelope retains counts/status, not source titles, URLs, excerpts or source retrieval/publication timestamps. Relevant source content therefore cannot be independently inspected from this result; source-quality PASS is not claimed. |
| B — Real DeepSeek planning | **FAIL** | One completion, exact requested/serving model and verified **DigitalOcean** identity from completion metadata. HTTP **200**, normal `stop`/native `stop`, valid JSON, **20,940 ms**. Authoritative validation rejected the ninth ontology relationship's source endpoint. No accepted version-2 plan or plan ID was created. |
| C — Real agent execution | **NOT REACHED** | **0 action calls; 0/8 accepted actions; 0 rejected action completions; 0 executed rounds.** There are no role/event IDs or inter-agent references to inspect. No scripted/fabricated substitute or retry occurred. |
| D — Primary world graph | **NOT REACHED** | The real Graph UI correctly showed the planning-failure empty state: **0 world entities, 0 fictional agents, 0 total nodes, 0 relationships**, no dynamic types, and no technical fallback records or unrelated graph. Live graph physics/search/filtering/position retention could not be assessed without accepted entities. |
| E — Provenance inspectors | **NOT REACHED** | No accepted entity, fictional role, proposed relationship, accepted interaction or source association was available for inspection. No inspector finding or screenshot is fabricated. |
| F — Report | **PARTIAL** | The Report matched the question and recorded charges and clearly displayed **Preparation summary · Not simulated**. No invented events, stakeholder behaviour or economic measurements appeared. A complete report's chronology, demographic grounding and source inventory could not be checked. |

## Exact safe rejection

```json
{
  "stage": "ontology",
  "category": "reference",
  "rule": "ontology.relationship_endpoint_unknown",
  "path": "draft.ontology.relationships[8].source",
  "expected": "declared-reference",
  "actualKind": "string"
}
```

API result: HTTP **502**, `kind: planning-failed`, public code **AI_PLAN_INVALID**, stage diagnostic `planning / invalid-output / 20944 ms`. The failed planner record preserved the same `plannerValidation` object and `errorCode: AI_PLAN_INVALID`.

Read-only source inspection confirms `lib/world-graph/ontology.ts` checks each relationship's `source` and `target` against the union of **declared ontology entity IDs and active agent IDs**. The source of the ninth relationship was absent from that set. Its actual value is not retained, so it cannot be attributed to a typo, a top-level entity/jurisdiction/type ID, an alias, or any particular organisation. Nothing was silently renamed or repaired.

This is a **different rejection from attempt 2**. It was not `ontology.source_quote_entity_mismatch`, malformed JSON, timeout, incomplete termination, token exhaustion or provider mismatch. The flexible-grounding code was active, but this failure envelope does **not** establish whether the candidate contained any unmatched entity quotations or would have required the immutable attribution-policy marker. That marker is constructed only after complete draft acceptance. Full real-provider acceptance of the flexible-grounding pathway remains unproven.

## Safe identities

- Attempt: `attempt-4-26375ae9-0bf0-45f1-b6a7-1f1d527ef87e`.
- Request: `dynamic-request-a89645acb8c447318e6fa26e78affb1545fe50a5889d468f98ecd483e9365245`.
- OpenRouter generation: `gen-1793294939-XXJxtI2gfkvzIqRB8EYA`.
- Grounding bundle: `g1_8cdba5b778be5265`.
- **No accepted plan ID or simulation run ID exists.** These are failed-attempt diagnostics, not a completed experiment.

The retained bundle identity is a content identifier, not independent verification or a claim that a historical source snapshot was replayed. Passive counters confirm a new real Tavily request occurred in this attempt.

## Actual request, usage and cost accounting

| Measurement | Recorded value |
|---|---:|
| Tavily search requests | **1** |
| Tavily application retrieval duration | **3,499 ms** |
| Tavily network body completion | **3,429 ms** |
| Usable source candidates | **5** |
| Tavily credits | **1**, reported |
| Tavily USD charge | **Unknown** |
| OpenRouter planning completions | **1** |
| OpenRouter agent-action completions | **0** |
| Generation-identity lookups | **0** — completion metadata was sufficient |
| Additional evaluations / retries | **0 / 0** |
| Planning input tokens | **2,151** |
| Planning output tokens | **4,164** of 6,000 allowed |
| Total tokens | **6,315** |
| Reasoning tokens | **0** |
| Planning call-record duration | **20,940 ms** |
| Finish / native finish | **stop / stop** |
| JSON / authoritative plan validation | **Valid / rejected** |
| OpenRouter reported charge | **US$0.001247001** |
| Combined services USD charge | **Unknown** — Tavily's USD charge was not reported |

Passive outbound counters and application accounting agree: exactly one search and one completion, within the authorised maximum. No provider requests occurred during later Map/Graph/Report inspection. No configured deadline was reached. No unknown bill is treated as zero. The existing soft run-cost threshold was not treated as a guaranteed prepaid cap.

## Graph and evidence inventory

There is no accepted list/count of proposed ontology types, entities, relationships, four generated roles, null-support fields or source-associated/candidate entities. Those values are **unavailable**, not inferred from the rejected candidate. Visible node/edge counts are zero because no plan was accepted; that does not imply there are no relevant real-world entities.

No evidence was promoted into verified identity, no candidate quotation was displayed as confirmed support, and no synthetic event was fabricated. Positive source-inspector, demographic-profile, relationship-provenance and actual-interaction checks were not reached. The original retrieval excerpt body was not fetched again or saved for investigation.

## Browser observations and screenshots

Actual production UI with real configured providers, no fixtures. Map remained visible while Explore ran. Map/Graph/Report navigation worked; one MapLibre canvas remained mounted. At 390×844, Map diagnostics and the failed Report had no horizontal overflow. There were zero browser page errors; the sole console error was the expected failed scenario POST's HTTP 502. Graph and Report clearly represented a failed, unexecuted scenario. No unrelated archived run was substituted. Existing user storage was untouched.

Screenshots captured for **this actual attempt**, and opened for visual inspection, under ignored local `tmp/phase2b-live-attempt3/`:

- `map-planning-failed.png` — desktop Map with exact structural diagnostic and retrieval counts.
- `graph-not-generated.png` — explicit no-world-entities planning-failure state.
- `report-not-simulated.png` — actual question, Not simulated status and recorded token/cost data.
- `report-mobile.png` — the same failure summary at mobile width.
- `map-mobile-diagnostics.png` — the same rule/path and retrieval metadata on mobile.

There are no accepted-run graph/inspector/drag screenshots because those checkpoints were not reached. No mocked image is substituted. Safe counters and failed-attempt metadata are in ignored `network.json` and `result.json` in that directory; they contain no credentials, private prompts, raw Tavily passages or complete provider bodies. The owned server was stopped after verification.

## Preservation and next action

The only maintained addition for this attempt is this report. All prior changed/new maintained files were hash-checked against the offline preflight; application, validator, provider configuration, timeout, schema, datasets and historical reports were not edited. `.env.local` was unchanged. No dependency installation, Git mutation, secondary-directory access or deployment occurred; work remains unstaged/uncommitted. Historical 847-test/mock/build/CLI results were not rerun or presented as current live success.

**FAIL — Phase 2B live end-to-end acceptance remains incomplete.** The next smallest step is an **offline** reproduction/audit of ontology endpoint generation and its allowed namespaces, then a targeted generation-side constraint if justified. Preserve strict rejection and do not invent or remap missing endpoints. This result does not identify the actual undeclared ID or authorise another live retry.
