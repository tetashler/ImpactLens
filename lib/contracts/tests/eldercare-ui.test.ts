import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { createDefaultEldercareRequest, fingerprintEldercareRequest, parseEldercareApiRequest } from '../../eldercare/api-contract.ts';
import { buildAacRequest, createAacDraft, demonstrationAacDraft, draftKey, validAacPosition } from '../../eldercare/editor.ts';
import type { AacDraft } from '../../eldercare/editor.ts';
import { geodesicCircle, toLngLat } from '../../eldercare/geometry.ts';

test('editor and display geometry import without Node modules or the accessibility engine', () => {
  const editorUrl = new URL('../../eldercare/editor.ts', import.meta.url).href;
  const geometryUrl = new URL('../../eldercare/geometry.ts', import.meta.url).href;
  const code = `import {registerHooks,builtinModules} from 'node:module';
    registerHooks({resolve(specifier,context,next) {
      if(specifier.startsWith('node:') || builtinModules.includes(specifier) || specifier.endsWith('/accessibility.ts')) throw new Error('Server dependency at browser boundary');
      return next(specifier,context);
    }});
    const editor=await import(${JSON.stringify(editorUrl)});
    const geometry=await import(${JSON.stringify(geometryUrl)});
    editor.buildAacRequest(editor.demonstrationAacDraft(),'browser-import');
    geometry.geodesicCircle({lat:1.3,lon:103.8},1000);`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', code], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('initial draft requires a chosen point and demonstration explicitly supplies a valid point', () => {
  const draft = createAacDraft();
  assert.equal(draft.position, null);
  assert.throws(() => buildAacRequest(draft, 'initial'));
  const demo = demonstrationAacDraft();
  const defaults = createDefaultEldercareRequest('default');
  assert.deepEqual(demo.position, { lat: 1.287, lon: 103.824 });
  assert.equal(validAacPosition(demo.position), true);
  assert.equal(draft.name, defaults.intervention.name);
  assert.equal(draft.thresholdMetres, 500);
  assert.deepEqual(draft.comparisonThresholdsMetres, [1000]);
  assert.equal(draft.minimumAge, 60);
  assert.equal(draft.existingAvailability, 'assume-listed-available');
  assert.equal(draft.capacityUsers, null);
  assert.equal(draft.walkingMetresPerSecond, null);
  assert.equal(draft.size, 2000);
  assert.equal(draft.seed, 'eldercare-demo');
  assert.equal(draft.referenceDate, '2026-10-27');
});

test('request builder maps every editor field and canonicalizes primary and comparison thresholds', () => {
  const draft: AacDraft = {
    ...demonstrationAacDraft(), position: { lat: 1.3, lon: 103.8 }, name: 'Proposed AAC',
    thresholdMetres: 750, comparisonThresholdsMetres: [1000, 0, 750, 1000], minimumAge: 75,
    existingAvailability: 'exclude-unconfirmed', capacityUsers: 300, walkingMetresPerSecond: 0.8,
    size: 3000, seed: 'changed-seed', referenceDate: '2027-01-01',
  };
  const request = buildAacRequest(draft, 'mapped');
  assert.deepEqual(request.population, { size: 3000, seed: 'changed-seed' });
  assert.equal(request.clientRequestId, 'mapped');
  assert.deepEqual(request.intervention.position, { lat: 1.3, lon: 103.8 });
  assert.equal(request.intervention.name, 'Proposed AAC');
  assert.equal(request.intervention.capacity?.users, 300);
  assert.equal(request.intervention.capacity?.basis, 'illustrative-assumption');
  assert.match(request.intervention.capacity?.rationale ?? '', /illustrative/i);
  assert.deepEqual(request.options, {
    referenceDate: '2027-01-01', minimumAge: 75, thresholdsMetres: [0, 750, 1000],
    existingAvailability: 'exclude-unconfirmed', eligibility: 'age-only-other-criteria-unknown',
    straightLineWalkingMetresPerSecond: 0.8,
  });
  assert.ok(request.intervention.assumptions.some(a => /visual/i.test(a.description) && /route/i.test(a.description)));
  assert.deepEqual(parseEldercareApiRequest(request), request);
  request.intervention.position.lat = 1.4;
  request.options.thresholdsMetres.push(2000);
  assert.deepEqual(draft.position, { lat: 1.3, lon: 103.8 });
  assert.deepEqual(draft.comparisonThresholdsMetres, [1000, 0, 750, 1000]);
});

test('each editable setting changes the full canonical request fingerprint', async () => {
  const baseline = demonstrationAacDraft();
  const fingerprint = await fingerprintEldercareRequest(buildAacRequest(baseline, 'before'));
  const patches: Partial<AacDraft>[] = [
    { position: { lat: 1.29, lon: 103.824 } }, { name: 'Another AAC' }, { thresholdMetres: 600 },
    { comparisonThresholdsMetres: [1200] }, { minimumAge: 65 }, { existingAvailability: 'exclude-unconfirmed' },
    { capacityUsers: 200 }, { walkingMetresPerSecond: 1 }, { size: 1000 }, { seed: 'another-seed' },
    { referenceDate: '2027-01-01' },
  ];
  for (const patch of patches) {
    assert.notEqual(await fingerprintEldercareRequest(buildAacRequest({ ...baseline, ...patch }, 'after')), fingerprint, JSON.stringify(patch));
    assert.notEqual(draftKey({ ...baseline, ...patch }), draftKey(baseline));
  }
  assert.equal(await fingerprintEldercareRequest(buildAacRequest(baseline, 'another-id')), fingerprint);
});

test('position predicate uses inclusive server bounds and rejects malformed coordinates', () => {
  for (const p of [{ lat: 1.15, lon: 103.6 }, { lat: 1.5, lon: 104.1 }]) assert.equal(validAacPosition(p), true);
  for (const p of [null, [], {}, { lat: 1.14999, lon: 103.8 }, { lat: 1.50001, lon: 103.8 },
    { lat: 1.3, lon: 103.59999 }, { lat: 1.3, lon: 104.10001 }, { lat: NaN, lon: 103.8 },
    { lat: 1.3, lon: Infinity }, { lat: '1.3', lon: 103.8 }, { lat: 1.3, lon: 103.8, extra: 1 }]) {
    assert.equal(validAacPosition(p), false, JSON.stringify(p));
  }
});

test('builder rejects unsupported coordinates, costs, age, capacity, and optional settings', () => {
  const baseline = demonstrationAacDraft();
  const invalid: Partial<AacDraft>[] = [
    { position: null }, { position: { lat: 90, lon: 103.8 } }, { position: { lat: NaN, lon: 103.8 } },
    { thresholdMetres: NaN }, { thresholdMetres: Infinity }, { thresholdMetres: -1 }, { thresholdMetres: 5001 },
    { comparisonThresholdsMetres: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    { minimumAge: 55 }, { minimumAge: 61 }, { minimumAge: 95 }, { capacityUsers: 0 },
    { capacityUsers: -1 }, { capacityUsers: 0.5 }, { capacityUsers: 10001 }, { capacityUsers: NaN },
    { walkingMetresPerSecond: 0 }, { walkingMetresPerSecond: 0.09 }, { walkingMetresPerSecond: 2.51 },
    { walkingMetresPerSecond: Infinity }, { size: 999 }, { size: 5001 }, { seed: '' }, { name: '' },
    { referenceDate: '2026-10-26' }, { referenceDate: '2027-02-30' },
  ];
  for (const patch of invalid) assert.throws(() => buildAacRequest({ ...baseline, ...patch }, 'invalid'), JSON.stringify(patch));
  const limits = buildAacRequest({ ...baseline, thresholdMetres: 0, minimumAge: 90, capacityUsers: 10000, walkingMetresPerSecond: 0.1 }, 'limits');
  assert.deepEqual(limits.options.thresholdsMetres, [0, 1000]);
  assert.equal(limits.intervention.capacity?.users, 10000);
});

test('draft keys preserve invalid numeric distinctions and reset returns independent mutable fields', () => {
  const baseline = demonstrationAacDraft();
  const empty = draftKey({ ...baseline, capacityUsers: null, walkingMetresPerSecond: null });
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.notEqual(draftKey({ ...baseline, capacityUsers: value }), empty);
    assert.notEqual(draftKey({ ...baseline, walkingMetresPerSecond: value }), empty);
  }
  assert.notEqual(draftKey({ ...baseline, capacityUsers: NaN }), draftKey({ ...baseline, capacityUsers: Infinity }));
  assert.equal(draftKey(structuredClone(baseline)), draftKey(baseline));
  baseline.position!.lat = 1.4;
  baseline.comparisonThresholdsMetres.push(4000);
  const reset = demonstrationAacDraft();
  assert.deepEqual(reset.position, { lat: 1.287, lon: 103.824 });
  assert.deepEqual(reset.comparisonThresholdsMetres, [1000]);
  assert.equal(createAacDraft().position, null);
  const request = buildAacRequest(reset, 'without-optionals');
  assert.equal(request.intervention.capacity, null);
  assert.equal('straightLineWalkingMetresPerSecond' in request.options, false);
});

// Independent vector central-angle check, rather than the circle's destination formula.
function groundDistance(a: { lat: number; lon: number }, b: number[]): number {
  const rad = Math.PI / 180;
  const vector = (lat: number, lon: number) => [Math.cos(lat * rad) * Math.cos(lon * rad), Math.cos(lat * rad) * Math.sin(lon * rad), Math.sin(lat * rad)];
  const u = vector(a.lat, a.lon), v = vector(b[1], b[0]);
  const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return 6371008.8 * Math.atan2(Math.hypot(...cross), u.reduce((sum, value, i) => sum + value * v[i], 0));
}

test('geodesic circle closes its ring and preserves ground metres at Singapore and high latitude on both axes', () => {
  for (const centre of [{ lat: 1.287, lon: 103.824 }, { lat: 75, lon: 25 }]) {
    const circle = geodesicCircle(centre, 1000);
    assert.equal(circle.type, 'Feature');
    assert.equal(circle.geometry.type, 'Polygon');
    const ring = circle.geometry.coordinates[0];
    assert.equal(ring.length, 65);
    assert.deepEqual(ring[0], ring[64]);
    for (const point of ring) assert.ok(Math.abs(groundDistance(centre, point) - 1000) < 0.00001);
    // Four cardinal points must include both a latitude and longitude displacement.
    assert.ok(Math.abs(ring[0][1] - centre.lat) > 0.008);
    assert.ok(Math.abs(ring[16][0] - centre.lon) > 0.008);
    assert.ok(Math.abs(ring[32][1] - centre.lat) > 0.008);
    assert.ok(Math.abs(ring[48][0] - centre.lon) > 0.008);
  }
});

test('geodesic circle supports zero threshold, custom segments, and normalized antimeridian longitudes', () => {
  const centre = { lat: 1.3, lon: 103.8 };
  assert.deepEqual(toLngLat(centre), [103.8, 1.3]);
  const zero = geodesicCircle(centre, 0, 4).geometry.coordinates[0];
  assert.equal(zero.length, 5);
  for (const p of zero) assert.deepEqual(p, [103.8, 1.3]);
  const ring = geodesicCircle({ lat: 0, lon: 179.999 }, 1000, 16).geometry.coordinates[0];
  assert.equal(ring.length, 17);
  assert.ok(ring.some(p => p[0] < 0));
  assert.ok(ring.every(p => p[0] >= -180 && p[0] <= 180 && Number.isFinite(p[1])));
});

test('geodesic circles remain complete at the geographic poles', () => {
  for (const lat of [-90, 90]) {
    const ring = geodesicCircle({ lat, lon: 0 }, 1000, 4).geometry.coordinates[0];
    assert.equal(new Set(ring.slice(0, 4).map(p => Math.round(p[0]))).size, 4);
    for (const p of ring) assert.ok(Math.abs(groundDistance({ lat, lon: 0 }, p) - 1000) < 0.00001);
  }
});

test('geometry rejects nonfinite WGS84 positions, radii, and invalid segment counts', () => {
  for (const centre of [{ lat: NaN, lon: 1 }, { lat: 91, lon: 1 }, { lat: 0, lon: 181 }, { lat: 0, lon: Infinity }]) {
    assert.throws(() => geodesicCircle(centre, 1000));
    assert.throws(() => toLngLat(centre));
  }
  for (const radius of [-1, NaN, Infinity]) assert.throws(() => geodesicCircle({ lat: 0, lon: 0 }, radius));
  for (const segments of [0, 2, 3.5, 65537, NaN, Infinity]) assert.throws(() => geodesicCircle({ lat: 0, lon: 0 }, 1000, segments));
});
