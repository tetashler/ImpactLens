# Phase 5 — Living map integration

Phase 5 gate: **PASS**, 30 October 2026. Geographic activity is intentionally limited to synthetic subzone contexts, not inferred personal transport.

## Implementation

`lib/server/population/geography.ts` derives two deterministic interior samples per existing URA subzone polygon, preserving a SHA-256 source identity. Strict normalised planning-area **and** subzone names join the Census context; no fuzzy alias or fabricated facility/home/workplace. Holes and MultiPolygons are respected; unplaceable, foreign and unmatched profiles remain explicitly unlocated. `/api/population/locations` provides this small cached index, not a new dataset or paid geocoder.

New society genesis version 2 includes this source snapshot; version 1 worlds replay unchanged and remain unlocated rather than being silently assigned new historical coordinates. The map projection consumes only each agent's current activity and its recorded activity event. Fifteen-minute simulation ticks drive synthetic residential/community-context changes. These samples are **display assumptions inside the supported subzone**, never actual addresses, GPS tracks, transport paths, commute times or facility-access outputs. Existing MRT/AAC calculations are unchanged; personal commute trajectories remain unsupported.

`lib/society/map-layer.ts` uses one batched GeoJSON source/circle layer, at most 64 markers, native MapLibre viewport clipping and no per-resident Three.js objects. It updates once per world state, follows the same clock, handles style restoration and removes only its own resources. Plot Tools temporarily hides these markers to avoid conflicting placement/select gestures. No building chunk, Render Distance, attribution or memory control is changed.

Canonical IDs connect the selected map marker, Social profile and Knowledge Graph node. Source metadata, aggregate counts and missing-location disclosure appear in the map panel. Selection focuses its subzone context; inspector wording does not show raw coordinates or imply household precision.

## Verification and reproduction

888 Node tests, application TypeScript and production build pass. Five geographic tests cover every derived anchor inside its original polygon, holes/MultiPolygons, recorded activity/identity, legacy unlocated worlds and batched MapLibre lifecycle. In mocked Map → Explore browser acceptance, all 24 agents were located; advancing ten steps changed ten marker positions, each with a recorded activity event, while all IDs remained identical. Social-profile selection focused the corresponding map marker. Plot Tools hid/restored the layer; plan view reached pitch zero and mouse panning remained functional. Desktop 1440×900 and mobile 390×844 screenshots were visually inspected, with no horizontal overflow or page errors. Existing online street tiles delayed initial map readiness; this is not a local activity-layer benchmark.

Evidence: ignored `tmp/phases36/phase5-map-desktop.png`, `phase5-map-mobile.png`, `phase5-focused.log`, `phase5-all-tests.log`, `phase5-build.log`. Start the documented mocked server, Explore a fixture question, choose Social Simulation → agent → Find agent on Map, then step the shared clock. No paid requests occurred.

Changed files: `lib/society/geography.ts`, `lib/server/population/geography.ts`, `app/api/population/locations/route.ts`, `lib/society/map-layer.ts`, `lib/society/contract.ts`, `lib/society/engine.ts`, `components/use-society.ts`, `components/singapore-map.tsx`, `components/workspace.tsx`, `lib/contracts/tests/society-geography.test.ts`, this report and the roadmap. Local context jumps have no interpolated route or travel-time claim. At most 64 active markers are batched; no national population is animated.
