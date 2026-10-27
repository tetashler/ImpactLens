# ImpactLens SG

Pre-hackathon research prototype for a Singapore social-impact sandbox. The current repository contains an MRT/LRT routing engine and hypothetical-line simulation, written in native TypeScript for **Node.js 24+**, with zero installed dependencies.

The planned product compares infrastructure interventions across demographic groups. MRT is the flagship demonstration; a new eldercare / active-ageing centre is the second committed scenario. The map, synthetic citizens, dashboard and Gemini integration are future work. There is no Next.js frontend or `npm run dev` command yet; the local browser application is planned for Phase 3.

## Run locally

Install Node.js 24 or later, then run these commands from the repository root. No `npm install` is required.

If PowerShell blocks `npm.ps1`, use `npm.cmd` in place of `npm` in the commands below.

```powershell
node --version
npm test
npm run mrt:validate
npm run mrt:simulate
```

Validation reads the supplied GTFS and prints baseline checks. Simulation compares the baseline with the illustrative hypothetical line; it does not write raw data.

```powershell
npm run mrt:simulate -- --date 2026-10-27
npm run mrt:simulate -- --json
```

The default service date is **2026-10-27**. Select a date covered by the feed calendars. Native Node execution strips TypeScript types; it does not perform compiler type checking.

Optionally regenerate the baseline report and derived audit/graph files:

```powershell
npm run mrt:report
```

This writes `docs/MRT_GRAPH_VALIDATION.md` and files under `data/derived/mrt/`. Generated files already tracked in Git remain tracked despite `.gitignore`.

## Model and data limits

- Routing uses static median segment estimates, initial waiting and explicit line-transfer costs. It is not a departure-time timetable planner or a prediction of current operations.
- Proposed stations, segment running/dwell times, waiting times and interchange connections are scenario assumptions. The illustrative line is not an official proposal; the model does not assess construction feasibility or forecast demand, crowding or demographic benefits.
- Raw GTFS files under `data/transport/mrt-network/` are preserved. Two reviewed interchange aliases and **17 quarantined suspicious trips** are handled in the derived model with provenance retained.
- Feed provenance and timetable accuracy remain unverified. Other downloaded datasets also need source, licence and suitability checks before use. Local data presence does not establish validation; the current simulation does not use passenger-volume or demographic weighting.
- This is preparation for learning and rebuilding during the hackathon. Check competition rules before bringing code, data or other materials into the event.

## Code and documentation

- [`prototype/mrt/`](prototype/mrt/): GTFS parsing, graph construction, routing, validation and scenario engine.
- [`prototype/mrt/examples/illustrative-line.ts`](prototype/mrt/examples/illustrative-line.ts): editable hypothetical-line example.
- [Baseline validation](docs/MRT_GRAPH_VALIDATION.md): graph evidence, quarantine policy and routing assumptions.
- [Hypothetical-line simulation](docs/MRT_HYPOTHETICAL_LINE_SIMULATION.md): proposal format, comparison outputs and limitations.
- [Data review](docs/DATA_VALIDATION_REPORT.md): initial GTFS inspection; historical findings may predate later downloads and validation.
- [Development roadmap](docs/IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md): architecture and rebuild sequence, including both MRT and eldercare interventions.
