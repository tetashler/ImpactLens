import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { NetworkCatalog } from '../../map-contract.ts';
import type { PlotPoint, ScenarioGeometry } from '../../plots/geometry.ts';
import { draftToIntervention } from '../../editor.ts';

// Coordinates are exact catalogue records from the checked-in MRT feed.
const catalog: NetworkCatalog = {
  serviceDate: '2026-11-01', quarantinedTrips: 0,
  stations: [
    { id: 'NS2', name: 'Bukit Batok', lat: 1.34899665, lon: 103.749541, lines: ['NS'] },
    { id: 'NS3', name: 'Bukit Gombak', lat: 1.35867192, lon: 103.75191, lines: ['NS'] },
    { id: 'NS4', name: 'Choa Chu Kang', lat: 1.38517205, lon: 103.744369, lines: ['NS'] },
  ],
  lines: [{ id: 'NS', name: 'North South Line', color: '#f00' }],
  connections: [{ from: 'NS2', to: 'NS3', line: 'NS' }, { from: 'NS3', to: 'NS4', line: 'NS' }],
};
const start = { lat: 1.34899665, lon: 103.749541 };
const bend = { lat: 1.353, lon: 103.754 };
const end = { lat: 1.35867192, lon: 103.75191 };
const point = (id: string, coordinate = bend): PlotPoint => ({
  kind: 'point', id, label: id, coordinate: { ...coordinate }, role: 'unassigned', provenance: 'user-drawn',
});
function geometry(): ScenarioGeometry {
  return { version: 1, scenarioId: 'bukit-batok-study', features: [
    { kind: 'line', id: 'route', label: 'Proposed local route', coordinates: [start, bend, end], provenance: 'user-drawn' },
    // Deliberately not array-ordered: geometric order follows the drawn polyline.
    point('end', end), point('middle', bend), point('start', start),
    point('independent', { lat: 1.38, lon: 103.8 }),
  ] };
}
const timings = { geometryConfirmed: true, assumptionsConfirmed: true,
  runSeconds: 180, dwellSeconds: 25, waitingTimeSeconds: 120, transferWalkSeconds: 150 };
async function domain() {
  const api = await import('../../interventions/hybrid.ts').catch(() => null);
  assert.ok(api, 'hybrid question-and-plot domain must exist');
  return api;
}

test('explicit MRT line follows polyline order, excludes independent dots, and retains bends without inventing stations', async () => {
  const api = await domain();
  const source = geometry(), before = structuredClone(source);
  const context = api.buildHybridContext('What if I build a new MRT line here?', source, 7, { start: 'NS2' }, catalog);
  const intent = api.deterministicHybridIntent(context)!;
  assert.equal(intent.type, 'new_mrt_line');
  assert.equal(intent.classificationSource, 'explicit-question');
  assert.equal(intent.geometrySource, 'deterministic-geometry');
  assert.deepEqual(intent.stationPointIds, ['start', 'middle', 'end']);
  assert.deepEqual(context.geometry.features[0], source.features[0]);
  const draft = api.buildHybridMrt(intent, context, timings);
  assert.deepEqual(draft.stations.map(s => s.key), ['start', 'middle', 'end']);
  assert.equal(draft.stations[0].kind, 'existing');
  assert.deepEqual(draftToIntervention(draft).segments.map(s => s.runSeconds), [180, 180]);
  assert.deepEqual(source, before);
});

test('line vertices alone cannot become station points', async () => {
  const api = await domain();
  const source = geometry(); source.features = source.features.filter(f => f.kind === 'line');
  const context = api.buildHybridContext('Build a new MRT line here', source, 0, {}, catalog);
  const intent = api.deterministicHybridIntent(context)!;
  assert.equal(intent.type, 'clarify');
  assert.deepEqual(intent.stationPointIds, []);
  assert.throws(() => api.buildHybridMrt(intent, context, timings), /MRT|station|clarif/i);
});

test('multiple lines, coincident points, a self crossing and conflicting intervention nouns require clarification', async () => {
  const api = await domain();
  const multiple = geometry(); multiple.features.push({ ...structuredClone(multiple.features[0]), id: 'other-route' });
  const duplicate = geometry(); duplicate.features.push(point('duplicate', bend));
  const crossing: ScenarioGeometry = { version: 1, scenarioId: 'crossing', features: [
    { kind: 'line', id: 'cross', label: 'Crossing', provenance: 'user-drawn', coordinates: [
      { lat: 1.3, lon: 103.8 }, { lat: 1.32, lon: 103.82 },
      { lat: 1.3, lon: 103.82 }, { lat: 1.32, lon: 103.8 },
    ] }, point('cross-dot', { lat: 1.31, lon: 103.81 }), point('first', { lat: 1.3, lon: 103.8 }),
  ] };
  for (const source of [multiple, duplicate, crossing]) {
    const context = api.buildHybridContext('Build a new MRT line here', source, 0, {}, catalog);
    assert.equal(api.deterministicHybridIntent(context)!.type, 'clarify');
  }
  const conflict = api.buildHybridContext('Build a new school and polyclinic here', geometry(), 0, {}, catalog);
  assert.equal(api.deterministicHybridIntent(conflict)!.type, 'clarify');
});

test('polyclinic is location context, never MRT or AAC, and separate facilities stay separate', async () => {
  const api = await domain();
  const source: ScenarioGeometry = { version: 1, scenarioId: 'facilities', features: [point('clinic', bend)] };
  const context = api.buildHybridContext('Would a new polyclinic here improve access to the MRT station?', source, 0, {}, catalog);
  const intent = api.deterministicHybridIntent(context)!;
  assert.equal(intent.type, 'new_polyclinic');
  assert.equal(intent.analysisMode, 'location-context');
  assert.equal(intent.quantitativeModel, null);
  assert.deepEqual(intent.sitePointIds, ['clinic']);
  assert.throws(() => api.buildHybridMrt(intent, context, timings), /MRT/i);
  source.features.push(point('second', end));
  const plural = api.buildHybridContext('Build polyclinics at all points', source, 1, {}, catalog);
  assert.deepEqual(api.deterministicHybridIntent(plural)!.sitePointIds, ['clinic', 'second']);
  assert.equal(api.deterministicHybridIntent(plural)!.routeId, null);
});

test('a standalone MRT marker reports station and schematic segment proxies without claiming a connection', async () => {
  const api = await domain();
  const source: ScenarioGeometry = { version: 1, scenarioId: 'standalone', features: [point('new-station', bend)] };
  const context = api.buildHybridContext('Add a new MRT station here', source, 0, {}, catalog);
  const intent = api.deterministicHybridIntent(context)!;
  assert.equal(intent.type, 'new_mrt_station');
  assert.equal(intent.analysisMode, 'location-context');
  assert.equal(intent.unresolvedConnection, true);
  assert.equal(intent.physicalFeasibility, 'not-assessed');
  assert.ok(intent.markerContext[0].nearbyStations.some(s => s.stationId === 'NS2'));
  assert.ok(intent.markerContext[0].nearbyServiceSegments.some(s => s.line === 'NS'));
  assert.throws(() => api.buildHybridMrt(intent, context, timings), /MRT|connect/i);
});

test('explicit anchors require exact catalogue coordinates and a served existing station', async () => {
  const api = await domain();
  assert.throws(() => api.buildHybridContext('MRT line', geometry(), 0, { middle: 'NS2' }, catalog), /snap|coordinate/i);
  assert.throws(() => api.buildHybridContext('MRT line', geometry(), 0, { missing: 'NS2' }, catalog), /point|anchor/i);
  const unserved = structuredClone(catalog); unserved.stations[0].lines = [];
  assert.throws(() => api.buildHybridContext('MRT line', geometry(), 0, { start: 'NS2' }, unserved), /served|anchor/i);
  const context = api.buildHybridContext('Build a new MRT line', geometry(), 0, {}, catalog);
  const intent = api.deterministicHybridIntent(context)!;
  assert.equal(intent.unresolvedConnection, true);
  assert.throws(() => api.buildHybridMrt(intent, context, timings), /anchor|connect/i);
});

test('provider wire is strictly ID-only, validates order and question conflicts, and binds to the whole scenario', async () => {
  const api = await domain();
  const context = api.buildHybridContext('Consider an intervention using this route', geometry(), 0, { start: 'NS2' }, catalog);
  assert.equal(api.deterministicHybridIntent(context), null);
  // This is a contract fixture, not a recorded or claimed live model response.
  const wire = { version: 'hybrid-map-v1', bindingKey: context.bindingKey, type: 'new_mrt_line', routeId: 'route',
    stationPointIds: ['start', 'middle', 'end'], sitePointIds: [], clarification: null };
  const accepted = api.acceptHybridIntent(wire, context);
  assert.equal(accepted.classificationSource, 'model-inference');
  assert.throws(() => api.acceptHybridIntent({ ...wire, coordinates: [start, end] }, context), /unknown|field/i);
  assert.throws(() => api.acceptHybridIntent({ ...wire, stationPointIds: ['end', 'middle', 'start'] }, context), /order/i);
  assert.throws(() => api.acceptHybridIntent({ ...wire, stationPointIds: ['start', 'independent'] }, context), /attach|route/i);
  const changed = geometry(); changed.features[1] = point('end', { lat: 1.3587, lon: 103.75191 });
  const other = api.buildHybridContext(context.question, changed, 0, { start: 'NS2' }, catalog);
  assert.notEqual(other.bindingKey, context.bindingKey);
  assert.throws(() => api.acceptHybridIntent(wire, other), /bind|stale/i);
  assert.throws(() => api.buildHybridMrt(accepted, other, timings), /bind|stale/i);
  const revised = api.buildHybridContext(context.question, geometry(), 1, { start: 'NS2' }, catalog);
  assert.throws(() => api.acceptHybridIntent(wire, revised), /bind|stale/i);
  const clinic = api.buildHybridContext('Add a polyclinic here', { version: 1, scenarioId: 'clinic', features: [point('site')] }, 0, {}, catalog);
  assert.throws(() => api.acceptHybridIntent({ ...wire, bindingKey: clinic.bindingKey }, clinic), /question|conflict/i);
});

test('provider context is bounded, includes question and geometry findings, and omits the full catalogue', async () => {
  const api = await domain();
  const context = api.buildHybridContext('Which intervention fits these plots?', geometry(), 0, {}, catalog);
  const encoded = api.encodeHybridContext(context);
  assert.ok(Buffer.byteLength(encoded, 'utf8') <= 24_000);
  const projected = JSON.parse(encoded);
  assert.equal(projected.question, context.question);
  assert.equal(projected.bindingKey, context.bindingKey);
  assert.ok(projected.features.some((f: { id: string }) => f.id === 'route'));
  assert.equal(projected.catalog, undefined);
  assert.equal(projected.stations, undefined);
  assert.equal(api.HYBRID_INTENT_SCHEMA_NAME, 'hybrid_intervention_intent_v1');
  assert.ok(api.HYBRID_INTENT_SYSTEM.includes('Never'));
  assert.throws(() => api.buildHybridContext('x', geometry(), -1, {}, catalog), /revision/i);
  assert.throws(() => api.buildHybridContext('x', geometry(), 0, {}, { ...catalog, serviceDate: '2026-02-30' }), /date/i);
});

test('facility vocabulary stays context-only and uses exact named site selection rather than substring matches', async () => {
  const api = await domain();
  for (const [question, expected] of [
    ['Build an active aging centre here', 'new_eldercare'],
    ['Build an active ageing centre here', 'new_eldercare'],
    ['Add a new school here', 'new_school'],
    ['Add a community center here', 'new_community_centre'],
  ]) {
    const context = api.buildHybridContext(question, { version: 1, scenarioId: 'site', features: [point('site')] }, 0, {}, catalog);
    const intent = api.deterministicHybridIntent(context);
    assert.equal(intent?.type, expected, question);
    assert.equal(intent?.quantitativeModel, null);
  }
  const source: ScenarioGeometry = { version: 1, scenarioId: 'two-sites', features: [point('clinic', start), point('second', end)] };
  const ambiguous = api.buildHybridContext('Add a polyclinic here', source, 0, {}, catalog);
  assert.equal(api.deterministicHybridIntent(ambiguous)!.type, 'clarify');
  const named = api.buildHybridContext('Add a polyclinic at "second"', source, 0, {}, catalog);
  assert.deepEqual(api.deterministicHybridIntent(named)!.sitePointIds, ['second']);
});

test('binding includes question, anchors and actual catalogue content, and provider context fails when oversized', async () => {
  const api = await domain();
  const original = api.buildHybridContext('Consider this map', geometry(), 0, {}, catalog);
  const changedCatalog = structuredClone(catalog); changedCatalog.stations[0].name = 'Different supplied record';
  for (const other of [
    api.buildHybridContext('Different question', geometry(), 0, {}, catalog),
    api.buildHybridContext(original.question, geometry(), 0, { start: 'NS2' }, catalog),
    api.buildHybridContext(original.question, geometry(), 0, {}, changedCatalog),
  ]) assert.notEqual(other.bindingKey, original.bindingKey);
  const huge: ScenarioGeometry = { version: 1, scenarioId: 'many-labels', features: Array.from({ length: 100 }, (_, i) => ({
    ...point(`site-${i}`), label: '界'.repeat(120),
  })) };
  const context = api.buildHybridContext('Consider all these sites', huge, 0, {}, catalog);
  assert.throws(() => api.encodeHybridContext(context), /24000|large|simplify/i);
});

test('attachment tolerance does not turn a nearby independent point into a station and a second route is not chosen by provider fiat', async () => {
  const api = await domain();
  const source = geometry(); source.features.push(point('outside-tolerance', { lat: bend.lat + 0.001, lon: bend.lon + 0.001 }));
  const context = api.buildHybridContext('Consider this proposal', source, 0, { start: 'NS2' }, catalog);
  assert.deepEqual(context.attachments[0].orderedPointIds, ['start', 'middle', 'end']);
  const multiple = geometry(); multiple.features.push({ ...structuredClone(multiple.features[0]), id: 'other-route' });
  const multi = api.buildHybridContext('Consider this proposal', multiple, 0, {}, catalog);
  assert.throws(() => api.acceptHybridIntent({ version: 'hybrid-map-v1', bindingKey: multi.bindingKey, type: 'new_mrt_line',
    routeId: 'route', stationPointIds: ['start', 'middle', 'end'], sitePointIds: [], clarification: null }, multi), /multiple|choose/i);
});

test('hybrid context preserves exact question whitespace and gives it a distinct immutable binding', async () => {
  const api = await domain();
  const question = ' \nBuild a new MRT line here\t ';
  const context = api.buildHybridContext(question, geometry(), 0, { start: 'NS2' }, catalog);
  assert.equal(context.question, question);
  assert.equal(api.deterministicHybridIntent(context)!.type, 'new_mrt_line');
  assert.notEqual(context.bindingKey, api.buildHybridContext(question.trim(), geometry(), 0, { start: 'NS2' }, catalog).bindingKey);
  assert.throws(() => api.buildHybridContext(' \n\t ', geometry(), 0, {}, catalog), /question/i);
});

test('proposal-linked nouns distinguish a new MRT line serving schools from a separate school proposal', async () => {
  const api = await domain();
  const context = api.buildHybridContext('Build a new MRT line connecting these schools', geometry(), 0, { start: 'NS2' }, catalog);
  const intent = api.deterministicHybridIntent(context)!;
  assert.equal(intent.type, 'new_mrt_line');
  assert.deepEqual(intent.stationPointIds, ['start', 'middle', 'end']);
  assert.throws(() => api.acceptHybridIntent({ version: 'hybrid-map-v1', bindingKey: context.bindingKey, type: 'new_school',
    routeId: null, stationPointIds: [], sitePointIds: ['start'], clarification: null }, context), /question|conflict/i);
  const conflict = api.buildHybridContext('Build a new MRT line and a new school', geometry(), 0, {}, catalog);
  assert.equal(api.deterministicHybridIntent(conflict)!.type, 'clarify');
});

test('a clinic near a school has one explicit proposal while unresolved noun relationships defer to semantic interpretation', async () => {
  const api = await domain(), source: ScenarioGeometry = { version: 1, scenarioId: 'clinic', features: [point('site')] };
  for (const question of ['Add a polyclinic near the school', 'Add a polyclinic near the new school']) {
    const context = api.buildHybridContext(question, source, 0, {}, catalog);
    assert.equal(api.deterministicHybridIntent(context)!.type, 'new_polyclinic', question);
  }
  for (const question of ['How might a polyclinic and school relate here?', 'Consider the MRT line and these schools']) {
    const context = api.buildHybridContext(question, source, 0, {}, catalog);
    assert.equal(api.deterministicHybridIntent(context), null, question);
  }
  const conflict = api.buildHybridContext('Add a school and polyclinic here', source, 0, {}, catalog);
  assert.equal(api.deterministicHybridIntent(conflict)!.type, 'clarify');
});
