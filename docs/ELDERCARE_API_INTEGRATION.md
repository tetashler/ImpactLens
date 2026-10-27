# Phase 6B — Eldercare API integration

## Plan and decisions

Baseline: clean `feature/synthetic-population`, HEAD `3b61efc` (Phase 6A), parent `a3b7d21`. User brief is the specification. No commits, branch integration, frontend, raw data, citizen/MRT/Phase 4C changes.

- [x] Test bounded browser-safe request/envelope parsers and facilities projection against the real Phase 6A inputs.
- [x] Expose pure preset/proxy preparation from the existing demonstration adapter so the server can cache validated local sources and use project-root filesystem loading without changing calculations or CLI results.
- [x] Add Node service and two thin handlers with streamed body limits, safe errors, bounded responses, request/scenario identities and detached cached data.
- [x] Run API/CLI parity tests, full regressions, TypeScript, production build, separate-port real HTTP checks and independent review; record measured results.

Architecture: `lib/eldercare/api-contract.ts` is browser-safe and delegates mathematics validation to Phase 6A. `lib/server/eldercare-service.ts` loads fixed local paths only, caches static inputs for at most one minute with file-metadata invalidation, regenerates a bounded population per simulation and calls the unchanged engine. No run cache, database or remote APIs. Defaults are a documented versioned Bukit Merah preset; arbitrary demographic origins/render settings are rejected. HTTP request tokens distinguish attempts; canonical fingerprints identify submitted parameters; engine IDs identify calculations on actual source bytes.

## Routes and public exports

| Route | Success | Purpose |
| --- | --- | --- |
| `GET /api/eldercare/facilities` | `FacilitiesResponse` | Four corroborated AAC marker records, historical metadata/evidence, unknown opening/capacity labels |
| `POST /api/eldercare/simulate` | `EldercareApiResponse` | Bounded proposal/preset settings → existing Phase 6A calculation |

Both use Node runtime and `Cache-Control: no-store`, including errors. They accept no query parameters. GET is explicitly dynamic; POST is not statically cached. Routes are thin wrappers around `lib/server/eldercare-service.ts`; no metric formula is implemented in HTTP code.

Import browser-safe functions/types from `lib/eldercare/api-contract.ts`:

- `createDefaultEldercareRequest(clientRequestId)` returns a detached, complete default request.
- `parseEldercareApiRequest(value)` validates and returns a canonical request.
- `fingerprintEldercareRequest(value)` asynchronously computes a canonical SHA-256 fingerprint using Web Crypto, with no Node imports.
- `parseFacilitiesResponse(value)` validates marker data and declared limitations.
- `parseEldercareApiResponse(value, expectedRequest?)` asynchronously validates the envelope, request linkage and existing `parseEldercareResponse` result.
- Types: `EldercareApiRequest`, `FacilitiesResponse`, `EldercareApiResponse`; constants `ELDERCARE_API_LIMITS`, `ELDERCARE_LIMITATIONS`.

Server exports: `calculateEldercare`, `getEldercareFacilities`, `readEldercareBody`, `eldercareError`, `EldercareApiError`, `ELDERCARE_SOURCE_CACHE_MS`. Keep this module and the calculation engine out of client components.

## Facility catalogue response

`FacilitiesResponse` contains `version:1`, the actual Phase 6A `source` including dataset ID/URL/checksum/update/access dates/scope, `coverage:'limited-corroborated-aac-subset'`, a derived `summary`, `facilities` and mandatory limitation labels.

Summary on the supplied input: **133 historical MOH points, 4 corroborated AACs, 129 unknown service classifications, 0 AAC (Care) points included, 0 malformed/duplicate records excluded**. These are calculated from the prepared catalogue, not separate hardcoded counters. Unknown records are not sent as markers or reclassified by name. The four records retain source ID/name/record index, current corroborated name/type/address evidence, postal code, `{lat,lon}`, source update field, `operationStatus:'listed-unconfirmed'`, `openedOn:null` and `capacity:null`.

The [MOH source](https://data.gov.sg/datasets/d_f0fd1b3643ed8bd34bd403dedd7c1533/view) catalogue was updated **6 June 2024**; source point attributes are **July 2016**, with operator listings checked **27 October 2026**. No verified opening hours, service boundaries or current operation/capacity are invented. This is not all AACs in Bukit Merah or Singapore. Retain the source and [Open Data Licence](https://data.gov.sg/open-data-licence) attribution from Phase 6A.

MapLibre conversion is explicit: `[facility.position.lon, facility.position.lat]`. Named coordinates in JSON never change order. The test pins `kml_6` to longitude `103.826839535636`, latitude `1.28170700809748`.

## Simulation request

Every field below is explicit; the server does not fill arbitrary missing settings:

```ts
interface EldercareApiRequest {
  version: 1;
  clientRequestId: string; // a fresh client token for each attempt
  preset: 'bukit-merah-landmarks-v1';
  population: { size: number; seed: string };
  intervention: EldercareIntervention; // unchanged Phase 6A schema
  options: AccessibilityOptions;      // unchanged Phase 6A schema
}
```

Defaults match the Phase 6A CLI: 2,000 representatives, seed `eldercare-demo`, hypothetical AAC `{lat:1.287,lon:103.824}`, reference date `2026-10-27`, minimum age 60, thresholds `[500,1000]` metres, assumed listed-facility availability, unknown capacity and age-only eligibility interpretation. Population geography is fixed server-side to Bukit Merah. Origin references remain the exact two Phase 6A station landmark proxies for Redhill and Tiong Bahru Station, validated against the local subzone polygons. They are not homes or a residential distribution.

Clients may change proposed AAC coordinates, ID/name/rationale, declared assumptions, assumed availability/capacity, bounded population size/seed and supported options. Nursing homes, AAC (Care) and other service proposals are rejected. Proposed IDs cannot collide with any source record, including unclassified records. Arbitrary population areas, origins, filesystem paths, raw datasets and render settings are rejected, not silently ignored.

| Guardrail | Bound |
| --- | --- |
| Request body | 16,384 actual UTF-8 bytes, streamed; declared Content-Length checked too |
| JSON shape | Depth ≤12, ≤512 visited values; text ≤1,000 code units before field-specific checks |
| Population | Integer 1,000–5,000; seed 1–80 characters |
| Thresholds | 1–8 distinct finite values, 0–5,000 metres; canonical ascending order |
| Age cutoff | Complete Census band boundaries 60,65,…,90 |
| Walking approximation | Optional finite 0.1–2.5 metres/second |
| Illustrative capacity | Null or integer 1–10,000 users, explicit rationale/basis |
| Client/intervention/assumption IDs | ≤64 characters, existing identifier syntax |
| Name / rationale / assumption descriptions | ≤160 / ≤1,000 / ≤1,000 characters; at most 8 assumptions |
| Reference date | Valid date 2026-10-27 through 2030-12-31 |
| Response budgets | Facilities ≤64 KiB; simulation envelope ≤512 KiB, before compression |

These are API budgets, not official service standards or recommended walking/capacity values. A later model date changes metadata/identity; it does not update facilities, age the population forward or predict service opening. The only supported eligibility label is `age-only-other-criteria-unknown`.

## Response, metrics and identity

The simulation returns `{version:1, identity, request, result, limitations}`. `result` is the **unforked Phase 6A `EldercareResponse`**. It includes complete validated intervention/options, facility/Census/proxy provenance, relevant baseline AAC points, proposed position, origin-level comparisons, grouped metrics, unlocated geography, capacity and diagnostics. No raw GeoJSON/HTML/Census rows, complete synthetic population or MRT graph is transmitted.

The API does not calculate benefits. It generates the existing weighted population, calls `simulateEldercareIntervention`, then validates the engine result and companion envelope. Default HTTP output recalculates **44,520 age-targeted**, **6,230 located/comparable**, **38,290 unlocated** population, **3,890 closer**, **410.44 → 347.46 m** weighted mean distance, and **zero newly covered** at 500/1,000 m. These are reproducibility observations, not hardcoded response numbers.

Age means **60+ in Census 2020 age bands**, without ageing-forward projection or confirmed current AAC eligibility. The national leaf-count discrepancy (4,047,260 versus separately published 4,044,210) remains unadjusted. Unknown origins are not unaffected residents. Finite baseline/scenario distance means retain their existing assessable denominators; reductions and paired percentage-point changes use comparable population only. Missing baseline distances remain null, with scenario-only access separately reported. Capacity never caps geographic coverage or becomes a utilisation/served-person forecast. Details/formulas remain in [Phase 6A](ELDERCARE_ACCESSIBILITY_ENGINE.md).

Three identity fields have different jobs:

1. `identity.clientRequestId`: echoes the caller's attempt token. Use a fresh UUID or revision token for each request, including reruns of unchanged settings.
2. `identity.requestFingerprint`: canonical SHA-256 of validated request settings **excluding the attempt token**. Includes preset, population, full intervention/options; ignores JSON property order and threshold ordering.
3. `identity.scenarioId`: exact Phase 6A calculation ID, matching `result.scenarioId`; includes actual source bytes/population/proxies/settings. The engine ID is not replaced by the HTTP fingerprint.

Repeated settings/source bytes produce identical calculations, despite different attempt tokens. Moving the centre or changing thresholds, age, seed/size, availability, walking speed or capacity changes the appropriate calculation identity. A source edit can change scenario identity while leaving the submitted-parameter fingerprint unchanged. Raw Census-byte changes affect source hashes and synthetic IDs; no newline/rounding normalisation is added. Request field order is constructed consistently before invoking the existing engine, preserving CLI parity.

These are consistency identifiers, not authentication of arbitrary altered server content. The frontend must still enforce its own current revision: validating an old response against its old submitted snapshot alone cannot establish that the current marker has not moved.

## Errors and cache behaviour

Errors return `{version:1,error:{code,message}}`, never a stack trace, input dump, credential or local filesystem path:

- **400 `INVALID_REQUEST`**: malformed UTF-8/JSON, unsupported shape/preset/settings, query parameters, source ID collision or impossible sample configuration.
- **413 `REQUEST_TOO_LARGE`**: declared or actual streamed body exceeds 16 KiB; oversized readers are cancelled.
- **415 `UNSUPPORTED_MEDIA_TYPE`**: missing/non-JSON content type. Accepted: `application/json`, optionally `charset=utf-8`; `application/jsonp` is rejected.
- **500 `CALCULATION_FAILED`**: safe generic local-data/internal failure. **500 `RESPONSE_LIMIT`**: bounded output budget exceeded.

Unknown error messages are not returned or logged by the handlers. Responses are read-only; no external credentials, AI provider, OneMap/LTA calls, database, queue, polling or result store is needed.

The Node adapter retains one static input snapshot per loaded module/process: validated facility catalogue, demographic distribution and proxy references. On every access it checks the four fixed files' size, mtime and ctime, with root identity; any change invalidates immediately. A **60-second TTL** forces reload even when file metadata appears unchanged. Workers/route bundles may hold separate snapshots; restart clears them. There is no population/result cache: each bounded POST generates and calculates anew. Returned marker data is detached, and the engine clones its own inputs. A temporary-copy regression demonstrates source-byte invalidation without touching originals.

Filesystem paths are explicit literal project-root paths, never supplied by HTTP. The first build flagged broad tracing from dynamic path-array reads; the final adapter uses literal targets. Production route traces now include exactly the four required data files and **zero environment files** (117 traced files total per route, down from 272 in the initial warning build). No deployment was performed.

## Copy-paste local requests

Start only the Terminal 2 production server, from this worktree, on an unused port:

```powershell
npm.cmd run build
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3106
```

From another terminal:

```powershell
$base = 'http://127.0.0.1:3106/api/eldercare'
$catalogue = Invoke-RestMethod "$base/facilities"
$catalogue.summary
$body = @{
  version = 1
  clientRequestId = [guid]::NewGuid().ToString()
  preset = 'bukit-merah-landmarks-v1'
  population = @{ size = 2000; seed = 'eldercare-demo' }
  intervention = @{
    schemaVersion = 1; id = 'HYP_API_AAC'; name = 'Illustrative AAC'
    serviceType = 'aac'; status = 'hypothetical'
    position = @{ lat = 1.287; lon = 103.824 }
    availability = 'assumed-available'; capacity = $null
    eligibility = 'age-only-other-criteria-unknown'
    rationale = 'Illustrative unsurveyed neighbourhood point; not an approved site.'
    assumptions = @(@{ id = 'illustrative-site'; description = 'Geographic scenario only; no guaranteed service uptake.' })
  }
  options = @{
    referenceDate = '2026-10-27'; minimumAge = 60
    thresholdsMetres = @(500, 1000)
    existingAvailability = 'assume-listed-available'
    eligibility = 'age-only-other-criteria-unknown'
  }
}
$response = Invoke-RestMethod "$base/simulate" -Method Post `
  -ContentType 'application/json; charset=utf-8' -Body ($body | ConvertTo-Json -Depth 12)
$response.identity
$response.result.metrics[0]
```

This shorter example uses different ID/rationale text from the CLI, so its scenario ID differs legitimately. For exact CLI-default identity, use `createDefaultEldercareRequest` with default settings. Neither example supplies personal home coordinates.

## Terminal 1 handoff (documentation only)

1. Fetch `/api/eldercare/facilities` with `cache:'no-store'`; run `parseFacilitiesResponse` on decoded JSON. Render the four `facilities` records at `[position.lon,position.lat]`, retaining listed-status uncertainty/source labels. Do not label them all Singapore AACs.
2. Add a separately styled hypothetical marker. Create a default request using a fresh client token, then set its proposed position and reviewed options. Treat the site as hypothetical and unsurveyed.
3. On any placement/model-setting edit, immediately clear the displayed result, increment a local revision and abort the previous fetch. Keep purely visual settings outside the request; unsupported `renderLimit` fields are rejected.
4. Submit an immutable parsed request snapshot as JSON. On success, `await parseEldercareApiResponse(decoded, submittedSnapshot)`. Accept only if both its client token and the captured revision are still current; optionally compare a freshly computed current-draft fingerprint. Ignore late responses even if cancellation arrived after synchronous calculation started.
5. Render the engine's `result.metrics`, `comparisons` and positions directly. Show weighted denominator labels, unlocated population, limited facility coverage, historical demographic year and separate capacity assumptions. Never estimate benefit from marker distance/animation.
6. If returned facility-source checksum differs from the marker catalogue, refresh marker data before presenting them as the same source snapshot. The simulation already includes its own relevant baseline points. With `exclude-unconfirmed`, baseline points are excluded from calculation even though GET can still list known uncertain sites.

No frontend component, existing impact route or AI implementation was changed. Phase 6C placement/dashboard UI and combined browser workflow remain pending. Future AI explanations should consume these fields and never generate facility-impact numbers.

## Validation and measured HTTP performance

**170 passed, 0 failed**: 155 Phase 6A/checkpoint tests plus **15 API tests**. Tests cover catalogue evidence/counts/order, bounded configurations, actual engine/CLI deep equality, canonical identity, moved/capacity/threshold changes, stale envelopes, explicit unknown population, UTF-8/chunked limits/cancellation, safe errors, source ID conflicts, maximum settings, detached caches, raw-byte invalidation and browser imports with Node modules blocked. Ordinary tests make no live/paid API requests.

Passed all requested scripts: `eldercare:prepare`, `eldercare:simulate`, `agents:generate`, `agents:impact`, `mrt:validate`, `mrt:simulate`, `npm.cmd test`, `npm.cmd run build`. Application TypeScript and explicit CLI/API/eldercare/test checks pass:

```powershell
node_modules/.bin/tsc.cmd --noEmit --incremental false
node_modules/.bin/tsc.cmd --ignoreConfig --noEmit --strict --skipLibCheck --types node --target ES2022 --module nodenext --moduleResolution nodenext --allowImportingTsExtensions prototype/eldercare/cli.ts prototype/eldercare/tests/api.test.ts prototype/eldercare/tests/eldercare.test.ts prototype/eldercare/tests/cli.test.ts
```

Independent read-only review found one client-error classification gap: source-record ID collisions initially returned 500. A failing regression reproduced it; the adapter now rejects them with 400 before generation. The review also prompted explicit inspection of production file tracing. Final build is warning-free, and Phase 6A accessibility/scenario/contract/formulas are unchanged.

Actual production HTTP verification used **this worktree only**, `127.0.0.1:3106`, Node 24.18.0 / Next 16.4.3. GET and POST success envelopes parsed correctly; HTTP results matched CLI output exactly. Moving the AAC changed scenario identity. Malformed input, query fields, oversized JSON, unsupported media, excessive populations and colliding IDs returned expected 400/413/415 responses without paths/stacks. This establishes real HTTP functionality, not a placement UI workflow.

Measured on the local production server, median of three sequential requests per configuration:

| Request | Median ms | Decoded JSON bytes |
| --- | ---: | ---: |
| GET facilities | 16.08 | 4,249 |
| POST 1,000 agents | 219.27 | 66,696 |
| POST 2,000 agents | 284.32 | 69,276 |
| POST 5,000 agents | 595.86 | 72,014 |

POST timing includes round trip and body reading, excludes client-side parsing/validation; GET includes its small parser. App/routes were warmed by smoke checks; snapshot TTL can reload data. Byte counts are UTF-8 JSON before wire compression. Default two thresholds were used; eight-threshold/5,000-agent settings were separately tested within the 512 KiB response budget. These are local measurements, not throughput guarantees.

## Files, security and rebuild

Created: `lib/eldercare/api-contract.ts`, `lib/server/eldercare-service.ts`, both `app/api/eldercare/*/route.ts` files, `prototype/eldercare/{preset,demo-origins}.ts`, `prototype/eldercare/tests/api.test.ts`, this report. Modified only `prototype/eldercare/demo.ts`: existing constants/landmark derivation were factored into reusable modules, preserving its public function/re-export and CLI results. This avoids Node loaders in the browser preset and allows cached project-root reads under Next.js. No accessibility calculation changed; no package/lockfile or dependency changes were needed because the existing test glob already includes API tests.

Actual tools/skills: local Git/PowerShell/Node, patch tooling, a small Python mechanical extraction, installed Next.js Route Handler/server-client documentation, MCP tool/resource discovery and one independent read-only code-review agent. No external research, GitHub request or Playwright session was needed: existing local sources were authoritative and direct HTTP testing exercised the API without a frontend. Applied skills: using-superpowers, brainstorming (autonomous brief), writing-plans, test-driven-development/good-test guidance, requesting-code-review and verification-before-completion; build diagnostics guided the path-tracing correction.

Branch/HEAD remain **`feature/synthetic-population` / `3b61efc`**. Phase 6B is uncommitted and separately inspectable. No merge/rebase/reset/commit/push, Terminal 1 access, central-roadmap edit, raw-data edit, environment edit, existing frontend/AI/MRT/Phase 4C/citizen-contract change occurred. `.env.local` is still ignored and untracked; no credentials were inspected, transmitted or logged. Normal Next.js environment loading remains local. The separate smoke-test server is stopped after verification; Terminal 1's server is untouched.

Hackathon rebuild: install the locked toolchain; recreate Phase 6A from its documented dated sources/validators; expose the pure preset/proxy preparation; add these small bounded contracts, Node adapter and handlers; run all checks above; start on a separate port and verify real JSON requests; then implement Phase 6C UI against the exact envelope/identity rules. Retain historical data, geographic proxy, service/capacity and unlocated-population warnings. Neither four markers nor a changed mean distance establishes actual participation, service placement, health improvement or loneliness reduction.
