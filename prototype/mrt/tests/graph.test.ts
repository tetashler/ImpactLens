import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../csv.ts';
import { buildGraph } from '../graph.ts';
import { fixture } from './fixtures.ts';

test('graph uses exact evidenced aliases, keeps unrelated same-name stations distinct and adds explicit line transfers', () => {
  const graph = buildGraph(fixture(), { date: '2026-10-27' });
  assert.equal(graph.stations.size, 3);
  assert.deepEqual(graph.stations.get('NS4').parentIds, ['NS4', 'BP1']);
  assert.ok(graph.stations.has('X') && graph.stations.has('Y'));
  const transfers = graph.edges.filter(e => e.kind === 'transfer');
  assert.equal(transfers.length, 2);
  assert.ok(transfers.every(e => e.seconds === 300 && e.evidence.length));
  assert.equal(graph.aliases.get('BP1'), 'NS4');
});
test('travel weights use median arrival-to-arrival time including dwell and retain all observation row references', () => {
  const graph = buildGraph(fixture(), { date: '2026-10-27' });
  const edge = graph.edges.find(e => e.kind === 'travel' && graph.states.get(e.from).stationId === 'NS4' && graph.states.get(e.to).stationId === 'X');
  assert.equal(edge.seconds, 180);
  assert.equal(edge.runSeconds, 150);
  assert.equal(edge.dwellSeconds, 30);
  assert.deepEqual(edge.sourceRefs, [['T1', 2, 2, 3], ['T2', 3, 4, 5], ['T3', 4, 6, 7]]);
  assert.equal(graph.audit.usedTripCount, 4);
  assert.equal(graph.edges.filter(e => e.kind === 'travel').length, 2);
});
test('raw mode preserves original parents and does not invent line transfers', () => {
  const graph = buildGraph(fixture(), { date: '2026-10-27', mode: 'raw' });
  assert.equal(graph.stations.size, 4);
  assert.equal(graph.edges.filter(e => e.kind === 'transfer').length, 0);
});
test('invalid trips are rejected as whole trips rather than bridging around malformed stop rows', () => {
  const feed = fixture();
  feed.tables.stop_times[1].values.arrival_time = '4:00:00';
  feed.tables.stop_times[3].values.stop_sequence = '1';
  feed.tables.stop_times[5].values.stop_id = 'MISSING';
  const graph = buildGraph(feed, { date: '2026-10-27' });
  assert.equal(graph.audit.invalid.length, 3);
  assert.equal(graph.audit.usedTripCount, 1);
  assert.equal(graph.edges.filter(e => e.kind === 'travel').length, 1);
});
test('known suspicious station pair quarantines its entire trip and preserves original evidence; raw mode retains it', () => {
  const feed = fixture();
  for (const [id, parent, name] of [['NS13', '', 'Yishun'], ['NS18', '', 'Braddell'], ['NS13_B', 'NS13', 'Yishun'], ['NS18_B', 'NS18', 'Braddell']]) {
    feed.tables.stops.push({ row: feed.tables.stops.length + 2, values: { stop_id: id, stop_name: name, stop_lat: '1.4', stop_lon: '103.8', location_type: parent ? '0' : '1', parent_station: parent } });
  }
  feed.tables.trips.push({ row: 7, values: { trip_id: 'SUSPECT', route_id: 'R', service_id: 'WD' } });
  feed.tables.stop_times.push(...parseCsv('trip_id,arrival_time,departure_time,stop_id,stop_sequence\nSUSPECT,5:00:00,5:00:00,NS13_B,1\nSUSPECT,5:05:00,5:05:00,NS18_B,2\nSUSPECT,5:07:00,5:07:00,X_A,3').rows);
  const safe = buildGraph(feed, { date: '2026-10-27' });
  assert.equal(safe.audit.quarantined.length, 1);
  assert.equal(safe.audit.quarantined[0].trip.values.trip_id, 'SUSPECT');
  assert.equal(safe.audit.quarantined[0].stopTimes.length, 3);
  assert.ok(safe.edges.every(e => e.sourceRefs.every(ref => ref[0] !== 'SUSPECT')));
  const raw = buildGraph(feed, { date: '2026-10-27', mode: 'raw' });
  assert.ok(raw.edges.some(e => e.sourceRefs.some(ref => ref[0] === 'SUSPECT')));
});
test('unsupported dates, bad costs, duplicate IDs and orphan stop-time trips fail clearly', () => {
  assert.throws(() => buildGraph(fixture(), { date: '2025-10-27' }), /service/i);
  assert.throws(() => buildGraph(fixture(), { date: '2026-10-27', transferWalkSeconds: -1 }));
  const duplicate = fixture(); duplicate.tables.stops.push(duplicate.tables.stops[0]);
  assert.throws(() => buildGraph(duplicate, { date: '2026-10-27' }), /duplicate/i);
  const orphan = fixture(); orphan.tables.stop_times[0].values.trip_id = 'MISSING';
  assert.throws(() => buildGraph(orphan, { date: '2026-10-27' }), /trip/i);
});
