import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftToIntervention, toLngLat, fromLngLat } from '../../../lib/editor.ts';
import { compactSimulationResult, getNetworkCatalog, runMapSimulation } from '../../../lib/server/mrt-service.ts';
import { simulateIntervention } from '../simulation.ts';
import { baselineFixture, proposalFixture } from './scenario-fixtures.ts';
import { illustrativeLine } from '../examples/illustrative-line.ts';
import { GET } from '../../../app/api/network/route.ts';
import { POST } from '../../../app/api/simulate/route.ts';

test('editor conversion preserves order, coordinate axes and invalid costs for validation', () => {
  const proposal = draftToIntervention({ id: 'TEST', name: 'Test', waitingTimeSeconds: -2,
    stations: [{ key: 'new', kind: 'new', id: 'HYP_N', name: 'New', lat: 1.3, lon: 103.8, locationNote: 'Illustrative' },
      { key: 'old', kind: 'existing', stationId: 'NS4', transferWalkSeconds: -4 }],
    segments: [{ runSeconds: NaN, dwellSeconds: -1 }] });
  assert.deepEqual(proposal.segments, [{ from: 'HYP_N', to: 'NS4', runSeconds: NaN, dwellSeconds: -1 }]);
  assert.equal(proposal.waitingTimeSeconds, -2);
  assert.ok(!('key' in proposal.stations[0]));
  assert.deepEqual(toLngLat({ lat: 1.3, lon: 103.8 }), [103.8, 1.3]);
  assert.deepEqual(fromLngLat([103.8, 1.3]), { lat: 1.3, lon: 103.8 });
  assert.throws(() => simulateIntervention(baselineFixture(), proposal, []));
});

test('compact adapter preserves hand-calculated engine results and new station coordinates', () => {
  const baseline = baselineFixture();
  const result = simulateIntervention(baseline, proposalFixture(), [{ origin: 'NS4', destination: 'X' }, { origin: 'NS4', destination: 'HYP_M' }]);
  const compact = compactSimulationResult(baseline, result);
  assert.equal(compact.comparisons[0].baselineMinutes, 5);
  assert.equal(compact.comparisons[0].scenarioMinutes, 1.5);
  assert.equal(compact.comparisons[0].percentageChange, -70);
  assert.equal(compact.comparisons[1].baselineStatus, 'station-unavailable');
  assert.equal(compact.comparisons[1].baselineRoute, null);
  assert.deepEqual(compact.comparisons[1].scenarioRoute?.coordinates.at(-1), [103.77, 1.39]);
  assert.deepEqual(compact.comparisons[0].scenarioRoute?.lines, ['HYP_TEST']);
  const json = JSON.stringify(compact);
  for (const privateKey of ['sourceRefs', 'sourceRows', 'graph', 'stop_times', 'evidence', 'edges']) assert.ok(!json.includes(`"${privateKey}"`));
});

test('editor leaves missing segment and invalid coordinate errors visible to engine', () => {
  const proposal = proposalFixture();
  const draft = {
    id: proposal.id, name: proposal.name, waitingTimeSeconds: 30,
    stations: proposal.stations.map((stop, index) => ({ ...stop, key: String(index) })),
    segments: proposal.segments.map(({ runSeconds, dwellSeconds }) => ({ runSeconds, dwellSeconds })),
  };
  const missing = draftToIntervention({ ...draft, segments: draft.segments.slice(0, 1) });
  assert.equal(missing.segments.length, 1);
  assert.throws(() => simulateIntervention(baselineFixture(), missing, []), /Exactly one segment/);
  const invalid = draftToIntervention({ ...draft, stations: draft.stations.map(stop => stop.kind === 'new' ? { ...stop, lat: 91 } : stop) });
  assert.equal(invalid.stations[1].kind === 'new' && invalid.stations[1].lat, 91);
  assert.throws(() => simulateIntervention(baselineFixture(), invalid, []), /valid WGS84/);
});

test('catalogue uses accepted undirected connections and cannot mutate cached baseline', () => {
  const first = getNetworkCatalog('2026-10-27'), snapshot = structuredClone(first);
  assert.equal(first.stations.length, 184);
  assert.equal(first.quarantinedTrips, 17);
  assert.equal(first.connections.length, new Set(first.connections.map(c => `${[c.from, c.to].sort().join('|')}|${c.line}`)).size);
  assert.ok(first.connections.every(c => first.stations.some(s => s.id === c.from) && first.stations.some(s => s.id === c.to)));
  first.stations[0].lines.push('MUTATED'); first.connections.pop(); first.lines[0].name = 'mutated';
  const payload = { serviceDate: '2026-10-27', intervention: illustrativeLine, journeys: [{ origin: 'NS4', destination: 'NE16' }] };
  const simulation = runMapSimulation(payload);
  assert.equal(simulation.comparisons[0].scenarioMinutes, 20);
  assert.deepEqual(runMapSimulation(payload), simulation);
  assert.deepEqual(getNetworkCatalog('2026-10-27'), snapshot);
});

test('routes reject malformed JSON, dates, invalid configs and excessive request counts', async () => {
  for (const date of ['bad', '2026-02-30', '2027-01-01']) assert.equal((await GET(new Request(`http://localhost/api/network?date=${date}`))).status, 400);
  const malformed = await POST(new Request('http://localhost/api/simulate', { method: 'POST', body: '{' }));
  assert.equal(malformed.status, 400);
  for (const payload of [null, {}, { serviceDate: '2026-10-27', intervention: {}, journeys: [] },
    { serviceDate: '2026-10-27', intervention: illustrativeLine, journeys: Array(21).fill({ origin: 'NS4', destination: 'NE16' }) },
    { serviceDate: '2026-10-27', intervention: { ...illustrativeLine, stations: Array(41).fill(illustrativeLine.stations[0]) }, journeys: [] },
    { serviceDate: '2026-10-27', intervention: illustrativeLine, journeys: [null] }]) {
    const response = await POST(new Request('http://localhost/api/simulate', { method: 'POST', body: JSON.stringify(payload) }));
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, 'string');
  }
});
