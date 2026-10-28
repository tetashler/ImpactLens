import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createExperiment } from '../../experiments/contract.ts';
import { createDefaultConfiguration } from '../../experiments/configuration.ts';
import { configurationIdentity } from '../../experiments/identity.ts';
import { makeExperimentOptions } from './experiment-fixtures.ts';

const api = await import('../../experiments/handoff.ts').catch(() => null);

test('future stakeholder input is immutable serialisable and hashes assumptions plus embedded evidence', async () => {
  assert.ok(api, 'future stakeholder input API is required');
  const options = await makeExperimentOptions(undefined, 'asean');
  const record = await createExperiment(options);
  const input = await api.createScenarioExperimentInput(record);
  assert.ok(Object.isFrozen(input.configuration));
  assert.equal(input.horizonYears, 5);
  assert.deepEqual(input.stakeholderFocus, ['businesses-trade', 'workers-households', 'government-diplomacy']);
  assert.equal(input.execution.status, 'not-executed');
  assert.ok(input.limitations.some(item => /not represent public opinion/.test(item)));
  assert.match(input.executionInputIdentity, /^input-[a-f0-9]{64}$/);
  assert.deepEqual(await api.validateScenarioExperimentInput(JSON.parse(JSON.stringify(input))), input);
  await assert.rejects(api.validateScenarioExperimentInput({ ...input, horizonYears: 10 }));
  await assert.rejects(api.validateScenarioExperimentInput({ ...input, executionInputIdentity: `input-${'0'.repeat(64)}` }));
  await assert.rejects(api.validateScenarioExperimentInput({ ...input, limitations: [] }));
  await assert.rejects(api.validateScenarioExperimentInput({ ...input, results: { approval: 83 } }));
});

test('future execution identity excludes record identity and research attempt timing but responds to input changes', async () => {
  assert.ok(api, 'future stakeholder input API is required');
  const options = await makeExperimentOptions();
  const first = await api.createScenarioExperimentInput(await createExperiment(options));
  const repeated = await api.createScenarioExperimentInput(await createExperiment({ ...options, experimentId: 'experiment-other', createdAt: '2026-10-28T12:00:00.000Z', evidence: { ...options.evidence, researchAttemptId: 'research-new', createdAt: '2026-10-28T12:00:00.000Z' } }));
  assert.equal(first.executionInputIdentity, repeated.executionInputIdentity);
  const changed = await api.createScenarioExperimentInput(await createExperiment({ ...options, configuration: { ...options.configuration, horizonYears: 10 } }));
  assert.notEqual(first.executionInputIdentity, changed.executionInputIdentity);
});

test('complete Phase 7D handoff JSON fixture validates as research input and contains source snapshots', async () => {
  assert.ok(api, 'future stakeholder input API is required');
  const fixture = JSON.parse(await readFile(new URL('../../experiments/fixtures/asean-phase7d-input.json', import.meta.url), 'utf8'));
  const parsed = await api.validateScenarioExperimentInput(fixture);
  assert.ok(parsed.evidence);
  assert.equal(parsed.evidence.sources.length, 2);
  assert.equal(parsed.execution.status, 'not-executed');
});

test('future input carries a missing evidence boundary when no snapshot is attached', async () => {
  assert.ok(api, 'future stakeholder input API is required');
  const input = await api.createScenarioExperimentInput(await createExperiment({ ...await makeExperimentOptions(), evidence: null }));
  assert.equal(input.evidence, null);
  assert.equal(input.evidenceSnapshotIdentity, null);
  assert.ok(input.limitations.includes('No evidence snapshot attached. Research is still required.'));
  assert.deepEqual(await api.validateScenarioExperimentInput(JSON.parse(JSON.stringify(input))), input);
});

test('future input rejects accessors without executing them and rejects missing plotted references', async () => {
  assert.ok(api, 'future stakeholder input API is required');
  const input = await api.createScenarioExperimentInput(await createExperiment({ ...await makeExperimentOptions(), evidence: null }));
  const limits = [...input.limitations];
  let reads = 0;
  const firstLimit = limits[0];
  Object.defineProperty(limits, '0', { enumerable: true, get() { reads++; return firstLimit; } });
  await assert.rejects(api.validateScenarioExperimentInput({ ...input, limitations: limits }));
  assert.equal(reads, 0);
  const mrt = createDefaultConfiguration('New MRT line?', 'mrt-line');
  const mrtInput = await api.createScenarioExperimentInput(await createExperiment({ question: 'New MRT line?', configuration: mrt, evidence: null }));
  const missingRoute = { ...mrt, routeId: 'not-in-snapshot' };
  await assert.rejects(api.validateScenarioExperimentInput({ ...mrtInput, configuration: missingRoute, configurationIdentity: await configurationIdentity(missingRoute) }), /reference/);
});
