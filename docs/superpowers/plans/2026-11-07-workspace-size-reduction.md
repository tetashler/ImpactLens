# Workspace size reduction

**Goal:** Reduce the measured 12.90 GiB working directory without removing documentation, actual simulation evidence or historical test inputs, and prevent large successful offline tests from accumulating artifacts.

**Authorization:** The user explicitly requested implementation of the measured cleanup recommendations. Documentation Markdown folders must remain. Cleanup is confined to this exact workspace; no repository history rewrite, provider request, simulation recovery, private environment edit, commit or push.

**Architecture:** A dry-run-first cleanup utility uses explicit generated-directory selections, not blanket removal of `tmp`. It verifies canonical paths and rejects unsafe roots. Documentation, Markdown files and referenced artifacts are excluded. Preserve all data under `data`, all Git/source/private configuration, paid/live and historical proof evidence. Remove Next build caches/dev output only when no project server is active. Record deleted paths/bytes and verify pre-existing protected file hashes afterward.

## Work

- [x] Inventory candidate bytes, running processes, Markdown/document attachments and historical source references.
- [x] Audit synthetic benchmark trees independently; keep aggregate reports, hash manifests, baseline/live authorities, files required by source and linked documentation assets.
- [x] Implement and test a bounded workspace cleanup plan/apply command. Default is preview. Reject outside-workspace, symlink/junction traversal, protected targets and stale/changed plans. Actual removal uses only validated absolute paths in one filesystem implementation.
- [x] Snapshot protected file hashes; clear `.next/cache` and `.next/dev`, then remove confirmed redundant synthetic fixture/benchmark bytes. Preserve Markdown/document folders in place.
- [x] Update the largest offline guard fixture producers to remove only newly owned artifacts after successful assertions. Preserve failed runs, explicit retention requests, Markdown and linked evidence. No global exit hook that could race other test processes.
- [x] Run focused safety/fixture regressions, verify all protected hashes and Git state, remeasure bytes and write the cleanup/retention operating guide.

Baseline metadata: 13,851,987,647 bytes (12.90 GiB); `tmp` 11,002,186,554 bytes, `.next` 1,689,449,984 bytes. `tmp` contains 116 Markdown files (4,209,484 bytes), all retained. Benchmark descendants occupy approximately 4.28 GB before dependency filtering. Some tracked historical tests require fixed `tmp` JSON/proof inputs, so those roots are never swept wholesale.

## Result

Removed 6,965,523,661 bytes in 12,867 generated files. Independent remeasurement: 6,888,100,813 bytes (6.415 GiB), before the small final documentation/verification additions. All 1,013 pre-cleanup protected hashes matched afterward, including all 903 Markdown files present at that point. This plan's own completion notes were updated after that preservation check; original user documentation was not edited or removed.

Safety tests: 12 passed; post-cleanup focused existing guard cases: 3 passed. TypeScript and independent read-only safety review passed. No production rebuild was needed for this test/maintenance-only change. Audit details and retained baseline decisions are in `docs/WORKSPACE_STORAGE_MAINTENANCE.md` and ignored local cleanup receipts. No private runtime roots in local environment configuration intersected the deletion selections.
