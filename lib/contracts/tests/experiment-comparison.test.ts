import test from 'node:test';
import assert from 'node:assert/strict';
import { createExperiment } from '../../experiments/contract.ts';
import { makeExperimentOptions } from './experiment-fixtures.ts';

const api = await import('../../experiments/comparison.ts').catch(() => null);

test('comparison exposes changed assumptions and shared replay evidence without generating impacts', async () => {
  assert.ok(api, 'experiment comparison API is required');
  const options = await makeExperimentOptions(undefined, 'asean');
  const first = await createExperiment(options);
  const second = await createExperiment({ ...options, experimentId: 'experiment-test-2', configuration: { ...first.configuration, horizonYears: 10 } });
  const comparison = api.compareExperiments(first, second);
  assert.equal(comparison.sameScenario, true);
  assert.equal(comparison.configurationChanges.find(row => row.key === 'horizonYears')?.status, 'changed');
  assert.equal(comparison.configurationChanges.find(row => row.key === 'horizonYears')?.right, '10 years');
  assert.equal(comparison.configurationChanges.find(row => row.key === 'withdrawalTiming')?.status, 'unchanged');
  assert.equal(comparison.evidence.snapshotStatus, 'shared');
  assert.equal(comparison.evidence.sources.shared.length, 2);
  assert.equal(comparison.evidence.findings.shared.length, 2);
  assert.equal(comparison.evidence.freshness.status, 'unchanged');
  assert.equal(comparison.executionStatus, 'not-executed');
  assert.equal('approval' in comparison, false);
});

test('comparison reports a missing evidence snapshot as a gap rather than an empty completed review', async () => {
  assert.ok(api, 'experiment comparison API is required');
  const options = await makeExperimentOptions(undefined, 'asean');
  const withEvidence = await createExperiment(options);
  const missing = await createExperiment({ ...options, experimentId: 'experiment-without-evidence', evidence: null });
  const comparison = api.compareExperiments(withEvidence, missing);
  assert.equal(comparison.evidence.snapshotStatus, 'different');
  assert.ok(comparison.evidence.gaps.rightOnly.some(item => /No evidence snapshot attached/.test(item)));
  assert.equal(api.compareExperiments(missing, missing).evidence.snapshotStatus, 'missing');
});

test('comparison separates changed research attempts from unchanged source freshness and identifies missing sources', async () => {
  assert.ok(api, 'experiment comparison API is required');
  const options = await makeExperimentOptions(undefined, 'asean');
  const first = await createExperiment(options);
  const reread = await createExperiment({ ...options, experimentId: 'experiment-test-2', evidence: { ...options.evidence, researchAttemptId: 'research-test-2', createdAt: '2026-10-28T12:00:00.000Z' } });
  const same = api.compareExperiments(first, reread);
  assert.equal(same.evidence.freshness.status, 'unchanged');
  assert.equal(same.evidence.snapshotStatus, 'shared');
  assert.ok(same.configurationChanges.every(row => row.status === 'unchanged'));
  const empty = await createExperiment({ ...await makeExperimentOptions(), experimentId: 'experiment-empty' });
  const different = api.compareExperiments(first, empty);
  assert.equal(different.evidence.snapshotStatus, 'different');
  assert.equal(different.evidence.sources.leftOnly.length, 2);
  assert.ok(different.evidence.gaps.rightOnly.length > 0);
  assert.ok(Object.isFrozen(different));
  assert.deepEqual(api.compareExperiments(first, empty), different);
});
