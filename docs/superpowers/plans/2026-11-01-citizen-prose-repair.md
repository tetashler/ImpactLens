# Citizen prose reliability implementation plan

**Goal:** Permit bounded qualitative citizen discussion while retaining trusted quantitative rendering, finite issue provenance and exact old replay.

**Architecture:** Add `conversation-menu-v6` / `citizen-menu-v3`. Leave v4/v5 decoders and evidence assessor unchanged. Reuse finite menu eligibility and transport, with new prose/evidence assessors and opt-in v2 safe diagnostics. All factual values continue to be rendered from selected server facts. Raw quantitative claims remain unsupported; validated scenario station codes are a bounded identifier exception. No semantic model or new inference.

**Execution:** Native, main worktree, autonomous as explicitly requested. No commits, paid authority, provider calls, dataset generation or historical edits.

## Review focus

- A trusted fact reference cannot license invented numerical prose or another citizen's private facts.
- Station-code exceptions require immutable validated scenario provenance, not question text.
- Subject paraphrases cannot make generic preference or unrelated prose an issue.
- Resolution remains owner-bound and source-supported, with self-report distinguished from deterministic satisfaction.
- Optional diagnostic failure must not affect acceptance, privacy, billing or replay.

## Tasks

- [x] Capture source, old policy and protected-evidence hashes; reproduce v5 false rejections with labelled synthetic production-path fixtures.
- [x] Write failing v6 production transport, prose, evidence and diagnostic regressions; preserve RED logs.
- [x] Implement bounded qualitative prose assessment and authored-span assessment; server-owned fact suffixes remain the quantitative path.
- [x] Add v6 finite menu/decoder and v2 closed diagnostics; preserve old contracts verbatim where practical.
- [x] Integrate explicit policy validation, context construction, decision reconstruction and ordinary Explore default. Keep clocks, routing, capacities, selection and storage algorithms unchanged.
- [x] Run focused GREEN and synthetic common-fixture v5/v6 evaluation, including unsafe and ambiguous controls.
- [x] Run complete blocked suite, both TypeScript gates, build, whitespace, 350/700 mocked completion, desktop plotting/Explore/Graph/Report at both viewports, full and non-empty checkpoint replay.
- [x] Run 20 qualifying historical strict replays, unresolved-artifact inventory and original evidence/data preservation. Assess benchmark necessity against actual changed source.
- [x] Write the requested report, append roadmap, clean up only task processes, recommend GO/NO-GO for a separately authorised small live verification.
