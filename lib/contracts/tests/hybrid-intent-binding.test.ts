import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { buildHybridContext, deterministicHybridIntent, buildHybridMrt } from '../../interventions/hybrid.ts';
import { draftToIntervention } from '../../editor.ts';
import type { NetworkCatalog } from '../../map-contract.ts';
import type { ScenarioGeometry } from '../../plots/geometry.ts';

const start = { lat: 1.34899665, lon: 103.749541 }, end = { lat: 1.35867192, lon: 103.75191 };
const catalog: NetworkCatalog = { serviceDate: '2026-11-01', quarantinedTrips: 0,
  stations: [{ id: 'NS2', name: 'Bukit Batok', ...start, lines: ['NS'] }, { id: 'NS3', name: 'Bukit Gombak', ...end, lines: ['NS'] }],
  lines: [{ id: 'NS', name: 'North South', color: '#f00' }], connections: [{ from: 'NS2', to: 'NS3', line: 'NS' }] };
function fixture() {
  const geometry: ScenarioGeometry = { version: 1, scenarioId: 'binding-study', features: [
    { kind: 'line', id: 'route', label: 'Proposal', coordinates: [start, end], provenance: 'user-drawn' },
    { kind: 'point', id: 'a', label: 'Start', coordinate: start, role: 'station', provenance: 'user-drawn' },
    { kind: 'point', id: 'b', label: 'End', coordinate: end, role: 'station', provenance: 'user-drawn' },
  ] };
  const context = buildHybridContext('Build a new MRT line here', geometry, 4, { a: 'NS2' }, catalog);
  const intent = deterministicHybridIntent(context)!;
  const intervention = draftToIntervention(buildHybridMrt(intent, context, { geometryConfirmed: true, assumptionsConfirmed: true,
    runSeconds: 180, dwellSeconds: 20, waitingTimeSeconds: 120, transferWalkSeconds: 150 }));
  return { context, intent, intervention };
}
async function domain() {
  const api = await import('../../interventions/binding.ts').catch(() => null);
  assert.ok(api, 'immutable hybrid binding domain must exist');
  return api;
}

test('binding freezes original inputs, exact accepted MRT result and catalogue identity under a replayable SHA', async () => {
  const api = await domain(), { context, intent, intervention } = fixture();
  const binding = await api.createHybridBinding(context, intent, intervention, 'a'.repeat(64));
  assert.equal(binding.version, 1);
  assert.equal(binding.policy, 'hybrid-citizen-explore-v1');
  assert.equal(binding.question, context.question);
  assert.equal(binding.revision, 4);
  assert.deepEqual(binding.geometry, context.geometry);
  assert.deepEqual(binding.anchors, { a: 'NS2' });
  assert.deepEqual(binding.intervention, intervention);
  assert.match(binding.catalogue.fingerprint, /^[a-f0-9]{64}$/);
  assert.deepEqual(binding.catalogue.anchorStations, [{ id: 'NS2', ...start, lines: ['NS'] }]);
  assert.equal(binding.scenarioFingerprint, 'a'.repeat(64));
  assert.equal(binding.provenance.geometrySource, 'deterministic-geometry');
  assert.ok(Object.isFrozen(binding) && Object.isFrozen(binding.geometry.features));
  const restored = await api.validateHybridBinding(JSON.parse(JSON.stringify(binding)));
  assert.equal(restored.fingerprint, binding.fingerprint);
  assert.ok(new TextEncoder().encode(JSON.stringify(binding)).length < 40_000);
});

test('replay rejects stale questions, geometry revision, anchors and citizen scenario fingerprint through digest validation', async () => {
  const api = await domain(), { context, intent, intervention } = fixture();
  const binding = await api.createHybridBinding(context, intent, intervention, 'a'.repeat(64));
  for (const edit of [
    (value: any) => { value.question += ' changed'; },
    (value: any) => { value.revision++; },
    (value: any) => { value.scenarioFingerprint = 'b'.repeat(64); },
    (value: any) => { value.catalogue.fingerprint = 'c'.repeat(64); },
    (value: any) => { value.geometry.features[0].coordinates.push({ lat: 1.36, lon: 103.752 }); },
  ]) {
    const changed = structuredClone(binding); edit(changed);
    await assert.rejects(() => api.validateHybridBinding(changed), /digest|SHA|fingerprint|binding/i);
  }
});

test('strict replay validates selected IDs, plotted coordinates and explicit served anchors without fresh catalogue lookup', async () => {
  const api = await domain(), { context, intent, intervention } = fixture();
  const binding = await api.createHybridBinding(context, intent, intervention, 'a'.repeat(64));
  for (const edit of [
    (value: any) => { value.intent.stationPointIds = ['b', 'a']; },
    (value: any) => { value.intent.stationPointIds[1] = 'unknown'; },
    (value: any) => { value.intervention.stations[1].lat += 0.001; },
    (value: any) => { value.geometry.features[2].coordinate.lat += 0.001; },
    (value: any) => { value.catalogue.anchorStations[0].lat += 0.001; },
    (value: any) => { value.catalogue.anchorStations[0].lines = []; },
    (value: any) => { value.intervention.segments[0].from = 'NS3'; },
    (value: any) => { value.intent.bindingKey = 'd'.repeat(64); },
    (value: any) => { value.anchors.b = 'NS3'; },
  ]) {
    const changed = structuredClone(binding); edit(changed);
    assert.throws(() => api.parseHybridBinding(changed));
  }
});

test('creation refuses coordinates, edges or timing results that differ from the validated plot adapter', async () => {
  const api = await domain(), { context, intent, intervention } = fixture();
  const changed = structuredClone(intervention);
  assert.equal(changed.stations[1].kind, 'new');
  if (changed.stations[1].kind !== 'new') return;
  changed.stations[1].lat += 0.001;
  await assert.rejects(() => api.createHybridBinding(context, intent, changed, 'a'.repeat(64)), /intervention|coordinate|adapter/i);
  await assert.rejects(() => api.createHybridBinding(context, intent, null, 'a'.repeat(64)), /intervention|MRT/i);
});

test('context-only clinic binding preserves independent site points and cannot acquire a quantitative intervention', async () => {
  const api = await domain();
  const geometry: ScenarioGeometry = { version: 1, scenarioId: 'clinic', features: [
    { kind: 'point', id: 'clinic', label: 'Site', coordinate: start, role: 'site', provenance: 'user-drawn' },
  ] };
  const context = buildHybridContext('Build a new polyclinic here', geometry, 1, {}, catalog), intent = deterministicHybridIntent(context)!;
  const binding = await api.createHybridBinding(context, intent, null, 'e'.repeat(64));
  assert.equal(binding.intervention, null);
  assert.equal(binding.intent.type, 'new_polyclinic');
  assert.deepEqual(binding.intent.sitePointIds, ['clinic']);
  assert.equal(binding.provenance.adapter, 'none');
  assert.equal((await api.validateHybridBinding(binding)).fingerprint, binding.fingerprint);
  await assert.rejects(() => api.createHybridBinding(context, intent, fixture().intervention, 'e'.repeat(64)), /MRT|intervention/i);
});

test('strict bounded parser rejects extra fields, prototypes, accessors and oversized original input', async () => {
  const api = await domain(), { context, intent, intervention } = fixture();
  const binding = await api.createHybridBinding(context, intent, intervention, 'a'.repeat(64));
  assert.throws(() => api.parseHybridBinding({ ...binding, extra: true }));
  assert.throws(() => api.parseHybridBinding({ ...binding, intent: { ...binding.intent, coordinates: [start] } }));
  let accessed = false;
  const accessor = { ...binding };
  Object.defineProperty(accessor, 'question', { enumerable: true, get() { accessed = true; return binding.question; } });
  assert.throws(() => api.parseHybridBinding(accessor));
  assert.equal(accessed, false);
  const huge = structuredClone(binding); huge.question = '界'.repeat(15_000);
  assert.throws(() => api.parseHybridBinding(huge), /bound|large|text|question/i);
});

test('binding replay imports and executes with all Node builtins and server modules denied', async () => {
  const api = await domain(), { context, intent, intervention } = fixture();
  const binding = await api.createHybridBinding(context, intent, intervention, 'a'.repeat(64));
  const url = new URL('../../interventions/binding.ts', import.meta.url).href;
  const code = `import {registerHooks,builtinModules} from 'node:module';
    registerHooks({resolve(specifier,context,next) {
      if(specifier.startsWith('node:') || builtinModules.includes(specifier) || /(?:server[\\\\/]|mrt[\\\\/])/.test(specifier)) throw Error('Node/server dependency in browser replay');
      return next(specifier,context);
    }});
    const api=await import(${JSON.stringify(url)});
    await api.validateHybridBinding(${JSON.stringify(binding)});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', code], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('a valid plot ID matching an Object prototype name never becomes an implicit anchor', async () => {
  const api = await domain(), source = structuredClone(fixture().context.geometry);
  source.features[2].id = 'toString';
  const context = buildHybridContext('Build a new MRT line here', source, 0, { a: 'NS2' }, catalog), intent = deterministicHybridIntent(context)!;
  const intervention = draftToIntervention(buildHybridMrt(intent, context, { geometryConfirmed: true, assumptionsConfirmed: true,
    runSeconds: 180, dwellSeconds: 20, waitingTimeSeconds: 120, transferWalkSeconds: 150 }));
  const binding = await api.createHybridBinding(context, intent, intervention, 'a'.repeat(64));
  assert.equal(binding.intervention!.stations[1].kind, 'new');
  assert.deepEqual(binding.intent.stationPointIds, ['a', 'toString']);
});
