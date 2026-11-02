import test from 'node:test';
import assert from 'node:assert/strict';
import type { PlotLine, PlotPoint, PlotPosition, ScenarioGeometry } from '../../plots/geometry.ts';
import { attachRouteStations } from '../../plots/route-stations.ts';

const position = (lon: number, lat = 1.3): PlotPosition => ({ lat, lon });
const dot = (id: string, coordinate: PlotPosition): PlotPoint => ({ kind: 'point', id, label: id, coordinate, role: 'station', provenance: 'user-drawn' });
const line = (coordinates: PlotPosition[], id = 'route'): PlotLine => ({ kind: 'line', id, label: id, coordinates, provenance: 'user-drawn' });
const geometry = (features: ScenarioGeometry['features']): ScenarioGeometry => ({ version: 1, scenarioId: 'anchor', features });
async function planner() {
  const api = await import('../../plots/anchor.ts');
  assert.equal(typeof api.planConfirmedAnchor, 'function', 'explicit anchor planner must exist');
  return api.planConfirmedAnchor;
}
function attachment(value: ScenarioGeometry) {
  return attachRouteStations(value.features.find((f): f is PlotLine => f.kind === 'line')!,
    value.features.filter((f): f is PlotPoint => f.kind === 'point'));
}

test('a midsegment anchor moved 111m keeps every other station attached in order and retains bends', async () => {
  const plan = await planner();
  const bend = position(103.808), source = geometry([
    line([position(103.8), bend, position(103.81)]),
    dot('last', position(103.809)), dot('first', position(103.801)),
    dot('anchor', position(103.805)), dot('before', position(103.803)), dot('after', position(103.807)),
  ]), before = structuredClone(source), target = position(103.805, 1.301);
  const result = plan(source, 'anchor', target, 'route');
  assert.equal(result.routeId, 'route');
  assert.equal(result.alignmentChanged, true);
  assert.deepEqual(attachment(result.geometry).orderedPointIds, ['first', 'before', 'anchor', 'after', 'last']);
  assert.deepEqual(attachment(result.geometry).ambiguousPointIds, []);
  assert.deepEqual(attachment(result.geometry).coincidentPointIds, []);
  const revised = result.geometry.features[0] as PlotLine;
  assert.ok(revised.coordinates.some(p => p.lat === bend.lat && p.lon === bend.lon));
  assert.ok(revised.coordinates.some(p => p.lat === target.lat && p.lon === target.lon));
  for (const original of before.features.filter((f): f is PlotPoint => f.kind === 'point')) {
    const current = result.geometry.features.find(f => f.id === original.id) as PlotPoint;
    assert.deepEqual(current.coordinate, original.id === 'anchor' ? target : original.coordinate);
  }
  assert.deepEqual(source, before);
});

test('an exact anchor vertex is moved without retaining a duplicate waypoint', async () => {
  const plan = await planner(), source = geometry([
    line([position(103.8), position(103.805), position(103.81)]),
    dot('anchor', position(103.805)), dot('end', position(103.81)),
  ]);
  const result = plan(source, 'anchor', position(103.805, 1.301));
  assert.equal((result.geometry.features[0] as PlotLine).coordinates.length, 3);
  assert.deepEqual((result.geometry.features[0] as PlotLine).coordinates[1], position(103.805, 1.301));
});

test('an anchor within one metre of a vertex reuses that vertex', async () => {
  const plan = await planner(), source = geometry([
    line([position(103.8), position(103.805), position(103.81)]),
    dot('anchor', position(103.805, 1.300005)), dot('end', position(103.81)),
  ]);
  const result = plan(source, 'anchor', position(103.805, 1.301), 'route');
  assert.equal((result.geometry.features[0] as PlotLine).coordinates.length, 3);
  assert.deepEqual(attachment(result.geometry).orderedPointIds, ['anchor', 'end']);
});

test('an explicit route repairs a dot already snapped off the line by inserting its waypoint', async () => {
  const plan = await planner(), target = position(103.805, 1.301), source = geometry([
    line([position(103.8), position(103.81)]), dot('start', position(103.8)),
    dot('anchor', target), dot('end', position(103.81)),
  ]);
  const result = plan(source, 'anchor', target, 'route');
  assert.deepEqual(attachment(result.geometry).orderedPointIds, ['start', 'anchor', 'end']);
  assert.ok((result.geometry.features[0] as PlotLine).coordinates.some(p => p.lat === target.lat && p.lon === target.lon));
});

test('multiple attached routes need an explicit route choice', async () => {
  const plan = await planner(), source = geometry([
    line([position(103.8), position(103.81)]),
    line([position(103.805, 1.29), position(103.805, 1.31)], 'other'), dot('anchor', position(103.805)),
  ]), before = structuredClone(source);
  assert.throws(() => plan(source, 'anchor', position(103.805, 1.301)), /choose|multiple|route/i);
  assert.deepEqual(source, before);
  assert.equal(plan(source, 'anchor', position(103.805, 1.301), 'route').routeId, 'route');
});

test('a self-crossing nearest projection is rejected before mutation', async () => {
  const plan = await planner(), source = geometry([
    line([position(103.8), position(103.82, 1.32), position(103.82), position(103.8, 1.32)]),
    dot('anchor', position(103.81, 1.31)),
  ]), before = structuredClone(source);
  assert.throws(() => plan(source, 'anchor', position(103.811, 1.31), 'route'), /ambiguous|projection/i);
  assert.deepEqual(source, before);
});

test('coincident original station dots and a snap onto another station are rejected', async () => {
  const plan = await planner();
  for (const [other, target] of [[position(103.805), position(103.805, 1.301)], [position(103.807), position(103.807)]]) {
    const source = geometry([line([position(103.8), position(103.81)]), dot('anchor', position(103.805)), dot('other', other)]);
    assert.throws(() => plan(source, 'anchor', target, 'route'), /coincident|duplicate|ambiguous|order/i);
  }
});

test('without an attached route an explicit anchor remains a point-only snap', async () => {
  const plan = await planner(), source = geometry([dot('anchor', position(103.805))]), target = position(103.805, 1.301);
  const result = plan(source, 'anchor', target);
  assert.equal(result.routeId, null);
  assert.equal(result.alignmentChanged, false);
  assert.deepEqual((result.geometry.features[0] as PlotPoint).coordinate, target);
});

test('unknown explicit routes and invalid station positions are rejected', async () => {
  const plan = await planner(), source = geometry([dot('anchor', position(103.805))]);
  assert.throws(() => plan(source, 'anchor', position(103.805), 'missing'), /route/i);
  assert.throws(() => plan(source, 'anchor', { lat: NaN, lon: 103.8 }), /coordinate|station|position/i);
});

test('without an explicit route an offroute dot does not rewrite a nearby line', async () => {
  const plan = await planner(), source = geometry([
    line([position(103.8), position(103.81)]), dot('anchor', position(103.805, 1.301)),
  ]);
  const result = plan(source, 'anchor', position(103.805, 1.302));
  assert.equal(result.routeId, null);
  assert.equal(result.alignmentChanged, false);
  assert.deepEqual(result.geometry.features[0], source.features[0]);
});

test('a revised route cannot silently attach an independent dot', async () => {
  const plan = await planner(), source = geometry([
    line([position(103.8), position(103.81)]), dot('anchor', position(103.805)),
    dot('independent', position(103.8025, 1.3005)),
  ]), before = structuredClone(source);
  assert.throws(() => plan(source, 'anchor', position(103.805, 1.301), 'route'), /order|ambiguous/i);
  assert.deepEqual(source, before);
});

test('confirming an already aligned exact station can leave the route unchanged', async () => {
  const plan = await planner(), source = geometry([
    line([position(103.8), position(103.81)]), dot('anchor', position(103.8)), dot('end', position(103.81)),
  ]);
  const result = plan(source, 'anchor', position(103.8), 'route');
  assert.equal(result.alignmentChanged, false);
  assert.deepEqual(result.geometry, source);
});

test('promoting station waypoints cannot exceed the plot vertex limit', async () => {
  const plan = await planner(), coordinates = Array.from({ length: 200 }, (_, i) => position(103.8 + i * 0.00003));
  const source = geometry([line(coordinates), dot('anchor', position(103.800015))]), before = structuredClone(source);
  assert.throws(() => plan(source, 'anchor', position(103.800015, 1.301), 'route'), /vertices/i);
  assert.deepEqual(source, before);
});
