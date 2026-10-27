import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph } from '../graph.ts';
import { fixture } from './fixtures.ts';
import { shortestPath, shortestPathsFrom } from '../routing.ts';

test('per-state boarding waits affect origin selection and the returned wait breakdown', () => {
  const graph = buildGraph(fixture(), { date: '2026-10-27' });
  graph.states.get('NS4|NS')!.initialWaitSeconds = 450;
  graph.states.get('NS4|BP')!.initialWaitSeconds = 15;
  const route = shortestPath(graph, 'NS4', 'X')!;
  assert.equal(route.totalSeconds, 495); // 15 wait + 300 transfer + 180 ride.
  assert.equal(route.initialWaitSeconds, 15);
  assert.equal(route.transferSeconds, 300);
  assert.equal(route.travelSeconds, 180);
  assert.equal(shortestPathsFrom(graph, 'NS4').distances.get('NS4|BP'), 15);
  assert.equal(route.totalSeconds, route.initialWaitSeconds + route.edges.reduce((s, e) => s + e.seconds, 0));
});
test('invalid state wait overrides cannot enter the shortest-path calculation', () => {
  for (const value of [-1, NaN, Infinity]) {
    const graph = buildGraph(fixture(), { date: '2026-10-27' });
    graph.states.get('NS4|NS')!.initialWaitSeconds = value;
    assert.throws(() => shortestPath(graph, 'NS4', 'X'), /wait|cost/i);
  }
});
