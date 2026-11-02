import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import type {PublicExplore} from '../../society/public-contract.ts';
import {graphSummarySnapshotPayload, type GraphNodeSummaries} from '../../graph-summary/contract.ts';
import {prepareAutomaticGraphSummaries} from '../../graph-summary/automatic.ts';

let serial = 0;
function run(count = 25): PublicExplore {
  const id = `graph-auto-${++serial}`;
  return {version: 3, kind: 'summary-execution', attemptId: id, requestIdentity: id, runId: id,
    planId: null, question: 'What changes for commuters?', status: 'completed', request: null,
    graph: {version: 1, scenarioIdentity: id, nodes: Array.from({length: count}, (_, i) => ({id: `node-${i}`, label: `Node ${i}`,
      category: 'population', description: 'Public scenario context.', provenance: {kind: 'synthetic-exploratory', reference: 'Scenario'}, properties: {}, limitations: []})), edges: [], limitations: []},
    inspections: {}, roles: [], initialActions: [], assumptions: [], limitations: [], sources: [],
    accounting: {planningCalls: 0, actionCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0}, demographics: null,
    session: {id, token: `secret-${id}`, revision: 1}, society: null,
    job: {version: 1, id, status: 'completed', tick: 4, totalSteps: 4, acceptedDecisions: 0, participatingAgents: 0,
      capacity: 4, admittedCalls: 0, remainingCalls: 0, reason: null, revision: 1}};
}
const key = (value: PublicExplore) => createHash('sha256').update(graphSummarySnapshotPayload(value)).digest('hex');
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {status, headers: {'Content-Type': 'application/json'}});
function artifact(value: PublicExplore, count: number): GraphNodeSummaries {
  return {version: 1, runId: value.runId, snapshotKey: key(value), totalNodes: value.graph.nodes.length,
    generatedAt: '2026-11-02T12:00:00.000Z', summaries: value.graph.nodes.slice(0, count).map(node => ({nodeId: node.id, summary: `${node.label} has public scenario context.`}))};
}
function memoryStorage() {
  const data = new Map<string, string>();
  return {data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => {data.set(key, value);}};
}
function server(value: PublicExplore, initial = 0) {
  const calls: {method: string; init: RequestInit}[] = [];
  let count = initial;
  const fetcher: typeof fetch = async (input, init = {}) => {
    const method = init.method ?? 'GET'; calls.push({method, init});
    assert.equal(new Headers(init.headers).get('Authorization'), `Bearer ${value.session!.token}`);
    if (method === 'GET') {
      assert.equal(new URL(String(input), 'http://localhost').searchParams.get('runId'), value.runId);
      assert.equal(init.cache, 'no-store');
    } else {
      assert.deepEqual(JSON.parse(String(init.body)), {runId: value.runId, snapshotKey: key(value)});
      assert.equal(init.signal, undefined);
      count = Math.min(count + 12, value.graph.nodes.length);
    }
    return json({snapshotKey: key(value), totalNodes: value.graph.nodes.length, artifact: count ? artifact(value, count) : null,
      complete: count === value.graph.nodes.length});
  };
  return {fetcher, calls};
}

test('completed runs prepare all 25 nodes in sequential bounded batches and retain visible progress', async () => {
  const value = run(), api = server(value), storage = memoryStorage(), progress: number[] = [];
  const result = await prepareAutomaticGraphSummaries(value, {fetcher: api.fetcher, storage,
    onChange: state => {if (state.artifact) progress.push(state.artifact.summaries.length);}});
  assert.equal(result.phase, 'complete'); assert.equal(result.artifact?.summaries.length, 25);
  assert.deepEqual(api.calls.map(call => call.method), ['GET', 'POST', 'POST', 'POST']);
  assert.ok(progress.includes(12) && progress.includes(24) && progress.includes(25));
  assert.ok(!JSON.stringify([...storage.data]).includes(value.session!.token));
});

test('cached complete results use authenticated reads while paused runs never generate', async () => {
  const value = run(); value.job!.status = 'paused';
  const api = server(value, 25), result = await prepareAutomaticGraphSummaries(value, {fetcher: api.fetcher, storage: memoryStorage()});
  assert.equal(result.phase, 'complete'); assert.deepEqual(api.calls.map(call => call.method), ['GET']);
  const partial = run(); partial.job!.status = 'paused'; const missing = server(partial, 12);
  const waiting = await prepareAutomaticGraphSummaries(partial, {fetcher: missing.fetcher, storage: memoryStorage()});
  assert.equal(waiting.artifact?.summaries.length, 12); assert.equal(waiting.phase, 'idle');
  assert.deepEqual(missing.calls.map(call => call.method), ['GET']);
});

test('updating simulations do not project, hash, or read graph summaries until they settle', async () => {
  const value = run(); value.job!.status = 'running';
  // A live graph can change on each tick. It must not even be projected while updating.
  Object.defineProperty(value, 'graph', {get() {throw Error('Updating graph was projected.');}, configurable: true});
  let reads = 0;
  const running = await prepareAutomaticGraphSummaries(value, {fetcher: async () => {reads++; throw Error('Unexpected read.');}, storage: memoryStorage()});
  assert.equal(running.phase, 'idle'); assert.equal(running.snapshotKey, null); assert.equal(reads, 0);
  const legacy = run(); delete legacy.job;
  for (const phase of ['preparing', 'simulating', 'summarising'] as const) {
    legacy.society = {phase} as PublicExplore['society'];
    const api = server(legacy);
    const result = await prepareAutomaticGraphSummaries(legacy, {fetcher: api.fetcher, storage: memoryStorage()});
    assert.equal(result.phase, 'idle'); assert.equal(api.calls.length, 0);
  }
});

test('authoritative job status prevents generation even if society reports completion', async () => {
  for (const status of ['running', 'paused', 'cancelled', 'failed', 'budget-limited', 'capacity-limited'] as const) {
    const value = run(); value.job!.status = status;
    value.society = {phase: 'completed'} as PublicExplore['society'];
    const api = server(value);
    await prepareAutomaticGraphSummaries(value, {fetcher: api.fetcher, storage: memoryStorage()});
    if (status === 'running') assert.equal(api.calls.length, 0);
    else assert.ok(api.calls.every(call => call.method === 'GET'));
  }
  const historical = run(); historical.storage = {version: 1, policy: 'storage-admission-v1', disposition: 'historical-read-only'};
  const api = server(historical); await prepareAutomaticGraphSummaries(historical, {fetcher: api.fetcher, storage: memoryStorage()});
  assert.ok(api.calls.every(call => call.method === 'GET'));
});

test('a failed batch keeps partial summaries and requires explicit retry across remount and session recreation', async () => {
  const value = run(), api = server(value), storage = memoryStorage(); let posts = 0, failed = true;
  const fetcher: typeof fetch = async (input, init) => {
    if (init?.method === 'POST' && ++posts === 2 && failed) return json({message: 'Writer unavailable.'}, 503);
    return api.fetcher(input, init);
  };
  const first = await prepareAutomaticGraphSummaries(value, {fetcher, storage});
  assert.equal(first.phase, 'error'); assert.equal(first.artifact?.summaries.length, 12);
  const recreated = await import(new URL('../../graph-summary/automatic.ts?recreated', import.meta.url).href);
  const second = await recreated.prepareAutomaticGraphSummaries(value, {fetcher, storage});
  assert.equal(second.phase, 'error'); assert.equal(posts, 2);
  failed = false;
  const retried = await prepareAutomaticGraphSummaries(value, {fetcher, storage, retry: true});
  assert.equal(retried.phase, 'complete'); assert.equal(posts, 4);
});

test('concurrent observers share one authenticated sequence but replacement credentials do not', async () => {
  const value = run(), api = server(value), storage = memoryStorage();
  const results = await Promise.all([prepareAutomaticGraphSummaries(value, {fetcher: api.fetcher, storage}),
    prepareAutomaticGraphSummaries(value, {fetcher: api.fetcher, storage})]);
  assert.ok(results.every(result => result.phase === 'complete')); assert.equal(api.calls.length, 4);
  const changed = structuredClone(value); changed.session!.token = 'replacement'; const other = server(changed, 25);
  assert.equal((await prepareAutomaticGraphSummaries(changed, {fetcher: other.fetcher, storage})).phase, 'complete');
  assert.equal(other.calls.length, 1);
});

test('invalid saved envelopes never trigger a replacement paid request', async () => {
  for (const change of [
    (body: any) => {body.snapshotKey = 'a'.repeat(64);},
    (body: any) => {body.totalNodes++;},
    (body: any) => {body.artifact.runId = 'other';},
    (body: any) => {body.artifact.summaries[0].nodeId = 'unknown';},
    (body: any) => {body.artifact.summaries.push(body.artifact.summaries[0]);},
    (body: any) => {body.complete = true;},
  ]) {
    const value = run(), calls: string[] = [];
    const fetcher: typeof fetch = async (_input, init) => {calls.push(init?.method ?? 'GET');
      const body = {snapshotKey: key(value), totalNodes: 25, artifact: artifact(value, 12), complete: false}; change(body); return json(body);};
    const result = await prepareAutomaticGraphSummaries(value, {fetcher, storage: memoryStorage()});
    assert.equal(result.phase, 'error'); assert.deepEqual(calls, ['GET']);
  }
});

test('a nonprogressing or rewritten batch is rejected without losing previously validated summaries', async () => {
  for (const rewrite of [false, true]) {
    const value = run(), api = server(value, 12); let posts = 0;
    const fetcher: typeof fetch = async (input, init) => {
      if (init?.method !== 'POST') return api.fetcher(input, init);
      posts++; const saved = artifact(value, rewrite ? 24 : 12);
      if (rewrite) saved.summaries[0].summary = 'Changed previous summary.';
      return json({snapshotKey: key(value), totalNodes: 25, artifact: saved, complete: false});
    };
    const result = await prepareAutomaticGraphSummaries(value, {fetcher, storage: memoryStorage()});
    assert.equal(result.phase, 'error'); assert.equal(result.artifact?.summaries.length, 12); assert.equal(posts, 1);
  }
});

test('aborting stale observers prevents followup dispatch while keeping an already dispatched POST alive', {timeout: 2000}, async () => {
  const value = run(), api = server(value), controller = new AbortController(), storage = memoryStorage();
  let reached!: () => void, release!: () => void;
  const dispatched = new Promise<void>(resolve => {reached = resolve;}), hold = new Promise<void>(resolve => {release = resolve;});
  const fetcher: typeof fetch = async (input, init) => {if (init?.method === 'POST') {reached(); await hold;} return api.fetcher(input, init);};
  const pending = prepareAutomaticGraphSummaries(value, {fetcher, storage, signal: controller.signal});
  await dispatched; controller.abort(); await pending; release();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(api.calls.map(call => call.method), ['GET', 'POST']);
  const next = await prepareAutomaticGraphSummaries(value, {fetcher: api.fetcher, storage});
  assert.equal(next.phase, 'complete'); assert.equal(next.artifact?.summaries.length, 25);
});

test('a detached stale read cannot publish summaries or dispatch after its response arrives', {timeout: 2000}, async () => {
  const value = run(), controller = new AbortController(), changes: string[] = [], calls: string[] = [];
  let reached!: () => void, release!: () => void;
  const reading = new Promise<void>(resolve => {reached = resolve;}), hold = new Promise<void>(resolve => {release = resolve;});
  const fetcher: typeof fetch = async (_input, init) => {
    calls.push(init?.method ?? 'GET'); reached(); await hold;
    return json({snapshotKey: key(value), totalNodes: 25, artifact: null, complete: false});
  };
  const pending = prepareAutomaticGraphSummaries(value, {fetcher, signal: controller.signal, storage: memoryStorage(),
    onChange: state => {changes.push(state.phase);}});
  await reading; controller.abort(); await pending;
  const count = changes.length; release(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(changes.length, count); assert.deepEqual(calls, ['GET']);
});

test('one cancelled observer does not cancel the other observer sharing its sequence', {timeout: 2000}, async () => {
  const value = run(), api = server(value), controller = new AbortController(), storage = memoryStorage();
  let release!: () => void;
  const hold = new Promise<void>(resolve => {release = resolve;});
  const fetcher: typeof fetch = async (input, init) => {await hold; return api.fetcher(input, init);};
  const first = prepareAutomaticGraphSummaries(value, {fetcher, storage, signal: controller.signal});
  const second = prepareAutomaticGraphSummaries(value, {fetcher, storage, onChange: () => {controller.abort(); release();}});
  const results = await Promise.all([first, second]);
  assert.equal(results[0].phase, 'idle'); assert.equal(results[1].phase, 'complete');
  assert.deepEqual(api.calls.map(call => call.method), ['GET', 'POST', 'POST', 'POST']);
});

test('cancellation immediately before dispatch makes no paid request', async () => {
  const value = run(), api = server(value), controller = new AbortController();
  await prepareAutomaticGraphSummaries(value, {fetcher: api.fetcher, storage: memoryStorage(), signal: controller.signal,
    onChange: state => {if (state.phase === 'generating') controller.abort();}});
  assert.deepEqual(api.calls.map(call => call.method), ['GET']);
});
