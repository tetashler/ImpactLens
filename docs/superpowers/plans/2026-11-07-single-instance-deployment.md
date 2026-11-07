# Single-instance persistent deployment implementation plan

**Goal:** Provide one repeatable production operating path for the existing disk-backed, process-owned simulation coordinator.

**Architecture:** One private Linux host with systemd, Node.js 24+, one loopback-only `next start` process and durable local disk. A nonblocking OS `flock` held across `exec` excludes a second supported launcher. Simulation state, population snapshots and fictional citizen snapshots live outside the checkout. An SSH tunnel supplies private remote access. systemd restarts the server after a crash; it never resumes simulations or restores pending reviews.

**Tech stack:** Existing Next.js/TypeScript; Node.js filesystem APIs; POSIX shell; systemd and util-linux `flock`. No new application dependency or distributed worker system.

## Decisions and constraints

- This deployment target and private SSH access are implementation choices. The user requested one persistent supervised topology and has authorized autonomous implementation.
- Keep development commands and default paths compatible. Production gets an explicit entry point with configuration validation before listening.
- Keep `SOCIAL_STORAGE_ROOT` intact; add server-only `POPULATION_STORAGE_ROOT` and `CITIZEN_DATASET_ROOT` overrides for the remaining snapshot writers. Default recipes, identities and bytes do not change.
- Keep the application root as the working directory: official source files remain runtime dependencies and must accompany every release. A `.next` directory alone is insufficient.
- Preflight requires production mode, Node 24+, a built release, required source/public assets and three absolute, disjoint, writable state paths outside the checkout. Fail with finite diagnostics and exit 78, without printing environment values or private records. Probes clean up only files they create; no claims, provider calls or simulation recovery.
- Hold the singleton lock outside the rotated namespace, under `/var/lib/impactlens/instance.lock`. Stop all application processes before archival, backups or an update. Preserve the entire state tree, build/source version and browser-held access capabilities.
- Use systemd restart backoff and a start-rate bound. Do not restart on configuration error or lock conflict. Give Next.js time to drain HTTP requests; before planned shutdown, explicitly pause active jobs through the existing UI. An abrupt interruption can leave uncertain evidence; accepted records and duplicate protections remain authoritative.
- Add a minimal uncached liveness endpoint with no filesystem writes or inference. Capacity is a separate passive diagnostic; full storage should not trigger automatic restart loops.
- No existing user data migration, cloud provisioning, service installation, private environment edits, paid inference, automatic commit/push or saved-partial simulation recovery.

Builder review additions: maintenance must hold the same external lock for its entire operation; never replace the lock inode. Storage CLI commands must pass production `--root` explicitly because they do not load systemd's EnvironmentFile. Validate canonical state ancestors, including optional `SOCIAL_PROSE_OBSERVATION_ROOT`, and include that directory in backups. Planned stops wait for explicit job pause settlement; HTTP draining alone does not settle timers.

## Implementation tasks

### 1. Persist every private runtime snapshot outside the release

Files: `lib/server/population/store.ts`, `lib/server/citizen-grounding/data.ts`, `.env.example`, new `lib/contracts/tests/persistent-deployment.test.ts`.

- [x] Add tests showing configured default snapshot writes and loads use separate fixture state paths, preserve stable IDs/bytes, honour explicit trusted overrides and keep existing defaults.
- [x] Add the two optional environment overrides without changing generation or validation.

### 2. Validate and launch one production process

Files: new `lib/server/deployment/preflight.ts`, `scripts/deployment-preflight.ts`, `deploy/start-single-instance.sh`, `deploy/impactlens.service`, `deploy/impactlens.env.example`, package scripts.

- [x] Test production mode/version, invalid or nested paths, missing build/source/assets, own write-probe cleanup and absence of admission side effects.
- [x] Implement the preflight and finite CLI errors. Startup validates writable state before serving; no unused inspection mode was added.
- [x] Add the POSIX entry point; use `exec` with fixed loopback host and validated port (default 3000) and the existing Next.js CLI rather than a custom web server.
- [x] Add the systemd unit with durable state, private permissions, singleton `flock`, bounded crash restarts, controlled shutdown and journald logs. No service was installed on the current workstation.

### 3. Operational health and Linux verification

Files: new `app/api/health/route.ts`, deployment regression tests, Linux workflow if native tooling is unavailable locally.

- [x] Verify liveness is dynamic/no-store and makes no inference requests or storage mutations.
- [x] Add Linux-only process tests for a second launcher refusing the same lock, lock release after process death, state survival after restart, loopback binding and stop behaviour using isolated fake releases/providers. A separate built-server Linux smoke script is provided.
- [x] Run local shell syntax checking and provide native systemd/unit/process verification in the Linux CI workflow. Linux execution is pending; it was not claimed as a local pass.

### 4. Operator guide and final verification

Files: new `docs/SINGLE_INSTANCE_DEPLOYMENT.md`, README and archive guide links.

- [x] Document prerequisites, source/data inventory, installation, private environment configuration, boot enablement, SSH tunnel, health checks, logs, capacity, planned stops, offline archives, consistent backups, updates and rollback without deleting state.
- [x] Explain restart semantics: reviews expire with the process; background timers stop; no automatic simulation replay or exactly-once provider guarantee. Replicas/serverless/ephemeral/shared network disks are unsupported by this path.
- [x] Run focused snapshot/deployment and existing storage/coordinator/review regressions, TypeScript, production webpack build and HTTP smoke checks. Linux host acceptance remains explicitly separate.

## Verification record — 2026-11-07

- Independent plan and final code/operations review completed; no blocking findings remained.
- Regression command: `node --test --test-concurrency=2 lib/contracts/tests/persistent-deployment*.test.ts lib/contracts/tests/population-foundation.test.ts lib/contracts/tests/citizen-data-server.test.ts lib/contracts/tests/assumption-review-api.test.ts lib/contracts/tests/deep-coordinator.test.ts lib/contracts/tests/phase4e2-coordinator.test.ts lib/contracts/tests/storage-inference-coordinator.test.ts lib/contracts/tests/storage-admission-v1.test.ts lib/contracts/tests/storage-archive*.test.ts lib/contracts/tests/storage-lifecycle*.test.ts`, with the existing offline network guard. **86 passed, zero failed, one Linux-only process test skipped on Windows.** Evidence: `tmp/persistent-deployment-regressions.log`.
- `npx tsc --noEmit` passed. `npm run build -- --webpack` passed, including dynamic health routing and private trace filtering. Evidence: `tmp/persistent-deployment-tsc.log`, `tmp/persistent-deployment-build.log`.
- All deployment shell files passed `sh -n` through Git Bash. Both standalone TypeScript scripts passed `node --check`. Workflow YAML parsed successfully.
- Actual Windows production HTTP smoke on an isolated port/state directory: `/api/health` returned no-store/ok; `/api/population` wrote to the configured snapshot root; after stopping and launching a fresh production process, GET by population ID returned the same snapshot with identical SHA-256 bytes. Both test servers were stopped. Evidence: `tmp/persistent-deployment-http-proof.json`.
- Native Linux `flock`, `systemd-analyze verify`, the Linux built-launcher smoke and real systemd boot/user/sandbox/backoff/restore acceptance have **not** run here. The workflow and operator commands provide those gates; no remote CI was triggered or host provisioned.
- No existing simulations were migrated or resumed. No private environment file was edited. No paid inference, service installation, commit or push occurred.
