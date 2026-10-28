import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const request = { version: 1, clientRequestId: 'client-1', scenarioIdentity: 'scenario-1', question: 'What if Singapore leaves ASEAN?', topic: 'asean' } as const;
test('browser-safe replay entry point is available to local experiment fixtures', async () => {
  const replay = await import('../../evidence/replay.ts').catch(() => null);
  assert.ok(replay, 'Browser-safe replay entry point must exist');
  const result = await replay.createReplayEvidence({ scenarioIdentity: 'local-scenario', researchAttemptId: 'local-attempt', question: 'A local question', topic: 'generic' });
  assert.equal(result.status, 'empty');
});
async function api() {
  const contract = await import('../../evidence/index.ts').catch(() => null);
  const replay = await import('../../server/evidence/replay.ts').catch(() => null);
  assert.ok(contract && replay, 'The evidence contract and replay implementation must exist');
  return { ...contract, ...replay };
}

test('ASEAN replay cites bounded checked official excerpts and leaves withdrawal effects unresolved', async () => {
  const a = await api();
  const result = await a.createReplayEvidence({ ...request, researchAttemptId: 'attempt-1' });
  assert.equal(result.mode, 'verified-replay');
  assert.equal(result.status, 'partial');
  assert.equal(result.sources.length, 2);
  assert.deepEqual(result.sources.map(s => s.url), [
    'https://asean.org/about-asean/asean-summit/',
    'https://www.meti.gov.sg/trade-international-economic-relations/agreements/free-trade-agreements-fta/',
  ]);
  for (const source of result.sources) {
    assert.equal(source.fetchStatus, 'verified-snapshot');
    assert.equal(source.retrievalMode, 'verified-replay');
    assert.ok(source.excerpt.split(/\s+/).length <= 20);
    assert.match(source.verifiedAt, /^2026-10-28T/);
  }
  for (const finding of result.findings) {
    assert.equal(finding.classification, 'directly-supported');
    assert.equal(finding.excerpt, result.sources.find(s => s.id === finding.sourceId)?.excerpt);
  }
  assert.ok(result.unknowns.some(s => /withdrawal/i.test(s)));
  assert.ok(result.unknowns.some(s => /termination/i.test(s)));
  assert.ok(result.limitations.some(s => /historical snapshot/i.test(s)));
  assert.ok(result.limitations.some(s => /search.index|403/i.test(s)));
  assert.deepEqual(await a.validateEvidenceBundle(result), result);
});

test('unsupported topics return honest empty replay gaps without borrowing ASEAN findings', async () => {
  const a = await api();
  for (const topic of ['polyclinic', 'mrt', 'aac', 'generic'] as const) {
    const result = await a.createReplayEvidence({ scenarioIdentity: 'scenario-other', researchAttemptId: 'attempt-other', question: 'A different question', topic });
    assert.equal(result.status, 'empty');
    assert.deepEqual(result.sources, []);
    assert.deepEqual(result.findings, []);
    assert.ok(result.unknowns.length);
    assert.ok(result.limitations.some(s => /no verified/i.test(s)));
  }
});

test('snapshot SHA-256 covers all evidence content and stays stable across request attempts and creation times', async () => {
  const a = await api();
  const bundle = await a.createReplayEvidence({ ...request, researchAttemptId: 'attempt-1' });
  const payload = { version: bundle.version, queries: bundle.queries, sources: bundle.sources, findings: bundle.findings, unknowns: bundle.unknowns, status: bundle.status, mode: bundle.mode, limitations: bundle.limitations };
  const want = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  assert.equal(bundle.snapshotIdentity, `sha256-${want}`);
  assert.equal(bundle.bundleId, `evidence-${want}`);
  const repeat = await a.createReplayEvidence({ ...request, researchAttemptId: 'attempt-2' });
  assert.equal(repeat.snapshotIdentity, bundle.snapshotIdentity);
  assert.equal(await a.computeEvidenceSnapshotIdentity({ ...bundle, researchAttemptId: 'attempt-3', createdAt: '2030-01-01T00:00:00.000Z' }), bundle.snapshotIdentity);
  await assert.rejects(a.validateEvidenceBundle({ ...bundle, unknowns: [...bundle.unknowns, 'Additional unresolved detail.'] }));
  await assert.rejects(a.validateEvidenceBundle({ ...bundle, bundleId: `evidence-${'0'.repeat(64)}` }));
});

test('strict parsing detaches objects and rejects unknown fields, unsafe prototypes, getters, cycles and oversized inputs', async () => {
  const a = await api();
  const bundle = await a.createReplayEvidence({ ...request, researchAttemptId: 'attempt-1' });
  const parsed = a.parseEvidenceBundle(bundle);
  parsed.sources[0].title = 'Changed locally';
  parsed.findings[0].limitations.push('Changed locally');
  assert.notEqual(parsed.sources[0].title, bundle.sources[0].title);
  assert.notDeepEqual(parsed.findings[0].limitations, bundle.findings[0].limitations);
  let getterCalls = 0;
  const getter = Object.defineProperty({ ...bundle }, 'sources', { enumerable: true, get() { getterCalls++; return bundle.sources; } });
  const cycle: Record<string, unknown> = { ...bundle }; cycle.sources = [cycle];
  const polluted = JSON.parse(JSON.stringify(bundle).replace('"version":1', '"version":1,"__proto__":{}'));
  for (const value of [{ ...bundle, extra: true }, Object.assign(Object.create({ inherited: true }), bundle), getter, cycle, polluted, { ...bundle, queries: ['q'.repeat(2001)] }, { ...bundle, sources: new Array(500).fill(bundle.sources[0]) }]) {
    assert.throws(() => a.parseEvidenceBundle(value));
  }
  assert.equal(getterCalls, 0);
  const arrayWithProperty = [...bundle.sources]; Object.assign(arrayWithProperty, { extra: true });
  assert.throws(() => a.parseEvidenceBundle({ ...bundle, sources: arrayWithProperty }));
});

test('replay claims cannot smuggle unsafe source links, invented verification metadata or unsupported factual excerpts', async () => {
  const a = await api();
  const bundle = await a.createReplayEvidence({ ...request, researchAttemptId: 'attempt-1' });
  for (const url of ['http://asean.org/', 'https://localhost/', 'https://127.0.0.1/', 'https://2130706433/', 'https://[::1]/', 'https://169.254.169.254/', 'https://10.0.0.1/', 'file:///etc/passwd', 'javascript:alert(1)', 'https://user:secret@asean.org/', 'https://asean.org:8443/', 'https://asean.org.evil.test/', 'https://asean.org/redirect?url=https://localhost/']) {
    assert.throws(() => a.parseEvidenceBundle({ ...bundle, sources: [{ ...bundle.sources[0], url }, bundle.sources[1]] }));
  }
  for (const edit of [{ title: 'Invented document' }, { publishedAt: 'bad-date' }, { verifiedAt: '2030-01-01T00:00:00.000Z' }, { fetchStatus: 'retrieved' }, { excerpt: 'Invented support.' }]) {
    assert.throws(() => a.parseEvidenceBundle({ ...bundle, sources: [{ ...bundle.sources[0], ...edit }, bundle.sources[1]] }));
  }
  for (const edit of [{ sourceId: 'missing' }, { excerpt: 'Singapore automatically loses all FTAs.' }, { statement: 'Singapore automatically loses all FTAs.' }, { classification: 'verified-fact' }]) {
    assert.throws(() => a.parseEvidenceBundle({ ...bundle, findings: [{ ...bundle.findings[0], ...edit }, ...bundle.findings.slice(1)] }));
  }
});

test('evidence object size is bounded in UTF-8 bytes, including multi-byte content', async () => {
  const a = await api();
  const bundle = await a.createReplayEvidence({ scenarioIdentity: 'size-test', researchAttemptId: 'size-attempt', question: 'A question', topic: 'generic' });
  assert.throws(() => a.parseEvidenceBundle({ ...bundle, unknowns: Array.from({ length: 24 }, () => '界'.repeat(1900)) }));
});

test('research response checks client correlation, scenario identity, attempt identity and hash before use', async () => {
  const a = await api();
  const evidence = await a.createReplayEvidence({ ...request, researchAttemptId: 'attempt-1' });
  const response = { version: 1, clientRequestId: request.clientRequestId, scenarioIdentity: request.scenarioIdentity, researchAttemptId: 'attempt-1', evidence };
  assert.deepEqual(a.parseResearchRequest(request), request);
  assert.deepEqual(await a.parseResearchResponse(response, request), response);
  for (const edit of [{ version: 2 }, { clientRequestId: 'wrong' }, { scenarioIdentity: 'wrong' }, { researchAttemptId: 'wrong' }, { extra: true }]) {
    await assert.rejects(a.parseResearchResponse({ ...response, ...edit }, request));
  }
  await assert.rejects(a.parseResearchResponse(response, { ...request, researchAttemptId: 'wrong' }));
  for (const edit of [{ version: 2 }, { topic: 'unsupported' }, { question: '' }, { question: 'x'.repeat(2001) }, { urls: ['https://localhost/'] }, { scenarioIdentity: '' }]) {
    assert.throws(() => a.parseResearchRequest({ ...request, ...edit }));
  }
});
