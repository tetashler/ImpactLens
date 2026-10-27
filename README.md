# ImpactLens SG

Pre-hackathon research prototype for a Singapore social-impact sandbox. The current repository contains a local **Next.js + TypeScript + MapLibre** workspace backed by the validated MRT/LRT routing and hypothetical-line engine. Requires **Node.js 24+**.

Choose **MRT Line** to design a hypothetical rail line and compare calculated journeys. **Calculated impact** shows full-weight demographic comparisons and run-bound synthetic profiles; **Illustrative city** separately animates 180 invented citizens. Optional Gemini or OpenRouter integration provides bounded dashboard layouts, grounded explanations and synthetic conversations. Choose **Active Ageing Centre** to place a hypothetical AAC, calculate straight-line geographic accessibility and inspect weighted older-resident comparisons and unknown coverage.

## Run locally

Install Node.js 24 or later, then run these commands from the repository root. The supplied GTFS, subzone and HDB data files must be present.

If PowerShell blocks `npm.ps1`, use `npm.cmd` in place of `npm` in the commands below.

```powershell
node --version
npm ci
npm run dev
# Open http://127.0.0.1:3000
```

Geography and the MapLibre worker are prepared automatically. No API key, hosting account or internet connection is needed for the core workflow after installation; optional OpenStreetMap street tiles need internet. See [map implementation notes](docs/INTERACTIVE_MAP_IMPLEMENTATION.md) for attribution, licensing and data limits.

AI is optional. Set `AI_PROVIDER` to `gemini` or `openrouter`, plus that provider's key and independently selected model, in your private environment; restart the server and reload. See [.env.example](.env.example) for variable names and [Phase 5 notes](docs/PHASE5_DASHBOARD_AI_IMPLEMENTATION.md) for current model/capability checks, bounded answers and actual verification. Preserve existing `.env.local` entries. The calculated dashboard works when AI is unconfigured or unavailable.

For the AAC demonstration, choose **Load Bukit Merah demo**, then **Calculate AAC Impact**. You can also click to place, drag/reposition or enter coordinates. Editing invalidates previous results; calculations run only on request. Four corroborated historical AAC records and two public landmark origin proxies support this limited scenario, not nationwide coverage or actual walking routes. Unlocated residents remain unassessed. Capacity, attendance and health effects are not calculated. See [interactive AAC implementation](docs/PHASE6C_ELDERCARE_UI_IMPLEMENTATION.md).

```powershell
npm test
npm run build
npm run mrt:validate
npm run mrt:simulate
```

Validation reads the supplied GTFS and prints baseline checks. Simulation compares the baseline with the illustrative hypothetical line; it does not write raw data.

```powershell
npm run mrt:simulate -- --date 2026-10-27
npm run mrt:simulate -- --json
```

The default service date is **2026-10-27**. Select a date covered by the feed calendars. The CLI uses native TypeScript; the Next.js build also performs TypeScript checking for the application and its imported engine modules.

Optionally regenerate the baseline report and derived audit/graph files:

```powershell
npm run mrt:report
```

This writes `docs/MRT_GRAPH_VALIDATION.md` and files under `data/derived/mrt/`. Generated files already tracked in Git remain tracked despite `.gitignore`.

## Model and data limits

- Routing uses static median segment estimates, initial waiting and explicit line-transfer costs. It is not a departure-time timetable planner or a prediction of current operations.
- Proposed stations, segment running/dwell times, waiting times and interchange connections are scenario assumptions. The illustrative line is not an official proposal; the model does not assess construction feasibility or forecast demand, crowding or demographic benefits.
- Map links are schematic station connections, not rail alignments. HDB extrusions use actual footprints with illustrative 12 m height; the source has no measured heights. Default geography is local; online street detail is optional.
- Raw GTFS files under `data/transport/mrt-network/` are preserved. Two reviewed interchange aliases and **17 quarantined suspicious trips** are handled in the derived model with provenance retained.
- Feed provenance and timetable accuracy remain unverified. Local data presence does not establish suitability. Calculated impact uses synthetic Census 2020 expansion weights and explicit assumed trip assignments; passenger-volume data is not used. Calculated citizens still lack justified individual geographic trajectories.
- This is preparation for learning and rebuilding during the hackathon. Check competition rules before bringing code, data or other materials into the event.

## Code and documentation

- [`prototype/mrt/`](prototype/mrt/): GTFS parsing, graph construction, routing, validation and scenario engine.
- [`components/`](components/), [`lib/`](lib/), [`app/`](app/): interactive map/editor, compact adapters and local Node API routes.
- [Interactive map](docs/INTERACTIVE_MAP_IMPLEMENTATION.md): architecture, actual browser checks, limitations and rebuild steps.
- [Animated citizens](docs/ANIMATED_CITIZENS_IMPLEMENTATION.md): shared-context Three.js rendering, illustrative versus calculated data, profiles, measured performance and Phase 4C handoff.
- [Dashboard and AI](docs/PHASE5_DASHBOARD_AI_IMPLEMENTATION.md): provider abstraction, finite presentation schema, authoritative grounding, conversations, tests and rebuild steps.
- [`prototype/mrt/examples/illustrative-line.ts`](prototype/mrt/examples/illustrative-line.ts): editable hypothetical-line example.
- [Baseline validation](docs/MRT_GRAPH_VALIDATION.md): graph evidence, quarantine policy and routing assumptions.
- [Hypothetical-line simulation](docs/MRT_HYPOTHETICAL_LINE_SIMULATION.md): proposal format, comparison outputs and limitations.
- [Data review](docs/DATA_VALIDATION_REPORT.md): initial GTFS inspection; historical findings may predate later downloads and validation.
- [Development roadmap](docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md): architecture and rebuild sequence, including both MRT and eldercare interventions.
