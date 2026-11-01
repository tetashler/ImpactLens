# Citizen-menu reliability and storage admission implementation plan

> **For agentic workers:** Use superpowers:executing-plans task by task with RED/GREEN tests. Independent storage and diagnostics modules may be delegated under explicit file ownership. No commits or worktrees: the user requires the existing main worktree and unstaged changes.

**Goal:** Match finite citizen evidence choices to strict validation and permit bounded future sessions without changing retained worlds.

**Architecture:** Keep v4/citizen-grounded-v1 frozen. Add conversation-menu-v5/citizen-menu-v2 with one finite evidence selection fixing issue kind/subject/source/criterion; derive a verified span from independently authored text rather than asking the model to duplicate a quotation. Preserve factual guards and expose their actual restrictions; reserve text headroom for server-rendered facts. Emit strictly allowlisted diagnostics outside authoritative replay records. Add one trusted, fixed storage-admission-v1 namespace with sixteen non-reusable claims, preallocated session identity and fixed old/new lookup; retain the original directories as read-only historical fallback.

**Tech stack:** Existing TypeScript/Node/Next filesystem stores, wx/fsync, structured inference mocks, existing journals/checkpoints. No new packages/providers/data or inference authority.

**Spec:** Current user task: Citizen-Menu Reliability and Non-Destructive Storage Admission, including all offline gates and preservation requirements.

## Constraints and review focus

- No OpenRouter/Tavily, paid ledgers, live resume, rejected-output retention, dataset regeneration, Git staging/commit/push, deployment or secondary worktree.
- Preserve the closed interrupted request's USD0.02 reservation, all existing reports/private records and original source snapshots.
- ST12/EP32, six memories, eight bodies, 24KB context, existing profile capacities and clocks unchanged.
- Ordinary discourse/inactivity remain legal; selecting evidence never authors dialogue or closes an issue automatically.
- Stale evidence, missing source memories, private membership changes and unknown claims must fail closed.
- Fixed namespace is explicit additional bounded retention, not endless rollover or a hidden increase of the old limit. Original 64/64 inventory is not edited to demonstrate admission.
- Preserve historical public lookup/token binding and pure replay; read-only historical projection must not invoke recovery writes or provider dispatch.
- Test concurrent distinct/duplicate attempts, incomplete claims, crash after binding/journal, roster regeneration prevention, and namespace ambiguity.

## 1. Baseline and source-level findings

- [x] Snapshot dirty source and protected datasets/history/paid files under ignored task evidence; verify reports and actual safe inventory.
- [x] Trace v4 schema/menu/text/issue gates, transport diagnostics and journal behavior; distinguish confirmed defects from unavailable rejected-body hypotheses.
- [x] Establish reproducible RED cases before each implementation.

## 2. Versioned citizen menu

Files: new `lib/citizen-grounding/decision-v5.ts`; modify policy/decision dispatch and context construction in `lib/society/{intelligence,decision-contract,decision-menu,hybrid,context-capacity,engine}.ts`; current-policy selection in server initialization; new focused tests.

- [x] Add v5 policy with v4 unchanged; freeze v5 selection identity for replay.
- [x] Build bounded deterministic evidence IDs binding context, issue state, subject, basis, criterion and source. Filter null facts, inaccessible/unremembered sources and impossible resolutions.
- [x] Replace free evidence quotation/basis construction with one offered evidence ID. Derive only a truly eligible exact authored span; reject absent/ambiguous language rather than fabricate content.
- [x] Disclose actual kind-specific grammar, forbidden factual prose and remaining text budget in schema/context/system. Budget worst-case rendered fact suffix within 1000 characters.
- [x] Round-trip accepted selections through the production parser and reducer; test unchanged v4 behavior, ordinary/read/inactive choices, invalid/stale/private alternatives and context trimming.

## 3. Privacy-safe diagnostics

Files: new browser-safe `lib/society/social-diagnostics.ts`, private bounded sidecar writer and tests; wire opt-in callback into social transport/current v5 service.

- [x] Closed finite family/subreason/stage/field and offered-option booleans/enums only; no submitted IDs, text, matches, arbitrary keys, profile values or snapshots.
- [x] Observer failure cannot change validation, billing or retries. No diagnostic fields added to historical usage/journal/checkpoint records.
- [x] Current v5 writes a bounded versioned private observation sidecar with a hash of context identity; use an extension separate from world `.jsonl` discovery. Old versions remain byte-equivalent.

## 4. Bounded non-destructive admission

Files: new `lib/server/society/storage-admission.ts`; integrate public-service/service routing and preallocated start identity; optional bounded public storage disposition and UI controls; isolated tests.

- [x] Fixed trusted sibling namespace, sixteen durable non-reusable slots. Sequential exclusive slot creation/re-read can provide atomic bounded allocation without stale mutex reclamation; validate duplicate attempts and every existing claim, fail closed on partial/corrupt files. No attempt/slot reuse after provider-start ambiguity or PID death.
- [x] Parse request first, reserve/fsync before any hybrid interpretation or retrieval/planning; bind accepted run once before personality generation; all world/job/archive paths share the resolved bundle.
- [x] Use the reserved session UUID; recover an existing valid journal/index without invoking initialization. Interrupted/incomplete state cannot authorize another provider dispatch.
- [x] Resolve only fixed legacy/current locations; duplicates/crossed bindings fail closed. Legacy reads return stored authorized summaries without writes; controls are rejected as archived/read-only.
- [x] Retain explicit isolated fixture roots. Test saturation, concurrent last-slot/duplicate attempts, restart, incomplete files, paused restoration, unknown accounting and zero pre-admission dispatch.

## 5. Verification and reporting

- [x] Focused RED/GREEN and production structured-transport tests with external network blocked.
- [x] Full Node suite, main/strict TS, production build, whitespace and public privacy.
- [x] Fresh fourteen-row benchmark matrix (storage/menu surfaces changed), both 320-tick cohorts and both desktop sizes. Add v5 finite-menu fixture support without weakening legacy tests.
- [x] Full/positive-tail replay, Graph/Report reconciliation, all twenty qualifying historical strict replays and unchanged pinned experimental classification.
- [x] Recheck datasets, all protected previous/private/paid files, original 62/64 inventory and closed USD0.02 reservation. Stop owned processes/pages.
- [x] Write `docs/CITIZEN_MENU_RELIABILITY_AND_STORAGE_ADMISSION.md`, append roadmap, list exact changes/limits and stop before any separately authorized live evaluation.
