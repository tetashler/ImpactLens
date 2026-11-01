# Hybrid MRT interpretation handoff repair — offline acceptance

## Scope and baseline

This task repairs the interpretation interface; it does not add a numerical domain model, change society capacity, run paid inference or replace a valid clarification with acceptance.

Repository: main `ImpactLens` worktree, branch `master`, HEAD `5399e12c065e46806785146c79b7131e0668ab99`. The starting worktree already contained 20 modified tracked files and 25 untracked files from the preceding implementation. Those changes were retained. The new task's evidence is isolated under ignored `tmp/hybrid-handoff-20261101/`.

The preceding [live acceptance report](CITIZEN_GROUNDED_MRT_V1_REAL_PROVIDER_ACCEPTANCE.md) remains unchanged. Its one paid attempt ended with a valid DeepSeek/DigitalOcean clarification before retrieval, planning, personality initialization or society genesis. Its closed authority is not reused here.

## Investigation and evidence limits

Confirmed source path: `components/workspace.tsx` constructs route/point selection and timing acknowledgements; `parseHybridExploreWire` validates the ordinary request envelope; `prepareHybridExplore` builds a server-owned geometry/catalogue context. In the original `hybrid-map-v1`, `modelContext` supplied the question, revision, plotted IDs, attachments and explicit anchors, but omitted the confirmed route/point selection, timing acknowledgements and an explicit capability description. Its deterministic vocabulary covered lines/routes but missed the previous question's “MRT connection”.

The prior saved public clarification asserted that no route choice or quantitative model was supplied. The UI had confirmed selection and the application had a limited static MRT/citizen-commute calculator. The omission is a confirmed interface weakness. It is not a proven unique cause of one stochastic model response; the original provider JSON was not retained and no live ablation was performed.

## Narrow, versioned implementation

Current Workspace submissions explicitly select `hybrid-map-v2` inside the existing ID-only Explore options. Absence of that selector retains the original v1 path. Unknown selectors fail closed. The existing citizen execution bundle, planner contracts, capacities, clocks, availability, issue/memory policies, numerical routing and dataset identities are unchanged.

New `lib/interventions/handoff.ts` constructs a bounded server-owned context. It first proves the base came from the original validated-context factory, reparses options and checks service date and anchor identity. It independently verifies the selected line, complete attached-dot order, ambiguous/coincident projections, exact served catalogue anchors and finite acknowledged timing assumptions. The unchanged `buildPlottedMrt` adapter rechecks connectivity and timing constraints. Browser acknowledgements indicate acceptance of assumptions; they do not prove engineering feasibility or certify when a person read them.

The model receives the exact original question and geometry revision plus `confirmedSelection`, catalogue date/SHA identity and the capability manifest. Coordinates and network edits remain server-owned. No citizen dataset, private employment profile, personality, memory or conversation enters interpretation context. The existing 24 KB context and 6 KB output bounds remain binding.

The v2 response contract is `hybrid_intervention_intent_v2`, with the original finite geometry-ID fields and a new context binding key. Strict parsing rejects unsupported fields, malformed arrays, invented/omitted/reordered stops, mismatched selection and stale keys. Provider routing, output/token bounds and no-retry behavior are unchanged.

`lib/interventions/handoff-contract.ts` defines the frozen proof and capability manifest. `lib/interventions/binding.ts` adds binding version 2 around the original v1 geometry binding. It retains the original v1 digest, original v2 result, selection/timings, catalogue identity, classification source and, for model interpretation, verified model/provider/generation identity plus canonical request and parsed-output hashes. The parsed-output hash is not described as a retained raw response-body hash. Both the original digest and outer v2 digest are checked asynchronously. Replay loads frozen proof; it performs no catalogue lookup, dataset download or inference.

The existing `lib/interventions/hybrid.ts` remains byte-identical to the starting worktree. In particular, old contexts, semantic selection and accepted-world interpretation are not retroactively changed.

## Deterministic classification and legitimate uncertainty

Confirmed, validated geometry plus an unambiguous proposed MRT line/route/connection/rail link can proceed directly to the static calculator without a semantic completion. Proposal words must describe the rail intervention, rather than merely mentioning new trains on an existing service. Explicit quoted or `#` route IDs and bounded route labels are checked against selection, including short IDs. A selected route may disambiguate multiple lines, but cannot override contradictory question text.

Missing dots, invalidated order, absent timing acknowledgements, disconnected proposals, contradictory infrastructure, negated construction and line removal/closure requests do not become new-line calculations. They require clarification or an existing bounded context-only outcome. The lexical rules are intentionally conservative, not a general natural-language understanding guarantee. Genuine semantic ambiguity may use the versioned model request; a valid model clarification remains terminal and starts no retrieval/planning/personality/social work. A repeated attempt is rejected by the existing durable claim.

Facilities remain location context only where no numerical model exists. A standalone MRT station marker has no inferred track connection, even near schematic service segments. No automatic station insertion or new healthcare simulator is introduced.

## Machine-readable capabilities

`illustrative-mrt-capabilities-v1` declares supported hypothetical network changes, deterministic station routing, static time comparison, synthetic citizen commute calculations and assumption-labelled aggregates, subject to validated dots/anchors and acknowledged seconds. Fictional stakeholder discussion is a separate qualitative capability.

It explicitly does not establish construction/engineering feasibility, guaranteed service connections, real future timetables, actual individuals' journeys, real residents' behavior forecasts, causal social effects or guaranteed improvement. The manifest is finite, strictly validated and included in immutable interpretation identity. The model cannot expand it.

## Regression coverage and review

New production-path regressions use the exact previously submitted three-dot scenario: geometry revision 12, NS4 `(1.38517205, 103.744369)` → intermediate dot `(1.39916, 103.819839)` → NE16 `(1.39152768, 103.895416)`, original route/point IDs and exact question, with 600/30/150/180 running/dwell/wait/transfer seconds. This public scenario input is retained independently of any synthetic provider response. It reaches valid MRT interpretation and the actual 10,000-citizen static calculation without an interpretation call.

Coverage includes natural wording equivalents, multiple routes, named-route contradiction, polyclinic/station-only context, missing/reversed stops, unconfirmed timings, invalid catalogue anchors, unknown policy/IDs, stale question/revision/geometry/timing identity, bounded capabilities, malformed model arrays, unavailable server trust, finite model output, model clarification without downstream dispatch, repeated attempts and existing storage admission. Model-context assertions exclude private citizen fields.

Ordinary mocked Explore coverage verifies planner v3, eight initial actions, one complete provider-personality fixture, frozen v2 citizen genesis, public Graph/Report grounding, exact genesis replay and materialized checkpoint restoration. A separate provider-serialization fixture validates accepted model interpretation provenance. These are synthetic capability fixtures, not evidence of genuine DeepSeek compliance or social intelligence.

Test-first evidence includes the original failure at the old strict options parser (`red.log`). Independent review found malformed empty-site arrays, insufficiently scoped new-line wording, negated/removal requests and short-ID route references; reproducing RED cases and corrected GREEN runs are retained. No existing privacy or replay assertion was lowered.

## Session storage capacity

Read-only inventory: 61 accepted archives, 63 social-session indexes and 63 journals, with the existing ceiling of 64. The prior report's 63/64 warning remains accurate. Its closed interpretation-only evaluation created one durable nested attempt claim, not a society archive, journal or session index. No abandoned social-session slot can be attributed to that clarification.

One future legitimate session can currently be admitted, subject to a fresh normal-user storage/ownership/capacity preflight and no competing allocation. A clarification claim is intentionally not removed or reusable. At 64 indexes, new Explore must fail before expenditure. No accepted record was deleted, archived away, rewritten or automatically excluded; capacity was not increased. The smallest next action is a fresh preflight before a separately authorized run. Broader archival/retention policy needs a separate explicit decision rather than irreversible cleanup here.

## Verification results

| Check | Executed result |
|---|---|
| Full absolute-URI network-blocked Node suite | PASS: 1,687/1,687; zero failures/skips/cancellations/TODOs. Final run 224.978 seconds. |
| Application TypeScript (`--incremental false`) | PASS. |
| Strict affected-module TypeScript | PASS. |
| Production build | PASS, 43.574 seconds; build ID `LdyBPEnIXzYHHpD78z3kz`. |
| Whitespace | PASS (`git -c core.safecrlf=false diff --check`). |
| Source fingerprint before/after final gates | Identical: `7c1369685621854211a07d15471ac3fff7c3619dc3463ccbbd79ce9f71c80cc1`. |
| Official/synthetic/transport identities | PASS: four pinned official CSVs/metadata, unchanged 10,000 IDs and snapshot/manifest hashes; 1,369 calibration checks passed, 34 unassessed, zero failed. |
| Build asset tracing | PASS: 25 traces and two relevant routes checked, required assets retained and protected runtime state excluded. |
| Historical strict replay/inventory | PASS: 20/20 qualifying worlds replay exactly; 148 original historical hashes unchanged. Inventory retains the one pinned experimental `SOCIAL_STALE` artifact as unresolved, not replay-PASS. |
| Desktop cohorts/viewports | PASS: standard 50/35/350 and 100/70/700 cohorts completed through tick 320; repaired UI-drawn MRT flow also passed 35/70 initialization, station/polyclinic/ambiguity, Graph/Report and restoration checks at both 1440x900 and 1920x1080. All inference was mocked. |
| New handoff positive checkpoint tail | PASS: four viewport-created v2 worlds replay exactly; four synthetic continuations each accept eight decisions and restore exactly from four checkpoint records plus four tail records. Personalities stay identical. An additional completed 350-record v2 MRT fixture passed strict full replay and checkpoint recovery in run 2. |
| Fourteen-row scheduler benchmark matrix | NOT RERUN in this task; scope justification below. |

Safe command results are retained in `tmp/hybrid-handoff-20261101/gates/verified/`, `dataset-verification.json`, `asset-verification.log`, and the task historical/desktop evidence. A preceding otherwise successful full run found a TypeScript-only missing dummy-key field in a new fixture; the fixture was corrected and both compiler gates plus the full suite rerun. No production validation was loosened.

The first full-suite attempt is retained as diagnostic evidence: 1,685 of 1,686 tests passed, with one paid-guard fixture correctly rejecting source changes made during review. It is not counted as final acceptance. Source edits were frozen before the fresh final gates.

The complete fourteen-row long-running scheduler benchmark matrix is not claimed as newly executed for this interface-only task. Its preceding accepted evidence remains historical evidence, not a fresh-source PASS. The clock, scheduler, capacity, memory, routines, storage/replay algorithms and provider admission limits are unchanged; a repeat of the approximately 35-minute matrix would not exercise the changed handoff. Focused production interpretation, current-context serialization, ordinary initialization, replay, privacy and affected desktop checks provide the relevant new coverage. Any omitted or incomplete check is listed explicitly in the final results.

### Desktop observations and audit repairs

The standard mocked Explore-to-completion observations were 85,293 ms for 50 agents and 259,951 ms for 100 agents. These are local mocked timings, not real-provider latency estimates. Both standard suites passed their lifecycle, graph interaction, saved restoration, console/page-error, privacy and viewport checks. The 100-agent browser RPC exceeded the tool's 300-second response window; the same still-running test later returned PASS within its unchanged 600-second fixture limit. Its result was retrieved without restarting the fixture.

All four repaired plotting cases used actual UI mouse drawing, actual local catalogue stations and explicit UI confirmations, not injected accepted interpretations. Each generated the complete 35- or 70-profile mock roster once, made zero semantic calls for the clear MRT proposal, cancelled its bounded prefix, and restored matching aggregate Graph/Report results without new inference. Both screen sizes had `scrollWidth === innerWidth`; screenshots were inspected. Polyclinic and standalone-station cases remained bounded context; line-only drawings clarified and editing invalidated prior review.

One new desktop assertion initially failed because the **test observation allowlist** omitted the new public `interpretationPolicy` field. The persisted application DTO already had v2 and zero calls. The safe observation helper was extended to retain that public enum, and both cohorts/viewports passed without production edits or relaxed assertions.

The extra replay helper initially read the nonexistent transport `.usage` property; it was corrected to the existing `.record` return. A subsequent assertion wrongly required a materialized checkpoint on every early cancelled UI job. `coordinator.ts:28` deliberately checkpoints completed/paused multi-day jobs; early cancellation relies on its durable hash-chained journal. The audit now records that legitimate absence, still rejects an existing invalid checkpoint, and independently **requires** the new four-record checkpoint/four-record tail for every continuation. Failed helper logs/directories remain preserved. These were task-local audit repairs; application replay/storage rules were not changed.

Evidence: `desktop/cohort-50-result.json`, `desktop/cohort-100-result.json`, `desktop/hybrid50-final.json`, `desktop/hybrid100-final.json`, `handoff-restoration-run2.log`, `handoff-restoration-run3.log`, and `handoff-restoration.json`, all under the task evidence root. The earlier observation failure remains in `desktop/hybrid50-result.json`.

### Source locations

| Boundary | Current implementation |
|---|---|
| Current UI selector | `components/workspace.tsx:181` |
| Strict options and public metadata | `lib/interventions/explore-contract.ts:11`, `:22` |
| Server validation, classification, model parse/projection | `lib/interventions/handoff.ts:19`, `:78`, `:94`, `:106` |
| Frozen capability/proof validation | `lib/interventions/handoff-contract.ts:7`, `:17`, `:38` |
| v1/v2 parsing and nested/outer integrity | `lib/interventions/binding.ts:149`, `:206`, `:244` |
| Production orchestration and stage stopping | `lib/server/interventions/explore.ts:62` |
| Existing cancellation/checkpoint policy | `lib/server/society/coordinator.ts:28` (unchanged) |

## Preservation and paid accounting

PASS: all **931 protected pre-existing files** match their captured SHA-256 values, including prior reports, accepted/private/paid records and pinned data. The historical audit separately verifies all 148 original historical files. The six closed MRT paid-authority files and original claim remain preserved. Source comparison confirms the legacy interpreter is byte-identical and unrelated starting work was retained. Final audit evidence is `tmp/hybrid-handoff-20261101/preservation.json` and `final-audit.json`.

Both task mock servers are stopped and their ports released (`desktop/cohort-50/cleanup.json`, `desktop/cohort-100/cleanup.json`). Browser fixture contexts and the task-created tab are closed; the original blank tab remains. Ignored mock journals, checkpoint proofs, safe logs and screenshots are retained. No accepted evidence was deleted.

No real OpenRouter or Tavily request, paid evaluator, paid retry, real-task ledger arming or resumed paid evaluation is authorized or performed. Existing guard regressions exercise isolated fake ledgers only. Offline fixtures use intercepted requests under the absolute-URI network guard; dummy fixture keys never grant live dispatch. Previous authority remains closed partial with one interpretation completion and USD 0.000147322, zero unknown reservations and zero downstream calls. This task does not reopen that authority.

## Task-specific changed files

- `components/workspace.tsx`: explicit current v2 selector only.
- `lib/interventions/explore-contract.ts`: optional strict selector/public policy metadata; absence preserves v1.
- `lib/interventions/handoff.ts`: validated handoff, deterministic admission, finite v2 provider contract and adapter boundary.
- `lib/interventions/handoff-contract.ts`: browser-safe immutable capability/provenance proof.
- `lib/interventions/binding.ts`: explicit version-2 proof and nested/outer digest validation.
- `lib/server/interventions/explore.ts`: version-selected orchestration and immutable proof construction.
- `lib/contracts/tests/hybrid-handoff-v2.test.ts`: positive, negative, privacy and terminal regressions.
- `lib/contracts/tests/hybrid-explore-service.test.ts`: v2 provider serialization/provenance regression.
- `lib/contracts/tests/hybrid-public-explore.test.ts`: ordinary v2 genesis/replay/checkpoint/duplicate regression.
- `docs/superpowers/plans/2026-11-01-hybrid-handoff-repair.md`: scoped implementation/verification plan.
- This report and `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`.

The inventory is the new task delta, not a claim that all pre-existing unstaged files were created here. Ignored safe diagnostics, mock storage and screenshots are task evidence, not committed product assets.

## Readiness and remaining limits

**Offline handoff repair: PASS within the executed scope.** The exact earlier scenario now deterministically reaches a valid illustrative MRT interpretation and real local static calculations offline. The ordinary Explore path is ready for a **separately authorized live preflight**, not authorized to run now. The original closed ledger must not be reused; a fresh independent guard/proof must cover the current source and, if needed, the v2 semantic schema. No actual new DeepSeek compliance, personality generation or behavior is established by these mocked results.

**Storage: not currently blocking one fresh session**, with one unreserved slot remaining (63/64). Recheck immediately before any later dispatch; competing allocations can consume it. No cleanup or capacity increase was performed.

No future paid evaluation is initiated by this task. Separately authorized acceptance must recheck current build/source, storage capacity, provider identity, immutable selection and a new independent budget. The exact earlier proposal does not need a paid interpretation request under v2; it still needs genuine downstream planning/personality/social validation. Hypothetical numerical results retain static timetable, synthetic-workplace and geographic walking-proxy limitations. A present capability/profile in context does not prove substantive model use. Historical and privacy PASS statements apply only to the executed checks.
