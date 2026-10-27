// Server entry point: never import this module into a client component.
import { join } from 'node:path';
import { loadFeed, activeServices } from '../../prototype/mrt/gtfs.ts';
import type { Feed } from '../../prototype/mrt/gtfs.ts';
import { buildGraph } from '../../prototype/mrt/graph.ts';
import type { Graph } from '../../prototype/mrt/graph.ts';
import { simulateIntervention } from '../../prototype/mrt/simulation.ts';
import type { SimulationResult, JourneyOutcome } from '../../prototype/mrt/simulation.ts';
import type { CompactRoute, NetworkCatalog, SimulationRequest, SimulationResponse } from '../map-contract.ts';

export class MapInputError extends Error {}
const MAX_CACHED_DATES = 8;
const baselines = new Map<string, Graph>();
let feed: Feed | undefined;
function getFeed(): Feed {
  return feed ??= loadFeed(join(process.cwd(), 'data/transport/mrt-network'));
}
export function getBaseline(date: unknown): Graph {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new MapInputError('Service date must be YYYY-MM-DD');
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new MapInputError('Invalid service date');
  const source = getFeed();
  // The feed itself bounds allowed dates; never accept dates beyond its declared services.
  if (!activeServices(source.tables.calendar, source.tables.calendar_dates, date).size) throw new MapInputError('No feed service is available on this date');
  const cached = baselines.get(date);
  if (cached) { baselines.delete(date); baselines.set(date, cached); return cached; }
  const graph = buildGraph(source, { date, mode: 'baseline' });
  if (baselines.size >= MAX_CACHED_DATES) baselines.delete(baselines.keys().next().value!);
  baselines.set(date, graph);
  return graph;
}

export function getNetworkCatalog(date: string): NetworkCatalog {
  const graph = getBaseline(date);
  const connections = new Map<string, NetworkCatalog['connections'][number]>();
  for (const edge of graph.edges) {
    if (edge.kind !== 'travel') continue;
    const a = graph.states.get(edge.from)!, b = graph.states.get(edge.to)!;
    const [from, to] = [a.stationId, b.stationId].sort();
    connections.set(`${from}|${to}|${a.line}`, { from, to, line: a.line });
  }
  const served = new Set([...graph.states.values()].map(state => state.line));
  const lines = new Map<string, NetworkCatalog['lines'][number]>();
  for (const { values: row } of getFeed().tables.routes) {
    const id = row.route_short_name;
    if (served.has(id) && !lines.has(id)) lines.set(id, { id, name: row.route_long_name || id, color: /^[\dA-Fa-f]{6}$/.test(row.route_color) ? `#${row.route_color}` : '#64748b' });
  }
  return {
    serviceDate: graph.date,
    stations: [...graph.stations.values()].map(({ id, name, lat, lon, lines, kind }) => ({ id, name, lat, lon, lines: [...lines], kind: kind ?? 'existing' })),
    lines: [...lines.values()], connections: [...connections.values()], quarantinedTrips: graph.audit.quarantined.length,
  };
}

export function compactSimulationResult(baseline: Graph, result: SimulationResult): SimulationResponse {
  const compactRoute = (graph: Graph, outcome: JourneyOutcome): CompactRoute | null => {
    if (outcome.status !== 'reachable') return null;
    return {
      stationIds: [...outcome.route.stationIds],
      lines: [...new Set(outcome.route.edges.filter(edge => edge.kind === 'travel').map(edge => graph.states.get(edge.from)!.line))],
      coordinates: outcome.route.stationIds.map(id => { const station = graph.stations.get(id)!; return [station.lon, station.lat]; }),
    };
  };
  return { serviceDate: result.serviceDate, model: result.model, comparisons: result.comparisons.map(comparison => ({
    origin: comparison.origin, destination: comparison.destination, status: comparison.status,
    baselineMinutes: comparison.baselineMinutes, scenarioMinutes: comparison.scenarioMinutes,
    minutesSaved: comparison.minutesSaved, percentageChange: comparison.percentageChange,
    usedProposedLine: comparison.usedProposedLine,
    baselineTransfers: comparison.baselineTransfers, scenarioTransfers: comparison.scenarioTransfers, transferChange: comparison.transferChange,
    baselineStatus: comparison.baseline.status, scenarioStatus: comparison.scenario.status,
    baselineRoute: compactRoute(baseline, comparison.baseline), scenarioRoute: compactRoute(result.scenario.graph, comparison.scenario),
  })) };
}

export function runMapSimulation(payload: unknown): SimulationResponse {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new MapInputError('Simulation body must be an object');
  const request = payload as SimulationRequest;
  if (!Array.isArray(request.journeys) || request.journeys.length > 20 || request.journeys.some(pair => !pair || typeof pair.origin !== 'string' || !pair.origin.trim() || typeof pair.destination !== 'string' || !pair.destination.trim())) throw new MapInputError('Supply up to 20 journeys with origin and destination station IDs');
  const intervention = request.intervention as { stations?: unknown } | null;
  if (intervention && Array.isArray(intervention.stations) && intervention.stations.length > 40) throw new MapInputError('A proposal may contain at most 40 stations');
  const baseline = getBaseline(request.serviceDate);
  let result: SimulationResult;
  try { result = simulateIntervention(baseline, request.intervention, request.journeys); }
  catch (error) { throw new MapInputError(error instanceof Error ? error.message : 'Invalid intervention'); }
  return compactSimulationResult(baseline, result);
}
