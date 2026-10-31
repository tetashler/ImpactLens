# Official Census dataset relocation plan

> Execution: native, autonomous, main worktree only. User approval is the relocation request; no Git staging, commits, pushes or deployment.

**Goal:** Move the four work-related Census snapshots together to `data/employment/`, with identical CSV bytes and unchanged synthetic/historical identities.

**Architecture:** Current metadata and eight literal filesystem allowlist entries use the new physical locations. Version-one citizen-manifest serialization retains its recorded provenance namespace so the existing content-addressed snapshots and accepted inputs remain byte-identical. No loader falls back to the retired directory.

**Spec:** Current user request, “Codex — Relocate Official Datasets”.

**Constraints:** Preserve unrelated work, datasets, synthetic records, archives, checkpoints and paid ledgers. Zero provider calls. Do not regenerate stored populations. Delete only the verified-empty retired directory after transfer/reference checks.

## Task 1: Verified relocation and identity-compatible reads

- [x] Capture source/evidence hashes and exact 13-file transfer inventory.
- [x] Add regressions for current physical locations, strict metadata location validation, and the existing synthetic ID/bytes/calibration identity; observe RED.
- [x] Move the four complete source folders and index using checked native PowerShell paths.
- [x] Update literal loader paths, metadata paths and tests. Keep version-one manifest provenance unchanged through explicit versioned serialization, not a filesystem alias.
- [x] Run focused data/calibration/actual-MRT/integration/replay/privacy regressions; verify all CSV/README hashes and unchanged snapshot bytes.

## Task 2: Retire old location, verify and document

- [x] Update current documentation, dataset index and roadmap; explain archival provenance strings.
- [x] Confirm no active filesystem dependency remains, then remove the empty `docs/datasets/` directory without recursive deletion.
- [x] Run network-blocked full Node suite, both TypeScript checks, production build, trace-asset check and whitespace check.
- [x] Run strict qualifying historical replay, retain the pinned unresolved experimental artifact, and verify protected-file hashes.
- [x] Record results in a short relocation report; leave changes unstaged/uncommitted and stop task-owned processes.

## Review focus

CSV bytes/pins must not change. Metadata cannot choose arbitrary filesystem paths. New physical paths must not change the v1 dataset ID. Old metadata paths must not enable a fallback. Literal assets must remain narrow enough for Next output tracing. Existing snapshots and accepted journals are never rewritten.
