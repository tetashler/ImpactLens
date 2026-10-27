import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../csv.ts';
import { buildGraph } from '../graph.ts';
import { shortestPath } from '../routing.ts';
import { analyseConnectivity } from '../validation.ts';
import { fixture } from './fixtures.ts';

function routingFixture() {
  const feed = fixture();
  feed.tables.trips.push(...parseCsv('trip_id,route_id,service_id\nBACK,B,WD\nREVERSE,R,WD').rows);
  feed.tables.stop_times.push(...parseCsv('trip_id,arrival_time,departure_time,stop_id,stop_sequence\nBACK,5:00:00,5:00:00,Y_A,1\nBACK,5:01:00,5:01:00,BP1_A,2\nREVERSE,5:00:00,5:00:00,X_A,1\nREVERSE,5:03:00,5:03:00,NS4_A,2').rows);
  return feed;
}
test('Dijkstra charges one initial wait and one explicit line transfer; preserves the line sequence', () => {
  const graph = buildGraph(routingFixture(), { date: '2026-10-27' });
  const route = shortestPath(graph, 'Y', 'X');
  assert.equal(route.totalSeconds, 660); // 120 initial + 60 BP + 300 transfer + 180 NS.
  assert.equal(route.travelSeconds, 240);
  assert.equal(route.transferSeconds, 300);
  assert.equal(route.initialWaitSeconds, 120);
  assert.deepEqual(route.stationIds, ['Y', 'NS4', 'X']);
  assert.deepEqual(route.edges.map(e => e.kind), ['travel', 'transfer', 'travel']);
  assert.equal(route.edges[0].to, route.edges[1].from);
  assert.equal(route.edges[1].to, route.edges[2].from);
  assert.equal(shortestPath(graph, 'NS4', 'X').totalSeconds, 300);
  assert.equal(shortestPath(graph, 'BP1', 'NS4').totalSeconds, 0);
});
test('same-line alternatives choose the lowest accumulated cost, not the first discovered destination', () => {
  const graph = buildGraph(routingFixture(), { date: '2026-10-27' });
  const edge = { ...graph.edges.find(e => e.kind === 'travel')!, id: 'slow-direct', from: 'Y|BP', to: 'X|NS', seconds: 5000 };
  graph.edges.unshift(edge); graph.adjacency.get(edge.from)!.unshift(edge);
  assert.equal(shortestPath(graph, 'Y', 'X').totalSeconds, 660);
});
test('raw network cannot transfer; unreachable and unknown stations are distinct; invalid weights are rejected', () => {
  const raw = buildGraph(routingFixture(), { date: '2026-10-27', mode: 'raw' });
  assert.equal(shortestPath(raw, 'Y', 'X'), null);
  assert.throws(() => shortestPath(raw, 'UNKNOWN', 'X'), /unknown/i);
  for (const seconds of [-1, NaN, Infinity]) {
    const graph = buildGraph(routingFixture(), { date: '2026-10-27' });
    graph.edges[0].seconds = seconds;
    assert.throws(() => shortestPath(graph, 'Y', 'X'), /cost/i);
  }
});
test('connectivity distinguishes weak connection from directional reachability', () => {
  const directed = analyseConnectivity(buildGraph(fixture(), { date: '2026-10-27' }));
  assert.deepEqual(directed.stationWeakComponents.map(c => c.length), [3]);
  assert.equal(directed.stateStrongComponents.length, 3);
  assert.equal(directed.unreachableStationPairs, 4); // X/Y cannot return; NS4 can reach both.
  const connected = analyseConnectivity(buildGraph(routingFixture(), { date: '2026-10-27' }));
  assert.equal(connected.stateStrongComponents.length, 1);
  assert.equal(connected.unreachableStationPairs, 0);
  const raw = analyseConnectivity(buildGraph(routingFixture(), { date: '2026-10-27', mode: 'raw' }));
  assert.deepEqual(raw.stationWeakComponents.map(c => c.length), [2, 2]);
  assert.equal(raw.unreachableStationPairs, 8);
});
test('changing declared assumptions changes route totals without changing source-derived ride costs', () => {
  const graph = buildGraph(routingFixture(), { date: '2026-10-27', initialWaitSeconds: 0, transferWalkSeconds: 60, waitSeconds: 30 });
  assert.equal(shortestPath(graph, 'Y', 'X').totalSeconds, 330);
});
