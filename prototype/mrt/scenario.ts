import type { Graph, Edge } from './graph.ts';
import { canonicalStation, validateCosts } from './routing.ts';

export interface ExistingProposalStation { kind: 'existing'; stationId: string; transferWalkSeconds: number }
export interface NewProposalStation { kind: 'new'; id: string; name: string; lat: number; lon: number; locationNote: string }
export type ProposalStation = ExistingProposalStation | NewProposalStation;
export interface ProposedSegment { from: string; to: string; runSeconds: number; dwellSeconds: number }
export interface MrtIntervention {
  schemaVersion: 1; id: string; name: string; direction: 'bidirectional';
  stations: ProposalStation[]; segments: ProposedSegment[]; waitingTimeSeconds?: number;
  assumptions: {
    timingBasis: 'explicit-seconds'; opening: 'assumed-open-on-service-date';
    construction: 'not-modelled'; rationale: string;
  };
}
export interface Scenario {
  graph: Graph; intervention: MrtIntervention; newStationIds: string[];
  addedStateIds: string[]; addedEdgeIds: string[];
}
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be nonempty text`);
  return value;
}
function identifier(value: unknown, label: string): string {
  const id = text(value, label);
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id)) throw new Error(`${label} must be a simple identifier (letters, digits, _ or -)`);
  return id;
}
function nonnegative(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${label} must be finite nonnegative seconds`);
  return value;
}
function validateProposal(baseline: Graph, input: unknown): MrtIntervention {
  if (baseline.mode !== 'baseline') throw new Error('Scenario requires a baseline graph, not raw diagnostics');
  validateCosts(baseline);
  nonnegative(baseline.costs.waitSeconds, 'Baseline transfer wait');
  const r = object(input, 'Intervention');
  if (r.schemaVersion !== 1 || r.direction !== 'bidirectional') throw new Error('Only schemaVersion 1 and explicit bidirectional service are supported');
  const id = identifier(r.id, 'Line ID'), name = text(r.name, 'Line name');
  const reserved = new Set([...baseline.stations.keys(), ...baseline.aliases.keys(), ...baseline.states.keys(),
    ...[...baseline.stations.values()].flatMap(s => [...s.stopIds, ...s.parentIds])]);
  if (reserved.has(id) || [...baseline.states.values()].some(s => s.line === id)) throw new Error(`Line identifier collision: ${id}`);
  const waitingTimeSeconds = r.waitingTimeSeconds === undefined ? undefined : nonnegative(r.waitingTimeSeconds, 'Proposed wait');
  const assumptions = object(r.assumptions, 'Assumptions');
  if (assumptions.timingBasis !== 'explicit-seconds' || assumptions.opening !== 'assumed-open-on-service-date' || assumptions.construction !== 'not-modelled') throw new Error('Explicit timing, opening and construction assumptions are required');
  const rationale = text(assumptions.rationale, 'Timing rationale');
  if (!Array.isArray(r.stations) || r.stations.length < 2) throw new Error('Line needs at least two ordered stations');
  const seen = new Set<string>(), orderedIds: string[] = [];
  let connections = 0;
  const stations: ProposalStation[] = r.stations.map((value, i) => {
    const stop = object(value, `Station ${i}`);
    if (stop.kind === 'existing') {
      const stationId = identifier(stop.stationId, 'Existing station ID'), canonical = canonicalStation(baseline, stationId);
      if (seen.has(canonical)) throw new Error(`Duplicate physical station: ${stationId}`);
      if (![...baseline.states.values()].some(s => s.stationId === canonical)) throw new Error(`Existing station has no service connection: ${stationId}`);
      seen.add(canonical); orderedIds.push(stationId); connections++;
      return { kind: 'existing', stationId, transferWalkSeconds: nonnegative(stop.transferWalkSeconds, 'Interchange walk') };
    }
    if (stop.kind !== 'new') throw new Error('Station kind must be existing or new');
    const stationId = identifier(stop.id, 'New station ID');
    if (stationId === id || reserved.has(stationId) || seen.has(stationId) || [...baseline.states.values()].some(s => s.line === stationId)) throw new Error(`New station identifier collision: ${stationId}`);
    if (typeof stop.lat !== 'number' || !Number.isFinite(stop.lat) || Math.abs(stop.lat) > 90 || typeof stop.lon !== 'number' || !Number.isFinite(stop.lon) || Math.abs(stop.lon) > 180) throw new Error('New station needs valid WGS84 coordinates');
    seen.add(stationId); orderedIds.push(stationId);
    return { kind: 'new', id: stationId, name: text(stop.name, 'New station name'), lat: stop.lat, lon: stop.lon, locationNote: text(stop.locationNote, 'Illustrative location note') };
  });
  if (!connections) throw new Error('Disconnected proposal: at least one served existing station connection is required');
  if (!Array.isArray(r.segments) || r.segments.length !== stations.length - 1) throw new Error('Exactly one segment per consecutive station pair is required');
  const segments: ProposedSegment[] = r.segments.map((value, i) => {
    const segment = object(value, `Segment ${i}`);
    if (segment.from !== orderedIds[i] || segment.to !== orderedIds[i + 1]) throw new Error(`Disconnected or unordered segment ${i}`);
    const runSeconds = nonnegative(segment.runSeconds, 'Segment running time'), dwellSeconds = nonnegative(segment.dwellSeconds, 'Segment dwell');
    if (runSeconds === 0 || !Number.isFinite(runSeconds + dwellSeconds)) throw new Error('Segment requires positive running time and finite total time');
    return { from: orderedIds[i], to: orderedIds[i + 1], runSeconds, dwellSeconds };
  });
  return { schemaVersion: 1, id, name, direction: 'bidirectional', stations, segments,
    ...(waitingTimeSeconds === undefined ? {} : { waitingTimeSeconds }),
    assumptions: { timingBasis: 'explicit-seconds', opening: 'assumed-open-on-service-date', construction: 'not-modelled', rationale } };
}
export function addHypotheticalLine(baseline: Graph, proposal: unknown): Scenario {
  const intervention = validateProposal(baseline, proposal);
  const graph = structuredClone(baseline), newStationIds: string[] = [], addedStateIds: string[] = [], addedEdgeIds: string[] = [];
  const initialWait = intervention.waitingTimeSeconds ?? graph.costs.initialWaitSeconds;
  const transferWait = intervention.waitingTimeSeconds ?? graph.costs.waitSeconds;
  const physicalIds: string[] = [];
  for (const station of graph.stations.values()) station.kind ??= 'existing';
  const add = (edge: Edge) => {
    if (!Number.isFinite(edge.seconds) || edge.seconds < 0) throw new Error('Invalid scenario edge cost');
    graph.edges.push(edge); addedEdgeIds.push(edge.id);
    const outgoing = graph.adjacency.get(edge.from) ?? [];
    outgoing.push(edge); graph.adjacency.set(edge.from, outgoing);
  };
  for (const stop of intervention.stations) {
    const stationId = stop.kind === 'existing' ? canonicalStation(graph, stop.stationId) : stop.id;
    physicalIds.push(stationId);
    if (stop.kind === 'new') {
      newStationIds.push(stationId); graph.aliases.set(stationId, stationId);
      graph.stations.set(stationId, {
        id: stationId, name: stop.name, lat: stop.lat, lon: stop.lon, kind: 'hypothetical', hypotheticalLineId: intervention.id,
        locationNote: stop.locationNote, parentIds: [], stopIds: [], sourceRows: [], lines: [],
        evidence: [`Hypothetical intervention ${intervention.id}: ${stop.locationNote}`],
      });
    }
    const stateId = `${stationId}|${intervention.id}`;
    graph.states.set(stateId, { id: stateId, stationId, line: intervention.id, initialWaitSeconds: initialWait, transferWaitSeconds: transferWait });
    addedStateIds.push(stateId); graph.stations.get(stationId)!.lines.push(intervention.id);
    graph.stations.get(stationId)!.lines.sort();
    if (stop.kind === 'existing') {
      for (const target of baseline.states.values()) if (target.stationId === stationId) {
        const evidence = [`Hypothetical intervention ${intervention.id}: explicit connection to ${stop.stationId}; walk=${stop.transferWalkSeconds}s; target-service wait applies`];
        add({ id: `hyp:${intervention.id}:transfer:${target.id}>${stateId}`, from: target.id, to: stateId, kind: 'transfer',
          seconds: stop.transferWalkSeconds + transferWait, runSeconds: 0, dwellSeconds: 0, sourceRefs: [], evidence });
        add({ id: `hyp:${intervention.id}:transfer:${stateId}>${target.id}`, from: stateId, to: target.id, kind: 'transfer',
          seconds: stop.transferWalkSeconds + (target.transferWaitSeconds ?? graph.costs.waitSeconds), runSeconds: 0, dwellSeconds: 0, sourceRefs: [], evidence: [...evidence] });
      }
    }
  }
  intervention.segments.forEach((segment, i) => {
    const a = `${physicalIds[i]}|${intervention.id}`, b = `${physicalIds[i + 1]}|${intervention.id}`;
    for (const [from, to] of [[a, b], [b, a]]) add({
      id: `hyp:${intervention.id}:ride:${from}>${to}`, from, to, kind: 'travel',
      seconds: segment.runSeconds + segment.dwellSeconds, runSeconds: segment.runSeconds, dwellSeconds: segment.dwellSeconds, sourceRefs: [],
      evidence: [`Hypothetical intervention ${intervention.id}, segment ${i}: explicit run/dwell seconds, symmetric directions; ${intervention.assumptions.rationale}`],
    });
  });
  return { graph, intervention, newStationIds, addedStateIds, addedEdgeIds };
}
