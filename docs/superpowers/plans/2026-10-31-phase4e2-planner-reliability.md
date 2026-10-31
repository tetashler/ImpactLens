# Planner quotation and grounding reliability implementation plan

The user authorises autonomous investigation, the smallest justified repair and full offline acceptance in the main worktree. No paid call, Git mutation or historical rewrite is authorised.

## Diagnosis and design

Confirmed: legacy `userConditions` is optional selected verbatim snippets (four strings of at most 300 UTF-16 units), not complete semantic extraction. The original question is separately retained and passed downstream. One non-verbatim live value was rejected, but its text was not retained. Retrieval sent the whole Sengkang question without a Singapore anchor; causation of the overseas results is not established.

Choose deterministic complete-source selection over prompt-only copying, partial candidate extraction, model offsets or a new semantic constraint system. `dynamic_entities_v3` must select exactly `userConditionIds: ["question-1"]`, referring to the complete original question. Trusted resolution stores its exact text plus `userConditionProvenance: {version:1,policy:"complete-question-v1",sourceId:"question-1"}`. Archive validation requires exact equality. This guarantees source coverage, not model comprehension or semantic obedience. Marker-absent historical drafts retain their original optional four-by-300 interpretation and identity.

Only the validated server-derived source quotation is exempt from generated-prose URL restrictions; generated fields retain every existing safety check. Preserve 2,000-unit questions, 48 KB drafts, 130 KB plans, fixed provider/model, two planning calls/eight initial actions, and no automatic retry.

Use one bounded retrieval query with conservative explicit/resolved country/locality anchoring. Preserve original planner input, one basic request/five candidates, source dates, provenance, citation rules and honest coverage limitations. Do not fabricate a centre, restrict sources to a fabricated allowlist, or claim geographic wording proves relevance.

## Tasks and interfaces

- [x] Add failing source-contract tests, then `lib/dynamic-scenarios/user-condition-source.ts`: `completeQuestionSource(question)`, `resolveUserConditionIds(ids, question)`, `validateUserConditionSource(conditions, provenance, question)`. Cover empty/incomplete/invented selections, offsets, Unicode, whitespace, URLs, long source and safe diagnostics.
- [x] Extend `DynamicDraft`, diagnostics and `parseDynamicDraft` for the explicitly versioned source policy only. Prove old plan serialization/validation unchanged.
- [x] In `lib/server/inference/planner.ts`, expose the new entity wire schema/name, supplied source catalog and trusted resolution before existing declaration/registration validation. Old direct planner/archives retain their contracts. Keep relationship planning unable to rewrite source provenance.
- [x] Add failing bounded geographic query tests; implement the small query helper and wire only retrieval construction. Do not modify source authority/citation validation or original questions.
- [x] Adapt current offline provider fixtures/preloads to v3, preserving legacy fixture paths and every existing negative assertion. Leave the consumed live guard and ledger unchanged.
- [x] Exercise ordinary mocked Sengkang retrieval, both planning stages, accepted initial actions, society initialization (50/35/320/350), summary-only projection and a safely rejected reference violation with no automatic dispatch.
- [x] Review the focused changes independently, repair concrete findings with regressions, freeze source and run full network-blocked Node/application TS/strict TS/build/whitespace checks.
- [x] Run mandatory historical replay, all hash preservation, all 14 benchmark rows and both desktop cohorts serially. Never arm a paid ledger or start a live server.
- [x] Create the requested repair report, update roadmap, record exact task delta and zero new paid calls; stop fixture servers/contexts and leave changes unstaged.

## Evidence and boundaries

Task evidence: `tmp/phase4e2-planner-repair/`. Before edits, 209 private files and four paid evidence files were hashed; all 639 current source/document paths were recorded to distinguish this repair from pre-existing work. The pinned experimental historical classification remains untouched and unresolved.

Review focus: complete-source coverage versus semantic extraction; provider-forged text/provenance; source-only URL exception; long multibyte questions; misleading Singapore context in foreign/ambiguous questions; fixture-only schema migration; no provider retries; exact historical plan/journal identities.

## Completed verification

Final network-blocked Node suite: 1,339/1,339. Both TypeScript checks, production build and whitespace verification pass. All 14 benchmark configurations and both desktop cohorts pass; both new marked desktop worlds pass full and checkpoint-tail replay. Qualifying historical replay: 20/20, with the pinned experimental artifact still unresolved and classified separately. All 209 task-start private files, four closed paid-evidence files and the original roadmap byte prefix are preserved. The repair changes 21 source/document paths. No new paid dispatch, Git mutation, task server or browser context remains. Final evidence is under 	mp/phase4e2-planner-repair/. Real-provider reliability is NOT TESTED.
