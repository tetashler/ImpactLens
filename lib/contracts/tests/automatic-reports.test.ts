import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import type {PublicExplore} from '../../society/public-contract.ts';
import {projectReportEvidence, reportSnapshotPayload} from '../../report-summary/evidence.ts';
import {detailedReportSnapshotPayload} from '../../report-detailed/contract.ts';
import {prepareAutomaticReports} from '../../report-detailed/automatic.ts';

let serial = 0;
function run(): PublicExplore {
  const id = `automatic-${++serial}`;
  return {
    version: 3, kind: 'summary-execution', attemptId: id, requestIdentity: id, runId: id,
    planId: null, question: 'What changes for commuters?', status: 'completed', request: null,
    graph: {version: 1, scenarioIdentity: id, nodes: [], edges: [], limitations: []},
    inspections: {}, roles: [], initialActions: [], assumptions: [], limitations: [], sources: [],
    accounting: {planningCalls: 0, actionCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0},
    demographics: null, session: {id, token: `secret-${id}`, revision: 1}, society: null,
    job: {version: 1, id, status: 'completed', tick: 4, totalSteps: 4, acceptedDecisions: 0,
      participatingAgents: 0, capacity: 4, admittedCalls: 0, remainingCalls: 0, reason: null, revision: 1},
  };
}
function society(value: PublicExplore, phase: NonNullable<PublicExplore['society']>['phase']): NonNullable<PublicExplore['society']> {
  return {version: 2, runId: value.runId, worldId: value.runId, phase, tick: 4, totalSteps: 4, minutes: 60,
    counts: {agents: 0, events: 0, seeds: 0, modelEvents: 0, ruleEvents: 0, failureEvents: 0},
    platforms: [], groups: [], agents: [], links: [], limitations: [],
    usage: {calls: 0, skipped: 0, accepted: 0, failed: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, unknownReservedUsd: 0},
    map: {version: 1, worldId: value.runId, tick: 4, sourceHash: null, unlocated: 0, limitation: 'Fictional context.', features: {type: 'FeatureCollection', features: []}},
  };
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function keys(value: PublicExplore) {
  return {summary: hash(reportSnapshotPayload(projectReportEvidence(value))), detailed: hash(detailedReportSnapshotPayload(value))};
}
function artifacts(value: PublicExplore) {
  const snapshot = keys(value);
  const common = {version: 1, runId: value.runId, generatedAt: '2026-11-02T10:00:00.000Z'};
  return {
    summary: {...common, snapshotKey: snapshot.summary, sections: {findings: 'Initial views only.', agreements: 'Unknown.', disagreements: 'Unknown.', concerns: 'Unknown.', unknowns: 'Unknown.'}},
    detailed: {...common, snapshotKey: snapshot.detailed, question: value.question, runStatus: value.status,
      sections: {assessment: 'Initial views only.', impacts: 'Unknown.', perspectives: 'Unknown.', tradeoffs: 'Unknown.', developments: 'Unknown.', nextSteps: 'Unknown.'}},
  };
}
function memoryStorage() {
  const data = new Map<string, string>();
  return {data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => {data.set(key, value);}};
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {status, headers: {'Content-Type': 'application/json'}});
function server(value: PublicExplore, options: {cached?: boolean; failSummary?: boolean; staleSummary?: boolean} = {}) {
  const calls: {kind: 'summary' | 'detailed'; method: string; init: RequestInit}[] = [];
  const snapshot = keys(value), saved = artifacts(value);
  const fetcher: typeof fetch = async (input, init = {}) => {
    const url = String(input), kind = url.includes('/summary') ? 'summary' : 'detailed';
    const method = init.method ?? 'GET';
    calls.push({kind, method, init});
    assert.equal(new Headers(init.headers).get('Authorization'), `Bearer ${value.session!.token}`);
    if (method === 'GET') {
      assert.equal(init.cache, 'no-store');
      assert.equal(new URL(url, 'http://localhost').searchParams.get('runId'), value.runId);
      return json({snapshotKey: options.staleSummary && kind === 'summary' ? 'a'.repeat(64) : snapshot[kind],
        [kind === 'summary' ? 'summary' : 'report']: options.cached ? saved[kind] : null});
    }
    assert.deepEqual(JSON.parse(String(init.body)), {runId: value.runId, snapshotKey: snapshot[kind]});
    if (options.failSummary && kind === 'summary') return json({message: 'Writer unavailable.'}, 503);
    return json({[kind === 'summary' ? 'summary' : 'report']: saved[kind]});
  };
  return {calls, fetcher};
}

test('initial execution completion and interrupted jobs never request reports', async () => {
  for (const status of ['running', 'paused', 'cancelled', 'failed', 'budget-limited', 'capacity-limited'] as const) {
    const value = run(); value.job!.status = status;
    const api = server(value);
    const result = await prepareAutomaticReports(value, {fetcher: api.fetcher, storage: memoryStorage()});
    assert.equal(result.stage, 'idle');
    assert.equal(api.calls.length, 0);
  }
  for (const phase of ['preparing', 'simulating', 'summarising', 'partial', 'failed'] as const) {
    const value = run(); delete value.job; value.society = society(value, phase);
    const api = server(value);
    await prepareAutomaticReports(value, {fetcher: api.fetcher, storage: memoryStorage()});
    assert.equal(api.calls.length, 0);
  }
  for (const change of [(value: PublicExplore) => {delete value.job;}, (value: PublicExplore) => {value.storage = {version: 1, policy: 'storage-admission-v1', disposition: 'historical-read-only'};}]) {
    const value = run(); change(value); const api = server(value);
    await prepareAutomaticReports(value, {fetcher: api.fetcher, storage: memoryStorage()});
    assert.equal(api.calls.length, 0);
  }
});

test('a completed legacy society and an authoritative completed job both allow automatic generation', async () => {
  const legacy = run(); delete legacy.job; legacy.society = society(legacy, 'completed');
  const authoritative = run(); authoritative.society = society(authoritative, 'partial');
  for (const value of [legacy, authoritative]) {
    const api = server(value);
    const result = await prepareAutomaticReports(value, {fetcher: api.fetcher, storage: memoryStorage()});
    assert.equal(result.summary, 'available'); assert.equal(result.detailed, 'available');
    assert.equal(api.calls.length, 4);
  }
});

test('finished simulations prepare the summary before the detailed report with minimal authenticated requests', async () => {
  const value = run(), api = server(value), storage = memoryStorage();
  const stages: string[] = [], changed: string[] = [];
  const result = await prepareAutomaticReports(value, {fetcher: api.fetcher, storage,
    onChange: (state, kind) => {stages.push(state.stage); if (kind) changed.push(kind);}});
  assert.deepEqual(api.calls.map(call => `${call.method} ${call.kind}`), ['GET summary', 'POST summary', 'GET detailed', 'POST detailed']);
  assert.deepEqual(changed, ['summary', 'detailed']);
  assert.ok(stages.indexOf('writing-summary') < stages.indexOf('writing-detailed'));
  assert.equal(result.stage, 'complete');
  assert.equal(result.summary, 'available'); assert.equal(result.detailed, 'available');
  assert.ok(!JSON.stringify([...storage.data]).includes(value.session!.token));
});

test('valid matching saved artifacts require authenticated reads and no generation', async () => {
  const value = run(), api = server(value, {cached: true});
  const result = await prepareAutomaticReports(value, {fetcher: api.fetcher, storage: memoryStorage()});
  assert.deepEqual(api.calls.map(call => `${call.method} ${call.kind}`), ['GET summary', 'GET detailed']);
  assert.equal(result.summary, 'available'); assert.equal(result.detailed, 'available');
});

test('a failed summary still allows detailed generation and is never automatically retried after recreation', async () => {
  const value = run(), api = server(value, {failSummary: true}), storage = memoryStorage();
  const first = await prepareAutomaticReports(value, {fetcher: api.fetcher, storage});
  assert.equal(first.summary, 'failed'); assert.equal(first.detailed, 'available');
  assert.equal(first.errors.summary, 'Writer unavailable.');
  const recreated = await import(new URL('../../report-detailed/automatic.ts?recreated-session', import.meta.url).href);
  await recreated.prepareAutomaticReports(value, {fetcher: api.fetcher, storage});
  assert.equal(api.calls.filter(call => call.method === 'POST' && call.kind === 'summary').length, 1);
  assert.equal(api.calls.filter(call => call.method === 'POST' && call.kind === 'detailed').length, 1);
});

test('concurrent observers share one generation sequence', async () => {
  const value = run(), api = server(value), storage = memoryStorage();
  let joined = 0, release!: () => void;
  const bothObserving = new Promise<void>(resolve => {release = resolve;});
  const onChange = () => {
    let observed = false;
    return () => {if (!observed) {observed = true; if (++joined === 2) release();}};
  };
  const fetcher: typeof fetch = async (input, init) => {await bothObserving; return api.fetcher(input, init);};
  const [first, second] = await Promise.all([
    prepareAutomaticReports(value, {fetcher, storage, onChange: onChange()}),
    prepareAutomaticReports(value, {fetcher, storage, onChange: onChange()}),
  ]);
  assert.equal(first.summary, 'available'); assert.equal(second.detailed, 'available');
  assert.equal(api.calls.length, 4);
});

test('a stale server snapshot cannot trigger summary generation', async () => {
  const value = run(), api = server(value, {staleSummary: true});
  const result = await prepareAutomaticReports(value, {fetcher: api.fetcher, storage: memoryStorage()});
  assert.equal(result.summary, 'failed');
  assert.ok(!api.calls.some(call => call.kind === 'summary' && call.method === 'POST'));
  assert.equal(result.detailed, 'available');
});

test('a changed credential cannot reuse an in-flight authenticated read', async () => {
  const value = run(), next = structuredClone(value); next.session!.token = 'replacement-secret';
  const first = server(value, {cached: true}), second = server(next, {cached: true});
  await Promise.all([prepareAutomaticReports(value, {fetcher: first.fetcher, storage: memoryStorage()}), prepareAutomaticReports(next, {fetcher: second.fetcher, storage: memoryStorage()})]);
  assert.equal(first.calls.length, 2); assert.equal(second.calls.length, 2);
});

test('aborting a stale read prevents generation and notifications', async () => {
  const value = run(), controller = new AbortController();
  let reached!: () => void, release!: (response: Response) => void;
  const reading = new Promise<void>(resolve => {reached = resolve;});
  const response = new Promise<Response>(resolve => {release = resolve;});
  const calls: string[] = [], changed: string[] = [];
  const pending = prepareAutomaticReports(value, {storage: memoryStorage(), signal: controller.signal,
    fetcher: async (_input, init) => {calls.push(init?.method ?? 'GET'); reached(); return response;},
    onChange: (_state, kind) => {if (kind) changed.push(kind);}});
  await reading; controller.abort();
  release(json({snapshotKey: keys(value).summary, summary: null}));
  assert.equal((await pending).stage, 'cancelled');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ['GET']); assert.deepEqual(changed, []);
});

test('aborting one observer preserves the active observer and its shared request', async () => {
  const value = run(), api = server(value), storage = memoryStorage(), controller = new AbortController();
  let release!: () => void;
  const hold = new Promise<void>(resolve => {release = resolve;});
  const fetcher: typeof fetch = async (input, init) => {await hold; return api.fetcher(input, init);};
  const first = prepareAutomaticReports(value, {fetcher, storage, signal: controller.signal});
  let joined = false;
  const second = prepareAutomaticReports(value, {fetcher, storage, onChange: () => {
    if (!joined) {joined = true; controller.abort(); release();}
  }});
  const results = await Promise.all([first, second]);
  assert.equal(results[0].stage, 'cancelled');
  assert.equal(results[1].detailed, 'available');
  assert.equal(api.calls.length, 4);
});

test('an aborted dispatched generation remains attempted when a view remounts', async () => {
  const value = run(), storage = memoryStorage(), api = server(value), controller = new AbortController();
  let reached!: () => void, release!: () => void;
  const dispatch = new Promise<void>(resolve => {reached = resolve;});
  const hold = new Promise<void>(resolve => {release = resolve;});
  let posted = 0;
  const fetcher: typeof fetch = async (input, init) => {
    if (String(input).includes('/summary') && init?.method === 'POST') {posted++; reached(); await hold;}
    return api.fetcher(input, init);
  };
  const first = prepareAutomaticReports(value, {fetcher, storage, signal: controller.signal});
  await dispatch; controller.abort();
  const second = prepareAutomaticReports(value, {fetcher, storage});
  release(); await Promise.all([first, second]);
  assert.equal(posted, 1);
});

test('cancellation observed immediately before dispatch prevents a paid request', async () => {
  const value = run(), storage = memoryStorage(), api = server(value), controller = new AbortController();
  const result = await prepareAutomaticReports(value, {fetcher: api.fetcher, storage, signal: controller.signal,
    onChange: state => {if (state.stage === 'writing-summary') controller.abort();}});
  assert.equal(result.stage, 'cancelled');
  assert.ok(!api.calls.some(call => call.method === 'POST'));
});

test('a malformed or mismatched saved artifact never triggers a replacement paid request', async () => {
  const value = run(), api = server(value);
  const fetcher: typeof fetch = async (input, init) => {
    if (String(input).includes('/summary') && !init?.method) return json({snapshotKey: keys(value).summary, summary: {...artifacts(value).summary, runId: 'other-run'}});
    return api.fetcher(input, init);
  };
  const result = await prepareAutomaticReports(value, {fetcher, storage: memoryStorage()});
  assert.equal(result.summary, 'failed');
  assert.ok(!api.calls.some(call => call.kind === 'summary' && call.method === 'POST'));
});

test('an oversized detailed projection does not suppress a valid quick summary', async () => {
  const value = run();
  value.roles = Array.from({length: 24}, (_, index) => ({id: `role-${index}`, label: 'Stakeholder', goals: Array(6).fill('g'.repeat(500))}));
  value.assumptions = Array(24).fill('a'.repeat(800));
  value.limitations = Array(24).fill('l'.repeat(800));
  const key = hash(reportSnapshotPayload(projectReportEvidence(value)));
  const saved = {...artifacts({...value, roles: [], assumptions: [], limitations: []}).summary, snapshotKey: key};
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    assert.ok(String(input).includes('/summary'));
    calls.push(init?.method ?? 'GET');
    return json(init?.method === 'POST' ? {summary: saved} : {snapshotKey: key, summary: null});
  };
  const result = await prepareAutomaticReports(value, {fetcher, storage: memoryStorage()});
  assert.equal(result.summary, 'available');
  assert.equal(result.detailed, 'failed');
  assert.deepEqual(calls, ['GET', 'POST']);
});
