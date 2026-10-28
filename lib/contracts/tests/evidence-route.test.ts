import test from 'node:test';
import assert from 'node:assert/strict';

const body = { version: 1, clientRequestId: 'route-1', scenarioIdentity: 'scenario-route-1', question: 'What if Singapore leaves ASEAN?', topic: 'asean' };
async function route() {
  const module = await import('../../../app/api/evidence/research/route.ts').catch(() => null);
  assert.ok(module, 'The on-demand evidence research POST route must exist');
  return module;
}
function jsonRequest(value: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/evidence/research', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(value) });
}

test('POST returns a correlated verified replay with private no-store response headers', async () => {
  const r = await route();
  const response = await r.POST(jsonRequest(body));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  const result = await response.json();
  assert.equal(result.clientRequestId, body.clientRequestId);
  assert.equal(result.scenarioIdentity, body.scenarioIdentity);
  assert.equal(result.researchAttemptId, result.evidence.researchAttemptId);
  assert.equal(result.evidence.mode, 'verified-replay');
  assert.ok(result.evidence.limitations.length);
});

test('POST rejects malformed content, unsupported fields and bounded bodies using safe errors', async () => {
  const r = await route();
  const cases: [Request, number][] = [
    [jsonRequest(body, { 'content-type': 'text/plain' }), 415],
    [new Request('http://localhost/api/evidence/research', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{broken' }), 400],
    [jsonRequest({ ...body, sourceUrl: 'https://127.0.0.1/private' }), 400],
    [jsonRequest({ ...body, question: 'x'.repeat(20_000) }), 413],
    [jsonRequest(body, { 'content-length': '1000000' }), 413],
  ];
  for (const [request, status] of cases) {
    const response = await r.POST(request);
    assert.equal(response.status, status);
    const error = await response.json();
    assert.deepEqual(Object.keys(error), ['error']);
    assert.equal(typeof error.error, 'string');
    assert.doesNotMatch(error.error, /127\.0\.0\.1|private|stack|broken|SyntaxError/);
  }
});
