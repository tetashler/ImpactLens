import test from 'node:test';
import assert from 'node:assert/strict';
import { PLOT_LIMITS, geometryGeoJSON, geometryKey, isPlotPosition, parseScenarioGeometry, type ScenarioGeometry } from '../../plots/geometry.ts';
import { createPlotStore } from '../../plots/store.ts';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { useScenarioPlot } from '../../../components/use-scenario-plot.ts';

const position = { lat: 1.3, lon: 103.8 };
function fixture(): ScenarioGeometry {
  return {
    version: 1, scenarioId: 'scenario-1', features: [
      { kind: 'point', id: 'p1', label: 'Site A', coordinate: { ...position }, role: 'unassigned', provenance: 'user-drawn' },
      { kind: 'line', id: 'l1', label: 'Route A', coordinates: [{ ...position }, { lat: 1.32, lon: 103.85 }], provenance: 'user-drawn' },
    ],
  };
}

test('plot parser returns detached contract values and preserves explicit roles', () => {
  const input = fixture();
  const parsed = parseScenarioGeometry(input);
  assert.deepEqual(parsed, input);
  input.features[0].label = 'Changed';
  assert.equal(parsed.features[0].label, 'Site A');
  const point = parsed.features[0];
  assert.equal(point.kind === 'point' && point.role, 'unassigned');
  for (const role of ['station', 'site']) {
    const geometry = fixture();
    Object.assign(geometry.features[0], { role });
    assert.equal((parseScenarioGeometry(geometry).features[0] as { role: string }).role, role);
  }
});

test('plot parser rejects unknown fields at every boundary and malformed discriminators', () => {
  for (const mutate of [
    (g: ScenarioGeometry) => Object.assign(g, { extra: true }),
    (g: ScenarioGeometry) => Object.assign(g.features[0], { extra: true }),
    (g: ScenarioGeometry) => Object.assign(g.features[0].kind === 'point' && g.features[0].coordinate, { extra: true }),
    (g: ScenarioGeometry) => Object.assign(g.features[1], { role: 'station' }),
    (g: ScenarioGeometry) => Object.assign(g.features[1].kind === 'line' && g.features[1].coordinates[0], { extra: true }),
    (g: ScenarioGeometry) => Object.assign(g, { version: 2 }),
    (g: ScenarioGeometry) => Object.assign(g.features[0], { kind: 'circle' }),
    (g: ScenarioGeometry) => Object.assign(g.features[0], { role: 'automatic' }),
    (g: ScenarioGeometry) => Object.assign(g.features[0], { provenance: 'model-generated' }),
    (g: ScenarioGeometry) => Object.assign(g.features[1], { coordinates: [] }),
  ]) {
    const g = fixture(); mutate(g);
    assert.throws(() => parseScenarioGeometry(g));
  }
  for (const value of [null, [], 1, {}, { ...fixture(), features: null }]) assert.throws(() => parseScenarioGeometry(value));
});

test('plot parser enforces finite Singapore coordinate bounds including swapped axes', () => {
  for (const coordinate of [
    { lat: NaN, lon: 103.8 }, { lat: Infinity, lon: 103.8 }, { lat: 1.1499, lon: 103.8 },
    { lat: 1.5001, lon: 103.8 }, { lat: 1.3, lon: 103.5999 }, { lat: 1.3, lon: 104.1001 },
    { lat: 103.8, lon: 1.3 }, { lat: '1.3', lon: 103.8 },
  ]) {
    const g = fixture(); Object.assign(g.features[0], { coordinate });
    assert.throws(() => parseScenarioGeometry(g));
  }
  for (const coordinate of [{ lat: 1.15, lon: 103.6 }, { lat: 1.5, lon: 104.1 }]) {
    const g = fixture(); Object.assign(g.features[0], { coordinate });
    assert.doesNotThrow(() => parseScenarioGeometry(g));
  }
});

test('plot boundary rejects sparse arrays rather than treating missing values as plot features', () => {
  assert.throws(() => parseScenarioGeometry({ ...fixture(), features: new Array(1) }));
  const geometry = fixture();
  Object.assign(geometry.features[1], { coordinates: new Array(2) });
  assert.throws(() => parseScenarioGeometry(geometry));
});

test('position predicate rejects malformed drag coordinates without throwing', () => {
  assert.equal(isPlotPosition({ lat: 1.15, lon: 104.1 }), true);
  for (const value of [null, [1.3, 103.8], { lat: 103.8, lon: 1.3 }, { lat: 1.3, lon: NaN }, { lat: 1.3, lon: 103.8, role: 'site' }]) {
    assert.equal(isPlotPosition(value), false);
  }
});

test('plot parser bounds text and counts and rejects duplicate feature identities', () => {
  for (const change of [
    { scenarioId: '' }, { scenarioId: 'x'.repeat(PLOT_LIMITS.maxIdLength + 1) },
    { features: Array.from({ length: PLOT_LIMITS.maxFeatures + 1 }, (_, i) => ({ ...fixture().features[0], id: `p${i}` })) },
  ]) assert.throws(() => parseScenarioGeometry({ ...fixture(), ...change }));
  for (const change of [{ id: '' }, { label: ' ' }, { label: 'x'.repeat(PLOT_LIMITS.maxLabelLength + 1) }, { id: 'l1' }]) {
    const g = fixture(); Object.assign(g.features[0], change);
    assert.throws(() => parseScenarioGeometry(g));
  }
  const g = fixture();
  Object.assign(g.features[1], { coordinates: Array.from({ length: PLOT_LIMITS.maxVerticesPerLine + 1 }, () => position) });
  assert.throws(() => parseScenarioGeometry(g));
  const manyVertices = Array.from({ length: Math.ceil(PLOT_LIMITS.maxTotalVertices / PLOT_LIMITS.maxVerticesPerLine) + 1 }, (_, i) => ({
    kind: 'line', id: `l${i}`, label: 'Line', coordinates: Array.from({ length: PLOT_LIMITS.maxVerticesPerLine }, () => position), provenance: 'user-drawn',
  }));
  assert.throws(() => parseScenarioGeometry({ version: 1, scenarioId: 's1', features: manyVertices }));
});

test('geometry identity is canonical over property order and complete over plot content', () => {
  const g = fixture();
  const reorderedKeys = { features: g.features, scenarioId: 'scenario-1', version: 1 };
  assert.equal(geometryKey(g), geometryKey(reorderedKeys as ScenarioGeometry));
  assert.deepEqual(JSON.parse(geometryKey(g)), g);
  for (const mutate of [
    (x: ScenarioGeometry) => { x.scenarioId = 'scenario-2'; },
    (x: ScenarioGeometry) => { x.features[0].label = 'Changed'; },
    (x: ScenarioGeometry) => { Object.assign(x.features[0], { role: 'site' }); },
    (x: ScenarioGeometry) => { Object.assign(x.features[0], { coordinate: { lat: 1.31, lon: 103.8 } }); },
    (x: ScenarioGeometry) => { x.features.reverse(); },
  ]) {
    const changed = fixture(); mutate(changed);
    assert.notEqual(geometryKey(changed), geometryKey(g));
  }
});

test('GeoJSON uses longitude first and hides one-vertex drafts from rendered lines', () => {
  const g = fixture();
  g.features.push({ kind: 'line', id: 'draft', label: 'Draft', coordinates: [{ ...position }], provenance: 'user-drawn' });
  assert.equal(parseScenarioGeometry(g).features.length, 3);
  const json = geometryGeoJSON(g);
  assert.equal(json.type, 'FeatureCollection');
  assert.equal(json.features.length, 2);
  assert.deepEqual(json.features[0].geometry, { type: 'Point', coordinates: [103.8, 1.3] });
  assert.deepEqual(json.features[1].geometry, { type: 'LineString', coordinates: [[103.8, 1.3], [103.85, 1.32]] });
  assert.equal(json.features[0].properties?.id, 'p1');
  assert.equal(json.features[0].properties?.role, 'unassigned');
});

test('plot store creates explicit point roles and stable selections without mutating input positions', () => {
  const store = createPlotStore({ scenarioId: 'store-1' });
  const p = { ...position };
  const id = store.addPoint(p);
  p.lat = 1.4;
  const first = store.getSnapshot().geometry.features[0];
  assert.equal(first.kind === 'point' && first.coordinate.lat, 1.3);
  assert.deepEqual(store.getSnapshot().selection, { id });
  assert.equal(first.kind === 'point' && first.role, 'unassigned');
  store.setMode('station');
  const station = store.addPoint(position);
  const site = store.addPoint(position, 'site');
  assert.deepEqual(store.getSnapshot().geometry.features.map((f) => f.kind === 'point' && f.role), ['unassigned', 'station', 'site']);
  assert.notEqual(station, site);
  assert.equal(store.getSnapshot().geometry.scenarioId, 'store-1');
});

test('line stroke requires explicit completion and a whole stroke is one undo step', () => {
  const store = createPlotStore({ scenarioId: 'store-1' });
  store.setMode('line');
  store.addVertex(position);
  const draft = store.getSnapshot();
  assert.equal(draft.geometry.features.length, 1);
  assert.ok(draft.activeLineId);
  assert.throws(() => store.finishLine());
  assert.strictEqual(store.getSnapshot(), draft);
  store.addVertex({ lat: 1.31, lon: 103.82 });
  store.addVertex({ lat: 1.32, lon: 103.84 });
  assert.equal(store.getSnapshot().activeLineId, draft.activeLineId);
  store.finishLine();
  assert.equal(store.getSnapshot().activeLineId, null);
  assert.equal(store.getSnapshot().mode, 'explore');
  assert.equal(store.getSnapshot().canUndo, true);
  store.undo();
  assert.equal(store.getSnapshot().geometry.features.length, 0);
  store.redo();
  const restored = store.getSnapshot().geometry.features[0];
  assert.equal(restored.kind === 'line' && restored.coordinates.length, 3);
});

test('cancel and switching tools restore pre-stroke plots and allow another independent line', () => {
  const store = createPlotStore({ scenarioId: 'store-1' });
  const point = store.addPoint(position);
  const before = store.getSnapshot().key;
  store.setMode('line'); store.addVertex(position); store.addVertex({ lat: 1.31, lon: 103.81 });
  store.cancel();
  assert.equal(store.getSnapshot().key, before);
  assert.equal(store.getSnapshot().mode, 'explore');
  assert.equal(store.getSnapshot().activeLineId, null);
  assert.equal(store.getSnapshot().geometry.features[0].id, point);
  store.setMode('line'); store.addVertex(position); store.setMode('edit');
  assert.equal(store.getSnapshot().key, before);
  assert.equal(store.getSnapshot().mode, 'edit');
  store.setMode('line'); store.addVertex(position); store.addVertex({ lat: 1.34, lon: 103.83 }); store.finishLine();
  const first = store.getSnapshot().geometry.features[1].id;
  store.setMode('line'); store.addVertex(position);
  assert.notEqual(store.getSnapshot().activeLineId, first);
});

test('geometry revision increases across A to B to A undo while keys repeat by content', () => {
  const store = createPlotStore({ scenarioId: 'store-1' });
  const a = store.getSnapshot();
  store.addPoint(position);
  const b = store.getSnapshot();
  store.undo();
  const again = store.getSnapshot();
  assert.equal(again.key, a.key);
  assert.ok(again.revision > b.revision && b.revision > a.revision);
  store.redo();
  assert.equal(store.getSnapshot().key, b.key);
  assert.ok(store.getSnapshot().revision > again.revision);
  store.undo(); store.addPoint({ lat: 1.35, lon: 103.8 });
  assert.equal(store.getSnapshot().canRedo, false);
});

test('invalid edits are atomic and never alter snapshot or undo history', () => {
  const store = createPlotStore(); store.load(fixture());
  for (const invalid of [
    () => store.addPoint({ lat: 0, lon: 0 }),
    () => store.movePoint('p1', { lat: Infinity, lon: 103.8 }),
    () => store.movePoint('l1', position),
    () => store.moveVertex('l1', 10, position),
    () => store.moveVertex('l1', 0, { lat: 103.8, lon: 1.3 }),
    () => store.updateLabel('p1', ''),
    () => store.updateLabel('missing', 'Example'),
    () => store.setPointRole('p1', 'invented' as 'site'),
    () => store.removeFeature('missing'),
    () => store.removeVertex('l1', -1),
    () => store.reorderVertex('l1', 0, NaN),
    () => store.reorderPoint('p1', 1.5),
    () => store.select({ id: 'p1', vertex: 0 }),
    () => store.select({ id: 'missing' }),
    () => store.setMode('invented' as 'edit'),
    () => store.load({ ...fixture(), scenarioId: '' }),
  ]) {
    const before = store.getSnapshot();
    assert.throws(invalid);
    assert.strictEqual(store.getSnapshot(), before);
  }
  assert.equal(store.getSnapshot().canUndo, false);
});

test('point and vertex edits preserve feature identity and selection follows vertex reorder', () => {
  const store = createPlotStore(); store.load(fixture());
  store.movePoint('p1', { lat: 1.33, lon: 103.82 });
  store.updateLabel('p1', 'New site'); store.setPointRole('p1', 'site');
  assert.deepEqual(store.getSnapshot().geometry.features[0], {
    kind: 'point', id: 'p1', label: 'New site', coordinate: { lat: 1.33, lon: 103.82 }, role: 'site', provenance: 'user-drawn',
  });
  store.select({ id: 'l1', vertex: 0 });
  store.moveVertex('l1', 0, { lat: 1.34, lon: 103.84 });
  store.reorderVertex('l1', 0, 1);
  assert.deepEqual(store.getSnapshot().selection, { id: 'l1', vertex: 1 });
  const editedLine = store.getSnapshot().geometry.features[1];
  assert.deepEqual(editedLine.kind === 'line' && editedLine.coordinates, [
    { lat: 1.32, lon: 103.85 }, { lat: 1.34, lon: 103.84 },
  ]);
  store.removeVertex('l1', 0);
  assert.equal(store.getSnapshot().geometry.features.some((f) => f.id === 'l1'), false);
  assert.equal(store.getSnapshot().selection, null);
});

test('point reorder preserves line positions and stable feature selection', () => {
  const store = createPlotStore(); store.load(fixture());
  const p2 = store.addPoint({ lat: 1.31, lon: 103.8 });
  store.select({ id: 'p1' }); store.reorderPoint('p1', 1);
  assert.deepEqual(store.getSnapshot().geometry.features.map((f) => f.id), [p2, 'l1', 'p1']);
  assert.deepEqual(store.getSnapshot().selection, { id: 'p1' });
  store.removeFeature('p1');
  assert.equal(store.getSnapshot().selection, null);
});

test('removing a vertex from a longer line adjusts the selected vertex index', () => {
  const store = createPlotStore();
  const g = fixture();
  if (g.features[1].kind === 'line') g.features[1].coordinates.push({ lat: 1.35, lon: 103.85 });
  store.load(g); store.select({ id: 'l1', vertex: 2 }); store.removeVertex('l1', 0);
  assert.deepEqual(store.getSnapshot().selection, { id: 'l1', vertex: 1 });
  store.select({ id: 'l1', vertex: 0 }); store.removeVertex('l1', 0);
  assert.equal(store.getSnapshot().selection, null);
});

test('clear is undoable within a scenario and startNew resets history with a fresh identity', () => {
  const store = createPlotStore({ scenarioId: 'original' }); store.addPoint(position);
  store.clear();
  assert.equal(store.getSnapshot().geometry.scenarioId, 'original');
  assert.equal(store.getSnapshot().geometry.features.length, 0);
  store.undo();
  assert.equal(store.getSnapshot().geometry.features.length, 1);
  const before = store.getSnapshot().revision;
  store.startNew();
  assert.notEqual(store.getSnapshot().geometry.scenarioId, 'original');
  assert.equal(store.getSnapshot().canUndo, false);
  assert.equal(store.getSnapshot().canRedo, false);
  assert.ok(store.getSnapshot().revision > before);
});

test('history is bounded and load detaches and freezes external geometry', () => {
  const store = createPlotStore(); const g = fixture(); store.load(g);
  g.features[0].label = 'External mutation';
  assert.equal(store.getSnapshot().geometry.features[0].label, 'Site A');
  assert.throws(() => { store.getSnapshot().geometry.features[0].label = 'Snapshot mutation'; });
  for (let i = 0; i < PLOT_LIMITS.historySize + 5; i++) store.updateLabel('p1', `Name ${i}`);
  let undos = 0;
  while (store.getSnapshot().canUndo) { store.undo(); undos++; }
  assert.equal(undos, PLOT_LIMITS.historySize);
  assert.equal(store.getSnapshot().geometry.features[0].label, 'Name 4');
});

test('external store notifies only on changes and unsubscribes without changing geometry', () => {
  const store = createPlotStore(); let calls = 0;
  const stop = store.subscribe(() => calls++);
  const initial = store.getSnapshot();
  store.setMode('edit'); assert.equal(calls, 1);
  assert.equal(store.getSnapshot().revision, initial.revision);
  store.setMode('edit'); assert.equal(calls, 1);
  const id = store.addPoint(position); assert.equal(calls, 2);
  const after = store.getSnapshot();
  store.movePoint(id, position); assert.strictEqual(store.getSnapshot(), after);
  stop(); store.clear(); assert.equal(calls, 2);
});

test('plot hook exposes a consistent server snapshot and synchronous geometry actions', () => {
  function Probe() {
    const plot = useScenarioPlot({ scenarioId: 'hook-scenario' });
    assert.strictEqual(plot.geometry, plot.getSnapshot().geometry);
    assert.equal(typeof plot.addPoint, 'function');
    assert.equal(typeof plot.undo, 'function');
    return createElement('output', null, `${plot.geometry.scenarioId}|${plot.mode}|${plot.revision}`);
  }
  assert.equal(renderToString(createElement(Probe)), '<output>hook-scenario|explore|0</output>');
});
