import test from 'node:test';
import assert from 'node:assert/strict';
import { makeExperimentOptions } from './experiment-fixtures.ts';

const records = await import('../../experiments/contract.ts').catch(() => null);
const api = await import('../../experiments/persistence.ts').catch(() => null);

function storage() {
  const map = new Map<string, string>();
  return { getItem(key: string) { return map.get(key) ?? null; }, setItem(key: string, value: string) { map.set(key, value); } };
}

test('JSON exports include complete evidence and round-trip without overwriting conflicting record IDs', async () => {
  assert.ok(api && records, 'experiment persistence API is required');
  const first = await records.createExperiment(await makeExperimentOptions());
  const exported = await api.exportExperiments([first]);
  assert.ok(JSON.parse(exported).experiments[0].evidence.unknowns.length);
  assert.deepEqual(await api.importExperiments(exported), [first]);
  assert.deepEqual(await api.importExperiments(exported, [first]), [first]);
  const conflict = await records.createExperiment({ ...await makeExperimentOptions(), configuration: { ...first.configuration, notes: 'Different assumptions' } });
  await assert.rejects(api.importExperiments(await api.exportExperiments([conflict]), [first]), /conflict|overwrite/i);
  await assert.rejects(api.importExperiments(JSON.stringify({ version: 1, experiments: [first, first] })), /duplicate/i);
  await assert.rejects(api.importExperiments(JSON.stringify({ version: 2, experiments: [first] })));
  await assert.rejects(api.importExperiments('x'.repeat(2_000_001)));
});

test('local persistence validates every record and reports unavailable or corrupted storage', async () => {
  assert.ok(api && records, 'experiment persistence API is required');
  const store = storage();
  assert.deepEqual(await api.loadExperiments(store), []);
  const first = await records.createExperiment(await makeExperimentOptions());
  await api.saveExperiment(first, store);
  assert.deepEqual(await api.loadExperiments(store), [first]);
  await api.saveExperiment(first, store);
  assert.equal((await api.loadExperiments(store)).length, 1);
  store.setItem(api.EXPERIMENT_STORAGE_KEY, '{not JSON');
  await assert.rejects(api.loadExperiments(store), /JSON|corrupt|Invalid/i);
  const denied = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  await assert.rejects(api.loadExperiments(denied), /storage|denied/i);
});

test('exports enforce record bounds and reject array accessors without running them', async () => {
  assert.ok(api && records, 'experiment persistence API is required');
  const first = await records.createExperiment(await makeExperimentOptions());
  await assert.rejects(api.exportExperiments(Array.from({ length: 25 }, (_, index) => ({ ...first, experimentId: `experiment-${index}` }))), /at most|24/i);
  const values = [first];
  let reads = 0;
  Object.defineProperty(values, '0', { enumerable: true, get() { reads++; return first; } });
  await assert.rejects(api.exportExperiments(values));
  assert.equal(reads, 0);
});
