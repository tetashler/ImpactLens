# Phase 7F — Living miniature pedestrians

Terminal 1, 28 October 2026. Main `master` started clean at `3b6e8c0f0c7457197aa26d87021b94704f3409d0`. Changes remain uncommitted. No other worktree, shared simulation contract, MRT/AAC formula, population weight, government input, building preparation/licence declaration, environment file or dependency was changed.

## Diagnosis before implementation

The original problem was reproduced in the actual local app before changing product code. Three's DevTools observer exposed the real instanced head matrices without adding production debug globals. Screenshots recorded the paused scene and five seconds of Play; Pause and Reset were also exercised.

At the starting checkpoint:

- `lib/citizens/fixtures.ts` positioned all 180 actors in one 15×12 grid centred on 103.85, 1.37. It was roughly 190×147 m across, with no actors in other neighbourhoods. This was an invented layout, not a geographic conversion failure.
- `lib/citizens/playback.ts` held a two-second idle, stretched short paths over about 85 seconds, clamped progress at one and then stopped. Half the fixtures had no movement. The selected actor's actual rendered horizontal translation changed from `(0,0)` to approximately `(1.2603,-1.2607)` metres after a five-second browser wait: **1.783 m**. It was moving, but the displacement was small.
- `lib/citizens/scene.ts` scaled a roughly 1.76 m box rig by 5.5, making a person nearly **9.7 displayed metres tall**. That scale and the regular formation accentuated marching. Pose was also conditional on playing, so pausing snapped limbs toward rest.
- The old clock capped each frame gap at 250 ms. Tests reproduced slow playback at low rendering cadence: a nominal five seconds at 2 FPS advanced only 2.5 seconds. This was a secondary pacing problem, rather than evidence that the normal 52-FPS baseline clock was broken.

The shared-context projection, root translation, instance-matrix uploads and repaint requests were functioning. The fix therefore targets fixtures, pacing, pose and scale rather than introducing another renderer. Historical code can be inspected with `git show 3b6e8c0:lib/citizens/fixtures.ts` and the corresponding playback/scene paths.

## Geographic fixtures and scientific boundary

`lib/citizens/pedestrians.ts` defines 180 stable illustrative actors over ten authored closed loops, two per area. Starts have at least **3.47 m** separation. Each area has 36 actors; this is a visual-density choice, not represented population density.

| Visual area | Latitude | Longitude |
|---|---:|---:|
| Tiong Bahru | 1.28336 | 103.83063 |
| Sengkang | 1.39404 | 103.89404 |
| Tampines | 1.36050 | 103.94270 |
| Downtown | 1.29050 | 103.85280 |
| Ang Mo Kio | 1.37380 | 103.85086 |

These are authored visual locations. They are **not resident homes, observed trips, verified pavements or a national pedestrian dataset**. Two compact elliptical lanes per area use metre offsets converted with the local latitude scale. Their 96 short segments provide continuous positions and small heading steps without spline overshoot into adjacent footprints.

The geographic regression actually ran against the existing local subzone polygons and unified building chunks. Segment probes are at most 0.5 m apart; all probes are within selected subzones and at least 2.5 m from supplied footprint boundaries, giving at least 2.25 m clearance between probes. Earlier overlapping candidates were rejected. This establishes only snapshot land containment and footprint clearance: it does not establish safe crossings, pedestrian permission, current obstacles or accessibility. A clean clone without the untracked local-review snapshot explicitly skips this named clearance test; invalid present manifests or missing referenced chunks fail. No building asset was generated or copied for this work.

The original 180 fixture IDs, invented profile categories, four journey examples and 9,000 invented represented weight remain inspectable. Visual area is explicitly independent of those demographic examples. Baseline and Scenario now have identical spatial animation; infrastructure edits do not reroute these pedestrians. Unassigned/unavailable profile journeys remain unassigned/unavailable even when the independent visual actor strolls.

Only `pair === citizenViewPairFixture` opts into the local looping actor system through internal layer options. Imported version-1 payloads retain their supplied positions/waypoints and existing one-shot animation semantics; null positions never receive invented paths. Exported fixture waypoint sequences are rotated to start at each actor's declared phase/position, so importing a copy does not collapse moving actors onto a shared first vertex. The shared citizen contract and planner/plotting contracts are unchanged.

## Motion, clock and lifecycle

Paths compile once into metre-based segment lengths and prefix distances. Each actor has a fixed ID, path, direction, initial distance and illustrative speed **0.95–1.55 m/s**. These speeds are visual assumptions, not demographic mobility measurements.

```text
period = totalPathMetres / speed
distance(t) = mod(startDistance + direction × (t mod period) × speed, totalPathMetres)
position(t) = interpolate the segment containing distance(t)
heading(t) = geographic segment tangent, reversed for the opposite lane
gaitPhase(t) = 2π × mod(t / (1.35 / speed) + initialPhase, 1)
```

Time is reduced before multiplication to avoid overflow for finite extreme values. Segment lookup is binary search. The closing segment is included, so a loop seam does not teleport. Facing is counterclockwise from east toward north. Dense waypoints limit seam heading changes to less than 0.18 radians; this is a schematic polyline, not a fitted pavement curve.

The existing **single `PlaybackClock`** now measures full visible wall time independently of frame cadence. The layer explicitly pauses on visibility, disable/hide, low zoom and reduced motion. Pause freezes time, geographic position and pose; Reset restores the exact initial state. No separate RAF, per-person loop or React-frame animation was added. The on-screen coordinate inspector updates about once per second and can lag the rendered position by up to that reporting interval.

`CitizenLayer` caches animation/ID lookups, compiled paths and model appearances. Camera movement never generates new actors or paths. Drawing is bounded to viewport candidates and existing render caps: 300 detailed desktop / 100 narrow, or 60 head/torso instances below zoom 16.2; hidden below 13.5. The default pool is only 180, spread across five areas, typically 36 local actors. The 300-actor limit is not a newly benchmarked capacity claim.

Show/hide, Play/Pause and General/Knowledge Graph navigation reuse the same owner. Style replacement disposes the old GPU resources and reattaches that owner while preserving its paused clock. Pending option changes during detachment are reconciled before drawing. A shared `syncCitizenPath` helper restores the current selected-path checkbox state after source/style replacement. New imported populations dispose obsolete appearance caches. Removal is idempotent and unregisters media/map/document listeners; stale removed-layer updates have no rendering side effects. No long-duration heap/GPU leak certification is claimed.

## Low-poly models, map transforms and inspection

The new rig has **18 named instanced parts**, four shared faceted geometries and one shared material: rounded faceted head/hair, tapered torso/pelvis, eyes, articulated upper/lower arms and hands, and thighs/shins/shoes. Clothing uses restrained blue, sage, ochre and muted warm tones. Appearance/height variation depends only on stable ID, never age, sex or another demographic attribute. No external models or textures were downloaded.

The nominal model is 1.75 m with a documented **1.6 display multiplier** and 0.94–1.00 ID variation: **2.63–2.80 displayed metres**. This remains an illustrative exaggeration, substantially below ordinary 12 m example extrusions; source building heights retain their existing mixed measured/derived/illustrative caveats. Citizen focus is zoom 19.6 and the existing map's maximum zoom increases from 18 to 20 for close inspection. Opening/Fit Singapore cameras and building algorithms are unchanged.

Opposite arms and legs swing together with jointed knees/elbows. Shoe lift and ground contact avoid sinking; a phase-driven body dip is at most 0.018 model metres. Pausing retains the supplied phase rather than snapping to rest. The renderer preserves the existing Mercator local east/north/up frame and `mainMatrix × localFrame` projection, using a reflected north axis for MapLibre. Roots stay at flat-map ground Z=0; the selection ring has a small ground offset. Shared depth provides practical building occlusion. There is no terrain-elevation model or per-actor shadow system.

Actual head/torso ray picking identifies the actor and keeps its profile selected as it moves. A browser click selected actor `syn-a4b1800000000000-126` correctly and created no plotting point. The searchable list remains available. The inspector adds visual neighbourhood, supplied geographic position and an explicit independence disclosure; imported/calculated profiles are not relabelled as real residents. Fixture conversations remain unavailable; no AI was called. Picking does not additionally test building occlusion, so a ray may select an actor behind an extrusion.

Controls remain in the existing citizen panel: Show citizens, Play/Pause, Reset, speed, elapsed illustrative time, area focus and optional selected schematic path (off by default). Mobile has touch-sized playback and map buttons. Map-side text says “Illustrative pedestrians” rather than asking users to add an interchange. Citizen mode owns selection; General plotting takes precedence when drawing and the citizen view is inactive. No Knowledge Graph implementation was changed.

## Browser evidence

Playwright MCP used the existing main-worktree port-3000 Next dev server after a read-only PID/command-line ownership check. All simulation requests used real local APIs. Public AI status was unconfigured; no paid Gemini/OpenRouter request occurred. Test interception only forwarded inspected calculation responses or deliberately blocked sources in isolated pages.

The opt-in `scripts/testing/phase7f-browser-check.mjs` uses Three's DevTools observation in the **test page**, reads the actual head-instance matrix and asserts meaningful horizontal displacement, exact Pause and Reset, stable ID and one canvas. One run observed:

| Sample | Rendered horizontal local metres |
|---|---|
| Reset, selected actor 1 | x=0, y=0 |
| After a five-second browser wait | x≈−1.0112, y≈5.2401 |
| Displacement | **5.337 m** |
| Pause across an additional wait | Exact sampled matrix equality |
| Reset | Exact original matrix restored |

Interaction/render latency means this is not an exact five-second speed benchmark. Separate direct runs measured approximately 4.89–4.93 m after five-second waits. The geographic inspector and heading also changed. Limb animation alone cannot satisfy this check.

Other verified flows:

- All five areas had 36 drawn actors after their building chunks were ready. Rendered building features were respectively 19, 9, 8, 3 and 10 in those close views; these are MapLibre feature queries, not nationwide completeness claims.
- Pan, zoom, bearing and pitch changed the camera while paused geographic positions stayed identical. Walking continued under real mouse panning.
- Knowledge Graph held the exact owner-clock elapsed value while hidden, resumed on return and retained one layer/canvas. Full style replacement preserved position, one active scene and the checked one-feature selected path.
- Four rapid hide/show and Play/Pause cycles retained the scene owner. Reduced motion kept the geographic position stable and showed the explicit static-pose status.
- Actual plot-first MRT configuration/anchors/calculation returned **62.77 → 13.50 modelled minutes**. After playing citizens, the 13.50 result and calculated demographic run ID were unchanged.
- Actual plotted AAC calculation reproduced **44,520 represented older residents; 6,230 comparable; 38,290 unlocated; 3,890 closer; 410.44 → 347.46 m**. Citizen drawing was disabled rather than inventing eldercare trips.
- Forced WebGL failure retained the SVG geographic fallback/profile controls, drew zero 3D people and disabled unavailable playback. Deliberately unavailable building sources showed an error while independent illustrative pedestrians remained usable.
- 1920×1080, 1440×900, 1024×900 and 390×844 had no horizontal document overflow. Mobile map playback, area controls, coordinate/profile disclosure and existing source/licence footer remained usable. A separate 390 px touch-enabled browser context exercised actual taps on entry, Play and Pause: 36 actors, advancing clock, one canvas and no overflow. This is not a physical-phone benchmark.

Short foreground custom-layer cadence samples with 36 actors / 19 draws:

| Viewport | Playing | During/after pan |
|---|---:|---:|
| 1920×1080 | 47.23/s | 41.51/s |
| 1440×900 | 48.97/s | 43.89/s |
| 1024×900 | 48.98/s | unavailable sample |
| 390×844 | 39.52/s | 45.43/s |

These are brief local render-cadence observations, not sustained display FPS, GPU timings or a guarantee for other laptops. An earlier short cached view showed 122.33/s; it is not treated as a performance promise. Drawn counts can include occluded actors. No Overture extraction was rerun for these checks.

The final fresh unmocked session recorded **zero console errors, zero page errors, one MapLibre canvas, one citizen custom layer and one active Three.js scene**. It showed 36 actors and 14 rendered building features; attribution/licence controls were visible and the document had no horizontal overflow.

Ignored, locally inspected screenshots include `test-results/phase7f-before-{paused,playing}.png`, `phase7f-after-{paused,playing}.png`, `phase7f-area-*-ready.png`, `phase7f-responsive-{1920,1440,1024,390}.png`, `phase7f-mobile-controls.png`, `phase7f-final-mobile-map.png`, `phase7f-final-paused.png` and `phase7f-final-walking.png`. They are local evidence, not staged or published building assets.

## Automated validation and review

**Final full regression: 368 tests passed, zero failed, zero skipped** (343 existing + 25 new). All six required CLI checks, application TypeScript, strict NodeNext citizen-module/test checking, Next production build and `git diff --check` passed. Preparation hooks ran sequentially; no Overture extraction or dependency installation occurred. The unified manifest parsed successfully with **1,119 chunks / 234,739 features / `local-review-only`**. Hash checks matched all 19 preserved files: 14 original inputs, unified manifest, three existing local geography outputs and the private environment file; no credential contents were printed. The first eldercare preparation hit the known sandbox EPERM on its ignored derived catalogue; its permission-correct retry passed.

Run from the project root, sequentially:

```powershell
npm.cmd run mrt:validate
npm.cmd run mrt:simulate
npm.cmd run agents:generate
npm.cmd run agents:impact
npm.cmd run eldercare:prepare
npm.cmd run eldercare:simulate
npm.cmd test
npx.cmd --no-install tsc --noEmit
npm.cmd run build
git diff --check
```

Independent review found detached option loss and selected-path restoration after style replacement. Both were reproduced in failing tests, fixed and independently re-read with no remaining concrete blocker. Tests include hand-calculated metre paths, finite extremes, seed/identity/distribution, local land/clearance, frame-rate independence, exact pose pause/reset, opposing limbs/grounding, actual ray intersections, instance sharing/disposal, bounded import caches, detached updates, source replacement, input preservation and unavailable controls. Existing tests were retained; old grid/path-difference, giant-size and frame-clamp expectations were updated to the new declared behaviour.

## Maintained files and reconstruction

New production modules: `lib/citizens/pedestrians.ts`, `lib/citizens/path-overlay.ts`.

Updated production modules: `lib/citizens/{fixtures,playback,scene,layer}.ts`, `components/{citizens-panel.tsx,citizens.css,workspace.tsx,singapore-map.tsx}`. Workspace changes are limited to citizen opt-in, area/path controls, selection and disclosure. Map changes are limited to citizen zoom/picking context, path/style lifecycle and unavailable-state reporting.

New tests: `citizen-clock`, `citizen-controls`, `citizen-layer`, `citizen-path-overlay`, `citizen-pedestrian-geography`, `citizen-pedestrians`, `citizen-pose` under `lib/contracts/tests/`; existing `citizen-scene` and `citizen-visualisation` tests updated. Also added the opt-in browser helper, this report and an architecture checklist; central roadmap updated.

Actually used: Playwright MCP; local PowerShell/Node/TypeScript and image inspection; installed Next.js client-component guidance; [official MapLibre custom-layer documentation](https://maplibre.org/maplibre-gl-js/docs/API/interfaces/CustomLayerInterface/) and [Three.js instancing documentation](https://threejs.org/docs/pages/InstancedMesh.html); systematic-debugging, frontend-design, animate, written planning, TDD, scoped parallel implementation, independent review and verification skills. No GitHub mutation, external character download, new service, database or AI request was needed.

Rebuild during the hackathon: establish permitted map data/engine contracts; retain one shared custom layer; author small land/footprint-checked illustrative paths; test metre/time sampling first; connect one pause-aware clock and prove root displacement; add a compact instanced rig with bounded scale/grounded feet; expose area/focus/selection controls and clear visual-only semantics; test style/hide/import cleanup and genuine MRT/AAC results; run the six CLIs, Node tests, TypeScript and build sequentially; inspect desktop/mobile motion and source attribution. Follow competition reuse rules.

## Remaining limitations

This is not a real pedestrian network, resident-home allocation, demand model or infrastructure response. Loops can be visibly schematic; there is no collision avoidance, crossing/obstacle logic, verified individual activity schedule, terrain or service-uptake model. Only five selected areas have authored visual actors; panning elsewhere does not synthesize a population. Imported data does not automatically gain loop/speed metadata. Long-duration memory, forced GPU-context-loss and 300-visible-actor benchmarks remain unperformed.

The combined HDB/URA/Overture catalogue remains **internal local review only** with unchanged loopback/source/licence restrictions. No public-clearance claim is made. True Census-derived geographic trajectories, observed population behaviour, Phase 7D stakeholders and Phase 7G graph execution remain separate unfinished work. MRT/AAC deterministic impacts and their original evidence/unknown-population limitations are preserved.
