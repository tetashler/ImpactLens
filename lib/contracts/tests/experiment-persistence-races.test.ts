import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as immediate } from 'node:timers/promises';
import { createExperimentLab } from '../../experiments/client.ts';
import { createExperiment, exportExperiments } from '../../experiments/index.ts';
import { makeExperimentOptions } from './experiment-fixtures.ts';

const context = { question: 'A different active question', geometry: { version: 1 as const, scenarioId: 'race-test-drawing', features: [] }, geometryRevision: 0 };

async function archives() {
  const options = await makeExperimentOptions();
  const first = await createExperiment({ ...options, experimentId: 'race-archive-a' });
  const second = await createExperiment({ ...options, experimentId: 'race-archive-b' });
  return { first, second, firstJSON: await exportExperiments([first]), secondJSON: await exportExperiments([second]) };
}

/** Hold one real digest without replacing its result; all validations still execute. */
function holdDigest(when: () => boolean = () => true) {
  const nativeDigest = crypto.subtle.digest;
  const original = nativeDigest.bind(crypto.subtle);
  let held = false;
  let release = () => {};
  let announce = () => {};
  const started = new Promise<void>(resolve => { announce = resolve; });
  const active = new Set<Promise<ArrayBuffer>>();
  crypto.subtle.digest = (...args: Parameters<SubtleCrypto['digest']>) => {
    if (!held && when()) {
      held = true;
      announce();
      return new Promise<ArrayBuffer>((resolve, reject) => {
        release = () => { release = () => {}; original(...args).then(resolve, reject); };
      });
    }
    const pending = original(...args);
    active.add(pending);
    void pending.then(() => active.delete(pending), () => active.delete(pending));
    return pending;
  };
  return {
    started,
    release: () => release(),
    restore: () => { crypto.subtle.digest = nativeDigest; },
    // Hashing is the only asynchronous work in these storage operations. Drain
    // actual unheld hashes and their continuations; no timing sleeps are needed.
    async drainUnheld() {
      do { await Promise.all([...active]); await immediate(); } while (active.size);
    },
  };
}
function storedIds(json: string): string[] {
  return (JSON.parse(json).experiments as { experimentId: string }[]).map(record => record.experimentId).sort();
}

test('delayed hydration merges current imports and persists the complete archive without changing the active draft', async () => {
  const { firstJSON, secondJSON } = await archives();
  let stored = firstJSON;
  const lab = createExperimentLab({ storage: { getItem: () => stored, setItem: (_key, json) => { stored = json; } } });
  await lab.setContext(context);
  const active = lab.getSnapshot();
  const gate = holdDigest();
  try {
    const loading = lab.loadSaved();
    await gate.started;
    await lab.importJSON(secondJSON);
    assert.deepEqual(lab.getSnapshot().records.map(record => record.experimentId), ['race-archive-b']);
    gate.release();
    await loading;
    assert.deepEqual(lab.getSnapshot().records.map(record => record.experimentId).sort(), ['race-archive-a', 'race-archive-b']);
    assert.deepEqual(storedIds(stored), ['race-archive-a', 'race-archive-b']);
    assert.equal(lab.getSnapshot().question, active.question);
    assert.deepEqual(lab.getSnapshot().configuration, active.configuration);
    assert.equal(lab.getSnapshot().scenarioIdentity, active.scenarioIdentity);
    assert.equal(lab.getSnapshot().selectedId, null);
    assert.equal(lab.getSnapshot().evidence, null);
  } finally { gate.release(); gate.restore(); lab.dispose(); }
});

test('an older delayed persistence operation cannot overwrite a newer complete archive', async () => {
  const { firstJSON, secondJSON } = await archives();
  let stored = '';
  const lab = createExperimentLab({ storage: { getItem: () => null, setItem: (_key, json) => { stored = json; } } });
  const gate = holdDigest(() => lab.getSnapshot().records.length === 1);
  try {
    const older = lab.importJSON(firstJSON);
    await gate.started;
    const newer = lab.importJSON(secondJSON);
    await gate.drainUnheld();
    assert.equal(lab.getSnapshot().records.length, 2);
    // A broken parallel writer can finish the newer export while the older one
    // remains held. A serialized writer keeps it queued. Releasing now exposes
    // either implementation's final externally visible storage contents.
    gate.release();
    await Promise.all([older, newer]);
    assert.deepEqual(storedIds(stored), ['race-archive-a', 'race-archive-b']);
    assert.deepEqual(lab.getSnapshot().records.map(record => record.experimentId).sort(), ['race-archive-a', 'race-archive-b']);
  } finally { gate.release(); gate.restore(); lab.dispose(); }
});

test('StrictMode cleanup and setup reject hydration from the previous lifecycle', async () => {
  const { firstJSON, secondJSON } = await archives();
  let stored = firstJSON;
  const lab = createExperimentLab({ storage: { getItem: () => stored, setItem: (_key, json) => { stored = json; } } });
  await lab.setContext(context);
  const gate = holdDigest();
  try {
    const previousLifecycle = lab.loadSaved();
    await gate.started;
    lab.dispose();
    stored = secondJSON;
    // StrictMode reuses the controller while effects set up again.
    await Promise.all([lab.setContext(context), lab.loadSaved()]);
    assert.equal(lab.getSnapshot().preparing, false);
    assert.ok(lab.getSnapshot().scenarioIdentity);
    gate.release();
    await previousLifecycle;
    assert.deepEqual(lab.getSnapshot().records.map(record => record.experimentId), ['race-archive-b']);
    assert.deepEqual(storedIds(stored), ['race-archive-b']);
    assert.equal(lab.getSnapshot().question, context.question);
    assert.equal(lab.getSnapshot().evidence, null);
  } finally { gate.release(); gate.restore(); lab.dispose(); }
});

test('a persistence operation from a disposed lifecycle cannot write browser storage', async () => {
  const { firstJSON } = await archives();
  let stored: string | null = null;
  const lab = createExperimentLab({ storage: { getItem: () => stored, setItem: (_key, json) => { stored = json; } } });
  const gate = holdDigest(() => lab.getSnapshot().records.length === 1);
  try {
    const saving = lab.importJSON(firstJSON);
    await gate.started;
    lab.dispose();
    gate.release();
    await saving;
    assert.equal(stored, null);
  } finally { gate.release(); gate.restore(); lab.dispose(); }
});

test('an import still being validated when its lifecycle is disposed cannot publish or persist later', async () => {
  const { firstJSON } = await archives();
  let stored: string | null = null;
  const lab = createExperimentLab({ storage: { getItem: () => stored, setItem: (_key, json) => { stored = json; } } });
  const gate = holdDigest();
  try {
    const importing = lab.importJSON(firstJSON);
    await gate.started;
    lab.dispose();
    gate.release();
    await importing;
    assert.deepEqual(lab.getSnapshot().records, []);
    assert.equal(stored, null);
  } finally { gate.release(); gate.restore(); lab.dispose(); }
});
