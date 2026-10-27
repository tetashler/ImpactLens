# Hypothetical MRT line simulation

Phase 2 pre-hackathon research prototype, validated 27 October 2026. This engine computes **changes under declared assumptions**, not authoritative real-world journey-time or societal predictions. Rebuild the competition implementation during the hackathon according to its rules.

## Implemented architecture

The existing GTFS parser, reviewed interchange policy, quarantine rules and Dijkstra router remain the baseline. No raw GTFS is changed or silently repaired.

| Module | Responsibility |
| --- | --- |
| `prototype/mrt/scenario.ts` | Versioned `MrtIntervention` interface, runtime validation and `addHypotheticalLine` |
| `prototype/mrt/simulation.ts` | `simulateIntervention`, structured outcomes and before/after metrics |
| `prototype/mrt/routing.ts` | Existing Dijkstra; optional per-state boarding waits with unchanged legacy defaults |
| `prototype/mrt/examples/illustrative-line.ts` | Explicitly illustrative line and OD examples |
| `prototype/mrt/simulate-cli.ts` | Read-only terminal demonstration and compact JSON output |

`addHypotheticalLine` deep-clones the baseline using `structuredClone`, preserving Maps, nested edge references, source rows and audit records without sharing mutable data. It returns `{ graph, intervention, newStationIds, addedStateIds, addedEdgeIds }`. Existing edges and costs are retained. The `Graph.mode` value continues to describe the baseline filtering policy; the surrounding `Scenario.intervention` and hypothetical provenance distinguish the scenario from the observed input.

The default baseline has **184 physical stations, 217 station/line states and 498 edges** (426 travel, 72 transfer). The example adds two physical stations, four line states, six directed travel edges and eight directed transfer edges: **186 stations, 221 states, 512 edges**. All 17 suspicious trips remain quarantined. The derived baseline and scenario are independently queryable.

## Proposed-line schema

The exported TypeScript interface is also checked at runtime, including when input comes from JSON rather than typed code.

```typescript
interface MrtIntervention {
  schemaVersion: 1;
  id: string;                         // unique service ID
  name: string;
  direction: 'bidirectional';        // explicitly symmetric service in v1
  stations: (
    | { kind: 'existing'; stationId: string; transferWalkSeconds: number }
    | { kind: 'new'; id: string; name: string; lat: number; lon: number;
        locationNote: string }
  )[];
  segments: {
    from: string; to: string;         // exactly the corresponding consecutive entries
    runSeconds: number;
    dwellSeconds: number;            // origin dwell, applied in both directions
  }[];
  waitingTimeSeconds?: number;       // proposed service only
  assumptions: {
    timingBasis: 'explicit-seconds';
    opening: 'assumed-open-on-service-date';
    construction: 'not-modelled';
    rationale: string;
  };
}
```

Existing station coordinates come from the baseline; they are never replaced by proposal coordinates. Alias IDs such as BP1 resolve to their canonical physical station. New stations have `kind: 'hypothetical'`, a line ID, illustrative location note and no fake GTFS source rows. Their coordinates are WGS84 latitude/longitude, **not GeoJSON's longitude/latitude array order**.

Validation rejects unsupported versions/directions, empty names/rationale, malformed or colliding IDs (including GTFS aliases/platform IDs), duplicate canonical stations, unknown or unserved attachments, nonnumeric/nonfinite/out-of-range coordinates, negative/nonfinite waits or walks, zero/negative/nonfinite running times, negative dwell, overflowing edge totals, and missing/misordered/extra segments. There must be at least two ordered stations and exactly one segment per consecutive pair. At least one served existing station is required; a connected spur with one anchor is allowed, while a detached all-new line is rejected. Version 1 is a simple ordered line, not a branching or circular proposal.

Coordinates are checked against global WGS84 bounds only. The prototype does not validate Singapore boundaries, land use, construction feasibility, rail alignment, engineering speed limits or site availability. Explicit segment times are scenario assumptions; the engine does not infer them from straight-line distance or invent an operating speed. Service frequency/headways and construction dates are not simulated; a fixed waiting assumption and declared opening-on-service-date replace those mechanisms in this phase.

## Connections and routing calculations

Each ordered station gets one proposed-line routing state, while an existing physical station keeps its existing catalogue node. Every segment adds exactly two directed travel edges, with cost `runSeconds + dwellSeconds`. There is no automatic proximity, station-name matching or shortcut between nonconsecutive proposed stops.

At each declared existing station, explicit transfer edges join the new state to every already served line state at **that same physical station**. Walking cost is the supplied `transferWalkSeconds`; boarding wait belongs to the **destination service**:

- Into the proposed line: walk + proposed waiting time, or baseline reboarding wait if omitted.
- Out of the proposed line: walk + the target state's reboarding wait, or baseline reboarding wait.
- Initial boarding: proposed waiting time when choosing its origin state, or baseline initial wait if omitted.
- Existing-line edges, transfers and initial waits retain their existing costs. No scenario-wide wait override is applied.

The router seeds each origin service state with its own initial boarding cost and reconstructs the selected seed's wait in the returned breakdown. Changing lines requires a transfer edge. Origin/destination being the same canonical physical station costs zero, including aliases.

The baseline uses median GTFS arrival-to-arrival hops; proposed hops explicitly use the same origin-dwell-plus-run convention. Initial waiting is therefore charged in addition to origin dwell, as already documented for the baseline. This is a static approximation. Transfer walking, expected waits and symmetric proposed travel times are uncalibrated inputs, not measured observations. Branch services, direction-specific trains, operating hours, missed connections, service capacity, access/egress walking and crowding are not modelled.

## Library call and result semantics

```typescript
import { loadFeed } from './prototype/mrt/gtfs.ts';
import { buildGraph } from './prototype/mrt/graph.ts';
import { simulateIntervention } from './prototype/mrt/simulation.ts';
import { illustrativeLine } from './prototype/mrt/examples/illustrative-line.ts';

const baseline = buildGraph(loadFeed('data/transport/mrt-network'), {
  date: '2026-10-27',
});
const result = simulateIntervention(baseline, illustrativeLine, [
  { origin: 'NS4', destination: 'NE16' },
]);
console.log(result.comparisons[0]);
```

The simulation builds one scenario and routes each pair before/after using the same service date and retained baseline cost policy. It explicitly returns `departureTime: 'not-modelled'`; it neither accepts nor pretends to honour a departure clock time. Choose weekday/weekend by building the baseline on the intended calendar date.

Each comparison contains routes/outcomes, baseline/scenario minutes, proposed-line use, baseline/scenario transfer counts and transfer-count change. Formulas use unrounded seconds:

- `minutesSaved = (baselineSeconds - scenarioSeconds) / 60`: positive means faster; negative would mean slower.
- `percentageChange = 100 * (scenarioSeconds - baselineSeconds) / baselineSeconds`: negative means a duration reduction. It is `null` when baseline duration is zero or either duration is unavailable.
- `transferChange = scenarioTransfers - baselineTransfers`: negative means fewer transfers; `null` if either count is unavailable.
- `usedProposedLine` is true only when the chosen route traverses proposed **travel** edges; touching a new transfer state alone is insufficient. It is `null` if there is no valid scenario route.

Outcomes distinguish `reachable`, `unreachable`, `station-unavailable` (a proposed endpoint absent from the baseline), and `invalid` (unknown/malformed endpoint). Comparison status is `compared`, `newly-reachable`, `unreachable` or `invalid`. Unavailable durations and their differences are `null`, never zero or an invented infinite saving. Invalid proposal configurations throw before routing; malformed OD pairs produce per-pair invalid outcomes. Existing journeys cannot worsen under this purely additive model because all old paths and costs remain available; no ridership redistribution or service reduction is assumed.

No aggregate demand benefit, demographic statistic, travel accessibility threshold or downstream impact is fabricated from the example OD list. That list is illustrative, not a representative population sample.

## Reproducible example

**Illustrative North Link — not an official proposal.** Existing anchors are NS4 (Choa Chu Kang) and NE16 (Sengkang). New points are `HYP_WEST` at (1.3800, 103.7900) and `HYP_CENTRAL` at (1.3850, 103.8450). These are illustrative locations only; the line has no surveyed track geometry or engineering assessment.

The three segments assume 300/360/300 seconds running plus 30 seconds origin dwell each, in both directions. Waiting is fixed at 150 seconds, interchange walking at NS4 is 180 seconds and at NE16 is 240 seconds. Existing waits remain 120 seconds. These input choices deliberately demonstrate sensitivity; they are not fitted to actual railway data.

Calculated output on 2026-10-27, rounded for display:

| Journey | Baseline minutes | Scenario minutes | Saved minutes | Duration change | Transfers | Uses proposed line |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| NS4 → NE16 | 62.77 | 20.00 | 42.77 | -68.14% | 2 → 0 | Yes |
| NE16 → NS4 | 63.52 | 20.00 | 43.52 | -68.51% | 2 → 0 | Yes |
| BP2 → SE1 | 68.77 | 35.33 | 33.43 | -48.62% | 3 → 2 | Yes |
| EW1 → EW3 | 11.30 | 11.30 | 0.00 | 0.00% | 0 → 0 | No |
| HYP_WEST → NE16 | Unavailable | 14.50 | Undefined | Undefined | Unavailable → 0 | Yes |
| NS4 → NS4 | 0.00 | 0.00 | 0.00 | Undefined | 0 → 0 | No |

For NS4 → NE16, scenario time is independently explainable: `150 + (300+30) + (360+30) + (300+30) = 1,200 seconds = 20 minutes`. Actual savings cannot be validated until both baseline timings and proposed operating assumptions are calibrated.

## Commands and verification

Node 24+, no dependency install required. On Windows use `npm.cmd` if PowerShell blocks `npm.ps1`.

```powershell
npm.cmd run mrt:validate
npm.cmd run mrt:simulate
npm.cmd run mrt:simulate -- --date 2026-10-31
npm.cmd run mrt:simulate -- --json
npm.cmd test
```

Both validation and simulation commands are read-only by default. Simulation writes no files. Existing `mrt:report` is an explicit regeneration command for baseline artifacts; Phase 2 does not require regeneration of those historical files.

**Automated verification: 37 tests passed**, including all original 21 baseline tests. New tests cover:

- Independently hand-calculated boarding, travel/dwell and asymmetric transfer costs, savings, percentages and transfer counts.
- Deep baseline/proposal isolation, including nested source references, station arrays, audit records and adjacency edge identity.
- Explicit connectivity, invalid/disconnected input, identifier collisions, wrong coordinates and negative/nonfinite costs.
- Unchanged journeys; newly reachable, unavailable, invalid and zero-duration outcomes; exact repeat results.
- Real-data Tuesday/Saturday/Sunday scenarios: unchanged quarantine, original edge preservation, connected scenario, and no worsened distance to any original line-state target from any existing station. This covers all 33,672 ordered distinct existing station pairs per date.
- CLI success/errors, identical repeated JSON output and unchanged raw input hashes. Baseline's independent Floyd-Warshall oracle tests still pass.

Runtime tests verify calculations and data handling, not real-world validity. Native Node TypeScript execution strips types; a compiler type check is not configured. Baseline provenance, public-holiday calendars, operating-date coverage and journey-time calibration remain unresolved as described in [baseline validation](MRT_GRAPH_VALIDATION.md).

## Interactive-map handoff and remaining work

**The engine is ready for a Phase 3 map adapter.** The map must submit version-1 interventions and explicit cost assumptions, use IDs/coordinates from the station catalogue for existing anchors, and label hypothetical infrastructure and all estimates. Convert MapLibre/GeoJSON `[longitude, latitude]` correctly to schema `{ lat, lon }`. A drawn straight line is display geometry, not validated rail alignment or travel time.

Keep GTFS file loading on the local Node/server side. Expose a small request/result adapter that validates input, chooses a service date, and returns compact station sequences/metrics (as the CLI JSON does); do not send full provenance arrays or Maps unconverted to the browser. Add editing/undo/reset and invalid-proposal feedback in that phase. Rendering, Next.js scaffolding, `npm run dev`, geometry snapping, route geometry and map tiles are not implemented here. No Gemini or synthetic citizens participate in calculations.

Later phases must independently validate passenger-volume/demographic inputs before weighting results. The eldercare / active-ageing centre simulation remains the committed second intervention in the [existing development roadmap](IMPACTLENS_SG_DEVELOPMENT_PHASES_REVISED.md); this MRT phase does not implement or remove it.
