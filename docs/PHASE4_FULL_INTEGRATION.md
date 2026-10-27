# Phase 4B + 4C full-stack integration

Validated locally on 27 October 2026. Disposable pre-hackathon prototype; no deployment, GitHub push, Gemini or eldercare implementation.

## Checkpoints and scope

| Checkpoint | Branch | Commit | Independent validation |
| --- | --- | --- | --- |
| Animated citizens, Phase 4B | `master` | `2a99dbb` | 97 tests, MRT CLI/simulation, production build |
| Weighted demographic engine, Phase 4C | `feature/synthetic-population` | `b87db99` | 104 tests, impact CLI, explicit TypeScript, production build |
| Ordinary history-preserving merge | `master` | `7b7f33d` | 117 tests, production build, package/lockfile consistency |
| Full-stack integration | `master`, then feature fast-forward | Final commit after `7b7f33d`; see Git history | 131 tests, compiler/build/CLI and browser checks below |

Both initial worktrees were on `98c91d6`, with no staged changes or merge/rebase operation. Pending files were fingerprinted, checked again before staging, scanned privately for credential values/common credential patterns, and committed separately. No generated browser/build artifacts or environment files were staged. The merge had **no conflicts**: `package.json` merged additively, retaining Three.js and the Phase 4B lockfile while adding `agents:impact`. The feature branch/worktree is retained. Final synchronisation uses only `git merge master --ff-only`.

Existing MRT/population algorithms, shared citizen schema v1, raw data and credentials are preserved. The map service only exposes its existing cached `getBaseline` function; the integration reuses that baseline and authoritative MRT proposal validation.

## Architecture and two honest presentation modes

`Workspace editor → ImpactPanel → POST /api/impact → existing Phase 4C runPopulationImpact → validated envelope → full-weight tables + run-bound profiles`

| Module | Responsibility |
| --- | --- |
| `lib/impact/api-contract.ts` | Companion request/response types, bounded settings, canonical SHA-256 request identity, core/extended metric and profile-context validation |
| `lib/impact/lifecycle.ts` | Abort/revision/current-key gate; presentation-only selection of an existing comparison side |
| `lib/server/impact-api-service.ts` | Node data/engine adapter, existing MRT validation/baseline reuse, process-local expiring run/profile cache, bounded JSON reader |
| `app/api/impact/route.ts`, `profile/route.ts` | POST calculation and GET selected profile, controlled errors and `Cache-Control: no-store` |
| `components/impact-panel.tsx`, `impact.css` | Explicit assumptions/settings, weighted coverage/results, age/sex/area/subzone tables, accessible sample/full-ID profile lookup |
| `components/workspace.tsx` | Separate MRT, calculated-impact and illustrative-city modes; proposal/date invalidation and map mode association |

**Calculated impact:** One Phase 4C comparison-bearing `CitizenSimulationPayload` remains authoritative. Baseline/Scenario selects the stored side's duration/status and map network visibility; it does not create another population, rewrite outcomes or calculate new savings. Metrics continue to show the same before/after comparison. Calculated profiles have `animation: null`; the payload's animations are empty. The illustrative layer and its selected path are disabled in this mode. No invented home coordinates, demographic centroids or fixture paths are attached to calculated citizens.

**Illustrative city:** The original validated `{baseline, scenario}` fixture/import, blocky characters, playback, speed, selection and inspector remain available. The banner reads **“Illustrative miniature-city animation — not observed individual travel.”** The editable MRT proposal is hidden here because it does not describe the fixture. Opening the mode focuses the supplied miniature city. Imported view pairs must now share identical metadata context (including proposal, date, scenario and coverage) in addition to existing population/identity/provenance checks. This does not make an imported visualisation the current calculated report.

Switching modes preserves the calculated report if its actual inputs are unchanged. Fixture IDs/profiles and calculated IDs/profiles remain independent. No mechanical duplication of the Phase 4C payload into a visual pair and no fabricated geographic adapter is used.

## HTTP contracts and bounds

`POST /api/impact` accepts JSON:

```ts
{
  serviceDate: '2026-10-27',
  intervention: draftToIntervention(currentDraft), // actual existing version-1 proposal
  assumptionSetId: 'illustrative-cck-demand',
  participationRate: 0.8,
  population: { size: 2000, seed: 'phase4c-demo' },
  thresholdMinutes: 30,
  renderLimit: 150
}
```

The supported demographic coverage is explicitly **Choa Chu Kang**, with the existing illustrative NS4-origin demand preset: NE16 destination share 50%, NS4 25%, NS5 25%. Participation is configurable; the seed controls both population generation and assumed demand. Probabilities are equal across source age/sex categories. This is not observed commuting, demographic-specific demand or measured station catchment usage. The optional geographic-reference-point engine functionality remains available to independent callers but is not exposed as arbitrary browser configuration here.

Bounds: real 2026 calendar/service date; 2–40 proposal stations with matching contiguous segment count; existing engine validates the actual proposal/costs/IDs; 500–5,000 population representatives; seed 1–64 characters; participation 0–1; threshold 0–180 minutes; sample 0–150. Body bytes are capped at 16 KiB while reading the stream, including requests without Content-Length. Only the supported preset is accepted, so at most three distinct OD pairs are routed. Serialized response is capped at 1 MiB. Unknown top-level fields are rejected. Invalid requests/proposals return 400, oversized bodies 413, non-JSON requests 415; unexpected errors return safe 500 messages without stack traces or raw data.

The response is `{version:1, identity:{requestId,runId,request}, payload, metrics, distributionalDifferences, diagnostics}`. The unchanged strict citizen payload is validated using its public parser. Extended fields remain outside v1. The companion validator reconciles extended coverage/share/threshold/mean fields to core denominators and checks group correspondence, distributional differences and diagnostics totals. Full weighted population arrays, GTFS, graph/route internals and the `getProfile` closure are never serialized.

`GET /api/impact/profile?runId=...&requestId=...&agentId=...` uses the actual engine's `getProfile(agentId)` for **any** full-population ID, including IDs outside the display sample. It validates the returned shared profile and source/scenario context. Malformed IDs return 400, unknown citizens 404, mismatched run/request pairs 409, unavailable/expired runs 410. The UI preserves the calculation and explains when a profile requires recalculation.

The process-local cache holds at most **two request results for ten minutes**, including profile closures. A shared `globalThis` slot lets separately bundled route handlers reach the same bounded store. No database/session/authentication infrastructure is introduced. Restarting the process invalidates profile lookups. Raw demographics are validated and cached per module; existing MRT feed/date caching is reused. Restart after intentionally replacing raw inputs. Request cancellation cannot interrupt already-running synchronous engine work; bounds keep that work finite, and the client rejects late results.

## Scenario lifecycle and denominators

Request identity is SHA-256 of canonical JSON with sorted object keys and preserved array order. It covers the entire proposal (including coordinates, ordering and all explicit costs), date, assumption selection/participation, population settings, threshold and sample setting. The response echoes the validated request, and the client verifies it and its fingerprint, plus engine scenario identity/date/population metadata. The engine's own run ID also covers its inputs/source/baseline/threshold. Display-sample changes alter the request identity but preserve the engine's calculation identity/metrics.

On proposal/date/settings edits, results cease to render immediately because their stored key no longer matches; effects abort/clear active requests and profiles. A request ticket must still match the current revision/key before results are accepted. Profiles have their own abort and current-key/selected-ID checks. Deliberately delayed old results were rejected in the actual browser. Matching a human-readable line name or intervention ID alone is never used as the stale-result guard. The server remains authoritative for executing the supplied inputs; JSON validation is not an independent recomputation/proof of the entire model.

Overall/group definitions remain those in `DEMOGRAPHIC_IMPACT_SIMULATION.md`:

- Represented weight is the full synthetic population; assigned includes invalid assignments, which remain visible.
- Comparable means both journeys finite. Benefits and mean saving use **comparable weight**, not visible characters or all residents. Savings = baseline minus scenario; unavailable savings remain null.
- Threshold accessibility uses assigned non-invalid weight; valid unreachable/unavailable journeys count as inaccessible. Newly reachable cases have no invented infinite or finite baseline saving.
- Unassigned residents are unknown, not zero-benefit residents. At 0% participation, all weight is unassigned and benefit share/mean are null.
- Age, sex, planning-area and subzone groups overlap; do not add them across dimensions. Tables display stored engine values, not values inferred from animation.

The default API example preserves **192,150 CCK rounded leaf counts**; it does not renormalise the national **4,047,260** leaf counts to separately published **4,044,210**.

## Important source-byte reproducibility finding

The original working copies contain the same Census cells but different line endings:

| Working copy | Bytes | Raw SHA-256 |
| --- | --- | --- |
| Main | LF | `9d1183c4335a8189272e244ae86bd9770d61854bc30527055df50697bf730c84` |
| Agents | CRLF | `6ac3e693eb7d36b9fc066df6accd290ce7341984d9e40ce80080819d75091e5a` |

Removing only CRLF from the agents copy produces identical main bytes. No raw source was rewritten. The generator includes raw provenance in the synthetic identity hash; those IDs seed assumed trips. Therefore equivalent parsed cells can still produce different finite-sample demand assignments. This explains why Phase 4C's earlier reported 49.2877% / 21.0787-minute example differs from the main browser's **50.8601% / 21.7512 minutes** under otherwise equivalent settings. Counts/weights remain conserved. Reproduction requires matching **raw bytes/hash, seed, population size, request and toolchain**; code branch synchronisation alone does not guarantee identical raw-file encodings. Choosing a future canonical identity policy requires an explicit versioned decision, not silently changing this engine or provenance.

Integration tests compare the API with the existing CLI/service path using the same local bytes, rather than hard-coding one worktree's sampled numerical outcome. The actual source hash is inspectable in every report/profile.

## Automated and browser evidence

Final code: **131 tests passed, 0 failed** (117 merged milestone tests + 14 integration regressions). The integration tests cover bounded requests/body reading, actual editor proposals and engine execution, full weighted denominators, display-sample invariance, deterministic reruns and affected proposal changes, null/unassigned outcomes, source/profile/run validation, outside-sample profile lookup, unknown/mismatched/expired runs, cache bounds, controlled HTTP failures, revision-gated late responses, presentation-side selection and mixed visual-context rejection. Existing suites cover reachable/unreachable/new/invalid journeys and all previous map/animation/population behaviour.

All required commands pass: `mrt:validate` (184 stations, zero unreachable pairs across the existing service-date checks), `mrt:simulate` (62.77→20.00-minute illustrative journey), `agents:generate` (2,000 default AMK representatives / 162,520 weight), `agents:impact`, complete `npm.cmd test`, application TypeScript, explicit impact/API/test TypeScript, and `npm.cmd run build`. Production builds include both new Node routes. No compiler-error bypass was added.

Playwright MCP exercised a separate production server on port 3104 while leaving the existing dev server on port 3000 alone:

1. Existing map and MRT example: 62.77→20.00 minutes. Editing segment 1 from 300 to 360 seconds clears the old comparison and reruns to 21.00 minutes.
2. Calculate current proposal: coverage, 19 age rows, sex/area comparisons and a fetched improved profile render. Baseline/Scenario shows that profile's stored 62.77/21.00 minutes without changing any overall metric.
3. Editing segment 1 invalidates the impact report; recalculation gets a new run ID and mean changes from 21.7512 to 21.2426 minutes. Holding that old response while editing to 480 seconds and running again retains only the new run (mean 20.2254), even after the old response is released.
4. Illustrative city renders 180 blocky citizens; play/pause/reset/speed and baseline/scenario selection work. Returning to calculated mode preserves its run and calculated ID, rather than the selected fixture ID.
5. Unassigned sample profile explicitly says no assigned journey. Full-ID lookup retrieves a resident outside the returned sample. Setting participation to 0 clears the previous report, then returns null mean/share and 192,150 unassigned weight.
6. 1440×1000 desktop and 390×844 narrow views have no horizontal document overflow. A deliberately invalid browser POST returns controlled 400/no-store. No unexpected console errors occurred; deliberate 400 checks produced expected failed-resource messages, and the final fresh-load smoke check excludes those deliberate errors.

Observed performance, not guarantees: first impact HTTP response after the MRT flow took **1,978 ms**, with **184,666 transferred bytes** in browser Resource Timing. In a foreground 1440×1000 Intel UHD/ANGLE three-second sample, 180 visible characters used 13 draw calls; the layer reported **135.97 FPS** and page RAF measured **137.28 FPS**. An initially background/occluded tab showed about 1 FPS; explicitly bringing it to the foreground restored normal cadence. No new sustained-memory/GPU-capacity benchmark was performed.

## Remaining limits and Phase 4 exit assessment

The requested local vertical slice is integrated and browser-verified. **The full original Phase 4 exit criterion is only partially met:** calculated citizens have no justified geographic trajectories, so the independent miniature animation does not visualise the same full population whose weighted outcomes are reported. The two-mode boundary is deliberate and visible. We have not invented coordinates to claim completion.

Census 2020 rounding/marker assumptions, the 3,050 national discrepancy, source-byte identity sensitivity, assumed demand, no walking/egress costs, schematic station links, uncalibrated GTFS median times, no departure-clock/crowding/induced-demand model and no validated economic/health/social forecast remain. The 180-agent city remains entirely invented. A visual sample is never a demographic denominator. Existing import/animation limitations are retained in the Phase 4B report.

Read-only review found no blocking runtime defects. Minor follow-ups: per-journey OD edits conservatively clear the demographic report even when its request is unchanged; the companion validator trusts the server's echoed execution context rather than independently proving all calculation inputs from opaque result IDs. These do not bypass the actual adapter's fingerprint/revision guards. Future stronger attestations or finer invalidation should be tested separately.

## Reproduce and rebuild

```powershell
cd C:\Users\tetas\OneDrive\Desktop\Kaplan\Hackathon\Hackathon2\ImpactLens
npm.cmd ci
npm.cmd run dev
# Open http://127.0.0.1:3000
# MRT journey → Load illustrative example → Run simulation
# Calculated impact → review demand settings → Calculate demographic impact
# Inspect group tables/profiles; edit a segment and rerun.
# Illustrative city → play/select/pause/reset; keep its fixture label visible.
npm.cmd run mrt:validate
npm.cmd run mrt:simulate
npm.cmd run agents:generate
npm.cmd run agents:impact
npm.cmd test
node_modules\.bin\tsc.cmd --noEmit --incremental false
npm.cmd run build
```

For an isolated production smoke server after building: `npm.cmd start -- --port 3104`. Do not launch a second Next dev instance against the same directory. Match the raw demographic fingerprint before expecting the exact numerical example above.

Hackathon rebuild order: verify permitted raw inputs/competition rules; scaffold the local Next/TypeScript app and locked map/Three dependencies; rebuild validated MRT/population engines and v1 contract; recreate explicit demand/aggregation tests; add this bounded Node envelope/profile cache; wire current proposal identity and revision invalidation; add compact results/profile UI; separately recreate labelled miniature animation; run CLI/compiler/build/browser flows before any Gemini explanation or facility model.

Tools/skills actually used: local Git/PowerShell/Node/Python and patch tooling; MCP discovery and Playwright MCP for real browser actions/screenshots/timing. Local history was authoritative; no GitHub write, push or PR operation was used. Integration/planning, TDD, systematic debugging, verification, independent read-only code review, frontend-design and UI/UX skills guided the work. The next tasks remain Phase 5 grounded dashboard/Gemini (Terminal 1), Phase 6A validated facility/access engine (Terminal 2), and shared interface/Git coordination (Terminal 3); none begins in this checkpoint.
