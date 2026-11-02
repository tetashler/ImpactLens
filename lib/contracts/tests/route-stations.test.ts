import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PlotLine, PlotPoint, PlotPosition } from '../../plots/geometry.ts';

const start = { lat: 1.3, lon: 103.8 };
const middle = { lat: 1.3, lon: 103.805 };
const end = { lat: 1.3, lon: 103.81 };
const route = (coordinates = [start, end]): PlotLine => ({
  kind: 'line', id: 'route', label: 'Route', provenance: 'user-drawn', coordinates,
});
const point = (id: string, coordinate: PlotPosition): PlotPoint => ({
  kind: 'point', id, label: id, coordinate, role: 'unassigned', provenance: 'user-drawn',
});
async function domain() {
  const api = await import('../../plots/route-stations.ts').catch(() => null);
  assert.ok(api, 'browser-safe shared route station attachment module must exist');
  return api;
}

test('station order follows the route when dots were created in reverse order', async () => {
  const { attachRouteStations } = await domain();
  const attachment = attachRouteStations(route(), [point('end', end), point('middle', middle), point('start', start)]);
  assert.equal(attachment.routeId, 'route');
  assert.deepEqual(attachment.orderedPointIds, ['start', 'middle', 'end']);
  assert.deepEqual(attachment.ambiguousPointIds, []);
  assert.deepEqual(attachment.coincidentPointIds, []);
  assert.equal(attachment.attached[0].alongMetres, 0);
  assert.ok(attachment.attached[1].alongMetres > 550 && attachment.attached[1].alongMetres < 560);
});

test('an appended connected point is inserted at the beginning of the route', async () => {
  const { attachRouteStations } = await domain();
  assert.deepEqual(attachRouteStations(route(), [point('middle', middle), point('end', end), point('connection', start)])
    .orderedPointIds, ['connection', 'middle', 'end']);
});

test('an appended connected point is inserted in the middle of the route', async () => {
  const { attachRouteStations } = await domain();
  assert.deepEqual(attachRouteStations(route(), [point('start', start), point('end', end), point('connection', middle)])
    .orderedPointIds, ['start', 'connection', 'end']);
});

test('only dots within 25 ground metres attach to a route', async () => {
  const { attachRouteStations } = await domain();
  const attachment = attachRouteStations(route(), [
    point('inside', { lat: 1.30022, lon: middle.lon }),
    point('outside', { lat: 1.30023, lon: middle.lon }),
    point('independent', { lat: 1.31, lon: middle.lon }),
  ]);
  assert.deepEqual(attachment.orderedPointIds, ['inside']);
  assert.ok(attachment.attached[0].distanceMetres > 24 && attachment.attached[0].distanceMetres < 25);
});

test('a dot near a self crossing reports multiple plausible positions along the route', async () => {
  const { attachRouteStations } = await domain();
  const crossing = route([
    { lat: 1.3, lon: 103.8 }, { lat: 1.32, lon: 103.82 },
    { lat: 1.3, lon: 103.82 }, { lat: 1.32, lon: 103.8 },
  ]);
  const attachment = attachRouteStations(crossing, [point('crossing', { lat: 1.3100004, lon: 103.81 })]);
  assert.deepEqual(attachment.orderedPointIds, ['crossing']);
  assert.deepEqual(attachment.ambiguousPointIds, ['crossing']);
});

test('points within one metre are coincident and equal projections use a stable ID order', async () => {
  const { attachRouteStations } = await domain();
  const attachment = attachRouteStations(route(), [
    point('z-dot', middle), point('a-dot', middle), point('nearby', { lat: middle.lat, lon: middle.lon + 0.000005 }),
    point('separate', end),
  ]);
  assert.deepEqual(attachment.orderedPointIds, ['a-dot', 'z-dot', 'nearby', 'separate']);
  assert.deepEqual(attachment.coincidentPointIds, ['a-dot', 'z-dot', 'nearby']);
});

test('attachment does not mutate route coordinates, point data or input order', async () => {
  const { attachRouteStations } = await domain();
  const line = route([structuredClone(start), structuredClone(middle), structuredClone(end)]);
  const points = [point('end', structuredClone(end)), point('start', structuredClone(start))];
  const before = structuredClone({ line, points });
  attachRouteStations(line, points);
  assert.deepEqual({ line, points }, before);
});

test('a route with no nonzero segment has no attached station dots', async () => {
  const { attachRouteStations } = await domain();
  for (const coordinates of [[start], [start, start]]) {
    assert.deepEqual(attachRouteStations(route(coordinates), [point('start', start)]).orderedPointIds, []);
  }
});
