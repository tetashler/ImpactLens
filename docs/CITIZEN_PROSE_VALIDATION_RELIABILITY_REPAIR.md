# Citizen prose validation reliability repair

Date: 1 November 2026. Offline implementation in the main worktree; no new paid authority or inference.

## Outcome and scope

Implemented `conversation-menu-v6` / `citizen-menu-v3`, with `citizen-prose-v1` rules and optional v2 structural rejection observations. Existing v4/v5 decoders, the original issue assessor and v1 diagnostic/sidecar modules remain unchanged. The new ordinary citizen-grounded Explore default selects v6; stored worlds retain their original selectors.

**Offline acceptance: PASS.** All 1,918 network-blocked tests, both TypeScript gates, production build, fourteen benchmark rows, both full v6 capacity fixtures, desktop cohorts/viewports, replay and preservation checks passed. The focused set contains 95 passing tests. No paid inference was performed.

Real DeepSeek prose compliance is **NOT TESTED**. These repairs and synthetic fixtures do not establish an improved live acceptance percentage.

## Baseline and evidence limitations

Repository: `C:/Users/tetas/OneDrive/Desktop/Kaplan/Hackathon/Hackathon2/ImpactLens`; branch `master`; HEAD `5399e12c065e46806785146c79b7131e0668ab99`. Prior dirty/untracked work was preserved. Final code fingerprint: `2d3f07713e5c4eca7ff0b183fac223bed29b1d2506ac5f522b757a8c4c2b6605`. Final build ID: `0N-9EBdu4_wc8t3Zr6DA4`. The earlier verified build used `975bfd03b21dff1564f2320c3a387f144ea870fc2fcf9a860f82afd0b55c095b`.

The prior v5 live evaluation returned 20 social completions: four accepted and sixteen rejected, with six `unsupported-number-or-unit` and ten `subject-language-unassessed` observations. It stopped at tick 14/320. All sixteen diagnostics matched failed contexts. They record first failing boundaries, not every possible defect in each response. The rejected bodies were deliberately not retained; this task neither reconstructs their wording nor attributes a specific phrase to them.

The prior accepted prefix, generated personalities, closed authority and reported US$0.0201464382 remain historical evidence. The earlier US$0.02 unknown reservation remains reserved. No previous authority is reopened or resumed.

## Confirmed source-level findings

| Finding | Evidence | Classification |
|---|---|---|
| V5 rejects ordinary `hours`, `minutes` and `second` regardless of measurable assertion | `decision-v5.ts` numeric regex; downstream `decision.ts` repeats the guard | Confirmed model-interface weakness |
| V5 issue creation requires eight words, particular openings and temporal vocabulary | `issues.ts:assessIssueEvidence`; `decision-v5.ts:span` | Confirmed model-interface weakness |
| A valid finite evidence ID does not by itself provide authored-language support | `buildCitizenEvidenceMenu` followed by the span assessor | Intentional provenance boundary; retained |
| Whole-message candidate matching can combine subject from one sentence with a different question | Synthetic production decoder controls | Confirmed precision weakness; v6 requires one qualifying sentence |
| Old resolution grammar can accept an affirmative span while ignoring later contrary wording | Synthetic two-sentence and negated-closure controls | Confirmed precision weakness; old semantics frozen, v6 strengthened |
| V1 observations share authoritative session file/byte admission | `rejection-observations.ts` and `inspectStorageAdmission` | Confirmed potential coupling; not an established cause of the live prose failures |

The retained live diagnostics cannot identify the exact failed word, sentence component or model intention. These findings are independently reproduced from source and labelled synthetic controls.

## Factual prose contract

`prose.ts:assessCitizenProse` distinguishes qualitative vocabulary from raw quantities and replacement personal attributes. Examples now accepted include qualitative working-hours concerns, transfers after work, a second opinion, one concern, double-checking, and minutes of a meeting.

Authoritative quantities and personal facts still come from selected `factIds`. The server appends exact values using the existing bounded factual suffix format. The model cannot supply a numerical saving, change its job/workplace/schedule or turn a source quote into a calculated outcome. Selecting a valid fact ID does not license an invented number in authored prose.

The new bounded checks reject Unicode numerals, number words outside declared qualitative idioms, implicit measured quantities such as an hour, modified quantities such as a single minute, fractions, percentage/count predictions, and quantitative operators such as halving. Measurement-pattern matches return structural diagnostics; they do not prove that a model statement was false.

Only exact station codes supplied in `proseReferences` can bypass numeric-token rejection as identifiers. Production `buildDecisionContext` derives these codes from immutable, validated hybrid-binding anchors. Question text and arbitrary browser flags are not allowlists. The exception does not permit a station code to substitute for an amount.

Direct personal assignment patterns require trusted rendering, including workplace, occupation, schedule, travel mode and analogous other-person assignments covered by the declared grammar. Qualitative feelings remain legal. Neither this lexical boundary nor a selected fact certifies arbitrary natural-language entailment.

Explicit attributed quotations require an exact **complete supplied item body**, accessible membership and an actual memory binding. Matching an interior substring is insufficient: it could remove negation or counterevidence. Source statements remain claims, not independently verified facts. A supplied body may itself be a bounded excerpt; exact quotation does not establish full-source entailment or semantic truth. Numerical source quotations are still unsupported in free prose; supported personal/calculated values use fact references.

## Issue evidence contract

`decision-v6.ts` rebuilds the finite eligible evidence menu using existing source, ownership, state and memory rules. V6 evidence IDs have a distinct version prefix and remain context-bound. No model-authored identifier, source, criterion or quotation is treated as authority.

`issue-prose.ts:findIssueProse` selects an actual trimmed authored sentence, up to 240 characters and at least four words. It does not combine separate sentences, invent text, rewrite a quote or silently downgrade an invalid issue to ordinary discussion. Subject relevance is checked against canonical subject words and bounded domain aliases. Practical question cues exclude the tested trivia/preference controls.

Natural requests such as “Could you explain the shift schedule?”, explicit dependencies such as “My participation depends on a workable shift schedule,” and reasoned disagreement are supported. A preferred outcome or generic comment is not automatically an issue. The finite option must still be deliberately selected.

Progress, resolution and withdrawal remain tied to the supplied own issue. Resolution additionally requires an explicit affirmative owned-status clause with a reason, no detected negative/modal marker anywhere in the message, and either an eligible newer accessible answer or the bound satisfied deterministic criterion. Owner-reported resolution remains labelled separately from deterministically evidenced satisfaction. A predicate-bearing condition still requires its exact declared condition; this preserves criterion meaning rather than guessing paraphrase equivalence.

These are conservative declared-language checks, labelled `semanticVerification: NOT_VERIFIED`. Keyword overlap alone is not presented as semantic proof or real-world problem solving.

## Model-facing and replay integration

The production v6 transport provides one coherent system prompt, finite schema and context: legal qualitative examples, factual rendering rules, natural issue requirements, stable evidence IDs and valid ordinary/read/inactive choices. Model/provider, 600-token response cap, concurrency, retry policy and 24KB context limit are unchanged.

`intelligence.ts` freezes the new policy pair. `decision-menu.ts` routes v6 explicitly; `hybrid.ts` reconstructs accepted decisions through the matching decoder and checks the exact rendered result. Tampered suffixes and quotations fail. Old v4/v5 code paths remain selected by old immutable inputs. No journal/hash-chain format, planner/personality contract, population, routing, pacing, tick length, storage admission algorithm or ST12/EP32 capacity changed.

The context-byte counter includes the new encoded context; it does not bypass existing packing limits. Citizen facts remain acting-agent-only. All numerical MRT results still originate in the existing deterministic calculator.

## Privacy-safe diagnostics

`social-diagnostics-v2.ts` adds a closed versioned vocabulary: quantity token/phrase, personal-reference requirement, source-attribution support, reserved factual rendering, missing/short authored span, missing subject token, unassessed action language, criterion mismatch and closure negative/modal marker. The latter describes an observed lexical marker rather than claiming a proven semantic contradiction.

V2 observations are optional, non-authoritative and separately serialized as `.rejections-v2`. They retain a context hash and finite structural fields only. No rejected body, hidden prompt, private profile, memory text or credential is retained. Observer throws, asynchronous rejection, contention, corruption or capacity failure do not alter acceptance, retry or usage accounting.

V6 does **not** automatically write observations inside session storage. A trusted dependency or server-only `SOCIAL_PROSE_OBSERVATION_ROOT` can opt into a pre-existing external directory. The sink refuses `session-store-v2`, `social-sessions` and `accepted-private` paths. One exclusive directory lock bounds storage to sixteen sidecars plus one lock, each sidecar at most 1 MiB and each row at most 1 KiB. A stale optional lock is not automatically reclaimed; missing observations never imply no rejection. No Windows security setting or ACL was changed.

Future live preflight must explicitly configure and verify this external sink if detailed diagnostics are required. Ordinary runs without opt-in retain their standard safe failure codes but do not gain persistent v2 observations.

## RED/GREEN and synthetic evaluation

Four desired-positive v5 controls failed before repair: qualitative hours, one concern, a second opinion and a natural practical question. The initial v6 production-path tests failed before the new policy existed. Further review produced RED controls for implicit quantities, unrelated/sentence-fused questions, negated/uncertain closures, personal assignments and attribution that removes source negation. Corresponding GREEN results are retained in the ignored task evidence directory.

The final focused set has **95 passing tests**. It exercises production decode/reconstruction, structured transport and routing, actual finite menu/schema, Unicode and ASCII Roman quantities, discourse and pronoun forms of “one”, percentages/fractions, actor facts, source access, suffix headroom, malformed input, ordinary/read/inactive choices, natural issue forms, explicit closure instructions, strict closures and diagnostic isolation/bounds.

Reusable evaluation: `scripts/testing/citizen-prose-evaluation.ts`. Both contracts receive the same public synthetic cases:

| Declared controls | V5 accepted / total | V6 accepted / total |
|---|---:|---:|
| Legitimate | 4 / 17 | 17 / 17 |
| Unsupported | 5 / 13 | 0 / 13 |
| Ambiguous formal issue | 0 / 3 | 0 / 3 |

The five previously accepted unsafe controls include unsupported personal assignments, an inflected quantitative operation and contradictory/negated closure. These are test examples, not evidence that the prior live world accepted those phrases. No historical decisions were reclassified or rewritten.

An early complete suite found one expected stale assertion for the former ordinary v5 default; that assertion was updated to require the new v6/v3 pair, while old-policy tests remain. Intermediate suite attempts during source refinement triggered strict source-fingerprint guards and were retained as failed/incomplete. They are not final acceptance evidence. No validator or test threshold was relaxed to conceal a failure.

The first browser receipt export attempted a dynamic import unsupported by the Playwright VM. Both 50-agent viewport cases had already completed successfully; their page-held result was recovered and saved without rerunning the workflow. The task-only export wrapper was corrected before the 100-agent run. This was a harness export error, with no production source change. Every browser case separately required at least two accepted mocked qualitative decisions before ordinary cancellation; the observed checkpoints each contained three accepted and zero rejected decisions.

## Complete offline verification

| Gate | Executed result |
|---|---|
| Final full blocked Node suite | PASS — 1,918 tests; zero failures/cancellations/skips |
| Application and strict TypeScript | PASS, final source |
| Production build | PASS; build ID `0N-9EBdu4_wc8t3Zr6DA4` |
| Asset tracing | PASS — 25 server traces; relocated sources in both required routes, zero private/retired paths |
| Dataset identity/calibration | PASS — four pinned Census snapshots, original 10,000 citizens, no failed calibration targets |
| Fourteen benchmark configurations | PASS — all exact full/checkpoint replay, serial mock inference and zero privacy leaks |
| V6 50/35/350 | PASS — tick 320, 350 accepted, zero rejected |
| V6 100/70/700 | PASS — tick 320, 700 accepted, zero rejected |
| Non-empty checkpoint-tail replay | PASS — both cohorts: checkpoint 4 + tail 4 accepted records |
| Ordinary Map → Explore | PASS — actual UI drawing/confirmation, both cohorts at 1440×900 and 1920×1080 |
| Graph/Report and saved restoration | PASS — same server-owned impact values; no regeneration on restoration |
| Historical qualifying set | PASS — 20 strict worlds; additional current namespace prefix also replayed |
| Complete historical inventory | One pinned nonqualifying `SOCIAL_STALE` artifact remains unresolved and visible |
| Original protected files | PASS — 10,251 exact original hashes, including source data, private history and paid evidence |
| Frozen legacy modules | PASS — 5 exact hashes, including v5/old issue/v1 diagnostics |
| Whitespace | PASS — `git diff --check`; new task files separately inspected |
| Task cleanup | PASS — both mock servers stopped; test-created contexts/pages closed |

Final gates are in `tmp/citizen-prose-repair-20261101/gates-complete/`; `source-before.json` and `source-after.json` match `2d3f07713e5c4eca7ff0b183fac223bed29b1d2506ac5f522b757a8c4c2b6605`. The final suite follows all implementation changes. Earlier failing/incomplete runs remain retained and are not counted as acceptance.

| Benchmark | Active / capable | Ticks | Grant / capacity | Accepted | Full / checkpoint replay |
|---|---:|---:|---:|---:|---|
| historical | 24 / 4 | 80 / 80 | 8 / 8 | 8 | Exact / exact |
| quick-50 | 50 / 35 | 80 / 80 | 64 / 64 | 64 | Exact / exact |
| quick-100 | 100 / 70 | 80 / 80 | 128 / 128 | 128 | Exact / exact |
| deep-50-80 | 50 / 35 | 80 / 80 | 350 / 350 | 350 | Exact / exact |
| deep-100-80 | 100 / 70 | 80 / 80 | 700 / 700 | 700 | Exact / exact |
| multi-50-160 | 50 / 35 | 160 / 160 | 350 / 350 | 347 | Exact / exact |
| multi-100-160 | 100 / 70 | 160 / 160 | 700 / 700 | 695 | Exact / exact |
| multi-50-320 | 50 / 35 | 320 / 320 | 350 / 350 | 350 | Exact / exact |
| multi-100-320 | 100 / 70 | 320 / 320 | 700 / 700 | 700 | Exact / exact |
| stress-50-672 | 50 / 35 | 672 / 672 | 350 / 350 | 350 | Exact / exact |
| stress-100-672 | 100 / 70 | 672 / 672 | 700 / 700 | 700 | Exact / exact |
| grant-70-320 | 50 / 35 | 320 / 320 | 70 / 350 | 70 | Exact / exact |
| grant-128-320 | 100 / 70 | 320 / 320 | 128 / 700 | 128 | Exact / exact |
| quiet-50-320 | 50 / 35 | 320 / 320 | 350 / 350 | 180 | Exact / exact |

| New v6 fixture | Accepted / rejected | Inactive | Authored / private authored | Issues: total / open / owner-reported resolved |
|---|---:|---:|---:|---:|
| 50 active / 35 capable | 350 / 0 | 22 | 327 / 23 | 70 / 29 / 41 |
| 100 active / 70 capable | 700 / 0 | 41 | 658 / 20 | 137 / 62 / 75 |

These are **scripted offline capability outcomes**, including deliberate issue selections and inactivity. Counts do not demonstrate natural model intelligence, genuine resolution or improved DeepSeek compliance. The browser cases are cancelled accepted prefixes; full 320-tick completion is established by the separate production-service fixtures. Screenshot and DTO evidence is retained in `desktop/cohort-50/` and `desktop/cohort-100/`.

The complete fourteen-row matrix was rerun because accepted decision reconstruction and context accounting gained a new policy branch. Its legacy scheduler/profile rows are separate from the two new v6 citizen-grounded full-capacity fixtures; neither is a real-model behavioural benchmark.

Six completed sequential benchmark rows were preserved before switching the remaining independent jobs to at most two fixture processes. The machine had sixteen CPU cores and over four GiB free; new launches require two GiB free. Each case uses separate storage and the unchanged benchmark assertions. Interrupted incomplete task fixtures are retained and not counted as PASS. Case timings are shared-resource measurements, not isolated performance comparisons.

`benchmark-source-scope.json` independently reconstructs the initial verified source hash exactly by undoing only the final v6 Roman-unit/discourse predicates, their synthetic controls and the v6 closure-instruction clause in an in-memory hash calculation. No source file is rewritten. The fourteen legacy rows do not execute these v6 changes; their scheduler/replay/storage scope is unchanged. Both new v6 capacity fixtures use the final decoder/schema predicates. The 50-agent fixture began before the final prompt disclosure: its scripted selections do not depend on that prompt, which is separately checked through refreshed production transport tests and browser acceptance.

Full-capacity fixtures demonstrate system capability with scripted selections, including legitimate issues, progress/closure, private activity and inactivity. Browser fixtures exercise actual drawing, confirmation, ordinary Explore, mocked personality initialization, validated NS4 references, qualitative hours prose and Graph/Report restoration. Short cancelled browser prefixes must not be represented as full browser-completed 320-tick worlds.

## Remaining limitations and live recommendation

The repair is a bounded language/provenance contract, not a general factual or semantic verifier. Creative paraphrases, unfamiliar quantity expressions, unusual source attribution and borderline issue relevance may still produce false rejection or unassessed acceptance. Qualitative opinions are not certified facts. Exact supplied-body attribution, uppercase approved identifiers, predicate conditions and affirmative closure grammar remain intentionally conservative.

No real v6 acceptance rate, conversational improvement, memory use or personality effect has been measured. No paid inference, evaluator, provider connectivity probe, ledger rearming or paused-world continuation occurred.

**GO for a separately authorised small verification**, rather than another full-budget run: at most twenty social responses, one Explore, existing initialization stage ceilings (at most 34 total completions), at most US$0.50 reported-plus-reserved, one Tavily search/two credits, serial inference and no retry/replacement. This is a proposal, not spending authority.

A fresh v6-compatible guard and independent authority are required; the old closed v5 guard must not be reused or weakened. Enable and verify the external diagnostic sink before dispatch. Measure returned/accepted/rejected counts and specific v2 subreasons, independently inspect accepted prose for unsupported claims and valid issue evidence, count genuine authored conversations/peer replies, and verify privacy/replay/accounting. Stop on a substantial contract failure. Twenty responses cannot establish a long-run reliability rate.

## Changed-file inventory

This task changed 22 repository files relative to its captured starting worktree. Earlier dirty/untracked work is preserved; ignored test evidence stays under `tmp/citizen-prose-repair-20261101/`. The documentation plan is retained because the requested substantial repair was planned before implementation.

- `docs/CITIZEN_PROSE_VALIDATION_RELIABILITY_REPAIR.md`
- `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`
- `docs/superpowers/plans/2026-11-01-citizen-prose-repair.md`
- `lib/citizen-grounding/decision-v6.ts`
- `lib/citizen-grounding/issue-prose.ts`
- `lib/citizen-grounding/prose.ts`
- `lib/contracts/tests/citizen-prose-evaluation.test.ts`
- `lib/contracts/tests/citizen-prose-v6-transport.test.ts`
- `lib/contracts/tests/citizen-prose-v6.test.ts`
- `lib/contracts/tests/hybrid-public-explore.test.ts`
- `lib/server/inference/social.ts`
- `lib/server/society/public-service.ts`
- `lib/server/society/rejection-observations-v2.ts`
- `lib/server/society/service.ts`
- `lib/society/context-capacity.ts`
- `lib/society/decision-contract.ts`
- `lib/society/decision-menu.ts`
- `lib/society/engine.ts`
- `lib/society/hybrid.ts`
- `lib/society/intelligence.ts`
- `lib/society/social-diagnostics-v2.ts`
- `scripts/testing/citizen-prose-evaluation.ts`

The roadmap is append-only relative to its captured original bytes. Earlier reports, original citizen snapshots, archived accepted journals/checkpoints, closed ledgers and the unresolved US$0.02 reservation are unchanged. All changes remain unstaged and uncommitted. No task-owned process remains running.
