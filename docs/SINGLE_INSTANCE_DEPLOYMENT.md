# Persistent single-instance deployment

The first supported operational topology is **one private Linux host, systemd, Node.js 24+, one Next.js process, and durable local disk**. The server listens on `127.0.0.1`; use an SSH tunnel to access it. This keeps access private without introducing a public authentication service.

The coordinator uses process-owned timers, local files and owner PIDs. Pending assumption reviews and in-flight request deduplication also live in memory. Replicas, PM2 cluster mode, rolling overlap, serverless functions, ephemeral disks, shared/network filesystems and container PID namespaces are outside this deployment path. An external process supervisor improves server availability; it does not turn simulations into durable distributed jobs.

## What is supplied

| File | Purpose |
| --- | --- |
| `deploy/impactlens.service` | Boot startup, one supervised process, bounded crash restarts, private permissions and HTTP drain time |
| `deploy/start-single-instance.sh` | Resolve the release directory and enter the instance lock |
| `deploy/with-instance-lock.sh` | Nonblocking OS lock shared by startup and maintenance; conflict exits 73 |
| `deploy/run-server.sh` | Run preflight under the lock, then replace itself with `next start` |
| `deploy/impactlens.env.example` | Private production environment template |
| `scripts/deployment-preflight.ts` | Version, configuration, source/assets and writable-path checks; configuration failures exit 78 |
| `/api/health` | Uncached liveness with no inference or filesystem writes |

The launcher uses `exec` so systemd supervises the actual Next.js process. The lock stays held through request draining and is released by the OS when that process exits. The same lock must cover backups, archival and release switching. Never delete, truncate-to-replace or rename `instance.lock`: a replacement inode would create a different lock. See the [flock manual](https://man7.org/linux/man-pages/man1/flock.1.html).

## Host and release prerequisites

Use a Linux host with systemd, `/bin/sh`, `/usr/bin/flock` from util-linux, Git, npm, curl and a system-wide Node.js 24+ installation. The template expects `/usr/bin/node`; edit `IMPACTLENS_NODE_BINARY` if Node is elsewhere outside `/home`. `ProtectHome=true` deliberately excludes home-directory Node installations. Build and run with the same Node major version. Check disk space for the active namespace, retained archives and backups separately.

The complete application checkout and runtime dependencies accompany the build. Source datasets are read relative to the working directory. The preflight inventories the GTFS files, Census/geography/facility/transport sources, four employment source/metadata pairs, generated public map assets, worker assets and build marker in `REQUIRED_RELEASE_FILES` inside `lib/server/deployment/preflight.ts`. It checks presence/readability, not source calibration; existing source hashes and model validators still apply. Keep original source bytes and the release commit with backups. Deploying `.next` alone is insufficient.

The `prebuild` script prepares public map assets. The build also fetches Google fonts when not already cached; allow installation/build network access. No provider keys are required to build or perform deployment acceptance.

## Initial installation

These commands are for the **target Linux host**. They do not install a service on the Windows development machine. Replace `<repository-url>` before running. Start from a fresh clone so development credentials and private run directories are not copied into the release.

```sh
set -eu
/usr/bin/node --version
npm --version
command -v flock systemctl
git clone <repository-url> impactlens-build
cd impactlens-build
npm ci
npm run build -- --webpack
npm run mrt:validate
release=$(git rev-parse HEAD)

sudo useradd --system --user-group --home-dir /var/lib/impactlens --shell /usr/sbin/nologin impactlens
sudo install -d -m 0755 /opt/impactlens/releases
sudo install -d -m 0700 -o impactlens -g impactlens /var/lib/impactlens
test ! -e "/opt/impactlens/releases/$release"
sudo cp -a "$PWD" "/opt/impactlens/releases/$release"
sudo chown -R root:root "/opt/impactlens/releases/$release"
sudo install -d -m 0700 -o impactlens -g impactlens "/opt/impactlens/releases/$release/.next/cache"
sudo chown -R impactlens:impactlens "/opt/impactlens/releases/$release/.next/cache"
sudo ln -s "/opt/impactlens/releases/$release" /opt/impactlens/current

sudo install -d -m 0750 /etc/impactlens
sudo install -m 0600 deploy/impactlens.env.example /etc/impactlens/impactlens.env
sudoedit /etc/impactlens/impactlens.env
sudo install -m 0644 deploy/impactlens.service /etc/systemd/system/impactlens.service
sudo systemd-analyze verify /etc/systemd/system/impactlens.service
sudo systemctl daemon-reload
sudo systemctl enable --now impactlens
sudo systemctl status impactlens --no-pager
```

Skip account creation if that dedicated account already exists. The first install requires `/opt/impactlens/current` not to exist; release updates use the stopped, locked procedure below. The cache is writable but disposable; the rest of the release is read-only to the service.

The production environment file uses literal `KEY=value` assignments, without `export`, command substitutions or `$OTHER_VARIABLE` expansion. It is read by systemd as root and passed to the service. Keep keys server-only and use the project's existing provider/model settings. Optional AI and speech features are disabled in the template. Startup refuses `.env`, `.env.local`, `.env.production` and `.env.production.local` inside a release so missing variables cannot inherit development credentials. Local `npm run dev` and `npm start` behaviour is unchanged.

## Persistent directories

| Setting | Template path | Retained contents |
| --- | --- | --- |
| `IMPACTLENS_STATE_DIRECTORY` | `/var/lib/impactlens` | Common durable root and stable `instance.lock` |
| `SOCIAL_STORAGE_ROOT` | `/var/lib/impactlens/simulations` | Accepted runs, journals, job records, report caches, admission evidence and `.storage-lifecycle` archives |
| `POPULATION_STORAGE_ROOT` | `/var/lib/impactlens/populations` | Reproducible population snapshots |
| `CITIZEN_DATASET_ROOT` | `/var/lib/impactlens/citizens` | Fictional citizen datasets and immutable companion manifests |
| Optional `SOCIAL_PROSE_OBSERVATION_ROOT` | `/var/lib/impactlens/observations` | Bounded private diagnostic evidence, when explicitly enabled |

All configured child paths must be absolute, disjoint, beneath the common state root, and outside the checkout. Symlink ancestors and file collisions are rejected. Empty optional diagnostic configuration disables that writer. The two new snapshot settings preserve existing local defaults when unset; simulation recipes, identities and serialized data remain unchanged.

systemd creates the durable root with mode 0700. Startup holds the instance lock while checking the release and writing/removing its own unique permission probes. It neither creates execution claims nor replays simulations. Capacity exhaustion or an existing maintenance transaction is diagnosed through the passive storage endpoint; it is not a reason to repeatedly restart an otherwise responsive server.

## Access and health

On the host:

```sh
curl --fail http://127.0.0.1:3000/api/health
curl --fail http://127.0.0.1:3000/api/storage/status
sudo ss -ltnp '( sport = :3000 )'
```

Expect health `{"version":1,"status":"ok"}` and a listener bound to `127.0.0.1`, not all interfaces. Capacity reports consumed attempts independently of the browser's recorded run list. Health does not verify provider credentials, available slots, dataset validity or job progress.

From your own computer, keep this tunnel running and open `http://127.0.0.1:3000`:

```sh
ssh -N -L 127.0.0.1:3000:127.0.0.1:3000 your-user@your-host
```

Keep application port 3000 closed to external access. This release does not add user accounts or authorize arbitrary public callers to consume paid APIs. Public hosting needs a separately designed authenticated reverse proxy; simply changing the bind address is not that design.

## Supervision and restart behaviour

The unit uses `Restart=on-failure`, ten-second backoff and at most five starts per five minutes. Configuration error 78 and lock conflict 73 do not trigger automatic restarts. `systemctl stop` leaves it stopped; `enable` starts it after boot. Review the [systemd service semantics](https://freedesktop.org/software/systemd/man/latest/systemd.service.html) when changing this policy.

```sh
sudo journalctl -u impactlens --since '10 minutes ago' --no-pager
sudo journalctl --disk-usage
sudo systemctl reset-failed impactlens
sudo systemctl start impactlens
```

Diagnose the failure before resetting the start limit. Logs remain private operational material; keep credentials and access tokens out of pasted logs. Manage journald retention as a host policy, separately from immutable simulation evidence.

**A server restart is not a simulation retry.** Pending reviews disappear with the process and must be prepared again. Process timers and in-flight deduplication are lost. Previously accepted files and immutable used-attempt claims remain on disk. Interrupted jobs are not automatically scheduled by startup, and uncertain provider outcomes must not be replayed automatically. Existing passive read/validation behaviour remains; this deployment adds no saved-partial-result recovery. There is no exactly-once guarantee for a remote provider call interrupted before durable settlement.

For a planned stop: pause active jobs through the existing UI, wait for the pause response and paused status, finish or discard pending reviews, then run `sudo systemctl stop impactlens`. Next.js drains in-flight HTTP requests on SIGTERM; that drain does not itself settle coordinator timers. The unit allows up to 300 seconds, then systemd can force termination. See the installed Next.js self-hosting guide for its signal behaviour.

## Locked maintenance and archival

Stop the service and verify it is inactive before maintenance. Run local storage commands as the service user, through the same instance lock, with an **explicit production root**. The storage CLI reads checkout environment files, not systemd's EnvironmentFile; omitting `--root` could inspect the wrong directory.

```sh
sudo systemctl stop impactlens
sudo systemctl is-active impactlens   # expect inactive; its nonzero exit is normal
cd /opt/impactlens/current
sudo -u impactlens env IMPACTLENS_STATE_DIRECTORY=/var/lib/impactlens \
  /bin/sh deploy/with-instance-lock.sh /usr/bin/node scripts/storage.ts status \
  --root /var/lib/impactlens/simulations
sudo -u impactlens env IMPACTLENS_STATE_DIRECTORY=/var/lib/impactlens \
  /bin/sh deploy/with-instance-lock.sh /usr/bin/node scripts/storage.ts rotate \
  --root /var/lib/impactlens/simulations --confirm
sudo -u impactlens env IMPACTLENS_STATE_DIRECTORY=/var/lib/impactlens \
  /bin/sh deploy/with-instance-lock.sh /usr/bin/node scripts/storage.ts verify \
  --root /var/lib/impactlens/simulations <archive-id>
sudo systemctl start impactlens
```

Use the configured Node binary if it differs from `/usr/bin/node`. To finish an interrupted archive transaction, use the same locked rotation command with `--confirm --complete`, then verify its returned ID. This finishes file maintenance only. Read [the archive lifecycle guide](STORAGE_ARCHIVE_LIFECYCLE.md) for the 32-slot policy, 16-period/24-GiB retention bounds and integrity refusal conditions. No operation silently deletes old claims or resumes paid work.

## Consistent backup and restore

After pausing and stopping the service, back up the **whole durable tree** under the same lock. Do not copy a live collection one file at a time. Store the backup outside the state directory; this example creates a service-owned private backup directory.

```sh
sudo systemctl stop impactlens
sudo install -d -m 0700 -o impactlens -g impactlens /var/backups/impactlens
cd /opt/impactlens/current
backup="/var/backups/impactlens/state-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
sudo -u impactlens env IMPACTLENS_STATE_DIRECTORY=/var/lib/impactlens \
  /bin/sh deploy/with-instance-lock.sh /bin/sh -c \
  'tar --exclude=./instance.lock -C /var/lib/impactlens -czf "$1" . && sha256sum "$1" > "$1.sha256"' sh "$backup"
sudo -u impactlens sha256sum --check "$backup.sha256"
sudo systemctl start impactlens
```

The external singleton lock is excluded because its inode must never be restored over a live lock. Keep every simulation lifecycle registry, archived namespace, claim, binding, initialization tombstone, job record and optional diagnostic file together. Preserve the release commit/source snapshots and private environment separately under appropriate access controls. Server backups do not recreate browser-held run lists; preserve run IDs/access tokens or the existing browser export privately as well.

Test restoration into an isolated stopped installation with the matching release first. Verify backup checksums and archive manifests before starting. Restore the complete tree with correct service ownership; do not merge selected journals or delete uncertain evidence to make startup pass. Do not roll back admission history while retaining later executed runs: losing newer claims could weaken duplicate protection. Restoring to a different host can also encounter conservative PID-owner checks; an unverifiable owner is a diagnosis task, not permission to force replay. This change deliberately provides no automatic restore/purge command.

## Updating and rolling back code

Build a new clean release in a separate directory and install it under a new commit-named path, with only `.next/cache` writable as above. Keep the old release and all source bytes until the new release passes acceptance. Pause and stop the running application before switching; this is a maintenance window, not a rolling deployment.

After a successful initial startup has created the stable service-owned lock, switch the symlink under that existing lock as root:

```sh
sudo systemctl stop impactlens
sudo test -f /var/lib/impactlens/instance.lock
sudo env IMPACTLENS_STATE_DIRECTORY=/var/lib/impactlens \
  /bin/sh /opt/impactlens/current/deploy/with-instance-lock.sh \
  /usr/bin/ln -sfn /opt/impactlens/releases/<new-commit> /opt/impactlens/current
sudo systemctl start impactlens
curl --fail http://127.0.0.1:3000/api/health
curl --fail http://127.0.0.1:3000/api/storage/status
```

If the new release fails, stop it and use the same locked switch to a previous **state-compatible** release. Keep the current state tree. Restoring an old backup is a separate disaster-recovery decision, not an ordinary code rollback. Never run two releases against the same state or replace the lock file during a switch.

## Verification and acceptance

Local Windows checks cover snapshot storage, preflight, source/asset presence, path/symlink rejection, shell syntax and the application build. Native Linux process checks are provided in `.github/workflows/persistent-deployment.yml`: systemd unit verification, actual `flock` exclusion/crash release, no preflight writes during locked maintenance, restart state retention and a built Next.js liveness/capacity smoke test with new temporary state and AI disabled. The workflow has not been run from this implementation session; Linux success is not claimed.

On a Linux checkout:

```sh
for script in deploy/*.sh; do sh -n "$script"; done
systemd-analyze verify deploy/impactlens.service
node --test --test-concurrency=2 lib/contracts/tests/persistent-deployment*.test.ts
npm run build -- --webpack
node scripts/testing/persistent-production-smoke.ts
```

Before calling a particular host operational, also verify real service boot startup, dedicated-user permissions, crash backoff, explicit stop, private SSH access and a stopped backup/restore drill on that host. Those host-level checks cannot be established by a Windows build or a fixture process test. No host has been provisioned or installed by adding these files.
