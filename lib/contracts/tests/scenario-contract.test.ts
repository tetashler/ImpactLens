import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScenarioRequest, parseScenarioPlan, parseScenarioResponse } from '../../scenarios/contract.ts';
import { createScenarioFixtures } from '../../scenarios/fixtures.ts';
import { getCapabilities } from '../../scenarios/registry.ts';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

test('scenario fixtures validate and distinguish calculated, future-agent and evidence plans', async () => {
  const fixtures = await createScenarioFixtures();
  for (const plan of Object.values(fixtures)) assert.deepEqual(parseScenarioPlan(JSON.parse(JSON.stringify(plan))), plan);
  assert.equal(fixtures.mrt.execution, 'calculated');
  assert.equal(fixtures.aac.capabilityId, 'aac-accessibility-v1');
  assert.equal(fixtures.polyclinic.execution, 'evidence-analysis');
  assert.equal(fixtures.asean.execution, 'exploratory-agents');
  assert.equal(fixtures.asean.readiness, 'planned-capability');
  for (const plan of Object.values(fixtures)) assert.equal(plan.executionState, 'not-executed');
});

test('registry availability and requirements cannot be promoted by an untrusted plan', async () => {
  const f = await createScenarioFixtures();
  for (const edit of [{ readiness: 'ready' }, { availability: 'available' }, { executionId: 'run-1' }, { results: { approval: 83 } }, { capabilityId: 'mrt-accessibility-v1' }])
    assert.throws(() => parseScenarioPlan({ ...f.asean, ...edit }));
  assert.throws(() => parseScenarioPlan({ ...f.aac, missingInputs: [] }));
  assert.throws(() => parseScenarioPlan({ ...f.mrt, schemaVersion: 2 }));
  assert.throws(() => parseScenarioPlan({ ...f.polyclinic, evidenceReferences: [{ url: 'https://invented.test' }] }));
  const registry = getCapabilities();
  registry[0].limitations.length = 0;
  assert.ok(getCapabilities()[0].limitations.length);
});

test('scenario requests bound user inputs and retain coordinate provenance without inventing placement', () => {
  const r = { version: 1, clientRequestId: 'test-1', question: 'Build an AAC', selectedCategory: 'aac', mapPoints: [{ id: 'p1', lat: 1.287, lon: 103.824, provenance: 'user-provided' }] };
  assert.deepEqual(parseScenarioRequest(r), r);
  for (const edit of [{ version: 2 }, { question: '' }, { question: 'a'.repeat(2001) }, { execution: 'calculated' }, { evidenceIds: ['fake'] }, { mapPoints: [{ id: 'p1', lat: 103.824, lon: 1.287, provenance: 'user-provided' }] }])
    assert.throws(() => parseScenarioRequest({ ...r, ...edit }));
});

test('API response checks request correlation and content-derived plan identity', async () => {
  const { mrt } = await createScenarioFixtures();
  const envelope = { version: 1, requestId: 'request-1', clientRequestId: mrt.request.clientRequestId, method: 'deterministic-fallback', providerStatus: 'not-configured', plan: mrt };
  assert.deepEqual(await parseScenarioResponse(envelope, mrt.request), envelope);
  await assert.rejects(parseScenarioResponse({ ...envelope, plan: { ...mrt, planId: `plan-${'0'.repeat(64)}` } }));
  await assert.rejects(parseScenarioResponse(envelope, { ...mrt.request, question: 'Other question' }));
});

test('browser-safe import graph cannot reach Node, server modules or environment reads', () => {
  const seen = new Set<string>();
  function inspect(path: string) {
    if (seen.has(path)) return; seen.add(path);
    const code = readFileSync(path,'utf8');
    assert.doesNotMatch(code,/\bprocess\.env\b|\bnode:|lib\/server/);
    for (const match of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      assert.ok(match[1].startsWith('.')); inspect(resolve(dirname(path),match[1]));
    }
  }
  inspect(resolve('lib/scenarios/fixtures.ts'));
  inspect(resolve('lib/scenarios/fallback.ts'));
});

test('registry has unique finite adapters and no executable future capability', () => {
  const all = getCapabilities(); assert.equal(new Set(all.map(c => c.id)).size,4);
  for (const c of all) {
    assert.ok(c.requiredInputs.length && c.limitations.length && c.unsupportedOutcomes.length);
    assert.equal(c.adapter !== null, c.execution === 'calculated');
    if (c.execution !== 'calculated') assert.ok(['planned','planning-only'].includes(c.availability));
  }
});
