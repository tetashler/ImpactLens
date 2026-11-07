# Keeping the working directory small

The 2026-11-07 cleanup reduced this workspace from **12.90 GiB to approximately 6.42 GiB**. It removed **6,965,523,661 bytes (6.49 GiB) across 12,867 files**. The remaining size includes intentionally retained historical evidence and final benchmark baselines.

Removed material was limited to generated Next.js cache/dev output, obsolete offline test fixtures, repeated mocked benchmark journals, and temporary fixtures from the storage/deployment implementation tests. Production build output remains under `.next`; rebuilding or running development mode will recreate caches as needed.

## Preview and apply

```powershell
npm run workspace:cleanup
# Preview only. Review removable bytes/groups and its local audit path.

# Stop application servers and test runners first, then:
npm run workspace:cleanup -- --apply
```

The command uses an explicit generated-artifact policy in `scripts/maintenance/workspace-cleanup.ts`. It does not sweep all of `tmp`, delete `node_modules`, rewrite Git history, or remove raw datasets. Apply refuses while a Next.js server or Node test runner is detected. It creates a fresh in-process plan, validates its absolute paths and metadata, and checks protected file hashes before and after deletion. Removal uses individual file unlinks and empty-directory removal, never recursive deletion through junctions or symlinks.

Existing Markdown, its containing documentation folders and local linked assets are protected. `docs`, `Presentation`, `data`, private configuration and source files remain outside the cleanup policy. Configured private storage roots are also protected, even if an operator placed one under a normally disposable path. The CLI reads local environment configuration without printing credentials.

Top-level scratch fixtures are eligible only when they have an approved offline-test prefix, a six-character generated suffix and are at least 24 hours old. Failed/requested retention markers protect the whole fixture. New, unrecognized or linked locations are not treated as permission to delete data. Fixed older benchmark paths in the policy were independently checked as generated, network-blocked mock output before retirement.

## What remains deliberately

- Actual accepted simulations, journals, initialization/admission records, lifecycle archives and paid/live evidence.
- Historical scope approvals, fixed proof inputs, offline gates and files consumed by historical tests or adapters.
- Final raw benchmark baselines for Phase 4E/4E.1/4E.2, citizen-menu storage and behaviour-quality evaluation.
- Aggregate benchmark JSON reports and hash inventories, including older reports whose redundant raw scratch trees have now been retired. Those summaries describe the original measurement; a missing retired scratch path is not a newly verified replay.
- The `phase7c1/derived` building workflow, because its manifests/chunks are still executable inputs.
- All project documentation and its required attachments.

Do not substitute `Remove-Item tmp -Recurse` for this policy. Some current historical tests depend on specific files there. Storage admission slots and real simulation archives are managed separately through [the archive lifecycle](STORAGE_ARCHIVE_LIFECYCLE.md), not workspace cleanup.

## Preventing test artifact growth

Four large offline guard helpers now use `scripts/testing/fixture-retention.ts`: admission cold-process, admission timeout, conversation-menu v5 and hybrid-map v2 tests. They remove only fresh directories created through an opaque ownership handle in that same process, after the child test and its final inspection assertions pass. They cannot register arbitrary existing folders for cleanup.

Failed tests remain for diagnosis and receive `.test-artifact-retention.json` with a finite failure reason. Explicit retention uses:

```powershell
$env:IMPACTLENS_KEEP_TEST_ARTIFACTS='1'
# Run your focused test command.
Remove-Item Env:IMPACTLENS_KEEP_TEST_ARTIFACTS
```

Requested fixtures receive a retention marker as well. Markdown/documentation or junctions/symlinks cause the owned fixture to be retained. Abrupt process termination may prevent teardown/marker creation; fresh directories are therefore excluded from workspace cleanup for 24 hours. Review a failed fixture explicitly before retiring it.

The helper is intended for bounded synthetic test fixtures, never real inference authorities or user simulation storage. New tests should use it instead of retaining every successful copy. Large benchmark evaluations should retain aggregate results and a deliberate baseline, rather than accumulating repeated private matrices indefinitely.

## Verification record

- Before cleanup, a separate inventory hashed **1,013 protected files**, including **903 Markdown files**. After cleanup, every recorded file remained and every checksum matched. This included `docs`, `Presentation`, all data files and private environment configuration. The cleanup's own independent protected-file checks passed too.
- Cleanup safety and fixture-retention tests cover preview-only behaviour, stale/forged plans, root/path escape, changed protected data, fresh/failed fixtures, private-root overrides, Markdown folders, linked/HTML assets, escaped spaces/parentheses and replaced junctions. Focused existing guard checks passed after cleanup without paid calls.
- TypeScript passed. A new production build was deliberately unnecessary: application code was unchanged, the existing production output was retained, and rebuilding would repopulate the caches just removed.
- Local detailed receipts: `tmp/workspace-cleanup-2026-11-07-8yDym0/{preview,receipt}.json`; independent preservation inventory/result: `tmp/workspace-preservation-before.json` and `tmp/workspace-cleanup-verification.json`.
- No saved simulation was resumed or recovered. No dependency removal, raw source change, Git history rewrite, commit or push was performed.
