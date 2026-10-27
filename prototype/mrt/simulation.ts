import type { Graph } from './graph.ts';
import type { Route } from './routing.ts';
import { shortestPath } from './routing.ts';
import { addHypotheticalLine } from './scenario.ts';
import type { Scenario } from './scenario.ts';
export interface JourneyPair { origin: string; destination: string }
export type JourneyOutcome = { status: 'reachable'; route: Route } | { status: 'unreachable' | 'station-unavailable' | 'invalid'; reason: string };
export interface JourneyComparison extends JourneyPair {
  status: 'compared' | 'newly-reachable' | 'unreachable' | 'invalid';
  baseline: JourneyOutcome; scenario: JourneyOutcome;
  baselineMinutes: number | null; scenarioMinutes: number | null;
  minutesSaved: number | null; percentageChange: number | null;
  usedProposedLine: boolean | null;
  baselineTransfers: number | null; scenarioTransfers: number | null; transferChange: number | null;
}
export interface SimulationResult {
  serviceDate: string; departureTime: 'not-modelled'; model: 'static-median-travel-time';
  scenario: Scenario; comparisons: JourneyComparison[];
}
export function simulateIntervention(baseline: Graph, proposal: unknown, pairs: JourneyPair[]): SimulationResult {
  if (!Array.isArray(pairs)) throw new Error('Journeys must be an array of origin/destination station pairs');
  const scenario = addHypotheticalLine(baseline, proposal);
  const known = (graph: Graph, id: string) => graph.stations.has(graph.aliases.get(id) ?? id);
  const outcome = (graph: Graph, pair: JourneyPair): JourneyOutcome => {
    if (!known(graph, pair.origin) || !known(graph, pair.destination)) return { status: 'station-unavailable', reason: 'A hypothetical endpoint does not exist in the baseline' };
    const route = shortestPath(graph, pair.origin, pair.destination);
    return route ? { status: 'reachable', route } : { status: 'unreachable', reason: 'No directed route under the selected static graph' };
  };
  const comparisons: JourneyComparison[] = pairs.map(pair => {
    const validText = pair && typeof pair.origin === 'string' && pair.origin.trim() && typeof pair.destination === 'string' && pair.destination.trim();
    const invalid = !validText || !known(scenario.graph, pair.origin) || !known(scenario.graph, pair.destination);
    const before: JourneyOutcome = invalid ? { status: 'invalid', reason: 'Origin/destination must reference known scenario station IDs' } : outcome(baseline, pair);
    const after: JourneyOutcome = invalid ? { status: 'invalid', reason: 'Origin/destination must reference known scenario station IDs' } : outcome(scenario.graph, pair);
    const beforeRoute = before.status === 'reachable' ? before.route : null, afterRoute = after.status === 'reachable' ? after.route : null;
    const baselineTransfers = beforeRoute ? beforeRoute.edges.filter(e => e.kind === 'transfer').length : null;
    const scenarioTransfers = afterRoute ? afterRoute.edges.filter(e => e.kind === 'transfer').length : null;
    return {
      origin: typeof pair?.origin === 'string' ? pair.origin : '', destination: typeof pair?.destination === 'string' ? pair.destination : '',
      status: invalid ? 'invalid' : beforeRoute && afterRoute ? 'compared' : afterRoute ? 'newly-reachable' : 'unreachable',
      baseline: before, scenario: after,
      baselineMinutes: beforeRoute ? beforeRoute.totalSeconds / 60 : null,
      scenarioMinutes: afterRoute ? afterRoute.totalSeconds / 60 : null,
      minutesSaved: beforeRoute && afterRoute ? (beforeRoute.totalSeconds - afterRoute.totalSeconds) / 60 : null,
      percentageChange: beforeRoute && afterRoute && beforeRoute.totalSeconds > 0 ? (afterRoute.totalSeconds - beforeRoute.totalSeconds) / beforeRoute.totalSeconds * 100 : null,
      usedProposedLine: afterRoute ? afterRoute.edges.some(e => e.kind === 'travel' && scenario.graph.states.get(e.from)!.line === scenario.intervention.id) : null,
      baselineTransfers, scenarioTransfers,
      transferChange: baselineTransfers !== null && scenarioTransfers !== null ? scenarioTransfers - baselineTransfers : null,
    };
  });
  return { serviceDate: baseline.date, departureTime: 'not-modelled', model: 'static-median-travel-time', scenario, comparisons };
}
