import test from 'node:test';
import assert from 'node:assert/strict';
import { runStakeholderSimulation } from '../../stakeholder-simulation/engine.ts';
import { verifyLinkedStakeholderRun } from '../../stakeholder-simulation/experiment-bridge.ts';
import type { StakeholderSimulationInputV1 } from '../../stakeholder-simulation/contract.ts';

const geometry = { version: 1 as const, scenarioId: 'automatic-question-test', features: [] };
const question = 'What if Singapore left ASEAN?';
async function api() {
  const value = await import('../../question-simulation/client.ts').catch(() => null);
  assert.ok(value, 'The automatic question simulation controller must exist');
  return value;
}
type Pending = { body: { version: 1; attemptId: string; input: StakeholderSimulationInputV1 }; resolve: (response: Response) => void };
function delayedNetwork() {
  const pending: Pending[] = [];
  const observers = new Set<() => void>();
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, '/api/stakeholder-simulate');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.input.simulationOptions.mode, 'deterministic-demo');
    return new Promise(resolve => { pending.push({ body, resolve }); for (const observer of observers) observer(); });
  };
  return {
    pending, fetcher,
    waitFor(count: number) {
      if (pending.length >= count) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { observers.delete(check); reject(new Error(`Expected ${count} execution requests, received ${pending.length}`)); }, 3000);
        const check = () => { if (pending.length >= count) { clearTimeout(timer); observers.delete(check); resolve(); } };
        observers.add(check);
      });
    },
  };
}
async function answer(item: Pending) {
  // Deliberately ignore abort to prove the controller's acceptance gate, while
  // using the actual deterministic engine and its actual correlated envelope.
  const run = await runStakeholderSimulation(item.body.input, { attemptId: item.body.attemptId });
  item.resolve(Response.json({ version: 1, attemptId: item.body.attemptId, run }));
}
const realEngine: typeof fetch = async (url, init) => {
  assert.equal(url, '/api/stakeholder-simulate');
  const body = JSON.parse(String(init?.body));
  assert.equal(body.input.simulationOptions.mode, 'deterministic-demo');
  const run = await runStakeholderSimulation(body.input, { attemptId: body.attemptId, signal: init?.signal ?? undefined });
  return Response.json({ version: 1, attemptId: body.attemptId, run });
};

test('one question automatically prepares a truthful record and executes the real bounded deterministic ASEAN run', async () => {
  const { createQuestionSimulation } = await api();
  let calls = 0;
  const controller = createQuestionSimulation({ fetcher: async (...args) => { calls++; return realEngine(...args); } });
  const phases: string[] = [];
  controller.subscribe(() => phases.push(controller.getSnapshot().phase));
  controller.invalidate({ question, geometry, geometryRevision: 0 });
  assert.equal(controller.getSnapshot().phase, 'idle');
  assert.equal(calls, 0);
  const first = controller.start();
  assert.equal(controller.start(), first, 'duplicate submissions share the pending attempt');
  await first;
  const result = controller.getSnapshot();
  assert.equal(result.phase, 'completed');
  assert.equal(calls, 1);
  assert.equal(result.scope?.scope, 'international');
  assert.equal(result.scope?.intent, 'asean-withdrawal');
  assert.equal(result.run?.status, 'completed');
  assert.equal(result.run?.events.length, 18);
  assert.equal(result.run?.inputSnapshot.stakeholderRoles.length, 6);
  assert.equal(result.run?.inputSnapshot.simulationOptions.rounds, 3);
  assert.equal(result.run?.inputSnapshot.horizonYears, 5);
  assert.equal(result.record?.configuration.kind, 'asean');
  if (result.record?.configuration.kind === 'asean') {
    assert.equal(result.record.configuration.withdrawalTiming, 'immediate');
    assert.equal(result.record.configuration.tradeArrangements, 'unresolved');
  }
  assert.equal(result.record?.execution.status, 'not-executed');
  assert.equal(result.record?.evidence?.mode, 'verified-replay');
  assert.equal(result.record?.evidence?.sources.length, 2);
  assert.ok(result.linked);
  assert.equal((await verifyLinkedStakeholderRun(result.linked)).experiment?.experimentId, result.record?.experimentId);
  assert.ok(['interpreting', 'preparing', 'executing', 'completed'].every(phase => phases.includes(phase)));
  assert.equal(result.history.length, 1);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.history[0]));
  assert.equal(Reflect.set(result.history[0].record!, 'question', 'tampered'), false);
  controller.dispose();
});

test('tax, polyclinic and unrelated ASEAN questions prepare honest scope without stakeholder events', async () => {
  const { createQuestionSimulation } = await api();
  let calls = 0;
  const controller = createQuestionSimulation({ fetcher: async (...args) => { calls++; return realEngine(...args); } });
  for (const question of ['What if Singapore raised taxes?', 'What if a new polyclinic opened in Sengkang?', 'What does ASEAN do?', 'What if Singapore raised GST and left ASEAN?']) {
    controller.invalidate({ question, geometry, geometryRevision: 0 });
    await controller.start();
    const state = controller.getSnapshot();
    assert.equal(state.phase, 'unsupported', question);
    assert.ok(state.scope);
    assert.ok(state.plan);
    assert.ok(state.record);
    assert.equal(state.run, null);
    assert.equal(state.linked, null);
    assert.equal(state.record?.execution.status, 'not-executed');
    assert.ok(state.record?.evidence?.unknowns.length);
    if (/ASEAN/.test(question)) assert.equal(state.record?.configuration.kind, 'generic');
  }
  assert.equal(calls, 0);
  controller.dispose();
});

test('MRT and AAC questions hand off to map review without auto-running an unconfirmed engine', async () => {
  const { createQuestionSimulation } = await api();
  let calls = 0;
  const controller = createQuestionSimulation({ fetcher: async (...args) => { calls++; return realEngine(...args); } });
  for (const question of ['What if a new MRT line opened between Jurong and Sengkang?', 'What if a new AAC opened in Bukit Merah?']) {
    controller.invalidate({ question, geometry, geometryRevision: 0 });
    await controller.start();
    assert.equal(controller.getSnapshot().phase, 'needs-map-review');
    assert.equal(controller.getSnapshot().plan?.execution, 'calculated');
    assert.equal(controller.getSnapshot().run, null);
    assert.equal(controller.getSnapshot().record, null);
  }
  assert.equal(calls, 0);
  controller.dispose();
});

test('A to B to A and geometry revisions reject delayed earlier execution replies', async () => {
  const { createQuestionSimulation } = await api();
  const network = delayedNetwork();
  const controller = createQuestionSimulation({ fetcher: network.fetcher });
  controller.invalidate({ question, geometry, geometryRevision: 0 });
  const old = controller.start();
  await network.waitFor(1);
  controller.invalidate({ question: 'What if Singapore raised taxes?', geometry, geometryRevision: 0 });
  controller.invalidate({ question, geometry, geometryRevision: 1 });
  assert.equal(controller.getSnapshot().phase, 'idle');
  assert.equal(controller.getSnapshot().run, null);
  const current = controller.start();
  await network.waitFor(2);
  await answer(network.pending[1]);
  await current;
  const accepted = controller.getSnapshot().run?.runId;
  await answer(network.pending[0]);
  await old;
  assert.equal(controller.getSnapshot().run?.runId, accepted);
  assert.equal(controller.getSnapshot().record?.geometryContext?.revision, 1);
  assert.equal(controller.getSnapshot().history.length, 1);
  controller.dispose();
});

test('archive inspection cancels pending work without turning its saved events into current outcomes', async () => {
  const { createQuestionSimulation } = await api();
  const network = delayedNetwork();
  const controller = createQuestionSimulation({ fetcher: network.fetcher });
  controller.invalidate({ question, geometry, geometryRevision: 0 });
  const first = controller.start();
  await network.waitFor(1); await answer(network.pending[0]); await first;
  const archived = controller.getSnapshot().history[0];
  controller.invalidate({ question: 'What if Singapore were to leave ASEAN?', geometry, geometryRevision: 0 });
  const pending = controller.start();
  await network.waitFor(2);
  controller.inspectArchive(archived.id);
  await pending;
  assert.equal(controller.getSnapshot().phase, 'cancelled');
  assert.equal(controller.getSnapshot().selectedArchiveId, archived.id);
  assert.equal(controller.getSnapshot().run, null);
  assert.equal(controller.getSnapshot().history[0].run?.runId, archived.run?.runId);
  await answer(network.pending[1]);
  assert.equal(controller.getSnapshot().run, null);
  assert.equal(controller.getSnapshot().history.length, 1);
  controller.dispose();
});

test('cancellation and whole-pipeline timeout settle even while a preparation digest remains unresolved', async () => {
  const { createQuestionSimulation } = await api();
  const native = crypto.subtle.digest;
  const digest = native.bind(crypto.subtle);
  let release = () => {};
  let held = false;
  crypto.subtle.digest = (...args: Parameters<SubtleCrypto['digest']>) => {
    if (!held) { held = true; return new Promise((resolve, reject) => { release = () => { release = () => {}; digest(...args).then(resolve, reject); }; }); }
    return digest(...args);
  };
  const controller = createQuestionSimulation({ timeoutMs: 30, fetcher: realEngine });
  try {
    controller.invalidate({ question, geometry, geometryRevision: 0 });
    await controller.start();
    assert.equal(controller.getSnapshot().phase, 'error');
    assert.match(controller.getSnapshot().error ?? '', /timed out/i);
    assert.equal(controller.getSnapshot().run, null);
    controller.invalidate({ question: 'What if Singapore raised taxes?', geometry, geometryRevision: 0 });
    const retry = controller.start();
    controller.cancel();
    await retry;
    assert.equal(controller.getSnapshot().phase, 'cancelled');
    release();
    assert.equal(controller.getSnapshot().history.length, 0);
  } finally { release(); crypto.subtle.digest = native; controller.dispose(); }
});

test('terminal history is limited to four frozen snapshots and survives new drafts and disposal', async () => {
  const { createQuestionSimulation } = await api();
  const controller = createQuestionSimulation({ fetcher: realEngine });
  for (let index = 0; index < 5; index++) {
    controller.invalidate({ question: `What if Singapore raised tax policy ${index}?`, geometry, geometryRevision: 0 });
    await controller.start();
  }
  const before = controller.getSnapshot().history;
  assert.equal(before.length, 4);
  assert.equal(before[0].question, 'What if Singapore raised tax policy 4?');
  assert.equal(before[3].question, 'What if Singapore raised tax policy 1?');
  controller.invalidate({ question: 'A new draft', geometry, geometryRevision: 1 });
  assert.equal(controller.getSnapshot().phase, 'idle');
  assert.deepEqual(controller.getSnapshot().history, before);
  controller.dispose();
  assert.deepEqual(controller.getSnapshot().history, before);
});

test('StrictMode cleanup followed by the same context starts a fresh attempt and cannot resurrect old preparation', async () => {
  const { createQuestionSimulation } = await api();
  let calls = 0;
  const controller = createQuestionSimulation({ fetcher: async (...args) => { calls++; return realEngine(...args); } });
  const context = { question, geometry, geometryRevision: 0 };
  controller.invalidate(context);
  const obsolete = controller.start();
  const oldAttempt = controller.getSnapshot().attemptId;
  controller.dispose();
  controller.invalidate(context);
  const current = controller.start();
  assert.notEqual(controller.getSnapshot().attemptId, oldAttempt);
  await Promise.all([obsolete, current]);
  assert.equal(controller.getSnapshot().phase, 'completed');
  assert.equal(calls, 1);
  assert.equal(controller.getSnapshot().history.length, 1);
  controller.dispose();
});

test('an invalid execution envelope fails with a safe error and a fresh retry can complete', async () => {
  const { createQuestionSimulation } = await api();
  let first = true;
  const controller = createQuestionSimulation({ fetcher: async (...args) => {
    if (first) { first = false; return Response.json({ version: 1, attemptId: 'foreign-attempt', error: 'secret provider stack path' }); }
    return realEngine(...args);
  } });
  controller.invalidate({ question, geometry, geometryRevision: 0 });
  await controller.start();
  assert.equal(controller.getSnapshot().phase, 'error');
  assert.doesNotMatch(controller.getSnapshot().error ?? '', /secret|provider|stack|foreign/i);
  assert.equal(controller.getSnapshot().run, null);
  assert.equal(controller.getSnapshot().linked, null);
  assert.equal(controller.getSnapshot().history.length, 0);
  await controller.start();
  assert.equal(controller.getSnapshot().phase, 'completed');
  assert.equal(controller.getSnapshot().history.length, 1);
  controller.dispose();
});

test('repeating an identical context notification preserves the pending attempt', async () => {
  const { createQuestionSimulation } = await api();
  const network = delayedNetwork();
  const controller = createQuestionSimulation({ fetcher: network.fetcher });
  const context = { question, geometry, geometryRevision: 0 };
  controller.invalidate(context);
  const running = controller.start();
  await network.waitFor(1);
  const attempt = controller.getSnapshot().attemptId;
  controller.invalidate(structuredClone(context));
  assert.equal(controller.getSnapshot().attemptId, attempt);
  assert.equal(controller.start(), running);
  await answer(network.pending[0]); await running;
  assert.equal(controller.getSnapshot().phase, 'completed');
  assert.equal(network.pending.length, 1);
  controller.dispose();
});
