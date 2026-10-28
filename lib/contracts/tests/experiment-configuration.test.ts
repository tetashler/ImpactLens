import test from 'node:test';
import assert from 'node:assert/strict';

// A missing implementation produces a named assertion failure during the initial red run.
const api = await import('../../experiments/configuration.ts').catch(() => null);

test('experiment defaults keep ASEAN assumptions explicit and do not supply a polyclinic site', () => {
  assert.ok(api, 'experiment configuration API is required');
  const asean = api.createDefaultConfiguration('What if Singapore leaves ASEAN?', 'international-policy');
  assert.equal(asean.kind, 'asean');
  if (asean.kind !== 'asean') return;
  assert.equal(asean.withdrawalTiming, 'immediate');
  assert.equal(asean.transitionMonths, 0);
  assert.equal(asean.tradeArrangements, 'unresolved');
  assert.deepEqual(asean.stakeholderFocus, ['businesses-trade', 'workers-households', 'government-diplomacy']);
  assert.deepEqual(api.createDefaultConfiguration('Add a polyclinic', 'polyclinic'), {
    kind: 'polyclinic', location: null, horizonYears: 5, serviceScope: 'scope-unconfirmed', notes: '',
  });
});

test('configuration parsing rejects impossible timing, invalid coordinates, duplicate focus and extra fields', () => {
  assert.ok(api, 'experiment configuration API is required');
  const base = api.createDefaultConfiguration('Singapore leaving ASEAN');
  for (const edit of [
    { withdrawalTiming: 'custom', transitionMonths: null }, { withdrawalTiming: 'custom', transitionMonths: 0 },
    { withdrawalTiming: 'custom', transitionMonths: 121 }, { withdrawalTiming: 'custom', transitionMonths: 1.5 },
    { transitionMonths: 1 }, { withdrawalTiming: 'negotiated', transitionMonths: 0 },
    { horizonYears: 2 }, { stakeholderFocus: ['businesses-trade', 'businesses-trade'] }, { results: [83] },
  ]) assert.throws(() => api.parseConfiguration({ ...base, ...edit }));
  const custom = api.parseConfiguration({ ...base, withdrawalTiming: 'custom', transitionMonths: 120 });
  assert.equal(custom.kind, 'asean');
  const clinic = api.createDefaultConfiguration('polyclinic');
  for (const location of [{ lat: 103.8, lon: 1.3 }, { lat: NaN, lon: 103.8 }, { lat: 1.3, lon: Infinity }, { lat: 1.3, lon: 103.8, invented: true }])
    assert.throws(() => api.parseConfiguration({ ...clinic, location }));
});

test('configurations are detached frozen snapshots and reject prototypes, accessors and excessive inputs', () => {
  assert.ok(api, 'experiment configuration API is required');
  const base = api.createDefaultConfiguration('Singapore leaving ASEAN');
  const candidate = structuredClone(base);
  const result = api.parseConfiguration(candidate);
  if (candidate.kind === 'asean') candidate.stakeholderFocus.pop();
  assert.ok(Object.isFrozen(result));
  if (result.kind === 'asean') assert.equal(result.stakeholderFocus.length, 3);
  assert.throws(() => api.parseConfiguration(Object.assign(Object.create({ inherited: true }), base)));
  const getter = { ...base };
  Object.defineProperty(getter, 'notes', { enumerable: true, get() { throw new Error('getter executed'); } });
  assert.throws(() => api.parseConfiguration(getter), /plain|data|accessor|Invalid/i);
  assert.throws(() => api.parseConfiguration({ ...base, notes: 'x'.repeat(2001) }));
});

test('MRT, AAC and generic configurations remain bounded unexecuted input references', () => {
  assert.ok(api, 'experiment configuration API is required');
  for (const [intent, kind] of [['mrt-line', 'mrt'], ['aac', 'aac']] as const) {
    const config = api.createDefaultConfiguration('new service', intent);
    assert.equal(config.kind, kind);
    assert.equal('executionStatus' in config && config.executionStatus, 'not-executed');
    assert.throws(() => api.parseConfiguration({ ...config, executionStatus: 'complete' }));
  }
  const generic = api.createDefaultConfiguration('school policy', 'education-policy');
  assert.equal(generic.kind, 'generic');
  assert.throws(() => api.parseConfiguration({ ...generic, namedAssumptions: [{ id: 'a', name: 'one', statement: 'one' }, { id: 'a', name: 'two', statement: 'two' }] }));
});
