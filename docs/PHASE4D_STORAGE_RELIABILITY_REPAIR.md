# Phase 4D Storage Reliability Repair

**Readiness: PASS - default storage verified and application reliability repaired in the normal Windows user context.** 30 October 2026, Asia/Singapore (UTC+8).

The original default directories work under the normal Windows account. The restricted Codex account still receives EPERM there. No Windows permissions were changed, no alternate production default was selected, and no historical records were migrated. Future application runs must use the verified normal-user context, or perform an explicit trusted-root preflight.

## Baseline and confirmed cause

Started on `master`, clean, HEAD `d1710eb9d79a3f85ade27a6cfad730b06e51fbdb`. Phase 4D's prior 995 tests and isolated-root acceptance are historical observations; this task directly tested the original stores.

Same script, paths and disposable probe operations:

| Execution context | Original accepted-private | Original social-sessions | Repository tmp |
|---|---|---|---|
| Restricted Codex account | EPERM on exclusive create | EPERM on exclusive create | PASS |
| Normal Windows user | PASS: create, write, fsync, rename, replace, readback, cleanup | PASS: same operations | PASS |

Original paths:

- `data/derived/agents/accepted-private`: accepted execution, safe projection, capability token and session identity.
- `data/derived/agents/social-sessions`: run-to-session `.index` and durable append-only `.jsonl` checkpoints/reservations.

Both default directories have ordinary Directory attributes: no ReadOnly/ReparsePoint flag or link target. Owner is the normal Windows user; ACL inheritance is enabled. Inspected rules include inherited user FullControl, sandbox-group Modify, and an inherited Everyone deny for DeleteSubdirectoriesAndFiles. The writable tmp directory also contains that deny, so it does **not** by itself explain create failure. The restricted account and additional sandbox ACL entries differ from the normal account; the exact restricted-token/ACE decision was not decoded.

**Confirmed boundary:** access depends on execution context, before any application logic runs. An unpredictable new filename fails in the restricted account, ruling out existing archive collisions, an application lock or replacement logic as the cause of that create failure. Identical operations succeed in the same OneDrive-backed location as the normal user. There is no evidence that OneDrive, antivirus or Controlled Folder Access caused this failure; those controls were not disabled or reconfigured. No ACL, ownership or system-policy repair is justified by this evidence.

## Application reliability repairs

1. **Fail before inference.** `handlePublicExplore` checks both authoritative stores before calling the dynamic provider service. Each check creates a unique owned probe, fsyncs it, atomically replaces it, reads it back and removes it. An unusable accepted or journal store returns HTTP 503 with `PRIVATE_STORAGE_UNAVAILABLE` and a fixed message that no provider request started. Diagnostics expose only allowlisted codes, never paths, conversation text or provider bodies.
2. **Cover pending-file failure cleanup.** `replacePrivateCheckpoint` now runs write/fsync and bounded rename retries inside the pending-file cleanup boundary. A simulated EIO during fsync previously leaked a pending file; it now preserves the old accepted checkpoint and removes the partial pending file. Existing five-attempt EPERM/EBUSY replacement bounds remain unchanged and never repeat inference/reducer work.
3. **Await failure checkpoints.** The public continuation error handler previously called an async checkpoint write without awaiting it. A blocked checkpoint could return a partial response while also producing an unhandled rejection. It now awaits and catches the failure. The journal preserves the accepted action; after the store becomes available, reading the latest public revision and continuing recovers the journal without another model completion.

Preflight is point-in-time admission, not a guarantee against later disk failure or permission changes. It creates no session and never touches historical files. Passive GET/history restoration does not run write probes, advance time or invoke inference.

## Configuration and history continuity

`privateStoreDirectory` is unchanged: absent `SOCIAL_STORAGE_ROOT`, both stores stay under `data/derived/agents`. The trusted process-local override relocates **both** beneath one explicit root. Only server configuration/dependency injection selects paths; browser request schemas provide no directory selector.

No new production location was introduced. The normal-user default passed, so an automatic migration, fallback directory or read-only legacy discovery layer would add unnecessary ambiguity. Known historical run IDs/capabilities continue resolving to their original accepted archive and journal. The original legacy subdirectory was left untouched.

The override was separately tested at `tmp/phase4d-storage/trusted-root`; this is an ignored test location, not a new permanent machine configuration. Arbitrarily changing the production root would still make existing archives unavailable unless their original root remains selected. This task does not claim cross-root history merging or silently copy private records.

Browser history is the existing bounded summary/capability history, not a new unauthenticated server-wide archive list. Both saved-history lookup and authorised public-summary restoration were tested.

## Offline lifecycle evidence

The maintained `scripts/testing/storage-lifecycle.ts` imports the external-fetch guard and injects fixture adapters through the actual public/service/gateway contracts. It runs create and recover in separate Node processes; no keys are loaded from a credential file.

Both original-default/normal-user and trusted-override/restricted-account modes passed:

- Accepted two mocked planning completions and eight initial stakeholder actions.
- Registered the accepted run, authoritative social session and run index.
- Wrote bounded continuation checkpoints, then restarted the process mid-run.
- Recovered the same session/revision and completed 80 steps with eight additional mocked decisions, two private groups and 526 events in the fixed fixture.
- Restored exact deterministic state, including accepted decisions/memory, from the journal.
- Restored browser-safe history/summary records; duplicate registration and passive reads caused no additional inference.
- Kept `RAW_` fixture content out of ordinary public/history projections.

The runner persists an owned attempt ID before creation and a cleanup manifest before deletion. Cleanup runs even when recovery fails. A journal can be written before its index exists; ownership is then recovered from the new journal's parsed run ID and session filename, excluding all pre-existing records. Injected recovery failure initially left three files; injected missing-index failure initially left one orphan. Both cases now leave **zero** fixture records. These fault tests used only the trusted test root.

### Historical preservation

A pre-task SHA-256 manifest covered **55 top-level historical accepted/journal/index files**. All 55 hashes and the original file inventory matched after lifecycle testing and after desktop fixture cleanup. The separate existing `accepted-private/legacy` directory was not modified or migrated. Probe and fixture deletion used unique identities and content/hash checks, never recursive deletion of default stores.

The two actual Phase 4C qualifying worlds also restored through read-only HTTP summary requests:

| Historical attempt | HTTP | Recorded events | Accepted social decisions | Identity/archive |
|---|---:|---:|---:|---|
| 14: Sengkang eldercare | 200 | 773 | 8 | Match / unchanged |
| 15: four-day workweek | 200 | 691 | 8 | Match / unchanged |

These are historical outputs, not newly inferred results. No raw dialogue was copied into evidence reports. All task-owned default probe/browser/lifecycle files were removed; all 55 original top-level records remain. No cleanup blockage remains.

## Desktop and privacy acceptance

Production-build test server ran as the normal Windows user with **SOCIAL_STORAGE_ROOT absent**, dummy process-only keys, explicit fixture adapters and external-provider fetch blocked. Startup confirmed `PHASE4D_OFFLINE_GUARD_READY` with `paidDispatch:false`; port 3197 was task-owned.

Actual Map -> Explore -> background completion -> Knowledge Graph -> summary inspectors -> Report -> reload/history restoration passed at 1440x900 and 1920x1080. Final browser fixture: 8 initial actions, 8 social decisions, 24 agents, 530 events (8 seeds + 8 social-model events + 514 rule events), four platforms, two private groups, 33 graph nodes and 207 edges.

Eighteen observed ordinary API responses had no raw sentinels; HTML and browser storage were clean. Graph dragging moved three connected neighbours, settled, and retained positions across navigation. Same-run restoration made no second Explore. Zero page/console errors or horizontal overflow were observed. No mobile testing was performed. The owned server and browser context were stopped afterward.

Ignored evidence: `tmp/phase4d-storage/desktop.json`, `history.json`, `preservation.json`, `probe-sandbox.json`, `probe-host.json`, `lifecycle-default.json`, `lifecycle-override.json`, RED/GREEN logs and server guard logs. Screenshots: `map-1440.png`, `graph-1440.png`, `graph-1920.png`, platform/group/agent inspectors at both sizes, `drag-1920.png`, `settled-1920.png`, `report-1440.png`, `report-1920.png`, `restored-report-1920.png`.

## Automated verification

- **1,001 Node tests passed**, zero failed/skipped (995 baseline plus six focused regressions).
- Application TypeScript and strict affected-module TypeScript passed.
- Production build and `git diff --check` passed.
- Focused storage, archive/history, permission/privacy, replay and checkpoint-failure tests passed.
- Two independent review passes identified cleanup edge cases; all material findings were repaired and rereviewed.
- Numerical model interfaces were unchanged; existing Node model regressions passed. Standalone numerical CLIs/GIS were not separately rerun; no Shapely/GIS pass is claimed.

## Reproduction

Use a normal Windows PowerShell terminal in this repository. The default test must be run under the intended application account; running it under the restricted Codex account correctly rejects before inference.

```powershell
# Offline fixtures only; original default stores. Creates/removes only verified owned fixture records.
node scripts/testing/storage-lifecycle.ts default

# Separate test-root configuration, not evidence that default permissions work.
node scripts/testing/storage-lifecycle.ts override

$guard = ([Uri](Join-Path (Get-Location) 'scripts/testing/offline-network.mjs')).AbsoluteUri
$previousNodeOptions = $env:NODE_OPTIONS
try {
  $env:NODE_OPTIONS = "--import=$guard"
  npm.cmd test
  npx.cmd --no-install tsc --noEmit
  npx.cmd --no-install tsc -p scripts/testing/tsconfig.phase4d.json --noEmit
  npm.cmd run build
} finally {
  $env:NODE_OPTIONS = $previousNodeOptions
}
git diff --check
```

For default-root mocked desktop acceptance, use the existing server helper from a normal-user PowerShell process:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/testing/phase4d-mock-server.ps1 -Port 3197 -DefaultStorage -StorageRepair
```

Confirm its guard log. Invoke the async Playwright function in `scripts/testing/phase4d-desktop.mjs` with configuration `{url:'http://127.0.0.1:3197', output:'<repository>/tmp/phase4d-storage'}`. Save its returned safe result, stop the exact owned PID recorded in `tmp/phase4d-storage/server.json`, and remove only verified fixture files. The desktop fixture uses the real default archive, so cleanup must verify the run/session identities and preserve historical hashes as done in this task.

For ordinary offline development in that normal-user terminal:

```powershell
Remove-Item Env:SOCIAL_STORAGE_ROOT -ErrorAction SilentlyContinue
$env:STAKEHOLDER_LIVE_ENABLED = 'false'
$env:SOCIAL_LLM_ENABLED = 'false'
npm.cmd run dev
```

These are process-local settings. No persistent machine configuration or credential file is modified. Real inference remains separately unauthorised in this assignment.

## Readiness limits

| Configuration | Result |
|---|---|
| Original defaults, normal Windows application account | PASS: durable lifecycle, restart, replay, history, desktop |
| Original defaults, restricted Codex execution account | BLOCKED by EPERM; now fails before provider dispatch |
| Explicit trusted override, restricted account | PASS for isolated fixture lifecycle; not selected as a new production default |

The permission itself was **not** changed: reliable default operation is established for the normal application account, and application failure handling is repaired. Do not launch a paid run under a context that still fails storage admission. No conclusion about unrelated antivirus/OneDrive configurations or future disk faults is implied.

**No paid Tavily/OpenRouter/DeepSeek requests, Git mutations, deployment, package installation, credential-file changes, broad ACL changes, record migration or secondary-directory access occurred.** Changes are unstaged and uncommitted.

## Changed files

- `docs/PHASE4D_SOCIAL_INTELLIGENCE_IMPLEMENTATION.md`
- `docs/PHASE4D_STORAGE_RELIABILITY_REPAIR.md`
- `docs/superpowers/plans/2026-10-30-storage-reliability.md`
- `lib/contracts/tests/storage-reliability.test.ts`
- `lib/server/society/public-service.ts`
- `lib/server/society/storage.ts`
- `scripts/testing/dynamic-provider-preload.mjs`
- `scripts/testing/phase4d-desktop.mjs`
- `scripts/testing/phase4d-mock-server.ps1`
- `scripts/testing/storage-lifecycle.ts`
- `scripts/testing/tsconfig.phase4d.json`
