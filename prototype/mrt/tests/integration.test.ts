import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { loadFeed } from '../gtfs.ts';
import { buildGraph } from '../graph.ts';
import { shortestPath, shortestPathsFrom } from '../routing.ts';
import { analyseConnectivity } from '../validation.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const directory = join(root, 'data/transport/mrt-network');
const feed = loadFeed(directory);

for (const [date, excludedActive] of [['2026-10-27', 1], ['2026-10-31', 8], ['2026-11-01', 8]] as const) {
  test(`real feed ${date}: all stations reachable, transfers explicit, suspicious trips excluded, Dijkstra agrees with independent Floyd-Warshall`, () => {
    const graph = buildGraph(feed, { date });
    const connectivity = analyseConnectivity(graph);
    assert.equal(graph.stations.size, 184);
    assert.equal(connectivity.stationWeakComponents.length, 1);
    assert.equal(connectivity.stateStrongComponents.length, 1);
    assert.equal(connectivity.unreachableStationPairs, 0);
    assert.deepEqual(connectivity.unservedStationIds, []);
    assert.equal(graph.audit.invalid.length, 0);
    assert.equal(graph.audit.quarantined.length, 17);
    assert.equal(graph.audit.activeTripCount - graph.audit.usedTripCount, excludedActive);
    const excluded = new Set(graph.audit.quarantined.map(issue => issue.trip.values.trip_id));
    for (const edge of graph.edges) {
      assert.ok(Number.isFinite(edge.seconds) && edge.seconds >= 0);
      const from = graph.states.get(edge.from)!, to = graph.states.get(edge.to)!;
      if (edge.kind === 'transfer') {
        assert.equal(from.stationId, to.stationId);
        assert.notEqual(from.line, to.line);
        assert.equal(edge.seconds, 300);
      } else {
        assert.equal(from.line, to.line);
        assert.ok(edge.sourceRefs.length > 0);
        assert.ok(edge.sourceRefs.every(ref => !excluded.has(ref[0])));
        assert.equal(edge.runSeconds + edge.dwellSeconds, edge.seconds);
      }
    }
    // Independent all-pairs oracle operates on the edge list, not Dijkstra's adjacency or predecessor maps.
    const ids = [...graph.states.keys()], position = new Map(ids.map((id, i) => [id, i]));
    const matrix = ids.map((_, i) => Float64Array.from(ids.map((__, j) => i === j ? 0 : Infinity)));
    for (const edge of graph.edges) {
      const i = position.get(edge.from)!, j = position.get(edge.to)!;
      matrix[i][j] = Math.min(matrix[i][j], edge.seconds);
    }
    for (let k = 0; k < ids.length; k++) for (let i = 0; i < ids.length; i++) for (let j = 0; j < ids.length; j++) {
      matrix[i][j] = Math.min(matrix[i][j], matrix[i][k] + matrix[k][j]);
    }
    for (const station of graph.stations.values()) {
      const tree = shortestPathsFrom(graph, station.id);
      const starts = [...graph.states.values()].filter(s => s.stationId === station.id).map(s => position.get(s.id)!);
      for (let j = 0; j < ids.length; j++) {
        const expected = 120 + Math.min(...starts.map(i => matrix[i][j]));
        assert.equal(tree.distances.get(ids[j]), expected, `${station.id} -> ${ids[j]}`);
      }
      for (const [destination, edge] of tree.previous) {
        assert.equal(edge.to, destination);
        assert.equal(tree.distances.get(destination), tree.distances.get(edge.from)! + edge.seconds);
      }
    }
    // Two representative transfers each join precisely the intended line states.
    assert.ok(graph.edges.some(e => e.from === 'NS4|BP' && e.to === 'NS4|NS' && e.kind === 'transfer'));
    assert.ok(graph.edges.some(e => e.from === 'DT1|BP' && e.to === 'DT1|DT' && e.kind === 'transfer'));
    for (const [origin, destination] of [['BP2', 'NS2'], ['BP13', 'DT4'], ['EW1', 'NE18'], ['TE1', 'CG2']]) {
      const route = shortestPath(graph, origin, destination)!;
      assert.ok(route);
      assert.equal(route.stationIds[0], origin);
      assert.equal(route.stationIds.at(-1), destination);
      assert.equal(route.totalSeconds, route.initialWaitSeconds + route.edges.reduce((sum, edge) => sum + edge.seconds, 0));
      assert.equal(new Set(route.stationIds).size, route.stationIds.length);
      for (let i = 1; i < route.edges.length; i++) assert.equal(route.edges[i - 1].to, route.edges[i].from);
    }
  });
}
test('raw feed reproduces reported disconnected BPLRT; no input bytes changed during graph construction', () => {
  const graph = buildGraph(feed, { date: '2026-10-27', mode: 'raw' });
  assert.deepEqual(analyseConnectivity(graph).stationWeakComponents.map(c => c.length), [173, 13]);
  assert.equal(shortestPath(graph, 'BP2', 'NS2'), null);
  for (const [file, expected] of Object.entries(feed.hashes)) {
    assert.equal(createHash('sha256').update(readFileSync(join(directory, file))).digest('hex'), expected);
  }
});
