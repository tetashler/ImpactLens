import type { Graph } from './graph.ts';
import { validateCosts } from './routing.ts';

function reach(adjacency: Map<string, Set<string>>, seeds: Iterable<string>): Set<string> {
  const seen = new Set<string>(), stack = [...seeds];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of adjacency.get(id) ?? []) if (!seen.has(next)) stack.push(next);
  }
  return seen;
}
function weakComponents(adjacency: Map<string, Set<string>>): string[][] {
  const remaining = new Set(adjacency.keys()), components: string[][] = [];
  while (remaining.size) {
    const component = [...reach(adjacency, [remaining.values().next().value!])].sort();
    component.forEach(id => remaining.delete(id)); components.push(component);
  }
  return components.sort((a, b) => b.length - a.length);
}
export function analyseConnectivity(graph: Graph) {
  validateCosts(graph);
  const stationWeak = new Map([...graph.stations.keys()].map(id => [id, new Set<string>()]));
  const stateWeak = new Map([...graph.states.keys()].map(id => [id, new Set<string>()]));
  const directed = new Map([...graph.states.keys()].map(id => [id, new Set<string>()]));
  for (const edge of graph.edges) {
    directed.get(edge.from)!.add(edge.to);
    stateWeak.get(edge.from)!.add(edge.to); stateWeak.get(edge.to)!.add(edge.from);
    const a = graph.states.get(edge.from)!.stationId, b = graph.states.get(edge.to)!.stationId;
    stationWeak.get(a)!.add(b); stationWeak.get(b)!.add(a);
  }
  const reachByState = new Map([...directed.keys()].map(id => [id, reach(directed, [id])]));
  const remaining = new Set(directed.keys()), stateStrongComponents: string[][] = [];
  while (remaining.size) {
    const id = remaining.values().next().value!;
    const component = [...reachByState.get(id)!].filter(other => reachByState.get(other)!.has(id)).sort();
    component.forEach(v => remaining.delete(v)); stateStrongComponents.push(component);
  }
  stateStrongComponents.sort((a, b) => b.length - a.length);
  let unreachableStationPairs = 0;
  const unservedStationIds: string[] = [];
  for (const origin of graph.stations.keys()) {
    const seeds = [...graph.states.values()].filter(s => s.stationId === origin).map(s => s.id);
    if (!seeds.length) unservedStationIds.push(origin);
    const reachedStations = new Set([...reach(directed, seeds)].map(id => graph.states.get(id)!.stationId));
    for (const destination of graph.stations.keys()) if (origin !== destination && !reachedStations.has(destination)) unreachableStationPairs++;
  }
  return { stationWeakComponents: weakComponents(stationWeak), stateWeakComponents: weakComponents(stateWeak), stateStrongComponents, unreachableStationPairs, unservedStationIds };
}
