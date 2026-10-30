import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync} from 'node:fs';
import {resolve, join, sep} from 'node:path';
import {spawnSync} from 'node:child_process';

function workspace() {
  const base = resolve('tmp');
  mkdirSync(base, {recursive: true});
  return {base, dir: mkdtempSync(join(base, 'topic-memory-evaluation-'))};
}
function cleanup(base: string, dir: string) {
  assert.ok(resolve(dir).startsWith(base + sep));
  rmSync(dir, {recursive: true, force: true});
}
function run(dir: string, mode = 'offline', replaySource?: string) {
  return spawnSync(process.execPath, ['scripts/testing/phase4d2-memory-evaluate.ts', mode, ...(replaySource ? [replaySource] : [])], {
    cwd: process.cwd(), encoding: 'utf8', windowsHide: true, timeout: 15000,
    env: {...process.env, IMPACTLENS_PHASE4D2_DIRECTORY: dir, IMPACTLENS_PHASE4D2_LIVE: ''},
  });
}

test('isolated topic-memory offline pair uses fresh policies, meaningful optional recall and exactly two gateway mocks', () => {
  const {base, dir} = workspace();
  try {
    const r = run(dir);
    assert.equal(r.status, 0, r.stderr);
    const safeText = readFileSync(join(dir, 'offline-evaluation.json'), 'utf8'), result = JSON.parse(safeText);
    assert.deepEqual(result.results.map((r: any) => r.status), ['accepted', 'accepted']);
    assert.deepEqual(result.results.map((r: any) => r.policy), ['episodic-v1', 'episodic-topic-v2']);
    assert.deepEqual(result.results.map((r: any) => r.oldEpisodeInContext), [false, true]);
    assert.deepEqual(result.results.map((r: any) => r.oldPrimaryItemInContext), [false, true]);
    assert.deepEqual(result.results.map((r: any) => r.targetsCurrentQuestion), [true, true]);
    assert.deepEqual(result.results.map((r: any) => r.specificOldFactCorrect), [false, true]);
    assert.deepEqual(result.results.map((r: any) => r.optionalOlderRecallBeyondTargetAndStance), [false, true]);
    assert.deepEqual(result.results.map((r: any) => r.substantiveRecall), [false, true]);
    assert.ok(result.results.every((r: any) => r.earlierAbsentShortTerm && r.usage.identity === 'completion'));
    assert.equal(result.fixture.earlierGatewayCalls, 0);
    assert.equal(result.fixture.fixtureAcceptedDecisionRecordsPerArm, 2);
    assert.equal(result.totals.completions, 2);
    const snapshots = readFileSync(join(dir, 'offline-ledger.jsonl'), 'utf8').trim().split('\n').map(s => JSON.parse(s));
    assert.ok(snapshots.some(s => s.requests.some((r: any) => r.state === 'reserved' && r.reservedUsd === 0.0135)));
    assert.equal(snapshots.at(-1).requests.length, 2);
    assert.ok(![safeText, r.stdout, r.stderr, JSON.stringify(snapshots)].some(s => /2800|Payroll audit|take-home earnings/.test(s)));
  } finally { cleanup(base, dir); }
});

const previousRequest = (id: number, options: Record<string, unknown> = {}) => ({id, condition: 'previous', contextHash: 'previous-' + id,
  state: 'accepted', reservedUsd: 0.0135, costUsd: 0.001, inputTokens: 1, outputTokens: 1,
  identity: 'completion', error: null, durationMs: 1, ...options});
function seedLedger(dir: string, requests: unknown[], halted = false) {
  const raw = JSON.stringify({version: 1, task: 'phase4d2-memory', requests, halted}) + '\n';
  writeFileSync(join(dir, 'offline-ledger.jsonl'), raw);
  return raw;
}

test('completion, monetary, halted and unresolved reservation limits stop before new requests or checkpoints', () => {
  for (const {requests, halted} of [
    {requests: Array.from({length: 8}, (_, i) => previousRequest(i + 1)), halted: false},
    {requests: [previousRequest(1, {costUsd: 0.149})], halted: false},
    {requests: [previousRequest(1, {state: 'reserved', costUsd: null})], halted: false},
    {requests: [previousRequest(1)], halted: true},
  ]) {
    const {base, dir} = workspace();
    try {
      const raw = seedLedger(dir, requests, halted), r = run(dir);
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /MEMORY_PAIR_BUDGET/);
      assert.equal(readFileSync(join(dir, 'offline-ledger.jsonl'), 'utf8'), raw);
      assert.equal(existsSync(join(dir, 'private/offline-A.json')), false);
      assert.equal(existsSync(join(dir, 'offline-evaluation.json')), false);
    } finally { cleanup(base, dir); }
  }
});

test('unknown provider costs remain conservatively reserved after unrelated completed mocks', () => {
  const {base, dir} = workspace();
  try {
    seedLedger(dir, [previousRequest(1, {state: 'rejected', costUsd: null, inputTokens: null, outputTokens: null,
      identity: null, error: 'AI_TIMEOUT'})]);
    const r = run(dir);
    assert.equal(r.status, 0, r.stderr);
    const result = JSON.parse(readFileSync(join(dir, 'offline-evaluation.json'), 'utf8'));
    assert.equal(result.totals.unknownCharges, 1);
    assert.equal(result.totals.completions, 3);
    assert.ok(Math.abs(result.totals.conservativeUsd - 0.0137) < 1e-10);
    assert.ok(Math.abs(result.totals.reportedUsd - 0.0002) < 1e-10);
  } finally { cleanup(base, dir); }
});

test('repeating a completed pair preserves both accepted checkpoints and all admission evidence', () => {
  const {base, dir} = workspace();
  try {
    const first = run(dir);
    assert.equal(first.status, 0, first.stderr);
    const paths = ['offline-ledger.jsonl', 'private/offline-A.json', 'private/offline-B.json', 'offline-evaluation.json'];
    const before = paths.map(path => readFileSync(join(dir, path), 'utf8'));
    const second = run(dir);
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /MEMORY_CONTEXT_DUPLICATE/);
    assert.ok(paths.every((path, i) => readFileSync(join(dir, path), 'utf8') === before[i]));
  } finally { cleanup(base, dir); }
});

test('duplicate admission checks both arms before replacing the first checkpoint', () => {
  const {base, dir} = workspace();
  try {
    mkdirSync(join(dir, 'private'), {recursive: true});
    writeFileSync(join(dir, 'private/offline-B.json'), 'accepted-evidence-owner');
    const r = run(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /MEMORY_CONTEXT_DUPLICATE/);
    assert.equal(readFileSync(join(dir, 'private/offline-B.json'), 'utf8'), 'accepted-evidence-owner');
    assert.equal(existsSync(join(dir, 'private/offline-A.json')), false);
    assert.equal(existsSync(join(dir, 'offline-ledger.jsonl')), false);
  } finally { cleanup(base, dir); }
});

test('existing exclusive ledger lock fails closed and retains the other owner lock', () => {
  const {base, dir} = workspace();
  try {
    writeFileSync(join(dir, 'offline-ledger.jsonl.lock'), 'another-owner');
    const r = run(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /MEMORY_LEDGER_LOCK/);
    assert.equal(readFileSync(join(dir, 'offline-ledger.jsonl.lock'), 'utf8'), 'another-owner');
    assert.equal(existsSync(join(dir, 'offline-ledger.jsonl')), false);
  } finally { cleanup(base, dir); }
});

test('offline accepted decisions replay through the real reducer with egress blocked and private projections checked', () => {
  const {base, dir} = workspace();
  try {
    const first = run(dir);
    assert.equal(first.status, 0, first.stderr);
    const ledger = readFileSync(join(dir, 'offline-ledger.jsonl'), 'utf8');
    const r = run(dir, 'replay', 'offline');
    assert.equal(r.status, 0, r.stderr);
    const result = JSON.parse(r.stdout);
    assert.equal(result.providerCalls, 0);
    assert.equal(result.externalFetchBlocked, true);
    assert.equal(result.replay.length, 2);
    assert.ok(result.replay.every((v: any) => v.contextExact && v.decisionExact && v.worldExact && v.publicLiteralLeaks === 0));
    assert.equal(readFileSync(join(dir, 'offline-ledger.jsonl'), 'utf8'), ledger);
    assert.ok(!/2800|Payroll audit|take-home earnings/.test(r.stdout + r.stderr));
  } finally { cleanup(base, dir); }
});

test('tampered private accepted worlds fail replay with a safe code and no dialogue disclosure', () => {
  const {base, dir} = workspace();
  try {
    const first = run(dir);
    assert.equal(first.status, 0, first.stderr);
    const path = join(dir, 'private/offline-B.json'), record = JSON.parse(readFileSync(path, 'utf8'));
    record.worldHash = 'changed';
    writeFileSync(path, JSON.stringify(record));
    const r = run(dir, 'replay', 'offline');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /MEMORY_DECISION_REPLAY/);
    assert.ok(!/2800|Payroll audit|take-home earnings/.test(r.stdout + r.stderr));
  } finally { cleanup(base, dir); }
});

test('malformed ledgers expose safe error codes and live mode requires the explicit opt-in before environment loading', () => {
  const {base, dir} = workspace();
  try {
    writeFileSync(join(dir, 'offline-ledger.jsonl'), '{RAW_PHASE4D2_ERROR_CANARY}\n');
    const malformed = run(dir);
    assert.notEqual(malformed.status, 0);
    assert.match(malformed.stderr, /MEMORY_EVALUATION_FAILED/);
    assert.ok(!(malformed.stdout + malformed.stderr).includes('RAW_PHASE4D2_ERROR_CANARY'));
    const forbidden = run(dir, 'live');
    assert.notEqual(forbidden.status, 0);
    assert.match(forbidden.stderr, /MEMORY_LIVE_OPT_IN/);
    assert.equal(existsSync(join(dir, 'ledger.jsonl')), false);
    assert.equal(existsSync(join(dir, 'storage-preflight.json')), false);
  } finally { cleanup(base, dir); }
});
