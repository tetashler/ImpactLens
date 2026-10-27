# Phase 4B — Animated citizens

Validated locally on 27 October 2026, starting from `master` at `98c91d6`. This is pre-hackathon experimentation. No Git history operations, Phase 4C calculations, Gemini calls, raw-data changes or environment-file changes are included.

## Try it

```powershell
npm ci
npm run dev
# http://127.0.0.1:3000
```

Click **Citizens** above the map to focus the illustrative Ang Mo Kio sample. Play using the map toolbar or citizen inspector. Select a character's head/body or use the searchable citizen list. Baseline/Scenario retains the selected ID, map camera and visual clock. Reset pauses at time zero. Speed options are 1×, 2× and 4×.

The MRT journey tab retains the existing editor and simulation. Citizen fixtures are **independent of the current editable line**. Changing an MRT proposal never fabricates new citizen outcomes. In the citizen inspector, Baseline hides proposed infrastructure; Scenario shows the editor's proposal. Loaded citizen results need a matching Phase 4C scenario before that overlay and those outcomes can be interpreted together.

## Architecture

| File | Responsibility |
| --- | --- |
| `lib/citizens/data.ts` | Validate, clone/freeze baseline/scenario payload pairs; stable render sampling; selected-profile projection through existing validators |
| `lib/citizens/fixtures.ts` | Immutable, invented 180-agent demonstration with improved, unchanged, unassigned and unavailable cases |
| `lib/citizens/playback.ts` | Deterministic visual clock, waypoint interpolation, heading and animation states |
| `lib/citizens/scene.ts` | Procedural cuboid rig, ID-based appearance, geographic frame, ray construction and owned-resource disposal |
| `lib/citizens/layer.ts` | MapLibre custom 3D layer, shared Three.js WebGL renderer, instancing, LOD, selection and measured frame cadence |
| `components/singapore-map.tsx` | Layer lifetime, camera focus, picking, supplied selected path and existing MRT interactions |
| `components/citizens-panel.tsx`, `citizens.css` | Inspector, accessible list, profiles, playback and JSON import |
| `components/workspace.tsx` | Independent citizen and MRT state; inspector tabs |

The only runtime dependency added is Three.js (`0.186.1` installed); `@types/three` is development-only. No React Three Fiber, models, textures, extra server, database or endpoint was added. Browser code imports no population-generator or MRT-routing runtime module for citizens.

Created the seven implementation files listed above under `lib/citizens/` and the citizen panel/CSS, `lib/contracts/tests/citizen-scene.test.ts`, `lib/contracts/tests/citizen-visualisation.test.ts`, this report and `docs/superpowers/plans/2026-10-27-animated-citizens.md`. Modified `components/singapore-map.tsx`, `components/workspace.tsx`, `package.json`, `package-lock.json`, `README.md` and the existing central roadmap. Browser screenshots and the import fixture are under ignored `test-results/`; no raw data or shared contract was changed.

### Rendering and geography

One MapLibre `renderingMode: '3d'` custom layer renders into its existing WebGL2 context. Three.js uses the supplied `defaultProjectionData.mainMatrix`, multiplied by a local Mercator frame. Coordinates remain named `{lat, lon}` in the contract and become `[lon, lat]` only at MapLibre boundaries. The local scene is east/north/up; north is flipped when converting to Mercator Y. Scale is reciprocal cosine latitude divided by Earth circumference. Independent high-latitude and Singapore tests catch axis/scale errors.

Each citizen has a cuboid head, hair cap, torso, hips, arms, legs, shoes and eyes: twelve instanced body-part batches sharing one box geometry/material. Clothing, skin and hair palettes depend only on the synthetic ID, never demographic attributes. Characters are exaggerated to approximately 9.7 m toy height for legibility; this is not an inferred physical attribute. Walking swings alternate limbs, travelling moves in a standing pose, idle bobs subtly, and arrival settles at the supplied destination.

Depth is shared with the existing 12 m illustrative HDB extrusions; the layer does not clear the map or its depth buffer. A selected ring and an exact supplied schematic waypoint line distinguish the selected citizen. Ray picking tests the head/torso and maps instance indices back to stable IDs. Bounds are invalidated after instance updates; midpoint unprojection avoids infinite-far-plane failures. Picking does not test building occlusion, so the accessible list remains useful for obscured citizens.

Only MapLibre drives rendering through `triggerRepaint`; there is no second animation loop. React receives statistics at roughly one-second intervals and on user changes. Hidden, paused, low-zoom and reduced-motion states stop continuous citizen repaint requests. A 450 ms visual position blend smooths view changes; reduced motion skips it. `onRemove` unregisters listeners, stops the clock and disposes instance buffers, geometry, materials and Three's renderer without losing the shared map context. The 3D init failure path retains MRT editing and profiles; that fallback was code-reviewed, not force-tested with GPU failure.

### Sampling and animation

- Below zoom 13.5: no characters. Zoom 13.5–16.2: at most 60 heads/torsos. At zoom 16.2+: at most 300 full characters, or 100 on viewports narrower than 900 px.
- The included sample has 180. Viewport culling and selection priority can reduce/change the drawn subset. These limits never affect population weights or outcome statistics.
- Missing positions and Mercator-incompatible polar positions remain inspectable but are omitted from rendering. Positions must exist in both views to enter the stable render sample.
- Supplied walking/travelling paths begin with 2 seconds idle, move over an illustrative 90-second sequence, have an arriving phase in the final 3 seconds and then remain idle at the supplied destination. Repeated points and empty paths are safe. Unassigned/unavailable fixture citizens remain stationary.
- Visual time, pacing, limb motion and route interpolation **do not calculate journey durations, savings, demand, daily behaviour or long-term impacts**. This is a demonstration sequence, not a behavioural day model. Pause freezes position; poses settle when paused. Long frame gaps are capped at 250 ms to avoid hidden-tab jumps.

## Contract integration and profiles

The frontend envelope is `{baseline: CitizenSimulationPayload, scenario: CitizenSimulationPayload}`. Each side is parsed with the unchanged shared `parseCitizenSimulation`; matching population metadata, citizen identities/weights/categories and identity sources are required. Incoming objects are cloned and deeply frozen. The two payloads may supply different visual paths and outcomes. No contract type was duplicated or extended.

Use **Load simulation data** to import a version-1 pair (maximum 5 MB). Import failures leave the active pair untouched. Restore illustrative fixture requires no file. Terminal 2 can later pass the same validated pair from an endpoint; a full weighted population need not be downloaded. Profiles use `getCitizenProfile` and the existing `parseCitizenProfile`. The v1 profile requires hypothetical assignment text; the adapter reuses the referenced journey-assignment assumption verbatim rather than inventing a routine.

Profiles display synthetic ID, supplied categories and expansion weight, supplied baseline/scenario minutes, status, transfers, percentage and proposed-line use, plus assumptions/source metadata. Missing results stay unavailable. No names, jobs, income or mobility attributes are invented. **Talk to citizen** is disabled with a Gemini-not-connected explanation.

The fixture's 180 agents, represented weight 9,000, categories, spatial grid, paths and 30→20-minute illustrative comparison are all **invented**. They are not Census estimates, measured passenger movements or actual MRT-engine outputs. No demographic metric is calculated in this phase. Historical Census limitations and the 3,050 leaf-total discrepancy remain unchanged in Phase 4A.

## Verification

| Check | Result |
| --- | --- |
| `npm.cmd run mrt:validate` | Pass; weekday/Saturday/Sunday graph connected, 184 stations, original quarantine policy retained |
| `npm.cmd run mrt:simulate` | Pass; NS4→NE16 remains 62.77→20.00 modelled minutes |
| `npm.cmd test` | **97 passed, 0 failed**: all previous 84 plus 13 visual/data/controller tests |
| `npx.cmd tsc --noEmit` | Pass |
| `npm.cmd run build` | Pass; existing page and API routes compile |
| `git diff --check` | Pass; Git only notes normal LF→CRLF conversion |

New tests cover immutable validation, identity consistency, invalid external JSON, baseline/scenario paths, coordinate order and Mercator scale, polar omission, interpolation/heading, stationary/repeated paths, all controller phases, speed/pause/reset/disposal, missing/unavailable journeys, profile selection, appearance variation, batching, idempotent resource cleanup and picking after instance movement/infinite projection.

### Actual browser checks

Playwright MCP exercised the local Next development server at `127.0.0.1:3000`, including reloads. A second `npm run dev` correctly reported the existing server; the existing server was reused. Verified:

1. Map, HDB layer and 180 citizens loaded. Canvas-only before/after screenshots differed after 4 seconds of playback; walking/movement was visible.
2. Clicking a character selected `syn-a4b1800000000000-128` and opened Citizen 128; accessible selection inspected improved, unchanged, unassigned and unavailable cases.
3. Play advanced the visual clock; Pause retained `00:00:03` across an additional 1.2 seconds; Reset returned `00:00:00`. View switching retained the same selected ID.
4. Baseline hid proposal pins; Scenario restored them. Pan/zoom kept the shared geographic scene aligned. Zooming out produced 60 simplified characters and 3 citizen draw calls including selection.
5. Reduced-motion emulation produced static poses and an explicit status. Imported malformed JSON was rejected; a valid fixture pair loaded successfully.
6. MRT simulation returned 20.00 scenario minutes; adding 60 seconds to segment 1 returned 21.00. Adding an existing NS16 interchange and a new map station produced a valid six-station proposal and reran without error.
7. Desktop 1600×1000, tablet-width 820×1000 and 390×844 layouts had no horizontal document overflow. Narrow views rendered at most 100 characters; only one map canvas remained after interactions/reloads.
8. No browser console errors were observed in the final session. Resource disposal is unit-tested and reviewed; no long-duration heap/GPU-memory leak profile or forced context-loss test was performed. Browser checks are actual MCP runs, not a committed Playwright test suite.

### Observed performance

Test browser reported Intel UHD Graphics through ANGLE/D3D11. Foreground desktop samples showed approximately **103–128 custom-layer frames/s** with 179–180 drawn characters and HDB enabled; full characters used 12 body draws plus 1 selection-ring draw. A native RAF check counted 226 callbacks over 2,048.7 ms (about 110/s). Foreground narrow samples showed approximately **122–123 frames/s**, 100 drawn characters and 12–13 draws. These are short local observations, not sustained benchmarks or guaranteed visible presentation FPS. The on-screen counter measures custom-layer render cadence, not GPU timing; its drawn count includes potentially occluded instances.

The initially background/occluded test tab ran near 1 frame/s; bringing it to the foreground restored normal cadence. One narrow transient sample was about 30/s while scrolling/focusing. Focus the map and pause unused animation during demonstrations. Capacity 300 is configured but has **not** been benchmarked; the included 180-agent fixture is the measured desktop case. Existing 23.5 MB untiled HDB geometry still has a noticeable first-load cost.

## Handoff and limitations

Terminal 2 must supply validated, sampled baseline/scenario animations with stable IDs, explicit location/journey assumptions and full-population weighted outcomes/denominators. Coordinate availability is optional: agents without spatial assignments remain profile-only. Agree how the current MRT intervention, service date and returned scenario identity match before wiring automatic regeneration. The frontend must display supplied metrics rather than derive benefits from the rendered sample. This phase does not verify Terminal 2's pending implementation.

No verified pavement/rail geometry, actual daily routines, observed individual locations, real-time demand, vehicle/train models or behavioural projections are added. The illustrative grid may overlap real footprints and is not a siting model. Mercator-only rendering, schematic paths, simple travelling poses, first-load geography cost and lack of a committed browser regression suite remain limitations. SVG fallback has no 3D citizens. Full Phase 4 remains incomplete until Phase 4C calculations and frontend handoff are validated. Gemini and eldercare/active-ageing work remain planned.

## Tools and competition reconstruction

Used Playwright MCP for real browser interactions/screenshots, Context7 for installed MapLibre/Three integration guidance, shell/TypeScript/Node tools for tests, and the animate, frontend-design and Superpowers planning/testing/review/verification skills. MCP/tool discovery included GitHub capabilities; GitHub mutations were unnecessary. A read-only reviewer reproduced scale and stale-selection-bound defects; both were fixed with regression tests. Official references: [MapLibre custom-layer API](https://maplibre.org/maplibre-gl-js/docs/API/interfaces/CustomLayerInterface/), [Three.js InstancedMesh](https://threejs.org/docs/#api/en/objects/InstancedMesh). Existing map attribution/licensing/internet requirements remain in `INTERACTIVE_MAP_IMPLEMENTATION.md`; no new online graphics assets are used.

For a permitted rebuild during competition:

1. Recreate the validated MRT/map and shared-contract boundary first; preserve dated provenance and quarantine policy.
2. Add Three.js and its types; implement the single shared-context custom layer and geographic conversion before animation.
3. Batch procedural cuboids, add clock/interpolation and stable ID-based appearance; test Mercator scale, picking bounds and cleanup.
4. Load an explicitly illustrative pair, add selection/profiles and pause/reset/view controls, then connect independently validated Phase 4C payloads.
5. Run the commands above, bring the actual presentation browser to the foreground, check a narrow viewport and measure the real laptop. Rebuild from scratch as competition rules require.
