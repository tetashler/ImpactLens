import type { Graph, Edge } from './graph.ts';

export interface Route {
  origin: string; destination: string; stationIds: string[]; edges: Edge[];
  totalSeconds: number; travelSeconds: number; transferSeconds: number; initialWaitSeconds: number;
}
export function validateCosts(graph: Graph): void {
  if (!Number.isFinite(graph.costs.initialWaitSeconds) || graph.costs.initialWaitSeconds < 0) throw new Error('Invalid initial wait cost');
  for (const edge of graph.edges) {
    if (!Number.isFinite(edge.seconds) || edge.seconds < 0) throw new Error(`Invalid edge cost: ${edge.id}`);
    if (!graph.states.has(edge.from) || !graph.states.has(edge.to)) throw new Error(`Unknown edge endpoint: ${edge.id}`);
  }
}
export function canonicalStation(graph: Graph, station: string): string {
  const canonical = graph.aliases.get(station) ?? station;
  if (!graph.stations.has(canonical)) throw new Error(`Unknown station: ${station}`);
  return canonical;
}
export function shortestPathsFrom(graph: Graph, origin: string) {
  validateCosts(graph);
  origin = canonicalStation(graph, origin);
  const distances = new Map<string, number>(), previous = new Map<string, Edge>();
  const unsettled = new Set(graph.states.keys());
  for (const state of graph.states.values()) distances.set(state.id, state.stationId === origin ? graph.costs.initialWaitSeconds : Infinity);
  // O(V² + E) is small and transparent for ~220 station/line states.
  while (unsettled.size) {
    let current: string | undefined, best = Infinity;
    for (const id of unsettled) if (distances.get(id)! < best) { current = id; best = distances.get(id)!; }
    if (current === undefined) break;
    unsettled.delete(current);
    for (const edge of graph.adjacency.get(current) ?? []) {
      const candidate = best + edge.seconds;
      if (candidate < distances.get(edge.to)!) { distances.set(edge.to, candidate); previous.set(edge.to, edge); }
    }
  }
  return { origin, distances, previous };
}
export function shortestPath(graph: Graph, origin: string, destination: string): Route | null {
  origin = canonicalStation(graph, origin); destination = canonicalStation(graph, destination);
  validateCosts(graph);
  if (origin === destination) return { origin, destination, stationIds: [origin], edges: [], totalSeconds: 0, travelSeconds: 0, transferSeconds: 0, initialWaitSeconds: 0 };
  const { distances, previous } = shortestPathsFrom(graph, origin);
  const targets = [...graph.states.values()].filter(s => s.stationId === destination).sort((a, b) => distances.get(a.id)! - distances.get(b.id)!);
  const target = targets[0];
  if (!target || !Number.isFinite(distances.get(target.id))) return null;
  const edges: Edge[] = [];
  let current = target.id;
  while (previous.has(current)) {
    const edge = previous.get(current)!;
    edges.unshift(edge); current = edge.from;
  }
  const stationIds = [origin];
  for (const edge of edges) {
    const id = graph.states.get(edge.to)!.stationId;
    if (id !== stationIds[stationIds.length - 1]) stationIds.push(id);
  }
  return { origin, destination, stationIds, edges, totalSeconds: distances.get(target.id)!,
    travelSeconds: edges.filter(e => e.kind === 'travel').reduce((s, e) => s + e.seconds, 0),
    transferSeconds: edges.filter(e => e.kind === 'transfer').reduce((s, e) => s + e.seconds, 0), initialWaitSeconds: graph.costs.initialWaitSeconds };
}
