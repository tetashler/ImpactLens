# Phase 6C — Interactive AAC placement and accessibility

Validated on 28 October 2026 in the main `master` worktree, starting at `5c5451d`. This is a pre-hackathon learning prototype. No merge, rebase, reset, staging, commit or push was performed; no private environment file, raw data, accessibility engine, MRT algorithm or population weight was changed.

## Working demonstration

Run `npm.cmd run dev`, open the printed loopback URL, and choose **Active Ageing Centre**. Select **Load Bukit Merah demo**, then **Calculate AAC Impact**. This explicit action chooses the existing validated illustrative site; the initial editor has no proposed location. Alternatively choose **Place New Centre**, click an empty map location, or enter latitude/longitude. Drag HYP, choose Reposition, or edit coordinates to adjust the proposal. Escape/Cancel ends placement. Reset removes the site and results.

MRT Line remains a separate mode with the original editor, deterministic journeys, weighted demographic dashboard, calculated profiles, optional Gemini/OpenRouter features and illustrative citizen animation. Completed MRT state is retained while AAC mode is open. AAC results, controls and markers never appear under MRT mode. A completed AAC result is retained on return only while its draft is unchanged; a pending calculation is invalidated when leaving the mode.

## Architecture and files

| File | Responsibility |
|---|---|
| `components/workspace.tsx` | Additive mode selector and composition; retains MRT components/state and one map instance |
| `components/singapore-map.tsx` | Routes clicks to the active intervention before citizen/rail selection; hides inactive rail layers/pins |
| `components/use-aac-scenario.ts` | Independent AAC draft, catalogue, placement, results and request lifecycle |
| `components/eldercare-panel.tsx`, `eldercare-ui.css` | Settings, manual coordinates, catalogue inspection, loading/errors and results composition |
| `components/eldercare-dashboard.tsx`, `eldercare-dashboard.css` | Stored metric presentation, weighted coverage, comparisons, group inspection and evidence |
| `lib/eldercare/editor.ts` | Browser-safe draft, validated request construction and complete draft identity |
| `lib/eldercare/session.ts` | Request cancellation plus revision and response-identity guards |
| `lib/eldercare/map-layer.ts` | Four catalogue markers, draggable hypothetical marker, radius and result-provided proxy markers |
| `lib/eldercare/geometry.ts` | Coordinate conversion and display-only geographic circle |
| `lib/eldercare/dashboard.ts` | Formatting, denominator labels and grouping/sorting; no accessibility calculation |
| `lib/contracts/tests/eldercare-{ui,dashboard,lifecycle}.test.ts` | 22 added deterministic regressions |
| `scripts/testing/phase6c-browser-check.mjs` | Opt-in real-page Playwright checks; no application test mode or external provider calls |

README, the central roadmap and `docs/superpowers/plans/2026-10-28-aac-ui.md` also record this work. No dependency or package-script changes were needed. Existing MapLibre 6.16, React/Next and TypeScript are reused. No additional map, population generator, accessibility algorithm, database or AI grounding scheme was introduced.

## API adapter and scenario lifecycle

Only existing browser-safe contracts from `lib/eldercare/api-contract.ts` are used:

- `GET /api/eldercare/facilities` → `parseFacilitiesResponse`.
- `createDefaultEldercareRequest`, modified with explicit user settings → `parseEldercareApiRequest`.
- `POST /api/eldercare/simulate` → `parseEldercareApiResponse(response, submittedRequest)`.

The API preset remains `bukit-merah-landmarks-v1`, AAC only. The UI exposes name/site, primary radius, optional 1,000 m comparison, age cutoff, availability assumption, and advanced capacity, assumed speed, sample size, seed and reference date. Capacity defaults to unknown; enabling it records an illustrative assumption rather than allocating services. Speed only enables the backend's optional straight-line time conversion. A later date neither ages Census residents forward nor verifies opening status. No simulation is triggered by map motion, input changes or dragging; Calculate is explicit.

Every editable calculation field participates in the draft key, including invalid numeric states. Changes clear current results and cancel the previous request. The session additionally checks a monotonic context revision and existing `ImpactRevisionGate` ticket, so A→B→A edits, reset, supersession and mode changes cannot revive an obsolete response even if fetch ignores abort. The hook separately checks attempt number, current draft and active mode before writing state. Drag start clears results before any coordinate changes. The complete submitted request is cloned and validated.

The response parser verifies the echoed client request token, canonical request fingerprint, deterministic engine scenario ID and actual request/result contents. These are not interchangeable identities: tokens identify attempts, fingerprints identify inputs, and scenario IDs identify calculations. Invalid/mismatched responses are refused with a controlled error. The existing API's nested `{version:1,error:{code,message}}` envelope is handled. Catalogue failure has a prominent retry action and does not disable MRT or map navigation. No server loader or Node-only computation enters the client bundle.

## Map interaction and geometry

One `AacMapLayer` uses DOM button markers plus a GeoJSON fill/line source on the existing MapLibre map. It renders exactly the corroborated facilities returned by the parser, with operator evidence/historical coordinate caveats available in the popup and accessible catalogue selector. Existing AACs are green, the hypothetical site is coral/HYP, and source-supported landmark proxies are violet/P. Popups use DOM text, never injected HTML. A mobile stacking defect was found by screenshot inspection and fixed so popups appear above map controls.

The existing map has one click handler: AAC placement returns before the MRT/citizen paths. Marker buttons stop propagation; popup/control clicks cannot place a centre. MRT sources/pins and illustrative characters are hidden in AAC mode, with the same map/camera retained across switches. Map controls, buildings and panning remain usable. Catalogue markers are rebuilt only when catalogue/active state changes; dragging updates the circle imperatively rather than rerendering the population. Bounds-rejected drags restore the previous marker. Coordinate inputs allow keyboard-only placement within the server's inclusive latitude 1.15–1.5 / longitude 103.6–104.1 bounds. These bounds are not site approval.

GeoJSON always uses `[lon, lat]`; request coordinates remain `{lat, lon}`. The radius is a closed 64-segment great-circle polygon using mean Earth radius 6,371,008.8 m, matching the backend's spherical distance convention for WGS84 coordinates. Independent vector-distance tests check ground metres at Singapore/high latitudes and poles. No fixed degree offsets or planar Web Mercator metre approximation are used. Zero threshold produces no visible area. The overlay is explicitly **assumed straight-line accessibility radius — not a walking-network catchment**.

Two proxy markers appear only from a current validated result's `provenance.originReferences`. These public station landmarks are aggregation assumptions, not homes, residential centroids or clusters of people. No AAC citizen trips are animated. Style-load handling restores the AAC radius source/layers. Mode changes remove markers/popups and clear the overlay; disposal removes the style listener, sources, layers and markers. No animation loop is added. The existing WebGL fallback supports point placement/record selection and manual coordinates; draggable markers and the radius require MapLibre/WebGL. Arbitrary external style replacement and WebGL-loss recovery were not acceptance-tested.

## Metric and denominator semantics

All impact values come from validated Phase 6A results. The dashboard formats and orders them without calculating accessibility again. It shows target/located/comparable/unlocated population, separate baseline/scenario mean distances and denominators, paired mean reduction, closer population, threshold shares, newly within, paired percentage-point change, and scenario access without a baseline. Null distances display **Unknown**, while genuine zero improvement/coverage change displays zero. Groups with no comparable population can have zero counted improvements while their outcome remains explicitly unknown.

Baseline and scenario assessable denominators can differ; paired change uses the same comparable population on both sides. Unknown origins are never subtracted into an unaffected group. Age, sex, planning-area and subzone tables use stored metrics, with sorting and per-group details; dimensions overlap and must not be added together. Capacity is disclosed independently, not applied as a hidden cap on geographic beneficiaries.

The default real API response reproduced:

| Measure | Calculated result, rounded for display |
|---|---:|
| Census 2020 age-targeted population, 60+ | 44,520 |
| Located and comparable | 6,230 |
| Unlocated / outcome unknown | 38,290 |
| Closer nearest compatible AAC | 3,890 |
| Mean baseline → scenario distance | 410.44 → 347.46 m |
| Weighted paired mean reduction | 62.98 m |
| Newly within 500 m / 1,000 m | 0 / 0 |
| Paired coverage change at each threshold | 0 percentage points |

Both thresholds already include all comparable origins before the proposal. Improved proximity therefore does not imply new threshold coverage. These figures are API outputs, not hardcoded UI examples. Selecting exclude-unconfirmed produced no baseline facilities, zero comparable population, unknown baseline/reduction and a valid separate scenario mean; scenario-only access was not called newly covered. Age 65+, capacity 150 and speed 0.8 m/s were also exercised through the real API, with the assumption and optional conversions visible.

## Automated verification

All original 205 tests are preserved. **227 passed, 0 failed**, including 11 editor/geographic tests, 7 dashboard tests and 4 asynchronous lifecycle tests. These cover all draft fields/fingerprints, invalid coordinates/settings, reset independence, browser import boundaries, geographic metre accuracy, denominator/null/zero semantics, group sorting, ignored aborts, stale tokens/coordinates, reset/mode races and safe backend errors. No paid AI request occurs in tests.

The following commands passed:

```powershell
npm.cmd run mrt:validate
npm.cmd run mrt:simulate
npm.cmd run agents:generate
npm.cmd run agents:impact
npm.cmd run eldercare:prepare
npm.cmd run eldercare:simulate
npm.cmd test
npm.cmd run build
npx.cmd tsc --noEmit
git diff --check
```

Explicit strict NodeNext TypeScript checks also passed for the eldercare CLI, all three existing eldercare test modules and the three new frontend-helper test modules, using the installed compiler with `--ignoreConfig --noEmit --strict --skipLibCheck --types node --target ES2022 --module nodenext --moduleResolution nodenext --allowImportingTsExtensions`. The application check covers TSX/map/hooks. The production build retains all existing MRT, impact, profile and AI routes alongside both eldercare routes.

Environment notes: preparation initially encountered sandbox EPERM on the existing ignored derived catalogue; the same authorized command passed with the appropriate execution permission. A repeated parallel test/build attempt collided in their shared MapLibre worker-copy preparation (`EBUSY`); running test/build sequentially resolved it. Do not run those preparation hooks concurrently on this Windows workspace. Neither required changing application code or raw data.

## Actual browser acceptance

Playwright MCP used the existing main-project dev process on loopback port 3000 after checking its ownership; no competing server was started or existing process terminated. Desktop 1440×900 and narrow 390×844 were tested against real Node APIs, with controlled interception only for deliberate failures/races.

| Flow | Observed result |
|---|---|
| MRT regression | Edited segment 1 to 360 s; scenario journey 21.00 min, demographic API/dashboard and calculated profile loaded; 19 age groups; no-key AI explanation state remained usable |
| Illustrative citizens | 180-character sample; Play/Pause/Reset operated, reset clock 00:00:00; one map canvas retained |
| Facilities | Exactly four AAC markers, source caveats/selection; closing and reselecting the same marker reopened its popup |
| Placement | Map click, coordinate editing, drag, Cancel/Escape; AAC clicks did not add MRT stations even with MRT new-station mode retained |
| Calculation | Actual POST and echoed coordinates/fingerprint matched the displayed report; default output matched the engine table above |
| Modifications | Drag cleared old results immediately; rerun changed fingerprint; radius 250 changed request/scenario; Reset removed report/site/proxies |
| Mode isolation | AAC markers/results disappeared in MRT; MRT four-station draft and 360 s edit retained; unchanged completed AAC result retained on return |
| Delayed responses | Held real responses during move, threshold change, reset and mode switch; none restored obsolete metrics |
| Groups/settings | Age/sex/area/subzone sorting and detail inspection; age cutoff, illustrative capacity and speed; no-baseline scenario showed unknown comparisons |
| Failures | Catalogue 503 showed retry while MRT stayed usable; recovered to four markers; simulation 503 safe message; mismatched identity rejected; subsequent real request succeeded |
| Narrow screen | Map placement/recalculation/reset worked; no horizontal document overflow; facility popup fitted viewport and was readable after stacking fix |

Deliberate 503 interception produced expected browser resource errors. A fresh unmocked page was checked separately for unexpected errors. No new AI live call was made in Phase 6C; Gemini/OpenRouter provider and grounding code is unchanged and covered by the preserved regression tests. Current dev configuration presents the honest no-key/provider-selection state; this phase does not establish renewed live provider compatibility.

Local ignored evidence: `test-results/phase6c-desktop.png`, `phase6c-mobile.png`, `phase6c-mobile-popup-fixed.png`, `phase6c-tests.txt` and `phase6c-build.txt`. Screenshots/logs are not staged or intended as source assets. The opt-in browser module exports `mrtRegression`, `placementAndResults`, `delayedResponses`, and `settingsAndFailures`; invoke sequentially with a Playwright Page on a fresh desktop app. For MCP runtimes without dynamic-import support, read the trusted local module and evaluate its function definitions in `browser_run_code_unsafe` (remove ESM `export` keywords). Mobile/facility-failure checks also require resize/reload steps described above.

No significant interaction slowdown was observed during these checks, but no new FPS/GPU benchmark was performed. Capacity is four catalogue markers, one proposal and two proxies, independent of the server's population size. Repeated switches retained one canvas and four—not accumulated—facility markers. This is a lifecycle acceptance check, not proof of long-duration leak freedom.

## Evidence limits, tools and next steps

The catalogue is four operator/address-corroborated AAC classifications among 133 historical MOH points; 129 remain unclassified and are not rendered as AACs. Coordinates have July 2016 record fields, a 2024 catalogue date and separate corroboration dates. Present-day opening/capacity remains unknown. The population is Census 2020, with age-only eligibility assumptions and the existing national rounded-leaf discrepancy. Only two Bukit Merah public landmark proxies justify origins; the remaining represented residents stay geographically unassessed. Results establish neither walking routes, legal sites, service availability, attendance, enrolment, health improvement nor causal social outcomes.

Phase 4's missing justified individual calculated-population trajectories remains unresolved. AAC intentionally adds no synthetic journeys or healthcare persona chat. Future eldercare AI needs its own reviewed finite grounding contract; MRT templates must not be reused with incompatible metrics. Broader facility types, complete/current AAC data, justified origins, walking networks and capacity allocation require new evidence and separately validated models.

Tools: Playwright MCP for real browser interactions/screenshots/interception; official MapLibre documentation for marker/source lifecycle; local Next.js documentation/types; shell/npm/TypeScript and read-only Git inspection. Relevant frontend-design, planning/parallel implementation, test-driven-development, Git/worktree safety, independent code-review, systematic-debugging and verification skills were applied. Independent review found two defects (popup re-selection and nested error parsing), both reproduced and fixed; final follow-up found no remaining concrete blocker. No GitHub mutation was needed.

For the 24-hour rebuild: (1) prepare permitted local data and existing validated APIs, (2) keep their browser-safe contract intact, (3) build the default-to-request adapter and lifecycle tests, (4) add mode composition to one map without replacing MRT, (5) add four record markers, HYP placement and a geographic radius, (6) present stored metrics/denominators and unknown origins, (7) run regression/build commands sequentially and desktop/mobile/race checks, (8) rehearse the zero-coverage-gain distinction. Check competition rules before reusing prototype code or data. Phase 6C's scoped interactive AAC demonstration is ready for review/Git integration; no Git operation is performed automatically.
