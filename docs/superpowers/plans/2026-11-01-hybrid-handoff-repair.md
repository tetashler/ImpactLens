# Hybrid MRT interpretation handoff repair

> Execute this approved user specification autonomously in the existing main worktree. Use test-first changes and independent review. Do not commit or perform paid inference.

**Goal:** give interpretation the validated UI selection and bounded capability disclosure; admit clear supported MRT alignments deterministically without changing historical semantics.

**Architecture:** retain `hybrid-map-v1` and its original binding/projection unchanged. Add explicit `hybrid-map-v2` interpretation selection in new ordinary Explore options, a server-built validated handoff and a finite v2 response contract. Persist its original result and validation/capability proof in a version-2 hybrid binding around the existing geometry/execution proof. Existing citizen execution, routing, schedules, provider identities and budgets remain unchanged.

**Files:** new pure `lib/interventions/handoff-contract.ts`; new server-only `lib/interventions/handoff.ts`; extend `binding.ts` with an explicit v2 branch and creation wrapper; extend `explore-contract.ts` optional interpretation selector/public metadata; route in `lib/server/interventions/explore.ts`; select v2 for new requests in `components/workspace.tsx`. Add production-path regressions under `lib/contracts/tests/`. Do not change the legacy hybrid implementation, datasets, closed paid guard or prior reports.

## Tasks

- [x] Capture starting source/worktree, protected dataset/history/ledger/report identities and storage counts in task-only ignored evidence.
- [x] Add RED regressions through `prepareHybridExplore`/`handlePublicExplore` for the recorded NS4–middle–NE16 question, confirmed variants, ambiguous/model context, invalid selections, contradictory facilities and no-retry clarification. Preserve all v1 assertions.
- [x] Implement a bounded capability manifest and validated handoff. Recompute attachment/order/catalogue-anchor and adapter validation; booleans only record user acknowledgement. Bind exact question/revision, catalogue identity, route, ordered dots, anchors, timings and manifest. Invalid/unconfirmed candidates return clarification before any provider or calculation call.
- [x] Recognise explicit new/proposed MRT line/route/connection/rail-link semantics only with compatible server-validated geometry; retain genuine ambiguity, negation/conflict and standalone-station restrictions. Explicit confirmed selection may choose one of multiple lines; contradictory named selection cannot.
- [x] Implement strict v2 model parsing and immutable accepted proof. Keep the original v2 model result distinct from its normalized v1 geometry-validation representation. Original v1 bindings/requests remain byte-compatible; unknown policies fail closed.
- [x] Connect new ordinary Explore requests and test browser-safe parsing, restored binding, provider metadata, privacy and full/checkpoint-tail replay. No new paid transport, grant or retry.
- [x] Run focused tests, full network-blocked suite, application/strict TypeScript, production build/tracing and whitespace. Execute twenty strict historical replays, new 35/70 initialization/replay fixtures and affected desktop UI at both sizes.
- [x] Decide benchmark scope from actual edits. If routing/clock/capacity/reducer behaviour is unchanged, document the established 14-row baseline separately and run focused new-input/replay checks rather than silently claiming a rerun of the expensive engine matrix. Expand checks if failures or engine changes justify it.
- [x] Verify original protected files, prior acceptance reports and closed ledger; document 63/64 capacity and absence/presence of a session from the declined attempt. Do not delete sessions or enlarge limits.
- [x] Write `docs/HYBRID_MRT_INTERPRETATION_HANDOFF_REPAIR.md`, append roadmap outcome, stop owned test processes and leave changes unstaged/uncommitted.

## Review focus

- Never translate model clarification into acceptance or infer physical railway edges.
- Preserve old intent/binding semantics and prevent a new selector changing archived v1 proofs.
- Changed order, geometry, catalogue, question or acknowledgement must invalidate the v2 proof.
- Capability disclosure describes available calculations, never guarantees outcome or feasibility.
- Interpretation has no citizen roster, occupation, personality, conversations, grant or credentials.

The prior request is sufficient design approval; no study artefact or new product decision is being requested. Full numerical benchmarks may be reported as not rerun only with explicit scope justification and no claim of fresh PASS.
