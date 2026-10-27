import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addHypotheticalLine } from '../scenario.ts';
import { shortestPath } from '../routing.ts';
import { baselineFixture, proposalFixture } from './scenario-fixtures.ts';

test('scenario adds only declared stations/rides/interchanges and deeply isolates baseline provenance and adjacency', () => {
  const baseline = baselineFixture(), before = structuredClone(baseline), proposal = proposalFixture(), inputBefore = structuredClone(proposal);
  const scenario = addHypotheticalLine(baseline, proposal);
  assert.deepEqual(baseline, before);
  assert.deepEqual(proposal, inputBefore);
  assert.equal(scenario.graph.stations.size, baseline.stations.size + 1);
  assert.equal(scenario.graph.states.size, baseline.states.size + 3);
  assert.deepEqual(scenario.newStationIds, ['HYP_M']);
  assert.equal(scenario.graph.stations.get('HYP_M')!.kind, 'hypothetical');
  assert.equal(scenario.graph.stations.get('NS4')!.kind, 'existing');
  assert.equal(scenario.graph.edges.length, baseline.edges.length + 10); // 4 rides + 4 transfers at NS4 + 2 at X.
  assert.ok(scenario.graph.edges.every(e => Number.isFinite(e.seconds) && e.seconds >= 0));
  for (const edge of baseline.edges) assert.deepEqual(scenario.graph.edges.find(e => e.id === edge.id), edge);
  scenario.graph.edges[0].sourceRefs[0][0] = 'mutated scenario only';
  scenario.graph.stations.get('NS4')!.sourceRows.push(999);
  scenario.graph.audit.activeServices.push('mutated');
  scenario.intervention.stations.pop();
  assert.deepEqual(baseline, before);
  assert.deepEqual(proposal, inputBefore);
  assert.ok(scenario.graph.adjacency.get(scenario.graph.edges[0].from)!.includes(scenario.graph.edges[0]));
});
test('transfer costs use the target service wait and explicit walk; direct boarding uses proposed wait', () => {
  const { graph } = addHypotheticalLine(baselineFixture(), proposalFixture());
  assert.equal(graph.edges.find(e => e.from === 'NS4|NS' && e.to === 'NS4|HYP_TEST')!.seconds, 40);
  assert.equal(graph.edges.find(e => e.from === 'NS4|HYP_TEST' && e.to === 'NS4|NS')!.seconds, 130);
  assert.equal(shortestPath(graph, 'NS4', 'X')!.totalSeconds, 90); // 30 proposed wait + 25 + 35.
  const route = shortestPath(graph, 'Y', 'X')!;
  assert.equal(route.totalSeconds, 280); // 120 initial + 60 BP + (10 walk + 30 proposed wait) + 60 ride.
  assert.equal(route.transferSeconds, 40);
  assert.equal(route.initialWaitSeconds, 120);
  assert.equal(route.edges.filter(e => e.kind === 'transfer').length, 1);
});
test('omitted proposed wait inherits initial and transfer wait separately; existing routes are not repriced', () => {
  const baseline = baselineFixture(); baseline.costs.initialWaitSeconds = 200;
  const proposal = proposalFixture(); delete proposal.waitingTimeSeconds;
  const { graph } = addHypotheticalLine(baseline, proposal);
  assert.equal(graph.states.get('HYP_M|HYP_TEST')!.initialWaitSeconds, 200);
  assert.equal(graph.edges.find(e => e.from === 'NS4|NS' && e.to === 'NS4|HYP_TEST')!.seconds, 130);
  assert.equal(shortestPath(graph, 'NS4', 'Y')!.totalSeconds, 260);
});
test('a one-anchor spur is connected; an entirely new or unserved line is rejected', () => {
  const proposal = proposalFixture(); proposal.stations.pop(); proposal.segments.pop();
  assert.ok(shortestPath(addHypotheticalLine(baselineFixture(), proposal).graph, 'Y', 'HYP_M'));
  const disconnected = proposalFixture();
  disconnected.stations[0] = { kind: 'new', id: 'HYP_START', name: 'New', lat: 1.38, lon: 103.74, locationNote: 'Fixture' };
  disconnected.stations[2] = { kind: 'new', id: 'HYP_END', name: 'New end', lat: 1.4, lon: 103.8, locationNote: 'Fixture' };
  disconnected.segments[0].from = 'HYP_START'; disconnected.segments[1].to = 'HYP_END';
  assert.throws(() => addHypotheticalLine(baselineFixture(), disconnected), /connect|existing/i);
  const baseline = baselineFixture(); baseline.stations.get('NS4')!.lines = [];
  for (const [id, s] of baseline.states) if (s.stationId === 'NS4') baseline.states.delete(id);
  assert.throws(() => addHypotheticalLine(baseline, proposalFixture()));
});
test('malformed runtime inputs, costs, coordinates, collisions, aliases and disconnected segment orders are rejected', () => {
  const mutations: ((p: any) => void)[] = [
    p => p.schemaVersion = 2, p => p.id = 'NS', p => p.id = 'bad|line', p => p.name = '',
    p => p.waitingTimeSeconds = -1, p => p.waitingTimeSeconds = '30', p => p.waitingTimeSeconds = Infinity,
    p => p.stations[1].lat = 91, p => p.stations[1].lon = -181, p => p.stations[1].lat = NaN,
    p => p.stations[1].lat = '1.39', p => p.stations[1].locationNote = '', p => p.stations[1].kind = 'old',
    p => p.stations[1].id = 'NS4_A', p => p.stations[1].id = 'BP1', p => p.stations[1].id = 'HYP_TEST',
    p => p.stations[0].stationId = 'MISSING', p => p.stations[0].transferWalkSeconds = -1,
    p => p.stations[2].stationId = 'BP1', // canonical duplicate of NS4, even though text differs
    p => p.segments.pop(), p => p.segments[0].to = 'X', p => p.segments[0].runSeconds = 0,
    p => p.segments[0].runSeconds = -1, p => p.segments[0].dwellSeconds = -1,
    p => p.assumptions.timingBasis = 'distance', p => p.assumptions.rationale = '',
    p => p.direction = 'unspecified', p => p.stations = [], p => p.segments = null,
  ];
  for (const mutate of mutations) {
    const baseline = baselineFixture(), before = structuredClone(baseline), proposal = proposalFixture(); mutate(proposal);
    assert.throws(() => addHypotheticalLine(baseline, proposal));
    assert.deepEqual(baseline, before);
  }
  for (const value of [null, [], {}, 'line']) assert.throws(() => addHypotheticalLine(baselineFixture(), value));
});
