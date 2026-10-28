import test from 'node:test';
import assert from 'node:assert/strict';
import { makeExperimentOptions } from './experiment-fixtures.ts';

const api = await import('../../experiments/contract.ts').catch(() => null);

test('experiments embed detached immutable evidence and do not manufacture a simulation run', async () => {
  assert.ok(api, 'experiment record API is required');
  const options = await makeExperimentOptions();
  const experiment = await api.createExperiment(options);
  assert.ok(experiment.evidence);
  options.evidence.unknowns.push('A later edit must not alter the saved record.');
  assert.equal(experiment.evidence.unknowns.length, 1);
  assert.ok(Object.isFrozen(experiment.evidence.unknowns));
  assert.equal(experiment.execution.status, 'not-executed');
  assert.equal('outcomes' in experiment, false);
  assert.equal(experiment.experimentId, 'experiment-test-1');
  assert.match(experiment.configurationIdentity, /^config-[a-f0-9]{64}$/);
  assert.deepEqual(await api.validateExperiment(JSON.parse(JSON.stringify(experiment))), experiment);
});

test('experiments can preserve a configuration with an explicit missing-evidence gap', async () => {
  assert.ok(api, 'experiment record API is required');
  const options = await makeExperimentOptions();
  const experiment = await api.createExperiment({ ...options, evidence: null });
  assert.equal(experiment.evidence, null);
  assert.deepEqual(await api.validateExperiment(JSON.parse(JSON.stringify(experiment))), experiment);
});

test('record IDs and creation times do not change input identity; mismatched scenario evidence is rejected', async () => {
  assert.ok(api, 'experiment record API is required');
  const options = await makeExperimentOptions();
  const first = await api.createExperiment(options);
  const second = await api.createExperiment({ ...options, experimentId: 'experiment-test-2', createdAt: '2026-10-28T11:00:00.000Z' });
  assert.equal(first.scenarioIdentity, second.scenarioIdentity);
  assert.equal(first.configurationIdentity, second.configurationIdentity);
  await assert.rejects(api.createExperiment({ ...options, question: 'Another question' }));
  await assert.rejects(api.validateExperiment({ ...first, configurationIdentity: `config-${'0'.repeat(64)}` }));
  await assert.rejects(api.validateExperiment({ ...first, configuration: { ...first.configuration, notes: 'Tampered' } }));
  assert.throws(() => api.parseExperiment({ ...first, outcome: 99 }));
  assert.throws(() => api.parseExperiment({ ...first, execution: { status: 'complete', reason: 'done' } }));
  assert.throws(() => api.parseExperiment(Object.assign(Object.create({ inherited: true }), first)));
});
