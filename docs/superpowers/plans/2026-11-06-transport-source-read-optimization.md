# Transport source-read optimization: research and implementation plan

> Status: implemented on 2026-11-06 following the user?s instruction to continue. Focused tests, final TypeScript, production build and independent review passed.
>
> For agentic implementers: use the project's implementation and verification skills, preserve unrelated working-tree changes, and complete the focused regression checks below. Do not run paid inference or resume saved simulations.

**Goal:** Remove the duplicate transport-source loading pass in the normal citizen-impact calculation while preserving source-byte verification, calculation identities and existing dependency injection.

**Architecture:** Expose the existing combined transport loader, which already returns a frozen demand reference and station-access index. Use that combined result once in the default calculation path. Preserve the individual accessors and their strict verification behaviour for existing callers.

**Tech stack:** TypeScript, Node.js 24+, Next.js server modules, native `node:test`.

**Scope:** This first change halves duplicated transport loading in one calculation path. Eliminating reads across separate calculations is a different integrity-policy decision and is outside this implementation.

## Research findings

### Current call chain

`lib/server/citizen-grounding/api.ts` calls `deps.demand(baseline)` and then `deps.access(baseline)` in `calculateCitizenImpact`.

Their default implementations are `loadTransportDemandReference` and `loadStationAccessPoints` in `lib/server/citizen-grounding/transport-data.ts`. Both call the same private `load(graph)` function. Each invocation:

1. Computes `graphCostFingerprint(graph)`.
2. Reads all three source files and checks their expected SHA-256 hashes.
3. Looks up a graph-specific cached result.
4. On a miss, parses source data, validates the reference identity and caches the frozen combined result.

Relevant locations at investigation time:

- `lib/server/citizen-grounding/transport-data.ts:64`: combined result cache.
- `lib/server/citizen-grounding/transport-data.ts:67`: source reads and hashes before the cache lookup.
- `lib/server/citizen-grounding/transport-data.ts:73`: individual demand accessor.
- `lib/server/citizen-grounding/transport-data.ts:74`: individual station-access accessor.
- `lib/server/citizen-grounding/api.ts:13`: independently injected demand/access dependencies.
- `lib/server/citizen-grounding/api.ts:23`: two sequential transport accessor calls.
- `lib/citizen-grounding/commute.ts:22`: content-based graph fingerprint.

### Read volume

Sizes were inspected using filesystem metadata; no benchmark was executed.

| Source | Bytes |
|---|---:|
| `data/transport/origin_destination_train_202609.csv` | 37,984,710 |
| `data/transport/LTAMRTStationExitGEOJSON.geojson` | 213,480 |
| `data/transport/mrt-network/stops.txt` | 59,221 |
| One complete loading pass | 38,257,411 |
| Two loading passes per normal calculation | 76,514,822 |

These are bytes requested through Node's filesystem APIs, not necessarily physical disk reads. The operating system may serve cached pages. A cold parse also performs work beyond these source reads, including OD validation and its source hash; do not confuse read-count reduction with total hashing or total request duration.

### Integrity checks are deliberate

`lib/contracts/tests/citizen-transport-data.test.ts:35` and `:40` require a warmed cache to reject changed OD and GTFS crosswalk bytes. The tests replace `readFileSync` results without changing filesystem metadata.

Therefore, moving `cache.get()` ahead of source verification or substituting metadata checks would change an existing guarantee. The first implementation must retain those tests and that guarantee at each loader invocation.

### Documentation consulted

- [Node.js 24 filesystem documentation](https://nodejs.org/docs/latest-v24.x/api/fs.html#synchronous-api): synchronous filesystem APIs block the event loop until completion.
- [Node.js filesystem watcher caveats](https://nodejs.org/docs/latest-v24.x/api/fs.html#caveats): watchers have platform/filesystem caveats and are not a substitute for content verification.
- [Node.js file-stat documentation](https://nodejs.org/docs/latest-v24.x/api/fs.html#stat-time-values): nanosecond timestamp fields require bigint stats, and actual precision is platform-dependent.

Current Node documentation was also checked using Context7. Repository investigation and an independent read-only review agreed on the combined-loader recommendation.

## Requirements and non-goals

- Preserve all three expected source hashes, row/period checks and station-exit checks.
- Preserve error behaviour when a source is missing, unreadable or changed; never return a stale result after failed verification.
- Preserve the existing frozen result and bounded eight-entry graph cache.
- Preserve exported individual accessors and existing server/test dependency overrides.
- Preserve the order and semantics of individual dependency calls when either override is supplied.
- Preserve numerical results, source provenance, reference identities and public response shapes.
- Keep sources and paths server-owned; introduce no browser-supplied file paths.
- Add no network calls, dependencies, provider changes, automatic retries, local cooldowns or saved-run recovery.
- Do not edit source datasets, model formulas, generated reference pins or existing simulation records.
- No UI or mobile work is needed.

## Proposed interfaces

In `lib/server/citizen-grounding/transport-data.ts`, export the combined result type and accessor:

```ts
export interface TransportData {
  reference: TransportDemandReference;
  index: StationAccessIndex;
}

export function loadTransportData(graph: Graph): TransportData;
```

The type describes the existing result; implementation must continue returning the deeply frozen snapshot. Do not add another cache or duplicate the parser.

Keep the existing signatures:

```ts
export function loadTransportDemandReference(graph: Graph): TransportDemandReference;
export function loadStationAccessPoints(graph: Graph): StationAccessIndex;
```

Both remain wrappers around the same strict combined loading path. Their cache-hit calls must still read and verify source bytes.

`CitizenImpactDependencies` need not gain another public injection seam. In `calculateCitizenImpact`:

- If neither `dependencies.demand` nor `dependencies.access` is supplied, call `loadTransportData(baseline)` once and use both members.
- If either override is supplied, use the existing merged dependencies: await `deps.demand(baseline)`, then await `deps.access(baseline)`.
- Overrides of only dataset or baseline must not disable the combined default transport path.
- Do not infer whether an override exists by comparing function identity after merging defaults. Inspect the supplied optional fields, matching the existing valid function contract.

This preserves partial override behaviour: a custom demand reader does not accidentally bypass a custom access reader or replace its missing counterpart with an unrelated new dependency.

## Implementation tasks

### Task 1: expose the existing combined loader

**Production file:** `lib/server/citizen-grounding/transport-data.ts`.

**Test file:** `lib/contracts/tests/citizen-transport-data.test.ts`.

- [x] Add tests for a combined frozen result, wrapper identity compatibility and per-source read counts.
- [x] Observe the new tests fail because the combined accessor is not available or the required behaviour is missing.
- [x] Export `TransportData` and `loadTransportData`, reusing the existing loader without changing its verification/cache ordering.
- [x] Keep the individual exported accessors delegating to the combined path.
- [x] Confirm existing source-corruption tests remain unchanged and pass.
- [x] Add equivalent corruption coverage for station-exit bytes and the combined accessor.

### Task 2: use one transport load per default calculation

**Production file:** `lib/server/citizen-grounding/api.ts`.

**Test file:** `lib/contracts/tests/citizen-impact-api.test.ts`.

- [x] Add a regression showing one default calculation currently reads each transport source twice.
- [x] Change its expected count to once and observe the failure before implementation.
- [x] Import and use `loadTransportData` when neither individual transport override is provided.
- [x] Keep existing independently injected demand/access paths and their sequential order.
- [x] Test both overrides together, demand-only override and access-only override. Use controlled fixtures/stubs and restore any patched filesystem functions after each test.
- [x] Verify unchanged calculated outputs and source/calculation identities for equivalent inputs.

### Task 3: verify correctness and measure the actual benefit

- [x] Run the focused tests below with bounded concurrency.
- [x] Run TypeScript and an appropriate production build after the focused checks pass.
- [x] Compare cold and warm loading before/after in separate controlled processes, with the same graph and source files. Record read counts, elapsed time and peak memory if measured.
- [x] Separate transport-loading time from end-to-end calculation time and from provider/network latency.
- [x] Report observed timings with the machine, runtime and sample count. Do not claim an unmeasured latency target or a 50% reduction in total simulation time.
- [x] Review the final diff to ensure no datasets, pins, formulas, public contracts or unrelated changes were altered.

## Acceptance tests

| Case | Required result |
|---|---|
| Combined cold load | Each source read once; returned reference/index validated and frozen |
| Combined warm load | Each source still read once and verified; cached result identity reused |
| Two normal calculations | One verification pass per calculation, with no cross-request exemption |
| OD bytes change after cache warm-up | Throw source-integrity error; no stale fallback |
| Exit bytes change after cache warm-up | Throw source-integrity error; no stale fallback |
| Stops bytes change after cache warm-up | Throw source-integrity error; no stale fallback |
| Missing/unreadable source | Fail without producing a citizen-impact result |
| Existing individual accessors | Retain signatures, frozen member identities and verification behaviour |
| Both demand/access injected | Both supplied readers used in existing sequence |
| Only demand injected | Supplied demand used; existing default access semantics preserved |
| Only access injected | Existing default demand semantics preserved; supplied access used |
| Dataset/baseline injected only | Combined default transport loading still used |
| Same input and verified sources | Identical reference values, calculation results and fingerprints |
| Changed graph content | Current content-fingerprint behaviour retained |
| More than eight graph keys | Existing bounded eviction retained |

Count only reads of the three exact transport source paths; unrelated dataset or module-loader reads must not make these assertions brittle. Existing tests already use `syncBuiltinESMExports()` when replacing builtin filesystem exports. Restore patches in cleanup even if an assertion fails. Do not alter the real source files to simulate corruption.

## Expected operation-count improvement

| Normal citizen-impact calculation | Current | First implementation |
|---|---:|---:|
| Source-file reads | 6 | 3 |
| Source verification passes | 2 | 1 |
| Graph fingerprints inside the transport loader | 2 | 1 |
| Source bytes requested through Node | 76,514,822 | 38,257,411 |

Parsing already benefits from the graph cache. This change removes the extra verification/loading pass; it does not eliminate future strict source checks or all graph fingerprinting elsewhere in the calculation.

## Verification commands for implementation time

These commands were not run during research or while writing this plan.

```powershell
node --test --test-concurrency=2 lib/contracts/tests/citizen-transport-data.test.ts lib/contracts/tests/citizen-impact-api.test.ts lib/contracts/tests/citizen-commute.test.ts
npx.cmd tsc --noEmit --incremental false
npm.cmd run build -- --webpack
git diff --check
```

The build may prepare generated web assets as part of the existing build workflow; inspect any resulting changes. Avoid an unrestricted parallel full-suite run: this repository previously exhausted available memory with the default concurrency. Broaden verification only where the final change, failures or project checks justify it.

## Optional later work: eliminating warm source reads

This is not part of the recommended first implementation.

| Policy | Performance benefit | Integrity consequence |
|---|---|---|
| One strict combined load per calculation | Removes duplicate reads/hash passes | Current byte verification retained at each loader call |
| Metadata-gated source cache | Warm calls use small stat checks instead of large reads/hashes | Unchanged metadata cannot prove unchanged bytes; current corruption contract changes |
| Immutable source-generation snapshot | Sources verified once per explicitly selected deployment/source generation | No reinspection of live source bytes on every calculation; requires a defined update/restart lifecycle |

If a later immutable-source policy is chosen, separate a verified source snapshot from graph-specific projections. Key source snapshots by resolved source root, expected pins and policy version. Key projections by source identity and relevant graph content. Publish caches only after complete successful verification and parsing; bound retained snapshots and projections.

Prefer retaining compact validated aggregates and parsed crosswalk/exits over multiple raw 38 MB copies. A deeper OD parsing refactor must preserve duplicate-row detection, totals, period checks and station mapping semantics.

Do not replace the current graph fingerprint with an identity-only `WeakMap<Graph, ...>` cache: graphs contain mutable Maps and arrays. Freezing an object containing a Map does not prevent `Map.set()` or `Map.delete()`. A narrower mapping fingerprint may be possible later, but it needs tests for station IDs/names, aliases and served station membership; changing that key is outside this first change.

File watchers can be an invalidation hint, not the sole integrity mechanism. Metadata-based designs need explicit handling of replacement, deletion, read failure, root changes and concurrent modification, with their weaker guarantee documented rather than presented as byte verification.

## Estimate and completion record

Estimated first implementation: **2–4 focused hours**, including regression coverage and measurements. This is an engineering estimate, not a measured completion time. An immutable-source or metadata-cache redesign should be estimated separately after selecting its integrity policy.

At document creation: repository code and tests were inspected, file sizes were read, Node documentation was checked, and an independent read-only review was completed. No application implementation, test run, benchmark, paid API call or saved-simulation recovery was performed.


## Implementation record ? 2026-11-06

The combined `loadTransportData(graph)` accessor is implemented. The default citizen-impact path loads one verified transport snapshot; the compatibility wrappers and independently supplied reader paths remain available. Source hashes are still checked before each cache lookup. The graph fingerprint, eight-entry eviction, numerical formulas and response shapes were not changed.

### Regression and review evidence

- Test-first reproduction: the default calculation read each source twice rather than once; the combined accessor was absent. Three expected red failures were recorded before production changes.
- Final focused run: **34 tests passed, zero failures**, covering actual source pins, cold/warm combined loading, frozen reference reuse, all three sources being corrupted/missing/unreadable, per-calculation read counts, unchanged results, partial overrides and sequential override completion.
- The cold combined-loader test uses a cloned baseline with a distinct graph fingerprint; it does not mutate the shared baseline.
- A deliberate temporary `Promise.all` mutation was rejected by the strengthened demand-completion assertion. The correct sequential implementation was restored immediately in a `finally` block.
- Final standalone TypeScript check passed. Independent review reported no remaining material issues after two test-coverage improvements.
- Final production webpack build passed, including page generation and postbuild private-trace filtering.
- No full repository suite was rerun; verification was scoped to the transport loader, API and commute calculations plus TypeScript and the production build.

### Local benchmark

Two fresh Node.js **v24.18.0** processes each performed one cold invocation and ten warm invocations against the same `2026-10-27` baseline and unchanged source files. The separate-accessor mode reproduces the previous call path using the retained compatibility wrappers. No task build or test process ran concurrently with these measurements. Operating-system file caching was uncontrolled, so cold timings are not physical-cold-disk measurements.

| Measurement | Separate accessors | Combined accessor |
|---|---:|---:|
| Cold transport load | 4,839.6 ms | 4,023.9 ms |
| Median of ten warm loads | 266.186 ms | 166.314 ms |
| Minimum warm load | 219.586 ms | 86.610 ms |
| Maximum warm load | 441.434 ms | 254.449 ms |
| Source-file reads across eleven invocations | 66 | 33 |
| Source bytes per invocation | 76,514,822 | 38,257,411 |
| Whole-process peak RSS | 716,920 KiB | 751,200 KiB |

The local warm-loading median decreased by approximately **37.5%**. This is a measurement of the transport-loading step, not end-to-end simulation latency. The samples do not establish a general speed or memory guarantee; peak process memory was not reduced in this measurement.

Every result in both processes had the same SHA-256: `c36ed40bc7e9afa14a7b7d9fd7a2114999d400ed3bfb8dea0bbff48d78a6452a`.

Local artifacts: `tmp/transport-source-reads-red.log`, `tmp/transport-source-reads-final-tests.log`, `tmp/transport-source-reads-order-mutation.log`, `tmp/transport-source-reads-types-final.log`, `tmp/transport-source-reads-benchmark.json`, `tmp/transport-source-reads-build.log` and `tmp/transport-source-reads-progress.md`.

The implementation was verified before the user requested committing and pushing it. No provider calls, source dataset changes or saved-simulation recovery were performed.
