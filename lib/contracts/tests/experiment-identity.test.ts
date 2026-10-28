import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultConfiguration } from '../../experiments/configuration.ts';
import type { ScenarioGeometry } from '../../plots/geometry.ts';

const api = await import('../../experiments/identity.ts').catch(() => null);
const geometry = { version: 1 as const, scenarioId: 'drawn-1', features: [{ kind: 'point' as const, id: 'p1', label: 'Possible site', coordinate: { lat: 1.287, lon: 103.824 }, role: 'site' as const, provenance: 'user-drawn' as const }] };

test('scenario identity uses question and actual geometry while configuration identity uses assumptions', async () => {
  assert.ok(api, 'experiment identity API is required');
  const immediate = createDefaultConfiguration('Singapore leaves ASEAN');
  const negotiated = { ...immediate, withdrawalTiming: 'negotiated', transitionMonths: null };
  assert.notEqual(await api.configurationIdentity(immediate), await api.configurationIdentity(negotiated));
  const context = await api.createGeometryContext(geometry, 1);
  const laterRevision = await api.createGeometryContext(geometry, 9);
  assert.equal(await api.scenarioIdentityFor('New clinic?', context), await api.scenarioIdentityFor('New clinic?', laterRevision));
  assert.match(await api.scenarioIdentityFor('New clinic?', context), /^scenario-[0-9a-f]{64}$/);
  assert.notEqual(await api.scenarioIdentityFor('New clinic?', context), await api.scenarioIdentityFor('Other question?', context));
  const moved = structuredClone(geometry); moved.features[0].coordinate.lat += 0.001;
  assert.notEqual(await api.scenarioIdentityFor('New clinic?', context), await api.scenarioIdentityFor('New clinic?', await api.createGeometryContext(moved, 1)));
});

test('geometry snapshots validate exact actual content and reject tampered identity, unknown fields or prototypes', async () => {
  assert.ok(api, 'experiment identity API is required');
  const context = await api.createGeometryContext(geometry, 1);
  assert.ok(Object.isFrozen(context));
  assert.deepEqual(JSON.parse(context.canonicalContent), geometry);
  await assert.rejects(api.validateGeometryContext({ ...context, identity: `geometry-${'0'.repeat(64)}` }));
  await assert.rejects(api.createGeometryContext({ ...geometry, fabricated: true } as unknown as ScenarioGeometry, 0));
  await assert.rejects(api.createGeometryContext({ ...geometry, features: [Object.assign(Object.create({ hidden: true }), geometry.features[0])] }, 0));
});
