# Phase 4E.2 planner reliability repair and offline acceptance

Date: 31 October 2026. Scope: planner source retention, bounded retrieval wording, and offline acceptance in the existing main worktree. This is a new repair record; the previous [Phase 4E.2 implementation and live acceptance report](PHASE4E2_MULTIDAY_SWARM_IMPLEMENTATION_AND_LIVE_ACCEPTANCE.md) and its failed real attempt remain historical evidence.

## 1. Executive verdict

The repair replaces model-authored condition quotations in ordinary staged entity planning with one required reference to the complete original question. The server resolves that reference and validates exact source equality under an explicit policy marker. This removes the model's need to copy selected question text. It guarantees complete source retention for accepted new plans, without claiming semantic extraction, comprehension, or obedience.

The retrieval change prefixes an applicable, uniquely resolved Sengkang query with `Sengkang Singapore: ` while retaining the original planner question. It changes search wording only. No real retrieval-quality improvement or DeepSeek reliability improvement has been measured.

**Final separate verdicts:** planner implementation **PASS**; offline planning acceptance **PASS**; historical compatibility **PASS within the approved 20-world qualifying scope**, with the pinned nonqualifying failure still unresolved; privacy **PASS within tested offline boundaries**; real-provider reliability **NOT TESTED**, with no new live authorisation. All required offline gates and final cleanup are complete. This is not a real-provider or semantic-comprehension PASS.

| Acceptance area | Current verdict |
|---|---|
| Focused offline contracts | **PASS: 148/148**, including all 45 new tests |
| Current wire boundary | **PASS: 15/15** |
| Ordinary mocked Sengkang integration | **PASS: 2/2**, positive and rejection paths |
| Final network-blocked Node suite | **PASS: 1,339/1,339** after the fixture-only review repair |
| Application/affected strict TypeScript, production build and whitespace | **PASS**, all final command exits zero |
| Final qualifying historical replay | **PASS: 20/20**, all 148 original hashes unchanged |
| Final 209-private-file / four-paid-file preservation | **PASS: 209/209 and 4/4 unchanged** |
| Fresh 14-row benchmark matrix | **PASS: 14/14**, exact replay/restoration, zero privacy leaks/paid calls |
| Both desktop cohorts at both required viewports | **PASS**, 350/700 mocked decisions at tick 320 |
| Extra full/checkpoint-tail replay of new v3 desktop worlds | **PASS: both worlds**, identities/source equality validated, three files unchanged per world |
| Offline planning acceptance | **PASS**, all required offline gates complete |
| Repaired real-provider reliability and real retrieval quality | **NOT TESTED**; no new paid authorisation |
| New paid attempts / OpenRouter completions / Tavily requests | **0 / 0 / 0** |

Mocked acceptance proves application contracts and exercised integration paths. It does not prove that DeepSeek will satisfy the new wire contract or use every retained condition correctly.

## 2. Baseline, ownership and evidence scope

Baseline branch/HEAD is `master` at `ff46ab24ad93bb9260cc4a94ee0111f2e83cf21d`. The existing main worktree already contained the prior Phase 4E.2 changes across 63 files; those changes were carried forward. This repair's inventory is measured against task-start file hashes, not against HEAD, so pre-existing work is not misrepresented as new repair work.

The [implementation plan](superpowers/plans/2026-10-31-phase4e2-planner-reliability.md) defines the minimal repair and offline gates. Task-local evidence is under `tmp/phase4e2-planner-repair/`. Before repair edits, `source-before.json` recorded 639 source/document paths, `private-before.json` recorded 209 private files, and `paid-before.json` recorded four closed paid-evidence files. These manifests contain file identities/hashes; private conversations, raw prompts, model response bodies and credentials are not reproduced here.

No Git mutation, package installation, deployment, credential change or new paid grant belongs to this task. Source changes remain unstaged and uncommitted. Final preservation and cleanup pass: `preservation.json` and `cleanup.json` under the task evidence directory record unchanged protected files, unchanged baseline HEAD, zero staged files and no task servers/browser pages.

## 3. Prior real attempt: established facts

The previous authorised Sengkang attempt remains **closed failed**. It made one successful Tavily search with five candidates and one reported credit, followed by one OpenRouter completion. Provider/model identity was verified as DigitalOcean / `deepseek/deepseek-v4-flash-0731`. Strict planning validation rejected `draft.userConditions[0]` with `plan.user_condition_not_verbatim`, surfaced as `AI_PLAN_INVALID` / HTTP 502.

Reported accounting was 2,967 input tokens, 2,032 output tokens, 4,999 total tokens and USD **0.000836689**, with zero final pending requests, unknown charges or outstanding reservations. Tavily dollar billing remains unknown. There was no accepted plan, run, society, stakeholder action or social-model completion. The original attempt allowance was consumed; unused numerical budget does not restore it.

The rejected condition text was **not retained**. Its exact wording, whether the discrepancy was punctuation, paraphrase, omission or another change, and the model's underlying reason cannot be recovered or inferred from the diagnostic. No reconstructed rejected text is used in this repair.

## 4. Diagnosis: confirmed, plausible and unresolved

| Classification | Finding |
|---|---|
| Confirmed | Legacy `userConditions` accepts optional selected quotations: at most four unique strings, each at most 300 UTF-16 units, each a literal substring of the question. An empty list is valid. It is not a complete-condition extraction contract. |
| Confirmed | The full original question is separately retained in the plan and passed downstream. The live error established a quotation-contract violation, without retaining its value. |
| Confirmed | Existing planner instructions already asked for verbatim quotations. The validator correctly rejects controlled non-verbatim examples. |
| Confirmed | The prior Sengkang retrieval used the whole question without an explicit Singapore anchor and returned weakly local, mostly overseas/general caregiving material. |
| Plausible engineering weakness | Asking a model to copy text exactly creates an avoidable generation failure point. A bounded server-owned reference removes this particular copying step. |
| Plausible retrieval weakness | Adding a justified locality/country anchor may make the intended geography clearer to search. This is a hypothesis, not an observed improvement. |
| Unresolved | The live rejected wording and deeper generation cause; whether missing geography caused the weak results; real-model compliance with v3; and semantic use of retained conditions. |

The repair addresses the avoidable source-copying interface rather than weakening validation or claiming the unknown live discrepancy has been diagnosed.

## 5. Options A–D and selected minimum

| Option | Approach | Decision and reason |
|---|---|---|
| A | Strengthen the prompt and continue generating quotation strings | Not selected. The prompt already required verbatim copying, and stronger wording supplies no deterministic source guarantee. |
| B | Deterministic candidate extraction/selection | **Selected in its minimal complete-source form.** One candidate covers the entire bounded question, avoids text generation and adds a small explicit contract. A partial candidate catalog could omit late, implicit, multilingual or repeated conditions and would not establish completeness. |
| C | Source-span offsets | Not selected. Model-authored offsets add Unicode and boundary failure modes and do not establish that all meaningful conditions were selected. |
| D | Semantic constraints linked to trusted source spans | Deferred. This is a materially larger representation requiring semantic definitions, conflict handling and evaluation beyond a quotation/retrieval reliability repair. |

Selecting the complete question is deliberately simple. No NLP expansion, general condition parser, new scenario engine or automatic repair/retry is introduced.

## 6. Exact source guarantee and its limit

`completeQuestionSource(question)` produces a versioned catalog containing only `question-1`, whose text is the complete original question. `dynamic_entities_v3` must return exactly `userConditionIds: ["question-1"]`. `resolveUserConditionIds` resolves it to:

```json
{
  "userConditions": ["<the entire original question, unchanged>"],
  "userConditionProvenance": {
    "version": 1,
    "policy": "complete-question-v1",
    "sourceId": "question-1"
  }
}
```

The placeholder above describes the stored value; it is not a model response or an alternative literal. Archive validation requires one condition string exactly equal to `request.question` plus the exact supported provenance shape. It does not trim, normalize Unicode, rewrite punctuation, collapse whitespace or choose repeated spans. The original nonempty 2,000-UTF-16-unit question bound remains in force.

For an accepted marked plan, every original character is retained, including a condition at the end of a long question. This is a source-coverage guarantee. It does not establish that all semantic constraints have been recognized, that assumptions do not conflict with them, or that later generated actions comply. Those remain separate evaluation concerns.

## 7. Versioning and historical compatibility

The staged entity wire name changes to `dynamic_entities_v3`; the relationship stage remains `dynamic_relationships_v2`. Resolved drafts use the optional `userConditionProvenance` marker with policy `complete-question-v1`. Existing plan versions are not globally reinterpreted or bulk migrated.

When that marker is absent, the original optional four-by-300 quotation contract, generated-text checks, serialized shape and hash identity remain unchanged. A fixed legacy plan/request hash regression confirms this boundary. New marked plans are hash-bound to their retained source/provenance; removing the marker from a plan cannot preserve its validated identity. Historical archives are neither rewritten nor supplied with guessed provenance.

The direct legacy provider entry point remains `dynamic_scenario_v2` and cannot inject the new application-owned marker. The relationship response accepts only its relationship-stage fields and cannot regenerate source text or provenance.

## 8. Trusted resolution, safety checks and context limits

The v3 response schema requires a singleton finite reference. Missing, empty, duplicate, unknown, wrong-type and offset selections fail. The parser rejects model-authored `userConditions`, provenance and offset fields before trusted resolution. No fallback to legacy empty quotations, model-output rewriting, automatic second dispatch or paid retry occurs.

Only the exact, validated, server-resolved source quotation is exempted from generated-prose URL/markup/numerical-content inspection. A user can therefore retain a URL, markup-like text or numerical hypothetical in the original question without asking the model to copy it. Description, assumptions, goals, other generated prose and legacy quotation strings retain their existing guards. This exemption is not a general permission for model-authored text.

The legacy direct-provider provenance-forgery regression first failed with a missing rejection and then passed after enforcing its original response fields. Safe diagnostics retain rule/path/type metadata, never the offending string. Accessors, sparse arrays and extra array properties are rejected without reading accessor bodies.

A later independent review found a fixture-only inconsistency: the current v3 offline response adapter retained a local jurisdiction registry ID such as `sg`, while the v3 provider schema requires `jurisdiction-1`. New raw-provider declaration/reference assertions in the Sengkang integration first failed on that mismatch. The current v3 fixture adapter now clones/remaps the matching local declared jurisdiction and its references in legacy top-level entities, agents and ontology entities. Null and unknown references remain intact, the v2 fixture helper retains its original behavior, and malformed arrays still reach their intended validation diagnostics. The positive wire fixture also uses the current v3 adapter. This corrects the offline provider fixture, not production parsing, model output or runtime policy.

Existing 48 KB draft and 130 KB plan limits remain. The duplicated source catalog does not silently truncate input: an oversized multibyte source-plus-retrieval context fails `AI_REQUEST_TOO_LARGE` before dispatch. Full source retention therefore does not imply that every otherwise valid maximum-length question combined with maximum retrieval context fits the provider request limit.

## 9. Bounded retrieval query construction

`buildRetrievalQuery` validates the complete original question before query compaction or truncation. For the uniquely resolved Sengkang scenario it prefixes `Sengkang Singapore: `. An explicit Singapore question can receive a country anchor without inventing a locality. Missing, ambiguous, malformed or nonmatching locality context does not create a locality anchor.

The helper inspects the complete source for recognized foreign countries and cross-border/international terms before choosing a local prefix, including geography beyond the old 500-unit cut. Its conservative lexical guard uses English region display names and a bounded set of abbreviations/terms. It is **not exhaustive geographic or semantic recognition**; aliases such as “Britain”, other languages and unstated foreign mechanisms are not generally solved. This accepted limitation does not justify expanding the repair into NLP.

Only retrieval construction changes. The planner's `request.question`, source catalog, stored plan question and execution question remain exact. Query whitespace is compacted, the result is bounded to 500 UTF-16 units without ending on a split surrogate pair, and the exact submitted query is stored in grounding. The request still uses one fixed-endpoint Tavily `basic` search with at most five candidates, unchanged timeout/accounting behavior and no retry or source-URL fetching.

## 10. Grounding and hypothetical truth boundaries

Source URL safety/canonicalization/deduplication, publication and retrieval dates, passage selection, citation substring validation, attribution and report projection validators are unchanged. No fabricated centre, official-domain allowlist, selected-source factual assertion or source-authority upgrade is added.

Offline fixtures cover Singapore official-domain background, general/overseas material, overseas-only results, no results, conflicting dated excerpts, unknown dates, duplicate URLs and invalid citation pairs. Official-domain ranking remains a presentation heuristic. A citation to background caregiving material does not establish a hypothetical Sengkang pilot or its effects. Conflicting source reports remain separate reports; missing publication dates remain unknown rather than borrowing retrieval time.

Exact source quotation establishes provenance, not truth, relevance or semantic entailment. Even a literal mention can be `source-reported` without becoming verified. A candidate that does not establish the entity mention stays `unverified-candidate`, and effective Report ontology drops unsupported attribution. No hypothetical pilot, institution action, measured impact or causal result is asserted as real.

## 11. Focused tests and repair evidence

The five new test files add **45 tests**: source contract 11, wire boundary 15, retrieval query 10, grounding context 7 and Sengkang integration 2. The focused selection passes **148/148**, with zero failures, cancellations, skips or TODOs, including a repeated pass after the fixture-only jurisdiction-schema correction. The earlier focused checkpoint took 1,953.3272 ms; the current fixture-schema rerun is recorded separately. Current wire tests pass **15/15**; the earlier 13-case boundary logs remain repair-history evidence, not the final count.

Coverage includes exact full-source retention, final conditions in 2,000-unit and multibyte questions, Unicode/whitespace/punctuation, URL-bearing source, legacy optional/partial quotations and fixed identities, malformed or forged selections, provider-forged provenance, relationship-stage immutability, safe diagnostics, request-size rejection before dispatch, geographic ambiguity, unchanged retrieval budgets and honest citation treatment. Existing provider/staged/diagnostic fixtures migrate only their current wire path to v3 and keep their negative assertions.

Evidence includes `focused-final.log`, `wire-final.log`, `wire-red.log`, `wire-green.log`, `legacy-boundary-red.log`, `legacy-boundary-green.log`, `sengkang-integration.log`, `fixture-schema-green.log` and `types-focused.log` in the task evidence directory. Focused strict TypeScript passed with observed exit zero; its empty success log alone is not treated as proof of that exit status. All prior negative assertions remain intact. Final full-suite/type/build/historical reconfirmation after the fixture-only correction passes as recorded in Sections 13 and 15; earlier successful gate results remain checkpoints.

## 12. Ordinary mocked Sengkang end-to-end path

The integration calls actual `handlePublicExplore`, using mocked retrieval and provider boundaries rather than bypassing ordinary planning. The positive path makes one mocked bounded search, accepts entity v3 and relationship v2 planning, then accepts all **eight initial actions**. It initializes the default **50 active / 35 LLM-capable / 320 ticks / 350 reasoning-capacity** society with profile `multi-day-50-320-v1`.

The stored accepted plan contains the exact original question, full-source quotation/provenance, exact submitted search query and dated retrieved passage. The execution input retains the original question. The public response remains summary-only and excludes tested raw planner/action/memory markers.

The paired invalid-reference case accepts one mocked entity-planning call record, rejects with `plan.user_condition_reference_invalid` / HTTP 502, makes **zero relationship or action calls**, and stores **no accepted execution or society**. Its public diagnostic omits tested question/source/key markers. Both paths pass, and both admit **zero social-provider calls**. Initialization is not a completed 320-tick social run; the full mocked matrix and desktop cohorts are separate gates.

## 13. Historical replay and unchanged classification

Final strict qualifying replay after the fixture-only correction **PASSES 20/20**: four Phase 4C/4D worlds plus 16 qualifying earlier swarm worlds. Genesis/round-trip and applicable checkpoint-tail reconstruction remain exact. All **148 original historical file hashes are unchanged**, the approved scope hash is verified, and this audit records **zero network attempts and zero provider calls**. Final evidence is `tmp/phase4e2-planner-repair/final-historical-replay.json` with `final-historical.log`. The earlier `historical-replay.json` / `historical.log` remain the successful pre-correction checkpoint. Final post-desktop preservation also passes all 209 task-start private files and four paid-evidence files.

The existing user-approved Option B classification remains unchanged. The pinned archive `f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json` stays a nonqualifying `pre-final-mocked-development-artifact` with unresolved `SOCIAL_STALE` at record 0/tick 1. Its original policy/source is unrecoverable. This repair neither resolves that failure nor guesses a preparation witness or accepted answer. Complete inventory must retain its identity, preservation and unresolved result separately.

The additional read-only replay of both newly created v3 desktop worlds **PASSES** full reconstruction, round-trip identity and checkpoint-tail equality. `validateDynamicPlan` confirms the recorded plan identity, supported source marker and exact original-question equality. Each world's archive, journal and checkpoint remain unchanged: **three of three files per world**. The audit records **zero network attempts and zero provider calls**. Evidence is `tmp/phase4e2-planner-repair/desktop-replay.json`.

| New v3 desktop world | Tick / decisions | Full replay ms | Checkpoint-tail ms | Exact full / round-trip / tail | Preserved files |
|---|---:|---:|---:|---|---:|
| 50 active | 320 / 350 | 24,257.2647 | 3,277.4215 | All true | 3 / 3 |
| 100 active | 320 / 700 | 131,288.9005 | 6,182.1481 | All true | 3 / 3 |

These timing fields exclude the separate round-trip-validation overhead. A temporary audit import typo was corrected before any replay; that audit setup correction changed no application source or recorded evidence and is not a runtime repair. Final `final-scope.json` verifies the seven pinned scope evidence files, unchanged scope manifest hash `0b0a6a7428b1563ffcee936973211089aca5348d79682f6000c73b60cd340b10`, final build and source fingerprint.

## 14. Privacy and immutability

Final post-desktop `tmp/phase4e2-planner-repair/preservation.json` confirms **209/209 task-start private files and 4/4 closed paid-evidence files unchanged**. It also verifies the original roadmap's **145,559-byte prefix** unchanged. The additional new-world audit separately preserves all three accepted archive/journal/checkpoint files for each desktop world. No raw private file content is needed for this report; previous manifests, user research and acceptance reports remain unchanged.

Focused tests confirm safe diagnostic serialization and summary-only public boundaries for exercised successful/rejected planning paths. The completed 14-row benchmark records zero privacy leaks and zero paid calls in every row. Desktop checks cover **93/276 inspected API payloads** for the 50/100 cohorts and report zero tested sentinel leaks/private shapes in client and restored surfaces, with zero page/console errors. Extra post-desktop replay, preservation and cleanup all pass. The privacy verdict is **PASS within these tested offline boundaries**, not a claim about real conversations in a society that never started in the earlier failed attempt.

## 15. Full Node, TypeScript, build and whitespace gates

The final network-blocked full suite after the fixture-only jurisdiction-schema correction passes **1,339/1,339** in **150,104.8306 ms**, with zero failures, cancellations, skips or TODOs and command exit zero observed by the root task. Evidence is `tmp/phase4e2-planner-repair/final-tests.log`. The previous report's 1,294-test total remains its historical checkpoint; the 45 new tests account for the current increase.

Final application TypeScript, full affected strict TypeScript, production build and whitespace verification all pass with command exits zero observed by the root task. Logs are `final-ts-app.log`, `final-ts-strict.log`, `final-build.log` and `final-diff-check.log`; `final-build-identity.json` retains final build **`VXFvUoXc0riShnD7oD7tX`** and source fingerprint **`86886743cb6e3dc9876009a36f85d142225d7b87b939a21f9b40eef74e78d601`**.

The earlier full-suite checkpoint passed 1,339 tests in 171,823.6714 ms with successful type/build/whitespace checks, build `_Rgnrgdwot6uSLBY5vkIx` and fingerprint `3ffcf22d4f2031a6ce1354941d7d97366722e67442039e321c1f21853a723f48`. Its logs remain separate pre-correction evidence; it is not substituted for the completed final rerun. Production runtime source was unchanged by the fixture-only correction.

## 16. Fourteen-row benchmark and graph/node results

Fresh serial execution of all **14 existing benchmark rows PASSES**, with command exit zero. Measured evidence is `tmp/phase4e2-planner-repair/benchmarks.json`. Every row reaches its recorded horizon, reports exact full replay and exact checkpoint-assisted/cold restoration, records **zero privacy leaks and zero paid calls**, and keeps provider concurrency at **one**. No benchmark configuration, scheduler, social profile, capacity policy, provider/model or node-count target changed in this repair. The benchmark dependency tree does not import the three files changed by the late fixture-only jurisdiction-schema correction, so its completed measurements remain applicable.

The rows below are **scripted mocked-gateway capability checks**. “Accepted” includes inactive choices; participant counts are agents with accepted decisions, not a claim of voluntary real-model participation. Replies, depth, memory selections and graph edges are produced by recorded fixtures and application reducers. They do not establish DeepSeek dialogue quality, semantic condition use or real-provider reliability.

| Row | Active / capable | Tick / horizon | Capacity / grant | Accepted (inactive) | Participants / capable | Early / middle / late | Peer replies / depth | Graph nodes / edges |
|---|---:|---:|---:|---:|---:|---|---:|---:|
| historical | 24 / 4 | 80 / 80 | 8 / 8 | 8 (0) | 4 / 4 | 3 / 3 / 2 | 3 / 5 | 30 / 187 |
| quick-50 | 50 / 35 | 80 / 80 | 64 / 64 | 64 (0) | 35 / 35 | 24 / 22 / 18 | 57 / 9 | 57 / 442 |
| quick-100 | 100 / 70 | 80 / 80 | 128 / 128 | 128 (0) | 70 / 70 | 48 / 44 / 36 | 120 / 9 | 107 / 882 |
| deep-50-80 | 50 / 35 | 80 / 80 | 350 / 350 | 350 (0) | 35 / 35 | 123 / 118 / 109 | 331 / 16 | 57 / 487 |
| deep-100-80 | 100 / 70 | 80 / 80 | 700 / 700 | 700 (0) | 70 / 70 | 245 / 237 / 218 | 686 / 22 | 107 / 1065 |
| multi-50-160 | 50 / 35 | 160 / 160 | 350 / 350 | 347 (0) | 35 / 35 | 118 / 115 / 114 | 331 / 15 | 57 / 502 |
| multi-100-160 | 100 / 70 | 160 / 160 | 700 / 700 | 695 (0) | 70 / 70 | 241 / 225 / 229 | 672 / 22 | 107 / 1034 |
| multi-50-320 | 50 / 35 | 320 / 320 | 350 / 350 | 350 (0) | 35 / 35 | 119 / 117 / 114 | 332 / 17 | 57 / 470 |
| multi-100-320 | 100 / 70 | 320 / 320 | 700 / 700 | 700 (0) | 70 / 70 | 240 / 231 / 229 | 688 / 20 | 107 / 1041 |
| stress-50-672 | 50 / 35 | 672 / 672 | 350 / 350 | 350 (0) | 35 / 35 | 120 / 116 / 114 | 334 / 17 | 57 / 469 |
| stress-100-672 | 100 / 70 | 672 / 672 | 700 / 700 | 700 (0) | 70 / 70 | 239 / 232 / 229 | 686 / 22 | 107 / 1002 |
| grant-70-320 | 50 / 35 | 320 / 320 | 350 / 70 | 70 (0) | 26 / 35 | 28 / 21 / 21 | 61 / 9 | 57 / 426 |
| grant-128-320 | 100 / 70 | 320 / 320 | 700 / 128 | 128 (0) | 34 / 70 | 52 / 37 / 39 | 118 / 13 | 107 / 839 |
| quiet-50-320 | 50 / 35 | 320 / 320 | 350 / 350 | 180 (180) | 35 / 35 | 117 / 57 / 6 | 0 / 1 | 57 / 395 |

Both 320-tick full-grant cohorts accept **350/700** mocked decisions across all **35/70** capable agents and end at Day 4 16:00. Both 672-tick stress cohorts also reach 350/700, at Day 8 08:00. The 160-tick rows naturally finish **347/695**; unused capacity is not fabricated. The 70-grant/350-capacity row spreads its 70 decisions **28/21/21** across the three measured periods and reaches **26 of 35** capable agents. The quiet row accepts **180 inactive decisions**, produces **zero model-authored items**, and leaves **170** calls unused.

| Row | Elapsed s | Service-work s | Full replay s | Restoration s | Journal MiB | Checkpoint MiB | Sampled RSS MiB |
|---|---:|---:|---:|---:|---:|---:|---:|
| historical | 2.039 | 0.748 | 0.429 | 0.481 | 16.25 | — | 194.84 |
| quick-50 | 10.833 | 4.014 | 3.038 | 3.251 | 2.28 | — | 277.60 |
| quick-100 | 43.585 | 17.587 | 12.073 | 12.735 | 4.56 | — | 280.25 |
| deep-50-80 | 76.889 | 38.579 | 25.929 | 3.180 | 17.14 | 8.70 | 317.47 |
| deep-100-80 | 337.135 | 169.241 | 140.232 | 7.180 | 34.34 | 18.31 | 571.25 |
| multi-50-160 | 102.476 | 54.195 | 32.988 | 3.755 | 17.67 | 9.23 | 934.44 |
| multi-100-160 | 328.791 | 170.919 | 130.516 | 6.643 | 35.07 | 18.76 | 775.84 |
| multi-50-320 | 104.132 | 51.623 | 35.051 | 3.451 | 17.95 | 9.57 | 863.98 |
| multi-100-320 | 347.017 | 183.476 | 131.070 | 6.836 | 35.84 | 19.54 | 753.05 |
| stress-50-672 | 134.275 | 65.138 | 45.062 | 3.608 | 18.45 | 10.29 | 887.34 |
| stress-100-672 | 405.827 | 205.887 | 162.955 | 6.535 | 36.86 | 20.55 | 765.62 |
| grant-70-320 | 31.046 | 15.621 | 6.713 | 0.726 | 3.12 | 2.19 | 902.08 |
| grant-128-320 | 48.753 | 21.705 | 16.328 | 1.394 | 6.23 | 3.88 | 564.94 |
| quiet-50-320 | 44.871 | 21.092 | 13.791 | 1.262 | 6.54 | 3.22 | 593.52 |

Times are measured on the shared local host and rounded to three decimal seconds here; the evidence JSON retains exact millisecond values. **Elapsed** includes benchmark execution plus verification/replay/recovery. **Service-work** sums measured service intervals, including mocked gateway work, reducers and durable writes; it is not pure provider latency or browser Explore duration. **Restoration** is checkpoint-tail recovery where a checkpoint exists and cold reconstruction otherwise; a dash means no saved checkpoint file. RSS is sampled after service operations in the shared benchmark process, not an isolated per-run or continuous peak. These measurements do not demonstrate a performance improvement from the planner repair.

The 320-tick 50/100 rows measure **57/107 graph nodes** and **470/1,041 edges**, respectively; these are their actual fixture graphs, not required real-plan node counts. Their journals are **17.95/35.84 MiB**, with checkpoints **9.57/19.54 MiB**. Across all rows, supplied decision contexts stay within **eight item bodies / six memory references**, with maxima **14,057 wire bytes** and **20,399 internal canonical-context bytes**. The episodic-only reference counters are **167/485** for the 320-tick full-grant cohorts and **203/568** for the 672-tick cohorts. These count references actually supplied to scripted decision contexts, not distinct memories, demonstrated recall or substantive semantic use. Full artifact sizes, projection timings, per-agent participation, daily totals, memory counters and sampled heap values remain in the JSON.

## 17. Desktop cohorts and visual acceptance

Both fresh mocked desktop cohorts **PASS at 1440×900 and 1920×1080**. Evidence is `tmp/phase4e2-planner-repair/desktop/50/result.json` and `desktop/100/result.json`, with adjacent server preflight, mock ledger and **19 screenshots per cohort**. Both accept two planning stages and eight initial actions, reach tick 320 / Day 4 16:00, and accept all 350/700 scripted social decisions across all 35/70 capable agents.

| Cohort active / capable | Accepted decisions / agents | Explore-to-completion ms | Graph nodes / edges | Initially visible nodes / edges | Inspected API payloads | Page / console errors | Screenshots |
|---|---:|---:|---:|---:|---:|---:|---:|
| 50 / 35 | 350 / 35 | 63,454 | 64 / 542 | 30 / 149 | 93 | 0 / 0 | 19 |
| 100 / 70 | 700 / 70 | 255,193 | 114 / 1,066 | 30 / 129 | 276 | 0 / 0 | 19 |

The recorded `exploreToCompletionMs` values are local mocked browser-harness observations. The helper exercises lifecycle/reload/reconnection/cancel controls; its elapsed time is not a paid-provider latency measurement or a pure isolated engine benchmark. Initial click-to-canvas measures **390/1,574 ms** for the 50/100 cohorts. Warm Graph tab observations at 1440/1920 are **112/71 ms** for 50 and **415/355 ms** for 100; these are local canvas-readiness observations, not general rendering guarantees.

Both cohorts pass pause/resume/cancel, closing the browser while work continues, reconnection, saved restoration, entity-first Graph inspectors for institution/platform/group/agent/aggregate nodes, keyboard selection, hidden-agent search/filter restoration, neighbor focus, drag/settling and retained positions. Daily Report counts reconcile at both viewports. Provider summaries before and after saved restoration remain exactly **two planning / eight action / 350 or 700 social calls**, with no inference added by restoration. The harness's total two Explore requests include a separate mocked cancellation-control job; the completed primary cohort was not retried.

The 100-cohort browser-tool invocation timed out at its 300-second wrapper boundary. The same existing run and saved result completed successfully; no repeated primary Explore or paid call was used to obtain success. This wrapper observation is preserved separately from application success, the 600-second completion allowance and the measured 255.193-second completion field. Both task-owned mock servers are verified stopped. Final browser/context cleanup passes with zero owned task pages and browser-close confirmation of no open tabs.

API/client/restored checks report **zero sentinel leaks and zero private shapes** in the tested surfaces, with zero page and console errors. External basemap requests receive offline fixture tiles; no external tile request is dispatched. These mocked desktop checks do not establish real-provider behavior, live conversation privacy or real basemap availability.

The root task visually inspected [50-agent Graph at 1440×900](../tmp/phase4e2-planner-repair/desktop/50/cohort-50-graph-1440.png), [100-agent Graph at 1920×1080](../tmp/phase4e2-planner-repair/desktop/100/cohort-100-graph-1920.png) and [100-agent Report at 1920×1080](../tmp/phase4e2-planner-repair/desktop/100/cohort-100-report-1920.png). Dense central label overlap and dense Report layout remain existing accepted limitations; this task makes no visual redesign or general graph-performance claim. The prior report's screenshots/results remain unchanged. No mobile or real-provider desktop society is claimed. Extra read-only full/checkpoint-tail replay of both newly created desktop worlds passes as recorded in Section 13.

## 18. Remaining uncertainty and non-guarantees

The application now has a deterministic complete-source-retention contract. Semantic interpretation, conflict detection, condition compliance in plans/actions and real-provider v3 compliance remain unmeasured. The model can still reject or violate other unchanged schema, reference, scope or safety rules; no overall generation-success guarantee follows from fixing quotation selection.

The retrieval guard is lexical, English-oriented and bounded. Prefixing cannot ensure local results, official coverage, timeliness, relevance or causal evidence, and truncation can still omit later query wording. Original source retention is separate from search-query coverage. Maximum multibyte source plus retrieval context can fail the existing request-size limit safely before dispatch.

Real-model multi-day behaviour, sustained dialogue, long-term memory use, private coordination quality and voluntary social participation are **NOT TESTED** in this repair. Existing fictional/uncalibrated simulation limits and the pinned unresolved historical artifact remain. Mock completion counts are capability checks, never DeepSeek intelligence measurements.

## 19. Zero new paid activity and closed authorisation

This task performs **zero new paid attempts, zero OpenRouter completions, zero Tavily searches/credits, zero paid evaluator/summariser calls and zero automatic retries**. Its added provider/retrieval usage values are offline fixture data. They are not actual billed usage. The earlier USD 0.000836689 / one-credit attempt remains prior spend and is not rolled into a new authorisation.

The consumed ledger and original closed paid evidence are unchanged, confirmed by final **4/4 paid-evidence hash preservation**. The existing v2 live guard is deliberately left closed; migrating it or reusing its old readiness proof is not part of offline repair. A future v3 paid guard/admission proof and any real call require **fresh, separate explicit authorisation**. No unused budget, green offline test or readiness statement reopens the consumed attempt.

## 20. Exact repair inventory

Final task-start SHA-256 comparison identifies **21 actual repair source/document files: 12 modified, nine added and zero deleted**, recorded in `tmp/phase4e2-planner-repair/source-delta.json` and reconciled by `preservation.json`. This is the repair delta against the 639-path task-start source manifest; it is not the total existing dirty-worktree inventory. Comparison uses the same five roots: `app`, `components`, `docs`, `lib` and `scripts`. An earlier temporary broader-root enumeration was corrected only in ignored audit tooling to match that scope; no application or source repair resulted. Pre-existing unchanged files and ignored generated/evidence outputs are excluded. The former 63-file Phase 4E.2 inventory and user research remain carried forward.

| Status | Path | Purpose |
|---|---|---|
| Added | `docs/PHASE4E2_PLANNER_RELIABILITY_REPAIR_AND_OFFLINE_ACCEPTANCE.md` | This separate repair/evidence report |
| Modified, append only | `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md` | New repair status after the preserved prior live failure |
| Added | `docs/superpowers/plans/2026-10-31-phase4e2-planner-reliability.md` | Architecture, contract and acceptance plan |
| Added | `lib/dynamic-scenarios/user-condition-source.ts` | Complete-source catalog, trusted resolution and archive validation |
| Modified | `lib/dynamic-scenarios/plan.ts` | Explicit marker contract and source-only inspection exception |
| Modified | `lib/dynamic-scenarios/diagnostics.ts` | Safe source-reference diagnostic rule |
| Modified | `lib/server/inference/planner.ts` | Entity v3 wire and strict direct-provider boundary |
| Added | `lib/server/evidence/retrieval-query.ts` | Bounded conservative locality/country query helper |
| Modified | `lib/server/inference/dynamic-service.ts` | Query-only retrieval integration |
| Added | `lib/contracts/tests/planner-condition-source.test.ts` | Source, safety, legacy and identity regressions |
| Added | `lib/contracts/tests/planner-condition-wire.test.ts` | Real parser/transport boundary and no-dispatch limits |
| Added | `lib/contracts/tests/planner-sengkang-integration.test.ts` | Ordinary mocked positive and fail-closed Explore paths |
| Added | `lib/contracts/tests/retrieval-query.test.ts` | Query geography, bounds and submitted-query tests |
| Added | `lib/contracts/tests/planner-grounding-context.test.ts` | Grounding provenance and hypothetical truth boundaries |
| Modified | `lib/contracts/tests/helpers/dynamic-provider.ts` | Current mock v3 responses |
| Modified | `lib/contracts/tests/dynamic-provider.test.ts` | Current wire fixture migration |
| Modified | `lib/contracts/tests/staged-planner.test.ts` | Staged fixture migration with existing negatives retained |
| Modified | `lib/contracts/tests/planner-validation-diagnostics.test.ts` | Current wire diagnostic fixture migration |
| Modified | `scripts/testing/entity-declaration-fixture.ts` | Separate v3 reference/local-jurisdiction fixture; legacy helper and invalid references retained |
| Modified | `scripts/testing/phase4e2-provider-preload.mjs` | Existing offline desktop/benchmark provider v3 preload |
| Modified | `scripts/testing/tsconfig.phase4d.json` | Include new tests in affected strict TypeScript gate |

No accepted artifact, private conversation, historical scope manifest, old acceptance report, paid ledger or consumed live guard is part of the repair delta.

## 21. Readiness and final evidence handoff

All required offline work is complete: implementation and focused/ordinary mocked integration, final post-fixture full Node suite, type/build/whitespace, qualifying historical replay, all 14 benchmarks, both desktop cohorts, extra replay of both new v3 worlds and final preservation pass. Final `tmp/phase4e2-planner-repair/cleanup.json` records `master` at unchanged HEAD `ff46ab24ad93bb9260cc4a94ee0111f2e83cf21d`, **zero staged files, zero task servers, zero task-port listeners on 3200/3201 and zero task browser pages**. Browser-close evidence confirms no open tabs. Changes remain unstaged and uncommitted.

Final independent verdicts are **planner implementation PASS**, **offline planning acceptance PASS**, **historical compatibility PASS within the approved 20-world qualifying scope** with the nonqualifying `SOCIAL_STALE` failure still unresolved, **privacy PASS within tested offline boundaries**, and **real-provider reliability NOT TESTED**. The concrete repair and evidence are ready for review. There is no overall real-provider, grounding-quality or semantic-comprehension PASS.

**Real-provider reliability remains NOT TESTED, with zero new paid activity and no authorisation for another live attempt.** The previous real planning acceptance remains FAIL and its behaviour remains NOT OBSERVED. A future v3 guard/test needs separate explicit authorisation; the consumed v2 guard remains closed and its ledger unchanged. No subsequent phase, live retry, paid guard migration or accepted-run resume starts automatically.
