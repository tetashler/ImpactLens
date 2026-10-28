import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { buildPlottedAac, buildPlottedMrt, suggestedStations } from '../../plots/adapters.ts';
import type { MrtPlotSettings } from '../../plots/adapters.ts';
import type { PlotPoint, ScenarioGeometry } from '../../plots/geometry.ts';
import type { NetworkCatalog } from '../../map-contract.ts';
import { draftToIntervention } from '../../editor.ts';
import { createAacDraft } from '../../eldercare/editor.ts';
import { parseEldercareApiRequest } from '../../eldercare/api-contract.ts';
import { addHypotheticalLine } from '../../../prototype/mrt/scenario.ts';
import { baselineFixture } from '../../../prototype/mrt/tests/scenario-fixtures.ts';

function catalogue(): NetworkCatalog {
  return {
    serviceDate: '2026-10-27', quarantinedTrips: 0,
    stations: [
      { id: 'NS4', name: 'Choa Chu Kang', lat: 1.38, lon: 103.74, lines: ['NS', 'BP'] },
      { id: 'X', name: 'Other', lat: 1.4, lon: 103.8, lines: ['NS'] },
      { id: 'Y', name: 'Other Y', lat: 1.41, lon: 103.81, lines: ['BP'] },
    ],
    lines: [{ id: 'NS', name: 'North South', color: '#ff0000' }, { id: 'BP', name: 'Bukit Panjang', color: '#555555' }],
    connections: [{ from: 'NS4', to: 'X', line: 'NS' }, { from: 'NS4', to: 'Y', line: 'BP' }],
  };
}

function point(id: string, lat: number, lon: number): PlotPoint {
  return { kind: 'point', id, label: `Station ${id}`, coordinate: { lat, lon }, role: 'station', provenance: 'user-drawn' };
}

function geometry(): ScenarioGeometry {
  return {
    version: 1, scenarioId: 'plot-scenario', features: [
      { kind: 'line', id: 'route:1', label: 'Illustrative plot line', coordinates: [{ lat: 1.38, lon: 103.74 }, { lat: 1.37, lon: 103.77 }, { lat: 1.4, lon: 103.8 }], provenance: 'user-drawn' },
      point('anchor:1', 1.38, 103.74), point('9:middle', 1.39, 103.77), point('anchor:2', 1.4, 103.8),
    ],
  };
}

function settings(patch: Partial<MrtPlotSettings> = {}): MrtPlotSettings {
  return {
    routeId: 'route:1', pointIds: ['anchor:1', '9:middle', 'anchor:2'], anchors: { 'anchor:1': 'NS4', 'anchor:2': 'X' },
    geometryConfirmed: true, assumptionsConfirmed: true, runSeconds: 300, dwellSeconds: 30,
    waitingTimeSeconds: 150, transferWalkSeconds: 180, ...patch,
  };
}

test('plot adapters execute without Node modules, server services, or MRT/accessibility engine imports', () => {
  const adapterUrl = new URL('../../plots/adapters.ts', import.meta.url).href;
  const code = `import {registerHooks,builtinModules} from 'node:module';
    registerHooks({resolve(specifier,context,next) {
      if(specifier.startsWith('node:') || builtinModules.includes(specifier) || /(?:server[\\/]|mrt[\\/]|accessibility\\.ts$)/.test(specifier)) throw new Error('Engine/server dependency at browser boundary');
      return next(specifier,context);
    }});
    const adapters=await import(${JSON.stringify(adapterUrl)});
    adapters.buildPlottedMrt(${JSON.stringify(geometry())},${JSON.stringify(settings())},${JSON.stringify(catalogue())});
    adapters.suggestedStations({lat:1.38,lon:103.74},${JSON.stringify(catalogue())});
    adapters.buildPlottedAac(${JSON.stringify(geometry())},'9:middle',${JSON.stringify(createAacDraft())},'browser-plot',true);`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', code], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('plotted MRT preserves explicitly ordered station points and illustrative costs through the existing engine adapter', () => {
  const source = geometry(), before = structuredClone(source), config = settings(), configBefore = structuredClone(config);
  const draft = buildPlottedMrt(source, config, catalogue());
  assert.equal(draft.name, 'Illustrative plot line');
  assert.equal(draft.waitingTimeSeconds, 150);
  assert.equal(draft.stations.length, 3);
  assert.deepEqual(draft.stations[0], { key: 'anchor:1', kind: 'existing', stationId: 'NS4', transferWalkSeconds: 180 });
  const middle = draft.stations[1];
  assert.equal(middle.kind, 'new');
  if (middle.kind !== 'new') return;
  assert.equal(middle.name, 'Station 9:middle');
  assert.deepEqual([middle.lat, middle.lon], [1.39, 103.77]);
  assert.match(middle.locationNote, /9:middle/);
  assert.match(middle.locationNote, /route:1/);
  assert.match(middle.locationNote, /visual|curvature/i);
  assert.match(middle.locationNote, /explicit|assumed/i);
  assert.deepEqual(draft.segments, [{ runSeconds: 300, dwellSeconds: 30 }, { runSeconds: 300, dwellSeconds: 30 }]);
  const intervention = draftToIntervention(draft);
  const result = addHypotheticalLine(baselineFixture(), intervention);
  assert.equal(result.newStationIds.length, 1);
  assert.equal(result.intervention.assumptions.timingBasis, 'explicit-seconds');
  assert.deepEqual(source, before);
  assert.deepEqual(config, configBefore);
});

test('polyline vertices neither create stations nor derive running times and chosen point order governs segments', () => {
  const source = geometry();
  const route = source.features[0];
  if (route.kind !== 'line') throw new Error('fixture');
  route.coordinates = [{ lat: 1.49, lon: 104 }, { lat: 1.2, lon: 103.61 }];
  const draft = buildPlottedMrt(source, settings({ pointIds: ['anchor:2', '9:middle', 'anchor:1'], runSeconds: 17, dwellSeconds: 2 }), catalogue());
  assert.deepEqual(draft.stations.map(stop => stop.key), ['anchor:2', '9:middle', 'anchor:1']);
  assert.deepEqual(draft.segments, [{ runSeconds: 17, dwellSeconds: 2 }, { runSeconds: 17, dwellSeconds: 2 }]);
  const intervention = draftToIntervention(draft);
  assert.equal(intervention.segments[0].from, 'X');
  assert.equal(intervention.segments[1].to, 'NS4');
  assert.doesNotThrow(() => addHypotheticalLine(baselineFixture(), intervention));
});

test('a nearby station is only a suggestion and an explicit anchored point must equal its actual catalogue position', () => {
  assert.throws(() => buildPlottedMrt(geometry(), settings({ anchors: {} }), catalogue()), /anchor|connect/i);
  const source = geometry();
  const anchor = source.features[1];
  if (anchor.kind !== 'point') throw new Error('fixture');
  anchor.coordinate.lat += 0.00001;
  assert.throws(() => buildPlottedMrt(source, settings(), catalogue()), /coordinate|position|snap/i);
  const oneAnchor = buildPlottedMrt(geometry(), settings({ anchors: { 'anchor:1': 'NS4' } }), catalogue());
  assert.equal(oneAnchor.stations[2].kind, 'new');
  assert.doesNotThrow(() => addHypotheticalLine(baselineFixture(), draftToIntervention(oneAnchor)));
});

test('MRT readiness rejects absent confirmations, missing lines, invalid points, duplicates, and too many stops', () => {
  const badSettings: Partial<MrtPlotSettings>[] = [
    { geometryConfirmed: false }, { assumptionsConfirmed: false }, { routeId: 'missing' }, { routeId: 'anchor:1' },
    { pointIds: [] }, { pointIds: ['anchor:1'] }, { pointIds: ['anchor:1', 'anchor:1'] },
    { pointIds: ['anchor:1', 'missing'] }, { pointIds: ['anchor:1', 'route:1'] },
    { anchors: { 'anchor:1': 'missing' } }, { anchors: { 'missing': 'NS4' } },
    { anchors: { 'anchor:1': 'NS4', '9:middle': 'NS4' } },
  ];
  for (const patch of badSettings) assert.throws(() => buildPlottedMrt(geometry(), settings(patch), catalogue()), JSON.stringify(patch));
  const noLine = geometry(); noLine.features.shift();
  assert.throws(() => buildPlottedMrt(noLine, settings(), catalogue()));
  const draftLine = geometry(); if (draftLine.features[0].kind === 'line') draftLine.features[0].coordinates.length = 1;
  assert.throws(() => buildPlottedMrt(draftLine, settings(), catalogue()), /two|2|vertices/i);
  const tooMany = geometry(), ids = ['anchor:1'];
  for (let i = 0; i < 40; i++) { const id = `extra-${i}`; ids.push(id); tooMany.features.push(point(id, 1.3, 103.8)); }
  assert.throws(() => buildPlottedMrt(tooMany, settings({ pointIds: ids, anchors: { 'anchor:1': 'NS4' } }), catalogue()), /40|limit|many/i);
});

test('explicitly selected and confirmed dots become ordered MRT stops regardless of their prior visual role', () => {
  for (const role of ['unassigned', 'site'] as const) {
    const source = geometry(), selected = source.features[2];
    if (selected.kind === 'point') selected.role = role;
    assert.equal(buildPlottedMrt(source, settings(), catalogue()).stations[1].key, '9:middle');
  }
});

test('MRT readiness rejects nonfinite or negative times and requires positive finite total running time', () => {
  for (const field of ['runSeconds', 'dwellSeconds', 'waitingTimeSeconds', 'transferWalkSeconds'] as const) {
    for (const value of [-1, NaN, Infinity]) assert.throws(() => buildPlottedMrt(geometry(), settings({ [field]: value }), catalogue()), `${field}=${value}`);
  }
  assert.throws(() => buildPlottedMrt(geometry(), settings({ runSeconds: 0 }), catalogue()), /positive|running/i);
  assert.throws(() => buildPlottedMrt(geometry(), settings({ runSeconds: Number.MAX_VALUE, dwellSeconds: Number.MAX_VALUE }), catalogue()));
  assert.doesNotThrow(() => buildPlottedMrt(geometry(), settings({ dwellSeconds: 0, waitingTimeSeconds: 0, transferWalkSeconds: 0 }), catalogue()));
});

test('MRT readiness rejects interchange cost overflow before the engine receives the proposal', () => {
  assert.throws(() => buildPlottedMrt(geometry(), settings({ waitingTimeSeconds: Number.MAX_VALUE, transferWalkSeconds: Number.MAX_VALUE }), catalogue()), /finite|overflow/i);
});

test('MRT rejects unserved or invalid catalogue anchors and malformed Singapore geometry', () => {
  for (const mutate of [
    (catalog: NetworkCatalog) => { catalog.stations[0].lines = []; },
    (catalog: NetworkCatalog) => { catalog.stations[0].lines = ['missing']; },
    (catalog: NetworkCatalog) => { catalog.stations[0].lat = NaN; },
    (catalog: NetworkCatalog) => { catalog.stations.push({ ...catalog.stations[0] }); },
  ]) { const catalog = catalogue(); mutate(catalog); assert.throws(() => buildPlottedMrt(geometry(), settings(), catalog)); }
  for (const coordinate of [{ lat: NaN, lon: 103.8 }, { lat: 1.3, lon: Infinity }, { lat: 1.1, lon: 103.8 }, { lat: 1.3, lon: 104.2 }]) {
    const source = geometry(), selected = source.features[2];
    if (selected.kind === 'point') selected.coordinate = coordinate;
    assert.throws(() => buildPlottedMrt(source, settings(), catalogue()));
  }
});

test('engine identifiers safely encode source UUIDs and punctuation and avoid real station/line collisions deterministically', () => {
  const source = geometry(), middle = source.features[2];
  if (middle.kind !== 'point') throw new Error('fixture');
  middle.id = '123e4567-e89b-12d3-a456-426614174000';
  const config = settings({ pointIds: ['anchor:1', middle.id, 'anchor:2'] });
  const first = buildPlottedMrt(source, config, catalogue());
  assert.match(first.id, /^[A-Za-z][A-Za-z0-9_-]{0,63}$/);
  const stop = first.stations[1]; if (stop.kind !== 'new') throw new Error('fixture');
  assert.match(stop.id, /^[A-Za-z][A-Za-z0-9_-]{0,63}$/);
  assert.notEqual(first.id, stop.id);
  assert.equal(buildPlottedMrt(source, config, catalogue()).stations[1].key, middle.id);
  const collision = catalogue(); collision.stations.push({ id: stop.id, name: 'Reserved', lat: 1.3, lon: 103.8, lines: ['NS'] });
  collision.lines.push({ id: first.id, name: 'Reserved line', color: '#000000' });
  const adapted = buildPlottedMrt(source, config, collision), adaptedStop = adapted.stations[1];
  if (adaptedStop.kind !== 'new') throw new Error('fixture');
  assert.notEqual(adapted.id, first.id);
  assert.notEqual(adaptedStop.id, stop.id);
  assert.deepEqual(buildPlottedMrt(source, config, collision), adapted);
  const similar = geometry(); similar.features.push(point('9.middle', 1.391, 103.771));
  const distinct = buildPlottedMrt(similar, settings({ pointIds: ['anchor:1', '9:middle', '9.middle'] , anchors: { 'anchor:1': 'NS4' } }), catalogue());
  assert.equal(new Set(distinct.stations.map(stop => stop.kind === 'new' ? stop.id : stop.stationId)).size, 3);
});

// Vector central angle independently checks the adapter's haversine calculation.
function independentDistance(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const vector = (p: typeof a) => [Math.cos(p.lat * rad) * Math.cos(p.lon * rad), Math.cos(p.lat * rad) * Math.sin(p.lon * rad), Math.sin(p.lat * rad)];
  const u = vector(a), v = vector(b);
  const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return 6371008.8 * Math.atan2(Math.hypot(...cross), u.reduce((sum, n, i) => sum + n * v[i], 0));
}

test('station suggestions use correct ground metres, rank closest first, and respect the search radius and limit', () => {
  const source = point('suggestion', 1.38, 103.74), catalog = catalogue();
  catalog.stations.push(
    { id: 'NORTH', name: 'North', lat: 1.385, lon: 103.74, lines: ['NS'] },
    { id: 'EAST', name: 'East', lat: 1.38, lon: 103.745, lines: ['NS'] },
    { id: 'FAR', name: 'Far', lat: 1.39, lon: 103.74, lines: ['NS'] },
  );
  const suggestions = suggestedStations(source, catalog);
  assert.deepEqual(suggestions.map(item => item.station.id), ['NS4', 'EAST', 'NORTH']);
  assert.equal(suggestions[0].distanceMetres, 0);
  assert.ok(Math.abs(suggestions[1].distanceMetres - 555.814) < 0.02);
  for (const item of suggestions) assert.ok(Math.abs(item.distanceMetres - independentDistance(source.coordinate, item.station)) < 0.00001);
  assert.deepEqual(suggestedStations(source, catalog, 0).map(item => item.station.id), ['NS4']);
  assert.equal(suggestedStations(source, catalog, 2000, 2).length, 2);
  assert.equal(suggestedStations(source, catalog, 2000, 0).length, 0);
  for (const value of [-1, NaN, Infinity]) assert.throws(() => suggestedStations(source, catalog, value));
});

test('AAC adapts only the explicitly chosen and confirmed point while preserving settings, source references, and caller geometry', () => {
  const source = geometry(), chosen = source.features[2];
  if (chosen.kind !== 'point') throw new Error('fixture');
  chosen.role = 'site';
  const before = structuredClone(source), draft = createAacDraft(), draftBefore = structuredClone(draft);
  draft.name = 'Illustrative chosen AAC';
  const request = buildPlottedAac(source, '9:middle', draft, 'plotted-aac', true);
  assert.equal(request.clientRequestId, 'plotted-aac');
  assert.equal(request.intervention.name, 'Illustrative chosen AAC');
  assert.deepEqual(request.intervention.position, { lat: 1.39, lon: 103.77 });
  assert.deepEqual(request.population, { size: 2000, seed: 'eldercare-demo' });
  assert.match(request.intervention.rationale, /9:middle/);
  assert.match(request.intervention.rationale, /hypothetical|unsurveyed/i);
  assert.deepEqual(parseEldercareApiRequest(request), request);
  assert.deepEqual(source, before);
  assert.equal(draft.position, draftBefore.position);
  request.intervention.position.lat = 1.4;
  assert.deepEqual(chosen.coordinate, { lat: 1.39, lon: 103.77 });
});

test('AAC rejects unconfirmed selections, missing IDs, line selections, and the existing invalid request settings', () => {
  const draft = createAacDraft();
  assert.throws(() => buildPlottedAac(geometry(), '9:middle', draft, 'aac', false), /confirm/i);
  for (const id of ['', 'missing', 'route:1']) assert.throws(() => buildPlottedAac(geometry(), id, draft, 'aac', true));
  assert.throws(() => buildPlottedAac(geometry(), '9:middle', { ...draft, capacityUsers: -1 }, 'aac', true));
});

test('AAC source references stay within the existing request contract even for long user plot identifiers', () => {
  const source = geometry(), chosen = source.features[2];
  if (chosen.kind !== 'point') throw new Error('fixture');
  source.scenarioId = `scenario${'\u0001'.repeat(120)}`;
  chosen.id = `point${'\u0002'.repeat(123)}`;
  const request = buildPlottedAac(source, chosen.id, createAacDraft(), 'source-boundary', true);
  assert.ok(request.intervention.rationale.includes(chosen.id));
  assert.deepEqual(parseEldercareApiRequest(request), request);
});
