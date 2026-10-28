import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createScenarioPlan, SCENARIO_LIMITS, SCENARIO_PROVIDER_NOTICES, type ProviderStatus, type ScenarioRequest, type UserMapPoint } from '../../scenarios/contract.ts';
import { createScenarioFixtures } from '../../scenarios/fixtures.ts';
import { createScenarioPlanner, requestScenarioPlan, SCENARIO_EXAMPLES } from '../../scenarios/client.ts';

const question = 'What if a new Active Ageing Centre opened in Bukit Merah?';
const point: UserMapPoint = { id: 'site', lat: 1.287, lon: 103.824, provenance: 'user-provided' };
const request = (edits: Partial<ScenarioRequest> = {}): ScenarioRequest => ({ version: 1, clientRequestId: 'client-test', question, ...edits });

async function envelope(input: ScenarioRequest, status: ProviderStatus = 'not-configured') {
  const { aac } = await createScenarioFixtures();
  return {
    version: 1,
    requestId: `server-${input.clientRequestId}`,
    clientRequestId: input.clientRequestId,
    method: status === 'used' ? 'ai-assisted' : 'deterministic-fallback',
    providerStatus: status,
    plan: await createScenarioPlan(input, aac.interpretation),
  };
}

function deferredTransport() {
  const pending: { input: ScenarioRequest; signal: AbortSignal; resolve: (value: Response) => void; reject: (reason: unknown) => void }[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, '/api/scenarios/plan');
    assert.equal(init?.method, 'POST');
    return new Promise<Response>((resolve, reject) => pending.push({ input: JSON.parse(String(init?.body)), signal: init!.signal!, resolve, reject }));
  };
  async function finish(index: number) { pending[index].resolve(Response.json(await envelope(pending[index].input))); }
  return { fetcher, pending, finish };
}

test('client posts the exact validated request with same-origin credentials and accepts real fixture plans', async () => {
  const input = request({ selectedCategory: 'aac', mapPoints: [point] });
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, '/api/scenarios/plan');
    assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init?.headers).get('Content-Type'), 'application/json');
    assert.equal(init?.cache, 'no-store');
    assert.equal(init?.credentials, 'same-origin');
    assert.deepEqual(JSON.parse(String(init?.body)), input);
    return Response.json(await envelope(input));
  };
  const result = await requestScenarioPlan(input, { fetcher });
  assert.equal(result.plan.capabilityId, 'aac-accessibility-v1');
  assert.equal(result.plan.executionState, 'not-executed');
  assert.equal(result.plan.geographicRequirements[0].validatedForExecution, false);
  assert.deepEqual(result.plan.request, input);
});

test('client rejects invalid or byte-oversized requests before making an HTTP request', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; throw new Error('Must not send invalid input'); };
  const invalid = [
    request({ question: ' ' }), request({ question: 'x'.repeat(2001) }),
    request({ mapPoints: [{ ...point, lat: 9 }] }),
    request({ mapPoints: [point, point] }),
    request({ mapPoints: Array.from({ length: 13 }, (_, i) => ({ ...point, id: `p${i}` })) }),
    { ...request(), selectedCategory: 'invented' },
    { ...request(), execution: 'calculated' },
    request({ question: 'x'.repeat(SCENARIO_LIMITS.bodyBytes + 1) }),
  ];
  for (const input of invalid) await assert.rejects(requestScenarioPlan(input as ScenarioRequest, { fetcher }), /question|input|large|valid/i);
  assert.equal(calls, 0);
});

test('client validates the actual response token, exact inputs and content-derived hash', async () => {
  const input = request();
  const valid = await envelope(input);
  for (const value of [
    { ...valid, clientRequestId: 'wrong-token' },
    await envelope(request({ clientRequestId: 'wrong-token' })),
    await envelope(request({ question: 'A different question' })),
    await envelope(request({ selectedCategory: 'mrt' })),
    await envelope(request({ mapPoints: [point] })),
    { ...valid, plan: { ...valid.plan, planId: `plan-${'0'.repeat(64)}` } },
    { ...valid, plan: { ...valid.plan, readiness: 'ready' } },
  ]) await assert.rejects(requestScenarioPlan(input, { fetcher: async () => Response.json(value) }), /valid|response/i);
});

test('provider fallback notices survive validation without requiring a browser API key', async () => {
  for (const status of ['not-configured', 'unavailable', 'invalid-response', 'not-needed', 'used'] as const) {
    const result = await requestScenarioPlan(request(), { fetcher: async () => Response.json(await envelope(request(), status)) });
    assert.equal(result.providerStatus, status);
    assert.match(SCENARIO_PROVIDER_NOTICES[result.providerStatus], /deterministic|validated AI/i);
    assert.equal(result.plan.executionState, 'not-executed');
  }
});

test('HTTP and transport failures expose controlled errors without echoing server or provider details', async () => {
  const secret = 'private-key-provider-path';
  for (const status of [400, 403, 409, 413, 415, 429, 500, 503]) {
    await assert.rejects(requestScenarioPlan(request(), { fetcher: async () => new Response(secret, { status }) }), error => {
      assert.ok(error instanceof Error);
      assert.ok(error.message.length > 0);
      assert.ok(!error.message.includes(secret));
      return true;
    });
  }
  await assert.rejects(requestScenarioPlan(request(), { fetcher: async () => { throw new Error(secret); } }), error => error instanceof Error && !error.message.includes(secret));
});

test('malformed, oversized and non-JSON successful responses cannot become plans', async () => {
  const input = request();
  for (const response of [
    new Response('{', { headers: { 'Content-Type': 'application/json' } }),
    new Response(JSON.stringify(await envelope(input))),
    new Response('x'.repeat(SCENARIO_LIMITS.responseBytes + 1), { headers: { 'Content-Type': 'application/json' } }),
    new Response('{}', { headers: { 'Content-Type': 'application/json', 'Content-Length': String(SCENARIO_LIMITS.responseBytes + 1) } }),
  ]) await assert.rejects(requestScenarioPlan(input, { fetcher: async () => response }), /valid|response|large/i);
});

test('response streaming stops at the byte limit instead of reading the whole body', async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(new Uint8Array(8192)); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(requestScenarioPlan(request(), { fetcher: async () => new Response(body, { headers: { 'Content-Type': 'application/json' } }) }), /valid|response|large/i);
  assert.equal(cancelled, true);
});

test('edits and examples only compose inputs; submit alone starts a new UUID-correlated request', async () => {
  const transport = deferredTransport();
  const planner = createScenarioPlanner({ fetcher: transport.fetcher });
  for (const example of SCENARIO_EXAMPLES) {
    planner.setQuestion(example.question);
    planner.setCategory(example.category);
  }
  planner.setQuestion(question);
  planner.setCategory('aac');
  planner.setMapPoints([point]);
  assert.equal(transport.pending.length, 0);
  const pending = planner.submit();
  assert.equal(transport.pending.length, 1);
  assert.match(transport.pending[0].input.clientRequestId, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.equal(planner.getSnapshot().busy, true);
  assert.equal(planner.getSnapshot().submittedQuestion, question);
  await transport.finish(0);
  await pending;
  assert.equal(planner.getSnapshot().busy, false);
  assert.equal(planner.getSnapshot().response?.plan.capabilityId, 'aac-accessibility-v1');
});

test('invalid submission reports a safe validation error and preserves the submitted question for chat', async () => {
  const transport = deferredTransport();
  const planner = createScenarioPlanner({ fetcher: transport.fetcher });
  planner.setQuestion('x'.repeat(2001));
  await planner.submit();
  assert.equal(transport.pending.length, 0);
  assert.equal(planner.getSnapshot().submittedQuestion, 'x'.repeat(2001));
  assert.match(planner.getSnapshot().error!, /question|valid|input/i);
  assert.equal(planner.getSnapshot().busy, false);
  planner.setQuestion(question);
  assert.equal(planner.getSnapshot().error, null);
});

test('question, category and map edits synchronously clear prior assessment and abort pending requests', async () => {
  for (const edit of [
    (planner: ReturnType<typeof createScenarioPlanner>) => planner.setQuestion('A different question'),
    (planner: ReturnType<typeof createScenarioPlanner>) => planner.setCategory('mrt'),
    (planner: ReturnType<typeof createScenarioPlanner>) => planner.setMapPoints([{ ...point, lat: 1.29 }]),
  ]) {
    const transport = deferredTransport();
    const planner = createScenarioPlanner({ fetcher: transport.fetcher });
    planner.setQuestion(question);
    const initial = planner.submit(); await transport.finish(0); await initial;
    assert.ok(planner.getSnapshot().response);
    const pending = planner.submit();
    edit(planner);
    assert.equal(transport.pending[1].signal.aborted, true);
    assert.equal(planner.getSnapshot().response, null);
    assert.equal(planner.getSnapshot().busy, false);
    assert.equal(planner.getSnapshot().error, null);
    await transport.finish(1); await pending;
    assert.equal(planner.getSnapshot().response, null);
  }
});

test('input revisions reject a late A to B to A result even when abort is ignored', async () => {
  const transport = deferredTransport();
  const planner = createScenarioPlanner({ fetcher: transport.fetcher });
  planner.setQuestion(question);
  const pending = planner.submit();
  planner.setQuestion('B'); planner.setQuestion(question);
  await transport.finish(0); await pending;
  assert.equal(planner.getSnapshot().response, null);
  assert.equal(planner.getSnapshot().error, null);
  assert.equal(planner.getSnapshot().busy, false);
});

test('a repeated attempt rejects older success and error without clearing current loading state', async () => {
  for (const olderFails of [false, true]) {
    const transport = deferredTransport();
    const planner = createScenarioPlanner({ fetcher: transport.fetcher });
    planner.setQuestion(question);
    const old = planner.submit(); const current = planner.submit();
    assert.notEqual(transport.pending[0].input.clientRequestId, transport.pending[1].input.clientRequestId);
    assert.equal(transport.pending[0].signal.aborted, true);
    if (olderFails) transport.pending[0].reject(new Error('private old provider failure'));
    else await transport.finish(0);
    await old;
    assert.equal(planner.getSnapshot().busy, true);
    assert.equal(planner.getSnapshot().error, null);
    assert.equal(planner.getSnapshot().response, null);
    await transport.finish(1); await current;
    assert.equal(planner.getSnapshot().response?.clientRequestId, transport.pending[1].input.clientRequestId);
  }
});

test('reset and mode/context invalidation discard late results and keep cancellation silent', async () => {
  for (const action of ['reset', 'invalidate'] as const) {
    const transport = deferredTransport();
    const planner = createScenarioPlanner({ fetcher: transport.fetcher });
    planner.setQuestion(question); planner.setCategory('aac'); planner.setMapPoints([point]);
    const pending = planner.submit();
    planner[action]();
    assert.equal(transport.pending[0].signal.aborted, true);
    assert.equal(planner.getSnapshot().busy, false);
    assert.equal(planner.getSnapshot().error, null);
    await transport.finish(0); await pending;
    assert.equal(planner.getSnapshot().response, null);
    if (action === 'reset') {
      assert.equal(planner.getSnapshot().question, '');
      assert.equal(planner.getSnapshot().category, undefined);
      assert.equal(planner.getSnapshot().mapPoints, undefined);
      assert.equal(planner.getSnapshot().submittedQuestion, null);
    } else assert.equal(planner.getSnapshot().question, question);
  }
});

test('semantically identical point objects retain the current attempt and input arrays are detached', async () => {
  const transport = deferredTransport();
  const planner = createScenarioPlanner({ fetcher: transport.fetcher });
  planner.setQuestion(question);
  const points = [{ ...point }]; planner.setMapPoints(points);
  const pending = planner.submit();
  points[0].lat = 1.4;
  planner.setMapPoints([{ provenance: 'user-provided', lon: 103.824, lat: 1.287, id: 'site' }]);
  assert.equal(transport.pending[0].signal.aborted, false);
  await transport.finish(0); await pending;
  assert.equal(planner.getSnapshot().response?.plan.request.mapPoints?.[0].lat, 1.287);
});

test('store subscriptions publish lifecycle changes and unsubscription stops notifications', async () => {
  const transport = deferredTransport();
  const planner = createScenarioPlanner({ fetcher: transport.fetcher });
  const snapshots: boolean[] = [];
  const unsubscribe = planner.subscribe(() => snapshots.push(planner.getSnapshot().busy));
  planner.setQuestion(question);
  const pending = planner.submit(); await transport.finish(0); await pending;
  assert.deepEqual(snapshots, [false, true, false]);
  unsubscribe(); planner.reset();
  assert.deepEqual(snapshots, [false, true, false]);
});

test('planner and hook import graph stays browser-safe and cannot reach provider configuration', () => {
  const seen = new Set<string>();
  function inspect(path: string) {
    if (seen.has(path)) return;
    seen.add(path);
    const code = readFileSync(path, 'utf8');
    assert.doesNotMatch(code, /\bprocess\.env\b|\bnode:|lib\/server|\/server\/|\.aws|apiKey|OPENROUTER_API_KEY|GEMINI_API_KEY/);
    for (const match of code.matchAll(/(?:from\s+|import\s*\()['"]([^'"]+)['"]/g)) {
      if (match[1] === 'react') continue;
      assert.ok(match[1].startsWith('.'), `Unexpected browser dependency: ${match[1]}`);
      inspect(resolve(dirname(path), match[1]));
    }
  }
  inspect(resolve('lib/scenarios/client.ts'));
  inspect(resolve('components/use-scenario-planner.ts'));
});
