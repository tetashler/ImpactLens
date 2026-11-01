# Issue-evidence interface repair

**Goal:** Remove fragile inference of formal issue intent from arbitrary English while retaining independent authored dialogue, explicit optional choices, source permissions and honest provenance.

**Design:** New `conversation-menu-v7` / `citizen-menu-v4`, with `issue-declaration-v1`. An offered issue ID selects a concrete canonical statement and existing source/owner/criterion binding. The server renders a clearly marked agent-selected statement, stores its origin separately, and keeps model-authored prose unchanged in `selection.authoredText`. Formal intent comes from the deliberate finite selection, not a guessed regex classification of that prose. Ordinary discussion/read/inactivity never creates an issue. Old v4–v6 decoders, prose/issue assessors, journals and paid authorities stay frozen.

**Constraints:** Main worktree; preserve all dirty work and accepted data. Offline only, no paid requests/ledger arming/resume/retry. No population, route, timing, memory-capacity, scheduler, provider or storage redesign. Canonical declarations are not model-written quotations, evidence of semantic understanding or verified resolution.

## Implementation units

- New `lib/citizen-grounding/issue-declarations.ts`: canonical finite statements, provenance, rendering, budget and source eligibility. Preserve all old menu authorization; exclude unresolved calculated predicates from owner-report fallback; selected declarations cannot masquerade as later answers.
- New `lib/citizen-grounding/decision-v7.ts`: strict wire, immutable choice resolution, unchanged factual prose guard, server-labelled rendering and exact reconstruction.
- Existing version dispatch/context/reducer types: explicit v7 only, with stored declaration origin/history and safe aggregate disclosure. Legacy byte outputs must remain unchanged.
- Existing inference/diagnostic transport: current v2 structural observer, no raw response retention, accurate statement-selection instructions. No paid provider/guard update.
- Focused synthetic tests and common-definition evaluation: no claimed reconstruction of missing rejected text. End-to-end mocked service, privacy, context bounds, exact replay and legacy compatibility.

## Steps

- [x] Capture source/protected baselines and freeze v4–v6 implementations and closed guards.
- [x] Reproduce v6 language/subject weaknesses with labelled synthetic cases; record RED.
- [x] Add failing v7 finite-declaration, provenance, ordinary-action, closure/source, privacy and rendering-budget regressions.
- [x] Implement the versioned declaration path and accurate model/public disclosure; keep every existing factual/permission guard.
- [x] Verify malformed/stale/cross-actor selections, unsatisfied predicate closure, private leave/rejoin access, duplicate/lifetime bounds and forged accepted records.
- [x] Run focused and production-transport GREEN, synthetic comparison, full blocked suite, TypeScript, build/assets/whitespace, complete mocked 350/700 worlds and both desktop views where affected.
- [x] Run strict qualifying historical replay plus both saved live prefixes and protected/data/paid-file preservation. Assess legacy benchmark reuse against actual modified paths; never call reused results newly executed.
- [x] Independent review, targeted fixes, final documentation/roadmap, task process cleanup. Report real-provider reliability NOT TESTED and leave changes unstaged/uncommitted.

## Review focus

- Server-selected text must never be attributed to the model as authored evidence.
- Unrelated prose must never be used as the formal statement's quotation.
- No issue may appear without an explicit offered selection; invalid selections must fail, never become ordinary discussion automatically.
- A calculated unsatisfied/unknown condition cannot be closed using a merely available later message.
- Source chronology, ownership, private access, current menu binding and context/rendering limits remain mandatory.
- Legacy input/policy interpretation and public outputs remain unchanged.

## Decisions

The user authorised autonomous offline repair following the failed v6 screen. Main-worktree/no-commit/evidence-retention requirements override skill defaults about worktrees, commits, approval checkpoints and deleting evidence. The selected declaration is an explicit fictional-agent action; it is not a semantic certification of surrounding free prose. Broader issue relevance and behavioural quality remain separate evaluation questions.
