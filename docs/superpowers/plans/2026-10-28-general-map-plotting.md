# Phase 7A.1 implementation plan

Start: master `4400f47`, retaining all uncommitted Phase 7A files. Existing port 3000 belongs to the main Next dev worktree; public AI status is unconfigured. No Git mutation, other worktree, environment, raw input, planner/citizen contract or engine change is authorised.

The revised ordinary workflow is one General workspace: question and generic drawing → explicit meaning/connection confirmation → illustrative assumptions → existing calculation/results. Knowledge Graph is an honest pending destination, not invented data. Keep the landing 75/25 map/composer, existing slate/navy/teal palette and local Segoe typography. A compact floating drawing toolbar owns point/line/edit/anchor operations; a readable contextual inspector owns labels, coordinate alternatives, order and model confirmation. Use 44 px touch targets and move buttons alongside drag operations. Advanced rail controls remain optional.

State: independent version-1 user geometry with stable IDs and monotonic edit revision; existing ScenarioPlan v1 unchanged. Drawn vertices are not stations. Points become stations/centre only after explicit confirmation. Confirmed existing MRT anchors use catalogue coordinates and user-reviewed station IDs; proximity suggestions never connect by themselves. Segment defaults are explicit 300 s run / 30 s dwell, 150 s boarding wait and 180 s transfer walk. Curvature/distance does not determine train times. Geometry edits invalidate derived interventions and pending/current results while keeping question/plan/plot. AAC has one proposed site: confirmed universal point maps into its existing hook, with only one hypothetical marker visible.

Map ownership: one persistent MapLibre map and Three.js layer. Share camera bounds/helpers between Fit Singapore and Explore; queue latest camera command until map load and respect reduced motion. Geometry edits and graph-tab navigation never refit the map. Default street preference on; manual preference retained in the mounted map. Pointer priority: controls/popups/drag markers → universal point/vertex tools → explicit catalogue anchor selection → selection/exploration → advanced legacy handlers. Escape cancels a stroke. Knowledge Graph hides the map without unmounting it and restores/resize on return.

- [x] Geometry contract, history store/hook and failing-first tests.
- [x] Browser-safe MRT/AAC adapters, explicit anchor/assumption checks, proximity suggestions and engine validation tests.
- [x] Lightweight GeoJSON/marker controller, stable IDs, edit-only drag and cleanup.
- [x] Parent General/Knowledge Graph shell, concurrent Explore/planner transition, street default and generic plot inspector.
- [x] Actual plot-to-MRT journey/demographic execution, AAC confirmation/calculation, unsupported geographic retention and advanced tools.
- [x] Independent review; actual desktop/tablet/mobile Playwright, races/failures/fallback and visual inspection.
- [x] Sequential six CLIs, 313 passing tests, app/explicit types, build, whitespace/raw integrity; report and central roadmap. No staging/commits/pushes.
