# Deliberate local storage archive lifecycle

**Goal:** Expose the real 32-slot admission capacity and provide explicit, verified storage-period archival/rotation while preserving immutable execution evidence and duplicate-attempt protection.

**Architecture:** Keep the current `session-store-v2` active path. Add a bounded lifecycle directory outside it for archived periods, manifests, a maintenance barrier and process-lifetime runtime registrations. Maintenance is CLI-only and requires application processes to be stopped. Archived periods are immutable, authenticated and read-only; new attempts use a fresh active period. No existing user storage will be rotated as part of implementation/testing.

## Behaviour and constraints

- Display capacity independently of the browser's four-item run list. Count consumed claims, including failed/unbound attempts; inspection failure means unknown capacity, never invented free slots.
- A new read-only `/api/storage/status` returns a finite, strictly parsed status without paths, IDs, capabilities or claim contents. Reject query/body-selected paths and cross-origin requests; use no-store/nosniff.
- Provide `npm run storage:status` and explicit local maintenance/verification commands. No destructive HTTP administration API.
- Runtime registration and maintenance must coordinate across processes. A runtime captures its active generation; stale generation contexts fail closed. Rotation refuses live/unverifiable runtime registrations, active job owners/leases, uncertain `.pending`/`.incomplete-` artifacts and concurrent maintenance. Pending human reviews remain protected by their live server registration.
- Rotation verifies bounded files and their SHA-256 hashes, moves the whole active namespace into a generated archive directory, verifies it again, and activates a new period only after successful verification. Associated report/graph artifacts are retained and removed from active quota through the same transaction.
- Persist a transaction before changing paths. An interrupted transaction blocks application mutation. Only an explicit CLI completion operation can finish filesystem maintenance; it never recovers or resumes a simulation or dispatches inference.
- Keep every archived claim/binding/initialization byte. New claims check attempt hashes across active, legacy and archived periods. Never reclaim claims by deleting slot files.
- Declare bounded archive retention (initial target: sixteen periods) and aggregate archive-byte capacity; reaching the bound fails explicitly. No automatic deletion or silent retention eviction. Account for active transient files separately from steady records.
- Resolve archived runs by a bounded manifest registry, reject ambiguous locations, retain original IDs/tokens, validate archived bindings, and present existing historical-read-only semantics. Archived GETs do not recover journals, start coordinators, or update snapshots. Archived report generation is refused; retained cached reports remain readable.
- Preserve current source datasets, calculations, provider selection, explicit retry policy and numerical settings. No mobile work, paid calls, saved-partial recovery, actual user archive/rotation, or automatic commit/push.

## Work packages

1. Lifecycle backend: cross-process maintenance/runtime coordination; bounded manifests and transaction; immutable archive discovery/verification; duplicate ledger integration; CLI and failure-injection tests.
2. Historical integration: public run resolution, authenticated read-only projection, explicit historical social service mode, retained report/graph cache lookup and write refusal; offline integration tests.
3. Capacity/API/UI: strict DTO, passive endpoint, desktop status/refresh/CLI help, safe storage-error mapping through prepare and reviewed-start flows; browser and route tests.
4. Integration/review: process-race and interrupted-maintenance tests, existing storage/admission/assumption/report regressions, TypeScript and production build; document operational workflow and limits.

## Acceptance focus

- Fill 32 slots, archive explicitly offline, obtain 32 new slots, and reject every old attempt without provider calls.
- Old run IDs/tokens still read retained summaries and report artifacts; controls and generation remain refused.
- Live application/pending review/inference/report process blocks rotation, including during the first attempt; startup while maintenance holds the barrier is blocked.
- Failure after each filesystem boundary preserves original evidence and blocks new paid work until explicit maintenance completion. Repeating completion cannot move/delete the wrong period or duplicate tombstones.
- Corrupt manifests, missing/mismatched archived files, unexpected symlinks/paths and bounded-capacity exhaustion fail closed.
- No status or public error reveals local paths, raw claims, capabilities or private statements.

The user authorized implementation and autonomous assistance. Routine architecture choices above are implementation decisions, not claims of additional user preferences. The first version intentionally uses offline CLI maintenance to avoid rotating paths under a live server.

## Implementation and verification — 2026-11-07

- Implemented the passive status DTO/route, capacity display and manual refresh, with retained archive counts and CLI instructions.
- Implemented SHA-256 manifests, a chained bounded registry, cross-process runtime registration and namespace rotation. A built-in SQLite exclusive transaction supplies the OS-released maintenance mutex; persistent markers/transactions retain interruption evidence. Its database contains no execution data. Passive status never opens it.
- Implemented explicit completion after maintenance interruption, including abrupt process exit while holding the mutex. Unknown admission files, orphaned archives, corrupt claims/manifests and untracked archive files fail closed. Verified dead runtime registrations can be pruned under the mutex; execution claims are never pruned.
- Added authenticated archived run/session/report reads, verified retained-file hashes, immutable historical projections and refusal of archived controls/generation. Browser report readers validate retained server snapshot identities and never generate missing archived reports.
- Preserved inference-admission capabilities in a shared storage fetch wrapper, including planning before a claim exists and default report generation. A regression demonstrated a second planning request after storage became blocked; the fixed path stops before that dispatch.
- Verified all **267 relevant regression tests passed**, with zero failures/skips. This includes storage/admission/coordinator, archive lifecycle/CLI/process crashes, assumption review, map-first, report and graph summary coverage. Test evidence: `tmp/storage-lifecycle-regression-final.log`. The earlier whole-repository run was interrupted before completion; this is not a claim that the entire repository suite passed.
- `npx tsc --noEmit` passed. `npm run build -- --webpack` passed, including production route generation and private build-trace filtering. Evidence: `tmp/storage-lifecycle-tsc-final.log` and `tmp/storage-lifecycle-build-final.log`.
- Desktop production UI checked through Chrome MCP using an isolated, empty storage root and disabled inference: displayed 0/32 used and 32 available, archive instructions and 0/16 retained, no horizontal overflow. Mount made one status GET; manual refresh made exactly one additional GET. No inference/report generation requests occurred, and the fixture root remained empty.
- Existing user simulations were not rotated, deleted or resumed. No commit or push was performed.

Relevant regression command (PowerShell, from the repository root):

```powershell
$env:NODE_OPTIONS='--import=./scripts/testing/offline-network.mjs'
node --test --test-concurrency=2 lib/contracts/tests/storage*.test.ts lib/contracts/tests/*report*.test.ts lib/contracts/tests/graph-node-summary*.test.ts lib/contracts/tests/assumption-review*.test.ts lib/contracts/tests/hybrid-storage-admission.test.ts lib/contracts/tests/map-first*.test.ts
Remove-Item Env:NODE_OPTIONS
```

Keep Node test-runner options **before** the file arguments; appending them through `npm test -- ...` does not constrain the runner as intended here. See [the operator guide](../../STORAGE_ARCHIVE_LIFECYCLE.md) for the maintenance workflow and retention limits.
