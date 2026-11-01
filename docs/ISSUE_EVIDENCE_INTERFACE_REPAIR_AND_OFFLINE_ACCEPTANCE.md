# Issue-evidence language interface repair — offline acceptance

Date: 1 November 2026. Main worktree, branch `master`, HEAD `5399e12c065e46806785146c79b7131e0668ab99`. Changes remain unstaged and uncommitted. No new live authority, OpenRouter request, Tavily request or paid evaluator is authorised or used.

## Finding and evidence boundary

The closed v6 screen returned eight social responses: three accepted and five rejected. Four diagnostics were `evidence-action-language-unassessed`; one was `evidence-subject-missing`. All five selected offered actions and evidence IDs. This establishes the failing validation boundary, not the rejected wording or whether later validators would have passed. Rejected raw responses were not retained and have not been reconstructed.

`lib/citizen-grounding/issue-prose.ts` checks the selected subject's literal keywords inside a bounded authored sentence, then matches a small set of action-specific English patterns. It does not establish general semantic relevance. An explicit issue selection could therefore fail on ordinary anaphora, paraphrasing or a sentence structure outside those patterns. Synthetic regressions reproduce those weaknesses independently of the unavailable live bodies.

Continuing to expand these patterns would leave the same model-to-validator mismatch. The repair separates deliberate formal action from free-form dialogue instead of presenting a lexical classifier as semantic verification.

## New, explicit policy

New ordinary citizen-grounded Explore uses `conversation-menu-v7` / `citizen-menu-v4`, with `issue-declaration-v1`. Existing `citizen-grounded-v1`, personality, population selection, commute calculation, pacing and ST12/EP32 bounds are unchanged. V4, v5 and v6 decoders, prose assessors and diagnostic formats remain frozen.

The wire retains its eight fields. Optional `issueEvidenceId` now refers to a complete, server-generated declaration displayed in the current finite menu. Each declaration binds the current actor/context, known subject, eligible basis, source/remembered experience, existing issue and calculated criterion where applicable. Unknown, changed, stale or cross-actor selections fail; there is no automatic downgrade into ordinary conversation.

The agent deliberately adopts the displayed statement. Its own `text` stays exact in `selection.authoredText`. The application separately appends `[Agent-selected issue declaration: …]`, stores `model-selected-server-rendered` provenance, and retains that origin in issue-update history. `grounding.quote` denotes this literal labelled statement, **not an invented quotation of model-authored prose**. Exact accepted-record reconstruction checks all resulting text and metadata.

This is an explicit action interface, not proof that the surrounding prose semantically entails the declaration. Semantic consistency of arbitrary prose remains NOT VERIFIED. The application does not silently classify unrelated discussion as an issue: a formal statement requires an explicit eligible selection. Ordinary comments, questions, preferences, reading and inactivity remain valid without it. Statements and issue counts are not evidence of intelligence, meaningful problem solving or real-world outcomes.

## Safeguards and implementation

- `issue-declarations.ts` builds optional bounded statements for known commute, schedule and workplace subjects from existing finite source/permission eligibility. Unknown subjects are not invented. Creation, progress, withdrawal and closure remain separate actions.
- `decision-v7.ts` resolves the selected statement, preserves authored prose, enforces the unchanged `citizen-prose-v1` factual boundary, and reserves output headroom for the declaration plus at most two exact trusted fact suffixes. Text remains bounded at 1,000 characters; context remains 24KB with eight bodies and six selected references. Overlong facts are omitted, not truncated into new claims.
- Existing own-issue source, chronology, memory, private membership and lifetime/current-view bounds remain binding. A selected source is not independent truth verification.
- A calculated condition that is unsatisfied or unknown cannot fall back to a later conversational statement as owner-reported resolution. A satisfied declared calculated predicate is distinguished from owner-reported closure and withdrawal. Nothing automatically resolves a concern.
- Application-rendered declarations are stripped from later answer eligibility. Independent review found that shares/rule replies can clip off a closing marker. The filter also strips unterminated fragments; regression coverage uses the actual 120/140/180-character clipping lengths. Genuine surrounding prose and trusted fact suffixes remain separate.
- The existing optional v2 structural diagnostic sink covers v7 failures without retaining raw rejected responses. Observer errors cannot alter authoritative decisions or trigger retries. No diagnostic schema or historical journal is rewritten.
- Public summary and Report disclose aggregate statement origins and closure categories. They do not expose private statement bodies, citizen profiles, memory or membership lists. Model-authored item counts still count accepted authored actions; the appended declaration is never a separate model-authored item.

## MiroFish/OASIS comparison

At the pinned sources already used by this repository, [MiroFish's runner](https://github.com/666ghj/MiroFish/blob/7657031ac01184afe2cb220f5ee3545573b5e843/backend/scripts/run_parallel_simulation.py) gives agents available platform actions and invokes OASIS `LLMAction`. [OASIS SocialAgent](https://github.com/camel-ai/oasis/blob/ba892e0667eb84b312e4c0e5630f275154bbb98f/oasis/social_agent/agent.py) supplies action tools to the model. Its [post/comment handlers](https://github.com/camel-ai/oasis/blob/ba892e0667eb84b312e4c0e5630f275154bbb98f/oasis/social_platform/platform.py) accept content arguments and store them; those handlers do not apply ImpactLens's subject-specific issue-language or commute-fact checks.

That supports a useful architectural lesson: validate the explicit action contract separately from free prose. It does not demonstrate that MiroFish solved our stricter issue-evidence problem or that unrestricted generated text is factually correct. ImpactLens independently applies this separation while retaining its own numerical, privacy and evidence boundaries. No upstream implementation blocks, framework, database, retry policy or new inference call were adopted.

## Focused RED/GREEN and synthetic comparison

Initial RED: the new policy lacked production routing, declarations and provenance. Synthetic v6 examples separately reproduce the current sentence/subject failures. GREEN focused tests cover deliberate adoption, unchanged prose, ordinary non-issue dialogue, malformed/unknown/stale/cross-actor selections, forged accepted records, factual negative controls, closure categories, inaccessible/private sources, memory eviction, duplicate subjects, schema completeness, reserved marker spoofing and output headroom.

Production structured-transport tests exercise the exact schema, model/provider routing and optional bounded diagnostics using mocked inference. A circular class-initialization error found by these tests was repaired using an independent v7 error class; the old v6 class remains unchanged. An empty declaration menu produces a valid null-only schema, never an empty enum branch.

The reusable synthetic evaluation is `scripts/testing/issue-declaration-evaluation.ts`:

| Synthetic group | V6 | V7 | Interpretation |
|---|---:|---:|---|
| Eight deliberate issue-intent phrasings | 3 accepted | 8 accepted | V6 classifies an authored span; v7 adopts the selected displayed statement. Different contracts, not a provider-performance benchmark. |
| Four unsupported factual controls | 0 accepted | 0 accepted | Existing factual restrictions remain in force. |
| Three ordinary untracked discussions | 3 accepted, no issues | 3 accepted, no issues | Dialogue is not automatically tracked. |

The historical inventory retains `f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json`, with archive-content SHA-256 `f509b72702238ce52d3feb6653b28ca68f7151796f5e39d88834160902f503ca`. Its first-context `SOCIAL_STALE` remains unresolved and its generation policy remains unrecoverable; it is not described as replay PASS.

This compact fixture is not exhaustive natural-language verification. It does not prove real DeepSeek compliance, semantic understanding or a future live acceptance rate.

## Full acceptance results

Final source fingerprint: `8babf2272c591b9552838734a49a95e912069a9cbc3f94594a4ea805e88128c5`. Production build: `NFfqBDleU0poVzW9k0GTm`. Repository HEAD remains unchanged. The source fingerprint was identical before and after the final gate sequence.

| Gate | Fresh result |
|---|---|
| Complete network-blocked Node suite | **1,981 passed; zero failures/skips** |
| Focused prose/declaration/public-boundary regressions | **124 passed** |
| Actual public Explore + new aggregate boundary | **38 related regressions passed**; independent reviewer also ran **19 public/Explore/chronology/privacy tests**, all passed |
| Main and strict TypeScript | PASS |
| Production build and all 25 server asset traces | PASS |
| Dataset/source pins, 10,000-citizen identity and calibration | PASS; no regenerated population |
| Whitespace | PASS |
| Both desktop cohorts at 1440×900 and 1920×1080 | PASS: actual mouse plotting/confirmation, ordinary mocked Explore, new declaration disclosure, Graph/Report quantities, privacy and saved restoration |
| Strict qualifying historical replay | **20/20 PASS** |
| Original historical artifact inventory | Pinned experimental artifact remains unresolved `SOCIAL_STALE`, separately nonqualifying; not converted to replay PASS |
| Protected original files | **10,827 files / 3,805,416,049 bytes unchanged**; all 21 frozen legacy modules/guards unchanged |
| Paid requests | **Zero new OpenRouter/Tavily/evaluator calls; no real authority armed** |

| Scripted integration cohort | Tick | Accepted / capacity | Rejected | Full genesis / saved-world / materialized restoration | Public privacy |
|---|---:|---:|---:|---|---|
| 50 active / 35 capable | 320 | 350 / 350 | 0 | PASS | PASS |
| 100 active / 70 capable | 320 | 700 / 700 | 0 | PASS | PASS |

Both complete cohorts use mocked inference and the ordinary server/coordinator/journal pipeline with real local data and an illustrative MRT calculation. They are technical fixtures, not a real DeepSeek run or the full UI-drawn NS4 intervention. The browser tests separately exercise the UI-drawn MRT workflow with mocked initialization and short deliberately cancelled prefixes; each viewport observes three accepted decisions and three selected declarations before cancellation. Each has eight initial stakeholder actions and a complete mock 35/70-personality roster. Restoration starts no replacement Explore or personality generation. No behavioural quality or causal improvement is inferred from these scripted choices.

The complete fixtures' final materialized restores have no remaining decision tail. Separate fresh protocol fixtures verify **checkpoint four + accepted tail four** for both policies, with exact full-genesis and checkpoint-tail equality and no source journal mutation. The 350-record corpus was also replayed independently after the declaration-fragment repair; the later browser parser change does not modify menu, engine or replay semantics. The 700-record fixture uses that same final decision kernel.

Actual shared-resource fixture timings (not isolated performance benchmarks):

- 50/35: 1191.85s total; 307.48s measured full replay.

- 100/70: 1683.84s total; 754.12s measured full replay.

The first 350 fixture additionally repeated strict saved-world replay. That redundant second replay was removed from the later fixture because `restoreSociety` already performs exact full genesis replay; validation strength and assertions are retained. Full replay remains CPU-heavy.

Verification failures were preserved and repaired:

1. An interim full suite ran during source edits, correctly failing two source-fingerprint guards; the current default-policy assertion still expected v6. The new default assertion now requires v7 and the safe declaration aggregate; frozen legacy assertions remain unchanged. The complete suite was rerun with source frozen.
2. Initial browser harness copies retained an old port pattern and later omitted the new field from their own safe observation projection. These harness faults were fixed in task-owned files and their failed receipts retained. No application safeguard was removed.
3. The actual browser test caught a production omission: `parsePublicExplore` did not admit the server's new aggregate. A RED regression reproduced it. The optional aggregate now has exact key/version validation, nonnegative integer bounds and `closures ≤ selected ≤ accepted` checks. Private bodies, unknown versions and inconsistent counts still fail. The actual server response now passes through that browser parser in a production-path regression. Full tests, both TypeScript checks and build were refreshed afterward; both UI cohorts then passed.
4. PowerShell promoted the task runner's Node `DEP0190` shell-spawn deprecation warning to an outer error even though every child gate returned zero. That warning log is retained. A receipt audit verifies all child results; a `.cmd` TypeScript gate rerun under process-only `--no-deprecation` returns zero without changing assertions or production code.

The previous fourteen-row benchmark matrix is **historical evidence, not newly executed**. Source inspection confirms unchanged scheduling/pacing, communication, coordinator, storage admission, journal and checkpoint algorithms. Changes to context sizing and the issue reducer are explicit v7 branches; prior interpretation is retained. Fresh current-policy 350/700 capacity and full/checkpoint replay are required rather than representing the old matrix as v7 measurements. See task evidence `benchmark-assessment.json` for unchanged-file hashes and this limitation.

## Preservation, uncertainty and next step

The task evidence directory is `tmp/issue-declaration-repair-20261101/`. Final preservation verifies 10,827 protected files / 3,805,416,049 bytes and 21 frozen legacy modules/guards without changes. Original storage remains 62 archives, 64 legacy indexes/journals and two of sixteen v2 claims used (fourteen free). All UI tests use separate task-owned namespaces; failed mock prefixes remain retained. Task-owned servers and browser pages were closed; the pre-existing browser page was preserved. The closed v6 live authority remains closed; the older US$0.02 unknown reservation is neither released nor reused. New task paid usage is zero.

Remaining limitations include lexical factual-prose restrictions, optional generic formal statements, unverified semantic consistency between selected statements and free dialogue, and source statements that remain claims. An owner report is not deterministic proof of satisfaction. This repair does not address population selection, geographic representativeness, empirical social prediction or substantive memory quality.

Real-provider reliability: **NOT TESTED**. No new live run is part of this repair. **GO for a separately authorised small v7 compliance screen**, with a fresh authority explicitly bound to the new policy and current source/build. It must exercise formal issue selections and ordinary dialogue, preserve safe rejection diagnostics, inspect unsupported accepted claims and retain exact replay/privacy/accounting checks. The preceding real v6 NO-GO for geographic selection remains unchanged; this offline repair does not authorise that phase or new inference.

## Final independent verdicts

- Issue-evidence interface implementation: **IMPLEMENTED + OFFLINE PASS**.
- Factual, ownership and permission boundaries: **PASS within tested controls**; arbitrary-language semantic truth remains NOT VERIFIED.
- Ordinary Explore, Graph/Report and browser integration: **OFFLINE PASS**.
- Historical compatibility and tested privacy: **PASS within tested boundaries**.
- Real DeepSeek compliance/behavioural improvement: **NOT TESTED**.
- Next action: a separately authorised small v7 verification; no full paid society, geographic selection or further phase was started.

Future semantic review must distinguish original `selection.authoredText` from rendered facts/declarations. Exact source-attribution and conservative factual-language restrictions remain in force; the new contract removes only the formal issue's authored-quotation requirement. Generic declarations, inconsistent surrounding prose or unrelated discussion can still be poor behaviour without constituting a fabricated authored-evidence quotation.

## Exact task changed-file inventory

- `components/communication-report.tsx`
- `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`
- `docs/ISSUE_EVIDENCE_INTERFACE_REPAIR_AND_OFFLINE_ACCEPTANCE.md`
- `docs/superpowers/plans/2026-11-01-issue-declaration-interface.md`
- `lib/citizen-grounding/decision-v7.ts`
- `lib/citizen-grounding/issue-declarations.ts`
- `lib/contracts/tests/citizen-issue-declaration-evaluation.test.ts`
- `lib/contracts/tests/citizen-issue-declaration-public.test.ts`
- `lib/contracts/tests/citizen-issue-declaration-transport.test.ts`
- `lib/contracts/tests/citizen-issue-declaration-v7.test.ts`
- `lib/contracts/tests/hybrid-public-explore.test.ts`
- `lib/question-simulation/public-session.ts`
- `lib/server/inference/social.ts`
- `lib/server/society/public-service.ts`
- `lib/server/society/service.ts`
- `lib/server/society/summary.ts`
- `lib/society/context-capacity.ts`
- `lib/society/contract.ts`
- `lib/society/decision-contract.ts`
- `lib/society/decision-menu.ts`
- `lib/society/engine.ts`
- `lib/society/episodic.ts`
- `lib/society/hybrid.ts`
- `lib/society/intelligence.ts`
- `lib/society/public-contract.ts`
- `scripts/testing/issue-declaration-evaluation.ts`

Task-owned scripts, logs, screenshots, mock journals and receipts remain under the ignored evidence directory. Earlier reports, datasets, paid authorities and accepted historical worlds were not rewritten.
