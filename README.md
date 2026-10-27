# ImpactLens SG

Pre-hackathon research prototype for a Singapore social-impact sandbox. The current repository contains a local **Next.js + TypeScript + MapLibre** workspace backed by the validated MRT/LRT routing and hypothetical-line engine. Requires **Node.js 24+**.

Design a hypothetical line on Singapore's map, set explicit travel assumptions and compare calculated journeys. MRT is the flagship demonstration; eldercare / active-ageing centres remain the second committed scenario. Synthetic citizens, demographic comparisons and Gemini remain future phases.

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
- Feed provenance and timetable accuracy remain unverified. Other downloaded datasets also need source, licence and suitability checks before use. Local data presence does not establish validation; the current simulation does not use passenger-volume or demographic weighting.
- This is preparation for learning and rebuilding during the hackathon. Check competition rules before bringing code, data or other materials into the event.

## Code and documentation

- [`prototype/mrt/`](prototype/mrt/): GTFS parsing, graph construction, routing, validation and scenario engine.
- [`components/`](components/), [`lib/`](lib/), [`app/`](app/): interactive map/editor, compact adapters and local Node API routes.
- [Interactive map](docs/INTERACTIVE_MAP_IMPLEMENTATION.md): architecture, actual browser checks, limitations and rebuild steps.
- [`prototype/mrt/examples/illustrative-line.ts`](prototype/mrt/examples/illustrative-line.ts): editable hypothetical-line example.
- [Baseline validation](docs/MRT_GRAPH_VALIDATION.md): graph evidence, quarantine policy and routing assumptions.
- [Hypothetical-line simulation](docs/MRT_HYPOTHETICAL_LINE_SIMULATION.md): proposal format, comparison outputs and limitations.
- [Data review](docs/DATA_VALIDATION_REPORT.md): initial GTFS inspection; historical findings may predate later downloads and validation.
- [Development roadmap](docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md): architecture and rebuild sequence, including both MRT and eldercare interventions.
