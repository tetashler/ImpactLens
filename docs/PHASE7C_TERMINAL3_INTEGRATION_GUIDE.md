# Phase 7C — Terminal 3 integration guide

> The original URA-only handoff is preserved below. For Phase 7C.1, apply the labelled addendum at the end and the [current report](PHASE7C1_ISLANDWIDE_BUILDING_COVERAGE.md); its unified preview has an unresolved public-release boundary.

Worktree: `C:\Users\tetas\OneDrive\Desktop\Kaplan\Hackathon\Hackathon2\ImpactLens-agents`, branch `feature/synthetic-population`, HEAD `4400f47268663a848ca59d55c6f140dda80c97cc`. Changes remain uncommitted/unpushed. No main-worktree files were inspected or changed. Terminal 1's Phase 7A/7A.1 files are not tested here.

## Exact file inventory and conflicts

New maintained files:

- `lib/buildings/contract.ts` — browser-safe types, source/geometry/height/manifest validation.
- `lib/buildings/prepare.ts` — deterministic transformation, original-geometry dedup audit and partitioning; no filesystem or UI imports.
- `lib/buildings/layer.ts` — one MapLibre source/layer, bounded viewport loader and lifecycle.
- `scripts/prepare-buildings.ts` — optional public acquisition, pinned source receipt, offline preparation and HDB/URA audit.
- `scripts/testing/prepare-building-harness.ts` — opt-in JS modules for browser injection, using Node 24 type stripping; not normal production setup.
- `scripts/testing/phase7c-browser-check.mjs` — Playwright helper functions for actual existing-map verification.
- `lib/contracts/tests/buildings.test.ts`, `building-layer.test.ts` and `fixtures/ura-buildings.json` — focused tests and three attributed real source features.
- `docs/PHASE7C_BUILDING_SOURCE_AUDIT.md`, `PHASE7C_TERMINAL3_INTEGRATION_GUIDE.md`, `PHASE7C_BUILDING_FIDELITY_IMPLEMENTATION.md`.

Only existing modified file: **`package.json`**, adding `buildings:download` and `buildings:prepare`. Reconcile these two scripts manually with Terminal 1's package changes; no dependency or lockfile change. No component, app route, existing preparation script, CSS, roadmap, AI provider, citizen contract, MRT/AAC/demographic algorithm or raw input changed. This deliberately avoids a competing `singapore-map.tsx` patch.

Generated/ignored: raw download and receipt `tmp/phase7c/raw/`; audit/logs `tmp/phase7c/`; screenshots `test-results/phase7c/`; application catalogue `public/geography/buildings-v1/` (manifest plus 99 content-hashed GeoJSON chunks). Referenced chunks total **25,218,095 bytes**, manifest **26,790 bytes**, largest chunk **1,376,161 bytes**. Intermediate runs can leave unreferenced old hash-named files; a clean output directory/rebuild needs only the current manifest's files. Generated harness modules belong only in local test output, not a maintained production bundle. Raw/large outputs are not staged or tracked; the small licensed fixture is an untracked maintained file awaiting review.

## Preparation and source decision

```powershell
npm.cmd run buildings:download # public API once; may require network permission
npm.cmd run buildings:prepare  # offline repeat; receipt and pinned bytes required
```

If the public latest snapshot changed, download is preserved by SHA but preparation stops. Review source date/licence/schema before changing the pin. For an exact rebuild, reuse the audited raw file and its receipt from Terminal 2's ignored directory through explicit coordination. An ordinary Git transfer will not include them. The remaining application build works without the optional catalogue because no component imports it automatically.

This is a **URA alternative**, not an HDB/URA merged database or a complete Singapore inventory. Choose it explicitly. Keep the existing HDB option available for areas where that newer supplied snapshot has better coverage; never show both extrusion sources simultaneously. No automatic spatial conflation, cross-source overlap resolution or OSM integration is supplied. See the audit for source licences, measured differences and height limitations.

## Minimal map hooks to apply during integration

```ts
import { parseBuildingManifest } from '../lib/buildings/contract';
import { BuildingLayer } from '../lib/buildings/layer';

// Within existing map lifetime; abort this manifest request on unmount.
const response = await fetch('/geography/buildings-v1/manifest.json', { signal });
if (!response.ok) throw new Error('Building catalogue unavailable');
const manifest = parseBuildingManifest(await response.json());
if (disposed || signal.aborted) return; // required after async manifest retrieval
const buildings = new BuildingLayer(map, manifest, {
  beforeId: 'network-lines', // use the actual current rail/annotation anchor
  onStatus: status => { /* show scoped loading/coverage/height message */ },
});
void buildings.refresh();
// Toggle: buildings.setVisible(enabled)
// Map effect cleanup, BEFORE map.remove(): buildings.dispose()
```

The application owns the manifest-fetch error boundary, lifecycle guard and retry UI. This adapter owns subsequent chunk requests, three concurrent fetches, checksum/runtime validation, 12 MB **serialized-input** LRU budget, ≤32/12 MB selected chunks, stale-response rejection and conditional idle recovery. The budget is not a JS heap/GPU memory cap. Geometry assignment uses full bounds, not nominal cell bounds. Hidden/disposed states abort pending fetches. A style reset is supported while the adapter is visible; hidden recreation should be retested when changing map themes. Do not manually remove its source while alive.

Source/layer IDs are `sg-buildings` / `sg-buildings-extrusion`. Construct once per map; a second instance with the same source is rejected. Repeated `refresh()` is safe. Below manifest zoom 14, clear geometry and show an overview hint. Very wide high-pitch views can exceed the explicit budget and receive an overview state instead of an arbitrary partial inventory. `refresh` updates on move-end; no camera mutation, control registration or extra rendering loop occurs. Failed chunks yield an error state and incomplete/empty geographic results; other map layers remain usable. Disposal removes only owned resources/listeners and is idempotent.

Replace the old HDB-loading effect when the alternative is selected; do not let it recreate `hdb` after the new adapter loads. Update the layer toggle label, status text, footnote and any cached attribution saying “HDB only”. Keep source and licence links conspicuous. Show “URA indicative footprints; incomplete coverage; all heights illustrative 12 m”. Existing network lines, stations, AAC DOM markers and Three.js citizens retain their own ordering/lifecycle. Do not change global light, terrain, pitch or camera from this module.

The opt-in browser harness disables/removes the old HDB source in a test page and installs this actual adapter on the same map via browser-module injection. It intentionally leaves old UI labels in screenshots; that is an integration touchpoint, not a claim the production controls already govern the alternative. Its React-ref inspection is testing-only and must not enter production components.

## Acceptance after Phase 7A.1 integration

1. Run all six existing model CLIs, `npm.cmd test`, application and strict module TypeScript, production build and `git diff --check` sequentially. Local Phase 7C suite is **258 passed, zero failed**, not Terminal 1's expected 266+ tests.
2. Own a separate port; prepare the browser harness with `node scripts/testing/prepare-building-harness.ts` only for standalone adapter checks. Use Playwright helpers with a loaded current map; regenerate after module changes.
3. At 1440×900, zoom15.65/pitch52/bearing−9, inspect the seven documented cameras. Compare raw inventory and rendered counts separately. Test 390×844 and the new opening camera independently.
4. Verify no simultaneous HDB/URA extrusions; labels, source/date/licence caveats, streets, annotations, MRT/AAC markers and citizen selection/play/pause remain usable. New Phase 7A.1 annotations/camera transitions require Terminal 3 acceptance because they are absent here.
5. Test toggle during pending requests, rapid camera motion, missing/corrupt chunks, missing manifest, leaving/re-entering the workspace, source selection, style reset and unmount before manifest resolution. Keep one canvas and one citizen loop. Propagate error/overview states visibly.
6. Existing no-WebGL fallback remains unchanged. Forced context loss was not exercised; verify fallback on target hardware. Desktop/mobile local checks do not establish sustained FPS or GPU capacity.

Independent review found and verified fixes for rounded deduplication, receipt dates, emitted-feature validation and readiness recovery; no remaining Critical/Important finding. Integration still requires a reviewed file transfer/commit and coordinated Git operations authorised by the user. Do not overwrite Terminal 1's entire map component or package file.

## Phase 7C.1 addendum — 28 October 2026

This extension changes the earlier "URA alternative only" scope to an **optional internal HDB/URA/Overture review view validated for handoff**. It does not integrate Terminal 1's UI or approve a public demo. All original counts and acceptance findings above remain the earlier checkpoint's results. The full 7C.1 pipeline, emitted-data validation, desktop/mobile rendering checks and final local regressions passed; production integration remains pending. See the [new validation ledger](PHASE7C1_ISLANDWIDE_BUILDING_COVERAGE.md#evidence-and-validation-ledger).

The reviewed full catalogue has **234,739 footprints**, **1,119 chunks**, **176,643,869 referenced bytes**, a **339,308-byte manifest**, and largest chunk **1,495,366 bytes**. Final manifest SHA-256 is `5ab917ca747b51527868499c58ac6ecc21c82dd8897d3243ed9ff52ef0bfc32b`. All feature geometries/source IDs and chunk hashes passed the TypeScript validator and explicit preview copy again after metadata display-text correction. Raw source bytes are unchanged. Preserve that manifest's exact referenced files when coordinating ignored-asset transfer.

Final Terminal 2 verification: **266 Node tests passed, zero failed/skipped; 19 Python tests passed; all six model CLIs exited 0; application and strict building-module/script/test TypeScript passed; Next.js 16.4.3 production build succeeded with all 14 listed pages/routes**. These are this checkout's tests, not Terminal 1's Phase 7A.1 suite. An approved rerun resolved `eldercare:prepare` sandbox EPERM on its ignored derived catalogue. The owned 3121 server is stopped and its port free; no live AI request, Git mutation, raw-input edit or Terminal 1 change occurred. Branch/HEAD remain `feature/synthetic-population` / `4400f47`.

Desktop evidence is `tmp/phase7c1/final-browser-counts.json` and `test-results/phase7c1/unified-*.png`: 14 final-data views at 1440×900 and zoom 15.65/pitch 52°/bearing −9°, all ready. The main report separates current URA/HDB comparisons, selected inventory and rendered tile counts, and records a single local cold/warm timing trial. Failure/compatibility checks used first full-pass data with the current adapter; preserve that scope distinction when reviewing results. They do not replace final integrated acceptance.

Mobile evidence is `tmp/phase7c1/final-mobile-browser.json`, `final-mobile-performance.json` and `test-results/phase7c1/mobile-unified-*.png`: three final-data views at 390×844, all ready. The inspected Tiong Bahru screenshot shows outdated HDB labels and long attribution overlapping the bottom legend. **Required integration work:** correct labels and provide responsive/collapsible attribution retaining all source credits and licence links, then retest narrow-screen legend readability. No production UI was patched here. Independent review found no new correctness blocker for internal handoff, with the decision audit/manifest hash reconciled; the public-release boundary remains unresolved.

Additional maintained files and touchpoints:

- `scripts/buildings/acquire.py`, `conflation.py`, `prepare_unified.py`, `requirements.txt`: pinned acquisition, topology/scope checks, deterministic indexed selection, audit sidecars and static chunks.
- `scripts/prepare-unified-buildings.ts`: offline pipeline entry, emitted-data verification and explicit local preview copying.
- `scripts/tests/test_building_conflation.py`, `lib/contracts/tests/building-unified.test.ts`, `lib/contracts/tests/fixtures/hdb-shared-roofs.json`, `scripts/testing/phase7c1-browser-check.mjs`: geometry/selection regressions including four actual shared-roof blocks, mixed-source boundary checks and 14 fixed browser cameras.
- `lib/buildings/contract.ts` and `layer.ts`: source registry, distribution validation and loopback guard, while retaining the existing adapter API.
- `package.json`: merge `buildings:unified` alongside the existing building scripts; Python is not an npm/Next.js dependency.
- `.gitignore`: preserve the added `__pycache__/` and `*.pyc` exclusions for optional offline Python tooling.
- `docs/PHASE7C1_ISLANDWIDE_BUILDING_COVERAGE.md`, labelled addenda in these three reports and a narrow update to `docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md`. The user's 7C.1 request authorises the local roadmap edit; reconcile it with Terminal 3's current copy instead of overwriting that file wholesale.

The [rebuild commands](PHASE7C1_ISLANDWIDE_BUILDING_COVERAGE.md#rebuild-and-local-handoff) install pinned tools into ignored `tmp/phase7c1/venv`, acquire the reviewed Overture release, prepare a prototype/full catalogue, then validate it. Generated output remains ignored under `tmp/phase7c1/{raw,prototype,derived}`. `--preview` is a separate explicit step and copies only validated manifest-referenced chunks, `/geography/buildings-v1/unified-manifest.json` and `UNIFIED-LICENSING.txt`; it does not overwrite the old `/manifest.json`. Raw snapshots/receipts and audit outputs require coordinated transfer because Git does not carry them.

The final combined Phase 7C/7C.1 handoff contains 22 new maintained files; tracked modifications are limited to `.gitignore`, `package.json` and this checkout's roadmap. No public-facing component/route changed, and `next-env.d.ts` has no final diff. All four raw checksum pins were rechecked unchanged; derived/public manifests match the recorded SHA-256; `git diff --check` passed. Work remains unstaged, uncommitted and unpushed. Reconcile the three tracked files rather than replacing Terminal 3's versions wholesale.

For an internal loopback preview, use the original lifecycle example with `/geography/buildings-v1/unified-manifest.json`. Keep the local-review flag, disable/remove the legacy HDB source before installing the adapter, and show one building view. Expose mixed source attribution and height-basis notes rather than retaining the old URA-only status. Retain manifest-fetch abort/stale guards, error/retry handling, source cleanup and the existing network/AAC/citizen ownership. Rebuild the opt-in harness after module changes.

Keep the corrected candidate-area selection rule during transfer: equivalent roofs are suppressed; other non-minor conflicts suppress only when earlier retained footprints jointly cover at least 50% of the candidate. Preserve `retainedOverlaps`, final retained-pair `minorOverlaps` and the separate candidate/retained/union coverage fields. Smaller source-preferred roofs must not erase larger containing roofs simply because the smaller shape is covered. The revised opaque rendering policy addresses alpha-stacking darkness, not geometry conflicts. Include residual-overlap and differing-height samples in visual acceptance; neither a denser view nor opaque shading proves conflation correctness.

Do not ship the unified preview, sidecars or harness as publicly cleared assets. Source-specific chunks do not settle the combined licence question. Follow the [7C.1 licensing decision](PHASE7C1_ISLANDWIDE_BUILDING_COVERAGE.md#licensing-decision) before any public demo, publication or redistribution. A separate review is needed to choose a compatible dataset strategy and satisfy any required machine-readable offer.

Terminal 3 acceptance must rerun the final suite and actual map checks against its integrated Phase 7A.1 code: new opening camera, annotation ordering, one visible building layer, attribution/height labels, desktop/mobile, rapid camera changes, missing/corrupt assets, pending toggles, source/style recreation, unmount, MRT/AAC controls and citizen selection/play/pause. Keep absent Phase 7A.1 tests explicitly unclaimed. No merge, commit, push or other Git mutation is part of this local documentation handoff.
