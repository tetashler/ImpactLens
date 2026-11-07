# Local simulation storage and archival

ImpactLens admits up to **32 execution attempts per active storage period**. A failed attempt can consume a slot because its immutable claim prevents accidental repeat execution. Removing a recorded exploration from the browser does not release a server slot. The capacity display under Explore is advisory; the server checks admission again before execution.

For the supervised Linux deployment, follow the [persistent deployment guide's locked maintenance commands](SINGLE_INSTANCE_DEPLOYMENT.md#locked-maintenance-and-archival). Stop systemd first, hold the external instance lock and pass the production `--root` explicitly. The storage CLI does not read systemd's EnvironmentFile.

## Check capacity

From the project directory:

```powershell
npm run storage:status
```

The status contains aggregate counts only. An inspection failure returns blocked storage with unknown counts, rather than claiming that capacity is free. The browser uses the same read-only information at `/api/storage/status`. Loading status does not create storage, resume simulations or call an AI provider.

## Archive the active period

1. Stop **every ImpactLens application process** using this storage, including development and production servers. Close any separately launched simulation/report workers. A live registered process blocks maintenance even when it is waiting for a human assumption review.
2. Check status, then explicitly archive and rotate:

   ```powershell
   npm run storage:status
   npm run storage:rotate -- --confirm
   ```

3. Copy the archive ID printed by rotation and verify it:

   ```powershell
   npm run storage:verify -- <archive-id>
   ```

4. Restart the application and refresh capacity. The new active period has 32 slots.

The CLI reads `.env.local` and honours `SOCIAL_STORAGE_ROOT`, matching the application. A trusted operator can explicitly select another local root with `--root <directory>`; the browser cannot select a root or initiate maintenance. Use the same configuration and Windows account as the application.

Node.js 24 or later is required, as declared in `package.json`. The maintenance mutex uses the built-in [`node:sqlite` API](https://nodejs.org/download/release/v24.9.0/docs/api/sqlite.html). Its database contains no simulation data; it supplies a process lock that the operating system releases when a process exits. Persistent maintenance markers and transaction files still require explicit completion after an interrupted rotation. Passive capacity reads never open or create the database.

Rotation inventories the active namespace and associated report/graph caches, hashes every retained file, writes a persistent transaction, moves the files, and verifies the archive before committing the next period. New attempts still check all retained claims, including unsuccessful and unbound attempts. An old attempt ID stays used after rotation.

Original run IDs and access tokens continue to authorize archived reads. Archived runs are read-only: controls and new report generation are refused. Valid cached report/graph artifacts can still be read. Retention does not regenerate an artifact whose snapshot identity no longer matches, and never resumes a partially completed simulation.

## Interrupted maintenance

Keep the application stopped. An interrupted transaction blocks new work until explicit filesystem maintenance finishes:

```powershell
npm run storage:rotate -- --confirm --complete
npm run storage:verify -- <archive-id>
```

Completion verifies the transaction and retained files before finishing the same rotation. It does not retry a simulation or contact a provider. A live or unverifiable maintenance owner, corrupt evidence or uncertain temporary file blocks completion. Preserve the storage directory for diagnosis instead of deleting admission files or bypassing the check.

## Retention and limits

The active namespace remains `session-store-v2`. Lifecycle metadata and archived periods live under `.storage-lifecycle` inside the configured storage root. Each archive retains its namespace, report artifacts and a SHA-256 manifest; the registry pins the manifest hash. Runtime guards verify archive structure and duplicate-execution evidence. Reads verify the specific archived files they consume. Full archive verification is available through the CLI, without rehashing entire simulation journals before every provider request.

Retention is bounded to **16 archived periods and 24 GiB of archived file contents**, alongside the existing 3 GiB active namespace limit. The active namespace file ceiling is 384, including room for legitimate temporary writes and coordinator files. A limit or integrity failure blocks admission explicitly. Archives are never automatically deleted or evicted. This version provides no purge command or automatic retention expansion.

The archive is local retained evidence, not a backup on another device. Keep the entire configured storage root together when backing it up: active storage, lifecycle metadata and archived files are needed to preserve duplicate protections. Archives contain private simulation data and access capabilities and should receive the same access controls as active storage.

## Verification boundaries

Implementation tests use temporary fixture roots and offline mock providers. They cover exhausted capacity, old-attempt rejection after rotation, pending-review exclusion, interrupted maintenance, archive integrity, authenticated historical reads and immutable cached reports. Implementation does not rotate or delete existing user simulations.
